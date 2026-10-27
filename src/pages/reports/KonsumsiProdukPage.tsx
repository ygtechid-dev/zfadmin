import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface ProductConsumption {
    id: number;
    nama: string;
    qty: number;
    sku: string;
    kodeBarang: string;
    avgCostPrice: number;
    totalBiaya: number;
}

interface Summary {
    totalItems: number;
    totalQty: number;
    totalBiaya: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function KonsumsiProdukPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Naqupos Spa Solo');
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<ProductConsumption[]>([]);
    const [summary, setSummary] = useState<Summary>({
        totalItems: 0, totalQty: 0, totalBiaya: 0
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
                if (selectedBranchId) {
                    params.branch_id = selectedBranchId.toString();
                }

                const result = await api.getProductConsumption(params);
                setAllData(result.data || []);
                setSummary(result.summary || {
                    totalItems: 0, totalQty: 0, totalBiaya: 0
                });
            } catch (err) {
                console.error('Error fetching product consumption:', err);
                setError('Gagal memuat data. Silakan coba lagi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate]);

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
        let csv = `Konsumsi Produk - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Nama,QTY,SKU,Kode Barang,Avg Cost Price,Total Biaya\n';
        allData.forEach(d => {
            csv += `${d.nama},${d.qty},${d.sku},${d.kodeBarang},${d.avgCostPrice},${d.totalBiaya}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `konsumsi_produk.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Konsumsi Produk - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1"><tr><th>Nama</th><th>QTY</th><th>SKU</th><th>Kode Barang</th><th>Avg Cost Price</th><th>Total Biaya</th></tr>`;
        allData.forEach(d => {
            html += `<tr><td>${d.nama}</td><td>${d.qty}</td><td>${d.sku}</td><td>${d.kodeBarang}</td><td style="text-align:right">${formatCurrency(d.avgCostPrice)}</td><td style="text-align:right">${formatCurrency(d.totalBiaya)}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `konsumsi_produk.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Konsumsi Produk</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
        </head><body>
        <h2>Konsumsi Produk - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <table><thead><tr><th>Nama</th><th>QTY</th><th>SKU</th><th>Kode Barang</th><th style="text-align:right">Avg Cost</th><th style="text-align:right">Total</th></tr></thead><tbody>
        ${allData.map(d => `<tr><td>${d.nama}</td><td>${d.qty}</td><td>${d.sku}</td><td>${d.kodeBarang}</td><td style="text-align:right">${formatCurrency(d.avgCostPrice)}</td><td style="text-align:right">${formatCurrency(d.totalBiaya)}</td></tr>`).join('')}
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
                <h1 className="text-xl font-bold text-gray-800">Konsumsi produk</h1>
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

                <div className="ml-auto">
                    <ExportDropdown onExportCSV={exportToCSV} onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-medium text-gray-700 mb-2">Summary</h3>
                {loading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-cyan-500" size={24} /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Jenis Produk</p>
                            <p className="text-lg font-bold text-gray-800">{summary.totalItems}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Qty Konsumsi</p>
                            <p className="text-lg font-bold text-gray-800">{summary.totalQty}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Biaya</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalBiaya)}</p>
                        </div>
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
                                <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Nama</th>
                                        <th className="px-6 py-3 text-center">QTY</th>
                                        <th className="px-6 py-3 text-left">SKU</th>
                                        <th className="px-6 py-3 text-left">Kode Barang</th>
                                        <th className="px-6 py-3 text-right">Avg Cost Price</th>
                                        <th className="px-6 py-3 text-right">Total Biaya</th>
                                        <th className="px-6 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                                    ) : (
                                        paginatedData.map(d => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-900">{d.nama}</td>
                                                <td className="px-6 py-3 text-center">{d.qty}</td>
                                                <td className="px-6 py-3">{d.sku}</td>
                                                <td className="px-6 py-3">{d.kodeBarang}</td>
                                                <td className="px-6 py-3 text-right">{formatCurrency(d.avgCostPrice)}</td>
                                                <td className="px-6 py-3 text-right font-medium text-green-600">{formatCurrency(d.totalBiaya)}</td>
                                                <td className="px-6 py-3 text-center">
                                                    <button
                                                        onClick={() => navigate(`/reports/konsumsi-produk/${d.id}`)}
                                                        className="text-cyan-600 hover:text-cyan-800 text-xs font-medium"
                                                    >
                                                        Detail
                                                    </button>
                                                </td>
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
                    </>
                )}
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
