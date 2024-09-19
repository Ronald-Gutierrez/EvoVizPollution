import matplotlib.pyplot as plt
import pandas as pd
import numpy as np  # Importar numpy directamente

# Datos de ejemplo
data = {
    'fecha': pd.date_range(start='2023-01-01', periods=10, freq='D'),
    'PM10': np.random.randint(50, 200, 10),  # Usar np.random en lugar de pd.np.random
    'Temperatura': np.random.uniform(10, 35, 10)  # Usar np.random en lugar de pd.np.random
}

df = pd.DataFrame(data)

fig, ax1 = plt.subplots()

# Graficar PM10
ax1.set_xlabel('Fecha')
ax1.set_ylabel('PM10', color='tab:blue')
ax1.plot(df['fecha'], df['PM10'], color='tab:blue', label='PM10')
ax1.tick_params(axis='y', labelcolor='tab:blue')

# Crear un segundo eje para la temperatura
ax2 = ax1.twinx()
ax2.set_ylabel('Temperatura (°C)', color='tab:red')
ax2.plot(df['fecha'], df['Temperatura'], color='tab:red', label='Temperatura')
ax2.tick_params(axis='y', labelcolor='tab:red')

# Mostrar el gráfico
fig.tight_layout()
plt.show()
