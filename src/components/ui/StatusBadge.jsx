import { cn } from "@/utils/formatters";

const statusClasses = {
  Open: "bg-sky-100 text-sky-700",
  Assigned: "bg-indigo-100 text-indigo-700",
  "In Progress": "bg-amber-100 text-amber-700",
  "Waiting User": "bg-orange-100 text-orange-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Closed: "bg-slate-200 text-slate-700",
  Rejected: "bg-rose-100 text-rose-700",
};

export default function StatusBadge({ status }) {
  return <span className={cn("badge", statusClasses[status] || "bg-slate-100 text-slate-700")}>{status}</span>;
}

