# Weird Science

Laboratorios 3D interactivos de ciencias naturales para primaria y secundaria. Cada lab es un modelo que funciona de verdad: tocás, rompés y mirás qué pasa. Los temas siguen los Núcleos de Aprendizaje Prioritarios (NAP) de Argentina.

**Sitio:** https://weird-science.vercel.app

## Labs

| Lab | Eje NAP | Estado |
|---|---|---|
| Sistema digestivo | Seres vivos | listo |
| Fotosíntesis, estados de la materia, circuito eléctrico, fases de la Luna | varios | próximamente |

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run check    # typecheck + lint + tests
npm run build    # sitio estático en dist/
```

Stack: Vite + TypeScript + Three.js, sin framework. Cada lab es una página en `labs/<slug>/` con su código en `src/labs/<slug>/`:

- `model.ts`: simulación pura y testeada (sin Three.js).
- `escena.ts`: la maqueta 3D.
- `contenido.ts`: textos por nivel (primaria / secundaria).
- `main.ts`: une modelo, escena y la interfaz de `src/ui/`.

## Licencia

MIT
