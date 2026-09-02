# Fitur & Prioritas

## Aturan pengorbanan

**19+ fitur jauh melewati batas aman untuk 24 jam.** Ini diketahui sejak awal dan sudah diperhitungkan.

> **Korbankan dari bawah, jangan dari atas.**

Alasannya: alur inti yang pecah saat demo menghabisi nilai **Fungsionalitas**, dan menyeret **Presentasi** serta **Pemahaman Teknis** bersamanya. Sementara fitur nomor bawah yang tidak sempat dikerjakan sama sekali tidak dihitung sebagai kegagalan — juri tidak tahu itu pernah direncanakan.

Kalau waktu menipis, pertanyaannya bukan "fitur mana yang paling keren" tapi **"apa yang pecah kalau ini tidak ada saat demo"**.

## Inti — wajib jadi

Tanpa sepuluh ini, tidak ada yang bisa didemokan.

| # | Fitur | Catatan |
|---|---|---|
| 1 | Foto buku catatan → transaksi terstruktur | **Titik paling rawan.** Uji dengan foto miring, gelap, tulisan berantakan sejak hari ini |
| 2 | Voice note → transaksi | Gemini terima audio langsung, tanpa ASR terpisah |
| 3 | Ketik manual | Jalan keluar kalau foto dan suara gagal. Wajib ada |
| 4 | Layar konfirmasi | Yang AI ragu ditandai. **Tidak ada yang tersimpan diam-diam** |
| 5 | Hitung modal per produk dari bahan | Fondasi semua angka untung |
| 6 | Deteksi produk merugi | Diurutkan dari margin terendah |
| 7 | Beranda: omzet vs untung bersih | Bersebelahan. Inilah tamparan pertamanya |
| 8 | Saran perbaikan harga | Menjawab "terus saya harus apa?" |
| 9 | Pesanan Masuk | Klasifikasi, ekstraksi, cek stok, cek margin, peringatan |
| 10 | Tambah produk tanpa form | Foto daftar harga, voice note, usulan dari catatan belanja |

Fitur **1, 4, 7, 9** adalah tulang punggung demo. Kalau salah satu goyah, hentikan semua pekerjaan lain sampai stabil.

## Pendukung — memperkaya

Kerjakan hanya setelah 1–10 benar-benar stabil.

| # | Fitur | Kenapa berharga |
|---|---|---|
| 11 | Hitung tenaga sendiri sebagai biaya | Pedagang hampir tidak pernah menghitung waktunya sendiri |
| 12 | Stok sebagai pemeriksaan silang | Menangkap kesalahan ekstraksi secara otomatis |
| 13 | Peringatan kas menipis | Praktis, langsung terasa gunanya |
| 14 | Grafik tren omzet vs untung | Enak dilihat saat demo |
| 15 | Tampilkan QRIS saat pesanan diterima | Menutup alur pesanan sampai pembayaran |

## Opsional — kemungkinan besar tidak sempat

Urut dari yang paling layak. **Kerjakan berurutan dari atas, dan hanya setelah 1–15 benar-benar stabil.**

| # | Fitur | Estimasi | Nilai |
|---|---|---|---|
| 16 | Simulasi harga dengan slider | ~1 jam | **Tinggi** — data sudah ada, demonya memuaskan |
| 17 | Peringatan harga bahan naik → modal ikut naik | ~1 jam | **Tinggi** — menutup lubang nyata |
| 18 | Rentang harga pasar (API Blibli) | 1–2 jam | Sedang — memperkuat saran harga |
| 19 | Katalog digital + tombol wa.me | 2–3 jam | Sedang — **jangan masuk demo utama** |
| 20 | Rekap suara mingguan | ~1 jam | Sedang — modalitasnya sudah ada |
| 21 | Ekspor rekap jadi gambar | ~1 jam | Rendah — mudah, tapi tidak berkesan |
| 22 | Grafik untung per produk | ~1 jam | Rendah — grafik tren sudah cukup |
| 23 | Koneksi WhatsApp otomatis | 3–5 jam | **Rendah — disarankan tidak dikerjakan sama sekali** |
| 24 | Mode buta angka (hijau/kuning/merah) | ~2 jam | Rendah — berani, tapi bukan prioritas |

### Kenapa nomor 23 sebaiknya tidak dikerjakan

Koneksi WhatsApp otomatis biayanya paling tinggi, risiko gagal di panggung paling besar, dan nilainya paling rendah dibanding waktunya. Sistem kita memang **sengaja tidak pernah mengirim pesan ke nomor pembeli** — lihat aturan #4 di [CLAUDE.md](../CLAUDE.md). Tempel manual bukan versi murahan dari fitur ini; itu keputusan desain yang bisa dipertahankan.

### Chatbot: diusulkan, tapi tidak masuk daftar

Chatbot tanya-jawab pernah diusulkan dan **sengaja tidak diberi nomor** — ia
ada di bawah nomor 24. Rancangan teknisnya sudah ditulis di
[14-chatbot.md](14-chatbot.md) supaya kalau suatu saat dikerjakan, tidak
dikerjakan dengan cara yang melanggar aturan #1.

Baca dokumen itu sebelum memulai. Chatbot cara biasa — kirim pertanyaan dan
data ke LLM, tampilkan jawabannya — membuat LLM menghitung uang, dan itu
menghapus seluruh pertahanan teknis kita di depan juri.

## Katalog: kapan ditunjukkan

Katalog digital (fitur 19) **jangan dimasukkan ke alur demo utama** — akan memecah tempo.

Tunjukkan setelah demo utama selesai: satu layar, satu kalimat, lalu berhenti.

## Tiga hal yang menentukan menang

Bukan jumlah fitur.

1. **Riset pedagang** — 5 pedagang, 90 menit, sebelum hari-H. Bawa pulang foto buku asli, rekaman suara, screenshot chat. Semuanya jadi bahan demo sekaligus test set.
2. **Ekstraksi foto yang tahan banting** — titik paling rawan. Uji dengan foto miring, gelap, dan tulisan berantakan **hari ini**, bukan saat lomba.
3. **Latihan tanya jawab** — Pemahaman Teknis dinilai tersendiri. Minimal dua orang harus bisa menjelaskan pipeline tanpa membuka kode. Lihat [09-demo.md](09-demo.md).
