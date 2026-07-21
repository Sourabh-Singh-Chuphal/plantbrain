import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getEquipmentTimeline, type RelatedDocument } from '../api'

const DOC_TYPE_COLOR: Record<string, string> = {
  incident_report:  'var(--red)',
  work_order:       'var(--amber)',
  inspection_report:'var(--teal)',
  manual:           'var(--purple)',
  shift_log:        'var(--text-muted)',
  regulation:       '#FF6B6B',
  unknown:          'var(--border)',
}

const DOC_TYPE_LABEL: Record<string, string> = {
  incident_report:  'Incident',
  work_order:       'Work Order',
  inspection_report:'Inspection',
  manual:           'Manual',
  shift_log:        'Shift Log',
  regulation:       'Regulation',
  unknown:          'Document',
}

// Demo fallback timeline
const DEMO_TIMELINE: RelatedDocument[] = [
  { document_id: '1', filename: 'incident_2019_03_GB14_near_miss.txt',          document_type: 'incident_report',   date: 'March 12, 2019',    relationship: 'MENTIONS' },
  { document_id: '2', filename: 'work_order_WO3591_2018_GB14_calibration.txt',  document_type: 'work_order',        date: 'November 4, 2018',  relationship: 'MENTIONS' },
  { document_id: '3', filename: 'inspection_2021_07_bay4_zone_c.txt',            document_type: 'inspection_report', date: 'July 19, 2021',     relationship: 'MENTIONS' },
  { document_id: '4', filename: 'work_order_WO4471_2024_GB14_calibration.txt',  document_type: 'work_order',        date: 'August 3, 2024',    relationship: 'MENTIONS' },
  { document_id: '5', filename: 'shift_log_SHL-2026-0121.txt',                  document_type: 'shift_log',         date: 'January 21, 2026',  relationship: 'MENTIONS' },
  { document_id: '6', filename: 'work_order_WO4892_2026_GB14_critical.txt',     document_type: 'work_order',        date: 'June 14, 2026',     relationship: 'MENTIONS' },
  { document_id: '7', filename: 'rca_2026_007_GB14_pattern_analysis.txt',       document_type: 'incident_report',   date: 'July 2, 2026',      relationship: 'MENTIONS' },
]

function TimelineEvent({ doc, index }: { doc: RelatedDocument; index: number }) {
  const color = DOC_TYPE_COLOR[doc.document_type] || 'var(--border)'
  const label = DOC_TYPE_LABEL[doc.document_type] || 'Document'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{ display: 'flex', gap: 16, paddingBottom: 24, position: 'relative' }}
    >
      {/* Left: date + connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 120, flexShrink: 0 }}>
        <div style={{
          background: 'var(--surface-2)', color: 'var(--text-primary)',
          borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 500,
          whiteSpace: 'nowrap', marginBottom: 8,
        }}>
          {doc.date || 'Unknown date'}
        </div>
        <div style={{ flex: 1, width: 2, background: color, opacity: 0.3, minHeight: 40 }} />
      </div>

      {/* Right: doc card */}
      <div className="card" style={{ flex: 1, padding: 14, borderLeft: `3px solid ${color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            background: color + '22', color, border: `1px solid ${color}33`,
            borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 600,
          }}>{label}</span>
        </div>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
          {doc.filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
          {doc.filename}
        </div>
        <a href={`/copilot?q=${encodeURIComponent(`Tell me about ${doc.filename}`)}`}
          style={{ color: 'var(--teal)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          Open in Copilot <ExternalLink size={10} />
        </a>
      </div>
    </motion.div>
  )
}

export default function Timeline() {
  const { tag } = useParams<{ tag: string }>()
  const [events, setEvents] = useState<RelatedDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tag) return
    setLoading(true)
    getEquipmentTimeline(tag)
      .then(data => setEvents(data.length > 0 ? data : DEMO_TIMELINE))
      .catch(() => setEvents(DEMO_TIMELINE))
      .finally(() => setLoading(false))
  }, [tag])

  const effectiveTag = tag || 'GB-14'
  const effectiveEvents = events.length > 0 ? events : (loading ? [] : DEMO_TIMELINE)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}
    >
      {/* Back */}
      <a href="/graph" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Graph
      </a>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
        <span style={{ color: 'var(--teal)' }}>{effectiveTag}</span>{' '}
        <span>Timeline</span>
      </h1>

      {loading && (
        <div style={{ color: 'var(--text-muted)' }}>Loading timeline…</div>
      )}

      {!loading && effectiveEvents.map((doc, i) => (
        <TimelineEvent key={doc.document_id} doc={doc} index={i} />
      ))}

      {!loading && effectiveEvents.length === 0 && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>
          No documents found for {effectiveTag}
        </div>
      )}
    </motion.div>
  )
}
