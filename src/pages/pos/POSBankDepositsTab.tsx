/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, Search, Download, Eye, Upload, DollarSign, FileText, Image as ImageIcon, Banknote, X, AlertTriangle, History, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const BASE_URL = 'https://apinaqupos.zafarangroupindonesia.com';

const getFullImageUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

interface BankDeposit {
    id: number;
    branch_id: number;
    amount: number;
    cash_before: number;
    cash_after: number;
    bank_name: string;
    account_number: string | null;
    deposit_proof: string | null;
    deposit_proof_url?: string;
    notes: string | null;
    deposit_date: string;
    created_at: string;
    branch: {
        name: string;
    };
    creator: {
        name: string;
    };
}

interface POSBankDepositsTabProps {
    branchId: number;
}

export default function POSBankDepositsTab({ branchId }: POSBankDepositsTabProps) {
    const [deposits, setDeposits] = useState<BankDeposit[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null);
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [cashBalance, setCashBalance] = useState<number>(0);
    const [loadingBalance, setLoadingBalance] = useState(false);

    const [formData, setFormData] = useState({
        amount: '',
        bank_name: '',
        account_number: '',
        deposit_date: new Date().toISOString().split('T')[0],
        notes: '',
        deposit_file: null as File | null
    });

    const [depositPreview, setDepositPreview] = useState<string | null>(null);

    useEffect(() => {
        if (branchId > 0) {
            loadCashBalance();
            loadDeposits();
        }
    }, [branchId]);

    const loadCashBalance = async () => {
        if (!branchId) return;
        setLoadingBalance(true);
        try {
            const data = await api.getCashBalance(branchId);
            setCashBalance(data.current_balance);
        } catch (error) {
            console.error('Failed to load cash balance:', error);
        } finally {
            setLoadingBalance(false);
        }
    };

    const loadDeposits = async () => {
        try {
            const params: any = { branch_id: branchId, all: true };
            const response = await api.getBankDeposits(params);
            setDeposits(Array.isArray(response) ? response : (response.data || []));
        } catch (error) {
            console.error('Failed to load deposits:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Ukuran file maksimal 5MB');
                return;
            }
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                toast.error('Format file harus JPG, PNG, atau PDF');
                return;
            }
            setFormData(prev => ({ ...prev, deposit_file: file }));
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setDepositPreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setDepositPreview(null);
            }
        }
    };

    const parseAmount = (val: string) => parseFloat(val.replace(/\./g, '') || '0');

    const formatNumber = (val: string) => {
        const cleanVal = val.replace(/\D/g, '');
        if (!cleanVal) return '';
        return new Intl.NumberFormat('id-ID').format(parseInt(cleanVal));
    };

    const handleSave = async () => {
        if (!formData.amount || !formData.bank_name || !formData.deposit_date) {
            toast.error('Mohon lengkapi semua field yang wajib');
            return;
        }
        if (!formData.deposit_file) {
            toast.error('Bukti setoran wajib diupload');
            return;
        }
        const amount = parseAmount(formData.amount);
        if (amount <= 0) {
            toast.error('Jumlah setor harus lebih dari 0');
            return;
        }
        if (amount > cashBalance) {
            toast.error(
                `Saldo tidak mencukupi!\nSaldo tersedia: ${formatCurrency(cashBalance)}\nJumlah setor: ${formatCurrency(amount)}`,
                { duration: 4000 }
            );
            return;
        }
        setIsProcessing(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('branch_id', branchId.toString());
            formDataToSend.append('amount', amount.toString());
            formDataToSend.append('bank_name', formData.bank_name);
            if (formData.account_number) formDataToSend.append('account_number', formData.account_number);
            formDataToSend.append('deposit_date', formData.deposit_date);
            if (formData.notes) formDataToSend.append('notes', formData.notes);
            if (formData.deposit_file) formDataToSend.append('deposit_proof', formData.deposit_file);

            await api.createBankDeposit(formDataToSend);
            await loadDeposits();
            await loadCashBalance();
            window.dispatchEvent(new CustomEvent('naqupos-bank-deposit-created', { detail: { branchId } }));
            toast.success('Setoran bank berhasil dicatat');
            setShowModal(false);
            setFormData({
                amount: '',
                bank_name: '',
                account_number: '',
                deposit_date: new Date().toISOString().split('T')[0],
                notes: '',
                deposit_file: null
            });
            setDepositPreview(null);
        } catch (error: any) {
            console.error('Failed to save deposit:', error);
            if (error?.response?.data?.error) {
                const errorMsg = error.response.data.error;
                const errorData = error.response.data;
                if (errorMsg.includes('tidak mencukupi') || errorMsg.includes('insufficient')) {
                    toast.error(
                        `Saldo tidak mencukupi!\n` +
                        `Saldo Safe: ${formatCurrency(errorData.safe_balance || 0)}\n` +
                        `Saldo Laci: ${formatCurrency(errorData.drawer_balance || 0)}\n` +
                        `Total Tersedia: ${formatCurrency(errorData.current_balance || 0)}\n` +
                        `Jumlah Setor: ${formatCurrency(errorData.requested_amount || amount)}`,
                        { duration: 5000 }
                    );
                } else {
                    toast.error(errorMsg);
                }
            } else {
                toast.error(error?.response?.data?.message || 'Gagal menyimpan setoran');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // ── EXPORT EXCEL ──
    const exportToExcel = async () => {
        try {
            const data = filteredDeposits.map(dep => ({
                'Tanggal Setor': new Date(dep.deposit_date).toLocaleDateString('id-ID'),
                'Bank': dep.bank_name,
                'Nomor Rekening': dep.account_number || '-',
                'Jumlah Setor': dep.amount,
                'Saldo Sebelum': dep.cash_before,
                'Saldo Sesudah': dep.cash_after,
                'Catatan': dep.notes || '-',
                'Bukti Foto': getFullImageUrl(dep.deposit_proof_url || dep.deposit_proof) || '-',
                'Dibuat Oleh': dep.creator?.name || '-',
            }));

            const ws = XLSX.utils.json_to_sheet(data);

            // Auto column width
            const colWidths = [
                { wch: 16 }, // Tanggal
                { wch: 14 }, // Bank
                { wch: 20 }, // No Rekening
                { wch: 18 }, // Jumlah
                { wch: 18 }, // Saldo Sebelum
                { wch: 18 }, // Saldo Sesudah
                { wch: 30 }, // Catatan
                { wch: 60 }, // Bukti Foto
                { wch: 20 }, // Dibuat Oleh
            ];
            ws['!cols'] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Setoran Bank');

            const fileName = `Setoran_Bank_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success('Excel berhasil diunduh');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Gagal export Excel');
        }
    };

    // ── EXPORT PDF ──
    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const branchName = deposits[0]?.branch?.name || 'Semua Cabang';
        const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        const totalAmount = filteredDeposits.reduce((sum, d) => sum + Number(d.amount), 0);

        const rows = filteredDeposits.map(dep => {
            const fullUrl = getFullImageUrl(dep.deposit_proof_url || dep.deposit_proof);
            const buktiCell = fullUrl
                ? dep.deposit_proof?.endsWith('.pdf')
                    ? `<a href="${fullUrl}" target="_blank" style="color:#2563eb;font-size:10px">📄 Lihat PDF</a>`
                    : `<a href="${fullUrl}" target="_blank"><img src="${fullUrl}" alt="bukti" style="max-width:100px;max-height:75px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;display:block" onerror="this.style.display='none';this.nextSibling.style.display='inline'" /><span style="display:none;font-size:10px;color:#6b7280">Gagal load</span></a>`
                : '<span style="color:#9ca3af">-</span>';
            return `<tr>
                <td>${formatDate(dep.deposit_date)}</td>
                <td>
                    <strong>${dep.bank_name}</strong>
                    ${dep.account_number ? `<br/><span style="color:#6b7280;font-size:10px">${dep.account_number}</span>` : ''}
                </td>
                <td style="text-align:right;font-weight:600;color:#2563eb">${formatCurrency(dep.amount)}</td>
                <td style="text-align:right;color:#6b7280">${formatCurrency(dep.cash_before)}</td>
                <td style="text-align:right;color:#16a34a;font-weight:600">${formatCurrency(dep.cash_after)}</td>
                <td style="color:#555">${dep.notes || '-'}</td>
                <td>${buktiCell}</td>
                <td style="color:#6b7280">${dep.creator?.name || '-'}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Setoran Bank</title>
    <meta charset="UTF-8"/>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; padding: 28px; color: #1f2937; font-size: 12px; }
        .header { margin-bottom: 20px; }
        h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .meta { color: #6b7280; font-size: 11px; }
        .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; flex: 1; min-width: 140px; }
        .summary-card .label { font-size: 10px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-card .value { font-size: 15px; font-weight: 700; }
        .value.blue { color: #2563eb; }
        .value.green { color: #16a34a; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
        td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        tfoot td { background: #f3f4f6; font-weight: 700; border-top: 2px solid #e5e7eb; }
        @media print { body { padding: 12px; } }
    </style>
</head>
<body>
    <div class="header">
        <h2>Laporan Setoran Bank — ${branchName}</h2>
        <p class="meta">Dicetak pada: ${today}</p>
    </div>
    <div class="summary">
        <div class="summary-card">
            <div class="label">Total Transaksi</div>
            <div class="value">${filteredDeposits.length} setoran</div>
        </div>
        <div class="summary-card">
            <div class="label">Total Disetor</div>
            <div class="value blue">${formatCurrency(totalAmount)}</div>
        </div>
        <div class="summary-card">
            <div class="label">Saldo Cash Saat Ini</div>
            <div class="value green">${formatCurrency(cashBalance)}</div>
        </div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Tanggal</th>
                <th>Bank</th>
                <th style="text-align:right">Jumlah Setor</th>
                <th style="text-align:right">Saldo Sebelum</th>
                <th style="text-align:right">Saldo Sesudah</th>
                <th>Catatan</th>
                <th>Bukti Foto</th>
                <th>Dibuat Oleh</th>
            </tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#9ca3af">Tidak ada data</td></tr>'}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="2">Total</td>
                <td style="text-align:right;color:#2563eb">${formatCurrency(totalAmount)}</td>
                <td colspan="5"></td>
            </tr>
        </tfoot>
    </table>
    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const getMonthKey = (date: string) => String(date || '').slice(0, 7);
    const formatMonth = (monthKey: string) => {
        const [year, month] = monthKey.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
            month: 'long',
            year: 'numeric'
        });
    };

    const currentMonthDeposits = deposits.filter(dep => getMonthKey(dep.deposit_date) === currentMonthKey);
    const filteredDeposits = currentMonthDeposits.filter(dep =>
        dep.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dep.notes && dep.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const monthlyHistory = useMemo(() => {
        const groups = new Map<string, BankDeposit[]>();
        deposits.forEach(deposit => {
            const monthKey = getMonthKey(deposit.deposit_date);
            if (!monthKey || monthKey === currentMonthKey) return;
            groups.set(monthKey, [...(groups.get(monthKey) || []), deposit]);
        });

        return Array.from(groups.entries())
            .map(([monthKey, items]) => ({
                monthKey,
                items: items.sort((a, b) => b.deposit_date.localeCompare(a.deposit_date)),
                total: items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
            }))
            .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    }, [deposits, currentMonthKey]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const totalDeposits = filteredDeposits.reduce((sum, dep) => sum + parseFloat(dep.amount.toString()), 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-naqupos-dark">Setoran Bank</h2>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-500">Saldo Cash: <span className="font-bold text-green-600">{loadingBalance ? '...' : formatCurrency(cashBalance)}</span></p>
                        <p className="text-sm text-gray-500">Total {formatMonth(currentMonthKey)}: <span className="font-bold text-blue-600">{formatCurrency(totalDeposits)}</span></p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportToExcel}
                        disabled={filteredDeposits.length === 0}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <Download size={16} />
                        Excel
                    </button>
                    <button
                        onClick={exportToPDF}
                        disabled={filteredDeposits.length === 0}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <FileText size={16} />
                        PDF
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        disabled={loadingBalance || branchId <= 0}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${loadingBalance || branchId <= 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                            }`}
                    >
                        <Plus size={16} />
                        Setor
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_360px] gap-4">
                <div className="space-y-3 min-w-0">
                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={`Cari setoran ${formatMonth(currentMonthKey)}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                        />
                    </div>

                    {/* Current month table */}
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                            <p className="text-sm font-bold text-gray-800">Setoran Bulan Berjalan</p>
                            <p className="text-xs text-gray-500">{formatMonth(currentMonthKey)} · {currentMonthDeposits.length} setoran</p>
                        </div>
                        <div className="overflow-y-auto h-[440px]">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                            <tr className="text-left text-xs text-gray-500 uppercase">
                                <th className="px-4 py-3 font-medium">Tanggal</th>
                                <th className="px-4 py-3 font-medium">Bank</th>
                                <th className="px-4 py-3 font-medium">Jumlah</th>
                                <th className="px-4 py-3 font-medium">Saldo Sesudah</th>
                                <th className="px-4 py-3 font-medium">Bukti</th>
                                <th className="px-4 py-3 font-medium text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDeposits.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                        <Banknote size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>Belum ada setoran bulan ini</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDeposits.map(deposit => (
                                    <tr key={deposit.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(deposit.deposit_date)}</td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{deposit.bank_name}</p>
                                                {deposit.account_number && (
                                                    <p className="text-xs text-gray-500">{deposit.account_number}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-blue-600">{formatCurrency(deposit.amount)}</td>
                                        <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(deposit.cash_after)}</td>
                                        <td className="px-4 py-3">
                                            {deposit.deposit_proof ? (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <ImageIcon size={12} />
                                                    <span className="text-xs">Ada</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedDeposit(deposit);
                                                    setShowViewModal(true);
                                                }}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-naqupos-primary"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                        </div>
                    </div>
                </div>

                {/* Monthly history */}
                <aside className="bg-white rounded-lg border border-gray-100 overflow-hidden min-w-0">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-naqupos-primary/10 text-naqupos-primary flex items-center justify-center">
                            <History size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">Riwayat Setor Bank</h3>
                            <p className="text-xs text-gray-500">Rekap total per bulan</p>
                        </div>
                    </div>

                    <div className="h-[500px] overflow-y-auto p-3 space-y-2">
                        {monthlyHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 px-6">
                                <History size={32} className="mb-2 opacity-30" />
                                <p className="text-sm font-medium">Belum ada riwayat bulanan</p>
                                <p className="text-xs mt-1">Riwayat akan muncul otomatis setelah berganti bulan.</p>
                            </div>
                        ) : (
                            monthlyHistory.map(history => {
                                const isOpen = selectedHistoryMonth === history.monthKey;
                                return (
                                    <div key={history.monthKey} className="border border-gray-100 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedHistoryMonth(isOpen ? null : history.monthKey)}
                                            className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-800 capitalize">{formatMonth(history.monthKey)}</p>
                                                <p className="text-xs text-gray-500">{history.items.length} setoran</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <p className="text-sm font-bold text-blue-600">{formatCurrency(history.total)}</p>
                                                <ChevronRight size={15} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="border-t border-gray-100 bg-gray-50/50 divide-y divide-gray-100">
                                                {history.items.map(deposit => (
                                                    <div key={deposit.id} className="px-3 py-2 flex items-center justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-gray-700 truncate">{deposit.bank_name}</p>
                                                            <p className="text-[10px] text-gray-400">{formatDate(deposit.deposit_date)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            <span className="text-xs font-bold text-blue-600">{formatCurrency(Number(deposit.amount))}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedDeposit(deposit);
                                                                    setShowViewModal(true);
                                                                }}
                                                                className="p-1 rounded text-gray-400 hover:text-naqupos-primary hover:bg-white"
                                                                title="Lihat detail"
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-naqupos-dark">Setor ke Bank</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-green-700 font-medium">Saldo Cash Saat Ini</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(cashBalance)}</p>
                                </div>
                                <DollarSign size={24} className="text-green-600" />
                            </div>
                        </div>
                        {cashBalance <= 0 && (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3 mb-4">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                <p className="text-xs">
                                    Saldo cash saat ini belum tersedia. Pastikan shift sudah dibuka dan transaksi tunai sudah tercatat sebelum membuat setoran.
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Setor *</label>
                                <input
                                    type="text"
                                    value={formData.amount}
                                    onChange={(e) => {
                                        const formatted = formatNumber(e.target.value);
                                        setFormData(prev => ({ ...prev, amount: formatted }));
                                    }}
                                    placeholder="0"
                                    className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${formData.amount && parseAmount(formData.amount) > cashBalance
                                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                                        : 'border-gray-200 focus:border-naqupos-primary'
                                        }`}
                                />
                                {formData.amount && parseAmount(formData.amount) > 0 && (
                                    <>
                                        {parseAmount(formData.amount) > cashBalance ? (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-xs text-red-700 font-medium flex items-center gap-1">
                                                    <AlertTriangle size={14} />
                                                    Jumlah melebihi saldo tersedia!
                                                </p>
                                                <p className="text-xs text-red-600 mt-1">Saldo tersedia: {formatCurrency(cashBalance)}</p>
                                                <p className="text-xs text-red-600">Kelebihan: {formatCurrency(parseAmount(formData.amount) - cashBalance)}</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Sisa cash setelah setor: {formatCurrency(cashBalance - parseAmount(formData.amount))}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank *</label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                                    placeholder="Contoh: BCA, Mandiri"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
                                <input
                                    type="text"
                                    value={formData.account_number}
                                    onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                                    placeholder="1234567890"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Setor *</label>
                                <input
                                    type="date"
                                    value={formData.deposit_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, deposit_date: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Catatan..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Upload Bukti <span className="text-red-500">*</span>
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="deposit-upload-pos"
                                    />
                                    <label htmlFor="deposit-upload-pos" className="cursor-pointer">
                                        {formData.deposit_file ? (
                                            <div className="space-y-1">
                                                {depositPreview ? (
                                                    <img src={depositPreview} alt="Preview" className="mx-auto h-20 object-contain rounded" />
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 text-gray-600">
                                                        <FileText size={20} />
                                                        <span className="text-xs">{formData.deposit_file.name}</span>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-500">Klik untuk ganti</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <Upload size={24} className="mx-auto text-gray-400" />
                                                <p className="text-xs text-gray-600">Upload bukti</p>
                                                <p className="text-xs text-gray-400">JPG, PNG, PDF (Max 5MB)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isProcessing || !formData.amount || !formData.bank_name || !formData.deposit_date}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${isProcessing || !formData.amount || !formData.bank_name || !formData.deposit_date
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                    }`}
                            >
                                {isProcessing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedDeposit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-naqupos-dark">Detail Setoran</h3>
                            <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">Tanggal</p>
                                    <p className="font-medium text-sm">{formatDate(selectedDeposit.deposit_date)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Bank</p>
                                    <p className="font-medium text-sm">{selectedDeposit.bank_name}</p>
                                </div>
                            </div>

                            {selectedDeposit.account_number && (
                                <div>
                                    <p className="text-xs text-gray-500">Nomor Rekening</p>
                                    <p className="font-medium text-sm">{selectedDeposit.account_number}</p>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-700 mb-1">Jumlah Disetor</p>
                                <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedDeposit.amount)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Saldo Sebelum</p>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedDeposit.cash_before)}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                    <p className="text-xs text-green-700">Saldo Sesudah</p>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedDeposit.cash_after)}</p>
                                </div>
                            </div>

                            {selectedDeposit.notes && (
                                <div>
                                    <p className="text-xs text-gray-500">Catatan</p>
                                    <p className="font-medium text-sm">{selectedDeposit.notes}</p>
                                </div>
                            )}

                            {selectedDeposit.deposit_proof && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Bukti Setoran</p>
                                    <div className="border border-gray-200 rounded-lg p-3">
                                        {(() => {
                                            const fullUrl = getFullImageUrl(selectedDeposit.deposit_proof_url || selectedDeposit.deposit_proof);
                                            if (!fullUrl) return <span className="text-xs text-gray-400">-</span>;
                                            if (selectedDeposit.deposit_proof.endsWith('.pdf')) {
                                                return (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <FileText size={24} className="text-red-500" />
                                                            <span className="text-sm">Dokumen PDF</span>
                                                        </div>
                                                        <a
                                                            href={fullUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-2 py-1 bg-naqupos-primary text-white rounded text-xs hover:bg-naqupos-accent"
                                                        >
                                                            <Download size={12} />
                                                            Download
                                                        </a>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="space-y-2">
                                                    <img src={fullUrl} alt="Bukti" className="w-full rounded" />
                                                    <a
                                                        href={fullUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-1 px-2 py-1 bg-naqupos-primary text-white rounded text-xs hover:bg-naqupos-accent"
                                                    >
                                                        <Download size={12} />
                                                        Download
                                                    </a>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
