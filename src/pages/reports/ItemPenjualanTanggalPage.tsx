import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';

interface SalesItemByDate {
    id: number;
    qty: number;
    grossSales: number;
    discount: number;
    discountAmount: number;
    salesDiscount: number;
    tax: number;
    voucherUsage: number;
    totalSales: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const generateDummyData = (): SalesItemByDate[] => {
    const prices = [25000.00, 50000.00, 218000.00, 90000.00, 105000.00, 165000.00];

    return Array.from({ length: 240 }, (_, i) => ({
        id: i + 1,
        qty: 1.00,
        grossSales: prices[i % prices.length],
        discount: 0,
        discountAmount: 0,
        salesDiscount: 0,
        tax: 0,
        voucherUsage: 0,
        totalSales: prices[i % prices.length]
    }));
};

export default function ItemPenjualanTanggalPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Use Table 2 by default (matching 4th screenshot)
    const [allData] = useState(generateDummyData);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Item penjualan berdasarkan tanggal</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />
                <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[150px] outline-none focus:border-cyan-500">
                    <option value="">Semua Staff</option>
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
                        onExportCSV={() => alert("Export CSV")}
                        onExportExcel={() => alert("Export Excel")}
                        onExportPDF={() => alert("Export PDF")}
                    />
                </div>
            </div>

            {/* Summary Section */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Ringkasan</h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-600">Jumlah Total</span>
                        <span className="font-medium text-gray-900">477,00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-600">Harga Subtotal</span>
                        <span className="font-medium text-gray-900">51.364.000,00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-600">Total Jumlah Diskon</span>
                        <span className="font-medium text-gray-900">0</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-600">Diskon Total Penjualan</span>
                        <span className="font-medium text-gray-900">400.000,00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-600">Total Pajak</span>
                        <span className="font-medium text-gray-900">0</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-600">Total Penjualan Berdasarkan Penggunaan Voucher</span>
                        <span className="font-medium text-gray-900">0</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-600">Total Order</span>
                        <span className="font-medium text-gray-900">50.964.000,01</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-gray-600">Total Diskon Penjualan</span>
                        <span className="font-medium text-gray-900">-400.000,00</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">QTY <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Penjualan Kotor <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Diskon <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Jumlah Diskon <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Diskon Penjualan <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Pajak <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Penggunaan Voucher <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">Total Penjualan <ArrowUpDown size={12} /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.map((d) => (
                                <tr key={d.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 text-right text-gray-900">{d.qty.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.grossSales)}</td>
                                    <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.discount)}</td>
                                    <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.discountAmount)}</td>
                                    <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.salesDiscount)}</td>
                                    <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.tax)}</td>
                                    <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.voucherUsage)}</td>
                                    <td className="px-4 py-4 text-right text-gray-900">{formatCurrency(d.totalSales)}</td>
                                </tr>
                            ))}
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
