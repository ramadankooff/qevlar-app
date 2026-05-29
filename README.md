# example.app — API Explorer

A modern, dark-themed API client for exploring REST APIs with filtering, sorting, and bulk actions. Deploy to Google Cloud Run in minutes.

## Features

- **Dual-pane request interface** — GET and POST panels side-by-side
- **Dynamic filtering** — Click any categorical column to filter results
- **Full-text search** — Search across all fields instantly
- **Sortable columns** — Click headers to sort ascending/descending
- **Group actions** — Select rows and send them as POST/PATCH payloads
- **Table & JSON views** — Switch between formatted table and raw JSON
- **Headers per request** — Add custom headers for authentication or metadata
- **Demo mode** — Try with mock data before connecting to your API
- **CORS-free** — Built-in proxy bypasses browser CORS restrictions

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
cd example-app
npm install
npm start
```

Open http://localhost:8080 in your browser.

**Demo mode is enabled by default** — you'll see mock data. To connect to a real API:

1. Click the **demo badge** (top-right) to open Settings
2. Toggle **Demo mode off**
3. Optionally set a **Proxy URL** (see below)
4. Save and start making requests

## Deployment to Google Cloud Run

### Prerequisites
- Google Cloud account with a project set up
- `gcloud` CLI installed and authenticated
- Docker (optional — Cloud Build handles it)

### Step 1: Set up your GCP project
```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### Step 2: Deploy with Cloud Build (recommended)
```bash
cd example-app
gcloud run deploy example-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Cloud Build automatically:
- Builds the Docker image
- Pushes to Container Registry
- Deploys to Cloud Run

You'll get a URL like: `https://example-app-xxxxx.run.app`

### Step 3: Connect to your API
1. Navigate to your deployment URL
2. Open Settings (⚙ icon)
3. Toggle **Demo mode off**
4. Leave **Proxy URL** empty (it uses the same domain `/api/proxy`)
5. Save

Now paste any API URL into the GET box and hit "Send →"

---

## Architecture

### Frontend (`public/index.html`)
- React 18 SPA (no build step needed)
- 100% client-side state management
- Runs directly from Cloud Storage or Cloud Run

### Backend (`server.js`)
- Express.js proxy server
- Forwards requests to any external API
- Adds proper CORS headers
- Validates URLs (prevents loopback attacks)
- 30-second timeout per request
- Health check endpoint at `/health`

### Why a proxy?
Browsers enforce Same-Origin Policy (CORS). Without a backend proxy, the browser blocks requests to external APIs. The proxy:
1. Accepts requests from the frontend (same origin → no CORS issue)
2. Makes requests to your target API (no CORS since it's server-to-server)
3. Returns the response to the frontend

---

## Advanced Deployment Options

### Deploy with Cloud Storage (frontend only)
If you only want to host the frontend (and connect to your own API proxy):

```bash
gsutil mb gs://example-app-frontend
gsutil -m cp public/index.html gs://example-app-frontend/
gsutil web set -m index.html -e index.html gs://example-app-frontend
gsutil iam ch serviceAccount:[email]:objectViewer gs://example-app-frontend
```

Then serve via Cloud CDN for global caching.

### Deploy with Environment Variables
Create a `.env.production` file for production settings:

```bash
gcloud run deploy example-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "LOG_LEVEL=info,MAX_TIMEOUT=60000"
```

### Private Deployment (requires authentication)
```bash
gcloud run deploy example-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated  # Requires authentication
```

Then access via:
```bash
gcloud run services proxy example-app --platform managed --region us-central1
```

---

## Configuration

### Proxy URL Configuration
In **Settings**, set the **Proxy URL** to route requests through your own backend:

**Default (same origin):**
```
Leave blank — uses /api/proxy
```

**Custom Cloud Run backend:**
```
https://your-proxy.run.app
```

**Local development:**
```
http://localhost:8080/api/proxy
```

### Request Timeouts
- Frontend: 30 seconds (hardcoded in server.js)
- Edit `server.js` line 41 to change: `timeout: 30000`

### CORS Headers
All APIs that return JSON are allowed. To restrict to specific origins, edit `server.js`:

```javascript
res.setHeader('Access-Control-Allow-Origin', 'https://your-domain.com');
```

---

## Monitoring & Logging

### View Logs
```bash
gcloud run logs read example-app --limit 50 --region us-central1
```

### Cloud Monitoring
- CPU: Expect <5% on typical usage
- Memory: ~20MB base + request payload
- Cold starts: ~500ms
- Warm: <100ms

### Metrics
```bash
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

---

## Security Best Practices

1. **Disable demo mode in production** — Edit `public/index.html` line ~X: `setDemoMode(false)`
2. **Add authentication** — Wrap Cloud Run with Cloud Identity-Aware Proxy (IAP)
3. **Rate limit** — Add Cloud Armor policy to Cloud Load Balancer
4. **API keys** — Let users paste their own keys in the Headers section
5. **HTTPS only** — Cloud Run enforces HTTPS by default
6. **Loopback protection** — Server prevents requests to localhost/127.0.0.1

---

## Troubleshooting

### "CORS error" when not in demo mode
→ Proxy URL is incorrect. Check Settings and verify your Cloud Run URL is correct.

### "Request timeout"
→ Target API is slow (>30s) or unreachable. Increase timeout in `server.js`.

### Deployment fails with "code not ready"
→ Wait 5-10 minutes for build to complete. Check logs:
```bash
gcloud builds log <BUILD_ID>
```

### High memory usage
→ You're sending very large payloads. Consider splitting requests.

---

## Development

### Local testing
```bash
npm install
npm start
# Visit http://localhost:8080
```

### Build Docker image locally
```bash
docker build -t example-app:latest .
docker run -p 8080:8080 example-app:latest
```

### Update frontend
Edit `public/index.html` and redeploy:
```bash
gcloud run deploy example-app --source .
```

---

## Costs

**Google Cloud Run pricing** (as of 2025):
- 2M requests/month free
- 360,000 GB-seconds free
- ~$0.40/1M requests after free tier
- Storage: Cloud Storage is ~$0.020/GB/month

This app typically costs **$0-1/month** unless heavily used.

---

## Support & Contributing

- Issues? Check the troubleshooting section above
- Feature requests? Edit `public/index.html` directly (it's a self-contained app)
- Need a proxy at `/api/proxy` on a different host? Use `server.js` as a template

---

## License

MIT — Use freely, modify as needed.

---

## API Examples

### Test with public APIs

**GitHub Users**
```
GET https://api.github.com/users
```

**JSONPlaceholder (mock API)**
```
GET https://jsonplaceholder.typicode.com/users
POST https://jsonplaceholder.typicode.com/posts
Body: { "userId": 1, "title": "Test", "body": "Test post" }
```

**OpenWeather (with API key in header)**
```
GET https://api.openweathermap.org/data/3.0/stations
Header: apikey = YOUR_KEY
```

---

## What's Next?

1. Deploy to Cloud Run (see above)
2. Toggle demo mode off and connect to your API
3. Try filtering, sorting, and bulk actions
4. Add custom headers for authentication
5. Bookmark the URL and share with your team

Enjoy exploring!
