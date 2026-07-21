import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, X, Download, Search, Zap } from 'lucide-react'
import { getComplianceGaps, runComplianceCheck, type ComplianceClause } from '../api'

// ── Demo compliance rules ─────────────────────────────────────────────────────

const DEMO_RULES = [
  { id: 'OISD-105-§3.1', rule: 'Hot work permit required before ignition source use', category: 'Hot Work', status: 'Passed', score: 96 },
  { id: 'OISD-105-§4.2', rule: 'Gas testing mandatory within 30 min before hot work', category: 'Gas Safety', status: 'Warning', score: 63 },
  { id: 'OISD-105-§5.1', rule: 'Fire watch must be maintained for 30 min after hot work', category: 'Hot Work', status: 'Passed', score: 88 },
  { id: 'OISD-105-§6.3', rule: 'Combustible gas detector calibrated within 6 months', category: 'Instrumentation', status: 'Failed', score: 38 },
  { id: 'OISD-105-§7.2', rule: 'Area isolation verified and documented before work', category: 'Permit', status: 'Passed', score: 92 },
  { id: 'OISD-105-§7.3', rule: 'Site safety officer countersignature on all permits', category: 'Permit', status: 'Failed', score: 22 },
  { id: 'FACTORY-§41a', rule: 'Safety officer present for all high-risk operations', category: 'Personnel', status: 'Warning', score: 71 },
  { id: 'FACTORY-§45', rule: 'Medical examination records current for all shift personnel', category: 'Personnel', status: 'Passed', score: 85 },
  { id: 'PESO-§12', rule: 'Hazardous materials storage within licensed quantity limits', category: 'Storage', status: 'Passed', score: 94 },
  { id: 'PESO-§18', rule: 'Emergency response plan updated and drilled quarterly', category: 'Emergency', status: 'Warning', score: 58 },
]

type RuleStatus = 'Passed' | 'Warning' | 'Failed'

const statusColor: Record<RuleStatus, string> = {
  Passed: 'var(--teal)',
  Warning: 'var(--amber)',
  Failed: 'var(--red)',
}

function StatusPill({ status }: { status: RuleStatus }) {
  const colors: Record<RuleStatus, { bg: string; text: string }> = {
    Passed:  { bg: 'var(--teal)',  text: '#FFFFFF' },
    Warning: { bg: 'var(--amber)', text: '#FFFFFF' },
    Failed:  { bg: 'var(--red)',   text: '#FFFFFF' },
  }
  return (
    <span
      className={status === 'Failed' ? 'pulse-red' : ''}
      style={{
        background: colors[status].bg, color: colors[status].text,
        fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '4px 10px',
      }}
    >
      {status}
    </span>
  )
}

