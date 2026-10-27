import { useState, useEffect } from 'react';
import { Calendar, RefreshCcw, Search, ChevronDown, X, PieChart as PieChartIcon, FileText, ShoppingBag, CreditCard, Inbox, History, Building, Check } from 'lucide-react';
import { api } from '../../services/api';
import type { Branch } from '../../services/api';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useBranchSync } from '../../hooks/useBranchSync';

type SalesTab = 'penjualan-harian' | 'layanan' | 'kelas' | 'faktur' | 'voucher' | 'laci-kas' | 'kas-masuk-keluar';

const tabs: { id: SalesTab; label: string }[] = [
    { id: 'penjualan-harian', label: 'Penjualan Harian' },
    { id: 'layanan', label: 'Layanan' },
    // { id: 'kelas', label: 'Kelas' }, // Hidden for now if unused
    { id: 'faktur', label: 'Faktur' },
    { id: 'voucher', label: 'Voucher' },
    { id: 'laci-kas', label: 'Laci Kas' },
    { id: 'kas-masuk-keluar', label: 'Kas Masuk/Keluar' },
];

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const formatDateDisplay = (date: Date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const formatDateInput = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// API Integration
const fetchReportData = async (
    tab: SalesTab,
    dateFrom: Date,
    dateTo: Date,
    branchId: number | null
) => {
    // Format dates to YYYY-MM-DD
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const params = {
        date_from: formatDate(dateFrom),
        date_to: formatDate(dateTo),
        branch_id: branchId === 0 ? undefined : branchId, // Send undefined for 'All Branches' to skip filter
    };

    try {
        switch (tab) {
            case 'penjualan-harian': {
                const [typeData, paymentData] = await Promise.all([
                    api.getSalesByType({ ...params }),
                    api.getSalesByChannel({ ...params })
                ]);
                return { typeData, paymentData };
            }
            case 'layanan':
                return await api.getSalesItem({ ...params });
            case 'faktur':
                return await api.getTransactions({ ...params, status: ['paid', 'unpaid', 'partial'] }); // Assuming getTransactions exists or needed
            case 'voucher':
                return await api.getVoucherUsage({ ...params });
            case 'laci-kas':
                return []; // Placeholder until API ready
            case 'kas-masuk-keluar':
                return await api.getExpenses({ ...params });
            default:
                return null;
        }
    } catch (error) {
        console.error("Error fetching report data:", error);
        return null;
    }
};

export default function SalesPage() {
    const [activeTab, setActiveTab] = useState<SalesTab>('penjualan-harian');
    const [branchList, setBranchList] = useState<Branch[]>([]);
    const { selectedBranchId, setSelectedBranchId } = useBranchSync(() => setCurrentPage(1), 0);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const [branchSearchTerm, setBranchSearchTerm] = useState('');

    // Date filter states
    const [startDate, setStartDate] = useState<Date>(() => {
        const { start } = getInitialDateRange('7_days');
        return start;
    });
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [selectedQuickOption, setSelectedQuickOption] = useState('7_days');
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [dateType, setDateType] = useState<'invoice' | 'payment'>('invoice');
    const [backdateFilter, setBackdateFilter] = useState<'all' | 'backdate' | 'normal'>('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset pagination when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // Helper to get current page data
    const getPaginatedData = (data: any[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    useEffect(() => {
        const loadBranches = async () => {
            try {
                setLoadingBranches(true);
                const branches = await api.getBranches();
                // Add "Semua Cabang" option
                const allBranchesOption = { id: 0, name: 'Semua Cabang', address: 'Lihat data semua cabang' } as Branch;
                setBranchList([allBranchesOption, ...branches]);
            } catch (err) { console.error('Error loading branches:', err); }
            finally { setLoadingBranches(false); }
        };
        loadBranches();
    }, []);

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'CONFIRMED': 'bg-naqupos-sage/20 text-naqupos-sage border border-naqupos-sage/30',
            'PAID': 'bg-green-50 text-green-700 border border-green-200',
            'UNPAID': 'bg-orange-50 text-orange-600 border border-orange-200',
            'PART PAID': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
            'Valid': 'bg-green-50 text-green-700 border border-green-200',
            'Buka': 'bg-blue-50 text-blue-700 border border-blue-200',
            'Tutup': 'bg-gray-50 text-gray-600 border border-gray-200',
        };
        return colors[status] || 'bg-gray-50 text-gray-700 border border-gray-200';
    };

    const handleExport = (format: 'CSV' | 'PDF' | 'XLS') => {
        let filename = `sales_${activeTab}_${new Date().toISOString().split('T')[0]}`;
        let title = `Laporan ${activeTab.replace('-', ' ')}`;
        let headers: string[] = [];
        let rows: any[] = [];

        if (activeTab === 'penjualan-harian') {
            headers = ['Tipe Item', 'Total Penjualan', 'Jumlah Pengembalian', 'Pendapatan Kotor'];
            rows = transaksiData.map(r => [r.tipe, r.totalPenjualan ?? 0, r.jumlahPengembalian ?? 0, r.pendapatanKotor]);
        } else if (activeTab === 'layanan') {
            headers = ['Ref No.', 'Faktur', 'Pelanggan', 'Staff', 'Nama Item', 'Tanggal', 'Waktu', 'Durasi', 'Status'];
            rows = layananData.map(r => [r.refNo, r.faktur, r.pelanggan, r.staff, r.namaItem, r.tanggal, r.waktu, r.durasi, r.status]);
        } else if (activeTab === 'faktur') {
            headers = ['Faktur', 'Pelanggan', 'Tanggal', 'Lokasi', 'Tips', 'Pendapatan Kotor', 'Status'];
            rows = fakturData.map(r => [r.faktur, r.pelanggan, r.tanggal, r.lokasi, r.tips, r.pendapatanKotor, r.status]);
        }

        if (format === 'CSV') {
            let csv = headers.join(',') + '\n';
            rows.forEach(row => {
                csv += row.map((v: any) => `"${v}"`).join(',') + '\n';
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.csv`;
            link.click();
        } else if (format === 'XLS') {
            let html = `<html><head><meta charset="UTF-8"></head><body><h2>${title}</h2><table border="1"><thead><tr>`;
            headers.forEach(h => html += `<th>${h}</th>`);
            html += `</tr></thead><tbody>`;
            rows.forEach(row => {
                html += `<tr>${row.map((v: any) => `<td>${typeof v === 'number' ? formatCurrency(v) : v}</td>`).join('')}</tr>`;
            });
            html += `</tbody></table></body></html>`;
            const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.xls`;
            link.click();
        } else if (format === 'PDF') {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            let html = `<!DOCTYPE html><html><head><title>${title}</title>
            <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
            </head><body><h2>${title}</h2><table><thead><tr>`;
            headers.forEach(h => html += `<th>${h}</th>`);
            html += `</tr></thead><tbody>`;
            rows.forEach(row => {
                html += `<tr>${row.map((v: any) => `<td>${typeof v === 'number' ? formatCurrency(v) : v}</td>`).join('')}</tr>`;
            });
            html += `</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
            printWindow.document.write(html);
            printWindow.document.close();
        }
    };


    // Data states
    const [transaksiData, setTransaksiData] = useState<any[]>([]);
    const [pergerakanKasData, setPergerakanKasData] = useState<any[]>([]);
    const [layananData, setLayananData] = useState<any[]>([]);
    const [fakturData, setFakturData] = useState<any[]>([]);
    const [voucherData, setVoucherData] = useState<any[]>([]);
    const [laciKasData, setLaciKasData] = useState<any[]>([]);
    const [kasMasukKeluarData, setKasMasukKeluarData] = useState<any[]>([]);
    const [, setIsLoading] = useState(false);

    // Print Modal States
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printTab, setPrintTab] = useState<'register' | 'transaksi'>('transaksi');
    const [printStartDate, setPrintStartDate] = useState<Date>(startDate);
    const [printEndDate, setPrintEndDate] = useState<Date>(endDate);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchReportData(activeTab, startDate, endDate, selectedBranchId);

                // Clear previous data
                setTransaksiData([]);
                setPergerakanKasData([]);
                setLayananData([]);
                setFakturData([]);
                setVoucherData([]);
                setLaciKasData([]);
                setKasMasukKeluarData([]);

                if (data) {
                    if (activeTab === 'penjualan-harian') {
                        // Transform summaries to table format
                        const summaryData = data.typeData?.data || [];
                        const services = summaryData.find((s: any) => s.type === 'Service') || { sold: 0, gross: 0, nett: 0, refund: 0 };
                        const products = summaryData.find((s: any) => s.type === 'Product') || { sold: 0, gross: 0, nett: 0, refund: 0 };

                        const servicesRefund = services.refund || 0;
                        const productsRefund = products.refund || 0;
                        const totalSold = services.sold + products.sold;
                        const totalGross = services.gross + products.gross;
                        const totalNett = services.nett + products.nett;
                        const totalRefund = servicesRefund + productsRefund;

                        setTransaksiData([
                            { tipe: 'Services', totalPenjualan: services.sold, jumlahPengembalian: servicesRefund, pendapatanKotor: services.gross },
                            { tipe: 'Products', totalPenjualan: products.sold, jumlahPengembalian: productsRefund, pendapatanKotor: products.gross },
                            { tipe: 'Gross Total Sales', totalPenjualan: totalSold, jumlahPengembalian: totalRefund, pendapatanKotor: totalGross },
                            { tipe: 'Net Total Sales', totalPenjualan: totalSold, jumlahPengembalian: null, pendapatanKotor: totalNett }
                        ]);

                        // Needs specific endpoint for payment types breakdown if not in itemData
                        const paymentSummary = data.paymentData?.summary || {};
                        const paymentRefund = paymentSummary.refund || paymentSummary.pengembalian || 0;
                        setPergerakanKasData([
                            { tipe: 'Pembayaran', terkumpul: paymentSummary.nett || 0, pengembalian: paymentRefund, pendapatanKotor: paymentSummary.nett || 0 }
                        ]);

                    } else if (activeTab === 'layanan') {
                        setLayananData((data.data || []).map((item: any) => ({
                            refNo: item.id || '-',
                            faktur: item.id || '-',
                            pelanggan: item.customer || 'Guest',
                            staff: item.staffReceiver || '-',
                            namaItem: item.name || '-',
                            tanggal: item.date || '-',
                            waktu: item.time || '-',
                            durasi: item.duration || '-',
                            status: item.invoiceStatus || 'COMPLETED',
                            cabang: item.location || '-'
                        })));
                    } else if (activeTab === 'faktur') {
                        setFakturData((data.data || []).map((item: any) => {
                            const dateObj = new Date(item.transaction_date);
                            const formattedDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                            return {
                                faktur: item.transaction_ref || item.id,
                                pelanggan: item.booking?.user?.name || item.booking?.customer_name || item.booking?.guest_name || 'Guest',
                                tanggal: formattedDate,
                                lokasi: item.branch?.name || '-',
                                tips: item.tips || 0,
                                pendapatanKotor: parseFloat(item.total || 0),
                                status: (item.booking?.payment_status === 'partial' ? 'PART PAID' : (item.booking?.payment_status || 'paid')).toUpperCase(),
                                cabang: item.branch?.name || '-'
                            };
                        }));
                    } else if (activeTab === 'voucher') {
                        setVoucherData((data.data || []).map((item: any) => ({
                            nama: item.name || '-',
                            kadaluarsa: item.expiryDate || '-',
                            faktur: item.id || '-', // Using ID for invoice reference if faktur is missing
                            pelanggan: item.customer || 'Guest',
                            kode: item.code || '-',
                            total: formatCurrency(item.used + item.remaining),
                            digunakan: formatCurrency(item.used),
                            status: item.status || 'Active',
                            cabang: item.location || '-'
                        })));
                    }
                    // Add other tab handlers similarly
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [activeTab, startDate, endDate, selectedBranchId]);

    const handlePrintSummary = () => {
        setIsPrintModalOpen(true);
        setPrintStartDate(startDate);
        setPrintEndDate(endDate);
    };

    const executePrint = () => {
        const branchName = branchList.find(b => b.id === selectedBranchId)?.name || 'Naqupos Central';
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Cetak Ringkasan - ${branchName}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Courier New', monospace; 
            padding: 20px; 
            font-size: 11px;
            line-height: 1.3;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .header h2 { margin: 3px 0; font-size: 14px; }
        .header p { margin: 2px 0; font-size: 10px; }
        .section { margin: 15px 0; }
        .section-title { 
            font-weight: bold; 
            margin: 10px 0 6px 0;
            font-size: 12px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse;
        }
        td { 
            padding: 3px 6px;
            border-bottom: 1px dotted #ddd;
        }
        .label { width: 50%; }
        .count { width: 15%; text-align: right; }
        .value { text-align: right; width: 35%; }
        .negative { color: #d32f2f; }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            border-top: 1px solid #ccc;
            padding-top: 8px;
        }
        @media print {
            body { padding: 10px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>${branchName}</h2>
        <p>Ringkasan Penjualan Harian</p>
        <p>Printed on ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>

    ${printTab === 'transaksi' ? `
    <div class="section">
        <table>
            <tr><td class="label" style="font-weight: bold;">Total penjualan</td><td class="count" style="font-weight: bold;">${transaksiData.find(r => r.tipe === 'Gross Total Sales')?.totalPenjualan || 0}</td><td class="value" style="font-weight: bold;">${formatCurrency(transaksiData.find(r => r.tipe === 'Gross Total Sales')?.pendapatanKotor || 0)}</td></tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Total kurangnya penjualan</div>
        <table>
            <tr><td class="label">Pengembalian</td><td class="count">0</td><td class="value">0.00</td></tr>
            <tr><td class="label">Penjualan dengan potongan voucher</td><td class="count">0</td><td class="value">0.00</td></tr>
            <tr style="font-weight: bold;"><td class="label">Total penjualan</td><td class="count">${transaksiData.find(r => r.tipe === 'Gross Total Sales')?.totalPenjualan || 0}</td><td class="value">${formatCurrency(transaksiData.find(r => r.tipe === 'Gross Total Sales')?.pendapatanKotor || 0)}</td></tr>
        </table>
    </div>
    ` : ''}



    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        setIsPrintModalOpen(false);
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 bg-gradient-to-r from-naqupos-cream/50 to-white p-1.5 rounded-xl overflow-x-auto shadow-sm border border-naqupos-accent/20">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white shadow-md'
                            : 'text-naqupos-dark hover:bg-naqupos-secondary/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap bg-white p-4 rounded-xl border border-naqupos-accent/20 shadow-sm">
                {/* Premium Branch Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                        disabled={loadingBranches}
                        className="flex items-center gap-3 px-4 py-2 rounded-xl border-2 border-naqupos-accent/30 hover:border-naqupos-primary hover:bg-naqupos-cream/50 cursor-pointer transition-all duration-300 min-w-[240px] bg-white group"
                    >
                        <div className="p-1.5 bg-naqupos-cream rounded-lg group-hover:scale-110 transition-transform duration-300">
                            <Building size={16} className="text-naqupos-primary" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-bold text-naqupos-dark text-sm leading-tight">
                                {loadingBranches ? 'Memuat...' : (branchList.find(b => b.id === selectedBranchId)?.name || 'Pilih Cabang')}
                            </p>
                            <p className="text-[10px] text-gray-500 max-w-[150px] truncate">
                                {branchList.find(b => b.id === selectedBranchId)?.address || 'Klik untuk memilih'}
                            </p>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showBranchDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showBranchDropdown && !loadingBranches && (
                        <>
                            <div className="fixed inset-0 z-[90]" onClick={() => setShowBranchDropdown(false)} />
                            <div className="absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl border border-naqupos-accent/20 shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b border-naqupos-cream bg-gray-50/50 space-y-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Cabang</p>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Cari cabang..."
                                            value={branchSearchTerm}
                                            onChange={(e) => setBranchSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-naqupos-accent/20 rounded-xl text-xs focus:ring-2 focus:ring-naqupos-secondary/20 focus:border-naqupos-primary outline-none transition-all"
                                            autoFocus
                                        />
                                        {branchSearchTerm && (
                                            <button
                                                onClick={() => setBranchSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {branchList
                                        .filter(b =>
                                            b.name.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
                                            (b.address && b.address.toLowerCase().includes(branchSearchTerm.toLowerCase()))
                                        )
                                        .map((branch) => (
                                            <button
                                                key={branch.id}
                                                onClick={() => {
                                                    setSelectedBranchId(branch.id);
                                                    setShowBranchDropdown(false);
                                                    setBranchSearchTerm('');
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group ${selectedBranchId === branch.id
                                                    ? 'bg-naqupos-cream'
                                                    : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-xl transition-transform duration-200 group-hover:scale-110 ${branch.id === 0 ? 'bg-purple-100' : 'bg-naqupos-cream'
                                                    }`}>
                                                    <Building size={16} className={`${branch.id === 0 ? 'text-purple-600' : 'text-naqupos-primary'
                                                        }`} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`font-bold text-sm ${selectedBranchId === branch.id ? 'text-naqupos-primary' : 'text-naqupos-dark'}`}>{branch.name}</p>
                                                    <p className="text-[10px] text-gray-400 leading-normal">{branch.address}</p>
                                                </div>
                                                {selectedBranchId === branch.id && (
                                                    <div className="w-6 h-6 rounded-full bg-naqupos-primary/10 flex items-center justify-center">
                                                        <Check size={14} className="text-naqupos-primary" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Date Type Toggle - Only for Penjualan Harian */}
                {activeTab === 'penjualan-harian' && (
                    <div className="flex items-center gap-1 bg-naqupos-cream/30 p-1 rounded-lg border border-naqupos-accent/20">
                        <button
                            onClick={() => setDateType('invoice')}
                            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${dateType === 'invoice'
                                ? 'bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white shadow-sm'
                                : 'text-naqupos-dark hover:bg-naqupos-secondary/30'
                                }`}
                        >
                            Tanggal Invoice
                        </button>
                        <button
                            onClick={() => setDateType('payment')}
                            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${dateType === 'payment'
                                ? 'bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white shadow-sm'
                                : 'text-naqupos-dark hover:bg-naqupos-secondary/30'
                                }`}
                        >
                            Tanggal Pembayaran
                        </button>
                    </div>
                )}

                {/* Backdate Filter - Only for Faktur */}
                {activeTab === 'faktur' && (
                    <div className="flex items-center gap-1 bg-naqupos-cream/30 p-1 rounded-lg border border-naqupos-accent/20">
                        <button
                            onClick={() => setBackdateFilter('all')}
                            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${backdateFilter === 'all'
                                ? 'bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white shadow-sm'
                                : 'text-naqupos-dark hover:bg-naqupos-secondary/30'
                                }`}
                        >
                            Semua
                        </button>
                        <button
                            onClick={() => setBackdateFilter('normal')}
                            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${backdateFilter === 'normal'
                                ? 'bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white shadow-sm'
                                : 'text-naqupos-dark hover:bg-naqupos-secondary/30'
                                }`}
                        >
                            Normal
                        </button>
                        <button
                            onClick={() => setBackdateFilter('backdate')}
                            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${backdateFilter === 'backdate'
                                ? 'bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white shadow-sm'
                                : 'text-naqupos-dark hover:bg-naqupos-secondary/30'
                                }`}
                        >
                            Backdate
                        </button>
                    </div>
                )}

                {(activeTab === 'penjualan-harian' || activeTab === 'layanan' || activeTab === 'faktur') && (
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-naqupos-accent/30 rounded-lg text-sm font-medium text-naqupos-dark hover:border-naqupos-primary hover:bg-naqupos-secondary/20 transition-all">
                            Export <ChevronDown size={14} />
                        </button>
                        <div className="absolute left-0 mt-1 bg-white border-2 border-naqupos-accent/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible z-10 w-32 overflow-hidden">
                            <button onClick={() => handleExport('CSV')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-naqupos-secondary/30 transition-colors">CSV</button>
                            <button onClick={() => handleExport('PDF')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-naqupos-secondary/30 transition-colors">PDF</button>
                            <button onClick={() => handleExport('XLS')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-naqupos-secondary/30 transition-colors">XLS</button>
                        </div>
                    </div>
                )}

                {activeTab === 'penjualan-harian' && <button onClick={handlePrintSummary} className="px-5 py-2.5 bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all">Cetak Ringkasan</button>}
                {activeTab === 'voucher' && <button className="px-5 py-2.5 bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"><RefreshCcw size={14} /> Refresh</button>}

                <button
                    onClick={() => setIsDateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-naqupos-cream border border-naqupos-accent/30 rounded-lg text-sm ml-auto font-medium text-naqupos-dark hover:bg-naqupos-secondary/50 transition-all cursor-pointer"
                >
                    <Calendar size={16} className="text-naqupos-primary" />
                    <span>{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>

                {(activeTab === 'layanan' || activeTab === 'faktur' || activeTab === 'voucher') && (
                    <div className="flex items-center gap-2">
                        <select className="px-3 py-2.5 border-2 border-naqupos-accent/30 rounded-lg text-sm focus:border-naqupos-primary outline-none bg-white">
                            <option>Ref No.</option>
                            <option>Pelanggan</option>
                            {(activeTab === 'layanan' || activeTab === 'faktur') && <option>Staff</option>}
                            {activeTab === 'layanan' && <option>Nama Item</option>}
                            {activeTab === 'faktur' && <option>Nomor Faktur</option>}
                            {activeTab === 'voucher' && (
                                <>
                                    <option>Nama Pelanggan</option>
                                    <option>Faktur</option>
                                    <option>Kode</option>
                                </>
                            )}
                        </select>
                        <div className="relative">
                            <input type="text" placeholder="Ketik kata kunci" className="pl-3 pr-10 py-2.5 border-2 border-naqupos-accent/30 rounded-lg text-sm w-48 focus:border-naqupos-primary outline-none" />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-naqupos-primary" />
                        </div>
                    </div>
                )}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl border-2 border-naqupos-accent/20 overflow-hidden shadow-lg">
                {activeTab === 'penjualan-harian' && (
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Transaksi Table */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Transaksi</h3>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50"><tr className="text-xs text-gray-500"><th className="px-3 py-2 text-left">Tipe Item</th><th className="px-3 py-2 text-right">Total Penjualan</th><th className="px-3 py-2 text-right">Jumlah Pengembalian</th><th className="px-3 py-2 text-right">Pendapatan Kotor</th></tr></thead>
                                <tbody>
                                    {transaksiData.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            <td className={`px-3 py-2 ${row.isNegative ? 'text-red-600' : ''}`}>{row.tipe}</td>
                                            <td className="px-3 py-2 text-right">{row.totalPenjualan ?? ''}</td>
                                            <td className="px-3 py-2 text-right">{row.jumlahPengembalian ?? ''}</td>
                                            <td className={`px-3 py-2 text-right ${row.isNegative ? 'text-red-600' : ''}`}>{formatCurrency(row.pendapatanKotor)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <h3 className="text-lg font-semibold mt-6 mb-4">Pergerakan Kas</h3>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50"><tr className="text-xs text-gray-500"><th className="px-3 py-2 text-left">Tipe Pembayaran</th><th className="px-3 py-2 text-right">Terkumpul</th><th className="px-3 py-2 text-right">Pengembalian</th><th className="px-3 py-2 text-right">Pendapatan Kotor</th></tr></thead>
                                <tbody>
                                    {pergerakanKasData.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            <td className={`px-3 py-2 ${row.isOutstanding ? 'text-red-600' : ''}`}>{row.tipe}</td>
                                            <td className={`px-3 py-2 text-right ${row.isOutstanding ? 'text-red-600' : ''}`}>{formatCurrency(row.terkumpul)}</td>
                                            <td className="px-3 py-2 text-right">{row.pengembalian != null ? formatCurrency(row.pengembalian) : ''}</td>
                                            <td className="px-3 py-2 text-right">{row.pendapatanKotor != null ? formatCurrency(row.pendapatanKotor) : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Charts */}
                        <div className="space-y-6">
                            {/* Pendapatan Kotor Chart */}
                            {transaksiData.some(r => ['Services', 'Classes', 'Products', 'Vouchers'].includes(r.tipe) && r.pendapatanKotor > 0) ? (
                                <div className="bg-gradient-to-br from-white to-naqupos-cream/20 p-6 rounded-2xl border-2 border-naqupos-accent/20 shadow-md">
                                    <h3 className="text-lg font-serif font-bold text-naqupos-dark mb-4">Pendapatan Kotor</h3>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Services', value: transaksiData.find(r => r.tipe === 'Services')?.pendapatanKotor || 0 },
                                                    { name: 'Classes', value: transaksiData.find(r => r.tipe === 'Classes')?.pendapatanKotor || 0 },
                                                    { name: 'Products', value: transaksiData.find(r => r.tipe === 'Products')?.pendapatanKotor || 0 },
                                                    { name: 'Vouchers', value: transaksiData.find(r => r.tipe === 'Vouchers')?.pendapatanKotor || 0 },
                                                ].filter(item => item.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Services', value: transaksiData.find(r => r.tipe === 'Services')?.pendapatanKotor || 0 },
                                                    { name: 'Classes', value: transaksiData.find(r => r.tipe === 'Classes')?.pendapatanKotor || 0 },
                                                    { name: 'Products', value: transaksiData.find(r => r.tipe === 'Products')?.pendapatanKotor || 0 },
                                                    { name: 'Vouchers', value: transaksiData.find(r => r.tipe === 'Vouchers')?.pendapatanKotor || 0 },
                                                ].filter(item => item.value > 0).map((_item, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#C58940', '#E5BA73', '#FAEAB1', '#9EB29C'][index % 4]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => `Rp ${formatCurrency(value || 0)}`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : null}

                            {/* Pembayaran Chart */}
                            {pergerakanKasData.some(r => r.terkumpul > 0) ? (
                                <div className="bg-gradient-to-br from-white to-naqupos-cream/20 p-6 rounded-2xl border-2 border-naqupos-accent/20 shadow-md">
                                    <h3 className="text-lg font-serif font-bold text-naqupos-dark mb-4">Pembayaran</h3>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Transfer BRI', value: pergerakanKasData.find(r => r.tipe === 'Transfer BRI')?.terkumpul || 0 },
                                                    { name: 'CASH', value: pergerakanKasData.find(r => r.tipe === 'CASH')?.terkumpul || 0 },
                                                    { name: 'QRIS BCA', value: pergerakanKasData.find(r => r.tipe === 'QRISS BCA')?.terkumpul || 0 },
                                                    { name: 'Transfer BCA', value: pergerakanKasData.find(r => r.tipe === 'Transfer BCA')?.terkumpul || 0 },
                                                    { name: 'Pay Later', value: pergerakanKasData.find(r => r.tipe === 'Pay Later')?.terkumpul || 0 },
                                                ].filter(item => item.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Transfer BRI', value: pergerakanKasData.find(r => r.tipe === 'Transfer BRI')?.terkumpul || 0 },
                                                    { name: 'CASH', value: pergerakanKasData.find(r => r.tipe === 'CASH')?.terkumpul || 0 },
                                                    { name: 'QRIS BCA', value: pergerakanKasData.find(r => r.tipe === 'QRISS BCA')?.terkumpul || 0 },
                                                    { name: 'Transfer BCA', value: pergerakanKasData.find(r => r.tipe === 'Transfer BCA')?.terkumpul || 0 },
                                                    { name: 'Pay Later', value: pergerakanKasData.find(r => r.tipe === 'Pay Later')?.terkumpul || 0 },
                                                ].filter(item => item.value > 0).map((_item, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#8B4513', '#DC143C', '#FF1493', '#4169E1', '#32CD32'][index % 5]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => `Rp ${formatCurrency(value || 0)}`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : null}

                            {!transaksiData.some(r => ['Services', 'Classes', 'Products', 'Vouchers'].includes(r.tipe) && r.pendapatanKotor > 0) && !pergerakanKasData.some(r => r.terkumpul > 0) && (
                                <div className="h-full flex items-center justify-center p-8 bg-naqupos-cream/10 rounded-2xl border-2 border-dashed border-naqupos-accent/30">
                                    <EmptyState
                                        title="Grafik tidak tersedia"
                                        message="Belum ada data transaksi untuk ditampilkan pada periode ini."
                                        icon={PieChartIcon}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'layanan' && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-xs text-gray-500">
                                        <th className="px-4 py-3 text-left">Ref No.</th>
                                        <th className="px-4 py-3 text-left">Pelanggan</th>
                                        <th className="px-4 py-3 text-left">Staff</th>
                                        <th className="px-4 py-3 text-left">Nama Item</th>
                                        <th className="px-4 py-3 text-left">Tanggal</th>
                                        <th className="px-4 py-3 text-left">Waktu</th>
                                        <th className="px-4 py-3 text-left">Durasi</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        {selectedBranchId === 0 && <th className="px-4 py-3 text-left">Cabang</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(layananData).map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3"><span className="text-blue-600">{row.refNo}</span><br /><span className="text-xs text-gray-400">{row.faktur}</span></td>
                                            <td className="px-4 py-3 text-blue-600">{row.pelanggan}</td>
                                            <td className="px-4 py-3">{row.staff}</td>
                                            <td className="px-4 py-3">{row.namaItem}</td>
                                            <td className="px-4 py-3">{row.tanggal}</td>
                                            <td className="px-4 py-3">{row.waktu}</td>
                                            <td className="px-4 py-3">{row.durasi}</td>
                                            <td className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>{row.status}</span></td>
                                            {selectedBranchId === 0 && <td className="px-4 py-3 text-gray-500 text-xs">{row.cabang}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {layananData.length === 0 && (
                            <div className="p-8">
                                <EmptyState
                                    title="Tidak ada data layanan"
                                    message="Belum ada data layanan untuk kriteria filter ini."
                                    icon={ShoppingBag}
                                />
                            </div>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalItems={layananData.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </>
                )}

                {activeTab === 'kelas' && (
                    <div className="p-8">
                        <EmptyState
                            title="Layanan Kelas Tidak Tersedia"
                            message="Modul layanan kelas saat ini sedang dinonaktifkan atau belum memiliki data."
                            icon={Inbox}
                        />
                    </div>
                )}

                {activeTab === 'faktur' && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-xs text-gray-500">
                                        <th className="px-4 py-3 text-left">Faktur</th>
                                        <th className="px-4 py-3 text-left">Pelanggan</th>
                                        <th className="px-4 py-3 text-left">Tanggal Faktur</th>
                                        <th className="px-4 py-3 text-left">Lokasi</th>
                                        <th className="px-4 py-3 text-right">Tips</th>
                                        <th className="px-4 py-3 text-right">Pendapatan Kotor</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        {selectedBranchId === 0 && <th className="px-4 py-3 text-left">Cabang</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(fakturData).map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3">{row.faktur}</td>
                                            <td className="px-4 py-3 text-blue-600">{row.pelanggan}</td>
                                            <td className="px-4 py-3">{row.tanggal}</td>
                                            <td className="px-4 py-3">{row.lokasi}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.tips)}</td>
                                            <td className="px-4 py-3 text-right">Rp {formatCurrency(row.pendapatanKotor)}</td>
                                            <td className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>{row.status}</span></td>
                                            {selectedBranchId === 0 && <td className="px-4 py-3 text-gray-500 text-xs">{row.cabang}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {fakturData.length === 0 && (
                            <div className="p-8">
                                <EmptyState
                                    title="Tidak ada faktur"
                                    message="Belum ada data faktur untuk periode filter ini."
                                    icon={FileText}
                                />
                            </div>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalItems={fakturData.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </>
                )}

                {activeTab === 'voucher' && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-xs text-gray-500">
                                        <th className="px-4 py-3 text-left">Nama</th>
                                        <th className="px-4 py-3 text-left">Kadaluarsa</th>
                                        <th className="px-4 py-3 text-left">Faktur</th>
                                        <th className="px-4 py-3 text-left">Pelanggan</th>
                                        <th className="px-4 py-3 text-left">Kode</th>
                                        <th className="px-4 py-3 text-left">Total</th>
                                        <th className="px-4 py-3 text-left">Digunakan</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        {selectedBranchId === 0 && <th className="px-4 py-3 text-left">Cabang</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(voucherData).map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3 flex items-center gap-2"><span className="w-6 h-6 bg-yellow-200 rounded flex items-center justify-center text-xs font-bold">S</span>{row.nama}</td>
                                            <td className="px-4 py-3">{row.kadaluarsa}</td>
                                            <td className="px-4 py-3 text-blue-600">{row.faktur}</td>
                                            <td className="px-4 py-3 text-blue-600">{row.pelanggan}</td>
                                            <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-1 rounded text-xs">{row.kode}</code></td>
                                            <td className="px-4 py-3">{row.total}</td>
                                            <td className="px-4 py-3">{row.digunakan}</td>
                                            <td className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>{row.status}</span></td>
                                            {selectedBranchId === 0 && <td className="px-4 py-3 text-gray-500 text-xs">{row.cabang}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {voucherData.length === 0 && (
                            <div className="p-8">
                                <EmptyState
                                    title="Tidak ada voucher"
                                    message="Belum ada data voucher yang digunakan pada periode ini."
                                    icon={CreditCard}
                                />
                            </div>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalItems={voucherData.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </>
                )}

                {activeTab === 'laci-kas' && (
                    <>
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                            <span className="text-sm font-semibold text-naqupos-dark">📍 Kasir di lokasi:</span>
                            <span className="text-sm text-gray-600">{branchList.find(b => b.id === selectedBranchId)?.name || 'Semua Cabang'}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-xs text-gray-500">
                                        <th className="px-4 py-3 text-left">Tanggal</th>
                                        <th className="px-4 py-3 text-left">Nama Staff</th>
                                        <th className="px-4 py-3 text-right">Total Diharapkan</th>
                                        <th className="px-4 py-3 text-right">Total Terhitung</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        {selectedBranchId === 0 && <th className="px-4 py-3 text-left">Cabang</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(laciKasData).map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3">{row.tanggal}</td>
                                            <td className="px-4 py-3 text-blue-600">{row.namaStaff}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.totalDiharapkan)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.totalTerhitung)}</td>
                                            <td className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-xs font-medium border ${row.status === 'Buka' ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>{row.status}</span></td>
                                            {selectedBranchId === 0 && <td className="px-4 py-3 text-gray-500 text-xs">{row.cabang}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {laciKasData.length === 0 && (
                            <div className="p-8">
                                <EmptyState
                                    title="Tidak ada data laci kas"
                                    message="Belum ada catatan pergerakan laci kas untuk periode ini."
                                    icon={Inbox}
                                />
                            </div>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalItems={laciKasData.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </>
                )}

                {activeTab === 'kas-masuk-keluar' && (
                    <div className="relative min-h-[400px]">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-cover bg-center rounded-lg" style={{ backgroundImage: "url('https://ui-avatars.com/api/?name=ZS&background=C58940&color=fff')" }}></div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Kas Masuk/Keluar</h3>
                                    <p className="text-sm text-gray-500">{branchList.find(b => b.id === selectedBranchId)?.name || 'Naqupos Spa Solo'}</p>
                                </div>
                            </div>
                            <div className="ml-auto flex items-center gap-4">
                                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 flex flex-col items-center min-w-[100px]">
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total</span>
                                    <p className="font-bold text-gray-900">Rp 0</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-xs text-gray-500">
                                        <th className="px-4 py-3 text-left">Tanggal</th>
                                        <th className="px-4 py-3 text-left">Judul</th>
                                        <th className="px-4 py-3 text-left">Tipe</th>
                                        <th className="px-4 py-3 text-left">Dibuat Oleh</th>
                                        <th className="px-4 py-3 text-right">Jumlah</th>
                                        <th className="px-4 py-3 text-left">Catatan</th>
                                        {selectedBranchId === 0 && <th className="px-4 py-3 text-left">Cabang</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedData(kasMasukKeluarData).map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3">{row.tanggal}</td>
                                            <td className="px-4 py-3">{row.judul}</td>
                                            <td className="px-4 py-3">{row.tipe}</td>
                                            <td className="px-4 py-3">{row.dibuatOleh}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.jumlah)}</td>
                                            <td className="px-4 py-3">{row.catatan}</td>
                                            {selectedBranchId === 0 && <td className="px-4 py-3 text-gray-500 text-xs">{row.cabang}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {kasMasukKeluarData.length === 0 && (
                            <div className="p-8">
                                <EmptyState
                                    title="Tidak ada kas masuk/keluar"
                                    message="Belum ada data kas masuk atau keluar untuk kriteria ini."
                                    icon={History}
                                />
                            </div>
                        )}

                        <Pagination
                            currentPage={currentPage}
                            totalItems={kasMasukKeluarData.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />


                    </div>
                )}


            </div>

            {/* Date Filter Modal */}
            <DateFilterModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onApply={(start, end, quickOption) => {
                    setStartDate(start);
                    setEndDate(end);
                    setSelectedQuickOption(quickOption);
                }}
                initialStartDate={startDate}
                initialEndDate={endDate}
                initialQuickOption={selectedQuickOption}
            />

            {/* Print Summary Modal */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b-2 border-naqupos-accent/20 bg-gradient-to-r from-naqupos-cream/30 to-white">
                            <h3 className="text-2xl font-serif font-bold text-naqupos-dark">Cetak Ringkasan</h3>
                            <button onClick={() => setIsPrintModalOpen(false)} className="p-2 hover:bg-naqupos-secondary/30 rounded-full transition-colors">
                                <X size={24} className="text-naqupos-dark" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 p-4 bg-naqupos-cream/20 border-b border-naqupos-accent/20">
                            <button
                                onClick={() => setPrintTab('register')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${printTab === 'register'
                                    ? 'bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white shadow-md'
                                    : 'bg-white text-naqupos-dark hover:bg-naqupos-secondary/30'
                                    }`}
                            >
                                Register
                            </button>
                            <button
                                onClick={() => setPrintTab('transaksi')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${printTab === 'transaksi'
                                    ? 'bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white shadow-md'
                                    : 'bg-white text-naqupos-dark hover:bg-naqupos-secondary/30'
                                    }`}
                            >
                                Transaksi
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-naqupos-dark mb-2">Tanggal Mulai</label>
                                        <input
                                            type="date"
                                            value={formatDateInput(printStartDate)}
                                            onChange={(e) => {
                                                const newStart = new Date(e.target.value);
                                                setPrintStartDate(newStart);
                                                if (printEndDate < newStart) {
                                                    setPrintEndDate(newStart);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 border-2 border-naqupos-accent/30 rounded-lg focus:border-naqupos-primary outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-naqupos-dark mb-2">Tanggal Akhir</label>
                                        <input
                                            type="date"
                                            value={formatDateInput(printEndDate)}
                                            onChange={(e) => setPrintEndDate(new Date(e.target.value))}
                                            min={formatDateInput(printStartDate)}
                                            className="w-full px-4 py-2.5 border-2 border-naqupos-accent/30 rounded-lg focus:border-naqupos-primary outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="bg-naqupos-cream/20 p-4 rounded-lg border border-naqupos-accent/20">
                                    <p className="text-sm text-naqupos-dark">
                                        <strong>Preview:</strong> Laporan akan mencetak data {printTab === 'register' ? 'Register' : 'Transaksi'} dari {formatDateDisplay(printStartDate)} sampai {formatDateDisplay(printEndDate)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t-2 border-naqupos-accent/20 bg-naqupos-cream/10 flex justify-between">
                            <button
                                onClick={() => setIsPrintModalOpen(false)}
                                className="px-6 py-3 border-2 border-naqupos-accent/30 bg-white rounded-lg text-sm font-semibold hover:bg-naqupos-secondary/20 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={executePrint}
                                className="px-6 py-3 bg-gradient-to-r from-naqupos-primary to-naqupos-accent text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                                Cetak
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
