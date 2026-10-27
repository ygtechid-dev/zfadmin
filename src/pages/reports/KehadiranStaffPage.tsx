import { useBranchSync } from '../../hooks/useBranchSync';
import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import ExportDropdown from '../../components/common/ExportDropdown';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { formatDateYMD } from '../../utils/date';

interface AttendanceLog {
    id: number;
    date: string;
    staffName: string;
    scheduleIn: string;
    scheduleOut: string;
    clockIn: string;
    clockOut: string;
    status: 'Hadir' | 'Terlambat' | 'Absen' | 'Izin';
    lateMinutes: number;
}

const generateDummyData = (): AttendanceLog[] => {
    const staffs = ['Amandha Devlinsky', 'Dewi Lestari', 'Budi Santoso', 'Siti Aminah', 'Rina Nose'];
    const statuses: ('Hadir' | 'Terlambat' | 'Absen' | 'Izin')[] = ['Hadir', 'Hadir', 'Terlambat', 'Hadir', 'Izin'];

    return Array.from({ length: 45 }, (_, i) => {
        const status = statuses[i % statuses.length];
        const isLate = status === 'Terlambat';
        return {
            id: i + 1,
            date: `2026-01-${(i % 30) + 1}`,
            staffName: staffs[i % staffs.length],
            scheduleIn: '09:00',
            scheduleOut: '17:00',
            clockIn: status === 'Absen' || status === 'Izin' ? '-' : (isLate ? '09:15' : '08:55'),
            clockOut: status === 'Absen' || status === 'Izin' ? '-' : '17:05',
            status: status,
            lateMinutes: isLate ? 15 : 0
        };
    });
};

export default function KehadiranStaffPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [allData] = useState(generateDummyData);

    const filteredData = selectedStaffId
        ? allData // In real app, filter by staff ID
        : allData;

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItems = filteredData.length;

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

    const exportToCSV = () => {
        let csv = `Kehadiran Staf\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'Tanggal,Staff,Jadwal Masuk,Jadwal Keluar,Jam Masuk,Jam Keluar,Status\n';
        filteredData.forEach(d => {
            csv += `"${d.date}","${d.staffName}","${d.scheduleIn}","${d.scheduleOut}","${d.clockIn}","${d.clockOut}","${d.status}${d.lateMinutes > 0 ? ' (' + d.lateMinutes + 'm)' : ''}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `kehadiran_staff_${formatDateYMD(new Date())}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Kehadiran Staf</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1"><thead><tr><th>Tanggal</th><th>Staff</th><th>Jadwal Masuk</th><th>Jadwal Keluar</th><th>Jam Masuk</th><th>Jam Keluar</th><th>Status</th></tr></thead><tbody>`;
        filteredData.forEach(d => {
            html += `<tr><td>${d.date}</td><td>${d.staffName}</td><td>${d.scheduleIn}</td><td>${d.scheduleOut}</td><td>${d.clockIn}</td><td>${d.clockOut}</td><td>${d.status}${d.lateMinutes > 0 ? ' (' + d.lateMinutes + 'm)' : ''}</td></tr>`;
        });
        html += `</tbody></table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `kehadiran_staff_${formatDateYMD(new Date())}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Kehadiran Staf</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
        </head><body>
        <h2>Kehadiran Staf</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <table><thead><tr><th>Tanggal</th><th>Staff</th><th>Jadwal Masuk</th><th>Jadwal Keluar</th><th>Jam Masuk</th><th>Jam Keluar</th><th>Status</th></tr></thead><tbody>
        ${filteredData.map(d => `<tr><td>${d.date}</td><td>${d.staffName}</td><td>${d.scheduleIn}</td><td>${d.scheduleOut}</td><td>${d.clockIn}</td><td>${d.clockOut}</td><td>${d.status}${d.lateMinutes > 0 ? ' (' + d.lateMinutes + 'm)' : ''}</td></tr>`).join('')}
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
                <h1 className="text-xl font-bold text-gray-800">Kehadiran staf</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
                <BranchSelector
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    showAllOption={true}
                />

                <select
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[150px] outline-none focus:border-cyan-500"
                    onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
                    value={selectedStaffId || ''}
                >
                    <option value="">Semua Staff</option>
                    <option value="1">Amandha Devlinsky</option>
                    <option value="2">Dewi Lestari</option>
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
                        onExportCSV={exportToCSV}
                        onExportExcel={exportToExcel}
                        onExportPDF={exportToPDF}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left">Tanggal</th>
                                <th className="px-6 py-3 text-left">Staff</th>
                                <th className="px-6 py-3 text-center">Jadwal Masuk</th>
                                <th className="px-6 py-3 text-center">Jadwal Keluar</th>
                                <th className="px-6 py-3 text-center">Jam Masuk</th>
                                <th className="px-6 py-3 text-center">Jam Keluar</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.map(d => (
                                <tr key={d.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600">{d.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{d.staffName}</td>
                                    <td className="px-6 py-4 text-center text-gray-500">{d.scheduleIn}</td>
                                    <td className="px-6 py-4 text-center text-gray-500">{d.scheduleOut}</td>
                                    <td className="px-6 py-4 text-center text-gray-900">{d.clockIn}</td>
                                    <td className="px-6 py-4 text-center text-gray-900">{d.clockOut}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'Hadir' ? 'bg-green-100 text-green-700' :
                                            d.status === 'Terlambat' ? 'bg-orange-100 text-orange-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {d.status} {d.lateMinutes > 0 && `(${d.lateMinutes}m)`}
                                        </span>
                                    </td>
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
