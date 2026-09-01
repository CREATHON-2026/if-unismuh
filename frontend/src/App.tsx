import { Route, Routes } from 'react-router-dom';
import { Sambutan } from './screens/Sambutan';
import { NomorHp } from './screens/NomorHp';
import { KodeOtp } from './screens/KodeOtp';
import { NamaUsaha } from './screens/NamaUsaha';
import { JenisUsaha } from './screens/JenisUsaha';
import { ProdukTerlaris } from './screens/ProdukTerlaris';
import { ResepBahan } from './screens/ResepBahan';
import { ResepHasil } from './screens/ResepHasil';
import { ResepHarga } from './screens/ResepHarga';
import { TemuanPertama } from './screens/TemuanPertama';
import { KonfirmasiEkstraksi } from './screens/KonfirmasiEkstraksi';
import { Beranda } from './screens/Beranda';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Sambutan />} />
      <Route path="/masuk" element={<NomorHp />} />
      <Route path="/masuk/otp" element={<KodeOtp />} />
      <Route path="/onboarding/usaha" element={<NamaUsaha />} />
      <Route path="/onboarding/jenis" element={<JenisUsaha />} />
      <Route path="/onboarding/produk" element={<ProdukTerlaris />} />
      <Route path="/resep/bahan" element={<ResepBahan />} />
      <Route path="/resep/hasil" element={<ResepHasil />} />
      <Route path="/resep/harga" element={<ResepHarga />} />
      <Route path="/temuan" element={<TemuanPertama />} />
      <Route path="/konfirmasi" element={<KonfirmasiEkstraksi />} />
      <Route path="/beranda" element={<Beranda />} />
    </Routes>
  );
}
