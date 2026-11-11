import React, { useEffect, useState } from 'react'

export const RecordsPage: React.FC<{ activeDomain: string }> = ({ activeDomain }) => {
  const [data, setData] = useState<any>({ records: [], total: 0, limit: 50, offset: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(50)

  const load = async (off = offset, lim = limit) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/records?domain=${encodeURIComponent(activeDomain)}&limit=${lim}&offset=${off}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'error')
      setData(j)
      setOffset(j.offset ?? off)
      setLimit(j.limit ?? lim)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { setOffset(0); load(0, limit) }, [activeDomain])

  const canPrev = offset > 0
  const canNext = (data.records?.length || 0) === limit && (data.total == null || offset + limit < data.total || data.total === offset + data.records.length)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Records (Vector Store) • {activeDomain}</h2>
        <div className="flex items-center gap-2 text-sm">
          <label>Per page:
            <select className="ml-1 border rounded px-2 py-1" value={limit} onChange={e=>{ const l=parseInt(e.target.value); setLimit(l); setOffset(0); load(0,l); }}>
              {[25,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button onClick={() => load(offset, limit)} className="px-3 py-1 bg-gray-200 rounded">Refresh</button>
        </div>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="bg-white p-4 rounded border overflow-auto">
        <div className="text-sm text-gray-600 mb-2 flex items-center justify-between flex-wrap gap-2">
          <span>Total: {data.total ?? '—'} • Showing: {data.records?.length || 0} • Offset: {offset} {data.error ? `• Error: ${data.error}` : ''}</span>
          <div className="flex gap-2">
            <button disabled={!canPrev} onClick={()=>load(Math.max(0, offset-limit), limit)} className="px-2 py-1 border rounded disabled:opacity-40">Previous</button>
            <button disabled={!canNext} onClick={()=>load(offset+limit, limit)} className="px-2 py-1 border rounded disabled:opacity-40">Next</button>
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
            {(!data.records || data.records.length===0) && <tr><td colSpan={4} className="p-4 text-gray-500">No records found in this domain.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
