-- ---------------------------------------------------------------------------
-- susulan.sql — tabel dan indeks yang lahir SETELAH database pertama dibuat
--
-- schema.sql hanya dijalankan sekali, saat database masih kosong (lihat
-- db/index.ts). Itu benar — menjalankannya ulang akan menghapus data
-- pengembangan. Tapi akibatnya database yang sudah terlanjur ada tidak pernah
-- mendapat tabel baru, dan fitur yang membutuhkannya jatuh dengan "relation
-- does not exist" di mesin rekan tim yang databasenya lebih tua.
--
-- Berkas ini dijalankan SETIAP kali server hidup. Karena itu setiap pernyataan
-- di sini WAJIB memakai IF NOT EXISTS dan tidak boleh menyentuh data. Kalau
-- sebuah perubahan tidak bisa ditulis dengan aman untuk dijalankan berulang,
-- perubahan itu tidak boleh ada di sini.
--
-- Definisi yang sama tetap ditulis juga di schema.sql, supaya database baru
-- lahir utuh dalam satu berkas yang bisa dibaca dari atas ke bawah.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS percakapan (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  peran       TEXT NOT NULL CHECK (peran IN ('pedagang','asisten')),
  teks        TEXT NOT NULL,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_percakapan_user ON percakapan (user_id, id DESC);

-- ---------------------------------------------------------------------------
-- Balasan otomatis WhatsApp — draf disusun sistem, pedagang yang menekan kirim
--
-- `pengirim_jid` adalah perubahan yang paling perlu disadari: sebelum fitur ini
-- nomor pembeli DIBUANG (samarkan() memotongnya jadi 4 digit terakhir), dan
-- yang tersimpan hanya "…5616". Untuk bisa membalas, alamatnya harus ada.
-- Ini konsekuensi langsung dari keputusan mengirim, dan ditulis terus terang di
-- docs/08-keamanan-data.md. Kolomnya TIDAK PERNAH ikut ke frontend: peramban
-- hanya mengirim pesan_id, server yang mencari alamatnya.
--
-- `balasan_acuan` menyimpan angka SQL yang dipakai LLM saat menyusun kalimat.
-- Itu yang membuat tiap rupiah di balasan bisa dicocokkan ke sumbernya — dan
-- yang membuat scripts/uji-balas.mjs bisa membuktikan model tidak mengarang.
-- ---------------------------------------------------------------------------

ALTER TABLE pesan_masuk
  ADD COLUMN IF NOT EXISTS pengirim_jid         TEXT,
  ADD COLUMN IF NOT EXISTS balasan_teks         TEXT,
  ADD COLUMN IF NOT EXISTS balasan_maksud       TEXT,
  ADD COLUMN IF NOT EXISTS balasan_acuan        JSONB,
  ADD COLUMN IF NOT EXISTS balasan_status       TEXT NOT NULL DEFAULT 'tidak_ada'
      CHECK (balasan_status IN ('tidak_ada','siap','terkirim','gagal')),
  ADD COLUMN IF NOT EXISTS balasan_dikirim_pada TIMESTAMPTZ;
