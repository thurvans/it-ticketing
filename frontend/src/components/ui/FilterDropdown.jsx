import { cn } from "@/utils/formatters";

export default function FilterDropdown({ label, value, onChange, options, name, className, selectClassName }) {
  const selectName =
    name || String(label || "filter").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "filter";

  return (
    <label
      className={cn(
        "flex w-full min-w-0 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-3 sm:gap-1.5 sm:px-3.5",
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">{label}</span>
      <select
        name={selectName}
        className={cn(
          "select h-11 border-slate-200 bg-white/95 px-3 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
          selectClassName,
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
