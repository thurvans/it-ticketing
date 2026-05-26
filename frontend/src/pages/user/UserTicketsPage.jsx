import TicketListPage from "@/pages/common/TicketListPage";

export default function UserTicketsPage() {
  return (
    <TicketListPage
      role="user"
      title="Tiket Saya"
      description="Lihat seluruh tiket yang Anda ajukan beserta status, prioritas, dan riwayat pembaruannya."
      showCreateAction
    />
  );
}
