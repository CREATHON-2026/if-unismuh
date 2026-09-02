# Pesanan Masuk → Pembayaran → Proses → Untung

Status: disetujui · 2 September 2026

Menjembatani kotak masuk pesanan dengan buku besar. Sampai sekarang keduanya tidak
pernah bersentuhan: pedagang melihat "untung pesanan ini Rp 64.000" lalu tidak
bisa berbuat apa-apa dengan angka itu.

## Masalah

`pesan_masuk` dan `transaksi` adalah dua pulau. Tidak ada satu baris kode pun yang
menyeberang. Akibatnya alur Pesanan Masuk berhenti di analisis — fitur yang paling
sering didemokan justru yang paling buntu.

Tiga cacat ditemukan saat menelusuri kode:

**1. Mengetuk pesan tersimpan menduplikasi barisnya.**
`PesananMasuk.tsx` → `tinjau()` → `periksaTeks(p.teks)` → `POST /pesanan/analisis`
→ `prosesPesan()` → `simpanPesan()`. Tiap ketukan menjalankan ulang LLM **dan
meng-INSERT baris baru**. Daftar membengkak sendiri, dan karena model tidak
deterministik, pesan yang sama bisa berubah klasifikasinya tiap kali dibuka.

**2. Tidak ada asal-usul `pesanan`.** `transaksi.sumber` hanya mengenal
`foto|suara|manual`. Baris buku besar yang lahir dari pesanan tidak akan bisa
ditelusuri balik — padahal kemampuan menelusuri itulah jawaban kita ke juri soal
halusinasi angka.

**3. `kandidat` tidak pernah sampai ke daftar.** `PesanMasukItem` tidak
membawanya, jadi pedagang melihat penanda "PERLU DICEK" tanpa pernah diberi
pilihan untuk membetulkannya. Aturan #8 setengah jalan: kita bertanya, tapi tidak
menyediakan jawabannya.

## Rancangan

### Tiga tabel, tiga peran

| Tabel | Isinya | Boleh diubah? |
|---|---|---|
| `pesan_masuk` (ada) | Apa kata pembeli + apa yang dibaca AI | **Tidak pernah** — jejak audit |
| `pesanan` (baru) | Apa yang **disetujui pedagang** | Ya, oleh pedagang |
| `transaksi` (ada) | Buku besar; ditulis hanya saat pesanan selesai | Tidak |

Ini menyalin pola `ekstraksi → transaksi` yang sudah terbukti di modul ekstraksi.

**Kenapa bukan sekadar menambah kolom ke `pesan_masuk`.** Itu akan mencampur "apa
kata pembeli" dengan "apa yang disepakati". Percampuran persis itulah yang
melahirkan bug pembalik untung yang diperbaiki kemarin: harga total pembeli
tersimpan seolah harga satuan yang disetujui. Kalau pedagang mengoreksi produk
dari "Donat" ke "Donat Coklat", koreksi itu harus punya tempatnya sendiri —
menimpa bacaan AI berarti menghapus bukti.

### Mesin status

```
pesan_masuk ──ketuk──> bottom sheet (koreksi produk/jumlah/harga)
                              │ [Proses pesanan]
                              ▼
                    #0902-07  menunggu_bayar
                              │
              LANGKAH 1 — PEMBAYARAN
              tunai · transfer · qris (Midtrans) · nanti
                              ▼
                          diproses
                              │
              LANGKAH 2 — PENYELESAIAN (barang diserahkan)
                              ▼
                          selesai ──> tulis transaksi
                                      kurangi stok
                                      UNTUNG NAIK
                                      struk bisa dicetak

    batal (dari status mana pun) + alasan_batal
        └──> GAGAL. Tidak pernah menyentuh buku besar.
```

**Status = tahap PENYERAHAN BARANG, bukan keadaan uang.** Rancangan awal menamai
status tengah ini `dibayar`, dan itu diubah saat implementasi: pesanan kasbon
akan tampil "Dibayar" di layar padahal uangnya belum masuk. Kebohongan diam-diam
itu dilarang aturan #2 sama kerasnya dengan menyimpan tanpa konfirmasi. Fakta
pembayaran hidup terpisah, di `cara_bayar` dan `dibayar_pada`.

