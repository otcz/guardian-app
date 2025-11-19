# 📊 Plantilla Excel para Importar Lugares

## Formato del Archivo

Crea un archivo Excel (.xlsx o .xls) con las siguientes columnas:

| NOMBRE | TIPO |
|--------|------|
| B-52 | CASA |
| AULA 101 | AULA |
| OFICINA PRINCIPAL | OFICINA |
| ALMACEN CENTRAL | ALMACEN |

## Reglas de Importación

### 1. **Columna NOMBRE**
- Mínimo 3 caracteres
- Máximo 200 caracteres
- Se convertirá automáticamente a MAYÚSCULAS
- Ejemplos válidos:
  - B-52
  - PARQUE CENTRAL
  - OFICINA 301
  - AULA A-12

### 2. **Columna TIPO**
- Debe ser uno de los siguientes valores (exacto):
  - **APARTAMENTO**
  - **CASA**
  - **ALMACEN**
  - **AULA**
  - **BODEGA**
  - **DEPOSITO**
  - **LOCAL**
  - **OFICINA**
  - **SALON**
  - **OTRO**

⚠️ **Importante:** El tipo debe escribirse exactamente como se muestra (todo en MAYÚSCULAS).

## Ejemplo Completo

```
| NOMBRE              | TIPO        |
|---------------------|-------------|
| B-52                | CASA        |
| B-53                | CASA        |
| AULA 101            | AULA        |
| AULA 102            | AULA        |
| OFICINA PRINCIPAL   | OFICINA     |
| ALMACEN CENTRAL     | ALMACEN     |
| BODEGA A            | BODEGA      |
| DEPOSITO 1          | DEPOSITO    |
| LOCAL COMERCIAL     | LOCAL       |
| SALON DE EVENTOS    | SALON       |
| APARTAMENTO 4B      | APARTAMENTO |
```

## Proceso de Importación

1. **Prepara tu archivo Excel** con las columnas NOMBRE y TIPO
2. **Verifica** que los tipos sean válidos
3. **Haz clic** en "Importar Excel" en la lista de lugares
4. **Selecciona** tu archivo
5. **Revisa** la vista previa (muestra errores en rojo)
6. **Confirma** la importación

## Validaciones

El sistema validará automáticamente:
- ✅ Nombres con al menos 3 caracteres
- ✅ Nombres que no excedan 200 caracteres
- ✅ Tipos que coincidan con los válidos
- ✅ Filas no vacías

Los registros con errores se mostrarán en rojo en la vista previa, pero puedes importar solo los válidos.

## Notas Adicionales

- La primera fila puede ser un encabezado (se detecta automáticamente)
- Las filas vacías se ignoran
- Los nombres se convierten a MAYÚSCULAS automáticamente
- Los espacios al inicio y final se eliminan
- Los lugares se crearán en la sección seleccionada actualmente

