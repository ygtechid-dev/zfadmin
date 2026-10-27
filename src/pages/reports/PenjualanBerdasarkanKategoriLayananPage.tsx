import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface SalesByCategory {
    id: number;
    categoryName: string;
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

export default function PenjualanBerdasarkanKategoriLayananPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('this_month');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('this_month');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<SalesByCategory[]>([]);
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
                if (selectedBranchId) {
                    params.branch_id = selectedBranchId.toString();
                }

                const result = await api.getSalesByCategory(params);
                setAllData(result.data || []);
                setSummary(result.summary || {
                    totalSold: 0, gross: 0, discount: 0, salesDiscount: 0,
                    refund: 0, nett: 0, tax: 0, voucherUsage: 0, totalSales: 0
                });
            } catch (err) {
                console.error('Error fetching sales by category:', err);
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

    const handleBranchChange = (branchId: number | null) => {
        setSelectedBranchId(branchId);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/reports', { state: { tab: 'laporan' } })}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Penjualan Berdasarkan Kategori Layanan</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4 shadow-sm">
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
                    <span>{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>
                <div className="ml-auto">
                    <ExportDropdown
                        onExportCSV={() => alert("Export CSV")}
                        onExportExcel={() => alert("Export Excel")}
                        onExportPDF={() => alert("Export PDF")}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4">Ringkasan Penjualan</h2>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin text-cyan-500" size={24} />
                            </div>
                        ) : (
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Jumlah Terjual</span>
                                    <span className="font-semibold text-gray-900">{summary.totalSold}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Total Kotor</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(summary.gross)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Total Diskon</span>
                                    <span className="font-semibold text-red-500">{formatCurrency(summary.discount)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Diskon Penjualan</span>
                                    <span className="font-semibold text-red-500">{formatCurrency(summary.salesDiscount)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Pengembalian</span>
                                    <span className="font-semibold text-orange-500">{formatCurrency(summary.refund)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Nett</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(summary.nett)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Pajak</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(summary.tax)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50 text-base">
                                    <span className="font-bold text-gray-800">Total Penjualan</span>
                                    <span className="font-bold text-cyan-600">{formatCurrency(summary.totalSales)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-600">Voucher</span>
                                    <span className="font-semibold text-purple-600">{formatCurrency(summary.voucherUsage)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="flex items-center justify-center py-24">
                                <Loader2 className="animate-spin text-cyan-500" size={32} />
                                <span className="ml-3 text-gray-500 font-medium">Memuat data...</span>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center py-24 text-red-500 font-medium">
                                {error}
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-4 text-left">
                                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                                                        Kategori <ArrowUpDown size={12} />
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-right">Sold</th>
                                                <th className="px-6 py-4 text-right">Kotor</th>
                                                <th className="px-6 py-4 text-right">Diskon</th>
                                                <th className="px-6 py-4 text-right">Refund</th>
                                                <th className="px-6 py-4 text-right">Nett</th>
                                                <th className="px-6 py-4 text-right">Tax</th>
                                                <th className="px-6 py-4 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {paginatedData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-20 text-center text-gray-400">
                                                        Tidak ada data untuk periode ini
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedData.map((d) => (
                                                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 text-gray-900 font-medium">{d.categoryName}</td>
                                                        <td className="px-6 py-4 text-right text-gray-700 font-medium">{d.sold}</td>
                                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.gross)}</td>
                                                        <td className="px-6 py-4 text-right text-red-500">{formatCurrency(d.discount)}</td>
                                                        <td className="px-6 py-4 text-right text-orange-500">{formatCurrency(d.refund)}</td>
                                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(d.nett)}</td>
                                                        <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(d.tax)}</td>
                                                        <td className="px-6 py-4 text-right text-cyan-600 font-bold">{formatCurrency(d.totalSales)}</td>
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
                </div>
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