**Untung naik di langkah 2, bukan saat dibayar.** Uang masuk belum tentu barang
keluar; yang dibayar tapi belum diserahkan adalah titipan, bukan pendapatan. Ini
akuntansi yang benar sekaligus momen demo yang bagus: *"sudah dibayar Rp 360.000,
untungnya baru dihitung setelah barangnya diserahkan."*

**"bayar nanti" ada karena piutang itu nyata.** Pedagang mikro sering menyerahkan
barang dulu dan ditagih belakangan, dan utang yang terlupa adalah salah satu
kebocoran uang terbesar mereka. Pesanan `nanti` tetap boleh diselesaikan —
untungnya dihitung, barangnya keluar — tapi riwayat menandainya sebagai belum
dibayar sampai pedagang menandai lunas.

### Nomor — tiga, masing-masing ada gunanya

| Nomor | Contoh | Untuk siapa |
|---|---|---|
| No. Pesanan | `#0902-07` | Diucapkan pedagang ke pembeli, ditulis di buku |
| No. Transaksi | `TRX-123` | Penelusuran baris buku besar ke Beranda |
| Ref. Bayar | `LAPAK-7-1756…` | `order_id` Midtrans, hanya kalau QRIS |

`#0902-07` = MMDD + urutan hari itu, reset harian, **per pedagang**. Dipilih karena
pedagang menyebut nomor ini lisan — "pesanan nomor tujuh" harus bisa diucapkan.
Nomor urut global akan membocorkan volume usaha antar pengguna.

Formatnya lahir di SQL, bukan TypeScript:

```sql
to_char(tanggal,'MMDD') || '-' || lpad(urutan_harian::text, 2, '0')
```

Tabrakan dicegah `UNIQUE (user_id, tanggal, urutan_harian)`.

### Semua uang lahir di SQL — `v_pesanan`

