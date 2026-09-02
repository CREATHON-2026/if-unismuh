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

**Pemetaan per jenis usaha (murni frontend, kontrak tidak berubah):** pertanyaan wawancara bercabang mengikuti `jenis_usaha` — makanan "sekali masak/porsi", minuman "sekali racik/gelas", **sembako mengirim satu bahan kulakan** (nama bahan = nama produk, `jumlah_beli` = `jumlah`), jasa "bahan habis pakai per sekian pelanggan". Semuanya tetap bentuk permintaan di atas; `bahan` tetap wajib ≥ 1.

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

### `GET /rekap?hari=7` — **belum ada di backend**
Fitur 14 — grafik tren omzet vs untung, harian. Tanpa parameter, bawaannya **7 hari terakhir** termasuk hari berjalan. Frontend sementara memakai data tiruan persis bentuk ini (`ambilRekap` di `frontend/src/api/client.ts`) sampai endpoint-nya jadi.

```json
{ "ok": true, "data": {
    "hari": [
      { "label": "Sen", "omzet": 620000, "untung_bersih": 54000 },
      { "label": "Sel", "omzet": 480000, "untung_bersih": 41000 }
    ],
    "omzet": 5400000,
    "untung_bersih": 514000,
    "ada_transaksi": true,
    "produk_terlaris": { "id": 1, "nama": "Kripik Pisang", "jumlah_terjual": 124 }
} }
```

| Field | Catatan |
|---|---|
| `hari[]` | Urut dari paling lama ke hari ini. `label` **siap tampil** ("Sen"…"Min") — frontend tidak merangkai tanggal |
| `hari[].untung_bersih` | Boleh negatif. Aturannya sama dengan Beranda: hanya penjualan yang modal produknya diketahui |
| `omzet` · `untung_bersih` | Total sepanjang periode, **dijumlahkan SQL** — frontend tidak menjumlah titik-titik grafik |
| `ada_transaksi` | `false` → tampilkan ajakan mencatat, jangan grafik datar nol |
| `produk_terlaris` | Terbanyak terjual sepanjang periode. `null` kalau belum ada penjualan |

Tidak ada field pembanding periode ("+12% dari minggu lalu") dan persen margin — kalau nanti dibutuhkan, tambahkan di sini dulu dan hitung di SQL, jangan di frontend.

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

