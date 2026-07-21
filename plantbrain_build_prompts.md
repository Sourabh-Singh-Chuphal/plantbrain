# PlantBrain — build prompts for AI coding agents

How to use this file: give the agent (Claude Code, Antigravity, Cursor, Cowork, etc.) the
**Project context** block once at the start of a session. Then feed each numbered prompt in
order — each one assumes the previous steps exist in the repo. Adjust file paths to match
your actual project structure as it grows.

---

## Project context (paste this first, every new session)

```
Project: PlantBrain — an AI-powered Industrial Knowledge Intelligence platform.

Problem: asset-intensive plants (steel, refining, manufacturing) run 7-12 disconnected
document systems — engineering drawings, maintenance work orders, safety procedures,
inspection reports, regulatory filings. Engineers lose ~35% of work time searching for
information. This is for a hackathon submission (ET AI Hackathon 2026, problem statement 8:
"AI for Industrial Knowledge Intelligence: Unified Asset & Operations Brain").

What we're building: a platform that ingests heterogeneous documents (PDFs, scanned forms,
spreadsheets), builds a unified knowledge graph + vector index, and exposes four AI agents:
1. Expert Copilot — RAG chat with citations
2. Maintenance/RCA Agent — connects work orders + failure history + OEM manuals
3. Compliance & Quality Agent — maps regulatory clauses against procedures, flags gaps
4. Lessons-learned Engine — surfaces recurring incident patterns proactively

Tech stack:
- Backend: FastAPI (Python 3.11+)
- LLM: Claude API (Anthropic) for extraction, RAG generation, agent reasoning
- Embeddings: sentence-transformers (all-MiniLM-L6-v2) — no GPU needed
- Vector store: ChromaDB (embedded/local, persistent directory)
- Knowledge graph: Neo4j (AuraDB free tier) — entities + relationships
- OCR: pytesseract + pdf2image for scanned documents
- PDF/text extraction: pypdf, pdfplumber
- Frontend: React + Tailwind CSS, bento-grid dashboard aesthetic
- Deployment: Render (backend), Vercel (frontend)

Design language: warm cream/charcoal palette with pastel accents, motion-driven UI,
bento-grid layout. Avoid generic "AI product" look — reference Dribbble-quality polish.

Constraints: this is a hackathon build (48-72hr). Prioritize a working end-to-end slice
over exhaustive features. Every agent should be demoable live, not just described.
```

---

## Prompt 1 — Repo scaffolding

```
Scaffold a monorepo for PlantBrain with this structure:

/backend
  /app
    /api          (FastAPI routers: ingestion, query, compliance, graph)
    /services      (ingestion pipeline, embedding, graph builder, agents)
    /models        (Pydantic schemas)
    /core          (config, LLM client wrapper, vector store client, graph client)
    main.py
  requirements.txt
  .env.example
/frontend
  (Vite + React + TypeScript + Tailwind, standard structure)
/data
  /sample_documents   (placeholder for demo corpus)
/docs
  architecture.md

Set up FastAPI with CORS enabled for the frontend origin, a health check endpoint at
/api/health, and environment variable loading via pydantic-settings (ANTHROPIC_API_KEY,
NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, CHROMA_PERSIST_DIR). Set up the React app with
Tailwind configured and a basic routing shell (Dashboard, Copilot, Compliance, Graph Explorer
as placeholder pages). Do not implement business logic yet — this is scaffolding only.
```

---

## Prompt 2 — Synthetic document generation (data collection)

