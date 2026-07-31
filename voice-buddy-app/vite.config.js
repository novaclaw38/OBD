import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // CSS modules resolve to inert proxies in tests — we assert on text and
    // roles, never on generated class names.
    css: false,
    include: ['src/**/*.test.{js,jsx}', 'api/**/*.test.js'],
  },
  server: {
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.cache/**',
        '**/ovos-installer/**',
        '/home/byron/.cache/**',
      ],
    },
  },
})
