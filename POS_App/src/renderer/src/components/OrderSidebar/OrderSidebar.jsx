import { useState, useCallback, useEffect, useRef } from 'react'
import { ChefHat, Receipt, CreditCard, XCircle, AlertCircle } from 'lucide-react'
import useOrderStore from '../../store/useOrderStore'
import useTableStore, { STATUS_CONFIG } from '../../store/useTableStore'
import { formatModifier, groupModifiers } from '../../config/menuModifiers'

function OrderSidebar({ onPunch, onInterimBill, onCheckout, onSplitPay }) {
  const { currentOrder, specialInstructions, setSpecialInstructions, cancelItem } =
    useOrderStore()
  const { getSelectedTable } = useTableStore()
  const [actionLoading, setActionLoading] = useState(null)

  // Local draft for the textarea — synced to store with a 400ms debounce
  // so typing doesn't hammer Zustand state on every keystroke
  const [instructionsDraft, setInstructionsDraft] = useState(specialInstructions)
  const debounceRef = useRef(null)
  const handleInstructionsChange = useCallback((text) => {
    setInstructionsDraft(text)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSpecialInstructions(text), 400)
  }, [setSpecialInstructions])
  // Keep draft in sync when order changes (e.g. new order loaded)
  useEffect(() => {
    setInstructionsDraft(specialInstructions)
  }, [currentOrder?.id])

  // Only use table when this is actually a dine-in order with a table assigned
  const table = currentOrder?.table_id ? getSelectedTable() : null
  const cfg = table ? STATUS_CONFIG[table.status] || STATUS_CONFIG.empty : STATUS_CONFIG.empty
  const items = currentOrder?.items || []
  const activeItems = items.filter((i) => !i.cancelled && !i.split_paid)
  const total = currentOrder?.total_amount || 0

  // Workflow gates
  const kitchenSent = !!currentOrder?.kitchen_sent_at
  const billPrinted = !!currentOrder?.bill_printed_at

  // Header label for non-table orders
  const isTakeaway = currentOrder?.channel === 'takeaway'
  const isChannel = currentOrder?.channel === 'whatsapp' || currentOrder?.channel === 'delivery'
  let headerTitle = table ? table.name : 'Order'
  if (isTakeaway) headerTitle = currentOrder?.takeaway_token || `Order #${currentOrder?.id}`
  if (isChannel) headerTitle = currentOrder?.customer_ref || `Order #${currentOrder?.id}`

  const handleAction = async (action, setter) => {
    setActionLoading(action)
    try {
      await setter()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-ink-300 border-l border-ink-400">
      {/* Header */}
      <div className="px-4 py-4 border-b border-ink-100/20">
        <div className="flex items-center justify-between">
          <h2 className="text-cream-100 font-bold text-lg truncate">
            {headerTitle}
          </h2>
          {table && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ml-2 ${cfg.badge}`}>
              {cfg.label}
            </span>
          )}
          {isTakeaway && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ml-2 bg-amber-500 text-ink-300">
              Takeaway
            </span>
          )}
        </div>
        {currentOrder && (
          <p className="text-cream-300 text-xs mt-0.5">Order #{currentOrder.id}</p>
        )}
      </div>

      {/* Order items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-cream-100/30">
            <AlertCircle size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No items yet</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-opacity ${
                item.cancelled
                  ? 'bg-red-900/20 border border-red-800/30 opacity-60'
                  : item.split_paid
                  ? 'bg-forest-900/20 border border-forest-700/30 opacity-50'
                  : 'bg-ink-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.cancelled && (
                    <span className="text-red-400 text-xs font-black tracking-wider shrink-0">
                      [CANCELLED]
                    </span>
                  )}
                  {item.split_paid && (
                    <span className="text-forest-400 text-xs font-black tracking-wider shrink-0">
                      [PAID]
                    </span>
                  )}
                  <p
                    className={`text-sm font-medium truncate ${
                      item.cancelled || item.split_paid ? 'text-cream-100/40 line-through' : 'text-cream-100'
                    }`}
                  >
                    {item.name}
                  </p>
                </div>
                {!item.cancelled && item.deal_items && (
                  <ul className="mt-0.5 pl-1 space-y-0">
                    {item.deal_items.map((di, i) => (
                      <li key={i} className="text-[10px] text-cream-300/60 leading-tight">
                        ↳ {di.qty}× {di.name}
                      </li>
                    ))}
                  </ul>
                )}
                {!item.cancelled && item.modifiers && item.modifiers.length > 0 && (
                  <ul className="mt-0.5 pl-1 space-y-0">
                    {groupModifiers(item.modifiers).map(({ modifier, count }, i) => (
                      <li key={i} className="text-[10px] text-amber-600/80 font-medium leading-tight">
                        {count > 1 ? `${count}× ` : ''}{formatModifier(modifier)}
                      </li>
                    ))}
                  </ul>
                )}
                <p className={`text-xs ${item.cancelled || item.split_paid ? 'text-cream-300/30' : 'text-cream-300'}`}>
                  {item.qty} × ₺{item.price.toFixed(2)}
                </p>
              </div>
              {!item.cancelled && !item.split_paid && (
                <span className="text-forest-400 text-sm font-bold tabular-nums shrink-0">
                  ₺{(item.qty * item.price).toFixed(2)}
                </span>
              )}
              <button
                onClick={() => !item.cancelled && !item.split_paid && cancelItem(item.id)}
                disabled={item.cancelled || item.split_paid}
                title={item.cancelled ? 'Already cancelled' : item.split_paid ? 'Already paid' : 'Cancel item'}
                className={`ml-1 transition-colors ${
                  item.cancelled || item.split_paid
                    ? 'text-cream-100/10 cursor-not-allowed'
                    : 'text-cream-100/30 hover:text-red-400'
                }`}
              >
                <XCircle size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Special instructions */}
      <div className="px-4 py-3 border-t border-ink-100/20">
        <label className="text-cream-300 text-xs font-semibold uppercase tracking-wide block mb-1">
          Special Instructions
        </label>
        <textarea
          rows={2}
          value={instructionsDraft}
          onChange={(e) => handleInstructionsChange(e.target.value)}
          placeholder="Allergies, notes for kitchen..."
          className="w-full bg-ink-200 border border-ink-100/30 rounded-lg px-3 py-2 text-cream-100 text-sm placeholder-cream-300/30 resize-none focus:outline-none focus:border-forest-500"
        />
      </div>

      {/* Total */}
      <div className="px-4 py-3 border-t border-ink-100/20 flex items-center justify-between">
        <span className="text-cream-300 font-semibold">Total</span>
        <span className="text-cream-50 text-2xl font-black tabular-nums">
          ₺{total.toFixed(2)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        {/* Punch — Send to Kitchen (always available when items exist) */}
        <button
          onClick={() => handleAction('punch', onPunch)}
          disabled={activeItems.length === 0 || actionLoading !== null}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base bg-forest-600 hover:bg-forest-500 disabled:opacity-40 disabled:cursor-not-allowed text-cream-50 transition-colors"
        >
          <ChefHat size={20} />
          {actionLoading === 'punch' ? 'Sending…' : kitchenSent ? 'Re-send to Kitchen' : 'Punch — Send to Kitchen'}
        </button>

        <div className="flex gap-2">
          {/* Interim Bill — only after kitchen notified */}
          <button
            onClick={() => handleAction('bill', onInterimBill)}
            disabled={!kitchenSent || activeItems.length === 0 || actionLoading !== null}
            title={!kitchenSent ? 'Send to kitchen first' : ''}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-cream-50 transition-colors"
          >
            <Receipt size={16} />
            {actionLoading === 'bill' ? 'Printing…' : 'Interim Bill'}
          </button>

          {/* Checkout — only after interim bill printed */}
          <button
            onClick={() => handleAction('checkout', onCheckout)}
            disabled={!billPrinted || activeItems.length === 0 || actionLoading !== null}
            title={!billPrinted ? 'Print interim bill first' : ''}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm bg-forest-700 hover:bg-forest-600 disabled:opacity-40 disabled:cursor-not-allowed text-cream-50 transition-colors"
          >
            <CreditCard size={16} />
            {actionLoading === 'checkout' ? 'Closing…' : 'Checkout'}
          </button>
        </div>

        {/* Split Pay — available any time after kitchen sent, regardless of interim bill */}
        {kitchenSent && activeItems.length > 0 && (
          <button
            onClick={() => handleAction('splitpay', onSplitPay)}
            disabled={actionLoading !== null}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-cream-50 transition-colors"
          >
            <Receipt size={16} />
            {actionLoading === 'splitpay' ? 'Opening…' : 'Split Pay'}
          </button>
        )}

        {/* Workflow hint */}
        {activeItems.length > 0 && (!kitchenSent || !billPrinted) && (
          <p className="text-center text-[10px] text-cream-300/40 pt-1">
            {!kitchenSent ? '① Punch → ② Interim Bill → ③ Checkout' : '② Interim Bill → ③ Checkout'}
          </p>
        )}
      </div>
    </div>
  )
}

export default OrderSidebar
