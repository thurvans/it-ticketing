import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { cn } from "@/utils/formatters";

function renderCellContent(column, row) {
  const value = column.render ? column.render(row) : row[column.key];

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

export default function DataTable({
  columns,
  rows,
  rowKey = "id",
  emptyTitle,
  emptyText,
  currentPage,
  totalPages,
  onPageChange,
}) {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyText} />;
  }

  return (
    <div className="table-shell">
      <div className="space-y-3 p-3 sm:hidden">
        {rows.map((row, rowIndex) => {
          const primaryColumn = columns[0];
          const detailColumns = columns.slice(1).filter((column) => column.mobileHidden !== true);
          const resolvedRowKey = row[rowKey] ?? rowIndex;

          return (
            <article key={resolvedRowKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-4">
                {primaryColumn ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">{primaryColumn.header}</p>
                    <div className="text-sm text-slate-700">{renderCellContent(primaryColumn, row)}</div>
                  </div>
                ) : null}

                {detailColumns.length ? (
                  <div className="grid gap-3">
                    {detailColumns.map((column) => {
                      const cellKey = column.key || column.header;
                      const isActionColumn = column.key === "action" || String(column.header).toLowerCase() === "aksi";

                      return (
                        <div
                          key={cellKey}
                          className={cn(
                            isActionColumn ? "border-t border-slate-200 pt-3" : "rounded-xl bg-slate-50 px-3.5 py-3",
                            column.mobileClassName,
                          )}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{column.header}</p>
                          <div className={cn("mt-2 text-sm text-slate-700", isActionColumn ? "flex flex-wrap gap-2" : "")}>
                            {renderCellContent(column, row)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden sm:block">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key || column.header}>{column.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[rowKey]}>
                  {columns.map((column) => (
                    <td key={column.key || column.header} className={column.className}>
                      {renderCellContent(column, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
