import { useEffect, useState } from 'react'
import { UtensilsCrossed, Settings, BarChart3, Edit, Smartphone, LayoutGrid, TrendingUp } from 'lucide-react'
import DashboardTabs from './components/Dashboard/DashboardTabs'
import OrderView from './components/Layout/OrderView'
import DailySummary from './components/DailySummary/DailySummary'
import SalesHistory from './components/SalesHistory/SalesHistory'
import AttendanceAdmin from './components/AttendanceAdmin/AttendanceAdmin'
import MenuEditor from './components/MenuEditor/MenuEditor'
import TableEditor from './components/TableEditor/TableEditor'
import SuperuserPinModal from './components/MenuEditor/SuperuserPinModal'
import OrderTypeModal from './components/OrderTypeModal/OrderTypeModal'
import WaiterConnectModal from './components/WaiterConnect/WaiterConnectModal'
import useTableStore from './store/useTableStore'
import useMenuStore from './store/useMenuStore'
import useOrderStore from './store/useOrderStore'

function App() {
  // 'dashboard' | 'orderView' | 'dailySummary' | 'salesHistory' | 'attendanceAdmin' | 'menuEditor'
  const [view, setView] = useState('dashboard')
  const [historyDate, setHistoryDate] = useState(null)
  const [showPinModal, setShowPinModal] = useState(false)   // null | 'menu' | 'tables'
  const [pinTarget, setPinTarget] = useState(null)
  const [showWaiterConnect, setShowWaiterConnect] = useState(false)

  // When non-null, the OrderTypeModal is visible (WhatsApp / Delivery only).
  // Shape: { channel: 'whatsapp'|'delivery', context: string }
  const [pendingSetup, setPendingSetup] = useState(null)

  const { tables, loadTables, selectTable, updateTableRecord, registerMobileOrderListener } =
    useTableStore()
  const { loadMenu } = useMenuStore()
  const { loadOrder, initOrder, clearOrder } = useOrderStore()

  useEffect(() => {
    loadTables()
    loadMenu()
    registerMobileOrderListener()
  }, [])

  // ── Dine In table click ────────────────────────────────────────────────────
  const handleTableSelect = async (table) => {
    selectTable(table.id)

    if (table.status === 'empty') {
      // Create dine-in order directly — no modal needed
      const order = await window.api.orders.create(table.id, 'dine_in', 'dine_in', null)
      initOrder(order)
      updateTableRecord({ ...table, status: 'active', current_order_id: order.id })
      setView('orderView')
    } else {
      // Occupied table — load existing order and go straight to menu
      await loadOrder(table.id)
      setView('orderView')
    }
  }

  // ── WhatsApp / Delivery / Takeaway ─────────────────────────────────────────
  const handleChannelNewOrder = async (channel) => {
    selectTable(null) // clear any previously selected dine-in table
    if (channel === 'takeaway') {
      const order = await window.api.orders.create(null, 'takeaway', 'takeaway', null)
      initOrder(order)
      setView('orderView')
      return
    }
    const label = channel === 'whatsapp' ? 'WhatsApp Order' : 'Delivery Order'
    setPendingSetup({ table: null, channel, context: label })
  }

  const handleChannelOrderSelect = (order) => {
    selectTable(null) // clear any previously selected dine-in table
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
    initOrder({ ...order, items })
    setView('orderView')
  }

  // ── OrderTypeModal confirm (WhatsApp / Delivery only) ─────────────────────
  const handleOrderTypeConfirm = async ({ customerRef }) => {
    const { channel } = pendingSetup
    const order = await window.api.orders.create(null, channel, 'takeaway', customerRef)
    initOrder(order)
    setPendingSetup(null)
    setView('orderView')
  }

  const handleOrderTypeCancel = () => {
    setPendingSetup(null)
  }

  // ── Back from order view ───────────────────────────────────────────────────
  const handleBack = async () => {
    const { currentOrder } = useOrderStore.getState()

    const hasItems = currentOrder && currentOrder.items.filter((i) => !i.cancelled).length > 0

    if (currentOrder && !hasItems) {
      // Cancel the empty order (works for both table and non-table orders)
      await window.api.orders.cancel(currentOrder.id, currentOrder.table_id || null)
    }

    clearOrder()
    await loadTables()
    setView('dashboard')
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-cream-100 text-ink-300 overflow-hidden">
      {/* App header */}
      <header className="flex items-center justify-between px-6 py-3 bg-ink-300 border-b border-ink-400 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
            <UtensilsCrossed size={18} className="text-cream-50" />
          </div>
          <div>
            <h1 className="text-cream-100 font-bold text-base leading-none">FARRUKH</h1>
            <p className="text-cream-300 text-xs">
              Fast Automated Restaurant Reservations &amp; Unified Kitchen Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-cream-300 text-sm">{tables.length} Tables</span>
          <button
            onClick={() => setShowWaiterConnect(true)}
            title="Waiter App Connect"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-cream-300 hover:text-cream-50 hover:bg-ink-200 transition-colors text-sm font-medium"
          >
            <Smartphone size={16} />
            <span>Waiter</span>
          </button>
          <button
            onClick={() => { setPinTarget('tables'); setShowPinModal(true) }}
            title="Table Manager"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-cream-300 hover:text-cream-50 hover:bg-ink-200 transition-colors text-sm font-medium"
          >
            <LayoutGrid size={16} />
            <span>Tables</span>
          </button>
          <button
            onClick={() => { setPinTarget('menu'); setShowPinModal(true) }}
            title="Menu Editor"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-cream-300 hover:text-cream-50 hover:bg-ink-200 transition-colors text-sm font-medium"
          >
            <Edit size={16} />
            <span>Menu</span>
          </button>
          <button
            onClick={() => { setHistoryDate(null); setView('dailySummary') }}
            title="Daily Summary"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-cream-300 hover:text-cream-50 hover:bg-ink-200 transition-colors text-sm font-medium"
          >
            <BarChart3 size={16} />
            <span>Summary</span>
          </button>
          <button
            onClick={() => setView('salesHistory')}
            title="Sales History"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-cream-300 hover:text-cream-50 hover:bg-ink-200 transition-colors text-sm font-medium"
          >
            <TrendingUp size={16} />
            <span>History</span>
          </button>
          <button
            onClick={() => setView('attendanceAdmin')}
            className="text-cream-300 hover:text-cream-50 transition-colors"
            title="Attendance"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {view === 'dashboard' && (
          <DashboardTabs
            tables={tables}
            onTableSelect={handleTableSelect}
            onChannelOrderSelect={handleChannelOrderSelect}
            onChannelNewOrder={handleChannelNewOrder}
          />
        )}
        {view === 'orderView' && <OrderView onBack={handleBack} />}
        {view === 'dailySummary' && (
          <DailySummary
            onBack={() => { setHistoryDate(null); setView(historyDate ? 'salesHistory' : 'dashboard') }}
            initialDate={historyDate || undefined}
          />
        )}
        {view === 'salesHistory' && (
          <SalesHistory
            onBack={() => setView('dashboard')}
            onViewDay={(date) => { setHistoryDate(date); setView('dailySummary') }}
          />
        )}
        {view === 'attendanceAdmin' && <AttendanceAdmin onBack={() => setView('dashboard')} />}
        {view === 'menuEditor' && <MenuEditor onBack={() => setView('dashboard')} />}
        {view === 'tableEditor' && <TableEditor onBack={() => setView('dashboard')} />}
      </main>

      {/* PIN Modal for Menu Editor */}
      {showPinModal && (
        <SuperuserPinModal
          onSuccess={() => {
            setShowPinModal(false)
            setView(pinTarget === 'tables' ? 'tableEditor' : 'menuEditor')
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {/* Order-type selection modal */}
      {pendingSetup && (
        <OrderTypeModal
          channel={pendingSetup.channel}
          context={pendingSetup.context}
          onConfirm={handleOrderTypeConfirm}
          onCancel={handleOrderTypeCancel}
        />
      )}

      {/* Waiter App connect modal */}
      {showWaiterConnect && (
        <WaiterConnectModal onClose={() => setShowWaiterConnect(false)} />
      )}
    </div>
  )
}

export default App
