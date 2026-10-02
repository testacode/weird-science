/**
 * `?captura` en la URL: solo la escena 3D, sin paneles ni preguntas (lo usa `scripts/posters.sh` para los posters de la portada).
 * No toca localStorage: abrir el lab normal después no cambia nada.
 */
export const CAPTURA = new URLSearchParams(location.search).has('captura')
if (CAPTURA) document.documentElement.classList.add('captura')