```
Write a Python script (/backend/scripts/generate_synthetic_docs.py) that uses the Claude API
to generate a synthetic document corpus for a fictional industrial plant called
"Vindhya Steelworks". Generate:

- 8 work orders (equipment maintenance, spanning 2019-2026), each referencing specific
  equipment tags (format: XX-##, e.g. GB-14, PM-07)
- 5 OEM equipment manuals excerpts (troubleshooting sections, 1-2 pages each)
- 6 safety inspection reports
- 3 incident/near-miss reports
- 4 shift handover logs

Critical requirement: entities must repeat consistently across documents to create real
graph relationships. Specifically, plant one deliberate cross-document pattern: sensor tag
"GB-14" should appear in a 2019 incident report AND in two 2026 work orders under similar
conditions (hot work permit issued near elevated gas readings) — this is the pattern the
knowledge graph should surface later as a "lessons learned" moment. Keep all documents
consistent on: plant name, equipment tag format, personnel names (reuse 6-8 recurring names
across documents), and date format.

For regulatory documents: DO NOT fetch these by URL at runtime — OISD/PESO/Factory Act
PDFs are frequently behind paywalls or at unstable URLs and will cause the script to fail
silently. Instead, generate synthetic-but-realistic regulatory text that mirrors the structure
of real Indian industrial standards (numbered clauses, "The licensee shall..."-style language,
section headings). Name the output files clearly:
- regulatory_oisd_105_synthetic.txt (hot work permit requirements)
- regulatory_factory_act_chapter_iv_synthetic.txt (safety officer obligations)
- regulatory_peso_storage_norms_synthetic.txt (hazardous materials storage)

This is explicitly acceptable for a hackathon — judges evaluate the AI reasoning, not
whether the regulatory source is real. Say so in the deck.

Output each generated document as a separate .txt file into /data/sample_documents/,
named descriptively (e.g. work_order_wo4471_2026.txt). Print a summary table of what was
generated at the end.
```

---

## Prompt 3 — Ingestion pipeline

```
Build the ingestion pipeline in /backend/app/services/ingestion.py:

1. accept_upload(file) — accepts PDF, DOCX, XLSX, or image files
2. extract_text(file) — use pypdf/pdfplumber for text PDFs; if extracted text is empty or
   below a length threshold, fall back to OCR via pytesseract + pdf2image (render pages to
   images first)
3. chunk_text(text, chunk_size=700, overlap=100) — recursive splitting, keep paragraph
   boundaries where possible
4. extract_entities(chunk) — call the Claude API with a strict JSON-schema prompt that
   extracts: equipment_tags (list), dates (list), regulatory_refs (list), personnel (list),
   document_type (enum: work_order, manual, inspection_report, incident_report, shift_log,
   regulation). Return structured JSON only, no prose.
5. embed_chunks(chunks) — use sentence-transformers all-MiniLM-L6-v2, store in ChromaDB with
   metadata: source_document, page_number, document_type, entities (from step 4)
6. ingest_document(file) — orchestrates steps 1-5, returns an ingestion summary
   (chunks created, entities found, processing time)

Expose this as a FastAPI endpoint: POST /api/ingest (multipart file upload), returning the
ingestion summary as JSON. Log each step's duration so ingestion feels observable in a
demo (this matters for the "live ingestion" moment in our pitch).
```

---

## Prompt 4 — Knowledge graph builder

```
Build the knowledge graph layer in /backend/app/services/graph.py using the Neo4j Python
driver.

Schema:
- Node labels: Document, Equipment, Person, Regulation, Incident
- Document properties: id, filename, document_type, upload_date
- Equipment properties: tag (e.g. "GB-14"), description
- Relationships: (Document)-[:MENTIONS]->(Equipment), (Document)-[:MENTIONS]->(Person),
  (Document)-[:REFERENCES]->(Regulation), (Equipment)-[:INVOLVED_IN]->(Incident),
  (Document)-[:PRECEDED_BY {days: int}]->(Document) for documents mentioning the same
  equipment tag within a time window

Functions needed:
1. upsert_document_node(doc_metadata) — create/update a Document node
2. link_entities(doc_id, entities) — create Equipment/Person/Regulation nodes (MERGE, not
   CREATE, to avoid duplicates) and relationship edges from the document
3. find_related_documents(equipment_tag) — return all documents mentioning a given equipment
   tag, ordered by date, with the relationship path
4. find_cross_document_patterns(equipment_tag) — specifically detect the case where the same
   equipment tag appears in an Incident-linked document and a later Document within N days of
   each other in different years — this powers the lessons-learned agent
5. graph_stats() — return node/edge counts by type, for the dashboard

Expose endpoints: GET /api/graph/stats, GET /api/graph/equipment/{tag}/related,
GET /api/graph/equipment/{tag}/patterns
```

---

