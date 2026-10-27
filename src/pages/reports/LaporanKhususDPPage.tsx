import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';
import { useBranchSync } from '../../hooks/useBranchSync';
// Install: npm install xlsx jspdf jspdf-autotable
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DPReport {
    id: number;
    invoiceNo: string;
    customer: string;
    date: string;
    dpAmount: number;
    totalAmount: number;
    remainingAmount: number;
    status: string;
    paymentMethod: string;
    staff: string;
    service: string;
    paymentType?: 'dp' | 'cash' | 'va';
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const detectPaymentType = (paymentMethod: string, dpAmount: number): 'dp' | 'cash' | 'va' => {
    const method = paymentMethod?.toLowerCase() || '';
    if (method.includes('virtual') || method.includes('va') ||
        method.includes('transfer') || method.includes('bca') ||
        method.includes('bni') || method.includes('bri') ||
        method.includes('mandiri')) return 'va';
    if (method.includes('cash') || method.includes('tunai')) return 'cash';
    if (dpAmount > 0) return 'dp';
    return 'cash';
};

type PaymentTab = 'all' | 'dp' | 'cash_va';

// ─── Export helpers ───────────────────────────────────────────────────────────

const getTabLabel = (tab: PaymentTab) =>
    tab === 'dp' ? 'Down Payment' : tab === 'cash_va' ? 'Sisa Pembayaran' : 'Semua Pembayaran';

const buildExportRows = (data: DPReport[], activeTab: PaymentTab) =>
    data.map((d) => {
        const base: Record<string, string | number> = {
            'No. Invoice': d.invoiceNo,
            'Pelanggan': d.customer,
            'Tanggal': d.date,
            'Layanan': d.service,
            'Total Transaksi': d.totalAmount,
            'Metode Pembayaran': d.paymentMethod,
            'Staff': d.staff,
            'Status': d.status,
        };
        if (activeTab === 'all' || activeTab === 'dp') {
            base['Jumlah DP'] = d.dpAmount;
            base['Sisa'] = d.remainingAmount;
        }
        if (activeTab === 'all') {
            base['Tipe'] = d.paymentType?.toUpperCase() ?? '-';
        }
        return base;
    });

const exportCSV = (data: DPReport[], activeTab: PaymentTab, label: string) => {
    const rows = buildExportRows(data, activeTab);
    if (!rows.length) return alert('Tidak ada data untuk di-export.');

    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map((r) =>
            headers.map((h) => {
                const val = String(r[h] ?? '');
                // wrap dengan quotes kalau ada koma atau newline
                return val.includes(',') || val.includes('\n') ? `"${val}"` : val;
            }).join(',')
        ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_DP_${label}_${formatDateYMD(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

const exportExcel = (data: DPReport[], activeTab: PaymentTab, label: string) => {
    const rows = buildExportRows(data, activeTab);
    if (!rows.length) return alert('Tidak ada data untuk di-export.');

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto column width
    const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
    XLSX.writeFile(wb, `Laporan_DP_${label}_${formatDateYMD(new Date())}.xlsx`);
};

const exportPDF = (data: DPReport[], activeTab: PaymentTab, label: string) => {
    if (!data.length) return alert('Tidak ada data untuk di-export.');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Laporan DP & Pembayaran — ${label}`, 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 22);
    doc.setTextColor(0);

    const showDP = activeTab === 'all' || activeTab === 'dp';
    const showTipe = activeTab === 'all';

    const head: string[][] = [[
        'No. Invoice', 'Pelanggan', 'Tanggal', 'Layanan',
        ...(showDP ? ['Jumlah DP'] : []),
        'Total Transaksi',
        ...(showDP ? ['Sisa'] : []),
        'Metode', 'Staff', 'Status',
        ...(showTipe ? ['Tipe'] : []),
    ]];

    const body = data.map((d) => [
        d.invoiceNo,
        d.customer,
        d.date,
        d.service,
        ...(showDP ? [formatCurrency(d.dpAmount)] : []),
        formatCurrency(d.totalAmount),
        ...(showDP ? [formatCurrency(d.remainingAmount)] : []),
        d.paymentMethod,
        d.staff,
        d.status,
        ...(showTipe ? [d.paymentType?.toUpperCase() ?? '-'] : []),
    ]);

    autoTable(doc, {
        head,
        body,
        startY: 28,
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: showDP
            ? { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
            : { 4: { halign: 'right' } },
    });

    // Footer page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    doc.save(`Laporan_DP_${label}_${formatDateYMD(new Date())}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────

export default function LaporanKhususDPPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('all');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('all');
    const [showDateModal, setShowDateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<PaymentTab>('all');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData, setAllData] = useState<DPReport[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.getDPReport({
                    branch_id: selectedBranchId,
                    date_from: quickOption === 'all' ? undefined : `${formatDateYMD(startDate)} 00:00:00`,
                    date_to: quickOption === 'all' ? undefined : `${formatDateYMD(endDate)} 23:59:59`,
                });

                if (response) {
                    const rows = (response.rows || []).map((r: any) => ({
                        ...r,
                        dpAmount: Number(r.dpAmount) || 0,
                        totalAmount: Number(r.totalAmount) || 0,
                        remainingAmount: Number(r.remainingAmount) || 0,
                        paymentType: detectPaymentType(r.paymentMethod, Number(r.dpAmount) || 0),
                    }));
                    setAllData(rows);
                }
            } catch (error) {
                console.error('Failed to fetch DP report', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedBranchId, startDate, endDate, quickOption]);

    const dpData = allData;
    const cashVaData = allData.filter((d) => {
        const method = d.paymentMethod?.toLowerCase() || '';
        return method.includes('virtual') || method.includes('va') ||
            method.includes('transfer') || method.includes('bca') ||
            method.includes('bni') || method.includes('bri') ||
            method.includes('mandiri');
    });

    const tabFilteredData = activeTab === 'dp' ? dpData : activeTab === 'cash_va' ? cashVaData : allData;

    const filteredData = tabFilteredData.filter((d) => {
        const matchesSearch = searchTerm === '' ||
            d.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === '' || d.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const sortedData = [...filteredData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = filteredData.length;

    const nonRefund = filteredData.filter((d) => d.status !== 'Refund');
    const totalDP = nonRefund.reduce((sum, d) => sum + d.dpAmount, 0);
    const totalTransactions = nonRefund.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalRemaining = nonRefund.reduce((sum, d) => sum + d.remainingAmount, 0);
    const countPending = filteredData.filter((d) => d.status === 'Menunggu Pelunasan').length;
    const countLunas = filteredData.filter((d) => d.status === 'Lunas').length;

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

    const handleTabChange = (tab: PaymentTab) => {
        setActiveTab(tab);
        setCurrentPage(1);
        setSearchTerm('');
        setStatusFilter('');
    };

    // Export: pakai filteredData (sesuai filter aktif), bukan paginatedData
    const label = getTabLabel(activeTab).replace(/\s/g, '_');
    const handleExportCSV = () => exportCSV(sortedData, activeTab, label);
    const handleExportExcel = () => exportExcel(sortedData, activeTab, label);
    const handleExportPDF = () => exportPDF(sortedData, activeTab, label);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Lunas':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Lunas</span>;
            case 'Menunggu Pelunasan':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Menunggu Pelunasan</span>;
            case 'Dibatalkan':
            case 'Void':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Void</span>;
            case 'Refund':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Refund</span>;
            default:
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
        }
    };

    const tabs: { key: PaymentTab; label: string; count: number; color: string; activeColor: string }[] = [
        { key: 'all', label: 'Semua', count: allData.length, color: 'text-gray-500', activeColor: 'border-gray-700 text-gray-700' },
        { key: 'dp', label: 'Down Payment (DP)', count: dpData.length, color: 'text-blue-400', activeColor: 'border-blue-600 text-blue-600' },
        { key: 'cash_va', label: 'Sisa Pembayaran', count: cashVaData.length, color: 'text-emerald-400', activeColor: 'border-emerald-600 text-emerald-600' },
    ];

    const summaryCards = activeTab === 'dp'
        ? [
            { label: 'Total DP Diterima', value: formatCurrency(totalDP), bg: 'bg-blue-50', text: 'text-blue-600', val: 'text-blue-700' },
            { label: 'Total Nilai Transaksi', value: formatCurrency(totalTransactions), bg: 'bg-emerald-50', text: 'text-emerald-600', val: 'text-emerald-700' },
            { label: 'Sisa Belum Dilunasi', value: formatCurrency(totalRemaining), bg: 'bg-amber-50', text: 'text-amber-600', val: 'text-amber-700' },
            { label: 'Menunggu Pelunasan', value: `${countPending} transaksi`, bg: 'bg-orange-50', text: 'text-orange-600', val: 'text-orange-700' },
            { label: 'Sudah Lunas', value: `${countLunas} transaksi`, bg: 'bg-green-50', text: 'text-green-600', val: 'text-green-700' },
        ]
        : activeTab === 'cash_va'
            ? [
                { label: 'Total Pembayaran', value: formatCurrency(totalTransactions), bg: 'bg-emerald-50', text: 'text-emerald-600', val: 'text-emerald-700' },
                { label: 'Jumlah Transaksi', value: `${filteredData.length} transaksi`, bg: 'bg-blue-50', text: 'text-blue-600', val: 'text-blue-700' },
                { label: 'Sisa Pembayaran', value: formatCurrency(totalRemaining), bg: 'bg-amber-50', text: 'text-amber-600', val: 'text-amber-700' },
                { label: 'Sudah Lunas', value: `${countLunas} transaksi`, bg: 'bg-green-50', text: 'text-green-600', val: 'text-green-700' },
                { label: 'Refund', value: `${filteredData.filter((d) => d.status === 'Refund').length} transaksi`, bg: 'bg-purple-50', text: 'text-purple-600', val: 'text-purple-700' },
            ]
            : [
                { label: 'Total DP Diterima', value: formatCurrency(totalDP), bg: 'bg-blue-50', text: 'text-blue-600', val: 'text-blue-700' },
                { label: 'Total Transaksi', value: formatCurrency(totalTransactions), bg: 'bg-emerald-50', text: 'text-emerald-600', val: 'text-emerald-700' },
                { label: 'Sisa Belum Dilunasi', value: formatCurrency(totalRemaining), bg: 'bg-amber-50', text: 'text-amber-600', val: 'text-amber-700' },
                { label: 'Menunggu Pelunasan', value: `${countPending} transaksi`, bg: 'bg-orange-50', text: 'text-orange-600', val: 'text-orange-700' },
                { label: 'Sudah Lunas', value: `${countLunas} transaksi`, bg: 'bg-green-50', text: 'text-green-600', val: 'text-green-700' },
            ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Laporan DP & Pembayaran</h1>
                {isLoading && <span className="text-sm text-gray-500 ml-2">Loading...</span>}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-100">
                <div className="flex border-b border-gray-100">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? `${tab.activeColor} bg-gray-50/50`
                                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                activeTab === tab.key ? 'bg-white/30 text-current' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="p-4 flex flex-wrap items-center gap-4">
                    <BranchSelector
                        selectedBranchId={selectedBranchId}
                        onBranchChange={handleBranchChange}
                        showAllOption={true}
                    />

                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-64">
                        <input
                            type="text"
                            placeholder="Cari pelanggan / no. invoice..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-600"
                        />
                        <Search size={16} className="text-gray-400" />
                    </div>

                    <select
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[150px] outline-none"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">Semua Status</option>
                        <option value="Menunggu Pelunasan">Menunggu Pelunasan</option>
                        <option value="Lunas">Lunas</option>
                        <option value="Void">Void (Dibatalkan)</option>
                        <option value="Refund">Refund</option>
                    </select>

                    <button
                        onClick={() => setShowDateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <Calendar size={16} className="text-gray-500" />
                        <span>
                            {quickOption === 'all' ? 'Semua Tanggal' :
                                (quickOption === '7_days' ? '7 hari sebelumnya, ' : '') + formatDateRangeDisplay(startDate, endDate)}
                        </span>
                    </button>

                    <div className="ml-auto">
                        <ExportDropdown
                            onExportCSV={handleExportCSV}
                            onExportExcel={handleExportExcel}
                            onExportPDF={handleExportPDF}
                        />
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-medium text-gray-700 mb-4">
                    Ringkasan {activeTab === 'dp' ? 'Down Payment' : activeTab === 'cash_va' ? 'Sisa Pembayaran' : 'Semua Pembayaran'}
                </h3>
                <div className={`grid grid-cols-2 gap-4 ${summaryCards.length === 5 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                    {summaryCards.map((card, i) => (
                        <div key={i} className={`${card.bg} p-4 rounded-lg`}>
                            <p className={`text-sm ${card.text}`}>{card.label}</p>
                            <p className={`text-lg font-semibold ${card.val}`}>{card.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">No. Invoice <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Pelanggan <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Layanan <ArrowUpDown size={12} /></div></th>
                                {(activeTab === 'all' || activeTab === 'dp') && (
                                    <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Jumlah DP <ArrowUpDown size={12} /></div></th>
                                )}
                                <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Total Transaksi <ArrowUpDown size={12} /></div></th>
                                {(activeTab === 'all' || activeTab === 'dp') && (
                                    <th className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Sisa <ArrowUpDown size={12} /></div></th>
                                )}
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Metode <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Staff <ArrowUpDown size={12} /></div></th>
                                <th className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-gray-700">Status <ArrowUpDown size={12} /></div></th>
                                {activeTab === 'all' && (
                                    <th className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-gray-700">Tipe <ArrowUpDown size={12} /></div></th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-gray-400">Tidak ada data</td>
                                </tr>
                            ) : (
                                paginatedData.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 text-cyan-600 font-medium">{d.invoiceNo}</td>
                                        <td className="px-4 py-4 font-medium text-gray-900">{d.customer}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.date}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.service}</td>
                                        {(activeTab === 'all' || activeTab === 'dp') && (
                                            <td className="px-4 py-4 text-right font-medium text-blue-600">{formatCurrency(d.dpAmount)}</td>
                                        )}
                                        <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.totalAmount)}</td>
                                        {(activeTab === 'all' || activeTab === 'dp') && (
                                            <td className="px-4 py-4 text-right text-amber-600">{formatCurrency(d.remainingAmount)}</td>
                                        )}
                                        <td className="px-4 py-4 text-gray-600">{d.paymentMethod}</td>
                                        <td className="px-4 py-4 text-gray-600">{d.staff}</td>
                                        <td className="px-4 py-4 text-center">{getStatusBadge(d.status)}</td>
                                        {activeTab === 'all' && (
                                            <td className="px-4 py-4 text-center">
                                                {d.paymentType === 'dp'
                                                    ? <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">DP</span>
                                                    : d.paymentType === 'va'
                                                        ? <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">VA</span>
                                                        : <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Cash</span>
                                                }
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
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