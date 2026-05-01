import { useEffect, useState } from 'react'
import { Plus, UtensilsCrossed, ShoppingBag, Clock, MessageCircle, Truck } from 'lucide-react'

const CHANNEL_META = {
  takeaway: {
    label: 'Takeaway Orders',
    icon: ShoppingBag,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    buttonBg: 'bg-amber-600 hover:bg-amber-500'
  },
  whatsapp: {
    label: 'WhatsApp Orders',
    icon: MessageCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    buttonBg: 'bg-green-600 hover:bg-green-500'
  },
  delivery: {
    label: 'Delivery App Orders',
    icon: Truck,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
    buttonBg: 'bg-sky-600 hover:bg-sky-500'
  }
}

function ChannelOrderPanel({ channel, onSelectOrder, onNewOrder }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const meta = CHANNEL_META[channel]
  const Icon = meta.icon

  const load = async () => {
    setLoading(true)
    const data = await window.api.orders.getByChannel(channel)
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [channel])

  const activeItems = (order) => {
    const items = Array.isArray(order.items)
      ? order.items
      : typeof order.items === 'string'
      ? JSON.parse(order.items)
      : []
    return items.filter((i) => !i.cancelled)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className={`flex items-center justify-between px-6 py-4 ${meta.bg} border-b ${meta.border}`}>
        <div className="flex items-center gap-2">
          <Icon size={20} className={meta.color} />
          <h2 className={`font-bold text-base ${meta.color}`}>{meta.label}</h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${meta.badge}`}>
            {orders.length} open
          </span>
        </div>
        <button
          onClick={onNewOrder}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-cream-50 font-bold text-sm transition-colors ${meta.buttonBg}`}
        >
          <Plus size={16} />
          New Order
        </button>
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto p-6 bg-cream-100">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-ink-200 text-sm">
            Loading…
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-ink-200">
            <Icon size={40} className="mb-3 opacity-30" />
            <p className="font-semibold text-base">No open orders</p>
            <p className="text-sm mt-1">Tap &ldquo;New Order&rdquo; to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {orders.map((order) => {
              const items = activeItems(order)
              const total = order.total_amount || 0
              return (
                <button
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className={`flex flex-col text-left bg-white rounded-2xl border-2 p-4 hover:shadow-md hover:scale-[1.02] active:scale-100 transition-all ${meta.border}`}
                >
                  {/* Order ID + type badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-ink-300 font-black text-base">#{order.id}</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${meta.badge}`}>
                      {order.order_type === 'takeaway' ? (
                        <><ShoppingBag size={10} /> Takeaway</>
                      ) : (
                        <><UtensilsCrossed size={10} /> Dine In</>
                      )}
                    </span>
                  </div>

                  {/* Customer ref */}
                  {order.customer_ref && (
                    <p className="text-ink-200 text-xs font-medium mb-2 truncate">
                      {order.customer_ref}
                    </p>
                  )}

                  {/* Items preview */}
                  <div className="flex-1 text-ink-200 text-xs space-y-0.5 mb-3">
                    {items.length === 0 ? (
                      <span className="italic opacity-50">No items yet</span>
                    ) : (
                      items.slice(0, 3).map((item, i) => (
                        <p key={i} className="truncate">
                          {item.qty}× {item.name}
                        </p>
                      ))
                    )}
                    {items.length > 3 && (
                      <p className="opacity-50">+{items.length - 3} more</p>
                    )}
                  </div>

                  {/* Total + time */}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-ink-300 font-black tabular-nums">
                      ₺{total.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1 text-ink-200 text-xs">
                      <Clock size={10} />
                      {new Date(order.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChannelOrderPanel
