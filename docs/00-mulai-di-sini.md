# Mulai di sini

Peta baca dokumentasi lapakAi. Dibuat untuk manusia **dan** AI coding assistant.

Kalau kamu hanya sempat membaca satu file, baca [CLAUDE.md](../CLAUDE.md) di root — di sana ada delapan aturan yang tidak boleh dilanggar.

## Baca sesuai peranmu

### Kamu dev frontend

1. [01-produk.md](01-produk.md) — supaya paham untuk siapa kita bikin ini
2. [07-alur-pengguna.md](07-alur-pengguna.md) — 9 layar onboarding dan aturan UI untuk usia 35–60 ★
3. [06-kontrak-api.md](06-kontrak-api.md) — bentuk data yang datang dari backend ★
4. [02-fitur-prioritas.md](02-fitur-prioritas.md) — apa yang wajib jadi, apa yang boleh dikorbankan
5. [../frontend/CLAUDE.md](../frontend/CLAUDE.md) — aturan khusus wilayahmu

### Kamu dev AI/backend

1. [03-arsitektur.md](03-arsitektur.md) — kenapa LLM tidak boleh menghitung ★
2. [04-pipeline-ai.md](04-pipeline-ai.md) — pipeline Gemini per modalitas ★
3. [05-model-data.md](05-model-data.md) — skema SQL, tempat semua aritmetika hidup ★
4. [06-kontrak-api.md](06-kontrak-api.md) — apa yang kamu janjikan ke frontend
5. [08-keamanan-data.md](08-keamanan-data.md) — OTP, isolasi data, retensi foto
6. [../backend/CLAUDE.md](../backend/CLAUDE.md) — aturan khusus wilayahmu

### Kamu yang presentasi

1. [01-produk.md](01-produk.md) — cerita dan alasannya
2. [09-demo.md](09-demo.md) — skrip demo 2 menit dan latihan tanya jawab ★
3. [03-arsitektur.md](03-arsitektur.md) — supaya bisa menjelaskan pipeline tanpa buka kode

### Kamu AI coding assistant

Baca [CLAUDE.md](../CLAUDE.md) dan `CLAUDE.md` di folder tempat kamu bekerja. Sebelum menjelajah kode, tanya knowledge graph dulu:

```bash
graphify query "pertanyaanmu di sini"
```

## Daftar lengkap

| Dokumen | Isi |
|---|---|
| [01-produk.md](01-produk.md) | Masalah, pengguna, kenapa aplikasi pembukuan lain gagal |
| [02-fitur-prioritas.md](02-fitur-prioritas.md) | Fitur 1–24, tingkat prioritas, aturan pengorbanan |
| [03-arsitektur.md](03-arsitektur.md) | Keputusan arsitektur dan alasannya |
| [04-pipeline-ai.md](04-pipeline-ai.md) | Pipeline Gemini: vision, audio, ekstraksi, pencocokan |
| [05-model-data.md](05-model-data.md) | Skema database dan rumus perhitungan |
| [06-kontrak-api.md](06-kontrak-api.md) | Kontrak endpoint antara frontend dan backend |
| [07-alur-pengguna.md](07-alur-pengguna.md) | Onboarding 9 layar, alur utama, aturan UI |
| [08-keamanan-data.md](08-keamanan-data.md) | Autentikasi, sesi, isolasi data, retensi |
| [09-demo.md](09-demo.md) | Skrip demo, akun demo, persiapan tanya jawab |
| [10-kerja-tim.md](10-kerja-tim.md) | Pembagian kerja, kepemilikan, aturan freeze |
| [11-setup-tim.md](11-setup-tim.md) | Pasang Claude Code, superpowers, graphify |

## Kalau dokumen dan kode berbeda

Kode yang benar, dokumen yang salah — **perbaiki dokumennya di PR yang sama**. Dokumentasi yang bohong lebih berbahaya daripada tidak ada dokumentasi, karena AI assistant akan mempercayainya.
