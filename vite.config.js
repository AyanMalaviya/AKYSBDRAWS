import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      
      // ⚠️ IMPORTANT: Keep this FALSE during development. 
      devOptions: { 
        enabled: false 
      },
      
      // Tell Vite to cache your new icons folder for offline use
      includeAssets: [
        'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 
        'icons/icon-48x48.png', 'icons/icon-72x72.png', 'icons/icon-96x96.png',
        'icons/icon-128x128.png', 'icons/icon-144x144.png', 'icons/icon-152x152.png',
        'icons/icon-192x192.png', 'icons/icon-384x384.png', 'icons/icon-512x512.png'
      ],
      manifest: {
        name: 'AKYSB DRAWS',
        short_name: 'AKYSB',
        description: 'An app built for organizing tournaments',
        theme_color: '#0f172a', // Matches your dark theme perfectly
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
          { src: 'icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: 'icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    })
  ]
})