# Kerja Tim

Tiga orang, 24 jam, satu repo. Dokumen ini mengatur siapa mengerjakan apa supaya tidak ada yang saling menunggu atau saling menimpa.

## Pembagian

| Peran | Jumlah | Wilayah |
|---|---|---|
| Frontend | 2 orang | `frontend/` |
| AI & Backend | 1 orang | `backend/`, database, pipeline Gemini |

## Kepemilikan folder

| Folder | Pemilik | Aturan |
|---|---|---|
| `frontend/` | 2 dev frontend | Pemilik backend tidak mengubah tanpa bilang |
| `backend/` | dev AI/backend | Dev frontend tidak mengubah tanpa bilang |
| `shared/` | bersama | **Perubahan wajib dikabarkan** — ini kontrak antar sisi |
| `docs/` | bersama | Siapa pun boleh memperbaiki |

`shared/` adalah satu-satunya tempat yang benar-benar dipakai bersama. Mengubah tipe di sana tanpa memberi tahu akan merusak pekerjaan orang lain diam-diam.

## Cara membagi kerja di antara 2 dev frontend

Bagi **per layar**, bukan per lapisan. Dua orang yang sama-sama menyentuh "semua komponen" akan bertabrakan; dua orang yang memegang layar berbeda tidak.

Usulan pembagian:

| Dev A | Dev B |
|---|---|
| Layar sambutan & login OTP | Beranda |
| Onboarding 3 pertanyaan | Daftar & detail produk |
| Wawancara resep + layar temuan pertama | Pesanan Masuk |
| Layar konfirmasi ekstraksi | Grafik & rekap |

Komponen bersama (tombol, kartu, format rupiah) disepakati di awal, lalu dibekukan. Jangan ada yang merombak komponen dasar di tengah jalan.

## Urutan kerja yang mencegah saling menunggu

Masalah terbesar 3 orang paralel: frontend menunggu API, backend menunggu kejelasan kebutuhan.

Cara memutusnya:

1. **Sepakati [kontrak API](06-kontrak-api.md) di awal**, sebelum kode ditulis. Sudah tertulis — tinggal disepakati.
2. **Frontend mulai dengan data tiruan** yang bentuknya persis sesuai kontrak. Tidak perlu menunggu backend jadi.
3. **Backend mengerjakan sesuai urutan kebutuhan demo**, bukan urutan yang paling menarik dikerjakan.
4. Saat endpoint asli siap, frontend tinggal mengganti sumber datanya.

Kalau kontraknya benar, penggantian itu nyaris tanpa perubahan kode.

## Urutan pengerjaan backend

Sesuai kebutuhan demo, bukan kemudahan:

1. Autentikasi + onboarding (tanpa ini tidak ada yang bisa dites)
2. Resep → modal per produk (**ini yang melahirkan temuan pertama**)
3. Ekstraksi foto → layar konfirmasi (titik paling rawan, mulai lebih awal)
4. Beranda: omzet vs untung bersih
5. Daftar & detail produk
6. Pesanan Masuk
7. Suara
8. Sisanya

## Aturan agar tidak bentrok di git

- **Branch per kerjaan**, bukan per orang. Branch berumur panjang menumpuk konflik.
- **Merge ke `main` sering**, jangan menumpuk perubahan berhari-hari — meski hanya 24 jam, satu branch yang hidup 8 jam sudah cukup untuk menciptakan konflik besar.
- **Jangan format ulang berkas orang lain.** Perubahan gaya penulisan menghasilkan diff besar yang menyembunyikan perubahan sebenarnya.
- **Pasang merge driver graphify** supaya `graph.json` tidak bentrok — lihat [11-setup-tim.md](11-setup-tim.md).

## Ritme

| Waktu | Yang harus sudah terjadi |
|---|---|
| Awal | Kontrak API disepakati, semua orang bisa menjalankan proyek |
| Sepertiga jalan | Autentikasi + onboarding + temuan pertama jalan utuh |
| Separuh | Ekstraksi foto jalan dengan foto asli dari pasar |
| Dua pertiga | Fitur inti 1–10 selesai, mulai latihan demo |
| −3 jam | **Berhenti menambah fitur.** Hanya perbaikan dan latihan |
| −45 menit | **Freeze.** Tidak ada merge baru |

**Aturan −3 jam yang paling sering dilanggar dan paling mahal.** Fitur yang ditambahkan di jam terakhir adalah fitur yang belum pernah dites, dan itu justru yang pecah saat demo.

## Kalau waktu menipis

Kembali ke [aturan pengorbanan](02-fitur-prioritas.md): **korbankan dari bawah, jangan dari atas.**

Pertanyaannya bukan "fitur mana yang paling keren" tapi **"apa yang pecah kalau ini tidak ada saat demo"**. Fitur nomor bawah yang tidak dikerjakan tidak dihitung sebagai kegagalan — juri tidak tahu itu pernah direncanakan.

## Yang dikerjakan di luar kode

Dua hal ini menentukan menang sama besarnya dengan kode, dan sering terlupa karena tidak terasa seperti "kerja":

- **Riset pedagang** — 5 pedagang, 90 menit, sebelum hari-H. Bawa pulang foto buku asli, rekaman suara, screenshot chat.
- **Latihan tanya jawab** — minimal 2 orang bisa menjelaskan pipeline tanpa membuka kode. Bahannya di [09-demo.md](09-demo.md).
