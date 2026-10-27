import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface StaffTip {
    id: number;
    staffName: string;
    terkumpul: number;
    dikembalikan: number;
    total: number;
    rataRata: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function TipBerdasarkanStaffPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Naqupos Spa Solo');
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data
    const [allData, setAllData] = useState<StaffTip[]>([]);
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

                const result = await api.getStaffTips(params);
                setAllData(result.data || []);
            } catch (err) {
                console.error('Error fetching staff tips:', err);
                setError('Gagal memuat data tip.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate]);

    const filteredData = useMemo(() => {
        return selectedStaffId
            ? allData.filter(d => d.id === selectedStaffId)
            : allData;
    }, [allData, selectedStaffId]);

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = filteredData.length;

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
        let csv = `Tip Berdasarkan Staff - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Staff,Terkumpul,Dikembalikan,Total,Rata-Rata\n';
        filteredData.forEach(d => {
            csv += `${d.staffName},${d.terkumpul},${d.dikembalikan},${d.total},${d.rataRata}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `tip_berdasarkan_staff.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Tip berdasarkan staff</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <select
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[150px] outline-none focus:border-cyan-500"
                    onChange={(e) => {
                        setSelectedStaffId(e.target.value ? Number(e.target.value) : null);
                        setCurrentPage(1);
                    }}
                    value={selectedStaffId || ''}
                >
                    <option value="">Semua Staff</option>
                    {allData.map(s => (
                        <option key={s.id} value={s.id}>{s.staffName}</option>
                    ))}
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
                        onExportCSV={exportToCSV}
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
                                <th className="px-6 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                                        Staff <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">
                                        Terkumpul <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">
                                        Dikembalikan <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">
                                        Total <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">
                                        Rata-Rata <ArrowUpDown size={12} />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="animate-spin inline mr-2" size={20} />Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-red-500">{error}</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-gray-900">{d.staffName}</td>
                                        <td className="px-6 py-3 text-right">{formatCurrency(d.terkumpul)}</td>
                                        <td className="px-6 py-3 text-right">{formatCurrency(d.dikembalikan)}</td>
                                        <td className="px-6 py-3 text-right font-medium">{formatCurrency(d.total)}</td>
                                        <td className="px-6 py-3 text-right">{formatCurrency(d.rataRata)}</td>
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
