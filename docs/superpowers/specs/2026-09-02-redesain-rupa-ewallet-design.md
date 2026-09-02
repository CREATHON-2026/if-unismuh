# Redesain rupa lapakAi — bahasa visual E-Wallet

Tanggal: 2026-09-02
Status: disetujui, siap dikerjakan

## Kenapa

Rupa lapakAi sekarang jujur tapi datar: kanvas abu, kartu putih bergaris, satu
kartu navy per layar. Fungsinya tidak salah — tapi tiga menit pertama demo
dinilai dari apa yang terlihat **sebelum** angka pertama muncul, dan layar yang
menyerupai template admin tidak menolong nilai Presentasi.

Rujukannya: **E-Wallet Mobile App Design**, Figma Community
`Le3CBwA6dKoCOi4wWZMJRQ`, lima frame 375×812 — Home, Transfer, Contact,
Statistic, Succes.

## Temuan yang mengubah cara kerja: berkas Figma-nya rata gambar

Berkas itu tidak punya layer. Setiap frame hanya **satu `RECTANGLE` berisi PNG**:

```
=== FRAME 3:72 "Home" 375x812 anak=1
  - RECTANGLE "Home" 375x812
### total node: 10   ### WARNA: (kosong)   ### TIPOGRAFI: (kosong)
```

Sepuluh node untuk lima layar penuh. Tidak ada `fills`, `style`, maupun
`cornerRadius` yang bisa dibaca.

Artinya MCP Figma **tidak akan memberi lebih dari ini**, dan kegagalan token
kemarin sebenarnya tidak menghalangi apa pun. Warna diambil dengan cara satu-
satunya yang tersedia: render frame jadi PNG 2× lewat `/v1/images`, lalu sampel
pikselnya. Nilai di bawah adalah hasil ukur, bukan hasil kira.

Catat ini supaya tidak ada yang membuang waktu memperbaiki MCP lagi untuk
berkas yang memang kosong.

## Palet hasil sampel

| Peran | Nilai | Dipakai untuk |
|---|---|---|
| Ungu merek | `#6F12F6` | FAB, nav aktif, tautan, batang grafik |
| Ungu terang | `#9149FA` | Aksen di atas gelap, ujung terang tombol |
| Ungu tua | `#4C00BA` | Ujung terang gradien hero |
| Ungu pekat | `#20014D` | Ujung gelap gradien hero, kartu gelap |
| Permukaan | `#F8F8FA` | Kolom cari, ubin ikon, panel sekunder |
| Tinta rujukan | `#0E0023` | **tidak diambil** — `tinta #0F172A` sudah setara |
| Hijau rujukan | `#4ED3A3` | **tidak diambil** — lihat bawah |

Gradien hero terbaca diagonal: terang di kanan-atas (`#4C00BA`), pekat di
kiri-bawah (`#20014D`). Tombol utama `#9B5CFF` → `#7222F5` dengan cahaya ungu
di bawahnya.

## Aturan warna tidak ikut berubah

Ini bagian yang paling mudah dirusak oleh redesain, jadi ditulis eksplisit.

**Hijau `#4ED3A3` dari frame Succes tidak dipakai.** Di rujukan, hijau berarti
"berhasil". Di sini hijau **hanya** berarti untung. Centang di layar Struk tetap
memakai `untung` / `untung-muda` yang sudah ada — dan itu kebetulan jujur:
pesanan yang selesai memang persis saat itulah untungnya tercatat ke buku besar.

Hijau, merah, dan kuning tidak berubah satu digit pun.

Ungu justru **menolong** aturan ini. Sebelumnya lapakAi tidak punya satu pun
warna yang boleh dipakai tanpa arti, sehingga setiap aksen berisiko terbaca
sebagai isyarat uang. Sekarang ada warna netral yang bisa memikul beban hiasan,
dan hijau/merah/kuning jadi lebih murni daripada sebelumnya, bukan kurang.

## Bayangan: dibuka, tapi terbatas

`index.css` menolak bayangan dengan alasan terukur — di ponsel murah berkontras
rendah yang dipakai di bawah matahari, bayangan halus hilang sama sekali;
garis tidak. Alasan itu masih benar dan tidak dicabut.

