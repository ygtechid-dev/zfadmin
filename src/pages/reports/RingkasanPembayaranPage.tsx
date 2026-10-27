import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import Pagination from '../../components/common/Pagination';

interface PaymentData {
    id: number;
    name: string;
    totalTx: number;
    gross: number;
    refunds: number;
    voucher: number;
    kembalian: number;
    net: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

// Removed dummy data generation
// const generateDummyData = ...

import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';
import { useEffect } from 'react';
import BranchSelector from '../../components/common/BranchSelector';

export default function RingkasanPembayaranPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [usePaymentDate, setUsePaymentDate] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data
    const [allData, setAllData] = useState<PaymentData[]>([]);
    const [summaryData, setSummaryData] = useState({
        totalTransaksi: 0,
        pendapatanKotor: 0,
        totalPengembalian: 0,
        penggunaanVoucher: 0,
        kembalian: 0,
        totalPembayaranNet: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.getPaymentSummary({
                    branch_id: selectedBranchId,
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate),
                    use_payment_date: usePaymentDate
                });

                if (response) {
                    setAllData(response.details || []);
                    if (response.summary) {
                        setSummaryData({
                            totalTransaksi: Number(response.summary.totalTransaksi) || 0,
                            pendapatanKotor: Number(response.summary.pendapatanKotor) || 0,
                            totalPengembalian: Number(response.summary.totalPengembalian) || 0,
                            penggunaanVoucher: Number(response.summary.penggunaanVoucher) || 0,
                            kembalian: Number(response.summary.kembalian) || 0,
                            totalPembayaranNet: Number(response.summary.totalPembayaranNet) || 0
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch payment summary", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedBranchId, startDate, endDate, usePaymentDate]);

    const handleBranchChange = (branchId: number | null, branchName: string) => {
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
        setCurrentPage(1);
    };

    const totalItems = allData.length;
    const paginatedData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start);
        setEndDate(end);
        setQuickOption(option);
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        let csv = `Ringkasan Pembayaran - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Payment Name,Total Transaksi,Gross Payment,Refunds,Voucher,Kembalian,Net Payment\n';
        allData.forEach(d => {
            csv += `${d.name},${d.totalTx},${d.gross},${d.refunds},${d.voucher},${d.kembalian},${d.net}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ringkasan_pembayaran_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Ringkasan Pembayaran - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1"><tr><th>Payment Name</th><th>Total Transaksi</th><th>Gross Payment</th><th>Refunds</th><th>Voucher</th><th>Kembalian</th><th>Net Payment</th></tr>`;
        allData.forEach(d => {
            html += `<tr><td>${d.name}</td><td style="text-align:center">${d.totalTx}</td><td style="text-align:right">${formatCurrency(d.gross)}</td><td style="text-align:right">${formatCurrency(d.refunds)}</td><td style="text-align:right">${formatCurrency(d.voucher)}</td><td style="text-align:right">${formatCurrency(d.kembalian)}</td><td style="text-align:right">${formatCurrency(d.net)}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ringkasan_pembayaran_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Ringkasan Pembayaran</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px}th{background:#f5f5f5;text-align:center}td{text-align:right}.left{text-align:left}</style>
        </head><body>
        <h2>Ringkasan Pembayaran - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <div style="margin-bottom:20px">
            <p><strong>Total Transaksi:</strong> ${summaryData.totalTransaksi}</p>
            <p><strong>Total Pembayaran Net:</strong> Rp ${formatCurrency(summaryData.totalPembayaranNet)}</p>
        </div>
        <table><thead><tr><th class="left">Payment Name</th><th>Total Tx</th><th>Gross Payment</th><th>Refunds</th><th>Voucher</th><th>Kembalian</th><th>Net Payment</th></tr></thead><tbody>
        ${allData.map(d => `<tr><td class="left">${d.name}</td><td style="text-align:center">${d.totalTx}</td><td>${formatCurrency(d.gross)}</td><td>${formatCurrency(d.refunds)}</td><td>${formatCurrency(d.voucher)}</td><td>${formatCurrency(d.kembalian)}</td><td>${formatCurrency(d.net)}</td></tr>`).join('')}
        </tbody></table>
        <script>window.onload=function(){window.print()}</script></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Ringkasan pembayaran</h1>
                {isLoading && <span className="text-sm text-gray-500 ml-2">Loading...</span>}
            </div>

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

                <div className="ml-auto">
                    <ExportDropdown onExportCSV={exportToCSV} onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                </div>
            </div>

            {/* Summary Section */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-medium text-gray-700">Summary</div>
                <div className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Total transaksi</span>
                        <span>{summaryData.totalTransaksi}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Pendapatan Kotor</span>
                        <span>{formatCurrency(summaryData.pendapatanKotor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Total Pengembalian</span>
                        <span>{formatCurrency(summaryData.totalPengembalian)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Penggunaan voucher</span>
                        <span>{formatCurrency(summaryData.penggunaanVoucher)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Kembalian</span>
                        <span>{formatCurrency(summaryData.kembalian)}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t mt-2 font-bold">
                        <span>Total pembayaran net</span>
                        <span className="text-amber-600">{formatCurrency(summaryData.totalPembayaranNet)}</span>
                    </div>
                </div>
            </div>

            {/* Detail Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 text-left text-teal-600">Payment Name</th>
                                <th className="px-4 py-3 text-center">Total Transaksi</th>
                                <th className="px-4 py-3 text-right">Gross Payment</th>
                                <th className="px-4 py-3 text-right">Refunds</th>
                                <th className="px-4 py-3 text-right">Penggunaan Voucher</th>
                                <th className="px-4 py-3 text-right">Kembalian</th>
                                <th className="px-4 py-3 text-right">Net Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-left font-medium text-gray-900">{d.name}</td>
                                        <td className="px-4 py-3 text-center">{d.totalTx}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(d.gross)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(d.refunds)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(d.voucher)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(d.kembalian)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-amber-600">{formatCurrency(d.net)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>

            <DateFilterModal
                isOpen={showDateModal}
                onClose={() => setShowDateModal(false)}
                onApply={handleDateApply}
                initialStartDate={startDate}
                initialEndDate={endDate}
                initialQuickOption={quickOption}
            />
        </div>
    );
}
