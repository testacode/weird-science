# Estado

> Mantenido por la skill `backlog`. Fuente única del estado del proyecto; la historia completa está en `HISTORICO.md`.
> Sitio solo para desktop (decisión 2026-09-30).

## En curso

- Nada.

## Backlog

1. **Próxima ola de labs:** sin definir (ver `docs/temario.md`).
2. **Kit, lo que queda:**
   - Circulatorio, respiratorio, estaciones y luna siguen con su propio `revelar`: los dos primeros guardan una foto del estado al responder (`antes`), que no está en `pred.datos`; estaciones y luna revelan "Sin predicción" al mover la línea de tiempo con la pregunta abierta, y `revisar()` exige una predicción hecha. Migrarlos pide decidir esos dos casos.
   - Sin uso hoy (se agregan cuando un lab los necesite): `segmentado` deshabilitado (volcanes usa `hidden`), deslizador logarítmico (sonido tiene el suyo, que se clava en las notas), `origen` y quitar en `crearPildoras` (volcanes reutiliza pastillas).
   - `cambiar()` + `cargar()` del gráfico dibujan dos veces al cambiar de series (barato; se evitaría con puntos opcionales en `cambiar`).
3. **Portada:** loop de video por lab (descartado por ahora: los posters alcanzan). Posters más lindos en eco, electrostática y luna (objetos chicos, mucho fondo): encuadre propio para `?captura` o una acción antes de la foto (en eco, gritar). "Energía" está en 12 de 18 labs: el recorrido por tema se diluye; revisar los tags.
4. **Accesibilidad, lo que queda (por lab):**
   - cámara 3D solo con mouse en todos los labs (canvas no enfocable, sin `listenToKeyEvents`); circuito: confirmar que cada acción con click en 3D tenga botón en el HUD;
   - animación 3D sin `prefers-reduced-motion` (propuesta: `sinMovimiento()` en `src/ui/movimiento.ts`) y `enableDamping` en imanes, circulatorio, luna, sonido y célula;
   - luna: canvas `.disco` e `icono-fase` sin nombre; líneas de tiempo de luna y estaciones sin `aria-valuetext` (opción `valorTexto` en `src/ui/linea.ts`);
   - circulatorio: etiqueta "Gravedad" con `opacity:0.4` (1,94:1);
   - segmentados envueltos en `div.grupo` sin nombre: imanes `main.ts:74`, electrostática `main.ts:232`, circulatorio `controles.ts:50,52`;
   - `.etiqueta` del kit de 10px; borde de `.boton` y riel del slider con poco contraste no-texto (cambiaría el diseño).
5. **Detalles:**
   - fotosíntesis: reloj con la pregunta del verde abierta: no se reproduce (fuzzer de ~460 acciones); retomar solo con pasos exactos;
   - estaciones: con 633 px de alto la tarjeta "Desde tu ciudad" tapa la Tierra en diciembre; `encuadrarEntreHuds` no sabe de tarjetas flotantes, y `.hud-inset`/`.hud-linea` siguen con 410/360 fijos (falta `--hud-izq`/`--hud-der` en el kit);
   - luz e imanes: con el corte sorteado, cada corte sigue inclinado a un lado (luz: 70 % → 95 % "menos"; imanes: mitad/cuarto → 88 % "menos"), por el rango físico del modelo;
   - `metrica()` no reajusta el tamaño al cambiar el ancho de la ventana;
   - archivos de más de 200 líneas: `electrostatica/escena.ts` y `main.ts`, `fotosintesis/main.ts`, `luna/main.ts`, `circuito/escena.ts`, `particulas/main.ts`, `flotacion/model.ts`, `ciclo-agua/main.ts`.

## Hecho reciente

- 2026-10-17 — Accesibilidad del kit (`feat/a11y`): atajos que siguen con un slider enfocado (y Espacio no pisa checkbox/radio), ARIA en grupos, deslizador (`aria-valuetext`), modal, predicción (región `aria-live` vía `anunciar()`/`silenciar()` en `src/ui/anunciar.ts`) y maqueta 3D (`role=img`), `:focus-visible` en links y `summary`, `prefers-reduced-motion` global en `kit.css`, pastillas a ~4,7:1. Contraste del kit ya cumplía AA. Con code review.
- 2026-10-17 — Detalles (`feat/bugs`): etiqueta de la Tierra (estaciones), inclinación con pregunta abierta deja correr el año, franja negra (sonido), luna y digestivo usan `encuadrarEntreHuds`, superíndice en volcanes, cortes sorteados lejos del resultado (luz e imanes), célula esquiva la franja de ±3 % de la rotura (lado al azar, solo con preguntas activas) y revela al 5 % del recorrido ("se asienta en"); reveal máximo 38 s. Con code review (el primer arreglo de luz delataba la respuesta).
- 2026-10-17 — Dominio propio: https://weird-science.xmontc.xyz (CNAME DNS-only en Cloudflare → Vercel; `.vercel.app` sigue andando). README, "About" del repo y el CV (`resume`) apuntan ahí.
- 2026-10-02 — Portada: selector "Por eje (NAP) / Por tema" (vista en el hash `#temas` y en localStorage) y un poster por lab en cada tarjeta (tarjetas de 400 px mínimo). Los posters salen de `scripts/posters.sh` (modo `?captura`: solo la escena 3D, sin preguntas) y viven en `src/posters/`; la portada importa solo los que existen.
- 2026-10-02 — Kit K4: opciones `resolver` y `pred.revisar()` en la predicción; 11 labs sin su `revelar` propio (célula, ciclo del agua, eco, electrostática, partículas, sonido, volcanes, flotación, fotosíntesis, digestivo, mezclas). Mezclas: "Separar" con la pregunta abierta la deja de lado.
- 2026-10-02 — Kit K3: `grafico.cargar(puntos)` dibuja una curva calculada de una vez (estaciones pasó de ~95 redibujos por cambio a 1); migrados 7 labs.
- 2026-10-02 — Kit K2: `Opcion.muestra` (punto de color), `segmentado.texto`, `metrica.rotulo`, `deslizador.rango` y `rotulo`, `hex` en `ui/formato`; migrados electrostática, eco, flotación, luz y fotosíntesis.
- 2026-10-02 — Kit K1: `asomar(el)` en `ui/hud` (la tarjeta de predicción y su resultado se ven aunque la columna haga scroll, sin mover la página) y `mezclar` en `ui/azar` (7 copias, una con sort sesgado).
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
