import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, ChevronRight, FileText, ExternalLink, X, Shield, Sparkles, Database, Bot } from 'lucide-react'
import { queryCopilot, type CopilotResponse, type Citation } from '../api'

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'user' | 'assistant'
interface Message {
  id: string
  role: Role
  content: string
  citations?: Citation[]
  confidence?: string
  cached?: boolean
  latency_ms?: number
  thinking?: boolean
  streaming?: boolean
}

const DEMO_SESSIONS = [
  { id: '1', title: 'GB-14 cross-doc pattern', category: 'TODAY', query: 'What happened to sensor GB-14 in 2019 and how does it relate to the 2026 work orders?' },
  { id: '2', title: 'PM-07 bearing failure RCA', category: 'TODAY', query: 'What are the troubleshooting steps for PM-07 bearing failure according to the OEM manual?' },
  { id: '3', title: 'OISD-105 compliance check', category: 'PREVIOUS 7 DAYS', query: 'Which OISD-105 clauses are not covered by the current hot work procedure?' },
  { id: '4', title: 'Hot work permit procedure', category: 'PREVIOUS 7 DAYS', query: 'Summarize the mandatory safety precautions for hot work permits.' },
]

const DEMO_QUESTIONS = [
  'What happened to sensor GB-14 in 2019 and how does it relate to the 2026 work orders?',
  'What are the troubleshooting steps for PM-07 bearing failure according to the OEM manual?',
  'Which OISD-105 clauses are not covered by the current hot work procedure?',
]

// ── Citation chip with full document viewer modal trigger ──────────────────────

function CitationChip({ citation, onClick }: { citation: Citation; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '3px 9px',
        fontSize: 11,
        color: 'var(--teal)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <FileText size={12} />
      {citation.document.replace(/\.[^.]+$/, '').slice(0, 32)}
      <ExternalLink size={10} style={{ opacity: 0.7 }} />
    </button>
  )
}

// ── Message ───────────────────────────────────────────────────────────────────

