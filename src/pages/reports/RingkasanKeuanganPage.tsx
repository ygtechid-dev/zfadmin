import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';

interface PaymentData {
    id: number;
    type: string;
    total: number;
    kembalian: number;
    jumlah_bersih: number;
    outstanding: number;
}

interface OtherPeriodData {
    id: number;
    booking_id: number;
    tanggalFaktur: string;
    nomorFaktur: string;
    tanggalPembayaran: string;
    jumlah: number;
}

interface TipsData {
    id: number;
    staff: string;
    tanggal: string;
    customer: string;
    jumlah: number;
}

interface VoucherData {
    id: number;
    kode: string;
    nama: string;
    tanggalDigunakan: string;
    nilai: number;
    status: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';
import { useEffect } from 'react';
import BookingReceiptModal from '../../components/common/BookingReceiptModal';

export default function RingkasanKeuanganPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [usePaymentDate, setUsePaymentDate] = useState(true);

    // Data State
    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [otherPeriodPayments, setOtherPeriodPayments] = useState<OtherPeriodData[]>([]);
    const [tips, setTips] = useState<TipsData[]>([]);
    const [vouchers, setVouchers] = useState<VoucherData[]>([]);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [salesData, setSalesData] = useState({
        penjualanKotor: 0,
        diskon: 0,
        diskonTotalPenjualan: 0,
        pengembalian: 0,
        penjualanBersih: 0,
        totalPajak: 0,
        totalPembulatan: 0,
        penggunaanVoucher: 0,
        totalPenjualan: 0
    });
    const [loading, setLoading] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);

    // Fetch Data
    useEffect(() => {
        const fetchFinancialData = async () => {
            setLoading(true);
            try {
                const response = await api.getFinancialSummary({
                    branch_id: selectedBranchId,
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate),
                    use_payment_date: usePaymentDate
                });

                if (response) {
                    setSalesData({
                        penjualanKotor: Number(response.sales.penjualanKotor) || 0,
                        diskon: Number(response.sales.diskon) || 0,
                        diskonTotalPenjualan: Number(response.sales.diskonTotalPenjualan) || 0,
                        pengembalian: Number(response.sales.pengembalian) || 0,
                        penjualanBersih: Number(response.sales.penjualanBersih) || 0,
                        totalPajak: Number(response.sales.totalPajak) || 0,
                        totalPembulatan: Number(response.sales.totalPembulatan) || 0,
                        penggunaanVoucher: Number(response.sales.penggunaanVoucher) || 0,
                        totalPenjualan: Number(response.sales.totalPenjualan) || 0,
                    });
                    setPayments(response.payments || []);
                    setOtherPeriodPayments(response.other_period_payments || []);
                    setTips(response.tips || []);
                    setVouchers(response.vouchers || []);
                }
            } catch (error) {
                console.error("Failed to fetch financial summary:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFinancialData();
    }, [selectedBranchId, startDate, endDate, usePaymentDate]);

    // Pagination
    const [paymentsPage, setPaymentsPage] = useState(1);
    const [paymentsPerPage] = useState(10);
    const paginatedPayments = payments.slice((paymentsPage - 1) * paymentsPerPage, paymentsPage * paymentsPerPage);

    const [otherPeriodPage, setOtherPeriodPage] = useState(1);
    const [otherPeriodPerPage] = useState(10);
    const paginatedOtherPeriod = otherPeriodPayments.slice((otherPeriodPage - 1) * otherPeriodPerPage, otherPeriodPage * otherPeriodPerPage);

    const [tipsPage, setTipsPage] = useState(1);
    const [tipsPerPage] = useState(10);
    const paginatedTips = tips.slice((tipsPage - 1) * tipsPerPage, tipsPage * tipsPerPage);

    const [vouchersPage, setVouchersPage] = useState(1);
    const [vouchersPerPage] = useState(10);
    const paginatedVouchers = vouchers.slice((vouchersPage - 1) * vouchersPerPage, vouchersPage * vouchersPerPage);

    // Derived totals
    const totalTips = tips.reduce((sum, t) => sum + Number(t.jumlah), 0);
    const totalVouchers = vouchers.reduce((sum, v) => sum + Number(v.nilai), 0);

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start);
        setEndDate(end);
        setQuickOption(option);
        setIsDownloaded(false);
    };

    const handleBranchChange = (branchId: number | null, branchName: string) => {
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
        setIsDownloaded(false);
    };

    const exportToCSV = () => {
        let csv = `Ringkasan Keuangan - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;

        csv += 'SALES\nPenjualan Kotor,Diskon,Diskon Total,Pengembalian,Penjualan Bersih,Pajak,Pembulatan,Voucher,Total\n';
        csv += `${salesData.penjualanKotor},${salesData.diskon},${salesData.diskonTotalPenjualan},${salesData.pengembalian},${salesData.penjualanBersih},${salesData.totalPajak},${salesData.totalPembulatan},${salesData.penggunaanVoucher},${salesData.totalPenjualan}\n\n`;

        csv += 'PAYMENTS\nType,Total,Kembalian,Jumlah Bersih,Outstanding\n';
        payments.forEach(p => csv += `${p.type},${p.total},${p.kembalian},${p.jumlah_bersih},${p.outstanding}\n`);
        csv += '\n';

        csv += 'OTHER PERIOD\nTanggal Faktur,Nomor Faktur,Tanggal Pembayaran,Jumlah\n';
        otherPeriodPayments.forEach(p => csv += `${p.tanggalFaktur},${p.nomorFaktur},${p.tanggalPembayaran},${p.jumlah}\n`);
        csv += '\n';

        csv += 'TIPS\nStaff,Tanggal,Customer,Jumlah\n';
        tips.forEach(t => csv += `${t.staff},${t.tanggal},${t.customer},${t.jumlah}\n`);
        csv += '\n';

        csv += 'VOUCHERS\nKode,Nama,Tanggal,Nilai,Status\n';
        vouchers.forEach(v => csv += `${v.kode},${v.nama},${v.tanggalDigunakan},${v.nilai},${v.status}\n`);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ringkasan_keuangan.csv`;
        link.click();
        setIsDownloaded(true);
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Ringkasan Keuangan - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;

        html += '<h3>Sales</h3><table border="1"><tr><th>Penjualan Kotor</th><th>Diskon</th><th>Total Penjualan</th></tr>';
        html += `<tr><td>${formatCurrency(salesData.penjualanKotor)}</td><td>${formatCurrency(salesData.diskon)}</td><td>${formatCurrency(salesData.totalPenjualan)}</td></tr></table><br/>`;

        html += '<h3>Payments</h3><table border="1"><tr><th>Type</th><th>Total</th><th>Kembalian</th><th>Jumlah Bersih</th></tr>';
        payments.forEach(p => html += `<tr><td>${p.type}</td><td>${formatCurrency(p.total)}</td><td>${formatCurrency(p.kembalian)}</td><td>${formatCurrency(p.jumlah_bersih)}</td></tr>`);
        html += '</table><br/>';

        html += '<h3>Tips</h3><table border="1"><tr><th>Staff</th><th>Tanggal</th><th>Customer</th><th>Jumlah</th></tr>';
        tips.forEach(t => html += `<tr><td>${t.staff}</td><td>${t.tanggal}</td><td>${t.customer}</td><td>${formatCurrency(t.jumlah)}</td></tr>`);
        html += '</table><br/>';

        html += '<h3>Vouchers</h3><table border="1"><tr><th>Kode</th><th>Nama</th><th>Tanggal</th><th>Nilai</th></tr>';
        vouchers.forEach(v => html += `<tr><td>${v.kode}</td><td>${v.nama}</td><td>${v.tanggalDigunakan}</td><td>${formatCurrency(v.nilai)}</td></tr>`);
        html += '</table>';

        html += '</body></html>';
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ringkasan_keuangan.xls`;
        link.click();
        setIsDownloaded(true);
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `<!DOCTYPE html><html><head><title>Ringkasan Keuangan</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; }
            th { background: #f5f5f5; text-align: left; }
            td { text-align: right; }
            td.left { text-align: left; }
            h3 { color: #C58940; margin-top: 20px; }
            .header { text-align: center; border-bottom: 3px solid #C58940; padding-bottom: 15px; margin-bottom: 20px; }
            .summary-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        </style>
        </head><body>
        <div class="header">
            <h1>Naqupos Spa</h1>
            <h2>Ringkasan Keuangan</h2>
            <p>Cabang: ${selectedBranchName} | Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        </div>

        <div class="summary-box">
            <p><strong>Total Penjualan:</strong> Rp ${formatCurrency(salesData.totalPenjualan)}</p>
            <p><strong>Total Tips:</strong> Rp ${formatCurrency(totalTips)}</p>
            <p><strong>Total Vouchers:</strong> Rp ${formatCurrency(totalVouchers)}</p>
        </div>

        <h3>Payments (${payments.length} items)</h3>
        <table>
            <thead><tr><th class="left">Type</th><th>Total</th><th>Kembalian</th><th>Jumlah Bersih</th></tr></thead>
            <tbody>
                ${payments.map(p => `<tr><td class="left">${p.type}</td><td>${formatCurrency(p.total)}</td><td>${formatCurrency(p.kembalian)}</td><td>${formatCurrency(p.jumlah_bersih)}</td></tr>`).join('')}
            </tbody>
        </table>

        <h3>Tips (${tips.length} items)</h3>
        <table>
            <thead><tr><th class="left">Staff</th><th class="left">Tanggal</th><th class="left">Customer</th><th>Jumlah</th></tr></thead>
            <tbody>
                ${tips.map(t => `<tr><td class="left">${t.staff}</td><td class="left">${t.tanggal}</td><td class="left">${t.customer}</td><td>${formatCurrency(t.jumlah)}</td></tr>`).join('')}
            </tbody>
        </table>

        <h3>Vouchers (${vouchers.length} items)</h3>
        <table>
            <thead><tr><th class="left">Kode</th><th class="left">Nama</th><th class="left">Tanggal</th><th>Nilai</th><th class="left">Status</th></tr></thead>
            <tbody>
                ${vouchers.map(v => `<tr><td class="left">${v.kode}</td><td class="left">${v.nama}</td><td class="left">${v.tanggalDigunakan}</td><td>${formatCurrency(v.nilai)}</td><td class="left">${v.status}</td></tr>`).join('')}
            </tbody>
        </table>

        <script>window.onload = function() { window.print(); }</script>
        </body></html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        setIsDownloaded(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Ringkasan keuangan</h1>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <button
                    onClick={() => setShowDateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <Calendar size={16} className="text-gray-500" />
                    <span>{quickOption === '7_days' ? '7 hari sebelumnya, ' : ''}{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>

                <div className="flex items-center gap-2 ml-4">
                    <button
                        onClick={() => setUsePaymentDate(!usePaymentDate)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${usePaymentDate ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${usePaymentDate ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className="text-sm text-gray-600">Berdasarkan tanggal pembayaran</span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {isDownloaded && (
                        <span className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-lg">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Sudah didownload
                        </span>
                    )}
                    <ExportDropdown onExportCSV={exportToCSV} onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-bold text-lg flex justify-between items-center">
                    <span>Sales</span>
                    {loading && <span className="text-sm text-gray-500 font-normal">Updating...</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 text-center">Penjualan Kotor</th>
                                <th className="px-4 py-3 text-center">Diskon</th>
                                <th className="px-4 py-3 text-center">Diskon Total</th>
                                <th className="px-4 py-3 text-center">Pengembalian</th>
                                <th className="px-4 py-3 text-center">Penjualan Bersih</th>
                                <th className="px-4 py-3 text-center">Pajak</th>
                                <th className="px-4 py-3 text-center">Pembulatan</th>
                                <th className="px-4 py-3 text-center">Voucher</th>
                                <th className="px-4 py-3 text-center">Total Penjualan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-amber-50">
                                <td className="px-4 py-3 text-center">{formatCurrency(salesData.penjualanKotor)}</td>
                                <td className="px-4 py-3 text-center">{formatCurrency(salesData.diskon)}</td>
                                <td className="px-4 py-3 text-center">{formatCurrency(salesData.diskonTotalPenjualan)}</td>
                                <td className="px-4 py-3 text-center">{formatCurrency(salesData.pengembalian)}</td>
                                <td className="px-4 py-3 text-center">{formatCurrency(salesData.penjualanBersih)}</td>
                                <td className="px-4 py-3 text-center">{formatCurrency(salesData.totalPajak)}</td>
                                <td className="px-4 py-3 text-center">{formatCurrency(salesData.totalPembulatan)}</td>
                                <td className="px-4 py-3 text-center">{formatCurrency(salesData.penggunaanVoucher)}</td>
                                <td className="px-4 py-3 text-center font-bold text-amber-700">{formatCurrency(salesData.totalPenjualan)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-bold text-lg">Payments</div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3 text-left">Type</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3 text-right">Kembalian</th>
                            <th className="px-6 py-3 text-right">Jumlah Bersih</th>
                            <th className="px-6 py-3 text-right">Outstanding</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-gray-900">{p.type}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(p.total)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(p.kembalian)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(p.jumlah_bersih)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(p.outstanding)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination currentPage={paymentsPage} totalItems={payments.length} itemsPerPage={paymentsPerPage} onPageChange={setPaymentsPage} showItemsPerPage={false} />
            </div>

            {/* Payment Invoice Other Period */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-bold text-lg">Payment Invoice Other Period</div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3 text-left">Tanggal Faktur</th>
                            <th className="px-6 py-3 text-left text-teal-600">Nomor Faktur</th>
                            <th className="px-6 py-3 text-left">Tanggal Pembayaran</th>
                            <th className="px-6 py-3 text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedOtherPeriod.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3">{p.tanggalFaktur}</td>
                                <td className="px-6 py-3">
                                    <button
                                        onClick={() => {
                                            setSelectedBookingId(p.booking_id);
                                            setShowReceiptModal(true);
                                        }}
                                        className="text-teal-600 font-medium hover:text-teal-700 transition-colors"
                                    >
                                        {p.nomorFaktur}
                                    </button>
                                </td>
                                <td className="px-6 py-3">{p.tanggalPembayaran}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(p.jumlah)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination currentPage={otherPeriodPage} totalItems={otherPeriodPayments.length} itemsPerPage={otherPeriodPerPage} onPageChange={setOtherPeriodPage} showItemsPerPage={false} />
            </div>

            {/* Tips Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-lg">Tips</span>
                    <span className="text-sm text-gray-500">Total: <strong className="text-gray-900">{formatCurrency(totalTips)}</strong></span>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3 text-left">Staff</th>
                            <th className="px-6 py-3 text-left">Tanggal</th>
                            <th className="px-6 py-3 text-left">Customer</th>
                            <th className="px-6 py-3 text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedTips.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-gray-900">{t.staff}</td>
                                <td className="px-6 py-3">{t.tanggal}</td>
                                <td className="px-6 py-3">{t.customer}</td>
                                <td className="px-6 py-3 text-right text-green-600 font-medium">{formatCurrency(t.jumlah)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination currentPage={tipsPage} totalItems={tips.length} itemsPerPage={tipsPerPage} onPageChange={setTipsPage} showItemsPerPage={false} />
            </div>

            {/* Vouchers Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-lg">Vouchers</span>
                    <span className="text-sm text-gray-500">Total: <strong className="text-gray-900">{formatCurrency(totalVouchers)}</strong></span>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3 text-left">Kode</th>
                            <th className="px-6 py-3 text-left">Nama Voucher</th>
                            <th className="px-6 py-3 text-left">Tanggal Digunakan</th>
                            <th className="px-6 py-3 text-right">Nilai</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedVouchers.map((v) => (
                            <tr key={v.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-teal-600">{v.kode}</td>
                                <td className="px-6 py-3">{v.nama}</td>
                                <td className="px-6 py-3">{v.tanggalDigunakan}</td>
                                <td className="px-6 py-3 text-right text-amber-600 font-medium">{formatCurrency(v.nilai)}</td>
                                <td className="px-6 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${v.status === 'Digunakan' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {v.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination currentPage={vouchersPage} totalItems={vouchers.length} itemsPerPage={vouchersPerPage} onPageChange={setVouchersPage} showItemsPerPage={false} />
            </div>

            {/* Date Filter Modal */}
            <DateFilterModal
                isOpen={showDateModal}
                onClose={() => setShowDateModal(false)}
                onApply={handleDateApply}
                initialStartDate={startDate}
                initialEndDate={endDate}
                initialQuickOption={quickOption}
            />

            {/* Receipt Modal */}
            <BookingReceiptModal
                isOpen={showReceiptModal}
                onClose={() => setShowReceiptModal(false)}
                bookingId={selectedBookingId}
            />
        </div>
    );
}