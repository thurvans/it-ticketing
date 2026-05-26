import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  faChartLine,
  faCircleCheck,
  faHeadset,
  faListCheck,
  faPlus,
  faStar,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import ActionButton from "@/components/ui/ActionButton";
import PageHeader from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import PriorityBadge from "@/components/ui/PriorityBadge";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardData } from "@/services/ticketService";
import { formatDateTime, formatRelativeDue } from "@/utils/formatters";
import { getTicketDetailPath } from "@/utils/routeHelpers";

function formatHours(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(1)} jam`;
}

function formatRating(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(1)} / 5`;
}

function buildStatCards(role, stats) {
  if (role === "user") {
    return [
      { title: "Seluruh Tiket", value: stats.total, icon: faHeadset, tone: "primary" },
      { title: "Tiket Baru", value: stats.open, icon: faListCheck, tone: "warning" },
      { title: "Sedang Diproses", value: stats.inProgress, icon: faChartLine, tone: "primary" },
      { title: "Selesai Ditangani", value: stats.resolved, icon: faCircleCheck, tone: "success" },
      { title: "Sudah Ditutup", value: stats.closed, icon: faCircleCheck, tone: "neutral" },
    ];
  }

  if (role === "technician") {
    return [
      { title: "Tiket Ditangani", value: stats.total, icon: faHeadset, tone: "primary" },
      { title: "Menunggu Tindakan", value: stats.assigned, icon: faListCheck, tone: "warning" },
      { title: "Sedang Dikerjakan", value: stats.inProgress, icon: faChartLine, tone: "warning" },
      { title: "Menunggu Pengguna", value: stats.waitingUser, icon: faListCheck, tone: "primary" },
      { title: "Selesai Hari Ini", value: stats.completedToday, icon: faCircleCheck, tone: "success" },
      { title: "Melewati SLA", value: stats.overdue, icon: faTriangleExclamation, tone: "danger" },
    ];
  }

  return [
    { title: "Seluruh Tiket", value: stats.total, icon: faHeadset, tone: "primary" },
    { title: "Tiket Baru", value: stats.open, icon: faListCheck, tone: "warning" },
    { title: "Sedang Dikerjakan", value: stats.inProgress, icon: faChartLine, tone: "primary" },
    { title: "Selesai Ditangani", value: stats.resolved, icon: faCircleCheck, tone: "success" },
    { title: "Sudah Ditutup", value: stats.closed, icon: faCircleCheck, tone: "neutral" },
    { title: "Melewati SLA", value: stats.overdue, icon: faTriangleExclamation, tone: "danger" },
    {
      title: "Rata-rata Penyelesaian",
      value: formatHours(stats.avgResolutionHours),
      meta: "Rata-rata waktu hingga tiket selesai",
      icon: faStar,
      tone: "primary",
    },
  ];
}

function InsightBlock({ title, items }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="panel p-4 sm:p-5 lg:p-6">
      <div className="mb-5">
        <h2 className="section-title">{title}</h2>
      </div>

      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="font-semibold text-slate-950">{item.value}</span>
              </div>
            </div>
          ))
        ) : null}
      </div>
    </div>
  );
}

