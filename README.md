# Weird Science

Laboratorios 3D interactivos de ciencias naturales. Cada lab es un modelo que funciona de verdad: tocás, rompés y mirás qué pasa. Los temas siguen los Núcleos de Aprendizaje Prioritarios (NAP) de Argentina.

**Sitio:** https://weird-science.vercel.app

## Labs

| Eje NAP | Labs |
|---|---|
| Seres vivos | Sistema digestivo · Fotosíntesis · Sistema respiratorio |
| Materiales y sus cambios | Estados de la materia · Mezclas y separación |
| Fenómenos del mundo físico | Circuito eléctrico · Flotación |
| La Tierra, el universo y sus cambios | Fases de la Luna · Ciclo del agua · Estaciones del año |

Cada lab tiene un modelo que calcula de verdad, una predicción para hacer antes de correrlo, un filtro de "Info avanzada" y una sección "Qué es real y qué no". Historia del proyecto en `docs/HISTORICO.md`; pendientes en `docs/STATUS.md`.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run check    # typecheck + lint + tests
npm run build    # sitio estático en dist/
```

Stack: Vite + TypeScript + Three.js, sin framework. Cada lab es una página en `labs/<slug>/` con su código en `src/labs/<slug>/`:

- `model.ts`: simulación pura (sin Three.js).
- `escena.ts`: la maqueta 3D.
- `contenido.ts`: textos del lab (relato en vivo y ayuda).
- `meta.ts`: la tarjeta del catálogo. Vite y la portada descubren los labs solos.
- `main.ts`: une modelo, escena y la interfaz de `src/ui/`.

## Licencia

MIT
