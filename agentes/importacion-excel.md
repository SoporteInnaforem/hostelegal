# Agente de importación Excel

## Objetivo

Añadir una importación guiada de cartas desde `.xlsx`, con plantilla, validación y vista previa.

## Alcance asignado

- `src/features/dish-builder/components/ImportMenuModal.tsx`
- `src/features/dish-builder/utils/menuImport.ts`
- Pruebas del importador

## Contrato funcional

- Hoja `Carta` con columnas `Plato`, `Ingrediente` y `Alérgenos`.
- Una fila por ingrediente.
- Alérgenos separados por punto y coma.
- `Ninguno` confirma explícitamente que no contiene alérgenos declarables.
- Una celda vacía queda pendiente de revisión y bloquea la publicación.
- La importación añade platos a la carta y no sobrescribe los existentes.

## Límites

- Archivos `.xlsx` de hasta 2 MB.
- Máximo 2.000 filas, 300 platos y 100 ingredientes por plato.
- Rechazo de fórmulas, celdas combinadas, cabeceras incorrectas, duplicados y alérgenos desconocidos.
- Inspección del ZIP antes de procesarlo para limitar el contenido descomprimido.

## Verificación

Pruebas de parser, límites, conflictos, plantilla y recorrido real de un archivo Excel generado.