**Usulan dari desain Riwayat Penjualan (belum ada):** field `subtotal` per baris dan `total_periode`, keduanya dihitung SQL — frontend tidak boleh mengalikan `jumlah × harga_satuan` sendiri (aturan #7). Sementara itu layar riwayat hanya menampilkan angka yang sudah ada.

### `POST /transaksi/dari-teks`
Fitur 2 — kalimat bebas jadi **usulan** transaksi. Melayani hasil transkripsi suara maupun ketikan bebas; endpoint ini tidak peduli teksnya datang dari mana.

```json
// permintaan — tanggal boleh dikosongkan
{ "teks": "hari ini laku 10 kripik pisang sama 5 kacang telur" }

// jawaban — USULAN, BELUM TERSIMPAN
{ "ok": true, "data": {
    "tanggal": "2026-09-01",
    "baris": [
      { "nama_mentah": "kripik pisang", "produk_id": 1, "nama_produk": "Kripik Pisang",
        "jumlah": 10, "harga_satuan": null, "perlu_dicek": false, "kandidat": [] },
      { "nama_mentah": "kacang telur", "produk_id": null, "nama_produk": null,
        "jumlah": 5, "harga_satuan": null, "perlu_dicek": true,
        "kandidat": [ { "id": 2, "nama": "Kacang Telor", "skor": 0.72 } ] }
    ]
} }
```

**★ Endpoint ini TIDAK menyimpan apa pun.** Ini hasil ekstraksi AI, jadi [aturan #2](../CLAUDE.md) berlaku: harus lewat layar konfirmasi manusia dulu. Tampilkan usulannya, tandai baris `perlu_dicek`, biarkan pengguna membetulkan, lalu kirim hasilnya ke `POST /transaksi`.

Bentuk `baris` sengaja dibuat cocok dengan yang diterima `POST /transaksi`, sehingga **komponen baris yang sama bisa dipakai untuk suara, foto, dan ketik manual.**

| Field | Catatan |
|---|---|
| `nama_mentah` | Persis seperti diucapkan, sebelum dicocokkan. Tampilkan ini, bukan hanya nama produknya |
| `perlu_dicek` | `true` → jangan simpan tanpa pengguna memastikan. Tampilkan `kandidat` |
| `alasan_ragu` | Terisi kalau penyaring backend menandai baris (jumlah tidak disebut, harga terlihat seperti total, kalimatnya pertanyaan, ada kata dialek tersaring). Tampilkan sebagai keterangan |
| `harga_satuan` | `null` = tidak disebut → `POST /transaksi` akan memakai harga jual tersimpan |
| `jumlah` | Boleh `null` kalau tidak disebut. Minta pengguna mengisinya |

#### Sisi frontend: transkripsi suara

Transkripsi terjadi **di browser** dengan Web Speech API — gratis, tanpa kunci API, tanpa endpoint backend.

```js
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const r = new SR();
r.lang = 'id-ID';        // wajib — tanpa ini bahasa Inggris yang dipakai
r.continuous = true;      // kalimat panjang tidak terpotong
r.interimResults = true;  // pengguna melihat kata muncul saat bicara
r.onresult = (e) => { /* kumpulkan transcript, kirim ke /transaksi/dari-teks */ };
```

Chrome, Edge, dan Opera mendukung penuh; Safari 14.1+ dengan awalan `webkit`. **Firefox tidak** — sediakan kolom ketik bebas sebagai jalan keluar, dan itu memang sudah jadi masukan endpoint yang sama.

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
    "biaya_tenaga_per_unit": 0,
    "persen_tenaga": 0,
    "bahan": [
      { "nama": "pisang",  "satuan": "kg",     "jumlah_pakai": 20, "biaya_per_unit": 7500, "persen_modal": 35 },
      { "nama": "gas",     "satuan": "tabung", "jumlah_pakai": 1,  "biaya_per_unit": 5000, "persen_modal": 24 },
      { "nama": "minyak",  "satuan": "liter",  "jumlah_pakai": 10, "biaya_per_unit": 4500, "persen_modal": 21 },
      { "nama": "gula",    "satuan": "kg",     "jumlah_pakai": 10, "biaya_per_unit": 3750, "persen_modal": 18 },
      { "nama": "kemasan", "satuan": "buah",   "jumlah_pakai": 40, "biaya_per_unit": 450,  "persen_modal": 2 }
    ],
    "saran_harga": null
} }
```

**`biaya_per_unit` semua bahan dijamin berjumlah tepat sama dengan `modal_per_unit`** — di contoh ini 7.500 + 5.000 + 4.500 + 3.750 + 450 = 21.200. Itu diuji, bukan kebetulan. Rincian yang tidak menjumlah ke totalnya sendiri membuat pedagang berhenti percaya pada semua angka lain di aplikasi.

#### `persen_modal`, `biaya_tenaga_per_unit`, `persen_tenaga`

Dipakai layar detail untuk menggambar bar "modal datang dari sini". **Dihitung SQL, bukan frontend** — aturan #7 melarang React membagi rupiah untuk mendapat persen.

Pembagi `persen_modal` adalah **modal penuh**, yaitu bahan **ditambah** ongkos tenaga — bukan total bahan saja. Kalau pembaginya total bahan, bar akan berjumlah 100% padahal ongkos tenaga hilang dari gambar, dan pedagang menyimpulkan modalnya cuma bahan. Karena itu tenaga punya barisnya sendiri lewat `biaya_tenaga_per_unit` + `persen_tenaga`, dan jumlah seluruhnya mendekati 100 (selisih kecil wajar karena tiap persen dibulatkan).

`null` berarti modalnya belum diketahui — resep belum diisi. Jangan gambar bar kosong: bar kosong terbaca sebagai "nol persen", padahal artinya "belum tahu".

#### `saran_harga` — fitur 8

```json
"saran_harga": {
  "harga_impas": 21200,
  "harga_disarankan": 25500,
  "kenaikan": 5500,
  "untung_per_unit": 4300,
  "alasan": "Modal Anda Rp 21.200 per unit. Supaya untung sekitar 20%, jual Rp 25.500 — naik Rp 5.500 dari harga sekarang."
}
```

| Field | Arti |
|---|---|
| `harga_impas` | Modal apa adanya. **Di bawah ini pasti rugi** — ini lantainya |
| `harga_disarankan` | Markup 20% atas modal, dibulatkan **naik** ke kelipatan Rp 500 |
| `kenaikan` | Selisih dari harga sekarang |
| `untung_per_unit` | Untung kalau memakai harga yang disarankan |

**`null` kalau tidak ada yang perlu disarankan** — resep belum diisi (modal tidak diketahui), atau harganya sudah mencapai target. Sembunyikan bagiannya saat null, jangan tampilkan angka karangan.

**Tampilkan dua angka, bukan satu.** `harga_impas` adalah batas tidak-rugi; pedagang yang belum berani menaikkan harga sebanyak itu setidaknya tahu lantainya. Satu angka yang melompat jauh berisiko diabaikan sama sekali.

Dibulatkan **naik**, bukan ke terdekat: 21.200 × 1,2 = 25.440 → **25.500**. Membulatkan turun berarti menyarankan untung di bawah target yang baru saja dijanjikan.

`terlaris` dihitung sepanjang waktu, bukan per periode: sifatnya melekat pada produknya, dan angka yang berubah mengikuti rentang tanggal justru membingungkan.

### `POST /produk/dari-teks` — fitur 10

Kalimat bebas → **usulan** produk baru. Dipakai untuk "tambah produk tanpa form": pedagang cukup mengucapkan apa yang dia jual, tidak perlu mengisi delapan kolom.

```jsonc
// permintaan
{ "teks": "tambah kripik pisang, sekali bikin jadi 40 bungkus, dijual 20 ribu. bahannya pisang 20 kilo 300 ribu" }

