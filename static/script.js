document.addEventListener('DOMContentLoaded', () => {
    const stationIdSelect = document.getElementById('stationId');
    const contaminantRadios = document.querySelectorAll('input[name="contaminant"]');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const chartDiv = d3.select('#chart');
    const tooltip = d3.select('#tooltip');

    // Define colores para los niveles de AQI
    const aqiColors = {
        1: '#00E400', // Bueno (0-50)
        2: '#FFFF00', // Moderado (51-100)
        3: '#FF7E00', // Insalubre para grupos sensibles (101-150)
        4: '#FF0000', // Insalubres (151-200)
        5: '#800080', // Muy insalubre (201-300)
        6: '#800000'  // Hazardous (301 en adelante)
    };

    // Función para eliminar el sufijo '_aq'
    function removeSuffix(text, suffix) {
        if (text.endsWith(suffix)) {
            return text.slice(0, -suffix.length);
        }
        return text;
    }

    // Carga el CSV y prepara los datos
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
                const [x, y] = d3.pointer(event, svg.node());
            
                tooltip.style('left', `${x + 5}px`)
                    .style('top', `${y - 28}px`);
            }
            
            function mouseout() {
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
});
