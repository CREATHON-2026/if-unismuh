# Chatbot bebas — menjawab apa saja dari data pedagang

**Tanggal:** 2026-09-02
**Menggantikan:** `2026-09-02-chatbot-tanya-design.md`
**Status:** disetujui pengguna, siap dibangun

---

## 1. Kenapa yang lama dibongkar

Chatbot versi pertama mengenali **delapan maksud tetap**. LLM memilih satu dari
delapan, SQL menjawabnya, template menyusun kalimat. Rapi, bisa ditelusuri, dan
mustahil berhalusinasi.

Juga mustahil dipakai.

Pedagang tidak bertanya dalam delapan bentuk. Mereka bertanya:

> "Kenapa bulan ini terasa sepi padahal jualan terus?"
> "Mending saya naikkan harga kripik atau kurangi ukurannya?"
> "Kalau saya jual 25 ribu, sebulan dapat berapa?"
> "Yang mana yang sebaiknya saya berhenti bikin?"

Tidak satu pun masuk ke delapan kotak itu. Semuanya jatuh ke `tidak_paham`,
dan jawabannya selalu kalimat yang sama: *"Yang bisa saya jawab soal untung,
modal, harga, stok, dan produk yang paling laku."*

Pengguna menyatakannya langsung:

> "saya ingin chatbotnya bebas menjawab apa saja berdasarkan data, jangan
> dibatasi dan jangan cuman menghitung."

Kalimat itu memuat dua keluhan terpisah. **"Jangan dibatasi"** — hapus delapan
kotaknya. **"Jangan cuman menghitung"** — chatbot yang hanya membacakan angka
tidak lebih berguna daripada layar Beranda yang sudah menampilkannya lebih
cepat. Yang dicari adalah penafsiran: apa artinya, dan sebaiknya bagaimana.

## 2. Batu karang yang tidak boleh disentuh

Membebaskan LLM menjawab adalah arah yang berlawanan dengan aturan #1 di
`CLAUDE.md`: **LLM tidak pernah menghitung.** Seluruh desain ini adalah usaha
mendapatkan kebebasan tanpa melanggar aturan itu.

Pemisahnya satu kalimat:

> **LLM boleh memilih angka mana yang relevan dan apa artinya. LLM tidak boleh
> menghasilkan angka.**

"Kripik pisang rugi Rp 1.200 tiap terjual, dan itu produk paling laku Bapak —
jadi makin laku makin dalam ruginya" adalah penafsiran. Semua angkanya sudah
ada sebelum LLM dipanggil. LLM hanya memilih dan merangkai.

"Kalau dinaikkan jadi 25.000, untungnya jadi Rp 3.800" adalah perhitungan.
Angka itu tidak ada sebelumnya. Ini yang harus dicegah.

## 3. Arsitektur yang dipilih

Tiga pilihan dipertimbangkan; pengguna memilih **B**.

| | Cara | Kenapa tidak / ya |
|---|---|---|
| A | LLM menjawab dari lembar fakta saja | Tidak bisa menjawab "kalau harganya 25 ribu" — dan itu justru pertanyaan paling berharga |
| **B** | **LLM menjawab dari lembar fakta, dan boleh MEMINTA perhitungan yang dijalankan SQL** | **Bebas, tapi tiap angka baru tetap lahir di SQL** |
| C | LLM diberi akses SQL langsung | Injeksi, kebocoran lintas pengguna, query yang menggantung. Tidak untuk dipakai orang sungguhan |

### Alurnya

```
pertanyaan
   |
   v
[SQL] lembar fakta         <- seluruh data pedagang, satu peta datar
   +  8 giliran terakhir
   |
   v
[LLM] tahap 1  ---- perlu_hitung? ----> [SQL] jalankan hitungan
   |                                        |
   | tidak                                  v
   |                                   [LLM] tahap 2: rangkai jawaban
   v                                        |
   +<---------------------------------------+
   |
   v
penjaga rupiah (mode catat) -> simpan percakapan -> jawaban
```

Dua panggilan LLM hanya terjadi kalau pertanyaannya memang butuh perhitungan
baru. Pertanyaan biasa selesai dalam satu panggilan.

## 4. Lembar fakta

Satu fungsi SQL, `lembarFakta(userId)`, mengembalikan **peta datar**
`Record<string, number | string>` berisi seluruh keadaan usaha:

```
usaha_nama            "Warung Bu Sari"
periode                "bulan berjalan (2026-09-01 s/d 2026-09-02)"
omzet_periode          4200000
untung_periode         268000
jumlah_transaksi       6
transaksi_tanpa_modal  0

produk_1_nama                 "Kripik Pisang"
produk_1_harga_jual           20000
produk_1_modal_per_unit       21200
produk_1_margin_per_unit      -1200
produk_1_terjual_periode      160
produk_1_omzet_periode        3200000
produk_1_harga_disarankan     25500
produk_1_bahan_cukup_untuk    40
...
```

