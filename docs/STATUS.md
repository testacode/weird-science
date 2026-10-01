# Estado

> Sitio solo para desktop (decisión 2026-09-30): no se hace versión mobile.

## Hecho
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
- Labs siguientes: fotosíntesis, estados de la materia, circuito eléctrico, fases de la Luna.
- Recorridos transversales (energía, ciclos, sistemas) además de los ejes NAP.
- Revisión de accesibilidad (contraste, teclado, `prefers-reduced-motion`).
