# Backend — lapakAi

Node.js + Express + TypeScript + PostgreSQL. Dikerjakan **1 orang** (AI & backend).

Baca [CLAUDE.md](../CLAUDE.md) di root lebih dulu — di sana ada 8 aturan yang tidak boleh dilanggar. Dokumen ini menambahkan aturan khusus wilayah backend.

## Aturan wilayah ini

### 1. LLM tidak pernah menghitung — di sinilah aturan itu ditegakkan

Wilayah ini yang menentukan apakah [aturan #1](../CLAUDE.md) dipatuhi atau dilanggar.

**Boleh diminta ke Gemini:**
- "Baca foto ini, keluarkan daftar barang dan jumlahnya"
- "Ubah kalimat ini jadi JSON transaksi"
- "Nama produk mana yang paling mirip 'kripik psg'?"
- "Susun kalimat balasan sopan berisi angka-angka ini"

**Tidak boleh diminta ke Gemini:**
- "Berapa total omzet bulan ini?"
- "Produk mana yang paling rugi?"
- "Hitung margin kripik pisang"
- "Apakah pesanan ini menguntungkan?"

Semua yang di daftar kedua dijawab query SQL. Rumusnya sudah ditulis di [docs/05-model-data.md](../docs/05-model-data.md).

**Ini bukan soal ketelitian model.** Ini soal ketertelusuran: angka dari `SELECT` bisa dijelaskan ke juri sampai ke baris sumbernya; angka dari LLM tidak bisa.

### 2. Setiap query menyertakan `user_id` di `WHERE`

Isolasi terjadi di database, **bukan** di aplikasi.

**Salah:**
```ts
const semua = await db.query('SELECT * FROM produk');
return semua.rows.filter(p => p.user_id === userId);   // JANGAN
```

**Benar:**
```ts
await db.query('SELECT * FROM produk WHERE user_id = $1', [userId]);
```

Cara pertama berarti data pengguna lain pernah keluar dari database dan masuk ke memori proses — satu kebocoran di log atau respons galat setelah itu sudah cukup.

### 3. Tidak ada jalur yang menulis hasil AI langsung ke tabel `transaksi`

Hasil ekstraksi masuk ke tabel `ekstraksi` dengan `status = 'menunggu'`. Baru setelah endpoint konfirmasi dipanggil, barisnya pindah ke `transaksi`.

Jangan pernah membuat jalan pintas yang melewati tahap ini, sepraktis apa pun kelihatannya.

### 4. Foto mentah dihapus setelah dikonfirmasi

Saat `ekstraksi.status` jadi `dikonfirmasi`: hapus berkasnya, kosongkan `path_berkas`. Buku catatan berisi data usaha yang sensitif.

### 5. Kunci API hanya di `.env`

`GEMINI_API_KEY` tidak pernah masuk kode, tidak pernah dikirim ke frontend. Semua panggilan Gemini terjadi di sini.

## Struktur

Disusun **per fitur**, bukan per lapisan. Buka satu folder modul, lihat semua
yang berhubungan dengan domain itu.

```
src/
  config/env.ts        satu-satunya tempat yang membaca process.env
  db/index.ts          koneksi + helper query (query, satu, transaksiDb)
  lib/                 http, token, nomor — dipakai lintas modul
  middleware/          wajibLogin, tangkapGalat
  modules/
    auth/              auth.routes.ts   auth.queries.ts
    onboarding/        onboarding.routes.ts   onboarding.queries.ts
  server.ts            rakit app, periksa env, nyalakan
db/schema.sql          tabel + view. Semua rumus hidup di sini
```

### Aturan yang membuat struktur ini ada gunanya

**Semua SQL satu domain hidup di `*.queries.ts` domain itu. Tidak ada SQL di
dalam route handler.**

Ini bukan soal kerapian. Begitu ada modul produk, beranda, transaksi, dan
pesanan, SQL yang tersebar akan membuat seseorang menulis rumus margin kedua di
tempat lain — dan dua rumus yang berbeda tidak akan menghasilkan pesan galat,
cuma angka yang salah. Satu berkas per domain membuat duplikasi itu terlihat.

Route handler hanya boleh: memvalidasi masukan, memanggil query, mengirim
jawaban. Kalau sebuah handler punya `SELECT` di dalamnya, itu tanda ada yang
salah tempat.

**Dan rumus finansial tidak hidup di `*.queries.ts` sekalipun** — semuanya ada
di view SQL (`v_modal_produk`, `v_margin_produk`). Berkas query hanya membaca
view itu.

### Menambah modul baru

1. Buat `src/modules/<nama>/<nama>.queries.ts` — semua SQL domain itu
2. Buat `src/modules/<nama>/<nama>.routes.ts` — validasi + panggil query
3. Daftarkan di `server.ts`
4. Kalau butuh rumus finansial baru, tambahkan **view** di `db/schema.sql`,
   jangan hitung di TypeScript

## Menjalankan

```bash
npm install
npm run dev            # tsx watch, port 3000
node scripts/uji-alur.mjs   # uji asap: login -> onboarding -> temuan pertama
```

Tidak perlu memasang PostgreSQL dan tidak perlu Docker. Kalau `DATABASE_URL`
kosong, backend memakai **PGlite** — PostgreSQL asli yang dikompilasi ke WASM
dan jalan di dalam proses Node. Datanya di `backend/db/data/` (ter-gitignore).

Mau pakai PostgreSQL sungguhan? Isi `DATABASE_URL` di `.env` akar repo. Tidak
ada satu baris query pun yang berubah.

### Hentikan dengan Ctrl+C, jangan dimatikan paksa

Server menutup database dengan rapi saat menerima SIGINT/SIGTERM. Ctrl+C aman.

**Yang tidak aman: `Stop-Process -Force`, Task Manager, atau `kill -9`.** SIGKILL
tidak bisa ditangkap siapa pun, jadi PGlite tidak sempat menutup berkasnya dan
direktori datanya rusak.

### Kalau server gagal start dengan `RuntimeError: Aborted()`

Itu gejalanya. Yang bisa dilakukan hanya menghapus datanya:

```bash
rm -rf backend/db/data     # dibuat ulang beserta skemanya saat start
```

Sebelum menghapus, pastikan dulu **tidak ada proses lain yang masih memegangnya** —
PGlite satu-proses, dan dua server yang menunjuk direktori data yang sama juga
menghasilkan galat yang sama persis:

```powershell
(Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess
```

## Uang sebagai integer

Rupiah disimpan dan dihitung sebagai **integer**, bukan float. `20000`, bukan `20000.00`.

Float menghasilkan galat pembulatan yang muncul sebagai selisih receh di layar — dan pedagang yang menghitung uang tiap hari **akan** menyadarinya, lalu berhenti percaya pada seluruh aplikasi.

## Urutan pengerjaan

Sesuai kebutuhan demo, bukan kemudahan:

1. Autentikasi + onboarding — tanpa ini tidak ada yang bisa dites
2. Resep → modal per produk — **ini yang melahirkan temuan pertama**, inti produknya
3. Ekstraksi foto → konfirmasi — **titik paling rawan, mulai lebih awal**
4. Beranda: omzet vs untung bersih
5. Daftar & detail produk
6. Pesanan Masuk
7. Suara
8. Sisanya

## Ekstraksi foto: mulai hari ini

Ini bagian yang paling mungkin gagal, dan paling mahal kalau gagalnya baru ketahuan saat lomba.

Uji dengan foto **asli** dari riset pedagang, bukan buku yang ditulis rapi untuk demo. Sengaja uji yang sulit: miring 30°, cahaya remang, halaman terlipat, tulisan rapat, ada coretan.

Simpan sebagai test set. **Setiap perubahan prompt harus diuji ulang terhadap set yang sama** — kalau tidak, perbaikan di satu jenis foto bisa merusak jenis lain tanpa ketahuan.

Detail pipeline-nya di [docs/04-pipeline-ai.md](../docs/04-pipeline-ai.md).

## Skor keyakinan per baris, bukan per foto

Satu foto bisa berisi 11 baris di mana 9 terbaca jelas dan 2 meragukan. Skor per foto akan menyembunyikan itu.

Baris di bawah ambang diberi `perlu_dicek: true` dan `alasan_ragu`, lalu frontend menandainya. Ini yang membuat [aturan #2](../CLAUDE.md) benar-benar berjalan, bukan sekadar tertulis.

## Kontrak API

Sudah tertulis lengkap di [docs/06-kontrak-api.md](../docs/06-kontrak-api.md), dan **dua orang sedang menulis kode berdasarkan dokumen itu**.

Kalau kontraknya perlu berubah: ubah dokumennya, ubah tipe di `shared/`, dan **kabari tim**. Mengubah bentuk respons diam-diam akan merusak pekerjaan dua orang sekaligus tanpa pesan galat yang jelas.

## Kalau tergoda memindahkan perhitungan ke TypeScript

Jangan. Alasannya bukan performa — alasannya adalah satu sumber kebenaran.

Kalau modal per produk dihitung di SQL untuk satu endpoint dan di TypeScript untuk endpoint lain, keduanya akan berbeda saat rumusnya berubah, dan tidak akan ada yang menyadarinya sampai ada angka aneh di layar saat demo.

Semua rumus hidup di [docs/05-model-data.md](../docs/05-model-data.md). Kalau butuh rumus baru, tambahkan di sana.
