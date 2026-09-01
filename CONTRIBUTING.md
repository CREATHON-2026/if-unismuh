# Panduan Kontribusi

Aturan main untuk kontribusi ke lapakAi, termasuk kontribusi yang dibantu AI.

Baru bergabung? Jalankan dulu langkah di [docs/11-setup-tim.md](docs/11-setup-tim.md) — di sana ada cara memasang Claude Code, plugin superpowers, dan graphify.

## Branch

- `main` selalu dalam keadaan bisa dipakai dan didemokan. **Jangan commit langsung ke `main`.**
- Buat branch baru dari `main` untuk tiap kerjaan:

| Format | Untuk |
|---|---|
| `feat/nama-fitur` | fitur baru |
| `fix/nama-bug` | perbaikan bug |
| `docs/deskripsi` | dokumentasi |
| `chore/deskripsi` | dependency, konfigurasi, hal non-fitur |

Contoh: `feat/ekstraksi-foto-buku`, `fix/hitung-modal-per-kilo`

## Pesan commit

Prefix bahasa Inggris (standar Conventional Commits), **deskripsi bahasa Indonesia**.

```
feat: tambah layar konfirmasi hasil foto buku
fix: perbaiki hitung modal saat bahan dibeli per kilogram
docs: lengkapi kontrak API pesanan masuk
refactor: pindahkan logika margin ke query SQL
chore: pasang dependency Express
test: tambah pengujian ekstraksi foto miring
```

Prefix yang dipakai: `feat` · `fix` · `docs` · `refactor` · `chore` · `test`

**Tulis deskripsi seperti menjelaskan ke rekan tim.** Bayangkan rekanmu membaca daftar commit jam 3 pagi saat mencari kapan sesuatu rusak — apakah barisnya membantu?

| Buruk | Baik |
|---|---|
| `fix: bug` | `fix: perbaiki total omzet yang dobel saat foto di-upload dua kali` |
| `update` | `feat: tambah penanda merah untuk produk bermargin negatif` |
| `wip` | `chore: siapkan kerangka endpoint pesanan masuk` |

## Pull Request

1. Push branch, buka PR ke `main`, isi template yang muncul.
2. **Minimal 1 review** dari anggota tim lain sebelum merge.
3. Kalau sebagian besar PR dihasilkan AI, sebutkan di deskripsi supaya reviewer tahu perlu perhatian ekstra.
4. Reviewer wajib membaca diff-nya. Jangan meloloskan sesuatu hanya karena "AI yang bikin dan kelihatannya jalan".
5. Merge pakai **Squash and merge** supaya riwayat `main` tetap rapi.

### Yang wajib dicek reviewer

Selain apakah kodenya jalan, periksa apakah PR melanggar salah satu dari **delapan aturan yang tidak boleh dilanggar** di [CLAUDE.md](CLAUDE.md). Yang paling sering tanpa sengaja dilanggar:

- Ada LLM yang diminta menghitung angka → harus dipindah ke SQL.
- Ada hasil AI yang langsung masuk database tanpa layar konfirmasi.
- Ada perhitungan margin atau untung yang dilakukan di frontend.

## Aturan khusus kode hasil AI

- **Jangan commit secret.** API key, token, password — semuanya di `.env`. Periksa ulang sebelum push; AI kadang menaruh contoh kredensial di file konfigurasi.
- **Jangan biarkan AI menghapus atau menimpa kode orang lain** tanpa dicek. Kalau ragu, lihat diff dulu.
- **Test harus benar-benar dijalankan**, bukan cuma ditulis. AI boleh membantu menulis test, tapi PR yang test-nya belum pernah jalan tidak layak diajukan.
- **Perubahan besar didiskusikan dulu** — ubah struktur folder, ganti library inti, hapus banyak file.

## Menjaga knowledge graph tetap akurat

Setelah mengubah kode, jalankan:

```bash
graphify update .
```

Ini hanya membaca struktur kode (AST), tidak memakai LLM, dan tidak ada biaya API. Grafnya dipakai seluruh tim untuk memahami repo dengan cepat.

Kalau kamu mengubah **dokumentasi** (bukan kode), grafnya perlu dibangun ulang dengan `/graphify . --update` dari Claude Code.

## Batas waktu

Tetapkan **freeze 45 menit sebelum deadline GitHub**. Setelah freeze: tidak ada merge baru, hanya perbaikan yang benar-benar merusak demo.
