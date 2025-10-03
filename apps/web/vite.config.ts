/// <reference types="vite/client" />
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze'
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@ui': path.resolve(__dirname, '../../packages/ui/src'),
        '@config': path.resolve(__dirname, '../../packages/config/src'),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      // Optimize chunk splitting for better caching
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          sw: path.resolve(__dirname, 'public/sw.js'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            return chunkInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'
          },
          chunkFileNames: (chunkInfo) => {
            // Create separate chunks for different types of modules
            if (chunkInfo.name?.includes('node_modules')) {
              return 'assets/vendor-[hash].js'
            }
            if (chunkInfo.name?.includes('components')) {
              return 'assets/components-[hash].js'
            }
            if (chunkInfo.name?.includes('pages')) {
              return 'assets/pages-[hash].js'
            }
            return 'assets/[name]-[hash].js'
          },
          manualChunks: (id) => {
            // Vendor chunk for node_modules
            if (id.includes('node_modules')) {
              // Separate large libraries into their own chunks
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor'
              }
              if (id.includes('@tanstack/react-query')) {
                return 'query-vendor'
              }
              if (id.includes('socket.io-client')) {
                return 'socket-vendor'
              }
              if (id.includes('@radix-ui')) {
                return 'ui-vendor'
              }
              return 'vendor'
            }
            
            // Separate chunks for different app sections
            if (id.includes('/pages/')) {
              return 'pages'
            }
            if (id.includes('/components/')) {
              return 'components'
            }
            if (id.includes('/hooks/') || id.includes('/utils/')) {
              return 'utils'
            }
          },
        },
      },
      // Performance optimizations
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !isAnalyze, // Keep console logs for analysis
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
        },
        mangle: {
          safari10: true,
        },
      },
      // Bundle size limits
      chunkSizeWarningLimit: 1000, // 1MB warning
      assetsInlineLimit: 4096, // 4KB inline limit
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'socket.io-client',
        'zustand',
      ],
      exclude: ['@vite/client', '@vite/env'],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts', './src/test/pwa-setup.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
      ],
    },
  }
})