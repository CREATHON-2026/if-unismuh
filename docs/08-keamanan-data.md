# Keamanan Data

Dokumen ini menjawab pertanyaan juri soal keamanan, dan menetapkan aturan yang tidak boleh dilanggar saat implementasi.

## Autentikasi

**Nomor HP + OTP. Tidak ada email, tidak ada password.**

Alasannya ada di [01-produk.md](01-produk.md): pengguna kita sering lupa password dan banyak yang tidak punya email aktif. Password bukan cuma merepotkan bagi mereka — password adalah alasan mereka berhenti memakai aplikasi.

### Sesi

| Aspek | Ketentuan |
|---|---|
| Masa berlaku | 90 hari |
| Penyimpanan | `localStorage` di sisi browser |
| Perpanjangan | Otomatis setiap aplikasi dibuka |
| Logout otomatis | **Tidak pernah** |

Sesi pendek akan membunuh retensi. Kalau pedagang harus login ulang tiap minggu, mereka berhenti pakai — dan kita kehilangan pengguna bukan karena produknya buruk, tapi karena gerbangnya merepotkan.

### Mode demo untuk lomba

Kode OTP selalu `123456`, nomor apa pun diterima. Tidak ada SMS yang benar-benar dikirim.

Ini **disebutkan terus terang di presentasi**. Menyembunyikannya jauh lebih berisiko daripada mengakuinya — juri menilai alur, bukan infrastruktur SMS.

Yang tetap wajib: **layar loginnya benar-benar ada dan berfungsi.** Melompati layar login membuat produk terlihat seperti prototipe setengah jadi.

## Isolasi data

**Satu nomor HP = satu usaha.** Tidak ada multi-user, tidak ada multi-cabang. Menambahkannya untuk lomba hanya menambah permukaan yang bisa rusak tanpa menambah nilai demo.

### Isolasi di level query, bukan level tampilan

Ini yang penting, dan ini jawaban untuk juri.

**Benar** — penyaringan terjadi di database:
```sql
SELECT * FROM produk WHERE user_id = $1;
```

**Salah** — mengambil semua lalu menyaring di aplikasi:
```js
const semua = await db.query('SELECT * FROM produk');
return semua.filter(p => p.user_id === userId);   // JANGAN
```

Cara kedua berarti data pengguna lain pernah keluar dari database dan masuk ke memori proses. Satu kesalahan kecil di lapisan mana pun setelah itu — log, cache, respons galat — akan membocorkannya.

**Setiap query yang menyentuh tabel milik pengguna wajib punya `user_id` di klausa `WHERE`.** Tanpa pengecualian.

## Foto buku catatan

Buku catatan berisi data usaha yang sensitif: siapa membeli apa, berapa harganya, berapa untungnya. Ini bukan file biasa.

| Aspek | Ketentuan |
|---|---|
| Penyimpanan | Storage privat, **bukan** bucket publik |
| Akses | URL bertanda tangan (*signed URL*) dengan masa berlaku pendek |
| Retensi | **Dihapus setelah ekstraksi dikonfirmasi** |
| Yang disimpan | Hanya hasil terstrukturnya |

### Kebijakan retensi

> Foto mentah dihapus setelah ekstraksi dikonfirmasi. Yang kami simpan adalah hasil terstrukturnya.

Ini pertanyaan yang mungkin muncul di sesi tanya jawab, dan jawaban yang sudah siap membuat tim terlihat matang. Menyimpan foto selamanya adalah pilihan yang harus dibela; menghapusnya setelah tidak diperlukan tidak perlu dibela.

Implementasinya: saat `ekstraksi.status` berubah jadi `dikonfirmasi`, berkasnya dihapus dan `path_berkas` dikosongkan. Lihat [05-model-data.md](05-model-data.md).

## Kunci API

`GEMINI_API_KEY` dan kredensial lain:

- Disimpan di `.env`, yang sudah ada di `.gitignore`.
- **Tidak pernah** masuk ke kode.
- **Tidak pernah** masuk ke frontend.

Semua panggilan Gemini terjadi di backend. Kunci yang ada di frontend bisa diambil siapa pun dari browser dan dipakai atas tanggungan kita.

Sediakan `.env.example` berisi nama variabelnya saja tanpa nilainya, supaya rekan tim tahu apa yang perlu diisi.

## Yang tidak dikerjakan untuk lomba, dan alasannya

Jujur soal batasan lebih baik daripada mengaku-aku. Kalau ditanya:

| Tidak ada | Kenapa |
|---|---|
| Gateway SMS asli | Butuh pendaftaran dan biaya; alurnya sudah lengkap dan tinggal disambung |
| Multi-user per usaha | Tidak menambah nilai demo, menambah permukaan yang bisa rusak |
| Enkripsi at-rest khusus | Mengandalkan enkripsi bawaan penyedia database |
| Audit log | Di luar cakupan 24 jam |

Yang penting: keputusan-keputusan ini **disengaja dan bisa dijelaskan**, bukan terlewat.
