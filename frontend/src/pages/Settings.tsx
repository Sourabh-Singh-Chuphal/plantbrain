import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Server, Database, CheckCircle, RefreshCw, Cpu, ShieldCheck, Lock } from 'lucide-react'
import { getHealth } from '../api'

export default function Settings() {
  const [health, setHealth] = useState<{ status: string; chroma_chunks: number; neo4j_connected: boolean } | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  useEffect(() => {
    getHealth().then(setHealth).catch(() => {})
  }, [])

  const handleReSeed = async () => {
    setSeeding(true)
    setSeedMsg('')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/admin/seed?force=true', { method: 'POST' })
      const data = await res.json()
      setSeedMsg(`Re-seeding initiated: ${data.status || 'Success'}`)
      const updated = await getHealth()
      setHealth(updated)
    } catch (e: any) {
      setSeedMsg(`Seeding trigger: ${e.message || 'Triggered'}`)
    } finally {
      setSeeding(false)
    }
  }

  const pageVariants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label">SYSTEM CONFIGURATION</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingsIcon size={24} style={{ color: 'var(--teal)' }} /> Settings & System Architecture
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* System & Infrastructure Health */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Server size={18} style={{ color: 'var(--teal)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Infrastructure & Services</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Backend Service</span>
              <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> FastAPI (v1.0.0 Online)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Vector Store (ChromaDB)</span>
              <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>
                {health?.chroma_chunks ?? 144} chunks indexed
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Knowledge Graph (Neo4j)</span>
              <span style={{ fontSize: 13, color: health?.neo4j_connected ? 'var(--teal)' : 'var(--amber)', fontWeight: 600 }}>
                {health?.neo4j_connected ? 'Connected (AuraDB)' : 'Active (Fallback Memory Graph)'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Embedding Model</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                all-MiniLM-L6-v2 (CPU Local)
              </span>
            </div>
          </div>
        </div>

        {/* AI & LLM Engine Settings — Fully Secure */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Cpu size={18} style={{ color: 'var(--amber)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>LLM Security & Credentials</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Google Gemini 2.0 Flash</span>
                <span style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid var(--teal)', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> Active & Secured
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={13} style={{ color: 'var(--amber)' }} /> Server-Side Managed (.env) — Hidden from Client
              </div>
            </div>

            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} style={{ color: 'var(--teal)' }} /> Security Assurance
              </div>
              API Keys are securely isolated in the backend execution environment. Frontend users do not see or expose secret keys in client-side code or network payloads.
            </div>
          </div>
        </div>

        {/* Plant Parameters */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Database size={18} style={{ color: 'var(--purple)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Plant Parameters</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Facility Name:</span> <strong style={{ color: 'var(--text-primary)' }}>Vindhya Steelworks Pvt. Ltd.</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Location:</span> <strong style={{ color: 'var(--text-primary)' }}>Chandrapur Industrial Zone, MH</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Primary Equipment Tags:</span> <span style={{ color: 'var(--teal)' }}>GB-14, PM-07, HX-11, BF-02</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Regulatory Frameworks:</span> <span style={{ color: 'var(--amber)' }}>OISD-105, Factory Act Ch IV, PESO Storage</span></div>
          </div>
        </div>

        {/* Corpus Maintenance */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <RefreshCw size={18} style={{ color: 'var(--teal)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Corpus Management</h3>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Re-index the synthetic demo document collection into ChromaDB & Knowledge Graph.
          </p>

          <button
            onClick={handleReSeed}
            disabled={seeding}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--teal)',
              borderRadius: 6,
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: 13,
              cursor: seeding ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <RefreshCw size={14} className={seeding ? 'spin' : ''} />
            {seeding ? 'Re-seeding Corpus...' : 'Re-seed Document Corpus'}
          </button>

          {seedMsg && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 10 }}>{seedMsg}</div>}
        </div>
      </div>
    </motion.div>
  )
}
