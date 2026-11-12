import React, { useState } from 'react'
import { Notice, type NoticeKind } from './Notice'

interface SnapshotPanelProps {
  snapshots: any[]
  onRefresh: () => void
}

export const SnapshotPanel: React.FC<SnapshotPanelProps> = ({ snapshots, onRefresh }) => {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ kind: NoticeKind; text: string } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const handleCreateSnapshot = async () => {
    if (!description.trim()) return
    setLoading(true); setNotice(null)
    try {
      const res = await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`)
      setDescription('')
      setNotice({ kind: 'success', text: `Snapshot created: ${j.versionId}` })
      onRefresh()
    } catch (e: any) {
      setNotice({ kind: 'error', text: `Create snapshot failed: ${e?.message || e}` })
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id)
      return
    }
    setNotice(null)
    try {
      const res = await fetch('/api/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: id })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.success === false) throw new Error(j.error || `Request failed (${res.status})`)
      setConfirmId(null)
      setNotice({ kind: 'success', text: `Rolled back to snapshot ${id}` })
      onRefresh()
    } catch (e: any) {
      setNotice({ kind: 'error', text: `Rollback failed: ${e?.message || e}` })
    }
  }

  return (
    <div className="bg-white p-4 rounded border border-gray-200 mb-6">
      <h3 className="font-semibold mb-4">Snapshot History</h3>
      <div className="mb-3 flex gap-2 flex-wrap">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Snapshot description..."
          className="flex-1 min-w-[220px] p-2 border rounded"
        />
        <button onClick={handleCreateSnapshot} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Snapshot'}
        </button>
        <button onClick={onRefresh} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Refresh</button>
      </div>
      {notice && <div className="mb-3"><Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /></div>}

      {snapshots.length === 0 ? (
        <p className="text-gray-500">No snapshots found.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {snapshots.map((s) => {
            const armed = confirmId === s.id
            return (
              <li key={s.id} className="flex items-center justify-between border rounded p-2 gap-2">
                <span>
                  <strong>{s.id}</strong>: {s.description}
                  <br />
                  <span className="text-xs text-gray-500">{s.timestamp} • Layers: {(s.layersIncluded || []).join(', ')}</span>
                </span>
                <button
                  onClick={() => handleRollback(s.id)}
                  className={`text-xs px-2 py-1 rounded whitespace-nowrap ${armed ? 'bg-red-600 text-white' : 'text-red-600 hover:underline'}`}
                >
                  {armed ? 'Confirm rollback?' : 'Rollback'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
