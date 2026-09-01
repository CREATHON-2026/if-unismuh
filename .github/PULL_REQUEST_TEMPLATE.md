## Apa yang dikerjakan

<!-- Jelaskan perubahannya dengan bahasa yang mudah dimengerti rekan tim -->

## Jenis perubahan

- [ ] Fitur baru
- [ ] Perbaikan bug
- [ ] Dokumentasi
- [ ] Refactor / chore

## Fitur nomor berapa

<!-- Lihat docs/02-fitur-prioritas.md. Tulis "-" kalau tidak terkait fitur tertentu -->

## Dibantu AI?

- [ ] Sebagian besar PR ini dibuat/dibantu AI — mohon reviewer cek lebih teliti

## Checklist

- [ ] Sudah dites secara lokal, bukan cuma ditulis
- [ ] Tidak ada API key, token, atau password yang ter-commit
- [ ] Kalau mengubah bentuk respons API: `docs/06-kontrak-api.md` dan `shared/` ikut diperbarui, dan tim sudah dikabari
- [ ] Sudah jalankan `graphify update .` kalau mengubah kode

## Aturan yang perlu dicek reviewer

Lihat 8 aturan di [CLAUDE.md](../CLAUDE.md). Yang paling sering tanpa sengaja dilanggar:

- [ ] Tidak ada LLM yang diminta menghitung angka — semua aritmetika di SQL
- [ ] Tidak ada hasil AI yang masuk database tanpa lewat layar konfirmasi
- [ ] Tidak ada perhitungan untung/margin di frontend
