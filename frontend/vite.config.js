import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "./src"),
    },
  },
  server: {
    /**
     * The API is proxied rather than called on http://localhost:5000 directly,
     * so the browser sees one origin in development.
     *
     * That is what lets the auth cookie be `SameSite=Lax` instead of `None`:
     * a cross-origin XHR would need `SameSite=None; Secure`, which does not
     * work over plain http on localhost and would weaken the CSRF property in
     * production too. Same origin in dev, same origin in production, one
     * cookie policy for both.
     */
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: false,
      },
    },
  },
  /**
   * `vite preview` gets the same proxy so the production build can be
   * exercised end to end locally. In real deployment this proxy does not
   * exist — the app and the API sit behind one origin (a reverse proxy or the
   * host's rewrite rules), which is the arrangement the SameSite=Lax cookie
   * assumes.
   */
  preview: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: false,
      },
    },
  },
})