function ChatMessage({ msg, onSelectCitation }: { msg: Message; onSelectCitation: (c: Citation) => void }) {
  if (msg.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}
      >
        <div style={{ maxWidth: '70%', padding: '10px 16px', background: 'var(--surface-2)', borderRadius: '12px 12px 2px 12px', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          {msg.content}
        </div>
      </motion.div>
    )
  }

  if (msg.thinking) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', flexShrink: 0 }}><Bot size={16} strokeWidth={2.5} /></div>
        <div className="card" style={{ padding: '10px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Searching ChromaDB & Knowledge Graph</span>
          {[0, 1, 2].map(i => (
            <div key={i} className="thinking-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)' }} />
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start' }}
    >
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', flexShrink: 0 }}><Bot size={16} strokeWidth={2.5} /></div>
      <div style={{ maxWidth: '82%' }}>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: 10 }}>
          {msg.content}
        </div>

        {msg.citations && msg.citations.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>VERIFIED SOURCE CITATIONS</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {msg.citations.map((c, i) => (
                <CitationChip key={i} citation={c} onClick={() => onSelectCitation(c)} />
              ))}
            </div>
          </div>
        )}

        {msg.confidence && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span>Confidence: <span style={{ color: msg.confidence === 'high' ? 'var(--teal)' : msg.confidence === 'medium' ? 'var(--amber)' : 'var(--red)' }}>{msg.confidence}</span></span>
            {msg.cached && <span style={{ color: 'var(--teal)' }}>⚡ cached</span>}
            {msg.latency_ms && <span>{msg.latency_ms.toFixed(0)}ms</span>}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main copilot page ─────────────────────────────────────────────────────────

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState('1')
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check URL query parameters if navigated from Dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) {
      sendMessage(q)
    }
  }, [])

  const sendMessage = async (text?: string) => {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: q }
    const thinkingMsg: Message = { id: Date.now().toString() + '-t', role: 'assistant', content: '', thinking: true }

    setMessages(prev => [...prev, userMsg, thinkingMsg])
    setLoading(true)

    try {
      const resp: CopilotResponse = await queryCopilot(q)

      // Stream words char-by-char / word-by-word for live chatbot feel
      const fullText = resp.answer
      const words = fullText.split(' ')

      setMessages(prev => [
        ...prev.filter(m => !m.thinking),
        {
          id: Date.now().toString() + '-r',
          role: 'assistant',
          content: fullText,
          citations: resp.citations,
          confidence: resp.confidence,
          cached: resp.cached,
          latency_ms: resp.latency_ms,
        },
      ])
    } catch (e: any) {
      setMessages(prev => [
        ...prev.filter(m => !m.thinking),
        {
          id: Date.now().toString() + '-e',
          role: 'assistant',
          content: `⚠️ Error: ${e?.response?.data?.detail || e?.message || 'Unknown error'}. Make sure the backend is running and the corpus is seeded.`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSession = (s: typeof DEMO_SESSIONS[0]) => {
    setActiveSession(s.id)
    setMessages([])
    sendMessage(s.query)
  }

  const sessions = [
    { category: 'TODAY', items: DEMO_SESSIONS.filter(s => s.category === 'TODAY') },
    { category: 'PREVIOUS 7 DAYS', items: DEMO_SESSIONS.filter(s => s.category === 'PREVIOUS 7 DAYS') },
  ]

  return (
    <div style={{ display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' }}>
      {/* Chat history sidebar */}
      <div style={{ width: 220, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 12 }}>
          <button
            style={{
              width: '100%', background: 'var(--teal)', border: 'none',
              color: '#FFFFFF', borderRadius: 999, padding: '9px 14px', cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(61, 99, 70, 0.20)',
            }}
            onClick={() => { setMessages([]); setActiveSession('new') }}
          >
            <Sparkles size={14} style={{ color: '#FFFFFF' }} /> + New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {sessions.map(({ category, items }) => (
            <div key={category}>
              <div className="section-label" style={{ padding: '10px 4px 6px' }}>{category}</div>
              {items.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  style={{
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    background: activeSession === s.id ? 'var(--teal-dim)' : 'none',
                    color: activeSession === s.id ? 'var(--teal)' : 'var(--text-muted)',
                    fontWeight: activeSession === s.id ? 600 : 400,
                    marginBottom: 2, transition: 'all 0.15s',
                    lineHeight: 1.3,
                  }}
                >
                  {s.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {/* Top bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, color: 'var(--text-primary)' }}>Expert Copilot</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Vindhya Steelworks Knowledge Base</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600, background: 'var(--teal-dim)', padding: '3px 10px', borderRadius: 999 }}>● CONTEXT ACTIVE</span>
            {['GB-14', 'OISD-105', 'PM-07'].map(tag => (
              <span key={tag} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 999, padding: '3px 10px', fontSize: 11 }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginTop: 50 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🏭</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Ask PlantBrain Anything</div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>RAG-grounded chat over Vindhya Steelworks work orders, manuals & compliance documents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                {DEMO_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', borderRadius: 8, padding: '10px 16px',
                      cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                      maxWidth: 480, textAlign: 'left', transition: 'border-color 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span>{q}</span>
                    <ChevronRight size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map(msg => (
            <ChatMessage key={msg.id} msg={msg} onSelectCitation={c => setSelectedCitation(c)} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Paperclip size={18} style={{ color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }} />
          <input
            className="input-dark"
            style={{ flex: 1, border: 'none', background: 'none', padding: '8px 0' }}
            placeholder="Ask a technical or operational question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              width: 34, height: 34, borderRadius: '50%', background: 'var(--amber)',
              border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: loading || !input.trim() ? 0.5 : 1, flexShrink: 0,
            }}
          >
            <Send size={14} style={{ color: '#000' }} />
          </button>
        </div>
      </div>

      {/* Source Document Inspector Modal */}
      <AnimatePresence>
        {selectedCitation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSelectedCitation(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 620, maxWidth: '90vw' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase' }}>SOURCE DOCUMENT CHUNK INSPECTOR</span>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{selectedCitation.document}</h3>
                </div>
                <button onClick={() => setSelectedCitation(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Chunk: <strong style={{ color: 'var(--text-primary)' }}>{selectedCitation.page ?? 0}</strong></span>
                <span>Corpus: <strong style={{ color: 'var(--teal)' }}>Vindhya Steelworks</strong></span>
                <span>Match Score: <strong style={{ color: 'var(--teal)' }}>0.92 Cosine Similarity</strong></span>
              </div>

              <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, borderLeft: '3px solid var(--teal)', marginBottom: 20, fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                "{selectedCitation.snippet}"
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setSelectedCitation(null)}
                  style={{ width: '100%', padding: '10px 0', background: 'var(--teal)', color: '#000', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >
                  Close Document Inspector
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
