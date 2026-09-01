# Arsitektur

Dokumen ini menjelaskan **kenapa**, bukan cuma **apa**. Setiap keputusan di sini ada alasannya, dan alasannya adalah yang akan ditanyakan juri.

## Keputusan utama: LLM tidak pernah menghitung

> **LLM hanya mengubah bahasa dan tulisan tangan menjadi JSON. SQL yang menghitung.**

Ini keputusan arsitektur terpenting di seluruh proyek.

### Kenapa

Setiap angka yang kita tampilkan ke pedagang harus bisa **ditelusuri ke sumbernya**. Kalau layar bilang "rugi Rp 1.200 per bungkus", harus bisa ditunjukkan: ini dari resep yang mana, harga bahan yang mana, transaksi tanggal berapa.

Angka yang keluar dari LLM tidak bisa ditelusuri. LLM bisa menjumlahkan dengan benar 99 kali lalu salah di kali ke-100, dan tidak ada cara mengetahuinya. Untuk aplikasi yang menyuruh orang mengubah harga jualnya, itu tidak bisa diterima.

Kalau angkanya keluar dari `SELECT`, angka itu bisa dijelaskan, diuji, dan diulang hasilnya.

### Apa artinya secara praktis

| Boleh diminta ke LLM | Tidak boleh diminta ke LLM |
|---|---|
| "Baca foto ini, keluarkan daftar barang dan jumlahnya" | "Berapa total omzet bulan ini?" |
| "Ubah kalimat ini jadi JSON transaksi" | "Produk mana yang paling rugi?" |
| "Nama produk mana yang paling mirip 'kripik psg'?" | "Hitung margin kripik pisang" |
| "Susun kalimat balasan yang sopan untuk menawar" | "Apakah pesanan ini menguntungkan?" |

Semua yang di kolom kanan dijawab oleh query SQL. Lihat [05-model-data.md](05-model-data.md).

### Kalau ditanya juri

> **"Bagaimana kalau AI-nya berhalusinasi angka?"**
>
> "AI kami tidak pernah menghasilkan angka hasil hitungan. Ia hanya membaca — mengubah tulisan tangan dan suara menjadi data terstruktur. Setelah itu semua perhitungan dilakukan SQL, dan setiap angka di layar bisa kami telusuri sampai ke baris sumbernya. Halusinasi angka hitungan secara arsitektur tidak mungkin terjadi di sistem ini."

## Pembagian model

| Tahap | Ditangani | Kenapa bukan yang lain |
|---|---|---|
| Foto buku catatan | Gemini vision | Perlu *memahami* tata letak buku, bukan sekadar membaca huruf |
| Catatan suara | Gemini, audio native | Tidak perlu ASR terpisah — satu panggilan, lebih sedikit yang bisa rusak |
| Ekstraksi jadi JSON | Gemini structured output | Skema dipaksakan di sisi API, bukan diharapkan dari prompt |
| Pencocokan nama produk | Gemini embedding + ambang | "kripik psg" harus ketemu "Kripik Pisang" |
| **Semua aritmetika** | **SQL** | Bisa ditelusuri, bisa diuji, hasilnya selalu sama |

Detail tiap tahap di [04-pipeline-ai.md](04-pipeline-ai.md).

### Kenapa bukan OCR biasa

Pertanyaan yang kemungkinan besar muncul saat tanya jawab.

OCR mengubah gambar jadi teks. Yang kita butuhkan adalah mengubah gambar jadi **transaksi yang punya arti**.

Buku catatan pedagang tidak punya format baku. Ada yang menulis `kripik 10 20rb`, ada yang `10 bks kripik @20.000`, ada yang menulis tanggal di pinggir dan totalnya di bawah dengan garis. OCR akan memberi kita teks mentah itu, dan kita tetap harus menebak mana nama produk, mana jumlah, mana harga satuan, mana total.

Model vision memahami **tata letaknya** — bahwa kolom kiri itu nama barang, angka setelahnya jumlah, dan angka di kanan harga. Itu pekerjaan pemahaman, bukan pengenalan karakter.

## Platform: web app mobile-first

**Bukan karena tidak mampu bikin Android — karena pedagang enggan install aplikasi baru.**

Ini keputusan produk. Kirim tautan lewat WhatsApp, buka, langsung pakai. Tidak ada Play Store, tidak ada "penyimpanan tidak cukup", tidak ada izin aplikasi yang menakutkan.

Kalau ditanya, jawab dengan kalimat itu persis. Menjawab "kami tidak sempat bikin Android" mengubah keputusan desain jadi keterbatasan.

## WhatsApp: tempel teks manual

Layar Pesanan Masuk menerima **tempelan teks** dari chat pembeli. Kita menganalisisnya, memeriksa stok dan margin, lalu menyiapkan balasan **untuk disalin pedagang sendiri**.

**Sistem tidak pernah mengirim pesan ke nomor pembeli.**

### Kenapa

Tiga alasan, dan semuanya kuat:

1. **Risiko panggung.** Integrasi WhatsApp bisa gagal karena hal di luar kendali kita — nomor kena limit, sesi putus, webhook telat. Gagal saat demo menghabisi nilai Fungsionalitas.
2. **Kepercayaan.** Sistem yang bisa mengirim pesan atas nama pedagang ke pelanggannya adalah sistem yang bisa mempermalukan dia. Pedagang menaruh reputasinya di chat itu.
3. **Waktu.** 3–5 jam untuk fitur bernilai rendah, di proyek 24 jam.

Koneksi otomatis ada di daftar opsional nomor 23, dengan catatan **disarankan tidak dikerjakan sama sekali**.

## Katalog: cerminan hidup, bukan halaman statis

Katalog dibangkitkan dari data yang sama dengan aplikasi. Konsekuensinya:

- Harga di katalog **selalu** sama dengan harga di aplikasi.
- Harga di katalog **selalu** sudah divalidasi untung — produk bermargin negatif tidak bisa diam-diam terpajang di sana.

Jangan pernah membuat tabel harga terpisah untuk katalog. Kalau harganya bisa berbeda, cepat atau lambat akan berbeda.

## Alur data

```
                 ┌─────────────┐
  Foto buku ────►│             │
  Voice note ───►│   Gemini    │──► JSON mentah + skor keyakinan
  Ketik manual ─►│  (membaca)  │         │
                 └─────────────┘         ▼
                                 ┌───────────────┐
                                 │ Layar         │  yang ragu ditandai
                                 │ Konfirmasi    │  ◄── manusia memutuskan
                                 └───────┬───────┘
                                         │ disetujui
                                         ▼
                                 ┌───────────────┐
                                 │  PostgreSQL   │
                                 │  (menghitung) │──► omzet, modal, margin,
                                 └───────────────┘    produk merugi, saran harga
                                         │
                                         ▼
                                 ┌───────────────┐
                                 │  API Express  │──► frontend hanya menampilkan
                                 └───────────────┘
```

Perhatikan: **tidak ada panah dari Gemini langsung ke database.** Semua harus lewat layar konfirmasi. Itu bukan kebetulan — itu aturan #2.

## Isolasi data

Satu nomor HP = satu usaha. Tidak ada multi-user, tidak ada multi-cabang.

Data diisolasi **di level query**, bukan cuma di level tampilan. Artinya setiap query menyertakan `user_id` di `WHERE`-nya, bukan mengambil semua lalu menyaring di aplikasi.

Kalau juri bertanya soal keamanan data, ini jawabannya. Detail di [08-keamanan-data.md](08-keamanan-data.md).
