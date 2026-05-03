import { useState, useMemo } from 'react'
import { Banknote, CreditCard, X, Check, Minus, Plus, Tag, Percent } from 'lucide-react'

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
function SplitPayModal({ order, table, onConfirm, onCancel }) {
  const allItems = order?.items || []
  // Only show non-cancelled, not-yet-split-paid items as selectable
  const unpaidItems = allItems.filter((i) => !i.cancelled && !i.split_paid)
  const alreadyPaidItems = allItems.filter((i) => i.split_paid)

  // qty map: how many of each item's qty to pay now (0 = skip, up to item.qty)
  const [payQty, setPayQty] = useState(() => {
    const q = {}
    unpaidItems.forEach((i) => { q[i.id] = 0 })
    return q
  })
  const [method, setMethod] = useState(null) // 'cash' | 'card'
  const [cashReceived, setCashReceived] = useState('')
  const [discountType, setDiscountType] = useState('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [loading, setLoading] = useState(false)

  const adjustQty = (id, maxQty, delta) => {
    setPayQty((q) => ({ ...q, [id]: clamp((q[id] || 0) + delta, 0, maxQty) }))
  }

  const selectedSubtotal = unpaidItems.reduce((s, i) => s + i.price * (payQty[i.id] || 0), 0)

  // Remaining = items where payQty < item.qty
  const remainingTotal = parseFloat(
    unpaidItems.reduce((s, i) => s + i.price * (i.qty - (payQty[i.id] || 0)), 0).toFixed(2)
  )

  const discountAmount = useMemo(
    () => computeDiscount(selectedSubtotal, discountType, discountValue),
    [selectedSubtotal, discountType, discountValue]
  )

  const finalAmount = parseFloat((selectedSubtotal - discountAmount).toFixed(2))
  const cashAmount = parseFloat(cashReceived) || 0
  const change = method === 'cash' && cashAmount > 0 ? cashAmount - finalAmount : null

  const anySelected = unpaidItems.some((i) => (payQty[i.id] || 0) > 0)
  const canConfirm =
    anySelected &&
    method !== null &&
    (method === 'card' || (cashAmount >= finalAmount && cashAmount > 0))

  const allMaxed = unpaidItems.length > 0 && unpaidItems.every((i) => (payQty[i.id] || 0) >= i.qty)
  const toggleAll = () => {
    const q = {}
    if (allMaxed) {
      unpaidItems.forEach((i) => { q[i.id] = 0 })
    } else {
      unpaidItems.forEach((i) => { q[i.id] = i.qty })
    }
    setPayQty(q)
  }

  const handleConfirm = async () => {
    if (!canConfirm) return
    setLoading(true)
    const selectedItems = unpaidItems
      .filter((i) => (payQty[i.id] || 0) > 0)
      .map((i) => ({ id: i.id, qty: payQty[i.id] }))
    await onConfirm({
      selectedItems,
      paymentMethod: method,
      cashReceived: method === 'cash' ? cashAmount : null,
      changeGiven: method === 'cash' ? Math.max(0, change) : null,
      discountType: discountAmount > 0 ? discountType : null,
      discountValue: discountAmount > 0 ? (parseFloat(discountValue) || 0) : null,
      splitAmount: finalAmount
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-cream-100 rounded-2xl shadow-2xl w-[500px] max-w-[95vw] max-h-[90vh] flex flex-col p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-ink-300 font-bold text-xl">Split Payment</h2>
            <p className="text-ink-200 text-sm">
              {table?.name ?? `Order #${order?.id}`} &middot; Select items to pay now
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-ink-200 hover:text-ink-300 transition-colors p-1 rounded-lg hover:bg-cream-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* Item checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-ink-200 text-xs font-bold uppercase tracking-widest">
                Unpaid Items
              </p>
              <button
                onClick={toggleAll}
                className="text-xs text-forest-600 font-semibold hover:underline"
              >
                {allMaxed ? 'Clear All' : 'Select All'}
              </button>
            </div>

            {unpaidItems.length === 0 ? (
              <p className="text-center text-sm text-ink-200/60 py-4">All items already paid.</p>
            ) : (
              <div className="space-y-1.5">
                {unpaidItems.map((item) => {
                  const q = payQty[item.id] || 0
                  const active = q > 0
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
                        active ? 'border-forest-600 bg-forest-600/10' : 'border-cream-300 bg-white'
                      }`}
                    >
                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          active ? 'text-forest-700' : 'text-ink-300'
                        }`}>{item.name}</p>
                        <p className="text-xs text-ink-200">₺{item.price.toFixed(2)} each · {item.qty} available</p>
                      </div>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => adjustQty(item.id, item.qty, -1)}
                          disabled={q === 0}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border-2 border-cream-300 bg-white text-ink-300 hover:border-red-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className={`w-6 text-center font-black text-base tabular-nums ${
                          active ? 'text-forest-700' : 'text-ink-200'
                        }`}>{q}</span>
                        <button
                          onClick={() => adjustQty(item.id, item.qty, +1)}
                          disabled={q >= item.qty}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border-2 border-cream-300 bg-white text-ink-300 hover:border-forest-500 hover:text-forest-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Line total */}
                      <span className={`w-16 text-right font-bold text-sm tabular-nums shrink-0 ${
                        active ? 'text-forest-700' : 'text-ink-200/50'
                      }`}>
                        {active ? `₺${(q * item.price).toFixed(2)}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Already-paid items — shown for reference */}
            {alreadyPaidItems.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-ink-200/60 mb-1.5 uppercase tracking-widest">
                  Already Paid
                </p>
                {alreadyPaidItems.map((item, idx) => (
                  <div
                    key={`paid-${idx}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-cream-200/70 mb-1 opacity-60"
                  >
                    <Check size={14} className="text-forest-600 shrink-0" />
                    <span className="flex-1 text-sm text-ink-200 line-through">{item.name}</span>
                    <span className="text-xs text-ink-200 tabular-nums">
                      ₺{(item.qty * item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-ink-300 rounded-xl p-4">
            <div className="flex justify-between text-cream-300 text-sm mb-1">
              <span>Selected subtotal</span>
              <span className="tabular-nums">₺{selectedSubtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-amber-400 text-sm mb-1">
                <span>Discount</span>
                <span className="tabular-nums">−₺{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="h-px bg-cream-100/10 my-2" />
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-cream-300 text-xs uppercase tracking-widest font-semibold">
                Amount Due Now
              </span>
              <span className="text-cream-50 text-3xl font-black tabular-nums">
                ₺{finalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-cream-300/60 text-xs border-t border-cream-100/10 pt-2 mt-1">
              <span>Remaining after this payment</span>
              <span className="tabular-nums font-semibold">
                ₺{remainingTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Discount */}
          <div>
            <p className="text-ink-200 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Tag size={12} />
              Discount (optional)
            </p>
            <div className="flex gap-2 items-stretch">
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
                  ₺
                </button>
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-200 font-bold text-sm">
                  {discountType === 'percent' ? '%' : '₺'}
                </span>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : selectedSubtotal}
                  step={discountType === 'percent' ? 1 : 0.01}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 bg-white border-2 border-cream-300 rounded-xl text-ink-300 font-bold text-base focus:outline-none focus:border-forest-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-ink-200 text-xs font-bold uppercase tracking-widest mb-3">
              Payment Method
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod('cash')}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-bold text-base transition-all ${
                  method === 'cash'
                    ? 'border-forest-600 bg-forest-600/10 text-forest-700'
                    : 'border-cream-300 bg-white text-ink-300 hover:border-forest-500 hover:bg-cream-50'
                }`}
              >
                <Banknote size={26} />
                Cash
              </button>
              <button
                onClick={() => { setMethod('card'); setCashReceived('') }}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-bold text-base transition-all ${
                  method === 'card'
                    ? 'border-forest-600 bg-forest-600/10 text-forest-700'
                    : 'border-cream-300 bg-white text-ink-300 hover:border-forest-500 hover:bg-cream-50'
                }`}
              >
                <CreditCard size={26} />
                Card
              </button>
            </div>
          </div>

          {/* Cash received + change */}
          {method === 'cash' && (
            <div>
              <label className="text-ink-200 text-xs font-bold uppercase tracking-widest block mb-2">
                Cash Received
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-200 font-bold text-base">₺</span>
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
                  <span className="text-forest-700 font-black text-xl tabular-nums">₺{change.toFixed(2)}</span>
                </div>
              )}
              {change !== null && change < 0 && (
                <p className="mt-2 text-red-500 text-sm font-semibold text-center">
                  Cash received is less than the amount due
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-cream-300 shrink-0">
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
            {loading ? 'Processing…' : `Pay ₺${finalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SplitPayModal
