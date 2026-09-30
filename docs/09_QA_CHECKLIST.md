# 09. QA Assurance & Validation Checklist

Dokumen ini mendefinisikan kriteria penerimaan (*Acceptance Criteria*) dan proses validasi (QA) secara komprehensif setelah aplikasi dirombak menggunakan gaya desain baru (Apple-esque, Mobile-First).

## 1. UI/UX Validation (Mobile-First & Apple Design)
- [x] **Responsive Tab Navigation:** Di perangkat desktop, tab navigasi berbentuk *pill* di sebelah header. Di mobile, navigasi menggunakan *scrollable flex* di bawah header utama untuk kemudahan jempol.
- [x] **Glassmorphism Aesthetics:** Komponen seperti Header, Dropzone, dan Kartu Triage menggunakan `backdrop-blur-xl` dan latar belakang semi-transparan (`bg-white/70`).
- [x] **Multi-Tab Layout:** 
  - Tab "Dashboard" khusus untuk *upload data* dan metrik KPI.
  - Tab "Triage Center" khusus untuk mendaftar anomali (Critical/Warning).
- [x] **Dark Mode / Light Mode:** Transisi tema mulus tanpa *layout shift*. Toggle mode ditempatkan terpisah di header.
- [x] **No "UI Slop":** Mengurangi informasi *dense* di satu halaman statis. Memberikan ruang napas (padding luas, border tipis, bayangan halus).

## 2. Ingestion & Rule Engine Bug Hunt
Beberapa potensi *bug* dan penyelesaiannya selama masa validasi:
1. **Bug: Tabel Penuh dengan Data "SAFE"**
   - *Masalah:* AM kesulitan mencari anomali karena 95% data berstatus SAFE tercampur di tabel.
   - *Validasi Fix:* Tabel Triase secara hardcode hanya memunculkan `CRITICAL` dan `WARNING`.
2. **Bug: Eskalasi WA salah sasaran (Pricing vs Warehouse)**
   - *Masalah:* URL WhatsApp *generate* secara generik tanpa mempertimbangkan PIC.
   - *Validasi Fix:* Diperbaiki menggunakan abstraksi abstrak dari `src/engine/escalation.ts` yang me-routing isu `MARGIN_BLEED` ke nomor `waPricing` dan `OOS_RISK` ke `waWarehouse`.
3. **Bug: WhatsApp Number Tidak Tersimpan**
   - *Masalah:* AM harus mengetik nomor WA routing setiap kali *refresh* browser.
   - *Validasi Fix:* Memastikan hook `useLocalStorage` bekerja sinkron di dalam `SettingsPanel`.

## 3. Escalation Pipeline Validation
- [x] Klik pada "Escalate to PIC" memicu fungsi buka jendela baru (`window.open`).
- [x] Sistem langsung merubah *state* UI item tersebut menjadi *[Escalated]* (Meredup/Grayscale) agar AM lain tidak menekan tombol yang sama.
- [x] Tombol "Copy Shift Report" hanya merangkum baris dengan status CRITICAL dan WARNING ke dalam format teks seragam *Slack/WhatsApp ready*.

## 4. End-to-End Test Plan
Untuk memvalidasi prototipe siap pakai (*Day-0 readiness*):
1. Pengguna membuka URL di browser (tanpa login).
2. Pengguna mengonfigurasi Setting Routing PIC (di tab pengaturan/icon gir).
3. Pengguna menuju Dashboard dan klik tombol **Load Demo Data** atau *Drop* file CSV.
4. Alarm Bell Audio langsung menyala jika ada Margin Bleed berstatus *Critical*.
5. Pengguna pindah ke tab *Triage Center*, lalu merespons minimal 1 item `CRITICAL`.
6. Pengguna menekan tombol *Copy Shift Report* dan mengekspos datanya.

Semua pengujian pada daftar centang ini lulus 100% pada rilis *Apple-esque redesign*.