## Prompt 5 — Expert Copilot agent

```
Build the Expert Copilot agent in /backend/app/services/agents/copilot.py.

Flow for answer_query(question):
1. Embed the question using the same sentence-transformers model used for ingestion
2. Retrieve top-k (k=6) chunks from ChromaDB by similarity
3. For each retrieved chunk, also pull related graph context via
   find_related_documents() on any equipment tags mentioned in the chunk metadata
4. Construct a prompt to Claude that includes: the question, the retrieved chunks (with
   source document + page number), and any cross-referenced graph context. Instruct the
   model to answer ONLY from the provided context, cite every claim with
   [source_document, page], and explicitly say "I don't have information on this" rather
   than guessing if the context doesn't cover the question.
5. Return: { answer: string, citations: [{document, page, snippet}], confidence: "high" |
   "medium" | "low" based on retrieval score threshold }
6. **Response cache**: before steps 1-5, compute a hash of the normalized question string
   and check an in-memory dict. If a cached response exists, return it immediately with a
   `cached: true` flag. This is not a feature — it's demo insurance. A 6-second LLM wait
   during a live recording kills energy. Pre-warm the cache for all 3 demo questions before
   recording by calling the endpoint once from a script.

Expose as POST /api/copilot/query. Also build a streaming variant if time allows, so the
frontend can show tokens arriving live (better demo feel).
```

---

## Prompt 6 — Compliance agent

```
Build the Compliance & Quality agent in /backend/app/services/agents/compliance.py.

Flow for check_compliance(regulation_doc_id, procedure_doc_ids):
1. Extract discrete requirement clauses from the regulation document (chunk it, then use
   Claude to pull out numbered/atomic requirements as a structured list: [{clause_id, text}])
2. For each clause, run a retrieval query against the procedure documents' embeddings to find
   the most relevant matching section
3. Ask Claude to judge, given the clause text and the best-matching procedure excerpt,
   whether the requirement is: "covered" | "partial" | "missing" — with a one-sentence
   justification
4. Return a structured report: [{clause_id, clause_text, status, justification,
   matched_excerpt}]

Also build generate_compliance_evidence_package(report) — formats the report as a
downloadable summary (markdown or simple PDF) suitable for an audit trail.

Expose: POST /api/compliance/check, GET /api/compliance/gaps (returns all currently-open
gaps across the last run, for the dashboard widget).
```

---

## Prompt 7 — Maintenance/RCA and lessons-learned agents (stretch)

```
Build two lighter-weight agents:

1. /backend/app/services/agents/maintenance.py — given a failure symptom description,
   retrieve related work orders + OEM manual troubleshooting sections via the copilot's
   retrieval logic, then ask Claude to synthesize: likely root causes (ranked), relevant past
   incidents, and a suggested next action. Expose POST /api/maintenance/diagnose.

2. /backend/app/services/agents/lessons_learned.py — call
   find_cross_document_patterns() from the graph service for all equipment tags with more
   than one linked document, and for any hits, ask Claude to write a one-paragraph "pattern
   alert" explaining what repeated and why it matters operationally. Expose
   GET /api/lessons-learned/alerts — this should return the seeded GB-14 pattern from our
   synthetic data as the flagship example.
```

---

## Prompt 8 — Frontend: dashboard and copilot UI

