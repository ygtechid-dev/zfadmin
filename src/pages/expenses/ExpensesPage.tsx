/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, Search, X, Receipt, Download, Eye, Upload, Calendar, DollarSign, FileText, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, type Branch } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../../components/common/SearchableSelect';

interface ExpenseCategory {
    id: number;
    name: string;
    icon: string;
    is_global?: boolean;
    branch_ids?: number[];
}

interface Expense {
    id: number;
    branch_id: number;
    category_id: number;
    description: string;
    amount: number;
    receipt_image: string | null;
    receipt_url?: string;
    created_at: string;
    category: ExpenseCategory;
    creator: {
        name: string;
    };
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Pagination & Filters
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedBranchId, setSelectedBranchId] = useState<number>(0);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [formData, setFormData] = useState({
        branch_id: 0,
        category_id: 0,
        description: '',
        amount: '',
        receipt_file: null as File | null
    });

    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        loadBranches();
        loadCategories();
    }, []);

    useEffect(() => {
        loadExpenses();
    }, [currentPage, itemsPerPage, selectedBranchId, selectedCategoryId, startDate, endDate]);

    const loadBranches = async () => {
        try {
            const data = await api.getBranches();
            setBranches(data);
            // Default to All (0)
            setSelectedBranchId(0);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, branch_id: data[0].id }));
            }
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    };

    const loadCategories = async () => {
        try {
            const data = await api.getExpenseCategories();
            const mappedCategories = data.map((c: any) => ({
                ...c,
                is_global: !!c.is_global,
                branch_ids: c.branches ? c.branches.map((b: any) => b.id) : []
            }));
            setCategories(mappedCategories);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadExpenses = async () => {
        try {
            const params: any = {
                limit: itemsPerPage,
                page: currentPage,
            };

            if (selectedBranchId > 0) params.branch_id = selectedBranchId;
            if (selectedCategoryId > 0) params.category_id = selectedCategoryId;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (startDate && endDate && startDate > endDate) {
                setLoadError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
                setExpenses([]);
                setTotalItems(0);
                return;
            }

            const response = await api.getExpenses(params);
            setExpenses(Array.isArray(response?.data) ? response.data : []);
            setTotalItems(Number(response?.total) || 0);
            setLoadError('');
        } catch (error: any) {
            console.error('Failed to load expenses:', error);
            setExpenses([]);
            setLoadError(error?.message || 'Gagal memuat data pengeluaran. Silakan coba lagi.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Ukuran file maksimal 5MB');
                return;
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                toast.error('Format file harus JPG, PNG, atau PDF');
                return;
            }

            setFormData(prev => ({ ...prev, receipt_file: file }));

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setReceiptPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setReceiptPreview(null);
            }
        }
    };

    const openAddModal = async () => {
        // Fetch fresh categories when opening modal
        try {
            const data = await api.getExpenseCategories();
            const mappedCategories = data.map((c: any) => ({
                ...c,
                is_global: !!c.is_global,
                branch_ids: c.branches ? c.branches.map((b: any) => b.id) : []
            }));
            setCategories(mappedCategories);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }

        setFormData({
            branch_id: selectedBranchId || (branches[0]?.id ?? 0),
            category_id: 0,
            description: '',
            amount: '',
            receipt_file: null
        });
        setReceiptPreview(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.branch_id || !formData.category_id || !formData.description?.trim() || !String(formData.amount).trim()) {
            toast.error('Mohon lengkapi semua field yang wajib');
            return;
        }

        const amountValue = Number(String(formData.amount).replace(/,/g, ''));
        if (!Number.isFinite(amountValue)) {
            toast.error('Nominal pengeluaran harus berupa angka yang valid');
            return;
        }
        if (amountValue <= 0) {
            toast.error('Nominal pengeluaran harus lebih besar dari 0');
            return;
        }
        if (amountValue > 1_000_000_000_000) {
            toast.error('Nominal pengeluaran terlalu besar');
            return;
        }

        setIsProcessing(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('branch_id', formData.branch_id.toString());
            formDataToSend.append('category_id', formData.category_id.toString());
            formDataToSend.append('description', formData.description.trim());
            formDataToSend.append('amount', String(amountValue));

            if (formData.receipt_file) {
                formDataToSend.append('receipt_image', formData.receipt_file);
            }

            await api.createExpense(formDataToSend);
            await loadExpenses();
            toast.success('Pengeluaran berhasil dicatat');
            setShowModal(false);
        } catch (error: any) {
            console.error('Failed to save expense:', error);
            toast.error(error?.response?.data?.message || error?.message || 'Gagal menyimpan pengeluaran');
        } finally {
            setIsProcessing(false);
        }
    };

    const openViewModal = (expense: Expense) => {
        setSelectedExpense(expense);
        setShowViewModal(true);
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category.name.toLowerCase().includes(searchQuery.toLowerCase())
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
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-naqupos-dark">Pengeluaran (Petty Cash)</h1>
                    <p className="text-gray-500 text-sm">Catat dan kelola pengeluaran operasional</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                >
                    <Plus size={18} />
                    Tambah Pengeluaran
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <DollarSign size={20} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                            <p className="text-sm text-gray-500">Total Pengeluaran</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Receipt size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{filteredExpenses.length}</p>
                            <p className="text-sm text-gray-500">Total Transaksi</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <FileText size={20} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">
                                {filteredExpenses.filter(e => e.receipt_image).length}
                            </p>
                            <p className="text-sm text-gray-500">Dengan Nota</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari pengeluaran..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                        />
                    </div>

                    <SearchableSelect
                        value={selectedBranchId}
                        onChange={(val) => setSelectedBranchId(Number(val))}
                        options={[
                            { value: 0, label: 'Semua Cabang' },
                            ...branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                    />

                    <SearchableSelect
                        value={selectedCategoryId}
                        onChange={(val) => setSelectedCategoryId(Number(val))}
                        options={[
                            { value: 0, label: 'Semua Kategori' },
                            ...categories.map(c => ({ value: c.id, label: c.name }))
                        ]}
                    />

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
                        onClick={() => { setLoadError(''); loadExpenses(); }}
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
                            <th className="px-6 py-3 font-medium">Kategori</th>
                            <th className="px-6 py-3 font-medium">Deskripsi</th>
                            <th className="px-6 py-3 font-medium">Jumlah</th>
                            <th className="px-6 py-3 font-medium">Nota</th>
                            <th className="px-6 py-3 font-medium">Dibuat Oleh</th>
                            <th className="px-6 py-3 font-medium text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                    <Receipt size={40} className="mx-auto mb-2 opacity-50" />
                                    <p>{loadError ? 'Gagal memuat data pengeluaran' : 'Tidak ada pengeluaran ditemukan'}</p>
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map(expense => (
                                <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-6 py-4 text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            {formatDate(expense.created_at)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                            {expense.category.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900">{expense.description}</td>
                                    <td className="px-6 py-4 font-semibold text-red-600">
                                        {formatCurrency(expense.amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {expense.receipt_image ? (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <ImageIcon size={14} />
                                                <span className="text-xs">Ada</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{expense.creator.name}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openViewModal(expense)}
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
                {filteredExpenses.length > 0 && (
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
                            <h3 className="text-xl font-bold text-naqupos-dark">Tambah Pengeluaran</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang *</label>
                                <SearchableSelect
                                    value={formData.branch_id}
                                    onChange={(val) => setFormData(prev => ({ ...prev, branch_id: Number(val) }))}
                                    options={[
                                        { value: 0, label: 'Pilih Cabang' },
                                        ...branches.map(b => ({ value: b.id, label: b.name }))
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori *</label>
                                <SearchableSelect
                                    value={formData.category_id}
                                    onChange={(val) => setFormData(prev => ({ ...prev, category_id: Number(val) }))}
                                    options={[
                                        { value: 0, label: 'Pilih Kategori' },
                                        ...categories.filter(c => c.is_global || c.branch_ids?.includes(formData.branch_id)).map(c => ({ value: c.id, label: c.name }))
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Contoh: Pembelian ATK kantor"
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah *</label>
                                <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    inputMode="decimal"
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Upload Nota (Opsional)
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="receipt-upload"
                                    />
                                    <label htmlFor="receipt-upload" className="cursor-pointer">
                                        {formData.receipt_file ? (
                                            <div className="space-y-2">
                                                {receiptPreview ? (
                                                    <img src={receiptPreview} alt="Preview" className="mx-auto h-32 object-contain rounded" />
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 text-gray-600">
                                                        <FileText size={24} />
                                                        <span>{formData.receipt_file.name}</span>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-500">Klik untuk ganti file</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Upload size={32} className="mx-auto text-gray-400" />
                                                <p className="text-sm text-gray-600">Klik untuk upload nota</p>
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
                                disabled={isProcessing || !formData.branch_id || !formData.category_id || !formData.description || !formData.amount}
                                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${isProcessing || !formData.branch_id || !formData.category_id || !formData.description || !formData.amount
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
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-naqupos-dark">Detail Pengeluaran</h3>
                            <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Tanggal</p>
                                    <p className="font-medium">{formatDate(selectedExpense.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Kategori</p>
                                    <p className="font-medium">{selectedExpense.category.name}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Deskripsi</p>
                                <p className="font-medium">{selectedExpense.description}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Jumlah</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedExpense.amount)}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Dibuat Oleh</p>
                                <p className="font-medium">{selectedExpense.creator.name}</p>
                            </div>

                            {selectedExpense.receipt_image && selectedExpense.receipt_url && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Nota Pengeluaran</p>
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        {selectedExpense.receipt_image.endsWith('.pdf') ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={32} className="text-red-500" />
                                                    <span className="text-sm">Dokumen PDF</span>
                                                </div>
                                                <a
                                                    href={selectedExpense.receipt_url}
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
                                                    src={selectedExpense.receipt_url}
                                                    alt="Nota"
                                                    className="w-full rounded-lg"
                                                />
                                                <a
                                                    href={selectedExpense.receipt_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent"
                                                >
                                                    <Download size={16} />
                                                    Download Nota
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
