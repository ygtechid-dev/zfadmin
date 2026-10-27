import { Search, Plus, ChevronDown, X, Loader2, ChevronLeft, ChevronRight, Trash2, RefreshCw, Pencil, FileText, Upload, Download, Building, Check, RotateCcw, Tag, Layers, Truck, Database, Phone, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import BranchSelector from '../../components/common/BranchSelector';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BrandTab from '../master/tabs/BrandTab';
import CategoryTab from '../master/tabs/CategoryTab';
import SupplierTab from '../master/tabs/SupplierTab';
import EmptyState from '../../components/common/EmptyState';
import swal from '../../utils/swal';
import { useBranchSync } from '../../hooks/useBranchSync';
import React from 'react';


type InventoryTab = 'produk' | 'merk' | 'kategori' | 'supplier';




interface ProductVariant {
    id: number;
    name: string;
    sku: string;
    retail_price: number;
    special_price?: number;
    cost_price: number;
    track_stock: boolean;
    is_active: boolean;
    stocks?: { branch_id: number; quantity: number; location?: string }[];
    use_location_prices?: boolean;
    location_prices?: any;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    code: string;
    brand_name?: string;
    category?: string;
    retail_price: number;
    special_price?: number;
    cost_price: number;
    description?: string;
    stocks?: { branch_id: number; quantity: number; location: string }[];
    is_active: boolean;
    is_booking_online_enabled?: boolean;
    is_global?: boolean;
    branch_ids?: number[];
    branches?: { id: number, name: string }[];
    // New fields for variants
    variants?: ProductVariant[];
    computed_retail_price?: number;
    total_stock?: number;
    use_location_prices?: boolean;
    location_prices?: any;
}

interface Supplier {
    id: number;
    name: string;
    code?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    is_active: boolean;
}

// interface StockMovement {
//     id: number;
//     product_id: number;
//     branch_id: number;
//     user_id?: number;
//     movement_type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return' | 'opname';
//     quantity: number;
//     quantity_before: number;
//     quantity_after: number;
//     cost_price: number;
//     status?: string;
//     supplier_id?: number;
//     description?: string;
//     reference?: string;
//     movement_date: string;
//     product?: Product;
//     branch?: any;
//     user?: any;
//     supplier?: Supplier;
// }

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<InventoryTab>('produk');
    const [showAddProductModal, setShowAddProductModal] = useState<boolean | Product>(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [branches, setBranches] = useState<any[]>([]);
    const { selectedBranchId: branchFilter, setSelectedBranchId: setBranchFilter } = useBranchSync<string | number>(undefined, '');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) {
            setUser(JSON.parse(authData).user);
        }
    }, []);

    const isSuperAdminOrAdmin = useMemo(() => {
        if (!user?.role) return false;
        const role = user.role.toLowerCase();
        return ['super admin', 'super_admin', 'owner'].includes(role);
    }, [user]);

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
            } catch (error) {
                console.error("Failed to load branches", error);
            }
        };
        loadBranches();
    }, []);




    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    const tabs = [
        { key: 'produk', label: 'Produk' },
        { key: 'merk', label: 'Merk' },
        { key: 'kategori', label: 'Kategori' },
        { key: 'supplier', label: 'Supplier' },
    ];

    return (
        <div className="space-y-6 bg-naqupos-cream min-h-screen -m-6 p-6">
            {/* Header Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-naqupos-dark">Kelola Produk</h1>
                        <p className="text-sm font-sans text-gray-400 mt-1">Kelola stok, merk, kategori, dan pemasok.</p>
                    </div>

                    {isSuperAdminOrAdmin && (
                        <div className="bg-white/50 p-1 rounded-2xl border border-orange-100/50 shadow-sm animate-fadeIn">
                            <BranchSelector
                                selectedBranchId={String(branchFilter) === '' ? null : Number(branchFilter)}
                                onBranchChange={(id) => setBranchFilter(id || '')}
                                showAllOption={true}
                            />
                        </div>
                    )}

                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-1.5 flex items-center gap-1 self-start">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as InventoryTab)}
                                className={`px-5 py-2 text-xs font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${isActive
                                    ? 'bg-naqupos-primary text-white shadow-lg shadow-orange-900/20'
                                    : 'text-gray-400 hover:bg-naqupos-cream hover:text-naqupos-primary'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Branch Header Info */}
            {branchFilter !== '' && branchFilter !== 'all' && branches.find(b => b.id === Number(branchFilter)) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 animate-fadeIn px-2">
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-orange-100/50 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <Building size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Cabang Terpilih</p>
                            <p className="font-bold text-naqupos-dark text-sm">{branches.find(b => b.id === Number(branchFilter))?.name}</p>
                        </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-orange-100/50 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <Phone size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Kontak</p>
                            <p className="font-bold text-naqupos-dark text-sm">{branches.find(b => b.id === Number(branchFilter))?.phone || '-'}</p>
                        </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-orange-100/50 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Alamat</p>
                            <p className="font-bold text-naqupos-dark text-[11px] truncate" title={branches.find(b => b.id === Number(branchFilter))?.address}>
                                {branches.find(b => b.id === Number(branchFilter))?.address || '-'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-orange-900/5 border border-orange-100 min-h-[600px] relative overflow-hidden">
                {activeTab === 'produk' && <ProductTab key={`${refreshTrigger}-${branchFilter}`} branchId={branchFilter} branches={branches} globalBranchId={localStorage.getItem('naqupos_selected_branch') || ''} setShowAddProductModal={setShowAddProductModal} />}
                {activeTab === 'merk' && <BrandTab key={`${refreshTrigger}-${branchFilter}`} branchId={branchFilter} branches={branches} globalBranchId={localStorage.getItem('naqupos_selected_branch') || ''} setBranchFilter={setBranchFilter} />}
                {activeTab === 'kategori' && <CategoryTab key={`${refreshTrigger}-${branchFilter}`} branchId={branchFilter} branches={branches} globalBranchId={localStorage.getItem('naqupos_selected_branch') || ''} setBranchFilter={setBranchFilter} />}
                {activeTab === 'supplier' && <SupplierTab key={`${refreshTrigger}-${branchFilter}`} branchId={branchFilter} branches={branches} globalBranchId={localStorage.getItem('naqupos_selected_branch') || ''} setBranchFilter={setBranchFilter} />}


                {/* Floating Action Button - Only for Products (others might have their own or we rely on their internal UI) */}
                {activeTab === 'produk' && (
                    <button
                        onClick={() => setShowAddProductModal(true)}
                        className="fixed bottom-8 right-8 w-16 h-16 bg-naqupos-primary hover:bg-[#B07835] text-white rounded-full flex items-center justify-center shadow-2xl shadow-orange-900/40 transition-all hover:scale-105 z-40 active:scale-95 group"
                    >
                        <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="absolute right-full mr-4 bg-gray-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold uppercase tracking-wider">Tambah Produk</span>
                    </button>
                )}
            </div>

            {/* Add Product Modal */}
            {
                showAddProductModal && (
                    <AddProductModal
                        onClose={() => setShowAddProductModal(false)}
                        productToEdit={typeof showAddProductModal === 'object' ? showAddProductModal : undefined}
                        onSuccess={() => {
                            setShowAddProductModal(false);
                            handleRefresh();
                        }}
                        branches={branches}
                        currentBranchId={branchFilter}
                    />
                )
            }
        </div>
    );
}

const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
// const formatDate = (dateStr: string) => {
//     const d = new Date(dateStr);
//     return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
// };

// 1. Product Tab
function ProductTab({ branchId, branches, globalBranchId, setShowAddProductModal }: { branchId: string | number, branches: any[], globalBranchId: string, setShowAddProductModal: (val: boolean | Product) => void }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [merkFilter, setMerkFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [stockStatusFilter, setStockStatusFilter] = useState('all');

    const [availableBrands, setAvailableBrands] = useState<string[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);

    // Delete Product State
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; product: Product | null; loading: boolean }>({
        show: false, product: null, loading: false
    });

    const handleDeleteProduct = (product: Product) => {
        setDeleteModal({ show: true, product, loading: false });
    };

    const confirmDeleteProduct = async () => {
        if (!deleteModal.product) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            await api.deleteProduct(deleteModal.product.id);
            setDeleteModal({ show: false, product: null, loading: false });
            // Sync with POS
            const channel = new BroadcastChannel('zafara-pos-sync');
            channel.postMessage('data-updated');
            channel.close();
            fetchProducts(); // Refresh list
        } catch (error) {
            console.error('Failed to delete product:', error);
            swal.error('Gagal menghapus produk. Pastikan produk tidak terkait dengan transaksi lain.');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const [brandRes, catRes, suppRes] = await Promise.all([
                api.getBrands(),
                api.getCategories(),
                api.getSuppliers()
            ]);

            const targetBranchId = (branchId === 'all' || branchId === '') ? null : Number(branchId);

            // Brands API returns array of objects with branches relation
            const filteredBrands = (Array.isArray(brandRes) ? brandRes : [])
                .filter((b: any) => !targetBranchId || b.is_global || (b.branches && b.branches.some((br: any) => br.id === targetBranchId)))
                .map((b: any) => b.name)
                .filter(Boolean);

            // Categories API returns array of objects with branches relation
            const filteredCats = (Array.isArray(catRes) ? catRes : [])
                .filter((c: any) => !targetBranchId || c.is_global || (c.branches && c.branches.some((br: any) => br.id === targetBranchId)))
                .map((c: any) => c.name)
                .filter(Boolean);

            const filteredSupps = (Array.isArray(suppRes) ? suppRes : [])
                .filter((s: any) => !targetBranchId || s.is_global || (s.branches && s.branches.some((br: any) => br.id === targetBranchId)));

            setAvailableBrands(Array.from(new Set(filteredBrands)).sort());
            setAvailableCategories(Array.from(new Set(filteredCats)).sort());
            setAvailableSuppliers(filteredSupps || []);
        } catch (error) {
            console.error("Failed to load filter options", error);
        }
    };

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                search,
                page,
                limit: perPage,
                brand: merkFilter,
                category: categoryFilter,
                supplier_id: supplierFilter,
            };

            if (stockStatusFilter === 'in_stock') params.min_stock = 1;
            else if (stockStatusFilter === 'out_of_stock') params.max_stock = 0;

            if (branchId && branchId !== 'all' && branchId !== '') {
                params.branch_id = branchId;
            }
            const res = await api.getProducts(params);
            if (res.data) {
                const mappedProducts = res.data.map((p: any) => ({
                    ...p,
                    is_global: !!p.is_global,
                    branch_ids: p.branches ? p.branches.map((b: any) => b.id) : []
                }));
                setProducts(mappedProducts);
                setTotalPages(res.last_page || 1);
                setTotalItems(res.total || 0);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts();
        }, 500);
        return () => clearTimeout(timeout);
    }, [search, page, branchId, merkFilter, categoryFilter, supplierFilter, stockStatusFilter]);


    const [showImportModal, setShowImportModal] = useState(false);

    const resetFilters = () => {
        setSearch('');
        setMerkFilter('');
        setCategoryFilter('');
        setSupplierFilter('');
        setStockStatusFilter('all');
        setPage(1);
    };

    const exportData = (format: string) => {
        if (format === 'PDF') {
            window.print();
            return;
        }

        const headers = ['Nama', 'SKU', 'Kategori', 'Merk', 'Harga Retail', 'Stok'];
        const csvContent = [
            headers.join(','),
            ...products.map(p => [
                `"${p.name.replace(/"/g, '""')}"`,
                `"${p.sku}"`,
                `"${p.category || ''}"`,
                `"${p.brand_name || ''}"`,
                p.retail_price,
                p.stocks?.reduce((acc: number, s: any) => acc + s.quantity, 0) || 0
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `produk_naqupos_${new Date().getTime()}.${format.toLowerCase() === 'xls' ? 'csv' : 'csv'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportUpload = async (file: File) => {
        swal.success(`File ${file.name} berhasil diunggah! (Simulasi)`);
        setShowImportModal(false);
    };

    const handleDownloadTemplate = () => {
        const headers = ['Nama', 'SKU', 'Kategori', 'Merk', 'Harga', 'Stok'];
        const csvContent = headers.join(',');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'template_produk.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="flex flex-col h-full">

            {/* Filter Bar */}
            <div className="p-6 border-b border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 flex gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari produk berdasarkan nama, SKU..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 focus:border-naqupos-primary focus:ring-4 focus:ring-naqupos-primary/10 rounded-xl text-sm outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>


                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <button className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:border-naqupos-primary hover:text-naqupos-primary flex items-center gap-2 text-gray-600 transition-all shadow-sm">
                                <Download size={14} />
                                <span>Unduh</span>
                                <ChevronDown size={14} className="text-gray-400 group-hover:text-naqupos-primary" />
                            </button>
                            <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-2 hidden group-hover:block z-30">
                                {['PDF', 'XLS', 'CSV'].map(format => (
                                    <button
                                        key={format}
                                        onClick={() => exportData(format)}
                                        className="w-full px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-naqupos-cream hover:text-naqupos-primary"
                                    >
                                        {format}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:border-naqupos-primary hover:text-naqupos-primary flex items-center gap-2 text-gray-600 transition-all shadow-sm"
                        >
                            <Upload size={14} />
                            <span>Import Data</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
                        <Tag size={14} className="text-naqupos-primary" />
                        <div className="w-40">
                            <SearchableSelect
                                value={merkFilter}
                                onChange={(val) => { setMerkFilter(val as string); setPage(1); }}
                                options={[{ value: '', label: 'Semua Merk' }, ...availableBrands.map(b => ({ value: b, label: b }))]}
                                placeholder="Merk"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
                        <Layers size={14} className="text-naqupos-primary" />
                        <div className="w-40">
                            <SearchableSelect
                                value={categoryFilter}
                                onChange={(val) => { setCategoryFilter(val as string); setPage(1); }}
                                options={[{ value: '', label: 'Semua Kategori' }, ...availableCategories.map(c => ({ value: c, label: c }))]}
                                placeholder="Kategori"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
                        <Truck size={14} className="text-naqupos-primary" />
                        <div className="w-40">
                            <SearchableSelect
                                value={supplierFilter}
                                onChange={(val) => { setSupplierFilter(val as string); setPage(1); }}
                                options={[{ value: '', label: 'Semua Pemasok' }, ...availableSuppliers.map(s => ({ value: s.id, label: s.name }))]}
                                placeholder="Pemasok"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
                        <Database size={14} className="text-naqupos-primary" />
                        <div className="w-40">
                            <SearchableSelect
                                value={stockStatusFilter}
                                onChange={(val) => { setStockStatusFilter(val as string); setPage(1); }}
                                options={[
                                    { value: 'all', label: 'Semua Stok' },
                                    { value: 'in_stock', label: 'Tersedia' },
                                    { value: 'out_of_stock', label: 'Habis' },
                                ]}
                                placeholder="Stok"
                            />
                        </div>
                    </div>
                    {(search || merkFilter || categoryFilter || supplierFilter || stockStatusFilter !== 'all' || (globalBranchId === 'all' && branchId !== 'all')) && (
                        <button
                            onClick={resetFilters}
                            className="p-2.5 bg-naqupos-cream text-naqupos-primary hover:bg-naqupos-primary hover:text-white rounded-xl transition-all border border-naqupos-accent shadow-sm animate-fadeIn"
                            title="Reset Filter"
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
           <div className="overflow-x-auto">
    <table className="w-full text-sm text-left">
        <thead className="bg-naqupos-cream text-naqupos-dark uppercase tracking-wider text-xs font-bold border-b border-gray-200">
            <tr>
                <th className="px-4 py-4 rounded-tl-xl text-left w-16">Foto</th>
                <th className="px-6 py-4 text-left">Nama Produk</th>
                <th className="px-6 py-4 text-left">SKU / Kode</th>
                <th className="px-6 py-4 text-left">Kategori</th>
                <th className="px-6 py-4 text-left">Cabang</th>
                <th className="px-6 py-4 text-right">Harga Retail</th>
                <th className="px-6 py-4 text-center">Stok Total</th>
                <th className="px-6 py-4 rounded-tr-xl text-center">Status</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
            {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Loading data...</div>
                </td></tr>
            ) : products.length === 0 ? (
                <tr>
                    <td colSpan={8} className="px-6 py-4">
                        <EmptyState
                            title="Belum ada produk"
                            message="Tidak ditemukan data produk untuk kriteria ini."
                            icon={Database}
                        />
                    </td>
                </tr>
            ) : (
                products.map((product) => {
                    const totalStock = product.total_stock ?? product.stocks?.reduce((acc: number, s: any) => acc + s.quantity, 0) ?? 0;
                    const displayPrice = product.computed_retail_price ?? product.retail_price ?? 0;
                    const variants = Array.isArray(product.variants) ? product.variants : (product.variants ? Object.values(product.variants) : []);
                    const hasVariants = variants.length > 0;
                    return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            {/* Foto */}
                            <td className="px-4 py-4">
                                {(product as any).image ? (
                                    <img
                                        src={(product as any).image}
                                        alt={product.name}
                                        className="w-10 h-10 rounded-lg object-cover border border-gray-100 shadow-sm"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div
                                    className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"
                                    style={{ display: (product as any).image ? 'none' : 'flex' }}
                                >
                                    <Database size={14} className="text-gray-300" />
                                </div>
                            </td>

                            {/* Nama Produk */}
                            <td className="px-6 py-4 font-medium text-naqupos-dark">
                                {product.name}
                                {hasVariants && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px] font-medium">
                                        {variants.length} Varian
                                    </span>
                                )}
                            </td>

                            {/* SKU / Kode */}
                            <td className="px-6 py-4">
                                <div className="bg-gray-100 px-1.5 py-0.5 rounded text-xs inline-block mb-1">{product.sku}</div>
                                {product.code && <div className="text-[10px] text-gray-400">Barcode: {product.code}</div>}
                            </td>

                            {/* Kategori */}
                            <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-naqupos-primary/5 text-naqupos-primary rounded text-xs font-medium">
                                    {product.category || 'Uncategorized'}
                                </span>
                            </td>

                            {/* Cabang */}
                            <td className="px-6 py-4 text-xs text-gray-500">
                                {product.is_global ? (
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold border border-purple-100 uppercase">
                                        Seluruh Cabang
                                    </span>
                                ) : branchId !== 'all' ? (
                                    branches.find(b => b.id === Number(branchId))?.name || '-'
                                ) : (
                                    product.stocks && product.stocks.length > 0 ? (
                                        product.stocks.length === 1 ? (
                                            branches.find(b => b.id === product.stocks![0].branch_id)?.name || 'Multi'
                                        ) : 'Multi Cabang'
                                    ) : '-'
                                )}
                            </td>

                            {/* Harga Retail */}
                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                                {hasVariants && displayPrice > 0 && <span className="text-[10px] text-gray-400 mr-1">mulai</span>}
                                {formatCurrency(displayPrice)}
                            </td>

                            {/* Stok Total */}
                            <td className={`px-6 py-4 text-center font-bold ${totalStock <= 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                                {totalStock}
                            </td>

                            {/* Status + Aksi */}
                            <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => setShowAddProductModal(product as any)}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-naqupos-primary transition-all"
                                        title="Edit Produk"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProduct(product)}
                                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-all"
                                        title="Hapus Produk"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${product.is_active ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-gray-100 text-gray-500'}`}>
                                        {product.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    );
                })
            )}
        </tbody>
    </table>
