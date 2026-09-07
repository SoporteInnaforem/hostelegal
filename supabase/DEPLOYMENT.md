# Despliegue de importación y seguridad

1. Respaldar y aplicar `202609070001_secure_menu_import.sql`, después `202609070002_document_quota.sql`, sobre el esquema base existente. Esta fase conserva temporalmente los permisos antiguos para que Preview y Producción puedan coexistir.
2. Si hay varias cartas por empresa, la primera migración se detiene sin borrar datos. Resolver explícitamente conservando cartas y enlaces antes de reintentar.
3. Desplegar `admin-users` para probar la administración desde Preview.
4. Validar Preview con una cuenta de restaurante, una administradora y una ventana anónima.
5. Al promover el frontend a Producción, ejecutar en la misma ventana de despliegue `supabase/cutover/lock_down_legacy_access.sql`. El frontend antiguo deja de guardar y de leer cartas después de este cierre.
6. Ejecutar `supabase/tests/security_smoke.sql` en Supabase local. Estos scripts no se han ejecutado contra producción.

Las cartas existentes siguen publicadas. Los nuevos registros comienzan privados. `platos` y `nombre_carta` son la publicación; `borrador_platos` y `borrador_nombre_carta` son privados. El QR usa `obtener_carta_publica(p_id)` y nunca consulta directamente la tabla. La respuesta es una lista con `id`, `platos`, `nombre_carta`, `actualizado_en`.

`guardar_borrador_carta(p_platos,p_nombre,p_empresa_id)` y `publicar_carta(p_platos,p_nombre,p_empresa_id)` devuelven UUID. Exigen identidad coincidente y suscripción vigente; las fechas NULL antiguas mantienen acceso por compatibilidad. Publicar exige nombre, platos e ingredientes y revisión de alérgenos. Al crear el primer borrador de una carta antigua, la migración conserva la semántica del editor anterior y marca como revisados sus ingredientes sin bandera; las importaciones nuevas distinguen una celda vacía pendiente (`false`) de `Ninguno` revisado (`true`).

## Make / generación documental

Configurar el escenario de confianza para llamar mediante credencial service_role a `registrar_envio_documental(p_empresa_id uuid,p_event_id text)` **antes de generar el PDF**. Resolver y validar la empresa en el servidor; no confiar en campos ocultos del navegador. `p_event_id` debe ser el identificador estable del envío original de Tally, conservado durante reintentos.

Respuesta JSON: `accepted: false` y `reason` (`unknown_company`, `event_conflict`, `expired_subscription`, `quota_exceeded`) indica detener procesamiento. `accepted: true, duplicate: false` reserva una unidad atómicamente. `accepted: true, duplicate: true` no consume otra unidad: usar el estado persistente del escenario para evitar generar/enviar dos veces o recuperar un intento interrumpido. La reserva mide solicitudes aceptadas, no prueba la generación final del PDF. Las reservas fallidas no se reembolsan automáticamente; el administrador puede ajustar el contador tras revisar el incidente.

No se incluye endpoint webhook público: falta el contrato de autenticación de Make/Tally. El navegador no tiene permiso para llamar a esta RPC ni alterar el contador. Es obligatorio configurar el escenario antes de habilitar producción; el evento postMessage ya no es prueba de generación.

La API de Auth y la actualización del perfil no comparten transacción. Al crear, se revierte la cuenta recién creada si falla el perfil. Al editar, los errores parciales se muestran explícitamente; el email se sincroniza mediante trigger dentro de la transacción Auth. Un fallo posterior al cambio de contraseña puede requerir recargar y guardar de nuevo el perfil.
