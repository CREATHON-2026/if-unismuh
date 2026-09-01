import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Dua mode database, dipilih otomatis:
 *
 *   DATABASE_URL diisi  -> PostgreSQL sungguhan lewat paket `pg`
 *   DATABASE_URL kosong -> PGlite: PostgreSQL asli yang dikompilasi ke WASM
 *                          dan jalan di dalam proses Node ini
 *
 * PGlite dipakai supaya tiga orang bisa langsung `npm install && npm run dev`
 * tanpa memasang PostgreSQL, tanpa Docker, dan tanpa saling menebak password.
 * SQL-nya sama persis, jadi pindah ke PostgreSQL sungguhan cukup mengisi
 * DATABASE_URL — tidak ada satu baris query pun yang berubah.
 */

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.join(DIR, '..', 'db', 'schema.sql');
const DATA_DIR = path.join(DIR, '..', 'db', 'data');

/** Antarmuka minimal yang dipenuhi kedua mode. */
interface Pelaksana {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

let db: Pelaksana;
let jalankanTransaksi: <T>(fn: (c: Pelaksana) => Promise<T>) => Promise<T>;

export const MODE_DB = process.env.DATABASE_URL ? 'postgres' : 'pglite';

export async function siapkanDb(): Promise<void> {
  if (process.env.DATABASE_URL) {
    const pg = (await import('pg')).default;
    // pg mengembalikan NUMERIC dan BIGINT sebagai string supaya presisinya tidak
    // hilang. Untuk lapakAi itu menyusahkan: semua uang kita INTEGER, dan kolom
    // NUMERIC yang tersisa nilainya kecil dan aman jadi number.
    pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
    pg.types.setTypeParser(pg.types.builtins.INT8, (v) => (v === null ? null : Number(v)));

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    db = pool;
    jalankanTransaksi = async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const hasil = await fn(client);
        await client.query('COMMIT');
        return hasil;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
    return;
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm');
  const lite = await PGlite.create({ dataDir: DATA_DIR, extensions: { pg_trgm } });

  // Skema dijalankan sekali. Kalau tabelnya sudah ada, biarkan apa adanya —
  // jangan pernah menghapus data pengguna hanya karena server dinyalakan ulang.
  const { rows } = await lite.query<{ ada: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'pengguna'
     ) AS ada`,
  );
  if (!rows[0].ada) {
    await lite.exec(readFileSync(SCHEMA, 'utf-8'));
    console.log('Skema database dibuat.');
  }

  db = lite as unknown as Pelaksana;
  jalankanTransaksi = (fn) => lite.transaction((tx) => fn(tx as unknown as Pelaksana)) as any;
}

/** Jalankan query, kembalikan barisnya. */
export async function query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const hasil = await db.query(sql, params);
  return hasil.rows as T[];
}

/** Query yang harusnya menghasilkan paling banyak satu baris. */
export async function satu<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  const baris = await query<T>(sql, params);
  return baris[0] ?? null;
}

/**
 * Bungkus beberapa query jadi satu transaksi.
 * Dipakai saat wawancara resep: bahan, produk, dan resep harus masuk
 * bersama-sama atau tidak sama sekali.
 */
export function transaksiDb<T>(fn: (c: Pelaksana) => Promise<T>): Promise<T> {
  return jalankanTransaksi(fn);
}
