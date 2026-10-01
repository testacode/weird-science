# Estado

> Mantenido por la skill `backlog`. Fuente única del estado del proyecto; la historia completa está en `HISTORICO.md`.
> Sitio solo para desktop (decisión 2026-09-30).

## En curso

- Nada.

## Backlog

1. **Verificar constantes contra fuente** (NIST/CRC, navegador real). Los agentes marcaron como "no verificadas":
   - partículas: cs, cg y Lf de alcohol y acetona;
   - flotación: densidades, salmuera y huevo;
   - mezclas: constantes de destilación y tamaños de grano;
   - respiratorio: PV, C_CO2 y VO₂ por actividad.
2. **Kit: subir lo que quedó copiado entre labs.**
   - Línea de tiempo arrastrable (luna, estaciones).
   - Helper `interruptor` (varios labs).
   - `grafico` con series mutables, `destruir()`, `yMin` positivo y tope exacto (24 h, no 25).
   - `crearPildoras` con `origen: 'derecha'`.
   - Migrar los otros 7 labs a `pred.datos` (siguen con `let pregunta` y resuelven con la config viva). El review marcó que en luna `sombraTierra` no descarta la pregunta abierta (no verificado).
3. **Próxima ola de labs** (temas en `temario.md`): sistema circulatorio, la célula, imanes y electricidad estática, luz (reflexión y refracción), sonido, volcanes y placas.
4. **Portada:** poster y loop de video por lab (como sael.net), y recorridos transversales por tema (energía, ciclos, sistemas; los tags ya están en cada `meta.ts`).
5. **Revisión de accesibilidad:** contraste, teclado y `prefers-reduced-motion`.
6. **Detalles:**
   - etiquetas superpuestas arriba de la Tierra en el solsticio de diciembre (estaciones);
   - estaciones: mover la inclinación con la pregunta sin responder la descarta pero deja el año en pausa (ciclo del agua, en el mismo caso, sigue corriendo);
   - `metrica()` no reajusta el tamaño al cambiar el ancho de la ventana;
   - offsets fijos de `.hud-linea` (luna) y `.zoom` (digestivo) en lugar de usar el encuadre;
   - archivos de más de 200 líneas: `fotosintesis/main.ts`, `luna/main.ts`, `circuito/escena.ts`, `particulas/main.ts`, `flotacion/model.ts`, `ciclo-agua/main.ts`.

## Hecho reciente

- 2026-10-01 — Kit: `prediccion` guarda los `datos` de la pregunta (congelados al preguntar, se borran al revelar u ocultar); migrados estaciones, ciclo del agua y respiratorio.
- 2026-10-01 — Favicon SVG en todas las páginas.
- 2026-10-01 — Ola 4: respiratorio, flotación, ciclo del agua, mezclas y estaciones, cada uno con code review y arreglos antes del merge.
- 2026-10-01 — Kit: `segmentado` ignora la opción ya elegida; `hud` libera paneles.
- 2026-10-01 — Botón y tecla H para los atajos del digestivo.
- 2026-10-01 — Kit unificado (Opus) y migración de los 5 labs.
- 2026-09-30 — Code review del digestivo: 10 arreglos.
- 2026-09-30 — Ola 2: circuito, estados de la materia, fotosíntesis, Luna y extras del digestivo.
- 2026-09-30 — Ola 1 del kit: info avanzada, predicción y gráfico.
- 2026-09-30 — Ola 0: labs autodescubiertos.
- 2026-09-30 — Piloto del digestivo, repo público y deploy en Vercel.
