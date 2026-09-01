# Pipeline AI

Semua tahap di sini dikerjakan **Ollama kampus**. Aturan yang mengikat seluruh dokumen ini: [aturan #1 — LLM tidak pernah menghitung](../CLAUDE.md).

## Penyedia: Ollama kampus, bukan Gemini

`https://ollama.if.unismuh.ac.id/api/generate`, model **`gemma4:latest`**. **Tanpa kunci API** — rekan tim tidak perlu menyiapkan apa pun.

Model dipilih dengan mengujinya berdampingan memakai prompt asli kita, bukan dari reputasi:

| Model | Waktu | Hasil untuk *"pesan 20 bungkus kripik pisang, bisa 18rb ga bu?"* |
|---|---|---|
| **`gemma4:latest`** | **3 dtk** | `menawar` ✓ · nama, jumlah, harga semua terekstrak |
| `sahabatai` (Indonesia) | 6 dtk | `menawar` ✓ tapi **kehilangan** nama produk dan jumlah |
| `qwen2.5:7b-instruct` | 5 dtk | `pesanan` ✗ **salah** |

### Model lokal butuh pembersihan keluaran — ini bukan opsional

Gemini menghormati `nullable` dan mengembalikan `null`. **Model lokal tidak.** Dua bug nyata yang ditemukan saat migrasi, keduanya merusak:

| Yang dikembalikan model | Akibatnya kalau tidak dibersihkan |
|---|---|
| `harga_diminta: 0` saat pembeli tidak menyebut harga | `COALESCE(0, harga_jual)` = 0. Hitungannya jadi *"rugi Rp 106.000"* — dan ini terjadi pada **mayoritas** pesanan |
| `tanggal_dibutuhkan: "hari sabtu"` | Menjatuhkan `INSERT` ke kolom `DATE`; seluruh permintaan gagal |

Ditutup di `backend/src/lib/llm.ts` lewat `kosongJadiNull()` dan `tanggalSah()`. **Setiap field baru yang boleh kosong harus didaftarkan ke sana** — kalau lupa, gejalanya bukan galat, melainkan angka yang salah diam-diam.

### Apa yang berubah dan hilang

- **Audio tidak ada.** Server ini tidak punya model audio, jadi Tahap 2 (voice note) **tidak bisa dikerjakan lewat Ollama**. Pilihannya: Web Speech API di browser (gratis, `id-ID`, Chrome), atau fitur 2 dicoret. Belum diputuskan.
- **Vision masih mungkin** lewat `qwen2.5vl:latest`. Tapi `backend/spike/ekstraksi-foto.mjs` masih memakai SDK Gemini dan akan gagal sampai dimigrasikan.
- **Embedding tidak terpakai** — pencocokan nama produk memakai `pg_trgm`, jadi tidak terpengaruh.
- **Panggilan pertama 13 detik**, setelah model dimuat 3 detik. `keep_alive: 30m` dipasang; panggil sekali sebelum naik panggung untuk memanaskan model.

## Prinsip yang mengikat semua tahap

1. **Keluaran selalu JSON terstruktur**, dipaksakan lewat schema di sisi API — bukan diharapkan dari prompt.
2. **Setiap hasil ekstraksi punya skor keyakinan per baris.** Bukan satu skor untuk seluruh foto.
3. **Di bawah ambang → tandai, jangan buang, jangan diam-diam simpan.** Pengguna yang memutuskan.
4. **Gambar mentah dihapus setelah ekstraksi dikonfirmasi.** Yang disimpan hasil terstrukturnya.

## Tahap 1 — Foto buku catatan → transaksi

**Titik paling rawan di seluruh sistem.** Uji sejak hari pertama, bukan menjelang lomba.

### Masukan
Foto buku catatan, biasanya: miring, pencahayaan tidak rata, tulisan tangan sambung, singkatan pribadi, kadang tercoret.

### Keluaran
Daftar baris transaksi. Tiap baris memuat, sekurang-kurangnya:

| Field | Contoh | Catatan |
|---|---|---|
| `nama_mentah` | `"kripik psg"` | Persis seperti tertulis, jangan dirapikan |
| `jumlah` | `10` | |
| `harga_satuan` | `20000` | Boleh null kalau tidak tertulis |
| `tanggal` | `"2026-09-01"` | Boleh null, nanti ditanyakan |
| `keyakinan` | `0.94` | **Per baris**, bukan per foto |
| `alasan_ragu` | `"angka tercoret"` | Diisi kalau keyakinan rendah |

### Yang tidak boleh diminta ke model

Jangan minta total. Jangan minta subtotal. Jangan minta "berapa omzet hari itu". Model membaca baris; SQL yang menjumlahkan.

Kalau di buku ada angka total yang ditulis pedagang, ekstrak sebagai **pembanding** — dan kalau berbeda dengan jumlah hasil SQL, itu justru sinyal bagus: tampilkan sebagai peringatan agar dicek.

### Cara menguji
Kumpulkan foto asli dari riset pedagang. Uji dengan sengaja:
foto miring 30°, cahaya remang, sebagian halaman terlipat, tulisan sangat rapat, ada coretan.

Simpan sebagai test set. Setiap perubahan prompt harus diuji ulang terhadap set yang sama.

## Tahap 2 — Catatan suara → transaksi

> **BELUM ADA JALAN, DAN JANGAN DIANGGAP SUDAH.** Rancangan awal mengandalkan
> audio native Gemini. Setelah pindah ke Ollama kampus, **tidak ada model audio
> sama sekali** di server itu — tahap ini tidak bisa dikerjakan sebagaimana
> ditulis di bawah.
>
> Dua pilihan yang tersisa, belum diputuskan:
> 1. **Web Speech API di browser** — gratis, mendukung `id-ID`, transkripsi
>    terjadi di perangkat pengguna. Teksnya lalu masuk ke Tahap 3 seperti
>    teks ketikan biasa. Butuh Chrome
> 2. **Fitur 2 dicoret** — ketik manual dan foto sudah menutupi kebutuhannya
>
> Bagian di bawah ini disimpan sebagai rancangan untuk pilihan pertama.

### Yang perlu diperhatikan
- Bahasa Indonesia bercampur bahasa daerah dan istilah pasar. Sebutkan konteks ini di prompt.
- Satuan lokal: "seperempat", "sekilo", "sepuluh ribuan", "goceng". Model harus mengubahnya jadi angka — tapi **konversinya bagian dari pembacaan, bukan perhitungan**. Ubah `"goceng"` → `5000`; jangan minta model mengalikan `5000 × 10`.
- Suara ramai pasar. Skor keyakinan yang rendah harus benar-benar diturunkan, bukan dipaksakan tinggi.

## Tahap 3 — Ekstraksi terstruktur

Berlaku untuk hasil ketik manual dan untuk teks pesanan yang ditempel di layar Pesanan Masuk.

### Pesanan masuk perlu klasifikasi lebih dulu

Tidak semua chat adalah pesanan. Klasifikasikan dulu:

| Jenis | Contoh | Tindakan |
|---|---|---|
| Pesanan | "bu, saya mau 20 bungkus kripik buat hari sabtu" | Ekstrak, cek stok, cek margin |
| Tanya harga | "kripiknya berapaan bu?" | Siapkan balasan harga |
| Menawar | "kalau 50 bungkus bisa 15rb bu?" | Ekstrak, **cek margin**, siapkan balasan |
| Bukan pesanan | "assalamualaikum bu" | Abaikan |

Untuk pesanan dan tawaran, keluarannya: nama produk, jumlah, harga yang diminta (kalau ada), tanggal dibutuhkan (kalau ada).

**Keputusan untung/rugi bukan tugas LLM.** Setelah ekstraksi, SQL yang menjawab: apakah margin di harga itu positif, dan apakah bahan cukup untuk jumlah itu.

## Tahap 4 — Pencocokan nama produk

`"kripik psg"` dari foto harus ketemu produk `"Kripik Pisang"` di database.

### Cara kerja

Memakai `pg_trgm` di PostgreSQL, **bukan embedding**. Deterministik, tanpa
panggilan jaringan, tanpa biaya — dan hasilnya bisa ditelusuri, tidak seperti
kemiripan vektor yang tidak bisa dijelaskan ke juri.

1. Hitung `similarity()` antara nama mentah dan nama produk yang sudah ada.
2. Ambil kandidat dengan kemiripan tertinggi.
3. Bandingkan dengan ambang:

| Skor kemiripan | Tindakan |
|---|---|
| ≥ 0,85 | Cocokkan otomatis, tapi tetap tampilkan di layar konfirmasi |
| 0,40 – 0,84 | **Tanya**: "Maksudnya Kripik Pisang?" dengan tombol Ya/Bukan |
| < 0,40 | Perlakukan sebagai produk baru, tawarkan untuk ditambahkan |

### Angka ini hasil pengukuran, bukan tebakan

Diukur dengan `pg_trgm` di PostgreSQL 18:

| Nama mentah | Produk | Skor | Seharusnya |
|---|---|---|---|
| `kripik pisang` | Kripik Pisang | **1,000** | cocok |
| `kripik sgkong` | Kripik Singkong | **0,667** | cocok |
| `krpk pisang` | Kripik Pisang | **0,529** | cocok |
| `kripik` | Kripik Pisang | **0,500** | cocok |
| `kripik psg` | Kripik Pisang | **0,471** | cocok |
| `kripik psg` | Kripik Singkong | **0,350** | jangan cocok |
| `kacang` | Kripik Pisang | **0,167** | jangan cocok |
| `air mineral` | Kripik Pisang | **0,000** | jangan cocok |

**Ambang 0,70 yang sempat tertulis di dokumen ini keliru dan berbahaya.** Dengan angka itu, `"kripik psg"` akan diperlakukan sebagai produk baru — membuat produk duplikat, memecah datanya, dan diam-diam merusak seluruh perhitungan margin produk itu. Tidak akan ada pesan galat; angkanya cuma jadi salah.

### Skor mutlak saja tidak cukup

Perhatikan jaraknya: kandidat benar terburuk 0,471, kandidat salah terbaik 0,350. Bandnya sempit, dan itu berarti satu ambang mutlak akan salah cepat atau lambat.

Karena itu **bandingkan juga kandidat teratas dengan kandidat kedua.** Kalau selisihnya kecil (di bawah 0,15), model memang tidak bisa membedakan — tanya, jangan pilih sendiri:

```sql
SELECT id, nama, similarity(nama, $2) AS skor
FROM produk
WHERE user_id = $1 AND similarity(nama, $2) > 0.3
ORDER BY skor DESC LIMIT 2;
```

Kalau `skor[0] - skor[1] < 0.15`, tampilkan keduanya dan biarkan pengguna memilih. Ini penerapan langsung [aturan #8](../CLAUDE.md): kalau ragu, bertanya.

### Kenapa ada ambang

Pencocokan yang percaya diri tapi salah lebih berbahaya daripada pencocokan yang bertanya. Kalau `"kripik singkong"` diam-diam dicocokkan ke `"Kripik Pisang"`, seluruh perhitungan modal produk itu jadi salah — dan tidak ada yang menyadarinya.

Ini penerapan langsung [aturan #8](../CLAUDE.md): kalau ragu, bertanya.

### Cadangan tanpa embedding

Kalau embedding bermasalah, PostgreSQL punya `pg_trgm`:

```sql
SELECT nama, similarity(nama, 'kripik psg') AS skor
FROM produk
WHERE user_id = $1 AND similarity(nama, 'kripik psg') > 0.3
ORDER BY skor DESC LIMIT 5;
```

Deterministik, tanpa panggilan API, tanpa biaya. Layak dipakai sebagai pemeriksa silang bahkan ketika embedding jalan normal.

## Tahap 5 — Menyusun balasan

Satu-satunya tahap di mana keluaran LLM langsung dilihat sebagai bahasa, bukan data.

Dipakai saat pedagang menekan "Tawar harga" atau perlu membalas pesanan. LLM menyusun kalimat sopan berisi **angka yang sudah dihitung SQL**.

Angkanya disodorkan ke prompt sebagai fakta. LLM tidak menghitungnya, dan tidak boleh mengubahnya.

Hasilnya **disalin pedagang sendiri**. Sistem tidak mengirimkannya — lihat [03-arsitektur.md](03-arsitektur.md).

## Penanganan kegagalan

Setiap tahap harus punya jalan keluar. Kalau AI gagal total, pengguna tetap bisa memakai aplikasi.

| Yang gagal | Jalan keluar |
|---|---|
| Ekstraksi foto | Ketik manual (fitur 3) |
| Catatan suara | Ketik manual |
| Pencocokan nama | Pilih dari daftar produk |
| Server Ollama mati / lambat | Semua jalur manual tetap hidup; tampilkan pesan jujur, jangan layar putih. Rantai model cadangan dicoba otomatis |

**Ketik manual bukan fitur cadangan yang boleh dikorbankan.** Itu lantai dasar yang menahan semuanya.

## Biaya & kunci API

**Tidak ada kunci API sama sekali.** Ollama kampus tidak memintanya, jadi tidak ada yang bisa bocor dan tidak ada yang perlu disiapkan rekan tim.

Tetap saja semua panggilan LLM terjadi di **backend**, bukan frontend — alamat server internal tidak perlu dipajang ke browser, dan menaruhnya di frontend berarti siapa pun bisa memakai kuota kampus lewat aplikasi kita.
