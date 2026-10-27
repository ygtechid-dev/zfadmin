import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown, Loader2, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface RetentionLog {
    id: number;
    name: string;
    phone: string;
    email: string;
    lastAgenda: string;
    absentCount: number;    // hari absen / tidak balik
    staff: string;
    lastSale: number;
    totalSale: number;
    appointments: number;
    noShows: number;
}

type SortField = 'name' | 'lastAgenda' | 'absentCount' | 'lastSale' | 'totalSale' | 'appointments' | 'noShows';
type SortDir = 'asc' | 'desc';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatDate = (d: string) => {
    if (!d || d === '-') return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} className="text-gray-300 ml-0.5" />;
    return sortDir === 'asc'
        ? <ChevronUp size={12} className="text-naqupos-primary ml-0.5" />
        : <ChevronDown size={12} className="text-naqupos-primary ml-0.5" />;
};

export default function RetensiPelangganPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [staffFilter, setStaffFilter] = useState('');
    const [staffList, setStaffList] = useState<any[]>([]);

    const [sortField, setSortField] = useState<SortField>('absentCount');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<RetentionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getTherapists({ branch_id: selectedBranchId || undefined, limit: 100 })
            .then(res => setStaffList(Array.isArray(res) ? res : (res.data || [])))
            .catch(() => {});
    }, [selectedBranchId]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params: any = {
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate),
                };
                if (selectedBranchId) params.branch_id = selectedBranchId;
                if (staffFilter) params.staff_id = staffFilter;

                const res = await api.getCustomerRetention(params);
                setAllData(res.data || []);
            } catch (err) {
                console.error('Error fetching customer retention:', err);
                setError('Gagal memuat data retensi pelanggan.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate, selectedBranchId, staffFilter]);

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const filtered = useMemo(() => {
        return allData.filter(d => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            return d.name.toLowerCase().includes(q)
                || d.phone?.toLowerCase().includes(q)
                || d.email?.toLowerCase().includes(q);
        });
    }, [allData, searchTerm]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let va: any = a[sortField] ?? '';
            let vb: any = b[sortField] ?? '';
            if (['absentCount', 'lastSale', 'totalSale', 'appointments', 'noShows'].includes(sortField)) {
                va = Number(va); vb = Number(vb);
            }
            if (sortField === 'lastAgenda') {
                va = new Date(va).getTime() || 0;
                vb = new Date(vb).getTime() || 0;
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filtered, sortField, sortDir]);

    const totalItems = sorted.length;
    const paginatedData = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start); setEndDate(end); setQuickOption(option); setCurrentPage(1);
    };

    const handleBranchChange = (branchId: number | null) => {
        setSelectedBranchId(branchId); setCurrentPage(1);
    };

    // ── EXPORT ──
    const exportToCSV = () => {
        let csv = `Retensi Pelanggan\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Nama,No HP,Email,Agenda Terakhir,Hari Absen,Staff,Penjualan Terakhir,Total Penjualan,Total Kunjungan,No Shows\n';
        filtered.forEach(d => {
            csv += `"${d.name}","${d.phone || '-'}","${d.email || '-'}","${d.lastAgenda}",${d.absentCount},"${d.staff}","${formatCurrency(d.lastSale)}","${formatCurrency(d.totalSale)}",${d.appointments},${d.noShows}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `retensi_pelanggan_${formatDateYMD(new Date())}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Retensi Pelanggan</h2><p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1" cellpadding="6"><thead><tr>
            <th>Nama</th><th>No HP</th><th>Email</th>
            <th>Agenda Terakhir</th><th>Hari Absen</th><th>Staff</th>
            <th style="text-align:right">Penjualan Terakhir</th>
            <th style="text-align:right">Total Penjualan</th>
            <th style="text-align:center">Kunjungan</th>
            <th style="text-align:center">No Shows</th>
        </tr></thead><tbody>`;
        filtered.forEach(d => {
            html += `<tr>
                <td>${d.name}</td><td>${d.phone || '-'}</td><td>${d.email || '-'}</td>
                <td>${d.lastAgenda}</td><td style="text-align:center">${d.absentCount} hari</td>
                <td>${d.staff}</td>
                <td style="text-align:right">${formatCurrency(d.lastSale)}</td>
                <td style="text-align:right">${formatCurrency(d.totalSale)}</td>
                <td style="text-align:center">${d.appointments}</td>
                <td style="text-align:center">${d.noShows}</td>
            </tr>`;
        });
        html += `</tbody></table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `retensi_pelanggan_${formatDateYMD(new Date())}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const rows = filtered.map(d => `<tr>
            <td>${d.name}</td>
            <td>${d.phone || '-'}<br/><small style="color:#888">${d.email || ''}</small></td>
            <td>${formatDate(d.lastAgenda)}</td>
            <td style="text-align:center">${d.absentCount} hari</td>
            <td>${d.staff}</td>
            <td style="text-align:right">${formatCurrency(d.lastSale)}</td>
            <td style="text-align:right;font-weight:600">${formatCurrency(d.totalSale)}</td>
            <td style="text-align:center">${d.appointments}</td>
            <td style="text-align:center">${d.noShows}</td>
        </tr>`).join('');
        const html = `<!DOCTYPE html><html><head><title>Retensi Pelanggan</title>
        <style>
            body{font-family:sans-serif;padding:20px;font-size:11px}
            h2{margin-bottom:4px}p.meta{color:#666;margin-bottom:16px}
            table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #ddd;padding:6px 8px;vertical-align:top}
            th{background:#f5f5f5;font-weight:600;font-size:10px}
        </style></head><body>
        <h2>Retensi Pelanggan</h2>
        <p class="meta">Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <table><thead><tr>
            <th>Nama</th><th>Kontak</th><th>Agenda Terakhir</th>
            <th>Absen</th><th>Staff</th>
            <th>Penjualan Terakhir</th><th>Total Penjualan</th>
            <th>Kunjungan</th><th>No Shows</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload=function(){window.print()}</script>
        </body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const thBtn = (field: SortField, label: string, align: 'left' | 'right' | 'center' = 'left') => (
        <button
            onClick={() => handleSort(field)}
            className={`flex items-center gap-0.5 hover:text-naqupos-primary transition-colors whitespace-nowrap
                ${align === 'right' ? 'ml-auto' : align === 'center' ? 'mx-auto' : ''}`}
        >
            {label}
            <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Retensi Pelanggan</h1>
                {loading && <Loader2 size={16} className="animate-spin text-gray-400 ml-1" />}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-3">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <div className="w-[160px]">
                    <SearchableSelect
                        value={staffFilter}
                        onChange={(val) => { setStaffFilter(String(val)); setCurrentPage(1); }}
                        options={[
                            { value: '', label: 'Semua Staff' },
                            ...staffList.map(s => ({ value: String(s.id), label: s.name }))
                        ]}
                    />
                </div>

                <div className="relative min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari nama / HP / email..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-naqupos-primary"
                    />
                </div>

                <button
                    onClick={() => setShowDateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <Calendar size={16} className="text-gray-500" />
                    <span>{quickOption === '7_days' ? '7 hari terakhir · ' : ''}{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>

                <div className="ml-auto">
                    <ExportDropdown onExportCSV={exportToCSV} onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left">{thBtn('name', 'Nama')}</th>
                                <th className="px-6 py-3 text-left">Kontak</th>
                                <th className="px-6 py-3 text-left">{thBtn('lastAgenda', 'Agenda Terakhir')}</th>
                                <th className="px-6 py-3 text-center">{thBtn('absentCount', 'Absen', 'center')}</th>
                                <th className="px-6 py-3 text-left">Staff</th>
                                <th className="px-6 py-3 text-right">{thBtn('lastSale', 'Penjualan Terakhir', 'right')}</th>
                                <th className="px-6 py-3 text-right">{thBtn('totalSale', 'Total Penjualan', 'right')}</th>
                                <th className="px-6 py-3 text-center">{thBtn('appointments', 'Kunjungan', 'center')}</th>
                                <th className="px-6 py-3 text-center">{thBtn('noShows', 'No Shows', 'center')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                                    <Loader2 className="animate-spin inline mr-2" size={16} />Memuat data...
                                </td></tr>
                            ) : error ? (
                                <tr><td colSpan={9} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">Tidak ada data retensi</td></tr>
                            ) : (
                                paginatedData.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3.5 font-semibold text-gray-900">{d.name}</td>
                                        <td className="px-6 py-3.5">
                                            <div className="text-gray-700 text-sm">{d.phone || '-'}</div>
                                            <div className="text-xs text-gray-400">{d.email || '-'}</div>
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">{formatDate(d.lastAgenda)}</td>
                                        <td className="px-6 py-3.5 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                                                ${d.absentCount > 30 ? 'bg-red-50 text-red-600' :
                                                  d.absentCount > 14 ? 'bg-yellow-50 text-yellow-600' :
                                                  'bg-green-50 text-green-600'}`}>
                                                {d.absentCount} hari
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-600">{d.staff || '-'}</td>
                                        <td className="px-6 py-3.5 text-right text-gray-800">
                                            Rp {formatCurrency(d.lastSale)}
                                        </td>
                                        <td className="px-6 py-3.5 text-right font-semibold text-gray-900">
                                            Rp {formatCurrency(d.totalSale)}
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                                                {d.appointments ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold
                                                ${(d.noShows ?? 0) > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                                                {d.noShows ?? 0}
                                            </span>
                                        </td>
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