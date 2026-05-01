import { useState, useMemo } from 'react'
import { Banknote, CreditCard, X, Check, Tag, Percent } from 'lucide-react'

// ---------- helpers ----------
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function computeDiscount(subtotal, type, rawValue) {
  const val = parseFloat(rawValue) || 0
  if (val <= 0) return 0
  if (type === 'percent') return parseFloat(((subtotal * clamp(val, 0, 100)) / 100).toFixed(2))
  return parseFloat(Math.min(val, subtotal).toFixed(2))
}

// ---------- component ----------
function CheckoutModal({ order, table, onConfirm, onCancel }) {
  const [method, setMethod] = useState(null) // 'cash' | 'card'
  const [cashReceived, setCashReceived] = useState('')
  const [discountType, setDiscountType] = useState('percent') // 'percent' | 'flat'
  const [discountValue, setDiscountValue] = useState('')
  const [loading, setLoading] = useState(false)

  const subtotal = order?.total_amount || 0

  const discountAmount = useMemo(
    () => computeDiscount(subtotal, discountType, discountValue),
    [subtotal, discountType, discountValue]
  )

  const finalAmount = parseFloat((subtotal - discountAmount).toFixed(2))
  const cashAmount = parseFloat(cashReceived) || 0
  const change = method === 'cash' && cashAmount > 0 ? cashAmount - finalAmount : null
  const canConfirm =
    method !== null && (method === 'card' || (cashAmount >= finalAmount && cashAmount > 0))

  const handleConfirm = async () => {
    if (!canConfirm) return
    setLoading(true)
    await onConfirm({
      paymentMethod: method,
      cashReceived: method === 'cash' ? cashAmount : null,
      changeGiven: method === 'cash' ? Math.max(0, change) : null,
      discountType: discountAmount > 0 ? discountType : null,
      discountValue: discountAmount > 0 ? (parseFloat(discountValue) || 0) : null
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-cream-100 rounded-2xl shadow-2xl w-[460px] max-w-[95vw] p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-ink-300 font-bold text-xl">Checkout</h2>
            <p className="text-ink-200 text-sm">
              {table?.name} &middot; Order #{order?.id}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-ink-200 hover:text-ink-300 transition-colors p-1 rounded-lg hover:bg-cream-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Amount breakdown */}
        <div className="bg-ink-300 rounded-xl p-4 mb-5">
          <div className="flex justify-between text-cream-300 text-sm mb-1">
            <span>Subtotal</span>
            <span className="tabular-nums">₺{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-amber-400 text-sm mb-1">
              <span>
                Discount
                {discountType === 'percent' && discountValue
                  ? ` (${discountValue}%)`
                  : discountValue
                  ? ` (−$${discountValue})`
                  : ''}
              </span>
              <span className="tabular-nums">−₺{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="h-px bg-cream-100/10 my-2" />
          <div className="flex justify-between items-baseline">
            <span className="text-cream-300 text-xs uppercase tracking-widest font-semibold">
              Amount Due
            </span>
            <span className="text-cream-50 text-3xl font-black tabular-nums">
              ₺{finalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Discount section */}
        <div className="mb-5">
          <p className="text-ink-200 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Tag size={12} />
            Discount (optional)
          </p>
          <div className="flex gap-2 items-stretch">
            {/* Type toggle */}
            <div className="flex rounded-xl overflow-hidden border-2 border-cream-300 shrink-0">
              <button
                onClick={() => setDiscountType('percent')}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-bold transition-colors ${
                  discountType === 'percent'
                    ? 'bg-forest-600 text-cream-50'
                    : 'bg-white text-ink-200 hover:bg-cream-50'
                }`}
              >
                <Percent size={13} />%
              </button>
              <button
                onClick={() => setDiscountType('flat')}
                className={`flex items-center px-3 py-2 text-sm font-bold border-l-2 border-cream-300 transition-colors ${
                  discountType === 'flat'
                    ? 'bg-forest-600 text-cream-50'
                    : 'bg-white text-ink-200 hover:bg-cream-50'
                }`}
              >
                $
              </button>
            </div>

            {/* Discount value input */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-200 font-bold text-sm">
                {discountType === 'percent' ? '%' : '₺'}
              </span>
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : subtotal}
                step={discountType === 'percent' ? 1 : 0.01}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percent' ? '0' : '0.00'}
                className="w-full pl-8 pr-4 py-2.5 bg-white border-2 border-cream-300 rounded-xl text-ink-300 font-bold text-base focus:outline-none focus:border-forest-500 transition-colors"
              />
            </div>

            {/* Quick-pick % buttons */}
            {discountType === 'percent' && (
              <div className="flex gap-1 shrink-0">
                {[5, 10, 15, 20].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDiscountValue(discountValue === String(v) ? '' : String(v))}
                    className={`px-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${
                      discountValue === String(v)
                        ? 'bg-forest-600 border-forest-600 text-cream-50'
                        : 'bg-white border-cream-300 text-ink-200 hover:border-forest-500 hover:text-forest-600'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment method */}
        <p className="text-ink-200 text-xs font-bold uppercase tracking-widest mb-3">
          Payment Method
        </p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setMethod('cash')}
            className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 font-bold text-base transition-all ${
              method === 'cash'
                ? 'border-forest-600 bg-forest-600/10 text-forest-700'
                : 'border-cream-300 bg-white text-ink-300 hover:border-forest-500 hover:bg-cream-50'
            }`}
          >
            <Banknote size={30} />
            Cash
          </button>
          <button
            onClick={() => {
              setMethod('card')
              setCashReceived('')
            }}
            className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 font-bold text-base transition-all ${
              method === 'card'
                ? 'border-forest-600 bg-forest-600/10 text-forest-700'
                : 'border-cream-300 bg-white text-ink-300 hover:border-forest-500 hover:bg-cream-50'
            }`}
          >
            <CreditCard size={30} />
            Card
          </button>
        </div>

        {/* Cash received + change */}
        {method === 'cash' && (
          <div className="mb-5">
            <label className="text-ink-200 text-xs font-bold uppercase tracking-widest block mb-2">
              Cash Received
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-200 font-bold text-base">
                ₺
              </span>
              <input
                type="number"
                min={finalAmount}
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={finalAmount.toFixed(2)}
                className="w-full pl-8 pr-4 py-3 bg-white border-2 border-cream-300 rounded-xl text-ink-300 font-bold text-xl focus:outline-none focus:border-forest-500 transition-colors"
              />
            </div>
            {change !== null && change >= 0 && (
              <div className="mt-3 flex justify-between items-center bg-forest-600/10 border border-forest-200 rounded-xl px-4 py-3">
                <span className="text-forest-700 font-semibold">Change to return</span>
                <span className="text-forest-700 font-black text-xl tabular-nums">
                  ₺{change.toFixed(2)}
                </span>
              </div>
            )}
            {change !== null && change < 0 && (
              <p className="mt-2 text-red-500 text-sm font-semibold text-center">
                Cash received is less than the amount due
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-cream-300 text-ink-300 font-bold hover:bg-cream-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-600 hover:bg-forest-500 disabled:opacity-40 disabled:cursor-not-allowed text-cream-50 font-bold transition-colors"
          >
            <Check size={18} />
            {loading ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutModal
