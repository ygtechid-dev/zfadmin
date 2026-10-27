import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';

interface InvoiceData {
    id: number;
    lokasi: string;
    pelanggan: string;
    jatuhTempo: number;
    tglFaktur: string;
    tglJatuhTempo: string;
    kotor: number;
    status: 'UNPAID' | 'PART PAID';
    terlambat: string;
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

export default function FakturBelumSelesaiPage() {
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
    const [allData, setAllData] = useState<InvoiceData[]>([]);
    const [summaryData, setSummaryData] = useState({
        totalGros: 0,
        jumlahJatuhTempo: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.getUnsettledInvoices({
                    branch_id: selectedBranchId,
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate)
                });

                if (response) {
                    setAllData(response.invoices || []);
                    if (response.summary) {
                        setSummaryData({
                            totalGros: Number(response.summary.totalGros) || 0,
                            jumlahJatuhTempo: Number(response.summary.jumlahJatuhTempo) || 0
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch unsettled invoices", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedBranchId, startDate, endDate]);

    const filteredData = allData;

    const totalItems = filteredData.length;
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        let csv = `Faktur Belum Selesai - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Lokasi,Pelanggan,Jumlah Jatuh Tempo,Tanggal Faktur,Tanggal Jatuh Tempo,Kotor,Status,Terlambat\n';
        filteredData.forEach(d => {
            csv += `${d.lokasi},${d.pelanggan},${d.jatuhTempo},${d.tglFaktur},${d.tglJatuhTempo},${d.kotor},${d.status},${d.terlambat}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `faktur_belum_selesai_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Faktur Belum Selesai - ${selectedBranchName}</h2>`;
        html += `<table border="1"><tr><th>Lokasi</th><th>Pelanggan</th><th>Jumlah Jatuh Tempo</th><th>Tanggal Faktur</th><th>Tanggal Jatuh Tempo</th><th>Kotor</th><th>Status</th><th>Terlambat</th></tr>`;
        filteredData.forEach(d => {
            html += `<tr><td>${d.lokasi}</td><td>${d.pelanggan}</td><td>${formatCurrency(d.jatuhTempo)}</td><td>${d.tglFaktur}</td><td>${d.tglJatuhTempo}</td><td>${formatCurrency(d.kotor)}</td><td>${d.status}</td><td>${d.terlambat}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `faktur_belum_selesai_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Faktur Belum Selesai</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5}</style>
        </head><body>
        <h2>Faktur Belum Selesai - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <p><strong>Total Gros:</strong> ${formatCurrency(summaryData.totalGros)} | <strong>Jatuh Tempo:</strong> ${formatCurrency(summaryData.jumlahJatuhTempo)}</p>
        <table><thead><tr><th>Lokasi</th><th>Pelanggan</th><th>Jatuh Tempo</th><th>Tgl Faktur</th><th>Tgl Jatuh Tempo</th><th>Kotor</th><th>Status</th><th>Terlambat</th></tr></thead><tbody>
        ${filteredData.map(d => `<tr><td>${d.lokasi}</td><td>${d.pelanggan}</td><td style="text-align:right">${formatCurrency(d.jatuhTempo)}</td><td>${d.tglFaktur}</td><td>${d.tglJatuhTempo}</td><td style="text-align:right">${formatCurrency(d.kotor)}</td><td>${d.status}</td><td>${d.terlambat}</td></tr>`).join('')}
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
                <h1 className="text-xl font-bold text-gray-800">Faktur yang belum diselesaikan</h1>
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
                    <div className="flex justify-between text-base px-2 bg-gray-50 py-2 rounded">
                        <span className="font-bold">Total Gros</span>
                        <span className="font-bold">{formatCurrency(summaryData.totalGros)}</span>
                    </div>
                    <div className="flex justify-between text-sm px-2 py-1">
                        <span className="font-bold text-gray-800">Jumlah jatuh tempo</span>
                        <span className="font-bold text-gray-800">{formatCurrency(summaryData.jumlahJatuhTempo)}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 text-left">Lokasi</th>
                                <th className="px-4 py-3 text-left">Pelanggan</th>
                                <th className="px-4 py-3 text-right">Jumlah Jatuh Tempo</th>
                                <th className="px-4 py-3 text-left">Tanggal Faktur</th>
                                <th className="px-4 py-3 text-left">Tanggal Jatuh Tempo</th>
                                <th className="px-4 py-3 text-right">Kotor</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">Terlambat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">No Data</td></tr>
                            ) : (
                                paginatedData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{d.lokasi}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{d.pelanggan}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(d.jatuhTempo)}</td>
                                        <td className="px-4 py-3">{d.tglFaktur}</td>
                                        <td className="px-4 py-3">{d.tglJatuhTempo}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(d.kotor)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${d.status === 'UNPAID' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-500">{d.terlambat}</td>
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
