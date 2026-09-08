# Planificación de mejoras de Hostelegal

Última actualización: 7 de septiembre de 2026.

## Incidencia de despliegue detectada

- Al abrir la Carta Digital en el entorno desplegado aparece el error genérico de carga.
- El repositorio local no está vinculado a Supabase, por lo que no permite contrastar las migraciones remotas desde este equipo.
- Se confirmó que el frontend nuevo se desplegó antes de `202609070001_secure_menu_import.sql`: la consulta requería columnas de borrador que aún no existían.
- Se añadió diagnóstico seguro para distinguir migración pendiente, cartas duplicadas, datos antiguos inválidos y fallos transitorios.
- Las dos migraciones compatibles ya están aplicadas en Supabase; queda repetir la prueba desde Vercel Preview.
- Google Drive rechazaba el dominio dinámico de Vercel Preview con `403 PERMISSION_DENIED`; Producción sí está autorizada y la carpeta mantiene 17 archivos. El repositorio ofrece ahora automáticamente la vista pública de la misma carpeta cuando falla la API restringida.

## Auditoría remota de Supabase (`alergomenu`)

- Proyecto activo y saludable; vínculo local verificado.
- Las migraciones `202609070001` y `202609070002` están aplicadas y sincronizadas con el repositorio.
- Estado agregado: 13 cuentas Auth, 12 perfiles de empresa y 6 cartas.
- No hay empresas con varias cartas, cartas huérfanas, perfiles huérfanos, menús incompatibles, cuotas nulas ni nombres que superen los nuevos límites.
- Una cuenta Auth confirmada y utilizada no tiene perfil en `empresas`; requiere revisión individual antes o después del despliegue.
- La API anónima permite actualmente enumerar las 12 empresas y expone correo, caducidad de suscripción, contador documental y rol. El cierre de permisos de la promoción a Producción elimina este acceso directo.
- Los correos de los 12 perfiles ya coinciden con Auth, por lo que su sincronización no cambiaría valores.
- Las 6 cartas actuales se conservarán publicadas. Sus 208 ingredientes antiguos sin alérgenos ni marca explícita conservarán el significado del editor anterior (`Ninguno`) en el borrador inicial; una celda vacía de una importación nueva seguirá pendiente de revisión.
- La API de backups no lista copias recuperables y PITR no está activo. No aplicar cambios remotos sin decidir antes una estrategia de respaldo.
- La implantación se divide en una fase compatible y un cierre de permisos: las migraciones permiten probar Vercel Preview sin romper Producción; el script de `cutover` se reserva para la promoción definitiva.
- Verificación posterior: 6 cartas conservadas y publicadas, 6 borradores inicializados, 0 ingredientes antiguos pendientes, RPC pública operativa y compatibilidad anónima antigua conservada temporalmente.
- Edge Function `admin-users` desplegada y activa en versión 7. Vercel informa despliegue correcto del commit de compatibilidad.

## Objetivo

Incorporar la importación de cartas mediante Excel y resolver previamente los riesgos de permisos, aislamiento entre cuentas, revisión de alérgenos y persistencia detectados en la revisión del repositorio.

## Estado

| Bloque | Responsable | Estado | Criterio de cierre |
| --- | --- | --- | --- |
| Seguridad de `empresas` | backend | Fase compatible desplegada | Ejecutar el cierre al promover a Producción |
| Borrador y publicación | backend + integración | Implementado | Editar no modifica el QR hasta publicar |
| Aislamiento entre cuentas | integración | Implementado | El cambio de sesión limpia estado y descarta respuestas tardías |
| Importación Excel | importación Excel | Implementado | Plantilla, vista previa, errores y confirmación funcionan |
| Revisión de alérgenos | importación Excel + integración | Implementado | Los vacíos quedan pendientes y bloquean publicación |
| Administración de clientes | backend | Desplegado en Preview | Altas y cambios sensibles pasan por Edge Function |
| Cuota documental | backend + documentación | Implementado en servidor | RPC idempotente; falta configurar la automatización en el entorno |
| Integración Tally | documentación | Implementado | Solo se aceptan mensajes del formulario y ventana esperados |
| Calidad | integración | Implementado | Instalación limpia, compilación, lint, pruebas y revisión visual pasan |

## Secuencia de implantación

1. Aplicar las migraciones compatibles de Supabase y resolver cualquier duplicado de cartas que el preflight detecte.
2. Desplegar la Edge Function `admin-users` y validar la Preview sin interrumpir el frontend antiguo de Producción.
3. Configurar Make/Tally para registrar envíos documentales de forma idempotente.
4. Promover el frontend con `VITE_PUBLIC_MENU_URL` apuntando al dominio público de cartas.
5. Ejecutar `supabase/cutover/lock_down_legacy_access.sql` junto con la promoción para cerrar el acceso directo antiguo.
6. Ejecutar una prueba final con una cuenta cliente, una cuenta administradora y una ventana anónima.

