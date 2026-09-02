# Chatbot "Tanya lapakAi"

> **Status: sudah dibangun, dibongkar, dan dibangun ulang. Lolos uji.**
> Dikerjakan di branch `feat/chatbot-tanya`. Rancangan pertama —
> delapan maksud tertutup — ada di
> [spec pertama](superpowers/specs/2026-09-02-chatbot-tanya-design.md).
> Rancangan yang sekarang berlaku ada di
> [spec kedua](superpowers/specs/2026-09-02-chatbot-bebas-design.md).
> Semua pemeriksaan `backend/scripts/uji-tanya.mjs` lolos, termasuk uji
> ketertelusuran yang mewajibkan tiap rupiah di jawaban punya padanan persis di
> `acuan`.
>
> **Apa yang berubah dan kenapa.** Versi pertama hanya bisa menjawab delapan
> pertanyaan yang sudah didaftar. Pertanyaan kesembilan — termasuk yang paling
> wajar diucapkan pedagang, seperti *"kenapa untung saya kecil padahal jualan
> terus?"* — dijawab dengan penolakan. Itu bukan asisten, itu menu yang
> menyamar. Daftar maksudnya dibongkar dan diganti **lembar fakta**: semua
> angka yang mungkin dibutuhkan dihitung SQL lebih dulu, lalu model bebas
> menafsirkannya. Yang tertutup sekarang bukan daftar pertanyaannya, melainkan
> daftar angkanya — dan justru itu yang dijaga aturan #1.
>
> Peringatan prioritas di bawah **tetap berlaku**: fitur ini tidak ada di
> [daftar prioritas](02-fitur-prioritas.md), jadi kalau alur inti goyah
> menjelang demo, ini yang pertama dikorbankan. Baca
> [bagian terakhir](#kapan-ini-layak-dikerjakan) sebelum menambah apa pun di
> atasnya.
>
> Satu keputusan bertahan dari rancangan awal: chatbotnya **hanya-baca**, persis
> seperti saran di [bagian jalur tulis](#2-chatbot-yang-menulis-data). Maksud
> `catat_transaksi` tidak menyimpan apa pun — ia mengembalikan `alihkan_ke` dan
> layar Catat yang sudah ada yang menanganinya, lengkap dengan konfirmasi
> manusia. Nol permukaan aturan #2 baru.

Dokumen ini ada supaya chatbot dikerjakan **dengan cara yang tidak melanggar
[aturan #1](../CLAUDE.md)** — dan supaya siapa pun yang menyentuhnya nanti tahu
penjaga mana yang tidak boleh dilepas, beserta kegagalan yang melahirkannya.

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

## Arsitektur: SQL dulu, model belakangan

Empat langkah. Model tidak pernah menyentuh aritmetika di antaranya.

| # | Langkah | Alat | Yang keluar |
|---|---|---|---|
| 1 | Susun **lembar fakta** | SQL, view yang sudah ada | `Record<string, number \| string>` berisi semua yang bisa diketahui tentang usaha ini |
| 2 | Tahap satu | `mintaJson()` | jawaban, **atau** permintaan hitung — tidak keduanya |
| 3 | Hitung, kalau diminta | SQL | hasilnya disisipkan ke lembar fakta yang sama |
| 4 | Tahap dua | `mintaJson()` | kalimat akhir, dari hasil langkah 3 |

Langkah 2 dan 4 hanya **merangkai bahasa**. Semua angka sudah jadi sebelum
model membacanya. Langkah 3 dilewati untuk sebagian besar pertanyaan — sekali
panggil model sudah cukup.

### Lembar fakta: yang tertutup adalah angkanya, bukan pertanyaannya

Inti perubahan dari rancangan pertama ada di sini. Model boleh menjawab apa
saja, tapi ia hanya punya satu sumber angka:

```
== RINGKASAN PERIODE BERJALAN ==
omzet_periode_berjalan: Rp 300.000
untung_bersih_periode_berjalan: Rp 48.000

== PRODUK ==
kripik_pisang_harga_jual: Rp 20.000
kripik_pisang_modal_per_unit: Rp 21.200
kripik_pisang_untung_per_unit: -Rp 1.200
kripik_pisang_harga_disarankan: Rp 25.500
...
```

Tiga keputusan kecil di lembar ini yang menentukan apakah jawabannya jujur:

- **Kuncinya memakai nama produk, bukan nomor urut.** `produk_1_modal` memaksa
  model mengingat produk mana yang nomor satu. `kripik_pisang_modal_per_unit`
  tidak bisa salah rujuk, dan bisa dikembalikan model sebagai `kunci_dipakai`.
- **Rupiah ditulis lengkap dengan titiknya, dan model diminta MENYALIN.** Itu
  yang membuat penjaga di `tanya.service.ts` bisa mencocokkan tiap `Rp ...` di
  jawaban dengan padanan persis.
- **Nilai yang belum diketahui DIHILANGKAN, bukan diisi nol.** Kunci yang
  hilang membuat model berkata "belum bisa dihitung". Nol membuatnya berkata
  "modalnya nol rupiah", dan pedagang tidak punya cara tahu itu bohong.

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

### `acuan` dirakit dari dua arah

Chatbot bebas membuat langkah ini lebih penting, bukan kurang.

**Maju** — kunci yang model akui dipakai lewat `kunci_dipakai`. Ini menangkap
fakta bukan-uang, misalnya "bahannya cukup untuk 40 bungkus", yang tidak akan
pernah ketemu lewat pencarian angka.

**Mundur** — tiap kunci rupiah di lembar fakta dipetakan ke deretan digitnya,
lalu dicari di kalimat jawaban. Ini yang membuat kartu "angka yang dipakai"
tetap jujur meski model lupa mengakui kuncinya. Tanpanya, angka yang **benar**
terlihat seperti angka karangan oleh siapa pun yang memeriksa — dan itu
menghapus seluruh nilai uji ketertelusuran.

### Penjaga: server yang memutuskan, bukan model

Empat penjaga di `tanya.service.ts` lahir dari kegagalan sungguhan selama
pengembangan, bukan dari kekhawatiran teoretis. Masing-masing ditulis dengan
komentar yang menyebut kegagalan yang melahirkannya.

| Penjaga | Kegagalan yang melahirkannya |
|---|---|
| `periksaRupiah()` | Angka yang tidak punya padanan di lembar fakta ditandai. Mode `catat` (bawaan) mencatatnya di `peringatan`; mode `blokir` menahan jawabannya |
| `hargaSesuaiPertanyaan()` | Ditanya "kalau dijual **25000**", dijawab tentang **25.500** — `harga_disarankan` dari lembar fakta yang terlihat lebih pantas. Jawabannya benar secara aritmetika dan lolos penjaga rupiah, tapi menjawab pertanyaan yang tidak pernah diajukan |
| `produkTerakhirDisebut()` | "yang itu" diselesaikan model dengan produk yang paling **sering** muncul di riwayat, bukan yang paling **baru**. Angkanya benar, barangnya salah |
| `pengandaianHarga()` | Ditanya "kalau yang itu saya jual 7000", model menjawab "untungnya Rp 5.000" **tanpa pernah meminta perhitungan**. Ia menghitung sendiri di kepalanya — aturan #1 dilanggar telak |

Yang terakhir paling penting dan paling halus. Rp 5.000 kebetulan sama dengan
`kacang_telur_harga_jual`, fakta yang sama sekali tidak berhubungan, sehingga
penelusuran rupiah menganggapnya sah. **Penjaga berbasis pencocokan angka tidak
akan pernah bisa menangkap kebetulan semacam itu.** Maka keputusannya
dipindahkan ke server: kalau kalimatnya pengandaian harga dan memuat satu angka
yang jelas, SQL dijalankan — mau model memintanya atau tidak.

> Pelajarannya bisa dipakai di luar chatbot: **prompt yang lebih keras bukan
> penjaga.** Penjaga adalah kode yang tidak memberi model kesempatan salah.

Satu batasan yang dipegang teguh: penjaga-penjaga itu **membaca tulisan, tidak
pernah menghitung**. `hargaTertulis()` menyalin deretan digit yang memang ada di
kalimat pedagang. "25 ribu" sengaja tidak dikenali — menurunkan 25000 dari "25"
adalah perkalian, dan perkalian di TypeScript adalah aturan #1 yang bocor lewat
pintu belakang.

## Daftar maksud: tinggal tiga

Rancangan pertama punya tujuh maksud, satu per pertanyaan yang boleh ditanyakan.
Sekarang tiga, dan tak satu pun menentukan *isi* jawabannya:

| `maksud` | Artinya | `acuan` |
|---|---|---|
| `bebas` | Pertanyaan soal usaha ini, dijawab dari lembar fakta | berisi kunci yang dipakai |
| `catat_transaksi` | Pedagang **melaporkan** penjualan, bukan bertanya | `null` — dialihkan ke `/catat` |
| `tidak_paham` | Di luar cakupan: politik, cuaca, resep masakan | **wajib** `null` |

`tidak_paham` bukan penanganan galat. Ia adalah penerapan langsung
[aturan #8](../CLAUDE.md): kalau ragu, bertanya — jangan menebak.

`catat_transaksi` adalah penerapan langsung [aturan #2](../CLAUDE.md). "Tadi
laku 12 kripik pisang" **tidak disimpan** oleh chatbot. Ia dikembalikan sebagai
`alihkan_ke: { layar: '/catat', teks: '<kalimat asli pedagang>' }`, dan layar
Catat yang sudah ada menanganinya lengkap dengan konfirmasi manusia.

**Yang tertutup sekarang adalah lembar faktanya.** Menambah kemampuan berarti
menambah fakta ke `tanya.fakta.ts` — bukan memperlonggar prompt, dan bukan
menambah maksud.

## Ingatan percakapan

Enam belas baris terakhir per pedagang, disimpan di tabel `percakapan`, dipangkas
tiap giliran. Riwayat chatbot tidak punya nilai arsip, dan tabel yang tumbuh
selamanya adalah tabel yang suatu saat memperlambat pertanyaan berikutnya.

Rancangan pertama sengaja **tidak** punya ingatan, dengan alasan yang masih
benar: salah rujuk berarti menjawab pertanyaan tentang produk yang salah dengan
angka yang benar. Yang berubah bukan penilaian atas risikonya, melainkan
tersedianya cara membendungnya — `produkTerakhirDisebut()` menyelesaikan
rujukan di kode, bukan di prompt. Lihat [bagian penjaga](#penjaga-server-yang-memutuskan-bukan-model).

Angka di percakapan lama **tidak pernah** dipakai sebagai sumber. Riwayat hanya
untuk memahami rujukan; angkanya selalu dibaca ulang dari lembar fakta.

## Kontrak API

### `POST /tanya`

```json
// permintaan
{ "pertanyaan": "kenapa untung saya kecil padahal jualan terus?" }

// jawaban
{ "ok": true, "data": {
    "maksud": "bebas",
    "jawaban": "Karena Kripik Pisang justru rugi Rp 1.200 tiap bungkus terjual, Bapak/Ibu — modalnya Rp 21.200 tapi dijual Rp 20.000. Makin laku, makin dalam ruginya.",
    "acuan": {
      "kripik_pisang_untung_per_unit": -1200,
      "kripik_pisang_modal_per_unit": 21200,
      "kripik_pisang_harga_jual": 20000
    },
    "peringatan": []
} }
```

| Field | Catatan |
|---|---|
| `maksud` | `bebas`, `catat_transaksi`, atau `tidak_paham`. Frontend memakainya untuk memilih tampilan, bukan untuk menghitung |
| `jawaban` | Kalimat siap tampil. **Setiap angka rupiah di dalamnya wajib ada padanannya di `acuan`** |
| `acuan` | Angka mentah dari SQL, kunci apa adanya dari lembar fakta. **`null` kalau `maksud` bukan `bebas`** |
| `peringatan` | Kalimat siap tampil. Diisi kalau ada transaksi yang belum bisa dihitung untungnya, atau kalau ada angka yang tidak bisa dicocokkan |
| `alihkan_ke` | Hanya untuk `catat_transaksi`: `{ layar, teks }` |

Kalau `maksud` = `tidak_paham`:

```json
{ "ok": true, "data": {
    "maksud": "tidak_paham",
    "jawaban": "Maaf, saya hanya bisa membantu soal usaha Bapak/Ibu — penjualan, modal, untung, harga, dan stok bahan.",
    "acuan": null,
    "peringatan": []
} }
```

`acuan: null` di sini disengaja dan bermakna: **secara struktur mustahil
mengarang angka untuk pertanyaan yang tidak dipahami.**

Tipe `TanyaReq` / `TanyaRes` ada di `shared/types.ts`. Perubahan di `shared/`
adalah kontrak antar sisi — **wajib dikabarkan ke tim**, dan endpoint ini juga
harus ada di [06-kontrak-api.md](06-kontrak-api.md).

## Dua perhitungan yang boleh diminta model

Selain lembar fakta, ada dua angka yang tidak mungkin disiapkan lebih dulu
karena bergantung pada isi pertanyaan. Model memintanya lewat `minta_hitung`,
dan **SQL yang menjalankannya**:

| Jenis | Kapan | Query |
|---|---|---|
| `simulasi_harga` | "kalau kripik saya jual 25.000 bagaimana?" | `simulasiHarga()` |
| `untung_periode` | rentang tanggal di luar periode berjalan | `ringkasanPenjualan()` milik Beranda |

Hasilnya disisipkan ke lembar fakta yang sama, jadi ia mewarisi seluruh
perlindungan yang berlaku untuk fakta lain — termasuk pencocokan rupiah dan
perakitan `acuan`.

Bidang `minta_hitung` sengaja **datar**, bukan objek bersarang
(`minta_hitung`, `hitung_produk`, `hitung_harga_baru`, `hitung_dari`,
`hitung_sampai`). Model sekelas gemma/qwen tidak dapat diandalkan mengisi objek
di dalam objek.

**Pencocokan nama produk lewat satu pintu.** Jangan menulis pencocokan sendiri —
pakai `cocokkanNamaProduk()` di `pesanan.service.ts`, yang sudah dipakai
transaksi, ekstraksi, dan produk. Kalau skornya di bawah ambang, **tanyakan**
("Maksudnya Kripik Pisang?"), jangan pilih sendiri. Alasan lengkapnya di
[04-pipeline-ai.md](04-pipeline-ai.md#tahap-4--pencocokan-nama-produk).

## Berapa lama satu pertanyaan

Satu panggilan model ~3 detik saat hangat, ~13 detik saat dingin (lihat
`KEEP_ALIVE` di `lib/llm.ts`). Sebagian besar pertanyaan cukup satu panggilan —
lembar fakta sudah memuat jawabannya. Dua panggilan hanya terjadi kalau
perhitungan benar-benar diminta, dan di situ jedanya memang dibayar untuk
sesuatu yang tidak bisa didapat dengan cara lain.

Jeda 26 detik di atas panggung adalah kegagalan demo, bukan sekadar lambat.
Karena itu lembar fakta dibuat selengkap mungkin: **tiap fakta yang disiapkan
lebih dulu adalah satu panggilan model yang tidak jadi terjadi.**

## Berkas

Mengikuti [urutan menambah modul](../backend/CLAUDE.md#menambah-modul-baru):

| Berkas | Isi |
|---|---|
| `backend/src/modules/tanya/tanya.types.ts` | bentuk internal, daftar jenis hitung |
| `backend/src/modules/tanya/tanya.queries.ts` | **semua SQL**, semua ber-`WHERE user_id = $1` |
| `backend/src/modules/tanya/tanya.fakta.ts` | perakit lembar fakta — **tidak boleh ada `+`, `-`, atau `*` di berkas ini** |
| `backend/src/modules/tanya/tanya.llm.ts` | prompt dua tahap, pembacaan JSON |
| `backend/src/modules/tanya/tanya.service.ts` | orkestrasi dan seluruh penjaga |
| `backend/src/modules/tanya/tanya.controller.ts` | validasi bentuk, `kirim()` |
| `backend/src/modules/tanya/tanya.routes.ts` | `rutTanya.use(wajibLogin)` |
| `backend/db/schema.sql` | tabel `percakapan` |
| `backend/db/susulan.sql` | `CREATE TABLE IF NOT EXISTS percakapan` untuk database yang sudah ada |
| `shared/types.ts` | `TanyaReq` / `TanyaRes` — kabari tim |
| `frontend/src/screens/Tanya.tsx` | **menampilkan saja** — [aturan #7](../CLAUDE.md) |

Tidak ada view SQL baru. Satu tabel baru, `percakapan`, dan tidak ada angka
finansial di dalamnya.

> **Kenapa ada `susulan.sql`.** `schema.sql` hanya dijalankan kalau tabel
> `pengguna` belum ada, jadi tabel baru tidak pernah sampai ke database
> pengembangan rekan tim yang sudah terisi. `susulan.sql` dijalankan tiap boot
> dan **hanya boleh berisi pernyataan `IF NOT EXISTS` yang tidak menyentuh
> data**.

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

Batasi ke data pedagang sendiri. Pertanyaan resep masakan, cuaca, atau politik
dijawab `tidak_paham`. Chatbot yang menjawab apa saja akan dinilai sebagai
pembungkus ChatGPT — dan itu justru menghapus keunggulan yang kita bangun.

> **Yang berubah:** larangan ini dulu juga menutup pertanyaan seperti *"kenapa
> untung saya kecil?"* dan *"produk mana yang sebaiknya saya hentikan?"*, karena
> keduanya tidak ada di daftar tujuh maksud. Itu salah sasaran. Menafsirkan
> angka yang sudah dihitung SQL **bukan** melanggar aturan #1 — yang dilanggar
> adalah menghasilkan angka baru. Sekarang model bebas menafsirkan dan
> menyarankan; yang tetap tertutup adalah dari mana angkanya boleh datang.
>
> Batas cakupannya sendiri tidak berubah: di luar usaha pedagang ini, tetap
> `tidak_paham`.

### 4. Riwayat percakapan tanpa penjaga

"Kalau yang itu bagaimana?" memaksa model menyimpulkan rujukan, dan salah
rujuk berarti menjawab pertanyaan tentang produk yang salah dengan angka yang
benar — jenis kesalahan yang paling sulit terlihat pedagang.

> **Yang berubah:** ingatan percakapan sekarang **ada**, tapi rujukannya
> diselesaikan di kode, bukan di prompt. `produkTerakhirDisebut()` memindai
> riwayat dari yang terbaru ke yang terlama. Risiko yang dijelaskan di atas
> nyata dan sempat terjadi — model memilih produk yang paling **sering**
> disebut, bukan yang paling **baru**. Yang membuatnya boleh dipasang bukan
> penilaian ulang atas risikonya, melainkan adanya penjaga deterministik yang
> membendungnya. Tanpa penjaga itu, larangan ini tetap berlaku.

## Cara mengujinya

Repo ini tidak punya test runner, dan itu
[keputusan sadar](13-superpowers.md#bahaya-2--hukum-besi-tdd-dan-kenyataan-repo-ini).
Yang berlaku:

```bash
cd backend && npm run typecheck
node backend/scripts/uji-tanya.mjs     # server harus hidup
```

`uji-tanya.mjs` memeriksa enam hal, dan **grup 3 adalah alasan berkas ini ada**:

| # | Grup | Yang dijaga |
|---|---|---|
| 1 | Pertanyaan bebas tetap terjawab | lima pertanyaan berbeda bentuk — angka, sebab, pendapat, saran, cara pakai aplikasi |
| 2 | Batasnya tetap dijaga | politik → `tidak_paham` dengan `acuan` **wajib** `null`; laporan penjualan → `/catat`, dan omzet **tidak berubah** sesudahnya |
| 3 | **Ketertelusuran** | tiap `Rp ...` di jawaban wajib punya padanan di `acuan` |
| 4 | Simulasi harga | dihitung database, dan angkanya dibandingkan dengan hitungan tangan |
| 5 | Rujukan lanjutan | "kalau yang itu…" harus mengenai produk yang benar |
| 6 | Isolasi | pedagang lain tidak melihat angka kita; tanpa token ditolak |

Dua kebiasaan yang membuat berkas ini tetap bernilai:

- **Angkanya dihitung tangan lebih dulu.** Fixture-nya sama persis dengan
  `uji-beranda.mjs`: Kripik Pisang modal 21.200 dijual 20.000 (rugi 1.200),
  Kacang Telur modal 2.000 dijual 5.000. Omzet 300.000, untung 48.000.
  Ketertelusuran saja tidak cukup — angka bisa tertelusur tapi menjawab
  pertanyaan yang lain.
- **Pemeriksaan yang dilewati dihitung terpisah, bukan dianggap lolos.**
  Sebagian jalur hanya ditempuh kalau model memilihnya. Menghitungnya sebagai
  lolos berarti berkas ini bisa hijau tanpa menguji apa pun.

Untuk perilaku baru, tambahkan pemeriksaannya **sebelum** menulis kode. Untuk
rumus finansial ini wajib — angka yang salah adalah kegagalan paling mahal di
produk ini.

## Kapan ini layak dikerjakan

Aturan repo ini berbunyi **"korbankan dari bawah, jangan dari atas"**. Chatbot
berada di bawah nomor 24 — di bawah semua yang pernah direncanakan. Ia sudah
jadi, tapi urutannya tidak berubah.

**Yang berlaku sekarang:** kalau menjelang demo ada alur inti yang goyah,
chatbot ini yang pertama dilepas dari daftar demo. Melepasnya murah — hapus
tautannya dari navigasi, kodenya boleh tetap di tempatnya. Chatbot yang tidak
ditunjukkan **tidak dihitung sebagai kegagalan**; juri tidak tahu ia ada. Alur
inti yang pecah di atas panggung dihitung.

**Yang tidak boleh dikorbankan dari fitur ini:** penjaga-penjaga di
[bagian penjaga](#penjaga-server-yang-memutuskan-bukan-model) dan grup 3 di
`uji-tanya.mjs`. Melepas salah satunya untuk mengejar waktu berarti mengubah
chatbot yang bisa dipertanggungjawabkan jadi chatbot yang kadang mengarang —
dan itu justru yang paling mahal saat ditanya juri.
