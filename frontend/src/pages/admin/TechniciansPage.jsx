import { useEffect, useMemo, useState } from "react";
import { faPenToSquare, faPlus, faPowerOff, faRotateLeft, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import ActionButton, { InlineActionButton } from "@/components/ui/ActionButton";
import FilterPanel from "@/components/ui/FilterPanel";
import ProfileEditorModal from "@/components/admin/ProfileEditorModal";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataTable from "@/components/ui/DataTable";
import FilterDropdown from "@/components/ui/FilterDropdown";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import SearchInput from "@/components/ui/SearchInput";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { deleteManagedProfile, listTechnicians, saveManagedProfile } from "@/services/adminService";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";

const technicianStatusOptions = [
  { value: "All", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

const emptyForm = {
  id: "",
  full_name: "",
  email: "",
  role: "technician",
  department: "",
  position: "",
  specialization: "",
  phone: "",
  password: "",
  is_active: true,
};

function formatAverageHours(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(1)} jam`;
}

export default function TechniciansPage() {
  const { profile } = useAuth();
  const { hasPermission } = useSystemAccess();
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [specializationFilter, setSpecializationFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  async function loadTechnicians() {
    try {
      const rows = await listTechnicians();
      setTechnicians(rows);
    } catch (loadError) {
      setToast({
        open: true,
        message: loadError.message || "Data teknisi belum dapat dimuat.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTechnicians();
  }, []);

  const roleOptions = useMemo(() => {
    if (profile?.role === "super_admin") {
      return [
        { value: "technician", label: "Teknisi" },
        { value: "user", label: "Pengguna" },
        { value: "admin", label: "Administrator" },
        { value: "super_admin", label: "Super Administrator" },
      ];
    }

    if (hasPermission("role_management")) {
      return [
        { value: "technician", label: "Teknisi" },
        { value: "user", label: "Pengguna" },
      ];
    }

    return [{ value: "technician", label: "Teknisi" }];
  }, [hasPermission, profile?.role]);

  const specializationOptions = useMemo(
    () =>
      [
        { value: "All", label: "Semua Spesialisasi" },
        ...[...new Set(technicians.map((technician) => technician.specialization || technician.position).filter(Boolean))]
          .sort((left, right) => left.localeCompare(right))
          .map((value) => ({ value, label: value })),
      ],
    [technicians],
  );

  const filteredTechnicians = technicians.filter((technician) => {
    const specialization = technician.specialization || technician.position || "";
    const matchesQuery =
      !query ||
      [technician.full_name, technician.email, technician.specialization, technician.position]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query.toLowerCase()));

    const matchesStatus =
      status === "All" ||
      (status === "active" && technician.is_active) ||
      (status === "inactive" && !technician.is_active);
    const matchesSpecialization = specializationFilter === "All" || specialization === specializationFilter;

    return matchesQuery && matchesStatus && matchesSpecialization;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTechnicians.length / DEFAULT_PAGE_SIZE));
  const pageStart = (currentPage - 1) * DEFAULT_PAGE_SIZE;
  const pageRows = filteredTechnicians.slice(pageStart, pageStart + DEFAULT_PAGE_SIZE);
  const activeTickets = technicians.reduce((total, technician) => total + (technician.active_tickets || 0), 0);
  const completedTickets = technicians.reduce((total, technician) => total + (technician.completed_tickets || 0), 0);
  const averageResolution =
    technicians
      .map((technician) => technician.average_resolution_hours)
      .filter((value) => value !== null && value !== undefined)
      .reduce((total, value, _, array) => total + value / array.length, 0) || null;
  const hasActiveFilters = Boolean(query || status !== "All" || specializationFilter !== "All");
  function handleResetFilters() {
    setCurrentPage(1);
    setQuery("");
    setStatus("All");
    setSpecializationFilter("All");
  }

  function openCreateModal() {
    setSelectedTechnician(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(technician) {
    setSelectedTechnician(technician);
    setForm({
      id: technician.id,
      full_name: technician.full_name || "",
      email: technician.email || "",
      role: technician.role || "technician",
      department: technician.department || "",
      position: technician.position || "",
      specialization: technician.specialization || "",
      phone: technician.phone || "",
      password: "",
      is_active: Boolean(technician.is_active),
    });
    setError("");
    setModalOpen(true);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await saveManagedProfile(form, profile);
      await loadTechnicians();
      setModalOpen(false);
      setToast({
        open: true,
        message: form.id ? "Data teknisi berhasil diperbarui." : "Teknisi baru berhasil ditambahkan.",
        tone: "success",
      });
    } catch (submitError) {
      setError(submitError.message || "Perubahan data teknisi belum berhasil disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(technician) {
    setSubmitting(true);

    try {
      await saveManagedProfile(
        {
          id: technician.id,
          full_name: technician.full_name,
          email: technician.email,
          role: technician.role,
          department: technician.department,
          position: technician.position,
          specialization: technician.specialization,
          phone: technician.phone,
          is_active: !technician.is_active,
        },
        profile,
      );
      await loadTechnicians();
      setToast({
        open: true,
        message: !technician.is_active ? "Akun teknisi berhasil diaktifkan kembali." : "Akun teknisi berhasil dinonaktifkan.",
        tone: "success",
      });
    } catch (toggleError) {
      setToast({
        open: true,
        message: toggleError.message || "Status teknisi belum berhasil diperbarui.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTechnician() {
    if (!selectedTechnician) {
      return;
    }

    setSubmitting(true);

    try {
      await deleteManagedProfile(selectedTechnician.id, profile);
      await loadTechnicians();
      setConfirmOpen(false);
      setSelectedTechnician(null);
      setToast({
        open: true,
        message: "Akun teknisi berhasil dihapus.",
        tone: "success",
      });
    } catch (deleteError) {
      setToast({
        open: true,
        message: deleteError.message || "Akun teknisi belum berhasil dihapus.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "technician",
      header: "Teknisi",
      render: (technician) => (
        <div className="space-y-1">
          <p className="font-semibold text-slate-950">{technician.full_name}</p>
          <p className="text-sm text-slate-500">{technician.email}</p>
        </div>
      ),
    },
    {
      key: "specialization",
      header: "Spesialisasi",
      render: (technician) => technician.specialization || technician.position || "-",
    },
    {
      key: "active_tickets",
      header: "Tiket Aktif",
      render: (technician) => technician.active_tickets || 0,
    },
    {
      key: "completed_tickets",
      header: "Tiket Selesai",
      render: (technician) => technician.completed_tickets || 0,
    },
    {
      key: "average_resolution_hours",
      header: "Rata-rata",
      render: (technician) => formatAverageHours(technician.average_resolution_hours),
    },
    {
      key: "status",
      header: "Status",
      render: (technician) => (
        <span
          className={`badge ${
            technician.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
          }`}
        >
          {technician.is_active ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      render: (technician) => (
        <div className="flex flex-wrap gap-3 text-sm">
          <InlineActionButton icon={faPenToSquare} label="Edit" tone="primary" onClick={() => openEditModal(technician)} />
          <InlineActionButton
            icon={faPowerOff}
            label={technician.is_active ? "Nonaktifkan" : "Aktifkan"}
            tone="warning"
            onClick={() => handleToggleStatus(technician)}
          />
          <InlineActionButton
            icon={faTrashCan}
            label="Hapus"
            tone="danger"
            onClick={() => {
              setSelectedTechnician(technician);
              setConfirmOpen(true);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Teknisi"
        description="Atur akun teknisi, area keahlian, status aktif, dan kapasitas penanganan dari satu halaman."
        mobileFloatingAction={<ActionButton label="Tambah Teknisi" icon={faPlus} tone="primary" onClick={openCreateModal} />}
        actions={[
          <ActionButton key="add-technician" label="Tambah Teknisi" icon={faPlus} tone="primary" onClick={openCreateModal} />,
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Total teknisi</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{technicians.length}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Total tiket aktif</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{activeTickets}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Tiket selesai</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{completedTickets}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Rata-rata penyelesaian</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{formatAverageHours(averageResolution)}</p>
        </div>
      </div>

      <FilterPanel
        title="Saring Teknisi"
        description="Cari teknisi berdasarkan identitas, status akun, dan area keahlian."
        actions={<ActionButton label="Atur Ulang Filter" icon={faRotateLeft} onClick={handleResetFilters} disabled={!hasActiveFilters} mobileIconOnly={false} />}
        mobileCollapsible
        contentClassName="grid gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-4"
      >
          <SearchInput
            className="sm:col-span-2"
            value={query}
            onChange={(value) => {
              setCurrentPage(1);
              setQuery(value);
            }}
            placeholder="Cari nama, email, spesialisasi, atau posisi"
          />
          <FilterDropdown
            label="Status Teknisi"
            value={status}
            onChange={(value) => {
              setCurrentPage(1);
              setStatus(value);
            }}
            options={technicianStatusOptions}
          />
          <FilterDropdown
            label="Spesialisasi"
            value={specializationFilter}
            onChange={(value) => {
              setCurrentPage(1);
              setSpecializationFilter(value);
            }}
            options={specializationOptions}
          />
      </FilterPanel>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={pageRows}
          currentPage={Math.min(currentPage, totalPages)}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          emptyTitle="Belum ada data teknisi"
          emptyText="Belum ada teknisi yang sesuai dengan filter aktif."
        />
      )}

      <ProfileEditorModal
        open={modalOpen}
        title={form.id ? "Ubah Teknisi" : "Tambah Teknisi"}
        form={form}
        error={error}
        submitting={submitting}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
        onSubmit={handleSubmit}
        onChange={updateForm}
        roleOptions={roleOptions}
        showSpecialization
        passwordRequired={!form.id}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Akun Teknisi"
        description={`Akun ${selectedTechnician?.full_name || "ini"} akan dihapus permanen selama tidak memiliki keterkaitan dengan tiket. Lanjutkan?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        tone="danger"
        onClose={() => {
          setConfirmOpen(false);
          setSelectedTechnician(null);
        }}
        onConfirm={handleDeleteTechnician}
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
