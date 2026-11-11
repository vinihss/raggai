import React, { useState } from 'react'

export const SearchPage: React.FC<{ activeDomain: string; domains: string[] }> = ({ activeDomain, domains }) => {
  const [query, setQuery] = useState('')
  const [keywords, setKeywords] = useState('')
  const [useOverlay, setUseOverlay] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const runSearch = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, keywords: keywords.split(',').map(s=>s.trim()).filter(Boolean), limit: 8, domains: useOverlay ? domains : [activeDomain] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'error')
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Search (Vector + Graph)</h2>
      <div className="bg-white p-4 rounded border space-y-3">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Semantic query..." className="w-full p-2 border rounded" />
        <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="Graph keywords (comma-separated)" className="w-full p-2 border rounded" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useOverlay} onChange={e=>setUseOverlay(e.target.checked)} /> Search overlay (all domains)</label>
        <button onClick={runSearch} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{loading ? 'Searching...' : 'Search'}</button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
      {result && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold mb-2">Vector results ({result.vector?.length || 0})</h3>
            <ul className="space-y-2 text-sm">
              {(result.vector||[]).map((v: any, i: number) => (
                <li key={i} className="border rounded p-2">
                  <div className="text-xs text-gray-500">{v.relevance} • {v.domain || ''} • {v.type || ''} • {v.path || ''}</div>
                  <div className="whitespace-pre-wrap mt-1">{(v.text||'').slice(0, 500)}{(v.text||'').length>500?'…':''}</div>
                </li>
              ))}
              {(!result.vector || result.vector.length===0) && <li className="text-gray-500">No results.</li>}
            </ul>
          </div>
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold mb-2">Graph connections ({result.graph?.length || 0})</h3>
            <ul className="space-y-1 text-sm">
              {(result.graph||[]).map((g: string, i: number) => <li key={i} className="border rounded p-2">{g}</li>)}
              {(!result.graph || result.graph.length===0) && <li className="text-gray-500">No connections.</li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