**Datar, bukan bersarang.** Tiga alasannya saling menguatkan:

1. Model 7–27B jauh lebih andal membaca `kunci: nilai` baris demi baris
   daripada JSON bersarang.
2. Kuncinya bisa disebut ulang oleh LLM sebagai daftar `kunci_dipakai`, dan
   service tinggal mencarinya untuk menyusun `acuan`.
3. Penjaga rupiah bisa memeriksa keanggotaan dengan satu `Set`.

Setiap nilai lahir dari view yang **sudah dipakai layar lain** —
`v_margin_produk`, `v_kapasitas_produk`, `v_saran_harga`,
`ringkasanPenjualan()`. Tidak ada rumus baru. Chatbot yang punya rumus sendiri
cepat atau lambat menjawab angka berbeda dari Beranda untuk pertanyaan yang
sama, dan pedagang tidak punya cara tahu mana yang benar.

Yang tidak diketahui **tidak diisi**. Produk tanpa resep tidak punya kunci
`modal_per_unit` sama sekali — bukan `0`, bukan `null`. Kunci yang hilang
membuat model berkata "belum bisa dihitung"; nilai `0` membuatnya berkata
"modalnya nol rupiah".

## 5. Permintaan hitung

LLM boleh mengembalikan satu `perlu_hitung` dari **daftar tertutup**:

| Jenis | Argumen | SQL menghitung |
|---|---|---|
| `simulasi_harga` | `produk`, `harga_baru` | Margin baru, untung sebulan pada laju penjualan sekarang |
| `untung_periode` | `dari`, `sampai` | Omzet dan untung bersih pada rentang itu |

Daftarnya sengaja pendek. Tiap jenis adalah query yang **kita** tulis; LLM
hanya mengisi argumennya. Argumen divalidasi sebelum menyentuh SQL: `harga_baru`
harus bilangan bulat wajar, tanggal harus `YYYY-MM-DD` yang sah, nama produk
lewat `cocokkanNamaProduk()` yang sama dengan Pesanan Masuk.

Menambah jenis baru berarti menulis query baru — dan itu memang penghalang yang
diinginkan.

## 6. Penjaga rupiah

Setiap angka rupiah di jawaban akhir dicocokkan ke lembar fakta dan hasil
hitungan. Angka yang tidak punya padanan berarti model mengarang.

Pengguna memilih mode **`catat`**, bukan `blokir`:

> penjaga_rupiah = **biarkan**

Jadi pemeriksaannya tetap berjalan, hasilnya ditulis ke log dan ke
`acuan._rupiah_tak_terverifikasi`, tapi jawabannya tetap ditampilkan.
Alasannya jujur: memblokir berarti pedagang melihat "maaf" untuk jawaban yang
kemungkinan besar benar, dan itu lebih merusak demo daripada satu angka
meleset.

Ambangnya satu konstanta, `MODE_PENJAGA_RUPIAH`, supaya bisa dibalik ke
`blokir` dalam satu baris kalau juri mempertanyakan ketertelusuran.

## 7. Ingatan percakapan

`docs/14-chatbot.md` §4 sebelumnya **menolak** ingatan percakapan, dengan alasan
"kalau yang itu bagaimana?" memaksa model menyimpulkan rujukan, dan salah rujuk
berarti menjawab soal produk yang salah dengan angka yang benar.

Keputusan itu dibalik. Alasannya berubah: dulu jawaban dirakit template dari
satu maksud, jadi salah rujuk berarti seluruh jawaban salah tanpa jejak.
Sekarang setiap jawaban membawa `acuan` berisi **nama produk** yang dipakai —
jadi salah rujuk terlihat oleh pedagang di kartu angka di bawah jawaban, bukan
tersembunyi.

Delapan giliran terakhir, tabel `percakapan`, dipangkas per pengguna.

## 8. Penjaga cakupan

Chatbot ini bukan asisten umum. Pertanyaan di luar usaha pedagang dan aplikasi
ini dijawab dengan penolakan yang ramah dan `acuan: null`.