// jawaban
{
  "nama_produk": "kripik pisang",
  "hasil_per_batch": 40,
  "harga_jual": 20000,
  "bahan": [
    { "nama": "pisang", "satuan": "kg", "jumlah": 20,
      "harga_beli": 300000, "jumlah_beli": 20, "perlu_dicek": false }
  ],
  "produk_mirip": [],
  "perlu_dicek": false,
  "yang_kurang": [],
  "catatan": []
}
```

**★ Tidak menyimpan apa pun.** Sama seperti `POST /transaksi/dari-teks` — ini hasil AI, jadi aturan #2 berlaku. Tampilkan usulannya, biarkan pengguna membetulkan, lalu kirim ke `POST /produk`.

| Field | Arti untuk frontend |
|---|---|
| `yang_kurang` | Pertanyaan yang **harus** dijawab dulu. Kalau tidak kosong, tahan tombol simpan |
| `perlu_dicek` | `true` persis ketika `yang_kurang` tidak kosong |
| `catatan` | Boleh dilewati, tapi **tampilkan** — mis. "modal belum bisa dihitung" |
| `produk_mirip` | Produk yang sudah ada dan namanya mirip. Kalau terisi, tanyakan dulu apakah ini produk yang sama |
| `bahan[].perlu_dicek` | Baris itu belum lengkap — tandai, jangan biarkan lolos |

Yang tidak disebut pedagang **dikembalikan kosong, bukan ditebak**. `harga_jual: null` berarti dia memang tidak menyebut harga — tanyakan, jangan isi angka masuk akal.

`produk_mirip` ada untuk mencegah duplikat: dua produk bernama "Kacang Telur" dan "Kacang Telor" memecah riwayat penjualannya jadi dua, dan keduanya lalu terlihat kurang laku dari kenyataan.

### `POST /produk`

Simpan produk. Jalan masuk kedua selain onboarding — menerima bentuk yang sama dengan keluaran `/produk/dari-teks` setelah dibetulkan pengguna, dan juga dipakai untuk menambah produk secara manual.

```jsonc
{
  "nama_produk": "Kripik Pisang",
  "harga_jual": 20000,
  "hasil_per_batch": 40,          // wajib kalau bahan diisi
  "bahan": [
    { "nama": "pisang", "satuan": "kg", "jumlah": 20,
      "harga_beli": 300000, "jumlah_beli": 20 }
  ]
}
```

Jawabannya sama bentuknya dengan `POST /onboarding/resep` — `produk_id`, `nama`, `modal_per_unit`, `harga_jual`, `margin_per_unit`, `merugi`, semuanya dari SQL.

**`bahan` boleh kosong.** Pedagang yang buru-buru berhak mencatat produknya dulu dan melengkapi resepnya nanti. Akibatnya:

- `modal_per_unit`, `margin_per_unit`, dan `merugi` bernilai **`null`** — bukan nol, bukan `false`
- penjualannya masuk `baris_tanpa_modal` di Beranda, tidak dihitung sebagai untung

Tampilkan produk seperti itu sebagai **"modal belum diisi"**, bukan sebagai untung penuh dan bukan sebagai rugi. Yang tidak diketahui harus tampil sebagai tidak diketahui.

Kalau `bahan` diisi, `hasil_per_batch` wajib dan setiap bahan wajib punya `jumlah`, `jumlah_beli`, dan `harga_beli` — resep setengah jadi menghasilkan modal yang salah tanpa pesan galat.

### `PATCH /produk/:id/harga` — **belum ada di backend**
Usulan dari desain Detail Produk: pedagang mengganti harga jual (mis. memakai harga yang disarankan fitur 8). Body `{ "harga_jual": 22000 }`, jawabannya **DetailProduk penuh** dengan margin/saran terbaru dari SQL — frontend tidak menghitung selisihnya sendiri.

**Harga modal TIDAK pernah bisa diubah lewat endpoint mana pun** — modal hasil hitungan resep (fitur 5). Mengubah modal = mengubah resep.

### `DELETE /produk/:id` — **belum ada di backend**
Usulan dari desain Detail Produk. Jawaban `{ "terhapus": true }`. Transaksi lama produk itu harus tetap utuh di laporan (jangan ikut terhapus) — detail keputusannya di pemilik backend.

### `PATCH /produk/:id/tenaga` — fitur 11

Hitung waktu pedagang sebagai bagian dari modal.

```jsonc
// permintaan
{ "jam_per_batch": 5, "upah_per_jam": 15000 }

