import React, { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Upload, X, CheckCircle, Loader2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react'
import { ingestFile, type IngestionSummary } from '../api'

interface Props {
  onClose: () => void
  onSuccess?: (summary: IngestionSummary) => void
}

type Step = {
  label: string
  state: 'pending' | 'active' | 'done' | 'error'
  detail?: string
}

const INITIAL_STEPS: Step[] = [
  { label: 'Extracting text & OCR', state: 'pending' },
  { label: 'Chunking document', state: 'pending' },
  { label: 'Extracting entities & issue analysis', state: 'pending' },
  { label: 'Embedding & knowledge graph indexing', state: 'pending' },
]

export default function UploadModal({ onClose, onSuccess }: Props) {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<IngestionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setStep = (idx: number, state: Step['state'], detail?: string) =>
    setSteps(s => s.map((st, i) => i === idx ? { ...st, state, detail } : st))

  const handleFile = useCallback((f: File) => setFile(f), [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const startIngestion = async () => {
    if (!file) return
    setRunning(true)
    setError(null)
    setResult(null)
    setSteps(INITIAL_STEPS)

    setStep(0, 'active')
    const t0 = Date.now()

    try {
      const progress = setInterval(() => {
        const elapsed = (Date.now() - t0) / 1000
        if (elapsed > 1.5) setStep(0, 'done')
        if (elapsed > 3)   { setStep(1, 'done'); setStep(2, 'active') }
        if (elapsed > 6)   { setStep(2, 'done'); setStep(3, 'active') }
      }, 500)

      const summary = await ingestFile(file)

      clearInterval(progress)
      setStep(0, 'done')
      setStep(1, 'done')
      setStep(2, 'done', `${summary.entities_found.equipment_tags.length + summary.entities_found.personnel.length} entities extracted`)
      setStep(3, 'done', `${summary.chunks_created} chunks indexed`)

      setResult(summary)
      onSuccess?.(summary)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Ingestion failed')
      setSteps(s => s.map(st => st.state === 'active' ? { ...st, state: 'error' } : st))
    } finally {
      setRunning(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 24,
            width: 520,
            maxWidth: '92vw',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontWeight: 600, fontSize: 17, fontFamily: "'Newsreader', Georgia, serif" }}>Upload & Analyze Document</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Drop zone */}
          {!running && !result && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragging ? 'var(--teal)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: 32,
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? 'var(--teal-dim)' : 'var(--surface-2)',
                transition: 'all 0.2s',
                marginBottom: 16,
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload size={32} style={{ color: 'var(--teal)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                {file ? file.name : 'Drop PDF or click to browse'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                PDF, DOCX, XLSX, TXT, PNG, JPG (Auto OCR & AI Analysis)
              </p>
              <input id="file-input" type="file" hidden onChange={onInputChange} />
            </div>
          )}

          {/* Stepper (while running) */}
          {running && (
            <div style={{ marginBottom: 16 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  {step.state === 'done'    && <CheckCircle size={16} style={{ color: 'var(--teal)', flexShrink: 0 }} />}
                  {step.state === 'active'  && <Loader2 size={16} style={{ color: 'var(--amber)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />}
                  {step.state === 'pending' && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid var(--border-light)', flexShrink: 0 }} />}
                  {step.state === 'error'   && <AlertCircle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: 13, color: step.state === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{step.label}</div>
                    {step.detail && <div style={{ fontSize: 11, color: 'var(--teal)' }}>{step.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rich AI Ingestion Analysis Card */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {/* Success Badge */}
              <div style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)', borderRadius: 10, padding: '12px 14px', fontSize: 13 }}>
                <div style={{ color: 'var(--teal)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span>✓ Ingestion & Graph Indexing Complete</span>
                  <span style={{ fontSize: 11, background: 'var(--surface)', padding: '2px 8px', borderRadius: 999, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {result.processing_time_s.toFixed(1)}s · {result.chunks_created} Chunks
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Type: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{result.document_type.replace('_', ' ')}</strong> · Source: {result.filename}
                </div>
              </div>

              {/* What Happened / Summary & Issue Identified */}
              {result.analysis && (
                <div className="card" style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    📋 WHAT WAS UPLOADED (SUMMARY)
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 12 }}>
                    {result.analysis.summary}
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    ⚠️ ISSUE & OPERATIONAL FINDING
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 12 }}>
                    {result.analysis.issue_identified}
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    ⚡ RECOMMENDED ACTION
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {result.analysis.recommended_action}
                  </div>
                </div>
              )}

              {/* Extracted Entities Pills */}
              {result.entities_found && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Entities Linked:</span>
                  {result.entities_found.equipment_tags.map(tag => (
                    <span key={tag} style={{ background: 'var(--teal)', color: '#FFFFFF', borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                      🏷️ {tag}
                    </span>
                  ))}
                  {result.entities_found.personnel.slice(0, 3).map(p => (
                    <span key={p} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 999, padding: '2px 9px', fontSize: 11 }}>
                      👤 {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  onClick={() => {
                    const tag = result.entities_found.equipment_tags[0] || result.filename
                    navigate(`/copilot?q=Explain the issue in ${tag}`)
                    onClose()
                  }}
                  style={{ flex: 1, padding: '10px 0', background: 'var(--teal)', color: '#FFFFFF', border: 'none', borderRadius: 999, fontWeight: 600, cursor: 'pointer', fontSize: 12, textAlign: 'center', boxShadow: '0 2px 8px rgba(61, 99, 70, 0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Sparkles size={14} /> Investigate in Copilot <ArrowRight size={12} />
                </button>
                {result.entities_found.equipment_tags.length > 0 && (
                  <button
                    onClick={() => {
                      navigate(`/timeline/${result.entities_found.equipment_tags[0]}`)
                      onClose()
                    }}
                    style={{ flex: 1, padding: '10px 0', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 999, fontWeight: 600, cursor: 'pointer', fontSize: 12, textAlign: 'center' }}
                  >
                    📈 View Timeline →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: 12, marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>
              ✗ {error}
            </div>
          )}

          {/* Action button */}
          {!result && (
            <button
              disabled={!file || running}
              onClick={startIngestion}
              style={{
                width: '100%',
                padding: '11px 0',
                background: file && !running ? 'var(--teal)' : 'var(--surface-2)',
                color: file && !running ? '#FFFFFF' : 'var(--text-dim)',
                border: 'none',
                borderRadius: 999,
                fontWeight: 600,
                cursor: file && !running ? 'pointer' : 'not-allowed',
                fontSize: 14,
                boxShadow: file && !running ? '0 2px 8px rgba(61, 99, 70, 0.22)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {running && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {running ? 'Processing…' : 'Ingest & Analyze Document'}
            </button>
          )}

          {result && (
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '10px 0', background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 999, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              Close
            </button>
          )}
        </motion.div>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AnimatePresence>
  )
}
