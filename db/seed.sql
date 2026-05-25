begin;

truncate table
  auth_accounts,
  role_permissions,
  system_settings,
  ticket_comment_attachments,
  ticket_attachments,
  ticket_logs,
  notifications,
  ticket_comments,
  tickets,
  announcements,
  audit_logs,
  sla_settings,
  ticket_categories,
  profiles
restart identity cascade;

insert into profiles (
  id, full_name, email, role, department, position, specialization, phone, is_active, created_at, updated_at
)
values
  ('100001', 'Rina Saputra', 'user@itticketing.local', 'user', 'Finance', 'Accounting Staff', null, '0812-1000-1000', true, '2026-04-01T08:00:00.000Z', '2026-04-23T10:00:00.000Z'),
  ('100002', 'Budi Hartono', 'user2@itticketing.local', 'user', 'Sales', 'Sales Executive', null, '0812-2000-2000', true, '2026-04-02T08:00:00.000Z', '2026-04-23T10:00:00.000Z'),
  ('200001', 'Arif Pratama', 'technician@itticketing.local', 'technician', 'IT Operations', 'Support Engineer', 'Hardware & Network', '0813-1000-1000', true, '2026-04-01T07:30:00.000Z', '2026-04-24T09:00:00.000Z'),
  ('200002', 'Maya Lestari', 'technician2@itticketing.local', 'technician', 'IT Applications', 'Application Support', 'Business Apps & Email', '0813-2000-2000', true, '2026-04-01T07:45:00.000Z', '2026-04-24T09:00:00.000Z'),
  ('300001', 'Dewi Lestari', 'admin@itticketing.local', 'admin', 'IT Management', 'IT Service Desk Lead', null, '0814-1000-1000', true, '2026-03-28T08:00:00.000Z', '2026-04-24T09:00:00.000Z'),
  ('400001', 'Fajar Nugroho', 'superadmin@itticketing.local', 'super_admin', 'Corporate IT', 'Head of IT Governance', null, '0815-1000-1000', true, '2026-03-20T08:00:00.000Z', '2026-04-24T09:00:00.000Z');

insert into auth_accounts (
  id, profile_id, email, password_hash, created_at, updated_at
)
-- Password awal seluruh akun seed: demo12345
values
  ('100001-account', '100001', 'user@itticketing.local', '$2a$10$s9JKzu3D3A8rCX37mT9g3OD0i9ZjbfmrC.0iJFQ0E86iZJZWG3OOW', now(), now()),
  ('100002-account', '100002', 'user2@itticketing.local', '$2a$10$s9JKzu3D3A8rCX37mT9g3OD0i9ZjbfmrC.0iJFQ0E86iZJZWG3OOW', now(), now()),
  ('200001-account', '200001', 'technician@itticketing.local', '$2a$10$s9JKzu3D3A8rCX37mT9g3OD0i9ZjbfmrC.0iJFQ0E86iZJZWG3OOW', now(), now()),
  ('200002-account', '200002', 'technician2@itticketing.local', '$2a$10$s9JKzu3D3A8rCX37mT9g3OD0i9ZjbfmrC.0iJFQ0E86iZJZWG3OOW', now(), now()),
  ('300001-account', '300001', 'admin@itticketing.local', '$2a$10$s9JKzu3D3A8rCX37mT9g3OD0i9ZjbfmrC.0iJFQ0E86iZJZWG3OOW', now(), now()),
  ('400001-account', '400001', 'superadmin@itticketing.local', '$2a$10$s9JKzu3D3A8rCX37mT9g3OD0i9ZjbfmrC.0iJFQ0E86iZJZWG3OOW', now(), now());

