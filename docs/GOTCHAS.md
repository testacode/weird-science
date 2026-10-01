# Gotchas

- **TypeScript 7 vs typescript-eslint** (2026-09): `typescript@latest` es 7.x, pero typescript-eslint 8.71 pide `typescript <6.1`. El repo fija `typescript ~6.0.3`. No subir a 7 hasta que typescript-eslint lo soporte.
- **Vite 8**: `build.rollupOptions` quedó deprecado; las páginas del multi-page van en el `input` de nivel superior. `vite.config.ts` lo arma solo con cada `labs/<slug>/index.html`, y el catálogo sale de `src/labs/*/meta.ts` (`import.meta.glob`): un lab nuevo no toca archivos compartidos.
- **`import.meta.dirname` en `vite.config.ts`** necesita `@types/node` y `"node"` en `types` del tsconfig.
- **Postprocesado**: `OutputPass` va último, porque aplica el tone mapping y el espacio de color. Las partículas usan `MeshBasicMaterial({ toneMapped: false })` para que el bloom las haga brillar.
- **Click en objetos 3D vs arrastrar la cámara**: el raycast solo cuenta como click si el puntero se movió menos de 5 px entre `pointerdown` y `pointerup`.
- **Verificación**: si el Chrome CDP personal (9222) está caído, `agent-browser --session <nombre>` levanta su propio Chromium headless, que renderiza WebGL sin problemas.
- **HUD derecho (desde la ola 1)**: `.hud-der` es una columna sin fondo; la consola va adentro como `.panel.consola` y debajo la tarjeta de predicción. Un lab que arme `hud hud-der panel` como antes queda con doble panel.
- **Fuentes en canvas 2D**: hay que esperar `document.fonts.load(...)` y redibujar; si no, el primer cuadro del gráfico sale con la fuente de fallback.
- **`[hidden]` vs `.panel`**: con clases que setean `display`, el atributo `hidden` no alcanza; `.prediccion[hidden]` necesita `display: none` explícito.
- **Worktrees dentro del repo**: eslint y vitest escanean `.worktrees/` si no se excluyen, y el check de `main` termina corriendo el código a medio hacer de otros agentes. Excluidos en `eslint.config.js` y en el script `test`.
- **`PointLight` con `visible = false`** la saca de la escena y recompila los shaders (tirón). Para apagar una luz, bajar la intensidad a 0.
- **Niebla del escenario** (`scene.fog` empieza en 16): con la cámara más lejos, la maqueta se apaga. El lab puede ajustar `scene.fog` localmente.
