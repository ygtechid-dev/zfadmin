import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface SalesByLocation {
    id: number;
    location: string;
    sold: number;
    gross: number;
    discount: number;
    salesDiscount: number;
    refund: number;
    nett: number;
    tax: number;
    voucherUsage: number;
    totalSales: number;
}

interface Summary {
    totalSold: number;
    gross: number;
    discount: number;
    salesDiscount: number;
    refund: number;
    nett: number;
    tax: number;
    voucherUsage: number;
    totalSales: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function PenjualanBerdasarkanLokasiPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<SalesByLocation[]>([]);
    const [summary, setSummary] = useState<Summary>({
        totalSold: 0, gross: 0, discount: 0, salesDiscount: 0,
        refund: 0, nett: 0, tax: 0, voucherUsage: 0, totalSales: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paginatedData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = allData.length;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params: Record<string, string> = {
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate)
                };
                if (selectedBranchId) params.branch_id = selectedBranchId.toString();

                const result = await api.getSalesByLocation(params);
                setAllData(result.data || []);
                setSummary(result.summary || {
                    totalSold: 0, gross: 0, discount: 0, salesDiscount: 0,
                    refund: 0, nett: 0, tax: 0, voucherUsage: 0, totalSales: 0
                });
            } catch (err) {
                console.error('Error fetching sales by location:', err);
                setError('Gagal memuat data. Silakan coba lagi.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedBranchId, startDate, endDate]);

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start); setEndDate(end); setQuickOption(option); setCurrentPage(1);
    };

