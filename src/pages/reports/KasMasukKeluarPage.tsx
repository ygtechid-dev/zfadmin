import { useState } from 'react'; import { ArrowLeft, Calendar, ChevronDown } from 'lucide-react'; import { useNavigate } from 'react-router-dom'; import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal'; import ExportDropdown from '../../components/common/ExportDropdown'; import BranchSelector from '../../components/common/BranchSelector'; import Pagination from '../../components/common/Pagination';

interface CashFlowData {
  id: number;
  judul: string;
  tanggal: string;
  tipe: string;
  jumlah: number;
  keterangan?: string | null;
  bukti_foto?: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const BASE_URL = 'https://apinaqupos.zafarangroupindonesia.com';

const getFullImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

import { api } from '../../services/api';
import { useEffect } from 'react';
import { useBranchSync } from '../../hooks/useBranchSync';
import { formatDateYMD } from '../../utils/date';

export default function KasMasukKeluarPage() {
  const navigate = useNavigate();
  const initialRange = getInitialDateRange('7_days');
  const { selectedBranchId, setSelectedBranchId } = useBranchSync<number | null>(undefined, null);
  const [selectedBranchName, setSelectedBranchName] = useState('Semua Cabang');

  useEffect(() => {
    if (!selectedBranchId) {
      setSelectedBranchName('Semua Cabang');
      return;
    }
    api.getBranches().then((branches: any[]) => {
      const branch = branches.find(b => b.id === selectedBranchId);
      if (branch) setSelectedBranchName(branch.name);
    });
  }, [selectedBranchId]);

  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [quickOption, setQuickOption] = useState('7_days');
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedTipe, setSelectedTipe] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [allData, setAllData] = useState<CashFlowData[]>([]);
  const [summaryData, setSummaryData] = useState({
    masuk: 0,
    keluar: 0,
    penjualan: 0,
    keseluruhan: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.getCashFlow({
          branch_id: selectedBranchId,
          date_from: formatDateYMD(startDate),
          date_to: formatDateYMD(endDate),
        });
        if (response) {
          setAllData(response.flows || []);
          if (response.summary) {
            setSummaryData({
              masuk: Number(response.summary.masuk) || 0,
              keluar: Number(response.summary.keluar) || 0,
              penjualan: Number(response.summary.penjualan) || 0,
              keseluruhan: Number(response.summary.keseluruhan) || 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch cash flow', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedBranchId, startDate, endDate]);

  const filteredData =
    selectedTipe === 'all'
      ? allData
      : selectedTipe === 'masuk'
      ? allData.filter(d => d.jumlah > 0)
      : allData.filter(d => d.jumlah < 0);

  const totalItems = filteredData.length;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  // ── EXPORT CSV ──
  const exportToCSV = () => {
    let csv = `Kas Masuk/Keluar - ${selectedBranchName}\n`;
    csv += `Periode: ${formatDateRangeDisplay(startDate, endDate)}\n\n`;
    csv += 'Judul,Tanggal,Tipe,Keterangan,Nominal,Bukti Foto\n';
    filteredData.forEach(d => {
      const ket = (d.keterangan || '-').replace(/,/g, ';');
      const bukti = getFullImageUrl(d.bukti_foto) || '-';
      csv += `"${d.judul}","${d.tanggal}","${d.tipe}","${ket}","${formatCurrency(d.jumlah)}","${bukti}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kas_masuk_keluar_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.csv`;
    link.click();
  };

  // ── EXPORT EXCEL ──
  const exportToExcel = () => {
    let html = `<html><head><meta charset="UTF-8"></head><body>`;
    html += `<h2>Kas Masuk/Keluar - ${selectedBranchName}</h2>`;
    html += `<p>Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>`;
    html += `<table border="1" cellpadding="6" cellspacing="0">`;
    html += `<thead><tr>
      <th>Judul</th><th>Tanggal</th><th>Tipe</th>
      <th>Keterangan</th>
      <th style="text-align:right">Nominal</th>
      <th>Bukti Foto</th>
    </tr></thead><tbody>`;
    filteredData.forEach(d => {
      const isKeluar = d.jumlah < 0;
      const fullUrl = getFullImageUrl(d.bukti_foto);
      const bukti = fullUrl
        ? `<a href="${fullUrl}" target="_blank">${fullUrl}</a>`
        : '-';
      html += `<tr>
        <td>${d.judul}</td>
        <td>${d.tanggal}</td>
        <td>${d.tipe}</td>
        <td>${d.keterangan || '-'}</td>
        <td style="text-align:right;color:${isKeluar ? 'red' : 'green'}">${formatCurrency(d.jumlah)}</td>
        <td>${bukti}</td>
      </tr>`;
    });
    html += `</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kas_masuk_keluar_${selectedBranchName.replace(/\s+/g, '_').toLowerCase()}.xls`;
    link.click();
  };

  // ── EXPORT PDF ──
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filteredData
      .map(d => {
        const isKeluar = d.jumlah < 0;
        const fullUrl = getFullImageUrl(d.bukti_foto);
        const buktiCell = fullUrl
          ? `<a href="${fullUrl}" target="_blank"><img src="${fullUrl}" alt="bukti" style="max-width:100px;max-height:75px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;display:block" onerror="this.style.display='none';this.nextSibling.style.display='inline'" /><span style="display:none;font-size:10px;color:#6b7280">Gagal load</span></a>`
          : '-';
        return `<tr>
          <td>${d.judul}</td>
          <td style="white-space:nowrap">${d.tanggal}</td>
          <td><span class="badge ${isKeluar ? 'keluar' : 'masuk'}">${d.tipe}</span></td>
          <td style="color:#555">${d.keterangan || '-'}</td>
          <td style="text-align:right;font-weight:600;color:${isKeluar ? '#dc2626' : '#16a34a'}">${formatCurrency(d.jumlah)}</td>
          <td>${buktiCell}</td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Kas Masuk/Keluar - ${selectedBranchName}</title>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; padding: 28px; color: #1f2937; font-size: 12px; }
    h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; flex: 1; min-width: 140px; }
    .summary-card .label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .summary-card .value { font-size: 14px; font-weight: 700; }
    .value.green { color: #16a34a; }
    .value.red { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    tr:nth-child(even) td { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge.masuk { background: #dcfce7; color: #16a34a; }
    .badge.keluar { background: #fee2e2; color: #dc2626; }
    a { color: #2563eb; text-decoration: none; }
    @media print { body { padding: 12px; } .summary-card { break-inside: avoid; } }
  </style>
</head>
<body>
  <h2>Kas Masuk/Keluar — ${selectedBranchName}</h2>
  <p class="meta">Periode: ${formatDateRangeDisplay(startDate, endDate)}</p>
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Kas Masuk</div>
      <div class="value green">Rp ${formatCurrency(summaryData.masuk)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Kas Keluar</div>
      <div class="value red">Rp ${formatCurrency(summaryData.keluar)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Penjualan</div>
      <div class="value">Rp ${formatCurrency(summaryData.penjualan)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Keseluruhan</div>
      <div class="value">Rp ${formatCurrency(summaryData.keseluruhan)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Judul</th>
        <th>Tanggal</th>
        <th>Tipe</th>
        <th>Keterangan</th>
        <th style="text-align:right">Nominal</th>
        <th>Bukti Foto</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">Tidak ada data</td></tr>'}
    </tbody>
  </table>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reports', { state: { tab: 'laporan' } })}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Kas Masuk/Keluar</h1>
        {isLoading && <span className="text-sm text-gray-500 ml-2">Loading...</span>}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap items-center gap-4">
        <BranchSelector
          selectedBranchId={selectedBranchId}
          onBranchChange={handleBranchChange}
          showAllOption={true}
        />
        <div className="relative">
          <select
            value={selectedTipe}
            onChange={e => {
              setSelectedTipe(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 pr-8 border border-gray-200 rounded-lg text-sm bg-white appearance-none cursor-pointer"
          >
            <option value="all">Semua tipe</option>
            <option value="masuk">Kas Masuk</option>
            <option value="keluar">Kas Keluar</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={() => setShowDateModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <Calendar size={16} className="text-gray-500" />
          <span>
            {quickOption === '7_days' ? '7 hari sebelumnya, ' : ''}
            {formatDateRangeDisplay(startDate, endDate)}
          </span>
        </button>
        <div className="ml-auto">
          <ExportDropdown
            onExportCSV={exportToCSV}
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-medium text-gray-700">Ringkasan</div>
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-base px-2 bg-gray-50 py-2 rounded">
            <span className="font-medium text-gray-700">Total kas masuk</span>
            <span className="font-medium text-green-600">Rp {formatCurrency(summaryData.masuk)}</span>
          </div>
          <div className="flex justify-between text-base px-2 py-1">
            <span className="font-medium text-gray-700">Total kas keluar</span>
            <span className="font-medium text-red-600">Rp {formatCurrency(summaryData.keluar)}</span>
          </div>
          <div className="flex justify-between text-base px-2 bg-gray-50 py-2 rounded">
            <span className="font-medium text-gray-700">Total Penjualan</span>
            <span className="font-medium text-gray-700">Rp {formatCurrency(summaryData.penjualan)}</span>
          </div>
          <div className="flex justify-between text-base px-2 py-1">
            <span className="font-bold text-gray-900">Total keseluruhan</span>
            <span className="font-bold text-gray-900">Rp {formatCurrency(summaryData.keseluruhan)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3 text-left">Judul</th>
                <th className="px-6 py-3 text-left">Tanggal</th>
                <th className="px-6 py-3 text-left">Tipe</th>
                <th className="px-6 py-3 text-left">Keterangan</th>
                <th className="px-6 py-3 text-right">Nominal</th>
                <th className="px-6 py-3 text-center">Bukti Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    {isLoading ? 'Memuat data...' : 'Tidak ada data'}
                  </td>
                </tr>
              ) : (
                paginatedData.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">{d.judul}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">{d.tanggal}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                          d.jumlah >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {d.tipe}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 max-w-[200px]">
                      <span className="line-clamp-2">{d.keterangan || '-'}</span>
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-semibold ${
                        d.jumlah < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(d.jumlah)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {getFullImageUrl(d.bukti_foto) ? (
                        <a
                          href={getFullImageUrl(d.bukti_foto)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Lihat bukti foto"
                        >
                          <img
                            src={getFullImageUrl(d.bukti_foto)!}
                            alt="bukti"
                            className="w-12 h-10 object-cover rounded-lg border border-gray-200 mx-auto hover:scale-105 transition-transform cursor-pointer"
                            onError={e => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
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
          onItemsPerPageChange={val => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
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