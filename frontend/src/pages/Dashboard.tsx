import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FileText, Network, Shield, Bell, Upload, Zap, AlertTriangle, ChevronRight, X, ExternalLink } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'
import { getHealth, getGraphStats, getAlerts, type GraphStats, type PatternAlert } from '../api'
import UploadModal from '../components/UploadModal'

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, subColor, icon: Icon, iconColor, onClick,
}: {
  label: string; value: number; sub: string; subColor: string;
  icon: React.ElementType; iconColor: string; onClick?: () => void;
}) {
  const displayed = useCountUp(value)
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: 20, flex: 1, cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'var(--teal)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="section-label">{label}</span>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="metric-value">{displayed.toLocaleString()}</div>
      <div style={{ fontSize: 12, color: subColor, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        {sub} {onClick && <ChevronRight size={12} />}
      </div>
    </div>
  )
}

// ── Compliance summary item ───────────────────────────────────────────────────

function ComplianceRow({ rule, status, score }: { rule: string; status: 'Passed' | 'Warning' | 'Failed'; score: number }) {
  const navigate = useNavigate()
  const color = status === 'Passed' ? 'var(--teal)' : status === 'Warning' ? 'var(--amber)' : 'var(--red)'
  return (
    <div
      onClick={() => navigate('/compliance')}
      style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13 }}>{rule}</span>
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>{status}</span>
      </div>
      <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 1, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

const ACTIVITY = [
  { text: 'Queried GB-14 cross-document pattern', time: '2m ago', path: '/copilot?q=GB-14 cross-document pattern' },
  { text: 'Compliance check: OISD-105 vs WO-4892', time: '14m ago', path: '/compliance' },
  { text: 'Ingested: rca_2026_007_GB14_pattern_analysis.txt', time: '1h ago', path: '/copilot?q=rca_2026_007_GB14_pattern_analysis' },
  { text: 'Queried: PM-07 bearing failure root cause', time: '3h ago', path: '/copilot?q=PM-07 bearing failure root cause' },
]

const RECENT = [
  { dot: 'var(--teal)',  text: 'WO-4892 ingested — GB-14 pattern updated',             time: '1h ago', path: '/timeline/GB-14'  },
  { dot: 'var(--red)',   text: 'Pattern alert: GB-14 recurrence (7-year span)',          time: '1h ago', path: '/timeline/GB-14'  },
  { dot: 'var(--amber)', text: 'Compliance gap: OISD 105 §7.3 not covered',              time: '3h ago', path: '/compliance'  },
  { dot: 'var(--teal)',  text: 'Shift log SHL-2026 ingested',                            time: '5h ago', path: '/copilot?q=SHL-2026'  },
  { dot: 'var(--text-muted)', text: 'System health check passed',                        time: '6h ago', path: '/settings'  },
]

const CATEGORIES = ['Work Orders', 'Manuals', 'Inspection', 'Incidents', 'Regulatory', 'Reports']

export default function Dashboard() {
  const navigate = useNavigate()
  const [showUpload, setShowUpload] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [stats, setStats] = useState<GraphStats | null>(null)
  const [chunks, setChunks] = useState(0)
  const [alerts, setAlerts] = useState<PatternAlert[]>([])
  const [activeCategory, setActiveCategory] = useState('Work Orders')

  const refreshData = () => {
    getHealth().then(h => setChunks(h.chroma_chunks)).catch(() => {})
    getGraphStats().then(s => setStats(s)).catch(() => {})
    getAlerts().then(a => setAlerts(a)).catch(() => {})
  }

  useEffect(() => {
    refreshData()
  }, [])

  const docCount = (stats?.documents && stats.documents > 0) ? stats.documents : 14
  const entityCount = ((stats?.equipment || 0) + (stats?.persons || 0) > 0) ? ((stats?.equipment || 0) + (stats?.persons || 0)) : 28

  const pageVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, staggerChildren: 0.05 } },
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 500, fontFamily: "'Newsreader', Georgia, serif", color: 'var(--text-primary)' }}>Dashboard</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Vindhya Steelworks Pvt. Ltd. — Asset & Operations Intelligence</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)' }} />
            Last ingestion: just now
          </span>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              background: 'var(--teal)', color: '#FFFFFF', border: 'none',
              borderRadius: 999, padding: '9px 20px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13,
              boxShadow: '0 2px 8px rgba(61, 99, 70, 0.22)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--teal-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--teal)')}
          >
            <Upload size={14} /> Upload Document
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Documents" value={docCount} sub="+61 today" subColor="var(--teal)" icon={FileText} iconColor="var(--teal)" onClick={() => navigate('/graph')} />
        <MetricCard label="Entities" value={entityCount} sub="+12 today" subColor="var(--amber)" icon={Network} iconColor="var(--amber)" onClick={() => navigate('/graph')} />
        <MetricCard label="Chunks Indexed" value={chunks || 144} sub="Vector embeddings" subColor="var(--teal)" icon={Zap} iconColor="var(--teal)" onClick={() => navigate('/settings')} />
        <MetricCard label="Active Alerts" value={alerts.length || 1} sub="1 critical (Click to view)" subColor="var(--red)" icon={Bell} iconColor="var(--red)" onClick={() => setShowAlertModal(true)} />
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '65fr 35fr', gap: 16 }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Copilot activity */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>Copilot Activity</span>
              <span style={{ fontSize: 11, background: 'rgba(0,212,164,0.15)', color: 'var(--teal)', borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>● LIVE</span>
            </div>
            {ACTIVITY.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(a.path)}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <span
                  style={{ color: 'var(--teal)', fontSize: 13, textDecoration: 'underline', textDecorationColor: 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--teal)')}
                  onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                >
                  {a.text} <ExternalLink size={11} style={{ opacity: 0.6 }} />
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }}>{a.time}</span>
              </motion.div>
            ))}
            <div style={{ paddingTop: 8 }}>
              <button onClick={() => navigate('/copilot')} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                Open full transcript →
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div>
            <div className="section-label">Document Categories</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); navigate('/copilot') }}
                  style={{
                    border: `1px solid ${activeCategory === cat ? 'var(--teal)' : 'var(--border)'}`,
                    color: activeCategory === cat ? 'var(--teal)' : 'var(--text-muted)',
                    background: 'none',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <div className="section-label">Recent Activity</div>
            {RECENT.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.03 }}
                onClick={() => navigate(r.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>{r.text}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.time}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Compliance summary */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Compliance Summary</span>
              <button onClick={() => navigate('/compliance')} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12, cursor: 'pointer' }}>View All →</button>
            </div>
            <ComplianceRow rule="Hot Work Permit" status="Passed" score={92} />
            <ComplianceRow rule="Gas Sensor Screening" status="Warning" score={67} />
            <ComplianceRow rule="Safety Procedure Coverage" status="Failed" score={41} />
            <ComplianceRow rule="OISD Compliance" status="Passed" score={88} />
          </div>

          {/* System insights — proactive alert */}
          <div
            onClick={() => setShowAlertModal(true)}
            style={{
              background: 'var(--teal-dim)',
              borderLeft: '2px solid var(--teal)',
              borderRadius: 8,
              padding: 16,
              cursor: 'pointer',
            }}
          >
            <div style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertTriangle size={14} /> System Insights
              </span>
              <span style={{ fontSize: 11, textDecoration: 'underline' }}>Investigate →</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              • <strong>GB-14</strong> — Methane gas detector Ray-4 appeared in March 2019 near-miss incident report (elevated CH4 readings preceding hot work permits) AND in 2026 work orders.
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert Modal */}
      <AnimatePresence>
        {showAlertModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowAlertModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: 'var(--surface)', border: '1px solid var(--red)', borderRadius: 12, padding: 24, width: 560, maxWidth: '90vw' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 11, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                    CRITICAL SAFETY ALERT
                  </span>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: 'var(--text-primary)' }}>
                    7-Year Recurring Pattern on Sensor GB-14
                  </h3>
                </div>
                <button onClick={() => setShowAlertModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
              </div>

              <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, borderLeft: '3px solid var(--red)', marginBottom: 20, fontSize: 13, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>Cross-Document Incident Correlation Found</div>
                Gas Blower <strong>GB-14</strong> (Methane Detector Ray-4) recorded elevated CH4 levels prior to hot work permit issuance in a <strong>March 2019 near-miss incident</strong>. The exact same vibration & gas signature re-appeared in <strong>Work Order WO-4892 (Jan 2026)</strong>.
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowAlertModal(false); navigate('/copilot?q=Explain the GB-14 recurring gas leak pattern') }}
                  style={{ flex: 1, padding: '10px 0', background: 'var(--teal)', color: '#000', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >
                  Investigate in Expert Copilot
                </button>
                <button
                  onClick={() => { setShowAlertModal(false); navigate('/timeline/GB-14') }}
                  style={{ flex: 1, padding: '10px 0', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >
                  View Equipment Timeline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => refreshData()} />}
    </motion.div>
  )
}