    const handleBranchChange = (branchId: number | null, branchName: string) => {
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        let csv = `Penjualan Berdasarkan Lokasi - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Lokasi,Sold,Kotor,Diskon,Diskon Penjualan,Pengembalian,Nett,Tax,Penggunaan Voucher,Total Penjualan\n';
        allData.forEach(d => {
            csv += `"${d.location}",${d.sold},${d.gross},${d.discount},${d.salesDiscount},${d.refund},${d.nett},${d.tax},${d.voucherUsage},${d.totalSales}\n`;
        });
        csv += `\nSummary\n`;
        csv += `Jumlah Terjual,${summary.totalSold}\nKotor,${summary.gross}\nDiskon,${summary.discount}\nTotal Diskon Penjualan,${summary.salesDiscount}\nPengembalian,${summary.refund}\nNett,${summary.nett}\nPajak,${summary.tax}\nTotal Penjualan,${summary.totalSales}\nPenggunaan Voucher,${summary.voucherUsage}\n`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `penjualan_berdasarkan_lokasi_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Penjualan Berdasarkan Lokasi - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<h3>Summary</h3><table border="1">
            <tr><td><strong>Jumlah Terjual</strong></td><td style="text-align:center">${summary.totalSold}</td></tr>
            <tr><td><strong>Kotor</strong></td><td style="text-align:right">${formatCurrency(summary.gross)}</td></tr>
            <tr><td><strong>Diskon</strong></td><td style="text-align:right">${formatCurrency(summary.discount)}</td></tr>
            <tr><td><strong>Total Diskon Penjualan</strong></td><td style="text-align:right">${formatCurrency(summary.salesDiscount)}</td></tr>
            <tr><td><strong>Pengembalian</strong></td><td style="text-align:right">${formatCurrency(summary.refund)}</td></tr>
            <tr><td><strong>Nett</strong></td><td style="text-align:right">${formatCurrency(summary.nett)}</td></tr>
            <tr><td><strong>Pajak</strong></td><td style="text-align:right">${formatCurrency(summary.tax)}</td></tr>
            <tr><td><strong>Total Penjualan</strong></td><td style="text-align:right">${formatCurrency(summary.totalSales)}</td></tr>
            <tr><td><strong>Penggunaan Voucher</strong></td><td style="text-align:right">${formatCurrency(summary.voucherUsage)}</td></tr>
        </table>`;
        html += `<br/><h3>Detail</h3><table border="1"><tr>
            <th>Lokasi</th><th>Sold</th><th>Kotor</th><th>Diskon</th>
            <th>Diskon Penjualan</th><th>Pengembalian</th><th>Nett</th>
            <th>Tax</th><th>Penggunaan Voucher</th><th>Total Penjualan</th>
        </tr>`;
        allData.forEach(d => {
            html += `<tr>
                <td>${d.location}</td>
                <td style="text-align:center">${d.sold}</td>
                <td style="text-align:right">${formatCurrency(d.gross)}</td>
                <td style="text-align:right">${formatCurrency(d.discount)}</td>
                <td style="text-align:right">${formatCurrency(d.salesDiscount)}</td>
                <td style="text-align:right">${formatCurrency(d.refund)}</td>
                <td style="text-align:right">${formatCurrency(d.nett)}</td>
                <td style="text-align:right">${formatCurrency(d.tax)}</td>
                <td style="text-align:right">${formatCurrency(d.voucherUsage)}</td>
                <td style="text-align:right">${formatCurrency(d.totalSales)}</td>
            </tr>`;
        });
        html += `<tr style="font-weight:bold;background:#f5f5f5">
            <td>TOTAL</td>
            <td style="text-align:center">${summary.totalSold}</td>
            <td style="text-align:right">${formatCurrency(summary.gross)}</td>
            <td style="text-align:right">${formatCurrency(summary.discount)}</td>
            <td style="text-align:right">${formatCurrency(summary.salesDiscount)}</td>
            <td style="text-align:right">${formatCurrency(summary.refund)}</td>
            <td style="text-align:right">${formatCurrency(summary.nett)}</td>
            <td style="text-align:right">${formatCurrency(summary.tax)}</td>
            <td style="text-align:right">${formatCurrency(summary.voucherUsage)}</td>
            <td style="text-align:right">${formatCurrency(summary.totalSales)}</td>
        </tr></table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `penjualan_berdasarkan_lokasi_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Penjualan Berdasarkan Lokasi</title>
        <style>
            body{font-family:sans-serif;padding:20px;font-size:12px}
            h3{margin:16px 0 8px}
            table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px}
            th,td{border:1px solid #ddd;padding:5px 7px}
            th{background:#f5f5f5;text-align:center;font-weight:600}
            .right{text-align:right} .center{text-align:center}
            .total-row{font-weight:bold;background:#f5f5f5}
            .summary-table td:first-child{font-weight:600;width:200px}
            .summary-table td:last-child{text-align:right}
        </style></head><body>
        <h2>Penjualan Berdasarkan Lokasi - ${selectedBranchName}</h2>
        <p style="margin:2px 0">Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>

        <h3>Summary</h3>
        <table class="summary-table" style="width:320px">
            <tr><td>Jumlah Terjual</td><td>${summary.totalSold}</td></tr>
            <tr><td>Kotor</td><td>${formatCurrency(summary.gross)}</td></tr>
            <tr><td>Diskon</td><td>${formatCurrency(summary.discount)}</td></tr>
            <tr><td>Total Diskon Penjualan</td><td>${formatCurrency(summary.salesDiscount)}</td></tr>
            <tr><td>Pengembalian</td><td>${formatCurrency(summary.refund)}</td></tr>
            <tr><td>Nett</td><td>${formatCurrency(summary.nett)}</td></tr>
            <tr><td>Pajak</td><td>${formatCurrency(summary.tax)}</td></tr>
            <tr><td>Total Penjualan</td><td>${formatCurrency(summary.totalSales)}</td></tr>
            <tr><td>Penggunaan Voucher</td><td>${formatCurrency(summary.voucherUsage)}</td></tr>
        </table>

        <h3>Detail</h3>
        <table>
            <thead><tr>
                <th>Lokasi</th><th>Sold</th><th>Kotor</th><th>Diskon</th>
                <th>Diskon Penjualan</th><th>Pengembalian</th><th>Nett</th>
                <th>Tax</th><th>Peng. Voucher</th><th>Total Penjualan</th>
            </tr></thead>
            <tbody>
                ${allData.map(d => `<tr>
                    <td><strong>${d.location}</strong></td>
                    <td class="center">${d.sold}</td>
                    <td class="right">${formatCurrency(d.gross)}</td>
                    <td class="right">${formatCurrency(d.discount)}</td>
                    <td class="right">${formatCurrency(d.salesDiscount)}</td>
                    <td class="right">${formatCurrency(d.refund)}</td>
                    <td class="right">${formatCurrency(d.nett)}</td>
                    <td class="right">${formatCurrency(d.tax)}</td>
                    <td class="right">${formatCurrency(d.voucherUsage)}</td>
                    <td class="right"><strong>${formatCurrency(d.totalSales)}</strong></td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td>TOTAL</td>
                    <td class="center">${summary.totalSold}</td>
                    <td class="right">${formatCurrency(summary.gross)}</td>
                    <td class="right">${formatCurrency(summary.discount)}</td>
                    <td class="right">${formatCurrency(summary.salesDiscount)}</td>
                    <td class="right">${formatCurrency(summary.refund)}</td>
                    <td class="right">${formatCurrency(summary.nett)}</td>
                    <td class="right">${formatCurrency(summary.tax)}</td>
                    <td class="right">${formatCurrency(summary.voucherUsage)}</td>
                    <td class="right"><strong>${formatCurrency(summary.totalSales)}</strong></td>
                </tr>
            </tfoot>
        </table>
        <script>window.onload=function(){window.print()}</script>
        </body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Penjualan berdasarkan lokasi</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector selectedBranchId={selectedBranchId} onBranchChange={handleBranchChange} showAllOption={true} />
                <SearchableSelect value="" onChange={() => { }} options={[{ value: '', label: 'Semua Staff' }]} />
                <button onClick={() => setShowDateModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Calendar size={16} className="text-gray-500" />
                    <span>{quickOption === '7_days' ? '7 hari sebelumnya, ' : ''}{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>
                <div className="ml-auto">
                    <ExportDropdown onExportCSV={exportToCSV} onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Summary</h2>
                {loading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-cyan-500" size={24} /></div>
                ) : (
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-600">Jumlah Terjual</span><span className="font-medium text-gray-900">{summary.totalSold}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-600">Kotor</span><span className="font-medium text-gray-900">{formatCurrency(summary.gross)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-600">Diskon</span><span className="font-medium text-gray-900">{formatCurrency(summary.discount)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-600">Total diskon penjualan</span><span className="font-medium text-gray-900">{formatCurrency(summary.salesDiscount)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-600">Pengembalian</span><span className="font-medium text-gray-900">{formatCurrency(summary.refund)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-600">Nett</span><span className="font-medium text-gray-900">{formatCurrency(summary.nett)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-600">Pajak</span><span className="font-medium text-gray-900">{formatCurrency(summary.tax)}</span></div>
                        <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-600">Total Penjualan</span><span className="font-medium text-gray-900">{formatCurrency(summary.totalSales)}</span></div>
                        <div className="flex justify-between py-2"><span className="text-gray-600">Penggunaan voucher</span><span className="font-medium text-gray-900">{formatCurrency(summary.voucherUsage)}</span></div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-cyan-500" size={32} /><span className="ml-3 text-gray-500">Memuat data...</span></div>
                ) : error ? (
                    <div className="flex items-center justify-center py-12 text-red-500">{error}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Lokasi <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Sold <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Kotor <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Diskon <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Diskon Penjualan <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Pengembalian <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Nett <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Tax <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Penggunaan Voucher <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Total Penjualan <ArrowUpDown size={12} /></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400">Tidak ada data</td></tr>
                                    ) : paginatedData.map((d) => (
                                        <tr key={d.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-900 font-medium">{d.location}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.sold)}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.gross)}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.discount)}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.salesDiscount)}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.refund)}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.nett)}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.tax)}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.voucherUsage)}</td>
                                            <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.totalSales)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
                    </>
                )}
            </div>

            <DateFilterModal isOpen={showDateModal} onClose={() => setShowDateModal(false)} onApply={handleDateApply} initialStartDate={startDate} initialEndDate={endDate} initialQuickOption={quickOption} />
        </div>
    );
}