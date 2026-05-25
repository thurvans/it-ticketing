import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import ActionButton from "@/components/ui/ActionButton";
import FileUpload from "@/components/tickets/FileUpload";

export default function TicketCommentBox({ allowInternalNote, onSubmit, submitting }) {
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState([]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!comment.trim()) {
      return;
    }

    await onSubmit({
      comment,
      is_internal: isInternal,
      attachments,
    });

    setComment("");
    setIsInternal(false);
    setAttachments([]);
  }

  return (
    <form className="panel p-4 sm:p-5 lg:p-6" onSubmit={handleSubmit}>
      <div className="mb-4">
        <h3 className="section-title">Tambahkan Catatan</h3>
        <p className="section-copy mt-1">Gunakan kolom ini untuk memberi pembaruan, klarifikasi, atau solusi penanganan.</p>
      </div>

      <textarea
        name="comment"
        className="textarea min-h-[140px]"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Tulis pembaruan, klarifikasi, atau catatan penanganan di sini..."
      />

      <div className="mt-4">
        <FileUpload
          inputName="comment_attachments"
          files={attachments}
          onChange={(selectedFiles) => setAttachments((current) => [...current, ...selectedFiles])}
          onRemove={(index) => setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))}
          helperText="Lampiran akan tersimpan bersama riwayat percakapan tiket."
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {allowInternalNote ? (
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input name="is_internal" type="checkbox" checked={isInternal} onChange={(event) => setIsInternal(event.target.checked)} />
            Simpan sebagai catatan internal
          </label>
        ) : (
          <span className="text-sm text-slate-500">Catatan ini akan terlihat oleh pihak yang terlibat pada tiket.</span>
        )}

        <ActionButton
          type="submit"
          label={submitting ? "Menyimpan..." : "Kirim Catatan"}
          icon={faPaperPlane}
          tone="primary"
          mobileIconOnly={false}
          className="w-full sm:w-auto"
          disabled={submitting}
        />
      </div>
    </form>
  );
}
