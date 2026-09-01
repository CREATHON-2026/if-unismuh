# Alur Pengguna

## Kenapa bagian ini sering diremehkan

Ini bagian yang paling sering dianggap sepele, padahal di sinilah pengguna paling mungkin menyerah — dan saat demo, **ini layar pertama yang dilihat juri**.

## Prinsip UI

Pengguna berusia 35–60 tahun, literasi digital rendah. Konsekuensinya mengikat semua layar:

| Prinsip | Artinya secara nyata |
|---|---|
| **Satu layar, satu pertanyaan** | Jangan pernah menampilkan form dengan 5 kolom sekaligus |
| **Angka besar** | Angka utama harus terbaca tanpa mendekatkan HP ke mata |
| **Bahasa sehari-hari** | "Modal", bukan "COGS". "Untung bersih", bukan "net margin" |
| **Suara sejajar dengan ketik** | Tombol mikrofon selalu ada di sebelah kolom ketik, bukan tersembunyi |
| **Warna berarti** | Merah = merugi. Hijau = untung. Konsisten di seluruh aplikasi |
| **Tidak ada jargon di pesan galat** | "Fotonya kurang jelas, coba lagi ya" — bukan "Error 422" |

## Autentikasi

**Jangan pernah minta password. Jangan minta email. Jangan minta konfirmasi password.**

Nomor HP sebagai identitas: satu kolom, satu kode, masuk.

```
Masukkan nomor HP
  → kirim OTP 6 digit
  → verifikasi
  → sesi bertahan 90 hari
  → tidak pernah logout otomatis
```

Kenapa nomor HP: semua pedagang punya, tidak perlu diingat, dan sudah jadi identitas mereka sehari-hari.

**Sesi harus panjang.** Kalau pedagang harus login ulang tiap minggu, mereka berhenti pakai. Token disimpan di `localStorage` dan diperpanjang otomatis setiap aplikasi dibuka.

### Untuk lomba: OTP di-bypass

Layanan OTP butuh pendaftaran dan biaya. Untuk 24 jam, buat mode demo: **masukkan nomor apa saja, kode selalu `123456`.**

Dua hal yang wajib diikuti:

1. **Sebutkan terus terang di presentasi:** *"OTP di-bypass untuk demo, di produksi pakai gateway SMS."* Juri tidak akan mempermasalahkan — mereka menilai alur, bukan infrastruktur SMS.
2. **Layarnya tetap ada dan terlihat nyata.** Jangan langsung masuk ke Beranda tanpa login — itu terlihat seperti prototipe setengah jadi.

## Onboarding: 3 pertanyaan, bukan form

Tiga layar, masing-masing satu pertanyaan. Selesai dalam 30 detik.

```
1. "Usaha Ibu/Bapak namanya apa?"
   → Warung Bu Sari

2. "Jualan apa?"
   → Makanan · Minuman · Sembako · Jasa · Lainnya

3. "Produk apa yang paling laku?"
   → kripik pisang
```

Pertanyaan ketiga bukan basa-basi — jawabannya langsung dipakai di langkah berikutnya.

## Wawancara resep: satu produk saja

Langsung lanjut ke produk yang tadi disebut. **Satu produk, jangan lebih** — menambah produk kedua di sini akan kehilangan pengguna.

```
"Kripik pisang, sekali bikin habis bahan apa saja?"
  → [voice note] atau [ketik]

"Sekali bikin jadi berapa bungkus?"
  → 40

"Dijual berapa per bungkus?"
  → 20000
```

## ★ Dan di sinilah momennya

```
┌─────────────────────────────┐
│  Modal Anda                 │
│  Rp 21.200 per bungkus      │
│                             │
│  Dijual                     │
│  Rp 20.000 per bungkus      │
│                             │
│  RUGI Rp 1.200 per bungkus  │  ← merah, paling besar
└─────────────────────────────┘
```

**Temuan pertama muncul sebelum pengguna mencatat transaksi apa pun.**

Kebanyakan aplikasi pembukuan baru berguna setelah sebulan dipakai. Kita berguna di menit kedua. Inilah yang membuat mereka tidak menutup aplikasi.

Jangan pernah memindahkan layar ini ke belakang pencatatan transaksi. Kalau ada yang mengusulkan "biar datanya lengkap dulu baru ditampilkan", tolak — seluruh thesis produk ada di urutan ini.

## Baru setelah itu: ajak mencatat

> "Sekarang coba foto buku catatan Ibu, biar kita tahu untung seluruhnya."

Ajakan ini terasa masuk akal **karena** pengguna baru saja melihat satu temuan nyata. Tanpa temuan itu, permintaan memfoto buku terasa seperti kerja tambahan tanpa imbalan.

## Alur lengkap dari nol

```
Buka aplikasi
  → Layar sambutan (1 kalimat + tombol Mulai)
  → Masukkan nomor HP
  → Kode OTP
  → Nama usaha
  → Jenis usaha
  → Produk terlaris
  → Wawancara resep (voice/ketik)
  → ★ TEMUAN PERTAMA: rugi Rp 1.200/bungkus
  → Ajakan foto buku catatan
  → BERANDA
```

Sembilan layar, tapi masing-masing hanya satu pertanyaan. **Total sekitar 90 detik.**

Sembilan layar terdengar banyak. Yang membuatnya terasa cepat bukan jumlahnya, tapi bahwa tidak ada satu pun layar yang menuntut berpikir lama.

## Alur utama setelah onboarding

### Beranda
Omzet dan untung bersih **bersebelahan**. Ini tamparan yang mengulang tiap kali aplikasi dibuka.

Di bawahnya: jumlah produk merugi, dengan tautan ke daftarnya.

### Mencatat transaksi
Tiga jalan masuk, setara: **foto**, **suara**, **ketik**. Ketik manual bukan cadangan kelas dua — itu lantai dasar yang menahan semuanya saat AI gagal.

### Layar konfirmasi
Muncul setelah foto atau suara. Baris yang AI ragu ditandai jelas, dan bisa diperbaiki sebelum disimpan.

**Tidak ada yang tersimpan sebelum pengguna menekan simpan.** Ini bukan detail teknis — ini yang membuat pedagang percaya bahwa datanya tidak dirusak diam-diam oleh mesin.

### Detail produk
Modal, harga jual, margin. Produk merugi ditandai merah. Ada saran perbaikan harga di bawahnya.

### Pesanan Masuk
Tempel teks chat pembeli → sistem mengklasifikasi, mengekstrak, mengecek stok dan margin, lalu memberi peringatan.

Ini fitur yang mengubah lapakAi dari pencatat masa lalu jadi pencegah kerugian: pedagang tahu **sebelum** menerima pesanan, bukan setelahnya.

Tombol "Tawar harga" menghasilkan balasan siap salin. **Sistem tidak mengirimkannya.**
