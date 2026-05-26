export function LoadingSpinner({ label = "Memuat data..." }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-700" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

