# if-unismuh

Panduan kerja untuk tim dan AI coding assistant (Claude Code, Cursor, dll) di repo ini.
Dokumen ini WAJIB dibaca sebelum mulai kerja dan WAJIB diperbarui begitu ada keputusan baru (stack, struktur folder, dsb).

## Status proyek

Stack teknis belum ditentukan. Begitu tim memutuskan (mis. Next.js, Laravel, Flutter, dll),
update bagian ini dengan: nama stack, versi, cara install dependency, cara run dev server,
cara run test, dan cara build/deploy.

## Cara kerja tim + AI

- Semua kerja terjadi di branch, **bukan langsung di `main`**. Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk konvensi branch dan commit.
- Kode yang dihasilkan AI (vibe coding) tetap harus lewat Pull Request dan direview oleh anggota tim lain sebelum merge — AI bukan pengganti review manusia.
- Jangan biarkan AI assistant menaruh secret/credential (API key, password, token) di kode. Simpan di `.env` dan pastikan `.env` ada di `.gitignore`.
- Kalau AI assistant mengusulkan perubahan besar (ubah struktur folder, ganti library inti, hapus banyak file), diskusikan dulu ke tim sebelum eksekusi — jangan langsung dijalankan.
- Setiap anggota tim bebas pakai AI tool apa pun, tapi konvensi kode dan commit di file ini yang jadi acuan bersama, bukan gaya masing-masing tool.

## Konvensi kode

Diisi begitu stack ditentukan: style guide, linter/formatter yang dipakai, penamaan file/folder, dsb.

## Perintah penting

Diisi begitu stack ditentukan, contoh:
- Install: `TODO`
- Jalankan dev server: `TODO`
- Jalankan test: `TODO`
- Build: `TODO`

## Struktur proyek

Diisi begitu struktur folder mulai terbentuk.
