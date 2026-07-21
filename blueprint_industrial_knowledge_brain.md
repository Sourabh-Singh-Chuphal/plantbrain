# Project blueprint: AI for Industrial Knowledge Intelligence — "Unified Asset & Operations Brain"

**Source:** ET AI Hackathon 2026 — Problem Statement 8 of 8
**Theme:** Industrial Intelligence / Document Management / Knowledge Engineering / Quality

---

## 1. Why this problem statement, precisely

Of the 8 statements in the pack, this is the only one that is a **software-and-data problem end to end** — no live IoT/SCADA feed, no satellite imagery, no computer-vision-on-counterfeit-notes, no SOC telemetry to fake. Everything you need to build a convincing, working demo can be sourced from public/synthetic documents and built with tools you already use daily:

| What the problem needs | What you already have |
|---|---|
| Ingest messy heterogeneous documents (PDFs, scans, spreadsheets) and structure them | Loom — you built exactly this: a CSV/data importer that maps messy input into a clean schema |
| Reason over structured risk/compliance data, explain "why" | MSME Financial Health Card — XGBoost + SHAP reasoning over alternate data, explainability-first UI |
| RAG copilot with citations | GenAI/LLM stack, FastAPI backend experience |
| Polished dashboard, not a raw data table | Your stated design bar (Dribbble-level, motion-driven, bento grids) |
| Deployable demo in days, not weeks | Vercel (frontend) + Render (backend) — your existing deployment pattern |

The other 7 statements would force you to spend 60–70% of hackathon time faking data (IoT sensor streams, AIS vessel tracking, satellite AQI grids, counterfeit note image datasets, SOC log corpora) before you could demonstrate any real intelligence. This one lets you spend that time on the actual AI logic and the UI polish that's your differentiator.

---

## 2. The problem, restated

Indian asset-intensive plants run 7–12 disconnected document systems (drawings, work orders, procedures, inspection records, regulatory filings). Engineers lose ~35% of work time searching for information. 18–22% of unplanned downtime traces back to decisions made without full equipment history. A generational knowledge cliff is coming as experienced engineers retire without their tacit knowledge ever being captured.

**Challenge:** build a platform that ingests this document sprawl, builds a unified knowledge graph, and makes it queryable, actionable, and continuously updated — on any device, including mobile for field technicians.

---

## 3. Product concept: "PlantBrain" (working name)

A single knowledge layer over a plant's documents, exposed through four surfaces:

1. **Ingestion & knowledge graph** — the backbone everything else reads from
2. **Expert Copilot** — chat interface, RAG-grounded, cited answers, mobile-friendly
3. **Maintenance / RCA Agent** — connects work orders + failure history + OEM manuals into predictive maintenance and root-cause suggestions
4. **Compliance & Quality Agent** — maps regulatory requirements (Factory Act, OISD, PESO) against current procedures and flags gaps automatically

For a hackathon, build all four as thin-but-real slices rather than one deep vertical — judges reward breadth of the "what you may build" list, and it maps cleanly to the 25/25/20/15/15 scoring rubric.

---

## 4. Scope: MVP (48–72hr build) vs. stretch

### MVP — must work in the demo
- Upload flow: PDF/DOCX/XLSX/scanned-image documents (use 15–20 synthetic/public industrial documents — OEM manuals, sample P&IDs, safety procedure templates, dummy work orders)
- Ingestion pipeline: OCR (for scans) → chunking → entity extraction (equipment tags, dates, personnel, regulatory refs) → embeddings into a vector store → lightweight knowledge graph (entities + relationships)
- Expert Copilot: chat UI, answers grounded in retrieved chunks, shows source document + page, confidence indicator
- One compliance check: given a regulatory clause (e.g., an OISD requirement) and a procedure document, flag whether it's covered or missing
- Dashboard: bento-grid overview — document coverage, knowledge graph size, open compliance gaps, recent copilot queries
- **Proactive alert banner**: dashboard surfaces pattern alerts without user prompting (e.g., "⚠️ GB-14 appeared in a 2019 near-miss and 2 recent work orders under similar conditions") — this shifts PlantBrain from reactive to proactive and directly targets the Innovation 25% rubric

