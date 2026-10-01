# Histórico

Cómo se construyó Weird Science, con las decisiones y lo que se aprendió en cada etapa. El estado actual y lo pendiente están en `STATUS.md`.

## 2026-09-30 · Investigación y piloto

**Referencias.**
- Se analizó https://sael.net/ como referencia visual. Cada página es un "lab": un objeto 3D protagonista con una simulación real, métricas en vivo, una tarjeta que narra lo que pasa, controles para "romper" el sistema y una sección "Qué es real y qué no". Se tomó la receta, no los assets ni los colores. Detalle en `referencias-visuales.md`.
- Temario: se leyeron los NAP de Argentina (1° ciclo, 2° ciclo y secundaria) y los currículos de Singapur, Japón, Corea, Taiwán, Inglaterra, NGSS, Ontario, Finlandia y Estonia. Los 4 ejes NAP ordenan el sitio. De los otros países salieron dos ideas: "predecí antes de correr" (Japón) y declarar qué tiene de simplificado el modelo. Detalle en `temario.md`.

**Decisiones.**
- Stack: Vite + TypeScript + Three.js, sin framework y sin Tailwind.
- Todo en 3D.
- Público: primaria y secundaria. Primero se resolvió con un selector de nivel; después se reemplazó por una sola versión completa con filtro "Info avanzada".
- Solo desktop.

**Piloto: sistema digestivo** (`cf3f080`).
- Tubo de vidrio con partículas por macronutriente.
- Modelo por tramos: pH, enzimas, cinética de primer orden y absorción en el delgado.
- Se puede romper la bilis o el ácido gástrico.

