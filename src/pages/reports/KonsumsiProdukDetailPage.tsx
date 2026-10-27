import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';

interface ProductConsumptionDetail {
    id: number;
    date: string;
    location: string;
    staff: string;
    qty: number;
    costPrice: number;
    totalCost: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const generateDummyData = (): ProductConsumptionDetail[] => {
    const staffNames = ['Dewinta Pratiwi', 'Ayu Pamungkas', 'Febriana Dyah', 'Zahra Niisa'];

    return Array.from({ length: 25 }, (_, i) => {
        const qty = Math.floor(Math.random() * 5) + 1;
        const cost = Math.floor(Math.random() * 10000) + 5000;

        return {
            id: i + 1,
            date: `0${(i % 7) + 6} Jan 2026`,
            location: 'Naqupos Spa Solo',
            staff: staffNames[i % staffNames.length],
            qty: qty,
            costPrice: cost,
            totalCost: qty * cost
        };
    });
};

export default function KonsumsiProdukDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data
    const [allData] = useState(generateDummyData);
    const paginatedData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = allData.length;

    // Calculate summary
    const totalQty = allData.reduce((sum, d) => sum + d.qty, 0);
    const totalCost = allData.reduce((sum, d) => sum + d.totalCost, 0);
    const avgCostPrice = totalItems > 0 ? totalCost / totalQty : 0;

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

    // Product name based on id
    const productNames = [
        'Minyak Pijat Aromaterapi', 'Lulur Mandi Tradisional', 'Masker Wajah Bengkoang', 'Shampoo Herbal',
        'Lilin Aromaterapi', 'Kapas Pembersih', 'Tissue Wajah', 'Handuk Kecil'
    ];
    const productName = productNames[(parseInt(id || '1') - 1) % productNames.length];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports/konsumsi-produk')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Detail Konsumsi - {productName}</h1>
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
                <h3 className="font-medium text-gray-700 mb-4">Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Total QTY</p>
                        <p className="text-lg font-semibold text-gray-900">{totalQty}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Avg Cost Price</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(avgCostPrice)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Total Biaya</p>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(totalCost)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Total Records</p>
                        <p className="text-lg font-semibold text-gray-900">{totalItems}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3 text-left">Tanggal</th>
                                <th className="px-6 py-3 text-left">Lokasi</th>
                                <th className="px-6 py-3 text-left">Staff</th>
                                <th className="px-6 py-3 text-right">QTY</th>
                                <th className="px-6 py-3 text-right">Cost Price</th>
                                <th className="px-6 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 text-gray-600">{d.date}</td>
                                        <td className="px-6 py-3 text-gray-600">{d.location}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900">{d.staff}</td>
                                        <td className="px-6 py-3 text-right">{d.qty}</td>
                                        <td className="px-6 py-3 text-right">{formatCurrency(d.costPrice)}</td>
                                        <td className="px-6 py-3 text-right font-medium text-green-600">{formatCurrency(d.totalCost)}</td>
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
