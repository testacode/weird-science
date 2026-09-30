# Estado

## Hecho
- Base del sitio: portada con catálogo por eje NAP y selector de nivel (se guarda en localStorage).
- Kit de interfaz compartido (`src/ui/`) y escenario 3D compartido (`src/escena/`: bloom + tone mapping).
- Repo público (github.com/testacode/weird-science) y deploy en Vercel (https://weird-science.vercel.app): cada push a `main` publica.
- Lab piloto: sistema digestivo, con modelo testeado, 3 comidas, bilis y ácido gástrico rompibles, click en la vesícula y textos por nivel.

## Backlog
- Predicción antes de simular: "¿qué va a pasar con las grasas si saco la bilis?" (idea de Japón y NGSS).
- Digestivo: vista explotada, burbuja de zoom a las vellosidades, páncreas visible, atajos de teclado.
- Digestivo: flujo continuo (varios bocados) en vez de un solo bolo.
- Mobile: el HUD tapa la escena en pantallas chicas.
- Loop de video y poster por lab para la portada (como sael.net).
- Labs siguientes: fotosíntesis, estados de la materia, circuito eléctrico, fases de la Luna.
- Recorridos transversales (energía, ciclos, sistemas) además de los ejes NAP.
- Revisión de accesibilidad (contraste, teclado, `prefers-reduced-motion`).
