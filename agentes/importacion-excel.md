# Agente de importación Excel

## Objetivo

Añadir una importación guiada de cartas desde `.xlsx`, con plantilla, validación y vista previa.

## Alcance asignado

- `src/features/dish-builder/components/ImportMenuModal.tsx`
- `src/features/dish-builder/utils/menuImport.ts`
- Pruebas del importador

## Contrato funcional

- Hoja `Carta` sencilla con `Plato`, `Ingredientes`, 14 columnas obtenidas del catálogo de alérgenos y `Ninguno`.
- Una fila por plato. Los ingredientes se separan mediante saltos de línea dentro de una celda y pueden omitirse.
- Compatibilidad con el formato detallado anterior, que utiliza una fila por ingrediente.
- Marcas ✓/☐ seleccionables por celda sin macros. El parser también acepta X, Sí y booleanos. Se mantiene compatibilidad con la plantilla antigua de tres columnas y alérgenos separados por punto y coma.
- `Ninguno` confirma explícitamente que no contiene alérgenos declarables.
- Una fila sin ninguna marca queda pendiente de revisión y bloquea la publicación. `Ninguno` no puede combinarse con otros alérgenos.
- La importación añade platos a la carta y no sobrescribe los existentes.
- La carta existente se exporta por defecto con una fila por plato y puede volver a importarse. También existe una exportación detallada opcional.

## Límites

- Archivos `.xlsx` de hasta 2 MB.
- Máximo 2.000 filas, 300 platos y 100 ingredientes por plato.
- Rechazo de fórmulas, celdas combinadas, cabeceras incorrectas, duplicados y alérgenos desconocidos.
- Inspección del ZIP antes de procesarlo para limitar el contenido descomprimido.

## Verificación

Pruebas de parser, límites, conflictos, plantilla y recorrido real de un archivo Excel generado.
