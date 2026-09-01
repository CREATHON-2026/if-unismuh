# Contributing

Aturan main untuk kontribusi ke repo ini, termasuk kontribusi yang dibantu AI/vibe coding.

## Branch

- `main` selalu dalam keadaan bisa dipakai/deploy. Jangan commit langsung ke `main`.
- Buat branch baru dari `main` untuk tiap kerjaan, dengan format:
  - `feature/nama-fitur` — fitur baru
  - `fix/nama-bug` — perbaikan bug
  - `chore/deskripsi` — perubahan non-fitur (dependency, config, dokumentasi)

## Commit message

Pakai format [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: tambah fitur login mahasiswa
fix: perbaiki validasi form pendaftaran
docs: update panduan setup
chore: update dependency
```

## Pull Request

1. Push branch, buka PR ke `main`, isi template PR yang ada.
2. Minimal **1 review** dari anggota tim lain sebelum merge.
3. Kalau bagian besar dari PR dihasilkan AI, sebutkan di deskripsi PR (mis. "sebagian besar logic di sini di-generate dengan AI, mohon dicek lebih teliti") supaya reviewer tahu perlu perhatian ekstra.
4. Reviewer wajib membaca diff-nya, bukan cuma percaya karena "AI yang bikin". Cek logika, bukan cuma apakah kodenya jalan.
5. Selesaikan komentar review sebelum merge. Merge pakai "Squash and merge" supaya history `main` rapi.

## Aturan khusus AI-generated code

- Jangan commit API key, password, token, atau kredensial apa pun — cek ulang sebelum push, terutama file `.env`, config, atau hasil AI yang kadang menaruh contoh kredensial.
- Jangan biarkan AI menghapus atau menimpa kode orang lain tanpa dicek dulu — kalau ragu, diff dulu sebelum commit.
- AI boleh membantu menulis test, tapi test harus benar-benar dijalankan dan lulus sebelum PR diajukan, bukan cuma ditulis.

## Setup lokal

TODO: diisi begitu stack ditentukan (cara install dependency, environment variable yang dibutuhkan, dsb).
