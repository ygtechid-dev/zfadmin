import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface RingkasanKomisiStaff {
    id: number;
    nama: string;
    total: number;
    layanan: number;
    produk: number;
    voucher: number;
    kelas: number;
    planKelas: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function RingkasanKomisiStaffPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [filterByPaymentDate, setFilterByPaymentDate] = useState(true);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [groupBy, setGroupBy] = useState('Staff'); // 'Staff' or some other grouping

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data
    const [allData, setAllData] = useState<RingkasanKomisiStaff[]>([]);
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

                const result = await api.getStaffCommissionSummary(params);
                setAllData(result.data || []);
            } catch (err) {
                console.error('Error fetching commission summary:', err);
                setError('Gagal memuat ringkasan komisi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate, filterByPaymentDate]);

    // Client-side filtering/pagination
    const filteredData = useMemo(() => {
        let sorted = [...allData];
        if (selectedStaffId) {
            sorted = sorted.filter(d => d.id === selectedStaffId);
        }
        return sorted;
    }, [allData, selectedStaffId]);

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = filteredData.length;

    // Summary calculation (Recalculate based on filtered data if user filters by staff in UI)
    const totalNilaiKomisi = filteredData.reduce((acc, curr) => acc + curr.total, 0);
    const totalKomisiLayanan = filteredData.reduce((acc, curr) => acc + curr.layanan, 0);
    const totalKomisiProduk = filteredData.reduce((acc, curr) => acc + curr.produk, 0);

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
        let csv = `Ringkasan Komisi Staff\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Nama,Total,Layanan,Produk,Voucher,Kelas,Plan Kelas\n';
        filteredData.forEach(d => {
            csv += `"${d.nama}",${d.total},${d.layanan},${d.produk},${d.voucher},${d.kelas},${d.planKelas}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ringkasan_komisi_staff_${formatDateYMD(new Date())}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Ringkasan Komisi Staff</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1"><thead><tr><th>Nama</th><th>Total</th><th>Layanan</th><th>Produk</th><th>Voucher</th><th>Kelas</th><th>Plan Kelas</th></tr></thead><tbody>`;
        filteredData.forEach(d => {
            html += `<tr><td>${d.nama}</td><td>${formatCurrency(d.total)}</td><td>${formatCurrency(d.layanan)}</td><td>${formatCurrency(d.produk)}</td><td>${formatCurrency(d.voucher)}</td><td>${formatCurrency(d.kelas)}</td><td>${formatCurrency(d.planKelas)}</td></tr>`;
        });
        html += `</tbody></table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ringkasan_komisi_staff_${formatDateYMD(new Date())}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Ringkasan Komisi Staff</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f5f5f5}td:first-child,th:first-child{text-align:left}</style>
        </head><body>
        <h2>Ringkasan Komisi Staff</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <table><thead><tr><th>Nama</th><th>Total</th><th>Layanan</th><th>Produk</th><th>Voucher</th><th>Kelas</th><th>Plan Kelas</th></tr></thead><tbody>
        ${filteredData.map(d => `<tr><td>${d.nama}</td><td>${formatCurrency(d.total)}</td><td>${formatCurrency(d.layanan)}</td><td>${formatCurrency(d.produk)}</td><td>${formatCurrency(d.voucher)}</td><td>${formatCurrency(d.kelas)}</td><td>${formatCurrency(d.planKelas)}</td></tr>`).join('')}
        </tbody></table>
        <script>window.onload=function(){window.print()}</script></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Ringkasan komisi staff</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative inline-flex items-center">
                        <input
                            type="checkbox"
                            checked={filterByPaymentDate}
                            onChange={(e) => setFilterByPaymentDate(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-checked:bg-blue-500 rounded-full transition-colors"></div>
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <span className="text-sm text-gray-600">Berdasarkan tanggal pembayaran</span>
                </label>

                <SearchableSelect
                    value={selectedStaffId || ''}
                    onChange={(val) => setSelectedStaffId(val ? Number(val) : null)}
                    options={[
                        { value: '', label: 'Semua Staff' },
                        ...allData.map(s => ({ value: s.id, label: s.nama }))
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
                        onExportExcel={exportToExcel}
                        onExportPDF={exportToPDF}
                    />
                </div>
            </div>

            {/* Group By (Optional based on screenshot "Berdasarkan Staff") */}
            <div className="flex items-center gap-2">
                <SearchableSelect
                    value={groupBy}
                    onChange={(val) => setGroupBy(val.toString())}
                    options={[
                        { value: 'Staff', label: 'Berdasarkan Staff' }
                    ]}
                />
            </div>


            {/* Summary Box */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Summary</h3>
                <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-50 bg-gray-50/50 px-2 rounded">
                        <span className="font-medium text-gray-700">Total nilai komisi</span>
                        <span className="font-bold text-gray-900">{loading ? '...' : formatCurrency(totalNilaiKomisi)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50 px-2">
                        <span className="font-medium text-gray-700">Total Komisi Layanan</span>
                        <span className="font-medium text-gray-900">{loading ? '...' : formatCurrency(totalKomisiLayanan)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50 px-2">
                        <span className="font-medium text-gray-700">Total Komisi Produk</span>
                        <span className="font-medium text-gray-900">{loading ? '...' : formatCurrency(totalKomisiProduk)}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left">Nama</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-right">Layanan</th>
                                <th className="px-6 py-3 text-right">Produk</th>
                                <th className="px-6 py-3 text-right">Voucher</th>
                                <th className="px-6 py-3 text-right">Kelas</th>
                                <th className="px-6 py-3 text-right">Plan Kelas</th>
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
                                        <td className="px-6 py-4 font-medium text-gray-900">{d.nama}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(d.total)}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(d.layanan)}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(d.produk)}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(d.voucher)}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(d.kelas)}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(d.planKelas)}</td>
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
