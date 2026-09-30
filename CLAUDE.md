# Weird Science

Labs 3D de ciencias (Vite + TypeScript + Three.js, sin framework). Solo desktop. Deploy automático en Vercel con cada push a `main`.

## Reglas
- **Sin tests unitarios nuevos.** Verificar con `npm run check` (typecheck + lint) y en el navegador: captura del lab y consola sin errores.
- **Sin Tailwind ni frameworks de UI.** Usar el kit de `src/ui/` y el escenario de `src/escena/`.
- **Trabajo en paralelo:** ver `docs/plan-backlog.md`. Un agente de lab edita solo `src/labs/<slug>/` y `labs/<slug>/`. Si necesita algo del kit, lo reporta en lugar de editarlo.
- `docs/STATUS.md` y `docs/GOTCHAS.md` los mantiene el agente principal.
- Textos en español rioplatense, con tildes.

## Receta de un lab
El lab de referencia es `src/labs/digestivo/`: `model.ts` (simulación pura) → `escena.ts` (maqueta 3D) → `contenido.ts` (relato en vivo y "¿Cómo funciona?" con "Qué es real y qué no") → `main.ts` (HUD y controles) → `meta.ts` (tarjeta del catálogo) → `labs/<slug>/index.html`.
