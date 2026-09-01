# Spike: ekstraksi foto buku catatan

Skrip ini menjawab **satu pertanyaan**, secepat mungkin:

> Bisakah Gemini membaca buku tulis pedagang yang asli dan berantakan, cukup baik untuk didemokan?

Ini bagian paling rawan di seluruh lapakAi. Kalau jawabannya tidak, kamu harus tahu **sekarang** — saat masih bisa mengubah pendekatan — bukan di jam ke-18.

Ini bukan kode produksi. Ini alat ukur. Boleh dibuang setelah pertanyaannya terjawab.

## Jalankan

```bash
cd backend
npm install

# Windows PowerShell
$env:GEMINI_API_KEY = "kunci-kamu"
# macOS / Linux
export GEMINI_API_KEY="kunci-kamu"

node spike/ekstraksi-foto.mjs ../foto/buku1.jpg   # satu foto
node spike/ekstraksi-foto.mjs ../foto/            # semua foto di folder
```

Ambil kunci di [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Kalau belum punya foto pedagang asli

Jangan menunggu. Buat foto pengganti dalam 10 menit supaya spike bisa jalan sekarang:

1. Tulis tangan satu halaman buku tulis, gaya pedagang sungguhan:
   ```
   3/9
   kripik psg   10   20rb
   kacang        5   15000
   psg goreng    8 x 3000
   air mineral  12   3rb
                     ------
                     521.000
   ```
2. Sengaja bikin tidak rapi: ganti pulpen di tengah, coret satu angka lalu tulis ulang, tulis rapat di bagian bawah.
3. Foto **miring sekitar 20–30°**, di cahaya remang, jangan diluruskan.

Foto ini **hanya untuk menguji**, bukan untuk demo. Demo tetap wajib pakai buku asli dari pedagang — buku yang ditulis rapi khusus demo langsung ketahuan juri.

## Cara menilai hasilnya

Yang menentukan lolos **bukan jumlah baris yang keluar**, tapi apakah **angkanya benar**.

Buka `spike/hasil-mentah.json`, taruh di samping fotonya, cocokkan baris per baris.

| Hasil | Artinya |
|---|---|
| Angka benar semua, yang salah baca ditandai keyakinan rendah | **Lolos.** Lanjut bangun sesuai `docs/10-kerja-tim.md` |
| Angka sebagian besar benar, beberapa salah tapi **ditandai ragu** | **Lolos.** Ini justru desain yang benar — layar konfirmasi menangkapnya |
| Angka salah tapi **keyakinannya tinggi** | **Bahaya.** Ini kegagalan paling berbahaya: percaya diri tapi salah. Perbaiki prompt, turunkan kalibrasi keyakinan |
| Baris terlewat diam-diam | **Bahaya.** Transaksi hilang tanpa ada yang tahu. Perbaiki prompt agar tidak membuang baris |
| Tidak ada yang terbaca sama sekali | **Gagal.** Uji foto yang lebih terang/lurus dulu untuk memastikan masalahnya di foto, bukan di kode |

**Kegagalan yang paling mahal adalah "salah tapi yakin"**, bukan "tidak terbaca". Yang tidak terbaca akan ditandai dan diperiksa manusia. Yang salah tapi yakin akan lolos ke database dan merusak semua perhitungan di atasnya — tepat hal yang kita janjikan tidak terjadi.

## Kalau hasilnya jelek

Coba berurutan, dari yang termurah:

1. **Perbaiki prompt** — tambahkan contoh gaya penulisan yang gagal terbaca ke dalam `PROMPT` di skrip.
2. **Naikkan resolusi foto** atau minta pengguna memotret lebih dekat.
3. **Turunkan cakupan demo** — misalnya demo pakai halaman yang paling terbaca, dan jujur sebutkan batasannya.
4. **Terakhir**: kalau tetap tidak bisa diandalkan, ketik manual (fitur 3) naik jadi jalur utama demo, dan foto jadi pelengkap. Produknya tetap hidup — thesis "tahu untung sebenarnya" tidak bergantung pada foto, foto cuma jalan tercepat ke sana.

Opsi 4 adalah alasan kenapa spike ini dijalankan lebih awal: masih ada waktu memilihnya.

## Yang sengaja TIDAK dilakukan skrip ini

Model **tidak pernah** diminta menjumlahkan, mengalikan, atau menghitung apa pun — lihat aturan #1 di [CLAUDE.md](../../CLAUDE.md). Ia hanya membaca.

Kalau di halaman ada angka total tulisan pedagang, itu disalin apa adanya ke `total_tertulis` sebagai **pembanding**. Nanti kalau jumlah hasil SQL berbeda dengan angka itu, selisihnya jadi peringatan untuk dicek — bukan diperbaiki diam-diam.
