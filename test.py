import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import squareform
from matplotlib.patches import Patch

# Generar un DataFrame de ejemplo con datos de 7 días para cada atributo
np.random.seed(42)
data = pd.DataFrame({
    'PM10': np.random.rand(7) * 100,
    'PM2.5': np.random.rand(7) * 100,
    'O3': np.random.rand(7) * 100,
    'CO': np.random.rand(7) * 10,
    'SO2': np.random.rand(7) * 50,
    'NO2': np.random.rand(7) * 50
})

# Calcular la matriz de correlación
corr_matrix = data.corr()

# Convertir la matriz de correlación en una matriz de distancias (1 - correlación)
distance_matrix = 1 - corr_matrix

# Convertir la matriz de distancias en una forma compatible para clustering
distance_array = squareform(distance_matrix)

# Aplicar el algoritmo de clustering jerárquico
linked = linkage(distance_array, method='average')

# Crear el dendrograma
plt.figure(figsize=(14, 8))
dendro = dendrogram(linked, labels=corr_matrix.columns, color_threshold=0, above_threshold_color='black')

# Añadir nodos circulares en cada unión con un color basado en el nivel de contaminación
for i, d in zip(dendro['icoord'], dendro['dcoord']):
    x = 0.5 * sum(i[1:3])  # Coordenada x del nodo
    y = d[1]  # Coordenada y del nodo
    
    # Determinar el color del nodo según la escala de contaminación
    if y > 0.75:
        color = 'red'  # Muy contaminado
    elif y > 0.5:
        color = 'orange'  # Moderadamente contaminado
    elif y > 0.25:
        color = 'yellow'  # Levemente contaminado
    else:
        color = 'green'  # Poco contaminado
    
    # Dibujar el nodo con mayor tamaño y por encima de las líneas
    plt.scatter(x, y, s=300, color=color, edgecolor='black', zorder=5)  # Nodo más grande con zorder alto

# Crear la leyenda
legend_elements = [
    Patch(facecolor='green', edgecolor='black', label='Bueno'),
    Patch(facecolor='yellow', edgecolor='black', label='Levemente'),
    Patch(facecolor='orange', edgecolor='black', label='Moderadamente '),
    Patch(facecolor='red', edgecolor='black', label='Exceso')
]
plt.legend(handles=legend_elements, loc='upper right', title='Niveles de Contaminación')

# Personalizar y mostrar el gráfico
plt.title('Dendrograma con Nodos según Niveles de Contaminación')
# plt.xlabel('Atributos de Contaminación')
# plt.ylabel('Distancia (1 - Correlación)')
plt.show()
