import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Notice, type NoticeKind } from '../components/Notice'

declare global { interface Window { vis: any } }

type Provenance = { sourcePath: string; sourceHash?: string; method: string; confidence: number; evidence?: string; extractedAt?: string }
type GraphEdge = { id: string; from: string; to: string; relation?: string; domain?: string; confidence?: number; occurrences?: number; updatedAt?: string; provenance?: Provenance[] }
type GraphNode = { id: string }
type Selection = { type: 'node' | 'edge'; id: string }

const basename = (p?: string) => (p ? String(p).split('/').filter(Boolean).pop() || p : '—')
const pct = (v?: number) => (typeof v === 'number' ? `${Math.round(v * 100)}%` : '—')
const shortDate = (v?: string) => (v ? String(v).replace('T', ' ').replace('Z', ' UTC').slice(0, 19) : '—')
const truncate = (s: string, n = 220) => (s.length > n ? s.slice(0, n) + '…' : s)

export const GraphPage: React.FC<{ activeDomain: string }> = ({ activeDomain }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<any>(null)
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [audit, setAudit] = useState<any>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ kind: NoticeKind; text: string } | null>(null)
  const [loading, setLoading] = useState<'refresh' | 'audit' | 'export' | null>(null)
  const [selected, setSelected] = useState<Selection | null>(null)
  const selectedRef = useRef<Selection | null>(null)
  selectedRef.current = selected

  // Lookup maps derived from the graph — small (371 nodes / 430 edges), computed once per load.
  const edgesById = useMemo(() => new Map((graph.edges || []).map((e) => [e.id, e])), [graph])
  const nodeIds = useMemo(() => new Set((graph.nodes || []).map((n) => n.id)), [graph])
  const incidence = useMemo(() => {
    const map = new Map<string, Array<{ edge: GraphEdge; direction: 'out' | 'in' }>>()
    const push = (node: string, item: { edge: GraphEdge; direction: 'out' | 'in' }) => {
      const list = map.get(node) || []
      list.push(item)
      map.set(node, list)
    }
    for (const e of graph.edges || []) {
      push(e.from, { edge: e, direction: 'out' })
      push(e.to, { edge: e, direction: 'in' })
    }
    return map
  }, [graph])

  const load = async () => {
    setError('')
    setLoading('refresh')
    try {
      const res = await fetch(`/api/graph?domain=${encodeURIComponent(activeDomain)}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'error')
      setGraph(j)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(null) }
  }

  const runAudit = async () => {
    setError(''); setNotice(null); setLoading('audit')
    try {
      const res = await fetch(`/api/graph/audit?domain=${encodeURIComponent(activeDomain)}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Audit failed')
      setAudit(j); load()
      setNotice({ kind: 'success', text: 'Audit complete. Report and tree updated below.' })
    } catch (e: any) { setError(e.message) }
    finally { setLoading(null) }
  }

  const exportHtml = async () => {
    setError(''); setNotice(null); setLoading('export')
    try {
      const res = await fetch(`/api/graph/export?domain=${encodeURIComponent(activeDomain)}`, { method: 'POST' })
      const j = await res.json()
      if (!res.ok || j.success === false) throw new Error(j.error || `Export failed (${res.status})`)
      setNotice({ kind: 'success', text: `Map exported: ${j.path}` })
    } catch (e: any) {
      setNotice({ kind: 'error', text: `Export failed: ${e?.message || e}` })
    } finally {
      setLoading(null)
    }
  }

  // Derived selection state (plain consts, not hooks)
  const selectedEdge = selected?.type === 'edge' ? edgesById.get(selected.id) || null : null
  const selectedNodeId = selected?.type === 'node' ? selected.id : null
  const nodeIncidents = selectedNodeId
    ? (incidence.get(selectedNodeId) || []).slice().sort((a, b) =>
        String(a.edge.relation || '').localeCompare(String(b.edge.relation || '')) ||
        String(a.direction === 'out' ? a.edge.to : a.edge.from).localeCompare(String(b.direction === 'out' ? b.edge.to : b.edge.from)),
      )
    : []
  const nodeOut = nodeIncidents.filter((i) => i.direction === 'out').length
  const nodeIn = nodeIncidents.length - nodeOut
  const nodeNeighbors = new Set(nodeIncidents.map((i) => (i.direction === 'out' ? i.edge.to : i.edge.from))).size
  const nodePredicates = [...new Set(nodeIncidents.map((i) => i.edge.relation || 'rel'))]
  const edgeMethods = selectedEdge
    ? Object.entries(
        (selectedEdge.provenance || []).reduce<Record<string, number>>((acc, p) => {
          acc[p.method] = (acc[p.method] || 0) + 1
          return acc
        }, {}),
      ).sort((a, b) => b[1] - a[1])
    : []
  const methodColor = (m: string) =>
    (({ import: 'bg-sky-100 text-sky-800', symbol: 'bg-emerald-100 text-emerald-800', inherit: 'bg-violet-100 text-violet-800',
        link: 'bg-amber-100 text-amber-800', rule: 'bg-gray-200 text-gray-700', frontmatter: 'bg-teal-100 text-teal-800',
        heading: 'bg-lime-100 text-lime-800', table: 'bg-cyan-100 text-cyan-800' } as Record<string, string>)[m] || 'bg-gray-100 text-gray-700')

  useEffect(() => { setAudit(null); setNotice(null); setSelected(null); load() }, [activeDomain])

  // Drop a selection that no longer exists after a Refresh/Audit re-load.
  useEffect(() => {
    if (!selected) return
    const exists = selected.type === 'node' ? nodeIds.has(selected.id) : edgesById.has(selected.id)
    if (!exists) setSelected(null)
  }, [nodeIds, edgesById, selected])

  useEffect(() => {
    if (!containerRef.current) return
    // Don't create (or leak) a network for an empty domain — vis with zero nodes renders nothing anyway.
    if (!graph?.nodes?.length) {
      if (networkRef.current) { networkRef.current.destroy(); networkRef.current = null; }
      return
    }
    const render = () => {
      if (!window.vis || !containerRef.current) return
      const nodes = new window.vis.DataSet((graph.nodes||[]).map((n: any) => ({ id: n.id, title: n.id, shape: 'dot', size: 13 })))
      // Edge ids must round-trip: vis click events report DataSet ids, so keep the backend key.
      const edges = new window.vis.DataSet((graph.edges||[]).map((e: any) => ({ id: e.id, from: e.from, to: e.to, title: `${e.from} —${e.relation || ''}→ ${e.to}`, arrows: 'to', width: 2, selectionWidth: 3, hoverWidth: 3, color: { opacity: 0.55 } })))
      if (networkRef.current) { networkRef.current.destroy(); networkRef.current = null; }
      // Layout notes (measured on the 371-node/430-edge raggai graph):
      // - physics OFF + improvedLayout collapses 286 node pairs into shared positions (84 unique) — hairball.
      // - barnesHut defaults fling nodes to ±1680px (0 visible pixels).
      // - Tuned barnesHut below keeps all 371 positions unique within ±770px (≈95k painted pixels after fit()).
      networkRef.current = new window.vis.Network(
        containerRef.current,
        { nodes, edges },
        {
          physics: {
            barnesHut: { gravitationalConstant: -1200, centralGravity: 1.5, springLength: 55, springConstant: 0.03, damping: 0.2, avoidOverlap: 0.5 },
            stabilization: { enabled: true, iterations: 400 },
          },
          layout: { improvedLayout: false, randomSeed: 42 },
          interaction: { hover: true, dragNodes: true, dragView: true, zoomView: true },
          nodes: { size: 13 },
          edges: { smooth: false },
        },
      )
      networkRef.current.once('stabilizationIterationsDone', () => { try { networkRef.current?.fit({ animation: false }); } catch {} })
      // Dev-only handle so e2e probes can canvasToDOM positions / verify paint without touching prod behavior.
      if (import.meta.env?.DEV) (window as any).__graphNet = networkRef.current
      // vis reverses these (edges win over nodes on overlap) — we want the relation first.
      networkRef.current.on('click', (params: any) => {
        // Nodes first: edges are drawn from under the node, so vis reports an edge too when a dot is clicked.
        if (params?.nodes?.length) setSelected({ type: 'node', id: params.nodes[0] })
        else if (params?.edges?.length) setSelected({ type: 'edge', id: params.edges[0] })
        else setSelected(null)
      })
      // Re-apply highlight for a selection that survived a re-render.
      const sel = selectedRef.current
      if (sel?.type === 'edge' && edgesById.get(sel.id)) networkRef.current.selectEdges([sel.id])
      else if (sel?.type === 'node' && nodeIds.has(sel.id)) networkRef.current.selectNodes([sel.id])
    }
    if (window.vis) { render(); return }
    if (document.querySelector('script[data-vis-network]')) { setTimeout(render, 300); return }
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js'
    s.setAttribute('data-vis-network', '1')
    s.onload = render
    document.body.appendChild(s)
  }, [graph, edgesById, nodeIds])

  // Keep vis highlight in sync with the React selection (works for clicks and panel navigation).
  useEffect(() => {
    const net = networkRef.current
    if (!net) return
    if (!selected) { net.unselectAll?.(); return }
    net.unselectAll?.()
    if (selected.type === 'edge') {
      net.selectEdges([selected.id])
    } else {
      net.selectNodes([selected.id])
      if (nodeIds.has(selected.id)) net.focus(selected.id, { scale: typeof net.getScale === 'function' ? net.getScale() : 1, animation: { duration: 300 } })
    }
  }, [selected, nodeIds])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Knowledge Graph • {activeDomain}</h2>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading !== null} className="px-3 py-1 bg-gray-200 rounded text-sm disabled:opacity-50">{loading === 'refresh' ? 'Refreshing...' : 'Refresh'}</button>
          <button onClick={runAudit} disabled={loading !== null} className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50">{loading === 'audit' ? 'Auditing...' : 'Audit'}</button>
          <button onClick={exportHtml} disabled={loading !== null} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">{loading === 'export' ? 'Exporting...' : 'Export HTML'}</button>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {notice && <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} />}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="bg-white p-2 rounded border">
          <div className="text-sm text-gray-600 mb-2 flex items-center justify-between gap-2">
            <span>Nodes: {graph.nodes?.length || 0} • Edges: {graph.edges?.length || 0}</span>
            <span className="text-xs text-gray-400">Click a relation (edge) or node to inspect</span>
          </div>
          <div ref={containerRef} style={{ height: 440, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }} />
        </div>

        <aside className="bg-white p-4 rounded border text-sm max-h-[486px] overflow-auto">
          {selectedEdge ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-500">Relation (edge)</h3>
                  <div className="mt-1 flex items-center flex-wrap gap-1 font-mono text-xs leading-5">
                    <button onClick={() => setSelected({ type: 'node', id: selectedEdge.from })} title={`Select node: ${selectedEdge.from}`} className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 break-all text-left">{selectedEdge.from}</button>
                    <span className="text-blue-700 font-bold whitespace-nowrap">—{selectedEdge.relation || 'rel'}→</span>
                    <button onClick={() => setSelected({ type: 'node', id: selectedEdge.to })} title={`Select node: ${selectedEdge.to}`} className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 break-all text-left">{selectedEdge.to}</button>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close details" title="Close" className="text-gray-400 hover:text-gray-800 text-xl leading-none">×</button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">Confidence</div>
                  <div className="font-semibold text-sm">{pct(selectedEdge.confidence)}</div>
                  <div className="h-1.5 bg-gray-200 rounded mt-1"><div className="h-1.5 bg-blue-500 rounded" style={{ width: `${Math.round((selectedEdge.confidence ?? 0) * 100)}%` }} /></div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">Occurrences</div>
                  <div className="font-semibold text-sm">{selectedEdge.occurrences ?? '—'}</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">Domain</div>
                  <div className="font-semibold">{selectedEdge.domain || activeDomain}</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">Updated</div>
                  <div className="font-semibold">{shortDate(selectedEdge.updatedAt)}</div>
                </div>
              </div>

              {edgeMethods.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-gray-500 mr-1">Methods:</span>
                  {edgeMethods.map(([m, n]) => <span key={m} className={`px-1.5 py-0.5 rounded font-semibold ${methodColor(m)}`}>{m} ×{n}</span>)}
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Provenance ({selectedEdge.provenance?.length || 0})</div>
                <ul className="space-y-2">
                  {(selectedEdge.provenance || []).map((p, i) => (
                    <li key={i} className="border rounded p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${methodColor(p.method)}`}>{p.method}</span>
                        <span className="text-gray-500">conf {pct(p.confidence)}{p.extractedAt ? ` • ${shortDate(p.extractedAt)}` : ''}</span>
                      </div>
                      <button className="block text-blue-700 hover:underline break-all text-left" title={`${p.sourcePath} — click to copy full path`} onClick={() => { navigator.clipboard?.writeText(p.sourcePath)?.catch(() => undefined) }}>{basename(p.sourcePath)}</button>
                      <div className="text-[10px] text-gray-400 break-all">{p.sourcePath}</div>
                      {p.evidence && <pre className="bg-gray-50 rounded p-1.5 whitespace-pre-wrap break-words font-sans text-[11px] leading-snug" title={String(p.evidence)}>{truncate(String(p.evidence))}</pre>}
                    </li>
                  ))}
                  {(!selectedEdge.provenance || selectedEdge.provenance.length === 0) && <li className="text-gray-500 text-xs">No provenance recorded.</li>}
                </ul>
              </div>
            </div>
          ) : selectedNodeId ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-xs uppercase tracking-wide text-gray-500">Node</h3>
                  <div className="font-mono text-xs break-all mt-1" title={selectedNodeId}>{selectedNodeId}</div>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close details" title="Close" className="text-gray-400 hover:text-gray-800 text-xl leading-none">×</button>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded bg-gray-100">degree <b>{nodeIncidents.length}</b></span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800">out <b>{nodeOut}</b></span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800">in <b>{nodeIn}</b></span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{nodeNeighbors} neighbor{nodeNeighbors === 1 ? '' : 's'}</span>
              </div>

              {nodePredicates.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs">
                  {nodePredicates.map((p) => <span key={p} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-mono">{p}</span>)}
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Edges through this node ({nodeIncidents.length})</div>
                <ul className="space-y-1">
                  {nodeIncidents.map(({ edge, direction }, i) => {
                    const neighbor = direction === 'out' ? edge.to : edge.from
                    return (
                      <li key={`${edge.id}-${i}`} className="flex items-center gap-1.5 border rounded px-1.5 py-1 text-xs">
                        <span className={direction === 'out' ? 'text-blue-600' : 'text-amber-600'} title={direction === 'out' ? 'outgoing (this node is subject)' : 'incoming (this node is object)'}>{direction === 'out' ? '→' : '←'}</span>
                        <button onClick={() => setSelected({ type: 'edge', id: edge.id })} title="Select relation" className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 font-mono whitespace-nowrap">{edge.relation || 'rel'}</button>
                        <button onClick={() => setSelected({ type: 'node', id: neighbor })} title={`Select node: ${neighbor}`} className="font-mono hover:underline break-all text-left flex-1">{neighbor}</button>
                        <span className="text-gray-400 whitespace-nowrap" title="Edge confidence">{pct(edge.confidence)}</span>
                      </li>
                    )
                  })}
                  {nodeIncidents.length === 0 && <li className="text-gray-500 text-xs">Isolated node — no edges.</li>}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm h-full min-h-[200px] flex flex-col items-center justify-center text-center gap-3 px-4">
              <div className="text-3xl" aria-hidden>🕸️</div>
              <p><span className="font-semibold text-gray-700">Inspect the graph.</span></p>
              <p className="text-xs leading-relaxed">Click a <b>relation (edge)</b> to see subject → predicate → object, confidence, occurrences and the full provenance (source file, method, evidence).</p>
              <p className="text-xs leading-relaxed">Click a <b>node</b> to see its degree, in/out connections and every edge passing through it — neighbor and relation are clickable to navigate.</p>
              <p className="text-[11px] text-gray-400">Click empty canvas to clear the selection.</p>
            </div>
          )}
        </aside>
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
