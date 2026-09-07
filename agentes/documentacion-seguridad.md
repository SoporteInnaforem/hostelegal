# Agente de documentación y seguridad de sesión

## Objetivo

Endurecer la integración con Tally, evitar mutaciones de cuota desde el navegador y mejorar la recuperación de contraseña.

## Alcance asignado

- `src/features/documentation/`
- `src/hooks/useInactivity.ts`
- `src/features/auth/ActualizarPassword.tsx`

## Resultado

- Validación del origen, ventana emisora, formulario y estructura de mensajes Tally.
- Eliminación del incremento de cuota desde el cliente.
- Mensaje de envío pendiente, sin asegurar que el PDF ya se haya generado.
- Renovación de actividad ante eventos verificables del formulario.
- Recuperación de contraseña sin registrar tokens o URL sensibles y con salida controlada del estado de carga.

## Integración pendiente de entorno

La automatización Make/Tally debe invocar `registrar_envio_documental` con `service_role` y un identificador único de envío. Este paso se documenta en `supabase/DEPLOYMENT.md` y debe configurarse al desplegar.

