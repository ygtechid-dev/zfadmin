import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import Pagination from '../../components/common/Pagination';
import { api } from '../../services/api';

interface VoucherBalance {
    id: number;
    location: string;
    type: string;
    code: string;
    name: string;
    expiryDate: string;
    status: string;
    total: number;
    used: number;
    remaining: number;
}

interface Summary {
    totalVouchers: number;
    totalValue: number;
    totalRemaining: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function SaldoVoucherTersisaPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<VoucherBalance[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalVouchers: 0, totalValue: 0, totalRemaining: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paginatedData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = allData.length;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params: Record<string, string> = {};
                if (searchTerm) params.search = searchTerm;

                const result = await api.getVoucherRemainingBalance(params);
                setAllData(result.data || []);
                setSummary(result.summary || { totalVouchers: 0, totalValue: 0, totalRemaining: 0 });
            } catch (err) {
                console.error('Error fetching voucher balance:', err);
                setError('Gagal memuat data. Silakan coba lagi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [searchTerm]);

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start);
        setEndDate(end);
        setQuickOption(option);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Saldo voucher tersisa</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
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

                <button
                    onClick={() => setShowDateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <Calendar size={16} className="text-gray-500" />
                    <span>{quickOption === '7_days' ? '7 hari sebelumnya, ' : ''}{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>

                <div className="ml-auto">
                    <ExportDropdown
                        onExportCSV={() => alert("Export CSV")}
                        onExportExcel={() => alert("Export Excel")}
                        onExportPDF={() => alert("Export PDF")}
                    />
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
                            <p className="text-xs text-gray-500 uppercase">Total Voucher</p>
                            <p className="text-lg font-bold text-gray-800">{summary.totalVouchers}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Nilai</p>
                            <p className="text-lg font-bold text-gray-800">{formatCurrency(summary.totalValue)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Tersisa</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalRemaining)}</p>
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
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Lokasi <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tipe <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Kode <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nama <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal Kadaluarsa <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Status <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Total <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Digunakan <ArrowUpDown size={12} /></div></th>
                                        <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Tersisa <ArrowUpDown size={12} /></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                                    ) : (
                                        paginatedData.map((d) => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 text-gray-600">{d.location}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.type}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.code}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.name}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.expiryDate}</td>
                                                <td className="px-4 py-4"><span className={`px-2 py-1 rounded text-xs ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.status}</span></td>
                                                <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.total)}</td>
                                                <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.used)}</td>
                                                <td className="px-4 py-4 text-right text-green-600 font-medium">{formatCurrency(d.remaining)}</td>
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
