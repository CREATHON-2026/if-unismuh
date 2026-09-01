# Demo & Tanya Jawab

## Dua akun yang harus disiapkan

| Akun | Isi | Dipakai untuk |
|---|---|---|
| **Kosong** | Belum ada data sama sekali | Menunjukkan onboarding dari nol — **ini yang paling berkesan**, karena juri melihat temuan pertama muncul dalam 90 detik |
| **Terisi** | Data 3 bulan | Beranda, grafik, Pesanan Masuk |

**Jujur saja bahwa data historisnya disiapkan.** Juri menilai alur, bukan keaslian data seed. Berpura-pura data itu asli adalah risiko tanpa imbalan.

## Skrip demo 2 menit

### 1. Beranda — tamparan pertama

```
Omzet          Rp 4.200.000
Untung bersih  Rp   380.000
```

Dua angka bersebelahan. Diam sebentar, biarkan selisihnya terbaca sendiri.

> "Ini yang dikira untung. Ini yang sebenarnya untung."

### 2. Foto buku asli dari pasar

Pakai foto **asli** hasil riset pedagang, bukan buku yang ditulis rapi khusus untuk demo.

```
→ 11 baris masuk
→ 2 ditandai untuk dicek
```

Dua baris yang ditandai itu **bukan kelemahan — itu fiturnya.** Tunjukkan dengan sengaja:

> "Yang AI tidak yakin, kami tandai. Tidak ada yang tersimpan diam-diam."

### 3. Detail produk — kripik pisang

```
Kripik Pisang       [TERLARIS]  [MERUGI]
Modal   Rp 21.200
Jual    Rp 20.000
```

> "Produk paling laku. Dan setiap bungkus yang terjual, rugi Rp 1.200. Sudah 8 tahun begini."

### 4. Pesanan Masuk — puncaknya

Tempel pesan asli dari pembeli.

```
⚠ Harga yang diminta Rp 18.000 di bawah modal Rp 21.200
  — rugi Rp 24.000 untuk pesanan ini
⚠ Bahan hanya cukup untuk 14 bungkus dari 20 yang dipesan
```

> "Dan dia tahu ini **sebelum** menerima pesanannya, bukan setelahnya."

### 5. Tekan "Tawar harga"

Balasan siap salin muncul. Tunjukkan bahwa pedagang yang menyalin dan mengirim sendiri.

### Kalimat penutup

> "Ibu ini sudah 8 tahun jualan kripik. Baru hari ini dia tahu produk andalannya justru yang bikin rugi — dan sekarang dia tahu sebelum menerima pesanan, bukan setelahnya."

## Katalog: setelah demo utama

Katalog ditunjukkan **setelah** demo utama selesai. Satu layar, satu kalimat, lalu berhenti.

**Jangan dimasukkan ke dalam alur** — akan memecah tempo tepat di bagian yang paling kuat.

## Latihan tanya jawab

**Pemahaman Teknis dinilai tersendiri.** Minimal **dua orang** harus bisa menjelaskan pipeline tanpa membuka kode.

Latih sampai jawabannya keluar tanpa berpikir. Jawaban yang tergagap membuat arsitektur yang bagus terdengar seperti kebetulan.

### "Bagaimana kalau AI-nya berhalusinasi angka?"

> "AI kami tidak pernah menghasilkan angka hasil hitungan. Ia hanya membaca — mengubah tulisan tangan dan suara menjadi data terstruktur. Setelah itu semua perhitungan dilakukan SQL, dan setiap angka di layar bisa kami telusuri sampai ke baris sumbernya. Halusinasi angka hitungan secara arsitektur tidak mungkin terjadi di sistem ini."

### "Kenapa tidak pakai OCR biasa saja?"

> "OCR mengubah gambar jadi teks. Yang kami butuhkan adalah mengubah gambar jadi transaksi yang punya arti. Buku pedagang tidak punya format baku — ada yang menulis `kripik 10 20rb`, ada yang `10 bks @20.000`. OCR memberi kami teks mentah dan kami tetap harus menebak mana produk, mana jumlah, mana harga. Model vision memahami tata letaknya. Itu pekerjaan pemahaman, bukan pengenalan karakter."

### "Kenapa tidak tersambung ke WhatsApp?"

