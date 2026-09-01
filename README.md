# lapakAi

**Tahu untung sebenarnya, dari buku tulis yang sudah dipakai bertahun-tahun.**

Web app mobile-first yang memberitahu pedagang mikro berapa untung mereka sebenarnya — cukup dengan memotret buku catatan yang sudah mereka pakai selama ini.

Dibuat untuk **CREATHON 2026**, tema *AI & Data untuk UMKM*.

---

## Masalah

Pedagang mikro menyamakan **omzet** dengan **untung**. Harga ditentukan dengan menebak atau meniru tetangga.

Akibatnya sering terjadi: **produk yang paling laku justru yang paling merugikan** — dan pemiliknya tidak pernah tahu.

Aplikasi pembukuan sudah banyak. Semuanya gagal di titik yang sama: menuntut orang berhenti pakai buku tulis.

## Solusi

Jangan suruh mereka pindah. **Suruh mereka memotret buku itu.**

Foto buku catatan → AI membaca tulisan tangan → transaksi terstruktur → SQL menghitung untung sebenarnya per produk.

## Yang membuat ini berbeda

**Temuan pertama muncul di menit kedua, bukan setelah sebulan.**

Sebelum pengguna mencatat satu transaksi pun, kami sudah bertanya satu produk andalannya, bahan apa saja yang dipakai, dan dijual berapa. Lalu:

```
Modal Anda      Rp 21.200 per bungkus
Dijual          Rp 20.000 per bungkus
                RUGI Rp 1.200 per bungkus
```

Kebanyakan aplikasi pembukuan baru berguna setelah sebulan dipakai. lapakAi berguna di menit kedua.

## Keputusan arsitektur

**LLM tidak pernah menghitung.** Ia hanya mengubah bahasa dan tulisan tangan menjadi JSON. **SQL yang menghitung**, dan setiap baris bisa ditelusuri ke sumbernya. Kalau ragu, sistem bertanya — tidak menebak.

| Tahap | Ditangani oleh |
|---|---|
| Foto buku catatan | Gemini vision |
| Catatan suara | Gemini (audio native) |
| Ekstraksi jadi JSON | Gemini structured output |
| Pencocokan nama produk | Gemini embedding + ambang keyakinan |
| **Semua aritmetika** | **SQL** |

**Platform: web app mobile-first.** Bukan karena tidak mampu bikin Android, tapi karena pedagang enggan install aplikasi baru.

**WhatsApp: tempel teks manual.** Sistem tidak pernah mengirim pesan ke nomor pembeli.

## Stack

| Bagian | Teknologi |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| AI | Gemini |

## Status

Tahap fondasi — struktur dan dokumentasi. Kode aplikasi belum ditulis.

## Dokumentasi

Mulai dari **[docs/00-mulai-di-sini.md](docs/00-mulai-di-sini.md)**.

Untuk kontributor: [CONTRIBUTING.md](CONTRIBUTING.md) · Untuk AI assistant: [CLAUDE.md](CLAUDE.md)

## Tim

Tiga orang: dua di frontend, satu di AI & backend. Pembagian kerja ada di [docs/10-kerja-tim.md](docs/10-kerja-tim.md).
