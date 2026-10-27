import { Plus, Edit, Trash2, Search, X, AlertTriangle, Wallet, Settings, Package, Car, FileText, Utensils, Lightbulb, Droplets, Wrench, Megaphone, Gift, ShoppingCart, Pill, Eraser, Laptop, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, type Branch } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

interface ExpenseCategory {
    id: number;
    name: string;
    icon: string;
    description: string;
    cabang?: string;
    branch_id?: number;
    is_global?: boolean;
    branch_ids?: number[];
}

const availableIcons = [
    'Settings', 'Package', 'Car', 'FileText', 'Utensils',
    'Lightbulb', 'Droplets', 'Wrench', 'Megaphone', 'Gift',
    'ShoppingCart', 'Pill', 'Eraser', 'Laptop', 'Phone'
];

const renderIcon = (iconName: string, size: number = 20) => {
    switch (iconName) {
        case 'Settings': return <Settings size={size} />;
        case 'Package': return <Package size={size} />;
        case 'Car': return <Car size={size} />;
        case 'FileText': return <FileText size={size} />;
        case 'Utensils': return <Utensils size={size} />;
        case 'Lightbulb': return <Lightbulb size={size} />;
        case 'Droplets': return <Droplets size={size} />;
        case 'Wrench': return <Wrench size={size} />;
        case 'Megaphone': return <Megaphone size={size} />;
        case 'Gift': return <Gift size={size} />;
        case 'ShoppingCart': return <ShoppingCart size={size} />;
        case 'Pill': return <Pill size={size} />;
        case 'Eraser': return <Eraser size={size} />;
        case 'Laptop': return <Laptop size={size} />;
        case 'Phone': return <Phone size={size} />;
        default: return <Settings size={size} />;
    }
};