`nilai_pesanan`, `untung_pesanan`, `merugi`, dan `stok_cukup_untuk` dihitung di
view, sama seperti `v_margin_produk` dan `v_kapasitas_produk`. Tidak ada satu pun
aritmetika finansial di TypeScript maupun React (aturan #1 dan #7).

### Stok berkurang saat selesai

```
GREATEST(0, jumlah − (jumlah_pakai / hasil_per_batch) × qty)
```

`GREATEST` karena `CHECK (jumlah >= 0)` akan membatalkan seluruh transaksi
database kalau hasilnya negatif. Bahan yang **belum pernah dicatat stoknya tetap
NULL** — tidak tahu bukan berarti nol, konsisten dengan `v_kapasitas_produk`.

Tanpa ini, peringatan "bahan cukup untuk 14" akan berbohong setelah beberapa
pesanan — kelas kegagalan yang sama dengan bug pembalik untung.

### Idempotensi

```sql
UPDATE pesanan SET status='selesai'
WHERE id=$1 AND user_id=$2 AND status='diproses'
RETURNING id
```

Nol baris = sudah diproses atau dibatalkan → 409. Ketuk dua kali tetap satu baris
buku besar. Penulisan transaksi, pengurangan stok, dan perubahan status terjadi
dalam **satu** transaksi database — masuk semua atau tidak sama sekali.

### Pembayaran

Manual (`tunai`/`transfer`/`nanti`) selalu tersedia dan tidak butuh apa pun.
`qris` memanggil Midtrans Snap, yang mengembalikan `redirect_url`. Tautan itu
dirender jadi **QR lokal** dengan `react-qr-code` (sudah terpasang untuk QR
WhatsApp) **dan** disertai tombol salin — pembeli di depan mata tinggal memindai,
pembeli jauh menerima tautannya lewat WhatsApp yang **pedagang tempel sendiri**.

`gross_amount` **selalu** dibaca ulang dari `v_pesanan.nilai_pesanan`. Tidak pernah
dari LLM, tidak pernah dari frontend, tidak pernah dari badan permintaan.

Tanpa kunci di `.env`, seluruh jalur Midtrans mati dan tombol QRIS tidak muncul.
Aplikasi tetap berfungsi penuh.

Polling, bukan webhook: webhook menuntut URL publik, dan sesuatu yang menuntut
tunneling saat demo adalah sesuatu yang akan gagal saat demo.

### Struk

Rute `/struk/:id`, lebar 58 mm (kertas termal standar), dicetak lewat
`window.print()` sehingga printer Bluetooth mana pun yang dikenali layanan cetak
Android bisa dipakai tanpa Web Bluetooth. Disertai tombol salin teks untuk
ditempel ke WhatsApp.

> **Struk tidak memuat modal maupun untung.** Struk bisa dilihat pembeli; margin
> adalah rahasia dagang pedagang. Endpoint struk punya bentuk baliknya sendiri
> yang memang tidak punya field itu — bukan sekadar disembunyikan di CSS.

## Kontrak API

| Endpoint | Guna |
|---|---|
| `GET /pesanan/:id/pilihan` | Kandidat + seluruh produk, lewat `cariKandidatProduk` yang sudah ada |
| `POST /proses` | Buat pesanan dari pesan → nomor |
| `GET /proses/:id` | Satu pesanan, angka dari `v_pesanan` |
| `POST /proses/:id/bayar` | Catat pembayaran → `diproses`; `qris` memanggil Midtrans |
| `GET /proses/:id/bayar/status` | Polling status Midtrans |
| `POST /proses/:id/selesai` | Tulis transaksi + kurangi stok |
| `POST /proses/:id/batal` | Batalkan + alasan |
| `GET /proses` | Riwayat, semua status |
| `GET /proses/:id/struk` | Data struk — tanpa modal/untung |

## Aturan yang mengikat

- **#1** LLM tidak menghitung. Semua uang lahir di SQL, termasuk `gross_amount`.
- **#2** Buku besar hanya ditulis setelah pedagang menekan tombol di langkah 2.
- **#4** Sistem tidak pernah mengirim ke nomor pembeli. Tautan bayar dan struk
  **disalin pedagang**. Tidak ada jalur kirim di seluruh modul ini.
- **#7** Frontend tidak menghitung apa pun, termasuk struk.
- **#8** Nama produk yang tidak meyakinkan **ditanyakan lewat pilihan**, bukan
  ditebak — dan sekarang pilihannya benar-benar disediakan.

## Verifikasi

`backend/scripts/uji-proses.mjs` ditulis **sebelum** implementasi. Dua belas
pemeriksaan; yang terpenting: **untung Beranda naik persis sebesar
`untung_pesanan`**, selesai dua kali tetap satu baris, harga tawar yang tercatat,
dan pengguna lain tidak bisa memproses pesan milik orang lain.

## Yang sengaja tidak dikerjakan

- **Webhook Midtrans** — butuh URL publik, terlalu rapuh untuk demo.
- **Kirim otomatis tautan bayar ke pembeli** — melanggar aturan #4.
- **Pesanan banyak baris** (dua produk dalam satu pesan) — satu pesanan satu
  produk dulu; pesan berisi dua produk diproses dua kali.
- **Refund / pembatalan setelah selesai** — buku besar tidak boleh diedit.
  Pembatalan hanya sebelum `selesai`.

## Catatan keamanan

Kunci Midtrans yang tersedia adalah **kunci PRODUCTION** (`Mid-server-…`, bukan
`SB-Mid-server-…`). Disimpan hanya di `.env` yang sudah ter-gitignore dan dibaca
lewat `config/env.ts` seperti `JWT_SECRET`. **Tidak ada uji otomatis yang membuat
tagihan sungguhan.** Verifikasi autentikasi memakai panggilan tanpa efek samping:
`GET /v2/{id-acak}/status` — `401` kalau kunci salah, `404` kalau kunci benar.
Kunci sudah pernah melewati riwayat percakapan; rotate setelah demo.
