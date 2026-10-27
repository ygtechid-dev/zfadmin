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
import { SearchableSelect } from '../../components/common/SearchableSelect';

interface CommissionItem {
    id: number;
    tipe: string; // 'Service' | 'Product'
    item: string;
    namaVariant: string;
    qty: number;
    totalPenjualan: number;
    persenKomisi: string;
    besaranKomisi: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function RincianKomisiGrupItemPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data
    const [allData, setAllData] = useState<CommissionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params: any = {
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate),
                    // filter_by_payment_date: true // Asumsi group item jg filter by date
                };
                if (selectedBranchId) params.branch_id = selectedBranchId;
                if (selectedCategory) params.category = selectedCategory;
                // if (selectedStaffId) params.staff_id = selectedStaffId; // Group by item biasanya agregat semua staff, tapi bisa juga per staff. Di Mockup "Rincian Komisi Staff (Grup ...)" jadi asumsi filter staff bisa berlaku.
                // API saya support staff_id di applyFilters.

                const result = await api.getStaffCommissionItemGroup(params);
                setAllData(result.data || []);
            } catch (err) {
                console.error('Error fetching commission item group:', err);
                setError('Gagal memuat rincian komisi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate, selectedCategory, selectedStaffId]);

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

    const exportToCSV = () => {
        let csv = `Rincian Komisi (Grup Item)\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Tipe,Item,Variant,Qty,Total Penjualan,Persen Komisi,Besaran Komisi\n';
        allData.forEach(d => {
            csv += `${d.tipe},${d.item},${d.namaVariant},${d.qty},${d.totalPenjualan},${d.persenKomisi},${d.besaranKomisi}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rincian_komisi_grup_item.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Rincian komisi staff (Grup berdasarkan item)</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <SearchableSelect
                    value={selectedCategory}
                    onChange={(val: string | number) => setSelectedCategory(val.toString())}
                    options={[
                        { value: '', label: 'Berdasarkan Semua' },
                        { value: 'Service', label: 'Berdasarkan Service' },
                        { value: 'Product', label: 'Berdasarkan Product' }
                    ]}
                />

                <SearchableSelect
                    value={selectedStaffId || ''}
                    onChange={(val: string | number) => setSelectedStaffId(val ? Number(val) : null)}
                    options={[
                        { value: '', label: 'Semua Staff' },
                        { value: 1, label: 'Therapist 1' },
                        { value: 2, label: 'Therapist 2' }
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
                                <th className="px-6 py-3 text-left">Tipe</th>
                                <th className="px-6 py-3 text-left">Item</th>
                                <th className="px-6 py-3 text-left">Nama Variant</th>
                                <th className="px-6 py-3 text-center">Qty</th>
                                <th className="px-6 py-3 text-right">Total Penjualan</th>
                                <th className="px-6 py-3 text-center">Persen Komisi</th>
                                <th className="px-6 py-3 text-right">Besaran Komisi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center"><Loader2 className="animate-spin inline mr-2" size={20} />Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-red-500">{error}</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">{d.tipe}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{d.item}</td>
                                        <td className="px-6 py-4 text-gray-600">{d.namaVariant}</td>
                                        <td className="px-6 py-4 text-center">{d.qty}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(d.totalPenjualan)}</td>
                                        <td className="px-6 py-4 text-center">{d.persenKomisi}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(d.besaranKomisi)}</td>
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
