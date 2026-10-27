import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import POSPage from './pages/pos/POSPage';
import CalendarPage from './pages/calendar/CalendarPage';
import BookingsPage from './pages/bookings/BookingsPage';
import CustomersPage from './pages/customers/CustomersPage';
import ServicesPage from './pages/services/ServicesPage';
import StaffPage from './pages/staff/StaffPage';
import ReportsPage from './pages/reports/ReportsPage';
import KomisiStaffTerperinciPage from './pages/reports/KomisiStaffTerperinciPage';
import RingkasanKomisiStaffPage from './pages/reports/RingkasanKomisiStaffPage';
import RingkasanKeuanganPage from './pages/reports/RingkasanKeuanganPage';
import SalesPage from './pages/sales/SalesPage';
import VoucherPromoPage from './pages/marketing/VoucherPromoPage';
import NewsArticlePage from './pages/marketing/NewsArticlePage';
import CampaignPage from './pages/marketing/CampaignPage';
import AutomationPage from './pages/marketing/AutomationPage';
import SettingsPage from './pages/settings/SettingsPageNew';
import InventoryPage from './pages/inventory/InventoryPage';
import InventoryOrdersPage from './pages/inventory/InventoryOrdersPage';
import StockOpnamePage from './pages/inventory/StockOpnamePage';
import MasterDataPage from './pages/master/MasterDataPage';
import TaxPage from './pages/master/TaxPage';
import DiscountPage from './pages/master/DiscountPage';
import AssetsPage from './pages/assets/AssetsPage';
import BranchesPage from './pages/branches/BranchesPage';
import RoomsPage from './pages/rooms/RoomsPage';
import BannersPage from './pages/banners/BannersPage';
import LoyaltyPage from './pages/loyalty/LoyaltyPage';
import AuditLogPage from './pages/audit/AuditLogPage';
import UserManagementPage from './pages/users/UserManagementPage';
import FeedbackPage from './pages/feedback/FeedbackPage';
import ExpenseCategoriesPage from './pages/expenses/ExpenseCategoriesPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import BankDepositsPage from './pages/bank/BankDepositsPage';
import LoginPage from './pages/auth/LoginPage';
import RingkasanPembayaranPage from './pages/reports/RingkasanPembayaranPage';

import AssetCategoryPage from './pages/master/AssetCategoryPage';
import ArticleCategoryPage from './pages/master/ArticleCategoryPage';
import ServiceCategoryPage from './pages/master/ServiceCategoryPage';
import FacilitiesPage from './pages/master/FacilitiesPage';
import SubscriptionPage from './pages/subscription/SubscriptionPage';
import LogPembayaranPage from './pages/reports/LogPembayaranPage';
import RingkasanPajakPage from './pages/reports/RingkasanPajakPage';
import TipsDikumpulkanPage from './pages/reports/TipsDikumpulkanPage';
import RingkasanDiskonPage from './pages/reports/RingkasanDiskonPage';
import FakturBelumSelesaiPage from './pages/reports/FakturBelumSelesaiPage';
import PergerakanKasRegisterPage from './pages/reports/PergerakanKasRegisterPage';
import LabaRugiPenjualanPage from './pages/reports/LabaRugiPenjualanPage';
import KasMasukKeluarPage from './pages/reports/KasMasukKeluarPage';
import LaporanKhususDPPage from './pages/reports/LaporanKhususDPPage';
import PaymentMethodsPage from './pages/payment/PaymentMethodsPage';
import PrintPage from './pages/print/PrintPage';
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';

// New Inventory Report Pages
import PerformaPenjualanProdukPage from './pages/reports/PerformaPenjualanProdukPage';
import StokYangAdaPage from './pages/reports/StokYangAdaPage';
import LogPergerakanStokPage from './pages/reports/LogPergerakanStokPage';
import KalkulasiPergerakanStokPage from './pages/reports/KalkulasiPergerakanStokPage';
import KonsumsiProdukPage from './pages/reports/KonsumsiProdukPage';
import KonsumsiProdukDetailPage from './pages/reports/KonsumsiProdukDetailPage';

// New Staff Report Pages
import JamKerjaStaffPage from './pages/reports/JamKerjaStaffPage';
import TipBerdasarkanStaffPage from './pages/reports/TipBerdasarkanStaffPage';
import RincianKomisiGrupItemPage from './pages/reports/RincianKomisiGrupItemPage';
import KehadiranStaffPage from './pages/reports/KehadiranStaffPage';

