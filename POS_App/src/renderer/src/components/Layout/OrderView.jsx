import { useState } from 'react'
import { ArrowLeft, UtensilsCrossed, ShoppingBag, MessageCircle, Truck } from 'lucide-react'
import MenuGrid from '../MenuGrid/MenuGrid'
import OrderSidebar from '../OrderSidebar/OrderSidebar'
import CheckoutModal from '../CheckoutModal/CheckoutModal'
import useTableStore from '../../store/useTableStore'
import useOrderStore from '../../store/useOrderStore'

const CHANNEL_ICON = {
  dine_in: UtensilsCrossed,
  whatsapp: MessageCircle,
  delivery: Truck
}

const ORDER_TYPE_LABEL = {
  dine_in: 'Dine In',
  takeaway: 'Takeaway'
}

function OrderView({ onBack }) {
  const { getSelectedTable, updateTableStatus, updateTableRecord } = useTableStore()
  const { currentOrder, specialInstructions, clearOrder, markKitchenSent, markBillPrinted } = useOrderStore()
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)

  const table = getSelectedTable()

  // Build a human-readable context label for the top bar
  const orderChannel = currentOrder?.channel || 'dine_in'
  const orderType = currentOrder?.order_type || 'dine_in'
  const customerRef = currentOrder?.customer_ref || null
  const ChannelIcon = CHANNEL_ICON[orderChannel] || UtensilsCrossed

  let contextLabel = ''
  if (table) {
    contextLabel = `${table.name || `Table ${table.id}`}`
  } else if (orderChannel === 'whatsapp') {
    contextLabel = `WhatsApp${customerRef ? ` — ${customerRef}` : ''}`
  } else if (orderChannel === 'delivery') {
    contextLabel = `Delivery${customerRef ? ` — ${customerRef}` : ''}`
  }

  const handlePunch = async () => {
    if (!currentOrder) return
    await window.api.orders.updateItems(currentOrder.id, currentOrder.items, specialInstructions)
    await window.api.printer.printKitchen(currentOrder.id, table ? table.id : null)
    await markKitchenSent()
    if (table) {
      const updated = await window.api.tables.updateStatus(table.id, 'inprogress')
      updateTableRecord(updated)
    }
  }

  const handleInterimBill = async () => {
    if (!currentOrder) return
    await window.api.orders.updateItems(currentOrder.id, currentOrder.items, specialInstructions)
    await window.api.printer.printBill(currentOrder.id, table ? table.id : null)
    await markBillPrinted()
    if (table) {
      const updated = await window.api.tables.updateStatus(table.id, 'waiting')
      updateTableRecord(updated)
    }
  }

  const handleCheckout = () => {
    if (!currentOrder) return
    setShowCheckoutModal(true)
  }

  const handleCheckoutConfirm = async ({ paymentMethod, cashReceived, changeGiven, discountType, discountValue }) => {
    if (!currentOrder) return
    await window.api.orders.updateItems(currentOrder.id, currentOrder.items, specialInstructions)
    await window.api.orders.checkout(
      currentOrder.id,
      table ? table.id : null,
      paymentMethod,
      cashReceived,
      changeGiven,
      discountType,
      discountValue
    )
    if (table) {
      updateTableStatus(table.id, 'empty')
    }
    clearOrder()
    setShowCheckoutModal(false)
    onBack()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-ink-300 border-b border-ink-100/20 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-cream-300 hover:text-cream-50 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Dashboard</span>
        </button>
        <div className="h-5 w-px bg-cream-100/10" />
        <ChannelIcon size={16} className="text-cream-300" />
        <h1 className="text-cream-100 font-bold text-base">
          {contextLabel}
        </h1>
        {/* Order type badge */}
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-forest-600/30 text-forest-400">
          {ORDER_TYPE_LABEL[orderType] || orderType}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <MenuGrid />
        </div>
        <div className="w-80 shrink-0 overflow-hidden flex flex-col">
          <OrderSidebar
            onPunch={handlePunch}
            onInterimBill={handleInterimBill}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {showCheckoutModal && (
        <CheckoutModal
          order={currentOrder}
          table={table}
          onConfirm={handleCheckoutConfirm}
          onCancel={() => setShowCheckoutModal(false)}
        />
      )}
    </div>
  )
}

export default OrderView
