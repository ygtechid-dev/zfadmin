import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';

interface KasRegisterData {
    id: number;
    openDate: string;
    closeDate: string;
    staff: string;
    expected: number;
    counted: number;
    diff: number;
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

import { api } from '../../services/api';
import { useEffect } from 'react';
import { formatDateYMD } from '../../utils/date';

export default function PergerakanKasRegisterPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

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
    const [allData, setAllData] = useState<KasRegisterData[]>([]);
    const [summaryData, setSummaryData] = useState({
        totalDiharapkan: 0,
        totalTerhitung: 0,
        totalPerbedaan: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.getCashRegisterMovement({
                    branch_id: selectedBranchId,
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate)
                });

                if (response) {
                    setAllData(response.movements || []);
                    if (response.summary) {
                        setSummaryData({
                            totalDiharapkan: Number(response.summary.totalDiharapkan) || 0,
                            totalTerhitung: Number(response.summary.totalTerhitung) || 0,
                            totalPerbedaan: Number(response.summary.totalPerbedaan) || 0
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch cash register movements", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedBranchId, startDate, endDate]);

    const totalItems = allData.length;
    const paginatedData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        let csv = `Pergerakan Kas Register - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Open Date,Close Date,Staff,Diharapkan,Terhitung,Perbedaan\n';
        allData.forEach(d => {
            csv += `${d.openDate},${d.closeDate},${d.staff},${d.expected},${d.counted},${d.diff}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pergerakan_kas_register_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Pergerakan Kas Register - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<p><strong>Total Diharapkan: ${formatCurrency(summaryData.totalDiharapkan)}</strong></p>`;
        html += `<table border="1"><tr><th>Open Date</th><th>Close Date</th><th>Staff</th><th>Diharapkan</th><th>Terhitung</th><th>Perbedaan</th></tr>`;
        allData.forEach(d => {
            html += `<tr><td>${d.openDate}</td><td>${d.closeDate}</td><td>${d.staff}</td><td style="text-align:right">${formatCurrency(d.expected)}</td><td style="text-align:right">${formatCurrency(d.counted)}</td><td style="text-align:right">${formatCurrency(d.diff)}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pergerakan_kas_register_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Pergerakan Kas Register</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px}th{background:#f5f5f5;text-align:left}.diff{color:red}</style>
        </head><body>
        <h2>Pergerakan Kas Register - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <div style="margin-bottom:15px">
            <p><strong>Total Diharapkan:</strong> Rp ${formatCurrency(summaryData.totalDiharapkan)}</p>
            <p><strong>Total Terhitung:</strong> Rp ${formatCurrency(summaryData.totalTerhitung)}</p>
            <p><strong>Total Perbedaan:</strong> <span class="${summaryData.totalPerbedaan !== 0 ? 'diff' : ''}">Rp ${formatCurrency(summaryData.totalPerbedaan)}</span></p>
        </div>
        <table><thead><tr><th>Open Date</th><th>Close Date</th><th>Staff</th><th style="text-align:right">Diharapkan</th><th style="text-align:right">Terhitung</th><th style="text-align:right">Perbedaan</th></tr></thead><tbody>
        ${allData.map(d => `<tr><td>${d.openDate}</td><td>${d.closeDate}</td><td>${d.staff}</td><td style="text-align:right">${formatCurrency(d.expected)}</td><td style="text-align:right">${formatCurrency(d.counted)}</td><td style="text-align:right" class="${d.diff !== 0 ? 'diff' : ''}">${formatCurrency(d.diff)}</td></tr>`).join('')}
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
                <h1 className="text-xl font-bold text-gray-800">Pergerakan Kas Register</h1>
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
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-medium text-gray-700">Summary</div>
                <div className="p-4 space-y-2">
                    <div className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                        <span className="font-bold text-gray-700">Total diharapkan</span>
                        <span className="font-bold text-gray-700">{formatCurrency(summaryData.totalDiharapkan)}</span>
                    </div>
                    <div className="flex justify-between text-sm px-2">
                        <span className="font-bold text-gray-700">Total Terhitung</span>
                        <span className="font-bold text-gray-700">{formatCurrency(summaryData.totalTerhitung)}</span>
                    </div>
                    <div className="flex justify-between text-base px-2 pt-1">
                        <span className="font-bold text-gray-700">Total perbedaan</span>
                        <span className={`font-bold ${summaryData.totalPerbedaan !== 0 ? 'text-red-600' : 'text-gray-700'}`}>
                            {formatCurrency(summaryData.totalPerbedaan)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 text-left">Open Date</th>
                                <th className="px-4 py-3 text-left">Close Date</th>
                                <th className="px-4 py-3 text-left">Staff</th>
                                <th className="px-4 py-3 text-right">Diharapkan</th>
                                <th className="px-4 py-3 text-right">Terhitung</th>
                                <th className="px-4 py-3 text-right">Perbedaan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{d.openDate}</td>
                                        <td className="px-4 py-3">{d.closeDate}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{d.staff}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(d.expected)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(d.counted)}</td>
                                        <td className={`px-4 py-3 text-right font-medium ${d.diff !== 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                            {formatCurrency(d.diff)}
                                        </td>
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
