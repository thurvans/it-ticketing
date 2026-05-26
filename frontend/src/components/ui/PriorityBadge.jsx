import { cn } from "@/utils/formatters";

const priorityClasses = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-sky-100 text-sky-700",
  High: "bg-amber-100 text-amber-700",
  Critical: "bg-rose-100 text-rose-700",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={cn("badge", priorityClasses[priority] || "bg-slate-100 text-slate-700")}>
      {priority}
    </span>
  );
}

