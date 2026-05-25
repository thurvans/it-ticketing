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
import { deleteManagedProfile, listProfiles, saveManagedProfile } from "@/services/adminService";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";
import { formatDateTime, humanizeRole } from "@/utils/formatters";

const userStatusOptions = [
  { value: "All", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

const emptyForm = {
  id: "",
  full_name: "",
  email: "",
  role: "user",
  department: "",
  position: "",
  specialization: "",
  phone: "",
  password: "",
  is_active: true,
};

export default function UsersPage() {
  const { profile } = useAuth();
  const { hasPermission } = useSystemAccess();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  async function loadUsers() {
    try {
      const rows = await listProfiles("All");
      setUsers(rows);
    } catch (loadError) {
      setToast({
        open: true,
        message: loadError.message || "Data pengguna belum dapat dimuat.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const visibleUsers = useMemo(() => {
    const baseRows = users.filter((user) => user.role !== "technician");

    if (profile?.role === "super_admin") {
      return baseRows;
    }

    return baseRows.filter((user) => user.role === "user");
  }, [profile?.role, users]);

  const roleOptions = useMemo(() => {
    if (profile?.role === "super_admin") {
      return [
        { value: "user", label: "Pengguna" },
        { value: "technician", label: "Teknisi" },
        { value: "admin", label: "Administrator" },
        { value: "super_admin", label: "Super Administrator" },
      ];
    }

    if (hasPermission("role_management")) {
      return [
        { value: "user", label: "Pengguna" },
        { value: "technician", label: "Teknisi" },
      ];
    }

    return [{ value: "user", label: "Pengguna" }];
  }, [hasPermission, profile?.role]);

  const departmentOptions = useMemo(
    () =>
      [
        { value: "All", label: "Semua Departemen" },
        ...[...new Set(visibleUsers.map((user) => user.department).filter(Boolean))]
          .sort((left, right) => left.localeCompare(right))
          .map((department) => ({ value: department, label: department })),
      ],
    [visibleUsers],
  );

  const roleFilterOptions = useMemo(
    () =>
      [
        { value: "All", label: "Semua Peran" },
        ...[...new Set(visibleUsers.map((user) => user.role))]
          .sort()
          .map((role) => ({ value: role, label: humanizeRole(role) })),
      ],
    [visibleUsers],
  );

  const filteredUsers = visibleUsers.filter((user) => {
    const matchesQuery =
      !query ||
      [user.full_name, user.email, user.department, user.position]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query.toLowerCase()));

    const matchesStatus =
      status === "All" ||
      (status === "active" && user.is_active) ||
      (status === "inactive" && !user.is_active);
    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    const matchesDepartment = departmentFilter === "All" || user.department === departmentFilter;

    return matchesQuery && matchesStatus && matchesRole && matchesDepartment;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / DEFAULT_PAGE_SIZE));
  const pageStart = (currentPage - 1) * DEFAULT_PAGE_SIZE;
  const pageRows = filteredUsers.slice(pageStart, pageStart + DEFAULT_PAGE_SIZE);
  const activeUsers = visibleUsers.filter((user) => user.is_active).length;
  const departmentCount = new Set(visibleUsers.map((user) => user.department).filter(Boolean)).size;
  const hasActiveFilters = Boolean(query || status !== "All" || roleFilter !== "All" || departmentFilter !== "All");
  function handleResetFilters() {
    setCurrentPage(1);
    setQuery("");
    setStatus("All");
    setRoleFilter("All");
    setDepartmentFilter("All");
  }

  function openCreateModal() {
    setSelectedUser(null);
    setForm({
      ...emptyForm,
      role: roleOptions[0]?.value || "user",
    });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(user) {
    setSelectedUser(user);
    setForm({
      id: user.id,
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role || "user",
      department: user.department || "",
      position: user.position || "",
      specialization: "",
      phone: user.phone || "",
      password: "",
      is_active: Boolean(user.is_active),
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
      await loadUsers();
      setModalOpen(false);
      setToast({
        open: true,
        message: form.id ? "Data pengguna berhasil diperbarui." : "Pengguna baru berhasil ditambahkan.",
        tone: "success",
      });
    } catch (submitError) {
      setError(submitError.message || "Perubahan data pengguna belum berhasil disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(user) {
    setSubmitting(true);

    try {
      await saveManagedProfile(
        {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position,
          phone: user.phone,
          is_active: !user.is_active,
        },
        profile,
      );
      await loadUsers();
      setToast({
        open: true,
        message: !user.is_active ? "Akun berhasil diaktifkan kembali." : "Akun berhasil dinonaktifkan.",
        tone: "success",
      });
    } catch (toggleError) {
      setToast({
        open: true,
        message: toggleError.message || "Status akun gagal diperbarui.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) {
      return;
    }

    setSubmitting(true);

    try {
      await deleteManagedProfile(selectedUser.id, profile);
      await loadUsers();
      setConfirmOpen(false);
      setSelectedUser(null);
      setToast({
        open: true,
        message: "Akun pengguna berhasil dihapus.",
        tone: "success",
      });
    } catch (deleteError) {
      setToast({
        open: true,
        message: deleteError.message || "Akun pengguna belum berhasil dihapus.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "name",
      header: "Pengguna",
      render: (user) => (
        <div className="space-y-1">
          <p className="font-semibold text-slate-950">{user.full_name}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Peran",
      render: (user) => humanizeRole(user.role),
    },
    {
      key: "department",
      header: "Departemen",
      render: (user) => user.department || "-",
    },
    {
      key: "position",
      header: "Jabatan",
      render: (user) => user.position || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (user) => (
        <span className={`badge ${user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
          {user.is_active ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Terdaftar",
      render: (user) => formatDateTime(user.created_at),
    },
    {
      key: "action",
      header: "Aksi",
      render: (user) => (
        <div className="flex flex-wrap gap-3 text-sm">
          <InlineActionButton icon={faPenToSquare} label="Edit" tone="primary" onClick={() => openEditModal(user)} />
          <InlineActionButton
            icon={faPowerOff}
            label={user.is_active ? "Nonaktifkan" : "Aktifkan"}
            tone="warning"
            onClick={() => handleToggleStatus(user)}
          />
          <InlineActionButton
            icon={faTrashCan}
            label="Hapus"
            tone="danger"
            onClick={() => {
              setSelectedUser(user);
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
        title="Kelola Pengguna"
        description="Atur akun pengguna, status aktif, peran, dan informasi kerja dari satu halaman."
        mobileFloatingAction={<ActionButton label="Tambah Pengguna" icon={faPlus} tone="primary" onClick={openCreateModal} />}
        actions={[
          <ActionButton key="add-user" label="Tambah Pengguna" icon={faPlus} tone="primary" onClick={openCreateModal} />,
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Total pengguna</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{visibleUsers.length}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Pengguna aktif</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{activeUsers}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Departemen tercakup</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{departmentCount}</p>
        </div>
      </div>

      <FilterPanel
        title="Saring Pengguna"
        description="Cari pengguna berdasarkan identitas, status akun, peran, dan departemen."
        actions={<ActionButton label="Atur Ulang Filter" icon={faRotateLeft} onClick={handleResetFilters} disabled={!hasActiveFilters} mobileIconOnly={false} />}
        mobileCollapsible
        contentClassName="grid gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-5"
      >
          <SearchInput
            className="sm:col-span-2"
            value={query}
            onChange={(value) => {
              setCurrentPage(1);
              setQuery(value);
            }}
            placeholder="Cari nama, email, departemen, atau jabatan"
          />
          <FilterDropdown
            label="Status Akun"
            value={status}
            onChange={(value) => {
              setCurrentPage(1);
              setStatus(value);
            }}
            options={userStatusOptions}
          />
          <FilterDropdown
            label="Peran"
            value={roleFilter}
            onChange={(value) => {
              setCurrentPage(1);
              setRoleFilter(value);
            }}
            options={roleFilterOptions}
          />
          <FilterDropdown
            label="Departemen"
            value={departmentFilter}
            onChange={(value) => {
              setCurrentPage(1);
              setDepartmentFilter(value);
            }}
            options={departmentOptions}
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
          emptyTitle="Belum ada data pengguna"
          emptyText="Belum ada data pengguna yang sesuai dengan filter saat ini."
        />
      )}

      <ProfileEditorModal
        open={modalOpen}
        title={form.id ? "Ubah Pengguna" : "Tambah Pengguna"}
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
        passwordRequired={!form.id}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Akun Pengguna"
        description={`Akun ${selectedUser?.full_name || "ini"} akan dihapus permanen selama tidak memiliki keterkaitan dengan tiket. Lanjutkan?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        tone="danger"
        onClose={() => {
          setConfirmOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
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
