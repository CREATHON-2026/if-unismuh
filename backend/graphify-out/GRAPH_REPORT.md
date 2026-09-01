# Graph Report - backend  (2026-09-02)

## Corpus Check
- 70 files · ~67,708 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 424 nodes · 907 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27df6b69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pesanan.service.ts
- GalatTampil
- produk.service.ts
- server.ts
- devDependencies
- satu
- kirim
- Backend — lapakAi
- dependencies
- compilerOptions
- index.ts
- siapkan-demo.mjs
- schema.sql
- wa.client.ts
- uji-ekstraksi.mjs
- ekstraksi-foto.mjs
- uji-beranda.mjs
- uji-produk.mjs
- uji-stok-balasan.mjs
- Spike: ekstraksi foto buku catatan
- uji-suara.mjs
- uji-pesanan.mjs

## God Nodes (most connected - your core abstractions)
1. `kirim()` - 35 edges
2. `satu()` - 19 edges
3. `GalatTampil` - 19 edges
4. `query()` - 14 edges
5. `compilerOptions` - 13 edges
6. `jalur()` - 12 edges
7. `wajibLogin()` - 11 edges
8. `prosesPesan()` - 11 edges
9. `ReqBerpengguna` - 10 edges
10. `cocokkanNamaProduk()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `hitungBaris()` --calls--> `query()`  [EXTRACTED]
  src/modules/ekstraksi/ekstraksi.queries.ts → src/db/index.ts
- `bahanProduk()` --calls--> `query()`  [EXTRACTED]
  src/modules/produk/produk.queries.ts → src/db/index.ts
- `daftarProduk()` --calls--> `query()`  [EXTRACTED]
  src/modules/produk/produk.queries.ts → src/db/index.ts
- `daftarStok()` --calls--> `query()`  [EXTRACTED]
  src/modules/stok/stok.queries.ts → src/db/index.ts
- `daftarTransaksi()` --calls--> `query()`  [EXTRACTED]
  src/modules/transaksi/transaksi.queries.ts → src/db/index.ts

## Import Cycles
- None detected.

## Communities (24 total, 3 thin omitted)

### Community 0 - "pesanan.service.ts"
Cohesion: 0.08
Nodes (46): query(), coba(), FRASA_KOSONG, galatSementara(), isiPalsu(), JawabanOllama, kosongJadiNull(), llmSiap() (+38 more)

### Community 1 - "GalatTampil"
Cohesion: 0.09
Nodes (35): GalatTampil, bacaBarisKonfirmasi(), dariTeks(), konfirmasi(), pratinjau(), EkstraksiTidakSah, hitungBaris(), konfirmasi() (+27 more)

### Community 2 - "produk.service.ts"
Cohesion: 0.14
Nodes (24): pastikanBahanLengkap(), JENIS_SAH, simpanResepOnboarding(), simpanUsaha(), ambilTemuanPertama(), simpanResep(), simpanUsaha(), buatProdukDenganResep() (+16 more)

### Community 3 - "server.ts"
Cohesion: 0.19
Nodes (17): tutupDb(), jalur(), kirimGalat(), bacaToken(), wajibLogin(), tangkapGalat(), rutBeranda, rutEkstraksi (+9 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, tsx, @types/cors, @types/express, @types/jsonwebtoken, @types/node, @types/pg, @types/qrcode-terminal (+19 more)

### Community 5 - "satu"
Cohesion: 0.16
Nodes (17): AKAR_REPO, periksaEnv(), PORT, satu(), buatToken(), ambilPengguna(), buatPengguna(), cariPenggunaLewatNomor() (+9 more)

### Community 6 - "kirim"
Cohesion: 0.20
Nodes (19): kirim(), keInternasional(), nomorValid(), rapikanNomor(), ReqBerpengguna, otpKirim(), otpVerifikasi(), saya() (+11 more)

### Community 7 - "Backend — lapakAi"
Cohesion: 0.10
Nodes (20): 1. LLM tidak pernah menghitung — di sinilah aturan itu ditegakkan, 2. Setiap query menyertakan `user_id` di `WHERE`, 3. Tidak ada jalur yang menulis hasil AI langsung ke tabel `transaksi`, 4. Foto mentah dihapus setelah dikonfirmasi, 5. Kunci API hanya di `.env`, Aturan wilayah ini, Aturan yang membuat struktur ini ada gunanya, Backend — lapakAi (+12 more)

### Community 8 - "dependencies"
Cohesion: 0.11
Nodes (19): cors, dotenv, @electric-sql/pglite, express, @google/genai, jsonwebtoken, dependencies, cors (+11 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): ES2023, node, ../shared/**/*.ts, src/**/*.ts, compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames (+10 more)

### Community 10 - "index.ts"
Cohesion: 0.18
Nodes (13): DB_DIR, DIR, Pelaksana, SCHEMA, siapkanDb(), transaksiDb(), daftarStok(), simpanStok() (+5 more)

### Community 11 - "siapkan-demo.mjs"
Cohesion: 0.14
Nodes (13): barisStok, hariIni, idProduk, JUAL_BULAN_INI, JUAL_BULAN_LALU, kelompok, masuk(), panggil() (+5 more)

### Community 12 - "schema.sql"
Cohesion: 0.41
Nodes (12): bahan, ekstraksi, pengguna, pesan_masuk, produk, resep, stok, transaksi (+4 more)

### Community 13 - "wa.client.ts"
Cohesion: 0.27
Nodes (11): alasanDilewati(), ambilTeks(), DIR, hubungkanWhatsapp(), PEMILIK_PATH, pulihkanWhatsapp(), samarkan(), statusKini() (+3 more)

### Community 14 - "uji-ekstraksi.mjs"
Cohesion: 0.20
Nodes (5): barisKacang, barisKripik, disunting, KACANG, KRIPIK

### Community 15 - "ekstraksi-foto.mjs"
Cohesion: 0.33
Nodes (8): bacaSatuFoto(), daftarFoto(), laporkan(), main(), MIME, MODEL_URUT, rupiah(), SKEMA

### Community 16 - "uji-beranda.mjs"
Cohesion: 0.33
Nodes (4): KACANG, KRIPIK, panggil(), pedagangBaru()

### Community 19 - "Spike: ekstraksi foto buku catatan"
Cohesion: 0.29
Nodes (6): Cara menilai hasilnya, Jalankan, Kalau belum punya foto pedagang asli, Kalau hasilnya jelek, Spike: ekstraksi foto buku catatan, Yang sengaja TIDAK dilakukan skrip ini

### Community 21 - "uji-pesanan.mjs"
Cohesion: 0.60
Nodes (3): panggil(), rupiah(), uji()

## Knowledge Gaps
- **104 isolated node(s):** `name`, `version`, `private`, `type`, `spike` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `kirim()` connect `kirim` to `GalatTampil`, `produk.service.ts`, `server.ts`, `satu`, `index.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `satu()` connect `satu` to `pesanan.service.ts`, `GalatTampil`, `produk.service.ts`, `server.ts`, `index.ts`, `wa.client.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `GalatTampil` connect `GalatTampil` to `pesanan.service.ts`, `produk.service.ts`, `server.ts`, `satu`, `kirim`, `index.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pesanan.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08055152394775036 - nodes in this community are weakly interconnected._
- **Should `GalatTampil` be split into smaller, more focused modules?**
  _Cohesion score 0.09082125603864734 - nodes in this community are weakly interconnected._
- **Should `produk.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14112903225806453 - nodes in this community are weakly interconnected._