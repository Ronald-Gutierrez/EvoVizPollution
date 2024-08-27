document.addEventListener('DOMContentLoaded', () => {
    const stationIdSelect = document.getElementById('stationId');
    const contaminantRadios = document.querySelectorAll('input[name="contaminant"]');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const chartDiv = d3.select('#chart');
    const tooltip = d3.select('#tooltip');
    const pcaChartDiv = d3.select('#pca-chart');

    // Define colores para los niveles de AQI
    const aqiColors = {
        1: '#00E400', // Bueno (0-50)
        2: '#FFFF00', // Moderado (51-100)
        3: '#FF7E00', // Insalubre para grupos sensibles (101-150)
        4: '#FF0000', // Insalubre (151-200)
        5: '#800080', // Muy insalubre (201-300)
        6: '#800000'  // Peligroso (301 en adelante)
    };

    // Función para obtener el color basado en el AQI
    function getAqiColor(aqi) {
        if (aqi <= 50) return aqiColors[1];
        if (aqi <= 100) return aqiColors[2];
        if (aqi <= 150) return aqiColors[3];
        if (aqi <= 200) return aqiColors[4];
        if (aqi <= 300) return aqiColors[5];
        return aqiColors[6];
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
            stationIdSelect.add(new Option(station, station));
        });

        // Añadir eventos de cambio para actualizar el gráfico
        function setupEventListeners() {
            stationIdSelect.addEventListener('change', updateCharts);
            contaminantRadios.forEach(radio => {
                radio.addEventListener('change', updateCharts);
            });
            startDateInput.addEventListener('change', updateCharts);
            endDateInput.addEventListener('change', updateCharts);
        }

        // Función para actualizar todos los gráficos
        function updateCharts() {
            updateChart();  // Actualiza el gráfico existente
            updatePcaChart();  // Actualiza el gráfico PCA
        }

        // Función para actualizar el gráfico principal
        function updateChart() {
            const stationId = stationIdSelect.value;
            const contaminant = document.querySelector('input[name="contaminant"]:checked')?.value;
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            if (!contaminant) return;

            const filteredData = data.filter(d => {
                const date = new Date(d.date);
                return d.stationId === stationId &&
                    d[contaminant] &&
                    date >= startDate &&
                    date <= endDate;
            });

            // (Código para crear el gráfico principal)
        }

        // Función para actualizar el gráfico PCA
        function updatePcaChart() {
            const stationId = stationIdSelect.value;
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            // Cargar datos de PCA
            d3.csv('data/PCA_VIZ_AQI.csv').then(pcaData => {
                const filteredPcaData = pcaData.filter(d => {
                    const date = new Date(d.date);
                    return d.stationId === stationId &&
                        date >= startDate &&
                        date <= endDate;
                });

                // Limpiar gráfico PCA anterior
                pcaChartDiv.selectAll('*').remove();

                const width = 600;
                const height = 400;

                const svg = pcaChartDiv.append('svg')
                    .attr('width', width)
                    .attr('height', height);

                // Escala para los ejes
                const xScale = d3.scaleLinear()
                    .domain(d3.extent(filteredPcaData, d => +d.PC1))
                    .range([50, width - 50]);

                const yScale = d3.scaleLinear()
                    .domain(d3.extent(filteredPcaData, d => +d.PC2))
                    .range([height - 50, 50]);

                // Crear puntos del gráfico PCA
                svg.selectAll('circle')
                    .data(filteredPcaData)
                    .enter().append('circle')
                    .attr('cx', d => xScale(+d.PC1))
                    .attr('cy', d => yScale(+d.PC2))
                    .attr('r', 5)
                    .attr('fill', d => getAqiColor(+d.AQI))
                    .on('mouseover', mouseover)
                    .on('mousemove', mousemove)
                    .on('mouseout', mouseout)
                    .on('click', clicked);

                // Funciones de tooltip
                function mouseover(event, d) {
                    tooltip.style('display', 'block')
                        .html(`Fecha: ${d.date}<br>AQI: ${d.AQI}`)
                        .style('left', `${event.pageX + 5}px`)
                        .style('top', `${event.pageY - 28}px`);
                }

                function mousemove(event) {
                    tooltip.style('left', `${event.pageX + 5}px`)
                        .style('top', `${event.pageY - 28}px`);
                }

                function mouseout() {
                    tooltip.style('display', 'none');
                }

                function clicked(event, d) {
                    console.log(`Station ID: ${d.stationId}, Fecha: ${d.date}, AQI: ${d.AQI}`);
                }
            });
        }

        // Configura los eventos de cambio
        setupEventListeners();

        // Inicializa los gráficos
        updateCharts();
    });
});