```
Build the React frontend pages using Tailwind. Use this EXACT dark enterprise design system.
Do NOT use light/cream backgrounds. The aesthetic is Bloomberg terminal meets modern SaaS:
pure dark background, spacious minimal layout, selective color accents for status only.

════════════════════════════════════════════════
DESIGN TOKENS — add to index.css and tailwind.config.js
════════════════════════════════════════════════

CSS custom properties:

  --bg:           #0A0A0A;              /* page background — near-black */
  --surface:      #111111;              /* card / panel background */
  --surface-2:    #161616;              /* elevated surfaces */
  --border:       #1E1E1E;              /* card borders */
  --border-light: #2A2A2A;              /* table row separators */
  --text-primary: #FFFFFF;              /* headings and values */
  --text-muted:   #555555;              /* secondary labels and timestamps */
  --text-dim:     #333333;              /* column headers, very muted */
  --teal:         #00D4A4;              /* active, passed, positive, CTAs */
  --teal-dim:     rgba(0,212,164,0.12); /* teal card background tint */
  --amber:        #F5A623;              /* warning, in-progress, entity accent */
  --amber-dim:    rgba(245,166,35,0.12);
  --red:          #FF4444;              /* failed, critical, incidents */
  --red-dim:      rgba(255,68,68,0.12);
  --purple:       #8B5CF6;              /* personnel node color */

Tailwind: extend colors with brand-teal, brand-amber, brand-red, brand-purple.

Typography: Import Inter from Google Fonts.
  font-weight: 400 (body), 500 (labels), 600 (card values), 700 (page titles only).

Sidebar: ultra-thin 44px wide, icon-only, --surface background. Active icon: --teal color
  with 2px solid --teal left-border strip. Inactive icons: --text-muted. Icons:
  Home (Dashboard) | Chat (Copilot) | Shield (Compliance) | Network (Graph) | Settings.

Animations via framer-motion:
  - Page content: fade-in + slide-up (y: 8→0, opacity: 0→1, duration: 0.3s)
  - Metric counts: count up from 0 on mount (custom useCountUp hook, 1.2s)
  - Table rows: stagger fade-in, 30ms between rows
  - "Failed" compliance badges: subtle red pulse box-shadow animation

════════════════════════════════════════════════
PAGE 1 — DASHBOARD
════════════════════════════════════════════════

Content sits directly on --bg (no outer card wrapper). Sidebar on far left.

Top bar:
  Left: "Dashboard" — white, 28px, font-weight 700
  Right: "Last ingestion: just now" — --teal, 12px

Metric cards row (4 equal cards, --surface bg, 1px --border, 8px rounded, padding 20px):
  DOCUMENTS   → count "12,405" white 36px 600 | sub "+61 today" in --teal | file icon --teal top-right
  ENTITIES    → count "8,291"                 | sub "+12 today" --amber   | network icon --amber
  COMPLIANCE SCORE → "94%"                    | sub "-2 pts this week" --red | warning icon --amber
  ACTIVE ALERTS    → "3"                      | sub "2 critical" --red    | bell icon --red
  Label above count: uppercase, --text-muted, 11px, tracking-widest.

Two-column layout (65% left / 35% right, gap 16px):

LEFT COLUMN:
  "Copilot Activity" heading white 16px 600 | Green dot + "LIVE" green pill badge (top-right)
  4 activity lines: text in --teal (clickable), timestamp right-aligned --text-muted 12px
  "Open full transcript >" link --teal below list

  "DOCUMENT CATEGORIES" label --text-dim uppercase 10px
  Pill row: selected="Work Orders 342" (--teal border + text), rest in --border outline + --text-muted:
    Manuals 18 | Inspection 89 | Incidents 2,104 | Regulatory 56 | Reports 231

  "RECENT ACTIVITY" label --text-dim uppercase 10px
  5 rows: dot icon left (green/amber/red/teal per severity) | description --text-primary | timestamp --text-muted right

RIGHT COLUMN:
  "Compliance Summary" card (--surface, --border, 8px rounded, padding 16px):
    Each rule row: name --text-primary | status word right (Passed=--teal, Warning=--amber, Failed=--red)
    Below name: thin progress bar (colored per status, track=--border, height 2px)
    Rules: Hot Work Permit | Gas Sensor Screening | Safety Procedure Coverage | OISD Compliance

  "System Insights" card (background: --teal-dim, left border 2px solid --teal, 8px rounded):
    "System Insights" in --teal 14px 600
    3 bullet points in --text-primary 13px with GB-14 proactive alerts

Upload button: amber filled, top of main content. Opens modal:
  Modal (--surface, --border, rounded-xl, dark overlay): drag-drop zone (dashed --border)
  4-step ingestion stepper below: spinner → checkmark per step in --teal.
  Step 3 shows entity count found (e.g. "12 entities extracted").

════════════════════════════════════════════════
PAGE 2 — EXPERT COPILOT
════════════════════════════════════════════════

Three-panel layout: icon sidebar | chat history panel (200px) | main chat area

Chat history panel (--surface bg, right border 1px --border):
  "+ New Chat" button: --surface-2, white text, plus icon
  "TODAY" / "PREVIOUS 7 DAYS": --text-dim uppercase 10px section labels
  Session items: checkbox + label text. Selected: --surface-2 bg highlight, label --teal. Others: --text-muted

Main chat area (background: --bg):
  Top bar: session title white bold left | right: "● CONTEXT ACTIVE" green pill + tag pills (--teal border+text)
  Messages:
    User: right-aligned plain white text, no colored bubble
    AI: left-aligned with small circular "P" avatar in --teal
  AI response layout:
    White body text above structured extraction card
    Extraction card (--surface-2, --border, rounded-xl, padding 16px):
      Rows: label --text-muted 12px | value --text-primary 14px
      Equipment values: --teal (clickable) | Regulatory refs: --amber
    Follow-up text below card in white
  AI thinking card: --surface, "Scanning incident database..." + animated ellipsis
  Input bar (bottom, full-width, --surface bg, --border top):
    Paperclip icon left | placeholder "Ask PlantBrain..." --text-muted | amber circle send button right

Mobile: chat history collapses to a drawer. Chat area full width.

════════════════════════════════════════════════
PAGE 3 — COMPLIANCE MONITORING
════════════════════════════════════════════════

Top:
  "RULE ENGINE STATUS" — --text-dim uppercase tiny, above title
  Title: "Compliance " (white) + "Monitoring" (--amber) — same line, 28px 700
  Buttons top-right: "⚡ Ruleset" and "↓ Export" — dark bg, --border, rounded, white text

Three summary cards (equal width, --surface, colored left-border 3px, padding 20px 16px):
  Teal border  | checkmark icon --teal | "5" white 36px | "PASSED" --text-muted
  Amber border | warning icon --amber  | "3"            | "WARNINGS"
  Red border   | X icon --red          | "2"            | "FAILED"

Search bar: --surface, --border, magnifying glass icon, "Search rules..." --text-muted.
Right side: "10 rules" --text-muted.

Data table (directly on --bg, no outer card):
  Headers: RULE ID | RULE | CATEGORY | STATUS | SCORE | LAST CHECKED | ACTIONS
    All in --text-dim, 10px, uppercase, font-weight 500
  Row separators: 1px --border-light. Subtle alternating --bg / --surface bg per row.
  Columns:
    RULE ID    → white monospace (e.g. "WO-001")
    RULE       → white underlined (clickable)
    CATEGORY   → --text-muted plain
    STATUS     → small rounded pill: Passed (--teal bg, dark text) | Warning (--amber bg, dark) | Failed (--red bg, white)
    SCORE      → percentage number + thin progress bar (color=status, width=score%, track=--border)
    LAST CHECKED → --text-muted 12px
    ACTIONS    → "Review" --teal plain text link

════════════════════════════════════════════════
PAGE 4 — ENTITY GRAPH
════════════════════════════════════════════════

Page background: #050505 (darker than --bg — graph feels like outer space).
Top-left: "FORCE-DIRECTED KNOWLEDGE" --text-dim tiny uppercase | "Entity Graph" white 24px below.

Use react-force-graph-2d (NOT d3 from scratch).

Node color map:
  Equipment:  '#00D4A4'  (teal)
  Incident:   '#FF4444'  (red)
  Document:   '#F5A623'  (amber)
  Person:     '#8B5CF6'  (purple)
  Regulation: '#FF6B6B'  (coral)

Node sizes: Equipment=12, Incident=10, Document=8, Person=6, Regulation=8.
Edges: rgba(255,255,255,0.2) color, width 1. Edge labels: small gray text for relationship type.
Node glow: Canvas shadowBlur=15, shadowColor = node color.

Node info panel (position:absolute top-right, --surface, --border, rounded-xl, 220px min-width):
  Appears on node click:
  Node name: white 18px 700 | Type: --teal | Plant: white | Risk Score: --amber if elevated | Connections: white
  Buttons: "Expand" (--border outlined) | "Timeline" (--teal filled → navigates to Equipment Timeline)

Search input (top of graph): --surface bg, zooms to matching node.
Legend (bottom-left, small --surface card): colored dot + label per node type.

════════════════════════════════════════════════
PAGE 5 — EQUIPMENT TIMELINE
════════════════════════════════════════════════

Accessible from Dashboard system insights or Graph node "Timeline" button.

Title: tag name in --teal + " Timeline" white, same line. (e.g. "GB-14 Timeline")

Vertical timeline: events chronological, connected by a vertical center line.
Each event card (--surface, --border, rounded-lg, padding 16px):
  Left: date pill (--surface-2 bg, white text, rounded-full) + colored connector line below:
    Incident=--red | WorkOrder=--amber | Inspection=--teal | Manual=--purple
  Right: doc type icon + doc name white 14px 600 + 2-line excerpt --text-muted + "Open in Copilot →" --teal link

════════════════════════════════════════════════
STATES & CONNECTIVITY
════════════════════════════════════════════════

Connect all pages to FastAPI backend (prompts 3-7). Every async call needs:
  Loading: skeleton shimmer (gradient sweep from --surface to --surface-2, animated)
  Error:   red-bordered card, "Failed to load" message, teal retry button
  Empty:   centered message in --text-muted + action button in --teal

npm packages (install exactly these, do not add more without asking):
  npm install framer-motion react-force-graph react-type-animation
---

## Prompt 9 — Deployment

```
Prepare PlantBrain for deployment:

