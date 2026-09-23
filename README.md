# Kabadi Saathi

Kabadi Saathi is a formal e-waste collection platform that connects local collectors, authorized recyclers, and government or authority users. It turns an informal scrap transaction into a trackable digital lot with material pricing, estimated value, recycler handover, and analytics.

## Core Concept

The application has three role-based views:

- **Collector**: scans or selects an e-waste material, enters its weight, sees the estimated value, and creates a digital lot.
- **Recycler**: sees pending lots and confirms a physical handover. Confirmation marks the lot as completed and records payment time.
- **Authority**: sees live metrics calculated from the lot database, including formalization rate, processed weight, recovered value, and status counts.

The complete flow is:

```text
Collector scans material
        |
        v
Material + weight + live price
        |
        v
Digital lot created in SQLite
        |
        v
Recycler confirms handover
        |
        v
Lot becomes Completed and analytics update
```

## Technology

- React 18
- Vite
- Tailwind CSS
- Lucide React icons
- Node.js HTTP server
- `better-sqlite3`
- SQLite database
- Browser camera and Canvas APIs for the scanner

## Project Structure

```text
.
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── server/
│   ├── server.js          # REST API and SQLite schema/migration
│   ├── data.json           # First-run seed data only
│   └── kabadiwala.db       # Live SQLite database, generated at runtime
└── src/
    ├── App.jsx             # Role switching and application shell
    ├── index.css
    ├── main.jsx
    ├── components/
    │   ├── Header.jsx
    │   ├── OfflineBanner.jsx
    │   ├── CollectorView.jsx
    │   ├── RecyclerView.jsx
    │   └── AuthorityView.jsx
    └── services/
        ├── api.js          # Frontend REST client
        ├── materialScanner.js
        ├── mockData.js     # UI fallback values
        └── speechService.js
```

## Setup

Requirements:

- Node.js 22.5.0 or newer (the backend utilizes the built-in `node:sqlite` module)
- npm

Install dependencies:

```powershell
npm.cmd install
```

## Run the Application

Start the backend in one terminal:

```powershell
npm.cmd run server
```

The API starts at:

```text
http://localhost:8787
```

Start the frontend in a second terminal:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173/
```

PowerShell may block the `npm.ps1` shim because of execution policy. Use `npm.cmd` as shown above; no system policy change is required.

## Database

The live database is:

```text
server/kabadiwala.db
```

The backend creates the SQLite file and these tables automatically:

### `prices`

Stores material names, Hindi names, market price, unit, and price trend.

### `recyclers`

Stores authorized recycler details, distance, price multiplier, verification status, and pickup availability.

### `lots`

Stores every collection transaction:

- `lotId`
- `materialId`
- `material`
- `weight`
- `estimatedVal`
- `collectorName`
- `status`
- `createdAt`
- `synced`
- `updatedAt`
- `paidAt`

Valid lot statuses are:

```text
Created -> Accepted -> Completed
```

The current recycler screen completes a lot directly from `Created` to `Completed`. The API also supports `Accepted` for future workflow expansion.

### Seed data

`server/data.json` is used only when the SQLite database has no price records. It provides the initial prices, recyclers, and sample lots. After migration, all normal reads and writes use `server/kabadiwala.db`.

To reset local demo data, stop the backend, delete `server/kabadiwala.db`, and start the backend again. The database will be recreated from `server/data.json`.

## REST API

The frontend uses `http://localhost:8787/api` by default. Override it with:

```powershell
$env:VITE_API_URL = "http://localhost:8787/api"
```

### Health

```http
GET /api/health
```

Returns:

```json
{ "ok": true }
```

### Prices

```http
GET /api/prices
```

Returns all material prices.

### Recyclers

```http
GET /api/recyclers
```

Returns authorized recycler recommendations.

### Lots

```http
GET /api/lots
GET /api/lots?status=Created
```

Create a lot:

```http
POST /api/lots
Content-Type: application/json
```

```json
{
  "materialId": "pcb",
  "weight": 10.5,
  "collectorName": "Local Collector"
}
```

The API validates the material and requires a positive numeric weight.

Update status:

```http
PATCH /api/lots/EW-2026-123456/status
Content-Type: application/json
```

```json
{ "status": "Completed" }
```

Completing a lot automatically records `paidAt`.

### Analytics

```http
GET /api/analytics
```

Returns:

- Active collectors
- Formalization rate
- Processed weight
- Recovered value
- Total lots
- Counts by status

## Material Scanner

The collector scanner supports:

1. Opening the device camera with the rear-camera preference.
2. Showing a live camera preview.
3. Capturing an image frame.
4. Running local browser-side material detection.
5. Updating the selected material and its price automatically.
6. Displaying confidence and a detection reason.
7. Uploading an image when camera access is unavailable.

The current scanner is an offline heuristic classifier. It uses image dimensions, brightness, saturation, dark-pixel ratio, and filename keywords. It is useful for a working demo and offline flow, but it is not a trained computer-vision model. The material cards remain available for manual correction when confidence is low.

Camera access works on `localhost` and `127.0.0.1` in supported browsers. The browser must grant camera permission.

## Offline Mode

The header can switch the collector interface into offline mode. In offline mode:

- New lots receive an `OFFLINE-*` identifier.
- Lots are placed in the in-memory offline queue.
- The UI shows the pending queue count.
- No backend request is made until an explicit sync workflow is implemented.

Online lot creation is persisted immediately in SQLite.

## Validation Commands

Production build:

```powershell
npm.cmd run build
```

Lint:

```powershell
npm.cmd run lint
```

Backend syntax check:

```powershell
node --check server/server.js
```

## Troubleshooting

### Frontend loads but data is unavailable

Make sure the backend is running in a second terminal:

```powershell
npm.cmd run server
```

### Camera does not open

Allow camera permission for the local site. On desktop browsers, use **Upload Photo** if no camera is available.

### Database does not appear

Start the backend once. `server/kabadiwala.db` is generated when `server/server.js` initializes the SQLite schema.

### Port already in use

Run the backend on another port:

```powershell
$env:PORT = "8788"
npm.cmd run server
```

Then point the frontend to the new API port with `VITE_API_URL`.

## Vercel Deployment

The repository includes `vercel.json` and a catch-all serverless API function under `api/`, so it can be imported directly into Vercel.

1. Import `jayshpatelfc-afk/Deploysted` into Vercel.
2. Keep the framework preset as **Vite**.
3. Use `npm run build` as the build command.
4. Use `dist` as the output directory.
5. Deploy.

The frontend uses same-origin `/api` routes automatically in production. `VITE_API_URL` is only needed when the frontend is deployed separately from the API.

### Vercel database limitation

Vercel serverless functions use `/tmp` for the runtime SQLite copy. That filesystem is temporary and can be reset between invocations, so Vercel deployment is suitable for a demo but does not guarantee durable lot writes.

For production persistence, keep the frontend and Vercel API configuration, then replace the SQLite adapter with a hosted database such as Vercel Postgres, Neon, Supabase, or a separately hosted Node API. Local development continues to use `server/kabadiwala.db`.
