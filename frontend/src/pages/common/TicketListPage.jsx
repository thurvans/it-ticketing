import { useEffect, useState } from "react";
import { faArrowUpRightFromSquare, faPlus, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/common/PageHeader";
import ActionButton, { InlineActionButton } from "@/components/ui/ActionButton";
import DataTable from "@/components/ui/DataTable";
import FilterPanel from "@/components/ui/FilterPanel";
import FilterDropdown from "@/components/ui/FilterDropdown";
import PriorityBadge from "@/components/ui/PriorityBadge";
import SearchInput from "@/components/ui/SearchInput";
import StatusBadge from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { listCategories, listTechnicians } from "@/services/adminService";
import { listTickets } from "@/services/ticketService";
import { DEFAULT_PAGE_SIZE, PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/utils/constants";
import { formatDateTime } from "@/utils/formatters";
import { getTicketDetailPath } from "@/utils/routeHelpers";

const sortOptions = [
  { value: "latest", label: "Terbaru" },
  { value: "priority", label: "Prioritas Tertinggi" },
  { value: "status", label: "Status Penanganan" },
  { value: "sla", label: "Batas Layanan Terdekat" },
  { value: "oldest", label: "Terlama" },
];

function buildDefaultFilters(defaultStatus) {
  return {
    query: "",
    status: defaultStatus,
    priority: "All",
    categoryId: "All",
    assignedTo: "All",
    department: "All",
    sortBy: "latest",
  };
}

export default function TicketListPage({
  role,
  title,
  description,
  showCreateAction = false,
  defaultStatus = "All",
  statusWhitelist,
}) {
  const { profile } = useAuth();
  const { hasPermission } = useSystemAccess();
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => buildDefaultFilters(defaultStatus));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadPageData() {
      try {
        const [ticketRows, categoryRows, technicianRows] = await Promise.all([
          listTickets({ role, userId: profile.id, filters }),
          listCategories(),
          role === "admin" ? listTechnicians() : Promise.resolve([]),
        ]);

        const visibleTickets = statusWhitelist?.length
          ? ticketRows.filter((ticket) => statusWhitelist.includes(ticket.status))
          : ticketRows;

        setTickets(visibleTickets);
        setCategories(categoryRows);
        setTechnicians(technicianRows);
        setDepartments(
          [...new Set(visibleTickets.map((ticket) => ticket.department).filter(Boolean))].sort((left, right) =>
            left.localeCompare(right),
          ),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (profile?.id) {
      setLoading(true);
      loadPageData();
    }
  }, [filters, profile?.id, role, statusWhitelist]);

  function updateFilter(key, value) {
    setCurrentPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const totalPages = Math.max(1, Math.ceil(tickets.length / DEFAULT_PAGE_SIZE));
  const pageStart = (currentPage - 1) * DEFAULT_PAGE_SIZE;
  const pageRows = tickets.slice(pageStart, pageStart + DEFAULT_PAGE_SIZE);
  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    key === "sortBy" ? value !== "latest" : key === "status" ? value !== defaultStatus : value !== "" && value !== "All",
  );
  const canCreateTicket = showCreateAction && hasPermission("ticket_create");
  const statusFilterOptions = [{ value: "All", label: "Semua Status" }, ...STATUS_OPTIONS.map((status) => ({ value: status, label: status }))];
  const priorityFilterOptions = [{ value: "All", label: "Semua Prioritas" }, ...PRIORITY_OPTIONS.map((priority) => ({ value: priority, label: priority }))];
  const categoryFilterOptions = [
    { value: "All", label: "Semua Kategori" },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];
  const technicianFilterOptions = [
    { value: "All", label: "Semua Teknisi" },
    ...technicians.map((technician) => ({ value: technician.id, label: technician.full_name })),
  ];
  const departmentFilterOptions = [
    { value: "All", label: "Semua Departemen" },
    ...departments.map((department) => ({ value: department, label: department })),
  ];
  function handleResetFilters() {
    setCurrentPage(1);
    setFilters(buildDefaultFilters(defaultStatus));
  }

  const columns = [
    {
      key: "ticket",
      header: "Tiket",
      render: (ticket) => (
        <div className="space-y-1">
          <p className="font-semibold text-slate-950">{ticket.ticket_number}</p>
          <p className="max-w-[260px] text-sm text-slate-600">{ticket.title}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (ticket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: "priority",
      header: "Prioritas",
      render: (ticket) => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: "category",
      header: "Kategori",
      render: (ticket) => ticket.category?.name || "-",
    },
    {
      key: "owner",
      header: role === "user" ? "Penanggung Jawab" : "Pelapor",
      render: (ticket) => (role === "user" ? ticket.assignee?.full_name || "Belum ditugaskan" : ticket.creator?.full_name || "-"),
    },
    {
      key: "updated_at",
      header: "Update",
      render: (ticket) => formatDateTime(ticket.updated_at),
    },
    {
      key: "action",
      header: "Aksi",
      render: (ticket) => (
        <InlineActionButton icon={faArrowUpRightFromSquare} label="Lihat Detail" tone="primary" to={getTicketDetailPath(role, ticket.id)} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        mobileFloatingAction={
          canCreateTicket ? <ActionButton to="/user/tickets/create" label="Ajukan Tiket" icon={faPlus} tone="primary" /> : null
        }
        actions={
          canCreateTicket ? [
            <ActionButton
              key="create"
              to="/user/tickets/create"
              label="Ajukan Tiket"
              icon={faPlus}
              tone="primary"
            />,
          ] : null
        }
      />

      <FilterPanel
        title="Pencarian & Filter"
        description="Gunakan pencarian dan filter untuk menemukan tiket yang dibutuhkan dengan lebih cepat."
        actions={<ActionButton label="Atur Ulang Filter" icon={faRotateLeft} onClick={handleResetFilters} disabled={!hasActiveFilters} mobileIconOnly={false} />}
        mobileCollapsible
        contentClassName="grid gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-4 2xl:grid-cols-5"
      >
          <SearchInput
            className="sm:col-span-2"
            value={filters.query}
            onChange={(value) => updateFilter("query", value)}
            placeholder="Cari nomor tiket, judul, nama pelapor, atau kategori"
          />
          <FilterDropdown
            label="Status"
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
            options={statusFilterOptions}
          />
          <FilterDropdown
            label="Prioritas"
            value={filters.priority}
            onChange={(value) => updateFilter("priority", value)}
            options={priorityFilterOptions}
          />
          <FilterDropdown
            label="Kategori"
            value={filters.categoryId}
            onChange={(value) => updateFilter("categoryId", value)}
            options={categoryFilterOptions}
          />
          {role === "admin" ? (
            <FilterDropdown
              label="Teknisi"
              value={filters.assignedTo}
              onChange={(value) => updateFilter("assignedTo", value)}
              options={technicianFilterOptions}
            />
          ) : null}
          <FilterDropdown
            label="Departemen"
            value={filters.department}
            onChange={(value) => updateFilter("department", value)}
            options={departmentFilterOptions}
          />
          <FilterDropdown
            label="Urutan"
            value={filters.sortBy}
            onChange={(value) => updateFilter("sortBy", value)}
            options={sortOptions}
          />
      </FilterPanel>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Tiket</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{tickets.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Data Ditampilkan</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{pageRows.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Filter</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {hasActiveFilters ? "Filter aktif" : "Default"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Urutan: {sortOptions.find((option) => option.value === filters.sortBy)?.label}</p>
        </div>
      </div>

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
          emptyTitle="Belum ada tiket"
          emptyText="Belum ada tiket yang sesuai. Coba ubah filter atau ajukan tiket baru."
        />
      )}
    </div>
  );
}