1. **Backend (Render):**
   - Create a `Dockerfile` for the FastAPI app. IMPORTANT: include `RUN apt-get update && apt-get install -y tesseract-ocr poppler-utils` — pytesseract and pdf2image both require system-level binaries that are NOT pre-installed on Render's environment. Omitting this will cause a `FileNotFoundError` on any OCR operation.
   - Create a `render.yaml`. Configure a Render Persistent Disk mounted at the `CHROMA_PERSIST_DIR` path (e.g., `/data/chroma`). WITHOUT this, ChromaDB will be wiped on every redeploy and your demo corpus will be gone. Set disk size to at least 1 GB.
   - Set environment variables as Render secrets: `ANTHROPIC_API_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `CHROMA_PERSIST_DIR=/data/chroma`.

2. **Frontend (Vercel):**
   - Add `vercel.json` if needed.
   - Set `VITE_API_BASE_URL` as a Vercel environment variable pointing at the deployed Render backend URL.
   - Verify CORS on the backend explicitly allows the Vercel domain (add it to `allow_origins` in FastAPI CORS middleware).

3. **Seed script** (`/backend/scripts/seed_corpus.py`):
   - On startup (or via a `/api/admin/seed` endpoint), check if ChromaDB already has documents. If yes, skip re-ingestion. If no, ingest all files from `/data/sample_documents/`. This prevents duplicate embeddings after a redeploy while still populating a fresh instance.
   - Log clearly: "Corpus already seeded (247 chunks found), skipping" vs "Seeding corpus from scratch..."

4. **Health check**: ensure `GET /api/health` returns `{"status": "ok", "chroma_chunks": int, "neo4j_connected": bool}` — the richer response lets you verify the full stack is working from a single URL.

5. **Document the deploy steps** in `/docs/deployment.md` including the persistent disk setup step — this is the step most likely to be forgotten under hackathon time pressure.
```

---

## Prompt 10 — Demo script generation

```
Write a 90-second demo script for a hackathon video, structured as:
1. (0-15s) Cold open on the problem: an engineer can't find a 2019 incident report that
   explains today's alarm — state the 35%-of-work-time-lost statistic on screen
2. (15-40s) Live upload of a new document into PlantBrain, showing the ingestion pipeline
   progress (chunking, entity extraction) in the UI
3. (40-65s) Ask the copilot a question that requires combining two documents (the GB-14
   pattern) — show the cited answer and click through to the source documents
4. (65-80s) Show the compliance gap check flagging a missing regulatory clause with one
   click
5. (80-90s) Close on the dashboard with quantified impact numbers and a one-line scalability
   statement

Output this as a shot-list with on-screen text suggestions for each beat, formatted for
handing directly to whoever is recording/editing the video.
```
