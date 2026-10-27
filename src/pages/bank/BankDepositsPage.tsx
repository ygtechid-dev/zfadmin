/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, Search, X, DollarSign, Download, Eye, Upload, Calendar, TrendingDown, FileText, Image as ImageIcon, Banknote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, type Branch } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

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

export default function BankDepositsPage() {
    const [deposits, setDeposits] = useState<BankDeposit[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Pagination & Filters
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedBranchId, setSelectedBranchId] = useState<number>(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Cash Balance
    const [cashBalance, setCashBalance] = useState<number>(0);
    const [loadingBalance, setLoadingBalance] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        total_deposits: 0,
        deposit_count: 0,
        current_cash_balance: 0
    });

    const [formData, setFormData] = useState({
        branch_id: 0,
        amount: '',
        bank_name: '',
        account_number: '',
        deposit_date: new Date().toISOString().split('T')[0],
        notes: '',
        deposit_file: null as File | null
    });

    const [depositPreview, setDepositPreview] = useState<string | null>(null);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        loadBranches();
    }, []);

    useEffect(() => {
        if (selectedBranchId > 0) {
            loadCashBalance();
            loadStats();
        }
    }, [selectedBranchId, startDate, endDate]);

    useEffect(() => {
        loadDeposits();
    }, [currentPage, itemsPerPage, selectedBranchId, startDate, endDate]);

    const loadBranches = async () => {
        try {
            const data = await api.getBranches();
            setBranches(data);
            if (data.length > 0) {
                setSelectedBranchId(data[0].id);
                setFormData(prev => ({ ...prev, branch_id: data[0].id }));
            }
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    };

    const loadCashBalance = async () => {
        if (!selectedBranchId) return;

        setLoadingBalance(true);
        try {
            const data = await api.getCashBalance(selectedBranchId);
            setCashBalance(Number(data?.current_balance) || 0);
        } catch (error: any) {
            console.error('Failed to load cash balance:', error);
            setCashBalance(0);
            toast.error(error?.message || 'Gagal memuat saldo cash');
        } finally {
            setLoadingBalance(false);
        }
    };

    const loadStats = async () => {
        try {
            const params: any = {};
            if (selectedBranchId > 0) params.branch_id = selectedBranchId;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const data = await api.getBankDepositStats(params);
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const loadDeposits = async () => {
        try {
            const params: any = {
                limit: itemsPerPage,
                page: currentPage,
            };

            if (selectedBranchId > 0) params.branch_id = selectedBranchId;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            if (startDate && endDate && startDate > endDate) {
                setLoadError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
                setDeposits([]);
                setTotalItems(0);
                return;
            }

            const response = await api.getBankDeposits(params);
            setDeposits(Array.isArray(response?.data) ? response.data : []);
            setTotalItems(Number(response?.total) || 0);
            setLoadError('');
        } catch (error: any) {
            console.error('Failed to load deposits:', error);
            setDeposits([]);
            setLoadError(error?.message || 'Gagal memuat data setoran. Silakan coba lagi.');
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
                reader.onloadend = () => {
                    setDepositPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setDepositPreview(null);
            }
        }
    };

    const openAddModal = () => {
        setFormData({
            branch_id: selectedBranchId || (branches[0]?.id ?? 0),
            amount: '',
            bank_name: '',
            account_number: '',
            deposit_date: new Date().toISOString().split('T')[0],
            notes: '',
            deposit_file: null
        });
        setDepositPreview(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.branch_id || !String(formData.amount).trim() || !formData.bank_name?.trim() || !formData.deposit_date) {
            toast.error('Mohon lengkapi semua field yang wajib');
            return;
        }

        const amount = Number(formData.amount);
        if (!Number.isFinite(amount)) {
            toast.error('Nominal setoran harus berupa angka yang valid');
            return;
        }
        if (amount <= 0) {
            toast.error('Nominal setoran harus lebih besar dari 0');
            return;
        }
        if (amount > 1_000_000_000_000) {
            toast.error('Nominal setoran terlalu besar');
            return;
        }
        if (Number.isFinite(cashBalance) && cashBalance > 0 && amount > cashBalance) {
            toast.error(`Saldo cash tidak mencukupi. Saldo saat ini: ${formatCurrency(cashBalance)}`);
            return;
        }

        setIsProcessing(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('branch_id', formData.branch_id.toString());
            formDataToSend.append('amount', String(amount));
            formDataToSend.append('bank_name', formData.bank_name.trim());
            if (formData.account_number) formDataToSend.append('account_number', formData.account_number);
            formDataToSend.append('deposit_date', formData.deposit_date);
            if (formData.notes) formDataToSend.append('notes', formData.notes);

            if (formData.deposit_file) {
                formDataToSend.append('deposit_proof', formData.deposit_file);
            }

            await api.createBankDeposit(formDataToSend);
            await loadDeposits();
            await loadCashBalance();
            await loadStats();
            toast.success('Setoran bank berhasil dicatat');
            setShowModal(false);
        } catch (error: any) {
            console.error('Failed to save deposit:', error);
            toast.error(error?.response?.data?.error || error?.message || 'Gagal menyimpan setoran');
        } finally {
            setIsProcessing(false);
        }
    };

    const openViewModal = (deposit: BankDeposit) => {
        setSelectedDeposit(deposit);
        setShowViewModal(true);
    };

    const filteredDeposits = deposits.filter(dep =>
        dep.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dep.notes && dep.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-naqupos-dark">Setoran Bank</h1>
                    <p className="text-gray-500 text-sm">Kelola setoran cash dari laci ke bank</p>
                </div>
                <button
                    onClick={openAddModal}
                    disabled={!selectedBranchId || cashBalance <= 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${!selectedBranchId || cashBalance <= 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                        }`}
                >
                    <Plus size={18} />
                    Setor ke Bank
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm opacity-90">Saldo Cash Laci</p>
                            <p className="text-2xl font-bold">
                                {loadingBalance ? '...' : formatCurrency(cashBalance)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Banknote size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_deposits)}</p>
                            <p className="text-sm text-gray-500">Total Setoran</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <TrendingDown size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{stats.deposit_count}</p>
                            <p className="text-sm text-gray-500">Jumlah Transaksi</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <FileText size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">
                                {filteredDeposits.filter(d => d.deposit_proof).length}
                            </p>
                            <p className="text-sm text-gray-500">Dengan Bukti</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari bank atau catatan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                        />
                    </div>

                    <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                        className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                    >
                        <option value={0}>Pilih Cabang</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                    />

                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                    />
                </div>
            </div>

            {loadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-4">
                    <span>{loadError}</span>
                    <button
                        onClick={() => { setLoadError(''); loadDeposits(); }}
                        className="shrink-0 px-3 py-1.5 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-100"
                    >
                        Coba lagi
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-left text-xs text-gray-500 uppercase">
                            <th className="px-6 py-3 font-medium">Tanggal</th>
                            <th className="px-6 py-3 font-medium">Bank</th>
                            <th className="px-6 py-3 font-medium">Jumlah Setor</th>
                            <th className="px-6 py-3 font-medium">Saldo Sebelum</th>
                            <th className="px-6 py-3 font-medium">Saldo Sesudah</th>
                            <th className="px-6 py-3 font-medium">Bukti</th>
                            <th className="px-6 py-3 font-medium">Dibuat Oleh</th>
                            <th className="px-6 py-3 font-medium text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDeposits.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                    <Banknote size={40} className="mx-auto mb-2 opacity-50" />
                                    <p>{loadError ? 'Gagal memuat data setoran' : 'Tidak ada setoran ditemukan'}</p>
                                </td>
                            </tr>
                        ) : (
                            filteredDeposits.map(deposit => (
                                <tr key={deposit.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-6 py-4 text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            {formatDate(deposit.deposit_date)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{deposit.bank_name}</p>
                                            {deposit.account_number && (
                                                <p className="text-xs text-gray-500">{deposit.account_number}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-blue-600">
                                        {formatCurrency(deposit.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {formatCurrency(deposit.cash_before)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-green-600">
                                        {formatCurrency(deposit.cash_after)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {deposit.deposit_proof ? (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <ImageIcon size={14} />
                                                <span className="text-xs">Ada</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{deposit.creator.name}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openViewModal(deposit)}
                                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-naqupos-primary"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {filteredDeposits.length > 0 && (
                    <div className="border-t border-gray-100">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-naqupos-dark">Setor ke Bank</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cash Balance Info */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-700 font-medium">Saldo Cash Saat Ini</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(cashBalance)}</p>
                                </div>
                                <DollarSign size={32} className="text-green-600" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang *</label>
                                <select
                                    value={formData.branch_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, branch_id: Number(e.target.value) }))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                >
                                    <option value={0}>Pilih Cabang</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Setor *</label>
                                <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    inputMode="decimal"
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0"
                                    max={cashBalance}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                                {formData.amount && parseFloat(formData.amount) > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Sisa cash: {formatCurrency(cashBalance - parseFloat(formData.amount))}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Bank *</label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                                    placeholder="Contoh: BCA, Mandiri, BNI"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Rekening</label>
                                <input
                                    type="text"
                                    maxLength={32}
                                    inputMode="numeric"
                                    value={formData.account_number}
                                    onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                                    placeholder="1234567890"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Setor *</label>
                                <input
                                    type="date"
                                    value={formData.deposit_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, deposit_date: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Catatan tambahan..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Upload Bukti Setor (Opsional)
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="deposit-upload"
                                    />
                                    <label htmlFor="deposit-upload" className="cursor-pointer">
                                        {formData.deposit_file ? (
                                            <div className="space-y-2">
                                                {depositPreview ? (
                                                    <img src={depositPreview} alt="Preview" className="mx-auto h-32 object-contain rounded" />
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 text-gray-600">
                                                        <FileText size={24} />
                                                        <span>{formData.deposit_file.name}</span>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-500">Klik untuk ganti file</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Upload size={32} className="mx-auto text-gray-400" />
                                                <p className="text-sm text-gray-600">Klik untuk upload bukti</p>
                                                <p className="text-xs text-gray-400">JPG, PNG, atau PDF (Max 5MB)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isProcessing || !formData.branch_id || !formData.amount || !formData.bank_name || !formData.deposit_date}
                                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${isProcessing || !formData.branch_id || !formData.amount || !formData.bank_name || !formData.deposit_date
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                    }`}
                            >
                                {isProcessing ? 'Menyimpan...' : 'Simpan Setoran'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedDeposit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-naqupos-dark">Detail Setoran Bank</h3>
                            <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Tanggal Setor</p>
                                    <p className="font-medium">{formatDate(selectedDeposit.deposit_date)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Bank Tujuan</p>
                                    <p className="font-medium">{selectedDeposit.bank_name}</p>
                                </div>
                            </div>

                            {selectedDeposit.account_number && (
                                <div>
                                    <p className="text-sm text-gray-500">Nomor Rekening</p>
                                    <p className="font-medium">{selectedDeposit.account_number}</p>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-700 mb-1">Jumlah Disetor</p>
                                <p className="text-3xl font-bold text-blue-600">{formatCurrency(selectedDeposit.amount)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">Saldo Sebelum</p>
                                    <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedDeposit.cash_before)}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <p className="text-sm text-green-700">Saldo Sesudah</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(selectedDeposit.cash_after)}</p>
                                </div>
                            </div>

                            {selectedDeposit.notes && (
                                <div>
                                    <p className="text-sm text-gray-500">Catatan</p>
                                    <p className="font-medium">{selectedDeposit.notes}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-gray-500">Dibuat Oleh</p>
                                <p className="font-medium">{selectedDeposit.creator.name}</p>
                            </div>

                            {selectedDeposit.deposit_proof && selectedDeposit.deposit_proof_url && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Bukti Setoran</p>
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        {selectedDeposit.deposit_proof.endsWith('.pdf') ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={32} className="text-red-500" />
                                                    <span className="text-sm">Dokumen PDF</span>
                                                </div>
                                                <a
                                                    href={selectedDeposit.deposit_proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent"
                                                >
                                                    <Download size={16} />
                                                    Download
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <img
                                                    src={selectedDeposit.deposit_proof_url}
                                                    alt="Bukti Setor"
                                                    className="w-full rounded-lg"
                                                />
                                                <a
                                                    href={selectedDeposit.deposit_proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent"
                                                >
                                                    <Download size={16} />
                                                    Download Bukti
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
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
