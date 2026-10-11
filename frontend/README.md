# GameHub frontend

The React 19 and Vite client for GameHub. It uses Tailwind CSS v4, React Router, Axios, and `vite-plugin-pwa`.

## Development

1. Copy `.env.example` to `.env`. Its default points directly to `http://localhost:5000/api`; set `VITE_API_BASE_URL=/api` to use the local Vite proxy.
2. Install dependencies with `npm ci`.
3. Start the development server with `npm run dev` (relative `/api` requests proxy to `http://localhost:5000`).

## Build and checks

* `npm run lint` runs Oxlint. Existing warnings are reported even when the command exits successfully.
* `npm run build` creates the production site in `dist/` and generates the PWA manifest/service worker.
* `npm test` runs the frontend tests. The PWA tests require a production build first.
* `npm run qa` runs lint, build, and all frontend tests in sequence.
* `npm run preview` serves the production build locally for browser checks.

For deployment, serve `dist/` over HTTPS, configure an SPA fallback to `index.html`, and route `/api/*` to the Express backend. `VITE_API_BASE_URL` is included in the client bundle at build time; do not put server secrets in frontend environment variables.