Yang berubah: bayangan sekarang boleh dipakai **hanya untuk benda yang memang
mengambang di atas benda lain** — FAB, kartu aksi yang menimpa hero, dan bottom
sheet. Pada ketiganya bayangan bukan hiasan melainkan penjelas kedalaman, dan
kalaupun hilang di bawah matahari, susunannya tetap terbaca karena benda itu
memang tumpang tindih secara geometri.

Kartu biasa tetap bergaris. Tidak ada `shadow` di `.kartu`.

## Pemetaan 5 frame → 21 layar

| Frame | Ciri yang diambil | Layar |
|---|---|---|
| **Home** | Gradien hero dengan angka besar **di dalam header**, kartu aksi mengambang, grid ubin ikon, nav ber-FAB | `Beranda` |
| **Statistic** | Latar polos, judul tengah, angka besar, dua kartu statistik berglif besar | `DetailProduk`, `ProdukTerlaris` |
| **Contact** | Kolom cari pil, daftar dua baris berlingkaran, judul kelompok abu | `DaftarProduk`, `PesananMasuk`, `RiwayatPesanan` |
| **Transfer** | Header gradien + tombol kembali kotak-membulat, lembar putih naik, tombol utama gradien | `ResepHarga`, `ProsesPesanan`, `CatatSuara`, rantai onboarding |
| **Succes** | Judul "Receipt", centang berhalo, baris label–nilai, panel "See Detail" | `StrukPesanan` |

### Yang paling berharga dari frame Home

Angka terpentingnya hidup **di dalam gradien header**, bukan di dalam kartu.

Untuk Beranda itu lebih kuat daripada `KartuHero` sekarang. Untung bersih
berhenti menjadi *satu kartu di antara beberapa kartu* dan menjadi **halamannya
sendiri** — persis pesan yang layar itu ada untuk menyampaikannya. Uang masuk
turun jadi baris pendamping, bukan pesaing.

## Tombol tengah NavBawah: Catat, bukan chatbot

Permintaan awalnya chatbot di slot tengah. Ditolak, dengan dua alasan.

**Pertama, gerbangnya belum terbuka.** `docs/14-chatbot.md` menyatakan chatbot
sengaja belum dikerjakan — di bawah prioritas #24, dengan syarat tertulis yang
belum satu pun terpenuhi. `POST /tanya` belum ada sama sekali; membangunnya
berarti tujuh berkas backend baru plus `uji-tanya.mjs`, yaitu tugas
arsitektural kedua yang ditempelkan ke redesain.

**Kedua, rujukannya sendiri tidak begitu.** FAB tengah di frame Home berikon
*scan* — aksi menangkap yang paling sering dipakai, bukan percakapan.
Padanan persisnya di lapakAi adalah **Catat**: foto buku, suara, ketik. Nol
backend baru, dan justru lebih setia pada desain yang ditiru.

Slot kelima diisi **Riwayat**, yang sekarang terkubur di dalam `PesananMasuk`.

Susunannya: Beranda · Produk · **[Catat]** · Pesanan · Riwayat.

## Strategi: token dulu, layar belakangan

`hero` dipakai 37 kali di 24 berkas, dan seluruhnya lewat token (`bg-hero`,
`text-hero`). Artinya mendefinisikan ulang `--color-hero` **mengubah 24 berkas
tanpa menyentuh satu pun**. Begitu juga `rounded-kartu`, `rounded-kontrol`, dan
sembilan tingkat ukuran huruf.

Urutannya karena itu: token → komponen bersama → layar. Setelah komponen
selesai, 21 layar sudah berubah rupanya sendiri; sisanya hanya untuk layar yang
susunannya memang berbeda.

Konsekuensi yang disengaja: pekerjaan ini **bisa dihentikan di titik mana pun**
tanpa meninggalkan layar setengah jadi.

## Token yang berubah

