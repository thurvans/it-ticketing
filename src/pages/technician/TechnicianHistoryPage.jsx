import TicketListPage from "@/pages/common/TicketListPage";

const TECHNICIAN_HISTORY_STATUSES = ["Resolved", "Closed", "Rejected"];

export default function TechnicianHistoryPage() {
  return (
    <TicketListPage
      role="technician"
      title="Riwayat Tiket"
      description="Tinjau tiket berstatus Resolved, Closed, atau Rejected sebagai referensi penanganan sebelumnya."
      statusWhitelist={TECHNICIAN_HISTORY_STATUSES}
    />
  );
}
