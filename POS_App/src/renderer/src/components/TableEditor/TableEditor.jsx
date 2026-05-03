import { useCallback, useRef, useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, Upload, X, UtensilsCrossed } from 'lucide-react'
import useTableStore from '../../store/useTableStore'
import { STATUS_CONFIG } from '../../store/useTableStore'

// ── Shared helpers ─────────────────────────────────────────────────────────

const SEED_IMAGES = {
  Lahori:      'http://127.0.0.1:3000/tables/Lahore.png',
  Karachi:     'http://127.0.0.1:3000/tables/Karachi.png',
  Islamabadi:  'http://127.0.0.1:3000/tables/Islamabad.png',
  Peshawari:   'http://127.0.0.1:3000/tables/Peshawar.png',
  Multani:     'http://127.0.0.1:3000/tables/multan.png',
  Faisalabadi: 'http://127.0.0.1:3000/tables/Faislabad.png',
  Rawalpindi:  'http://127.0.0.1:3000/tables/Rawalpindi.png',
  Hyderabadi:  'http://127.0.0.1:3000/tables/Hyderabad.png',
  Quetta:      'http://127.0.0.1:3000/tables/Quetta.png',
  Gujrati:     'http://127.0.0.1:3000/tables/Gujrat.png',
}

function resolveImageSrc(table) {
  if (table.image_path) return `http://127.0.0.1:3000${table.image_path}`
  const key = Object.keys(SEED_IMAGES).find((k) => table.name.startsWith(k))
  return key ? SEED_IMAGES[key] : null
}

// ── Table Edit / Create Modal ──────────────────────────────────────────────

function TableModal({ table, onSave, onClose }) {
  const isNew = !table
  const [name, setName] = useState(table?.name ?? '')
  const [previewSrc, setPreviewSrc] = useState(isNew ? null : resolveImageSrc(table))
  const [pendingFile, setPendingFile] = useState(null) // { name, buffer }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buffer = await file.arrayBuffer()
    setPendingFile({ name: file.name, buffer })
    setPreviewSrc(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Table name is required'); return }
    setSaving(true)
    setError('')
    try {
      let imagePath = table?.image_path ?? null
      if (pendingFile) {
        imagePath = await window.api.tables.uploadImage(pendingFile.name, pendingFile.buffer)
      }
      await onSave({ name: name.trim(), image_path: imagePath })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save table')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-cream-100 rounded-2xl shadow-2xl w-[400px] max-w-[95vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-forest-700">
          <h2 className="text-cream-100 font-bold text-lg">{isNew ? 'Add New Table' : 'Edit Table'}</h2>
          <button onClick={onClose} className="text-forest-300 hover:text-cream-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Image preview + upload */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative w-48 h-36 rounded-xl overflow-hidden border-2 border-cream-300 bg-cream-200 cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              {previewSrc ? (
                <img src={previewSrc} alt="table" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UtensilsCrossed size={36} className="text-ink-100 opacity-30" />
                </div>
              )}
              {/* Upload overlay on hover */}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload size={24} className="text-white mb-1" />
                <span className="text-white text-xs font-semibold">Change image</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream-200 hover:bg-cream-300 text-ink-200 text-sm font-medium transition-colors"
            >
              <Upload size={14} />
              {previewSrc ? 'Replace image' : 'Upload image'}
            </button>
          </div>

          {/* Name input */}
          <div>
            <label className="text-xs font-semibold text-ink-200 uppercase tracking-wider block mb-1.5">
              Table Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Lahori Mehfil"
              className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-white text-ink-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              autoFocus
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-cream-200 hover:bg-cream-300 text-ink-200 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-forest-600 hover:bg-forest-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : isNew ? 'Add Table' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Table card in edit mode ────────────────────────────────────────────────

function EditableTableCard({ table, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.empty
  const imgSrc = resolveImageSrc(table)
  const canDelete = table.status === 'empty'

  return (
    <div className={`relative rounded-2xl border-2 overflow-hidden bg-white ${cfg.border}`}>
      {/* Image */}
      <div className="relative w-full" style={{ paddingBottom: '75%' }}>
        {imgSrc ? (
          <img src={imgSrc} alt={table.name} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${cfg.bg}`}>
            <UtensilsCrossed size={28} className={`${cfg.text} opacity-40`} />
          </div>
        )}
        {/* Action buttons overlay */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-3 opacity-0 hover:opacity-100">
          <button
            onClick={() => onEdit(table)}
            className="w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow"
            title="Edit"
          >
            <Pencil size={16} className="text-forest-700" />
          </button>
          <button
            onClick={() => canDelete ? setConfirmDelete(true) : null}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow ${
              canDelete ? 'bg-white/90 hover:bg-white' : 'bg-white/40 cursor-not-allowed'
            }`}
            title={canDelete ? 'Delete table' : 'Cannot delete — table is occupied'}
          >
            <Trash2 size={16} className={canDelete ? 'text-red-600' : 'text-red-300'} />
          </button>
        </div>
      </div>

      {/* Name + status */}
      <div className={`flex flex-col items-center gap-1 px-2 py-2 ${cfg.bg}`}>
        <span className="font-heading text-base leading-tight tracking-wide text-center text-ink-300 uppercase">
          {table.name}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold tracking-wide ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 p-4 z-10">
          <Trash2 size={24} className="text-red-500" />
          <p className="text-ink-300 text-xs font-semibold text-center">Delete "{table.name}"?</p>
          <p className="text-ink-100 text-xs text-center">This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-lg bg-cream-200 hover:bg-cream-300 text-ink-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => { setConfirmDelete(false); onDelete(table.id) }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main TableEditor view ─────────────────────────────────────────────────

function TableEditor({ onBack }) {
  const { tables, createTable, deleteTable, updateTable } = useTableStore()
  const [editingTable, setEditingTable] = useState(null)  // table object or null
  const [showNew, setShowNew] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleEdit = (table) => {
    setEditingTable(table)
  }

  const handleSaveEdit = useCallback(async ({ name, image_path }) => {
    await updateTable(editingTable.id, { name, image_path })
  }, [editingTable, updateTable])

  const handleCreate = useCallback(async ({ name, image_path }) => {
    await createTable(name, image_path)
  }, [createTable])

  const handleDelete = async (id) => {
    try {
      await deleteTable(id)
      setDeleteError('')
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete table')
      setTimeout(() => setDeleteError(''), 4000)
    }
  }

  return (
    <div className="flex flex-col h-full bg-cream-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-cream-300 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-cream-100 transition-colors"
            title="Back"
          >
            <ArrowLeft size={20} className="text-ink-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-ink-300">Table Manager</h1>
            <p className="text-sm text-ink-100">{tables.length} tables · hover a tile to edit or delete</p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Add Table</span>
        </button>
      </div>

      {/* Error banner */}
      {deleteError && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {deleteError}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <EditableTableCard
              key={table.id}
              table={table}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editingTable && (
        <TableModal
          table={editingTable}
          onSave={handleSaveEdit}
          onClose={() => setEditingTable(null)}
        />
      )}

      {/* New table modal */}
      {showNew && (
        <TableModal
          table={null}
          onSave={handleCreate}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}

export default TableEditor
