import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';

interface DiscountData {
    id: number;
    name: string;
    itemDisc: number;
    itemValue: number;
    amount: number;
    refund: number;
    net: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

// Removed dummy data generation
// const generateDummyData = ...

import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';
import { useEffect } from 'react';

export default function RingkasanDiskonPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data
    const [allData, setAllData] = useState<DiscountData[]>([]);
    const [summaryData, setSummaryData] = useState({
        totalDiskon: 0,
        totalNet: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.getDiscountSummary({
                    branch_id: selectedBranchId,
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate)
                });

                if (response) {
                    setAllData(response.discounts || []);
                    if (response.total_net !== undefined) {
                        setSummaryData({
                            totalDiskon: response.discounts ? response.discounts.reduce((sum: number, d: any) => sum + Number(d.amount), 0) : 0,
                            totalNet: Number(response.total_net) || 0
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch discount summary", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedBranchId, startDate, endDate]);

    const paginatedData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = allData.length;

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start);
        setEndDate(end);
        setQuickOption(option);
        setCurrentPage(1);
    };

    const handleBranchChange = (branchId: number | null, branchName: string) => {
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        let csv = `Ringkasan Diskon - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Nama,Diskon Barang,Nilai Barang,Jumlah Diskon,Pengembalian Diskon,Diskon Bersih\n';
        allData.forEach(d => {
            csv += `${d.name},${d.itemDisc},${d.itemValue},${d.amount},${d.refund},${d.net}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ringkasan_diskon_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Ringkasan Diskon - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<p><strong>Total Diskon Bersih: ${formatCurrency(summaryData.totalNet)}</strong></p>`;
        html += `<table border="1"><tr><th>Nama</th><th>Diskon Barang</th><th>Nilai Barang</th><th>Jumlah Diskon</th><th>Pengembalian</th><th>Diskon Bersih</th></tr>`;
        allData.forEach(d => {
            html += `<tr><td>${d.name}</td><td>${d.itemDisc}</td><td style="text-align:right">${formatCurrency(d.itemValue)}</td><td style="text-align:right">${formatCurrency(d.amount)}</td><td style="text-align:right">${formatCurrency(d.refund)}</td><td style="text-align:right">${formatCurrency(d.net)}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ringkasan_diskon_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Ringkasan Diskon</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
        </head><body>
        <h2>Ringkasan Diskon - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <div style="margin-bottom:15px">
            <p><strong>Total Diskon Bersih:</strong> Rp ${formatCurrency(summaryData.totalNet)}</p>
        </div>
        <table><thead><tr><th>Nama</th><th>Qty</th><th style="text-align:right">Nilai Barang</th><th style="text-align:right">Jml Diskon</th><th style="text-align:right">Refund</th><th style="text-align:right">Net</th></tr></thead><tbody>
        ${allData.map(d => `<tr><td>${d.name}</td><td>${d.itemDisc}</td><td style="text-align:right">${formatCurrency(d.itemValue)}</td><td style="text-align:right">${formatCurrency(d.amount)}</td><td style="text-align:right">${formatCurrency(d.refund)}</td><td style="text-align:right">${formatCurrency(d.net)}</td></tr>`).join('')}
        </tbody></table>
        <script>window.onload=function(){window.print()}</script></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Ringkasan diskon</h1>
                {isLoading && <span className="text-sm text-gray-500 ml-2">Loading...</span>}
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
                    <ExportDropdown onExportCSV={exportToCSV} onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="font-medium text-gray-700 mb-2">Summary</h3>
                {totalItems === 0 ? (
                    <p className="text-gray-500 text-sm">No data</p>
                ) : (
                    <div className="flex justify-between text-sm">
                        <span>Total Diskon Bersih</span>
                        <span className="font-bold text-green-600">{formatCurrency(summaryData.totalNet)}</span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3 text-left">Nama</th>
                                <th className="px-6 py-3 text-center">Diskon Barang</th>
                                <th className="px-6 py-3 text-right">Nilai Barang</th>
                                <th className="px-6 py-3 text-right">Jumlah Diskon</th>
                                <th className="px-6 py-3 text-right">Pengembalian Diskon</th>
                                <th className="px-6 py-3 text-right">Diskon Bersih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-gray-900">{d.name}</td>
                                        <td className="px-6 py-3 text-center">{d.itemDisc}</td>
                                        <td className="px-6 py-3 text-right">{formatCurrency(d.itemValue)}</td>
                                        <td className="px-6 py-3 text-right">{formatCurrency(d.amount)}</td>
                                        <td className="px-6 py-3 text-right">{formatCurrency(d.refund)}</td>
                                        <td className="px-6 py-3 text-right font-medium text-green-600">{formatCurrency(d.net)}</td>
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
