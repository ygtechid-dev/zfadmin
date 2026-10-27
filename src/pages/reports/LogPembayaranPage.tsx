import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import BookingReceiptModal from '../../components/common/BookingReceiptModal';

interface PaymentLogData {
    id: string; // Nomor Faktur can be alphanumeric
    staff: string;
    type: string;
    amount: number;
    change: number;
    net: number;
    voucher: number;
    discount: number;
    receivedBy: string;
    method: string;
    referenceNo: string;
    paymentDate: string;
    hargaMarkup: number;
    location: string;
    customer: string;
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

export default function LogPembayaranPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');
    const [selectedStaff, setSelectedStaff] = useState('all');
    const [selectedMethod, setSelectedMethod] = useState('all');
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [usePaymentDate, setUsePaymentDate] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

    // Data
    const [allData, setAllData] = useState<PaymentLogData[]>([]);
    const [summaryData, setSummaryData] = useState({
        jumlahTotal: 0,
        totalDiskon: 0,
        penggunaanVoucher: 0,
        jumlahPerubahan: 0,
        jumlahTip: 0,
        jumlahBersih: 0
    });

    // Dynamic Filter Options
    const [uniqueStaff, setUniqueStaff] = useState<string[]>([]);
    const [uniqueMethods, setUniqueMethods] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.getPaymentLog({
                    branch_id: selectedBranchId,
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate),
                    use_payment_date: usePaymentDate,
                    staff: selectedStaff,
                    method: selectedMethod
                });

                if (response) {
                    setAllData(response.logs || []);
                    if (response.summary) {
                        setSummaryData({
                            jumlahTotal: Number(response.summary.jumlahTotal) || 0,
                            totalDiskon: Number(response.summary.totalDiskon) || 0,
                            penggunaanVoucher: Number(response.summary.penggunaanVoucher) || 0,
                            jumlahPerubahan: Number(response.summary.jumlahPerubahan) || 0,
                            jumlahTip: Number(response.summary.jumlahTip) || 0,
                            jumlahBersih: Number(response.summary.jumlahBersih) || 0
                        });
                    }
                    if (response.filters) {
                        // Only set if 'all' is selected to avoid resetting list while filtering? 
                        // Or assume backend returns all potential options?
                        // Current backend returns filtered options which might be limiting if we want to change selection.
                        // Ideally backend should return all possible options for the branch/period, OR we just trust what is returned.
                        // Let's use what is returned but maybe only update if we are in 'all' mode to prevent options disappearing?
                        // Actually, standard behavior often is filters narrow down other filters.
                        setUniqueStaff(response.filters.staff || []);
                        setUniqueMethods(response.filters.methods || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch payment logs", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedBranchId, startDate, endDate, usePaymentDate, selectedStaff, selectedMethod]);


    // Data is already filtered by backend
    const filteredData = allData;
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = filteredData.length;

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start);
        setEndDate(end);
        setQuickOption(option);
        setCurrentPage(1);
    };

    const handleBranchChange = (branchId: number | null, branchName: string) => {
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        let csv = `Log Pembayaran - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Nomor Faktur,Lokasi,Tanggal,Staff,Pelanggan,Transaksi,Metode,Jumlah,Voucher,Diskon,Jumlah Bersih,Kembalian,No Referensi\n';
        filteredData.forEach(d => {
            csv += `${d.id},${d.location},${d.paymentDate},${d.staff},${d.customer},${d.type},${d.method},${d.amount},${d.voucher},${d.discount},${d.net},${d.change},${d.referenceNo}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `log_pembayaran_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Log Pembayaran - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<p><strong>Jumlah Bersih: ${formatCurrency(summaryData.jumlahBersih)}</strong></p>`;
        html += `<table border="1"><tr><th>No Faktur</th><th>Lokasi</th><th>Tanggal</th><th>Staff</th><th>Pelanggan</th><th>Transaksi</th><th>Metode</th><th>Jumlah</th><th>Voucher</th><th>Diskon</th><th>Net</th><th>Kembalian</th><th>Ref No</th></tr>`;
        filteredData.forEach(d => {
            html += `<tr><td>${d.id}</td><td>${d.location}</td><td>${d.paymentDate}</td><td>${d.staff}</td><td>${d.customer}</td><td>${d.type}</td><td>${d.method}</td><td style="text-align:right">${formatCurrency(d.amount)}</td><td style="text-align:right">${formatCurrency(d.voucher)}</td><td style="text-align:right">${formatCurrency(d.discount)}</td><td style="text-align:right">${formatCurrency(d.net)}</td><td style="text-align:right">${formatCurrency(d.change)}</td><td>${d.referenceNo}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `log_pembayaran_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Log Pembayaran</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ddd;padding:4px}th{background:#f5f5f5}.right{text-align:right}</style>
        </head><body>
        <h2>Log Pembayaran - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <div style="margin-bottom:15px">
            <p><strong>Jumlah Total:</strong> Rp ${formatCurrency(summaryData.jumlahTotal)}</p>
            <p><strong>Jumlah Bersih:</strong> Rp ${formatCurrency(summaryData.jumlahBersih)}</p>
        </div>
        <table><thead><tr><th>Faktur</th><th>Lokasi</th><th>Tanggal</th><th>Staff</th><th>Pelanggan</th><th>Trans</th><th>Metode</th><th class="right">Jml</th><th class="right">Net</th><th class="right">Kbl</th></tr></thead><tbody>
        ${filteredData.map(d => `<tr><td>${d.id}</td><td>${d.location}</td><td>${d.paymentDate}</td><td>${d.staff}</td><td>${d.customer}</td><td>${d.type}</td><td>${d.method}</td><td class="right">${formatCurrency(d.amount)}</td><td class="right">${formatCurrency(d.net)}</td><td class="right">${formatCurrency(d.change)}</td></tr>`).join('')}
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
                <h1 className="text-xl font-bold text-gray-800">Log pembayaran</h1>
                {isLoading && <span className="text-sm text-gray-500 ml-2">Loading...</span>}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                {/* Staff Filter */}
                <div className="relative">
                    <select
                        value={selectedStaff}
                        onChange={(e) => { setSelectedStaff(e.target.value); setCurrentPage(1); }}
                        className="px-4 py-2 pr-8 border border-gray-200 rounded-lg text-sm bg-white appearance-none cursor-pointer min-w-[140px]"
                    >
                        <option value="all">Semua Staff</option>
                        {uniqueStaff.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Method Filter */}
                <div className="relative">
                    <select
                        value={selectedMethod}
                        onChange={(e) => { setSelectedMethod(e.target.value); setCurrentPage(1); }}
                        className="px-4 py-2 pr-8 border border-gray-200 rounded-lg text-sm bg-white appearance-none cursor-pointer min-w-[180px]"
                    >
                        <option value="all">Semua metode pembayaran</option>
                        {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

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

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-medium text-gray-700">Summary</div>
                <div className="p-4 space-y-2">
                    <div className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">Jumlah total</span>
                        <span>{formatCurrency(summaryData.jumlahTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm px-2">
                        <span className="text-gray-600 font-medium">Total diskon penjualan</span>
                        <span>{formatCurrency(summaryData.totalDiskon)}</span>
                    </div>
                    <div className="flex justify-between text-sm px-2">
                        <span className="text-gray-600 font-medium">Penggunaan voucher</span>
                        <span>{formatCurrency(summaryData.penggunaanVoucher)}</span>
                    </div>
                    <div className="flex justify-between text-sm px-2">
                        <span className="text-gray-600 font-medium">Jumlah perubahan</span>
                        <span>{formatCurrency(summaryData.jumlahPerubahan)}</span>
                    </div>
                    <div className="flex justify-between text-sm px-2 bg-gray-50 py-1">
                        <span className="text-gray-600 font-medium">Jumlah tip</span>
                        <span>{formatCurrency(summaryData.jumlahTip)}</span>
                    </div>
                    <div className="flex justify-between text-base px-2 font-bold pt-1">
                        <span>Jumlah bersih</span>
                        <span className="text-green-600">{formatCurrency(summaryData.jumlahBersih)}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 text-left">Nomor Faktur</th>
                                <th className="px-4 py-3 text-left">Lokasi</th>
                                <th className="px-4 py-3 text-left">Tanggal</th>
                                <th className="px-4 py-3 text-left">Staff</th>
                                <th className="px-4 py-3 text-left">Pelanggan</th>
                                <th className="px-4 py-3 text-left">Transaksi</th>
                                <th className="px-4 py-3 text-left">Metode Pembay...</th>
                                <th className="px-4 py-3">Jumlah</th>
                                <th className="px-4 py-3">Penggunaan Voucher</th>
                                <th className="px-4 py-3">Diskon Penjualan</th>
                                <th className="px-4 py-3">Jumlah Bersih</th>
                                <th className="px-4 py-3">Kembalian</th>
                                <th className="px-4 py-3 text-left">Nomor Referensi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={13} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 text-left font-medium text-cyan-600 hover:underline cursor-pointer" onClick={() => setSelectedInvoice(row.id)}>{row.id}</td>
                                        <td className="px-4 py-4 text-left text-gray-500">{row.location}</td>
                                        <td className="px-4 py-4 text-left">{row.paymentDate}</td>
                                        <td className="px-4 py-4 text-left text-gray-500">{row.staff}</td>
                                        <td className="px-4 py-4 text-left text-gray-600">{row.customer}</td>
                                        <td className="px-4 py-4 text-left">{row.type}</td>
                                        <td className="px-4 py-4 text-left">{row.method}</td>
                                        <td className="px-4 py-4 text-right font-medium">{formatCurrency(row.amount)}</td>
                                        <td className="px-4 py-4 text-right">{formatCurrency(row.voucher)}</td>
                                        <td className="px-4 py-4 text-right">{formatCurrency(row.discount)}</td>
                                        <td className="px-4 py-4 text-right font-medium text-green-600">{formatCurrency(row.net)}</td>
                                        <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(row.change)}</td>
                                        <td className="px-4 py-4 text-left text-gray-500">{row.referenceNo}</td>
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

            <BookingReceiptModal
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                invoiceNumber={selectedInvoice}
            />
        </div>
    );
}
