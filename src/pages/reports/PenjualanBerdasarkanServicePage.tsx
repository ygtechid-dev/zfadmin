import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Calendar, ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface SalesByService {
    id: number;
    tipe: string;
    group: string;
    name: string;
    variantName: string;
    sold: number;
    kotor: number;
    discount: number;
    refund: number;
    nett: number;
    tax: number;
    salesDiscount: number;
    voucherUsage: number;
    totalSales: number;
    hargaModal: number;
    profit: number;
}

interface Summary {
    totalSold: number;
    gross: number;
    discount: number;
    salesDiscount: number;
    refund: number;
    nett: number;
    tax: number;
    totalSales: number;
    hargaModal: number;
    profit: number;
    voucherUsage: number;
}

type SortKey = keyof SalesByService;
type SortDir = 'asc' | 'desc' | null;

const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active || !dir) return <ChevronsUpDown size={12} className="text-gray-300" />;
    return dir === 'asc'
        ? <ChevronUp size={12} className="text-cyan-600" />
        : <ChevronDown size={12} className="text-cyan-600" />;
};

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
    { key: 'tipe', label: 'Tipe' },
    { key: 'group', label: 'Group' },
    { key: 'name', label: 'Nama' },
    { key: 'variantName', label: 'Nama Variant' },
    { key: 'sold', label: 'Sold', right: true },
    { key: 'kotor', label: 'Kotor', right: true },
    { key: 'discount', label: 'Diskon', right: true },
    { key: 'refund', label: 'Pengembalian', right: true },
    { key: 'nett', label: 'Nett', right: true },
    { key: 'tax', label: 'Tax', right: true },
    { key: 'salesDiscount', label: 'Diskon Penjualan', right: true },
    { key: 'voucherUsage', label: 'Penggunaan Voucher', right: true },
    { key: 'totalSales', label: 'Total Penjualan', right: true },
    { key: 'hargaModal', label: 'Harga Modal', right: true },
    { key: 'profit', label: 'Profit', right: true },
];

