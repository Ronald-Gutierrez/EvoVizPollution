document.addEventListener('DOMContentLoaded', () => {
    const stationIdSelect = document.getElementById('stationId');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const contaminantRadios = document.querySelectorAll('input[name="contaminant"]'); // Selección de contaminantes

    const pcaChartDiv = d3.select('#pca-chart');
    const tooltipPCA = d3.select('#tooltip-pca');
    const tooltipRAD = d3.select('#tooltip-rad');
    const timeTemporalDiv = d3.select('#time-temporal');
    const tooltipTimeTemporal = d3.select('#tooltip-time-temporal');
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
    });

    const defaultDate = '2018-01-01'; // Cambia esto a la fecha que desees
    startDateInput.value = defaultDate; // Establece la fecha de inicio
    endDateInput.value = defaultDate; // Establece la fecha de fin
    const correlationMatrix = null;
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
    // Carga el CSV y prepara los datos para el gráfico PCA
    d3.csv('data/PCA_VIZ_AQI_SIN-DW-FOR-DAY.csv').then(pcaData => {

        const aqiColors = {
            1: '#00E400', // Bueno (0-50)
            2: '#FFFF00', // Moderado (51-100)
            3: '#FF7E00', // Insalubre para grupos sensibles (101-150)
            4: '#FF0000', // Insalubres (151-200)
            5: '#800080', // Muy insalubre (201-300)
            6: '#800000'  // Peligroso (301 en adelante)
        };

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

          // Variable para almacenar el punto seleccionado
            let selectedPoint = null;

            g.selectAll('circle')
                .data(filteredData)
                .enter().append('circle')
                .attr('cx', d => xScale(+d.PC1))
                .attr('cy', d => yScale(+d.PC2))
                .attr('r', 6)
                .attr('fill', d => aqiColors[d.AQI]) // Asigna el color basado en el valor de AQI
                .on('mouseover', function(event, d) {
                    if (d !== selectedPoint) { // Solo cambia el estilo si el punto no está seleccionado
                        d3.select(this).transition().attr('r', 12) // Aumenta el radio al pasar el mouse
                            .style('stroke', 'blue') // Establece el color del borde como azul
                            .style('stroke-width', '3px'); // Establece el ancho del borde
                    }
                    
                    const [x, y] = d3.pointer(event, pcaSvg.node());

                    tooltipPCA.style('display', 'block')
                        .html(`Fecha: ${new Date(new Date(d.date).setDate(new Date(d.date).getDate() + 1)).toLocaleDateString()}<br>Hora: ${d.time} <br>AQI: ${d.AQI}`)
                        .style('left', `${x + 5}px`)
                        .style('top', `${y - 28}px`);
                })
                .on('mousemove', function(event) {
                    if (d3.select(this).datum() !== selectedPoint) { // Solo cambia el estilo si el punto no está seleccionado
                        const [x, y] = d3.pointer(event, pcaSvg.node());
                        d3.select(this).transition().attr('r', 12) // Aumenta el radio al pasar el mouse
                            .style('stroke', 'blue') // Establece el color del borde como azul
                            .style('stroke-width', '3px'); // Establece el ancho del borde
                        tooltipPCA.style('left', `${x + 5}px`)
                            .style('top', `${y - 28}px`);
                    }
                })
                .on('mouseout', function() {
                    if (d3.select(this).datum() !== selectedPoint) { // Solo cambia el estilo si el punto no está seleccionado
                        d3.select(this).transition().attr('r', 6) // Restaura el radio al salir el mouse
                            .style('stroke', 'none'); // Elimina el borde
                    }
                    tooltipPCA.style('display', 'none');
                })
                .on('click', function(event, d) {
                    // Restaura el estilo del punto previamente seleccionado
                    if (selectedPoint) {
                        d3.selectAll('circle')
                            .filter(point => point === selectedPoint)
                            .transition().attr('r', 6)
                            .style('stroke', 'none');
                    }

                    // Selecciona el nuevo punto
                    selectedPoint = d;
                    
                    d3.select(this).transition().attr('r', 12) // Aumenta el radio al hacer clic
                        .style('stroke', 'blue') // Establece el color del borde como azul
                        .style('stroke-width', '3px'); // Establece el ancho del borde
                    
                    console.log(`Fecha: ${d.date}, Hora: ${d.time}, PC1: ${d.PC1}, PC2: ${d.PC2}, AQI: ${d.AQI}, Station ID: ${d.stationId}`);
                    drawHierarchicalChart(d.date, d.stationId, d.time); // Llama a la función para dibujar el dendograma
                });

        }

        // Función para calcular la entropía de Shannon por cada atributo individualmente
        function calculateShannonEntropyForAttributes(data, attributes) {
            return attributes.map(attr => {
                const attrData = data.map(d => +d[attr] || 0);
                const sum = d3.sum(attrData);
                const probabilities = attrData.map(value => value / sum);
                const attrEntropy = -d3.sum(probabilities.map(p => (p > 0 ? p * Math.log2(p) : 0)));
                return attrEntropy;
            });
        }
        function drawHierarchicalChart(date, stationId, time) {
            Promise.all([
                d3.csv('data/beijing_17_18_aq.csv'),
                d3.csv('data/beijing_17_18_meo.csv'),
                d3.csv('data/knn_PCA.csv'),
                d3.csv('data/hour_aqi_output.csv') // Cargamos el CSV de hora
            ]).then(([aqData, meoData, knnData, hourData]) => {
                const filteredAqData = aqData.filter(d => d.date === date && d.stationId === stationId);
                // Actualiza la información en el HTML
                // document.getElementById('station-id').textContent = stationId;
                function formatDate(dateString) {
                    const [year, month, day] = dateString.split('-');
                    return `${day}-${month}-${year}`;
                }
                const formattedDate = formatDate(date);

                document.getElementById('selected-date').textContent = formattedDate;
        
                const nearestMeoStation = knnData.find(d => d.aqi_stationId === stationId)?.nearest_meo_stationId;
                if (!nearestMeoStation) {
                    console.error('No se encontró una estación meteorológica correspondiente.');
                    return;
                }
        
                const filteredMeoData = meoData.filter(d => d.date === date && d.stationId === nearestMeoStation);
        
                if (filteredAqData.length === 0 || filteredMeoData.length === 0) {
                    console.error('No se encontraron datos suficientes para la fecha y estaciones especificadas.');
                    return;
                }
        
                const aqAttributes = ['PM2_5', 'PM10', 'NO2', 'CO', 'O3', 'SO2'];
                const meoAttributes = ['temperature', 'pressure', 'humidity'];
                const attributes = [...aqAttributes, ...meoAttributes];
                const matrix = [];
        
                filteredAqData.forEach(row => {
                    const correspondingMeoRow = filteredMeoData.find(d => d.time === row.time);
                    if (correspondingMeoRow) {
                        const aqDataRow = aqAttributes.map(attr => parseFloat(row[attr]) || 0);
                        const meoDataRow = meoAttributes.map(attr => parseFloat(correspondingMeoRow[attr]) || 0);
                        matrix.push([...aqDataRow, ...meoDataRow]);
                    }
                });
        
                const correlationMatrix = calculateCorrelationMatrix(matrix);
                const distanceMatrix = calculateDistanceMatrix(correlationMatrix);
        
                const root = d3.hierarchy(buildHierarchy(attributes, distanceMatrix), d => d.children);
                assignRadialLeafPositions(root, attributes.length);
        
                const cluster = d3.cluster().size([2 * Math.PI, clusterRadius]);
                cluster(root);
        
                g.selectAll("*").remove();
        
                g.selectAll(".link")
                    .data(root.links())
                    .enter().append("path")
                    .attr("class", d => meoAttributes.includes(d.source.data.name) || meoAttributes.includes(d.target.data.name) ? "highlighted-link" : "link")
                    .attr("d", d3.linkRadial()
                        .angle(d => d.x)
                        .radius(d => d.y));
        
                const colorScale = d3.scaleLinear()
                    .domain([0, d3.max(root.descendants(), d => d.data.distance || 0)])
                    .range(["#FF0000", "#FF9999"]);
        
                const shannonEntropies = calculateShannonEntropyForAttributes(filteredAqData, aqAttributes);
        
                const node = g.selectAll(".node")
                    .data(root.descendants())
                    .enter().append("g")
                    .attr("class", "node")
                    .attr("transform", d => `translate(${project(d.x, d.y)})`);
        
                // Al añadir los nodos al gráfico
                node.append("circle")
                    .attr("r", d => {
                        const entropy = shannonEntropies[d.data.index] || 0;
                        return d.children ? 4 : (entropy + 3);
                    })
                    .style("fill", d => colorScale(d.data.distance || 0));
        
                // Añadir un triángulo invertido al nodo central
                node.filter(d => !d.parent)  // Filtramos el nodo central (raíz)
                    .append("polygon")
                    .attr("points", function() {
                        // Definir el tamaño y las coordenadas del triángulo invertido
                        const triangleSize = 13; // Tamaño del triángulo
                        const x1 = 0, y1 = triangleSize;       // Punto inferior (vértice abajo)
                        const x2 = triangleSize / 2, y2 = 0;   // Punto superior derecho
                        const x3 = -triangleSize / 2, y3 = 0;  // Punto superior izquierdo
                        return `${x1},${y1} ${x2},${y2} ${x3},${y3}`;
                    })
                    .attr("fill", "black") // Color del triángulo
                    .attr("transform", "translate(0, -20)") // Ajustar la posición del triángulo encima del círculo
                    .style("pointer-events", "none"); // Ignorar eventos del ratón sobre el triángulo
        
                // Eventos de hover (mouseover) y click tal como los tienes definidos...
                node.on("mouseover", function(event, d) {
                    // tooltipRAD.style('display', 'block');
                    const node = d3.select(this);
                    const circle = node.select("circle");
        
                    const entropy = shannonEntropies[d.data.index] || 0; // Calcular la entropía para el nodo actual
                    const distance = d.data.distance || 0;
        
                    circle.transition()
                        .duration(300)
                        .attr("r", d.children ? 10 : (entropy === 0 ? 3 : entropy + 3))
                        .style("stroke", "blue")
                        .style("stroke-width", 2);
        
                    node.selectAll(".info-label").remove(); // Elimina etiquetas anteriores
                    node.append("text")
                        .attr("class", "info-label")
                        .attr("x", 0)
                        .attr("y", -15)
                        .attr("text-anchor", "middle")
                        .text(`Entropía: ${entropy.toFixed(2)}`);
                    
                    node.append("text")
                        .attr("class", "info-label")
                        .attr("x", 0)
                        .attr("y", -30)
                        .attr("text-anchor", "middle")
                        .text(`Distancia: ${distance.toFixed(2)}`); 
                })
                .on("mouseout", function(event, d) {
                    const node = d3.select(this);
                    const circle = node.select("circle");
        
                    const originalRadius = d.children ? 6 : (shannonEntropies[d.data.index] || 0) + 3;
        
                    circle.transition()
                        .duration(300)
                        .attr("r", originalRadius)
                        .style("stroke", "none")
                        .style("stroke-width", 0);
        
                    node.selectAll(".info-label").remove();
                })
                .on("click", function(event, d) {
                    const entropy = shannonEntropies[d.data.index] || 0;
                    const distance = d.data.distance || 0;
                    const nodeData = d.data;
                    const stationId = stationIdSelect.value;
                    const date = startDateInput.value;
                    const time = "00:00";
                    
                    // Mapea los nombres de los contaminantes a los valores del radio button
                    const contaminantMap = {
                        "PM2_5": "PM2_5",
                        "PM10": "PM10",
                        "NO2": "NO2",
                        "CO": "CO",
                        "O3": "O3",
                        "SO2": "SO2"
                    };
                
                    // Obtén el contaminante seleccionado del nodo
                    const contaminant = contaminantMap[nodeData.name] || "";
                
                    // Actualiza la selección del radio button
                    const contaminantRadios = document.querySelectorAll('input[name="contaminant"]');
                    contaminantRadios.forEach(radio => {
                        if (radio.value === contaminant) {
                            radio.checked = true;
                        }
                    });
                    updateTimeSeriesChart(correlationMatrix, formattedDate, contaminant);
                
                    console.log(`Datos del nodo:
                        Nombre: ${nodeData.name},
                        Distancia: ${distance.toFixed(2)},
                        Entropía: ${entropy.toFixed(2)},
                        Fecha: ${formattedDate},
                        Hora: ${time},
                        Station ID: ${stationId}`);
                    console.log(correlationMatrix);
                    console.log(distanceMatrix)
                    
                });
                
        
                node.append("text")
                    .attr("dy", "0.31em")
                    .attr("x", d => d.x < Math.PI === !d.children ? 10 : -10)
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
        



        const width = 600;
        const height = 380;
        const radius = width / 2.6;
        const clusterRadius = radius - 100;

        const svg = d3.select("#tree-rad").append("svg")
            .attr("width", width)
            .attr("height", height);

        const g = svg.append("g")
            .attr("transform", `translate(${width / 2.3}, ${height / 2})`); // Centra el grupo en el SVG

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])  // Define el rango de zoom
            .on('zoom', (event) => {
                const { transform } = event;
                const [x, y] = d3.pointer(event, svg.node());

                // Calcula la traslación para centrar el zoom en la posición del ratón
                const tx = x * transform.k - width / 2;
                const ty = y * transform.k - height / 2;

                // Aplica la transformación
                g.attr('transform', `translate(${width / 2}, ${height / 2}) scale(${transform.k}) translate(${tx}, ${ty})`);
            });

        svg.call(zoom);

        function buildHierarchy(attributes, distanceMatrix) {
            // Inicializar cada clúster como un solo punto
            let clusters = attributes.map((attr, i) => ({
                name: attr,
                index: i,
                points: [i],  // Cada clúster empieza con un solo punto
                children: []
            }));
        
            let n = clusters.length;
        
            while (n > 1) {
                let minAverageDistance = Infinity;
                let a, b;
        
                // Encontrar el par de clústeres con la menor distancia promedio
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        let sumDistance = 0;
                        let count = 0;
        
                        // Calcular la distancia promedio entre todos los pares de puntos en los clústeres i y j
                        for (let pointI of clusters[i].points) {
                            for (let pointJ of clusters[j].points) {
                                sumDistance += distanceMatrix[pointI][pointJ];
                                count++;
                            }
                        }
        
                        const averageDistance = sumDistance / count;
        
                        if (averageDistance < minAverageDistance) {
                            minAverageDistance = averageDistance;
                            a = i;
                            b = j;
                        }
                    }
                }
        
                // Crear un nuevo clúster combinando los clústeres a y b
                const newCluster = {
                    name: clusters[a].name + '-' + clusters[b].name,
                    distance: minAverageDistance,
                    points: clusters[a].points.concat(clusters[b].points), // Unir puntos
                    children: [clusters[a], clusters[b]]
                };
        
                // Actualizar la lista de clústeres
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


function updateTimeSeriesChart(matrixCorrelaction, fecha, contaminate) {
    const stationId = stationIdSelect.value;
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    const selectedContaminant = document.querySelector('input[name="contaminant"]:checked').value; // Contaminante seleccionado

    // Cargar los datos necesarios para la serie temporal
    Promise.all([
        d3.csv('data/beijing_17_18_aq.csv'),
        d3.csv('data/beijing_17_18_meo.csv'),
        d3.csv('data/daily_aqi_output.csv') // Nuevo archivo CSV
    ]).then(([aqData, meoData, aqiOutputData]) => {
        // Filtrar los datos según la estación y el rango de fechas
        const filteredAqData = aqData.filter(d => {
            const date = new Date(d.date);
            return d.stationId === stationId && date >= startDate && date <= endDate;
        });

        const filteredMeoData = meoData.filter(d => {
            const date = new Date(d.date);
            return d.stationId === stationId && date >= startDate && date <= endDate;
        });

        // Filtrar los datos de AQI
        const filteredAqiOutputData = aqiOutputData.filter(d => {
            const date = new Date(d.date);
            return d.stationId === stationId && date >= startDate && date <= endDate;
        });

        // Combinar AQI, datos meteorológicos y datos de AQI por fecha y hora
        const mergedData = filteredAqData.map(d => {
            const meoRecord = filteredMeoData.find(m => m.date === d.date && m.time === d.time);
            return { ...d, ...meoRecord };
        });

        // Agrupar los datos por fecha y calcular el promedio del contaminante seleccionado
        const dailyData = d3.group(mergedData, d => d.date);
        const averagedData = Array.from(dailyData, ([date, values]) => {
            const average = d3.mean(values, d => +d[selectedContaminant]);
            return { date: new Date(date), average, stationId: values[0].stationId }; // Agregar stationId
        });

        // Calcular el promedio global del contaminante
        const overallAverage = d3.mean(averagedData, d => d.average);

        // Limpia el gráfico anterior
        timeTemporalDiv.selectAll('*').remove();

        const width = 1200; // Ancho del gráfico
        const height = 360; // Alto del gráfico
        const margin = { top: 20, right: 30, bottom: 30, left: 50 };

        const svg = timeTemporalDiv.append('svg')
            .attr('width', width)
            .attr('height', height);

        const xScale = d3.scaleTime()
            .domain(d3.extent(averagedData, d => d.date))
            .range([margin.left, width - margin.right]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(averagedData, d => d.average)])
            .nice() // Ensure the y-axis range is rounded
            .range([height - margin.bottom, margin.top]);

        // Añadir el fondo de las estaciones
        addSeasonalBackground(svg, xScale, height, margin);

        // Definir los colores según el nivel de AQI
        const aqiColors = {
            1: '#00E400', // Bueno (0-50)
            2: '#FFFF00', // Moderado (51-100)
            3: '#FF7E00', // Insalubre para grupos sensibles (101-150)
            4: '#FF0000', // Insalubres (151-200)
            5: '#800080', // Muy insalubre (201-300)
            6: '#800000'  // Peligroso (301 en adelante)
        };
        
        // Añadir puntos al gráfico
        svg.selectAll('circle')
            .data(averagedData)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.average))
            .attr('r', d => d.date.toISOString().split('T')[0] === fecha ? 12 : 4) // Ajustar radio según la fecha
            .attr('fill', d => {
                // Encontrar el color del AQI para la fecha y estación correspondientes
                const aqiRecord = aqiOutputData.find(a => a.date === d.date.toISOString().split('T')[0] && a.stationId === d.stationId);
                return aqiRecord ? aqiColors[aqiRecord[selectedContaminant]] : 'steelblue'; // Usar color por defecto si no hay registro de AQI
            })
            .attr('stroke', d => d.date.toISOString().split('T')[0] === fecha ? 'blue' : 'none') // Ajustar borde según la fecha
            .attr('stroke-width', d => d.date.toISOString().split('T')[0] === fecha ? 3 : 0) // Ajustar ancho del borde según la fecha
            .on('mouseover', function(event, d) {
                // Mostrar tooltip
                tooltip.style('display', 'inline');
                
                // Filtrar los datos para obtener la serie temporal completa de la misma fecha y stationId
                const timeSeriesData = filteredAqData.filter(t => t.date === d.date.toISOString().split('T')[0] && t.stationId === d.stationId);
            
                // Crear un mini gráfico dentro del tooltip
                const tooltipWidth = 350;
                const tooltipHeight = 130;
                const margin = { top: 10, right: 10, bottom: 20, left: 30 };
            
                // Limpiar el contenido anterior del tooltip
                tooltip.html(''); // Limpia el contenido del tooltip
            
                // Estilo del tooltip
                tooltip.style('background-color', 'white')
                    .style('border', '1px solid black')
                    .style('padding', '10px')
                    .style('border-radius', '5px'); 
            
                // Añadir la información básica al tooltip
                tooltip.append('div').html(`Station ID: ${d.stationId}<br>Date: ${d.date.toISOString().split('T')[0]}<br>${selectedContaminant}: ${d.average}`);
            
                // Añadir el contenedor SVG para la gráfica
                const svg = tooltip.append('svg')
                    .attr('width', tooltipWidth)
                    .attr('height', tooltipHeight);
            
                const yScale = d3.scaleLinear()
                    .domain([0, d3.max(timeSeriesData, t => +t[selectedContaminant])])
                    .range([tooltipHeight - margin.bottom, margin.top]);
            
                // Eje X (Horas del día)
                const numTicks = 7; // Número de horas a mostrar
                const totalHours = 24; // Total de horas en un día
                const hours = d3.range(0, totalHours, totalHours / numTicks).map(h => {
                    const date = new Date(0, 0, 0, h); // Crear una fecha base con la hora correspondiente
                    return d3.timeFormat('%I %p')(date); // Formato de hora en AM/PM
                });

                // Crear una escala lineal para el eje X
                const xScale = d3.scaleLinear()
                    .domain([0, totalHours - 1]) // Dominio de 0 a 23
                    .range([margin.left, tooltipWidth - margin.right]); // Rango del gráfico

                // Añadir el eje X al SVG
                svg.append('g')
                    .attr('transform', `translate(0,${tooltipHeight - margin.bottom})`)
                    .call(d3.axisBottom(xScale)
                        .tickValues(d3.range(0, totalHours, totalHours / numTicks)) // Mostrar las horas específicas
                        .tickFormat((d) => {
                            const hour = new Date(0, 0, 0, d); // Crear una fecha base
                            return d3.timeFormat('%I %p')(hour); // Formato de hora en AM/PM
                        })
                    );

                // Eje Y (Valores del contaminante)
                svg.append('g')
                    .attr('transform', `translate(${margin.left},0)`)
                    .call(d3.axisLeft(yScale));
            
                // Línea de la serie temporal
                const line = d3.line()
                    .x((d, i) => xScale(i))
                    .y(d => yScale(+d[selectedContaminant]));
            
                svg.append('path')
                    .datum(timeSeriesData)
                    .attr('fill', 'none')
                    .attr('stroke', 'steelblue')
                    .attr('stroke-width', 2)
                    .attr('d', line);
            
                // Obtener las dimensiones del gráfico para calcular los sectores
                const chartWidth = d3.select('svg').node().clientWidth;
                const chartHeight = d3.select('svg').node().clientHeight;
            
                // Posicionar el tooltip en función de la ubicación del mouse y el sector
                const [mouseX, mouseY] = d3.pointer(event);
                let tooltipX, tooltipY;
            
                // Dividir el gráfico en 4 sectores y ajustar la posición del tooltip
                if (mouseX < chartWidth / 2 && mouseY < chartHeight / 2) { // Superior izquierda
                    tooltipX = mouseX + 15;  // Hacia la derecha del punto
                    tooltipY = mouseY;  // Mismo nivel
                } else if (mouseX >= chartWidth / 2 && mouseY < chartHeight / 2) { // Superior derecha
                    tooltipX = mouseX - tooltipWidth - 30; // Hacia la izquierda del punto
                    tooltipY = mouseY;  // Mismo nivel
                } else if (mouseX < chartWidth / 2 && mouseY >= chartHeight / 2) { // Inferior izquierda
                    tooltipX = mouseX + 15;  // Hacia la derecha del punto
                    tooltipY = mouseY - tooltipHeight - 30; // Un poco arriba del punto
                } else if (mouseX >= chartWidth / 2 && mouseY >= chartHeight / 2) { // Inferior derecha
                    tooltipX = mouseX - tooltipWidth - 30; // Hacia la izquierda del punto
                    tooltipY = mouseY - tooltipHeight - 30; // Un poco arriba del punto
                }
            
                tooltip
                    .style('left', `${tooltipX}px`)  // Ajusta la posición del tooltip
                    .style('top', `${tooltipY}px`);  // Ajusta la posición del tooltip
            
                // Cambiar tamaño y agregar borde al pasar el mouse
                d3.select(this)
                    .attr('r', 8) // Aumentar el radio del círculo
                    .attr('stroke', 'blue') // Agregar borde azul
                    .attr('stroke-width', 2); // Ancho del borde
            })
            .on('mouseout', function(event, d) {
                // Ocultar tooltip y restaurar tamaño y color del punto
                tooltip.style('display', 'none');
                d3.select(this)
                    .attr('r', d => d.date.toISOString().split('T')[0] === fecha ? 12 : 4) // Restaurar el radio original
                    .attr('stroke', d => d.date.toISOString().split('T')[0] === fecha ? 'blue' : 'none'); // Eliminar el borde
            })
            .on('click', function(event, d) {
                // Obtener el índice del contaminante seleccionado
                const aqAttributes = ['PM2_5', 'PM10', 'NO2', 'CO', 'O3', 'SO2'];
                const meoAttributes = ['temperature', 'pressure', 'humidity'];
                const attributes = [...aqAttributes, ...meoAttributes];

                // Encontrar el índice del contaminante seleccionado
                const contaminantIndex = aqAttributes.indexOf(selectedContaminant);

                // Extraer la columna de correlaciones del contaminante
                const correlations = matrixCorrelaction[contaminantIndex].slice(aqAttributes.length); // Correlaciones con atributos meteorológicos

                // Crear una lista de pares [atributo, correlación] y ordenar por correlación
                const sortedCorrelations = meoAttributes.map((attr, index) => ({
                    attribute: attr,
                    correlation: correlations[index]
                })).sort((a, b) => b.correlation - a.correlation);

                // Mostrar la lista ordenada en la consola
                console.log(`Correlaciones con ${selectedContaminant}:`);
                sortedCorrelations.forEach(item => {
                    console.log(`${item.attribute}: ${item.correlation}`);
                });

                // Log del evento de clic
                console.log(`Station ID: ${d.stationId}, Date: ${d.date.toISOString().split('T')[0]}, ${selectedContaminant}: ${d.average}`);
                console.log(fecha);
                console.log(contaminate);
            });

        // Añadir el eje X
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y-%m-%d')));

        // Añadir el eje Y
        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale));

        // Crear la línea de promedio
        svg.append('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', yScale(overallAverage))
            .attr('y2', yScale(overallAverage))
            .attr('stroke', 'red')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');

        // Crear el tooltip
        const tooltip = d3.select('#tooltip-time-temporal');
    });
}




