# Demo & Tanya Jawab

## Dua akun yang harus disiapkan

| Akun | Nomor | Isi | Dipakai untuk |
|---|---|---|---|
| **Kosong** | `081200000002` | Belum ada data sama sekali | Menunjukkan onboarding dari nol — **ini yang paling berkesan**, karena juri melihat temuan pertama muncul dalam 90 detik |
| **Terisi** | `081200000001` | Data 3 bulan | Beranda, daftar produk, Pesanan Masuk |

OTP untuk keduanya selalu `123456`.

**Jujur saja bahwa data historisnya disiapkan.** Juri menilai alur, bukan keaslian data seed. Berpura-pura data itu asli adalah risiko tanpa imbalan.

### Cara menyiapkan

Tiga perintah, tiga terminal:

```bash
cd backend  && npm run dev     # API di :3000
cd backend  && npm run demo    # isi akun demo — sekali saja
cd frontend && npm run dev     # aplikasi di :5173
```

Buka **http://localhost:5173**. Pakai `localhost`, bukan alamat IP: browser
memperlakukan `localhost` sebagai secure origin, jadi **mikrofon jalan tanpa
sertifikat**. Kalau demo dari HP lewat jaringan, mikrofon akan diblokir dan
langkah suara harus diketik.

Skripnya menolak jalan dua kali supaya produk tidak tergandakan. Kalau perlu
mengulang dari nol: hentikan server dengan **Ctrl+C** (jangan dimatikan paksa —
lihat [backend/CLAUDE.md](../backend/CLAUDE.md)), hapus `backend/db/data`,
nyalakan lagi, jalankan `npm run demo`.

Skrip ini memasukkan data lewat **API yang sama dengan pengguna asli**, bukan
`INSERT` langsung. Artinya seed tidak bisa menciptakan keadaan yang aplikasinya
sendiri tidak bisa hasilkan — dan bug yang cuma muncul saat ada isi akan
ketahuan sekarang, bukan di panggung.

Kalimat untuk mengakuinya ke juri, sebelum ditanya:

> "Data tiga bulannya kami siapkan lewat skrip, dan skripnya masuk lewat API yang sama dengan pengguna biasa. Yang tidak kami siapkan adalah angkanya — omzet, untung, dan margin di layar itu semuanya dihitung SQL dari data ini, sama persis seperti kalau pedagangnya sendiri yang mencatat."

## Skrip demo 2 menit

### 1. Beranda — tamparan pertama

```
Omzet          Rp 4.200.000
Untung bersih  Rp   268.000
```

Dua angka bersebelahan. Diam sebentar, biarkan selisihnya terbaca sendiri.

> "Ini yang dikira untung. Ini yang sebenarnya untung."

Angka itu bukan contoh — itu yang benar-benar keluar dari `GET /beranda` setelah
`npm run demo`. Kalau berubah, yang salah adalah dokumen ini, bukan aplikasinya.

> Layar: **Beranda**, langsung setelah masuk.

### 2. Catat penjualan dengan suara

Tekan tombol suara, ucapkan seperti pedagang bicara:

> "Hari ini kripik pisang laku sepuluh, kacang telur lima belas."

```
→ baris usulan muncul di layar konfirmasi
→ yang tidak cocok meyakinkan ditandai untuk dicek
```

**Tidak ada yang tersimpan sampai tombol simpan ditekan.** Tunjukkan itu dengan sengaja:

> "Yang AI tidak yakin, kami tandai. Dan sampai detik ini belum ada satu pun yang masuk ke database — hasil AI selalu lewat mata manusia dulu."

Ada satu hal yang layak ditunjuk kalau juri memperhatikan: pedagang menyimpan
produknya sebagai **"kripik"**, tapi Web Speech menuliskan ejaan baku
**"keripik"**. Selisih satu huruf itu tetap dikenali — dan kalau tidak yakin,
aplikasinya bertanya, bukan menebak.

**Jangan tunjukkan jalur foto.** Tombolnya menolak dengan jujur, dan itu memang
disengaja — alasannya ada di tanya jawab di bawah. Menunjukkannya di tengah alur
hanya memecah tempo tepat sebelum bagian terkuat.

> Layar: **Catat** di navigasi bawah.

### 3. Detail produk — kripik pisang

```
Kripik Pisang       [TERLARIS]  [MERUGI]
Modal   Rp 21.200
Jual    Rp 20.000
```

> "Produk paling laku. Dan setiap bungkus yang terjual, rugi Rp 1.200. Sudah 8 tahun begini."

Gulir sedikit: **saran harga Rp 25.500** dan rincian modal per bahan. Jangan
berhenti di kabar buruknya — pedagang yang cuma dihakimi akan menutup aplikasi.

