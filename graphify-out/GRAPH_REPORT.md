# Graph Report - .  (2026-09-01)

## Corpus Check
- Corpus is ~12,911 words - fits in a single context window. You may not need a graph.

## Summary
- 206 nodes · 285 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 64% EXTRACTED · 34% INFERRED · 2% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.91)
- Token cost: 187,000 input · 0 output

## Community Hubs (Navigation)
- Pipeline Ekstraksi & Konfirmasi
- Tata Kelola Proyek & Konteks Lomba
- Aturan Inti & Penegakannya
- Modal per Produk & Temuan Pertama
- Keputusan Arsitektur & Alasannya
- Deteksi Produk Merugi & Pencocokan Nama
- Pesanan Masuk & Pencegahan Rugi
- Setup Perkakas Tim
- Kontrak Frontend-Backend
- Manajemen Waktu & Batasan Lomba
- Autentikasi & Profil Pengguna
- Kebijakan WhatsApp
- Pembagian Kerja Tim
- Aturan Harga Katalog

## God Nodes (most connected - your core abstractions)
1. `LLM Tidak Pernah Menghitung` - 12 edges
2. `Rumus SQL: Modal per Produk` - 12 edges
3. `Tabel produk` - 9 edges
4. `Fitur 9 — Pesanan Masuk` - 8 edges
5. `Tahap 1 — Foto Buku Catatan ke Transaksi (Gemini Vision)` - 8 edges
6. `Aturan 1 — LLM tidak pernah menghitung` - 7 edges
7. `Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur` - 7 edges
8. `Tabel transaksi` - 7 edges
9. `Alur Onboarding 9 Layar (~90 detik)` - 7 edges
10. `Aturan 2 — Tidak ada yang tersimpan diam-diam` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Uang sebagai integer, bukan float` --semantically_similar_to--> `Aturan 1 — LLM tidak pernah menghitung`  [INFERRED] [semantically similar]
  backend/CLAUDE.md → CLAUDE.md
- `Layar temuan pertama` --semantically_similar_to--> `Temuan pertama di menit kedua`  [INFERRED] [semantically similar]
  frontend/CLAUDE.md → README.md
- `Test set foto asli yang sulit` --semantically_similar_to--> `Aturan khusus kode hasil AI`  [INFERRED] [semantically similar]
  backend/CLAUDE.md → CONTRIBUTING.md
- `Rumus hanya di SQL — satu sumber kebenaran` --semantically_similar_to--> `Hanya tipe dan konstanta, tidak ada logika`  [INFERRED] [semantically similar]
  backend/CLAUDE.md → shared/CLAUDE.md
- `Nama field snake_case bahasa Indonesia` --semantically_similar_to--> `Aturan UI untuk pengguna 35-60 tahun`  [INFERRED] [semantically similar]
  shared/CLAUDE.md → frontend/CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Alur ekstraksi foto buku sampai konfirmasi manusia** — readme_gemini_vision, readme_gemini_structured_output, backend_claude_skor_keyakinan_per_baris, backend_claude_tabel_ekstraksi, frontend_claude_layar_konfirmasi_ekstraksi, backend_claude_hapus_foto_mentah, claude_aturan_2 [INFERRED 0.85]
- **Penegakan aturan LLM/frontend tidak pernah menghitung** — claude_aturan_1, claude_aturan_7, backend_claude_llm_tidak_menghitung, backend_claude_sql_satu_sumber_kebenaran, frontend_claude_tidak_menghitung, shared_claude_hanya_tipe_tanpa_logika, contributing_cek_reviewer, _github_pull_request_template_checklist_aturan [EXTRACTED 1.00]
- **Kontrak API sebagai sumber kebenaran lintas tiga wilayah** — backend_claude_kontrak_api, shared_claude_tipe_bersama, shared_claude_nama_field_indonesia, frontend_claude_data_tiruan, frontend_claude_tipe_bersama, shared_claude_perubahan_wajib_dikabarkan [INFERRED 0.85]
- **Alur Ekstraksi Foto: Gemini Vision ke Konfirmasi ke SQL** — docs_04_pipeline_ai_tahap_1_foto_buku_catatan, docs_06_kontrak_api_post_ekstraksi_foto, docs_07_alur_pengguna_layar_konfirmasi, docs_06_kontrak_api_post_ekstraksi_id_konfirmasi, docs_05_model_data_tabel_ekstraksi, docs_05_model_data_tabel_transaksi, docs_03_arsitektur_tidak_ada_panah_gemini_ke_database [EXTRACTED 1.00]
- **Alur Temuan Pertama: Wawancara Resep ke Modal per Unit ke Layar Rugi** — docs_07_alur_pengguna_wawancara_resep_satu_produk, docs_06_kontrak_api_post_onboarding_resep, docs_05_model_data_rumus_modal_per_produk, docs_07_alur_pengguna_temuan_pertama, docs_01_produk_thesis_produk, docs_05_model_data_tabel_resep [EXTRACTED 1.00]
- **Alur Pesanan Masuk: Klasifikasi, Cek Margin, Cek Stok, Balasan Siap Salin** — docs_04_pipeline_ai_klasifikasi_pesanan_masuk, docs_06_kontrak_api_post_pesanan_analisis, docs_05_model_data_rumus_cek_margin_pesanan, docs_05_model_data_rumus_cek_kecukupan_bahan, docs_04_pipeline_ai_tahap_5_menyusun_balasan, docs_06_kontrak_api_post_pesanan_balasan, docs_03_arsitektur_whatsapp_tempel_teks_manual [EXTRACTED 1.00]

## Communities (14 total, 1 thin omitted)

### Community 0 - "Pipeline Ekstraksi & Konfirmasi"
Cohesion: 0.10
Nodes (29): Kenapa Aplikasi Pembukuan Lain Gagal, Solusi: Potret Buku Tulis, Jangan Suruh Pindah, Ekstraksi Foto: Titik Paling Rawan, Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur, Fitur 2 — Voice Note ke Transaksi, Fitur 4 — Layar Konfirmasi, Fitur 7 — Beranda: Omzet vs Untung Bersih, Tulang Punggung Demo (fitur 1, 4, 7, 9) (+21 more)

### Community 1 - "Tata Kelola Proyek & Konteks Lomba"
Cohesion: 0.08
Nodes (28): Template Laporan bug, Template Usulan fitur, GEMINI_API_KEY hanya di .env, Test set foto asli yang sulit, Urutan pengerjaan backend sesuai kebutuhan demo, Aturan pengorbanan — korbankan dari bawah, CREATHON 2026 (AI & Data untuk UMKM), graphify — knowledge graph repo (+20 more)

### Community 2 - "Aturan Inti & Penegakannya"
Cohesion: 0.11
Nodes (25): Checklist aturan yang perlu dicek reviewer, Template Pull Request, Foto mentah dihapus setelah dikonfirmasi, Backend: penegakan LLM tidak pernah menghitung, Skor keyakinan per baris (perlu_dicek, alasan_ragu), Rumus hanya di SQL — satu sumber kebenaran, Tabel ekstraksi status menunggu sebelum transaksi, Uang sebagai integer, bukan float (+17 more)

### Community 3 - "Modal per Produk & Temuan Pertama"
Cohesion: 0.12
Nodes (23): Jalur Baca per Peran (frontend, AI/backend, presenter, AI assistant), Kalau Dokumen dan Kode Berbeda, Perbaiki Dokumennya, Peta Baca Dokumentasi lapakAi, Thesis Produk: Berguna di Menit Kedua, Fitur 11 — Hitung Tenaga Sendiri sebagai Biaya, Fitur 5 — Hitung Modal per Produk dari Bahan, Biaya Tenaga Sendiri Masuk Rumus Modal, Rumus SQL: Modal per Produk (+15 more)

### Community 4 - "Keputusan Arsitektur & Alasannya"
Cohesion: 0.13
Nodes (22): Riset Pedagang (5 pedagang, 90 menit), Fitur 23 — Koneksi WhatsApp Otomatis (disarankan tidak dikerjakan), Tiga Hal yang Menentukan Menang, Isolasi Data di Level Query, Kenapa Bukan OCR Biasa, LLM Tidak Pernah Menghitung, Pembagian Model per Tahap, Platform: Web App Mobile-First (+14 more)

### Community 5 - "Deteksi Produk Merugi & Pencocokan Nama"
Cohesion: 0.13
Nodes (20): Masalah: Omzet Disamakan dengan Untung, Produk Paling Laku Justru Paling Merugikan, Fitur 10 — Tambah Produk Tanpa Form, Fitur 19 — Katalog Digital + Tombol wa.me, Fitur 6 — Deteksi Produk Merugi, Fitur 8 — Saran Perbaikan Harga, Katalog: Cerminan Hidup, Bukan Halaman Statis, Keterlacakan Angka sampai Baris Sumber (+12 more)

### Community 6 - "Pesanan Masuk & Pencegahan Rugi"
Cohesion: 0.15
Nodes (17): Kata Kunci 'Sebelum': Cegat Kerugian Sebelum Terjadi, Fitur 12 — Stok sebagai Pemeriksaan Silang, Fitur 15 — Tampilkan QRIS saat Pesanan Diterima, Fitur 3 — Ketik Manual, Fitur 9 — Pesanan Masuk, Klasifikasi Chat Pesanan Masuk (pesanan, tanya harga, menawar, bukan pesanan), Penanganan Kegagalan Pipeline (jalan keluar tiap tahap), Prinsip: Keluaran Selalu JSON Terstruktur (+9 more)

### Community 7 - "Setup Perkakas Tim"
Cohesion: 0.22
Nodes (11): Tanya Knowledge Graph Sebelum Menjelajah Kode, GEMINI_API_KEY Hanya di Backend, Kunci API Disimpan di .env, Aturan Git Anti-Bentrok (branch per kerjaan, merge sering), Konfigurasi Bersama .claude/settings.json, Daftar Periksa Setup Laptop, Setup .env dan GEMINI_API_KEY, graphify (paket graphifyy) (+3 more)

### Community 8 - "Kontrak Frontend-Backend"
Cohesion: 0.20
Nodes (10): Kontrak API sebagai sumber kebenaran backend, Setiap query menyertakan user_id di WHERE, Aturan 3 — Jangan pernah minta email atau password, Aturan 6 — Web mobile-first, bukan aplikasi native, Aturan UI untuk pengguna 35-60 tahun, Mulai dengan data tiruan sesuai kontrak API, Frontend memakai tipe dari shared/, Platform web app mobile-first (+2 more)

### Community 9 - "Manajemen Waktu & Batasan Lomba"
Cohesion: 0.25
Nodes (8): Aturan Pengorbanan: Korbankan dari Bawah, POST /auth/otp/kirim, Mode Demo: OTP Di-bypass (kode 123456), Batasan yang Sengaja Tidak Dikerjakan untuk Lomba, Mode Demo OTP untuk Lomba, Freeze 45 Menit Sebelum Deadline, Aturan −3 Jam: Berhenti Menambah Fitur, Ritme Waktu 24 Jam

### Community 10 - "Autentikasi & Profil Pengguna"
Cohesion: 0.47
Nodes (6): Nomor HP Jadi Identitas, Profil Pengguna: Pedagang Mikro Usia 35-60, POST /auth/otp/verifikasi, Autentikasi Nomor HP + OTP (alur layar), Autentikasi: Nomor HP + OTP, Tanpa Email dan Password, Sesi 90 Hari di localStorage, Tanpa Logout Otomatis

### Community 11 - "Kebijakan WhatsApp"
Cohesion: 0.67
Nodes (3): Aturan 4 — Sistem tidak pernah mengirim pesan ke nomor pembeli, Layar Pesanan Masuk, WhatsApp tempel teks manual

### Community 12 - "Pembagian Kerja Tim"
Cohesion: 0.67
Nodes (3): Tipe TypeScript Hidup di shared/, Kepemilikan Folder (frontend/, backend/, shared/, docs/), Pembagian Peran Tim (2 frontend, 1 AI/backend)

## Ambiguous Edges - Review These
- `Aturan 3 — Jangan pernah minta email atau password` → `Setiap query menyertakan user_id di WHERE`  [AMBIGUOUS]
  backend/CLAUDE.md · relation: conceptually_related_to
- `Fitur 8 — Saran Perbaikan Harga` → `Rumus SQL: Produk Merugi Diurutkan dari Margin Terendah`  [AMBIGUOUS]
  docs/06-kontrak-api.md · relation: shares_data_with
- `Fitur 8 — Saran Perbaikan Harga` → `Layar Detail Produk`  [AMBIGUOUS]
  docs/07-alur-pengguna.md · relation: implements
- `Fitur 10 — Tambah Produk Tanpa Form` → `Tahap 4 — Pencocokan Nama Produk (Gemini Embedding)`  [AMBIGUOUS]
  docs/02-fitur-prioritas.md · relation: conceptually_related_to
- `Fitur 15 — Tampilkan QRIS saat Pesanan Diterima` → `POST /pesanan/analisis`  [AMBIGUOUS]
  docs/02-fitur-prioritas.md · relation: conceptually_related_to
- `Fitur 19 — Katalog Digital + Tombol wa.me` → `GET /produk`  [AMBIGUOUS]
  docs/03-arsitektur.md · relation: shares_data_with

## Knowledge Gaps
- **23 isolated node(s):** `CREATHON 2026 (AI & Data untuk UMKM)`, `Stack lapakAi (React/Vite, Node/Express, PostgreSQL, Gemini)`, `Konvensi commit (prefix Inggris, deskripsi Indonesia)`, `Gemini audio native — catatan suara`, `Gemini embedding + ambang keyakinan — pencocokan nama produk` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Aturan 3 — Jangan pernah minta email atau password` and `Setiap query menyertakan user_id di WHERE`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Fitur 8 — Saran Perbaikan Harga` and `Rumus SQL: Produk Merugi Diurutkan dari Margin Terendah`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `Fitur 8 — Saran Perbaikan Harga` and `Layar Detail Produk`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **What is the exact relationship between `Fitur 10 — Tambah Produk Tanpa Form` and `Tahap 4 — Pencocokan Nama Produk (Gemini Embedding)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Fitur 15 — Tampilkan QRIS saat Pesanan Diterima` and `POST /pesanan/analisis`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Fitur 19 — Katalog Digital + Tombol wa.me` and `GET /produk`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **Why does `Rumus SQL: Modal per Produk` connect `Modal per Produk & Temuan Pertama` to `Pipeline Ekstraksi & Konfirmasi`, `Keputusan Arsitektur & Alasannya`, `Deteksi Produk Merugi & Pencocokan Nama`, `Pesanan Masuk & Pencegahan Rugi`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._