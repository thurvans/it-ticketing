import { useEffect, useState } from "react";
import {
  faArrowLeft,
  faCheck,
  faFloppyDisk,
  faPaperPlane,
  faPenToSquare,
  faRotateLeft,
  faTrashCan,
  faUpload,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate, useParams } from "react-router-dom";
import ActionButton from "@/components/ui/ActionButton";
import PageHeader from "@/components/common/PageHeader";
import FileUpload from "@/components/tickets/FileUpload";
import TicketCommentBox from "@/components/tickets/TicketCommentBox";
import TicketForm from "@/components/tickets/TicketForm";
import TicketTimeline from "@/components/tickets/TicketTimeline";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PriorityBadge from "@/components/ui/PriorityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import Toast from "@/components/ui/Toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { listCategories, listTechnicians } from "@/services/adminService";
import {
  addComment,
  addTicketAttachments,
  deleteTicket,
  getTicketDetail,
  updateTicket,
} from "@/services/ticketService";
import { formatDate, formatDateTime } from "@/utils/formatters";
import { getTicketsListPath } from "@/utils/routeHelpers";

function buildEditableTicket(ticket) {
  return {
    title: ticket?.title || "",
    category_id: ticket?.category_id || "",
    priority: ticket?.priority || "Medium",
    description: ticket?.description || "",
    department: ticket?.department || "",
    location: ticket?.location || "",
    contact_number: ticket?.contact_number || "",
    attachments: [],
  };
}

function pickRecommendedTechnician(technicians = []) {
  const activeTechnicians = technicians.filter((technician) => technician.is_active !== false);

  if (!activeTechnicians.length) {
    return null;
  }

  return [...activeTechnicians].sort((left, right) => {
    const activeLoadDiff = (left.active_tickets || 0) - (right.active_tickets || 0);

    if (activeLoadDiff !== 0) {
      return activeLoadDiff;
    }

    const completedDiff = (right.completed_tickets || 0) - (left.completed_tickets || 0);

    if (completedDiff !== 0) {
      return completedDiff;
    }

    return (left.full_name || "").localeCompare(right.full_name || "");
  })[0];
}