// Loyalty Points Reports
import PenggunaanPointFreeItemsPage from './pages/reports/PenggunaanPointFreeItemsPage';
import PointBisaDigunakanPage from './pages/reports/PointBisaDigunakanPage';
import PenggunaanPointDiskonPage from './pages/reports/PenggunaanPointDiskonPage';

// Customer Reports
import DaftarPelangganPage from './pages/reports/DaftarPelangganPage';
import RetensiPelangganPage from './pages/reports/RetensiPelangganPage';

// Agenda Reports
import KalkulasiAgendaPage from './pages/reports/KalkulasiAgendaPage';
import PembatalanAgendaPage from './pages/reports/PembatalanAgendaPage';
import DetailAgendaPage from './pages/reports/DetailAgendaPage';

// Voucher Reports
import SaldoVoucherTersisaPage from './pages/reports/SaldoVoucherTersisaPage';
import PenjualanVoucherPage from './pages/reports/PenjualanVoucherPage';
import PenggunaanVoucherPage from './pages/reports/PenggunaanVoucherPage';
import KodeVoucherPromoPage from './pages/reports/KodeVoucherPromoPage';
import PenukaranVoucherPromoPage from './pages/reports/PenukaranVoucherPromoPage';
import PenukaranProdukGratisPage from './pages/reports/PenukaranProdukGratisPage';
import KadaluwarsaKeanggotaanPage from './pages/reports/KadaluwarsaKeanggotaanPage';

