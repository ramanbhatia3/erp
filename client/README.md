# RBPU Hub client

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` if you need to change the API URL.
3. Start the server from the `server` folder with `npm run dev`.
4. Start this client from the `client` folder with `npm run dev`.

The home page checks `GET /api/health` and displays the server status.
