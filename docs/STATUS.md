# Estado

> Mantenido por la skill `backlog`. Fuente única del estado del proyecto; la historia completa está en `HISTORICO.md`.
> Sitio solo para desktop (decisión 2026-09-30).

## En curso

- Nada.

## Backlog

1. **Próxima ola de labs:** sin definir (ver `docs/temario.md`).
2. **Kit, pedidos de las olas 5 y 6:**
   - La tarjeta de predicción queda fuera de vista cuando la columna derecha hace scroll (célula, imanes y electrostática en una ventana de 727 px de alto): `preguntar` debería hacer `scrollIntoView({ block: 'nearest' })`.
   - `mezclar` (orden de opciones al azar) copiado en sonido, eco, electrostática y volcanes: llevarlo al kit.
   - Rótulo de `metrica` y texto de una opción de `segmentado` actualizables (electrostática los toca por DOM); `rango` actualizable en `deslizador` (eco lo recrea); `crearPildoras` sin forma de cambiar `origen` ni quitar pastillas (volcanes).
   - Pensar `resolver` + `pred.revisar()` en el kit para sacar las 6 líneas de `revelar` que repite cada lab (cambia la API).
   - Pasar a la opción `listo` (+ `if (!pred.listo) return` en el `revelar` del lab) los labs que todavía deciden el reveal a mano en el loop: flotación (`terminado`), circulatorio, respiratorio y fotosíntesis (ventana de tiempo), digestivo, mezclas (`progreso`), estaciones y luna (`tRevela`).
   - `grafico.cargar(puntos)` para dibujar de una vez (sonido, estaciones).
   - `segmentado` con estado deshabilitado; `deslizador` logarítmico y deshabilitado.
   - Botones con muestra de color (luz, flotación) como componente.
3. **Portada:** poster y loop de video por lab (como sael.net), y recorridos transversales por tema (energía, ciclos, sistemas; los tags ya están en cada `meta.ts`).
4. **Revisión de accesibilidad:** contraste, teclado y `prefers-reduced-motion`.
5. **Detalles:**
   - etiquetas superpuestas arriba de la Tierra en el solsticio de diciembre (estaciones);
   - sonido: franja negra arriba de la escena;
   - célula: con la vegetal sin pared al borde de la rotura, el reveal puede tardar ~71 s a 1× (espera el equilibrio real);
   - preguntas al borde de su umbral (imanes "alejar al doble" con banda muerta; luz, lápiz en aceite a 20° da 66 % contra la vara de 2/3);
   - estaciones: `llenarCurva` redibuja el gráfico una vez por punto (~95 veces por cambio de ciudad o modo); un `cargar(puntos)` en el kit lo dejaría en una;
   - estaciones: mover la inclinación con la pregunta sin responder la descarta pero deja el año en pausa (ciclo del agua, en el mismo caso, sigue corriendo);
   - `metrica()` no reajusta el tamaño al cambiar el ancho de la ventana;
   - offsets fijos de `.hud-linea` (luna) y `.zoom` (digestivo) en lugar de usar el encuadre;
   - volcanes: la barra "¿Fluye o explota?" escribe "10^8" y la métrica "10⁸";
   - archivos de más de 200 líneas: `electrostatica/escena.ts` y `main.ts`, `fotosintesis/main.ts`, `luna/main.ts`, `circuito/escena.ts`, `particulas/main.ts`, `flotacion/model.ts`, `ciclo-agua/main.ts`.

## Hecho reciente

- 2026-10-01 — Ola 6: eco, electrostática y volcanes (18 labs), cada uno con code review, arreglos del mismo agente y prueba en CDP; fuentes integradas en `docs/fuentes.md`.
- 2026-10-01 — Kit: opción `listo` de `prediccion` y getter `pred.listo` (hay predicción en curso y la pantalla ya muestra lo que se corrige); célula, sonido, partículas y ciclo del agua migrados (`resolver` corre una sola vez). `[hidden] { display: none !important }` global en `kit.css` y fuera los parches (10 en labs y 3 en el kit).
- 2026-10-01 — Kit de predicción: modo libre (interruptor "Preguntas" junto a "Info avanzada", en localStorage), `revelarEn` (el timer lo cancela la tarjeta), botón "Saltar y hacerlo igual" en la tarjeta y `saltar(datos)` como único camino para seguir sin predecir; los 15 labs migrados.
- 2026-10-01 — Ola 5 completa: imanes, sonido, circulatorio, luz y célula, cada uno con code review, arreglos y prueba en CDP; fuentes integradas en `docs/fuentes.md`.
- 2026-10-01 — Datos pendientes: aire (20,95 % O₂), atmósfera estándar, pan y papas fritas (USDA) verificados; 16 % de O₂ exhalado derivado; P50, milanesa y absorción de Elodea declarados como aproximados en cada lab.
- 2026-10-01 — Fuentes en luna, estaciones, circuito, digestivo y fotosíntesis, más gravedades (flotación) y gases (respiratorio). Fotosíntesis corregida: la hoja absorbe ~70 % del verde (antes 12 %, el mito del "verde rebotado"). Ciclo del agua sin fuentes: todo son parámetros del modelo.
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
