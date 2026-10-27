import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';

interface LabaRugiRow {
    name: string;
    amount: number;
    bold?: boolean;
    indent?: number;
    textAmount?: string;
    isNegative?: boolean;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

// Removed dummy data generation
// const generateData = ...

import { api } from '../../services/api';
import { useEffect } from 'react';
import { useBranchSync } from '../../hooks/useBranchSync';
import { formatDateYMD } from '../../utils/date';

export default function LabaRugiPenjualanPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync<number | null>(undefined, null);
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');

    useEffect(() => {
        if (!selectedBranchId) {
            setSelectedBranchName('Semua Cabang');
            return;
        }
        api.getBranches().then(branches => {
            const branch = branches.find(b => b.id === selectedBranchId);
            if (branch) setSelectedBranchName(branch.name);
        });
    }, [selectedBranchId]);

    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Data
    const [rows, setRows] = useState<LabaRugiRow[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.getSalesProfitLoss({
                    branch_id: selectedBranchId,
                    date_from: formatDateYMD(startDate),
                    date_to: formatDateYMD(endDate)
                });

                if (response && response.rows) {
                    setRows(response.rows);
                }
            } catch (error) {
                console.error("Failed to fetch sales profit loss", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedBranchId, startDate, endDate]);

    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start);
        setEndDate(end);
        setQuickOption(option);
    };

    const handleBranchChange = (branchId: number | null, branchName: string) => {
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
    };

    const exportToCSV = () => {
        let csv = `Penjualan Laba Rugi - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Keterangan,Nilai\n';
        rows.forEach(r => {
            const indent = r.indent ? '  ' : '';
            csv += `"${indent}${r.name}",${r.amount}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `laba_rugi_penjualan.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Penjualan Laba Rugi - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1"><tr><th>Keterangan</th><th>Nilai</th></tr>`;
        rows.forEach(r => {
            const style = r.bold ? 'font-weight:bold;' : '';
            const padding = r.indent ? 'padding-left:20px;' : '';
            const color = r.isNegative ? 'color:red;' : '';
            html += `<tr><td style="${style}${padding}">${r.name}</td><td style="text-align:right;${style}${color}">${r.textAmount || formatCurrency(r.amount)}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `laba_rugi_penjualan.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Penjualan Laba Rugi</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.bold{font-weight:bold;background:#fafafa}.indent{padding-left:30px}.right{text-align:right}.red{color:red}</style>
        </head><body>
        <h2>Penjualan Laba Rugi - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <table><thead><tr><th>Keterangan</th><th class="right">Nilai</th></tr></thead><tbody>
        ${rows.map(r => `<tr class="${r.bold ? 'bold' : ''}"><td class="${r.indent ? 'indent' : ''}">${r.name}</td><td class="right ${r.isNegative ? 'red' : ''}">${r.textAmount || formatCurrency(r.amount)}</td></tr>`).join('')}
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
                <h1 className="text-xl font-bold text-gray-800">Penjualan berdasarkan Laba Rugi</h1>
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

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-50">
                            {rows.map((row, idx) => (
                                <tr key={idx} className={`hover:bg-gray-50 ${row.bold ? 'bg-gray-50/80 font-semibold' : ''}`}>
                                    <td className={`px-6 py-3 text-gray-800 ${row.indent ? 'pl-10' : ''}`}>
                                        {row.name}
                                    </td>
                                    <td className={`px-6 py-3 text-right ${row.isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                                        {row.textAmount ? row.textAmount : formatCurrency(row.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
