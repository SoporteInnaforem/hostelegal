# Cuota mensual en Make

Estado: código preparado; pendiente conectar el escenario real y probarlo antes de promover a main.

El límite es cinco solicitudes nuevas de PDF aceptadas por restaurante y mes natural, según Europe/Madrid. El contador antiguo no tenía fechas: la migración conserva su valor para el mes de implantación. El mes siguiente comienza con cero de forma automática. No se necesita un cron ni borrar eventos anteriores.

## Orden del escenario

1. Recibir el envío del formulario Tally 441ZRY.
2. Resolver la empresa en el escenario de confianza. No confiar únicamente en empresa_id del enlace de Tally: es modificable por el navegador. Verificar la relación del envío con el cliente mediante la identificación que utilice el escenario. Falta conocer ese contrato para cerrar la integración.
3. Antes de los módulos que generan el PDF, añadir una petición HTTP POST a `https://awunlzafkmfwpjaehsey.supabase.co/rest/v1/rpc/registrar_envio_documental`.
4. Configurar Content-Type: application/json y la credencial service_role de Supabase en una conexión privada de Make (apikey y Authorization: Bearer). Nunca incluirla en el frontend, Git ni capturas compartidas.
5. Enviar este cuerpo con los valores mapeados de los pasos anteriores:

```json
{
  "p_empresa_id": "UUID validado de la empresa",
  "p_event_id": "ID estable del envío original de Tally"
}
```

No generar un UUID aleatorio ni usar el ID de ejecución de Make como p_event_id: los reintentos del mismo envío deben conservar el mismo identificador.

6. Permitir el paso a generación solamente cuando `accepted` sea true Y `duplicate` sea false.
7. Con accepted=false (quota_exceeded, expired_subscription, unknown_company o event_conflict), detener esa ruta. Con duplicate=true, detener la generación normal. Un error HTTP o respuesta incompleta tampoco debe permitir continuar.

## Fallos posteriores a la reserva

La unidad queda reservada antes del PDF, incluso si falla un módulo posterior. No se devuelve automáticamente porque repetir el envío podría gastar más créditos. Make debe conservar el estado del trabajo y recuperar una ejecución fallida de forma controlada. El administrador puede ajustar el consumo mensual tras revisar un fallo. El contador mide solicitudes aceptadas, no acredita que se haya entregado el PDF.

## Prueba de aceptación

Con una cuenta de prueba: aceptar los cinco primeros envíos distintos; bloquear el sexto antes de generar; reenviar un ID anterior sin generar ni cobrar otra unidad; comprobar que el consumo aparece en la aplicación. No probar el límite generando cinco PDF reales de clientes. No habilitar producción hasta verificar el filtro en el escenario.

Este control evita los módulos posteriores de generación, pero el disparador y la comprobación HTTP de Make también pueden consumir créditos.
