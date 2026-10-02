#!/usr/bin/env bash
# Posters de la portada: abre cada lab con ?captura (solo la escena 3D) en un Chromium headless propio,
# espera a que la escena se asiente, saca una captura y la guarda en src/posters/<slug>.webp (la portada la importa).
# Uso: con un dev server corriendo, `scripts/posters.sh [url-base] [slug...]` (default http://localhost:5173, todos los labs).
set -euo pipefail

BASE="${1:-http://localhost:5173}"
shift || true
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SALIDA="$RAIZ/src/posters"
TMP="/tmp/posters-wk"
SESION="posters"
ESPERA_MS="${ESPERA_MS:-5000}"
AB=(npx agent-browser --session "$SESION")

mkdir -p "$SALIDA" "$TMP"
# Solo los labs con página (labs/<slug>/index.html): sin ella, Vite sirve la portada y saldría su captura.
SLUGS=("$@")
if [ "${#SLUGS[@]}" -eq 0 ]; then
  for f in "$RAIZ"/labs/*/index.html; do SLUGS+=("$(basename "$(dirname "$f")")"); done
fi

# Cerrar la sesión siempre (si no, el daemon queda vivo y la próxima corrida ignora --profile).
trap '"${AB[@]}" close >/dev/null 2>&1 || true' EXIT
# El perfil propio va en el primer comando: con el daemon ya andando, --profile se ignora.
"${AB[@]}" --profile "$TMP/profile" open "about:blank" >/dev/null
"${AB[@]}" set viewport 1280 720 >/dev/null

for slug in "${SLUGS[@]}"; do
  url="$BASE/labs/$slug/?captura"
  "${AB[@]}" open "$url" >/dev/null
  # Frenar si la sesión terminó en otra página (otra sesión la navegó).
  actual="$("${AB[@]}" eval "location.href" | tr -d '"')"
  if [ "$actual" != "$url" ]; then echo "✗ $slug: la sesión está en $actual, freno" >&2; exit 1; fi
  # Que la escena exista (canvas con tamaño) y después darle tiempo a asentarse.
  hay="$("${AB[@]}" eval "new Promise((r) => { const t0 = Date.now(); const i = setInterval(() => { const c = document.querySelector('.lab > canvas'); if ((c && c.width > 0) || Date.now() - t0 > 15000) { clearInterval(i); r(!!(c && c.width > 0)) } }, 200) })")"
  if [ "$hay" != "true" ]; then echo "✗ $slug: sin escena 3D, freno" >&2; exit 1; fi
  "${AB[@]}" eval "new Promise((r) => setTimeout(r, $ESPERA_MS))" >/dev/null
  "${AB[@]}" screenshot "$TMP/$slug.png" >/dev/null
  cwebp -quiet -q 78 -resize 960 540 "$TMP/$slug.png" -o "$SALIDA/$slug.webp"
  echo "✓ $slug ($(du -h "$SALIDA/$slug.webp" | cut -f1))"
done