insert into ticket_categories (
  id, name, description, is_active, sort_order, created_at, updated_at
)
values
  ('cat-hardware', 'Hardware', 'Masalah laptop, PC, monitor, perangkat input, dan komponen fisik.', true, 1, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('cat-software', 'Software', 'Masalah instalasi, bug aplikasi, dan lisensi software.', true, 2, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('cat-network', 'Network', 'Gangguan Wi-Fi, LAN, VPN, internet, dan koneksi internal.', true, 3, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('cat-email', 'Email', 'Gangguan Outlook, sinkronisasi email, dan mail delivery.', true, 4, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('cat-printer', 'Printer', 'Kendala printer kantor, scanner, dan antrean cetak.', true, 5, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('cat-access', 'Account Access', 'Masalah login, permission aplikasi, dan akses folder shared.', true, 6, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('cat-security', 'Security', 'Insiden keamanan, phishing, dan kebutuhan hardening akses.', true, 7, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z');

insert into sla_settings (
  id, priority, response_time_hours, resolution_time_hours, is_active, created_at, updated_at
)
values
  ('sla-low', 'Low', 8, 72, true, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('sla-medium', 'Medium', 4, 48, true, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('sla-high', 'High', 2, 24, true, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z'),
  ('sla-critical', 'Critical', 1, 4, true, '2026-04-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z');

insert into system_settings (key, value)
values
  ('display_name', '"IT Ticketing Workspace"'::jsonb),
  ('logo_url', '""'::jsonb),
  ('allow_self_registration', 'true'::jsonb),
  ('attachment_limit_mb', '5'::jsonb),
  ('enable_realtime_notifications', 'true'::jsonb),
  ('enable_email_notifications', 'false'::jsonb),
  ('default_report_group_by', '"daily"'::jsonb);

insert into role_permissions (role, permission_key, is_allowed)
values
  ('user', 'dashboard_access', true),
  ('user', 'ticket_create', true),
  ('user', 'ticket_comment', true),
  ('user', 'ticket_update_status', false),
  ('user', 'ticket_assign', false),
  ('user', 'ticket_delete', false),
  ('user', 'user_management', false),
  ('user', 'technician_management', false),
  ('user', 'category_management', false),
  ('user', 'sla_management', false),
  ('user', 'announcement_management', false),
  ('user', 'report_access', false),
  ('user', 'audit_log_access', false),
  ('user', 'system_settings_manage', false),
  ('user', 'role_management', false),
  ('user', 'permission_management', false),
  ('technician', 'dashboard_access', true),
  ('technician', 'ticket_create', false),
  ('technician', 'ticket_comment', true),
  ('technician', 'ticket_update_status', true),
  ('technician', 'ticket_assign', false),
  ('technician', 'ticket_delete', false),
  ('technician', 'user_management', false),
  ('technician', 'technician_management', false),
  ('technician', 'category_management', false),
  ('technician', 'sla_management', false),
  ('technician', 'announcement_management', false),
  ('technician', 'report_access', false),
  ('technician', 'audit_log_access', false),
  ('technician', 'system_settings_manage', false),
  ('technician', 'role_management', false),
  ('technician', 'permission_management', false),
  ('admin', 'dashboard_access', true),
  ('admin', 'ticket_create', false),
  ('admin', 'ticket_comment', true),
  ('admin', 'ticket_update_status', true),
  ('admin', 'ticket_assign', true),
  ('admin', 'ticket_delete', true),
  ('admin', 'user_management', true),
  ('admin', 'technician_management', true),
  ('admin', 'category_management', true),
  ('admin', 'sla_management', true),
  ('admin', 'announcement_management', true),
  ('admin', 'report_access', true),
  ('admin', 'audit_log_access', true),
  ('admin', 'system_settings_manage', false),
  ('admin', 'role_management', false),
  ('admin', 'permission_management', false),
  ('super_admin', 'dashboard_access', true),
  ('super_admin', 'ticket_create', true),
  ('super_admin', 'ticket_comment', true),
  ('super_admin', 'ticket_update_status', true),
  ('super_admin', 'ticket_assign', true),
  ('super_admin', 'ticket_delete', true),
  ('super_admin', 'user_management', true),
  ('super_admin', 'technician_management', true),
  ('super_admin', 'category_management', true),
  ('super_admin', 'sla_management', true),
  ('super_admin', 'announcement_management', true),
  ('super_admin', 'report_access', true),
  ('super_admin', 'audit_log_access', true),
  ('super_admin', 'system_settings_manage', true),
  ('super_admin', 'role_management', true),
  ('super_admin', 'permission_management', true);

insert into announcements (
  id, title, content, is_active, start_date, end_date, created_by, created_at, updated_at
)
values
  ('ann-001', 'Maintenance Firewall Kantor Pusat', 'Pemeliharaan perangkat firewall dijadwalkan pada 27 April 2026 pukul 22:00 - 23:30 WIB. Akses VPN dan internet cabang dapat mengalami reconnect singkat.', true, '2026-04-25T00:00:00.000Z', '2026-04-28T00:00:00.000Z', '300001', '2026-04-24T08:00:00.000Z', '2026-04-24T08:00:00.000Z'),
  ('ann-002', 'Waspada Email Phishing Eksternal', 'Tim keamanan menerima laporan email palsu bertema update payroll. Jangan klik tautan dari pengirim tak dikenal dan laporkan ke tim IT Security.', true, '2026-04-20T00:00:00.000Z', '2026-05-05T00:00:00.000Z', '400001', '2026-04-20T09:30:00.000Z', '2026-04-20T09:30:00.000Z');

insert into tickets (
  id, ticket_number, title, description, category_id, priority, status, created_by, assigned_to,
  department, location, contact_number, sla_deadline, resolved_at, closed_at, rating, feedback, created_at, updated_at
)
values
  ('ticket-001', 'TIKET-202604-0001', 'Baterai laptop cepat habis dan sering drop', 'Laptop kantor hanya bertahan sekitar 20 menit setelah dicabut dari charger. Sudah dicoba kalibrasi namun tetap drop dan perangkat menjadi panas.', 'cat-hardware', 'Medium', 'Open', '100001', null, 'Finance', 'Jakarta HQ - Lantai 5', '0812-1000-1000', '2026-04-27T08:00:00.000Z', null, null, null, null, '2026-04-25T01:00:00.000Z', '2026-04-25T01:00:00.000Z'),
  ('ticket-002', 'TIKET-202604-0002', 'Tidak bisa akses shared folder finance', 'Folder finance di file server menampilkan akses ditolak sejak pagi. Tim perlu akses untuk closing bulanan dan pekerjaan tertunda.', 'cat-access', 'High', 'Assigned', '100001', '200001', 'Finance', 'Jakarta HQ - Lantai 5', '0812-1000-1000', '2026-04-25T15:00:00.000Z', null, null, null, null, '2026-04-24T05:15:00.000Z', '2026-04-24T06:00:00.000Z'),
  ('ticket-003', 'TIKET-202604-0003', 'Outlook tidak sinkron email baru', 'Aplikasi Outlook desktop berhenti menarik email sejak semalam. Webmail normal, namun attachment dan kalender tidak sinkron di desktop.', 'cat-email', 'Medium', 'In Progress', '100002', '200002', 'Sales', 'Bandung Branch', '0812-2000-2000', '2026-04-26T08:00:00.000Z', null, null, null, null, '2026-04-24T08:30:00.000Z', '2026-04-25T02:00:00.000Z'),
  ('ticket-004', 'TIKET-202604-0004', 'Printer accounting muncul paper jam padahal kosong', 'Printer utama di accounting terus menampilkan error paper jam walaupun tray sudah dibersihkan. Tiga user tidak bisa mencetak invoice.', 'cat-printer', 'Low', 'Waiting User', '100001', '200001', 'Finance', 'Jakarta HQ - Lantai 5', '0812-1000-1000', '2026-04-28T09:00:00.000Z', null, null, null, null, '2026-04-23T07:40:00.000Z', '2026-04-24T11:45:00.000Z'),
  ('ticket-005', 'TIKET-202604-0005', 'Akses ERP purchasing hilang setelah reset password', 'Setelah reset password SSO, user tidak lagi memiliki akses modul purchasing pada ERP. Error muncul saat membuka menu approval.', 'cat-access', 'Critical', 'Resolved', '100002', '200002', 'Sales', 'Bandung Branch', '0812-2000-2000', '2026-04-24T06:00:00.000Z', '2026-04-24T05:15:00.000Z', null, 4, 'Sudah bisa dipakai lagi, tinggal monitoring.', '2026-04-24T01:00:00.000Z', '2026-04-24T05:20:00.000Z'),
  ('ticket-006', 'TIKET-202604-0006', 'VPN kantor sering terputus saat akses dashboard', 'Koneksi VPN putus setiap 15-20 menit sehingga akses dashboard BI terhenti. Sudah dicoba restart modem dan reconnect ulang.', 'cat-network', 'High', 'Closed', '100001', '200001', 'Finance', 'Remote / Home Office', '0812-1000-1000', '2026-04-23T08:00:00.000Z', '2026-04-23T06:00:00.000Z', '2026-04-23T08:20:00.000Z', 5, 'Jaringan kembali stabil setelah update profile VPN.', '2026-04-22T02:45:00.000Z', '2026-04-23T08:20:00.000Z'),
  ('ticket-007', 'TIKET-202604-0007', 'Permintaan instal software desain non-berlisensi', 'User meminta instalasi aplikasi desain yang tidak termasuk daftar lisensi perusahaan. Permintaan ditolak sesuai kebijakan software governance.', 'cat-software', 'Low', 'Rejected', '100002', null, 'Sales', 'Bandung Branch', '0812-2000-2000', '2026-04-29T08:00:00.000Z', null, null, null, null, '2026-04-25T03:00:00.000Z', '2026-04-25T04:00:00.000Z');

insert into ticket_attachments (
  id, ticket_id, uploaded_by, file_name, file_url, file_type, file_size, created_at
)
values
  ('att-001', 'ticket-001', null, 'battery-warning.png', '#', 'image/png', 532000, '2026-04-25T01:00:00.000Z');

insert into ticket_comments (
  id, ticket_id, user_id, comment, is_internal, created_at
)
values
  ('comment-001', 'ticket-002', '300001', 'Tiket diteruskan ke Arif karena berkaitan dengan permission file server.', true, '2026-04-24T06:00:00.000Z'),
  ('comment-002', 'ticket-003', '200002', 'Profil Outlook sedang di-rebuild. Mohon user tetap gunakan webmail untuk sementara.', false, '2026-04-25T02:10:00.000Z'),
  ('comment-003', 'ticket-004', '200001', 'Mohon kirim foto error panel printer setelah tray dibersihkan.', false, '2026-04-24T11:45:00.000Z'),
  ('comment-004', 'ticket-005', '100002', 'Sudah bisa login ulang dan approval kembali muncul. Terima kasih.', false, '2026-04-24T05:18:00.000Z');

insert into ticket_logs (
  id, ticket_id, user_id, action, old_value, new_value, description, created_at
)
values
  ('log-001', 'ticket-002', '300001', 'assigned', 'null', '200001', 'Tiket di-assign ke Arif Pratama.', '2026-04-24T06:00:00.000Z'),
  ('log-002', 'ticket-003', '200002', 'status_change', 'Assigned', 'In Progress', 'Teknisi mulai menangani sinkronisasi Outlook.', '2026-04-25T02:00:00.000Z'),
  ('log-003', 'ticket-004', '200001', 'status_change', 'In Progress', 'Waiting User', 'Menunggu konfirmasi foto error panel printer dari user.', '2026-04-24T11:45:00.000Z'),
  ('log-004', 'ticket-005', '200002', 'status_change', 'In Progress', 'Resolved', 'Hak akses ERP dipulihkan dan cache role dibersihkan.', '2026-04-24T05:15:00.000Z'),
  ('log-005', 'ticket-006', '100001', 'ticket_closed', 'Resolved', 'Closed', 'User menutup tiket setelah memastikan VPN stabil.', '2026-04-23T08:20:00.000Z');

insert into notifications (
  id, user_id, title, message, type, is_read, related_ticket_id, created_at
)
values
  ('notif-001', '100001', 'Tiket di-assign', 'Tiket TIKET-202604-0002 telah di-assign ke Arif Pratama.', 'ticket_assigned', false, 'ticket-002', '2026-04-24T06:02:00.000Z'),
  ('notif-002', '200001', 'Tiket baru ditugaskan', 'Anda menerima tiket TIKET-202604-0002 dengan prioritas High.', 'assignment', false, 'ticket-002', '2026-04-24T06:02:00.000Z'),
  ('notif-003', '100002', 'Tiket selesai', 'Tiket TIKET-202604-0005 telah diubah ke status Resolved.', 'status_change', true, 'ticket-005', '2026-04-24T05:16:00.000Z'),
  ('notif-004', '300001', 'Tiket overdue', 'Ada 1 tiket High yang mendekati SLA deadline hari ini.', 'sla_warning', false, 'ticket-002', '2026-04-25T03:30:00.000Z');

insert into audit_logs (
  id, user_id, action, module, target_id, description, ip_address, created_at
)
values
  ('audit-001', '300001', 'assign_ticket', 'tickets', 'ticket-002', 'Assign tiket ke Arif Pratama.', '10.10.0.15', '2026-04-24T06:00:00.000Z'),
  ('audit-002', '200002', 'update_ticket_status', 'tickets', 'ticket-003', 'Status tiket diubah menjadi In Progress.', '10.10.1.40', '2026-04-25T02:00:00.000Z'),
  ('audit-003', '100001', 'close_ticket', 'tickets', 'ticket-006', 'User menutup tiket setelah validasi solusi.', '180.250.11.10', '2026-04-23T08:20:00.000Z'),
  ('audit-004', '400001', 'create_announcement', 'announcements', 'ann-002', 'Membuat pengumuman phishing awareness.', '10.10.0.2', '2026-04-20T09:30:00.000Z');

commit;
