# HR app frontend

React + Vite. Talks to the API in `../hr-app-backend`; see the repository's `CLAUDE.md`
for the full picture.

```bash
npm install
npm start          # http://localhost:3000, API expected at http://localhost:5190
npm test           # Vitest (watch); `npm test -- --run` runs once
npm run lint       # ESLint, fails on any warning
npm run build      # production bundle in build/
```

Point it at another API with `VITE_API_URL`, for example
`VITE_API_URL=https://my-api.azurewebsites.net npm run build`. The value is baked into
the bundle at build time.
