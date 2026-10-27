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

interface AgendaDetail {
    id: number;
    service: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    invoiceRef: string;
    invoiceDate: string;
    lastPaymentDate: string;
    amount: number;
    status: string;
    createdAt: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function DetailAgendaPage() {
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
    const [allData, setAllData] = useState<AgendaDetail[]>([]);
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

                const res = await api.getAgendaDetail(params);
                setAllData(res.data || []);
            } catch (err) {
                console.error("Error fetching detail agenda:", err);
                setError("Gagal memuat detail agenda.");
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
                <h1 className="text-xl font-bold text-gray-800">Detail Agenda</h1>
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

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1"><ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Mulai <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Berakhir <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Harga <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Faktur <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal Faktur <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Pembayaran Terakhir <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Jumlah <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Status <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Dibuat Pada <ArrowUpDown size={12} /></div></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={11} className="px-6 py-8 text-center"><Loader2 className="animate-spin inline mr-2" />Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={11} className="px-6 py-8 text-center text-red-500">{error}</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 text-gray-600">{d.service}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.date}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.startTime}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.endTime}</td>
                                        <td className="px-4 py-4 text-right font-medium text-gray-900">{formatCurrency(d.price)}</td>
                                        <td className="px-4 py-4 text-cyan-600 hover:underline cursor-pointer">{d.invoiceRef}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.invoiceDate}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.lastPaymentDate}</td>
                                        <td className="px-4 py-4 text-right font-medium text-gray-900">{formatCurrency(d.amount)}</td>
                                        <td className="px-4 py-4 text-gray-600">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                ${d.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    d.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'}`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-gray-600">{d.createdAt}</td>
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
