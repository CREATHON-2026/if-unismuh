import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import {
  analisisPesanan, daftarPesanan, balasanPesanan, ubahBalasan, kirimBalasanPesan,
} from './pesanan.controller.ts';
// Isi bottom sheet. Hidup di modul proses karena yang dilayaninya adalah
// keputusan "jadi pesanan apa", bukan pembacaan pesannya.
import { pilihan } from '../proses/proses.controller.ts';

/**
 * Rute Pesanan Masuk — HANYA pemetaan jalur ke controller.
 * Validasi di pesanan.controller.ts, logika di pesanan.service.ts,
 * SQL di pesanan.queries.ts, prompt LLM di pesanan.llm.ts.
 */
export const rutPesanan = Router();
rutPesanan.use(wajibLogin);

rutPesanan.post('/analisis', jalur(analisisPesanan));
rutPesanan.get('/', jalur(daftarPesanan));
rutPesanan.post('/balasan', jalur(balasanPesanan));
rutPesanan.get('/:id/pilihan', jalur(pilihan));

// Balasan otomatis. Draf lahir sendiri di prosesPesan(); dua jalur di bawah
// milik pedagang sepenuhnya — memperbaiki kalimatnya, lalu mengirimkannya.
rutPesanan.patch('/:id/balasan', jalur(ubahBalasan));
rutPesanan.post('/:id/kirim-balasan', jalur(kirimBalasanPesan));
