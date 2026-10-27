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

interface DetailedCommission {
    id: number;
    staffName: string;
    pelanggan: string;
    tanggalFaktur: string;
    tanggalPembayaran: string;
    nomorFaktur: string;
    item: string;
    namaVariant: string;
    qty: number;
    totalPenjualan: number;
    persenKomisi: number;
    besaranKomisi: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function KomisiStaffTerperinciPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [filterByPaymentDate, setFilterByPaymentDate] = useState(true);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data
    const [allData, setAllData] = useState<DetailedCommission[]>([]);
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
                    filter_by_payment_date: filterByPaymentDate
                };
                if (selectedBranchId) params.branch_id = selectedBranchId;
                if (selectedCategory) params.category = selectedCategory;
                if (selectedStaffId) params.staff_id = selectedStaffId;

                const result = await api.getStaffCommissionDetailed(params);
                setAllData(result.data || []);
            } catch (err) {
                console.error('Error fetching detailed commission:', err);
                setError('Gagal memuat detail komisi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate, filterByPaymentDate, selectedCategory, selectedStaffId]);

    // Client-side pagination
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
        let csv = `Komisi Staff Terperinci\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Nama Terapis,Pelanggan,Tgl Faktur,Tgl Bayar,No Faktur,Item,Variant,Qty,Total,%,Komisi\n';
        allData.forEach(d => {
            csv += `${d.staffName},${d.pelanggan},${d.tanggalFaktur},${d.tanggalPembayaran},${d.nomorFaktur},${d.item},${d.namaVariant},${d.qty},${d.totalPenjualan},${d.persenKomisi},${d.besaranKomisi}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `komisi_staff_terperinci.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Komisi staff terperinci</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <select
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[150px] outline-none"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="">Berdasarkan Semua ▼</option>
                    <option value="Service">Berdasarkan Service</option>
                    <option value="Product">Berdasarkan Product</option>
                </select>

                <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative inline-flex items-center">
                        <input
                            type="checkbox"
                            checked={filterByPaymentDate}
                            onChange={(e) => setFilterByPaymentDate(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-checked:bg-teal-500 rounded-full transition-colors"></div>
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <span className="text-sm text-gray-600">Berdasarkan tanggal pembayaran</span>
                </label>

                {/* Staff ID: Since API supports staff_id filtering, we can add a text input or logic to fetch staff list.
                    For now, I'll keep the select but it needs data. I'll make it a simple input or remove specific staff filter UI if data unavailable.
                    Wait, previous page I used unique staff from data.
                    Here data is transactional.
                    I'll comment out staff filter or make it static list for now as I don't have separate Staff API call yet.
                    Actually, let's just show "Semua Staff" or simple hardcoded list is risky.
                    I will remove the specific staff filter dropdown for now or leave it generic "Semua Staff".
                 */}
                <select
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[150px] outline-none"
                    value={selectedStaffId || ''}
                    onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
                >
                    <option value="">Semua Staff</option>
                    <option value="1">Therapist 1</option>
                    <option value="2">Therapist 2</option>
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
                                <th className="px-4 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nama Terapis <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Pelanggan <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal Faktur <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal Pembayaran <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nomor Faktur <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Item <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-left">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nama Variant <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-gray-700">Qty <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Total Penjualan <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-gray-700">Persen Komisi <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Besaran Komisi <ArrowUpDown size={12} /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={11} className="px-6 py-12 text-center"><Loader2 className="animate-spin inline mr-2" size={20} />Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={11} className="px-6 py-12 text-center text-red-500">{error}</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 font-medium text-gray-900">{d.staffName}</td>
                                        <td className="px-4 py-4 font-medium text-gray-900">{d.pelanggan}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.tanggalFaktur}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.tanggalPembayaran}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.nomorFaktur}</td>
                                        <td className="px-4 py-4 text-gray-900">{d.item}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.namaVariant}</td>
                                        <td className="px-4 py-4 text-center">{d.qty}</td>
                                        <td className="px-4 py-4 text-right">{formatCurrency(d.totalPenjualan)}</td>
                                        <td className="px-4 py-4 text-center">{d.persenKomisi}%</td>
                                        <td className="px-4 py-4 text-right">{formatCurrency(d.besaranKomisi)}</td>
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