export default function ExpenseCategoriesPage() {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Pagination & Branch States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [branchList, setBranchList] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number>(0);

    const [formData, setFormData] = useState({
        name: '',
        icon: 'Settings',
        description: '',
        branch_id: 0,
        is_global: true,
        branch_ids: [] as number[]
    });

    // Load from backend
    const fetchCategories = async () => {
        try {
            const data = await api.getExpenseCategories();
            const mappedData = data.map((item: any) => ({
                ...item,
                is_global: !!item.is_global,
                branch_ids: item.branches ? item.branches.map((b: any) => b.id) : []
            }));
            setCategories(mappedData);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    useEffect(() => {
        fetchCategories();

        const loadBranches = async () => {
            const allBranchesOption = { id: 0, name: 'Semua Cabang' } as Branch;
            try {
                const branches = await api.getBranches();
                setBranchList([allBranchesOption, ...branches]);
                // Default to "Semua Cabang" (id 0)
                setSelectedBranchId(0);
            } catch (err) {
                console.error('Error loading branches:', err);
                setBranchList([allBranchesOption]);
            }
        };
        loadBranches();
    }, []);

    const filteredCategories = categories.filter(cat => {
        const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.description.toLowerCase().includes(searchQuery.toLowerCase());

        // Client-side branch filtering (if data has cabang info)
        const matchesBranch = selectedBranchId === 0 || (cat.is_global || cat.branch_ids?.includes(selectedBranchId));

        return matchesSearch && matchesBranch;
    });

    const getPaginatedData = (data: ExpenseCategory[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedBranchId]);

    const openAddModal = () => {
        setFormData({
            name: '',
            icon: 'Settings',
            description: '',
            branch_id: 0,
            is_global: true,
            branch_ids: []
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (category: ExpenseCategory) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            icon: category.icon,
            description: category.description,
            branch_id: category.branch_id || 0,
            is_global: !!category.is_global,
            branch_ids: category.branch_ids || []
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const openDeleteModal = (category: ExpenseCategory) => {
        setSelectedCategory(category);
        setShowDeleteModal(true);
    };

    const handleSave = async () => {
        if (!formData.name) return;
        setIsProcessing(true);
        try {
            if (isEditing && selectedCategory) {
                await api.updateExpenseCategory(selectedCategory.id, {
                    name: formData.name,
                    icon: formData.icon,
                    description: formData.description,
                    is_global: formData.is_global,
                    branch_ids: formData.is_global ? [] : formData.branch_ids
                });
            } else {
                await api.createExpenseCategory({
                    name: formData.name,
                    icon: formData.icon,
                    description: formData.description,
                    type: 'other',
                    is_global: formData.is_global,
                    branch_ids: formData.is_global ? [] : formData.branch_ids
                });
            }
            await fetchCategories();
            toast.success(isEditing ? 'Kategori diperbarui' : 'Kategori ditambahkan');
        } catch (error) {
            console.error('Failed to save category:', error);
            toast.error('Gagal menyimpan kategori');
        }

        setIsProcessing(false);
        setShowModal(false);
        setSelectedCategory(null);
    };

    const handleDelete = async () => {
        if (!selectedCategory) return;
        setIsProcessing(true);
        try {
            await api.deleteExpenseCategory(selectedCategory.id);
            await fetchCategories();
            toast.success('Kategori dihapus');
        } catch (error) {
            console.error('Failed to delete category:', error);
            toast.error('Gagal menghapus kategori');
        }
        setIsProcessing(false);
        setShowDeleteModal(false);
        setSelectedCategory(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">Kategori Pengeluaran</h1>
                    <p className="text-gray-500 text-sm">Kelola kategori untuk pencatatan pengeluaran (Petty Cash)</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Branch Selector in Header */}
                    {branchList.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                                className="pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-naqupos-primary outline-none appearance-none cursor-pointer hover:border-gray-300"
                                style={{ backgroundImage: 'none' }}
                            >
                                {branchList.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                    >
                        <Plus size={18} />
                        Tambah Kategori
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Cari kategori..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none max-w-md"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-left text-xs text-gray-500 uppercase">
                            <th className="px-6 py-3 font-medium w-20">Icon</th>
                            <th className="px-6 py-3 font-medium">Nama Kategori</th>
                            <th className="px-6 py-3 font-medium">Deskripsi</th>
                            {selectedBranchId === 0 && (
                                <th className="px-6 py-3 font-medium">Cabang</th>
                            )}
                            <th className="px-6 py-3 font-medium text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                    <Wallet size={40} className="mx-auto mb-2 opacity-50" />
                                    <p>Tidak ada kategori ditemukan</p>
                                </td>
                            </tr>
                        ) : (
                            getPaginatedData(filteredCategories).map(category => (
                                <tr key={category.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-naqupos-primary">
                                            {renderIcon(category.icon, 20)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{category.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{category.description || '-'}</td>
                                    {selectedBranchId === 0 && (
                                        <td className="px-6 py-4 text-gray-500">
                                            {category.is_global ? (
                                                <span className="px-2 py-0.5 bg-naqupos-cream text-naqupos-primary text-[10px] font-bold rounded uppercase tracking-wider border border-naqupos-primary/20">Global</span>
                                            ) : category.branch_ids && category.branch_ids.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {category.branch_ids.map(bid => {
                                                        const b = branchList.find((br: any) => br.id === bid);
                                                        return b ? (
                                                            <span key={bid} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{b.name}</span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(category)}
                                                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-naqupos-primary"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(category)}
                                                className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {filteredCategories.length > 0 && (
                    <div className="border-t border-gray-100">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredCategories.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Kategori' : 'Tambah Kategori'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {availableIcons.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, icon }))}
                                            className={`p-2 rounded-lg flex items-center justify-center border transition-colors ${formData.icon === icon
                                                ? 'border-naqupos-primary bg-naqupos-cream text-naqupos-primary'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                                }`}
                                        >
                                            {renderIcon(icon, 24)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Multiple Selection)</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition-all group">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_global}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    is_global: checked,
                                                    branch_ids: checked ? [] : prev.branch_ids
                                                }));
                                            }}
                                            className="w-5 h-5 text-naqupos-primary focus:ring-naqupos-primary border-gray-300 rounded-md transition-all cursor-pointer"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</p>
                                            <p className="text-xs text-gray-500">Kategori ini akan tersedia di seluruh cabang</p>
                                        </div>
                                    </label>

                                    {!formData.is_global && (
                                        <div className="pt-2 mt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {branchList.filter(b => b.id !== 0).map(branch => (
                                                <label key={branch.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white transition-all border border-transparent hover:border-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.branch_ids.includes(branch.id)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                branch_ids: checked
                                                                    ? [...prev.branch_ids, branch.id]
                                                                    : prev.branch_ids.filter(id => id !== branch.id)
                                                            }));
                                                        }}
                                                        className="w-4 h-4 text-naqupos-primary focus:ring-naqupos-primary border-gray-300 rounded transition-all cursor-pointer"
                                                    />
                                                    <span className="text-sm text-gray-600 font-medium truncate">{branch.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {!formData.is_global && formData.branch_ids.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertTriangle size={12} /> Silakan pilih setidaknya satu cabang
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Kategori *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Contoh: Operasional"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Keterangan singkat..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
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
                                disabled={isProcessing || !formData.name || (!formData.is_global && formData.branch_ids.length === 0)}
                                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${isProcessing || !formData.name || (!formData.is_global && formData.branch_ids.length === 0)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                    }`}
                            >
                                {isProcessing ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Tambah'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedCategory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Kategori?</h3>
                            <p className="text-gray-500 text-sm">
                                Yakin ingin menghapus kategori <strong>{selectedCategory.name}</strong>?
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isProcessing}
                                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                            >
                                {isProcessing ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
