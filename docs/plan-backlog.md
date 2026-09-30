# Plan del backlog con agentes en paralelo

Acordado el 2026-09-30. El objetivo es que varios agentes trabajen a la vez sin editar los mismos archivos.

## Reglas
- Sitio solo para desktop.
- Sin tests unitarios nuevos. La verificación es typecheck + lint + prueba en el navegador (captura y consola limpia).
- Cada agente trabaja en su worktree `.worktrees/<slug>`, en la branch `feat/<slug>`, y commitea ahí. Carlos (vía Claude principal) revisa, mergea a `main` y pushea; cada push publica en Vercel.
- Cada agente edita solo `src/labs/<slug>/` y `labs/<slug>/`. Si necesita algo de `src/ui/` o `src/escena/`, lo reporta y no lo toca.
- `docs/STATUS.md` y `docs/GOTCHAS.md` los edita solo el agente principal.
- Puertos fijos por agente (5181-5185, `--strictPort`) y sesión headless propia de agent-browser (`--session <slug>`). Nunca el CDP personal.

## Olas
| Ola | Quién | Qué |
|---|---|---|
| 0 | principal | Vite descubre `labs/*/index.html`; el catálogo sale de `src/labs/*/meta.ts` |
| 1 | 1 agente | Kit: filtro info/info avanzada, "predecí antes de correr", gráfico canvas 2D; aplicado al digestivo |
| 2 | 5 agentes | digestivo-extras · fotosíntesis · partículas · circuito · luna |
| 3 | después del merge | posters y loops de la portada · recorridos transversales · accesibilidad |

## Receta de un lab (ola 2)
1. `model.ts`: simulación pura, sin Three.js.
2. `escena.ts`: maqueta 3D sobre la mesada, con `crearEscenario` de `src/escena/`.
3. `contenido.ts`: gancho, relato en vivo por estado, "¿Cómo funciona?" con "Qué es real y qué no". Usa el filtro de info avanzada.
4. `main.ts`: HUD con métricas, consola de controles y predicción.
5. `meta.ts`: título, eje, NAP, tags de recorrido, `listo: true` solo cuando está terminado.
6. `labs/<slug>/index.html`.
