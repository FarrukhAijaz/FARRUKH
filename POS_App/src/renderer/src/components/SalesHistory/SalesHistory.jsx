import { useState, useEffect } from 'react'
import {
  ArrowLeft, Calendar, BarChart3, Download, ChevronLeft, ChevronRight,
  Banknote, CreditCard, TrendingUp, CheckCircle2, AlertCircle
} from 'lucide-react'

// Mirror of server-side business-date logic (day rolls at 2 AM)
function getTodayBusinessDate() {
  const now = new Date()
  const d = now.getHours() < 2 ? new Date(now.getTime() - 86400000) : now
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
}

// Returns an array of ISO date strings (or null for padding) for one calendar month.
// Week starts on Monday.
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const monStart = (firstDay.getDay() + 6) % 7  // Mon=0 … Sun=6
  const cells = []
  for (let i = 0; i < monStart; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// Returns Tailwind classes that colour-code a day cell by revenue intensity.
function revenueColorClass(total, maxTotal) {
  if (!total || !maxTotal) return ''
  const r = total / maxTotal
  if (r < 0.2) return 'bg-forest-50 text-forest-700 border-forest-100'
  if (r < 0.4) return 'bg-forest-100 text-forest-700 border-forest-200'
  if (r < 0.6) return 'bg-forest-200 text-forest-800 border-forest-300'
  if (r < 0.8) return 'bg-forest-400 text-white border-forest-500'
  return 'bg-forest-600 text-white border-forest-700'
}

// Aggregate an array of day records into totals.
function aggregate(records) {
  return {
    total: records.reduce((s, r) => s + r.total, 0),
    cash: records.reduce((s, r) => s + r.cash, 0),
    card: records.reduce((s, r) => s + r.card, 0),
    count: records.reduce((s, r) => s + r.count, 0),
    discounts: records.reduce((s, r) => s + r.discounts, 0),
    days: records.length,
    records
  }
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Period summary block ─────────────────────────────────────────────────────
function SummaryBlock({ title, data, icon, onViewDay }) {
  if (!data) return null
  const topDays = [...data.records].sort((a, b) => b.total - a.total).slice(0, 5)
  return (
    <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-cream-100 border-b border-cream-200">
        {icon}
        <h3 className="font-bold text-ink-300 text-sm">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-cream-200">
        {[
          { label: 'Revenue', value: `₺${data.total.toFixed(2)}`, sub: `${data.days} day${data.days !== 1 ? 's' : ''}` },
          { label: 'Orders', value: data.count, sub: data.count ? `avg ₺${(data.total / data.count).toFixed(0)}/order` : '—' },
          { label: 'Cash', value: `₺${data.cash.toFixed(2)}`, sub: data.total ? `${Math.round(data.cash * 100 / data.total)}%` : '0%' },
          { label: 'Card', value: `₺${data.card.toFixed(2)}`, sub: data.total ? `${Math.round(data.card * 100 / data.total)}%` : '0%' }
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white px-4 py-3">
            <p className="text-xs text-ink-200 font-bold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-black text-ink-300 tabular-nums">{value}</p>
            <p className="text-xs text-ink-200 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
      {topDays.length > 0 && (
        <div className="p-4 space-y-1">
          <p className="text-xs text-ink-200 font-bold uppercase tracking-wider mb-2">Top Days</p>
          {topDays.map((r) => (
            <button
              key={r.date}
              onClick={() => onViewDay && onViewDay(r.date)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-cream-50 rounded-lg transition-colors text-sm"
            >
              <span className="text-ink-300 font-medium">
                {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric'
                })}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-ink-200 tabular-nums">{r.count} orders</span>
                <span className="text-forest-700 font-bold tabular-nums">₺{r.total.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function SalesHistory({ onBack, onViewDay }) {
  const today = getTodayBusinessDate()
  const nowYear = Number(today.slice(0, 4))
  const nowMonth = Number(today.slice(5, 7))

  const [activeTab, setActiveTab] = useState('calendar')

  // Calendar state
  const [calYear, setCalYear] = useState(nowYear)
  const [calMonth, setCalMonth] = useState(nowMonth)
  const [dayData, setDayData] = useState({})
  const [loadingCal, setLoadingCal] = useState(false)

  // Summary state
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [weekData, setWeekData] = useState(null)
  const [monthData, setMonthData] = useState(null)
  const [allTimeData, setAllTimeData] = useState(null)

  // Export state
  const [exportStart, setExportStart] = useState(today.slice(0, 7) + '-01')
  const [exportEnd, setExportEnd] = useState(today)
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)

  // Load calendar month data whenever month/year changes
  useEffect(() => {
    setLoadingCal(true)
    const startDate = `${calYear}-${String(calMonth).padStart(2, '0')}-01`
    const endDate = `${calYear}-${String(calMonth).padStart(2, '0')}-31`
    window.api.payments.getDateRange(startDate, endDate).then((records) => {
      const map = {}
      for (const r of records) map[r.date] = r
      setDayData(map)
      setLoadingCal(false)
    })
  }, [calYear, calMonth])

  // Load summary tab data when tab is first opened
  useEffect(() => {
    if (activeTab !== 'summary') return
    if (weekData) return // already loaded
    setSummaryLoading(true)

    const todayDate = new Date(today + 'T00:00:00')
    const monOffset = (todayDate.getDay() + 6) % 7
    const weekStartDate = new Date(todayDate)
    weekStartDate.setDate(weekStartDate.getDate() - monOffset)
    const weekStartIso = weekStartDate.toISOString().slice(0, 10)

    const monthStartIso = today.slice(0, 7) + '-01'

    Promise.all([
      window.api.payments.getDateRange(weekStartIso, today),
      window.api.payments.getDateRange(monthStartIso, today),
      window.api.payments.listDates()
    ]).then(async ([weekRecords, monthRecords, allDates]) => {
      setWeekData(aggregate(weekRecords))
      setMonthData(aggregate(monthRecords))
      if (allDates.length) {
        const earliest = allDates[allDates.length - 1]
        const allRecords = await window.api.payments.getDateRange(earliest, today)
        setAllTimeData(aggregate(allRecords))
      } else {
        setAllTimeData(aggregate([]))
      }
      setSummaryLoading(false)
    })
  }, [activeTab])

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12) }
    else setCalMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1) }
    else setCalMonth((m) => m + 1)
  }
  const canGoNext = calYear < nowYear || (calYear === nowYear && calMonth < nowMonth)

  const cells = buildCalendarGrid(calYear, calMonth)
  const maxTotal = dayData ? Math.max(0, ...Object.values(dayData).map((d) => d.total)) : 0
  const monthName = new Date(calYear, calMonth - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric'
  })

  const handleExport = async () => {
    setExporting(true)
    setExportResult(null)
    try {
      const result = await window.api.payments.exportCSV(exportStart, exportEnd)
      setExportResult({ success: true, ...result })
    } catch (err) {
      setExportResult({ success: false, error: err.message })
    }
    setExporting(false)
  }

  const setQuickRange = (start, end) => {
    setExportStart(start)
    setExportEnd(end)
    setExportResult(null)
  }

  const getWeekStart = () => {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - (d.getDay() + 6) % 7)
    return d.toISOString().slice(0, 10)
  }

  // Month totals strip (shown below calendar)
  const monthTotals = (() => {
    const vals = Object.values(dayData)
    if (!vals.length) return null
    return {
      total: vals.reduce((s, r) => s + r.total, 0),
      count: vals.reduce((s, r) => s + r.count, 0),
      cash: vals.reduce((s, r) => s + r.cash, 0),
      card: vals.reduce((s, r) => s + r.card, 0)
    }
  })()

  return (
    <div className="flex flex-col h-full bg-cream-100">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 bg-ink-300 border-b border-ink-100/20 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-cream-300 hover:text-cream-50 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="h-5 w-px bg-cream-100/10" />
        <TrendingUp size={18} className="text-forest-400" />
        <h1 className="text-cream-100 font-bold text-base">Sales History</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 bg-white px-6 pt-3 pb-0 border-b border-cream-200 shrink-0">
        {[
          { id: 'calendar', label: 'Calendar', icon: <Calendar size={14} /> },
          { id: 'summary', label: 'Period Summary', icon: <BarChart3 size={14} /> },
          { id: 'export', label: 'Export CSV', icon: <Download size={14} /> }
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold border-b-2 mr-1 transition-colors ${
              activeTab === id
                ? 'border-forest-500 text-forest-700'
                : 'border-transparent text-ink-200 hover:text-ink-300'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── CALENDAR TAB ── */}
        {activeTab === 'calendar' && (
          <>
            {/* Month navigator */}
            <div className="flex items-center justify-between bg-white rounded-xl px-5 py-3 border border-cream-200 shadow-sm">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg text-ink-200 hover:text-ink-300 hover:bg-cream-100 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <p className="font-bold text-ink-300 text-base">{monthName}</p>
              <button
                onClick={nextMonth}
                disabled={!canGoNext}
                className="p-2 rounded-lg text-ink-200 hover:text-ink-300 hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Calendar grid */}
            <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 bg-cream-200 border-b border-cream-300">
                {DOW_LABELS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-bold text-ink-200 uppercase tracking-wider py-2"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {loadingCal ? (
                <div className="flex items-center justify-center h-48 text-ink-200 text-sm">
                  Loading…
                </div>
              ) : (
                <div className="grid grid-cols-7">
                  {cells.map((iso, idx) => {
                    if (!iso) {
                      return (
                        <div
                          key={`pad-${idx}`}
                          className="h-20 border-r border-b border-cream-100 bg-cream-50/50"
                        />
                      )
                    }
                    const data = dayData[iso]
                    const dayNum = Number(iso.slice(8))
                    const isToday = iso === today
                    const isFuture = iso > today
                    const colorCls = data ? revenueColorClass(data.total, maxTotal) : ''

                    return (
                      <button
                        key={iso}
                        disabled={isFuture || !data}
                        onClick={() => onViewDay && onViewDay(iso)}
                        className={[
                          'h-20 border-r border-b border-cream-100 p-2 text-left transition-all',
                          data
                            ? `${colorCls} hover:opacity-80 cursor-pointer`
                            : 'hover:bg-cream-50 cursor-default',
                          isFuture ? 'opacity-25 !cursor-not-allowed' : '',
                          isToday ? 'ring-2 ring-inset ring-forest-500' : ''
                        ].filter(Boolean).join(' ')}
                      >
                        <span
                          className={`text-xs font-bold ${
                            isToday ? 'text-forest-600' : data ? '' : 'text-ink-200'
                          }`}
                        >
                          {dayNum}
                          {isToday && <span className="ml-1 opacity-70">●</span>}
                        </span>
                        {data && (
                          <>
                            <p className="text-sm font-black tabular-nums mt-0.5 leading-tight">
                              ₺{data.total >= 1000
                                ? (data.total / 1000).toFixed(1) + 'k'
                                : data.total.toFixed(0)}
                            </p>
                            <p className="text-xs opacity-70 tabular-nums">
                              {data.count} order{data.count !== 1 ? 's' : ''}
                            </p>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Month totals strip */}
            {!loadingCal && monthTotals && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Month Revenue', val: `₺${monthTotals.total.toFixed(2)}`,
                    cls: 'bg-forest-600/10 text-forest-700 border-forest-200'
                  },
                  {
                    label: 'Orders', val: monthTotals.count,
                    cls: 'bg-violet-50 text-violet-700 border-violet-200'
                  },
                  {
                    label: 'Cash', val: `₺${monthTotals.cash.toFixed(2)}`,
                    cls: 'bg-amber-50 text-amber-700 border-amber-200',
                    icon: <Banknote size={13} />
                  },
                  {
                    label: 'Card', val: `₺${monthTotals.card.toFixed(2)}`,
                    cls: 'bg-sky-50 text-sky-700 border-sky-200',
                    icon: <CreditCard size={13} />
                  }
                ].map(({ label, val, cls, icon }) => (
                  <div key={label} className={`rounded-xl border p-4 ${cls}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-bold uppercase tracking-widest opacity-70">
                      {icon}
                      {label}
                    </div>
                    <p className="text-2xl font-black tabular-nums">{val}</p>
                  </div>
                ))}
              </div>
            )}

            {!loadingCal && !monthTotals && (
              <div className="flex items-center justify-center h-16 text-ink-200 text-sm bg-white rounded-xl border border-cream-200">
                No sales recorded for {monthName}.
              </div>
            )}
          </>
        )}

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          summaryLoading ? (
            <div className="flex items-center justify-center h-40 text-ink-200 text-sm">
              Loading…
            </div>
          ) : (
            <div className="space-y-5">
              <SummaryBlock
                title="This Week"
                data={weekData}
                icon={<Calendar size={14} className="text-forest-600" />}
                onViewDay={onViewDay}
              />
              <SummaryBlock
                title="This Month"
                data={monthData}
                icon={<BarChart3 size={14} className="text-sky-600" />}
                onViewDay={onViewDay}
              />
              <SummaryBlock
                title="All Time"
                data={allTimeData}
                icon={<TrendingUp size={14} className="text-violet-600" />}
                onViewDay={onViewDay}
              />
            </div>
          )
        )}

        {/* ── EXPORT TAB ── */}
        {activeTab === 'export' && (
          <div className="max-w-lg space-y-5">
            <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Download size={16} className="text-forest-600" />
                <h3 className="font-bold text-ink-300">Export Sales to CSV</h3>
              </div>
              <p className="text-sm text-ink-200">
                Exports all payments in the selected date range to a CSV file saved to your Documents folder.
              </p>

              {/* Date range inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-200 uppercase tracking-wider mb-1.5">
                    From
                  </label>
                  <input
                    type="date"
                    value={exportStart}
                    max={exportEnd || today}
                    onChange={(e) => { setExportStart(e.target.value); setExportResult(null) }}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-ink-300 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-200 uppercase tracking-wider mb-1.5">
                    To
                  </label>
                  <input
                    type="date"
                    value={exportEnd}
                    min={exportStart}
                    max={today}
                    onChange={(e) => { setExportEnd(e.target.value); setExportResult(null) }}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-ink-300 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
              </div>

              {/* Quick range shortcuts */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setQuickRange(today, today)}
                  className="px-3 py-1.5 text-xs font-semibold bg-cream-100 hover:bg-cream-200 text-ink-300 rounded-lg transition-colors border border-cream-200"
                >
                  Today
                </button>
                <button
                  onClick={() => setQuickRange(getWeekStart(), today)}
                  className="px-3 py-1.5 text-xs font-semibold bg-cream-100 hover:bg-cream-200 text-ink-300 rounded-lg transition-colors border border-cream-200"
                >
                  This Week
                </button>
                <button
                  onClick={() => setQuickRange(today.slice(0, 7) + '-01', today)}
                  className="px-3 py-1.5 text-xs font-semibold bg-cream-100 hover:bg-cream-200 text-ink-300 rounded-lg transition-colors border border-cream-200"
                >
                  This Month
                </button>
                <button
                  onClick={async () => {
                    const dates = await window.api.payments.listDates()
                    if (dates.length) {
                      setExportStart(dates[dates.length - 1])
                      setExportEnd(today)
                      setExportResult(null)
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-cream-100 hover:bg-cream-200 text-ink-300 rounded-lg transition-colors border border-cream-200"
                >
                  All Time
                </button>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting || !exportStart || !exportEnd}
                className="w-full flex items-center justify-center gap-2 bg-forest-600 hover:bg-forest-700 disabled:bg-cream-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
              >
                <Download size={15} />
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>

              {exportResult && (
                <div
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
                    exportResult.success
                      ? 'bg-forest-50 border border-forest-200 text-forest-700'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
                >
                  {exportResult.success
                    ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    : <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  }
                  <div>
                    {exportResult.success ? (
                      <>
                        <p className="font-semibold">
                          Exported {exportResult.count} payment{exportResult.count !== 1 ? 's' : ''} successfully
                        </p>
                        <p className="text-xs mt-0.5 break-all opacity-80">{exportResult.filePath}</p>
                      </>
                    ) : (
                      <p className="font-semibold">Export failed: {exportResult.error}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CSV columns legend */}
            <div className="bg-cream-200/70 rounded-xl border border-cream-200 px-5 py-4 text-sm text-ink-200 space-y-2">
              <p className="font-semibold text-ink-300 text-xs uppercase tracking-wider">CSV includes</p>
              <ul className="space-y-1 text-xs">
                {[
                  'Date & time of payment',
                  'Order # and table name',
                  'Order channel (dine-in / takeaway / delivery)',
                  'Items sold and items cancelled',
                  'Subtotal, discount type/value/amount, total paid',
                  'Payment method (cash / card)',
                  'Cash received and change given'
                ].map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <span className="text-forest-500 font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SalesHistory