> "Dan ini jawabannya: jual Rp 25.500, untungnya jadi Rp 4.300. Batas tidak ruginya Rp 21.200."

Kalau juri mau menguji, rincian bahannya menjumlah tepat ke Rp 21.200:
7.500 + 5.000 + 4.500 + 3.750 + 450.

> Layar: **Produk** → ketuk **Kripik Pisang** (paling atas, karena paling merugi).

### 4. Pesanan Masuk — puncaknya

Tempel pesan asli dari pembeli.

Teks yang dipakai:

> "Bu, saya mau pesan kripik pisang 20 bungkus buat hari sabtu. Bisa Rp 18.000 saja per bungkus?"

```
⚠ Harga Rp 18.000 di bawah modal Rp 21.200
  — rugi Rp 64.000 untuk pesanan ini
⚠ Bahan hanya cukup untuk 14 dari 20 yang dipesan
```

Kedua kalimat itu keluar apa adanya dari `POST /pesanan/analisis` pada akun demo —
angkanya dari SQL, bukan dari LLM.

> "Dan dia tahu ini **sebelum** menerima pesanannya, bukan setelahnya."

Peringatannya muncul **di atas** tombol maksud, bukan di bawah. Itu disengaja.

> Layar: **Pesanan** di navigasi bawah.

### 5. Tekan "Tawar harga"

Balasan siap salin muncul, dengan angka yang bisa ditelusuri — harga Rp 20.000
dan stok 14 unit, keduanya dari SQL. Perhatikan apa yang **tidak** ada di
kalimat itu: modal dan kata "rugi". Itu urusan pedagang, bukan pembeli.

Tunjuk baris kecil di bawah tombolnya:

> "lapakAi tidak pernah mengirim pesan ke pembeli."

Lalu jelaskan kenapa dalam satu kalimat:

> "Reputasi pedagang ada di chat itu. Sistem yang bisa mengirim atas namanya adalah sistem yang bisa mempermalukannya. Jadi kami menyiapkan, dia yang mengirim."

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

### "Kenapa demonya pakai suara, bukan foto?"

Ini pertanyaan yang paling mungkin muncul, dan jawabannya justru memperkuat aturan #8 — **kalau ragu, bertanya, jangan menebak.**

> "Karena kami mengukurnya, dan model vision yang tersedia untuk kami belum lolos. Kami uji baca tabel tulisan tangan 29 baris: kolomnya bergeser, kolom saldo dikarang — dan yang paling berbahaya, model melaporkan yakin 100% untuk setiap baris yang salah itu. Kami uji lagi dengan empat baris saja, tetap salah. Kegagalan 'tidak terbaca' aman, karena akan ditandai dan diperiksa manusia. Kegagalan 'salah tapi yakin' lolos ke database dan merusak semua perhitungan di atasnya — persis hal yang kami janjikan tidak terjadi. Jadi foto kami turunkan jadi jalur opsional sampai skor keyakinannya bisa dipercaya, dan suara yang jadi jalur utama. Layar konfirmasinya sama."

Hasil pengukurannya ada di [backend/spike/README.md](../backend/spike/README.md).

Kalau ditanya lanjutan **"jadi fitur intinya gagal?"**:

> "Tesis produk kami bukan 'kami bisa membaca foto'. Tesisnya 'pedagang tidak tahu untung sebenarnya, dan kami bisa memberitahunya dari catatan yang sudah dia punya'. Foto adalah jalan tercepat ke sana, bukan satu-satunya. Suara dan ketik manual sampai ke angka yang sama persis, lewat layar konfirmasi yang sama persis."

## Sebelum naik panggung

- [ ] `npm run demo` sudah dijalankan, dan angka Beranda cocok dengan yang tertulis di atas
- [ ] Sudah login ke kedua akun dari HP yang akan dipakai — jangan pertama kali di panggung
- [ ] Kalimat suara sudah dilatih, dan hasilnya benar di HP itu (Web Speech butuh izin mikrofon)
- [ ] Teks pesanan asli sudah siap disalin
- [ ] Alur demo dilatih minimal 3 kali, dari layar sambutan sampai penutup
- [ ] Dua orang bisa menjawab semua pertanyaan di atas tanpa membuka kode
- [ ] Ada rencana kalau internet mati — video rekaman alur sebagai cadangan

## Dua hal administratif

1. **Konfirmasi jadwal ke panitia.** Guidebook dan PPT masih berbeda soal Golden Time dan tanggal. Selesaikan ini lebih awal, jangan di hari-H.
2. **Tetapkan freeze 45 menit sebelum deadline GitHub.** Setelah freeze: tidak ada merge baru, hanya perbaikan yang benar-benar merusak demo.
