import { STATUS_CONFIG } from '../../store/useTableStore'
import TableTile from './TableTile'

function TableMap({ tables, onTableSelect }) {
  return (
    <div className="flex flex-col h-full">
      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 px-6 py-4 bg-cream-200 border-b border-cream-300">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
            <span className="text-ink-100 text-xs font-medium">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Table grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-cream-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-start">
          {tables.map((table) => (
            <TableTile key={table.id} table={table} onClick={onTableSelect} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TableMap