**Publicación.** Repo público en `testacode/weird-science` y deploy en Vercel con publicación automática en cada push a `main` (https://weird-science.vercel.app).

**Ajustes del piloto** (`42066ed`): etiquetas para hígado y vesícula. Se sacó el selector primaria/secundaria porque casi no cambiaba nada visible; ahora cada lab muestra la versión completa.

## 2026-09-30 · Trabajo en paralelo con agentes

Plan en `plan-backlog.md`: olas de trabajo, cada agente en su worktree `.worktrees/<slug>` y solo dentro de su carpeta.

- **Ola 0** (`182da85`). Vite descubre solo los `labs/*/index.html` y el catálogo sale del `meta.ts` de cada lab. Así un lab nuevo no toca archivos compartidos.
- **Ola 1, kit** (`1c2c798`). Filtro "Info avanzada", tarjeta "Predecí antes de correr" y gráfico canvas 2D.
- **Ola 2, 5 agentes Sonnet 5.5 en paralelo.**
  - Labs nuevos: circuito (`9875d75`), estados de la materia (`09cafe3`), fotosíntesis (`b5a558b`) y fases de la Luna (`c2d52ff`).
  - Extras del digestivo (`d00acdd`): tubo por pH, enzima activa, páncreas, vista explotada, zoom a vellosidades, atajos y 3 bocados.
- **Code review del digestivo** (`a88f450`). Encontró 10 hallazgos; el más serio, el reloj de 3 bocados marcaba ~46 h en vez de ~23 h.

**Aprendido:**
- Los 5 merges no tuvieron conflictos de git gracias a la ola 0.
- El único choque fue de herramientas: eslint y vitest leían los worktrees ajenos (`d19c4ee`).
- Los labs nuevos salieron bien. La tarea que modificaba código existente con estado compartido fue la que trajo bugs.

## 2026-10-01 · Kit unificado (Opus 5.5)

`bd7e330` … `058d5e0`. Las piezas que los labs habían resuelto cada uno por su cuenta pasaron al kit:
- deslizador;
- HUD con scroll y pista "más ↓";
- encuadre de la cámara entre los HUD;
- pastillas que no se cortan en el borde;
- atajos de teclado;
- formato es-AR;
- gráfico con eje negativo y colores libres;
- `crearEscenario` configurable.

Los 5 labs se migraron. Un code review previo al merge encontró solo detalles menores.

Después se agregó un botón y la tecla H para ver los atajos del digestivo (`5b50e65`), porque la línea "Atajos de teclado: tecla ?" parecía una configuración vacía.

## 2026-10-01 · Ola 4: labs de 5° grado

5 agentes Sonnet en paralelo: respiratorio, flotación, ciclo del agua, mezclas y estaciones. **Paso nuevo: un code review con Opus antes de cada merge, más la prueba en el Chrome CDP.**

Los 5 tenían algo para corregir antes de entrar:

| Lab | Lo más serio del review |
|---|---|
| Flotación (`76440cf`) | el reveal salía con el objeto todavía a media agua; el barco agujereado se revelaba antes de hundirse |
| Ciclo del agua (`bd9c9b5`) | el gráfico se vaciaba cada 5 días; el texto de la tala no seguía a la respuesta |
| Respiratorio (`cb74c08`) | 3 casos donde la predicción marcaba como correcta una respuesta falsa (piso artificial del O₂, respuesta por defecto, config pendiente vieja) |
| Mezclas (`ab865f5`) | agregar sal "mejoraba" la pureza por un tope de tiempo artificial; se creaban gráficos al arrastrar el mechero |
| Estaciones (`6393796`) | la respuesta se calculaba con la inclinación del eje del momento del reveal, no con la de la pregunta |

**Arreglos de raíz en el kit:**
- `segmentado` ignora la opción ya elegida (`01244ac`). Antes, en dos labs, eso descartaba la pregunta abierta.
- `hud` deja de observar los paneles que se sacan (`b6bf76f`).

**Aprendido:**
- El review con scripts descartables barre cientos de combinaciones y encuentra lo que la prueba manual no ve.
- `agent-browser errors` no alcanza como evidencia: hay que mirar también `console`.
- Chrome frena `requestAnimationFrame` en las tabs de fondo, así que para probar animaciones la tab tiene que estar al frente.
- Un bug que aparece en dos labs se arregla en el kit.

## 2026-10-01 · Cierre

- Favicon SVG: matraz lima sobre el fondo del sitio (`6d531be`).
- Quedaron 10 labs publicados, dos o tres por eje NAP.

## 2026-10-01 · Predicción con datos congelados

`1076cc2`. `prediccion` guarda los `datos` de la pregunta al preguntar y los borra al revelar u ocultar, así la respuesta no puede salir con otra config. Arregla de raíz el bug que había aparecido en respiratorio, ciclo del agua y estaciones.

**Aprendido:** al sacar estado duplicado hay que revisar qué rol implícito cumplía. El `let pregunta` de ciclo del agua seguía vivo después del reveal y funcionaba, sin querer, como "hay una tarjeta en pantalla".

## 2026-10-01 · Datos con fuente

Cada constante real se verifica en un navegador real y queda anotada en `fuentes.md` con valor del código, valor de la fuente y URL. Cada lab muestra sus fuentes al final de "¿Cómo funciona?" con el helper `fuentes()`.

- **Primera tanda** (`9abbff0`): partículas, flotación, mezclas y respiratorio. Errores corregidos: Cp del etanol sólido (1,9 → 0,97), Cp de los gases, ebullición del SiO₂ (2230 → 2950 °C) y el aceite, que no hierve (`humo: 230`).
- **Segunda tanda** (`fdb771e`): luna, estaciones, circuito, digestivo y fotosíntesis, más las gravedades de flotación y los gases de respiratorio. Ciclo del agua no lleva fuentes: todo son parámetros del modelo.
- **El mito del verde** (en `fdb771e`). Fotosíntesis decía que la hoja absorbe el 12 % de la luz verde ("la rebota"). Medido en hojas, es ~81 % (Liu y van Iersel 2021); el 12 % es la clorofila extraída en un tubo. Se corrigió a 0,7 y se rediseñó la pregunta: ahora "el verde rebota y no sirve" es la opción mito.
- **Datos pendientes** (`b9e6a79`): aire, atmósfera estándar, pan y papas fritas (USDA) verificados. El 16 % de O₂ exhalado se derivó de datos ya verificados. P50, la milanesa y la absorción de Elodea quedaron declarados como aproximados en el lab.

**Aprendido:**
- Las constantes marcadas "no verificadas" estaban casi todas bien. El error grande estaba en un dato que nadie había marcado, porque sonaba obvio. Hay que revisar también lo que parece de sentido común.
- Corregir un dato puede dejar sin sentido la interacción construida sobre él: el interruptor "Luz verde" de "Romper el sistema" ya no rompía nada.
- WebFetch y WebSearch sirven para descubrir; el dato final se lee en el navegador. Cuando PubMed u otras fuentes bloquean el navegador headless, la API de Europe PMC devuelve los abstracts.

## 2026-10-01 · Kit: lo que quedó copiado entre labs

`1b62dbe`. `fila` e `interruptor` (6 copias), `grafico.cambiar()` y `yTecho` (luna, estaciones y mezclas recreaban el gráfico; el eje de horas de luz llegaba a 25 h), pastillas con `origen: 'derecha'` y la línea de tiempo arrastrable (`src/ui/linea.ts`). Los 10 labs pasaron a usar `pred.datos`.

**Aprendido:**
- La línea de tiempo se pudo unificar porque el kit pone el comportamiento (arrastre, progreso) y cada lab sus marcas. Unificar destapó un bug: luna no manejaba `pointercancel`.
- El "bug" de luna con `sombraTierra` que había marcado un review no existía: hay que comprobar cada hallazgo contra el código.

## 2026-10-01 · Ola 5: circulatorio, célula, imanes, luz y sonido

5 agentes Sonnet en paralelo, con dos cosas nuevas en el brief: usar el kit actual (prohibido copiar de otro lab) y verificar los datos en el navegador mientras se construye. Cada agente devolvió su bloque para `fuentes.md`, que integró el agente principal.

Merges: imanes `408d20e`, sonido `1a869ef`, circulatorio `a970d31`, luz `4fde1fe`, célula `f19a879`. Quedaron 15 labs.

Los 5 reviews encontraron problemas, casi siempre de coherencia didáctica:

| Lab | Lo más serio del review |
|---|---|
| Imanes | "alejar al doble" se contradecía cerca del 25 %; la respuesta dependía de un parámetro de ajuste (se justificó como cara de polo de 1,6 cm, con banda muerta) |
| Circulatorio | el modelo del agujero en el tabique contradecía su explicación y su fuente; ahora el cuerpo conserva su flujo y el ventrículo bombea de más |
| Sonido | la pregunta de la bomba siempre daba "nada" y era la primera opción; el gráfico de presión estaba invertido; el acero usaba la velocidad en masa y no la de una barra |
| Luz | un umbral de 0,5° daba "sigue derecho" en agua a 1°; dos preguntas siempre daban lo mismo |
| Célula | la pregunta se corregía antes del equilibrio y la pantalla terminaba contradiciendo el veredicto; se resolvió con el equilibrio analítico |

**Aprendido:**
- El patrón más repetido fueron las preguntas que parecen calculadas por el modelo pero siempre dan lo mismo. Si el modelo no puede variar la respuesta, se deja honesta (constante, con la lección en el texto) y se mezcla el orden de las opciones.
- El segundo, el reveal con un timer que salía con la config vieja (copiado de circuito en 4 labs). Eso pedía llevarlo al kit.
- Una sesión headless de un agente apareció navegando el lab de otro, y otro agente corrió `pkill -f agent-browser` sin filtrar. Cada agente usa su `--session` y nunca un `pkill` general.
- Para corregir, usar la magnitud continua del modelo y diseñar la pregunta lejos de su umbral; si no, cualquier redondeo del texto la contradice.

## 2026-10-01 · Modo libre y flujo de predicción en el kit

`35f7fd1`. Pedido de Carlos: hasta acá había que responder (o saltar) cada pregunta para seguir usando el lab.

- Interruptor **"Preguntas: Sí/No"** junto a "Info avanzada", guardado en localStorage y válido para todos los labs.
- `revelarEn`: el timer del reveal lo maneja la tarjeta, y `ocultar` o una pregunta nueva lo cancelan. Arregla el bug de la ola 5 por construcción.
- El botón "Saltar y hacerlo igual" pasó a la tarjeta (se borraron 6 copias).
- `saltar(datos)` es el único camino para "seguir sin predecir": lo usan el botón, apagar las preguntas con una abierta y preguntar en modo libre. Los 15 labs se migraron.

**Aprendido:** el review mejoró el diseño, no solo arregló bugs. Que `preguntar()` devolviera `false` obligaba a cada lab a repetir su lógica de "seguir" en un segundo lugar; con el kit llamando a `saltar`, esa decisión vive en un solo lugar.

## Modelos y agentes

- **Sonnet 5.5 con effort high** (agente `sonnet-worker`, en dotfiles) para labs nuevos dentro de su carpeta. Anduvo bien.
- **Opus 5.5** para tareas que tocan código compartido (kit unificado) y para los code reviews.
- Los agentes commitean en su branch; el agente principal revisa, prueba en el navegador y mergea. Cada push a `main` publica en Vercel.
- Desde la ola 5, los arreglos del review los hace el mismo agente que escribió el lab (se le reenvían los hallazgos), y el principal prueba en el CDP con el server del worktree en el puerto 5186.
- El kit, `docs/` y los cambios que tocan los 15 labs los hace el agente principal, en secuencia, con code review del branch antes del merge.
