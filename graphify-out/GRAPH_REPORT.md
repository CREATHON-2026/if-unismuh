# Graph Report - if-unismuh  (2026-09-02)

## Corpus Check
- 68 files · ~79,417 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 557 nodes · 957 edges · 38 communities (34 shown, 4 thin omitted)
- Extraction: 88% EXTRACTED · 11% INFERRED · 1% AMBIGUOUS · INFERRED: 106 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d40c9bad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur
- lapakAi (produk)
- Aturan 1 — LLM tidak pernah menghitung
- Rumus SQL: Modal per Produk
- server.ts
- LLM Tidak Pernah Menghitung
- stok.queries.ts
- Daftar Periksa Setup Laptop
- Kontrak API sebagai sumber kebenaran backend
- wa.client.ts
- types.ts
- Aturan 4 — Sistem tidak pernah mengirim pesan ke nomor pembeli
- Kepemilikan Folder (frontend/, backend/, shared/, docs/)
- Aturan 5 — Harga di katalog = harga di aplikasi
- pesanan.proses.ts
- devDependencies
- dependencies
- compilerOptions
- produk.routes.ts
- siapkan-demo.mjs
- schema.sql
- index.ts
- onboarding.queries.ts
- Kriteria Foto Buku Catatan
- ekstraksi-foto.mjs
- uji-beranda.mjs
- uji-produk.mjs
- uji-stok-balasan.mjs
- Spike: ekstraksi foto buku catatan
- Cara kerja tim + AI (branch, PR, review manusia)
- Gemini structured output — ekstraksi jadi JSON
- uji-suara.mjs
- Aturan pengorbanan — korbankan dari bawah
- Template Pull Request
- Aturan 8 — Kalau ragu, bertanya, jangan menebak
- uji-pesanan.mjs

## God Nodes (most connected - your core abstractions)
1. `satu()` - 17 edges
2. `compilerOptions` - 13 edges
3. `query()` - 12 edges
4. `GalatTampil` - 12 edges
5. `LLM Tidak Pernah Menghitung` - 12 edges
6. `Rumus SQL: Modal per Produk` - 12 edges
7. `kirim()` - 11 edges
8. `jalur()` - 11 edges
9. `prosesPesan()` - 11 edges
10. `KODE_GALAT` - 11 edges

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

## Communities (38 total, 4 thin omitted)

### Community 0 - "Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur"
Cohesion: 0.07
Nodes (35): Kenapa Aplikasi Pembukuan Lain Gagal, Solusi: Potret Buku Tulis, Jangan Suruh Pindah, Aturan Pengorbanan: Korbankan dari Bawah, Ekstraksi Foto: Titik Paling Rawan, Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur, Fitur 2 — Voice Note ke Transaksi, Fitur 4 — Layar Konfirmasi, Fitur 7 — Beranda: Omzet vs Untung Bersih (+27 more)

### Community 1 - "lapakAi (produk)"
Cohesion: 0.17
Nodes (13): Urutan pengerjaan backend sesuai kebutuhan demo, CREATHON 2026 (AI & Data untuk UMKM), graphify — knowledge graph repo, Konvensi commit (prefix Inggris, deskripsi Indonesia), lapakAi (produk), Masalah: omzet disamakan dengan untung, Stack lapakAi (React/Vite, Node/Express, PostgreSQL, Gemini), Konvensi branch (feat/fix/docs/chore) (+5 more)

### Community 2 - "Aturan 1 — LLM tidak pernah menghitung"
Cohesion: 0.22
Nodes (13): Checklist aturan yang perlu dicek reviewer, Foto mentah dihapus setelah dikonfirmasi, Rumus hanya di SQL — satu sumber kebenaran, Tabel ekstraksi status menunggu sebelum transaksi, Uang sebagai integer, bukan float, Aturan 1 — LLM tidak pernah menghitung, Aturan 2 — Tidak ada yang tersimpan diam-diam, Aturan 7 — Frontend tidak pernah menghitung untung atau margin (+5 more)

