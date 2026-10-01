# Estado

> Sitio solo para desktop (decisión 2026-09-30): no se hace versión mobile.

## Hecho
- Lab de estados de la materia (2026-09-30): curva de calentamiento con mesetas, 3 sustancias, olla a presión y predicción.
- Lab del circuito eléctrico (2026-09-30): serie/paralelo, ley de Ohm, sacar lamparita, cortocircuito y predicción.
- Ola 1 del kit (2026-09-30): filtro "Info avanzada", tarjeta "Predecí antes de correr" y gráfico canvas 2D, aplicados al digestivo.
- Base del sitio: portada con catálogo por eje NAP.
- Kit de interfaz compartido (`src/ui/`) y escenario 3D compartido (`src/escena/`: bloom + tone mapping).
- Repo público (github.com/testacode/weird-science) y deploy en Vercel (https://weird-science.vercel.app): cada push a `main` publica.
- Lab piloto: sistema digestivo, con modelo testeado, 3 comidas, bilis y ácido gástrico rompibles, click en la vesícula y etiquetas de hígado y vesícula.

## Backlog
- Digestivo, extras visuales: tubo teñido por pH, enzima activa flotando en cada tramo, páncreas visible.
- Digestivo: vista explotada, burbuja de zoom a las vellosidades, atajos de teclado.
- Digestivo: flujo continuo (varios bocados) en vez de un solo bolo.
- Loop de video y poster por lab para la portada (como sael.net).
- Labs siguientes: fotosíntesis, fases de la Luna (en curso, ola 2).
- Partículas: verificar contra NIST/CRC las constantes de alcohol y acetona (cs, cg, Lf), que el agente cargó de memoria.
- Kit: formateo de números es-AR en `grafico()` (hoy sale "2.6 W" con punto), helper de pastilla anclada a la maqueta, `.hud-der` con `max-height` y scroll, `line-height` de `.etiqueta` en tarjetas de la portada, `yMin` (eje Y negativo) en `grafico()`, estilo de `input[type=range]`, intensidad de bloom configurable en `crearEscenario`.
- Recorridos transversales (energía, ciclos, sistemas) además de los ejes NAP.
- Revisión de accesibilidad (contraste, teclado, `prefers-reduced-motion`).
