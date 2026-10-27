/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, Search, Download, Eye, Upload, FileText, Image as ImageIcon, Receipt, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../../components/common/SearchableSelect';
// @ts-ignore - xlsx types are bundled with the package
import * as XLSX from 'xlsx';

interface ExpenseCategory {
    id: number;
    name: string;
    icon: string;
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

interface POSExpensesTabProps {
    branchId: number;
    shiftId?: string;
}

export default function POSExpensesTab({ branchId, shiftId }: POSExpensesTabProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        category_id: 0,
        description: '',
        amount: '',
        receipt_file: null as File | null
    });

    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

    useEffect(() => {
        loadCategories();
        loadExpenses();
    }, [branchId, shiftId]);

    const loadCategories = async () => {
        try {
            const data = await api.getExpenseCategories();
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadExpenses = async () => {
        try {
            const params: any = {
                branch_id: branchId,
                limit: 100
            };
            if (shiftId) params.shift_id = shiftId;

            const response = await api.getExpenses(params);
            setExpenses(response.data || []);
        } catch (error) {
            console.error('Failed to load expenses:', error);
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

            setFormData(prev => ({ ...prev, receipt_file: file }));

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

    const handleSave = async () => {
        if (!formData.category_id || !formData.description || !formData.amount) {
            toast.error('Mohon lengkapi semua field yang wajib');
            return;
        }

        setIsProcessing(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('branch_id', branchId.toString());
            formDataToSend.append('category_id', formData.category_id.toString());
            formDataToSend.append('description', formData.description);
            formDataToSend.append('amount', formData.amount);
            if (shiftId) formDataToSend.append('cashier_shift_id', shiftId);

            if (formData.receipt_file) {
                formDataToSend.append('receipt_image', formData.receipt_file);
            }

            if (editingExpenseId) {
                await api.updateExpense(editingExpenseId, formDataToSend);
                toast.success('Pengeluaran berhasil diperbarui');
            } else {
                await api.createExpense(formDataToSend);
                toast.success('Pengeluaran berhasil dicatat');
            }
            await loadExpenses();
            setShowModal(false);
            setEditingExpenseId(null);
            setFormData({ category_id: 0, description: '', amount: '', receipt_file: null });
            setReceiptPreview(null);
        } catch (error: any) {
            console.error('Failed to save expense:', error);
            toast.error(error?.response?.data?.message || (editingExpenseId ? 'Gagal memperbarui pengeluaran' : 'Gagal menyimpan pengeluaran'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpenseId(expense.id);
        setFormData({
            category_id: expense.category_id,
            description: expense.description,
            amount: expense.amount.toString(),
            receipt_file: null
        });
        setReceiptPreview(expense.receipt_url || null);
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!showDeleteModal) return;
        setIsProcessing(true);
        try {
            await api.deleteExpense(showDeleteModal);
            toast.success('Pengeluaran berhasil dihapus');
            setShowDeleteModal(null);
            await loadExpenses();
        } catch (error) {
            console.error('Failed to delete expense:', error);
            toast.error('Gagal menghapus pengeluaran');
        } finally {
            setIsProcessing(false);
        }
    };

    const exportToExcel = async () => {
        try {
            const data = expenses.map(exp => ({
                'Tanggal': new Date(exp.created_at).toLocaleDateString('id-ID'),
                'Kategori': exp.category.name,
                'Deskripsi': exp.description,
                'Jumlah': exp.amount,
                'Nota': exp.receipt_image ? 'Ada' : 'Tidak Ada',
                'URL Nota': exp.receipt_url || '-',
                'Dibuat Oleh': exp.creator.name
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');

            const fileName = `Pengeluaran_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast.success('Excel berhasil diunduh');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Gagal export Excel');
        }
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

    const handleDownload = async (id: number | string, filename: string) => {
        try {
            await api.downloadFile(`/cashier/expenses/${id}/download`, filename);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Gagal mendownload nota');
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-naqupos-dark">Pengeluaran (Petty Cash)</h2>
                    <p className="text-sm text-gray-500">Total: {formatCurrency(totalExpenses)}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportToExcel}
                        disabled={expenses.length === 0}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <Download size={16} />
                        Export Excel
                    </button>
                    <button
                        onClick={async () => {
                            // Fetch fresh categories when opening modal
                            await loadCategories();
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 bg-naqupos-primary text-white px-3 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                    >
                        <Plus size={16} />
                        Tambah
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Cari pengeluaran..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-left text-xs text-gray-500 uppercase">
                            <th className="px-4 py-3 font-medium">Tanggal</th>
                            <th className="px-4 py-3 font-medium">Kategori</th>
                            <th className="px-4 py-3 font-medium">Deskripsi</th>
                            <th className="px-4 py-3 font-medium">Jumlah</th>
                            <th className="px-4 py-3 font-medium">Nota</th>
                            <th className="px-4 py-3 font-medium text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                    <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Tidak ada pengeluaran</p>
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map(expense => (
                                <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-4 py-3 text-gray-600 text-xs">
                                        {formatDate(expense.created_at)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                            {expense.category.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">{expense.description}</td>
                                    <td className="px-4 py-3 font-semibold text-red-600">
                                        {formatCurrency(expense.amount)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {expense.receipt_image ? (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <ImageIcon size={12} />
                                                <span className="text-xs">Ada</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => {
                                                    setSelectedExpense(expense);
                                                    setShowViewModal(true);
                                                }}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                                title="Detail"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(expense)}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-naqupos-primary transition-colors"
                                                title="Edit"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(expense.id)}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 transition-colors"
                                                title="Hapus"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-naqupos-dark">{editingExpenseId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h3>
                            <button onClick={() => {
                                setShowModal(false);
                                setEditingExpenseId(null);
                                setFormData({ category_id: 0, description: '', amount: '', receipt_file: null });
                                setReceiptPreview(null);
                            }} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                                <SearchableSelect
                                    value={formData.category_id}
                                    onChange={(val: string | number) => setFormData(prev => ({ ...prev, category_id: Number(val) }))}
                                    options={[
                                        { value: 0, label: 'Pilih Kategori' },
                                        ...categories.map(c => ({ value: c.id, label: c.name }))
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Contoh: Pembelian ATK"
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Nota</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="receipt-upload-pos"
                                    />
                                    <label htmlFor="receipt-upload-pos" className="cursor-pointer">
                                        {formData.receipt_file ? (
                                            <div className="space-y-1">
                                                {receiptPreview ? (
                                                    <img src={receiptPreview} alt="Preview" className="mx-auto h-20 object-contain rounded" />
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 text-gray-600">
                                                        <FileText size={20} />
                                                        <span className="text-xs">{formData.receipt_file.name}</span>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-500">Klik untuk ganti</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <Upload size={24} className="mx-auto text-gray-400" />
                                                <p className="text-xs text-gray-600">Upload nota</p>
                                                <p className="text-xs text-gray-400">JPG, PNG, PDF (Max 5MB)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingExpenseId(null);
                                    setFormData({ category_id: 0, description: '', amount: '', receipt_file: null });
                                    setReceiptPreview(null);
                                }}
                                className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isProcessing || !formData.category_id || !formData.description || !formData.amount}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${isProcessing || !formData.category_id || !formData.description || !formData.amount
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                    }`}
                            >
                                {isProcessing ? 'Menyimpan...' : (editingExpenseId ? 'Update' : 'Simpan')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Hapus Pengeluaran?</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isProcessing}
                                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:bg-gray-200"
                            >
                                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-naqupos-dark">Detail Pengeluaran</h3>
                            <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">Tanggal</p>
                                    <p className="font-medium text-sm">{formatDate(selectedExpense.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Kategori</p>
                                    <p className="font-medium text-sm">{selectedExpense.category.name}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">Deskripsi</p>
                                <p className="font-medium text-sm">{selectedExpense.description}</p>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">Jumlah</p>
                                <p className="text-xl font-bold text-red-600">{formatCurrency(selectedExpense.amount)}</p>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">Dibuat Oleh</p>
                                <p className="font-medium text-sm">{selectedExpense.creator.name}</p>
                            </div>

                            {selectedExpense.receipt_image && selectedExpense.receipt_url && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Nota Pengeluaran</p>
                                    <div className="border border-gray-200 rounded-lg p-3">
                                        {selectedExpense.receipt_image.endsWith('.pdf') ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={24} className="text-red-500" />
                                                    <span className="text-sm">Dokumen PDF</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(selectedExpense.id, `Nota_${selectedExpense.description.replace(/\s+/g, '_')}_${selectedExpense.id}.${selectedExpense.receipt_image!.split('.').pop()}`)}
                                                    className="flex items-center justify-center gap-1 px-2 py-1 bg-naqupos-primary text-white rounded text-xs hover:bg-naqupos-accent w-full"
                                                >
                                                    <Download size={12} />
                                                    Download
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <img
                                                    src={selectedExpense.receipt_url}
                                                    alt="Nota"
                                                    className="w-full rounded"
                                                />
                                                <button
                                                    onClick={() => handleDownload(selectedExpense.id, `Nota_${selectedExpense.description.replace(/\s+/g, '_')}_${selectedExpense.id}.${selectedExpense.receipt_image!.split('.').pop()}`)}
                                                    className="flex items-center justify-center gap-1 px-2 py-1 bg-naqupos-primary text-white rounded text-xs hover:bg-naqupos-accent w-full"
                                                >
                                                    <Download size={12} />
                                                    Download
                                                </button>
                                            </div>
                                        )}
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
