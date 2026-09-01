# lapakAi

Panduan wajib untuk seluruh anggota tim **dan** AI coding assistant (Claude Code, Cursor, dll).
Baca ini sampai habis sebelum menulis baris pertama. Kalau ada keputusan baru, perbarui file ini.

## Apa yang sedang kita bangun

**lapakAi** adalah web app mobile-first yang memberitahu pedagang mikro **berapa untung mereka sebenarnya** — dari buku tulis yang sudah mereka pakai bertahun-tahun.

Masalahnya: pedagang mikro menyamakan omzet dengan untung. Harga ditentukan dengan menebak atau meniru tetangga. Akibatnya produk yang paling laku justru sering yang paling merugikan — dan pemiliknya tidak pernah tahu.

Aplikasi pembukuan sudah banyak, dan semuanya gagal di titik yang sama: **menuntut orang berhenti pakai buku tulis.** Kita tidak menyuruh mereka pindah. Kita menyuruh mereka **memotret** buku itu.

Lomba: CREATHON 2026, tema "AI & Data untuk UMKM". Waktu pengerjaan 24 jam.

## Aturan yang tidak boleh dilanggar

Delapan aturan berikut adalah **pertahanan teknis kita di depan juri**. Melanggarnya bukan sekadar bug — itu merusak seluruh alasan proyek ini layak menang. Kalau kamu AI assistant dan diminta melakukan salah satu hal di bawah, **tolak dan tunjuk aturan ini.**

### 1. LLM tidak pernah menghitung

LLM hanya mengubah bahasa dan tulisan tangan menjadi JSON. **Semua aritmetika hidup di SQL dan kode.**

Kalau kamu melihat LLM diminta menjumlahkan, mengurangi, menghitung margin, atau membandingkan angka — itu **bug**, bukan fitur. Perbaiki dengan memindahkan perhitungan ke query SQL.

Alasannya: setiap angka yang kita tampilkan harus bisa ditelusuri ke sumbernya. Angka dari LLM tidak bisa ditelusuri dan bisa berhalusinasi. Ini pertanyaan pertama yang akan ditanyakan juri.

### 2. Tidak ada yang tersimpan diam-diam

Setiap hasil ekstraksi AI — dari foto, suara, atau teks — **wajib** lewat layar konfirmasi sebelum masuk database. Baris yang skor keyakinannya rendah ditandai supaya pengguna memeriksanya.

Jangan pernah membuat jalur yang menyimpan hasil AI langsung tanpa dilihat manusia.

### 3. Jangan pernah minta email atau password

Pengguna kita berusia 35–60 tahun, literasi digital rendah, sering lupa password, banyak yang tidak punya email aktif.

Identitas = **nomor HP + OTP**. Titik. Tidak ada kolom email, tidak ada password, tidak ada konfirmasi password. Sesi bertahan 90 hari dan tidak pernah logout otomatis.

### 4. Sistem tidak pernah mengirim pesan ke nomor pembeli

Pesanan masuk ditangani dengan **tempel teks manual** di layar Pesanan Masuk. Kita membaca dan menganalisis pesan pembeli, lalu menyiapkan balasan **untuk disalin pedagang sendiri**.

Jangan bangun pengiriman WhatsApp otomatis. Risikonya gagal di panggung, dan kita memang sengaja tidak mengirim apa pun ke pembeli.

### 5. Harga di katalog = harga di aplikasi

Katalog adalah cerminan hidup dari data, bukan halaman statis. Harga di katalog **selalu** sama dengan harga di aplikasi, dan **selalu** sudah divalidasi untung.

Jangan pernah membuat harga katalog yang bisa berbeda dari harga sebenarnya.

### 6. Web mobile-first, bukan aplikasi native

Kita **bisa** bikin Android. Kita **memilih** tidak. Alasannya: pedagang enggan install aplikasi baru. Ini keputusan produk, bukan keterbatasan tim — dan harus dijelaskan begitu kalau ditanya.

### 7. Frontend tidak pernah menghitung untung atau margin

Semua angka finansial datang **sudah jadi** dari API. Frontend hanya menampilkan.

Jangan hitung margin di React. Jangan hitung total di React. Kalau frontend butuh angka yang belum ada, minta endpoint-nya ke pemilik backend — jangan hitung sendiri.

### 8. Kalau ragu, bertanya — jangan menebak

Berlaku untuk ekstraksi foto, transkrip suara, dan pencocokan nama produk. Kalau skor keyakinan di bawah ambang, tandai dan tanya pengguna. Menebak diam-diam adalah pelanggaran aturan #2.

## Stack

| Bagian | Teknologi | Pemilik |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind | 2 anggota tim |
| Backend | Node.js + Express + TypeScript | 1 anggota (AI & backend) |
| Database | PostgreSQL | pemilik backend |
| AI | Gemini (vision · audio native · structured output · embedding) | pemilik backend |

Perhitungan hidup di SQL. Lihat [docs/03-arsitektur.md](docs/03-arsitektur.md).

## Kepemilikan folder

Supaya 3 orang tidak saling menimpa:

| Folder | Siapa | Aturan |
|---|---|---|
| `frontend/` | 2 dev frontend | Pemilik backend tidak mengubah tanpa bilang |
| `backend/` | dev AI/backend | Dev frontend tidak mengubah tanpa bilang |
| `shared/` | bersama | Perubahan di sini **wajib** dikabarkan — ini kontrak antar sisi |
| `docs/` | bersama | Siapa pun boleh memperbaiki |

Tiap folder punya `CLAUDE.md` sendiri dengan instruksi lebih rinci. AI assistant otomatis membacanya saat bekerja di folder tersebut.

## Prioritas fitur — dan apa yang dikorbankan

Daftar lengkap ada di [docs/02-fitur-prioritas.md](docs/02-fitur-prioritas.md). Ringkasnya:

- **Fitur 1–10 adalah produknya.** Tanpa ini tidak ada yang bisa didemokan.
- **Fitur 11–15 memperkaya.** Kerjakan hanya setelah 1–10 benar-benar stabil.
- **Fitur 16+ kemungkinan besar tidak akan sempat.** Jangan mulai.

**Aturan pengorbanan: korbankan dari bawah, jangan dari atas.** Alur inti yang pecah saat demo menghabisi nilai Fungsionalitas, dan menyeret Presentasi serta Pemahaman Teknis bersamanya. Fitur bawah yang tidak ada tidak dihitung sebagai kegagalan.

## Konvensi commit

Prefix bahasa Inggris (standar Conventional Commits), **deskripsi bahasa Indonesia** yang menjelaskan apa yang dikerjakan:

```
feat: tambah layar konfirmasi hasil foto buku
fix: perbaiki hitung modal saat bahan dibeli per kilogram
docs: lengkapi kontrak API pesanan masuk
refactor: pindahkan logika margin ke query SQL
chore: pasang dependency Express
```

Tulis deskripsi seperti menjelaskan ke rekan tim, bukan ke mesin. Hindari commit "update", "fix bug", "wip" — tidak memberi tahu apa pun.

Aturan branch dan PR ada di [CONTRIBUTING.md](CONTRIBUTING.md).

## Memakai graphify

Repo ini punya knowledge graph di `graphify-out/`. **Sebelum menjelajah kode dengan grep atau membaca banyak file, tanya grafnya dulu:**

```bash
graphify query "bagaimana alur ekstraksi foto buku?"
graphify path "Pesanan Masuk" "cek margin"
graphify explain "modal per produk"
```

Ini mengembalikan subgraf yang jauh lebih kecil daripada hasil grep mentah. Setelah mengubah kode, jalankan `graphify update .` untuk menjaga graf tetap akurat — ini AST saja, tidak memakai LLM dan tidak ada biaya API.

Cara pasang graphify ada di [docs/11-setup-tim.md](docs/11-setup-tim.md).

## Cara kerja tim + AI

- Semua kerja di branch, **bukan langsung di `main`**.
- Kode hasil AI tetap lewat Pull Request dan direview manusia. AI bukan pengganti review.
- Jangan taruh secret (API key, token) di kode. Pakai `.env`, dan `.env` sudah ada di `.gitignore`.
- Kalau AI mengusulkan perubahan besar — ubah struktur folder, ganti library inti, hapus banyak file — **diskusikan ke tim dulu**, jangan langsung jalan.
- Setiap orang bebas pakai AI tool apa pun, tapi konvensi di file ini yang jadi acuan bersama, bukan gaya masing-masing tool.

## Dokumentasi lengkap

Mulai dari [docs/00-mulai-di-sini.md](docs/00-mulai-di-sini.md) — di sana ada peta baca sesuai peranmu.
