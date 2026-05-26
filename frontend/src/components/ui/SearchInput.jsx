import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/utils/formatters";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  label = "Pencarian",
  name,
  className,
  inputClassName,
}) {
  const inputName =
    name || String(label || "search").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "search";

  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-3 sm:gap-1.5 sm:px-3.5",
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400 sm:left-3.5">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </span>
        <input
          type="search"
          name={inputName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "input h-11 border-slate-200 bg-white/95 pl-9 pr-3 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:pl-10",
            inputClassName,
          )}
        />
      </span>
    </label>
  );
}
