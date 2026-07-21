import axios from 'axios'

const rawBase = import.meta.env.VITE_API_BASE_URL || ''
const BASE = rawBase.replace(/\/+$/, '')

const api = axios.create({
  baseURL: BASE,
  timeout: 120000,
})

export default api

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string
  chroma_chunks: number
  neo4j_connected: boolean
  app_env: string
  version: string
}

export interface DocumentAnalysis {
  summary: string
  issue_identified: string
  recommended_action: string
}

export interface IngestionSummary {
  document_id: string
  filename: string
  document_type: string
  chunks_created: number
  entities_found: {
    equipment_tags: string[]
    dates: string[]
    regulatory_refs: string[]
    personnel: string[]
    document_type: string
  }
  analysis?: DocumentAnalysis
  processing_time_s: number
  status: string
  error?: string
}

export interface Citation {
  document: string
  page?: number
  snippet: string
}

export interface CopilotResponse {
  answer: string
  citations: Citation[]
  confidence: 'high' | 'medium' | 'low'
  cached: boolean
  latency_ms?: number
}

export interface GraphStats {
  documents: number
  equipment: number
  persons: number
  incidents: number
  regulations: number
  total_edges: number
}

export interface PatternAlert {
  equipment_tag: string
  pattern_summary: string
  llm_narrative?: string
  documents_involved: string[]
  risk_level: string
  years_span: number
  doc_count?: number
}

export interface ComplianceClause {
  clause_id: string
  clause_text: string
  status: 'covered' | 'partial' | 'missing'
  justification: string
  matched_excerpt?: string
}

export interface ComplianceReport {
  regulation_doc: string
  procedure_docs: string[]
  clauses: ComplianceClause[]
  generated_at: string
  summary: { covered: number; partial: number; missing: number }
}

export interface RelatedDocument {
  document_id: string
  filename: string
  document_type: string
  date?: string
  relationship: string
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getHealth = () => api.get<HealthResponse>('/api/health').then(r => r.data)

export const getGraphStats = () => api.get<GraphStats>('/api/graph/stats').then(r => r.data)

export const queryCopilot = (question: string, session_id?: string) =>
  api.post<CopilotResponse>('/api/copilot/query', { question, session_id }).then(r => r.data)

export const ingestFile = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<IngestionSummary>('/api/ingest', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const getAlerts = () =>
  api.get<PatternAlert[]>('/api/lessons-learned/alerts').then(r => r.data)

export const getGraphExplorer = () =>
  api.get<{ nodes: any[]; links: any[] }>('/api/graph/explorer').then(r => r.data)

export const getEquipmentTimeline = (tag: string) =>
  api.get<RelatedDocument[]>(`/api/graph/equipment/${tag}/timeline`).then(r => r.data)

export const runComplianceCheck = (regulation_doc_id: string, procedure_doc_ids: string[]) =>
  api.post<ComplianceReport>('/api/compliance/check', null, {
    params: { regulation_doc_id, procedure_doc_ids },
  }).then(r => r.data)

export const getComplianceGaps = () =>
  api.get<ComplianceClause[]>('/api/compliance/gaps').then(r => r.data)

export const seedCorpus = (force = false) =>
  api.post('/api/admin/seed', null, { params: { force } }).then(r => r.data)
