import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getGraphExplorer } from '../api'

type NodeType = 'Equipment' | 'Incident' | 'Document' | 'Person' | 'Regulation'

const NODE_COLORS: Record<NodeType, string> = {
  Equipment:  '#00D4A4',
  Incident:   '#FF4444',
  Document:   '#F5A623',
  Person:     '#8B5CF6',
  Regulation: '#FF6B6B',
}

const NODE_SIZES: Record<NodeType, number> = {
  Equipment:  12,
  Incident:   10,
  Document:   8,
  Person:     6,
  Regulation: 8,
}

interface GraphNode { id: string; name: string; type: NodeType; x?: number; y?: number; vx?: number; vy?: number }
interface GraphLink { source: string | GraphNode; target: string | GraphNode; label?: string }

// ── Info panel ────────────────────────────────────────────────────────────────

function NodeInfoPanel({ node, onClose, links }: { node: GraphNode; onClose: () => void; links: GraphLink[] }) {
  const connections = links.filter(l => {
    const src = typeof l.source === 'string' ? l.source : l.source.id
    const tgt = typeof l.target === 'string' ? l.target : l.target.id
    return src === node.id || tgt === node.id
  }).length

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', top: 16, right: 16,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 16, width: 240, zIndex: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{node.name}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
        <span style={{ color: NODE_COLORS[node.type] || 'var(--teal)', fontWeight: 600 }}>● {node.type}</span>
      </div>
      <div style={{ fontSize: 13, marginBottom: 4 }}>Plant: <span style={{ color: 'var(--text-primary)' }}>Vindhya Steelworks</span></div>
      <div style={{ fontSize: 13, marginBottom: 12 }}>Connected Nodes: <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{connections} multi-hop links</span></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={`/copilot?q=Explain node ${node.name} and its cross-document relationships`} style={{ flex: 1, background: 'var(--teal)', color: '#000', borderRadius: 6, padding: '7px 0', cursor: 'pointer', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'block' }}>Ask Copilot</a>
        <a href={`/timeline/${node.name}`} style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 6, padding: '7px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'block' }}>Timeline</a>
      </div>
    </motion.div>
  )
}

// ── Canvas-based force graph (no external library) ────────────────────────────

