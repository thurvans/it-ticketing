import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import ActionButton from "@/components/ui/ActionButton";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Halaman {currentPage} dari {totalPages}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <ActionButton
          label="Sebelumnya"
          icon={faArrowLeft}
          mobileIconOnly={false}
          fullWidth
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        />
        <ActionButton
          label="Berikutnya"
          icon={faArrowRight}
          mobileIconOnly={false}
          fullWidth
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        />
      </div>
    </div>
  );
}
