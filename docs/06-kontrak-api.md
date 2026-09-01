# Kontrak API

**Dokumen paling penting untuk kerja paralel.** Dua dev frontend dan satu dev backend bekerja bersamaan; ini yang mencegah mereka saling menunggu dan saling merusak.

> Kontrak ini **rancangan**, belum diimplementasikan. Perubahan apa pun di sini **wajib dikabarkan ke tim** — ada dua orang yang menulis kode berdasarkan dokumen ini.

## Aturan kontrak

1. **Semua angka finansial datang sudah jadi.** Frontend tidak pernah menghitung margin, untung, atau total. [Aturan #7](../CLAUDE.md).
2. **Uang selalu integer rupiah.** `20000`. Frontend yang memformat jadi `Rp 20.000`.
3. **Tanggal selalu `YYYY-MM-DD`.** Waktu selalu ISO 8601 dengan zona.
4. **Bentuk galat selalu sama**, apa pun endpoint-nya.
5. **Tipe TypeScript-nya hidup di `shared/`** dan dipakai kedua sisi. Kalau tipe berubah, kedua sisi ikut berubah bersama.

## Bentuk jawaban baku

Berhasil:
```json
{ "ok": true, "data": { } }
```

Gagal:
```json
{ "ok": false, "error": { "kode": "PRODUK_TIDAK_DITEMUKAN", "pesan": "Produk tidak ditemukan" } }
```

`pesan` ditulis dalam bahasa Indonesia yang bisa langsung ditampilkan ke pengguna. Jangan kirim istilah teknis ke layar orang berusia 55 tahun.

## Autentikasi

Semua endpoint kecuali `/auth/*` butuh header:

```
Authorization: Bearer <token>
```

### `POST /auth/otp/kirim`
```json
// permintaan
{ "nomor_hp": "081234567890" }
// jawaban
{ "ok": true, "data": { "terkirim": true } }
```
**Mode demo:** OTP tidak benar-benar dikirim. Kode selalu `123456`. Lihat [08-keamanan-data.md](08-keamanan-data.md).

### `POST /auth/otp/verifikasi`
```json
// permintaan
{ "nomor_hp": "081234567890", "kode": "123456" }
// jawaban
{ "ok": true, "data": {
    "token": "...",
    "pengguna_baru": true,        // true -> frontend masuk ke alur onboarding
    "pengguna": { "id": 1, "nama_usaha": null }
} }
```

`pengguna_baru` menentukan apakah frontend mengarahkan ke onboarding atau langsung ke Beranda.

### `GET /auth/saya`
**Dipanggil setiap aplikasi dibuka**, dengan token dari `localStorage`.

```json
{ "ok": true, "data": {
    "pengguna": { "id": 1, "nomor_hp": "081234567890",
                  "nama_usaha": "Warung Bu Sari", "jenis_usaha": "makanan" },
    "pengguna_baru": false,
    "token": "..."
} }
```

Menjawab tiga hal sekaligus: tokennya masih sah atau tidak (`401` kalau tidak), penggunanya siapa, dan sudah selesai onboarding atau belum.

**`token` yang dikembalikan adalah token BARU.** Simpan menimpa yang lama — sesinya diperpanjang tiap kali aplikasi dibuka, supaya pedagang yang membuka aplikasi seminggu sekali tidak pernah kehabisan sesi. Sesi pendek membunuh retensi; lihat [08-keamanan-data.md](08-keamanan-data.md).

## Onboarding

### `POST /onboarding/usaha`
```json
{ "nama_usaha": "Warung Bu Sari", "jenis_usaha": "makanan" }
```

### `POST /onboarding/resep`
Wawancara resep satu produk. **Di sinilah temuan pertama lahir.**

```json
// permintaan
{
  "nama_produk": "Kripik Pisang",
  "bahan": [
    { "nama": "pisang", "jumlah": 5, "satuan": "kg", "harga_beli": 60000, "jumlah_beli": 5 },
    { "nama": "minyak", "jumlah": 2, "satuan": "liter", "harga_beli": 36000, "jumlah_beli": 2 }
  ],
  "hasil_per_batch": 40,
  "harga_jual": 20000
}

// jawaban — angka SUDAH dihitung SQL
{ "ok": true, "data": {
    "produk_id": 1,
    "modal_per_unit": 21200,
    "harga_jual": 20000,
    "margin_per_unit": -1200,
    "merugi": true
} }
```

Frontend **tidak** menghitung `20000 - 21200`. Backend yang mengirim `margin_per_unit` dan `merugi`.

## Beranda

### `GET /beranda?dari=2026-08-01&sampai=2026-08-31`
Tanpa parameter, bawaannya **bulan berjalan** — pemilih tanggal adalah friksi untuk pengguna 35–60 tahun.

```json
{ "ok": true, "data": {
    "omzet": 4200000,
    "untung_bersih": 380000,
    "ada_transaksi": true,
    "baris_tanpa_modal": 0,
    "jumlah_produk_merugi": 2,
    "produk_paling_merugi": { "nama": "Kripik Pisang", "margin_per_unit": -1200 }
} }
```

| Field | Catatan |
|---|---|
| `ada_transaksi` | `false` → tampilkan ajakan mencatat, **jangan** tampilkan angka nol sebagai hasil |
| `jumlah_produk_merugi` · `produk_paling_merugi` | **Terisi meski `ada_transaksi` false.** Dihitung dari resep, bukan penjualan |
| `baris_tanpa_modal` | Penjualan yang untungnya belum bisa dihitung. Sudah masuk `omzet`, **tidak** masuk `untung_bersih`. Kalau > 0, beri tahu penggunanya |

**Beranda kosong tetap punya isi.** Setelah onboarding, pengguna mendarat di sini dengan nol transaksi — tapi temuan produknya sudah ada. Pimpin dengan "1 produk Anda merugi", jangan dengan Rp 0; momentum dari momen "RUGI Rp 1.200" tidak boleh putus.

**Kenapa `omzet` dan `untung_bersih` bisa tidak sebanding.** Uang masuk selalu diketahui, jadi omzet menghitung semua penjualan. Untung hanya menghitung penjualan yang modal produknya diketahui. Selisihnya dilaporkan lewat `baris_tanpa_modal` — bukan disembunyikan dengan membuang barisnya dari omzet juga.

### `POST /transaksi`
Fitur 3 — ketik manual. **Banyak baris sekaligus**, bentuknya sama dengan layar konfirmasi foto supaya komponen barisnya bisa dipakai untuk keduanya.

```json
// permintaan — tanggal boleh dikosongkan (dipakai hari ini)
{ "tanggal": "2026-09-01",
  "baris": [
    { "produk_id": 1, "jumlah": 10 },
    { "produk_id": 2, "jumlah": 5, "harga_satuan": 15000 }
  ] }

// jawaban
{ "ok": true, "data": { "tersimpan": 2 } }
```

- `harga_satuan` boleh dikosongkan → dipakai harga jual produk yang tersimpan
- **Semua baris masuk atau tidak sama sekali.** Kalau satu baris ditolak, tidak ada yang tersimpan — setengah tercatat lebih buruk daripada gagal, karena pedagang akan mengira semuanya masuk
- Tidak lewat layar konfirmasi: aturan #2 mengatur hasil AI, sedangkan yang diketik manusia sudah dikonfirmasi saat diketik

### `GET /transaksi?dari=&sampai=`
Daftar transaksi beserta nama produknya. Bawaannya bulan berjalan.

## Produk

### `GET /produk`
```json
{ "ok": true, "data": [
    { "id": 1, "nama": "Kripik Pisang", "harga_jual": 20000,
      "modal_per_unit": 21200, "margin_per_unit": -1200,
      "merugi": true, "terlaris": true }
] }
```
Diurutkan dari margin terendah — produk merugi muncul lebih dulu (fitur 6).

### `GET /produk/:id`
Tambahan dari daftar: rincian bahan dan total terjual.

```json
{ "ok": true, "data": {
    "id": 1, "nama": "Kripik Pisang",
    "harga_jual": 20000, "modal_per_unit": 21200, "margin_per_unit": -1200,
    "merugi": true, "terlaris": false,
    "hasil_per_batch": 40,
    "total_terjual": 10,
    "bahan": [
      { "nama": "pisang",  "satuan": "kg",     "jumlah_pakai": 20, "biaya_per_unit": 7500 },
      { "nama": "gas",     "satuan": "tabung", "jumlah_pakai": 1,  "biaya_per_unit": 5000 },
      { "nama": "minyak",  "satuan": "liter",  "jumlah_pakai": 10, "biaya_per_unit": 4500 },
      { "nama": "gula",    "satuan": "kg",     "jumlah_pakai": 10, "biaya_per_unit": 3750 },
      { "nama": "kemasan", "satuan": "buah",   "jumlah_pakai": 40, "biaya_per_unit": 450 }
    ],
    "saran_harga": null
} }
```

**`biaya_per_unit` semua bahan dijamin berjumlah tepat sama dengan `modal_per_unit`** — di contoh ini 7.500 + 5.000 + 4.500 + 3.750 + 450 = 21.200. Itu diuji, bukan kebetulan. Rincian yang tidak menjumlah ke totalnya sendiri membuat pedagang berhenti percaya pada semua angka lain di aplikasi.

`saran_harga` masih `null` — fitur 8 belum dibangun. Sembunyikan bagiannya selama masih null, jangan tampilkan angka karangan.

`terlaris` dihitung sepanjang waktu, bukan per periode: sifatnya melekat pada produknya, dan angka yang berubah mengikuti rentang tanggal justru membingungkan.

## Ekstraksi

### `POST /ekstraksi/foto`
`multipart/form-data`, field `berkas`.

```json
{ "ok": true, "data": {
    "ekstraksi_id": 12,
    "baris": [
      { "urutan": 1, "nama_mentah": "kripik psg", "produk_id": 1,
        "nama_produk": "Kripik Pisang", "jumlah": 10, "harga_satuan": 20000,
        "tanggal": "2026-09-01", "keyakinan": 0.94, "perlu_dicek": false },
      { "urutan": 2, "nama_mentah": "kacang", "produk_id": null,
        "nama_produk": null, "jumlah": 5, "harga_satuan": null,
        "tanggal": "2026-09-01", "keyakinan": 0.41, "perlu_dicek": true,
        "alasan_ragu": "harga tidak terbaca" }
    ]
} }
```

**Tidak ada yang tersimpan pada tahap ini.** Ini hanya usulan. Frontend menampilkan layar konfirmasi, baris `perlu_dicek: true` ditandai.

### `POST /ekstraksi/suara`
`multipart/form-data`, field `berkas`. Bentuk jawabannya sama persis dengan `/ekstraksi/foto`, jadi frontend bisa memakai komponen konfirmasi yang sama.

### `POST /ekstraksi/:id/konfirmasi`
```json
// permintaan — hanya baris yang disetujui, boleh sudah diperbaiki pengguna
{ "baris": [
    { "urutan": 1, "produk_id": 1, "jumlah": 10, "harga_satuan": 20000, "tanggal": "2026-09-01" }
] }
// jawaban
{ "ok": true, "data": { "tersimpan": 1, "berkas_dihapus": true } }
```

`berkas_dihapus: true` menegaskan foto mentahnya sudah dihapus setelah konfirmasi.

## Pesanan Masuk

### `POST /pesanan/analisis`
Menerima teks yang ditempel dari chat pembeli.

```json
// permintaan
{ "teks": "bu saya mau pesan 20 bungkus kripik pisang buat hari sabtu, bisa 18rb ga bu?" }

// jawaban
{ "ok": true, "data": {
    "pesan_id": 12,
    "jenis": "menawar",
    "produk": { "id": 1, "nama": "Kripik Pisang" },
    "nama_produk_mentah": "kripik pisang",
    "jumlah": 20,
    "harga_diminta": 18000,
    "tanggal_dibutuhkan": "2026-09-06",

    "perlu_dicek": false,
    "kandidat": [],

    "nilai_pesanan": 360000,
    "untung_pesanan": -64000,
    "merugi": true,

    "stok_cukup_untuk": 14,
    "stok_kurang": true,

    "peringatan": [
      "Harga Rp 18.000 di bawah modal Rp 21.200 — rugi Rp 64.000 untuk pesanan ini.",
      "Bahan hanya cukup untuk 14 dari 20 yang dipesan."
    ]
} }
```

Semua angka di sini dihitung SQL. `peringatan` sudah berupa kalimat siap tampil.

| Field | Catatan |
|---|---|
| `jenis` | `pesanan` · `tanya_harga` · `menawar` · `bukan_pesanan` |
| `pesan_id` | **`null` kalau `bukan_pesanan`** — pesannya sengaja tidak disimpan |
| `perlu_dicek` | `true` kalau pencocokan nama produk tidak meyakinkan. Tampilkan `kandidat` dan minta pengguna memilih |
| `stok_cukup_untuk` | **`null` berarti stok belum dicatat**, bukan berarti nol. Jangan tampilkan sebagai "cukup 0" |
| `untung_pesanan` | `null` kalau resep produk belum diisi — modal belum bisa dihitung |

Kalau pesannya `bukan_pesanan`, semua field lain `null` dan `peringatan` kosong.

### `GET /pesanan`
Daftar pesanan masuk terbaru, lengkap dengan angka yang sudah dihitung SQL. Pesan yang bukan pesanan tidak pernah muncul di sini.

### `GET /whatsapp/status`
```json
{ "ok": true, "data": { "status": "terputus", "qr": null, "hanya_baca": true, "alasan": null } }
```

`status`: `terputus` · `menunggu_qr` · `menyambung` · `tersambung`. Saat `menunggu_qr`, field `qr` berisi string QR untuk ditampilkan.

`hanya_baca` selalu `true` — sistem tidak punya jalur mengirim sama sekali.

### `POST /whatsapp/hubungkan`
Memulai sesi baca. **Opsional.** Kalau tidak pernah dipanggil atau sesinya putus, Pesanan Masuk tetap berfungsi penuh lewat tempel manual.

### `POST /pesanan/balasan`
```json
// permintaan
{ "maksud": "tawar_harga", "produk_id": 1, "jumlah": 20, "harga_diminta": 18000 }
// jawaban
{ "ok": true, "data": {
    "teks": "Maaf Kak, untuk 20 bungkus harga Rp 18.000 belum bisa..."
} }
```

```json
// jawaban sesungguhnya
{ "ok": true, "data": {
    "teks": "Kak, terima kasih atas tawarannya. Untuk Kripik Pisang harga terbaik kami tetap Rp 20.000 per unit ya...",
    "acuan": {
      "nama": "Kripik Pisang", "modal_per_unit": 21200, "harga_jual": 20000,
      "harga_diminta": 18000, "jumlah": 20,
      "untung_pesanan": -64000, "merugi": true
    }
} }
```

`maksud`: `tawar_harga` · `terima` · `tolak` · `jawab_harga`

LLM menyusun kalimatnya, tapi angka di dalamnya berasal dari SQL dan disodorkan sebagai fakta. Hasilnya **disalin pedagang sendiri** — sistem tidak mengirim apa pun.

**`acuan` adalah angka SQL yang dipakai menyusun kalimat.** Disertakan supaya bisa dicocokkan: kalau angka di `teks` berbeda dari yang di `acuan`, berarti model mengarang — dan itu kegagalan, bukan sekadar kalimat yang kurang enak.

Kalimatnya sengaja **tidak pernah menyebut modal, rugi, atau untung** kepada pembeli. Itu urusan dalam pedagang.

### `GET /stok`
```json
{ "ok": true, "data": [
    { "bahan_id": 1, "nama": "pisang", "satuan": "kg", "jumlah": 7, "diperbarui": "2026-09-01T..." },
    { "bahan_id": 2, "nama": "minyak", "satuan": "liter", "jumlah": null, "diperbarui": null }
] }
```

**`jumlah: null` berarti belum pernah dicatat — bukan habis.** Jangan tampilkan sebagai "stok 0"; itu mengaku tahu sesuatu yang tidak diketahui.

### `POST /stok`
```json
// permintaan
{ "baris": [ { "bahan_id": 1, "jumlah": 7 }, { "bahan_id": 2, "jumlah": 12.5 } ] }
// jawaban
{ "ok": true, "data": { "tersimpan": 2 } }
```

Semua baris masuk atau tidak sama sekali. Mencatat stok inilah yang menghidupkan peringatan *"Bahan hanya cukup untuk 14 dari 20 yang dipesan"* di Pesanan Masuk — sebelum ada stok, jawabannya selalu *"stok belum dicatat"*.

## Kode galat

| Kode | Arti |
|---|---|
| `TIDAK_TERAUTENTIKASI` | Token tidak ada atau kedaluwarsa |
| `OTP_SALAH` | Kode OTP tidak cocok |
| `PRODUK_TIDAK_DITEMUKAN` | |
| `EKSTRAKSI_GAGAL` | Gemini gagal atau tidak membaca apa pun |
| `BERKAS_TERLALU_BESAR` | Foto melebihi batas |
| `RESEP_BELUM_LENGKAP` | Modal tidak bisa dihitung karena resep belum diisi |

## Kalau frontend butuh angka yang belum ada

**Jangan hitung sendiri di React.** Minta endpoint atau field baru ke pemilik backend, dan catat di dokumen ini.

Menghitung di frontend melanggar [aturan #7](../CLAUDE.md), dan lebih buruk lagi: akan ada dua sumber kebenaran yang cepat atau lambat berbeda hasilnya.
