import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import TicketForm from "@/components/tickets/TicketForm";
import ActionButton from "@/components/ui/ActionButton";
import Toast from "@/components/ui/Toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { listCategories } from "@/services/adminService";
import { createTicket } from "@/services/ticketService";
import { formatDateTime } from "@/utils/formatters";
import { getTicketDetailPath } from "@/utils/routeHelpers";
import {
  clearTicketDraft,
  getTicketDraft,
  hasTicketDraftContent,
  saveTicketDraft,
} from "@/utils/ticketDraftStore";

function buildFormDefaults(profile, draft) {
  return {
    title: draft?.title || "",
    category_id: draft?.category_id || "",
    priority: draft?.priority || "Medium",
    description: draft?.description || "",
    department: draft?.department || profile?.department || "",
    location: draft?.location || "",
    contact_number: draft?.contact_number || profile?.phone || "",
  };
}

export default function CreateTicketPage({ title, description }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [categories, setCategories] = useState([]);
  const [formDefaults, setFormDefaults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftMeta, setDraftMeta] = useState(null);
  const [formVersion, setFormVersion] = useState(0);
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  useEffect(() => {
    async function loadPageData() {
      if (!profile?.id) {
        return;
      }

      const savedDraft = getTicketDraft(profile.id);

      setFormDefaults(buildFormDefaults(profile, savedDraft));
      setDraftMeta(savedDraft);

      try {
        const rows = await listCategories();
        setCategories(rows.filter((category) => category.is_active));
      } catch (error) {
        setToast({
          open: true,
          message: error.message || "Kategori belum dapat dimuat.",
          tone: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    loadPageData();
  }, [profile?.id, profile?.department, profile?.phone]);

  async function handleSubmit(values) {
    setSubmitting(true);

    try {
      const nextTicket = await createTicket(
        {
          ...values,
          department: values.department || profile?.department || "",
          contact_number: values.contact_number || profile?.phone || "",
        },
        profile,
      );

      clearTicketDraft(profile?.id);
      setDraftMeta(null);
      navigate(getTicketDetailPath(profile?.role, nextTicket.id), { replace: true });
    } catch (error) {
      setToast({
        open: true,
        message: error.message || "Permintaan belum berhasil dikirim.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft(values) {
    if (!profile?.id) {
      return;
    }

    if (!hasTicketDraftContent(values)) {
      setToast({
        open: true,
        message: "Isi setidaknya satu bagian sebelum menyimpan draf.",
        tone: "error",
      });
      return;
    }

    setDraftSaving(true);

    try {
      const savedDraft = saveTicketDraft(profile.id, values);
      setDraftMeta(savedDraft);
      setToast({
        open: true,
        message: values.attachments?.length
          ? "Draf berhasil disimpan. Lampiran perlu diunggah kembali saat pengiriman akhir."
          : "Draf berhasil disimpan.",
        tone: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: error.message || "Draf belum berhasil disimpan.",
        tone: "error",
      });
    } finally {
      setDraftSaving(false);
    }
  }

  function handleClearDraft() {
    clearTicketDraft(profile?.id);
    setDraftMeta(null);
    setFormDefaults(buildFormDefaults(profile, null));
    setFormVersion((current) => current + 1);
    setToast({
      open: true,
      message: "Draf dihapus dan formulir dikembalikan ke kondisi awal.",
      tone: "success",
    });
  }

  if (loading || !formDefaults) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Menyiapkan formulir tiket..." />
      </div>
    );
  }

  const hasSavedDraft = Boolean(draftMeta);

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Formulir Tiket</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">Lengkapi informasi gangguan agar tim dapat memprioritaskan dengan tepat.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Draf</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{hasSavedDraft ? "Tersimpan" : "Belum ada draf"}</p>
        </div>
      </div>

      <div className={hasSavedDraft ? "grid gap-6 xl:grid-cols-[1.1fr_0.45fr]" : "mx-auto max-w-5xl"}>
        <TicketForm
          key={`${formVersion}-${draftMeta?.saved_at || "empty"}`}
          categories={categories}
          submitting={submitting}
          draftSaving={draftSaving}
          defaultValues={formDefaults}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
        />

        {hasSavedDraft ? (
          <div className="panel p-4 sm:p-5 lg:p-6">
            <h3 className="section-title">Draf Tersimpan</h3>
            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <p>Draf terakhir disimpan pada {formatDateTime(draftMeta.saved_at)}.</p>
              {draftMeta.attachment_names?.length ? (
                <p>Lampiran tercatat: {draftMeta.attachment_names.join(", ")}.</p>
              ) : null}
              <p>Lampiran tetap perlu diunggah kembali saat pengiriman akhir.</p>
              <ActionButton
                label="Hapus Draf"
                icon={faTrashCan}
                tone="danger"
                mobileIconOnly={false}
                className="w-full sm:w-auto"
                onClick={handleClearDraft}
              />
            </div>
          </div>
        ) : null}
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ open: false, message: "", tone: "success" })}
      />
    </div>
  );
}
