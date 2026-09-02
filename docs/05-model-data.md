# Model Data

**Di sinilah semua aritmetika hidup.** Kalau ada perhitungan di luar file ini dan query-query turunannya, itu tanda ada yang salah.

> Skema di bawah adalah **dokumentasi rancangan**, belum berkas migrasi yang bisa dijalankan. Angka dan nama kolom masih boleh berubah saat implementasi — perbarui dokumen ini kalau berubah.

## Prinsip

1. **Uang disimpan sebagai integer rupiah**, bukan float. `20000`, bukan `20000.00`. Float menimbulkan galat pembulatan yang muncul sebagai selisih receh di layar, dan pedagang akan menyadarinya.
2. **Setiap tabel milik pengguna punya `user_id`.** Setiap query menyertakannya di `WHERE`.
3. **Setiap baris hasil ekstraksi menyimpan asal-usulnya** — dari foto mana, baris ke berapa, skor keyakinan berapa. Inilah yang membuat angka bisa ditelusuri.

## Tabel

### pengguna

```sql
CREATE TABLE pengguna (
  id            BIGSERIAL PRIMARY KEY,
  nomor_hp      TEXT UNIQUE NOT NULL,
  nama_usaha    TEXT,
  jenis_usaha   TEXT,           -- makanan | minuman | sembako | jasa | lainnya
  dibuat_pada   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Tidak ada kolom email. Tidak ada kolom password. Lihat [08-keamanan-data.md](08-keamanan-data.md).

### bahan

Bahan baku beserta harga belinya.

```sql
CREATE TABLE bahan (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES pengguna(id),
  nama          TEXT NOT NULL,
  satuan        TEXT NOT NULL,      -- kg | gram | liter | buah | bungkus
  harga_beli    INTEGER NOT NULL,   -- rupiah, untuk jumlah_beli satuan
  jumlah_beli   NUMERIC NOT NULL,   -- mis. beli 5 kg seharga 60000
  diperbarui    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Menyimpan `harga_beli` **dan** `jumlah_beli` (bukan langsung harga per satuan) supaya bisa jujur menampilkan "minyak 5 kg Rp 60.000" seperti yang pedagang ingat, sambil tetap bisa menghitung harga per kilo.

### produk

```sql
CREATE TABLE produk (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES pengguna(id),
  nama              TEXT NOT NULL,
  harga_jual        INTEGER NOT NULL,   -- rupiah per unit jual
  hasil_per_batch   NUMERIC,            -- sekali bikin jadi berapa unit
  dibuat_pada       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_produk_nama_trgm ON produk USING gin (nama gin_trgm_ops);
```

Index `gin_trgm_ops` untuk pencocokan nama produk — lihat [04-pipeline-ai.md](04-pipeline-ai.md). Butuh `CREATE EXTENSION pg_trgm;`.

### resep

Menghubungkan produk dengan bahan-bahannya. **Ini yang membuat modal per produk bisa dihitung.**

```sql
CREATE TABLE resep (
  id            BIGSERIAL PRIMARY KEY,
  produk_id     BIGINT NOT NULL REFERENCES produk(id),
  bahan_id      BIGINT NOT NULL REFERENCES bahan(id),
  jumlah_pakai  NUMERIC NOT NULL    -- per satu batch
);
```

### transaksi

```sql
CREATE TABLE transaksi (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES pengguna(id),
  produk_id     BIGINT REFERENCES produk(id),
  jumlah        NUMERIC NOT NULL,
  harga_satuan  INTEGER NOT NULL,
  tanggal       DATE NOT NULL,

  -- asal-usul: inilah yang membuat angka bisa ditelusuri
  sumber        TEXT NOT NULL,     -- foto | suara | manual
  sumber_id     BIGINT REFERENCES ekstraksi(id),
  keyakinan     NUMERIC,           -- null kalau manual
  nama_mentah   TEXT               -- apa yang tertulis di buku sebelum dicocokkan
);
```

`nama_mentah` disimpan supaya kalau pencocokan ternyata salah, masih bisa ditelusuri apa yang sebenarnya tertulis.

### ekstraksi

Satu baris per foto atau voice note yang diproses.

```sql
CREATE TABLE ekstraksi (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES pengguna(id),
  jenis             TEXT NOT NULL,      -- foto | suara
  status            TEXT NOT NULL,      -- menunggu | dikonfirmasi | dibatalkan
  path_berkas       TEXT,               -- DIKOSONGKAN setelah dikonfirmasi
  hasil_mentah      JSONB,              -- keluaran Gemini apa adanya
  dibuat_pada       TIMESTAMPTZ NOT NULL DEFAULT now(),
  dikonfirmasi_pada TIMESTAMPTZ
);
```

`path_berkas` **dikosongkan dan berkasnya dihapus** setelah `status = 'dikonfirmasi'`. Buku catatan berisi data usaha yang sensitif — kita tidak menyimpannya lebih lama dari yang diperlukan. Lihat [08-keamanan-data.md](08-keamanan-data.md).

### stok

```sql
CREATE TABLE stok (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES pengguna(id),
  bahan_id    BIGINT NOT NULL REFERENCES bahan(id),
  jumlah      NUMERIC NOT NULL,
  diperbarui  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### pesanan

Satu baris per pesanan yang **disepakati pedagang**. Perantara antara `pesan_masuk` (apa kata pembeli) dan `transaksi` (buku besar).

Tiga tabel, tiga peran, dan sengaja tidak digabung. Menambahkan status ke `pesan_masuk` akan mencampur "apa kata pembeli" dengan "apa yang disepakati" — percampuran itulah yang dulu melahirkan bug pembalik untung. Kalau AI salah baca produk lalu pedagang mengoreksinya, koreksi masuk ke sini; bacaan AI tetap utuh untuk ditelusuri.

```sql
CREATE TABLE pesanan (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  pesan_id      BIGINT REFERENCES pesan_masuk(id) ON DELETE SET NULL,  -- NULL = pembeli datang langsung
  produk_id     BIGINT NOT NULL REFERENCES produk(id) ON DELETE RESTRICT,

  jumlah        NUMERIC NOT NULL CHECK (jumlah > 0),
  harga_satuan  INTEGER NOT NULL CHECK (harga_satuan >= 0),  -- yang DISEPAKATI, bukan harga daftar

  tanggal       DATE NOT NULL DEFAULT CURRENT_DATE,
  urutan_harian INTEGER NOT NULL CHECK (urutan_harian > 0),

  status        TEXT NOT NULL DEFAULT 'menunggu_bayar'
                  CHECK (status IN ('menunggu_bayar','diproses','selesai','batal')),

  -- fakta pembayaran, TERPISAH dari status
  cara_bayar        TEXT CHECK (cara_bayar IN ('tunai','transfer','qris','nanti')),
  dibayar_pada      TIMESTAMPTZ,      -- NULL untuk kasbon
  midtrans_order_id TEXT UNIQUE,
  midtrans_status   TEXT,
  midtrans_url      TEXT,

  alasan_batal  TEXT,
  transaksi_id  BIGINT REFERENCES transaksi(id) ON DELETE SET NULL,  -- jembatan ke buku besar

  dibuat_pada   TIMESTAMPTZ NOT NULL DEFAULT now(),
  selesai_pada  TIMESTAMPTZ,

  UNIQUE (user_id, tanggal, urutan_harian)
);
```

Beberapa keputusan yang tidak boleh dibalik tanpa alasan kuat:

- **`status` adalah tahap penyerahan barang, bukan keadaan uang.** Tidak ada nilai `dibayar`: pesanan kasbon akan tampil "Dibayar" padahal uangnya belum masuk. Kebohongan diam-diam itu dilarang aturan #2 sama kerasnya dengan menyimpan tanpa konfirmasi.
- **`produk_id` memakai `ON DELETE RESTRICT`,** bukan `SET NULL`. Menghapus produk yang punya pesanan berjalan akan membuat modalnya hilang dan untungnya mendadak tak terhitung.
- **`urutan_harian` reset tiap hari, per pedagang.** Urutan global akan membocorkan volume usaha antar pengguna. `UNIQUE (user_id, tanggal, urutan_harian)` adalah penjaga terakhir kalau dua permintaan datang bersamaan — nomor kembar ditolak database, bukan sekadar diharapkan tidak terjadi.
- **`transaksi_id` hanya terisi saat `selesai`.** Selama masih `null`, pesanan ini belum pernah menyentuh buku besar, dan membatalkannya tidak perlu mengedit apa pun.

Nomor pesanan (`"0902-07"`) **tidak disimpan sebagai kolom**, melainkan dirakit di view `v_pesanan` dari `tanggal` + `urutan_harian`. Satu tempat merakit, jadi tidak ada dua tempat yang merakitnya beda.

## Rumus perhitungan

Semua rumus di bawah dijalankan SQL. **Tidak satu pun boleh dipindah ke JavaScript atau ke LLM.**

### Modal per produk

```sql
-- Harga bahan per satuan × jumlah dipakai, dibagi hasil per batch
SELECT
  p.id,
  p.nama,
  ROUND(SUM(b.harga_beli::numeric / b.jumlah_beli * r.jumlah_pakai)
        / NULLIF(p.hasil_per_batch, 0)) AS modal_per_unit
FROM produk p
JOIN resep r ON r.produk_id = p.id
JOIN bahan b ON b.id = r.bahan_id
WHERE p.user_id = $1
GROUP BY p.id, p.nama, p.hasil_per_batch;
```

`NULLIF(..., 0)` mencegah pembagian nol saat `hasil_per_batch` belum diisi.

### Produk merugi, diurutkan dari margin terendah

Ini menjawab fitur 6 — inti produknya.

```sql
WITH modal AS (
  SELECT p.id,
         ROUND(SUM(b.harga_beli::numeric / b.jumlah_beli * r.jumlah_pakai)
               / NULLIF(p.hasil_per_batch, 0)) AS modal_per_unit
  FROM produk p
  JOIN resep r ON r.produk_id = p.id
  JOIN bahan b ON b.id = r.bahan_id
  WHERE p.user_id = $1
  GROUP BY p.id, p.hasil_per_batch
)
SELECT p.nama,
       p.harga_jual,
       m.modal_per_unit,
       p.harga_jual - m.modal_per_unit AS margin_per_unit
FROM produk p
JOIN modal m ON m.id = p.id
WHERE p.user_id = $1
ORDER BY margin_per_unit ASC;   -- yang paling merugi di atas
```

### Omzet vs untung bersih

Ini yang tampil bersebelahan di Beranda — fitur 7.

```sql
WITH modal AS ( /* seperti di atas */ )
SELECT
  SUM(t.jumlah * t.harga_satuan)                        AS omzet,
  SUM(t.jumlah * (t.harga_satuan - m.modal_per_unit))   AS untung_bersih
FROM transaksi t
JOIN modal m ON m.id = t.produk_id
WHERE t.user_id = $1
  AND t.tanggal BETWEEN $2 AND $3;
```

Dua angka ini bersebelahan adalah **tamparan pertama** yang dirasakan pengguna. Rp 4.200.000 dan Rp 380.000 di satu layar menjelaskan seluruh produk tanpa satu kalimat pun.

### Cek margin pesanan masuk

Dipakai layar Pesanan Masuk — fitur 9.

```sql
-- Apakah pesanan N unit di harga H menguntungkan?
SELECT
  $3::int * $2::numeric                            AS nilai_pesanan,
  ($3 - m.modal_per_unit) * $2::numeric            AS untung_pesanan,
  ($3 - m.modal_per_unit) < 0                      AS merugi
FROM modal m WHERE m.id = $1;
```

### Cek kecukupan bahan

```sql
-- Bahan cukup untuk berapa unit produk ini?
SELECT FLOOR(MIN(s.jumlah / (r.jumlah_pakai / p.hasil_per_batch))) AS maks_unit
FROM resep r
JOIN stok s  ON s.bahan_id = r.bahan_id AND s.user_id = $2
JOIN produk p ON p.id = r.produk_id
WHERE r.produk_id = $1;
```

Inilah yang menghasilkan peringatan "bahan cuma cukup 14" di demo.

### Pesanan jadi untung — satu transaksi database

Untung dari pesanan naik **hanya** saat barangnya diserahkan, bukan saat uangnya masuk. Pesanan yang sudah dibayar tapi belum diserahkan adalah titipan uang; kalau pembeli membatalkan sebelum mengambilnya, uang itu harus kembali dan tidak boleh pernah tercatat sebagai untung.

Tiga hal terjadi sekaligus, dalam **satu** transaksi database — kalau salah satu gagal, tidak ada yang jadi:

```sql
-- 1. Rebut haknya. Nol baris = ada yang sudah menyelesaikan duluan -> 409.
UPDATE pesanan SET status = 'selesai', selesai_pada = now()
WHERE id = $1 AND user_id = $2 AND status = 'diproses'
RETURNING jumlah, harga_satuan, produk_id;

-- 2. Tulis buku besar lewat pintu yang sama dengan jalur foto dan suara.
--    sumber = 'pesanan' supaya asal-usul tiap baris bisa ditelusuri.
INSERT INTO transaksi (user_id, produk_id, jumlah, harga_satuan, sumber, tanggal) …

-- 3. Kurangi stok sesuai resep.
UPDATE stok s SET jumlah = GREATEST(0, s.jumlah - r.jumlah_pakai * $jumlah) …
```

`UPDATE … WHERE status = 'diproses' RETURNING` adalah kunci idempotensinya: tombol yang ditekan dua kali membuat permintaan kedua tidak menemukan baris, dan penjualan mustahil tercatat dobel.

`GREATEST(0, …)` bukan kemalasan. `stok.jumlah` punya `CHECK (jumlah >= 0)`; nilai negatif akan menggagalkan **seluruh** transaksi termasuk penjualan yang sah. Bahan yang belum punya catatan stok dibiarkan apa adanya — belum dicatat ≠ nol.

## Kenapa tenaga sendiri perlu dihitung

Fitur 11. Pedagang hampir tidak pernah menghitung waktunya sendiri sebagai biaya, jadi "untung" yang mereka rasakan sebenarnya sudah termasuk membayar diri sendiri nol rupiah.

Implementasinya: satu kolom biaya tenaga per batch di `produk`, dimasukkan ke rumus modal. Sederhana secara teknis, tapi mengubah angka secara signifikan — dan itulah gunanya.
