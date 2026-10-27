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

interface SalesItem {
    id: number;
    receiptNo: string;
    invoiceNo: string;
    date: string;
    soldBy: string;
    servedBy: string;
    source: string;
    type: string;
    customer: string;
    name: string;
    location: string;
    staffReceiver: string;
    invoiceStatus: string;
    qty: number;
}

export default function PenjualanItemPage() {
    const navigate = useNavigate();
    const initialRange = getInitialDateRange('7_days');

    const { selectedBranchId, setSelectedBranchId } = useBranchSync();
    const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');
    const [startDate, setStartDate] = useState(initialRange.start);
    const [endDate, setEndDate] = useState(initialRange.end);
    const [quickOption, setQuickOption] = useState('7_days');
    const [showDateModal, setShowDateModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

    const [allData, setAllData] = useState<SalesItem[]>([]);
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

                const result = await api.getSalesItem(params);
                setAllData(result.data || []);
            } catch (err) {
                console.error('Error fetching sales item:', err);
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

    const handleBranchChange = (branchId: number | null, branchName: string) => {
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        let csv = `Penjualan Item - ${selectedBranchName}\nPeriode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
        csv += 'No. Receipt,Nomor Faktur,Tanggal,Penjualan Oleh,Dilayani Oleh,Sumber,Tipe,Pelanggan,Nama,Lokasi,Staff Penerima,Status Faktur,QTY\n';
        allData.forEach(d => {
            csv += `${d.receiptNo},${d.invoiceNo},${d.date},${d.soldBy},${d.servedBy},${d.source},${d.type},${d.customer},${d.name},${d.location},${d.staffReceiver},${d.invoiceStatus},${d.qty}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `penjualan_item_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Penjualan Item - ${selectedBranchName}</h2>`;
        html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
        html += `<table border="1"><tr>
            <th>No. Receipt</th><th>Nomor Faktur</th><th>Tanggal</th>
            <th>Penjualan Oleh</th><th>Dilayani Oleh</th><th>Sumber</th>
            <th>Tipe</th><th>Pelanggan</th><th>Nama</th><th>Lokasi</th>
            <th>Staff Penerima</th><th>Status Faktur</th><th>QTY</th>
        </tr>`;
        allData.forEach(d => {
            html += `<tr>
                <td>${d.receiptNo}</td>
                <td>${d.invoiceNo}</td>
                <td>${d.date}</td>
                <td>${d.soldBy}</td>
                <td>${d.servedBy}</td>
                <td>${d.source}</td>
                <td>${d.type}</td>
                <td>${d.customer}</td>
                <td>${d.name}</td>
                <td>${d.location}</td>
                <td>${d.staffReceiver}</td>
                <td>${d.invoiceStatus}</td>
                <td style="text-align:center">${d.qty}</td>
            </tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `penjualan_item_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Penjualan Item</title>
        <style>
            body{font-family:sans-serif;padding:20px}
            table{width:100%;border-collapse:collapse;font-size:11px}
            th,td{border:1px solid #ddd;padding:5px}
            th{background:#f5f5f5;text-align:center}
            .badge{padding:2px 6px;border-radius:9999px;font-size:10px;font-weight:600}
            .badge-green{background:#dcfce7;color:#15803d}
            .badge-yellow{background:#fef9c3;color:#a16207}
        </style>
        </head><body>
        <h2>Penjualan Item - ${selectedBranchName}</h2>
        <p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
        <p><strong>Total Item:</strong> ${allData.length}</p>
        <table>
            <thead>
                <tr>
                    <th>No. Receipt</th><th>Nomor Faktur</th><th>Tanggal</th>
                    <th>Penjualan Oleh</th><th>Dilayani Oleh</th><th>Sumber</th>
                    <th>Tipe</th><th>Pelanggan</th><th>Nama</th><th>Lokasi</th>
                    <th>Staff Penerima</th><th>Status Faktur</th><th>QTY</th>
                </tr>
            </thead>
            <tbody>
                ${allData.map(d => `<tr>
                    <td>${d.receiptNo}</td>
                    <td>${d.invoiceNo}</td>
                    <td>${d.date}</td>
                    <td>${d.soldBy}</td>
                    <td>${d.servedBy}</td>
                    <td>${d.source}</td>
                    <td>${d.type}</td>
                    <td>${d.customer}</td>
                    <td><strong>${d.name}</strong></td>
                    <td>${d.location}</td>
                    <td>${d.staffReceiver}</td>
                    <td style="text-align:center">
                        <span class="badge ${d.invoiceStatus === 'COMPLETED' || d.invoiceStatus === 'PAID' ? 'badge-green' : 'badge-yellow'}">
                            ${d.invoiceStatus}
                        </span>
                    </td>
                    <td style="text-align:center">${d.qty}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        <script>window.onload=function(){window.print()}</script>
        </body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/reports', { state: { tab: 'laporan' } })} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Penjualan item</h1>
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
                        onExportCSV={exportToCSV}
                        onExportExcel={exportToExcel}
                        onExportPDF={exportToPDF}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-cyan-500" size={32} />
                        <span className="ml-3 text-gray-500">Memuat data...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-12 text-red-500">
                        {error}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">No. Receipt <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nomor Faktur <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tanggal <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Penjualan Oleh <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Dilayani Oleh <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Sumber <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Tipe <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Pelanggan <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Nama <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Lokasi <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Staff Penerima <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Status Faktur <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-700">QTY <ArrowUpDown size={12} /></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={13} className="px-4 py-12 text-center text-gray-400">
                                                Tidak ada data
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map((d) => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 text-gray-600 text-xs">{d.receiptNo}</td>
                                                <td className="px-4 py-4 text-cyan-600 font-medium hover:underline cursor-pointer" onClick={() => setSelectedInvoice(d.invoiceNo)}>{d.invoiceNo}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.date}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.soldBy}</td>
                                                <td className="px-4 py-4 text-gray-900">{d.servedBy}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.source}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.type}</td>
                                                <td className="px-4 py-4 text-gray-900">{d.customer}</td>
                                                <td className="px-4 py-4 text-gray-900 font-medium">{d.name}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.location}</td>
                                                <td className="px-4 py-4 text-gray-600">{d.staffReceiver}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.invoiceStatus === 'COMPLETED' || d.invoiceStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {d.invoiceStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right text-gray-900">{d.qty}</td>
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
                    </>
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

            <BookingReceiptModal
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                invoiceNumber={selectedInvoice}
            />
        </div>
    );
}