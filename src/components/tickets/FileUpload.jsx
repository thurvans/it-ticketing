import { useState } from "react";
import { faPaperclip, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { formatFileSize } from "@/utils/formatters";
import { ATTACHMENT_MAX_MB, validateAttachmentDescriptor } from "@shared/attachmentRules";

export default function FileUpload({ files, onChange, onRemove, helperText, inputName = "attachments" }) {
  const { systemSettings } = useSystemAccess();
  const [error, setError] = useState("");
  const attachmentLimitMb = Math.min(Number(systemSettings.attachment_limit_mb) || ATTACHMENT_MAX_MB, ATTACHMENT_MAX_MB);
  const maxFileSizeBytes = attachmentLimitMb * 1024 * 1024;

  function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    const invalidTypeFiles = [];
    const oversizedFiles = [];
    const allowedFiles = [];

    selectedFiles.forEach((file) => {
      const validationMessage = validateAttachmentDescriptor(
        {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
        { maxFileSizeBytes },
      );

      if (!validationMessage) {
        allowedFiles.push(file);
        return;
      }

      if (validationMessage.includes("PNG atau JPG")) {
        invalidTypeFiles.push(file.name);
        return;
      }

      oversizedFiles.push(file.name);
    });

    if (invalidTypeFiles.length || oversizedFiles.length) {
      const messages = [];

      if (invalidTypeFiles.length) {
        messages.push(`${invalidTypeFiles.length} file bukan PNG/JPG`);
      }

      if (oversizedFiles.length) {
        messages.push(`${oversizedFiles.length} file melebihi ${attachmentLimitMb} MB`);
      }

      setError(`Sebagian lampiran ditolak: ${messages.join(" dan ")}.`);
    } else {
      setError("");
    }

    if (allowedFiles.length) {
      onChange(allowedFiles);
    }

    event.target.value = "";
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50 sm:px-5 sm:py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
          <FontAwesomeIcon icon={faPaperclip} />
        </div>
        <div>
          <p className="font-semibold text-slate-950">Upload lampiran screenshot atau file pendukung</p>
          <p className="mt-1 text-sm text-slate-500">
            Hanya PNG atau JPG. Maksimal {attachmentLimitMb} MB per file.
          </p>
        </div>
        <input
          type="file"
          name={inputName}
          multiple
          className="hidden"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
      </label>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}

      {files?.length ? (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              {onRemove ? (
                <button type="button" className="btn-ghost self-start text-rose-600 sm:self-auto" onClick={() => onRemove(index)}>
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
