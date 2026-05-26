import TicketListPage from "@/pages/common/TicketListPage";

export default function AssignedTicketsPage() {
  return (
    <TicketListPage
      role="technician"
      title="Tiket Ditugaskan"
      description="Lihat seluruh tiket yang menjadi tanggung jawab Anda beserta status, prioritas, dan pembaruan terakhir."
    />
  );
}
