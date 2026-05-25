import TicketListPage from "@/pages/common/TicketListPage";

const TECHNICIAN_ACTIVE_STATUSES = ["Assigned", "In Progress", "Waiting User"];

export default function ActiveTicketsPage() {
  return (
    <TicketListPage
      role="technician"
      title="Tiket Aktif"
      description="Fokus pada tiket berstatus Assigned, In Progress, dan Waiting User yang masih memerlukan tindak lanjut."
      defaultStatus="Assigned"
      statusWhitelist={TECHNICIAN_ACTIVE_STATUSES}
    />
  );
}
