import {
    DollarSign, ShoppingCart, Package, Ticket, Users, Calendar, UserCheck, Award,
    ChevronRight, ChevronDown, TrendingUp, TrendingDown, FileText, Receipt, CreditCard, Percent,
    HandCoins, AlertCircle, ArrowLeftRight, PiggyBank, Clock, MapPin, Megaphone,
    User, BarChart3, CalendarDays, CalendarRange, CalendarClock, ListOrdered, Layers,
    Boxes, RefreshCcw, XCircle, Wrench, Box, Activity, History, Calculator, LineChart,
    Gift, Tag, Heart, Ban, Info, Coins, ShoppingBag, ChevronLeft, X, Search, CheckCircle
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';

import BranchSelector from '../../components/common/BranchSelector';
import { SearchableSelect } from '../../components/common/SearchableSelect';

// Report Categories with Sub-reports
interface LocationState {
    tab?: string;
}

const reportCategories = [
    {
        id: 'keuangan',
        label: 'Laporan Keuangan',
        icon: DollarSign,
        color: 'bg-emerald-100 text-emerald-600',
        description: 'Laporan keuangan, pembayaran, pajak, dan arus kas',
        subReports: [
            { id: 'ringkasan-keuangan', label: 'Ringkasan Keuangan', icon: TrendingUp },
            { id: 'ringkasan-pembayaran', label: 'Ringkasan Pembayaran', icon: CreditCard },
            { id: 'log-pembayaran', label: 'Log Pembayaran', icon: Receipt },
            { id: 'ringkasan-pajak', label: 'Ringkasan Pajak', icon: Percent },
            { id: 'tips-dikumpulkan', label: 'Tips Dikumpulkan', icon: HandCoins },
            { id: 'ringkasan-diskon', label: 'Ringkasan Diskon', icon: Tag },
            { id: 'faktur-belum-diselesaikan', label: 'Faktur yang Belum Diselesaikan', icon: AlertCircle },
            { id: 'pergerakan-kas-register', label: 'Pergerakan Kas Register', icon: ArrowLeftRight },
            { id: 'penjualan-laba-rugi', label: 'Penjualan Berdasarkan Laba Rugi', icon: BarChart3 },
            { id: 'kas-keluar-masuk', label: 'Kas Keluar Masuk', icon: PiggyBank },
            { id: 'laporan-khusus-dp', label: 'Laporan DP', icon: CreditCard },
        ]
    },
    {
        id: 'penjualan',
        label: 'Laporan Penjualan',
        icon: ShoppingCart,
        color: 'bg-blue-100 text-blue-600',
        description: 'Analisis penjualan item, layanan, dan produk',
        subReports: [
            { id: 'penjualan-item', label: 'Penjualan Item', icon: ShoppingBag },
            { id: 'penjualan-berdasarkan-item', label: 'Penjualan Berdasarkan Item', icon: ListOrdered },
           { id: 'detail-penjualan-item', label: 'Detail Penjualan Berdasarkan Item', icon: FileText },
            { id: 'penjualan-berdasarkan-tipe', label: 'Penjualan Berdasarkan Tipe', icon: Layers },
            { id: 'penjualan-berdasarkan-service', label: 'Penjualan Berdasarkan Service', icon: Wrench },
            { id: 'penjualan-berdasarkan-produk', label: 'Penjualan Berdasarkan Produk', icon: Box },
            { id: 'penjualan-berdasarkan-lokasi', label: 'Penjualan Berdasarkan Lokasi', icon: MapPin },
            { id: 'penjualan-berdasarkan-channel', label: 'Penjualan Berdasarkan Channel', icon: Megaphone },
            { id: 'penjualan-berdasarkan-pelanggan', label: 'Penjualan Berdasarkan Pelanggan', icon: User },
            { id: 'penjualan-staff-terperinci', label: 'Penjualan Berdasarkan Staff Terperinci', icon: Users },
            { id: 'penjualan-berdasarkan-staff', label: 'Penjualan Berdasarkan Staff', icon: UserCheck },
            { id: 'penjualan-berdasarkan-jam', label: 'Penjualan Berdasarkan Jam', icon: Clock },
            { id: 'penjualan-jam-per-hari', label: 'Penjualan Berdasarkan Jam Per Hari', icon: CalendarClock },
            { id: 'penjualan-per-hari', label: 'Penjualan Per Hari', icon: CalendarDays },
            { id: 'penjualan-per-bulan', label: 'Penjualan Per Bulan', icon: CalendarRange },
            { id: 'penjualan-per-kuartal', label: 'Penjualan Per Kuartal', icon: Calendar },
            { id: 'penjualan-per-tahun', label: 'Penjualan Per Tahun', icon: TrendingUp },
            { id: 'log-penjualan', label: 'Log Penjualan', icon: History },
            { id: 'item-penjualan-tanggal', label: 'Item Penjualan Berdasarkan Tanggal', icon: CalendarDays },
            // { id: 'penjualan-berdasarkan-kelas', label: 'Penjualan Berdasarkan Kelas', icon: ClipboardList },
            // { id: 'penjualan-class-plan', label: 'Penjualan Berdasarkan Class Plan', icon: ClipboardList },
            // { id: 'penjualan-sesi-kelas', label: 'Penjualan Berdasarkan Sesi Kelas', icon: Calendar },
            { id: 'penjualan-berdasarkan-kategori-layanan', label: 'Penjualan Berdasarkan Kategori Layanan', icon: Boxes },
            { id: 'penjualan-varian-layanan', label: 'Penjualan Berdasarkan Varian Layanan', icon: Layers },
            { id: 'penjualan-varian-produk', label: 'Penjualan Berdasarkan Varian Produk', icon: Package },
            { id: 'penjualan-refund', label: 'Penjualan Refund', icon: RefreshCcw },
            { id: 'penjualan-dibatalkan', label: 'Penjualan Dibatalkan', icon: XCircle },
            { id: 'penjualan-berdasarkan-layanan', label: 'Laporan Penjualan Berdasarkan Layanan', icon: Wrench },
        ]
    },
    {
        id: 'inventori',
        label: 'Inventori',
        icon: Package,
        color: 'bg-amber-100 text-amber-600',
        description: 'Pantau stok produk dan penyesuaian yang dilakukan',
        subReports: [
            { id: 'stok-yang-ada', label: 'Stok Yang Ada', icon: Box },
            { id: 'performa-penjualan-produk', label: 'Performa Penjualan Produk', icon: TrendingUp },
            { id: 'log-pergerakan-stok', label: 'Log Pergerakan Stok', icon: History },
            { id: 'kalkulasi-pergerakan-stok', label: 'Kalkulasi Pergerakan Stok', icon: Calculator },
            { id: 'konsumsi-produk', label: 'Konsumsi Produk', icon: Activity },
        ]
    },
    {
        id: 'voucher',
        label: 'Laporan Voucher',
        icon: Ticket,
        color: 'bg-purple-100 text-purple-600',
        description: 'Lacak penjualan voucher dan aktivitas penukaran',
        subReports: [
            { id: 'sisa-voucher-tersisa', label: 'Sisa Voucher Tersisa', icon: Ticket },
            { id: 'penjualan-voucher', label: 'Penjualan Voucher', icon: ShoppingCart },
            // { id: 'pelanggan-voucher', label: 'Pelanggan Voucher', icon: User },
            { id: 'pengguna-voucher', label: 'Pengguna Voucher', icon: UserCheck },
            { id: 'kode-voucher-promo', label: 'Kode Voucher Promo', icon: Tag },
            { id: 'penukaran-voucher-promo', label: 'Penukaran Voucher Promo', icon: Gift },
            { id: 'penukaran-produk-gratis', label: 'Penukaran Produk Gratis', icon: Gift },
            { id: 'kadaluwarsa-keanggotaan', label: 'Kadaluwarsa Keanggotaan', icon: AlertCircle },
        ]
    },
    {
        id: 'staff',
        label: 'Laporan Staff',
        icon: Users,
        color: 'bg-pink-100 text-pink-600',
        description: 'Track jam kerja staff, komisi, dan tip',
        subReports: [
            { id: 'jam-kerja-staff', label: 'Jam Kerja Staff', icon: Clock },
            { id: 'tip-berdasarkan-staff', label: 'Tip Berdasarkan Staff', icon: HandCoins },
            { id: 'ringkasan-komisi-staff', label: 'Ringkasan Komisi Staff', icon: DollarSign },
            { id: 'komisi-staff-terperinci', label: 'Komisi Staff Terperinci', icon: FileText },
            // { id: 'kehadiran-staff', label: 'Kehadiran Staff', icon: UserCheck },
            { id: 'rincian-komisi-grup-item', label: 'Rincian Komisi Staff (Grup Berdasarkan Item)', icon: Layers },
        ]
    },
    {
        id: 'agenda',
        label: 'Laporan Agenda',
        icon: Calendar,
        color: 'bg-cyan-100 text-cyan-600',
        description: 'Analisis appointment dan jadwal',
        subReports: [
            { id: 'kalkulasi-agenda', label: 'Kalkulasi Agenda', icon: Calculator },
            { id: 'pembatalan-agenda', label: 'Pembatalan Agenda', icon: Ban },
            { id: 'detail-agenda', label: 'Detail Agenda', icon: Info },
        ]
    },
    {
        id: 'pelanggan',
        label: 'Laporan Pelanggan',
        icon: UserCheck,
        color: 'bg-teal-100 text-teal-600',
        description: 'Dapatkan wawasan tentang pelanggan Anda',
        subReports: [
            { id: 'daftar-pelanggan', label: 'Daftar Pelanggan', icon: Users },
            { id: 'retensi-pelanggan', label: 'Retensi Pelanggan', icon: Heart },
        ]
    },
    {
        id: 'loyalitas',
        label: 'Poin Loyalitas',
        icon: Award,
        color: 'bg-orange-100 text-orange-600',
        description: 'Lacak poin loyalitas dan aktivitas penukaran',
        subReports: [
            { id: 'penggunaan-point-free-items', label: 'Penggunaan Point (Free Items)', icon: Gift },
            { id: 'point-bisa-digunakan', label: 'Point Yang Bisa Digunakan', icon: Coins },
            { id: 'penggunaan-point-diskon', label: 'Penggunaan Point (Diskon)', icon: Percent },
        ]
    },
];

interface SubReport {
    id: string;
    label: string;
    icon: React.ElementType;
}

interface ReportCategory {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
    subReports: SubReport[];
}

interface Staff {
    id: number;
    name: string;
}

// Interface for Komisi Staff Terperinci
interface KomisiStaffItem {
    id: number;
    pelanggan: string;
    tanggalFaktur: string;
    tanggalPembayaran: string;
    nomorFaktur: string;
    item: string;
    namaVariant: string;
    qty: number;
    totalPenjualan: number;
    persenKomisi: string;
    besarKomisi: number;
}

// Sample data for Komisi Staff Terperinci
const sampleKomisiStaffData: KomisiStaffItem[] = [
    {
        id: 1,
        pelanggan: 'Anastasia Adelia',
        tanggalFaktur: '02 Dec 2025',
        tanggalPembayaran: '04 Jan 2026',
        nomorFaktur: '1814',
        item: 'Balinese Massage (member)',
        namaVariant: 'VVIP',
        qty: 1,
        totalPenjualan: 210000,
        persenKomisi: '10%',
        besarKomisi: 21000
    },
    {
        id: 2,
        pelanggan: 'Anastasia Adelia',
        tanggalFaktur: '02 Dec 2025',
        tanggalPembayaran: '04 Jan 2026',
        nomorFaktur: '1814',
        item: 'Totok Wajah + Face Mask',
        namaVariant: '1 jam',
        qty: 1,
        totalPenjualan: 80000,
        persenKomisi: '10%',
        besarKomisi: 8000
    },
    {
        id: 3,
        pelanggan: 'Anastasia Adelia',
        tanggalFaktur: '02 Dec 2025',
        tanggalPembayaran: '04 Jan 2026',
        nomorFaktur: '1814',
        item: 'Milk Bath',
        namaVariant: '15 Menit',
        qty: 1,
        totalPenjualan: 50000,
        persenKomisi: '10%',
        besarKomisi: 5000
    },
    {
        id: 4,
        pelanggan: 'Hasman Rejalu Pratama',
        tanggalFaktur: '05 Jan 2026',
        tanggalPembayaran: '05 Jan 2026',
        nomorFaktur: 'GM9578Y2',
        item: 'Paket Rahajeng (ayah)',
        namaVariant: '4 jam',
        qty: 1,
        totalPenjualan: 213300,
        persenKomisi: '10%',
        besarKomisi: 21330
    },
    {
        id: 5,
        pelanggan: 'Hasman Rejalu Pratama',
        tanggalFaktur: '05 Jan 2026',
        tanggalPembayaran: '05 Jan 2026',
        nomorFaktur: 'GM9578Y2',
        item: 'Paket Rahajeng (istri)',
        namaVariant: '4 jam',
        qty: 1,
        totalPenjualan: 213300,
        persenKomisi: '10%',
        besarKomisi: 21330
    },
    {
        id: 6,
        pelanggan: 'Hasman Rejalu Pratama',
        tanggalFaktur: '05 Jan 2026',
        tanggalPembayaran: '05 Jan 2026',
        nomorFaktur: 'GM9578Y2',
        item: 'Paket Candramaya (anak)',
        namaVariant: '1 jam 50 menit',
        qty: 1,
        totalPenjualan: 150000,
        persenKomisi: '10%',
        besarKomisi: 15000
    },
    {
        id: 7,
        pelanggan: 'annisa fadhila',
        tanggalFaktur: '02 Jan 2026',
        tanggalPembayaran: '02 Jan 2026',
        nomorFaktur: '2MC3VXNW',
        item: 'Paket 1x Kedatangan',
        namaVariant: '5 Jam',
        qty: 1,
        totalPenjualan: 357000,
        persenKomisi: '10%',
        besarKomisi: 35700
    },
    {
        id: 8,
        pelanggan: 'Bella',
        tanggalFaktur: '23 Dec 2025',
        tanggalPembayaran: '04 Jan 2026',
        nomorFaktur: '2201',
        item: 'Javannese Body Massage',
        namaVariant: '60 Menit',
        qty: 1,
        totalPenjualan: 90000,
        persenKomisi: '10%',
        besarKomisi: 9000
    },
    {
        id: 9,
        pelanggan: 'Bella',
        tanggalFaktur: '23 Dec 2025',
        tanggalPembayaran: '04 Jan 2026',
        nomorFaktur: '2201',
        item: 'Body Scrub Standar',
        namaVariant: '30 Menit',
        qty: 1,
        totalPenjualan: 60000,
        persenKomisi: '10%',
        besarKomisi: 6000
    },
];

// Interface for Ringkasan Komisi Staff
interface RingkasanKomisiStaff {
    id: number;
    nama: string;
    total: number;
    layanan: number;
    produk: number;
    voucher: number;
    kelas: number;
    planKelas: number;
}

// Summary data for Ringkasan Komisi Staff
const ringkasanKomisiSummary = {
    totalNilaiKomisi: 5204190,
    totalKomisiLayanan: 5204190,
    totalKomisiProduk: 0,
    totalKomisiVoucher: 0,
    totalKomisiKelas: 0,
    totalKomisiPlanKelas: 0,
};

// Sample data for Ringkasan Komisi Staff table
const sampleRingkasanKomisiData: RingkasanKomisiStaff[] = [
    { id: 1, nama: 'Amandha Devlinsky', total: 685500, layanan: 685500, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
    { id: 2, nama: '(TERAPIS PRIA) Sangaji', total: 553630, layanan: 553630, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
    { id: 3, nama: 'Ninda aisya ade margareta', total: 663130, layanan: 663130, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
    { id: 4, nama: 'Amelia Ramdani', total: 544000, layanan: 544000, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
    { id: 5, nama: 'Zahra Niisa Nur Ariffah', total: 548400, layanan: 548400, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
    { id: 6, nama: 'Nasywaa Nawaal Rizqi', total: 628130, layanan: 628130, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
    { id: 7, nama: 'Dewinta Pratiwi', total: 438900, layanan: 438900, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
    { id: 8, nama: 'Ayu Pamungkas Ningsih', total: 558700, layanan: 558700, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
    { id: 9, nama: 'Oktavia Yulimasari', total: 583800, layanan: 583800, produk: 0, voucher: 0, kelas: 0, planKelas: 0 },
];

interface MetricItem {
    label: string;
    value: string | number;
    percent: number;
}

interface MetricCard {
    value: string | number;
    change: number;
    isPositive: boolean;
    breakdown: MetricItem[];
}

interface DashboardMetrics {
    totalAppointment: MetricCard;
    onlineAppointments: MetricCard;
    occupancy: MetricCard;
    totalSales: MetricCard;
    averageSale: MetricCard;
    clientRetention: MetricCard;
}

const initialDashboardMetrics: DashboardMetrics = {
    totalAppointment: {
        value: 0,
        change: 0,
        isPositive: true,
        breakdown: [
            { label: 'NOT COMPLETED', value: 0, percent: 0 },
            { label: 'COMPLETED', value: 0, percent: 0 },
            { label: 'CANCELED', value: 0, percent: 0 },
            { label: 'NO SHOW', value: 0, percent: 0 },
        ]
    },
    onlineAppointments: {
        value: '0%',
        change: 0,
        isPositive: true,
        breakdown: [
            { label: 'COMPLETED', value: 0, percent: 0 },
            { label: 'CANCELED', value: 0, percent: 0 },
            { label: 'NOT COMPLETED', value: 0, percent: 0 },
            { label: 'NO SHOW', value: 0, percent: 0 },
        ]
    },
    occupancy: {
        value: '0%',
        change: 0,
        isPositive: true,
        breakdown: [
            { label: 'Working Hours', value: '0 Hours', percent: 0 },
            { label: 'Booked Hours', value: '0h 0min', percent: 0 },
            { label: 'Blocked Hours', value: '0h 0min', percent: 0 },
            { label: 'Unbooked Hours', value: '0 Seconds', percent: 0 },
        ]
    },
    totalSales: {
        value: 0,
        change: 0,
        isPositive: true,
        breakdown: [
            { label: 'Services', value: '0,00', percent: 0 },
            { label: 'Products', value: '0,00', percent: 0 },
            { label: 'Class', value: '0,00', percent: 0 },
            { label: 'Voucher', value: '0,00', percent: 0 },
        ]
    },
    averageSale: {
        value: 0,
        change: 0,
        isPositive: true,
        breakdown: [
            { label: 'Sales', value: '0', percent: 0 },
            { label: 'Avg. Service', value: '0', percent: 0 },
            { label: 'Avg. Product Sale', value: '0', percent: 0 },
            { label: 'Avg. Class Sale', value: '0', percent: 0 },
            { label: 'Avg. Voucher Sale', value: '0', percent: 0 },
        ]
    },
    clientRetention: {
        value: '0%',
        change: 0,
        isPositive: true,
        breakdown: [
            { label: 'Returning', value: '0', percent: 0 },
            { label: 'New', value: '0', percent: 0 },
            { label: 'Walk-In', value: '0', percent: 0 },
        ]
    },
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateInput = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};


const getDateRange = (optionId: string): { start: Date; end: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (optionId) {
        case 'today':
            return { start: today, end: today };
        case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return { start: yesterday, end: yesterday };
        }
        case 'this_month': {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            return { start: firstDay, end: today };
        }
        case '7_days': {
            const start = new Date(today);
            start.setDate(start.getDate() - 6);
            return { start, end: today };
        }
        case '30_days': {
            const start = new Date(today);
            start.setDate(start.getDate() - 29);
            return { start, end: today };
        }
        case 'last_month': {
            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
            return { start: firstDay, end: lastDay };
        }
        case 'last_year': {
            const firstDay = new Date(today.getFullYear() - 1, 0, 1);
            const lastDay = new Date(today.getFullYear() - 1, 11, 31);
            return { start: firstDay, end: lastDay };
        }
        case 'this_year': {
            const firstDay = new Date(today.getFullYear(), 0, 1);
            return { start: firstDay, end: today };
        }
        default:
            return { start: today, end: today };
    }
};

export default function ReportsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'beranda' | 'laporan'>('beranda');
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [categorySearch, setCategorySearch] = useState<Record<string, string>>({});
    const [selectedReport, setSelectedReport] = useState<{ category: ReportCategory; report: SubReport } | null>(null);

    // Dashboard Metrics State
    const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>(initialDashboardMetrics);
    const [loadingMetrics, setLoadingMetrics] = useState(false);



    // Global & Local Branch State
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || '');
    // For local filtering when global is 'all'
    const [localBranchId, setLocalBranchId] = useState<number | null>(null);
    const [user, setUser] = useState<any>(null);

    // Company Settings State
    const [companySettings, setCompanySettings] = useState<any>(null);

    const fetchCompanySettings = useCallback(async () => {
        try {
            const branchId = localBranchId !== null ? localBranchId : (globalBranchId === '' || globalBranchId === 'all' ? undefined : parseInt(globalBranchId));
            if (!branchId) return;

            const response = await api.get(`/admin/company/settings?branch_id=${branchId}`);
            if (response.status === 'success') {
                setCompanySettings(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch company settings:', error);
        }
    }, [localBranchId, globalBranchId]);

    useEffect(() => {
        fetchCompanySettings();
    }, [fetchCompanySettings]);

    useEffect(() => {
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) {
            setUser(JSON.parse(authData).user);
        }
    }, []);

    const isSuperAdminOrAdmin = useMemo(() => {
        if (!user?.role) return false;
        const role = user.role.toLowerCase();
        return ['super admin', 'super_admin', 'owner'].includes(role);
    }, [user]);

    // Sync global branch state
    useEffect(() => {
        const syncBranch = () => {
            const saved = localStorage.getItem('naqupos_selected_branch') || '';
            setGlobalBranchId(saved);
            // Reset local filter when global changes
            if (saved !== 'all' && saved !== '') {
                setLocalBranchId(Number(saved));
            } else {
                setLocalBranchId(null);
            }
        };

        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        // Initial sync
        syncBranch();

        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, []);

    const visibleReportCategories = useMemo(() => {
        return reportCategories.map(category => ({
            ...category,
            subReports: category.subReports.filter(report => {
                if (report.id === 'ringkasan-pajak' && companySettings && !companySettings.is_tax_enabled) {
                    return false;
                }
                if (report.id === 'penggunaan-point-diskon' && companySettings && !companySettings.is_tax_enabled) {
                    // This is for loyalty discounts, might still be applicable but usually if tax is off, everything is simpler
                    // However, let's just stick to the specific "Ringkasan Pajak" for now.
                }
                return true;
            })
        })).filter(category => category.subReports.length > 0);
    }, [companySettings]);

    // Staff data from API
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [loadingStaff, setLoadingStaff] = useState(true);

    // Date Filter State
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [startDate, setStartDate] = useState<Date>(() => {
        const date = new Date();
        date.setDate(date.getDate() - 6);
        return date;
    });
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [tempStartDate, setTempStartDate] = useState<Date>(startDate);
    const [tempEndDate, setTempEndDate] = useState<Date>(endDate);
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [selectedQuickOption, setSelectedQuickOption] = useState<string>('7_days');

    // Fetch Dashboard Metrics
    const fetchDashboardMetrics = useCallback(async () => {
        if (activeTab !== 'beranda') return;

        try {
            setLoadingMetrics(true);
            const params = {
                branch_id: localBranchId !== null ? localBranchId : (globalBranchId === '' || globalBranchId === 'all' ? undefined : globalBranchId),
                date_from: formatDateInput(startDate),
                date_to: formatDateInput(endDate)
            };

            const [
                bookingsReport,
                financialSummary,
                salesByChannel,
                salesByService
            ] = await Promise.all([
                api.getBookingsReport(params),
                api.getFinancialSummary(params),
                api.getSalesByChannel(params),
                api.getSalesByService(params)
            ]);

            // Process Bookings
            const totalBookings = bookingsReport.total_bookings || 0;
            const byStatus = bookingsReport.by_status || [];
            const completed = byStatus.find((s: any) => s.status === 'completed')?.count || 0;
            const cancelled = byStatus.find((s: any) => s.status === 'cancelled')?.count || 0;
            const noShow = byStatus.find((s: any) => s.status === 'no_show')?.count || 0;
            const notCompleted = totalBookings - completed - cancelled - noShow;

            // Process Sales
            const totalSales = financialSummary?.sales?.totalPenjualan || 0;
            // const grossSales = financialSummary?.sales?.penjualanKotor || 0;

            // Process Online/Walkin
            const onlineData = salesByChannel?.data?.find((d: any) => d.channel === 'ONLINE');
            const walkinData = salesByChannel?.data?.find((d: any) => d.channel === 'WALK-IN');
            const totalChannel = (onlineData?.sold || 0) + (walkinData?.sold || 0) || 1;
            const onlinePercent = Math.round(((onlineData?.sold || 0) / totalChannel) * 100);

            // Process Services vs Products (Mocking Product/Class/Vouchers as 0 for now)
            const serviceSales = salesByService?.summary?.nett || 0;

            // Update State
            setDashboardMetrics(prev => ({
                ...prev,
                totalAppointment: {
                    ...prev.totalAppointment,
                    value: totalBookings,
                    breakdown: [
                        { label: 'NOT COMPLETED', value: notCompleted, percent: totalBookings ? Math.round((notCompleted / totalBookings) * 100) : 0 },
                        { label: 'COMPLETED', value: completed, percent: totalBookings ? Math.round((completed / totalBookings) * 100) : 0 },
                        { label: 'CANCELED', value: cancelled, percent: totalBookings ? Math.round((cancelled / totalBookings) * 100) : 0 },
                        { label: 'NO SHOW', value: noShow, percent: totalBookings ? Math.round((noShow / totalBookings) * 100) : 0 },
                    ]
                },
                onlineAppointments: {
                    ...prev.onlineAppointments,
                    value: `${onlinePercent}%`,
                    breakdown: [
                        { label: 'ONLINE', value: onlineData?.sold || 0, percent: onlinePercent },
                        { label: 'WALK-IN', value: walkinData?.sold || 0, percent: 100 - onlinePercent },
                    ]
                },
                totalSales: {
                    ...prev.totalSales,
                    value: totalSales,
                    breakdown: [
                        { label: 'Services', value: formatCurrency(serviceSales), percent: totalSales ? Math.round((serviceSales / totalSales) * 100) : 0 },
                        { label: 'Products', value: '0,00', percent: 0 },
                        { label: 'Class', value: '0,00', percent: 0 },
                        { label: 'Voucher', value: '0,00', percent: 0 },
                    ]
                },
                averageSale: {
                    ...prev.averageSale,
                    value: totalBookings ? totalSales / totalBookings : 0,
                    breakdown: [
                        { label: 'Sales', value: totalBookings, percent: 0 },
                        { label: 'Avg. Service', value: formatCurrency(totalBookings ? serviceSales / totalBookings : 0), percent: 0 },
                    ]
                },
                // Retaining some static placeholders for less critical metrics
                occupancy: { ...prev.occupancy },
                clientRetention: { ...prev.clientRetention }
            }));

        } catch (error) {
            console.error('Failed to load dashboard metrics', error);
        } finally {
            setLoadingMetrics(false);
        }
    }, [activeTab, startDate, endDate, localBranchId, globalBranchId]);

    // Effect to fetch metrics
    useEffect(() => {
        if (activeTab === 'beranda') {
            fetchDashboardMetrics();
        }
    }, [fetchDashboardMetrics]);

    // Handle initial tab from navigation state
    useEffect(() => {
        const state = location.state as LocationState;
        if (state?.tab === 'laporan') {
            setActiveTab('laporan');
        }
    }, [location.state]);

    // Load branches from API
    useEffect(() => {
        const loadBranches = async () => {

        };
        loadBranches();
    }, []);

    // Load staff data
    useEffect(() => {
        const loadStaff = async () => {
            try {
                setLoadingStaff(true);
                const response = await api.getTherapists();
                // API returns paginated response with data in 'data' property
                const therapistData = response.data || response;
                setStaffList(therapistData.map((t: { id: number; name: string }) => ({
                    id: t.id,
                    name: t.name
                })));
            } catch (err: unknown) {
                console.error('Error loading staff:', err);
            } finally {
                setLoadingStaff(false);
            }
        };
        loadStaff();
    }, []);

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const handleSelectReport = (category: ReportCategory, report: SubReport) => {
        // Navigate to dedicated pages for specific reports
        const dedicatedPages: Record<string, string> = {
            'ringkasan-keuangan': '/reports/ringkasan-keuangan',
            'ringkasan-pembayaran': '/reports/ringkasan-pembayaran',
            'log-pembayaran': '/reports/log-pembayaran',
            'ringkasan-pajak': '/reports/ringkasan-pajak',
            'tips-dikumpulkan': '/reports/tips-dikumpulkan',
            'ringkasan-diskon': '/reports/ringkasan-diskon',
            'faktur-belum-diselesaikan': '/reports/faktur-belum-selesai',
            'pergerakan-kas-register': '/reports/pergerakan-kas-register',
            'penjualan-laba-rugi': '/reports/laba-rugi-penjualan',
            'kas-keluar-masuk': '/reports/kas-masuk-keluar',
            'kalkulasi-agenda': '/reports/kalkulasi-agenda',
            'pembatalan-agenda': '/reports/pembatalan-agenda',
            'detail-agenda': '/reports/detail-agenda',

            // Customer Reports
            'daftar-pelanggan': '/reports/daftar-pelanggan',
            'retensi-pelanggan': '/reports/retensi-pelanggan',

            // Inventory Reports
            'performa-penjualan-produk': '/reports/performa-penjualan-produk',
            'stok-yang-ada': '/reports/stok-yang-ada',
            'log-pergerakan-stok': '/reports/log-pergerakan-stok',

            // Staff Reports
            'jam-kerja-staff': '/reports/jam-kerja-staff',
            'tip-berdasarkan-staff': '/reports/tip-berdasarkan-staff',
            'ringkasan-komisi-staff': '/reports/ringkasan-komisi-staff',
            'komisi-staff-terperinci': '/reports/komisi-staff-terperinci',
            'rincian-komisi-grup-item': '/reports/rincian-komisi-grup-item',
            'kehadiran-staff': '/reports/kehadiran-staff',

            // Inventory Reports (Continued)
            'kalkulasi-pergerakan-stok': '/reports/kalkulasi-pergerakan-stok',
            'konsumsi-produk': '/reports/konsumsi-produk',

            // Loyalty Point Reports
            'penggunaan-point-free-items': '/reports/penggunaan-point-free-items',
            'point-bisa-digunakan': '/reports/point-bisa-digunakan',
            'penggunaan-point-diskon': '/reports/penggunaan-point-diskon',

            // DP Reports
            'laporan-khusus-dp': '/reports/laporan-khusus-dp',

            // Voucher Reports
            'sisa-voucher-tersisa': '/reports/sisa-voucher-tersisa',
            'penjualan-voucher': '/reports/penjualan-voucher',
            'pengguna-voucher': '/reports/penggunaan-voucher',
            'kode-voucher-promo': '/reports/kode-voucher-promo',
            'penukaran-voucher-promo': '/reports/penukaran-voucher-promo',
            'penukaran-produk-gratis': '/reports/penukaran-produk-gratis',
            'kadaluwarsa-keanggotaan': '/reports/kadaluwarsa-keanggotaan',

            // Sales Reports
            'penjualan-item': '/reports/penjualan-item',
            'penjualan-berdasarkan-item': '/reports/penjualan-berdasarkan-item',
            'detail-penjualan-item': '/reports/detail-penjualan-item',
            'penjualan-berdasarkan-tipe': '/reports/penjualan-berdasarkan-tipe',
            'penjualan-berdasarkan-service': '/reports/penjualan-berdasarkan-service',
            'penjualan-berdasarkan-produk': '/reports/penjualan-berdasarkan-produk',
            'penjualan-berdasarkan-lokasi': '/reports/penjualan-berdasarkan-lokasi',
            'penjualan-berdasarkan-channel': '/reports/penjualan-berdasarkan-channel',
            'penjualan-berdasarkan-pelanggan': '/reports/penjualan-berdasarkan-pelanggan',
            'penjualan-staff-terperinci': '/reports/penjualan-staff-terperinci',
            'penjualan-berdasarkan-staff': '/reports/penjualan-berdasarkan-staff',
            'penjualan-berdasarkan-jam': '/reports/penjualan-berdasarkan-jam',
            'penjualan-jam-per-hari': '/reports/penjualan-jam-per-hari',
            'penjualan-per-hari': '/reports/penjualan-per-hari',
            'penjualan-per-bulan': '/reports/penjualan-per-bulan',
            'penjualan-per-kuartal': '/reports/penjualan-per-kuartal',
            'penjualan-per-tahun': '/reports/penjualan-per-tahun',
            'log-penjualan': '/reports/log-penjualan',
            'item-penjualan-tanggal': '/reports/item-penjualan-tanggal',
            'penjualan-berdasarkan-kelas': '/reports/penjualan-berdasarkan-kelas',
            'penjualan-berdasarkan-class-plan': '/reports/penjualan-berdasarkan-class-plan',
            'penjualan-sesi-kelas': '/reports/penjualan-sesi-kelas',
            'penjualan-varian-layanan': '/reports/penjualan-varian-layanan',
            'penjualan-varian-produk': '/reports/penjualan-varian-produk',
            'penjualan-refund': '/reports/penjualan-refund',
            'penjualan-dibatalkan': '/reports/penjualan-dibatalkan',
            'penjualan-berdasarkan-layanan': '/reports/penjualan-berdasarkan-layanan',
            'penjualan-berdasarkan-kategori-layanan': '/reports/penjualan-berdasarkan-kategori-layanan',
        };

        if (dedicatedPages[report.id]) {
            navigate(dedicatedPages[report.id]);
            return;
        }
        setSelectedReport({ category, report });
    };

    const handleQuickOptionSelect = (optionId: string) => {
        setSelectedQuickOption(optionId);
        const { start, end } = getDateRange(optionId);
        setTempStartDate(start);
        setTempEndDate(end);
    };

    const handleApplyDateFilter = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
        setShowDateFilter(false);
    };

    const handleResetDateFilter = () => {
        const { start, end } = getDateRange('7_days');
        setTempStartDate(start);
        setTempEndDate(end);
        setSelectedQuickOption('7_days');
    };

    const openDateFilter = () => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setShowDateFilter(true);
    };



    const isDateInRange = (day: number) => {
        const date = new Date(calendarYear, calendarMonth, day);
        return date >= tempStartDate && date <= tempEndDate;
    };

    const isDateStart = (day: number) => {
        const date = new Date(calendarYear, calendarMonth, day);
        return date.toDateString() === tempStartDate.toDateString();
    };

    const isDateEnd = (day: number) => {
        const date = new Date(calendarYear, calendarMonth, day);
        return date.toDateString() === tempEndDate.toDateString();
    };

    const handleCalendarDayClick = (day: number) => {
        const clickedDate = new Date(calendarYear, calendarMonth, day);
        if (!tempStartDate || (tempStartDate && tempEndDate)) {
            setTempStartDate(clickedDate);
            setTempEndDate(clickedDate);
        } else if (clickedDate < tempStartDate) {
            setTempStartDate(clickedDate);
        } else {
            setTempEndDate(clickedDate);
        }
        setSelectedQuickOption('');
    };

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex justify-center border-b border-gray-200 bg-white -mx-6 -mt-6 px-6 pt-4">
                <button
                    onClick={() => setActiveTab('beranda')}
                    className={`px-8 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'beranda'
                        ? 'border-naqupos-primary text-naqupos-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Beranda
                </button>
                <button
                    onClick={() => setActiveTab('laporan')}
                    className={`px-8 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'laporan'
                        ? 'border-naqupos-primary text-naqupos-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Laporan
                </button>
            </div>

            {/* Beranda Tab Content */}
            {activeTab === 'beranda' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-4">
                            {isSuperAdminOrAdmin && (
                                <BranchSelector
                                    selectedBranchId={localBranchId}
                                    onBranchChange={(id) => setLocalBranchId(id)}
                                    showAllOption={true}
                                    className="w-[200px]"
                                />
                            )}

                            {/* Staff Filter */}
                            <select
                                value={selectedStaffId || ''}
                                onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
                                disabled={loadingStaff}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-naqupos-primary outline-none min-w-[180px] h-[40px]"
                            >
                                <option value="">Semua Staff</option>
                                {staffList.map(staff => (
                                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range Button */}
                        <button
                            onClick={openDateFilter}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                        >
                            <Calendar size={16} className="text-gray-500" />
                            <span className="text-gray-700">
                                {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
                            </span>
                        </button>
                    </div>

                    {/* Dashboard Metrics Grid */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-200 ${loadingMetrics ? 'opacity-50' : 'opacity-100'}`}>
                        {/* Total Appointment */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-naqupos-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="flex items-start justify-between mb-6 relative">
                                <div>
                                    <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider">Total Appointment</h3>
                                    <div className="flex items-end gap-3 mt-1">
                                        <span className="text-4xl font-bold text-gray-900 tracking-tight">
                                            {dashboardMetrics.totalAppointment.value}
                                        </span>
                                        <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold mb-1">
                                            <TrendingUp size={12} className="mr-1" />
                                            {dashboardMetrics.totalAppointment.change}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <CalendarDays size={24} />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-gray-500">
                                {dashboardMetrics.totalAppointment.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="uppercase font-medium text-gray-400 w-32">{item.label}</span>
                                        <span className="font-semibold text-gray-700">{item.value} ({item.percent}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Online Appointments */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="flex items-start justify-between mb-6 relative">
                                <div>
                                    <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider">Online Appointments</h3>
                                    <div className="flex items-end gap-3 mt-1">
                                        <span className="text-4xl font-bold text-gray-900 tracking-tight">
                                            {dashboardMetrics.onlineAppointments.value}
                                        </span>
                                        <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold mb-1">
                                            <TrendingUp size={12} className="mr-1" />
                                            {dashboardMetrics.onlineAppointments.change}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                    <Users size={24} />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-gray-500">
                                {dashboardMetrics.onlineAppointments.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="uppercase font-medium text-gray-400 w-32">{item.label}</span>
                                        <span className="font-semibold text-gray-700">{item.value} ({item.percent}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Occupancy */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="flex items-start justify-between mb-6 relative">
                                <div>
                                    <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider">Occupancy</h3>
                                    <div className="flex items-end gap-3 mt-1">
                                        <span className="text-4xl font-bold text-gray-900 tracking-tight">
                                            {dashboardMetrics.occupancy.value}
                                        </span>
                                        <span className="flex items-center text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full text-xs font-semibold mb-1">
                                            - {dashboardMetrics.occupancy.change}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-gray-500">
                                {dashboardMetrics.occupancy.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="font-medium text-gray-400 w-32">{item.label}</span>
                                        <span className="font-semibold text-gray-700">{item.value} ({item.percent}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total Sales */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="flex items-start justify-between mb-6 relative">
                                <div>
                                    <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider">Total Sales</h3>
                                    <div className="flex items-end gap-3 mt-1">
                                        <span className="text-3xl font-bold text-gray-900 tracking-tight">
                                            {formatCurrency(dashboardMetrics.totalSales.value as number)}
                                        </span>
                                        <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold mb-1">
                                            <TrendingUp size={12} className="mr-1" />
                                            {dashboardMetrics.totalSales.change}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                                    <DollarSign size={24} />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-gray-500">
                                {dashboardMetrics.totalSales.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="font-medium text-gray-400 w-32">{item.label}</span>
                                        <span className="font-semibold text-gray-700">{item.value} ({item.percent}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Average Sale */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="flex items-start justify-between mb-6 relative">
                                <div>
                                    <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider">Average Sale</h3>
                                    <div className="flex items-end gap-3 mt-1">
                                        <span className="text-3xl font-bold text-gray-900 tracking-tight">
                                            {formatCurrency(dashboardMetrics.averageSale.value as number)}
                                        </span>
                                        <span className="flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-semibold mb-1">
                                            <TrendingDown size={12} className="mr-1" />
                                            {Math.abs(dashboardMetrics.averageSale.change)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                                    <Receipt size={24} />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-gray-500">
                                {dashboardMetrics.averageSale.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="font-medium text-gray-400 w-32">{item.label}</span>
                                        <span className="font-semibold text-gray-700">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Client Retention (Sales) */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="flex items-start justify-between mb-6 relative">
                                <div>
                                    <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider">Client Retention (Sales)</h3>
                                    <div className="flex items-end gap-3 mt-1">
                                        <span className="text-4xl font-bold text-gray-900 tracking-tight">
                                            {dashboardMetrics.clientRetention.value}
                                        </span>
                                        <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold mb-1">
                                            <TrendingUp size={12} className="mr-1" />
                                            {dashboardMetrics.clientRetention.change}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                                    <Heart size={24} />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-gray-500">
                                {dashboardMetrics.clientRetention.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="font-medium text-gray-400 w-32">{item.label}</span>
                                        <span className="font-semibold text-gray-700">{item.value} ({item.percent}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Laporan Tab Content */}
            {
                activeTab === 'laporan' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl p-5 border border-naqupos-accent/30 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-naqupos-secondary rounded-lg">
                                    <MapPin size={18} className="text-naqupos-primary" />
                                </div>
                                <h3 className="font-semibold text-naqupos-dark">Filter Berdasarkan Cabang</h3>
                            </div>
                            <BranchSelector
                                selectedBranchId={localBranchId}
                                onBranchChange={(id) => setLocalBranchId(id)}
                                showAllOption={true}
                                className="w-full max-w-md"
                            />
                        </div>

                        {/* Main Content */}
                        <div className="flex gap-6">
                            {/* Left Side - Category Cards */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {visibleReportCategories.map(category => {
                                    const isExpanded = expandedCategories.includes(category.id);
                                    const Icon = category.icon;

                                    return (
                                        <div
                                            key={category.id}
                                            className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isExpanded
                                                ? 'border-naqupos-primary shadow-xl md:col-span-2 ring-2 ring-naqupos-secondary'
                                                : 'border-naqupos-accent/20 shadow-md hover:shadow-xl hover:border-naqupos-accent/50'
                                                }`}
                                        >
                                            {/* Category Header */}
                                            <button
                                                onClick={() => toggleCategory(category.id)}
                                                className="w-full p-6 flex items-start gap-4 text-left group relative overflow-hidden"
                                            >
                                                {/* Elegant gradient background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-naqupos-secondary/30 via-transparent to-naqupos-cream/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                                {/* Icon with enhanced styling */}
                                                <div className={`relative p-4 rounded-2xl ${category.color} shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300`}>
                                                    <Icon size={28} className="drop-shadow-sm" />
                                                </div>

                                                <div className="flex-1 relative">
                                                    <h3 className="font-serif font-bold text-naqupos-dark text-xl mb-1 group-hover:text-naqupos-primary transition-colors duration-300">
                                                        {category.label}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white text-xs font-semibold rounded-full shadow-sm">
                                                            <FileText size={14} />
                                                            {category.subReports.length} laporan tersedia
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Enhanced chevron */}
                                                <div className={`relative p-3 rounded-full bg-naqupos-secondary group-hover:bg-naqupos-primary transition-all duration-300 ${isExpanded ? 'rotate-180 bg-naqupos-primary' : ''
                                                    }`}>
                                                    <ChevronDown size={22} className={`transition-colors duration-300 ${isExpanded ? 'text-white' : 'text-naqupos-primary group-hover:text-white'
                                                        }`} />
                                                </div>
                                            </button>

                                            {/* Expanded Sub-reports */}
                                            {isExpanded && (
                                                <div className="px-6 pb-6 bg-gradient-to-b from-naqupos-cream/30 to-white">
                                                    {/* Search Input with enhanced styling */}
                                                    <div className="py-5 border-t border-naqupos-accent/20">
                                                        <div className="relative">
                                                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-naqupos-primary" />
                                                            <input
                                                                type="text"
                                                                placeholder="Cari laporan..."
                                                                className="w-full pl-12 pr-4 py-3.5 border-2 border-naqupos-accent/30 rounded-xl text-sm focus:border-naqupos-primary focus:ring-2 focus:ring-naqupos-secondary outline-none bg-white shadow-sm transition-all duration-300"
                                                                value={categorySearch[category.id] || ''}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setCategorySearch(prev => ({ ...prev, [category.id]: e.target.value }))}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {category.subReports
                                                            .filter(report => report.label.toLowerCase().includes((categorySearch[category.id] || '').toLowerCase()))
                                                            .map(report => {
                                                                const ReportIcon = report.icon;
                                                                const isSelected = selectedReport?.report.id === report.id;

                                                                return (
                                                                    <button
                                                                        key={report.id}
                                                                        onClick={() => handleSelectReport(category, report)}
                                                                        className={`group relative p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${isSelected
                                                                            ? 'border-naqupos-primary bg-gradient-to-br from-naqupos-primary/10 to-naqupos-accent/5 shadow-md'
                                                                            : 'border-gray-100 hover:border-naqupos-primary/30 hover:shadow-lg bg-white'
                                                                            }`}
                                                                    >
                                                                        {/* Gradient overlay on hover */}
                                                                        <div className="absolute inset-0 bg-gradient-to-br from-naqupos-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                                                        <div className="relative flex items-start gap-3">
                                                                            {/* Icon with background */}
                                                                            <div className={`p-2.5 rounded-lg transition-all duration-300 ${isSelected
                                                                                ? 'bg-naqupos-primary text-white shadow-md'
                                                                                : 'bg-gray-50 text-gray-600 group-hover:bg-naqupos-primary/10 group-hover:text-naqupos-primary'
                                                                                }`}>
                                                                                <ReportIcon size={20} />
                                                                            </div>

                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className={`font-medium text-sm leading-tight transition-colors ${isSelected
                                                                                    ? 'text-naqupos-primary'
                                                                                    : 'text-gray-900 group-hover:text-naqupos-primary'
                                                                                    }`}>
                                                                                    {report.label}
                                                                                </h4>
                                                                                {isSelected && (
                                                                                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-naqupos-primary/10 text-naqupos-primary text-xs font-medium rounded-full">
                                                                                        <CheckCircle size={12} />
                                                                                        Dipilih
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* Arrow indicator */}
                                                                            <ChevronRight
                                                                                size={16}
                                                                                className={`transition-all duration-300 ${isSelected
                                                                                    ? 'text-naqupos-primary translate-x-0'
                                                                                    : 'text-gray-300 -translate-x-1 group-hover:translate-x-0 group-hover:text-naqupos-primary'
                                                                                    }`}
                                                                            />
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Date Filter Modal */}
            {
                showDateFilter && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDateFilter(false)}>
                        <div
                            className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <h2 className="text-xl font-semibold text-gray-900">Date Filter</h2>
                                <button
                                    onClick={() => setShowDateFilter(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 flex gap-8">
                                {/* Quick Options - Left Side */}
                                <div className="w-56 space-y-2">
                                    {/* Hari ini - full width */}
                                    <button
                                        onClick={() => handleQuickOptionSelect('today')}
                                        className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all ${selectedQuickOption === 'today'
                                            ? 'bg-gray-200 text-gray-800'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                            }`}
                                    >
                                        Hari ini
                                    </button>

                                    {/* Bulan ini & Kemarin - side by side */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleQuickOptionSelect('this_month')}
                                            className={`flex-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${selectedQuickOption === 'this_month'
                                                ? 'bg-gray-200 text-gray-800'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                                }`}
                                        >
                                            Bulan ini
                                        </button>
                                        <button
                                            onClick={() => handleQuickOptionSelect('yesterday')}
                                            className={`flex-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${selectedQuickOption === 'yesterday'
                                                ? 'bg-gray-200 text-gray-800'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                                }`}
                                        >
                                            Kemarin
                                        </button>
                                    </div>

                                    {/* 7 hari sebelumnya - full width */}
                                    <button
                                        onClick={() => handleQuickOptionSelect('7_days')}
                                        className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all ${selectedQuickOption === '7_days'
                                            ? 'bg-gray-200 text-gray-800'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                            }`}
                                    >
                                        7 hari sebelumnya
                                    </button>

                                    {/* 30 hari sebelumnya - full width */}
                                    <button
                                        onClick={() => handleQuickOptionSelect('30_days')}
                                        className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all ${selectedQuickOption === '30_days'
                                            ? 'bg-gray-200 text-gray-800'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                            }`}
                                    >
                                        30 hari sebelumnya
                                    </button>

                                    {/* Bulan kemarin & Tahun kemarin - side by side */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleQuickOptionSelect('last_month')}
                                            className={`flex-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${selectedQuickOption === 'last_month'
                                                ? 'bg-gray-200 text-gray-800'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                                }`}
                                        >
                                            Bulan kemarin
                                        </button>
                                        <button
                                            onClick={() => handleQuickOptionSelect('last_year')}
                                            className={`flex-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${selectedQuickOption === 'last_year'
                                                ? 'bg-gray-200 text-gray-800'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                                }`}
                                        >
                                            Tahun kemarin
                                        </button>
                                    </div>

                                    {/* Tahun ini - full width */}
                                    <button
                                        onClick={() => handleQuickOptionSelect('this_year')}
                                        className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all ${selectedQuickOption === 'this_year'
                                            ? 'bg-gray-200 text-gray-800'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                            }`}
                                    >
                                        Tahun ini
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="w-px bg-gray-200"></div>

                                {/* Calendar Section - Right Side */}
                                <div className="flex-1">
                                    {/* Date Inputs */}
                                    <div className="flex gap-4 mb-6">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-2">Mulai Tanggal</label>
                                            <input
                                                type="date"
                                                value={formatDateInput(tempStartDate)}
                                                onChange={(e) => {
                                                    const newStart = new Date(e.target.value);
                                                    setTempStartDate(newStart);
                                                    if (tempEndDate < newStart) {
                                                        setTempEndDate(newStart);
                                                    }
                                                    setSelectedQuickOption('');
                                                }}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-2">Sampai Tanggal</label>
                                            <input
                                                type="date"
                                                value={formatDateInput(tempEndDate)}
                                                onChange={(e) => {
                                                    setTempEndDate(new Date(e.target.value));
                                                    setSelectedQuickOption('');
                                                }}
                                                min={formatDateInput(tempStartDate)}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Calendar Label */}
                                    <p className="text-xs text-gray-500 mb-2">Mulai Tanggal:</p>

                                    {/* Calendar Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="font-semibold text-gray-900">
                                            {calendarYear} {monthNames[calendarMonth]}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    if (calendarMonth === 0) {
                                                        setCalendarMonth(11);
                                                        setCalendarYear(calendarYear - 1);
                                                    } else {
                                                        setCalendarMonth(calendarMonth - 1);
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-600"
                                            >
                                                Previous Month
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const today = new Date();
                                                    setCalendarMonth(today.getMonth());
                                                    setCalendarYear(today.getFullYear());
                                                }}
                                                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-600"
                                            >
                                                Today
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (calendarMonth === 11) {
                                                        setCalendarMonth(0);
                                                        setCalendarYear(calendarYear + 1);
                                                    } else {
                                                        setCalendarMonth(calendarMonth + 1);
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-600"
                                            >
                                                Next Month
                                            </button>
                                        </div>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                            <div key={day} className="text-center text-sm text-gray-500 font-medium py-2">
                                                {day}
                                            </div>
                                        ))}
                                        {(() => {
                                            const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                                            const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                                            const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();
                                            const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

                                            const cells = [];

                                            // Previous month days
                                            for (let i = adjustedFirstDay - 1; i >= 0; i--) {
                                                const day = daysInPrevMonth - i;
                                                cells.push(
                                                    <div key={`prev-${day}`} className="h-10 flex items-center justify-center text-sm text-gray-300">
                                                        {day}
                                                    </div>
                                                );
                                            }

                                            // Current month days
                                            for (let day = 1; day <= daysInMonth; day++) {
                                                const inRange = isDateInRange(day);
                                                const isStart = isDateStart(day);
                                                const isEnd = isDateEnd(day);
                                                const isToday = new Date().toDateString() === new Date(calendarYear, calendarMonth, day).toDateString();

                                                cells.push(
                                                    <button
                                                        key={`curr-${day}`}
                                                        onClick={() => handleCalendarDayClick(day)}
                                                        className={`h-10 flex items-center justify-center text-sm transition-all ${isStart || isEnd
                                                            ? 'bg-blue-500 text-white font-medium rounded-lg'
                                                            : inRange
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : isToday
                                                                    ? 'text-blue-500 font-medium'
                                                                    : 'text-gray-700 hover:bg-gray-100 rounded-lg'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            }

                                            // Next month days
                                            const remainingCells = 42 - cells.length;
                                            for (let day = 1; day <= remainingCells; day++) {
                                                cells.push(
                                                    <div key={`next-${day}`} className="h-10 flex items-center justify-center text-sm text-gray-300">
                                                        {day}
                                                    </div>
                                                );
                                            }

                                            return cells;
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-center gap-4 px-6 py-5 border-t border-gray-100">
                                <button
                                    onClick={handleResetDateFilter}
                                    className="flex-1 max-w-[200px] py-3 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleApplyDateFilter}
                                    className="flex-1 max-w-[200px] py-3 bg-cyan-400 text-white rounded-lg text-sm font-medium hover:bg-cyan-500 transition-colors"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Selected Report Detail Modal/Panel */}
            {
                selectedReport && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
                        <div
                            className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setSelectedReport(null)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <ChevronLeft size={20} className="text-gray-500" />
                                    </button>
                                    <h2 className="text-lg font-semibold text-gray-900">{selectedReport.report.label}</h2>
                                </div>
                            </div>

                            {/* Komisi Staff Terperinci specific content */}
                            {selectedReport.report.id === 'komisi-staff-terperinci' ? (
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    {/* Filters Row */}
                                    <div className="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
                                        {/* Location Filter - Only shown if global filter is 'all' */}
                                        {globalBranchId === 'all' && (
                                            <BranchSelector
                                                selectedBranchId={localBranchId}
                                                onBranchChange={(id) => setLocalBranchId(id)}
                                                showAllOption={true}
                                                className="min-w-[150px]"
                                            />
                                        )}

                                        {/* Category Filter */}
                                        <SearchableSelect
                                            value={''}
                                            onChange={(_val: string | number) => { }}
                                            options={[
                                                { value: '', label: 'Berdasarkan Semua' },
                                                { value: 'service', label: 'Layanan' },
                                                { value: 'product', label: 'Produk' },
                                                { value: 'voucher', label: 'Voucher' },
                                                { value: 'kelas', label: 'Kelas' },
                                                { value: 'paket', label: 'Paket Layanan' }
                                            ]}
                                        />

                                        {/* Date Filter Toggle */}
                                        <label className="flex items-center gap-2">
                                            <div className="relative inline-flex items-center">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-10 h-5 bg-gray-200 peer-checked:bg-teal-400 rounded-full transition-colors"></div>
                                                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                                            </div>
                                            <span className="text-sm text-gray-600">Berdasarkan tanggal pembayaran</span>
                                        </label>

                                        {/* Staff Filter */}
                                        <SearchableSelect
                                            value={selectedStaffId || ''}
                                            onChange={(val: string | number) => setSelectedStaffId(val ? Number(val) : null)}
                                            options={[
                                                { value: '', label: 'Semua Staff' },
                                                ...staffList.map(staff => ({ value: staff.id, label: staff.name }))
                                            ]}
                                        />
                                    </div>

                                    {/* Date Range & Export Row */}
                                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                        <button
                                            onClick={openDateFilter}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                                        >
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-gray-700">
                                                7 hari sebelumnya, {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
                                            </span>
                                        </button>

                                        {/* Export Dropdown */}
                                        <div className="relative group">
                                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                                                Export ▼
                                            </button>
                                            <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">CSV</button>
                                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">PDF</button>
                                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">XLSX</button>
                                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">XLS</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-sm min-w-[1200px]">
                                            <thead className="bg-white border-b border-gray-200 sticky top-0">
                                                <tr className="text-left text-xs text-gray-500">
                                                    <th className="px-4 py-3 font-medium">
                                                        Pelanggan
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium">
                                                        Tanggal Faktur
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium">
                                                        Tanggal Pembayaran
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium">
                                                        Nomor Faktur
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium">
                                                        Item
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium">
                                                        Nama Variant
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium text-center">
                                                        Qty
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium text-right">
                                                        Total Penjualan
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium text-center">
                                                        Persen Komisi
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                    <th className="px-4 py-3 font-medium text-right">
                                                        Besar Komisi
                                                        <span className="ml-1 text-gray-300">↕</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sampleKomisiStaffData.map((item) => (
                                                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-gray-900">{item.pelanggan}</td>
                                                        <td className="px-4 py-3 text-gray-600">{item.tanggalFaktur}</td>
                                                        <td className="px-4 py-3 text-gray-600">{item.tanggalPembayaran}</td>
                                                        <td className="px-4 py-3 text-gray-600">{item.nomorFaktur}</td>
                                                        <td className="px-4 py-3 text-gray-900">{item.item}</td>
                                                        <td className="px-4 py-3 text-gray-600">{item.namaVariant}</td>
                                                        <td className="px-4 py-3 text-center text-gray-600">{item.qty}</td>
                                                        <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(item.totalPenjualan)}</td>
                                                        <td className="px-4 py-3 text-center text-gray-600">{item.persenKomisi}</td>
                                                        <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatCurrency(item.besarKomisi)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Table Footer with Pagination */}
                                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>Total {sampleKomisiStaffData.length}</span>
                                            <select className="px-2 py-1 border border-gray-200 rounded text-sm">
                                                <option>20/page</option>
                                                <option>50/page</option>
                                                <option>100/page</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button className="px-2 py-1 text-sm text-gray-400">&lt;</button>
                                            <button className="w-8 h-8 bg-teal-500 text-white rounded text-sm font-medium">1</button>
                                            <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded text-sm">2</button>
                                            <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded text-sm">3</button>
                                            <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded text-sm">4</button>
                                            <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded text-sm">5</button>
                                            <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded text-sm">6</button>
                                            <span className="px-2 text-gray-400">...</span>
                                            <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded text-sm">24</button>
                                            <button className="px-2 py-1 text-sm text-gray-600">&gt;</button>
                                            <div className="flex items-center gap-2 ml-4">
                                                <span className="text-sm text-gray-600">Go to</span>
                                                <input
                                                    type="number"
                                                    className="w-12 px-2 py-1 border border-gray-200 rounded text-sm text-center"
                                                    defaultValue="1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : selectedReport.report.id === 'ringkasan-komisi-staff' ? (
                                /* Ringkasan Komisi Staff specific content */
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    {/* Filters Row */}
                                    <div className="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
                                        {/* Location Filter - Only shown if global filter is 'all' */}
                                        {globalBranchId === 'all' && (
                                            <BranchSelector
                                                selectedBranchId={localBranchId}
                                                onBranchChange={(id) => setLocalBranchId(id)}
                                                showAllOption={true}
                                                className="min-w-[180px]"
                                            />
                                        )}

                                        {/* Date Filter Toggle */}
                                        <label className="flex items-center gap-2">
                                            <div className="relative inline-flex items-center">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-10 h-5 bg-gray-200 peer-checked:bg-teal-400 rounded-full transition-colors"></div>
                                                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                                            </div>
                                            <span className="text-sm text-gray-600">Berdasarkan tanggal pembayaran</span>
                                        </label>

                                        {/* Staff Filter */}
                                        <SearchableSelect
                                            value={selectedStaffId || ''}
                                            onChange={(val: string | number) => setSelectedStaffId(val ? Number(val) : null)}
                                            options={[
                                                { value: '', label: 'Semua Staff' },
                                                ...staffList.map(staff => ({ value: staff.id, label: staff.name }))
                                            ]}
                                        />

                                        {/* Date Range */}
                                        <button
                                            onClick={openDateFilter}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                                        >
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-gray-700">
                                                7 hari sebelumnya, {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
                                            </span>
                                        </button>

                                        {/* Export Dropdown */}
                                        <div className="relative group ml-auto">
                                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                                                Export ▼
                                            </button>
                                            <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">CSV</button>
                                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">PDF</button>
                                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">XLSX</button>
                                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">XLS</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Group By Dropdown */}
                                    <div className="p-4 border-b border-gray-100">
                                        <div className="relative inline-block">
                                            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
                                                Berdasarkan Staff ▼
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 overflow-auto p-4">
                                        {/* Summary Section */}
                                        <div className="mb-6">
                                            <h3 className="text-sm font-medium text-gray-900 mb-4">Summary</h3>
                                            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-2 border-b border-gray-100">
                                                    <div className="px-4 py-3 font-medium text-gray-700">Total nilai komisi</div>
                                                    <div className="px-4 py-3 text-right text-gray-900">{formatCurrency(ringkasanKomisiSummary.totalNilaiKomisi)}</div>
                                                </div>
                                                <div className="grid grid-cols-2 border-b border-gray-100 bg-gray-50">
                                                    <div className="px-4 py-3 font-medium text-gray-700">Total Komisi Layanan</div>
                                                    <div className="px-4 py-3 text-right text-gray-900">{formatCurrency(ringkasanKomisiSummary.totalKomisiLayanan)}</div>
                                                </div>
                                                <div className="grid grid-cols-2 border-b border-gray-100">
                                                    <div className="px-4 py-3 font-medium text-gray-700">Total Komisi Produk</div>
                                                    <div className="px-4 py-3 text-right text-gray-900">{formatCurrency(ringkasanKomisiSummary.totalKomisiProduk)}</div>
                                                </div>
                                                <div className="grid grid-cols-2 border-b border-gray-100 bg-gray-50">
                                                    <div className="px-4 py-3 font-medium text-gray-700">Total Komisi Voucher</div>
                                                    <div className="px-4 py-3 text-right text-gray-900">{formatCurrency(ringkasanKomisiSummary.totalKomisiVoucher)}</div>
                                                </div>
                                                <div className="grid grid-cols-2 border-b border-gray-100">
                                                    <div className="px-4 py-3 font-medium text-gray-700">Total Komisi Kelas</div>
                                                    <div className="px-4 py-3 text-right text-gray-900">{formatCurrency(ringkasanKomisiSummary.totalKomisiKelas)}</div>
                                                </div>
                                                <div className="grid grid-cols-2">
                                                    <div className="px-4 py-3 font-medium text-gray-700">Total komisi plan kelas</div>
                                                    <div className="px-4 py-3 text-right text-gray-900">{formatCurrency(ringkasanKomisiSummary.totalKomisiPlanKelas)}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Staff Breakdown Table */}
                                        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-white border-b border-gray-200">
                                                    <tr className="text-left text-xs text-gray-500">
                                                        <th className="px-4 py-3 font-medium">Nama</th>
                                                        <th className="px-4 py-3 font-medium text-right">Total</th>
                                                        <th className="px-4 py-3 font-medium text-right">Layanan</th>
                                                        <th className="px-4 py-3 font-medium text-right">Produk</th>
                                                        <th className="px-4 py-3 font-medium text-right">Voucher</th>
                                                        <th className="px-4 py-3 font-medium text-right">Kelas</th>
                                                        <th className="px-4 py-3 font-medium text-right">Plan Kelas</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sampleRingkasanKomisiData.map((item, idx) => (
                                                        <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                                                            <td className="px-4 py-3 text-gray-900">{item.nama}</td>
                                                            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(item.total)}</td>
                                                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.layanan)}</td>
                                                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.produk)}</td>
                                                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.voucher)}</td>
                                                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.kelas)}</td>
                                                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.planKelas)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Table Footer with Pagination */}
                                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>Total {sampleRingkasanKomisiData.length}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button className="px-2 py-1 text-sm text-gray-400">&lt;</button>
                                            <button className="w-8 h-8 bg-teal-500 text-white rounded text-sm font-medium">1</button>
                                            <button className="px-2 py-1 text-sm text-gray-600">&gt;</button>
                                            <div className="flex items-center gap-2 ml-4">
                                                <span className="text-sm text-gray-600">Go to</span>
                                                <input
                                                    type="number"
                                                    className="w-12 px-2 py-1 border border-gray-200 rounded text-sm text-center"
                                                    defaultValue="1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Default content for other reports */
                                <div className="p-6 flex-1 overflow-auto">
                                    {/* Date Range Filter */}
                                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-gray-500">Dari:</label>
                                            <input
                                                type="date"
                                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-naqupos-primary outline-none"
                                                defaultValue={formatDateInput(startDate)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-gray-500">Sampai:</label>
                                            <input
                                                type="date"
                                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-naqupos-primary outline-none"
                                                defaultValue={formatDateInput(endDate)}
                                            />
                                        </div>
                                        <button className="px-4 py-2 bg-naqupos-primary text-white rounded-lg text-sm font-medium hover:bg-naqupos-accent transition-colors">
                                            Terapkan
                                        </button>
                                        <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors ml-auto">
                                            Export PDF
                                        </button>
                                        <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                            Export Excel
                                        </button>
                                    </div>

                                    {/* Placeholder Content */}
                                    <div className="text-center py-16">
                                        <div className={`w-20 h-20 mx-auto rounded-full ${selectedReport.category.color} flex items-center justify-center mb-4`}>
                                            <LineChart size={40} />
                                        </div>
                                        <h3 className="text-lg font-semibold text-naqupos-dark mb-2">
                                            Laporan {selectedReport.report.label}
                                        </h3>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Data laporan akan ditampilkan di sini setelah integrasi dengan backend selesai.
                                            Pilih rentang tanggal dan klik "Terapkan" untuk melihat data.
                                        </p>
                                    </div>

                                    {/* Sample Table Placeholder */}
                                    <div className="mt-8 border border-gray-100 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr className="text-left text-xs text-gray-500 uppercase">
                                                    <th className="px-4 py-3 font-medium">Tanggal</th>
                                                    <th className="px-4 py-3 font-medium">Item</th>
                                                    <th className="px-4 py-3 font-medium">Jumlah</th>
                                                    <th className="px-4 py-3 font-medium">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-gray-50">
                                                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                                                        <FileText size={40} className="mx-auto mb-2 opacity-50" />
                                                        <p>Belum ada data untuk ditampilkan</p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}
