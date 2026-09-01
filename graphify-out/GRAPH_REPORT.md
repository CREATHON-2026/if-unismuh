# Graph Report - if-unismuh  (2026-09-02)

## Corpus Check
- 146 files · ~113,235 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 913 nodes · 1895 edges · 62 communities (55 shown, 7 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 130 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7572da92`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur
- lapakAi (produk)
- Aturan 1 — LLM tidak pernah menghitung
- Rumus SQL: Modal per Produk
- SambungWhatsApp.tsx
- Tabel produk
- devDependencies
- Daftar Periksa Setup Laptop
- Aturan UI untuk pengguna 35-60 tahun
- What You Must Do When Invoked
- JenisUsaha.tsx
- Aturan 4 — Sistem tidak pernah mengirim pesan ke nomor pembeli
- Kepemilikan Folder (frontend/, backend/, shared/, docs/)
- Aturan 5 — Harga di katalog = harga di aplikasi
- pesanan.service.ts
- dependencies
- compilerOptions
- compilerOptions
- Peta Baca Dokumentasi lapakAi
- siapkan-demo.mjs
- schema.sql
- Rumus SQL: Produk Merugi Diurutkan dari Margin Terendah
- Fitur 9 — Pesanan Masuk
- Kriteria Foto Buku Catatan
- ekstraksi-foto.mjs
- uji-beranda.mjs
- uji-produk.mjs
- uji-stok-balasan.mjs
- Spike: ekstraksi foto buku catatan
- LLM Tidak Pernah Menghitung
- Cara kerja tim + AI (branch, PR, review manusia)
- uji-suara.mjs
- uji-ekstraksi.mjs
- Aturan pengorbanan — korbankan dari bawah
- Template Pull Request
- Tulang Punggung Demo (fitur 1, 4, 7, 9)
- uji-pesanan.mjs
- graphify reference: extra exports and benchmark
- Aturan Pengorbanan: Korbankan dari Bawah
- graphify reference: query, path, explain
- Tahap 3 — Ekstraksi Terstruktur
- Kontrak API sebagai sumber kebenaran backend
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md
- types.ts
- CatatSuara.tsx
- Beranda.tsx
- panggil
- Isolasi di Level Query, Bukan Level Tampilan
- index.ts
- kirim
- App.tsx
- wa.client.ts
- transaksi.llm.ts
- PesananMasuk.tsx

## God Nodes (most connected - your core abstractions)
1. `kirim()` - 35 edges
2. `panggil()` - 20 edges
3. `satu()` - 19 edges
4. `GalatTampil` - 19 edges
5. `Layar()` - 19 edges
6. `KODE_GALAT` - 18 edges
7. `formatRupiah()` - 17 edges
8. `Tombol()` - 15 edges
9. `compilerOptions` - 15 edges
10. `query()` - 14 edges

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

## Communities (62 total, 7 thin omitted)

### Community 0 - "Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur"
Cohesion: 0.14
Nodes (18): Kenapa Aplikasi Pembukuan Lain Gagal, Solusi: Potret Buku Tulis, Jangan Suruh Pindah, Ekstraksi Foto: Titik Paling Rawan, Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur, Fitur 2 — Voice Note ke Transaksi, Fitur 4 — Layar Konfirmasi, Prinsip: Gambar Mentah Dihapus Setelah Dikonfirmasi, Skema Baris Ekstraksi (nama_mentah, jumlah, harga_satuan, keyakinan, alasan_ragu) (+10 more)

### Community 1 - "lapakAi (produk)"
Cohesion: 0.18
Nodes (12): Urutan pengerjaan backend sesuai kebutuhan demo, CREATHON 2026 (AI & Data untuk UMKM), Konvensi commit (prefix Inggris, deskripsi Indonesia), lapakAi (produk), Masalah: omzet disamakan dengan untung, Stack lapakAi (React/Vite, Node/Express, PostgreSQL, Gemini), Konvensi branch (feat/fix/docs/chore), Pesan commit yang menjelaskan ke rekan tim (+4 more)

### Community 2 - "Aturan 1 — LLM tidak pernah menghitung"
Cohesion: 0.19
Nodes (15): Checklist aturan yang perlu dicek reviewer, Foto mentah dihapus setelah dikonfirmasi, Skor keyakinan per baris (perlu_dicek, alasan_ragu), Rumus hanya di SQL — satu sumber kebenaran, Tabel ekstraksi status menunggu sebelum transaksi, Aturan 1 — LLM tidak pernah menghitung, Aturan 2 — Tidak ada yang tersimpan diam-diam, Aturan 7 — Frontend tidak pernah menghitung untung atau margin (+7 more)

### Community 3 - "Rumus SQL: Modal per Produk"
Cohesion: 0.18
Nodes (16): Thesis Produk: Berguna di Menit Kedua, Fitur 11 — Hitung Tenaga Sendiri sebagai Biaya, Fitur 5 — Hitung Modal per Produk dari Bahan, Biaya Tenaga Sendiri Masuk Rumus Modal, Rumus SQL: Modal per Produk, Tabel bahan, Tabel resep, POST /onboarding/resep (+8 more)

### Community 4 - "SambungWhatsApp.tsx"
Cohesion: 0.33
Nodes (5): hubungkanWhatsapp(), statusWhatsapp(), InputTeks(), LABEL, SambungWhatsApp()

### Community 5 - "Tabel produk"
Cohesion: 0.32
Nodes (8): Fitur 10 — Tambah Produk Tanpa Form, Keterlacakan Angka sampai Baris Sumber, Cadangan Pencocokan Tanpa Embedding (pg_trgm similarity), Tahap 4 — Pencocokan Nama Produk (Gemini Embedding), Prinsip: Setiap Baris Menyimpan Asal-usulnya, Index idx_produk_nama_trgm (gin_trgm_ops), nama_mentah Disimpan untuk Penelusuran Pencocokan Salah, Tabel produk

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (34): dependencies, lucide-react, react, react-dom, react-qr-code, react-router-dom, devDependencies, tailwindcss (+26 more)

### Community 7 - "Daftar Periksa Setup Laptop"
Cohesion: 0.22
Nodes (11): Tanya Knowledge Graph Sebelum Menjelajah Kode, GEMINI_API_KEY Hanya di Backend, Kunci API Disimpan di .env, Aturan Git Anti-Bentrok (branch per kerjaan, merge sering), Konfigurasi Bersama .claude/settings.json, Daftar Periksa Setup Laptop, Setup .env dan GEMINI_API_KEY, graphify (paket graphifyy) (+3 more)

### Community 8 - "Aturan UI untuk pengguna 35-60 tahun"
Cohesion: 0.33
Nodes (6): Setiap query menyertakan user_id di WHERE, Aturan 3 — Jangan pernah minta email atau password, Aturan 6 — Web mobile-first, bukan aplikasi native, Aturan UI untuk pengguna 35-60 tahun, Platform web app mobile-first, Nama field snake_case bahasa Indonesia

### Community 9 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 10 - "JenisUsaha.tsx"
Cohesion: 0.40
Nodes (4): simpanUsaha(), TitikLangkah(), JenisUsaha(), PILIHAN

### Community 11 - "Aturan 4 — Sistem tidak pernah mengirim pesan ke nomor pembeli"
Cohesion: 0.67
Nodes (3): Aturan 4 — Sistem tidak pernah mengirim pesan ke nomor pembeli, Layar Pesanan Masuk, WhatsApp tempel teks manual

### Community 12 - "Kepemilikan Folder (frontend/, backend/, shared/, docs/)"
Cohesion: 0.67
Nodes (3): Tipe TypeScript Hidup di shared/, Kepemilikan Folder (frontend/, backend/, shared/, docs/), Pembagian Peran Tim (2 frontend, 1 AI/backend)

### Community 14 - "pesanan.service.ts"
Cohesion: 0.06
Nodes (62): query(), coba(), FRASA_KOSONG, galatSementara(), isiPalsu(), JawabanOllama, kosongJadiNull(), llmSiap() (+54 more)

### Community 15 - "dependencies"
Cohesion: 0.04
Nodes (46): dependencies, cors, dotenv, @electric-sql/pglite, express, @google/genai, jsonwebtoken, pg (+38 more)

### Community 16 - "compilerOptions"
Cohesion: 0.09
Nodes (23): compilerOptions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+15 more)

### Community 17 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+10 more)

### Community 18 - "Peta Baca Dokumentasi lapakAi"
Cohesion: 0.16
Nodes (14): Jalur Baca per Peran (frontend, AI/backend, presenter, AI assistant), Kalau Dokumen dan Kode Berbeda, Perbaiki Dokumennya, Peta Baca Dokumentasi lapakAi, Nomor HP Jadi Identitas, Profil Pengguna: Pedagang Mikro Usia 35-60, Platform: Web App Mobile-First, Prinsip: Uang Disimpan sebagai Integer Rupiah, Bentuk Jawaban Baku (ok/data, ok/error) (+6 more)

### Community 19 - "siapkan-demo.mjs"
Cohesion: 0.14
Nodes (13): barisStok, hariIni, idProduk, JUAL_BULAN_INI, JUAL_BULAN_LALU, kelompok, masuk(), panggil() (+5 more)

### Community 20 - "schema.sql"
Cohesion: 0.41
Nodes (12): bahan, ekstraksi, pengguna, pesan_masuk, produk, resep, stok, transaksi (+4 more)

### Community 21 - "Rumus SQL: Produk Merugi Diurutkan dari Margin Terendah"
Cohesion: 0.20
Nodes (12): Masalah: Omzet Disamakan dengan Untung, Produk Paling Laku Justru Paling Merugikan, Fitur 19 — Katalog Digital + Tombol wa.me, Fitur 6 — Deteksi Produk Merugi, Fitur 8 — Saran Perbaikan Harga, Katalog: Cerminan Hidup, Bukan Halaman Statis, Rumus SQL: Produk Merugi Diurutkan dari Margin Terendah, Aturan Kontrak: Semua Angka Finansial Datang Sudah Jadi (+4 more)

### Community 22 - "Fitur 9 — Pesanan Masuk"
Cohesion: 0.25
Nodes (11): Kata Kunci 'Sebelum': Cegat Kerugian Sebelum Terjadi, Fitur 12 — Stok sebagai Pemeriksaan Silang, Fitur 15 — Tampilkan QRIS saat Pesanan Diterima, Fitur 9 — Pesanan Masuk, Klasifikasi Chat Pesanan Masuk (pesanan, tanya harga, menawar, bukan pesanan), Total Tulisan Pedagang Dipakai sebagai Pembanding, Rumus SQL: Cek Kecukupan Bahan (maks_unit), Rumus SQL: Cek Margin Pesanan Masuk (+3 more)

### Community 23 - "Kriteria Foto Buku Catatan"
Cohesion: 0.20
Nodes (9): 1. Jenis buku yang dicari, 2. Yang wajib ada di halamannya, 3. Kriteria teknis foto, 4. Berapa banyak, dan variasinya, 5. Yang ditanyakan ke pedagang selain foto, 6. Yang bikin demo menggigit, Daftar periksa sebelum pulang, Kenapa nomor 5 bernilai tinggi (+1 more)

### Community 24 - "ekstraksi-foto.mjs"
Cohesion: 0.33
Nodes (8): bacaSatuFoto(), daftarFoto(), laporkan(), main(), MIME, MODEL_URUT, rupiah(), SKEMA

### Community 26 - "uji-beranda.mjs"
Cohesion: 0.33
Nodes (4): KACANG, KRIPIK, panggil(), pedagangBaru()

### Community 29 - "Spike: ekstraksi foto buku catatan"
Cohesion: 0.29
Nodes (6): Cara menilai hasilnya, Jalankan, Kalau belum punya foto pedagang asli, Kalau hasilnya jelek, Spike: ekstraksi foto buku catatan, Yang sengaja TIDAK dilakukan skrip ini

### Community 30 - "LLM Tidak Pernah Menghitung"
Cohesion: 0.17
Nodes (17): Riset Pedagang (5 pedagang, 90 menit), Fitur 23 — Koneksi WhatsApp Otomatis (disarankan tidak dikerjakan), Tiga Hal yang Menentukan Menang, Kenapa Bukan OCR Biasa, LLM Tidak Pernah Menghitung, Pembagian Model per Tahap, WhatsApp: Tempel Teks Manual, Sistem Tidak Pernah Mengirim, Ambang Kemiripan 0,90 / 0,70 (+9 more)

### Community 31 - "Cara kerja tim + AI (branch, PR, review manusia)"
Cohesion: 0.18
Nodes (11): GEMINI_API_KEY hanya di .env, Backend: penegakan LLM tidak pernah menghitung, Test set foto asli yang sulit, Cara kerja tim + AI (branch, PR, review manusia), Aturan khusus kode hasil AI, Jangan pernah memanggil Gemini dari frontend, Gemini audio native — catatan suara, Gemini structured output — ekstraksi jadi JSON (+3 more)

### Community 33 - "uji-ekstraksi.mjs"
Cohesion: 0.20
Nodes (5): barisKacang, barisKripik, disunting, KACANG, KRIPIK

### Community 34 - "Aturan pengorbanan — korbankan dari bawah"
Cohesion: 0.60
Nodes (5): Template Laporan bug, Template Usulan fitur, Aturan pengorbanan — korbankan dari bawah, Prioritas fitur 1-10 / 11-15 / 16+, Freeze 45 menit sebelum deadline

### Community 35 - "Template Pull Request"
Cohesion: 0.29
Nodes (7): Template Pull Request, graphify — knowledge graph repo, Kepemilikan folder (frontend/backend/shared/docs), graphify update . setelah mengubah kode, Alur Pull Request (min 1 review, squash merge), Pembagian kerja per layar, bukan per lapisan, Perubahan di shared/ wajib dikabarkan

### Community 36 - "Tulang Punggung Demo (fitur 1, 4, 7, 9)"
Cohesion: 0.20
Nodes (12): Fitur 7 — Beranda: Omzet vs Untung Bersih, Tulang Punggung Demo (fitur 1, 4, 7, 9), Alur Data: Gemini ke Konfirmasi ke PostgreSQL ke API Express, Tidak Ada Panah dari Gemini Langsung ke Database, Prinsip: Di Bawah Ambang Ditandai, Tidak Dibuang, Tidak Disimpan Diam-diam, Rumus SQL: Omzet vs Untung Bersih, GET /beranda, Layar Beranda (omzet dan untung bersih bersebelahan) (+4 more)

### Community 37 - "uji-pesanan.mjs"
Cohesion: 0.60
Nodes (3): panggil(), rupiah(), uji()

### Community 38 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 40 - "Aturan Pengorbanan: Korbankan dari Bawah"
Cohesion: 0.25
Nodes (8): Aturan Pengorbanan: Korbankan dari Bawah, POST /auth/otp/kirim, Mode Demo: OTP Di-bypass (kode 123456), Batasan yang Sengaja Tidak Dikerjakan untuk Lomba, Mode Demo OTP untuk Lomba, Freeze 45 Menit Sebelum Deadline, Aturan −3 Jam: Berhenti Menambah Fitur, Ritme Waktu 24 Jam

### Community 41 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 42 - "Tahap 3 — Ekstraksi Terstruktur"
Cohesion: 0.40
Nodes (6): Fitur 3 — Ketik Manual, Penanganan Kegagalan Pipeline (jalan keluar tiap tahap), Prinsip: Keluaran Selalu JSON Terstruktur, Tahap 3 — Ekstraksi Terstruktur, Kode Galat Baku (TIDAK_TERAUTENTIKASI, EKSTRAKSI_GAGAL, dll), Tiga Jalan Masuk Pencatatan: Foto, Suara, Ketik

### Community 43 - "Kontrak API sebagai sumber kebenaran backend"
Cohesion: 0.29
Nodes (7): Kontrak API sebagai sumber kebenaran backend, Uang sebagai integer, bukan float, Mulai dengan data tiruan sesuai kontrak API, Frontend tidak pernah menghitung angka finansial, Frontend memakai tipe dari shared/, format/rupiah.ts — pemformat tampilan, Tipe TypeScript bersama frontend dan backend

### Community 44 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 45 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 46 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 50 - "types.ts"
Cohesion: 0.09
Nodes (36): konfirmasiEkstraksi(), pratinjauEkstraksi(), KonfirmasiEkstraksi(), bacaEkstraksi(), hapusEkstraksi(), tulisEkstraksi(), AnalisisPesanan, AnalisisPesananReq (+28 more)

### Community 52 - "CatatSuara.tsx"
Cohesion: 0.18
Nodes (14): ekstraksiFoto(), usulanDariTeks(), KartuHero(), KepalaAplikasi(), buatPengenal(), CatatSuara(), PengenalSuara, DaftarProduk() (+6 more)

### Community 53 - "Beranda.tsx"
Cohesion: 0.15
Nodes (15): ambilDaftarProduk(), ambilDetailProduk(), BarisDaftar(), KartuDaftar(), BarProgres(), GridMetrik(), KartuMetrik(), KeadaanGalat() (+7 more)

### Community 54 - "panggil"
Cohesion: 0.18
Nodes (13): ambilBeranda(), ambilSaya(), catatTransaksi(), daftarPesanan(), kirimOtp(), panggil(), simpanResep(), verifikasiOtp() (+5 more)

### Community 55 - "Isolasi di Level Query, Bukan Level Tampilan"
Cohesion: 1.00
Nodes (3): Isolasi Data di Level Query, Prinsip: Setiap Tabel Milik Pengguna Punya user_id, Isolasi di Level Query, Bukan Level Tampilan

### Community 57 - "index.ts"
Cohesion: 0.08
Nodes (42): DB_DIR, DIR, Pelaksana, satu(), SCHEMA, siapkanDb(), transaksiDb(), buatToken() (+34 more)

### Community 59 - "kirim"
Cohesion: 0.06
Nodes (74): AKAR_REPO, periksaEnv(), PORT, tutupDb(), GalatTampil, jalur(), kirim(), kirimGalat() (+66 more)

### Community 61 - "App.tsx"
Cohesion: 0.19
Nodes (14): KepalaResep(), Layar(), LogoIkon(), Tombol(), InfoWhatsApp(), NamaUsaha(), NomorHp(), ProdukTerlaris() (+6 more)

### Community 65 - "wa.client.ts"
Cohesion: 0.27
Nodes (11): alasanDilewati(), ambilTeks(), DIR, hubungkanWhatsapp(), PEMILIK_PATH, pulihkanWhatsapp(), samarkan(), statusKini() (+3 more)

### Community 66 - "transaksi.llm.ts"
Cohesion: 0.23
Nodes (11): ADA_BILANGAN, angkaDiTeks(), bangunPrompt(), BarisModel, BUKAN_BARANG, ekstrakBarisPenjualan(), HasilEkstraksi, saringBaris() (+3 more)

### Community 67 - "PesananMasuk.tsx"
Cohesion: 0.24
Nodes (8): analisisPesanan(), buatBalasan(), GAYA, Lencana(), NadaLencana, MAKSUD, PesananMasuk(), waktuSingkat()

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
- **212 isolated node(s):** `name`, `version`, `private`, `type`, `spike` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
- **Why does `Rumus SQL: Modal per Produk` connect `Rumus SQL: Modal per Produk` to `Tulang Punggung Demo (fitur 1, 4, 7, 9)`, `Tabel produk`, `Peta Baca Dokumentasi lapakAi`, `Rumus SQL: Produk Merugi Diurutkan dari Margin Terendah`, `Fitur 9 — Pesanan Masuk`, `LLM Tidak Pernah Menghitung`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._