### Stretch — if time allows
- Maintenance/RCA agent: given a failure symptom, pull related work orders + OEM troubleshooting steps + past similar incidents
- Lessons-learned surfacing: proactively flag "this configuration preceded an incident before"
- Mobile-responsive field view (the copilot alone, optimized for a technician on a phone)
- Knowledge graph visual explorer (interactive node graph, not just chat)
- **Equipment Timeline view**: given an equipment tag (e.g., GB-14), render a vertical/horizontal timeline of every document referencing it in chronological order — makes the cross-document pattern visually undeniable without requiring any AI, just a sorted list rendered beautifully
- **Multi-hop query**: copilot can answer questions like "find all equipment under a hot work permit within 30 days before an incident" — graph traversal + RAG combined, genuinely novel vs. plain RAG competitors
- **LLM response cache**: keyed by question hash, returns instant answers for repeated queries — critical for demo reliability and eliminates latency anxiety during live recording

### Explicitly out of scope for the hackathon
- Real P&ID computer-vision parsing (use text-based drawings/specs instead of true CAD parsing)
- Live QMS integration (mock it as a config toggle)
- Multi-tenant auth/security hardening

---

## 5. System architecture

```
Documents (PDF, scans, XLSX, email exports)
        │
        ▼
Ingestion pipeline (FastAPI service)
  ├─ Text extraction: pypdf / pdfplumber for text PDFs
  ├─ OCR: pytesseract for scanned pages
  ├─ Chunking: recursive character/token splitter (500–800 tokens, overlap)
  ├─ Entity extraction: LLM-based NER prompt → equipment tags, dates, refs, personnel
  └─ Embedding: sentence-transformers or OpenAI/Claude embeddings
        │
        ├──────────────► Vector store (Chroma / pgvector / FAISS — pick Chroma for zero-ops hackathon speed)
        │
        └──────────────► Knowledge graph (lightweight: Neo4j free tier, or a Postgres adjacency-table graph if you want to avoid another service)
                                │
        ┌───────────────────────┼───────────────────────┬────────────────────┐
        ▼                       ▼                        ▼                    ▼
  Expert Copilot          Maintenance/RCA           Compliance Agent    Lessons-learned
  (RAG + citations)       Agent                      (gap detection)    Engine
        │                       │                        │                    │
        └───────────────────────┴────────────────────────┴────────────────────┘
                                        │
                                 FastAPI backend
                              (orchestration, REST API, auth)
                                        │
                                 React frontend
                     (chat, dashboard, graph explorer, mobile view)
```

---

## 6. Tech stack (mapped to what you already use)

| Layer | Tool | Why |
|---|---|---|
| Backend API | FastAPI | Your existing stack; async-friendly for LLM calls |
| LLM | Claude (via Anthropic API) or open model via API | RAG generation, entity extraction, compliance reasoning |
| Embeddings | sentence-transformers (all-MiniLM) or API embeddings | Fast, no GPU needed for hackathon scale |
| Vector store | ChromaDB (local/embedded) | Zero infra setup, good enough for a demo corpus |
| Knowledge graph | Postgres with an edges table, or Neo4j AuraDB free tier | Neo4j gives you a visual graph explorer for free (Bloom/Browser) — good demo value |
| OCR | pytesseract + pdf2image | Handles scanned safety procedures/inspection forms |
| Frontend | React + Tailwind | Your design system of choice; bento-grid dashboard, chat UI |
| Deployment | Render (FastAPI backend) + Vercel (React frontend) | Matches your existing deployment pattern |
| Auth (stretch) | Simple JWT | Only if time allows; not core to judging |

---

## 7. Data sourcing strategy (the part most teams get wrong)

You don't have real plant documents — and you shouldn't fake having them. Instead:

