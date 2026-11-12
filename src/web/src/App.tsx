import React, { useState, useEffect } from 'react'
import './index.css'
import { SnapshotPanel } from './components/SnapshotPanel'
import { Dashboard } from './pages/Dashboard'
import { SearchPage } from './pages/SearchPage'
import { RecordsPage } from './pages/RecordsPage'
import { GraphPage } from './pages/GraphPage'

type Tab = 'dashboard' | 'search' | 'records' | 'graph' | 'snapshots'

function App() {
  const [domains, setDomains] = useState<string[]>(['global'])
  const [activeDomain, setActiveDomain] = useState<string>('global')
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [status, setStatus] = useState<any>({})
  const [tab, setTab] = useState<Tab>('dashboard')

  const fetchData = async (domain?: string) => {
    const d = domain || activeDomain
    try {
      const [s1, s2, s3] = await Promise.all([
        fetch(`/api/status?domain=${encodeURIComponent(d)}&all=1`),
        fetch('/api/snapshots'),
        fetch('/api/domains'),
      ])
      if (s1.ok) setStatus(await s1.json())
      if (s2.ok) setSnapshots(await s2.json())
      if (s3.ok) {
        const dr = await s3.json()
        const names = Object.keys(dr.domains || {})
        if (names.length) setDomains(names)
      }
    } catch (err) {
      console.error('Error loading API:', err)
    }
  }

  useEffect(() => { fetchData(activeDomain) }, [activeDomain])

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button onClick={() => setTab(id)} className={`px-3 py-2 rounded text-sm ${tab===id ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{label}</button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Raggaí Web UI</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Domain:</span>
            <select value={activeDomain} onChange={e => setActiveDomain(e.target.value)} className="border rounded px-2 py-1 text-sm">
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={() => fetchData(activeDomain)} className="text-xs px-2 py-1 rounded bg-gray-100">Refresh</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-3 flex gap-2 flex-wrap">
          <TabBtn id="dashboard" label="Dashboard" />
          <TabBtn id="search" label="Search" />
          <TabBtn id="records" label="Records" />
          <TabBtn id="graph" label="Graph" />
          <TabBtn id="snapshots" label="Snapshots" />
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-3 flex gap-2 flex-wrap items-center text-xs text-gray-600">
          <span className="uppercase text-[10px] tracking-wide font-semibold text-gray-500">Context</span>
          {(status?.overlay || []).map((d: string) => (
            <span key={d} className={`rounded-full border px-2 py-0.5 ${d === activeDomain ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' : 'bg-white border-gray-200'}`}>{d}</span>
          ))}
          <span className="text-gray-300">|</span>
          {status?.project
            ? <span className="rounded-full border border-amber-300 bg-amber-50 text-amber-800 px-2 py-0.5">project: {status.project.domain || status.project.dir?.split('/').filter(Boolean).pop() || 'unknown'}</span>
            : <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">context: global</span>}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {tab === 'dashboard' && <Dashboard activeDomain={activeDomain} status={status} />}
        {tab === 'search' && <SearchPage activeDomain={activeDomain} domains={domains} />}
        {tab === 'records' && <RecordsPage activeDomain={activeDomain} />}
        {tab === 'graph' && <GraphPage activeDomain={activeDomain} />}
        {tab === 'snapshots' && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Snapshots and Versioning</h2>
            <SnapshotPanel snapshots={snapshots} onRefresh={() => fetchData(activeDomain)} />
          </section>
        )}
      </main>
    </div>
  )
}

export default App