## Pruebas de aceptación

- Importar la plantilla con varios platos, `Ninguno`, varios alérgenos y una celda pendiente.
- Comprobar que los errores de fila impiden confirmar la importación.
- Confirmar que un pendiente impide publicar hasta revisarlo.
- Verificar que guardar un borrador no modifica la carta pública.
- Publicar y comprobar el mismo QR desde una sesión anónima.
- Cambiar de cuenta en el mismo navegador y comprobar que no aparece la carta anterior.
- Confirmar que un cliente no puede cambiar su rol, fecha o cuota mediante la API.
- Confirmar que repetir el mismo identificador de envío documental no consume dos unidades.

## Riesgos y despliegue

- La migración se detiene si existen varias cartas para una empresa; deben consolidarse manualmente para no perder datos.
- La Edge Function se ha revisado estáticamente y debe probarse en un proyecto Supabase de ensayo.
- La interacción de teclado dentro de una misma página del iframe de Tally no es visible para la página padre; los eventos de navegación y envío sí renuevan la actividad.
- ExcelJS arrastra avisos de seguridad en una dependencia transitiva; el importador limita tamaño, entradas y descompresión, y debe mantenerse actualizado.

## Registro de validación

- Documentación de interés: recuperadas las tarjetas también cuando Drive rechaza la API. Catálogo de respaldo con los 17 documentos públicos actuales, nombres legibles y descarga desde Drive. La API sigue actualizando el listado cuando está disponible; el respaldo no incorpora automáticamente altas posteriores.

- Alcance confirmado: cuota desde la aplicación sin modificar Make. RPC autenticada registrar_envio_tally con deduplicación, mes Europe/Madrid y formulario bloqueado al agotar cupo. Prueba del sexto envío y reinicio mensual superada.
- Cierre de permisos actualizado para sustituir las políticas reales del panel. Pendiente confirmar uso de los dominios antiguos portal-hostelegal y cartas-portal-hostelegal antes de ejecutarlo.

- Corrección de cuota: cinco solicitudes de PDF por mes natural en Europe/Madrid. Migración 202609070003 preparada; conserva el contador legado durante el mes de transición. Lecturas del restaurante y administrador calculan consumo vigente en servidor.
- Pendiente antes de main: conectar la reserva y el filtro previo a generación en Make siguiendo supabase/MAKE_QUOTA.md. Hasta ahora sólo el navegador actualizaba el contador; Make no aplica el límite por sí mismo.

- Plantilla Excel por columnas: los 14 alérgenos proceden del catálogo de la aplicación, con marcas ✓/☐ y opción Ninguno. Cabeceras y nombres de plato/ingrediente permanecen visibles al desplazarse.
- Importador compatible con las marcas y las plantillas antiguas. Verificado el recorrido de generación, guardado y lectura de un archivo real, incluyendo los 14 alérgenos, contradicciones y fórmulas rechazadas.

- [x] Pruebas de estado y validación de carta.
- [x] Pruebas de mensajes Tally.
- [x] Pruebas del importador Excel, incluida plantilla real y límite de descompresión.
- [x] Pruebas SQL con PostgreSQL embebido.
- [x] Compilación final.
- [x] Lint final.
- [x] Suite completa final.
- [x] Prueba visual del modal de importación en escritorio y móvil, incluyendo vista previa real.

Última validación: `npm run build`, `npm run lint` y las 35 pruebas de `npm test` completados correctamente. Cuota mensual preparada localmente, pendiente de despliegue e integración con Make.
- Validación de la recuperación de tarjetas: compilación y lint correctos; catálogo verificado con 17 identificadores únicos. Pendiente comprobación visual en navegador.

## Mejoras Excel e ingredientes (2026-09-08)

- [x] Añadir exportación de la carta al mismo formato de columnas y marcas que la plantilla Excel.
- [x] Hacer que el archivo exportado pueda volver a importarse conservando alérgenos y revisiones.
- [x] Normalizar tildes, mayúsculas y espacios en la búsqueda y deduplicación de ingredientes (`Atún` = `Atun`).
- [x] Admitir filas con plato y alérgenos sin ingrediente, manteniendo esa información editable y sin mostrar un ingrediente ficticio en la carta pública.
- [x] Ejecutar pruebas, compilación, lint y revisión final del diff: 38 pruebas, compilación y lint correctos.

## Excel sencillo, una fila por plato (2026-09-08)

