import React, { useState } from 'react'

interface SnapshotPanelProps {
  snapshots: any[]
  onRefresh: () => void
}

export const SnapshotPanel: React.FC<SnapshotPanelProps> = ({ snapshots, onRefresh }) => {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreateSnapshot = async () => {
    if (!description.trim()) return
    setLoading(true)
    try {
      await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      })
      setDescription('')
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (id: string) => {
    if (!confirm(`Restore snapshot ${id}?`)) return
    await fetch('/api/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId: id })
    })
    onRefresh()
  }

  return (
    <div className="bg-white p-4 rounded border border-gray-200 mb-6">
      <h3 className="font-semibold mb-4">Snapshot History</h3>
      <div className="mb-4 flex gap-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Snapshot description..."
          className="flex-1 p-2 border rounded"
        />
        <button onClick={handleCreateSnapshot} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Snapshot'}
        </button>
        <button onClick={onRefresh} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Refresh</button>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-gray-500">No snapshots found.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {snapshots.map((s) => (
            <li key={s.id} className="flex items-center justify-between border rounded p-2">
              <span>
                <strong>{s.id}</strong>: {s.description}
                <br />
                <span className="text-xs text-gray-500">{s.timestamp} • Layers: {(s.layersIncluded || []).join(', ')}</span>
              </span>
              <button onClick={() => handleRollback(s.id)} className="text-red-600 hover:underline text-xs">Rollback</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
