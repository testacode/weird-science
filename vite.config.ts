import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const root = import.meta.dirname

// Cada carpeta labs/<slug>/ con index.html es una página: agregar un lab no toca este archivo.
const labs = Object.fromEntries(
  readdirSync(resolve(root, 'labs'))
    .filter((slug) => existsSync(resolve(root, 'labs', slug, 'index.html')))
    .map((slug) => [slug, resolve(root, 'labs', slug, 'index.html')]),
)

export default defineConfig({
  input: { main: resolve(root, 'index.html'), ...labs },
})
