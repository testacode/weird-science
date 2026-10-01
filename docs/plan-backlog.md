# Plan del backlog con agentes en paralelo

Acordado el 2026-09-30. El objetivo es que varios agentes trabajen a la vez sin editar los mismos archivos.

## Reglas
- Sitio solo para desktop.
- Sin tests unitarios nuevos. La verificación es typecheck + lint + prueba en el navegador (captura y consola limpia).
- Cada agente trabaja en su worktree `.worktrees/<slug>`, en la branch `feat/<slug>`, y commitea ahí. Carlos (vía Claude principal) revisa, mergea a `main` y pushea; cada push publica en Vercel.
- Cada agente edita solo `src/labs/<slug>/` y `labs/<slug>/`. Si necesita algo de `src/ui/` o `src/escena/`, lo reporta y no lo toca.
- `docs/STATUS.md` y `docs/GOTCHAS.md` los edita solo el agente principal.
- Puertos fijos por agente (5181-5185, `--strictPort`) y sesión headless propia de agent-browser (`--session <slug>`). Nunca el CDP personal.

## Antes de cada merge
1. Code review del branch (agente Opus, solo lectura): modelo, predicciones, estado de la UI y datos. Con scripts descartables que barren combinaciones.
2. Arreglos en el mismo branch (los hace el agente que escribió el lab).
3. Prueba en el Chrome CDP personal, con la tab activa (Chrome frena `requestAnimationFrame` en tabs de fondo). Revisar `agent-browser console`, no solo `errors`.
4. Merge a `main`, push (publica en Vercel) y borrar el worktree.

## Olas
| Ola | Quién | Qué |
|---|---|---|
| 0 | principal | Vite descubre `labs/*/index.html`; el catálogo sale de `src/labs/*/meta.ts` |
| 1 | 1 agente | Kit: filtro info/info avanzada, "predecí antes de correr", gráfico canvas 2D; aplicado al digestivo |
| 2 | 5 agentes | digestivo-extras · fotosíntesis · partículas · circuito · luna |
| 3 | después del merge | kit unificado (hecho) · posters y loops de la portada · recorridos transversales · accesibilidad |
| 4 | 5 agentes | respiratorio · flotación · ciclo del agua · mezclas · estaciones (hecho) |

## Receta de un lab (ola 2)
1. `model.ts`: simulación pura, sin Three.js.
2. `escena.ts`: maqueta 3D sobre la mesada, con `crearEscenario` de `src/escena/`.
3. `contenido.ts`: gancho, relato en vivo por estado, "¿Cómo funciona?" con "Qué es real y qué no". Usa el filtro de info avanzada.
4. `main.ts`: HUD con métricas, consola de controles y predicción.
5. `meta.ts`: título, eje, NAP, tags de recorrido, `listo: true` solo cuando está terminado.
6. `labs/<slug>/index.html`.