### Community 3 - "Rumus SQL: Modal per Produk"
Cohesion: 0.07
Nodes (42): Jalur Baca per Peran (frontend, AI/backend, presenter, AI assistant), Kalau Dokumen dan Kode Berbeda, Perbaiki Dokumennya, Peta Baca Dokumentasi lapakAi, Kata Kunci 'Sebelum': Cegat Kerugian Sebelum Terjadi, Nomor HP Jadi Identitas, Profil Pengguna: Pedagang Mikro Usia 35-60, Thesis Produk: Berguna di Menit Kedua, Fitur 11 — Hitung Tenaga Sendiri sebagai Biaya (+34 more)

### Community 4 - "server.ts"
Cohesion: 0.14
Nodes (30): AKAR_REPO, periksaEnv(), PORT, tutupDb(), GalatTampil, jalur(), kirim(), kirimGalat() (+22 more)

### Community 5 - "LLM Tidak Pernah Menghitung"
Cohesion: 0.06
Nodes (48): Masalah: Omzet Disamakan dengan Untung, Produk Paling Laku Justru Paling Merugikan, Riset Pedagang (5 pedagang, 90 menit), Fitur 10 — Tambah Produk Tanpa Form, Fitur 19 — Katalog Digital + Tombol wa.me, Fitur 23 — Koneksi WhatsApp Otomatis (disarankan tidak dikerjakan), Fitur 3 — Ketik Manual, Fitur 6 — Deteksi Produk Merugi (+40 more)

### Community 6 - "stok.queries.ts"
Cohesion: 0.16
Nodes (12): Pelaksana, transaksiDb(), simpanResep(), BahanTidakSah, daftarStok(), simpanStok(), daftarTransaksi(), ProdukTidakSah (+4 more)

### Community 7 - "Daftar Periksa Setup Laptop"
Cohesion: 0.22
Nodes (11): Tanya Knowledge Graph Sebelum Menjelajah Kode, GEMINI_API_KEY Hanya di Backend, Kunci API Disimpan di .env, Aturan Git Anti-Bentrok (branch per kerjaan, merge sering), Konfigurasi Bersama .claude/settings.json, Daftar Periksa Setup Laptop, Setup .env dan GEMINI_API_KEY, graphify (paket graphifyy) (+3 more)

### Community 8 - "Kontrak API sebagai sumber kebenaran backend"
Cohesion: 0.20
Nodes (10): Kontrak API sebagai sumber kebenaran backend, Setiap query menyertakan user_id di WHERE, Aturan 3 — Jangan pernah minta email atau password, Aturan 6 — Web mobile-first, bukan aplikasi native, Aturan UI untuk pengguna 35-60 tahun, Mulai dengan data tiruan sesuai kontrak API, Frontend memakai tipe dari shared/, Platform web app mobile-first (+2 more)

### Community 9 - "wa.client.ts"
Cohesion: 0.29
Nodes (10): alasanDilewati(), ambilTeks(), AUTH_DIR, DIR, hubungkanWhatsapp(), samarkan(), statusKini(), StatusWa (+2 more)

### Community 10 - "types.ts"
Cohesion: 0.09
Nodes (21): AnalisisPesanan, AnalisisPesananReq, BalasanRes, BarisUsulan, Beranda, CatatTransaksiReq, DariTeksProdukReq, DariTeksReq (+13 more)

### Community 11 - "Aturan 4 — Sistem tidak pernah mengirim pesan ke nomor pembeli"
Cohesion: 0.67
Nodes (3): Aturan 4 — Sistem tidak pernah mengirim pesan ke nomor pembeli, Layar Pesanan Masuk, WhatsApp tempel teks manual

### Community 12 - "Kepemilikan Folder (frontend/, backend/, shared/, docs/)"
Cohesion: 0.67
Nodes (3): Tipe TypeScript Hidup di shared/, Kepemilikan Folder (frontend/, backend/, shared/, docs/), Pembagian Peran Tim (2 frontend, 1 AI/backend)

