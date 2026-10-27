import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, ArrowUpDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface CancellationDetail {
    id: number;
    ref: string;
    customer: string;
    service: string;
    canceledDate: string;
    canceledBy: string;
    reason: string;
    price: number;
}

interface ReasonSummary {
    reason: string;
    count: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function PembatalanAgendaPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data States
    const [cancellationReasons, setCancellationReasons] = useState<ReasonSummary[]>([]);
    const [allData, setAllData] = useState<CancellationDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params: any = {
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate)
                };
                if (selectedBranchId) params.branch_id = selectedBranchId;

                const res = await api.getAgendaPembatalan(params);
                setCancellationReasons(res.reasons || []);
                setAllData(res.details || []);
            } catch (err) {
                console.error("Error fetching agenda cancellation:", err);
                setError("Gagal memuat data pembatalan agenda.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate, selectedBranchId]);

    const paginatedData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = allData.length;

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
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Pembatalan agenda</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[150px] outline-none">
                    <option value="">Semua Staff</option>
                </select>

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

            {/* Reasons Summary */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left">Alasan</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={2} className="px-6 py-4 text-center"><Loader2 className="animate-spin inline mr-2" />Loading...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={2} className="px-6 py-4 text-center text-red-500">{error}</td></tr>
                        ) : cancellationReasons.length === 0 ? (
                            <tr><td colSpan={2} className="px-6 py-4 text-center text-gray-400">No Data</td></tr>
                        ) : (
                            cancellationReasons.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-gray-700">{r.reason}</td>
                                    <td className="px-6 py-3 text-right text-gray-900 font-medium">{r.count}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Ref <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Customer <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Service <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Canceled Date <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Canceled By <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Canceled Reason <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Price <ArrowUpDown size={12} /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center"><Loader2 className="animate-spin inline mr-2" />Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-red-500">{error}</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">{d.ref}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{d.customer}</td>
                                        <td className="px-6 py-4 text-gray-600">{d.service}</td>
                                        <td className="px-6 py-4 text-gray-600">{d.canceledDate}</td>
                                        <td className="px-6 py-4 text-gray-600">{d.canceledBy}</td>
                                        <td className="px-6 py-4 text-gray-600">{d.reason}</td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(d.price)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && !error && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
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
