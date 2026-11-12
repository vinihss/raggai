import React from 'react'

export type NoticeKind = 'success' | 'error' | 'info'

interface NoticeProps {
  kind: NoticeKind
  text: string
  onClose?: () => void
}

const KIND_STYLES: Record<NoticeKind, string> = {
  success: 'bg-green-50 border-green-300 text-green-800',
  error: 'bg-red-50 border-red-300 text-red-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
}

/** Inline feedback banner used for action results (create/rollback/export/audit). */
export const Notice: React.FC<NoticeProps> = ({ kind, text, onClose }) => (
  <div className={`flex items-start justify-between gap-3 border rounded px-3 py-2 text-sm ${KIND_STYLES[kind]}`} role="status">
    <span className="whitespace-pre-wrap">{text}</span>
    {onClose && (
      <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100 leading-none mt-0.5" aria-label="Dismiss">
        ✕
      </button>
    )}
  </div>
)
