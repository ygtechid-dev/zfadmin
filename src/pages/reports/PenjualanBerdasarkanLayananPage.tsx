import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import BookingReceiptModal from '../../components/common/BookingReceiptModal';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface ByDetailedService {
    id: number;
    noReceipt: string;
    noFaktur: string;
    date: string;
    resource: string;
    soldBy: string;
    servedBy: string;
    source: string;
    type: string;
    customer: string;
    qty: number;
    price: number;
    subtotal: number;
    discount: number;
    tax: number;
    voucher: number;
    total: number;
}

interface Summary {
    totalCount: number;
    totalQty: number;
    totalSubtotal: number;
    totalDiscount: number;
    totalTax: number;
    totalVoucher: number;
    totalOrder: number;
    totalSales: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export default function PenjualanBerdasarkanLayananPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

    const [allData, setAllData] = useState<ByDetailedService[]>([]);
    const [summary, setSummary] = useState<Summary>({
        totalCount: 0,
        totalQty: 0,
        totalSubtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        totalVoucher: 0,
        totalOrder: 0,
        totalSales: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paginatedData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = allData.length;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params: Record<string, string> = {
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate)
                };
                if (selectedBranchId) {
                    params.branch_id = selectedBranchId.toString();
                }

                const result = await api.getSalesByServiceDetailed(params);
                setAllData(result.data || []);
                setSummary(result.summary || {
                    totalCount: 0,
                    totalQty: 0,
                    totalSubtotal: 0,
                    totalDiscount: 0,
                    totalTax: 0,
                    totalVoucher: 0,
                    totalOrder: 0,
                    totalSales: 0
                });
            } catch (err) {
                console.error('Error fetching detailed sales by service:', err);
                setError('Gagal memuat data. Silakan coba lagi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate]);

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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Laporan Penjualan Berdasarkan Layanan</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector selectedBranchId={selectedBranchId} onBranchChange={handleBranchChange} showAllOption={true} />
                <button onClick={() => setShowDateModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Calendar size={16} className="text-gray-500" />
                    <span>{quickOption === '7_days' ? '7 hari sebelumnya, ' : ''}{formatDateRangeDisplay(startDate, endDate)}</span>
                </button>
                <div className="ml-auto">
                    <ExportDropdown onExportCSV={() => alert("Export CSV")} onExportExcel={() => alert("Export Excel")} onExportPDF={() => alert("Export PDF")} />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Ringkasan</h2>
                {loading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-cyan-500" size={24} /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-600">Jumlah Total</span>
                            <span className="font-medium text-gray-900">{summary.totalCount}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-600">QTY Layanan</span>
                            <span className="font-medium text-gray-900">{summary.totalQty}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-600">Harga subtotal</span>
                            <span className="font-medium text-gray-900">{formatCurrency(summary.totalSubtotal)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-600">Total Jumlah Diskon</span>
                            <span className="font-medium text-gray-900">{formatCurrency(summary.totalDiscount)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-600">Total pajak</span>
                            <span className="font-medium text-gray-900">{formatCurrency(summary.totalTax)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-600">Total penjualan berdasarkan penggunaan voucher</span>
                            <span className="font-medium text-gray-900">{formatCurrency(summary.totalVoucher)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-600">Total order</span>
                            <span className="font-medium text-gray-900">{summary.totalOrder}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-600">Total diskon penjualan</span>
                            <span className="font-medium text-gray-900">{formatCurrency(summary.totalDiscount)}</span>
                        </div>
                        <div className="flex justify-between py-2 md:col-span-2 font-bold text-naqupos-primary">
                            <span>TOTAL SALES</span>
                            <span>{formatCurrency(summary.totalSales)}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-cyan-500" size={32} /><span className="ml-3 text-gray-500">Memuat data...</span></div>
                ) : error ? (
                    <div className="flex items-center justify-center py-12 text-red-500">{error}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left">No. Receipt</th>
                                        <th className="px-4 py-3 text-left">Nomor Faktur</th>
                                        <th className="px-4 py-3 text-left">Tanggal</th>
                                        <th className="px-4 py-3 text-left">Sumberdaya</th>
                                        <th className="px-4 py-3 text-left">Penjualan Oleh</th>
                                        <th className="px-4 py-3 text-left">Dilayani Oleh</th>
                                        <th className="px-4 py-3 text-left">Sumber</th>
                                        <th className="px-4 py-3 text-left">Tipe</th>
                                        <th className="px-4 py-3 text-left">Pelanggan</th>
                                        <th className="px-4 py-3 text-right">Qty</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                        <th className="px-4 py-3 text-right">Diskon</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr><td colSpan={13} className="px-6 py-12 text-center text-gray-400">Tidak ada data layanan</td></tr>
                                    ) : (
                                        paginatedData.map((d) => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 text-gray-600">{d.noReceipt}</td>
                                                <td className="px-4 py-4 text-blue-600 hover:underline cursor-pointer" onClick={() => setSelectedInvoice(d.noFaktur)}>{d.noFaktur}</td>
                                                <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{d.date}</td>
                                                <td className="px-4 py-4 text-gray-900 font-medium">{d.resource}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.soldBy}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.servedBy}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.source === 'ONLINE' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                                        {d.source}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 capitalize">{d.type.replace('_', ' ')}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.customer}</td>
                                                <td className="px-4 py-4 text-right text-gray-900">{d.qty}</td>
                                                <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.subtotal)}</td>
                                                <td className="px-4 py-4 text-right text-red-500">{formatCurrency(d.discount + d.voucher)}</td>
                                                <td className="px-4 py-4 text-right text-gray-900 font-semibold">{formatCurrency(d.total)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
                    </>
                )}
            </div>

            <DateFilterModal isOpen={showDateModal} onClose={() => setShowDateModal(false)} onApply={handleDateApply} initialStartDate={startDate} initialEndDate={endDate} initialQuickOption={quickOption} />

            <BookingReceiptModal
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                invoiceNumber={selectedInvoice}
            />
        </div>
    );
}
