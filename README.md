
# EvoVizPollution

**EvoVizPollution** es una herramienta interactiva para visualizar y analizar patrones evolutivos de contaminación del aire junto con efectos meteorológicos. Esta aplicación permite explorar datos de calidad del aire de manera intuitiva y efectiva, facilitando la identificación de tendencias y patrones en la contaminación a lo largo del tiempo. Utiliza HTML, CSS y JavaScript para proporcionar una experiencia de usuario interactiva y atractiva.

## Características

- **Visualización Dinámica**: Gráficos interactivos que muestran la evolución de los índices de calidad del aire (AQI) a lo largo del tiempo.
- **Filtros Interactivos**: Selecciona estaciones de monitoreo, contaminantes y rangos de fechas para adaptar las visualizaciones a tus necesidades.
- **Colores Representativos**: Los niveles de AQI se visualizan con colores específicos para una rápida interpretación:
  - Verde: Bueno (0-50)
  - Amarillo: Moderado (51-100)
  - Naranja: Insalubre para grupos sensibles (101-150)
  - Rojo: Insalubre (151-200)
  - Morado: Muy insalubre (201-300)
  - Marrón: Hazardous (301 en adelante)
- **Interacción en el Gráfico**: Arrastra y haz zoom en el gráfico para explorar los datos en detalle. Obtén información adicional al pasar el ratón sobre los nodos.
- **Análisis Comparativo**: Visualiza los datos de diferentes estaciones y contaminantes en un mismo gráfico para comparar patrones.

## Tecnologías Utilizadas

- **HTML**: Estructura básica de la aplicación.
- **CSS**: Estilos para una presentación visual atractiva.
- **JavaScript**: Lógica de la aplicación y visualización de datos con D3.js.
- **Python**: Para el preprocesamiento de los datos y algoritmos que se utilizaron.

## Instalación

Para utilizar esta herramienta en tu entorno local, sigue estos pasos:

1. **Clona el Repositorio**:
   ```bash
   git clone https://github.com/Ronald-Gutierrez/EvoVizPollution.git
   ```

2. **Accede a la Carpeta del Proyecto**:
   ```bash
   cd EvoVizPollution
   ```

3. **Abre el Archivo HTML en tu Navegador**:
   Simplemente abre el archivo `index.html` en tu navegador para iniciar la aplicación.

## Uso

1. **Selecciona una Estación**: Usa el menú desplegable para elegir la estación de monitoreo.
2. **Elige un Contaminante**: Marca el contaminante que deseas analizar.
3. **Define el Rango de Fechas**: Ajusta las fechas de inicio y fin para filtrar los datos.
4. **Explora el Gráfico**: Interactúa con el gráfico para obtener detalles específicos sobre los datos.

## Contribuciones

Si deseas contribuir a este proyecto, por favor sigue estos pasos:

1. **Haz un Fork del Repositorio**.
2. **Crea una Rama para tu Funcionalidad**:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. **Realiza tus Cambios y Realiza un Commit**:
   ```bash
   git add .
   git commit -m "Añadida nueva funcionalidad"
   ```
4. **Empuja tus Cambios y Crea un Pull Request**:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```

## Contacto

Para preguntas o sugerencias, puedes contactar al autor a través de [GitHub](https://github.com/Ronald-Gutierrez).
