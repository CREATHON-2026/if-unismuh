# Frontend — lapakAi

React + Vite + TypeScript + Tailwind. Dikerjakan **2 orang**.

Baca [CLAUDE.md](../CLAUDE.md) di root lebih dulu — di sana ada 8 aturan yang tidak boleh dilanggar. Dokumen ini menambahkan aturan khusus wilayah frontend.

## Aturan wilayah ini

### 1. Frontend tidak pernah menghitung angka finansial

Ini penerapan langsung [aturan #7](../CLAUDE.md).

**Salah:**
```ts
const margin = produk.harga_jual - produk.modal_per_unit;   // JANGAN
const total = items.reduce((a, b) => a + b.harga * b.jumlah, 0);  // JANGAN
```

**Benar:**
```ts
const { margin_per_unit, merugi } = produk;   // datang sudah jadi dari API
```

Kalau angka yang kamu butuhkan belum ada di respons API, **minta ke pemilik backend** dan catat di [docs/06-kontrak-api.md](../docs/06-kontrak-api.md). Jangan hitung sendiri.

Kenapa: kalau frontend dan backend sama-sama menghitung, cepat atau lambat hasilnya berbeda — dan tidak ada yang tahu mana yang benar.

Yang **boleh** dilakukan frontend: memformat. `20000` → `"Rp 20.000"` itu tampilan, bukan perhitungan.

### 2. Jangan pernah memanggil Gemini dari frontend

Semua panggilan AI terjadi di backend. Kunci API tidak boleh ada di browser — siapa pun bisa mengambilnya dari devtools.

### 3. Tidak ada layar yang menyimpan hasil AI tanpa konfirmasi

Setelah `/ekstraksi/foto` atau `/ekstraksi/suara`, hasilnya **hanya usulan**. Tampilkan layar konfirmasi, tandai baris dengan `perlu_dicek: true`, dan simpan hanya setelah pengguna menekan simpan.

## Aturan UI — ini bukan preferensi, ini kebutuhan pengguna

Pengguna berusia 35–60 tahun, literasi digital rendah, banyak yang baru pertama pakai aplikasi seperti ini.

| Aturan | Artinya secara nyata |
|---|---|
| **Satu layar, satu pertanyaan** | Jangan pernah menampilkan form 5 kolom sekaligus |
| **Angka besar** | Angka utama terbaca tanpa mendekatkan HP ke mata |
| **Bahasa sehari-hari** | "Modal", bukan "COGS". "Untung bersih", bukan "net margin" |
| **Suara sejajar dengan ketik** | Tombol mikrofon selalu di sebelah kolom ketik, jangan disembunyikan di menu |
| **Warna berarti** | Merah = merugi. Hijau = untung. Konsisten di seluruh aplikasi |
| **Galat tanpa jargon** | "Fotonya kurang jelas, coba lagi ya" — bukan "Error 422" |
| **Target sentuh besar** | Jari yang tidak terbiasa butuh sasaran yang lebih besar dari standar |

Mobile-first bukan berarti "responsif". Rancang untuk layar HP lebih dulu; desktop menyusul kalau sempat.

## Yang sedang dibangun

Urutan layar dan isinya ada di [docs/07-alur-pengguna.md](../docs/07-alur-pengguna.md). Bentuk data dari API di [docs/06-kontrak-api.md](../docs/06-kontrak-api.md).

**Layar yang paling menentukan:**

1. **Layar temuan pertama** (setelah wawancara resep) — inilah yang membuat pengguna tidak menutup aplikasi. Angka RUGI harus paling besar dan paling merah di layar itu.
2. **Layar konfirmasi ekstraksi** — yang ditandai harus terlihat jelas ditandai, bukan sekadar warna samar.
3. **Beranda** — omzet dan untung bersih bersebelahan, selisihnya harus langsung terasa.
4. **Pesanan Masuk** — peringatan harus muncul sebelum tombol terima, bukan sesudah.

## Tidak perlu menunggu backend

Kontrak API sudah tertulis lengkap. Mulai dengan data tiruan yang bentuknya **persis** sesuai [docs/06-kontrak-api.md](../docs/06-kontrak-api.md), lalu ganti sumber datanya saat endpoint asli siap.

Kalau kontraknya diikuti, penggantian itu nyaris tanpa perubahan kode.

## Pembagian antar 2 dev

Bagi **per layar**, bukan per lapisan. Dua orang yang sama-sama menyentuh "semua komponen" akan bertabrakan. Usulan pembagian di [docs/10-kerja-tim.md](../docs/10-kerja-tim.md).

Komponen bersama (tombol, kartu, format rupiah) disepakati di awal lalu dibekukan. Jangan merombak komponen dasar di tengah jalan — itu memaksa orang lain menyesuaikan pekerjaan yang sudah jalan.

## Tipe bersama

Tipe respons API hidup di [`shared/`](../shared/CLAUDE.md) dan dipakai kedua sisi. Jangan menulis ulang tipe yang sudah ada di sana — kalau ditulis ulang, keduanya akan berbeda diam-diam saat API berubah.