function TicketFocusBlock({ title, tickets, role }) {
  if (!tickets.length) {
    return null;
  }

  return (
    <div className="panel p-4 sm:p-5 lg:p-6">
      <div className="mb-5">
        <h2 className="section-title">{title}</h2>
      </div>

      <div className="space-y-3">
        {tickets.length ? (
          tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Link to={getTicketDetailPath(role, ticket.id)} className="text-sm font-semibold text-slate-950">
                      {ticket.ticket_number}
                    </Link>
                    <p className="text-sm text-slate-600">{ticket.title}</p>
                  </div>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <span className="text-xs text-slate-500">
                    SLA {ticket.sla_deadline ? formatRelativeDue(ticket.sla_deadline) : "-"}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardPage({ role, title, description }) {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const dashboardData = await getDashboardData(role, profile.id);
        setData(dashboardData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (profile?.id) {
      loadDashboard();
    }
  }, [profile?.id, role]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return <div className="panel p-6 text-sm text-rose-700">Ringkasan belum dapat dimuat.</div>;
  }

  const statCards = buildStatCards(role, data.stats);
  const showHighPriorityBlock = Boolean(data.highPriorityTickets?.length);
  const showNearSlaBlock = Boolean(data.nearSlaTickets?.length);
  const showOverdueBlock = Boolean(data.overdueTickets?.length);
  const hasSidePanels = showHighPriorityBlock || showNearSlaBlock || showOverdueBlock;
  const recentTickets = data.recentTickets || [];
  const recentTicketsPanel = (
    <div className="panel p-4 sm:p-5 lg:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="section-title">Tiket Terbaru</h2>
          <p className="section-copy mt-1">Perkembangan tiket terbaru yang masih aktif dipantau.</p>
        </div>
      </div>

      {recentTickets.length ? (
        <div className="space-y-3">
          {recentTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-white">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <Link to={getTicketDetailPath(role, ticket.id)} className="text-base font-semibold text-slate-950">
                    {ticket.ticket_number} / {ticket.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {ticket.category?.name || "Kategori"} / Update {formatDateTime(ticket.updated_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-800">Belum ada tiket terbaru</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Aktivitas tiket akan tampil di sini setelah ada pengajuan atau pembaruan layanan.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        mobileFloatingAction={
          role === "user" ? <ActionButton to="/user/tickets/create" label="Ajukan Tiket" icon={faPlus} tone="primary" /> : null
        }
        actions={
          role === "user"
            ? [
                <ActionButton key="create-ticket" to="/user/tickets/create" label="Ajukan Tiket" icon={faPlus} tone="primary" />,
              ]
            : null
        }
      />

      <div
        className={`grid gap-4 ${
          role === "user"
            ? "md:grid-cols-2 xl:grid-cols-5"
            : role === "admin"
              ? "md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7"
              : "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        }`}
      >
        {statCards.map((item) => (
          <StatCard
            key={item.title}
            title={item.title}
            value={item.value}
            meta={item.meta}
            icon={item.icon}
            tone={item.tone}
          />
        ))}
      </div>

      {hasSidePanels ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          {recentTicketsPanel}

          <div className="space-y-6">
            {showHighPriorityBlock ? (
              <div className="panel p-4 sm:p-5 lg:p-6">
                <div className="mb-5">
                  <h2 className="section-title">Perlu Perhatian</h2>
                  <p className="section-copy mt-1">Tiket prioritas tinggi yang sebaiknya ditangani lebih dulu.</p>
                </div>

                <div className="space-y-3">
                  {data.highPriorityTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-xl border border-slate-200 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{ticket.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{ticket.ticket_number}</p>
                        </div>
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {showNearSlaBlock ? (
              <TicketFocusBlock
                title="Mendekati Batas Layanan"
                tickets={data.nearSlaTickets || []}
                role={role}
              />
            ) : null}

            {showOverdueBlock ? (
              <TicketFocusBlock
                title="Melewati Batas Layanan"
                tickets={data.overdueTickets}
                role={role}
              />
            ) : null}
          </div>
        </div>
      ) : (
        recentTicketsPanel
      )}

      {role === "technician" ? (
        <div className="grid gap-6 xl:grid-cols-4">
          <InsightBlock
            title="Sebaran Status"
            items={data.byStatus}
          />
          <InsightBlock
            title="Sebaran Prioritas"
            items={data.byPriority}
          />
          <InsightBlock
            title="Tren Harian"
            items={data.trendDaily}
          />
          <InsightBlock
            title="Kinerja Penanganan"
            items={[
              { label: "Rata-rata penyelesaian", value: formatHours(data.stats.avgResolutionHours) },
              { label: "Rata-rata penilaian", value: formatRating(data.stats.avgRating) },
              { label: "Tiket melewati SLA", value: data.stats.overdue },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
