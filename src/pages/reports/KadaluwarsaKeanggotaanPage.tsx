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
import { SearchableSelect } from '../../components/common/SearchableSelect';

interface MembershipExpiry {
    id: number;
    customer: string;
    phone: string;
    membership: string;
    invoiceNo: string;
    invoiceDate: string;
    expiryDate: string;
    status: string;
}

interface Summary {
    totalMemberships: number;
    expiredCount: number;
    activeCount: number;
}

export default function KadaluwarsaKeanggotaanPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<MembershipExpiry[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalMemberships: 0, expiredCount: 0, activeCount: 0 });
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
                if (statusFilter) params.status = statusFilter;

                const result = await api.getVoucherMembershipExpiry(params);
                setAllData(result.data || []);
                setSummary(result.summary || { totalMemberships: 0, expiredCount: 0, activeCount: 0 });
            } catch (err) {
                console.error('Error fetching membership expiry:', err);
                setError('Gagal memuat data. Silakan coba lagi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate, statusFilter]);

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
                <h1 className="text-xl font-bold text-gray-800">Kadaluwarsa keanggotaan</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <SearchableSelect
                    value={statusFilter}
                    onChange={(val: string | number) => setStatusFilter(val.toString())}
                    options={[
                        { value: '', label: 'Semua Status' },
                        { value: 'active', label: 'Active' },
                        { value: 'expired', label: 'Expired' }
                    ]}
                />

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
                            <p className="text-xs text-gray-500 uppercase">Total Membership</p>
                            <p className="text-lg font-bold text-gray-800">{summary.totalMemberships}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Aktif</p>
                            <p className="text-lg font-bold text-green-600">{summary.activeCount}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Kadaluwarsa</p>
                            <p className="text-lg font-bold text-red-600">{summary.expiredCount}</p>
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
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Pelanggan <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nomor Ponsel <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Keanggotaan <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">No Faktur <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal Faktur <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal Kadaluarsa <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Status <ArrowUpDown size={12} /></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                                    ) : (
                                        paginatedData.map((d) => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-green-600">{d.customer}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.phone}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.membership}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.invoiceNo}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.invoiceDate}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.expiryDate}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {d.status}
                                                    </span>
                                                </td>
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
