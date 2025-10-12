import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Deploying to https://jakub-kos.github.io/WebPage/
export default defineConfig({
  plugins: [react()],
  base: '/WebPage/',   // <-- repo name, including the leading and trailing slashes
})
