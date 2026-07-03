# Taller de Sintaxis — guía para agentes

Webapp educativa de sintaxis del español (NGLE / EBAU Murcia), de Josele (filólogo, no programador, aprendiendo a programar). SPA estática modular: sin build, sin bundler, sin framework, sin TypeScript.

- **Arquitectura completa** (mapa de módulos, estado, backend, localStorage, convenciones de código): `arquitectura.md`.
- **Pendientes y roadmap**: `roadmap.md`.
- **Deuda técnica conocida**: `deuda_tecnica.md`.
- **Terminología NGLE, schema JSON de oración compuesta, memoria de sesiones anteriores**: invoca el skill `taller-sintaxis` antes de trabajar en este proyecto.

No dupliques aquí lo que ya vive en esos documentos — si algo cambia, actualízalo ahí, no aquí.

## Reglas no negociables

1. **Apps Script**: redesplegar SIEMPRE como "Nueva versión" de la implementación existente (Implementar → Gestionar implementaciones → lápiz → Nueva versión). NUNCA "Nueva implementación" — genera una URL distinta y rompe la app en producción.
2. **Un cambio a la vez**: confirmar con Josele entre pasos; un commit por paso. No agrupar varios cambios sin avisar antes.
3. **Terminología NGLE**: nunca "grupo" (usar "sintagma"); nunca PP/PS visibles al alumno (usar P1/P2/P3); «para» nunca introduce CI. Lista completa en el skill.
4. Antes de tocar `js/modules/sint/index.js` o `js/modules/compuestas/index.js` (los dos motores grandes), lee la sección correspondiente de `arquitectura.md` — no asumas el schema de datos sin comprobarlo en el código real.
5. Sin tests automatizados (deuda técnica conocida) — no los introduzcas sin que Josele lo pida explícitamente.
