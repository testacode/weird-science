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

## Modelos y agentes

- **Sonnet 5.5 con effort high** (agente `sonnet-worker`, en dotfiles) para labs nuevos dentro de su carpeta. Anduvo bien.
- **Opus 5.5** para tareas que tocan código compartido (kit unificado) y para los code reviews.
- Los agentes commitean en su branch; el agente principal revisa, prueba en el navegador y mergea. Cada push a `main` publica en Vercel.