1. Use **public/open documents**: OSHA/DGMS/OISD guideline PDFs (real, publicly available), sample OEM manuals (many manufacturers publish PDF manuals openly), generic P&ID legend sheets.
2. **Synthesize the rest with an LLM**: generate realistic-looking work orders, inspection logs, and shift notes for a fictional plant ("Plant would be graded on how well the AI *reasons*, not on dataset authenticity — say so explicitly in your deck).
3. Keep a consistent fictional plant (e.g., "Vindhya Steelworks") across all synthetic documents so the knowledge graph has real cross-document relationships to discover — this is what makes the "connects the dots no individual could connect" demo moment land.

---

## 8. Judging criteria — how to maximize each

The rubric is fixed across all 8 problem statements: **Innovation 25% / Business Impact 25% / Technical Excellence 20% / Scalability 15% / UX 15%**.

- **Innovation (25%):** Lead with the knowledge-graph-plus-RAG combination — most teams will do plain RAG. Cross-document relationship discovery (a work order referencing an equipment tag that appears in a 2019 incident report) is your "wow" moment.
- **Business Impact (25%):** Quantify against the stats already in the problem statement — 35% of engineer time lost, 18–22% of unplanned downtime, 25% of the workforce retiring within a decade. Show a before/after: "this query took 4 minutes of copilot time vs. an estimated 45 minutes of manual document search."
- **Technical Excellence (20%):** Show the pipeline working live — upload a new document mid-demo and show the knowledge graph updating and the copilot immediately citing it. Live ingestion is more impressive than a pre-loaded static demo.
- **Scalability (15%):** Have one slide on how this generalizes — same pipeline architecture works for any document-heavy asset-intensive sector (refineries, EPC, utilities), and Neo4j/Chroma both scale horizontally.
- **UX (15%):** This is where your design instincts do the most work. Bento-grid dashboard, clean citation cards (source doc + page number, not just a footnote), and a genuinely usable mobile-friendly copilot view for "field technicians."

---

## 9. Suggested build timeline (assuming a 2–4 person team, ~60hr hackathon)

| Phase | Hours | Deliverable |
|---|---|---|
| 1. Data prep | 0–8 | Fictional plant document set assembled (real + synthetic), consistent entity names across docs |
| 2. Ingestion pipeline | 8–20 | Upload → OCR/text extraction → chunking → embeddings → vector store working |
| 3. Knowledge graph | 20–30 | Entity extraction + graph population, basic query API |
| 4. Copilot agent | 30–40 | RAG chat with citations working end-to-end |
| 5. Compliance agent | 40–48 | One working gap-detection flow (regulatory clause vs. procedure doc) |
| 6a. Frontend (mock mode) | 20–35 (parallel) | Build all UI pages against hardcoded/static JSON — no backend dependency, full design pass |
| 6b. Frontend (live APIs) | 40–52 (parallel) | Swap static mocks for real backend endpoints once agents are stable |
| 7. Deploy + demo prep | 52–58 | Render + Vercel deploy, architecture diagram, deck, run demo checklist |
| 8. Demo video + rehearsal | 58–60 | Record, cut, submit |

> **Why split frontend into 6a/6b?** The original plan had "parallel from hour 30" but agents aren't done until hour 48. Building UI against mocks first means design is done and perfected *before* integration — no hour-52 scramble.

Frontend work should run in parallel with backend from hour ~20 once the API contract (upload endpoint, query endpoint, response schema) is agreed — don't let it become a hour-52 scramble like the IDBI deck.

---

## 10. Demo narrative (for the video/live demo)

1. Open on the pain: "an engineer searching for a P&ID and getting nothing, while the answer sits in a scanned 2019 inspection report."
2. Upload a new document live — show ingestion pipeline running (chunking, entity extraction visible in a log/progress UI, not a black box).
3. Ask the copilot a question that can only be answered by combining two different documents (e.g., a maintenance question that pulls from both a work order and an OEM manual) — this proves the knowledge graph, not just plain RAG.
4. Run the compliance check — show a real regulatory clause flagged as unmet in a procedure doc, with the citation.
5. Close on the dashboard — coverage stats, quantified time savings, and one sentence on scalability to other plants/sectors.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| OCR quality on scanned docs is poor | Pre-select cleaner scans; fall back to text-based synthetic docs for the parts of the demo that must be flawless |
| Knowledge graph entity extraction is noisy | Constrain entity types tightly (equipment tag, date, regulation ref, person) via a strict extraction prompt/schema instead of open-ended NER |
| LLM hallucinates citations | Hard-enforce retrieval-then-generate: never let the model answer without at least one retrieved chunk; show "no answer found" state explicitly |
| Demo document set feels "toy" | Anchor to one consistent fictional plant with real regulatory documents mixed in — judges will forgive synthetic data if the reasoning is real |
| **ChromaDB wiped on Render redeploy** | **CRITICAL**: Render's default filesystem is ephemeral. Mount a Render Persistent Disk to `CHROMA_PERSIST_DIR`. Verify seed script checks if corpus already exists before re-ingesting. Without this, your demo corpus is gone after every deploy. |
| **pytesseract fails on Render** | `pytesseract` wraps a system binary. Add `RUN apt-get install -y tesseract-ocr` to your Dockerfile — it's not pre-installed on Render's environment and will throw a cryptic `FileNotFoundError` at runtime. |
| **LLM API latency during live demo** | Add a response cache (keyed by question hash) in the Copilot agent. Pre-warm it with the 3 demo questions before recording. A 6-second wait kills demo energy. |
| **OISD/regulatory URLs are unstable** | Do not fetch these by URL in the generate script — they sit behind paywalls or change frequently. Pre-download manually and commit to `/data/sample_documents/regulatory/` instead. |

---

## 12. If you want a second option

The strongest alternative in the pack is **#6 — Digital Public Safety (fraud, counterfeiting, digital arrest scams)**: extremely high business-impact framing (digital arrest scams are a live national news topic) and demoable via an LLM-based scam-pattern classifier + a WhatsApp-style citizen fraud-shield bot, which fits your GenAI/conversational-AI strengths. It's weaker for you mainly because the counterfeit-currency computer-vision piece and voice-spoofing detection would need either real datasets or a convincingly-faked CV demo, which is outside your current toolset — you'd likely want to scope those out and lean entirely into the fraud-network-graph and citizen-chatbot pieces if you went this route instead.

---

## 13. Demo readiness checklist (run 2 hours before submission)

Do not skip this. Run through every item on the deployed production instance, not localhost.

```
Ingestion
[ ] Upload one new document live — completes in < 30 seconds, progress steps visible in UI
[ ] Ingestion log shows chunking, entity extraction, embedding steps with durations
[ ] Re-upload the same document — confirm it doesn't create duplicate graph nodes (MERGE works)

Copilot
[ ] The GB-14 cross-document question returns an answer citing TWO different source documents
[ ] Citation chips are clickable and show the correct source excerpt
[ ] "I don't have information on this" state triggers for an out-of-corpus question
[ ] Response cache is warm — second ask of the same question is instant

Compliance
[ ] Compliance check returns at least 3 gaps (covered/partial/missing)
[ ] "Generate evidence package" download works and is readable

Dashboard
[ ] Proactive alert banner shows the GB-14 pattern without any user query
[ ] All metric counters show non-zero numbers
[ ] Equipment Timeline shows GB-14 events across 2019–2026

Graph Explorer
[ ] Graph renders with > 50 nodes visible
[ ] Clicking a node highlights its connected edges
[ ] GB-14 equipment node is findable and shows all linked documents

Mobile
[ ] Copilot page is usable on a real phone, not just browser DevTools narrow mode
[ ] Upload button is tappable on mobile

Deployment
[ ] ChromaDB persist directory survives a Render service restart (verify this explicitly)
[ ] All environment variables are set in Render and Vercel dashboards
[ ] CORS allows the Vercel domain on the FastAPI backend
[ ] Health check endpoint at /api/health returns 200
```