### Community 14 - "pesanan.proses.ts"
Cohesion: 0.07
Nodes (49): coba(), FRASA_KOSONG, galatSementara(), isiPalsu(), JawabanOllama, kosongJadiNull(), llmSiap(), mintaJson() (+41 more)

### Community 15 - "devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, tsx, @types/cors, @types/express, @types/jsonwebtoken, @types/node, @types/pg, @types/qrcode-terminal (+19 more)

### Community 16 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, cors, dotenv, @electric-sql/pglite, express, @google/genai, jsonwebtoken, pg (+11 more)

### Community 17 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+10 more)

### Community 18 - "produk.routes.ts"
Cohesion: 0.17
Nodes (15): query(), siapkanDb(), daftarPesan(), bahanProduk(), daftarProduk(), DetailDasar, detailProduk(), SaranMentah (+7 more)

### Community 19 - "siapkan-demo.mjs"
Cohesion: 0.14
Nodes (13): barisStok, hariIni, idProduk, JUAL_BULAN_INI, JUAL_BULAN_LALU, kelompok, masuk(), panggil() (+5 more)

### Community 20 - "schema.sql"
Cohesion: 0.41
Nodes (12): bahan, ekstraksi, pengguna, pesan_masuk, produk, resep, stok, transaksi (+4 more)

### Community 21 - "index.ts"
Cohesion: 0.22
Nodes (11): DB_DIR, DIR, satu(), SCHEMA, ambilPengguna(), buatPengguna(), cariPenggunaLewatNomor(), ringkasanPenjualan (+3 more)

### Community 22 - "onboarding.queries.ts"
Cohesion: 0.33
Nodes (5): ambilTemuanPertama(), simpanUsaha(), BahanMasukan, JenisUsaha, TemuanPertama

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

### Community 30 - "Cara kerja tim + AI (branch, PR, review manusia)"
Cohesion: 0.33
Nodes (6): GEMINI_API_KEY hanya di .env, Test set foto asli yang sulit, Cara kerja tim + AI (branch, PR, review manusia), Aturan khusus kode hasil AI, Alur Pull Request (min 1 review, squash merge), Jangan pernah memanggil Gemini dari frontend

### Community 31 - "Gemini structured output — ekstraksi jadi JSON"
Cohesion: 0.33
Nodes (6): Backend: penegakan LLM tidak pernah menghitung, Gemini audio native — catatan suara, Gemini structured output — ekstraksi jadi JSON, Gemini vision — foto buku catatan, Solusi: potret buku tulis, jangan suruh pindah, SQL menangani semua aritmetika

### Community 34 - "Aturan pengorbanan — korbankan dari bawah"
Cohesion: 0.60
Nodes (5): Template Laporan bug, Template Usulan fitur, Aturan pengorbanan — korbankan dari bawah, Prioritas fitur 1-10 / 11-15 / 16+, Freeze 45 menit sebelum deadline

### Community 35 - "Template Pull Request"
Cohesion: 0.40
Nodes (5): Template Pull Request, Kepemilikan folder (frontend/backend/shared/docs), graphify update . setelah mengubah kode, Pembagian kerja per layar, bukan per lapisan, Perubahan di shared/ wajib dikabarkan

### Community 36 - "Aturan 8 — Kalau ragu, bertanya, jangan menebak"
Cohesion: 0.40
Nodes (5): Skor keyakinan per baris (perlu_dicek, alasan_ragu), Aturan 8 — Kalau ragu, bertanya, jangan menebak, Layar konfirmasi ekstraksi, Gemini embedding + ambang keyakinan — pencocokan nama produk, Keputusan arsitektur — SQL yang menghitung

### Community 37 - "uji-pesanan.mjs"
Cohesion: 0.60
Nodes (3): panggil(), rupiah(), uji()

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
- **133 isolated node(s):** `name`, `version`, `private`, `type`, `spike` (+128 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
- **Why does `Rumus SQL: Modal per Produk` connect `Rumus SQL: Modal per Produk` to `Fitur 1 — Foto Buku Catatan ke Transaksi Terstruktur`, `LLM Tidak Pernah Menghitung`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._