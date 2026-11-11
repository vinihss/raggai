import React, { useEffect, useRef, useState } from 'react'

declare global { interface Window { vis: any } }

export const GraphPage: React.FC<{ activeDomain: string }> = ({ activeDomain }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<any>(null)
  const [graph, setGraph] = useState<any>({ nodes: [], edges: [] })
  const [audit, setAudit] = useState<any>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await fetch(`/api/graph?domain=${encodeURIComponent(activeDomain)}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'error')
      setGraph(j)
    } catch (e: any) { setError(e.message) }
  }

  const runAudit = async () => {
    setError('')
    try {
      const res = await fetch(`/api/graph/audit?domain=${encodeURIComponent(activeDomain)}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'error')
      setAudit(j); load()
    } catch (e: any) { setError(e.message) }
  }

  const exportHtml = async () => {
    const res = await fetch(`/api/graph/export?domain=${encodeURIComponent(activeDomain)}`, { method: 'POST' })
    const j = await res.json()
    if (j.success) alert('Map exported: ' + j.path)
  }

  useEffect(() => { setAudit(null); load() }, [activeDomain])

  useEffect(() => {
    if (!containerRef.current) return
    const render = () => {
      if (!window.vis) return
      const nodes = new window.vis.DataSet((graph.nodes||[]).map((n: any) => ({ id: n.id, label: n.id, shape: 'dot', size: 16 })))
      const edges = new window.vis.DataSet((graph.edges||[]).map((e: any) => ({ from: e.from, to: e.to, label: e.relation || '', arrows: 'to', font: { align: 'top', size: 10 } })))
      if (networkRef.current) { networkRef.current.destroy(); networkRef.current = null; }
      networkRef.current = new window.vis.Network(containerRef.current, { nodes, edges }, { physics: { stabilization: true }, edges: { smooth: true } })
    }
    if (window.vis) { render(); return }
    if (document.querySelector('script[data-vis-network]')) { setTimeout(render, 300); return }
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js'
    s.setAttribute('data-vis-network', '1')
    s.onload = render
    document.body.appendChild(s)
  }, [graph])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Knowledge Graph • {activeDomain}</h2>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1 bg-gray-200 rounded text-sm">Refresh</button>
          <button onClick={runAudit} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Audit</button>
          <button onClick={exportHtml} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Export HTML</button>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="bg-white p-2 rounded border">
        <div className="text-sm text-gray-600 mb-2">Nodes: {graph.nodes?.length || 0} • Edges: {graph.edges?.length || 0}</div>
        <div ref={containerRef} style={{ height: 420, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }} />
      </div>
      {audit && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border"><h3 className="font-semibold mb-2">Report</h3><pre className="text-xs whitespace-pre-wrap">{audit.relatorio}</pre></div>
          <div className="bg-white p-4 rounded border"><h3 className="font-semibold mb-2">Tree</h3><pre className="text-xs whitespace-pre-wrap overflow-auto max-h-80">{audit.arvoreVisual}</pre></div>
        </div>
      )}
      {(!graph.nodes || graph.nodes.length===0) && <p className="text-gray-500 text-sm">Empty graph in this domain.</p>}
    </section>
  )
}
