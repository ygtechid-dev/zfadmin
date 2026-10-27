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

interface SalesPerMonth {
    id: number;
    month: string;
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

export default function PenjualanPerBulanPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('this_year');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('this_year');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);

    const [allData, setAllData] = useState<SalesPerMonth[]>([]);
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

                const result = await api.getSalesPerMonth(params);
                setAllData(result.data || []);
                setSummary(result.summary || {
                    totalSold: 0, gross: 0, discount: 0, salesDiscount: 0,
                    refund: 0, nett: 0, tax: 0, voucherUsage: 0, totalSales: 0
                });
            } catch (err) {
                console.error('Error fetching sales per month:', err);
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
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Penjualan per bulan</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector selectedBranchId={selectedBranchId} onBranchChange={handleBranchChange} showAllOption={true} />
                <button onClick={() => setShowDateModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Calendar size={16} className="text-gray-500" />
                    <span>{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>
                <div className="ml-auto">
                    <ExportDropdown onExportCSV={() => alert("Export CSV")} onExportExcel={() => alert("Export Excel")} onExportPDF={() => alert("Export PDF")} />
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
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Bulan <ArrowUpDown size={12} /></div></th>
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
                                    ) : (
                                        paginatedData.map((d) => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-gray-900 font-medium">{d.month}</td>
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
                                        ))
                                    )}
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
