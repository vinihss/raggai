import React, { useEffect, useState } from 'react'

const KNOWN_TYPES = ['note', 'code', 'general', 'system']

export const RecordsPage: React.FC<{ activeDomain: string }> = ({ activeDomain }) => {
  const [data, setData] = useState<any>({ records: [], total: 0, limit: 50, offset: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(50)
  const [typeDraft, setTypeDraft] = useState('')
  const [qDraft, setQDraft] = useState('')
  const [appliedType, setAppliedType] = useState('')
  const [appliedQ, setAppliedQ] = useState('')

  const load = async (off = 0, lim = limit, type = appliedType, q = appliedQ) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ domain: activeDomain, limit: String(lim), offset: String(off) })
      if (type) params.set('type', type)
      if (q) params.set('q', q)
      const res = await fetch(`/api/records?${params}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'error')
      setData(j)
      setOffset(j.offset ?? off)
      setLimit(j.limit ?? lim)
      setAppliedType(j.filter?.type ?? type)
      setAppliedQ(j.filter?.q ?? q)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    setOffset(0); setTypeDraft(''); setQDraft(''); setAppliedType(''); setAppliedQ('')
    load(0, limit, '', '')
  }, [activeDomain])

  const applyFilters = () => { setOffset(0); load(0, limit, typeDraft, qDraft) }
  const clearFilters = () => { setTypeDraft(''); setQDraft(''); setOffset(0); load(0, limit, '', '') }
  const hasFilters = !!appliedType || !!appliedQ

  const rowCount = data.records?.length || 0
  const total = typeof data.total === 'number' ? data.total : null
  const canPrev = offset > 0
  const canNext = rowCount === limit && (total == null || offset + rowCount < total)
  const page = Math.floor(offset / limit) + 1
  const totalPages = total != null && total > 0 ? Math.ceil(total / limit) : null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Records (Vector Store) • {activeDomain}</h2>
        <div className="flex items-center gap-2 text-sm">
          <label>Per page:
            <select className="ml-1 border rounded px-2 py-1" value={limit} onChange={e=>{ const l=parseInt(e.target.value); setLimit(l); setOffset(0); load(0,l,appliedType,appliedQ); }}>
              {[25,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button onClick={() => load(offset, limit, appliedType, appliedQ)} className="px-3 py-1 bg-gray-200 rounded">Refresh</button>
        </div>
      </div>

      <div className="bg-white p-3 rounded border flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500 text-xs uppercase tracking-wide">Filters</span>
        <select className="border rounded px-2 py-1" value={typeDraft} onChange={e=>setTypeDraft(e.target.value)} aria-label="Record type">
          <option value="">All types</option>
          {KNOWN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          value={qDraft}
          onChange={e=>setQDraft(e.target.value)}
          onKeyDown={e=>{ if (e.key === 'Enter') applyFilters() }}
          placeholder="Text contains..."
          className="border rounded px-2 py-1 flex-1 min-w-[180px]"
          aria-label="Text filter"
        />
        <button onClick={applyFilters} className="px-3 py-1 bg-blue-600 text-white rounded">Apply</button>
        {hasFilters && <button onClick={clearFilters} className="px-3 py-1 border rounded text-gray-600">Clear</button>}
        {hasFilters && (
          <span className="text-xs text-gray-500">
            Active: {appliedType ? `type=${appliedType}` : ''}{appliedType && appliedQ ? ' ' : ''}{appliedQ ? `q="${appliedQ}"` : ''}
          </span>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="bg-white p-4 rounded border overflow-auto">
        <div className="text-sm text-gray-600 mb-2 flex items-center justify-between flex-wrap gap-2">
          <span>Total: {total ?? '—'} • Showing: {rowCount} • Page {page}{totalPages ? ` of ${totalPages}` : ''} {data.error ? `• Error: ${data.error}` : ''}</span>
          <div className="flex gap-2 items-center">
            <button disabled={!canPrev} onClick={()=>load(Math.max(0, offset-limit), limit, appliedType, appliedQ)} className="px-2 py-1 border rounded disabled:opacity-40">Previous</button>
            <button disabled={!canNext} onClick={()=>load(offset+limit, limit, appliedType, appliedQ)} className="px-2 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left border-b"><th className="p-2">#</th><th className="p-2">Type</th><th className="p-2">Path</th><th className="p-2">Text</th></tr></thead>
          <tbody>
            {(data.records||[]).map((r: any) => (
              <tr key={`${r.idx}-${r.path}`} className="border-b align-top">
                <td className="p-2 text-gray-500">{r.idx}</td>
                <td className="p-2"><span className="px-2 py-0.5 bg-gray-100 rounded">{r.type}</span></td>
                <td className="p-2 text-xs break-all">{r.path}</td>
                <td className="p-2 whitespace-pre-wrap">{(r.text||'').slice(0,300)}{(r.text||'').length>300?'…':''}</td>
              </tr>
            ))}
            {(!data.records || data.records.length===0) && <tr><td colSpan={4} className="p-4 text-gray-500">No records found{hasFilters ? ' for the active filters.' : ' in this domain.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
