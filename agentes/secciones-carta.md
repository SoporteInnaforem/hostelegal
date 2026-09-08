# Agente de secciones de carta

## Objetivo

Permitir que cada restaurante organice libremente su carta en secciones como Desayunos, Tapas, Menú del día o Postres, conservando la compatibilidad con las cartas y archivos Excel actuales.

## Alcance asignado

- Modelo `Dish` y estado de la carta.
- Constructor y gestión de secciones.
- Carta pública y PDF.
- Importación, plantilla y exportación Excel.
- Validación de frontend, Supabase y pruebas.

## Contrato funcional

- Cada plato puede tener una sección opcional.
- Los nombres de sección son libres, se recortan y se comparan sin distinguir tildes, mayúsculas ni espacios repetidos.
- Máximo 30 secciones por carta y 60 caracteres por nombre.
- Una sección se crea al asignarla al primer plato; no se guardan secciones vacías.
- Renombrar una sección actualiza todos sus platos.
- Eliminar una sección mueve sus platos a `Sin sección`; nunca elimina platos.
- El orden de las secciones es el orden de aparición de sus bloques en la carta. Reordenar una sección mueve el bloque completo y conserva el orden interno de sus platos.
- Si una carta no utiliza secciones, el editor, el PDF y la carta pública mantienen el aspecto actual sin añadir una cabecera artificial.
- Cuando existen secciones, los platos no clasificados aparecen al final bajo `Otros`.

## Excel

- La plantilla sencilla incorpora `Sección` como primera columna y mantiene una fila por plato.
- La exportación detallada también incorpora `Sección`.
- La columna puede quedar vacía.
- El importador sigue aceptando los formatos anteriores que no incluyen `Sección`.
- Los nombres equivalentes, por ejemplo `Postres`, `postres` y `Póstres`, se agrupan en una sola sección conservando la primera escritura válida.

## Persistencia y seguridad

- Se añade `section?: string` dentro de cada plato del JSON existente.
- No se añaden tablas ni columnas y no se transforman cartas guardadas.
- Una migración compatible amplía `validar_datos_carta` para validar tipo, longitud y número máximo de secciones.
- Las RPC de borrador, publicación y lectura pública conservan sus firmas actuales.

## Verificación

- Crear, asignar, mover, renombrar y eliminar secciones sin perder platos.
- Compatibilidad con cartas antiguas sin `section`.
- Agrupación y orden equivalentes en editor, PDF y carta pública.
- Ida y vuelta de los Excel sencillo y detallado con y sin columna `Sección`.
- Rechazo de nombres inválidos y de más de 30 secciones.
- Compilación, lint, pruebas completas y comprobación visual en escritorio y móvil.
