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

interface StockCalculation {
    id: number;
    productName: string;
    sku: string;
    kodeBarang: string;
    brandName: string;
    category: string;
    pemasok: string;
    startStock: number;
    diterima: number;
}

interface Summary {
    totalProducts: number;
    totalStartStock: number;
    totalReceived: number;
}

export default function KalkulasiPergerakanStokPage() {
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

    const [allData, setAllData] = useState<StockCalculation[]>([]);
    const [summary, setSummary] = useState<Summary>({
        totalProducts: 0, totalStartStock: 0, totalReceived: 0
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

                const result = await api.getStockCalculation(params);
                setAllData(result.data || []);
                setSummary(result.summary || {
                    totalProducts: 0, totalStartStock: 0, totalReceived: 0
                });
            } catch (err) {
                console.error('Error fetching stock calculation:', err);
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
        let csv = `Kalkulasi Pergerakan Stok - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Product Name,SKU,Kode Barang,Brand,Category,Pemasok,Start Stock,Diterima\n';
        allData.forEach(d => {
            csv += `${d.productName},${d.sku},${d.kodeBarang},${d.brandName},${d.category},${d.pemasok},${d.startStock},${d.diterima}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `kalkulasi_pergerakan_stok.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Kalkulasi Pergerakan Stok - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1"><tr><th>Product Name</th><th>SKU</th><th>Kode Barang</th><th>Brand</th><th>Category</th><th>Pemasok</th><th>Start Stock</th><th>Diterima</th></tr>`;
        allData.forEach(d => {
            html += `<tr><td>${d.productName}</td><td>${d.sku}</td><td>${d.kodeBarang}</td><td>${d.brandName}</td><td>${d.category}</td><td>${d.pemasok}</td><td>${d.startStock}</td><td>${d.diterima}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `kalkulasi_pergerakan_stok.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Kalkulasi Pergerakan Stok</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ddd;padding:5px;text-align:left}th{background:#f5f5f5}</style>
        </head><body>
        <h2>Kalkulasi Pergerakan Stok - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <table><thead><tr><th>Product</th><th>SKU</th><th>Kode</th><th>Brand</th><th>Category</th><th>Pemasok</th><th>Start</th><th>Diterima</th></tr></thead><tbody>
        ${allData.map(d => `<tr><td>${d.productName}</td><td>${d.sku}</td><td>${d.kodeBarang}</td><td>${d.brandName}</td><td>${d.category}</td><td>${d.pemasok}</td><td>${d.startStock}</td><td>${d.diterima}</td></tr>`).join('')}
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
                <h1 className="text-xl font-bold text-gray-800">Kalkulasi pegerakan stok</h1>
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
                            <p className="text-xs text-gray-500 uppercase">Total Produk</p>
                            <p className="text-lg font-bold text-gray-800">{summary.totalProducts}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Stok Awal</p>
                            <p className="text-lg font-bold text-gray-800">{summary.totalStartStock}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Diterima</p>
                            <p className="text-lg font-bold text-green-600">+{summary.totalReceived}</p>
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
                                        <th className="px-6 py-3 text-left">Product Name</th>
                                        <th className="px-6 py-3 text-left">SKU (Stock Keeping Unit)</th>
                                        <th className="px-6 py-3 text-left">Kode Barang</th>
                                        <th className="px-6 py-3 text-left">Brand Name</th>
                                        <th className="px-6 py-3 text-left">Category</th>
                                        <th className="px-6 py-3 text-left">Pemasok</th>
                                        <th className="px-6 py-3 text-center">Start Stock</th>
                                        <th className="px-6 py-3 text-center">Diterima</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                                    ) : (
                                        paginatedData.map(d => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-900">{d.productName}</td>
                                                <td className="px-6 py-3">{d.sku}</td>
                                                <td className="px-6 py-3">{d.kodeBarang}</td>
                                                <td className="px-6 py-3">{d.brandName}</td>
                                                <td className="px-6 py-3">{d.category}</td>
                                                <td className="px-6 py-3">{d.pemasok}</td>
                                                <td className="px-6 py-3 text-center">{d.startStock}</td>
                                                <td className="px-6 py-3 text-center text-green-600 font-medium">+{d.diterima}</td>
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
