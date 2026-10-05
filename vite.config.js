import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix => load every var, including non-VITE_ ones. These stay in Node
  // and are never inlined into the client bundle.
  const env = loadEnv(mode, process.cwd(), '')

  const ocServer = env.OPENCODE_SERVER_URL || 'http://127.0.0.1:49374'
  const ocUser = env.OPENCODE_SERVER_USER || 'opencode'
  const ocPass = env.OPENCODE_SERVER_PASSWORD || ''

  // The OpenCode background service requires HTTP Basic auth. Injecting the
  // header here keeps the credential on the dev machine instead of shipping it
  // to the browser.
  const ocAuth =
    'Basic ' + Buffer.from(`${ocUser}:${ocPass}`).toString('base64')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Browser calls /oc/api/... -> OpenCode receives /api/...
        '/oc': {
          target: ocServer,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/oc/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('authorization', ocAuth)
            })
          },
        },
      },
    },
  }
})