export default function Compliance() {
  const [search, setSearch] = useState('')
  const [rules, setRules] = useState(DEMO_RULES)
  const [running, setRunning] = useState(false)

  const filtered = rules.filter(r =>
    r.rule.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    Passed:  rules.filter(r => r.status === 'Passed').length,
    Warning: rules.filter(r => r.status === 'Warning').length,
    Failed:  rules.filter(r => r.status === 'Failed').length,
  }

  const [showRuleset, setShowRuleset] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  const handleExport = () => {
    setExportMsg('Exporting package...')
    setTimeout(() => {
      setExportMsg('✓ Evidence Package Generated!')
      setTimeout(() => setExportMsg(''), 3000)
    }, 800)
  }

  const [selectedReview, setSelectedReview] = useState<typeof DEMO_RULES[0] | null>(null)
  const [workOrderCreated, setWorkOrderCreated] = useState(false)

  const handleCreateWO = () => {
    setWorkOrderCreated(true)
    setTimeout(() => {
      setWorkOrderCreated(false)
    }, 2000)
  }

  const pageVariants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }


  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>

      {/* Top */}
      <div style={{ marginBottom: 12 }}>
        <div className="section-label">RULE ENGINE STATUS</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 34, fontWeight: 500, fontFamily: "'Newsreader', Georgia, serif", color: 'var(--text-primary)' }}>
            Compliance <span style={{ color: 'var(--amber)', fontFamily: "'Newsreader', Georgia, serif" }}>Monitoring</span>
          </h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {exportMsg && <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>{exportMsg}</span>}
            <button
              onClick={() => setShowRuleset(true)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 999, padding: '8px 16px', cursor: 'pointer', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'inherit', fontWeight: 500, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
            >
              <Zap size={13} style={{ color: 'var(--amber)' }} /> Ruleset
            </button>
            <button
              onClick={handleExport}
              style={{ background: 'var(--teal)', border: 'none', color: '#FFFFFF', borderRadius: 999, padding: '8px 18px', cursor: 'pointer', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'inherit', fontWeight: 600, boxShadow: '0 2px 8px rgba(61, 99, 70, 0.20)' }}
            >
              <Download size={13} style={{ color: '#FFFFFF' }} /> Export Evidence
            </button>
          </div>
        </div>
      </div>

      {/* Ruleset Modal */}
      {showRuleset && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowRuleset(false)}
        >
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 520, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} style={{ color: 'var(--amber)' }} /> Active Regulatory Rulesets
              </h3>
              <button onClick={() => setShowRuleset(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, borderLeft: '3px solid var(--teal)' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>OISD Standard 105 (Hot Work Safety)</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>6 active clause rules · Hot Work Permits & Gas Screening</div>
              </div>

              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, borderLeft: '3px solid var(--amber)' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Factory Act Chapter IV (Safety Officer Obligations)</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>2 active clause rules · High-Risk Operation Presence</div>
              </div>

              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, borderLeft: '3px solid var(--purple)' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>PESO Hazardous Storage Norms</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>2 active clause rules · Licensed Storage Limits</div>
              </div>
            </div>

            <button
              onClick={() => setShowRuleset(false)}
              style={{ width: '100%', padding: '10px 0', background: 'var(--teal)', color: '#000', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
            >
              Close Ruleset Manager
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedReview && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedReview(null)}
        >
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 560, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--teal)' }}>{selectedReview.id}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{selectedReview.rule}</h3>
              </div>
              <button onClick={() => setSelectedReview(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <StatusPill status={selectedReview.status as RuleStatus} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Category: <strong style={{ color: 'var(--text-primary)' }}>{selectedReview.category}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Score: <strong style={{ color: statusColor[selectedReview.status as RuleStatus] }}>{selectedReview.score}%</strong></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, marginBottom: 20 }}>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>MANDATORY CLAUSE OBLIGATION</div>
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  "The licensee shall verify that all plant procedures enforce {selectedReview.rule.toLowerCase()} prior to job sign-off."
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, borderLeft: `3px solid ${statusColor[selectedReview.status as RuleStatus]}` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>PLANT PROCEDURE FINDINGS</div>

                <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedReview.status === 'Passed'
                    ? 'Procedure SP-04 fully complies with regulatory guidelines. Verified in 2026 safety audit.'
                    : selectedReview.status === 'Warning'
                    ? 'Procedure SP-04 specifies gas testing but lacks documented 30-minute interval logs for hot work permits.'
                    : 'Procedure SP-04 lacks recalibration compliance checks. Gas blower GB-14 calibration log expired > 18 months ago.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCreateWO}
                style={{ flex: 1, padding: '10px 0', background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                {workOrderCreated ? '✓ Corrective Action Logged' : '⚡ Log Remediation Action'}
              </button>
              <button
                onClick={() => setSelectedReview(null)}
                style={{ flex: 1, padding: '10px 0', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, margin: '20px 0' }}>
        {(['Passed', 'Warning', 'Failed'] as RuleStatus[]).map(status => {
          const icons = { Passed: Shield, Warning: AlertTriangle, Failed: X }
          const Icon = icons[status]
          return (
            <div key={status} className="card" style={{ flex: 1, borderLeft: `3px solid ${statusColor[status]}`, padding: '20px 16px' }}>
              <Icon size={20} style={{ color: statusColor[status], marginBottom: 8 }} />
              <div className="metric-value" style={{ fontSize: 32 }}>{counts[status]}</div>
              <div className="section-label" style={{ marginTop: 4 }}>{status.toUpperCase()}</div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-dark"
            style={{ paddingLeft: 32 }}
            placeholder="Search rules…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{filtered.length} rules</span>
      </div>

      {/* Table */}
      <div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 110px 80px 120px 100px 60px',
          padding: '8px 0',
          borderBottom: '1px solid var(--border)',
          gap: 12,
        }}>
          {['RULE ID', 'RULE', 'CATEGORY', 'STATUS', 'SCORE', 'LAST CHECKED', 'ACTIONS'].map(h => (
            <div key={h} className="section-label" style={{ margin: 0 }}>{h}</div>
          ))}
        </div>

        {filtered.map((row, i) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 110px 80px 120px 100px 60px',
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
              gap: 12,
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{row.id}</span>
            <span
              onClick={() => setSelectedReview(row)}
              style={{ fontSize: 13, textDecoration: 'underline', textDecorationColor: 'var(--border)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            >{row.rule}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.category}</span>
            <div><StatusPill status={row.status as RuleStatus} /></div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>{row.score}%</div>
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                <div style={{ height: '100%', width: `${row.score}%`, background: statusColor[row.status as RuleStatus], borderRadius: 1 }} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Jul 20, 2026</span>
            <button
              onClick={() => setSelectedReview(row)}
              style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}
            >
              Review
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}


