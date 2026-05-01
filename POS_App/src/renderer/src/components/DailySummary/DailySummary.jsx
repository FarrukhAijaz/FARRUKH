import { useState, useEffect } from 'react'
import { ArrowLeft, Banknote, CreditCard, BarChart3, ChevronLeft, ChevronRight, Tag, ShoppingBag, ListOrdered } from 'lucide-react'

// Mirror of the server-side helper so the component can compute today's business date
// without an extra IPC round trip.
function getTodayBusinessDate() {
  const now = new Date()
  const d = now.getHours() < 2 ? new Date(now.getTime() - 86400000) : now
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
}

function formatBusinessDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function SummaryCard({ label, value, sub, colorClass, icon }) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-widest opacity-70">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-black tabular-nums">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  )
}

function DailySummary({ onBack }) {
  const [report, setReport] = useState(null)
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState(getTodayBusinessDate())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('payments')

  // Load list of all dates that have payments
  useEffect(() => {
    window.api.payments.listDates().then((d) => {
      setDates(d)
    })
  }, [])

  // Load report whenever selected date changes
  useEffect(() => {
    setLoading(true)
    window.api.payments.getDailyReport(selectedDate).then((data) => {
      setReport(data)
      setLoading(false)
    })
  }, [selectedDate])

  const dateIndex = dates.indexOf(selectedDate)
  const canPrev = dateIndex !== -1 && dateIndex < dates.length - 1
  const canNext = dateIndex > 0

  return (
    <div className="flex flex-col h-full bg-cream-100">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 bg-ink-300 border-b border-ink-100/20 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-cream-300 hover:text-cream-50 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="h-5 w-px bg-cream-100/10" />
        <BarChart3 size={18} className="text-forest-400" />
        <h1 className="text-cream-100 font-bold text-base">Daily Summary</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Date navigator */}
        <div className="flex items-center justify-between bg-white rounded-xl px-5 py-3 border border-cream-200 shadow-sm">
          <button
            onClick={() => setSelectedDate(dates[dateIndex + 1])}
            disabled={!canPrev}
            className="p-2 rounded-lg text-ink-200 hover:text-ink-300 hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-ink-300 font-bold text-base">{formatBusinessDate(selectedDate)}</p>
            <p className="text-ink-200 text-xs mt-0.5">Business Day &middot; 10:00 AM – 2:00 AM</p>
          </div>
          <button
            onClick={() => setSelectedDate(dates[dateIndex - 1])}
            disabled={!canNext}
            className="p-2 rounded-lg text-ink-200 hover:text-ink-300 hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-ink-200 text-sm">
            Loading…
          </div>
        ) : report ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <SummaryCard
                label="Total Revenue"
                value={`₺${report.summary.total.toFixed(2)}`}
                sub={`${report.summary.count} orders`}
                colorClass="bg-forest-600/10 text-forest-700 border-forest-200"
              />
              <SummaryCard
                label="Cash"
                value={`₺${report.summary.cash.toFixed(2)}`}
                sub={`${report.summary.cash_count} payment${report.summary.cash_count !== 1 ? 's' : ''}`}
                colorClass="bg-amber-50 text-amber-700 border-amber-200"
                icon={<Banknote size={13} />}
              />
              <SummaryCard
                label="Card"
                value={`₺${report.summary.card.toFixed(2)}`}
                sub={`${report.summary.card_count} payment${report.summary.card_count !== 1 ? 's' : ''}`}
                colorClass="bg-sky-50 text-sky-700 border-sky-200"
                icon={<CreditCard size={13} />}
              />
              <SummaryCard
                label="Discounts Given"
                value={`₺${report.summary.discounts.toFixed(2)}`}
                sub={`${report.summary.discounted_count} order${report.summary.discounted_count !== 1 ? 's' : ''} discounted`}
                colorClass="bg-rose-50 text-rose-700 border-rose-200"
                icon={<Tag size={13} />}
              />
              <SummaryCard
                label="Items Sold"
                value={report.summary.items_sold}
                sub={report.summary.items_cancelled > 0 ? `${report.summary.items_cancelled} cancelled` : 'No cancellations'}
                colorClass="bg-violet-50 text-violet-700 border-violet-200"
                icon={<ShoppingBag size={13} />}
              />
            </div>
            {/* Gross vs net note */}
            {report.summary.discounts > 0 && (
              <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                <Tag size={14} className="shrink-0" />
                <span>
                  Gross sales <strong>₺{report.summary.subtotal.toFixed(2)}</strong> &minus; discounts{' '}
                  <strong>₺{report.summary.discounts.toFixed(2)}</strong> ={' '}
                  net revenue <strong>₺{report.summary.total.toFixed(2)}</strong>
                </span>
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex gap-1 bg-cream-200 rounded-xl p-1 w-fit">
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'payments'
                    ? 'bg-white text-ink-300 shadow-sm'
                    : 'text-ink-200 hover:text-ink-300'
                }`}
              >
                <CreditCard size={14} />
                Payments
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'items'
                    ? 'bg-white text-ink-300 shadow-sm'
                    : 'text-ink-200 hover:text-ink-300'
                }`}
              >
                <ListOrdered size={14} />
                Items Sold
              </button>
            </div>

            {/* ── Payments tab ── */}
            {activeTab === 'payments' && (
              <>
                {report.payments.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-ink-200 text-sm bg-white rounded-xl border border-cream-200">
                    No payments recorded for this business day.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-cream-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-cream-200 text-ink-200 text-xs font-bold uppercase tracking-wide">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Time</th>
                          <th className="px-4 py-3 text-left">Table</th>
                          <th className="px-4 py-3 text-left">Order</th>
                          <th className="px-4 py-3 text-center">Items</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                          <th className="px-4 py-3 text-right">Discount</th>
                          <th className="px-4 py-3 text-right">Paid</th>
                          <th className="px-4 py-3 text-center">Method</th>
                          <th className="px-4 py-3 text-right">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-200">
                        {report.payments.map((p, i) => (
                          <tr key={p.id} className="hover:bg-cream-50 transition-colors">
                            <td className="px-4 py-3 text-ink-200 tabular-nums">{i + 1}</td>
                            <td className="px-4 py-3 text-ink-300 tabular-nums">
                              {new Date(p.paid_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-3 text-ink-300 font-medium">{p.table_name}</td>
                            <td className="px-4 py-3 text-ink-200">#{p.order_id}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-violet-700 font-semibold tabular-nums">
                                <ShoppingBag size={11} />
                                {p.items_sold}
                              </span>
                              {p.items_cancelled > 0 && (
                                <span className="ml-1.5 text-rose-500 text-xs tabular-nums">−{p.items_cancelled}✕</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-ink-200 tabular-nums text-right">
                              ₺{(p.subtotal || p.amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(p.discount_amount || 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-semibold tabular-nums">
                                  <Tag size={11} />
                                  −₺{p.discount_amount.toFixed(2)}
                                  {p.discount_type === 'percent' && p.discount_value
                                    ? ` (${p.discount_value}%)`
                                    : ''}
                                </span>
                              ) : (
                                <span className="text-ink-200">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-ink-300 font-bold tabular-nums text-right">
                              ₺{p.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p.payment_method === 'cash' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                                  <Banknote size={11} />
                                  Cash
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold">
                                  <CreditCard size={11} />
                                  Card
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-ink-200 tabular-nums text-right">
                              {p.change_given != null ? `₺${Number(p.change_given).toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Items Sold tab ── */}
            {activeTab === 'items' && (
              <>
                {!report.item_breakdown || report.item_breakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-ink-200 text-sm bg-white rounded-xl border border-cream-200">
                    No items sold for this business day.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-cream-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-cream-200 text-ink-200 text-xs font-bold uppercase tracking-wide">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Item</th>
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-right">Unit Price</th>
                          <th className="px-4 py-3 text-center">Sold</th>
                          <th className="px-4 py-3 text-center">Cancelled</th>
                          <th className="px-4 py-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-200">
                        {report.item_breakdown.map((item, i) => (
                          <tr key={item.id ?? item.name} className="hover:bg-cream-50 transition-colors">
                            <td className="px-4 py-3 text-ink-200 tabular-nums">{i + 1}</td>
                            <td className="px-4 py-3 text-ink-300 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-ink-200">{item.category || '—'}</td>
                            <td className="px-4 py-3 text-ink-200 tabular-nums text-right">
                              ₺{item.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold tabular-nums">
                                <ShoppingBag size={11} />
                                {item.qty_sold}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.qty_cancelled > 0 ? (
                                <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold tabular-nums">
                                  {item.qty_cancelled}✕
                                </span>
                              ) : (
                                <span className="text-ink-200 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-ink-300 font-bold tabular-nums text-right">
                              ₺{item.revenue.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-cream-100 border-t-2 border-cream-200">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-ink-200 text-xs font-bold uppercase">
                            Total
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-black tabular-nums">
                              <ShoppingBag size={11} />
                              {report.item_breakdown.reduce((s, i) => s + i.qty_sold, 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {report.item_breakdown.reduce((s, i) => s + i.qty_cancelled, 0) > 0 ? (
                              <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-xs font-black tabular-nums">
                                {report.item_breakdown.reduce((s, i) => s + i.qty_cancelled, 0)}✕
                              </span>
                            ) : (
                              <span className="text-ink-200 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-ink-300 font-black tabular-nums text-right">
                            ₺{report.item_breakdown.reduce((s, i) => s + i.revenue, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

export default DailySummary
