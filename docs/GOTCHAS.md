# Gotchas

- **TypeScript 7 vs typescript-eslint** (2026-09): `typescript@latest` es 7.x, pero typescript-eslint 8.71 pide `typescript <6.1`. El repo fija `typescript ~6.0.3`. No subir a 7 hasta que typescript-eslint lo soporte.
- **Vite 8**: `build.rollupOptions` quedó deprecado. Las páginas del multi-page van en el `input` de nivel superior de `vite.config.ts`, que también aplica en dev. Cada lab nuevo se agrega ahí.
- **`import.meta.dirname` en `vite.config.ts`** necesita `@types/node` y `"node"` en `types` del tsconfig.
- **Postprocesado**: `OutputPass` va último, porque aplica el tone mapping y el espacio de color. Las partículas usan `MeshBasicMaterial({ toneMapped: false })` para que el bloom las haga brillar.
- **Click en objetos 3D vs arrastrar la cámara**: el raycast solo cuenta como click si el puntero se movió menos de 5 px entre `pointerdown` y `pointerup`.
- **Verificación**: si el Chrome CDP personal (9222) está caído, `agent-browser --session <nombre>` levanta su propio Chromium headless, que renderiza WebGL sin problemas.
