import { useState } from 'react'
import { UtensilsCrossed, ShoppingBag, MessageCircle, Truck } from 'lucide-react'
import TableMap from '../TableMap/TableMap'
import ChannelOrderPanel from './ChannelOrderPanel'

const TABS = [
  { id: 'dine_in',  label: 'Dine In',   icon: UtensilsCrossed },
  { id: 'takeaway', label: 'Takeaway',   icon: ShoppingBag },
  { id: 'whatsapp', label: 'WhatsApp',   icon: MessageCircle },
  { id: 'delivery', label: 'Delivery',   icon: Truck }
]

function DashboardTabs({ tables, onTableSelect, onChannelOrderSelect, onChannelNewOrder }) {
  const [activeTab, setActiveTab] = useState('dine_in')

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex bg-cream-200 border-b border-cream-300 px-4 pt-3 gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-bold text-sm transition-all
              ${activeTab === id
                ? 'bg-cream-100 text-forest-700 border-2 border-b-0 border-cream-300 -mb-px z-10'
                : 'text-ink-200 hover:text-ink-300 hover:bg-cream-100/60'
              }
            `}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'dine_in' && (
          <TableMap tables={tables} onTableSelect={onTableSelect} />
        )}
        {activeTab === 'takeaway' && (
          <ChannelOrderPanel
            channel="takeaway"
            onSelectOrder={(order) => onChannelOrderSelect(order, 'takeaway')}
            onNewOrder={() => onChannelNewOrder('takeaway')}
          />
        )}
        {activeTab === 'whatsapp' && (
          <ChannelOrderPanel
            channel="whatsapp"
            onSelectOrder={(order) => onChannelOrderSelect(order, 'whatsapp')}
            onNewOrder={() => onChannelNewOrder('whatsapp')}
          />
        )}
        {activeTab === 'delivery' && (
          <ChannelOrderPanel
            channel="delivery"
            onSelectOrder={(order) => onChannelOrderSelect(order, 'delivery')}
            onNewOrder={() => onChannelNewOrder('delivery')}
          />
        )}
      </div>
    </div>
  )
}

export default DashboardTabs
