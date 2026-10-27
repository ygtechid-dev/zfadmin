import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface ServiceSummary {
    service: string;
    agenda: number;
    total: number;
}

interface StaffSummary {
    staff: string;
    agendaCount: number;
    totalAmount: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function KalkulasiAgendaPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    // Data States
    const [serviceData, setServiceData] = useState<ServiceSummary[]>([]);
    const [staffData, setStaffData] = useState<StaffSummary[]>([]);
    const [summary, setSummary] = useState({ totalAgenda: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination States
    const [pageService, setPageService] = useState(1);
    const [limitService, setLimitService] = useState(10);
    const [pageStaff, setPageStaff] = useState(1);
    const [limitStaff, setLimitStaff] = useState(10);

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

                const res = await api.getAgendaKalkulasi(params);
                setServiceData(res.byService || []);
                setStaffData(res.byStaff || []);
                setSummary(res.summary || { totalAgenda: 0, totalRevenue: 0 });
            } catch (err) {
                console.error("Error fetching agenda calculation:", err);
                setError("Gagal memuat format kalkulasi agenda.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate, selectedBranchId]);


    // Define paginated slices locally
    const paginatedService = serviceData.slice((pageService - 1) * limitService, pageService * limitService);
    const paginatedStaff = staffData.slice((pageStaff - 1) * limitStaff, pageStaff * limitStaff);

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start);
        setEndDate(end);
        setQuickOption(option);
        setPageService(1);
        setPageStaff(1);
    };

    const handleBranchChange = (branchId: number | null) => {
        setSelectedBranchId(branchId);
        setPageService(1);
        setPageStaff(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Kalkulasi agenda</h1>
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
                    <ExportDropdown
                        onExportCSV={() => alert("Export CSV")}
                        onExportExcel={() => alert("Export Excel")}
                        onExportPDF={() => alert("Export PDF")}
                    />
                </div>
            </div>

            {/* Summary Box */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Summary</h3>
                <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-50 bg-gray-50/50 px-2 rounded">
                        <span className="font-medium text-gray-700">Jumlah</span>
                        <span className="font-bold text-gray-900">{loading ? '...' : formatCurrency(summary.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50 px-2">
                        <span className="font-medium text-gray-700">Agenda</span>
                        <span className="font-medium text-gray-900">{loading ? '...' : summary.totalAgenda}</span>
                    </div>
                </div>
            </div>

            {/* Agenda berdasarkan layanan */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-medium text-gray-700">Agenda berdasarkan layanan</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left">Service</th>
                                <th className="px-6 py-3 text-right">Agenda</th>
                                <th className="px-6 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center"><Loader2 className="animate-spin inline mr-2" />Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-red-500">{error}</td></tr>
                            ) : paginatedService.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedService.map((d, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{d.service}</td>
                                        <td className="px-6 py-4 text-right text-gray-600">{d.agenda}</td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(d.total)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && !error && (
                    <Pagination
                        currentPage={pageService}
                        totalItems={serviceData.length}
                        itemsPerPage={limitService}
                        onPageChange={setPageService}
                        onItemsPerPageChange={setLimitService}
                    />
                )}
            </div>

            {/* Agenda berdasarkan staf */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-medium text-gray-700">Agenda berdasarkan staf</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left">Staff</th>
                                <th className="px-6 py-3 text-right">Agenda</th>
                                <th className="px-6 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center"><Loader2 className="animate-spin inline mr-2" />Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-red-500">{error}</td></tr>
                            ) : paginatedStaff.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedStaff.map((d, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{d.staff}</td>
                                        <td className="px-6 py-4 text-right text-gray-600">{d.agendaCount}</td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(d.totalAmount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && !error && (
                    <Pagination
                        currentPage={pageStaff}
                        totalItems={staffData.length}
                        itemsPerPage={limitStaff}
                        onPageChange={setPageStaff}
                        onItemsPerPageChange={setLimitStaff}
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