</div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs text-gray-500">
                <div>Menampilkan {(page - 1) * perPage + 1} - {Math.min(page * perPage, totalItems)} dari {totalItems} produk</div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => {
                            if (totalPages <= 5) return true;
                            return Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                        })
                        .map((p, i, arr) => {
                            const showDots = i > 0 && p !== arr[i - 1] + 1;
                            return (
                                <React.Fragment key={p}>
                                    {showDots && <span className="px-1 text-gray-400">...</span>}
                                    <button
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-lg border text-xs font-medium transition-all ${page === p ? 'bg-naqupos-primary text-white border-naqupos-primary' : 'bg-white hover:bg-naqupos-primary/5 hover:text-naqupos-primary border-gray-200'}`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
            {showImportModal && (
                <ImportModal
                    onClose={() => setShowImportModal(false)}
                    onDownloadTemplate={handleDownloadTemplate}
                    onUpload={handleImportUpload}
                />
            )}

            {/* Delete Product Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, product: null, loading: false })}
                onConfirm={confirmDeleteProduct}
                title="Hapus Produk"
                message={`Anda yakin ingin menghapus produk "${deleteModal.product?.name}"? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data stok terkait.`}
                confirmLabel="Hapus"
                type="danger"
                isLoading={deleteModal.loading}
            />
        </div>
    );
}

// 2. Order Tab (Stock In)
function LocationPriceModal({ branches, variant, onClose, onSave }: {
    branches: any[],
    variant: any,
    onClose: () => void,
    onSave: (data: any) => void
}) {
    const [useLocationPrices, setUseLocationPrices] = useState(variant.use_location_prices || false);
    const [locPrices, setLocPrices] = useState<{ [key: number]: { retail: string | number, special: string | number, cost: string | number } }>(() => {
        const initial: any = {};
        branches.forEach(b => {
            initial[b.id] = {
                retail: variant.location_prices?.[b.id]?.retail ?? variant.price ?? variant.retail_price ?? '',
                special: variant.location_prices?.[b.id]?.special ?? variant.special_price ?? '',
                cost: variant.location_prices?.[b.id]?.cost ?? variant.cost_price ?? ''
            };
        });
        return initial;
    });

    const handleSave = () => {
        onSave({
            use_location_prices: useLocationPrices,
            location_prices: locPrices
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-naqupos-cream rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
                <div className="flex items-center justify-between p-6 bg-white border-b border-naqupos-cream shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-naqupos-dark">Harga per Lokasi</h2>
                        <p className="text-sm text-gray-500">Atur harga retail dan spesial untuk setiap cabang.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-naqupos-dark transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div
                        onClick={() => setUseLocationPrices(!useLocationPrices)}
                        className="flex items-center gap-4 cursor-pointer group p-4 bg-white rounded-xl border border-gray-100 hover:border-naqupos-primary/30 transition-all shadow-sm"
                    >
                        <div className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${!useLocationPrices ? 'bg-[#10B981]' : 'bg-gray-200'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${!useLocationPrices ? 'translate-x-5' : ''}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-800 group-hover:text-naqupos-primary transition-colors">Gunakan Harga Sama</span>
                            <span className="text-xs text-gray-500">Nonaktifkan untuk mengatur harga berbeda tiap cabang</span>
                        </div>
                    </div>

                    <div className={`transition-all duration-300 ${!useLocationPrices ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-naqupos-secondary/30 text-naqupos-dark font-bold border-b border-naqupos-secondary/50">
                                    <tr>
                                        <th className="px-6 py-4">Nama Cabang</th>
                                        <th className="px-6 py-4">Harga Retail</th>
                                        <th className="px-6 py-4">Harga Spesial</th>
                                        <th className="px-6 py-4">Harga Beli</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {branches.map(b => (
                                        <tr key={b.id} className="hover:bg-naqupos-cream transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-700">{b.name}</td>
                                            <td className="px-6 py-4">
                                                <CurrencyInput
                                                    prefix="Rp"
                                                    placeholder="0"
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-naqupos-primary outline-none font-medium"
                                                    value={useLocationPrices ? locPrices[b.id]?.retail : variant.price}
                                                    disabled={!useLocationPrices}
                                                    onChange={(val) => {
                                                        if (useLocationPrices) {
                                                            setLocPrices({
                                                                ...locPrices,
                                                                [b.id]: { ...locPrices[b.id], retail: val }
                                                            });
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <CurrencyInput
                                                    prefix="Rp"
                                                    placeholder="0"
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-naqupos-primary outline-none font-medium text-[#10B981]"
                                                    value={useLocationPrices ? locPrices[b.id]?.special : variant.special_price}
                                                    disabled={!useLocationPrices}
                                                    onChange={(val) => {
                                                        if (useLocationPrices) {
                                                            setLocPrices({
                                                                ...locPrices,
                                                                [b.id]: { ...locPrices[b.id], special: val }
                                                            });
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <CurrencyInput
                                                    prefix="Rp"
                                                    placeholder="0"
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-naqupos-primary outline-none font-medium text-gray-600"
                                                    value={useLocationPrices ? locPrices[b.id]?.cost : variant.cost_price}
                                                    disabled={!useLocationPrices}
                                                    onChange={(val) => {
                                                        if (useLocationPrices) {
                                                            setLocPrices({
                                                                ...locPrices,
                                                                [b.id]: { ...locPrices[b.id], cost: val }
                                                            });
                                                        }
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {branches.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic bg-naqupos-cream/50">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Building size={32} className="opacity-20" />
                                                    <p>Belum ada lokasi yang dipilih di form utama</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-end gap-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                        Batal
                    </button>
                    <button onClick={handleSave} className="px-8 py-3 bg-naqupos-primary text-white rounded-xl font-bold hover:bg-[#B07835] shadow-lg shadow-orange-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                        Simpan Harga
                    </button>
                </div>
            </div>
        </div>
    );
}

function AddProductModal({ onClose, onSuccess, branches, productToEdit, currentBranchId }: {
    onClose: () => void,
    onSuccess: () => void,
    branches: any[],
    productToEdit?: Product,
    currentBranchId?: string | number
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLocationPriceModal, setShowLocationPriceModal] = useState<{ variantIndex: number | 'simple' } | null>(null);
    const [showVariantWarning, setShowVariantWarning] = useState(false);

    // ✅ State image di sini, bukan di ImportModal
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');

    const [form, setForm] = useState({
        name: '',
        category: '',
        brand: '',
        description: '',
        isSelling: true,
        is_booking_online_enabled: true,
        price: '' as string | number,
        special_price: '' as string | number,
        cost_price: '' as string | number,
        sku: '',
        code: '',
        initial_stock: '' as string | number,
        taxRate: 'default' as 'default' | 'none',
        is_global: productToEdit ? !!productToEdit.is_global : true,
        branch_ids: productToEdit ? (productToEdit.branch_ids || []) : [] as number[],
        variants: [] as any[],
        applyCommission: false,
        use_location_prices: false,
        location_prices: {} as any
    });

    const [brandOptions, setBrandOptions] = useState<{ label: string, value: string }[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: string }[]>([]);
    const [existingSkus, setExistingSkus] = useState<string[]>([]);
    const [isGeneratingSku, setIsGeneratingSku] = useState(false);
    const isEditing = !!productToEdit;

    // ✅ Handler image
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview('');
    };

    useEffect(() => {
        if (productToEdit) {
            // ✅ Set imagePreview dari existing product
            if ((productToEdit as any).image) {
                setImagePreview((productToEdit as any).image);
            }
            setForm({
                name: productToEdit.name,
                category: productToEdit.category || '',
                brand: productToEdit.brand_name || '',
                description: productToEdit.description || '',
                isSelling: productToEdit.is_active,
                is_booking_online_enabled: productToEdit.is_booking_online_enabled ?? true,
                price: productToEdit.retail_price,
                special_price: productToEdit.special_price || '',
                cost_price: productToEdit.cost_price,
                sku: productToEdit.sku,
                code: productToEdit.code || '',
                initial_stock: productToEdit.total_stock || '',
                taxRate: 'default',
                is_global: !!productToEdit.is_global,
                branch_ids: productToEdit.branch_ids || [],
                use_location_prices: !!productToEdit.use_location_prices,
                location_prices: productToEdit.location_prices || {},
                variants: (productToEdit.variants || []).map(v => ({
                    id: v.id,
                    name: v.name,
                    price: v.retail_price,
                    special_price: v.special_price || '',
                    sku: v.sku,
                    initial_stock: v.stocks?.[0]?.quantity || '',
                    track_stock: v.track_stock,
                    use_location_prices: !!v.use_location_prices,
                    location_prices: v.location_prices || {}
                })),
                applyCommission: false
            });
        }
    }, [productToEdit]);

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [brandsRes, categoriesRes, productsRes] = await Promise.all([
                    api.getBrands(),
                    api.getCategories(),
                    api.getProducts({ limit: 10000 })
                ]);
                const brands = Array.isArray(brandsRes) ? brandsRes : [];
                const categories = Array.isArray(categoriesRes) ? categoriesRes : [];
                setBrandOptions(brands.map((b: any) => ({ label: typeof b === 'string' ? b : b.name, value: typeof b === 'string' ? b : b.name })));
                setCategoryOptions(categories.map((c: any) => ({ label: typeof c === 'string' ? c : c.name, value: typeof c === 'string' ? c : c.name })));
                if (Array.isArray(productsRes)) {
                    setExistingSkus(productsRes.map((p: any) => p.sku));
                } else if (productsRes?.data && Array.isArray(productsRes.data)) {
                    setExistingSkus(productsRes.data.map((p: any) => p.sku));
                }
            } catch (error) {
                console.error("Failed to fetch master data", error);
            }
        };
        fetchMasterData();
    }, []);

    const generateSku = () => {
        setIsGeneratingSku(true);
        setTimeout(() => {
            try {
                let namePart = "PRD";
                if (form.name) {
                    const cleanName = form.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    if (cleanName.length >= 3) namePart = cleanName.substring(0, 3);
                    else if (cleanName.length > 0) namePart = cleanName.padEnd(3, '0');
                }
                let catPart = "";
                if (form.category) {
                    const cleanCat = form.category.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    if (cleanCat.length >= 2) catPart = cleanCat.substring(0, 3);
                }
                const prefix = catPart ? `${namePart}-${catPart}` : namePart;
                let uniqueSku = '';
                let isUnique = false;
                let attempts = 0;
                while (!isUnique && attempts < 50) {
                    const random = Math.floor(1000 + Math.random() * 9000);
                    uniqueSku = `${prefix}-${random}`;
                    if (!existingSkus.includes(uniqueSku)) isUnique = true;
                    attempts++;
                }
                if (!isUnique) uniqueSku = `${prefix}-${Date.now().toString().slice(-6)}`;
                setForm(prev => ({ ...prev, sku: uniqueSku }));
            } finally {
                setIsGeneratingSku(false);
            }
        }, 600);
    };

    const hasVariants = form.variants.length > 0;

    const handleSubmit = async () => {
        if (!form.name) { swal.warning("Mohon isi Nama Produk"); return; }
        if (!hasVariants) {
            if (!form.price || !form.sku) { swal.warning("Mohon lengkapi Harga Retail dan SKU"); return; }
            if (form.special_price && Number(form.special_price) >= Number(form.price)) { swal.warning("Harga Spesial harus lebih kecil dari Harga Retail"); return; }
        } else {
            for (const v of form.variants) {
                if (!v.name || !v.price) { swal.warning("Mohon lengkapi Nama dan Harga untuk semua varian"); return; }
                if (v.special_price && Number(v.special_price) >= Number(v.price)) { swal.warning(`Harga Spesial untuk varian "${v.name}" harus lebih kecil dari Harga Retail`); return; }
            }
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: form.name,
                sku: !hasVariants ? form.sku : `${form.sku}-BASE`,
                code: form.code,
                brand_name: form.brand,
                category: form.category,
                description: form.description,
                retail_price: !hasVariants ? Number(form.price) : 0,
                special_price: !hasVariants ? (Number(form.special_price) || 0) : 0,
                cost_price: !hasVariants ? (Number(form.cost_price) || 0) : 0,
                is_active: form.isSelling,
                is_booking_online_enabled: form.is_booking_online_enabled,
                initial_stock: !hasVariants ? (Number(form.initial_stock) || 0) : 0,
                tax_rate: form.taxRate,
                apply_commission: form.applyCommission,
                is_global: form.is_global,
                branch_ids: form.is_global ? [] : form.branch_ids,
                branch_id: currentBranchId !== 'all' ? currentBranchId : undefined,
                use_location_prices: !hasVariants ? form.use_location_prices : false,
                location_prices: !hasVariants ? form.location_prices : {},
                variants: hasVariants ? form.variants.map(v => ({
                    ...v,
                    retail_price: Number(v.price) || 0,
                    special_price: Number(v.special_price) || 0,
                    initial_stock: Number(v.initial_stock) || 0,
                })) : [],
            };

            // ✅ Single API call, simpan response
            const savedProduct = isEditing && productToEdit
                ? await api.updateProduct(productToEdit.id, payload)
                : await api.createProduct(payload);

            // ✅ Upload image kalau ada file baru
            if (imageFile && savedProduct?.data?.id) {
                const formData = new FormData();
                formData.append('image', imageFile);
                await api.uploadProductImage(savedProduct.data.id, formData);
            }

            onSuccess();
            const channel = new BroadcastChannel('zafara-pos-sync');
            channel.postMessage('data-updated');
            channel.close();
        } catch (error: any) {
            console.error('Submit error:', error);
            const serverMsg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Gagal menyimpan produk";
            swal.error(typeof serverMsg === 'object' ? JSON.stringify(serverMsg, null, 2) : serverMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addVariant = () => {
        setForm({
            ...form,
            variants: [...form.variants, {
                id: Date.now(),
                name: '',
                price: form.price || '',
                special_price: '',
                sku: form.sku ? `${form.sku}-${form.variants.length + 1}` : '',
                initial_stock: '',
                track_stock: true,
                use_location_prices: false
            }]
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-naqupos-cream rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
                <div className="flex items-center justify-between p-6 bg-white border-b border-naqupos-cream shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-naqupos-dark">{isEditing ? `Edit Produk: ${productToEdit?.name}` : 'Tambah Produk Baru'}</h2>
                        <p className="text-sm text-gray-500">{isEditing ? 'Perbarui detail produk dan stok inventori Anda.' : 'Isi detail produk untuk menambah inventori toko Anda.'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-naqupos-dark transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-4xl mx-auto space-y-8">

                        {/* Section 1: Informasi Dasar */}
                        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100/50">
                            <h3 className="text-lg font-bold text-naqupos-dark mb-6 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-naqupos-secondary text-naqupos-primary text-sm font-bold">1</span>
                                Informasi Dasar
                            </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    {/* Kolom Kiri */}
    <div className="space-y-5">
        <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-naqupos-primary transition-colors">
                Nama Produk <span className="text-red-500">*</span>
            </label>
            <input
                type="text"
                className="w-full px-4 py-3 bg-naqupos-cream border-b-2 border-gray-200 focus:border-naqupos-primary rounded-t-lg outline-none transition-all placeholder:text-gray-400"
                placeholder="Contoh: Paket Spa Lavender"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="group z-30 relative">
                <SearchableSelect
                    label="Kategori"
                    placeholder="Pilih Kategori"
                    value={form.category}
                    onChange={(val) => setForm({ ...form, category: String(val) })}
                    options={categoryOptions}
                    creatable
                    onCreate={async ({ label }) => ({ label, value: label })}
                    className="w-full"
                />
            </div>
            <div className="group z-30 relative">
                <SearchableSelect
                    label="Merk (Brand)"
                    placeholder="Pilih Merk"
                    value={form.brand}
                    onChange={(val) => setForm({ ...form, brand: String(val) })}
                    options={brandOptions}
                    className="w-full"
                />
            </div>
        </div>

        {/* ✅ Deskripsi di kolom kiri bawah */}
        <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-naqupos-primary transition-colors">Deskripsi</label>
            <textarea
                className="w-full px-4 py-3 bg-naqupos-cream border-b-2 border-gray-200 focus:border-naqupos-primary rounded-t-lg outline-none resize-none transition-all text-sm"
                placeholder="Jelaskan detail produk..."
                rows={4}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
            />
        </div>
    </div>

    {/* Kolom Kanan — ✅ Foto Produk */}
    <div className="space-y-5">
        <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2">Foto Produk</label>
            <div className="relative">
                {imagePreview ? (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group/img">
                        <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-naqupos-primary hover:bg-orange-50/30 transition-all">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,image/gif"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                        <Upload size={28} className="text-gray-300 mb-2" />
                        <span className="text-xs font-bold text-gray-400">Klik untuk upload foto</span>
                        <span className="text-[10px] text-gray-300 mt-1">JPG, PNG, GIF maks. 5MB</span>
                    </label>
                )}
            </div>
        </div>
    </div>
</div>
                        </section>

                        {/* Section 2: Harga & Inventori — sama persis seperti sebelumnya, tidak berubah */}
                        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100/50">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold text-naqupos-dark flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-naqupos-secondary text-naqupos-primary text-sm font-bold">2</span>
                                    Harga & Inventori
                                </h3>
                                <div className="flex items-center gap-3 bg-naqupos-cream p-1.5 rounded-full border border-gray-200">
                                    <button
                                        onClick={() => { if (hasVariants) setShowVariantWarning(true); else setForm(prev => ({ ...prev, variants: [] })); }}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!hasVariants ? 'bg-naqupos-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                                    >Produk Satuan</button>
                                    <button
                                        onClick={() => { if (!hasVariants && form.variants.length === 0) addVariant(); }}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${hasVariants ? 'bg-naqupos-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                                    >Produk Varian</button>
                                </div>
                            </div>

                            {!hasVariants ? (
                                <div className="animate-fadeIn space-y-6">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="group">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-bold text-gray-700">Harga Jual (Retail) <span className="text-red-500">*</span></label>
                                                <button onClick={() => setShowLocationPriceModal({ variantIndex: 'simple' })} className="text-xs font-bold text-naqupos-primary hover:bg-orange-50 px-3 py-1 rounded-lg border border-transparent hover:border-orange-100 transition-colors">
                                                    {form.use_location_prices ? 'Multi-lokasi' : 'Set Lokasi'}
                                                </button>
                                            </div>
                                            <CurrencyInput prefix="Rp" placeholder="0" className="w-full px-4 py-3 bg-naqupos-cream border-b-2 border-gray-200 focus:border-naqupos-primary rounded-t-lg outline-none font-medium text-lg text-naqupos-dark" value={form.price} onChange={(val) => setForm({ ...form, price: val })} />
                                        </div>
                                        <div className="group">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Harga Spesial (Opsional)</label>
                                            <CurrencyInput prefix="Rp" placeholder="0" className="w-full px-4 py-3 bg-naqupos-cream border-b-2 border-gray-200 focus:border-naqupos-primary rounded-t-lg outline-none font-medium text-lg text-[#10B981]" value={form.special_price} onChange={(val) => setForm({ ...form, special_price: val })} />
                                        </div>
                                        <div className="group">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Harga Beli (Modal)</label>
                                            <CurrencyInput prefix="Rp" placeholder="0" className="w-full px-4 py-3 bg-naqupos-cream border-b-2 border-gray-200 focus:border-naqupos-primary rounded-t-lg outline-none font-medium text-lg text-gray-600" value={form.cost_price} onChange={(val) => setForm({ ...form, cost_price: val })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="group relative">
                                            <label className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-naqupos-primary transition-colors">SKU <span className="text-red-500">*</span></label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className={`w-full px-4 py-3 bg-naqupos-cream border-b-2 border-gray-200 focus:border-naqupos-primary rounded-t-lg outline-none transition-all placeholder:text-gray-400 font-bold uppercase ${isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                    placeholder="SKU-001"
                                                    value={form.sku}
                                                    onChange={e => !isEditing && setForm({ ...form, sku: e.target.value.toUpperCase() })}
                                                    readOnly={isEditing}
                                                />
                                                {!isEditing && (
                                                    <button onClick={generateSku} disabled={isGeneratingSku} className="px-4 py-2 bg-gray-100 hover:bg-naqupos-primary hover:text-white rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 min-w-[80px]">
                                                        <RefreshCw size={16} className={isGeneratingSku ? "animate-spin" : ""} />
                                                        <span>{isGeneratingSku ? '...' : 'Auto'}</span>
                                                    </button>
                                                )}
                                            </div>
                                            {existingSkus.includes(form.sku) && (!isEditing || form.sku !== productToEdit?.sku) && (
                                                <p className="absolute -bottom-5 left-0 text-[10px] text-red-500 font-bold flex items-center gap-1"><X size={10} /> SKU sudah digunakan!</p>
                                            )}
                                            {(!existingSkus.includes(form.sku) || (isEditing && form.sku === productToEdit?.sku)) && form.sku && (
                                                <p className="absolute -bottom-5 left-0 text-[10px] text-[#10B981] font-bold flex items-center gap-1"><Check size={10} /> {isEditing ? 'SKU tetap' : 'SKU tersedia'}</p>
                                            )}
                                        </div>
                                        <div className="group">
                                            <label className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-naqupos-primary transition-colors">Barcode</label>
                                            <input type="text" className="w-full px-4 py-3 bg-naqupos-cream border-b-2 border-gray-200 focus:border-naqupos-primary rounded-t-lg outline-none transition-all placeholder:text-gray-400" placeholder="Scan/Input Kode" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                                        </div>
                                        <div className="group">
                                            <label className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-naqupos-primary transition-colors">Stok Awal</label>
                                            <input type="number" className="w-full px-4 py-3 bg-naqupos-cream border-b-2 border-gray-200 focus:border-naqupos-primary rounded-t-lg outline-none transition-all placeholder:text-gray-400" placeholder="0" value={form.initial_stock} onChange={e => setForm({ ...form, initial_stock: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex justify-center pt-4">
                                        <button onClick={addVariant} className="text-naqupos-primary text-sm font-bold hover:underline flex items-center gap-1">
                                            <Plus size={16} /> Tambah tipe/varian lain untuk produk ini?
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="space-y-4">
                                        {form.variants.map((variant, index) => (
                                            <div key={variant.id} className="p-6 bg-naqupos-cream rounded-2xl border border-gray-200 relative group transition-all hover:bg-white hover:shadow-md hover:border-orange-100">
                                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                    <button onClick={() => { const nv = [...form.variants]; nv.splice(index, 1); setForm({ ...form, variants: nv }); }} className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-50 shadow-sm border border-gray-100"><Trash2 size={16} /></button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nama Varian</label>
                                                        <input type="text" className="w-full bg-transparent border-b border-gray-300 focus:border-naqupos-primary py-2 outline-none font-bold text-gray-800 placeholder:font-normal" placeholder="Contoh: Besar, Merah, 500ml" value={variant.name} onChange={e => { const nv = [...form.variants]; nv[index].name = e.target.value; setForm({ ...form, variants: nv }); }} />
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Harga Retail</label>
                                                            <CurrencyInput prefix="Rp" className="w-full bg-transparent border-b border-gray-300 focus:border-naqupos-primary py-2 outline-none font-medium" placeholder="0" value={variant.price} onChange={(val) => { const nv = [...form.variants]; nv[index].price = val; setForm({ ...form, variants: nv }); }} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Harga Spesial</label>
                                                            <CurrencyInput prefix="Rp" className="w-full bg-transparent border-b border-gray-300 focus:border-naqupos-primary py-2 outline-none font-medium text-[#10B981]" placeholder="Optional" value={variant.special_price} onChange={(val) => { const nv = [...form.variants]; nv[index].special_price = val; setForm({ ...form, variants: nv }); }} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Harga Beli</label>
                                                            <CurrencyInput prefix="Rp" className="w-full bg-transparent border-b border-gray-300 focus:border-naqupos-primary py-2 outline-none font-medium text-gray-600" placeholder="0" value={variant.cost_price} onChange={(val) => { const nv = [...form.variants]; nv[index].cost_price = val; setForm({ ...form, variants: nv }); }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-end gap-4">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">SKU Varian</label>
                                                        <div className="flex gap-2">
                                                            <input type="text" className="w-full text-xs bg-white/50 px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary font-bold uppercase" placeholder="Opsional" value={variant.sku || ''} onChange={(e) => { const nv = [...form.variants]; nv[index].sku = e.target.value.toUpperCase(); setForm({ ...form, variants: nv }); }} />
                                                            <button onClick={() => { const prefix = form.brand ? form.brand.substring(0, 3).toUpperCase() : 'ZAF'; const random = Math.floor(Math.random() * 90000) + 10000; const nv = [...form.variants]; nv[index].sku = `${prefix}-${random}`; setForm({ ...form, variants: nv }); }} className="px-3 py-2 bg-gray-100 hover:bg-naqupos-primary hover:text-white rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 min-w-[60px]"><RefreshCw size={14} /><span>Auto</span></button>
                                                        </div>
                                                    </div>
                                                    {variant.track_stock && (
                                                        <div className="w-24">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Stok Awal</label>
                                                            <input type="number" className="w-full text-xs bg-white px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary" placeholder="0" value={variant.initial_stock || ''} onChange={(e) => { const nv = [...form.variants]; nv[index].initial_stock = e.target.value; setForm({ ...form, variants: nv }); }} />
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3 pb-1">
                                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer select-none">
                                                            <input type="checkbox" className="w-4 h-4 rounded text-naqupos-primary focus:ring-naqupos-primary" checked={variant.track_stock} onChange={() => { const nv = [...form.variants]; nv[index].track_stock = !nv[index].track_stock; setForm({ ...form, variants: nv }); }} />
                                                            Track Stock
                                                        </label>
                                                        <button onClick={() => setShowLocationPriceModal({ variantIndex: index })} className="text-xs font-bold text-naqupos-primary hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-orange-100 transition-colors">
                                                            {variant.use_location_prices ? 'Multi-lokasi' : 'Set Lokasi'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={addVariant} className="w-full py-4 border-2 border-dashed border-naqupos-accent rounded-2xl flex items-center justify-center gap-2 text-naqupos-primary font-bold hover:bg-naqupos-cream transition-colors">
                                            <Plus size={20} /> Tambah Varian Lain
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Section 3: Pengaturan Tambahan — tidak berubah */}
                        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100/50">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-naqupos-dark flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-naqupos-secondary text-naqupos-primary text-sm font-bold">3</span>
                                    Pengaturan Tambahan
                                </h3>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${form.is_booking_online_enabled ? 'text-[#10B981]' : 'text-gray-400'}`}>Booking Online: {form.is_booking_online_enabled ? 'AKTIF' : 'NONAKTIF'}</span>
                                        <div onClick={() => setForm({ ...form, is_booking_online_enabled: !form.is_booking_online_enabled })} className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${form.is_booking_online_enabled ? 'bg-[#10B981]' : 'bg-gray-200'}`}>
                                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${form.is_booking_online_enabled ? 'translate-x-5' : ''}`} />
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${form.isSelling ? 'text-naqupos-primary' : 'text-gray-400'}`}>Status: {form.isSelling ? 'DIJUAL' : 'ARSIP'}</span>
                                        <div onClick={() => setForm({ ...form, isSelling: !form.isSelling })} className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${form.isSelling ? 'bg-naqupos-primary' : 'bg-gray-200'}`}>
                                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${form.isSelling ? 'translate-x-5' : ''}`} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-gray-700">Ketersediaan Cabang</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition-all group">
                                            <input type="checkbox" checked={form.is_global} onChange={(e) => { const checked = e.target.checked; setForm(prev => ({ ...prev, is_global: checked, branch_ids: checked ? [] : prev.branch_ids })); }} className="w-5 h-5 text-naqupos-primary focus:ring-naqupos-primary border-gray-300 rounded-md transition-all cursor-pointer" />
                                            <div>
                                                <p className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</p>
                                                <p className="text-xs text-gray-500">Produk ini akan tersedia di seluruh cabang</p>
                                            </div>
                                        </label>
                                        {!form.is_global && (
                                            <div className="pt-2 mt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {branches.filter(b => b.id !== 0).map(branch => (
                                                    <label key={branch.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white transition-all border border-transparent hover:border-gray-100">
                                                        <input type="checkbox" checked={form.branch_ids.includes(branch.id)} onChange={(e) => { const checked = e.target.checked; setForm(prev => ({ ...prev, branch_ids: checked ? [...prev.branch_ids, branch.id] : prev.branch_ids.filter(id => id !== branch.id) })); }} className="w-4 h-4 text-naqupos-primary focus:ring-naqupos-primary border-gray-300 rounded transition-all cursor-pointer" />
                                                        <span className="text-sm text-gray-600 font-medium truncate">{branch.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {!form.is_global && form.branch_ids.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Silakan pilih setidaknya satu cabang</p>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Pajak (Tax)</label>
                                        <SearchableSelect value={form.taxRate} onChange={(val) => setForm({ ...form, taxRate: val as 'default' | 'none' })} options={[{ value: 'default', label: 'Gunakan Pengaturan Outlet' }, { value: 'none', label: 'Tanpa Pajak (0%)' }]} />
                                    </div>
                                    <label className="flex items-center gap-3 p-4 bg-naqupos-cream rounded-xl cursor-pointer group hover:bg-orange-50/50 transition-colors border border-transparent hover:border-orange-100">
                                        <input type="checkbox" className="w-5 h-5 rounded text-naqupos-primary border-gray-300 focus:ring-naqupos-primary" checked={form.applyCommission} onChange={() => setForm({ ...form, applyCommission: !form.applyCommission })} />
                                        <div>
                                            <span className="block text-sm font-bold text-gray-700 group-hover:text-naqupos-primary transition-colors">Komisi Staff</span>
                                            <span className="text-xs text-gray-500">Hitung komisi untuk staff saat produk ini terjual</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {showLocationPriceModal && (
                    <LocationPriceModal
                        branches={form.is_global ? branches : branches.filter(b => form.branch_ids.includes(b.id))}
                        variant={showLocationPriceModal.variantIndex === 'simple' ? form : form.variants[showLocationPriceModal.variantIndex as number]}
                        onClose={() => setShowLocationPriceModal(null)}
                        onSave={(variantData) => {
                            if (showLocationPriceModal.variantIndex === 'simple') {
                                setForm({ ...form, ...variantData });
                            } else {
                                const nv = [...form.variants];
                                nv[showLocationPriceModal.variantIndex as number] = { ...nv[showLocationPriceModal.variantIndex as number], ...variantData };
                                setForm({ ...form, variants: nv });
                            }
                            setShowLocationPriceModal(null);
                        }}
                    />
                )}

                <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-end gap-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                    <button onClick={onClose} disabled={isSubmitting} className="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Batal</button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !form.name || (!form.is_global && form.branch_ids.length === 0)}
                        className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${isSubmitting || !form.name || (!form.is_global && form.branch_ids.length === 0) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-naqupos-primary text-white hover:bg-[#B07835] shadow-orange-900/20 hover:-translate-y-0.5 active:translate-y-0'}`}
                    >
                        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                        {isEditing ? 'Simpan Perubahan' : 'Terbitkan Produk'}
                    </button>
                </div>

                <ConfirmationModal
                    isOpen={showVariantWarning}
                    onClose={() => setShowVariantWarning(false)}
                    onConfirm={() => { setForm((prev: any) => ({ ...prev, variants: [] })); setShowVariantWarning(false); }}
                    title="Ubah ke Produk Simple"
                    message="Ubah ke Produk Simple akan menghapus semua varian yang telah dibuat. Apakah Anda yakin ingin melanjutkan?"
                    confirmLabel="Ya, Hapus Varian"
                    type="warning"
                />
            </div>
        </div>
    );
}

function ImportModal({ onClose, onDownloadTemplate, onUpload, title }: { onClose: () => void, onDownloadTemplate: () => void, onUpload: (file: File) => void, title?: string }) {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            swal.warning('Pilih file terlebih dahulu');
            return;
        }
        setIsSubmitting(true);
        try {
            await onUpload(file);
            onClose();
        } catch (err) {
            swal.error(err instanceof Error ? err.message : 'Gagal mengimpor file');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-naqupos-dark/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-naqupos-dark">{title || 'Impor Produk'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-naqupos-cream border border-naqupos-secondary/50 p-4 rounded-xl flex items-start gap-3">
                        <div className="p-2 bg-naqupos-primary/10 text-naqupos-primary rounded-lg">
                            <Download size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-naqupos-dark text-sm">Unduh Template</h4>
                            <p className="text-xs text-naqupos-dark/70 mt-1 mb-3">Gunakan template ini untuk mengimpor produk dalam jumlah banyak sekaligus.</p>
                            <button
                                onClick={onDownloadTemplate}
                                className="text-xs font-bold bg-naqupos-primary text-white px-3 py-1.5 rounded-lg hover:bg-naqupos-accent transition-colors shadow-sm"
                            >
                                Download Template
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Upload File (CSV/Excel)</label>
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-naqupos-primary transition-colors cursor-pointer group relative">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="text-gray-400 group-hover:text-naqupos-primary transition-colors">
                                    {file ? (
                                        <div className="flex flex-col items-center">
                                            <FileText size={32} className="mb-2" />
                                            <span className="font-bold text-sm text-gray-800">{file.name}</span>
                                            <span className="text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Upload size={32} className="mb-2" />
                                            <span className="font-bold text-sm">Klik untuk upload file</span>
                                            <span className="text-xs mt-1">atau drag & drop file ke sini</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !file}
                            className="w-full py-3 bg-naqupos-primary text-white font-bold rounded-xl shadow-lg shadow-orange-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                            Impor Sekarang
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
