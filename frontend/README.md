# Frontend (Next.js)

The Formflow web app: workspace, form builder, public form flow and results.
See the [root README](../README.md) for setup, architecture and deployment.

```powershell
npm install
npm run dev        # http://localhost:3000 (expects the backend on :8000)
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e   # Playwright end-to-end tests (frontend/e2e)
```

`BACKEND_URL` (default `http://127.0.0.1:8000`) tells Next.js where to proxy `/api/*`.
