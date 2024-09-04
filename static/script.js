
document.addEventListener('DOMContentLoaded', () => {
    const stationIdSelect = document.getElementById('stationId');
    const contaminantRadios = document.querySelectorAll('input[name="contaminant"]');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const chartDiv = d3.select('#chart');
    const tooltip = d3.select('#tooltip');
    const pcaChartDiv = d3.select('#pca-chart');
    const tooltipPCA = d3.select('#tooltip-pca');

    // Define colores para los niveles de AQI
    const aqiColors = {
        1: '#00E400', // Bueno (0-50)
        2: '#FFFF00', // Moderado (51-100)
        3: '#FF7E00', // Insalubre para grupos sensibles (101-150)
        4: '#FF0000', // Insalubres (151-200)
        5: '#800080', // Muy insalubre (201-300)
        6: '#800000'  // Peligroso (301 en adelante)
    };

    // Función para eliminar el sufijo '_aq'
    function removeSuffix(text, suffix) {
        if (text.endsWith(suffix)) {
            return text.slice(0, -suffix.length);
        }
        return text;
    }

    // Carga el CSV y prepara los datos para el gráfico de AQI
    d3.csv('data/daily_aqi_output.csv').then(data => {
        const dates = data.map(d => new Date(d.date));
        const minDate = d3.min(dates);
        const maxDate = d3.max(dates);

        // Ajusta los campos de fecha
        startDateInput.min = minDate.toISOString().split('T')[0];
        endDateInput.min = minDate.toISOString().split('T')[0];
        startDateInput.max = maxDate.toISOString().split('T')[0];
        endDateInput.max = maxDate.toISOString().split('T')[0];
        endDateInput.value = maxDate.toISOString().split('T')[0];

        // Establece las opciones de stationId
        const stations = [...new Set(data.map(d => d.stationId))];
        stations.forEach(station => {
            const cleanedStation = removeSuffix(station, '_aq');
            stationIdSelect.add(new Option(cleanedStation, station));
        });

        // Añadir eventos de cambio para actualizar el gráfico
        function setupEventListeners() {
            stationIdSelect.addEventListener('change', updateChart);
            contaminantRadios.forEach(radio => {
                radio.addEventListener('change', updateChart);
            });
            startDateInput.addEventListener('change', updateChart);
            endDateInput.addEventListener('change', updateChart);
        }

        function updateChart() {
            const stationId = stationIdSelect.value;
            const contaminant = document.querySelector('input[name="contaminant"]:checked')?.value;
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            if (!contaminant) return; // No hace nada si no hay contaminante seleccionado

            const filteredData = data.filter(d => {
                const date = new Date(d.date);
                return d.stationId === stationId &&
                    d[contaminant] &&
                    date >= startDate &&
                    date <= endDate;
            });

            // Prepara los datos para el gráfico
            const nestedData = d3.group(filteredData, d => d.date);
            const chartData = Array.from(nestedData).map(([date, entries]) => ({
                date: new Date(date),
                aqi: Math.round(d3.mean(entries, d => d[contaminant])),
                color: aqiColors[Math.round(d3.mean(entries, d => d[contaminant]))],
                formattedDate: new Date(date).toLocaleDateString(),
                stationId: entries[0].stationId // Suponiendo que todos los registros para una fecha tienen el mismo stationId
            }));

            // Agrupar nodos por AQI
            const links = [];
            const nodeMap = new Map();

            chartData.forEach(d => {
                if (!nodeMap.has(d.aqi)) {
                    nodeMap.set(d.aqi, []);
                }
                nodeMap.get(d.aqi).push(d);
            });

            nodeMap.forEach((nodes) => {
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        links.push({
                            source: nodes[i],
                            target: nodes[j]
                        });
                    }
                }
            });

            // Limpia el gráfico anterior
            chartDiv.selectAll('*').remove();

            const width = 600; // Ancho fijo
            const height = 400; // Alto fijo

            // Crear el SVG
            const svg = chartDiv.append('svg')
                .attr('width', width)
                .attr('height', height);

            // Crear el contenedor para el zoom
            const g = svg.append('g');

            // Configurar zoom
            const zoom = d3.zoom()
                .scaleExtent([0.5, 5])  // Define el rango de zoom
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });

            svg.call(zoom);

            // Crear la simulación de fuerza
            const simulation = d3.forceSimulation(chartData)
                .force('link', d3.forceLink(links).id(d => d.date))
                .force('charge', d3.forceManyBody().strength(-100))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('x', d3.forceX(width / 2))
                .force('y', d3.forceY(height / 2))
                .on('tick', ticked);

            // Crear enlaces
            const link = g.append('g')
                .attr('class', 'links')
                .selectAll('line')
                .data(links)
                .enter().append('line')
                .attr('stroke', 'gray')
                .attr('stroke-width', 0);

            // Crear nodos
            const node = g.append('g')
                .attr('class', 'nodes')
                .selectAll('circle')
                .data(chartData)
                .enter().append('circle')
                .attr('r', 6)
                .attr('fill', d => d.color)
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended))
                .on('mouseover', mouseover)   // Añadir evento mouseover
                .on('mousemove', mousemove)   // Añadir evento mousemove
                .on('mouseout', mouseout)    // Añadir evento mouseout
                .on('click', clicked);       // Añadir evento click

            // Funciones de arrastre
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            function ticked() {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
            }

            function mouseover(event, d) {
                const [x, y] = d3.pointer(event, svg.node());

                tooltip.style('display', 'block')
                    .html(`Fecha: ${d.formattedDate}<br>AQI: ${d.aqi}`)
                    .style('left', `${x + 5}px`)
                    .style('top', `${y - 28}px`);

            }

            function mousemove(event) {
                d3.select(this).transition().attr('r', 10) // Aumenta el radio al pasar el mouse
                    .style('stroke', 'red') // Establece el color del borde como rojo
                    .style('stroke-width', '2px'); // Establece el ancho del borde
                const [x, y] = d3.pointer(event, svg.node());

                tooltip.style('left', `${x + 5}px`)
                    .style('top', `${y - 28}px`);
            }

            function mouseout() {
                d3.select(this).transition()
                    .attr('r', 6) // Regresa el radio a su tamaño original
                    .style('stroke', 'none'); // Elimina el borde
                tooltip.style('display', 'none');
            }

            function clicked(event, d) {
                console.log(`Station ID: ${d.stationId}, Fecha: ${d.formattedDate}, AQI: ${d.aqi}`);
            }
        }

        // Configura los eventos de cambio
        setupEventListeners();

        // Inicializa el gráfico
        updateChart();
    });

    

    // Carga el CSV y prepara los datos para el gráfico PCA
    d3.csv('data/PCA_VIZ_AQI_SIN-DW.csv').then(pcaData => {
        const aqiColors = {
            1: '#00E400', // Bueno (0-50)
            2: '#FFFF00', // Moderado (51-100)
            3: '#FF7E00', // Insalubre para grupos sensibles (101-150)
            4: '#FF0000', // Insalubres (151-200)
            5: '#800080', // Muy insalubre (201-300)
            6: '#800000'  // Peligroso (301 en adelante)
        };
        // Calcula la matriz de correlación

        
        
        function updatePCAChart() {
            const stationId = stationIdSelect.value;
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
    
            const filteredData = pcaData.filter(d => {
                const date = new Date(d.date);
                return d.stationId === stationId && date >= startDate && date <= endDate;
            });
    
            // Limpia el gráfico anterior
            pcaChartDiv.selectAll('*').remove();
    
            const width = 600; // Ancho fijo
            const height = 400; // Alto fijo
    
            const pcaSvg = pcaChartDiv.append('svg')
                .attr('width', width)
                .attr('height', height)
                .call(d3.zoom().on('zoom', (event) => {
                    g.attr('transform', event.transform);
                }));
    
            const g = pcaSvg.append('g'); // Contenedor para aplicar el zoom y el pan
    
            const xScale = d3.scaleLinear()
                .domain(d3.extent(filteredData, d => +d.PC1))
                .range([50, width - 50]);
    
            const yScale = d3.scaleLinear()
                .domain(d3.extent(filteredData, d => +d.PC2))
                .range([height - 50, 50]);
    
            // Añadir puntos
            g.selectAll('circle')
            .data(filteredData)
            .enter().append('circle')
            .attr('cx', d => xScale(+d.PC1))
            .attr('cy', d => yScale(+d.PC2))
            .attr('r', 6)
            .attr('fill', d => aqiColors[d.AQI]) // Asigna el color basado en el valor de AQI
            .on('mouseover', function(event, d) {
                const [x, y] = d3.pointer(event, pcaSvg.node());

                tooltipPCA.style('display', 'block')
                    .html(`Fecha: ${d.date}<br>AQI: ${d.AQI}<br>PC1: ${d.PC1}<br>PC2: ${d.PC2}`)
                    .style('left', `${x + 5}px`)
                    .style('top', `${y - 28}px`);
            })
            .on('mousemove', function(event) {
                const [x, y] = d3.pointer(event, pcaSvg.node());
                d3.select(this).transition().attr('r', 10) // Aumenta el radio al pasar el mouse
                    .style('stroke', 'red') // Establece el color del borde como rojo
                    .style('stroke-width', '2px'); // Establece el ancho del borde
                tooltipPCA.style('left', `${x + 5}px`)
                    .style('top', `${y - 28}px`);
            })
            .on('mouseout', function() {
                tooltipPCA.style('display', 'none');
                d3.select(this).transition().attr('r', 6) // Aumenta el radio al pasar el mouse
                    .style('stroke', 'none'); // Elimina el borde


            })
            // Evento de clic en el gráfico PCA
            .on('click', function(event, d) {
                console.log(`Fecha: ${d.date}, Hora: ${d.time}, PC1: ${d.PC1}, PC2: ${d.PC2}, AQI: ${d.AQI}, Station ID: ${d.stationId}`);
                drawHierarchicalChart(d.date, d.stationId, d.time); // Llama a la función para dibujar el dendograma
                
            });


        }


        function drawHierarchicalChart(date, stationId, time) {
            Promise.all([
                d3.csv('data/beijing_17_18_aq.csv'),
                d3.csv('data/beijing_17_18_meo.csv'),
                d3.csv('data/knn_PCA.csv')
            ]).then(([aqData, meoData, knnData]) => {
                // Filtrar los datos de contaminación por fecha y stationId
                const filteredAqData = aqData.filter(d => d.date === date && d.stationId === stationId);
                
                // Buscar el nearest_meo_stationId correspondiente al stationId de contaminación
                const nearestMeoStation = knnData.find(d => d.aqi_stationId === stationId)?.nearest_meo_stationId;
                if (!nearestMeoStation) {
                    console.error('No se encontró una estación meteorológica correspondiente.');
                    return;
                }
        
                // Filtrar los datos meteorológicos por fecha y nearest_meo_stationId
                const filteredMeoData = meoData.filter(d => d.date === date && d.stationId === nearestMeoStation);
        
                // Verificar si hay datos suficientes para ambas categorías
                if (filteredAqData.length === 0 || filteredMeoData.length === 0) {
                    console.error('No se encontraron datos suficientes para la fecha y estaciones especificadas.');
                    return;
                }
        
                // Extraer los atributos relevantes
                const aqAttributes = ['PM2_5', 'PM10', 'NO2', 'CO', 'O3', 'SO2'];
                const meoAttributes = ['temperature', 'pressure', 'humidity'];
                const attributes = [...aqAttributes, ...meoAttributes];
                const matrix = [];
        
                // Combinar los datos de contaminación y meteorológicos basados en el tiempo
                filteredAqData.forEach(row => {
                    const correspondingMeoRow = filteredMeoData.find(d => d.time === row.time);
                    if (correspondingMeoRow) {
                        const aqDataRow = aqAttributes.map(attr => parseFloat(row[attr]) || 0);
                        const meoDataRow = meoAttributes.map(attr => parseFloat(correspondingMeoRow[attr]) || 0);
                        matrix.push([...aqDataRow, ...meoDataRow]);
                    }
                });
        
                // Calcular la matriz de correlación
                const correlationMatrix = calculateCorrelationMatrix(matrix);
                // Calcular la matriz de distancias
                const distanceMatrix = calculateDistanceMatrix(correlationMatrix);
        
                console.log("Matriz de correlación:", correlationMatrix); // Muestra la matriz de correlación en la consola
                console.log("Matriz de distancias:", distanceMatrix); // Muestra la matriz de distancias en la consola
        
                // Asegúrate de que 'attributes' no esté vacío antes de construir la jerarquía
                if (attributes.length === 0) {
                    console.error('No hay atributos disponibles para construir la jerarquía.');
                    return; // Salir si no hay atributos
                }
        
                const root = d3.hierarchy(buildHierarchy(attributes, distanceMatrix), d => d.children);

                assignRadialLeafPositions(root, attributes.length);

                const cluster = d3.cluster().size([2 * Math.PI, clusterRadius]);
                cluster(root);

                g.selectAll("*").remove();

                g.selectAll(".link")
                    .data(root.links())
                    .enter().append("path")
                    .attr("class", d => {
                        const sourceIsMeo = meoAttributes.includes(d.source.data.name);
                        const targetIsMeo = meoAttributes.includes(d.target.data.name);
                        return (sourceIsMeo || targetIsMeo) ? "highlighted-link" : "link"; // Solo líneas rojas
                    })
                    .attr("d", d3.linkRadial()
                        .angle(d => d.x)
                        .radius(d => d.y));

                const node = g.selectAll(".node")
                    .data(root.descendants())
                    .enter().append("g")
                    .attr("class", "node")
                    .attr("transform", d => `translate(${project(d.x, d.y)})`)
                    .on("mouseover", function(event, d) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tooltip.html("Distancia: " + (d.data.distance || 0).toFixed(2))
                            .style("left", (event.pageX + 5) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                node.append("circle")
                    .attr("r", 6);

                node.append("text")
                    .attr("dy", "0.31em")
                    .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
                    .style("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
                    .attr("transform", d => {
                        const angle = d.x * 180 / Math.PI;
                        return d.children ? null : "rotate(" + (angle < 180 ? angle - 90 : angle + 90) + ")";
                    })
                    .text(d => d.children ? null : d.data.name);
            }).catch(error => {
                console.error('Error al cargar los CSV:', error);
            });
        }
        const aqAttributes = ['PM2_5', 'PM10', 'NO2', 'CO', 'O3', 'SO2'];
        const meoAttributes = ['temperature', 'pressure', 'humidity'];
        const allAttributes = [...aqAttributes, ...meoAttributes];

        const distanceMatrix = [
            [0, 1.4324659468581082, 1.3741895017246408, 1.3524283396263526, 1.4720110156685529, 1.2994422485865655, 1.4836641127218884, 1.331634983831686, 1.422883153029264],
            [1.4324659468581082, 0, 1.6014916188289152, 1.86478561751244, 1.0731520507954366, 1.5968148564476228, 1.0967284473847863, 1.7720926804895984, 1.0109657534053984],
            [1.3741895017246408, 1.6014916188289152, 0, 1.3985167089056112, 1.8443744807132447, 1.3868541475433116, 1.6843486662554692, 1.3105987853399388, 1.2645600726881148],
            [1.3524283396263526, 1.86478561751244, 1.3985167089056112, 0, 1.509354235267772, 1.1035011463187883, 1.561205830354015, 1.0589119642884466, 1.7826048063351183],
            [1.4720110156685529, 1.0731520507954366, 1.8443744807132447, 1.509354235267772, 0, 1.5872779321783976, 0.47505894244748764, 1.8529645030914041, 1.6492316467665937],
            [1.2994422485865655, 1.5968148564476228, 1.3868541475433116, 1.1035011463187883, 1.5872779321783976, 0, 1.622162815171491, 1.1007758723829226, 1.517179854827837],
            [1.4836641127218884, 1.0967284473847863, 1.6843486662554692, 1.561205830354015, 0.47505894244748764, 1.622162815171491, 0, 1.9385690595122151, 1.6136559577538154],
            [1.331634983831686, 1.7720926804895984, 1.3105987853399388, 1.0589119642884466, 1.8529645030914041, 1.1007758723829226, 1.9385690595122151, 0, 1.458225881162374],
            [1.422883153029264, 1.0109657534053984, 1.2645600726881148, 1.7826048063351183, 1.6492316467665937, 1.517179854827837, 1.6136559577538154, 1.458225881162374, 0]
        ];

        const width = 600;
        const height = 600;
        const radius = width / 2;
        const clusterRadius = radius - 100;

        const svg = d3.select("#tree-rad").append("svg")
            .attr("width", width)
            .attr("height", height);

        const g = svg.append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        function buildHierarchy(attributes, distanceMatrix) {
            let clusters = attributes.map((attr, i) => ({
                name: attr,
                distance: 0,
                index: i,
                children: []
            }));

            let n = clusters.length;

            while (n > 1) {
                let minDistance = Infinity;
                let a, b;

                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        if (distanceMatrix[clusters[i].index][clusters[j].index] < minDistance) {
                            minDistance = distanceMatrix[clusters[i].index][clusters[j].index];
                            a = i;
                            b = j;
                        }
                    }
                }

                const newCluster = {
                    name: clusters[a].name + '-' + clusters[b].name,
                    distance: minDistance,
                    children: [clusters[a], clusters[b]],
                    index: clusters[a].index
                };

                clusters = clusters.filter((_, i) => i !== a && i !== b);
                clusters.push(newCluster);
                n--;
            }

            return clusters[0];
        }

        function project(x, y) {
            const angle = x - Math.PI / 2;
            return [y * Math.cos(angle), y * Math.sin(angle)];
        }

        function updateDendrogram() {
            const selectedAttributes = Array.from(document.querySelectorAll('.attribute-checkbox:checked')).map(cb => cb.value);
            // Filtrar para incluir solo atributos de calidad del aire
            const filteredAttributes = selectedAttributes.filter(attr => aqAttributes.includes(attr));

            if (filteredAttributes.length < 2) {
                g.selectAll("*").remove();
                return;
            }

            const selectedIndexes = filteredAttributes.map(attr => allAttributes.indexOf(attr));
            const filteredMatrix = selectedIndexes.map(i => selectedIndexes.map(j => distanceMatrix[i][j]));

            const root = d3.hierarchy(buildHierarchy(filteredAttributes, filteredMatrix), d => d.children);

            assignRadialLeafPositions(root, filteredAttributes.length);

            const cluster = d3.cluster().size([2 * Math.PI, clusterRadius]);
            cluster(root);

            g.selectAll("*").remove();

            g.selectAll(".link")
                .data(root.links())
                .enter().append("path")
                .attr("class", d => {
                    const sourceIsMeo = meoAttributes.includes(d.source.data.name);
                    const targetIsMeo = meoAttributes.includes(d.target.data.name);
                    return (sourceIsMeo || targetIsMeo) ? "highlighted-link" : "link"; // Solo líneas rojas
                })
                .attr("d", d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y));

            const node = g.selectAll(".node")
                .data(root.descendants())
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${project(d.x, d.y)})`)
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html("Distancia: " + (d.data.distance || 0).toFixed(2))
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            node.append("circle")
                .attr("r", 6);

            node.append("text")
                .attr("dy", "0.31em")
                .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
                .style("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
                .attr("transform", d => {
                    const angle = d.x * 180 / Math.PI;
                    return d.children ? null : "rotate(" + (angle < 180 ? angle - 90 : angle + 90) + ")";
                })
                .text(d => d.children ? null : d.data.name);
        }

        function assignRadialLeafPositions(root, count) {
            const leaves = root.leaves();
            const angleStep = (2 * Math.PI) / count;
            leaves.forEach((leaf, i) => {
                leaf.x = i * angleStep;
                leaf.y = clusterRadius;
            });
        }

        function calculateDistanceMatrix(correlationMatrix) {
            const numAttributes = correlationMatrix.length;
            const distanceMatrix = Array.from({ length: numAttributes }, () => Array(numAttributes).fill(0));
        
            for (let i = 0; i < numAttributes; i++) {
                for (let j = 0; j < numAttributes; j++) {
                    distanceMatrix[i][j] = Math.sqrt(2 * (1 - correlationMatrix[i][j]));
                }
            }
        
            return distanceMatrix;
        }
        
        function calculateCorrelationMatrix(data) {
            const numAttributes = data[0].length;
            const correlationMatrix = Array.from({ length: numAttributes }, () => Array(numAttributes).fill(0));
        
            for (let i = 0; i < numAttributes; i++) {
                for (let j = 0; j < numAttributes; j++) {
                    correlationMatrix[i][j] = calculateCorrelation(data.map(row => row[i]), data.map(row => row[j]));
                }
            }
        
            return correlationMatrix;
        }
        
        function calculateCorrelation(x, y) {
            const n = x.length;
            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
            const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
            const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
        
            const numerator = n * sumXY - sumX * sumY;
            const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
            return denominator === 0 ? 0 : numerator / denominator; // Evitar división por cero
        }
        
        // Añadir eventos de cambio para actualizar el gráfico PCA
        function setupEventListenersForPCA() {
            stationIdSelect.addEventListener('change', updatePCAChart);
            startDateInput.addEventListener('change', updatePCAChart);
            endDateInput.addEventListener('change', updatePCAChart);
        }

        // Configura los eventos de cambio
        setupEventListenersForPCA();
    
        // Inicializa el gráfico PCA
        updatePCAChart();
    });

    
    
});
