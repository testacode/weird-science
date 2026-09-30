import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const root = import.meta.dirname

export default defineConfig({
  input: {
    main: resolve(root, 'index.html'),
    digestivo: resolve(root, 'labs/digestivo/index.html'),
  },
})
