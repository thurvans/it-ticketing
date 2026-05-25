import TicketListPage from "@/pages/common/TicketListPage";

export default function AdminTicketsPage() {
  return (
    <TicketListPage
      role="admin"
      title="Semua Tiket"
      description="Kelola seluruh tiket lintas pengguna, kategori, prioritas, dan teknisi dari satu tempat."
    />
  );
}