// jawaban — bentuknya sama dengan POST /onboarding/resep
{ "ok": true, "data": {
    "produk_id": 3, "nama": "Donat",
    "modal_per_unit": 3550, "harga_jual": 3500,
    "margin_per_unit": -50, "merugi": true
} }
```

**Kenapa dua angka, bukan satu.** Tidak ada pedagang yang bisa menjawab "berapa
biaya tenaga per batch". Yang bisa dijawab: *sekali bikin butuh berapa jam*, dan
*sejam kerja di tempat orang dibayar berapa*. **Perkaliannya terjadi di SQL** —
frontend mengirim kedua angka apa adanya (aturan #7).

**Ini lapisan kedua dari temuan pertama.** Pedagang hampir tidak pernah
menghitung waktunya sendiri, jadi "untung" yang mereka rasakan selama ini sudah
termasuk membayar diri sendiri nol rupiah. Contoh di atas nyata: Donat yang
terlihat untung Rp 700 ternyata **rugi Rp 50** setelah 5 jam kerja dihitung.

| Field | Catatan |
|---|---|
| `jam_per_batch` | `0` sah dan berguna — itu cara membatalkan perhitungan waktu |
| `upah_per_jam` | Rupiah per jam. Tidak boleh minus |

Yang disimpan hanya hasil perkaliannya, bukan jam dan upah terpisah. Pedagang
yang ingin mengubah harus mengisi ulang keduanya.

Hasilnya muncul di `GET /produk/:id` sebagai `biaya_tenaga_per_unit` dan
`persen_tenaga`. **Tampilkan barisnya di rincian modal** — tanpa itu, rincian
bahan terlihat seolah sudah menjelaskan seluruh modal, dan pedagang menyimpulkan
modalnya cuma bahan.

## Ekstraksi

**Status: sudah jadi**, kecuali foto. Uji: `node scripts/uji-ekstraksi.mjs`.

Satu bentuk jawaban untuk semua jalan masuk, jadi layar konfirmasi yang sama
melayani suara, ketikan bebas, dan nanti foto — tanpa komponen baru.

### `POST /ekstraksi/dari-teks`

Kalimat bebas (hasil transkripsi suara di browser, atau ketikan) menjadi usulan.

```jsonc
// permintaan
{ "teks": "hari ini laku 10 kripik pisang sama 5 kacang telur" }