Yang **di dalam** cakupan lebih luas daripada versi lama, dan itu disengaja:
selain angka, chatbot boleh menjelaskan cara memakai aplikasi ("di mana saya
catat penjualan?"), memberi saran usaha yang bersandar pada datanya, dan
menjawab pertanyaan lanjutan yang bersifat percakapan.

## 9. Yang tidak berubah

- Modul ini **tidak pernah menulis** ke tabel bisnis. Pedagang yang melaporkan
  penjualan tetap dialihkan ke layar Catat (aturan #2).
- Frontend tetap **tidak menghitung apa pun** (aturan #7).
- Kartu `acuan` di bawah jawaban tetap ada — sekarang isinya kunci yang
  benar-benar disebut LLM, bukan seluruh lembar fakta.

## 10. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `backend/db/schema.sql` | Tabel `percakapan` |
| `backend/src/modules/tanya/tanya.queries.ts` | `lembarFakta()`, `simulasiHarga()`, `riwayat()`, `simpanGiliran()` |
| `backend/src/modules/tanya/tanya.llm.ts` | Tulis ulang: bebas + permintaan hitung |
| `backend/src/modules/tanya/tanya.service.ts` | Orkestrasi dua tahap, penjaga rupiah, penjaga cakupan |
| `backend/src/modules/tanya/tanya.types.ts` | Tipe lembar fakta dan permintaan hitung |
| `shared/types.ts` | `TanyaReq.percakapan_id`, `TanyaRes.maksud` disederhanakan |
| `backend/scripts/uji-tanya.mjs` | Grup 3 dipertahankan, ditambah uji cakupan dan ingatan |
| `docs/14-chatbot.md` | §4 dibalik, arsitektur baru |

## 11. Cara memverifikasi

Tidak ada framework pengujian di repo ini, dan itu keputusan sadar
(`CLAUDE.md`). Baselinenya:

```bash
cd backend  && npm run typecheck
cd frontend && npm run build
node backend/scripts/uji-tanya.mjs     # server hidup di :3000
```

`uji-tanya.mjs` grup 3 adalah yang paling penting: ia menarik setiap `Rp …`
dari `jawaban` dan menuntut padanan persis di `acuan`. Grup itu **dipertahankan
apa adanya** — kebebasan menjawab tidak boleh menurunkan ketertelusuran.

## 12. Yang ditemukan saat pengujian, dan cara memperbaikinya

Empat kegagalan muncul saat `uji-tanya.mjs` dijalankan terhadap implementasinya.
Semuanya nyata, dan **tak satu pun bisa diperbaiki dengan prompt yang lebih
keras saja**. Dicatat di sini karena bentuk kegagalannya lebih berharga daripada
tambalannya.

| # | Gejala | Akar masalah | Perbaikan |
|---|---|---|---|
| 1 | "tadi laku 12 kripik pisang" dijawab, bukan dialihkan | Instruksi `lapor_penjualan` terkubur di tengah prompt | Blok sendiri dengan empat contoh, termasuk satu contoh negatif |
| 2 | Ditanya "kalau dijual **25000**", dijawab soal **25.500** | Model mengambil `harga_disarankan` dari lembar fakta | `hargaSesuaiPertanyaan()` + menyalin angka yang pedagang tulis |
| 3 | "yang itu" mengenai produk yang salah | Model memilih yang paling **sering**, bukan paling **baru** | `produkTerakhirDisebut()` memindai riwayat dari yang terbaru |
| 4 | Untung pengandaian dijawab tanpa SQL pernah jalan | Model menghitung sendiri di kepalanya | `pengandaianHarga()` memaksa SQL jalan dari sisi server |

### Kenapa #4 yang paling penting

Jawabannya waktu itu: *"kalau yang itu dijual Rp 7.000, untungnya jadi
Rp 5.000."* Angkanya **benar** — 7.000 dikurangi modal 2.000. Tapi model yang
menghitungnya, dan Rp 5.000 kebetulan sama dengan `kacang_telur_harga_jual`,
fakta yang sama sekali tidak berhubungan. Uji ketertelusuran menyatakannya sah.

Artinya: **penjaga berbasis pencocokan angka punya batas yang tidak bisa
dilampaui.** Selama satu angka karangan kebetulan sama dengan satu fakta mana
pun di lembar, ia lolos. Satu-satunya jalan keluar adalah tidak memberi model
kesempatan menghitung — keputusannya dipindahkan ke server.

### Temuan kelima: prompt tahap dua harus dipaku

Setelah #4 diperbaiki, SQL berjalan dengan benar tetapi model **mengabaikan
hasilnya** — hasil simulasi ikut tenggelam di antara puluhan baris fakta produk,
dan model menjawab memakai angka produk lain yang terlihat lebih menyenangkan.

Perbaikannya struktural, bukan tekstual: hasil hitung disimpan terpisah di
`Lembar.hasilTeks` dan ditaruh **di kepala** prompt tahap dua, dengan lembar
fakta lengkap turun ke bawah sebagai latar. Yang menentukan bukan seberapa keras
larangannya, melainkan apa yang dibaca model lebih dulu.

> Benang merah empat perbaikan terakhir: **prompt bukan penjaga.** Prompt
> mengurangi peluang salah; kode menghapusnya.