```
--color-merek:         #6F12F6      baru
--color-merek-terang:  #9149FA      baru
--color-merek-tua:     #4C00BA      baru
--color-merek-pekat:   #20014D      baru
--color-merek-muda:    #F3EBFE      baru

--color-hero:          #2A0170      dulu #1B2536
--color-hero-muda:     #43108F      dulu #2A3648
--color-permukaan:     #F8F8FA      baru

--radius-kartu:        24px         dulu 20px
--radius-kontrol:      16px         dulu 14px
--radius-lembar:       32px         baru
--radius-ubin:         18px         baru

--text-nomor-hero:     46px         baru

--shadow-mengambang:   0 8px 24px -6px rgb(15 23 42 / .16)     baru
--shadow-fab:          0 10px 24px -6px rgb(111 18 246 / .45)  baru
```

Kelas utilitas baru, ditulis sekali supaya dua puluh layar tidak menebak
sendiri: `.hero-gradien`, `.tombol-gradien`, `.lembar`.

**Kontras wajib diukur ulang.** `untung-terang #4ADE80` dan `rugi-terang
#FCA5A5` sekarang duduk di atas ungu pekat, bukan navy. Kalau ada yang jatuh di
bawah 4,5:1, yang digeser warnanya — bukan ambangnya. Ini persis pelajaran dari
`redup #646D79` yang sudah tertulis di `index.css`.

## Komponen

Baru:

| Berkas | Guna |
|---|---|
| `KepalaHero.tsx` | Header gradien penuh-lebar: aman-atas, slot kiri, judul tengah, slot kanan, lalu label + angka besar opsional |
| `Lembar.tsx` | Lembar putih sudut atas 32px yang naik menimpa hero |
| `KartuAksi.tsx` | Kartu putih mengambang berisi 3–4 aksi cepat |
| `UbinIkon.tsx` | Ubin ikon + `GridUbin` |
| `TombolIkon.tsx` | Tombol ikon kotak-membulat bergaris |

Dirombak: `NavBawah`, `Tombol`, `KartuHero`, `Layar`, `KartuMetrik`,
`InputTeks`, `BarisDaftar`, `BottomSheet`, `Segmented`, `Lencana`.

### Jebakan yang sudah ketahuan sebelum mulai

`NavBawah` menandai slot aktif dengan `pathname.startsWith(ke)`. Begitu Riwayat
masuk di `/pesanan/riwayat`, **dua slot menyala bersamaan**. Diganti ke aturan
awalan terpanjang yang menang.

## Yang tidak ikut disalin

**Kerapatannya.** Rupa e-wallet padat karena penggunanya membuka aplikasi itu
puluhan kali sehari dan hafal letak semuanya. Pengguna lapakAi berusia 35–60
tahun dengan literasi digital rendah. Ukuran huruf dan target sentuh di sini
sengaja lebih besar daripada dashboard kebanyakan, dan alasan itu sudah tertulis
di `index.css`. Yang disalin susunannya, bukan kepadatannya. Target sentuh tetap
≥ 56px.

**Grafik batang frame Statistic — kecuali datanya sudah ada.** Aturan #7
melarang frontend menghitung. Kalau `DetailProduk` mau grafik, angkanya harus
datang jadi dari API; memetakannya dari daftar transaksi di klien adalah
pelanggaran, bukan penyesuaian rupa.

## Batas perubahan

Tidak ada perubahan backend, skema, atau `shared/`. Aturan #1, #2, dan #4 tidak
tersentuh karena tidak ada jalur data yang berubah. Tidak ada dependency baru —
`motion` sudah terpasang dari fitur sebelumnya.

## Cara memverifikasi

```bash
cd frontend && npm run build      # tsc --noEmit lalu vite build
cd backend  && npm run typecheck  # memastikan tidak ada yang tergeser
```

Compiler tidak bisa menangkap lima hal berikut, jadi diperiksa manual:

1. Nol aritmetika baru di React — aturan #7
2. Hijau hanya di untung, merah hanya di rugi, kuning hanya di perlu-dicek
3. Kontras terukur untuk setiap teks di atas gradien
4. Target sentuh ≥ 56px
5. `aman-bawah` masih bekerja setelah NavBawah punya FAB mengambang

Berkas rujukan (render PNG 2× kelima frame) disimpan di luar repo, di folder
sesi, supaya tidak menambah berat repo.
