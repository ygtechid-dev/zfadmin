import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface VoucherUsage {
    id: number;
    customer: string;
    location: string;
    type: string;
    code: string;
    name: string;
    expiryDate: string;
    status: string;
    usageTime: string;
    used: number;
    remaining: number;
}

interface Summary {
    totalUsages: number;
    totalDiscountGiven: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function PenggunaanVoucherPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<VoucherUsage[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalUsages: 0, totalDiscountGiven: 0 });
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
                if (searchTerm) params.search = searchTerm;

                const result = await api.getVoucherUsage(params);
                setAllData(result.data || []);
                setSummary(result.summary || { totalUsages: 0, totalDiscountGiven: 0 });
            } catch (err) {
                console.error('Error fetching voucher usage:', err);
                setError('Gagal memuat data. Silakan coba lagi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate, searchTerm]);

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
                <h1 className="text-xl font-bold text-gray-800">Penggunaan voucher</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector selectedBranchId={selectedBranchId} onBranchChange={handleBranchChange} showAllOption={true} />

                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-64">
                    <input
                        type="text"
                        placeholder="Search by customer"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-600"
                    />
                    <Search size={16} className="text-gray-400" />
                </div>

                <button onClick={() => setShowDateModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Calendar size={16} className="text-gray-500" />
                    <span>{quickOption === '7_days' ? '7 hari sebelumnya, ' : ''}{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>

                <div className="ml-auto">
                    <ExportDropdown onExportCSV={() => alert("Export CSV")} onExportExcel={() => alert("Export Excel")} onExportPDF={() => alert("Export PDF")} />
                </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-medium text-gray-700 mb-2">Summary</h3>
                {loading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-cyan-500" size={24} /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Penggunaan</p>
                            <p className="text-lg font-bold text-gray-800">{summary.totalUsages}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Diskon Diberikan</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalDiscountGiven)}</p>
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
                                <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1">Pelanggan <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1">Lokasi <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1">Tipe <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1">Kode <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1">Nama <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1">Kadaluarsa <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1">Status <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1">Waktu <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">Digunakan <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">Tersisa <ArrowUpDown size={12} /></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                                    ) : (
                                        paginatedData.map((d) => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 font-medium text-gray-900">{d.customer}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.location}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.type}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.code}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.name}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.expiryDate}</td>
                                                <td className="px-4 py-4"><span className={`px-2 py-1 rounded text-xs ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.status}</span></td>
                                                <td className="px-4 py-4 text-gray-600">{d.usageTime}</td>
                                                <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.used)}</td>
                                                <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.remaining)}</td>
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
