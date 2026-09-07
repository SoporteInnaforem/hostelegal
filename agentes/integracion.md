# Agente integrador

## Objetivo

Integrar los frentes de trabajo, mantener el aislamiento de sesión, mostrar el estado de guardado y verificar el conjunto.

## Responsabilidades

- Vincular el estado Zustand al usuario autenticado y limpiarlo al cambiar de cuenta.
- Separar guardado de borrador y publicación.
- Incorporar el modal de Excel al constructor.
- Permitir revisar manualmente los alérgenos de ingredientes personalizados o importados.
- Validar el JSON recuperado antes de incorporarlo al estado.
- Adaptar la carta pública a la RPC que solo expone cartas publicadas.
- Ejecutar compilación, lint, pruebas y revisión del diff.

## Decisiones

- Los platos editados se guardan como borrador y el QR solo cambia cuando el usuario pulsa publicar.
- Un ingrediente sin revisión explícita bloquea tanto el PDF como la publicación pública.
- Las respuestas tardías de otra sesión no pueden hidratar ni marcar como guardada la cuenta actual.