export default function TicketDetailPage({ role }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { hasPermission } = useSystemAccess();
  const [ticket, setTicket] = useState(null);
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [feedbackForm, setFeedbackForm] = useState({ rating: "", feedback: "" });
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  function syncTicketState(nextTicket) {
    setTicket(nextTicket);
    setSelectedStatus(nextTicket.status);
    setSelectedTechnician(nextTicket.assigned_to || "");
    setFeedbackForm({
      rating: nextTicket.rating ? String(nextTicket.rating) : "",
      feedback: nextTicket.feedback || "",
    });
  }

  useEffect(() => {
    async function loadDetail() {
      try {
        const [detail, categoryRows, technicianRows] = await Promise.all([
          getTicketDetail(id),
          listCategories(),
          ["admin", "super_admin"].includes(profile?.role || "") ? listTechnicians() : Promise.resolve([]),
        ]);
        syncTicketState(detail);
        setCategories(categoryRows);
        setTechnicians(technicianRows);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      setLoading(true);
      loadDetail();
    }
  }, [id, profile?.role]);

  async function handleSave(updatePayload, successMessage) {
    setSaving(true);

    try {
      const nextTicket = await updateTicket(id, updatePayload, profile);
      syncTicketState(nextTicket);
      setToast({ open: true, message: successMessage, tone: "success" });
    } catch (error) {
      setToast({ open: true, message: error.message || "Perubahan gagal disimpan.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(values) {
    setSaving(true);

    try {
      const nextTicket = await updateTicket(
        id,
        {
          title: values.title.trim(),
          category_id: values.category_id,
          priority: values.priority,
          description: values.description.trim(),
          department: values.department.trim(),
          location: values.location.trim(),
          contact_number: values.contact_number.trim(),
        },
        profile,
      );
      syncTicketState(nextTicket);
      setEditOpen(false);
      setToast({ open: true, message: "Detail tiket berhasil diperbarui.", tone: "success" });
    } catch (error) {
      setToast({ open: true, message: error.message || "Detail tiket gagal diperbarui.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTicket() {
    setSaving(true);

    try {
      await deleteTicket(id, profile);
      navigate(getTicketsListPath(role), { replace: true });
    } catch (error) {
      setToast({ open: true, message: error.message || "Tiket gagal dihapus.", tone: "error" });
      setSaving(false);
    }
  }

  async function handleCommentSubmit(values) {
    setCommentSaving(true);

    try {
      const nextTicket = await addComment(id, values, profile);
      syncTicketState(nextTicket);
      setToast({ open: true, message: "Komentar berhasil ditambahkan.", tone: "success" });
    } catch (error) {
      setToast({ open: true, message: error.message || "Komentar gagal dikirim.", tone: "error" });
    } finally {
      setCommentSaving(false);
    }
  }

  async function handleAttachmentUpload() {
    if (!pendingAttachments.length) {
      setToast({
        open: true,
        message: "Pilih minimal satu file sebelum mengunggah lampiran tambahan.",
        tone: "error",
      });
      return;
    }

    setAttachmentUploading(true);

    try {
      const nextTicket = await addTicketAttachments(id, pendingAttachments, profile);
      syncTicketState(nextTicket);
      setPendingAttachments([]);
      setToast({ open: true, message: "Lampiran tambahan berhasil diunggah.", tone: "success" });
    } catch (error) {
      setToast({ open: true, message: error.message || "Lampiran tambahan gagal diunggah.", tone: "error" });
    } finally {
      setAttachmentUploading(false);
    }
  }

  async function handleFeedbackSubmit(event) {
    event.preventDefault();

    if (!feedbackForm.rating) {
      setToast({
        open: true,
        message: "Pilih rating terlebih dahulu sebelum mengirim feedback.",
        tone: "error",
      });
      return;
    }

    setFeedbackSaving(true);

    try {
      const nextTicket = await updateTicket(
        id,
        {
          rating: Number(feedbackForm.rating),
          feedback: feedbackForm.feedback.trim() || null,
        },
        profile,
      );
      syncTicketState(nextTicket);
      setToast({ open: true, message: "Feedback penyelesaian berhasil disimpan.", tone: "success" });
    } catch (error) {
      setToast({ open: true, message: error.message || "Feedback gagal disimpan.", tone: "error" });
    } finally {
      setFeedbackSaving(false);
    }
  }

  async function handleAutoAssignTicket() {
    const recommendedTechnician = pickRecommendedTechnician(technicians);

    if (!recommendedTechnician) {
      setToast({
        open: true,
        message: "Belum ada teknisi aktif yang bisa direkomendasikan untuk assignment.",
        tone: "error",
      });
      return;
    }

    const nextStatus = ticket.status === "Open" ? "Assigned" : selectedStatus || ticket.status;

    setSelectedTechnician(recommendedTechnician.id);
    setSelectedStatus(nextStatus);

    await handleSave(
      {
        assigned_to: recommendedTechnician.id,
        status: nextStatus,
      },
      `Tiket berhasil di-assign otomatis ke ${recommendedTechnician.full_name}.`,
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Memuat rincian tiket..." />
      </div>
    );
  }

  if (!ticket) {
    return <div className="panel p-6 text-sm text-rose-700">Rincian tiket tidak ditemukan.</div>;
  }

  const isAdminRole = ["admin", "super_admin"].includes(profile?.role || "");
  const canAccessTicket =
    role === "user" ? ticket.created_by === profile?.id : role === "technician" ? ticket.assigned_to === profile?.id : true;
  const canSubmitFeedback = role === "user" && ["Resolved", "Closed"].includes(ticket.status);
  const canEditTicket = isAdminRole || (role === "user" && ticket.created_by === profile?.id && ticket.status === "Open");
  const canDeleteTicket = isAdminRole && hasPermission("ticket_delete");
  const canCommentOnTicket = hasPermission("ticket_comment");
  const canManageTicketStatus = (role === "technician" || isAdminRole) && hasPermission("ticket_update_status");
  const canAssignTechnician = isAdminRole && hasPermission("ticket_assign");

  if (!canAccessTicket) {
    return <div className="panel p-6 text-sm text-rose-700">Anda tidak memiliki akses ke rincian tiket ini.</div>;
  }

  const visibleComments =
    role === "user" ? ticket.comments?.filter((comment) => !comment.is_internal) : ticket.comments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${ticket.ticket_number} / ${ticket.title}`}
        description="Lihat ringkasan, percakapan, riwayat, dan tindak lanjut tiket di satu halaman."
        actions={[
          <ActionButton key="back" to={getTicketsListPath(role)} label="Kembali" icon={faArrowLeft} mobileIconOnly={false} />,
          canEditTicket ? (
            <ActionButton key="edit" label="Ubah Tiket" icon={faPenToSquare} onClick={() => setEditOpen(true)} />
          ) : null,
          canDeleteTicket ? (
            <ActionButton key="delete" label="Hapus Tiket" icon={faTrashCan} tone="danger" onClick={() => setDeleteOpen(true)} />
          ) : null,
        ].filter(Boolean)}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ringkasan</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{ticket.category?.name || "Tanpa kategori"}</p>
          <p className="mt-1 text-xs text-slate-500">Dibuat {formatDateTime(ticket.created_at)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
          <div className="mt-2"><StatusBadge status={ticket.status} /></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Prioritas</p>
          <div className="mt-2"><PriorityBadge priority={ticket.priority} /></div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="panel p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm leading-7 text-slate-600">{ticket.description}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pelapor</p>
                <p className="mt-2 font-semibold text-slate-950">{ticket.creator?.full_name || "-"}</p>
                <p className="mt-1 text-sm text-slate-500">{ticket.creator?.email || "-"}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {ticket.department || "-"} / {ticket.location || "-"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Teknisi</p>
                <p className="mt-2 font-semibold text-slate-950">{ticket.assignee?.full_name || "Belum ditugaskan"}</p>
                <p className="mt-1 text-sm text-slate-500">{ticket.assignee?.email || "Menunggu penugasan"}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Batas layanan: {ticket.sla_deadline ? formatDateTime(ticket.sla_deadline) : "-"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Kategori dan Kontak</p>
                <p className="mt-2 font-semibold text-slate-950">{ticket.category?.name || "-"}</p>
                <p className="mt-1 text-sm text-slate-500">Nomor kontak: {ticket.contact_number || "-"}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Waktu Penting</p>
                <p className="mt-2 text-sm text-slate-600">Dibuat: {formatDateTime(ticket.created_at)}</p>
                <p className="mt-1 text-sm text-slate-600">Update terakhir: {formatDateTime(ticket.updated_at)}</p>
                <p className="mt-1 text-sm text-slate-600">Diselesaikan: {formatDate(ticket.resolved_at)}</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="section-title">Dokumen & Lampiran</h3>
              <div className="mt-4 space-y-3">
                {ticket.attachments?.length ? (
                  ticket.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.signed_url || attachment.file_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-brand-300 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-semibold text-slate-950">{attachment.file_name}</span>
                      <span className="text-brand-700">Buka</span>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Belum ada lampiran pada tiket ini.</p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="section-title">Tambahkan Lampiran</h3>
                <p className="section-copy mt-1">Unggah tangkapan layar atau dokumen pendukung tambahan langsung dari halaman ini.</p>
              </div>

              <FileUpload
                files={pendingAttachments}
                onChange={(selectedFiles) => setPendingAttachments((current) => [...current, ...selectedFiles])}
                onRemove={(index) =>
                  setPendingAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))
                }
              />

              <div className="mt-4 flex justify-end">
                <ActionButton
                  label={attachmentUploading ? "Mengunggah..." : "Unggah Lampiran"}
                  icon={faUpload}
                  tone="primary"
                  mobileIconOnly={false}
                  className="w-full sm:w-auto"
                  disabled={attachmentUploading}
                  onClick={handleAttachmentUpload}
                />
              </div>
            </div>
          </div>

          <TicketTimeline logs={ticket.logs || []} />

          <div className="panel p-4 sm:p-5 lg:p-6">
            <div className="mb-5">
              <h3 className="section-title">Komentar Tiket</h3>
              <p className="section-copy mt-1">Percakapan dan catatan penanganan yang berkaitan dengan tiket ini.</p>
            </div>

            <div className="space-y-4">
              {visibleComments.length ? (
                visibleComments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{comment.user?.full_name || "Sistem"}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(comment.created_at)}</p>
                      </div>
                      {comment.is_internal ? (
                        <span className="badge bg-slate-200 text-slate-700">Catatan Internal</span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{comment.comment}</p>

                    {comment.attachments?.length ? (
                      <div className="mt-4 space-y-2">
                        {comment.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.signed_url || attachment.file_url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-brand-300 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="font-semibold text-slate-950">{attachment.file_name}</span>
                            <span className="text-brand-700">Buka</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Belum ada percakapan untuk tiket ini.</p>
              )}
            </div>
          </div>

          {canCommentOnTicket ? (
            <TicketCommentBox allowInternalNote={role !== "user"} onSubmit={handleCommentSubmit} submitting={commentSaving} />
          ) : (
            <div className="panel p-6 text-sm text-slate-500">
              Hak untuk menambahkan komentar saat ini tidak aktif untuk peran Anda.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="panel p-4 sm:p-5 lg:p-6">
            <h3 className="section-title">Tindak Lanjut</h3>
            <p className="section-copy mt-1">Gunakan panel ini untuk memperbarui status dan penugasan tiket.</p>

            <div className="mt-5 space-y-4">
              {canManageTicketStatus || canAssignTechnician ? (
                <>
                  {canManageTicketStatus ? (
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Status Tiket</span>
                      <select
                        name="ticket_status"
                        className="select"
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                      >
                        {["Open", "Assigned", "In Progress", "Waiting User", "Resolved", "Closed", "Rejected"].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {canAssignTechnician ? (
                    <div className="space-y-3">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Tugaskan Teknisi</span>
                        <select
                          name="assigned_to"
                          className="select"
                          value={selectedTechnician}
                          onChange={(event) => setSelectedTechnician(event.target.value)}
                        >
                          <option value="">Belum ditugaskan</option>
                          {technicians.map((technician) => (
                            <option key={technician.id} value={technician.id}>
                              {technician.full_name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <ActionButton
                        label="Pilih Otomatis Berdasarkan Beban Kerja"
                        icon={faWandMagicSparkles}
                        mobileIconOnly={false}
                        fullWidth
                        disabled={saving || !technicians.length}
                        onClick={handleAutoAssignTicket}
                      />
                    </div>
                  ) : null}

                  <ActionButton
                    label={saving ? "Menyimpan..." : "Simpan Perubahan"}
                    icon={faFloppyDisk}
                    tone="primary"
                    mobileIconOnly={false}
                    fullWidth
                    disabled={saving}
                    onClick={() =>
                      handleSave(
                        {
                          status: selectedStatus,
                          assigned_to: selectedTechnician || null,
                        },
                        "Perubahan tiket berhasil disimpan.",
                      )
                    }
                  />
                </>
              ) : null}

              {role === "user" && ticket.status === "Resolved" ? (
                <div className="grid gap-3">
                  <ActionButton
                    label="Tutup Tiket"
                    icon={faCheck}
                    tone="primary"
                    mobileIconOnly={false}
                    disabled={saving}
                    onClick={() => handleSave({ status: "Closed" }, "Tiket berhasil ditutup.")}
                  />
                  <ActionButton
                    label="Buka Kembali Tiket"
                    icon={faRotateLeft}
                    mobileIconOnly={false}
                    disabled={saving}
                    onClick={() => handleSave({ status: "Open" }, "Tiket dibuka kembali untuk tindak lanjut.")}
                  />
                </div>
              ) : null}

              {role === "user" && ticket.status === "Closed" ? (
                <ActionButton
                  label="Buka Kembali Tiket"
                  icon={faRotateLeft}
                  mobileIconOnly={false}
                  fullWidth
                  disabled={saving}
                  onClick={() => handleSave({ status: "Open" }, "Tiket berhasil dibuka kembali.")}
                />
              ) : null}
            </div>
          </div>

          <div className="panel p-4 sm:p-5 lg:p-6">
            <h3 className="section-title">Penilaian Layanan</h3>
            <p className="section-copy mt-1">Masukan pengguna membantu tim meningkatkan kualitas penanganan.</p>

            {canSubmitFeedback ? (
              <form className="mt-4 space-y-4" onSubmit={handleFeedbackSubmit}>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Nilai Penanganan</span>
                  <select
                    name="rating"
                    className="select"
                    value={feedbackForm.rating}
                    onChange={(event) => setFeedbackForm((current) => ({ ...current, rating: event.target.value }))}
                  >
                    <option value="">Pilih rating</option>
                    <option value="1">1 - Perlu perbaikan besar</option>
                    <option value="2">2 - Kurang memuaskan</option>
                    <option value="3">3 - Cukup</option>
                    <option value="4">4 - Baik</option>
                    <option value="5">5 - Sangat baik</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Catatan Tambahan</span>
                  <textarea
                    name="feedback"
                    className="textarea min-h-[120px]"
                    value={feedbackForm.feedback}
                    onChange={(event) => setFeedbackForm((current) => ({ ...current, feedback: event.target.value }))}
                    placeholder="Bagikan pengalaman penyelesaian atau saran perbaikan layanan."
                  />
                </label>

                <ActionButton
                  type="submit"
                  label={feedbackSaving ? "Menyimpan Penilaian..." : ticket.rating || ticket.feedback ? "Perbarui Penilaian" : "Kirim Penilaian"}
                  icon={ticket.rating || ticket.feedback ? faFloppyDisk : faPaperPlane}
                  tone="primary"
                  mobileIconOnly={false}
                  fullWidth
                  disabled={feedbackSaving}
                />
              </form>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Rating: {ticket.rating || "-"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {ticket.feedback || (
                    role === "user" ? "Penilaian dapat dikirim setelah tiket berstatus Resolved atau Closed." : "Belum ada penilaian dari pengguna."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={editOpen} title="Ubah Tiket" onClose={() => setEditOpen(false)}>
        <TicketForm
          key={`${ticket.id}-${ticket.updated_at}`}
          categories={categories}
          defaultValues={buildEditableTicket(ticket)}
          onSubmit={handleEditSubmit}
          submitting={saving}
          submitLabel="Simpan Perubahan"
          submitIcon={faFloppyDisk}
          showAttachments={false}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus Tiket"
        description={`Tiket ${ticket.ticket_number} akan dihapus permanen beserta komentar, timeline, dan lampirannya. Lanjutkan?`}
        confirmLabel="Ya, Hapus Tiket"
        cancelLabel="Batal"
        tone="danger"
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteTicket}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ open: false, message: "", tone: "success" })}
      />
    </div>
  );
}
