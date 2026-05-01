import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'

/**
 * Shown only for WhatsApp / Delivery new orders to capture a customer reference.
 *
 * Props:
 *   channel     – 'whatsapp' | 'delivery'
 *   context     – human label shown in the header (e.g. "WhatsApp Order")
 *   onConfirm({ customerRef })
 *   onCancel()
 */
function OrderTypeModal({ channel, context, onConfirm, onCancel }) {
  const [customerRef, setCustomerRef] = useState('')

  const refLabel =
    channel === 'whatsapp' ? 'WhatsApp Number / Name' : 'Delivery App Order ID'
  const refPlaceholder =
    channel === 'whatsapp' ? 'e.g. +92 300 000 0000' : 'e.g. #FD-20489'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-cream-100 rounded-2xl shadow-2xl w-[420px] max-w-[95vw] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-ink-300 font-bold text-xl">New Order</h2>
            <p className="text-ink-200 text-sm">{context}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-ink-200 hover:text-ink-300 transition-colors p-1 rounded-lg hover:bg-cream-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Customer reference */}
        <div className="mb-5">
          <label className="text-ink-200 text-xs font-bold uppercase tracking-widest block mb-2">
            {refLabel}
          </label>
          <input
            type="text"
            value={customerRef}
            onChange={(e) => setCustomerRef(e.target.value)}
            placeholder={refPlaceholder}
            autoFocus
            className="w-full px-4 py-3 bg-white border-2 border-cream-300 rounded-xl text-ink-300 font-medium focus:outline-none focus:border-forest-500 transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-cream-300 text-ink-300 font-bold hover:bg-cream-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ customerRef: customerRef.trim() || null })}
            disabled={customerRef.trim().length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-600 hover:bg-forest-500 disabled:opacity-40 disabled:cursor-not-allowed text-cream-50 font-bold transition-colors"
          >
            Open Menu
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderTypeModal
