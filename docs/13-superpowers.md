# Superpowers

Metodologi kerja untuk AI coding assistant, dari [github.com/obra/superpowers](https://github.com/obra/superpowers). Repo ini memakainya, dan dokumen ini menjelaskan **bagaimana ia dipakai di sini** — karena dua skill bawaannya akan merusak proyek ini kalau dijalankan apa adanya.

Pemasangannya ada di [11-setup-tim.md](11-setup-tim.md). Dokumen ini bukan panduan pasang; ini panduan pakai.

## Kenapa kita memakainya

AI assistant yang tidak dipandu akan langsung menulis kode begitu diminta. Dalam lomba 24 jam itu terasa cepat — sampai jam ke-18, ketika ternyata yang dibangun bukan yang dibutuhkan dan tidak ada yang tahu di mana salahnya.

Superpowers memaksa urutan yang berbeda: **pahami dulu, rancang, rencanakan, baru tulis.** Rencananya dipecah jadi tugas 2–5 menit yang bisa dikerjakan subagent satu per satu, masing-masing diperiksa sebelum lanjut.

Nilainya untuk kita bukan kecepatan mengetik. Nilainya adalah **alur inti tidak pecah diam-diam** — persis hal yang [02-fitur-prioritas.md](02-fitur-prioritas.md) sebut sebagai penentu nilai Fungsionalitas.

## Tujuh langkah, dan apa artinya di sini

| Skill | Kapan aktif | Artinya di lapakAi |
|---|---|---|
| `brainstorming` | Sebelum kode ditulis | Menanyakan apa yang sebenarnya mau dicapai, bukan langsung menerima permintaan mentah |
| `using-git-worktrees` | Setelah rancangan disetujui | **Butuh penyesuaian — baca bagian bahaya di bawah** |
| `writing-plans` | Setelah rancangan | Tugas kecil dengan path berkas dan langkah verifikasi yang jelas |
| `subagent-driven-development` | Saat rencana dieksekusi | Satu subagent per tugas, ditinjau dua tahap |
| `test-driven-development` | Saat menulis kode | **Butuh penyesuaian — baca bagian bahaya di bawah** |
| `requesting-code-review` | Antar tugas | Sejalan dengan daftar periksa di [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| `finishing-a-development-branch` | Saat tugas selesai | Merge/PR, lalu bersihkan worktree |

Selain itu ada `systematic-debugging` dan `verification-before-completion` yang aktif saat ada yang rusak.

---

## Bahaya 1 — worktree merusak database

**Jangan menjalankan `using-git-worktrees` untuk pekerjaan backend tanpa membaca ini.**

Skill itu membuat salinan repo di direktori lain, lalu menjalankan "project setup" di sana. Untuk kebanyakan proyek itu tidak berbahaya. Untuk proyek ini berbahaya, karena dua hal di backend **hanya boleh dipegang satu proses**:

| Yang dipegang | Direktori bawaan | Kalau dipegang dua proses |
|---|---|---|
| Database PGlite | `backend/db/data/` | `RuntimeError: Aborted()`, dan **seluruh data pengguna harus dihapus** |
| Sesi WhatsApp (Baileys) | `backend/db/baileys-auth/` | Sesi saling menendang, status bolak-balik tersambung/terputus |

Worktree tidak menyalin `backend/db/data/` — berkas itu ada di `.gitignore`. Tapi worktree juga tidak mengisolasi apa pun: server di worktree membaca `.env` dari akar repo-nya sendiri, dan kalau `PGLITE_DIR` kosong, ia menunjuk `backend/db/data/` **miliknya sendiri**. Yang berbahaya adalah kasus sebaliknya — dua server hidup bersamaan sementara `.env` menunjuk direktori yang sama, atau dua-duanya berebut port 3000.

Selama pengembangan ini sudah terjadi dua kali sebelum penutupan rapi dipasang. Lihat [../backend/CLAUDE.md](../backend/CLAUDE.md).

### Cara aman kalau tetap perlu worktree

Backend memang menyediakan jalan keluarnya — `PGLITE_DIR` dan `WA_AUTH_DIR` ada di `backend/src/config/env.ts` justru untuk ini. Beri instans worktree miliknya sendiri:

```bash
# .env di dalam worktree — TIGA-TIGANYA harus berbeda dari yang di akar
PORT=3001
PGLITE_DIR=D:/tmp/lapakai-worktree/db
WA_AUTH_DIR=D:/tmp/lapakai-worktree/baileys
```

Kalau salah satu terlewat, gejalanya tidak langsung terlihat: server tetap start, dan kerusakannya baru muncul saat start berikutnya.

### Aturan praktisnya

- **Pekerjaan frontend saja** → worktree aman, tidak ada yang dipegang eksklusif.
- **Pekerjaan backend** → kerjakan di tempat (jawab "tidak" saat skill menawarkan worktree), atau siapkan tiga variabel di atas lebih dulu.
- **Menjelang demo** → jangan pakai worktree sama sekali. Risikonya tidak sebanding.

---

## Bahaya 2 — Hukum Besi TDD, dan kenyataan repo ini

Skill `test-driven-development` punya aturan yang disebutnya Hukum Besi:

> NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

Masalahnya: **repo ini tidak punya test runner.** Tidak ada `npm test` di `backend/package.json` maupun `frontend/package.json`, tidak ada Vitest, tidak ada Jest. Agent yang menuruti Hukum Besi apa adanya akan berhenti, atau — lebih buruk — memasang framework pengujian baru di tengah lomba 24 jam. Keduanya membakar waktu yang tidak kita punya.

Ini keputusan sadar, bukan kelalaian: dalam 24 jam, [02-fitur-prioritas.md](02-fitur-prioritas.md) memilih alur inti yang hidup di atas cakupan tes.

### Baseline verifikasi yang berlaku di sini

Yang kita punya bukan unit test, tapi **uji asap dari ujung ke ujung** yang memeriksa hal yang paling penting: bahwa angkanya benar. Ini yang dipakai sebagai pengganti:

```bash
# 1. Tipe — cepat, tidak butuh server. Ini pagar pertama.
cd backend  && npm run typecheck
cd frontend && npm run build          # tsc --noEmit lalu vite build

# 2. Uji asap — server harus sudah hidup di port 3000
cd backend && npm run dev             # terminal lain
node scripts/uji-alur.mjs             # login -> onboarding -> temuan pertama
```

Skrip `uji-*.mjs` lain di `backend/scripts/` menguji modul tertentu (`uji-beranda`, `uji-produk`, `uji-pesanan`, `uji-suara`, `uji-ekstraksi`, `uji-stok-balasan`, `uji-tenaga`). Jalankan yang berhubungan dengan bagian yang kamu ubah.

### Yang harus dilakukan agent

Ketika `test-driven-development` aktif:

1. **Jangan memasang framework pengujian baru.** Itu perubahan besar — sesuai [../CLAUDE.md](../CLAUDE.md), diskusikan ke tim dulu.
2. **Perlakukan skrip `uji-*.mjs` sebagai testnya.** Untuk perilaku baru, tambahkan pemeriksaan ke skrip yang relevan **sebelum** menulis kode, jalankan, dan lihat ia gagal. Itu siklus RED–GREEN yang sama, dengan alat yang sudah ada.
3. **Untuk rumus finansial, tesnya wajib.** Di sinilah Hukum Besi tetap berlaku penuh — angka yang salah adalah kegagalan paling mahal di produk ini. Tambahkan `periksa()` dengan angka yang dihitung tangan lebih dulu.
4. **Untuk layar dan tampilan**, verifikasi cukup lewat `npm run build` dan melihatnya di browser.

---

## Superpowers tidak mengalahkan delapan aturan

Kalau skill superpowers dan [../CLAUDE.md](../CLAUDE.md) bertentangan, **CLAUDE.md yang menang.** Superpowers adalah metodologi umum; delapan aturan itu adalah pertahanan teknis kita di depan juri.

Tiga titik singgung yang paling mungkin muncul:

| Situasi | Yang benar |
|---|---|
| Rencana menyuruh menghitung margin di TypeScript agar "lebih mudah dites" | **Tolak.** Rumus hidup di view SQL — aturan #1 dan #7 |
| Rencana menambahkan jalur simpan langsung agar alur tesnya pendek | **Tolak.** Hasil AI wajib lewat tabel `ekstraksi` — aturan #2 |
| Rencana menambahkan kolom email agar autentikasi "standar" | **Tolak.** Identitas = nomor HP + OTP — aturan #3 |

Reviewer wajib memeriksa ini; daftar periksanya ada di [../.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md).

## Hubungannya dengan graphify

Keduanya saling melengkapi, bukan bersaing:

- **graphify menjawab "di mana"** — sebelum menjelajah kode, tanya grafnya. Ini yang dipakai `brainstorming` dan `systematic-debugging` untuk mendapat konteks tanpa membaca puluhan berkas.
- **superpowers menjawab "bagaimana"** — urutan kerja dari ide sampai merge.

Setelah superpowers menyelesaikan sebuah tugas dan kodenya berubah, jalankan `graphify update .` supaya grafnya tidak basi. Tanpa LLM, tanpa biaya.

## Kalau skill-nya tidak aktif

| Gejala | Sebab |
|---|---|
| Agent langsung menulis kode tanpa bertanya | Belum restart setelah pasang plugin |
| `/brainstorm` tidak muncul di Claude Code | Plugin belum terpasang di laptop itu — lihat [11-setup-tim.md](11-setup-tim.md) |
| Copilot CLI tidak menyebut skill superpowers | Sesi dimulai sebelum plugin dipasang; mulai sesi baru |
| Agent memaksa memasang Vitest | Ia menuruti Hukum Besi tanpa membaca dokumen ini — tunjuk bagian Bahaya 2 |
