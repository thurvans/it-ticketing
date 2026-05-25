import { faCheck, faTrashCan, faXmark } from "@fortawesome/free-solid-svg-icons";
import ActionButton from "@/components/ui/ActionButton";
import Modal from "@/components/ui/Modal";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  onConfirm,
  onClose,
  tone = "primary",
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton label={cancelLabel} icon={faXmark} mobileIconOnly={false} onClick={onClose} />
          <ActionButton
            label={confirmLabel}
            icon={tone === "danger" ? faTrashCan : faCheck}
            tone={tone === "danger" ? "danger" : "primary"}
            mobileIconOnly={false}
            onClick={onConfirm}
          />
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </Modal>
  );
}
