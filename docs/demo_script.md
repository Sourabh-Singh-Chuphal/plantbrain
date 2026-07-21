# PlantBrain — 90-Second Hackathon Demo Video Script

**Target Duration:** 90 Seconds  
**Format:** Shot List & Voiceover Script (Ready for Screen Recording & Video Editing)  
**Tone:** High-energy, professional, problem-solution focused industrial technology pitch.

---

## 🎬 Beat-by-Beat Shot List

### Beat 1: Cold Open — The Industrial Problem (0:00 – 0:15)
- **Visual:** Split screen or quick cuts of heavy industrial machinery (steel plant/refinery) transitioning to an engineer staring at 7+ open tabs/folders searching through PDFs.
- **On-Screen Text:**  
  `35% of industrial engineer time is wasted searching across disconnected siloes.`  
  `7-12 disconnected document systems per plant.`
- **Voiceover (VO):**  
  *"At modern steel mills and process plants, critical operational knowledge is trapped across seven different document silos. When gas blower GB-14 triggers an alarm today, engineers spend hours searching for a 2019 incident report that already solved this exact issue."*

---

### Beat 2: Live Ingestion & Intelligence Extraction (0:15 – 0:40)
- **Visual:** Screen recording of the **PlantBrain Dashboard**. Click **"Upload Document"**. Drag and drop `work_order_2026_GB14_overhaul.txt` (or PDF). Watch the 4-step real-time ingestion stepper animate in real time (Text Extraction -> Chunking -> Hybrid Entity Extraction -> Graph Linkage).
- **On-Screen Text:**  
  `Multimodal Ingestion Pipeline`  
  `OCR + Entity Recognition + Hybrid Vector & Graph Indexing`
- **Voiceover (VO):**  
  *"Enter PlantBrain — the Unified Industrial Asset & Operations Intelligence Platform. We ingest complex PDFs, work orders, OEM manuals, and regulatory filings in seconds. As documents drop in, our hybrid pipeline automatically parses text, extracts equipment tags like GB-14, and links them directly into a living Neo4j knowledge graph."*

---

### Beat 3: Expert Copilot & Cross-Document Graph Reasoning (0:40 – 1:05)
- **Visual:** Navigate to **Expert Copilot**. Click pre-warmed sample query:  
  `"What is the recurring issue with Gas Blower GB-14 during hot work permits?"`  
  Show AI response generating with precise citations (`[incident_2019_03_GB14_near_miss.txt, Page 1]`, `[work_order_wo4471_2026.txt]`). Hover/click citation to highlight source chunk. Click **View Node Timeline** for GB-14 to show timeline from 2019 to 2026.
- **On-Screen Text:**  
  `Cross-Document Graph RAG`  
  `Zero Hallucination with Verifiable Source Citations`
- **Voiceover (VO):**  
  *"With Expert Copilot, engineers ask natural language questions. PlantBrain doesn’t just perform vector search; it synthesizes cross-document patterns. Here, it correlates a 2019 near-miss incident with a 2026 overhaul order—surfacing a 7-year recurring vibration pattern under high-temperature permits before a costly outage occurs."*

---

### Beat 4: Automated Compliance & Gap Analysis (1:05 – 1:20)
- **Visual:** Switch to **Compliance Monitoring**. Show 10 OISD / Factory Act rule cards. Click **"Run Compliance Check"** on *OISD Standard 105 (Hot Work)* vs *Plant Safety Procedure SP-04*. Highlight a flagged **"FAILED"** gap badge with exact clause discrepancy.
- **On-Screen Text:**  
  `Automated Regulatory Gap Analysis`  
  `OISD & Factory Act Compliance Audit in 1-Click`
- **Voiceover (VO):**  
  *"Compliance teams no longer audit manually. PlantBrain automatically checks internal operating procedures against regulatory clauses—instantly flagging gaps where permit isolation guidelines fall short of updated OISD standards."*

---

### Beat 5: Dashboard Impact & Call to Action (1:20 – 1:30)
- **Visual:** Return to main **PlantBrain Bento Dashboard**. Smooth zoom over key stats: `12,405 Documents Indexed`, `8,291 Graph Entities`, `3 Proactive Alerts Active`. Fade to closing screen with logo and URL.
- **On-Screen Text:**  
  `PlantBrain: Turning Silent Data into Asset Intelligence`  
  `ET AI Hackathon 2026 — Problem Statement 8`
- **Voiceover (VO):**  
  *"PlantBrain transforms silent paper trails into proactive asset intelligence. Zero manual tagging, total operational compliance, and instant institutional memory. PlantBrain—the brain your plant was missing."*

---

## 🛠️ Screen Recording Instructions for Presenter

1. **Pre-warm Backend Caches:** Ensure FastAPI backend is running and `python scripts/seed_corpus.py` has executed so graph and vector indices are loaded.
2. **Resolution & Theme:** Record at 1920x1080 resolution, full screen browser in dark mode (`--bg: #0A0A0A`).
3. **Cursor Settings:** Use subtle mouse click highlight animations.
4. **Pacing:** Keep screen navigation smooth and deliberate; match mouse movements to the timestamp markers above.