export default function PenjualanBerdasarkanServicePage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<SalesByService[]>([]);
    const [summary, setSummary] = useState<Summary>({
        totalSold: 0, gross: 0, discount: 0, salesDiscount: 0,
        refund: 0, nett: 0, tax: 0, totalSales: 0, hargaModal: 0, profit: 0, voucherUsage: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [sortKey, setSortKey] = useState<SortKey>('kotor');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    useEffect(() => {
        api.getTherapists(selectedBranchId ? { branch_id: selectedBranchId } : undefined)
            .then((res: any) => {
                const list = Array.isArray(res) ? res : (res.data || []);
                setStaffList(list.map((t: any) => ({ id: t.id, name: t.name })));
            })
            .catch(() => setStaffList([]));
    }, [selectedBranchId]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = {
                date_from: formatDateYMD(startDate),
                date_to: formatDateYMD(endDate),
            };
            if (selectedBranchId) params.branch_id = selectedBranchId.toString();
            if (selectedStaffId) params.staff_id = selectedStaffId;

            const result = await api.getSalesByService(params);
            setAllData(result.data || []);
            setSummary(result.summary || {
                totalSold: 0, gross: 0, discount: 0, salesDiscount: 0,
                refund: 0, nett: 0, tax: 0, totalSales: 0, hargaModal: 0, profit: 0, voucherUsage: 0
            });
        } catch (err) {
            console.error('Error fetching sales by service:', err);
            setError('Gagal memuat data. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId, selectedStaffId, startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const sorted = [...allData].sort((a, b) => {
        if (!sortKey || !sortDir) return 0;
        const av = a[sortKey], bv = b[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') {
            return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
    });

    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
        setCurrentPage(1);
    };

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start); setEndDate(end); setQuickOption(option); setCurrentPage(1);
    };

    const handleBranchChange = (branchId: number | null, branchName: string) => {
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
        setCurrentPage(1);
    };

    const selectedStaffName = staffList.find(s => s.id.toString() === selectedStaffId)?.name || 'Semua Staff';

    const exportCSV = () => {
        let csv = `Penjualan Berdasarkan Servis - ${selectedBranchName}\n`;
        csv += `Periode: ${formatDateRangeDisplay(startDate, endDate)}\n`;
        csv += `Staff: ${selectedStaffName}\n\n`;
        csv += COLUMNS.map(c => c.label).join(',') + '\n';
        sorted.forEach(d => {
            csv += [
                d.tipe, `"${d.group}"`, `"${d.name}"`, `"${d.variantName}"`,
                d.sold, d.kotor, d.discount, d.refund, d.nett, d.tax,
                d.salesDiscount, d.voucherUsage, d.totalSales, d.hargaModal, d.profit
            ].join(',') + '\n';
        });
        csv += `\nTOTAL (${sorted.length} baris),,,,${summary.totalSold},${summary.gross},${summary.discount},${summary.refund},${summary.nett},${summary.tax},${summary.salesDiscount},${summary.voucherUsage},${summary.totalSales},${summary.hargaModal},${summary.profit}\n`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `penjualan_berdasarkan_servis_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
        a.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Penjualan Berdasarkan Servis - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<p>Staff: ${selectedStaffName}</p>`;
        html += `<h3>Summary</h3>`;
        html += `<table border="1">
            <tr><td><strong>Terjual</strong></td><td style="text-align:center">${summary.totalSold}</td></tr>
            <tr><td><strong>Kotor</strong></td><td style="text-align:right">${fmt(summary.gross)}</td></tr>
            <tr><td><strong>Diskon</strong></td><td style="text-align:right">${fmt(summary.discount)}</td></tr>
            <tr><td><strong>Pengembalian</strong></td><td style="text-align:right">${fmt(summary.refund)}</td></tr>
            <tr><td><strong>Nett</strong></td><td style="text-align:right">${fmt(summary.nett)}</td></tr>
            <tr><td><strong>Tax</strong></td><td style="text-align:right">${fmt(summary.tax)}</td></tr>
            <tr><td><strong>Diskon Penjualan</strong></td><td style="text-align:right">${fmt(summary.salesDiscount)}</td></tr>
            <tr><td><strong>Penggunaan Voucher</strong></td><td style="text-align:right">${fmt(summary.voucherUsage)}</td></tr>
            <tr><td><strong>Total Penjualan</strong></td><td style="text-align:right">${fmt(summary.totalSales)}</td></tr>
            <tr><td><strong>Harga Modal</strong></td><td style="text-align:right">${fmt(summary.hargaModal)}</td></tr>
            <tr><td><strong>Profit</strong></td><td style="text-align:right">${fmt(summary.profit)}</td></tr>
        </table>`;
        html += `<br/><h3>Detail (${sorted.length} baris)</h3>`;
        html += `<table border="1"><tr>${COLUMNS.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
        sorted.forEach(d => {
            html += `<tr>
                <td>${d.tipe}</td>
                <td>${d.group}</td>
                <td>${d.name}</td>
                <td>${d.variantName}</td>
                <td style="text-align:center">${d.sold}</td>
                <td style="text-align:right">${fmt(d.kotor)}</td>
                <td style="text-align:right">${fmt(d.discount)}</td>
                <td style="text-align:right">${fmt(d.refund)}</td>
                <td style="text-align:right">${fmt(d.nett)}</td>
                <td style="text-align:right">${fmt(d.tax)}</td>
                <td style="text-align:right">${fmt(d.salesDiscount)}</td>
                <td style="text-align:right">${fmt(d.voucherUsage)}</td>
                <td style="text-align:right">${fmt(d.totalSales)}</td>
                <td style="text-align:right">${fmt(d.hargaModal)}</td>
                <td style="text-align:right">${fmt(d.profit)}</td>
            </tr>`;
        });
        html += `<tr style="font-weight:bold;background:#f5f5f5">
            <td colspan="4">TOTAL (${sorted.length} baris)</td>
            <td style="text-align:center">${summary.totalSold}</td>
            <td style="text-align:right">${fmt(summary.gross)}</td>
            <td style="text-align:right">${fmt(summary.discount)}</td>
            <td style="text-align:right">${fmt(summary.refund)}</td>
            <td style="text-align:right">${fmt(summary.nett)}</td>
            <td style="text-align:right">${fmt(summary.tax)}</td>
            <td style="text-align:right">${fmt(summary.salesDiscount)}</td>
            <td style="text-align:right">${fmt(summary.voucherUsage)}</td>
            <td style="text-align:right">${fmt(summary.totalSales)}</td>
            <td style="text-align:right">${fmt(summary.hargaModal)}</td>
            <td style="text-align:right">${fmt(summary.profit)}</td>
        </tr>`;
        html += `</table></body></html>`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }));
        a.download = `penjualan_berdasarkan_servis_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
        a.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Penjualan Berdasarkan Servis</title>
        <style>
            body{font-family:sans-serif;padding:20px;font-size:11px}
            h3{margin:16px 0 8px}
            table{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:16px}
            th,td{border:1px solid #ddd;padding:4px 5px}
            th{background:#f5f5f5;text-align:center;font-weight:600}
            .right{text-align:right} .center{text-align:center}
            .total-row{font-weight:bold;background:#f5f5f5}
            .summary-table td:first-child{font-weight:600;width:180px}
            .summary-table td:last-child{text-align:right}
            .red{color:#ef4444} .emerald{color:#059669} .purple{color:#9333ea}
        </style>
        </head><body>
        <h2>Penjualan Berdasarkan Servis - ${selectedBranchName}</h2>
        <p style="margin:2px 0">Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <p style="margin:2px 0">Staff: ${selectedStaffName}</p>

        <h3>Summary</h3>
        <table class="summary-table" style="width:300px">
            <tr><td>Terjual</td><td>${summary.totalSold}</td></tr>
            <tr><td>Kotor</td><td>${fmt(summary.gross)}</td></tr>
            <tr><td>Diskon</td><td>${fmt(summary.discount)}</td></tr>
            <tr><td>Pengembalian</td><td>${fmt(summary.refund)}</td></tr>
            <tr><td>Nett</td><td>${fmt(summary.nett)}</td></tr>
            <tr><td>Tax</td><td>${fmt(summary.tax)}</td></tr>
            <tr><td>Diskon Penjualan</td><td>${fmt(summary.salesDiscount)}</td></tr>
            <tr><td>Penggunaan Voucher</td><td>${fmt(summary.voucherUsage)}</td></tr>
            <tr><td>Total Penjualan</td><td>${fmt(summary.totalSales)}</td></tr>
            <tr><td>Harga Modal</td><td>${fmt(summary.hargaModal)}</td></tr>
            <tr><td><strong>Profit</strong></td><td class="${summary.profit >= 0 ? 'emerald' : 'red'}"><strong>${fmt(summary.profit)}</strong></td></tr>
        </table>

        <h3>Detail (${sorted.length} baris)</h3>
        <table>
            <thead><tr>${COLUMNS.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
            <tbody>
                ${sorted.map(d => `<tr>
                    <td><strong>${d.tipe}</strong></td>
                    <td>${d.group}</td>
                    <td>${d.name}</td>
                    <td>${d.variantName !== '-' ? d.variantName : '—'}</td>
                    <td class="center">${d.sold}</td>
                    <td class="right">${fmt(d.kotor)}</td>
                    <td class="right red">${d.discount > 0 ? `-${fmt(d.discount)}` : fmt(d.discount)}</td>
                    <td class="right red">${d.refund > 0 ? `-${fmt(d.refund)}` : fmt(d.refund)}</td>
                    <td class="right">${fmt(d.nett)}</td>
                    <td class="right">${fmt(d.tax)}</td>
                    <td class="right red">${d.salesDiscount > 0 ? `-${fmt(d.salesDiscount)}` : fmt(d.salesDiscount)}</td>
                    <td class="right purple">${fmt(d.voucherUsage)}</td>
                    <td class="right"><strong>${fmt(d.totalSales)}</strong></td>
                    <td class="right">${fmt(d.hargaModal)}</td>
                    <td class="right ${d.profit >= 0 ? 'emerald' : 'red'}">${fmt(d.profit)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td colspan="4">TOTAL (${sorted.length} baris)</td>
                    <td class="center">${summary.totalSold}</td>
                    <td class="right">${fmt(summary.gross)}</td>
                    <td class="right red">${summary.discount > 0 ? `-${fmt(summary.discount)}` : fmt(summary.discount)}</td>
                    <td class="right red">${summary.refund > 0 ? `-${fmt(summary.refund)}` : fmt(summary.refund)}</td>
                    <td class="right">${fmt(summary.nett)}</td>
                    <td class="right">${fmt(summary.tax)}</td>
                    <td class="right red">${summary.salesDiscount > 0 ? `-${fmt(summary.salesDiscount)}` : fmt(summary.salesDiscount)}</td>
                    <td class="right purple">${fmt(summary.voucherUsage)}</td>
                    <td class="right">${fmt(summary.totalSales)}</td>
                    <td class="right">${fmt(summary.hargaModal)}</td>
                    <td class="right ${summary.profit >= 0 ? 'emerald' : 'red'}">${fmt(summary.profit)}</td>
                </tr>
            </tfoot>
        </table>
        <script>window.onload=function(){window.print()}</script>
        </body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const SUMMARY_CARDS = [
        { label: 'Terjual', value: summary.totalSold.toString() },
        { label: 'Kotor', value: fmt(summary.gross) },
        { label: 'Diskon', value: fmt(summary.discount) },
        { label: 'Pengembalian', value: fmt(summary.refund) },
        { label: 'Nett', value: fmt(summary.nett) },
        { label: 'Tax', value: fmt(summary.tax) },
        { label: 'Diskon Penjualan', value: fmt(summary.salesDiscount) },
        { label: 'Penggunaan Voucher', value: fmt(summary.voucherUsage) },
        { label: 'Total Penjualan', value: fmt(summary.totalSales), highlight: true },
        { label: 'Harga Modal', value: fmt(summary.hargaModal) },
        { label: 'Profit', value: fmt(summary.profit), green: summary.profit >= 0 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Penjualan Berdasarkan Servis</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Rincian penjualan per layanan dengan breakdown group, variant, dan finansial</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-3">
                <BranchSelector selectedBranchId={selectedBranchId} onBranchChange={handleBranchChange} showAllOption />
                <select
                    value={selectedStaffId}
                    onChange={e => { setSelectedStaffId(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[150px] outline-none focus:border-cyan-500"
                >
                    <option value="">Semua Staff</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={() => setShowDateModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Calendar size={16} className="text-gray-500" />
                    <span>{quickOption === '7_days' ? '7 hari sebelumnya, ' : ''}{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>
                <div className="ml-auto">
                    <ExportDropdown onExportCSV={exportCSV} onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                </div>
            </div>

            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {SUMMARY_CARDS.map(c => (
                        <div key={c.label} className={`rounded-xl border p-3 ${c.highlight ? 'bg-cyan-50 border-cyan-200' : c.green !== undefined ? (c.green ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200') : 'bg-white border-gray-100'}`}>
                            <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                            <p className={`text-sm font-bold ${c.highlight ? 'text-cyan-700' : c.green !== undefined ? (c.green ? 'text-emerald-700' : 'text-red-700') : 'text-gray-800'}`}>{c.value}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-cyan-500" size={32} />
                        <span className="ml-3 text-gray-500">Memuat data...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-16 text-red-500">{error}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        {COLUMNS.map(col => (
                                            <th key={col.key} className={`px-4 py-3 whitespace-nowrap ${col.right ? 'text-right' : 'text-left'}`} onClick={() => toggleSort(col.key)}>
                                                <div className={`flex items-center gap-1 cursor-pointer hover:text-gray-700 select-none ${col.right ? 'justify-end' : ''}`}>
                                                    {col.label}
                                                    <SortIcon active={sortKey === col.key} dir={sortKey === col.key ? sortDir : null} />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginated.length === 0 ? (
                                        <tr><td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-gray-400">Tidak ada data untuk periode ini</td></tr>
                                    ) : paginated.map(d => (
                                        <tr key={`${d.id}-${d.name}-${d.variantName}`} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-50 text-blue-600">{d.tipe}</span></td>
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{d.group}</td>
                                            <td className="px-4 py-3 text-gray-900 font-medium max-w-[180px] truncate" title={d.name}>{d.name}</td>
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                {d.variantName !== '-' ? <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{d.variantName}</span> : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-900">{d.sold}</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{fmt(d.kotor)}</td>
                                            <td className="px-4 py-3 text-right text-red-500">{d.discount > 0 ? `-${fmt(d.discount)}` : fmt(d.discount)}</td>
                                            <td className="px-4 py-3 text-right text-red-500">{d.refund > 0 ? `-${fmt(d.refund)}` : fmt(d.refund)}</td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(d.nett)}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">{fmt(d.tax)}</td>
                                            <td className="px-4 py-3 text-right text-red-500">{d.salesDiscount > 0 ? `-${fmt(d.salesDiscount)}` : fmt(d.salesDiscount)}</td>
                                            <td className="px-4 py-3 text-right text-purple-600">{fmt(d.voucherUsage)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(d.totalSales)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{fmt(d.hargaModal)}</td>
                                            <td className={`px-4 py-3 text-right font-medium ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(d.profit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {paginated.length > 0 && (
                                    <tfoot className="bg-gray-50 border-t-2 border-gray-200 text-xs font-bold">
                                        <tr>
                                            <td className="px-4 py-3 text-gray-600" colSpan={4}>TOTAL ({allData.length} baris)</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{summary.totalSold}</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{fmt(summary.gross)}</td>
                                            <td className="px-4 py-3 text-right text-red-500">{summary.discount > 0 ? `-${fmt(summary.discount)}` : fmt(summary.discount)}</td>
                                            <td className="px-4 py-3 text-right text-red-500">{summary.refund > 0 ? `-${fmt(summary.refund)}` : fmt(summary.refund)}</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{fmt(summary.nett)}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">{fmt(summary.tax)}</td>
                                            <td className="px-4 py-3 text-right text-red-500">{summary.salesDiscount > 0 ? `-${fmt(summary.salesDiscount)}` : fmt(summary.salesDiscount)}</td>
                                            <td className="px-4 py-3 text-right text-purple-600">{fmt(summary.voucherUsage)}</td>
                                            <td className="px-4 py-3 text-right text-cyan-700">{fmt(summary.totalSales)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{fmt(summary.hargaModal)}</td>
                                            <td className={`px-4 py-3 text-right ${summary.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(summary.profit)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalItems={allData.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
                    </>
                )}
            </div>

            <DateFilterModal isOpen={showDateModal} onClose={() => setShowDateModal(false)} onApply={handleDateApply} initialStartDate={startDate} initialEndDate={endDate} initialQuickOption={quickOption} />
        </div>
    );
}