// jawaban
{ "ok": true, "data": {
    "ekstraksi_id": 12,
    "total_item": 15,
    "total_belanja": 225000,
    "baris": [
      { "urutan": 1, "nama_mentah": "kripik pisang", "produk_id": 1,
        "nama_produk": "Kripik Pisang", "jumlah": 10, "harga_satuan": 20000,
        "subtotal": 200000, "tanggal": null,
        "keyakinan": 1.0, "perlu_dicek": false },
      { "urutan": 2, "nama_mentah": "kacang telur", "produk_id": 2,
        "nama_produk": "Kacang Telur", "jumlah": 5, "harga_satuan": 5000,
        "subtotal": 25000, "tanggal": null,
        "keyakinan": 1.0, "perlu_dicek": false }
    ]
} }
```

**★ Tidak ada yang masuk ke `transaksi` pada tahap ini.** Hasilnya disimpan di
tabel `ekstraksi` berstatus `menunggu`, dan hanya `/ekstraksi/konfirmasi` yang
bisa memindahkannya. Aturan #2 ditegakkan struktur tabelnya, bukan kedisiplinan
penulis kodenya.

| Field | Catatan untuk frontend |
|---|---|
| `subtotal`, `total_item`, `total_belanja` | Dihitung SQL. **Jangan pernah** dihitung ulang di browser |
| `harga_satuan` | Kalau pedagang tidak menyebut harga, SQL mengisinya dari harga jual produk tersimpan — bukan nol |
| `keyakinan` | Skor pencocokan nama pg_trgm yang benar-benar diukur. Nama yang tidak cocok sama sekali berskor `0` |
| `perlu_dicek` | `true` juga saat jumlahnya tidak disebut — lihat `alasan_ragu` |
| `jumlah` | Kalau tidak disebut, diisi `1` **dan** ditandai `perlu_dicek`. Ini dugaan, jadi tidak boleh lolos tanpa dilihat manusia |

### `POST /ekstraksi/pratinjau`

Dipanggil **setiap kali pengguna menyunting satu baris** di layar konfirmasi.
Ada supaya frontend tidak pernah perlu mengalikan jumlah dengan harga sendiri.

```jsonc
// permintaan
{ "baris": [ { "urutan": 1, "produk_id": 1, "jumlah": 12, "harga_satuan": 20000, "tanggal": null } ] }
// jawaban
{ "ok": true, "data": {
    "baris": [ { "urutan": 1, "subtotal": 240000 } ],
    "total_item": 12,
    "total_belanja": 240000
} }
```

`harga_satuan: null` berarti pengguna mengosongkannya — SQL memakai harga jual
tersimpan, bukan menganggapnya nol. Tidak menyimpan apa pun.

### `POST /ekstraksi/konfirmasi`

Satu-satunya jalan hasil AI masuk ke `transaksi`.

```jsonc
// permintaan
{ "ekstraksi_id": 12,
  "baris": [ { "urutan": 1, "produk_id": 1, "jumlah": 12, "harga_satuan": 20000, "tanggal": null } ] }
