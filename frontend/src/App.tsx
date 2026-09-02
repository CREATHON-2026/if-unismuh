import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ambilSaya } from './api/client';
import { ambilToken, simpanToken } from './api/sesi';
import { tulisOnboarding } from './state/onboarding';
import { Sambutan } from './screens/Sambutan';
import { NomorHp } from './screens/NomorHp';
import { KodeOtp } from './screens/KodeOtp';
import { InfoWhatsApp } from './screens/InfoWhatsApp';
import { NamaUsaha } from './screens/NamaUsaha';
import { JenisUsaha } from './screens/JenisUsaha';
import { ProdukTerlaris } from './screens/ProdukTerlaris';
import { ResepBahan } from './screens/ResepBahan';
import { ResepHasil } from './screens/ResepHasil';
import { ResepHarga } from './screens/ResepHarga';
import { TemuanPertama } from './screens/TemuanPertama';
import { KonfirmasiEkstraksi } from './screens/KonfirmasiEkstraksi';
import { Beranda } from './screens/Beranda';
import { DaftarProduk } from './screens/DaftarProduk';
import { DetailProduk } from './screens/DetailProduk';
import { PesananMasuk } from './screens/PesananMasuk';
import { ProsesPesanan } from './screens/ProsesPesanan';
import { RiwayatPesanan } from './screens/RiwayatPesanan';
import { StrukPesanan } from './screens/StrukPesanan';
import { CatatSuara } from './screens/CatatSuara';
import { SambungWhatsApp } from './screens/SambungWhatsApp';
import { Rekap } from './screens/Rekap';
import { Profil } from './screens/Profil';
import { Notifikasi } from './screens/Notifikasi';
import { RiwayatPenjualan } from './screens/RiwayatPenjualan';
import { Tanya } from './screens/Tanya';

export default function App() {
  const nav = useNavigate();
  const lokasi = useLocation();

  // Ponsel: tiap pindah layar mulai dari atas. Tanpa ini posisi scroll layar
  // sebelumnya terbawa, dan pertanyaan onboarding bisa muncul setengah terpotong.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [lokasi.pathname]);

  /**
   * GET /auth/saya tiap aplikasi dibuka: pulihkan + perpanjang sesi 90 hari,
   * dan ambil ulang nama usaha.
   *
   * Dijalankan di rute MANA PUN, bukan hanya "/". Nama usaha disimpan di
   * sessionStorage — hilang tiap tab ditutup. Kalau pemulihannya hanya terjadi
   * di "/", pengguna yang membuka ulang lewat bookmark atau sekadar me-refresh
   * /beranda akan disambut "Warung Anda" dan inisial "W", padahal namanya ada
   * di server. Yang dibatasi ke "/" cuma pengalihan halamannya.
   */
  useEffect(() => {
    if (!ambilToken()) return;
    void ambilSaya().then((jawaban) => {
      if (!jawaban.ok) return;
      simpanToken(jawaban.data.token);
      if (jawaban.data.pengguna.nama_usaha) {
        tulisOnboarding({ nama_usaha: jawaban.data.pengguna.nama_usaha });
      }
      if (lokasi.pathname === '/') {
        nav(jawaban.data.pengguna_baru ? '/onboarding/usaha' : '/beranda');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Sambutan />} />
      <Route path="/masuk" element={<NomorHp />} />
      <Route path="/masuk/otp" element={<KodeOtp />} />
      <Route path="/wa-info" element={<InfoWhatsApp />} />
      <Route path="/onboarding/usaha" element={<NamaUsaha />} />
      <Route path="/onboarding/jenis" element={<JenisUsaha />} />
      <Route path="/onboarding/produk" element={<ProdukTerlaris />} />
      <Route path="/resep/bahan" element={<ResepBahan />} />
      <Route path="/resep/hasil" element={<ResepHasil />} />
      <Route path="/resep/harga" element={<ResepHarga />} />
      <Route path="/temuan" element={<TemuanPertama />} />
      <Route path="/konfirmasi" element={<KonfirmasiEkstraksi />} />
      <Route path="/beranda" element={<Beranda />} />
      <Route path="/produk" element={<DaftarProduk />} />
      <Route path="/produk/:id" element={<DetailProduk />} />
      <Route path="/catat" element={<CatatSuara />} />
      <Route path="/tanya" element={<Tanya />} />
      <Route path="/pesanan" element={<PesananMasuk />} />
      <Route path="/pesanan/whatsapp" element={<SambungWhatsApp />} />
      <Route path="/pesanan/riwayat" element={<RiwayatPesanan />} />
      <Route path="/proses/:id" element={<ProsesPesanan />} />
      <Route path="/struk/:id" element={<StrukPesanan />} />
      <Route path="/rekap" element={<Rekap />} />
      <Route path="/profil" element={<Profil />} />
      <Route path="/notifikasi" element={<Notifikasi />} />
      <Route path="/riwayat" element={<RiwayatPenjualan />} />
      {/* Alamat tak dikenal jangan jadi layar kosong — pulangkan ke sambutan;
          pemulih sesi di atas yang meneruskan ke beranda kalau sudah masuk. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
