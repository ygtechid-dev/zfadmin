import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Search, X, Phone, Mail, MapPin, User, Clock, ShoppingBag, Loader2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface CustomerList {
    id: number;
    customer: string;
    phone: string;
    email: string;
    gender: 'M' | 'F' | '-';
    added: string;           // tanggal daftar
    lastLocation: string;    // lokasi pendaftaran / cabang awal
    appointments: number;
    noShows: number;
    totalSales: number;
    outstanding: number;
    lastAppointment: string;
    blocked: number;
}

interface VisitHistory {
    id: number;
    date: string;
    service: string;
    therapist: string;
    location: string;
    total: number;
    status: string;
    invoice_no?: string;
}

interface CustomerDetail {
    visits: VisitHistory[];
    totalSales: number;
    totalVisits: number;
    lastVisit: string;
}

type SortField = 'customer' | 'added' | 'lastAppointment' | 'totalSales' | 'appointments';
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

export default function DaftarPelangganPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [sortField, setSortField] = useState<SortField>('added');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const [allData, setAllData] = useState<CustomerList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Detail modal
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerList | null>(null);
    const [detail, setDetail] = useState<CustomerDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.getCustomerList({
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate),
                });
                setAllData(res.data || []);
            } catch (err) {
                console.error('Error fetching customer list:', err);
                setError('Gagal memuat daftar pelanggan.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate]);

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const filtered = allData.filter(d => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return d.customer.toLowerCase().includes(q)
            || d.phone?.toLowerCase().includes(q)
            || d.email?.toLowerCase().includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
        let va: any = a[sortField] ?? '';
        let vb: any = b[sortField] ?? '';
        if (sortField === 'totalSales' || sortField === 'appointments') { va = Number(va); vb = Number(vb); }
        if (sortField === 'added' || sortField === 'lastAppointment') { va = new Date(va).getTime() || 0; vb = new Date(vb).getTime() || 0; }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const totalItems = sorted.length;
    const paginatedData = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start); setEndDate(end); setQuickOption(option); setCurrentPage(1);
    };

    // Buka modal detail pelanggan
    const handleOpenDetail = async (customer: CustomerList) => {
        setSelectedCustomer(customer);
        setDetail(null);
        setDetailLoading(true);
        try {
            // Coba ambil riwayat kunjungan dari API
            const res = await api.getCustomerVisitHistory(customer.id).catch(() => null);
            if (res) {
                setDetail({
                    visits: res.data || [],
                    totalSales: res.total_sales ?? customer.totalSales,
                    totalVisits: res.total_visits ?? customer.appointments,
                    lastVisit: res.last_visit ?? customer.lastAppointment,
                });
            } else {
                // Fallback dari data tabel kalau API belum ada
                setDetail({
                    visits: [],
                    totalSales: customer.totalSales,
                    totalVisits: customer.appointments,
                    lastVisit: customer.lastAppointment,
                });
            }
        } catch {
            setDetail({
                visits: [],
                totalSales: customer.totalSales,
                totalVisits: customer.appointments,
                lastVisit: customer.lastAppointment,
            });
        } finally {
            setDetailLoading(false);
        }
    };

    // ── EXPORT ──
    const exportToCSV = () => {
        let csv = `Daftar Pelanggan\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Nama,No HP,Email,Gender,Tanggal Daftar,Lokasi Daftar,Total Kunjungan,Total Sales\n';
        filtered.forEach(d => {
            csv += `"${d.customer}","${d.phone || '-'}","${d.email || '-'}","${d.gender}","${d.added}","${d.lastLocation}",${d.appointments},"${formatCurrency(d.totalSales)}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `daftar_pelanggan_${formatDateYMD(new Date())}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Daftar Pelanggan</h2><p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1" cellpadding="6"><thead><tr>
            <th>Nama</th><th>No HP</th><th>Email</th><th>Gender</th>
            <th>Tanggal Daftar</th><th>Lokasi Daftar</th>
            <th>Total Kunjungan</th><th style="text-align:right">Total Sales</th>
        </tr></thead><tbody>`;
        filtered.forEach(d => {
            html += `<tr>
                <td>${d.customer}</td><td>${d.phone || '-'}</td><td>${d.email || '-'}</td>
                <td>${d.gender}</td><td>${d.added}</td><td>${d.lastLocation}</td>
                <td style="text-align:center">${d.appointments}</td>
                <td style="text-align:right">${formatCurrency(d.totalSales)}</td>
            </tr>`;
        });
        html += `</tbody></table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `daftar_pelanggan_${formatDateYMD(new Date())}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const rows = filtered.map(d => `<tr>
            <td>${d.customer}</td><td>${d.phone || '-'}</td><td>${d.email || '-'}</td>
            <td>${d.gender}</td><td>${d.added}</td><td>${d.lastLocation}</td>
            <td style="text-align:center">${d.appointments}</td>
            <td style="text-align:right">${formatCurrency(d.totalSales)}</td>
        </tr>`).join('');
        const html = `<!DOCTYPE html><html><head><title>Daftar Pelanggan</title>
        <style>body{font-family:sans-serif;padding:20px;font-size:12px}
        h2{margin-bottom:4px}p{color:#666;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ddd;padding:7px 10px}
        th{background:#f5f5f5;font-weight:600}
        </style></head><body>
        <h2>Daftar Pelanggan</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <table><thead><tr>
            <th>Nama</th><th>No HP</th><th>Email</th><th>Gender</th>
            <th>Tgl Daftar</th><th>Lokasi Daftar</th><th>Kunjungan</th><th>Total Sales</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload=function(){window.print()}</script>
        </body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const thBtn = (field: SortField, label: string, align: 'left' | 'right' | 'center' = 'left') => (
        <button
            onClick={() => handleSort(field)}
            className={`flex items-center gap-0.5 hover:text-naqupos-primary transition-colors ${align === 'right' ? 'ml-auto' : ''}`}
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
                <h1 className="text-xl font-bold text-gray-800">Daftar Pelanggan</h1>
                {loading && <Loader2 size={16} className="animate-spin text-gray-400 ml-1" />}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari nama, HP, email..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-naqupos-primary"
                    />
                </div>
                <button
                    onClick={() => setShowDateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <Calendar size={16} className="text-gray-500" />
                    <span className="text-gray-600">
                        {quickOption === '7_days' ? '7 hari terakhir · ' : ''}{formatDateRangeDisplay(startDate, endDate)}
                    </span>
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
                                <th className="px-6 py-3 text-left">{thBtn('customer', 'Pelanggan')}</th>
                                <th className="px-6 py-3 text-left">No HP / Email</th>
                                <th className="px-6 py-3 text-left">Gender</th>
                                <th className="px-6 py-3 text-left">Lokasi Daftar</th>
                                <th className="px-6 py-3 text-left">{thBtn('added', 'Tgl Daftar')}</th>
                                <th className="px-6 py-3 text-left">{thBtn('lastAppointment', 'Kunjungan Terakhir')}</th>
                                <th className="px-6 py-3 text-center">{thBtn('appointments', 'Kunjungan', 'center')}</th>
                                <th className="px-6 py-3 text-right">{thBtn('totalSales', 'Total Sales', 'right')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                    <Loader2 className="animate-spin inline mr-2" size={16} />Memuat data...
                                </td></tr>
                            ) : error ? (
                                <tr><td colSpan={8} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">Tidak ada data pelanggan</td></tr>
                            ) : (
                                paginatedData.map((d) => (
                                    <tr
                                        key={d.id}
                                        onClick={() => handleOpenDetail(d)}
                                        className="hover:bg-naqupos-cream/40 cursor-pointer transition-colors group"
                                    >
                                        {/* Nama */}
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-naqupos-cream flex items-center justify-center shrink-0">
                                                    <User size={14} className="text-naqupos-primary" />
                                                </div>
                                                <span className="font-semibold text-gray-900 group-hover:text-naqupos-primary transition-colors">
                                                    {d.customer}
                                                </span>
                                            </div>
                                        </td>
                                        {/* HP / Email */}
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-1.5 text-gray-700 text-sm">
                                                <Phone size={12} className="text-gray-400 shrink-0" />
                                                {d.phone || '-'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-0.5">
                                                <Mail size={11} className="shrink-0" />
                                                {d.email || '-'}
                                            </div>
                                        </td>
                                        {/* Gender */}
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold
                                                ${d.gender === 'M' ? 'bg-blue-50 text-blue-600' :
                                                  d.gender === 'F' ? 'bg-pink-50 text-pink-600' :
                                                  'bg-gray-100 text-gray-500'}`}>
                                                {d.gender === 'M' ? 'Pria' : d.gender === 'F' ? 'Wanita' : '-'}
                                            </span>
                                        </td>
                                        {/* Lokasi Daftar */}
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                                                <MapPin size={12} className="text-gray-400 shrink-0" />
                                                {d.lastLocation || '-'}
                                            </div>
                                        </td>
                                        {/* Tgl Daftar */}
                                        <td className="px-6 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                                            {formatDate(d.added)}
                                        </td>
                                        {/* Kunjungan Terakhir */}
                                        <td className="px-6 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                                            {formatDate(d.lastAppointment)}
                                        </td>
                                        {/* Jumlah Kunjungan */}
                                        <td className="px-6 py-3.5 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                                                {d.appointments}
                                            </span>
                                        </td>
                                        {/* Total Sales */}
                                        <td className="px-6 py-3.5 text-right font-semibold text-gray-900">
                                            Rp {formatCurrency(d.totalSales)}
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

            {/* Detail Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-naqupos-cream flex items-center justify-center">
                                    <User size={18} className="text-naqupos-primary" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">{selectedCustomer.customer}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Detail Pelanggan</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {/* Info Dasar */}
                            <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b border-gray-100">
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone size={14} className="text-gray-400 shrink-0" />
                                    <span className="text-gray-700">{selectedCustomer.phone || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail size={14} className="text-gray-400 shrink-0" />
                                    <span className="text-gray-600">{selectedCustomer.email || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin size={14} className="text-gray-400 shrink-0" />
                                    <span className="text-gray-600">{selectedCustomer.lastLocation || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar size={14} className="text-gray-400 shrink-0" />
                                    <span className="text-gray-600">Daftar: {formatDate(selectedCustomer.added)}</span>
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b border-gray-100">
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 mb-1">Total Kunjungan</p>
                                    <p className="text-xl font-bold text-gray-900">{detail?.totalVisits ?? selectedCustomer.appointments}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 mb-1">Kunjungan Terakhir</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDate(detail?.lastVisit || selectedCustomer.lastAppointment)}</p>
                                </div>
                                <div className="bg-naqupos-cream rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 mb-1">Total Sales</p>
                                    <p className="text-sm font-bold text-naqupos-primary">
                                        Rp {formatCurrency(detail?.totalSales ?? selectedCustomer.totalSales)}
                                    </p>
                                </div>
                            </div>

                            {/* Riwayat Kunjungan */}
                            <div className="px-6 py-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Clock size={14} className="text-gray-400" />
                                    Riwayat Kunjungan
                                </h4>

                                {detailLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 size={20} className="animate-spin text-gray-400" />
                                    </div>
                                ) : !detail?.visits?.length ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        <ShoppingBag size={32} className="mx-auto mb-2 text-gray-200" />
                                        Belum ada riwayat kunjungan
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {detail.visits.map((v, idx) => (
                                            <div key={v.id || idx}
                                                className="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium text-gray-900">{v.service}</span>
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold
                                                            ${v.status === 'completed' ? 'bg-green-50 text-green-600' :
                                                              v.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                                                              'bg-gray-100 text-gray-500'}`}>
                                                            {v.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={10} />{formatDate(v.date)}
                                                        </span>
                                                        {v.therapist && <span>{v.therapist}</span>}
                                                        {v.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={10} />{v.location}
                                                            </span>
                                                        )}
                                                        {v.invoice_no && (
                                                            <span className="text-naqupos-primary font-medium">{v.invoice_no}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap ml-3">
                                                    Rp {formatCurrency(v.total)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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