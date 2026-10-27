import { Search, ChevronDown, Activity, Truck, RotateCcw, Building, Phone, FileText, Package, RefreshCw, X, ArrowRight, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import BranchSelector from '../../components/common/BranchSelector';
import swal from '../../utils/swal';
import { useBranchSync } from '../../hooks/useBranchSync';


interface Product {
    id: number;
    name: string;
    sku: string;
    code: string;
    brand_name?: string;
    category?: string;
    retail_price: number;
    cost_price: number;
    description?: string;
    stocks?: { branch_id: number; quantity: number; location: string }[];
    is_active: boolean;
    is_global?: boolean;
    branch_ids?: number[];
    branches?: { id: number, name: string }[];
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

interface StockMovement {
    id: number;
    product_id: number;
    branch_id: number;
    user_id?: number;
    movement_type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return' | 'opname';
    quantity: number;
    quantity_before: number;
    quantity_after: number;
    cost_price: number;
    status?: string;
    supplier_id?: number;
    description?: string;
    reference?: string;
    movement_date: string;
    product?: Product;
    branch?: any;
    user?: any;
    supplier?: Supplier;
}

export default function InventoryOrdersPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const { selectedBranchId: branchFilter, setSelectedBranchId: setBranchFilter } = useBranchSync<string | number>(undefined, '');


    // Order Tab State
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);

    // Filter states
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSupplier, setFilterSupplier] = useState<string | number>('all');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

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




    const fetchMovements = async () => {
        setIsLoading(true);
        try {
            const res = await api.getStockMovements({
                branch_id: (branchFilter === '' || branchFilter === 'all') ? undefined : branchFilter,
                type_group: 'orders',
                search: search || undefined,
                status: filterStatus === 'all' ? undefined : filterStatus,
                supplier_id: filterSupplier === 'all' ? undefined : filterSupplier,
                page,
                limit: perPage
            });
            setMovements(res.data || []);
            setTotalPages(res.last_page || 1);
            setTotalItems(res.total || 0);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await api.getSuppliers();
            setSuppliers(res || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchMovements();
    }, [branchFilter, filterStatus, filterSupplier, search, page, refreshTrigger]);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const exportData = (format: string) => {
        const headers = ['Order No.', 'Tanggal', 'Tipe', 'Pemasok', 'Lokasi', 'Status', 'Total Biaya'];
        const rows = movements.map(m => [
            `TRX-${m.id.toString().padStart(4, '0')}`,
            formatDate(m.movement_date),
            m.movement_type === 'in' ? 'Pemesanan' : m.movement_type,
            m.supplier?.name || m.reference || '-',
            m.branch?.name,
            m.status || 'completed',
            Number(m.quantity) * Number(m.cost_price)
        ]);

        if (format === 'CSV' || format === 'XLS') {
            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `pesanan_${new Date().getTime()}.${format.toLowerCase() === 'xls' ? 'csv' : 'csv'}`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'PDF') {
            window.print();
        }
    };

    return (
        <div className="space-y-6 bg-naqupos-cream min-h-screen -m-6 p-6">
            {/* Header Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-naqupos-dark">Pesanan Inventori</h1>
                        <p className="text-sm font-sans text-gray-400 mt-1">Kelola pesanan stok masuk dan transfer antar cabang.</p>
                    </div>

                    <div className="bg-white/50 p-1 rounded-2xl border border-orange-100/50 shadow-sm animate-fadeIn">
                        <BranchSelector
                            selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)}
                            onBranchChange={(id) => setBranchFilter(id || '')}
                            showAllOption={true}
                        />
                    </div>
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

            <div className="bg-white rounded-[2rem] shadow-xl shadow-orange-900/5 border border-orange-100 min-h-[600px] relative overflow-hidden">
                <div className="flex flex-col h-full relative min-h-[500px]">
                    {/* Header & Filters */}
                    <div className="p-6 border-b border-gray-100 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 flex gap-3">
                                {/* Search */}
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari order..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-naqupos-primary rounded-xl text-sm outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Filter Button & Popovers */}
                            <div className="flex items-center gap-2">
                                {/* Download Dropdown */}
                                <div className="relative group">
                                    <button className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:border-naqupos-primary hover:text-naqupos-primary transition-all flex items-center gap-2 shadow-sm">
                                        Unduh <ChevronDown size={14} className="text-gray-400 group-hover:text-naqupos-primary" />
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

                                {/* Status Filter */}
                                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
                                    <Activity size={14} className="text-naqupos-primary" />
                                    <div className="w-40">
                                        <SearchableSelect
                                            value={filterStatus}
                                            onChange={(val) => setFilterStatus(val as string)}
                                            options={[
                                                { value: 'all', label: 'Semua Status' },
                                                { value: 'completed', label: 'SELESAI' },
                                                { value: 'pending', label: 'PENDING' },
                                                { value: 'cancelled', label: 'DIBATALKAN' }
                                            ]}
                                            placeholder="Status"
                                        />
                                    </div>
                                </div>

                                {/* Supplier Filter */}
                                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
                                    <Truck size={14} className="text-naqupos-primary" />
                                    <div className="w-56">
                                        <SearchableSelect
                                            value={filterSupplier}
                                            onChange={(val) => setFilterSupplier(val as string)}
                                            options={[{ value: 'all', label: 'Semua Pemasok' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]}
                                            placeholder="Pemasok"
                                        />
                                    </div>
                                </div>

                                {/* Reset button logic */}
                                {(search || filterStatus !== 'all' || filterSupplier !== 'all' || (branchFilter !== '' && branchFilter !== 'all')) && (
                                    <button
                                        onClick={() => {
                                            setSearch('');
                                            setFilterStatus('all');
                                            setFilterSupplier('all');
                                            setBranchFilter('');
                                        }}
                                        className="p-2.5 bg-naqupos-cream text-naqupos-primary hover:bg-naqupos-primary hover:text-white rounded-xl transition-all border border-naqupos-accent shadow-sm animate-fadeIn"
                                        title="Reset Filter"
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-naqupos-cream text-naqupos-dark uppercase tracking-wider text-xs font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-xl">Order No.</th>
                                        <th className="px-6 py-4 text-center">Dibuat Pada</th>
                                        <th className="px-6 py-4">Tipe</th>
                                        <th className="px-6 py-4">Pemasok</th>
                                        <th className="px-6 py-4">Lokasi</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right rounded-tr-xl">Total Biaya</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 bg-white">
                                    {isLoading ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" /> Loading...</td></tr>
                                    ) : movements.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Tidak ada data pesanan</td></tr>
                                    ) : (
                                        movements.map(m => (
                                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-700">#TRX-{m.id.toString().padStart(4, '0')}</td>
                                                <td className="px-6 py-4 text-center text-gray-600 font-medium">{formatDate(m.movement_date)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${m.movement_type === 'in' ? 'bg-naqupos-primary/10 text-naqupos-primary' : 'bg-naqupos-dark/10 text-naqupos-dark'}`}>
                                                        {m.movement_type === 'in' ? 'Pemesanan' : m.movement_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-700">{m.supplier?.name || m.reference || '-'}</div>
                                                    <div className="text-[10px] text-gray-400">Ref: {m.reference || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 font-medium">{m.branch?.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${m.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' :
                                                        m.status === 'pending' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                                                            'bg-[#EF4444]/10 text-[#EF4444]'
                                                        }`}>
                                                        {m.status || 'completed'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-naqupos-primary">
                                                    {formatCurrency(Number(m.quantity) * Number(m.cost_price))}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs text-gray-500">
                            <div>Menampilkan {(page - 1) * perPage + 1} - {Math.min(page * perPage, totalItems)} dari {totalItems} pesanan</div>
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

                        {/* Floating Action Button & Menu */}
                        <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4 z-40">
                            {showMenu && (
                                <div className="bg-white rounded-[1.5rem] shadow-2xl border border-orange-100 py-3 w-56 animate-slideUp overflow-hidden">
                                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aksi Stok</span>
                                    </div>
                                    <button
                                        onClick={() => { setShowOrderModal(true); setShowMenu(false); }}
                                        className="w-full px-4 py-3.5 flex items-center gap-4 hover:bg-naqupos-cream text-naqupos-dark transition-all hover:translate-x-1"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-naqupos-primary">
                                            <Package size={20} />
                                        </div>
                                        <span className="font-bold text-sm">Pesanan</span>
                                    </button>
                                    <button
                                        onClick={() => { setShowTransferModal(true); setShowMenu(false); }}
                                        className="w-full px-4 py-3.5 flex items-center gap-4 hover:bg-naqupos-cream text-naqupos-dark transition-all hover:translate-x-1"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-naqupos-primary">
                                            <RefreshCw size={20} />
                                        </div>
                                        <span className="font-bold text-sm">Transfer</span>
                                    </button>
                                    <div className="p-2 pt-3">
                                        <button
                                            onClick={() => setShowMenu(false)}
                                            className="w-full py-3 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold text-xs uppercase tracking-widest"
                                        >
                                            <X size={16} />
                                            <span>Tutup</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!showMenu && (
                                <button
                                    onClick={() => setShowMenu(true)}
                                    className="w-16 h-16 bg-naqupos-primary hover:bg-[#B07835] text-white rounded-full flex items-center justify-center shadow-2xl shadow-orange-900/40 transition-all hover:scale-110 active:scale-90 group"
                                >
                                    <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            )}
                        </div>

                        {/* Modals */}
                        {showOrderModal && (
                            <CreateOrderModal
                                onClose={() => setShowOrderModal(false)}
                                onSuccess={() => { setShowOrderModal(false); handleRefresh(); }}
                                branches={branches}
                            />
                        )}
                        {showTransferModal && (
                            <CreateTransferModal
                                onClose={() => setShowTransferModal(false)}
                                onSuccess={() => { setShowTransferModal(false); handleRefresh(); }}
                                branches={branches}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CreateOrderModal({ onClose, onSuccess, branches }: { onClose: () => void, onSuccess: () => void, branches: any[] }) {
    const [step, setStep] = useState(1);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [qty, setQty] = useState('1');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        api.getSuppliers().then(setSuppliers);
        api.getProducts({ limit: 100 }).then(res => setProducts(res.data || []));
    }, []);

    const handleSubmit = async () => {
        if (!selectedProduct || !selectedBranch) return;
        setIsLoading(true);
        try {
            await api.createStockMovement({
                product_id: selectedProduct.id,
                branch_id: selectedBranch.id,
                movement_type: 'in',
                quantity: Number(qty),
                reference: selectedSupplier?.name,
                supplier_id: selectedSupplier?.id,
                cost_price: selectedProduct.cost_price,
                status: 'completed',
                description: 'Pemesanan stok dari supplier'
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            swal.error("Gagal membuat pesanan");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col h-[600px]">
                <div className="p-6 border-b flex flex-col items-center gap-4">
                    <div className="w-full flex justify-between items-center">
                        <div className="w-10"></div>
                        <h2 className="text-xl font-bold text-gray-800">Buat Order</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center w-full max-w-sm px-4">
                        {[
                            { id: 1, label: 'Supplier' },
                            { id: 2, label: 'Lokasi Tujuan' },
                            { id: 3, label: 'Pilih Produk' },
                            { id: 4, label: 'Konfirmasi' }
                        ].map((s, i) => (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center relative flex-1">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${step >= s.id ? 'bg-naqupos-primary border-naqupos-primary text-white shadow-[0_0_0_4px_rgba(197,137,64,0.1)]' : 'bg-white border-gray-200 text-gray-400'}`}>
                                        {step > s.id ? '✓' : s.id}
                                    </div>
                                    <span className={`text-[10px] mt-2 font-bold whitespace-nowrap transition-colors ${step >= s.id ? 'text-naqupos-primary' : 'text-gray-400'}`}>{s.label}</span>
                                </div>
                                {i < 3 && <div className={`h-[2px] w-full mx-2 transition-colors ${step > s.id ? 'bg-naqupos-primary' : 'bg-gray-100'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h4 className="text-center text-sm font-bold text-gray-600 mb-6">Pilih supplier</h4>
                            <SearchableSelect
                                value={selectedSupplier?.id || ''}
                                onChange={(val) => setSelectedSupplier(suppliers.find(s => s.id === Number(val)) || null)}
                                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                placeholder="Pilih Supplier"
                            />
                            <div className="flex justify-between pt-4">
                                <div></div>
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!selectedSupplier}
                                    className="px-6 py-2 bg-naqupos-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-[#B07835] transition-colors"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h4 className="text-center text-sm font-bold text-gray-600 mb-6">Pilih lokasi tujuan order</h4>
                            <SearchableSelect
                                value={selectedBranch?.id || ''}
                                onChange={(val) => setSelectedBranch(branches.find(b => b.id === Number(val)) || null)}
                                options={branches.map(b => ({ value: b.id, label: b.name }))}
                                placeholder="Pilih Lokasi"
                            />
                            <div className="flex justify-between pt-4">
                                <button onClick={() => setStep(1)} className="text-gray-500 font-bold text-sm">Kembali</button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!selectedBranch}
                                    className="px-6 py-2 bg-naqupos-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-[#B07835] transition-colors"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h4 className="text-center text-sm font-bold text-gray-600 mb-6">Pilih produk</h4>
                            <SearchableSelect
                                value={selectedProduct?.id || ''}
                                onChange={(val) => setSelectedProduct(products.find(p => p.id === Number(val)) || null)}
                                options={products.map(p => ({ value: p.id, label: `${p.name} - ${p.sku}` }))}
                                placeholder="Pilih Produk"
                            />
                            <div className="flex justify-between pt-4">
                                <button onClick={() => setStep(2)} className="text-gray-500 font-bold text-sm">Kembali</button>
                                <button
                                    onClick={() => setStep(4)}
                                    disabled={!selectedProduct}
                                    className="px-6 py-2 bg-naqupos-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-[#B07835] transition-colors"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 flex flex-col items-center justify-center pt-10">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-naqupos-primary">
                                <Package size={40} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-xl text-gray-800">Konfirmasi Order</h3>
                                <div className="bg-gray-50 p-4 rounded-2xl w-full max-w-sm space-y-2 text-left mt-4 border border-gray-100">
                                    <div className="flex justify-between"><span className="text-gray-400 text-xs uppercase font-bold">Produk</span><span className="text-sm font-bold text-gray-700">{selectedProduct?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400 text-xs uppercase font-bold">Pemasok</span><span className="text-sm font-bold text-gray-700">{selectedSupplier?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400 text-xs uppercase font-bold">Tujuan</span><span className="text-sm font-bold text-gray-700">{selectedBranch?.name}</span></div>
                                </div>
                                <div className="mt-4 flex flex-col items-center">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2">Jumlah Pesanan</label>
                                    <input
                                        type="number"
                                        value={qty}
                                        onChange={(e) => setQty(e.target.value)}
                                        className="w-24 text-center text-3xl font-bold bg-transparent border-b-2 border-naqupos-primary focus:outline-none focus:border-[#B07835]"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 w-full justify-center mt-4">
                                <button onClick={() => setStep(3)} className="px-6 py-2 text-gray-500 font-bold text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Kembali</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="px-10 py-3 bg-naqupos-primary text-white font-bold rounded-xl shadow-lg hover:bg-[#B07835] transition-colors flex items-center gap-2"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Buat Order Sekarang'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        // </div>
    );
}

function CreateTransferModal({ onClose, onSuccess, branches }: { onClose: () => void, onSuccess: () => void, branches: any[] }) {
    const [step, setStep] = useState(1);
    const [products, setProducts] = useState<Product[]>([]);
    const [srcBranch, setSrcBranch] = useState<any>(null);
    const [destBranch, setDestBranch] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [qty, setQty] = useState('1');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        api.getProducts({ limit: 100 }).then(res => setProducts(res.data || []));
    }, []);

    const handleSubmit = async () => {
        if (!selectedProduct || !srcBranch || !destBranch) return;
        setIsLoading(true);
        try {
            // 1. Movement Out from Source
            await api.createStockMovement({
                product_id: selectedProduct.id,
                branch_id: srcBranch.id,
                movement_type: 'transfer',
                quantity: -Number(qty),
                is_source: true,
                description: `Transfer ke ${destBranch.name}`
            });

            // 2. Movement In to Destination
            await api.createStockMovement({
                product_id: selectedProduct.id,
                branch_id: destBranch.id,
                movement_type: 'transfer',
                quantity: Number(qty),
                description: `Transfer dari ${srcBranch.name}`
            });

            onSuccess();
        } catch (error) {
            console.error(error);
            swal.error("Gagal melakukan transfer");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col h-[600px]">
                <div className="p-6 border-b flex flex-col items-center gap-4">
                    <div className="w-full flex justify-between items-center">
                        <div className="w-10"></div>
                        <h2 className="text-xl font-bold text-gray-800">Buat Transfer</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center w-full max-w-sm px-4">
                        {[
                            { id: 1, label: 'Lokasi Sumber' },
                            { id: 2, label: 'Lokasi Tujuan' },
                            { id: 3, label: 'Pilih Produk' },
                            { id: 4, label: 'Konfirmasi' }
                        ].map((s, i) => (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center relative flex-1">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${step >= s.id ? 'bg-naqupos-primary border-naqupos-primary text-white shadow-[0_0_0_4px_rgba(197,137,64,0.1)]' : 'bg-white border-gray-200 text-gray-400'}`}>
                                        {step > s.id ? '✓' : s.id}
                                    </div>
                                    <span className={`text-[10px] mt-2 font-bold whitespace-nowrap transition-colors ${step >= s.id ? 'text-naqupos-primary' : 'text-gray-400'}`}>{s.label}</span>
                                </div>
                                {i < 3 && <div className={`h-[2px] w-full mx-2 transition-colors ${step > s.id ? 'bg-naqupos-primary' : 'bg-gray-100'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h4 className="text-center text-sm font-bold text-gray-600 mb-6">Pilih lokasi sumber transfer</h4>
                            <SearchableSelect
                                value={srcBranch?.id || ''}
                                onChange={(val) => setSrcBranch(branches.find(b => b.id === Number(val)) || null)}
                                options={branches.map(b => ({ value: b.id, label: b.name }))}
                                placeholder="Pilih Lokasi Sumber"
                            />
                            <div className="flex justify-between pt-4">
                                <div></div>
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!srcBranch}
                                    className="px-6 py-2 bg-naqupos-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-[#B07835] transition-colors"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h4 className="text-center text-sm font-bold text-gray-600 mb-6">Pilih lokasi tujuan transfer</h4>
                            <SearchableSelect
                                value={destBranch?.id || ''}
                                onChange={(val) => setDestBranch(branches.find(b => b.id === Number(val)) || null)}
                                options={branches.filter(b => b.id !== srcBranch?.id).map(b => ({ value: b.id, label: b.name }))}
                                placeholder="Pilih Lokasi Tujuan"
                            />
                            <div className="flex justify-between pt-4">
                                <button onClick={() => setStep(1)} className="text-gray-500 font-bold text-sm">Kembali</button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!destBranch}
                                    className="px-6 py-2 bg-naqupos-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-[#B07835] transition-colors"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h4 className="text-center text-sm font-bold text-gray-600 mb-6">Pilih produk</h4>
                            <SearchableSelect
                                value={selectedProduct?.id || ''}
                                onChange={(val) => setSelectedProduct(products.find(p => p.id === Number(val)) || null)}
                                options={products.map(p => ({ value: p.id, label: `${p.name} - ${p.sku}` }))}
                                placeholder="Pilih Produk"
                            />
                            <div className="flex justify-between pt-4">
                                <button onClick={() => setStep(2)} className="text-gray-500 font-bold text-sm">Kembali</button>
                                <button
                                    onClick={() => setStep(4)}
                                    disabled={!selectedProduct}
                                    className="px-6 py-2 bg-naqupos-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-[#B07835] transition-colors"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 flex flex-col items-center justify-center pt-10">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <RefreshCw size={40} className="text-naqupos-primary" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-xl text-gray-800">Konfirmasi Transfer</h3>
                                <div className="bg-gray-50 p-4 rounded-2xl w-full max-w-sm space-y-2 text-left mt-4 border border-gray-100">
                                    <div className="flex justify-between"><span className="text-gray-400 text-xs uppercase font-bold">Produk</span><span className="text-sm font-bold text-gray-700">{selectedProduct?.name}</span></div>
                                    <div className="flex items-center gap-4 py-2 border-t border-gray-100 mt-2">
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase font-bold text-gray-400">Sumber</p>
                                            <p className="text-xs font-bold text-gray-700">{srcBranch?.name}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-gray-300" />
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase font-bold text-gray-400">Tujuan</p>
                                            <p className="text-xs font-bold text-gray-700">{destBranch?.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-col items-center">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2">Jumlah Transfer</label>
                                    <input
                                        type="number"
                                        value={qty}
                                        onChange={(e) => setQty(e.target.value)}
                                        className="w-24 text-center text-3xl font-bold bg-transparent border-b-2 border-naqupos-primary focus:outline-none focus:border-[#B07835]"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 w-full justify-center mt-4">
                                <button onClick={() => setStep(3)} className="px-6 py-2 text-gray-500 font-bold text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Kembali</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="px-10 py-3 bg-naqupos-primary text-white font-bold rounded-xl shadow-lg hover:bg-[#B07835] transition-colors flex items-center gap-2"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Buat Transfer Sekarang'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        // </div >
    );
}