function addSeasonalBackground(svg, xScale, height, margin) {
    var seasons = [
        { name: "Primavera", start: "03-20", end: "06-21", color: "#d0f0c0" },
        { name: "Verano", start: "06-21", end: "09-22", color: "#f0e68c" },
        { name: "Otoño", start: "09-22", end: "12-21", color: "#f4a460" },
        { name: "Invierno", start: "12-21", end: "03-20", color: "#add8e6" },
    ];

    var yearRange = xScale.domain(); // Obtén el rango de años del gráfico
    var startYear = yearRange[0].getFullYear();
    var endYear = yearRange[1].getFullYear();

    seasons.forEach(function(season) {
        for (var year = startYear; year <= endYear; year++) {
            var startDate = new Date(year + "-" + season.start);
            var endDate = new Date(year + "-" + season.end);

            // Ajustar invierno que cruza el año
            if (season.name === "Invierno" && season.start === "12-21") {
                endDate = new Date((year + 1) + "-03-20"); // Ajusta la fecha de fin para cubrir hasta el siguiente año
            }

            // Ajustar fecha de inicio para invierno que cubre el principio del año siguiente
            if (season.name === "Invierno" && season.start === "01-01") {
                startDate = new Date(year + "-01-01");
                endDate = new Date(year + "-03-20");
            }

            // Asegurarse de que endDate se ajuste al año siguiente si es invierno
            if (season.name === "Invierno" && season.end === "03-20" && endDate < startDate) {
                endDate = new Date((year + 1) + "-03-20");
            }

            // Dibujar solo si las fechas están dentro del rango del gráfico
            if (startDate <= yearRange[1] && endDate >= yearRange[0]) {
                var xStart = xScale(Math.max(startDate, yearRange[0]));
                var xEnd = xScale(Math.min(endDate, yearRange[1]));

                // Asegúrate de no dibujar un rectángulo con un ancho negativo
                if (xEnd > xStart) {
                    svg.append("rect")
                        .attr("x", xStart)
                        .attr("y", margin.top)
                        .attr("width", xEnd - xStart)
                        .attr("height", height - margin.top - margin.bottom)
                        .attr("fill", season.color)
                        .attr("opacity", 0.3);
                }
            }
        }
    });
}




// // Inicializar la gráfica de serie temporal al cargar la página
// window.addEventListener('load', initializeChart);

});