> "Kami **membaca**, tapi tidak pernah **mengirim** — dan itu dua hal yang sangat berbeda. Sesi WhatsApp kami hanya-baca, dan itu ditegakkan di struktur kode: socket-nya privat, modulnya tidak mengekspor apa pun yang bisa mengirim. Alasannya, sistem yang bisa mengirim atas nama pedagang ke pelanggannya adalah sistem yang bisa mempermalukan dia — reputasinya ada di chat itu. Balasan tetap disalin dan dikirim pedagang sendiri."

Kalau ditanya lanjutan **"kenapa tidak semua pedagang tersambung otomatis?"**:

> "Karena menyambungkan butuh memindai QR dari menu Perangkat Tertaut, dan pengguna kami berusia 35–60 dengan literasi digital rendah. Seluruh produk ini ada untuk menghapus friksi semacam itu. Jadi tempel manual tetap jalur utamanya, dan WhatsApp cuma jalan pintas untuk yang mau. Kalau sesinya putus, HP-nya mati, atau nomornya bermasalah, Pesanan Masuk tetap berfungsi penuh."

### "Aplikasi kalian membaca semua WhatsApp pedagang?"

> "Tidak. Grup, status, dan media diabaikan — hanya pesan teks pribadi yang dibaca. Dan pesan yang ternyata bukan pesanan langsung dibuang, teksnya tidak kami simpan sama sekali. Nomor pengirim pun cuma kami simpan empat digit terakhir, karena pedagang hanya perlu mengenali percakapannya, bukan kami menyimpan identitas pelanggannya."

### "OTP-nya di produksi bagaimana?"

> "WhatsApp Cloud API resmi sebagai utama, SMS sebagai cadangan. Kami pilih WhatsApp karena pedagang kami semuanya lancar WhatsApp, tapi SMS jadi jaring pengaman untuk nomor yang tidak punya. Yang jelas tidak kami pakai adalah pustaka tidak resmi untuk mengirim OTP — pola pengiriman OTP persis memicu deteksi ban WhatsApp: nol balasan, selalu ke nomor asing, timing robotik."

### "Kenapa web, bukan aplikasi Android?"

> "Karena pedagang enggan install aplikasi baru. Kami kirim tautan lewat WhatsApp, dibuka, langsung dipakai. Tidak ada Play Store, tidak ada penyimpanan penuh, tidak ada izin aplikasi yang menakutkan. Ini keputusan produk, bukan karena kami tidak bisa bikin Android."

### "Bagaimana keamanan datanya?"

> "Data diisolasi di level query, bukan level tampilan — setiap query menyertakan user_id, jadi data pengguna lain tidak pernah keluar dari database. Foto buku catatan disimpan di storage privat dengan URL bertanda tangan berumur pendek, dan dihapus setelah ekstraksi dikonfirmasi. Yang kami simpan hanya hasil terstrukturnya."

### "OTP-nya kok bisa 123456?"

> "Itu di-bypass untuk demo. Layanan SMS butuh pendaftaran dan biaya yang tidak masuk akal untuk 24 jam. Alurnya sudah lengkap dan di produksi tinggal disambung ke gateway SMS."

Jawab ini **sebelum ditanya**, saat melewati layar login. Mengakui lebih dulu jauh lebih kuat daripada ketahuan.

### "Kalau fotonya jelek bagaimana?"

> "Ada tiga jalan masuk yang setara: foto, suara, dan ketik manual. Ketik manual bukan cadangan kelas dua — itu lantai dasar yang menahan semuanya. Dan yang AI tidak yakin selalu ditandai untuk dicek, tidak pernah disimpan diam-diam."

## Sebelum naik panggung

- [ ] Kedua akun demo sudah disiapkan dan sudah dites
- [ ] Foto buku asli sudah ada di perangkat, siap dipilih
- [ ] Teks pesanan asli sudah siap disalin
- [ ] Alur demo dilatih minimal 3 kali, dari layar sambutan sampai penutup
- [ ] Dua orang bisa menjawab semua pertanyaan di atas tanpa membuka kode
- [ ] Ada rencana kalau internet mati — video rekaman alur sebagai cadangan

## Dua hal administratif

1. **Konfirmasi jadwal ke panitia.** Guidebook dan PPT masih berbeda soal Golden Time dan tanggal. Selesaikan ini lebih awal, jangan di hari-H.
2. **Tetapkan freeze 45 menit sebelum deadline GitHub.** Setelah freeze: tidak ada merge baru, hanya perbaikan yang benar-benar merusak demo.