// jawaban
{ "ok": true, "data": { "tersimpan": 1, "berkas_dihapus": true } }
```

- Baris dengan `produk_id: null` **dilewati**, bukan ditolak — pengguna berhak melewatkan baris yang tidak dia kenali
- **Konfirmasi kedua ditolak.** Statusnya diubah dengan `WHERE status = 'menunggu'` di dalam transaksi database yang sama dengan penulisan barisnya, jadi pengguna yang menekan tombol dua kali karena ragu tidak mencatat penjualannya dua kali
- `berkas_dihapus: true` menegaskan foto mentahnya sudah dihapus

### `POST /ekstraksi/foto` — **belum ada**

Model vision yang tersedia untuk tim sudah diukur dan belum lolos: pada tabel
tulisan tangan 29 baris, kolomnya bergeser dan saldonya dikarang, sementara
setiap baris dilaporkan dengan keyakinan 1,0. Kegagalan "tidak terbaca" aman
karena akan ditandai; kegagalan "salah tapi yakin" lolos ke database dan merusak
semua perhitungan di atasnya. Hasil pengukurannya di
[backend/spike/README.md](../backend/spike/README.md).

Sampai ada model yang lolos, `ekstraksiFoto()` di frontend menolak dengan jujur
dan menunjuk jalur suara. **Jangan menggantinya dengan data contoh** — baris
palsu yang tampil meyakinkan di layar konfirmasi adalah persis kegagalan yang
produk ini ada untuk mencegahnya.

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
Daftar pesanan masuk terbaru (maks 30), dari jalur tempel maupun WhatsApp, lengkap dengan angka yang sudah dihitung SQL. Pesan yang bukan pesanan tidak pernah muncul di sini.

```json
{ "ok": true, "data": [ {
  "pesan_id": 7, "jenis": "menawar", "teks": "bu saya mau pesan 20 bungkus…",
  "sumber": "whatsapp", "pengirim_samar": "…5616",
  "nama_produk_mentah": "kripik pisang", "jumlah": 20, "harga_diminta": 18000,
  "tanggal_dibutuhkan": null, "perlu_dicek": false,
  "diterima_pada": "2026-09-02T03:05:00.000Z",
  "produk_id": 3, "nama_produk": "Kripik Pisang", "modal_per_unit": 21200,
  "nilai_pesanan": 360000, "untung_pesanan": -64000, "merugi": true,
  "stok_cukup_untuk": 14
} ] }
```

Tipe: `PesanMasukItem[]` di `shared/types.ts`. `sumber` `whatsapp` berarti terbaca otomatis dari sambungan baca-saja; `pengirim_samar` hanya empat digit terakhir (privasi pembeli).

### `GET /whatsapp/status`
```json
{ "ok": true, "data": { "status": "terputus", "qr": null, "kode_pairing": null, "hanya_baca": true, "alasan": null } }
```

`status`: `terputus` · `menunggu_qr` · `menyambung` · `tersambung`. Saat `menunggu_qr`, `qr` berisi string mentah untuk dirender frontend sebagai kode QR (cara utama), atau `kode_pairing` berisi kode 8 digit kalau penautan diminta lewat nomor HP.

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