// Sales Reports
import PenjualanItemPage from './pages/reports/PenjualanItemPage';
import PenjualanBerdasarkanItemPage from './pages/reports/PenjualanBerdasarkanItemPage';
import DetailPenjualanItemPage from './pages/reports/DetailPenjualanItemPage';
import PenjualanBerdasarkanTipePage from './pages/reports/PenjualanBerdasarkanTipePage';
import PenjualanBerdasarkanServicePage from './pages/reports/PenjualanBerdasarkanServicePage';
import PenjualanBerdasarkanProdukPage from './pages/reports/PenjualanBerdasarkanProdukPage';
import PenjualanBerdasarkanLokasiPage from './pages/reports/PenjualanBerdasarkanLokasiPage';
import PenjualanBerdasarkanChannelPage from './pages/reports/PenjualanBerdasarkanChannelPage';
import PenjualanBerdasarkanPelangganPage from './pages/reports/PenjualanBerdasarkanPelangganPage';
import PenjualanStaffTerperinciPage from './pages/reports/PenjualanStaffTerperinciPage';
import PenjualanBerdasarkanStaffPage from './pages/reports/PenjualanBerdasarkanStaffPage';
import PenjualanBerdasarkanJamPage from './pages/reports/PenjualanBerdasarkanJamPage';
import PenjualanJamPerHariPage from './pages/reports/PenjualanJamPerHariPage';
import PenjualanPerHariPage from './pages/reports/PenjualanPerHariPage';
import PenjualanPerBulanPage from './pages/reports/PenjualanPerBulanPage';
import PenjualanPerKuartalPage from './pages/reports/PenjualanPerKuartalPage';
import PenjualanPerTahunPage from './pages/reports/PenjualanPerTahunPage';
import PenjualanBerdasarkanKategoriLayananPage from './pages/reports/PenjualanBerdasarkanKategoriLayananPage';
import LogPenjualanPage from './pages/reports/LogPenjualanPage';
import ItemPenjualanTanggalPage from './pages/reports/ItemPenjualanTanggalPage';
import PenjualanBerdasarkanKelasPage from './pages/reports/PenjualanBerdasarkanKelasPage';
import PenjualanClassPlanPage from './pages/reports/PenjualanClassPlanPage';
import PenjualanSesiKelasPage from './pages/reports/PenjualanSesiKelasPage';
import PenjualanVarianLayananPage from './pages/reports/PenjualanVarianLayananPage';
import PenjualanVarianProdukPage from './pages/reports/PenjualanVarianProdukPage';
import PenjualanRefundPage from './pages/reports/PenjualanRefundPage';
import PenjualanDibatalkanPage from './pages/reports/PenjualanDibatalkanPage';
import PenjualanBerdasarkanLayananPage from './pages/reports/PenjualanBerdasarkanLayananPage';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = localStorage.getItem('naqupos_admin_auth');
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  // Guard against corrupted / non-JSON auth payloads: a mere non-empty string
  // must not unlock the admin area.
  try {
    const parsed = JSON.parse(auth);
    if (!parsed || typeof parsed !== 'object' || !parsed.token) {
      localStorage.removeItem('naqupos_admin_auth');
      return <Navigate to="/login" replace />;
    }
  } catch {
    localStorage.removeItem('naqupos_admin_auth');
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/print/:invoiceNumber" element={<PrintPage />} />
        <Route path="/payment/success/:invoiceNumber" element={<PaymentSuccessPage />} />



        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/komisi-staff-terperinci" element={<KomisiStaffTerperinciPage />} />
          <Route path="reports/ringkasan-komisi-staff" element={<RingkasanKomisiStaffPage />} />
          <Route path="reports/ringkasan-keuangan" element={<RingkasanKeuanganPage />} />
          <Route path="reports/kalkulasi-agenda" element={<KalkulasiAgendaPage />} />
          <Route path="reports/pembatalan-agenda" element={<PembatalanAgendaPage />} />
          <Route path="reports/detail-agenda" element={<DetailAgendaPage />} />
          <Route path="reports/ringkasan-pembayaran" element={<RingkasanPembayaranPage />} />
          <Route path="reports/log-pembayaran" element={<LogPembayaranPage />} />
          <Route path="reports/ringkasan-pajak" element={<RingkasanPajakPage />} />
          <Route path="reports/tips-dikumpulkan" element={<TipsDikumpulkanPage />} />
          <Route path="reports/ringkasan-diskon" element={<RingkasanDiskonPage />} />
          <Route path="reports/faktur-belum-selesai" element={<FakturBelumSelesaiPage />} />
          <Route path="reports/pergerakan-kas-register" element={<PergerakanKasRegisterPage />} />
          <Route path="reports/laba-rugi-penjualan" element={<LabaRugiPenjualanPage />} />

          <Route path="reports/kas-masuk-keluar" element={<KasMasukKeluarPage />} />
          <Route path="reports/laporan-khusus-dp" element={<LaporanKhususDPPage />} />

          {/* New Inventory Reports */}
          <Route path="reports/performa-penjualan-produk" element={<PerformaPenjualanProdukPage />} />
          <Route path="reports/stok-yang-ada" element={<StokYangAdaPage />} />
          <Route path="reports/log-pergerakan-stok" element={<LogPergerakanStokPage />} />
          <Route path="reports/kalkulasi-pergerakan-stok" element={<KalkulasiPergerakanStokPage />} />
          <Route path="reports/konsumsi-produk" element={<KonsumsiProdukPage />} />
          <Route path="reports/konsumsi-produk/:id" element={<KonsumsiProdukDetailPage />} />

          {/* New Staff Reports */}
          <Route path="reports/jam-kerja-staff" element={<JamKerjaStaffPage />} />
          <Route path="reports/tip-berdasarkan-staff" element={<TipBerdasarkanStaffPage />} />
          <Route path="reports/rincian-komisi-grup-item" element={<RincianKomisiGrupItemPage />} />
          <Route path="reports/kehadiran-staff" element={<KehadiranStaffPage />} />

          {/* Loyalty Point Reports */}
          <Route path="reports/penggunaan-point-free-items" element={<PenggunaanPointFreeItemsPage />} />
          <Route path="reports/point-bisa-digunakan" element={<PointBisaDigunakanPage />} />
          <Route path="reports/penggunaan-point-diskon" element={<PenggunaanPointDiskonPage />} />

          {/* Customer Reports */}
          <Route path="reports/daftar-pelanggan" element={<DaftarPelangganPage />} />
          <Route path="reports/retensi-pelanggan" element={<RetensiPelangganPage />} />

          {/* Voucher Reports */}
          <Route path="reports/sisa-voucher-tersisa" element={<SaldoVoucherTersisaPage />} />
          <Route path="reports/penjualan-voucher" element={<PenjualanVoucherPage />} />
          <Route path="reports/penggunaan-voucher" element={<PenggunaanVoucherPage />} />
          <Route path="reports/kode-voucher-promo" element={<KodeVoucherPromoPage />} />
          <Route path="reports/penukaran-voucher-promo" element={<PenukaranVoucherPromoPage />} />
          <Route path="reports/penukaran-produk-gratis" element={<PenukaranProdukGratisPage />} />
          <Route path="reports/kadaluwarsa-keanggotaan" element={<KadaluwarsaKeanggotaanPage />} />

          {/* Sales Reports */}
          <Route path="reports/penjualan-item" element={<PenjualanItemPage />} />
          <Route path="reports/penjualan-berdasarkan-item" element={<PenjualanBerdasarkanItemPage />} />
          <Route path="reports/detail-penjualan-item" element={<DetailPenjualanItemPage />} />
          <Route path="reports/penjualan-berdasarkan-tipe" element={<PenjualanBerdasarkanTipePage />} />
          <Route path="reports/penjualan-berdasarkan-service" element={<PenjualanBerdasarkanServicePage />} />
          <Route path="reports/penjualan-berdasarkan-produk" element={<PenjualanBerdasarkanProdukPage />} />
          <Route path="reports/penjualan-berdasarkan-lokasi" element={<PenjualanBerdasarkanLokasiPage />} />
          <Route path="reports/penjualan-berdasarkan-channel" element={<PenjualanBerdasarkanChannelPage />} />
          <Route path="reports/penjualan-berdasarkan-pelanggan" element={<PenjualanBerdasarkanPelangganPage />} />
          <Route path="reports/penjualan-staff-terperinci" element={<PenjualanStaffTerperinciPage />} />
          <Route path="reports/penjualan-berdasarkan-staff" element={<PenjualanBerdasarkanStaffPage />} />
          <Route path="reports/penjualan-berdasarkan-jam" element={<PenjualanBerdasarkanJamPage />} />
          <Route path="reports/penjualan-jam-per-hari" element={<PenjualanJamPerHariPage />} />
          <Route path="reports/penjualan-per-hari" element={<PenjualanPerHariPage />} />
          <Route path="reports/penjualan-per-bulan" element={<PenjualanPerBulanPage />} />
          <Route path="reports/penjualan-per-kuartal" element={<PenjualanPerKuartalPage />} />
          <Route path="reports/penjualan-per-tahun" element={<PenjualanPerTahunPage />} />
          <Route path="reports/log-penjualan" element={<LogPenjualanPage />} />
          <Route path="reports/item-penjualan-tanggal" element={<ItemPenjualanTanggalPage />} />
          <Route path="reports/penjualan-berdasarkan-kelas" element={<PenjualanBerdasarkanKelasPage />} />
          <Route path="reports/penjualan-berdasarkan-class-plan" element={<PenjualanClassPlanPage />} />
          <Route path="reports/penjualan-sesi-kelas" element={<PenjualanSesiKelasPage />} />
          <Route path="reports/penjualan-varian-layanan" element={<PenjualanVarianLayananPage />} />
          <Route path="reports/penjualan-varian-produk" element={<PenjualanVarianProdukPage />} />
          <Route path="reports/penjualan-refund" element={<PenjualanRefundPage />} />
          <Route path="reports/penjualan-dibatalkan" element={<PenjualanDibatalkanPage />} />
          <Route path="reports/penjualan-berdasarkan-layanan" element={<PenjualanBerdasarkanLayananPage />} />
          <Route path="reports/penjualan-berdasarkan-kategori-layanan" element={<PenjualanBerdasarkanKategoriLayananPage />} />

          <Route path="sales" element={<SalesPage />} />
          <Route path="marketing/vouchers" element={<VoucherPromoPage />} />
          <Route path="marketing/news" element={<NewsArticlePage />} />
          <Route path="marketing/campaigns" element={<CampaignPage />} />
          <Route path="marketing/automation" element={<AutomationPage />} />
          <Route path="marketing" element={<Navigate to="/marketing/vouchers" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="master-data" element={<MasterDataPage />} />
          <Route path="taxes" element={<TaxPage />} />
          <Route path="discounts" element={<DiscountPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory-orders" element={<InventoryOrdersPage />} />
          <Route path="stock-opname" element={<StockOpnamePage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="loyalty" element={<LoyaltyPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="bank-deposits" element={<BankDepositsPage />} />
          <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
          <Route path="payment-methods" element={<PaymentMethodsPage />} />
          <Route path="asset-categories" element={<AssetCategoryPage />} />
          <Route path="article-categories" element={<ArticleCategoryPage />} />
          <Route path="service-categories" element={<ServiceCategoryPage />} />
          <Route path="subscriptions" element={<SubscriptionPage />} />

          {/* Catch-all: unknown URLs must not render a blank screen */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch-all for unknown top-level URLs */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
