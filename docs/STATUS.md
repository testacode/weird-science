# Estado

> Sitio solo para desktop (decisión 2026-09-30): no se hace versión mobile.

## Hecho
- Labs de flotación y ciclo del agua (2026-10-01), con code review y arreglos previos al merge.
- Kit unificado (2026-10-01): deslizador, HUD con scroll, encuadre entre HUDs, pastillas que no se cortan, atajos de teclado, gráfico con negativos/colores libres/es-AR, `crearEscenario` configurable, `modal.cerrar()`. Los 5 labs migrados.
- Code review del digestivo (2026-09-30): reloj con 3 bocados (daba ~46 h), barra espaciadora sobre botones, cámara en vista explotada, zoom solo con lo del delgado, ritmo ×N, animaciones tras cambiar de pestaña, conductos, reparto de partículas compartido, `DELGADO` derivado.
- Digestivo, extras (2026-09-30): tubo teñido por pH, enzima activa, páncreas, vista explotada, zoom a vellosidades, atajos de teclado y 3 bocados.
- Labs de fotosíntesis (Elodea, factor limitante, luz verde) y fases de la Luna (vista desde la Tierra por hemisferio, eclipses, idea errónea de la sombra) (2026-09-30).
- Lab de estados de la materia (2026-09-30): curva de calentamiento con mesetas, 3 sustancias, olla a presión y predicción.
- Lab del circuito eléctrico (2026-09-30): serie/paralelo, ley de Ohm, sacar lamparita, cortocircuito y predicción.
- Ola 1 del kit (2026-09-30): filtro "Info avanzada", tarjeta "Predecí antes de correr" y gráfico canvas 2D, aplicados al digestivo.
- Base del sitio: portada con catálogo por eje NAP.
- Kit de interfaz compartido (`src/ui/`) y escenario 3D compartido (`src/escena/`: bloom + tone mapping).
- Repo público (github.com/testacode/weird-science) y deploy en Vercel (https://weird-science.vercel.app): cada push a `main` publica.
- Lab piloto: sistema digestivo, con modelo testeado, 3 comidas, bilis y ácido gástrico rompibles, click en la vesícula y etiquetas de hígado y vesícula.

## Backlog
- Ola 4 de labs (5° grado): sistema respiratorio (en arreglos del review), mezclas y separación, estaciones del año.
- Kit, detalles del review: `metrica()` no reajusta el tamaño al cambiar el ancho de la ventana; offsets fijos de `.hud-linea` (luna) y `.zoom` (digestivo) en vez de usar el encuadre.
- Archivos de más de 200 líneas: `fotosintesis/main.ts`, `luna/main.ts`, `circuito/escena.ts`, `particulas/main.ts`.
- Loop de video y poster por lab para la portada (como sael.net).
- Partículas: verificar contra NIST/CRC las constantes de alcohol y acetona (cs, cg, Lf), que el agente cargó de memoria.
- Recorridos transversales (energía, ciclos, sistemas) además de los ejes NAP.
- Revisión de accesibilidad (contraste, teclado, `prefers-reduced-motion`).
