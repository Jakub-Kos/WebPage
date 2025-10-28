import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'; // Make sure to import 'path'

// https://vite.dev/config/
// Deploying to https://jakub-kos.github.io/WebPage/
export default defineConfig({
  plugins: [react()],
  base: '/WebPage/',   // <-- repo name, including the leading and trailing slashes
  resolve: {
    alias: {
      // Set up the @ alias to point to the absolute path of your src directory
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
