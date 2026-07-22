# Sentinel Deployment Guide

## Quick start (local development)

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # fill in your API keys
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

### 2. Seed the corpus

```bash
# From /backend with venv active:
python scripts/seed_corpus.py
# Or: POST http://localhost:8000/api/admin/seed
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

---

## Production deployment

### Backend → Render

1. Push code to GitHub
2. Create new Render **Web Service** → **Docker** → point to `/backend/Dockerfile`
3. **CRITICAL**: Add a **Persistent Disk** mounted at `/data/chroma` (min 1 GB)
   - Without this, ChromaDB is wiped on every redeploy
4. Set environment variables in Render dashboard:
   - `ANTHROPIC_API_KEY`
   - `NEO4J_URI` (e.g. `neo4j+s://xxxx.databases.neo4j.io`)
   - `NEO4J_PASSWORD`
   - `CHROMA_PERSIST_DIR=/data/chroma`
   - `FRONTEND_ORIGIN=https://sentinel-eight.vercel.app` (your Vercel URL)
5. After first deploy, seed the corpus via:
   ```
   POST https://your-render-url.onrender.com/api/admin/seed
   ```

### Frontend → Vercel

1. Official Live Production Deployment: **[https://sentinel-eight.vercel.app/](https://sentinel-eight.vercel.app/)**
2. Import the `/frontend` directory in Vercel
3. Set environment variable:
   - `VITE_API_BASE_URL=https://your-render-url.onrender.com`
4. Vercel auto-detects Vite — no extra config needed

### Neo4j AuraDB (free tier)

1. Create account at https://console.neo4j.io
2. Create a new AuraDB Free instance
3. Copy the connection URI, username, and password into your `.env`

---

## Demo readiness checklist

Run these before recording the demo video (on the deployed instance, not localhost):

- [ ] `GET /api/health` returns `{"status": "ok", "chroma_chunks": >50, "neo4j_connected": true}`
- [ ] `GET /api/lessons-learned/alerts` returns the GB-14 alert
- [ ] Copilot answers the GB-14 question with citations from ≥2 documents
- [ ] Compliance check returns ≥3 clauses with statuses
- [ ] Upload a new document and see chunks count increase
- [ ] Graph explorer shows >10 nodes
- [ ] Equipment timeline for GB-14 shows events spanning 2018–2026

---

## Common issues

| Problem | Fix |
|---------|-----|
| `pytesseract` crashes | Add `RUN apt-get install -y tesseract-ocr` to Dockerfile |
| ChromaDB empty after redeploy | Persistent Disk not mounted — see step 3 above |
| CORS error in browser | Add Vercel URL to `FRONTEND_ORIGIN` env var |
| Neo4j connection refused | Check `NEO4J_URI` format: must start with `neo4j+s://` |
