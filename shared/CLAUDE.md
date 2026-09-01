# Shared — lapakAi

Tipe TypeScript yang dipakai **frontend dan backend bersama-sama**.

Baca [CLAUDE.md](../CLAUDE.md) di root lebih dulu.

## Kenapa folder ini ada

Frontend dan backend sama-sama TypeScript. Itu peluang yang tidak boleh disia-siakan: bentuk data yang dikirim backend dan bentuk data yang diharapkan frontend bisa dijamin sama oleh compiler, bukan oleh kesepakatan lisan yang mudah terlupa.

Tanpa ini, kesalahan seperti backend mengirim `margin_per_unit` sementara frontend membaca `marginPerUnit` baru ketahuan saat layar kosong di tengah demo.

## Aturan folder ini

### 1. Perubahan di sini wajib dikabarkan

Ini satu-satunya folder yang benar-benar dipakai bersama tiga orang. Mengubah tipe di sini tanpa memberi tahu akan merusak pekerjaan orang lain — kadang diam-diam, kadang di tengah demo.

Kalau mengubah tipe: kabari tim, dan perbarui [docs/06-kontrak-api.md](../docs/06-kontrak-api.md) di PR yang sama.

### 2. Hanya tipe dan konstanta, tidak ada logika

Folder ini tidak boleh berisi fungsi yang menghitung apa pun. Kalau ada perhitungan di sini, itu berarti frontend punya jalan untuk menghitung sendiri — melanggar [aturan #7](../CLAUDE.md).

Yang boleh: `interface`, `type`, `enum`, konstanta kode galat, dan pemformat tampilan seperti "ubah 20000 jadi Rp 20.000".

Yang tidak boleh: hitung margin, hitung total, hitung modal.

### 3. Nama field mengikuti bahasa Indonesia

Sesuai kontrak API: `harga_jual`, `modal_per_unit`, `margin_per_unit`, `perlu_dicek`. Konsisten `snake_case`, sama persis dengan yang dikirim backend, supaya tidak ada lapisan penerjemahan yang bisa salah.

## Isinya nanti

Belum ada kode. Yang akan ada di sini:

| Berkas | Isi |
|---|---|
| `types/api.ts` | Bentuk respons tiap endpoint |
| `types/model.ts` | Produk, bahan, transaksi, ekstraksi |
| `constants/errors.ts` | Kode galat (`PRODUK_TIDAK_DITEMUKAN`, dll) |
| `format/rupiah.ts` | `20000` → `"Rp 20.000"` |

Semua bentuknya mengikuti [docs/06-kontrak-api.md](../docs/06-kontrak-api.md). Dokumen itu sumber kebenarannya; berkas di sini adalah terjemahannya ke TypeScript.
