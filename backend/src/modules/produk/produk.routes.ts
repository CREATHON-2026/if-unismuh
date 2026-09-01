import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import {
  daftarProduk, detailProduk, usulanProduk, simpanProduk, ubahOngkosTenaga,
} from './produk.controller.ts';

/**
 * Rute produk — HANYA pemetaan jalur ke controller.
 * Validasi di produk.controller.ts, logika di produk.service.ts,
 * SQL di produk.queries.ts, bacaan LLM di produk.llm.ts.
 */
export const rutProduk = Router();
rutProduk.use(wajibLogin);

rutProduk.get('/', jalur(daftarProduk));
rutProduk.post('/', jalur(simpanProduk));
rutProduk.post('/dari-teks', jalur(usulanProduk));
// Paling bawah: '/:id' menangkap apa pun, jadi jalur statis harus lebih dulu.
rutProduk.get('/:id', jalur(detailProduk));
rutProduk.patch('/:id/tenaga', jalur(ubahOngkosTenaga));
