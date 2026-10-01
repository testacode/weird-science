# Estado

> Mantenido por la skill `backlog`. Fuente única del estado del proyecto; la historia completa está en `HISTORICO.md`.
> Sitio solo para desktop (decisión 2026-09-30).

## En curso

- Nada.

## Backlog

1. **Fuentes en los otros 6 labs** (digestivo, luna, estaciones, circuito, fotosíntesis, ciclo del agua): verificar sus datos en navegador, anotarlos en `docs/fuentes.md` y sumar `fuentes(...)` al "Cómo funciona". En los 4 ya hechos faltan: gravedad de los planetas (flotación) y P50, Hill, 47 mmHg y 21/16/4 % (respiratorio).
2. **Próxima ola de labs** (temas en `temario.md`): sistema circulatorio, la célula, imanes y electricidad estática, luz (reflexión y refracción), sonido, volcanes y placas.
3. **Portada:** poster y loop de video por lab (como sael.net), y recorridos transversales por tema (energía, ciclos, sistemas; los tags ya están en cada `meta.ts`).
4. **Revisión de accesibilidad:** contraste, teclado y `prefers-reduced-motion`.
5. **Detalles:**
   - etiquetas superpuestas arriba de la Tierra en el solsticio de diciembre (estaciones);
   - estaciones: mover la inclinación con la pregunta sin responder la descarta pero deja el año en pausa (ciclo del agua, en el mismo caso, sigue corriendo);
   - `metrica()` no reajusta el tamaño al cambiar el ancho de la ventana;
   - offsets fijos de `.hud-linea` (luna) y `.zoom` (digestivo) en lugar de usar el encuadre;
   - archivos de más de 200 líneas: `fotosintesis/main.ts`, `luna/main.ts`, `circuito/escena.ts`, `particulas/main.ts`, `flotacion/model.ts`, `ciclo-agua/main.ts`.

## Hecho reciente

- 2026-10-01 — Kit: `fila` e `interruptor` (6 copias), `grafico.cambiar()` y `yTecho` (luna, estaciones y mezclas ya no recrean el gráfico; eje de 24 h), pastillas con `origen: 'derecha'`, línea de tiempo en `src/ui/linea.ts` (luna gana `pointercancel`), y los 10 labs con la pregunta en `pred.datos`. Descartado: `yMin` positivo (ningún lab lo usa). El "bug" de luna con `sombraTierra` no existía: la respuesta no depende de esa opción.
- 2026-10-01 — Constantes de partículas, flotación, mezclas y respiratorio verificadas contra la fuente (`docs/fuentes.md`): Cp del etanol sólido 1,9 → 0,97, Cp del gas del etanol 1,5 → 1,6 y de la acetona 1,3 → 1,4, ebullición del SiO₂ 2230 → 2950 °C y el aceite "no hierve". Sección "Fuentes" (helper `fuentes` del kit) en esos 4 labs.
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