function ForceGraph({ nodes: initNodes, links: initLinks, filterType }: { nodes: GraphNode[]; links: GraphLink[]; filterType: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<GraphNode[]>(initNodes)
  const linksRef = useRef<GraphLink[]>(initLinks)
  const animRef = useRef<number>(0)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [search, setSearch] = useState('')

  const activeNodes = filterType === 'ALL'
    ? initNodes
    : initNodes.filter(n => n.type.toUpperCase() === filterType)

  useEffect(() => {
    nodesRef.current = activeNodes
  }, [filterType, initNodes])

  // Handle dynamic canvas sizing to fit container bounds perfectly centered
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resize = () => {
      const w = container.clientWidth || 1000
      const h = container.clientHeight || 700
      canvas.width = w
      canvas.height = h

      // Re-center node coordinates relative to new screen dimensions
      const cx = w / 2
      const cy = h / 2
      nodesRef.current = activeNodes.map(n => ({
        ...n,
        x: cx + (Math.random() - 0.5) * Math.min(w * 0.5, 450),
        y: cy + (Math.random() - 0.5) * Math.min(h * 0.5, 350),
        vx: 0,
        vy: 0,
      }))
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [activeNodes])

  const centerGraph = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    nodesRef.current = nodesRef.current.map(n => ({
      ...n,
      x: cx + (Math.random() - 0.5) * 200,
      y: cy + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
    }))
  }

  // Force simulation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let stopped = false

    const tick = () => {
      if (stopped) return
      const ns = nodesRef.current
      const ls = linksRef.current
      const w = canvas.width || 1000
      const h = canvas.height || 700
      const cx = w / 2
      const cy = h / 2
      const nodeMap = new Map(ns.map(n => [n.id, n]))

      // Forces
      for (let i = 0; i < ns.length; i++) {
        const a = ns[i]
        // Repulsion
        for (let j = i + 1; j < ns.length; j++) {
          const b = ns[j]
          const dx = (b.x || 0) - (a.x || 0); const dy = (b.y || 0) - (a.y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 900 / (dist * dist)
          const fx = (dx / dist) * force; const fy = (dy / dist) * force
          a.vx = ((a.vx || 0) - fx); a.vy = ((a.vy || 0) - fy)
          b.vx = ((b.vx || 0) + fx); b.vy = ((b.vy || 0) + fy)
        }
        // Strong center gravity force towards viewport center (cx, cy)
        a.vx = ((a.vx || 0) + (cx - (a.x || 0)) * 0.004)
        a.vy = ((a.vy || 0) + (cy - (a.y || 0)) * 0.004)
      }

      // Link springs
      for (const l of ls) {
        const src = nodeMap.get(typeof l.source === 'string' ? l.source : l.source.id)
        const tgt = nodeMap.get(typeof l.target === 'string' ? l.target : l.target.id)
        if (!src || !tgt) continue
        const dx = (tgt.x || 0) - (src.x || 0); const dy = (tgt.y || 0) - (src.y || 0)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const target = 95
        const force = (dist - target) * 0.035
        const fx = (dx / dist) * force; const fy = (dy / dist) * force
        src.vx = ((src.vx || 0) + fx); src.vy = ((src.vy || 0) + fy)
        tgt.vx = ((tgt.vx || 0) - fx); tgt.vy = ((tgt.vy || 0) - fy)
      }

      // Integrate
      for (const n of ns) {
        n.vx = ((n.vx || 0) * 0.72)
        n.vy = ((n.vy || 0) * 0.72)
        n.x = Math.max(30, Math.min(w - 30, (n.x || 0) + (n.vx || 0)))
        n.y = Math.max(30, Math.min(h - 30, (n.y || 0) + (n.vy || 0)))
      }

      const isDark = document.body.classList.contains('dark-mode')
      // Draw
      ctx.fillStyle = isDark ? '#0A0A0A' : '#F5F2EA'
      ctx.fillRect(0, 0, w, h)

      // Links
      for (const l of ls) {
        const src = nodeMap.get(typeof l.source === 'string' ? l.source : l.source.id)
        const tgt = nodeMap.get(typeof l.target === 'string' ? l.target : l.target.id)
        if (!src || !tgt) continue
        ctx.beginPath()
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(61, 99, 70, 0.25)'
        ctx.lineWidth = 1.2
        ctx.moveTo(src.x || 0, src.y || 0)
        ctx.lineTo(tgt.x || 0, tgt.y || 0)
        ctx.stroke()
      }

      // Nodes
      for (const n of ns) {
        const color = NODE_COLORS[n.type] || (isDark ? '#00D4A4' : '#3D6346')
        const size = NODE_SIZES[n.type] || 8
        const isSelected = selectedNode?.id === n.id
        const x = n.x || 0; const y = n.y || 0

        // Glow
        ctx.shadowBlur = isSelected ? 20 : 8
        ctx.shadowColor = color

        ctx.beginPath()
        ctx.fillStyle = color
        ctx.arc(x, y, isSelected ? size + 4 : size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Label
        ctx.fillStyle = isDark ? '#FFFFFF' : '#1A241E'
        ctx.font = '500 11px Plus Jakarta Sans, sans-serif'
        ctx.textAlign = 'center'
        const label = n.name.length > 18 ? n.name.slice(0, 16) + '…' : n.name
        ctx.fillText(label, x, y + size + 14)
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => { stopped = true; cancelAnimationFrame(animRef.current) }
  }, [selectedNode])

  // Click detection
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top
    let hit: GraphNode | null = null
    for (const n of nodesRef.current) {
      const dx = (n.x || 0) - mx; const dy = (n.y || 0) - my
      if (Math.sqrt(dx * dx + dy * dy) < (NODE_SIZES[n.type] || 8) + 6) { hit = n; break }
    }
    setSelectedNode(hit)
  }

  // Search zoom
  useEffect(() => {
    if (!search) return
    const match = nodesRef.current.find(n => n.name.toLowerCase().includes(search.toLowerCase()))
    if (match) setSelectedNode(match)
  }, [search])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvasRef} onClick={handleClick} style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }} />

      {/* Top Controls: Search + Center View */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 10 }}>
        <input
          className="input-dark"
          style={{ width: 220 }}
          placeholder="Search node (e.g. GB-14)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={centerGraph}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            borderRadius: 6,
            padding: '0 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          🎯 Center View
        </button>
      </div>

      {/* Legend */}
      <div className="card" style={{ position: 'absolute', bottom: 16, left: 16, padding: '10px 14px' }}>
        {(Object.entries(NODE_COLORS) as [NodeType, string][]).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={{ color: 'var(--text-muted)' }}>{type}</span>
          </div>
        ))}
      </div>

      {/* Node panel */}
      {selectedNode && (
        <NodeInfoPanel
          node={selectedNode}
          links={linksRef.current}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}

// ── Demo fallback graph data ───────────────────────────────────────────────────

const DEMO_GRAPH = {
  nodes: [
    { id: '1', name: 'GB-14', type: 'Equipment' as NodeType },
    { id: '2', name: 'incident_2019_03_GB14', type: 'Incident' as NodeType },
    { id: '3', name: 'WO-4471-2024', type: 'Document' as NodeType },
    { id: '4', name: 'WO-4892-2026', type: 'Document' as NodeType },
    { id: '5', name: 'Rajesh Kumar', type: 'Person' as NodeType },
    { id: '6', name: 'OISD-105', type: 'Regulation' as NodeType },
    { id: '7', name: 'PM-07', type: 'Equipment' as NodeType },
    { id: '8', name: 'WO-4901-2026', type: 'Document' as NodeType },
    { id: '9', name: 'Suresh Nair', type: 'Person' as NodeType },
    { id: '10', name: 'Priya Mehta', type: 'Person' as NodeType },
    { id: '11', name: 'HX-11', type: 'Equipment' as NodeType },
    { id: '12', name: 'WO-4476-2024', type: 'Document' as NodeType },
    { id: '13', name: 'rca_2026_007', type: 'Document' as NodeType },
    { id: '14', name: 'Factory Act §41', type: 'Regulation' as NodeType },
    { id: '15', name: 'SHL-2026', type: 'Document' as NodeType },
    { id: '16', name: 'inspection_2025', type: 'Document' as NodeType },
    { id: '17', name: 'Amit Sharma', type: 'Person' as NodeType },
  ],
  links: [
    { source: '3', target: '1', label: 'MENTIONS' },
    { source: '4', target: '1', label: 'MENTIONS' },
    { source: '2', target: '1', label: 'MENTIONS' },
    { source: '13', target: '1', label: 'MENTIONS' },
    { source: '1', target: '2', label: 'INVOLVED_IN' },
    { source: '3', target: '5', label: 'MENTIONS' },
    { source: '4', target: '5', label: 'MENTIONS' },
    { source: '3', target: '6', label: 'REFERENCES' },
    { source: '4', target: '6', label: 'REFERENCES' },
    { source: '8', target: '7', label: 'MENTIONS' },
    { source: '12', target: '11', label: 'MENTIONS' },
    { source: '8', target: '9', label: 'MENTIONS' },
    { source: '15', target: '10', label: 'MENTIONS' },
    { source: '16', target: '17', label: 'MENTIONS' },
    { source: '16', target: '6', label: 'REFERENCES' },
    { source: '15', target: '1', label: 'MENTIONS' },
    { source: '2', target: '14', label: 'REFERENCES' },
  ],
}

const FILTER_TYPES = ['ALL', 'EQUIPMENT', 'INCIDENT', 'REGULATION', 'DOCUMENT', 'PERSON']

export default function GraphExplorer() {
  const [graphData, setGraphData] = useState(DEMO_GRAPH)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ALL')

  useEffect(() => {
    setLoading(true)
    getGraphExplorer()
      .then(data => {
        if (data.nodes.length > 0) {
          setGraphData({
            nodes: data.nodes.map(n => ({ ...n, type: n.type as NodeType })),
            links: data.links.map(l => ({ source: l.source, target: l.target, label: l.label })),
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-label">FORCE-DIRECTED KNOWLEDGE GRAPH</div>
          <h1 style={{ fontSize: 28, fontWeight: 500, fontFamily: "'Newsreader', Georgia, serif", color: 'var(--text-primary)' }}>Entity Graph Explorer</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {FILTER_TYPES.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                background: activeFilter === f ? 'var(--teal)' : 'var(--surface-2)',
                color: activeFilter === f ? '#FFFFFF' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Loading graph…
          </div>
        ) : (
          <ForceGraph nodes={graphData.nodes} links={graphData.links} filterType={activeFilter} />
        )}
      </div>
    </div>
  )
}
