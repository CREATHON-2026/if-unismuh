# Chatbot "Tanya lapakAi"

> **Status: sudah dibangun dan lolos uji.**
> Rancangan di dokumen ini dikerjakan di branch `feat/chatbot-tanya` —
> lihat [spec implementasinya](superpowers/specs/2026-09-02-chatbot-tanya-design.md).
> Semua 30 pemeriksaan `backend/scripts/uji-tanya.mjs` lolos, termasuk uji
> ketertelusuran yang mewajibkan tiap rupiah di jawaban punya padanan persis di
> `acuan`.
>
> Peringatan prioritas di bawah **tetap berlaku**: fitur ini tidak ada di
> [daftar prioritas](02-fitur-prioritas.md), jadi kalau alur inti goyah
> menjelang demo, ini yang pertama dikorbankan. Baca
> [bagian terakhir](#kapan-ini-layak-dikerjakan) sebelum menambah apa pun di
> atasnya.
>
> Satu keputusan berubah dari rancangan awal: chatbotnya **hanya-baca**, persis
> seperti saran di [bagian jalur tulis](#2-chatbot-yang-menulis-data). Maksud
> `catat_transaksi` tidak menyimpan apa pun — ia mengembalikan `alihkan_ke` dan
> layar Catat yang sudah ada yang menanganinya, lengkap dengan konfirmasi
> manusia. Nol permukaan aturan #2 baru.

Dokumen ini ada supaya kalau chatbot jadi dikerjakan, dikerjakannya **dengan
cara yang tidak melanggar [aturan #1](../CLAUDE.md)** — bukan supaya seseorang
mulai mengerjakannya besok pagi.

## Kenapa chatbot justru fitur paling berbahaya di produk ini

Chatbot cara biasa adalah: kirim pertanyaan pengguna beserta datanya ke LLM,
tampilkan jawabannya. Di aplikasi lain itu wajar. Di sini itu **menghancurkan
seluruh pertahanan teknis kita**.

Begitu pedagang bertanya *"untung saya bulan ini berapa?"*, model akan
menjumlahkan sendiri. Angkanya mungkin benar. Mungkin juga meleset Rp 40.000
dan tidak ada yang tahu. Yang pasti: **angkanya tidak bisa ditelusuri ke baris
sumbernya**, dan itu persis pertanyaan pertama yang akan diajukan juri.

Lebih buruk lagi, kegagalannya tidak berisik. Tidak ada pesan galat. Cuma angka
yang salah, disampaikan dengan kalimat yang meyakinkan.

> Chatbot adalah satu-satunya fitur di mana melanggar aturan #1 justru terasa
> seperti "cara kerja yang normal". Karena itu ia butuh dokumen sendiri.

## Arsitektur: LLM di dua ujung, SQL di tengah

Tiga langkah. LLM tidak pernah menyentuh angka di antaranya.

| # | Langkah | Alat | Yang keluar |
|---|---|---|---|
| 1 | Pahami maksud pertanyaan | `mintaJson()` + skema tertutup | `{ maksud, nama_produk_mentah?, dari?, sampai? }` — **tanpa satu angka hasil hitungan pun** |
| 2 | Hitung | SQL, view yang sudah ada | angka asli, bisa ditelusuri |
| 3 | Susun kalimat | template, atau `mintaTeks()` | kalimat berisi angka dari langkah 2 |

Langkah 1 hanya **mengklasifikasi**; ia boleh menyalin nama produk apa adanya
dan menerjemahkan "bulan ini" jadi rentang tanggal, tapi tidak boleh
menghasilkan rupiah. Langkah 3 hanya **merangkai bahasa**; semua angka
disodorkan kepadanya sebagai fakta jadi.

### Preseden yang sudah ada — salin polanya

Ini bukan pola baru. `backend/src/modules/pesanan/pesanan.llm.ts:338–387`
sudah melakukannya persis untuk menyusun balasan WhatsApp, lengkap dengan
penjagaan berlapis:

1. Semua angka dihitung SQL dulu, lalu disodorkan ke prompt sebagai FAKTA
2. Prompt melarang keras mengubah atau menambah angka
3. Jawaban tetap menyertakan `acuan` berisi angka SQL, sehingga siapa pun bisa
   mencocokkan apakah kalimatnya jujur

Poin ketiga yang paling penting dan paling sering dilupakan. **Kalimat dari LLM
tanpa `acuan` di sebelahnya tidak bisa diaudit.** Kalau `jawaban` menyebut
Rp 420.000 sementara `acuan.untung_bersih` berisi 380000, ada yang salah — dan
itu ketahuan, bukan lolos diam-diam.

## Daftar maksud: tertutup, bukan terbuka

Enam maksud bisa dijawab **tanpa menulis satu view SQL baru pun**.

| `maksud` | Contoh pertanyaan | Sumber angka |
|---|---|---|
| `untung_periode` | "untung saya bulan ini berapa?" | `beranda.queries.ts` → `ringkasanPenjualan()` |
| `produk_merugi` | "produk mana yang rugi?" | `v_margin_produk` (`merugi`, `margin_per_unit`) |
| `modal_produk` | "modal kripik pisang berapa?" | `v_modal_produk` (`modal_per_unit`) |
| `saran_harga` | "harusnya saya jual berapa?" | `v_saran_harga` (`harga_disarankan`, `harga_impas`) |
| `kapasitas_stok` | "bahan saya cukup buat berapa?" | `v_kapasitas_produk` (`maks_unit`) |
| `produk_terlaris` | "apa yang paling laku?" | `produk.queries.ts` (kolom `terlaris`) |

Dan maksud ketujuh yang **wajib ada**:

| `tidak_paham` | apa pun di luar enam di atas | tidak ada — jawab jujur |

`tidak_paham` bukan penanganan galat. Ia adalah penerapan langsung
[aturan #8](../CLAUDE.md): kalau ragu, bertanya — jangan menebak. Chatbot yang
memaksakan jawaban untuk pertanyaan yang tidak ia pahami adalah chatbot yang
mengarang.

**Daftarnya tertutup.** Menambah maksud berarti menambah query, bukan
memperlonggar prompt.

## Kontrak API

### `POST /tanya`

```json
// permintaan
{ "teks": "untung saya bulan ini berapa?" }

// jawaban
{ "ok": true, "data": {
    "maksud": "untung_periode",
    "jawaban": "Bulan ini omzet Rp 3.600.000, untung bersihnya Rp 420.000.",
    "acuan": {
      "omzet": 3600000,
      "untung_bersih": 420000,
      "jumlah_baris": 24,
      "baris_tanpa_modal": 2
    },
    "peringatan": [
      "2 transaksi belum ikut dihitung untungnya karena resepnya belum diisi."
    ]
} }
```

| Field | Catatan |
|---|---|
| `maksud` | Salah satu dari tujuh nilai di atas. Frontend boleh memakainya untuk memilih tampilan, bukan untuk menghitung |
| `jawaban` | Kalimat siap tampil. **Setiap angka di dalamnya wajib ada padanannya di `acuan`** |
| `acuan` | Angka mentah dari SQL. **`null` hanya kalau `maksud` = `tidak_paham`** |
| `peringatan` | Kalimat siap tampil. Diisi kalau ada yang tidak terhitung — mis. `baris_tanpa_modal > 0` |

Kalau `maksud` = `tidak_paham`:

```json
{ "ok": true, "data": {
    "maksud": "tidak_paham",
    "jawaban": "Maaf, saya belum bisa menjawab itu. Yang bisa saya bantu: untung bulan ini, produk yang merugi, modal per produk, saran harga, sisa bahan, dan produk paling laku.",
    "acuan": null,
    "peringatan": []
} }
```

`acuan: null` di sini disengaja dan bermakna: **secara struktur mustahil
mengarang angka untuk pertanyaan yang tidak dipahami.**

Tipe `TanyaReq` / `TanyaRes` masuk ke `shared/types.ts`. Perubahan di `shared/`
adalah kontrak antar sisi — **wajib dikabarkan ke tim**, dan endpoint ini juga
harus ditambahkan ke [06-kontrak-api.md](06-kontrak-api.md) sebelum frontend
mulai menulis kode.

## Langkah 1 — skema klasifikasi

```ts
// tanya.llm.ts
const SKEMA = {
  type: 'object',
  properties: {
    maksud: {
      type: 'string',
      enum: ['untung_periode', 'produk_merugi', 'modal_produk', 'saran_harga',
             'kapasitas_stok', 'produk_terlaris', 'tidak_paham'],
    },
    nama_produk_mentah: { type: 'string' },
    dari:   { type: 'string' },
    sampai: { type: 'string' },
  },
  required: ['maksud'],
} as const;
```

Tiga pembersih yang **tidak boleh dilewati** — ketiganya sudah ada di
`lib/llm.ts` dan ketiganya lahir dari bug sungguhan:

| Pembersih | Kenapa |
|---|---|
| `kosongJadiNull(hasil, ['nama_produk_mentah'])` | Model lokal mengisi field kosong dengan `""` atau frasa `"tidak disebutkan"`, bukan menghilangkannya |
| `tanggalSah(hasil.dari)` | Gemma mengembalikan `"bulan ini"` apa adanya, yang langsung menjatuhkan query ke kolom `DATE` |
| Validasi `maksud` terhadap daftar | Model kadang mengarang nilai enum di luar daftar. Yang tidak dikenali → `tidak_paham`, bukan galat |

**Pencocokan nama produk lewat satu pintu.** Jangan menulis pencocokan sendiri —
pakai `cocokkanNamaProduk()` di `pesanan.service.ts`, yang sudah dipakai
transaksi, ekstraksi, dan produk. Kalau skornya di bawah ambang atau selisih
kandidat teratas dan kedua di bawah 0,15, **tanyakan** ("Maksudnya Kripik
Pisang?"), jangan pilih sendiri. Alasan lengkapnya di
[04-pipeline-ai.md](04-pipeline-ai.md#tahap-4--pencocokan-nama-produk).

## Langkah 3 — template dulu, LLM belakangan

Dua pilihan, dan **untuk demo pilih yang pertama**:

| | Template | `mintaTeks()` |
|---|---|---|
| Waktu | ~0 ms | +3 dtk (hangat), +13 dtk (dingin) |
| Risiko angka melenceng | nol | ada, walau prompt melarang |
| Terasa seperti chatbot | cukup | lebih luwes |

Satu panggilan LLM per pertanyaan sudah ~3 detik saat model hangat dan ~13
detik saat dingin (lihat `KEEP_ALIVE` di `lib/llm.ts`). Dua panggilan
melipatgandakannya — dan jeda 26 detik di atas panggung adalah kegagalan demo,
bukan sekadar lambat.

Kalau tetap memakai `mintaTeks()`, prompt-nya wajib meniru
`bangunPromptBalasan()`: daftar FAKTA di atas, larangan menghitung yang
eksplisit, dan perintah memakai angka **persis apa adanya**.

## Berkas yang perlu dibuat

Ikuti [urutan menambah modul](../backend/CLAUDE.md#menambah-modul-baru):

| Berkas | Isi |
|---|---|
| `backend/src/modules/tanya/tanya.types.ts` | union `Maksud`, bentuk internal |
| `backend/src/modules/tanya/tanya.queries.ts` | query per maksud, **semua ber-`WHERE user_id = $1`** |
| `backend/src/modules/tanya/tanya.llm.ts` | `klasifikasiPertanyaan()` + prompt penyusun jawaban |
| `backend/src/modules/tanya/tanya.service.ts` | klasifikasi → pilih query → susun jawaban |
| `backend/src/modules/tanya/tanya.controller.ts` | validasi bentuk, `kirim()` |
| `backend/src/modules/tanya/tanya.routes.ts` | `rutTanya.use(wajibLogin)` lalu `rutTanya.post('/', jalur(tanya))` |
| `backend/src/server.ts` | `app.use('/tanya', rutTanya)` |
| `shared/types.ts` | `TanyaReq` / `TanyaRes` — kabari tim |
| `docs/06-kontrak-api.md` | dua orang menulis frontend dari dokumen ini |
| `frontend/src/screens/Tanya.tsx` | **menampilkan saja** — [aturan #7](../CLAUDE.md) |
| `frontend/src/api/client.ts` | fungsi `tanya()` |

Tidak ada view SQL baru, tidak ada tabel baru, tidak ada perubahan skema.

## Empat hal yang jangan dilakukan

### 1. Text-to-SQL

Meminta model menulis query terdengar elegan dan merusak dua aturan sekaligus:
perhitungan pindah ke LLM (aturan #1), dan `WHERE user_id = $1` bisa hilang —
lalu data pedagang lain keluar dari database. Isolasi terjadi di database,
bukan di aplikasi. Pakai daftar maksud tertutup.

### 2. Chatbot yang menulis data

Kalau "catat penjualan 10 kripik" langsung tersimpan, itu pelanggaran
[aturan #2](../CLAUDE.md). Kalau chatbot boleh mencatat, hasilnya **wajib**
masuk tabel `ekstraksi` dengan `status = 'menunggu'` dan lewat layar
konfirmasi, sama seperti jalur foto dan suara. Tidak ada jalan pintas.

Saran: untuk versi pertama, buat chatbot **hanya-baca**. Menambah kemampuan
menulis melipatgandakan permukaan risikonya.

### 3. Asisten serba bisa

Batasi ke data pedagang sendiri. Pertanyaan resep masakan, cuaca, atau
"bagaimana cara menaikkan omzet" dijawab `tidak_paham`. Chatbot yang menjawab
apa saja akan dinilai sebagai pembungkus ChatGPT — dan itu justru menghapus
keunggulan yang kita bangun.

### 4. Riwayat percakapan bertingkat

"Kalau yang itu bagaimana?" memaksa model menyimpulkan rujukan, dan salah
rujuk berarti menjawab pertanyaan tentang produk yang salah dengan angka yang
benar — jenis kesalahan yang paling sulit terlihat. Satu pertanyaan, satu
jawaban.

## Cara mengujinya

Repo ini tidak punya test runner, dan itu
[keputusan sadar](13-superpowers.md#bahaya-2--hukum-besi-tdd-dan-kenyataan-repo-ini).
Yang berlaku:

```bash
cd backend && npm run typecheck
node backend/scripts/uji-alur.mjs      # server harus hidup di :3000
```

Untuk fitur ini, tambahkan `backend/scripts/uji-tanya.mjs` **sebelum menulis
kode**, berisi minimal:

- tujuh pertanyaan, satu per maksud, memastikan klasifikasinya benar
- satu pertanyaan di luar cakupan → `maksud` harus `tidak_paham` dan
  `acuan` harus `null`
- satu pemeriksaan yang mencocokkan angka di `jawaban` dengan `acuan` —
  ini yang menangkap model yang diam-diam membulatkan

Pemeriksaan terakhir itu yang paling berharga. Tanpanya, pelanggaran aturan #1
akan lolos tanpa suara.

## Kapan ini layak dikerjakan

Aturan repo ini berbunyi **"korbankan dari bawah, jangan dari atas"**. Chatbot
berada di bawah nomor 24 — di bawah semua yang pernah direncanakan.

Sementara itu Fitur 1 (foto buku), salah satu dari empat tulang punggung demo,
belum benar-benar jalan. [06-kontrak-api.md](06-kontrak-api.md) sudah
menetapkan bahwa sampai ada model yang lolos, `ekstraksiFoto()` harus **menolak
dengan jujur** dan *"jangan menggantinya dengan data contoh"*.

**Syarat sebelum mulai:**

- [ ] Fitur 1, 4, 7, dan 9 stabil dan jujur
- [ ] Fitur 11–15 sudah dikerjakan atau sadar dilewati
- [ ] Masih tersisa waktu yang cukup untuk `uji-tanya.mjs`, bukan hanya kodenya

Kalau salah satu belum terpenuhi, chatbot yang tidak ada **tidak dihitung
sebagai kegagalan** — juri tidak tahu ia pernah direncanakan. Alur inti yang
pecah saat demo dihitung.
