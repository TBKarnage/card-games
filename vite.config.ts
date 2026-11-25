import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

export default defineConfig(({ mode }) => {
  const isSingleFile = mode === 'singlefile'

  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __IS_SINGLEFILE__: JSON.stringify(isSingleFile),
    },
    plugins: isSingleFile ? [react(), viteSingleFile()] : [react()],
    build: isSingleFile
      ? {
          outDir: 'dist-single',
          emptyOutDir: true,
        }
      : {
          outDir: 'dist',
          emptyOutDir: true,
        },
  }
})
