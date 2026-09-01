# Produk

## Masalah

Pedagang mikro menyamakan **omzet** dengan **untung**.

Uang masuk Rp 4.200.000 sebulan terasa seperti keberhasilan. Padahal setelah dikurangi bahan, kemasan, gas, dan tenaga sendiri, yang tersisa mungkin Rp 380.000 — dan sebagian produk sebenarnya dijual di bawah modal.

Harga ditentukan dengan menebak atau meniru tetangga. Bahan naik, harga jual tidak ikut naik, dan tidak ada yang menyadarinya.

Akibat yang paling sering terjadi:

> **Produk yang paling laku justru yang paling merugikan — dan pemiliknya tidak pernah tahu.**

Semakin laris, semakin dalam ruginya.

## Kenapa aplikasi pembukuan yang sudah ada gagal

Aplikasi pembukuan untuk UMKM sudah banyak. Semuanya gagal di titik yang sama:

**Mereka menuntut orang berhenti pakai buku tulis.**

Pedagang sudah punya sistem yang jalan — buku tulis, ditulis tiap hari, dipakai bertahun-tahun, tidak pernah error, tidak butuh baterai. Meminta mereka menggantinya dengan form di layar HP berarti meminta mereka meninggalkan sesuatu yang berhasil demi sesuatu yang asing.

Hampir semua orang menolak. Yang mencoba pun berhenti dalam hitungan hari.

## Solusi

**Jangan suruh mereka pindah. Suruh mereka memotret buku itu.**

Buku tulisnya tetap dipakai seperti biasa. Sekali sehari, difoto. AI membaca tulisan tangannya, mengubahnya jadi transaksi terstruktur, pengguna mengonfirmasi, lalu SQL menghitung untung sebenarnya per produk.

Tidak ada yang perlu diubah dari kebiasaan yang sudah jalan.

## Siapa penggunanya

| Aspek | Kenyataan |
|---|---|
| Usia | 35–60 tahun |
| Literasi digital | Rendah |
| Password | Sering lupa |
| Email | Banyak yang tidak punya yang aktif |
| HP | Punya, dan dipakai tiap hari |
| WhatsApp | Lancar |
| Buku tulis | Dipakai bertahun-tahun, tidak akan ditinggalkan |

Konsekuensi langsung ke desain:

- **Nomor HP jadi identitas.** Bukan email, bukan password. Lihat [08-keamanan-data.md](08-keamanan-data.md).
- **Satu layar satu pertanyaan.** Form panjang membunuh onboarding.
- **Suara sejajar dengan ketik.** Mengetik di HP itu lambat untuk tangan yang tidak terbiasa.
- **Angka besar, istilah sehari-hari.** "Modal", bukan "COGS". "Untung bersih", bukan "net margin".

## Thesis produk

> **Berguna di menit kedua, bukan setelah sebulan.**

Ini pembeda utama kita, dan seluruh desain onboarding tunduk padanya.

Aplikasi pembukuan lain baru memberi nilai setelah sebulan data terkumpul. Pengguna harus percaya dulu, baru dapat manfaat — dan kebanyakan menyerah sebelum sampai.

lapakAi membalik urutannya. Sebelum pengguna mencatat **satu transaksi pun**, kami menanyakan satu produk andalannya, bahan apa saja, jadi berapa bungkus, dijual berapa. Lalu:

```
Modal Anda      Rp 21.200 per bungkus
Dijual          Rp 20.000 per bungkus
                RUGI Rp 1.200 per bungkus
```

Temuan pertama muncul dalam 90 detik sejak membuka aplikasi. **Ini yang membuat mereka tidak menutup aplikasi.**

Detail alurnya di [07-alur-pengguna.md](07-alur-pengguna.md).

## Kalimat yang menjelaskan seluruh produk

> "Ibu ini sudah 8 tahun jualan kripik. Baru hari ini dia tahu produk andalannya justru yang bikin rugi — dan sekarang dia tahu **sebelum** menerima pesanan, bukan setelahnya."

Kata kuncinya **sebelum**. Pembukuan biasa memberi tahu kerugian setelah terjadi. lapakAi mencegatnya di layar Pesanan Masuk, saat pesanan belum diterima dan keputusannya masih bisa diubah.

## Riset pedagang

Salah satu dari tiga hal yang menentukan menang. Bisa dikerjakan **sebelum hari-H** karena tema tidak diumumkan mendadak.

**Lima pedagang, 90 menit.** Yang harus dibawa pulang:

- Foto buku catatan asli — miring, gelap, tulisan berantakan. Ini test set kita, sekaligus bahan demo.
- Rekaman suara asli saat mereka menyebut bahan dan harga.
- Screenshot chat pesanan asli dari pembeli.

Data asli dari pasar jauh lebih meyakinkan di depan juri daripada data buatan, dan sekaligus menguji titik paling rawan sistem ini: **ekstraksi foto**.
