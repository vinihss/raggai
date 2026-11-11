import React from 'react'

interface Props { activeDomain: string; status?: any }

export const Dashboard: React.FC<Props> = ({ activeDomain, status }) => {
  const graphNodes = status?.graph?.nodes ?? 0
  const graphEdges = status?.graph?.edges ?? 0
  const totalVersions = status?.totalVersions ?? 0
  const domains = status?.domains || []
  const vectorCount = status?.vectorCount
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Dashboard • Domain: {activeDomain}</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded border"><div className="text-2xl font-bold">{vectorCount ?? (status?.vectorStoreExists ? 'OK' : '—')}</div><div className="text-sm text-gray-500">Vector records</div></div>
        <div className="bg-white p-4 rounded border"><div className="text-2xl font-bold">{graphNodes}</div><div className="text-sm text-gray-500">Graph nodes</div></div>
        <div className="bg-white p-4 rounded border"><div className="text-2xl font-bold">{graphEdges}</div><div className="text-sm text-gray-500">Graph edges</div></div>
        <div className="bg-white p-4 rounded border"><div className="text-2xl font-bold">{totalVersions}</div><div className="text-sm text-gray-500">Snapshots</div></div>
        <div className="bg-white p-4 rounded border"><div className="text-2xl font-bold">{status?.vectorStoreExists ? 'OK' : '—'}</div><div className="text-sm text-gray-500">Vector store</div></div>
      </div>
      <div className="bg-white p-4 rounded border text-sm text-gray-700 space-y-1">
        <p><b>Available domains:</b> {domains.join(', ') || '—'}</p>
        <p><b>Active overlay:</b> {(status?.overlay || []).join(', ') || '—'}</p>
        <p>Search, Records, and Graph use the selected domain; search can merge the overlay based on configuration.</p>
        {Array.isArray(status?.domainsStats) && status.domainsStats.length > 0 && (
          <div className="mt-2">
            <p className="font-semibold mb-1">Per-domain summary:</p>
            <ul className="text-xs space-y-1">
              {status.domainsStats.map((d:any) => (
                <li key={d.domain} className="flex gap-3 flex-wrap border rounded px-2 py-1">
                  <span className="font-medium">{d.domain}</span>
                  <span>vector: {d.vectorCount ?? (d.vectorStoreExists ? 'ok' : '—')}</span>
                  <span>nodes: {d.graph?.nodes ?? 0}</span>
                  <span>edges: {d.graph?.edges ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
