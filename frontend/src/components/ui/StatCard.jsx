import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/utils/formatters";

const toneClasses = {
  primary: "bg-brand-100 text-brand-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  neutral: "bg-slate-100 text-slate-700",
};

const accentClasses = {
  primary: "from-brand-300 to-brand-500",
  success: "from-emerald-300 to-emerald-500",
  warning: "from-amber-300 to-amber-500",
  danger: "from-rose-300 to-rose-500",
  neutral: "from-slate-300 to-slate-500",
};

export default function StatCard({ title, value, meta, icon, tone = "primary" }) {
  return (
    <div className="panel relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", accentClasses[tone])} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3 pr-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="space-y-1">
            <p className="truncate text-2xl font-bold text-slate-950 sm:text-3xl">{value}</p>
            {meta ? <p className="text-sm text-slate-500">{meta}</p> : null}
          </div>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12", toneClasses[tone])}>
          <FontAwesomeIcon icon={icon} className="text-lg" />
        </div>
      </div>
    </div>
  );
}
