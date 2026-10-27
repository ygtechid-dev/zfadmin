import { Search, ChevronDown, Activity, RotateCcw, Building, Phone, FileText, Plus, X, ArrowRight, Loader2, ChevronLeft, ChevronRight, Package, Upload, Download, Pencil } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import BranchSelector from '../../components/common/BranchSelector';
import swal from '../../utils/swal';

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
}

import { useBranchSync } from '../../hooks/useBranchSync';
import React from 'react';

export default function StockOpnamePage() {
    const [branches, setBranches] = useState<any[]>([]);

    // Sync with global branch
    const {
        selectedBranchId: branchFilter,
        setSelectedBranchId: setBranchFilter
    } = useBranchSync<string | number>(undefined, '');

    // Opname Tab State
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [showSelectLocation, setShowSelectLocation] = useState(false);
    const [selectedOpnameBranch, setSelectedOpnameBranch] = useState<any>(null);
    const [showOpnameProcess, setShowOpnameProcess] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
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


    const fetchMovements = async () => {
        setIsLoading(true);
        try {
            const res = await api.getStockMovements({
                branch_id: (branchFilter === '' || branchFilter === 'all') ? undefined : branchFilter,
                type_group: 'opname',
                status: statusFilter === 'all' ? undefined : statusFilter,
                page,
                limit: perPage
            });
            setMovements(res.data || []);
            setTotalPages(res.last_page || 1);
            setTotalItems(res.total || 0);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchMovements();
    }, [branchFilter, statusFilter, page, refreshTrigger]);

    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const exportData = (format: string) => {
        if (format === 'PDF') {
            window.print();
            return;
        }

        const headers = ['ID', 'Nama', 'Lokasi', 'Tanggal', 'Status'];
        const csvContent = [
            headers.join(','),
            ...movements.map(m => [
                `"#${m.id}"`,
                `"Stock Opname #${m.id}"`,
                `"${m.branch?.name || ''}"`,
                `"${formatDate(m.movement_date)}"`,
                `"${m.status || 'completed'}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `opname_naqupos_${new Date().getTime()}.${format.toLowerCase() === 'xls' ? 'csv' : 'csv'} `);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 bg-naqupos-cream min-h-screen -m-6 p-6">
            {/* Header Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-naqupos-dark">Stok Opname</h1>
                        <p className="text-sm font-sans text-gray-400 mt-1">Lakukan pemeriksaan stok fisik secara berkala per cabang.</p>
                    </div>

                    {isSuperAdminOrAdmin && (
                        <div className="bg-white/50 p-1 rounded-2xl border border-orange-100/50 shadow-sm animate-fadeIn">
                            <BranchSelector
                                selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)}
                                onBranchChange={(id) => setBranchFilter(id || '')}
                                showAllOption={true}
                            />
                        </div>
                    )}
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
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-naqupos-dark text-lg">Riwayat Stok Opname</h3>
                            <p className="text-xs text-gray-500 mt-1">Kelola dan pantau penyesuaian stok per cabang.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Export Dropdown */}
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

                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
                                <Activity size={14} className="text-naqupos-primary" />
                                <div className="w-40">
                                    <SearchableSelect
                                        value={statusFilter}
                                        onChange={(val) => setStatusFilter(val as string)}
                                        options={[
                                            { value: 'all', label: 'Semua Status' },
                                            { value: 'pending', label: 'Draf' },
                                            { value: 'completed', label: 'Selesai' }
                                        ]}
                                        placeholder="Status"
                                    />
                                </div>
                            </div>

                            {(statusFilter !== 'all' || (branchFilter !== '' && branchFilter !== 'all')) && (
                                <button
                                    onClick={() => {
                                        setStatusFilter('all');
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
                                    <th className="px-6 py-4 rounded-tl-xl text-left">Nama</th>
                                    <th className="px-6 py-4 text-left">Lokasi</th>
                                    <th className="px-6 py-4 text-left">Dibuat Pada</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 rounded-tr-xl text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" /> Loading...</td></tr>
                                ) : movements.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Tidak ada data opname</td></tr>
                                ) : (
                                    movements.map(m => (
                                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-700">Stock Opname #{m.id}</div>
                                                <div className="text-[10px] text-gray-400">Pencatat: {m.user?.name || 'System'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">{m.branch?.name}</td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">{formatDate(m.movement_date)}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/10 text-[#10B981]">
                                                    Selesai
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="px-4 py-1.5 bg-naqupos-primary/10 text-naqupos-primary rounded-lg text-xs font-bold hover:bg-naqupos-primary/20 transition-colors">
                                                    Perhitungan
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs text-gray-500">
                        <div>Menampilkan {(page - 1) * perPage + 1} - {Math.min(page * perPage, totalItems)} dari {totalItems} riwayat opname</div>
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
                                                className={`w - 8 h - 8 rounded - lg border text - xs font - medium transition - all ${page === p ? 'bg-naqupos-primary text-white border-naqupos-primary' : 'bg-white hover:bg-naqupos-primary/5 hover:text-naqupos-primary border-gray-200'} `}
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


                    {/* Floating Action Button for Opname */}
                    <button
                        onClick={() => setShowSelectLocation(true)}
                        className="fixed bottom-8 right-8 w-16 h-16 bg-naqupos-primary hover:bg-[#B07835] text-white rounded-full flex items-center justify-center shadow-2xl shadow-orange-900/40 transition-all hover:scale-105 active:scale-95 z-40 group"
                    >
                        <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>

                    {/* Step 1: Select Location Modal */}
                    {showSelectLocation && (
                        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
                                <div className="p-6 border-b flex justify-between items-center bg-white">
                                    <h2 className="text-xl font-bold text-gray-800">Pilih lokasi</h2>
                                    <button onClick={() => setShowSelectLocation(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                                    {branches.map(branch => (
                                        <button
                                            key={branch.id}
                                            onClick={() => {
                                                setSelectedOpnameBranch(branch);
                                                setShowSelectLocation(false);
                                                setShowOpnameProcess(true);
                                            }}
                                            className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-all text-left group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                                {branch.image_url ? (
                                                    <img src={branch.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl uppercase">
                                                        {branch.name[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-800 group-hover:text-naqupos-primary transition-colors">{branch.name}</div>
                                                <div className="text-xs text-gray-500 line-clamp-1">{branch.address}</div>
                                            </div>
                                            <ArrowRight size={20} className="text-gray-300 group-hover:text-naqupos-primary transition-all translate-x-[-10px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Opname Process Modal */}
                    {showOpnameProcess && (
                        <OpnameProcessModal
                            branch={selectedOpnameBranch}
                            onClose={() => setShowOpnameProcess(false)}
                            onSuccess={() => {
                                setShowOpnameProcess(false);
                                handleRefresh();
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function OpnameProcessModal({ branch, onClose, onSuccess }: { branch: any, onClose: () => void, onSuccess: () => void }) {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'semua' | 'terhitung' | 'pengecualian'>('semua');
    const [quantities, setQuantities] = useState<Record<number, string>>({}); // product_id -> actual_qty
    const [isSaving, setIsSaving] = useState(false);

    // New states for functionality
    const [opnameTitle, setOpnameTitle] = useState('Stock Opname #NEW');
    const [opnameNotes, setOpnameNotes] = useState('Tidak ada catatan');
    const [showEditMetadata, setShowEditMetadata] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [showImportOpnameModal, setShowImportOpnameModal] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const barcodeRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const res = await api.getProducts({ branch_id: branch.id, limit: 1000 });
                setProducts(res.data || []);
            } catch (err) { console.error(err); }
            finally { setIsLoading(false); }
        };
        fetchProducts();
    }, [branch.id]);

    useEffect(() => {
        if (isScanning && barcodeRef.current) {
            barcodeRef.current.focus();
        }
    }, [isScanning]);

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
        if (tab === 'semua') return matchesSearch;
        if (tab === 'terhitung') return matchesSearch && quantities[p.id] !== undefined && quantities[p.id] !== '';
        if (tab === 'pengecualian') return matchesSearch && (quantities[p.id] === undefined || quantities[p.id] === '');
        return matchesSearch;
    });

    const handleSave = async () => {
        const itemsToSave = Object.entries(quantities).filter(([_, val]) => val !== '').map(([id, val]) => ({
            product_id: Number(id),
            actual_qty: Number(val)
        }));

        if (itemsToSave.length === 0) {
            swal.warning("Masukkan setidaknya satu hasil perhitungan");
            return;
        }

        setIsSaving(true);
        try {
            for (const item of itemsToSave) {
                const product = products.find(p => p.id === item.product_id);
                const expected = product?.stocks?.find((s: any) => s.branch_id === branch.id)?.quantity || 0;
                const diff = item.actual_qty - expected;

                if (diff !== 0) {
                    await api.createStockMovement({
                        product_id: item.product_id,
                        branch_id: branch.id,
                        movement_type: 'opname',
                        quantity: diff,
                        description: `${opnameTitle}: ${opnameNotes} `,
                        status: 'completed'
                    });
                }
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            swal.error("Gagal menyimpan data opname");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const product = products.find(p => p.sku === barcodeInput || p.code === barcodeInput);
        if (product) {
            const currentQty = quantities[product.id] || '';
            const nextQty = currentQty === '' ? '1' : (Number(currentQty) + 1).toString();
            setQuantities({ ...quantities, [product.id]: nextQty });
            setBarcodeInput('');
        } else {
            swal.error("Produk tidak ditemukan");
            setBarcodeInput('');
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['SKU', 'QTY_TERHITUNG'];
        const csvContent = [headers.join(','), 'SKU-CONTOH-1,10', 'SKU-CONTOH-2,5'].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'template_opname.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const processImportFile = async (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    const lines = text.split('\n');
                    const newQuantities = { ...quantities };

                    lines.forEach((line, index) => {
                        if (index === 0 && line.toLowerCase().includes('sku')) return; // Skip header if present

                        const [sku, qty] = line.split(',');
                        const cleanSku = sku?.trim();
                        const cleanQty = qty?.trim();

                        if (cleanSku && cleanQty && !isNaN(Number(cleanQty))) {
                            const product = products.find(p => p.sku === cleanSku);
                            if (product) {
                                newQuantities[product.id] = cleanQty;
                            }
                        }
                    });
                    setQuantities(newQuantities);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const newQuantities = { ...quantities };

            lines.forEach(line => {
                const [sku, qty] = line.split(',');
                const cleanSku = sku?.trim();
                const cleanQty = qty?.trim();

                if (cleanSku && cleanQty) {
                    const product = products.find(p => p.sku === cleanSku);
                    if (product) {
                        newQuantities[product.id] = cleanQty;
                    }
                }
            });
            setQuantities(newQuantities);
            swal.success("Import berhasil");
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 bg-[#FBF9F4] z-[70] flex flex-col overflow-hidden animate-slideUp">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 flex-shrink-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={onClose} className="p-2.5 hover:bg-gray-50 rounded-full text-gray-400 transition-colors border border-gray-100">
                            <X size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-naqupos-dark">Proses Stok Opname</h1>
                            <p className="text-[10px] font-bold text-naqupos-primary uppercase tracking-widest">{branch.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".csv,.txt" />
                        <button
                            onClick={() => setShowImportOpnameModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-naqupos-primary hover:text-naqupos-primary transition-all"
                        >
                            <Package size={18} /> Import CSV
                        </button>
                        <button
                            onClick={() => setIsScanning(!isScanning)}
                            className={`flex items - center gap - 2 px - 5 py - 2.5 border rounded - xl text - sm font - bold transition - all ${isScanning ? 'bg-naqupos-primary text-white border-naqupos-primary shadow-lg shadow-orange-900/20' : 'bg-white border-gray-200 text-gray-600 hover:border-naqupos-primary hover:text-naqupos-primary'} `}
                        >
                            <Search size={18} /> {isScanning ? 'Berhenti Scan' : 'Barcode Scan'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-[#FBF9F4] pb-20">
                <div className="max-w-7xl mx-auto p-8 space-y-8">
                    {/* Hero Info Card */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-orange-900/5 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-naqupos-primary/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-naqupos-dark underline decoration-naqupos-primary/20 underline-offset-8 decoration-4">{opnameTitle}</h2>
                                    <button onClick={() => setShowEditMetadata(true)} className="p-2 hover:bg-naqupos-primary/10 rounded-lg text-naqupos-primary transition-colors">
                                        <Pencil size={18} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catatan</span>
                                        <p className="text-sm font-medium text-gray-600 italic">"{opnameNotes}"</p>
                                    </div>
                                    <div className="h-8 w-px bg-gray-100"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inisiator</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-naqupos-primary rounded-full flex items-center justify-center text-[10px] text-white font-bold">A</div>
                                            <p className="text-sm font-bold text-naqupos-dark">Administrator</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 bg-naqupos-cream/30 p-6 rounded-2xl border border-naqupos-primary/10">
                                <div className="text-center px-4 border-r border-naqupos-primary/20">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Produk</div>
                                    <div className="text-xl font-bold text-naqupos-dark">{products.length}</div>
                                </div>
                                <div className="text-center px-4 border-r border-naqupos-primary/20">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Terhitung</div>
                                    <div className="text-xl font-bold text-[#10B981]">{Object.values(quantities).filter(v => v !== '').length}</div>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-10 py-4 bg-naqupos-primary hover:bg-[#B07835] text-white rounded-2xl font-bold shadow-xl shadow-orange-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 min-w-[160px]"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
                                        <>
                                            <span>Selesaikan</span>
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {isScanning && (
                            <form onSubmit={handleBarcodeSubmit} className="mt-8 animate-slideUp">
                                <div className="relative group/input">
                                    <div className="absolute inset-x-0 inset-y-0 bg-naqupos-primary/5 rounded-2xl scale-[1.02] border border-naqupos-primary/20 transition-all"></div>
                                    <input
                                        ref={barcodeRef}
                                        type="text"
                                        placeholder="Scan barcode produk di sini..."
                                        value={barcodeInput}
                                        onChange={e => setBarcodeInput(e.target.value)}
                                        className="relative w-full px-8 py-5 bg-white border border-naqupos-primary/30 rounded-2xl text-2xl font-bold outline-none focus:border-naqupos-primary focus:ring-4 focus:ring-naqupos-primary/5 transition-all text-naqupos-dark placeholder:text-gray-200"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3 bg-naqupos-primary/10 px-4 py-2 rounded-xl">
                                        <div className="w-2 h-2 bg-naqupos-primary rounded-full animate-ping"></div>
                                        <span className="text-xs font-bold text-naqupos-primary tracking-widest">SCANNER AKTIF</span>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Table Control Section */}
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
                                {[
                                    { id: 'semua', label: 'Semua Produk', color: 'gray' },
                                    { id: 'terhitung', label: 'Sudah Dihitung', color: 'green' },
                                    { id: 'pengecualian', label: 'Belum Dihitung', color: 'orange' }
                                ].map(t => {
                                    const count = t.id === 'semua' ? products.length :
                                        t.id === 'terhitung' ? Object.values(quantities).filter(v => v !== '').length :
                                            products.length - Object.values(quantities).filter(v => v !== '').length;
                                    const isActive = tab === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setTab(t.id as any)}
                                            className={`px - 6 py - 2.5 rounded - xl text - xs font - bold transition - all flex items - center gap - 2 ${isActive ? 'bg-naqupos-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'} `}
                                        >
                                            {t.label}
                                            <span className={`px - 2 py - 0.5 rounded - lg text - [10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'} `}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex-1 max-w-md relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-naqupos-primary transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Cari nama produk atau SKU..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-naqupos-primary/5 focus:border-naqupos-primary transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Enhanced Product Table */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-orange-900/5 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-naqupos-cream border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="px-8 py-5">Informasi Produk</th>
                                        <th className="px-8 py-5">Identitas</th>
                                        <th className="px-8 py-5 text-center">Estimasi Sistem</th>
                                        <th className="px-8 py-5 text-center">Input Hasil</th>
                                        <th className="px-8 py-5 text-right">Selisih</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="px-8 py-32 text-center text-gray-400 font-bold"><Loader2 className="animate-spin mx-auto mb-4 text-naqupos-primary" size={40} /> <span className="tracking-widest opacity-50 uppercase text-[10px]">Menyinkronkan data inventori...</span></td></tr>
                                    ) : filteredProducts.length === 0 ? (
                                        <tr><td colSpan={5} className="px-8 py-32 text-center text-gray-300 font-bold tracking-widest uppercase text-xs">Produk tidak ditemukan</td></tr>
                                    ) : (
                                        filteredProducts.map(p => {
                                            const expected = p.stocks?.find((s: any) => s.branch_id === branch.id)?.quantity || 0;
                                            const actualStr = quantities[p.id];
                                            const isCounted = actualStr !== undefined && actualStr !== '';
                                            const actual = isCounted ? Number(actualStr) : expected;
                                            const diff = isCounted ? actual - expected : 0;

                                            return (
                                                <tr key={p.id} className={`group transition - all ${isCounted ? 'bg-naqupos-cream/40' : 'hover:bg-gray-50/50'} `}>
                                                    <td className="px-8 py-6">
                                                        <div className="font-bold text-naqupos-dark flex items-center gap-3">
                                                            <div className={`w - 2 h - 2 rounded - full ${isCounted ? 'bg-naqupos-primary' : 'bg-gray-200'} `}></div>
                                                            <span className="group-hover:translate-x-1 transition-transform">{p.name}</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-bold mt-1 ml-5 uppercase tracking-wider">{p.category || 'Tanpa Kategori'}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">SKU</div>
                                                        <div className="text-xs  font-bold text-gray-600">{p.sku}</div>
                                                        {p.code && <div className="text-[10px] text-gray-300 font-medium mt-1 uppercase">{p.code}</div>}
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="inline-flex flex-col items-center bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 min-w-[80px]">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Sistem</span>
                                                            <span className="text-lg font-bold text-naqupos-dark">{expected}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex justify-center relative group/input">
                                                            <input
                                                                type="number"
                                                                className={`w - 24 px - 4 py - 3 bg - white border - 2 rounded - xl text - center text - lg font - bold transition - all outline - none ${isCounted ? 'border-naqupos-primary ring-4 ring-naqupos-primary/10 text-naqupos-primary' : 'border-gray-100 focus:border-naqupos-primary focus:ring-4 focus:ring-naqupos-primary/5 text-gray-400 hover:border-gray-200'} `}
                                                                value={quantities[p.id] || ''}
                                                                placeholder={expected.toString()}
                                                                onChange={(e) => setQuantities({ ...quantities, [p.id]: e.target.value })}
                                                            />
                                                            {!isCounted && <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white"></div>}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className={`flex flex - col items - end ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-gray-300'} `}>
                                                            <span className="text-sm font-bold tracking-widest">
                                                                {diff > 0 ? `+ ${diff} ` : diff === 0 ? '0' : diff}
                                                            </span>
                                                            {isCounted && (
                                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                                                    {diff === 0 ? 'Match' : diff > 0 ? 'Surplus' : 'Defisit'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Metadata Modal */}
            {showEditMetadata && (
                <div className="fixed inset-0 bg-naqupos-dark/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-naqupos-cream/20">
                            <div>
                                <h3 className="text-xl font-bold text-naqupos-dark">Detail Opname</h3>
                                <p className="text-xs text-gray-500">Sesuaikan informasi dasar sesi opname</p>
                            </div>
                            <button onClick={() => setShowEditMetadata(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Judul Sesi</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-naqupos-cream border border-gray-200 rounded-2xl outline-none focus:border-naqupos-primary focus:ring-4 focus:ring-naqupos-primary/5 transition-all font-bold text-naqupos-dark"
                                    value={opnameTitle}
                                    onChange={e => setOpnameTitle(e.target.value)}
                                    placeholder="Contoh: Stok Opname Tahunan"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Catatan Tambahan</label>
                                <textarea
                                    className="w-full px-5 py-3.5 bg-naqupos-cream border border-gray-200 rounded-2xl outline-none focus:border-naqupos-primary focus:ring-4 focus:ring-naqupos-primary/5 transition-all h-32 resize-none text-sm leading-relaxed"
                                    value={opnameNotes}
                                    onChange={e => setOpnameNotes(e.target.value)}
                                    placeholder="Masukkan detail tambahan atau instruksi..."
                                />
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button onClick={() => setShowEditMetadata(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-200">Batal</button>
                                <button onClick={() => setShowEditMetadata(false)} className="flex-1 py-4 bg-naqupos-primary text-white font-bold rounded-2xl shadow-xl shadow-orange-900/10 hover:shadow-orange-900/20 hover:-translate-y-0.5 transition-all">Simpan Detail</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showImportOpnameModal && (
                <ImportModal
                    title="Impor Hasil Opname"
                    onClose={() => setShowImportOpnameModal(false)}
                    onDownloadTemplate={handleDownloadTemplate}
                    onUpload={processImportFile}
                />
            )}
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
            console.error(err);
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
