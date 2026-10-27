import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import BookingReceiptModal from '../../components/common/BookingReceiptModal';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface PromoRedemption {
    id: number;
    name: string;
    discountValue: string;
    code: string;
    invoiceNo: string;
    customer: string;
    usedDate: string;
}

interface Summary {
    totalRedemptions: number;
}

export default function PenukaranVoucherPromoPage() {
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

    const [allData, setAllData] = useState<PromoRedemption[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalRedemptions: 0 });
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
                if (selectedBranchId) params.branch_id = selectedBranchId.toString();

                const result = await api.getVoucherPromoRedemption(params);
                setAllData(result.data || []);
                setSummary(result.summary || { totalRedemptions: 0 });
            } catch (err) {
                console.error('Error fetching promo redemptions:', err);
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
                <h1 className="text-xl font-bold text-gray-800">Penukaran Voucher Promo</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
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
                        onExportCSV={() => alert("Export CSV")}
                        onExportExcel={() => alert("Export Excel")}
                        onExportPDF={() => alert("Export PDF")}
                    />
                </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-medium text-gray-700 mb-2">Summary</h3>
                {loading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-cyan-500" size={24} /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total Penukaran</p>
                            <p className="text-lg font-bold text-gray-800">{summary.totalRedemptions}</p>
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
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nama <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nilai Diskon <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Kode <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">No Faktur <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nama Pelanggan <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-left"><div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal Digunakan <ArrowUpDown size={12} /></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                                    ) : (
                                        paginatedData.map((d) => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">{d.name}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.discountValue}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.code}</td>
                                                <td className="px-6 py-4 text-blue-600 hover:underline cursor-pointer" onClick={() => setSelectedInvoice(d.invoiceNo)}>{d.invoiceNo}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.customer}</td>
                                                <td className="px-6 py-4 text-gray-600">{d.usedDate}</td>
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
