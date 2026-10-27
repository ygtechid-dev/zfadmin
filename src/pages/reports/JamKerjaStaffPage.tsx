import { useBranchSync } from '../../hooks/useBranchSync';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { formatDateYMD } from '../../utils/date';
import { api } from '../../services/api';

interface WorkLog {
    id: number;
    durasi: string; // e.g., "10 Jam, 30 Menit"
    mulai: string;
    berakhir: string;
    lokasi: string;
    date: string; // Helper for sorting/filtering
}

interface StaffData {
    id: number;
    name: string;
    totalDurationHours: number;
    logs: WorkLog[];
}

const StaffWorkLogTable = ({ staff }: { staff: StaffData }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const totalItems = staff.logs.length;
    const paginatedLogs = staff.logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">{staff.name}</h3>
                <span className="text-sm font-semibold text-gray-600">Total durations: {staff.totalDurationHours} Hours</span>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left">Durasi</th>
                            <th className="px-6 py-3 text-left">Mulai</th>
                            <th className="px-6 py-3 text-left">Berakhir</th>
                            <th className="px-6 py-3 text-left">Lokasi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedLogs.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">No logs data</td></tr>
                        ) : (
                            paginatedLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-900">{log.durasi}</td>
                                    <td className="px-6 py-4 text-gray-600">{log.mulai}</td>
                                    <td className="px-6 py-4 text-gray-600">{log.berakhir}</td>
                                    <td className="px-6 py-4 text-gray-600">{log.lokasi}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4">
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>
        </div>
    );
};

export default function JamKerjaStaffPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    // Filters
    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [selectedStaffIds, setSelectedStaffIds] = useState<number | null>(null); // Null means all

    // Data
    const [allStaffData, setAllStaffData] = useState<StaffData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

                const result = await api.getStaffAttendance(params);
                setAllStaffData(result.data || []);
            } catch (err) {
                console.error('Error fetching staff attendance:', err);
                setError('Gagal memuat data. Silakan coba lagi.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranchId, startDate, endDate]);

    // Filtered Staff (Client-side filtering for specific staff selection from the fetched list)
    const filteredStaff = useMemo(() => {
        if (selectedStaffIds === null) return allStaffData;
        return allStaffData.filter(s => s.id === selectedStaffIds);
    }, [allStaffData, selectedStaffIds]);


    const handleDateApply = (start: Date, end: Date, option: string) => {
        setStartDate(start);
        setEndDate(end);
        setQuickOption(option);
    };

    const handleBranchChange = (branchId: number | null) => {
        setSelectedBranchId(branchId);
    };
    const exportToCSV = () => {
        let csv = `Jam Kerja Staff\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        filteredStaff.forEach(staff => {
            csv += `Staff: ${staff.name} (Total: ${staff.totalDurationHours} Hours)\n`;
            csv += 'Durasi,Mulai,Berakhir,Lokasi\n';
            staff.logs.forEach(log => {
                csv += `${log.durasi},${log.mulai},${log.berakhir},${log.lokasi}\n`;
            });
            csv += '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `jam_kerja_staff.csv`;
        link.click();
    };


    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Jam Kerja Staff</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        filteredStaff.forEach(staff => {
            html += `<h3>Staff: ${staff.name} (Total: ${staff.totalDurationHours} Hours)</h3>`;
            html += `<table border="1"><thead><tr><th>Durasi</th><th>Mulai</th><th>Berakhir</th><th>Lokasi</th></tr></thead><tbody>`;
            staff.logs.forEach(log => {
                html += `<tr><td>${log.durasi}</td><td>${log.mulai}</td><td>${log.berakhir}</td><td>${log.lokasi}</td></tr>`;
            });
            html += `</tbody></table><br/>`;
        });
        html += `</body></html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `jam_kerja_staff.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Jam Kerja Staff</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}h3{margin-top:20px}</style>
        </head><body>
        <h2>Jam Kerja Staff</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        ${filteredStaff.map(staff => `
            <h3>Staff: ${staff.name} (Total: ${staff.totalDurationHours} Hours)</h3>
            <table><thead><tr><th>Durasi</th><th>Mulai</th><th>Berakhir</th><th>Lokasi</th></tr></thead><tbody>
            ${staff.logs.map(log => `<tr><td>${log.durasi}</td><td>${log.mulai}</td><td>${log.berakhir}</td><td>${log.lokasi}</td></tr>`).join('')}
            </tbody></table>
        `).join('')}
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
                <h1 className="text-xl font-bold text-gray-800">Jam kerja staff</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                {/* Staff Selector - Based on fetched data */}
                <SearchableSelect
                    value={selectedStaffIds || ''}
                    onChange={(val) => setSelectedStaffIds(val ? Number(val) : null)}
                    options={[
                        { value: '', label: 'Semua Staff' },
                        ...allStaffData.map(s => ({ value: s.id, label: s.name }))
                    ]}
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
                        onExportCSV={exportToCSV}
                        onExportExcel={exportToExcel}
                        onExportPDF={exportToPDF}
                    />
                </div>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-cyan-500" size={32} /><span className="ml-3 text-gray-500">Memuat data...</span></div>
                ) : error ? (
                    <div className="flex items-center justify-center py-12 text-red-500">{error}</div>
                ) : filteredStaff.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-gray-500">No data available for the selected period.</div>
                ) : (
                    filteredStaff.map(staff => (
                        <StaffWorkLogTable key={staff.id} staff={staff} />
                    ))
                )}
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