- [x] Cambiar la plantilla y la exportación principal a una fila por plato.
- [x] Separar los ingredientes mediante saltos de línea dentro de la celda `Ingredientes`.
- [x] Guardar los alérgenos globales del plato sin atribuirlos incorrectamente a cada ingrediente.
- [x] Mantener la importación y exportación detalladas por ingrediente como formato opcional compatible.
- [x] Mostrar los alérgenos generales en el editor, el PDF y la carta pública.
- [x] Añadir una migración compatible que no modifica las cartas existentes.
- [x] Aplicar la migración `202609080004_dish_level_allergens.sql` al proyecto Supabase vinculado y validar el conjunto: 41 pruebas, compilación y lint correctos.
- [x] Retirar de Documentación de interés el aviso y el enlace para abrir la carpeta completa en Drive; se conservan las tarjetas y descargas individuales.

## Secciones personalizables de la carta (plan, 2026-09-08)

### Decisión de diseño

- Añadir `section?: string` a cada plato. Se mantiene `Dish[]` y las RPC actuales, por lo que no se transforman ni se borran cartas existentes.
- Las secciones serán libres. Ejemplos como Desayunos, Tapas, Mediodía o Postres serán sugerencias, no valores cerrados.
- Máximo 30 secciones y 60 caracteres por nombre. La comparación ignorará tildes, mayúsculas y espacios repetidos.
- El orden se obtiene de la posición de los platos: cada sección forma un bloque y al moverla se mueve el bloque completo.
- Si ningún plato tiene sección, la carta conserva exactamente la presentación actual. Si hay secciones, los platos sin clasificar se agrupan al final bajo `Otros`.
- Eliminar una sección moverá sus platos a `Sin sección`; nunca eliminará contenido del usuario.

### Fase 1 — Modelo y compatibilidad

- [x] Ampliar `Dish` con la sección opcional y crear utilidades puras para normalizar, agrupar y ordenar.
- [x] Incorporar acciones de estado para asignar un plato, renombrar una sección, eliminarla sin borrar platos y mover bloques.
- [x] Validar al cargar que `section`, si existe, sea texto no vacío de hasta 60 caracteres.
- [x] Añadir una migración compatible de `validar_datos_carta` que limite tipo, longitud y máximo de 30 secciones sin modificar filas existentes.

### Fase 2 — Constructor de carta

- [x] Añadir al editor del plato un selector que permita elegir una sección existente o escribir una nueva.
- [x] Mostrar sugerencias iniciales sin restringir los nombres personalizados.
- [x] Agrupar la tabla de platos por secciones, mostrando el número de platos de cada bloque.
- [x] Permitir renombrar, mover arriba/abajo y eliminar una sección; al eliminarla, mover sus platos a `Sin sección`.
- [x] Permitir cambiar un plato de sección desde su edición.
- [x] Mantener las protecciones actuales contra pérdida de un borrador en curso.

### Fase 3 — Carta pública y PDF

- [x] Agrupar la carta pública por secciones con encabezados claros y accesibles.
- [x] Mantener la vista plana actual cuando no existan secciones.
- [x] Reflejar el mismo orden y las mismas cabeceras en el resumen y desglose del PDF.
- [x] Evitar cabeceras huérfanas al cambiar de página en el PDF.

### Fase 4 — Excel

- [x] Añadir `Sección` como primera columna opcional de la plantilla sencilla y del Excel detallado.
- [x] Exportar una fila por plato conservando su sección; dejar la celda vacía para platos sin clasificar.
- [x] Detectar automáticamente Excel nuevos y anteriores, manteniendo compatibilidad con todos los formatos actuales.
- [x] Agrupar nombres de sección equivalentes sin distinguir tildes o mayúsculas y rechazar más de 30 secciones.

### Fase 5 — Verificación y despliegue

- [x] Probar creación, asignación, renombrado, eliminación y reordenación sin pérdida de platos.
- [x] Probar cartas antiguas sin secciones y cartas mixtas con platos sin clasificar.
- [x] Probar ida y vuelta de Excel sencillo y detallado, con y sin la columna `Sección`.
- [ ] Verificar editor, carta pública y PDF en escritorio y móvil.
- [x] Ejecutar pruebas completas, compilación, lint y revisión del diff: 47 pruebas correctas antes de la revisión final.
- [x] Aplicar la migración compatible `202609080005_menu_sections.sql` en Supabase; no modifica cartas existentes.
- [ ] Publicar en Preview de Vercel y completar la comprobación visual.

### Criterios de aceptación

- Un restaurante puede crear cualquier nombre de sección y asignar cada plato a una de ellas.
- `Postres`, `postres` y `Póstres` no crean tres secciones distintas.
- Renombrar, mover o eliminar una sección no elimina ni duplica platos.
- El editor, Excel, PDF y carta pública presentan las mismas agrupaciones y el mismo orden.
- Las cartas y los Excel existentes continúan funcionando sin intervención del usuario.
