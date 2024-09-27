import pandas as pd

# Paso 1: Limpiar el archivo CSV
input_file = 'data/beijing_17_18_aq.csv'
cleaned_file = 'data/beijing_17_18_aq_clean.csv'

with open(input_file, 'r') as infile, open(cleaned_file, 'w') as outfile:
    for line in infile:
        # Verificar que la línea tenga el número correcto de campos (11 delimitadores = 12 campos)
        if line.count(',') == 11:  # Cambia 11 si el número de columnas esperado es diferente
            outfile.write(line)

# Paso 2: Cargar el archivo CSV limpio
data = pd.read_csv(cleaned_file)

# Paso 3: Normalizar las columnas de interés
columns_to_normalize = ['PM2_5', 'PM10', 'NO2', 'CO', 'O3', 'SO2']

# Función para normalizar
def normalize(column):
    return (column - column.min()) / (column.max() - column.min())

# Aplicar la normalización a las columnas seleccionadas
for column in columns_to_normalize:
    if column in data.columns:  # Asegurarse de que la columna exista
        data[column] = normalize(data[column])

# Paso 4: Guardar el DataFrame normalizado en un nuevo archivo CSV
data.to_csv('data/beijing_17_18_aq_NORMAL.csv', index=False)

print("Datos normalizados guardados en 'beijing_17_18_aq_NORMAL.csv'")
