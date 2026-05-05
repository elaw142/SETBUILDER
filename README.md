# SETBUILDER

A self-hosted Spotify playlist builder that composes playlists from independently curated vibe segments.

## Local Development

Backend:

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python app.py
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Set the Spotify app redirect URI to `http://localhost:5000/api/auth/callback` for local testing.
For local OAuth, set `AUTH_SUCCESS_REDIRECT=http://localhost:5174` if you use the dev server started by Codex.

## Environment

Copy `.env.example` to `.env` for Docker deployment and fill in the Spotify credentials.

## Production Deployment

Target domain: `https://setbuilder.emlw.dev`

On the server, the app lives at `/opt/setbuilder`. Caddy runs in Docker on the shared `web` network and reverse proxies `setbuilder.emlw.dev` to `playlist-frontend:80`; see `deploy/caddy.setbuilder.conf`.

GitHub Actions deploys on pushes to `main` over SSH. Required repository secrets:

- `SSH_HOST`: `140.238.201.102`
- `SSH_USER`: `opc`
- `SSH_PRIVATE_KEY`: private key accepted by the server
- `SSH_PORT`: `22`

The server also needs `/opt/setbuilder/.env` populated with Spotify credentials before the first deploy can succeed.
