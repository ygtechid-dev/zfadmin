import { Plus, Edit, Trash2, Percent, X, AlertTriangle, Search, Calendar, RotateCcw, Building, Copy, Check, Tag, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatDate } from '../../utils/date';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import swal from '../../utils/swal';
import { useBranchSync } from '../../hooks/useBranchSync';

interface Promo {
    id: number;
    title: string;
    type: 'percent' | 'nominal' | 'service' | 'featured';
    discount: number;
    code: string;
    quota: number;
    used: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'expired';
    description?: string;
    branch_id?: number;
    service_category_id?: number | null;
    promo_services?: PromoService[];
    is_featured?: boolean;
    terms?: string[] | string | null; // 👈 tambah ini
}

interface PromoService {
    id?: number;
    service_id?: number | null;
    service_category_id?: number | null;
    name: string;
     variant_id?: number | null;      // 👈 tambah
    variant_name?: string | null;    // 👈 tambah
    discount_type: 'percent' | 'nominal';
    discount_value: number;
}

interface PromoResponse {
    id: number;
    title: string;
    type: 'percent' | 'nominal' | 'service' | 'featured';
    discount: number;
    code: string;
    quota: number;
    used: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'expired';
    description?: string;
    branch_id?: number;
    service_category_id?: number | null;
    promo_services?: any[];
    is_featured?: boolean;
}

export default function VoucherPromoPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [serviceCategories, setServiceCategories] = useState<{ value: string; label: string }[]>([]);
const [allServices, setAllServices] = useState<{ 
    id: number; 
    name: string; 
    category: string; 
    service_category_id?: number | null;
    variants?: { id: number; name: string }[]; // 👈 tambah
}[]>([]);
    const [servicesLoading, setServicesLoading] = useState(false);

    const {
        selectedBranchId: branchFilter,
        setSelectedBranchId: setBranchFilter
    } = useBranchSync<string | number>(() => setPage(1), 'all');

    const globalBranchId = branchFilter === 'all' ? 'all' : branchFilter.toString();
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [promos, setPromos] = useState<Promo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [searchFilter, setSearchFilter] = useState('');

    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const [servicePickerSearch, setServicePickerSearch] = useState('');
    const [showServicePickerModal, setShowServicePickerModal] = useState(false);

    const [togglingFeaturedId, setTogglingFeaturedId] = useState<number | null>(null);

    const [promoForm, setPromoForm] = useState({
        title: '',
        type: 'percent' as 'percent' | 'nominal' | 'service',
        discount: 0,
        code: '',
        quota: 100,
        startDate: '',
        endDate: '',
        description: '',
        branchId: '',
        serviceCategoryId: '',
        promoServices: [] as PromoService[],
           terms: [] as string[], // 👈 tambah sini
    });

    const handleCopyCode = (promo: Promo) => {
        navigator.clipboard.writeText(promo.code).then(() => {
            setCopiedId(promo.id);
            setTimeout(() => setCopiedId(null), 1500);
        });
    };

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
            } catch (error) {
                console.error("Failed to load branches", error);
            }
        };

        const loadCategories = async () => {
            try {
                const data = await api.getServiceCategories();
                setServiceCategories([
                    { value: '', label: 'Semua Kategori' },
                    ...data.map((c: any) => ({ value: c.id.toString(), label: c.name }))
                ]);
            } catch (err) {
                console.error('Failed to load service categories', err);
            }
        };

        loadBranches();
        loadCategories();
    }, []);

    const loadServices = async () => {
        if (allServices.length > 0) return;
        setServicesLoading(true);
        try {
            const first = await api.getServices({ page: 1, per_page: 100, status: 'active' });
            const total = first.meta?.total ?? first.total ?? 0;
            const firstData = first.data ?? (Array.isArray(first) ? first : []);

        const mapService = (s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category_name || s.category?.name || s.category || '',
    service_category_id: s.service_category_id ?? null,
    variants: s.variants?.map((v: any) => ({ id: v.id, name: v.name })) || [], // 👈 tambah
});

            if (total <= firstData.length) {
                setAllServices(firstData.map(mapService));
                return;
            }

            const totalPages = Math.ceil(total / 100);
            const results = await Promise.all(
                Array.from({ length: totalPages - 1 }, (_, i) =>
                    api.getServices({ page: i + 2, per_page: 100, status: 'active' })
                )
            );

            const allData = [
                ...firstData,
                ...results.flatMap(r => r.data ?? (Array.isArray(r) ? r : []))
            ];

            setAllServices(allData.map(mapService));
        } catch (err) {
            console.error('Failed to load services', err);
        } finally {
            setServicesLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [branchFilter, page, perPage, statusFilter, dateFilter, searchFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const params: any = {
                page,
                limit: perPage,
                branch_id: branchFilter !== 'all' ? branchFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                start_date: dateFilter.start || undefined,
                end_date: dateFilter.end || undefined,
                search: searchFilter || undefined
            };

            const res = await api.getPromos(params).catch(() => ({ data: [], total: 0 }));
            const data = res.data ? res.data : (Array.isArray(res) ? res : []);
            const total = res.total ? res.total : (res.meta ? res.meta.total : data.length);
            setTotalItems(total);

            setPromos(data.map((p: PromoResponse) => ({
                ...p,
                startDate: p.start_date,
                endDate: p.end_date,
                branch_id: p.branch_id,
                service_category_id: p.service_category_id ?? null,
                promo_services: p.promo_services || [],
                is_featured: p.type === 'featured' || p.is_featured || false,
                   terms: typeof p.terms === 'string' ? JSON.parse(p.terms) : (p.terms || []), // 👈 tambah ini
            })));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const closeAllModals = () => {
        setShowAddEditModal(false);
        setShowDeleteModal(false);
        setSelectedPromo(null);
    };

    const openAddPromo = () => {
        setPromoForm({
            title: '',
            type: 'percent',
            discount: 0,
            code: '',
            quota: 100,
            startDate: '',
            endDate: '',
            description: '',
            branchId: '',
            serviceCategoryId: '',
            promoServices: [],
           terms: [],

        });
        setServicePickerSearch('');
        setIsEditing(false);
        setShowAddEditModal(true);
    };

    const handleToggleFeatured = async (promo: Promo) => {
        setTogglingFeaturedId(promo.id);
        try {
            const isFeatured = promo.is_featured;
            await api.togglePromoFeatured(promo.id, !isFeatured);
            await loadData();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Gagal mengubah status featured');
        } finally {
            setTogglingFeaturedId(null);
        }
    };

    const openEditPromo = (promo: Promo) => {
        setSelectedPromo(promo);
        const toLocalISO = (dateStr: string) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };

     setPromoForm({
    title: promo.title,
    type: (promo.type === 'featured' ? 'percent' : promo.type) as 'percent' | 'nominal' | 'service',
    discount: promo.discount,
    code: promo.code,
    quota: promo.quota,
    startDate: toLocalISO(promo.startDate),
    endDate: toLocalISO(promo.endDate),
    description: promo.description || '',
    branchId: promo.branch_id?.toString() || '',
    serviceCategoryId: promo.service_category_id?.toString() || '',
    promoServices: promo.promo_services || [],
    terms: promo.terms || [], // 👈 tambah disini, bukan di tempat lain
});

        if (promo.type === 'service') loadServices();
        setServicePickerSearch('');
        setIsEditing(true);
        setShowAddEditModal(true);
    };

    const openDeletePromo = (promo: Promo) => {
        setSelectedPromo(promo);
        setShowDeleteModal(true);
    };

    const addPromoService = (service: { id: number; name: string }) => {
        if (promoForm.promoServices.some(ps => ps.service_id === service.id)) return;
        setPromoForm(p => ({
            ...p,
            promoServices: [
                ...p.promoServices,
                {
                    service_id: service.id,
                    name: service.name,
                    discount_type: 'percent',
                    discount_value: 0,
                }
            ]
        }));
    };

    const removePromoService = (idx: number) => {
        setPromoForm(p => ({
            ...p,
            promoServices: p.promoServices.filter((_, i) => i !== idx)
        }));
    };

    const updatePromoServiceField = (idx: number, field: keyof PromoService, value: any) => {
        setPromoForm(p => {
            const updated = [...p.promoServices];
            updated[idx] = { ...updated[idx], [field]: value };
            return { ...p, promoServices: updated };
        });
    };

    const handleSavePromo = async () => {
        if (!promoForm.title || !promoForm.code) return;

        if (promoForm.type === 'service' && promoForm.promoServices.length === 0) {
            swal.error('Tambahkan minimal satu layanan');
            return;
        }

        if (promoForm.startDate && promoForm.endDate) {
            if (new Date(promoForm.endDate) < new Date(promoForm.startDate)) {
                swal.error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
                return;
            }
        }

        setIsProcessing(true);
        try {
        const data: any = {
    title: promoForm.title,
    type: promoForm.type,
    discount: promoForm.type === 'service' ? 0 : promoForm.discount,
    code: promoForm.code,
    quota: promoForm.quota,
    start_date: promoForm.startDate,
    end_date: promoForm.endDate,
    description: promoForm.description,
    branch_id: promoForm.branchId || null,
    service_category_id: promoForm.serviceCategoryId ? Number(promoForm.serviceCategoryId) : null,
    terms: promoForm.terms.length > 0 ? promoForm.terms : null, // 👈 tambah sini
};

            if (promoForm.type === 'service') {
            data.promo_services = promoForm.promoServices.map(ps => ({
    service_id: ps.service_id ?? null,
    variant_id: ps.variant_id ?? null,  // 👈 tambah
    service_category_id: ps.service_category_id ?? null,
    discount_type: ps.discount_type,
    discount_value: ps.discount_value,
}));
            }

            if (isEditing && selectedPromo) {
                await api.updatePromo(selectedPromo.id, data);
            } else {
                await api.createPromo(data);
            }
            await loadData();
            closeAllModals();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to save promo');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeletePromo = async () => {
        if (!selectedPromo) return;
        setIsProcessing(true);
        try {
            await api.deletePromo(selectedPromo.id);
            await loadData();
            closeAllModals();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to delete promo');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredServices = allServices.filter(s =>
        !servicePickerSearch ||
        s.name.toLowerCase().includes(servicePickerSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(servicePickerSearch.toLowerCase())
    );

    // Warna aksen berdasarkan tipe untuk service picker modal
    const pickerAccent = 'purple';
    const pickerColors = {
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'focus:border-purple-400 focus:ring-purple-100',
        checkBg: 'bg-purple-600 border-purple-600',
        btn: 'bg-purple-600 hover:bg-purple-700',
    };

    const isSaveDisabled =
        isProcessing ||
        !promoForm.title ||
        !promoForm.code ||
        (promoForm.type === 'service' && promoForm.promoServices.length === 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-naqupos-dark">Voucher & Promo</h1>
                    <p className="text-gray-500 text-sm">Kelola kode voucher dan diskon untuk pelanggan.</p>
                </div>

                {globalBranchId === 'all' && (
                    <div className="bg-white p-1.5 rounded-2xl border border-naqupos-primary/20 shadow-sm self-start md:self-auto">
                        <BranchSelector
                            selectedBranchId={branchFilter === 'all' ? null : Number(branchFilter)}
                            onBranchChange={(id) => {
                                setBranchFilter(id || 'all');
                                setPage(1);
                            }}
                            showAllOption={true}
                        />
                    </div>
                )}
            </div>

            {/* Actions & Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium min-w-[60px]">
                        <Search size={16} />
                        Filter:
                    </div>
                    <div className="w-[180px]">
                        <input
                            type="text"
                            placeholder="Cari promo atau kode..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-naqupos-primary focus:bg-white transition-colors h-[42px]"
                        />
                    </div>
                    <div className="w-[150px]">
                        <SearchableSelect
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val as any)}
                            options={[
                                { value: 'all', label: 'Semua Status' },
                                { value: 'active', label: 'Aktif' },
                                { value: 'expired', label: 'Expired' }
                            ]}
                            placeholder="Semua Status"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 h-[42px]">
                        <Calendar size={14} className="text-gray-400" />
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                            className="text-xs bg-transparent outline-none w-24 text-gray-600"
                        />
                        <span className="text-gray-300">|</span>
                        <input
                            type="date"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                            className="text-xs bg-transparent outline-none w-24 text-gray-600"
                        />
                    </div>
                </div>

                <button
                    onClick={openAddPromo}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2.5 rounded-xl hover:bg-naqupos-accent transition-colors shadow-lg shadow-naqupos-primary/20"
                >
                    <Plus size={18} />
                    <span>Buat Promo</span>
                </button>
            </div>

            {/* Branch Info */}
            {branchFilter !== 'all' && branches.find(b => b.id === Number(branchFilter)) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-naqupos-primary/10 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-naqupos-cream flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <Building size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Cabang Terpilih</p>
                            <p className="font-bold text-naqupos-dark text-sm">{branches.find(b => b.id === Number(branchFilter))?.name}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100">
                    <div className="w-12 h-12 border-4 border-naqupos-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500 font-medium">Memuat data...</p>
                </div>
            ) : error ? (
                <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
                    <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-red-800 mb-2">Terjadi Kesalahan</h3>
                    <p className="text-red-600 mb-6">{error}</p>
                    <button onClick={() => loadData()} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Coba Lagi
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-left text-xs text-gray-500 uppercase">
                                <th className="px-4 py-3 font-medium">Promo</th>
                                <th className="px-4 py-3 font-medium">Kode</th>
                                <th className="px-4 py-3 font-medium">Diskon</th>
                                <th className="px-4 py-3 font-medium">Kuota</th>
                                <th className="px-4 py-3 font-medium">Periode</th>
                                <th className="px-4 py-3 font-medium">Kategori Layanan</th>
                                {(['admin', 'owner'].includes(JSON.parse(localStorage.getItem('naqupos_admin_auth') || '{}').user?.role) || !JSON.parse(localStorage.getItem('naqupos_admin_auth') || '{}').user?.role) && (
                                    <th className="px-4 py-3 font-medium">Cabang</th>
                                )}
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium text-center">Featured</th>
                                <th className="px-4 py-3 font-medium">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {promos.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">Belum ada promo yang dibuat</td>
                                </tr>
                            ) : promos.map(promo => (
                                <tr key={promo.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-naqupos-dark">{promo.title}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 group">
                                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono tracking-wide">{promo.code}</code>
                                            <button
                                                onClick={() => handleCopyCode(promo)}
                                                title="Salin kode"
                                                className={`p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${copiedId === promo.id ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {copiedId === promo.id ? <Check size={13} /> : <Copy size={13} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {promo.type === 'featured' ? (
                                            <span className="flex items-center gap-1 text-orange-500 font-medium">
                                                <Star size={14} />
                                                {promo.promo_services?.length || 0} Layanan Promo
                                            </span>
                                        ) : promo.type === 'service' ? (
                                            <span className="flex items-center gap-1 text-purple-600 font-medium">
                                                <Tag size={14} />
                                                {promo.promo_services?.length || 0} Layanan
                                            </span>
                                        ) : promo.type === 'percent' ? (
                                            <span className="flex items-center gap-1">
                                                <Percent size={14} /> {promo.discount}%
                                            </span>
                                        ) : (
                                            <span>Rp {Number(promo.discount).toLocaleString('id-ID')}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600 text-xs">{promo.used}/{promo.quota}</span>
                                            <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                                                <div
                                                    className="h-full bg-naqupos-primary rounded-full"
                                                    style={{ width: `${Math.min(100, (promo.used / promo.quota) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        <div className="flex flex-col text-xs">
                                            <span>{formatDate(promo.startDate)}</span>
                                            <span className="text-gray-400">s/d</span>
                                            <span>{formatDate(promo.endDate)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs">
                                        {promo.service_category_id
                                            ? (serviceCategories.find(c => c.value === promo.service_category_id?.toString())?.label || '-')
                                            : <span className="text-gray-400">Semua Layanan</span>
                                        }
                                    </td>
                                    {(['admin', 'owner'].includes(JSON.parse(localStorage.getItem('naqupos_admin_auth') || '{}').user?.role) || !JSON.parse(localStorage.getItem('naqupos_admin_auth') || '{}').user?.branch_id) && (
                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                            {promo.branch_id ? (branches.find(b => b.id === promo.branch_id)?.name || '-') : 'Semua Cabang'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${promo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {promo.status === 'active' ? 'Aktif' : 'Expired'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleToggleFeatured(promo)}
                                            disabled={togglingFeaturedId === promo.id}
                                            title={promo.is_featured ? 'Hapus dari Featured' : 'Jadikan Featured'}
                                            className={`p-2 rounded-lg transition-all ${
                                                togglingFeaturedId === promo.id
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : promo.is_featured
                                                        ? 'bg-orange-100 text-orange-500 hover:bg-orange-200'
                                                        : 'bg-gray-50 text-gray-300 hover:bg-orange-50 hover:text-orange-400'
                                            }`}
                                        >
                                            <Star size={16} className={promo.is_featured ? 'fill-orange-400' : ''} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEditPromo(promo)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-gray-500" /></button>
                                            <button onClick={() => openDeletePromo(promo)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                            <h3 className="text-xl font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Promo' : 'Tambah Promo Baru'}
                            </h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">

                            {/* Nama Promo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Promo *</label>
                                <input
                                    type="text"
                                    value={promoForm.title}
                                    onChange={(e) => setPromoForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Contoh: Weekend Special Discount"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all"
                                />
                            </div>

                            {/* Cabang */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Opsional)</label>
                                <SearchableSelect
                                    value={promoForm.branchId}
                                    onChange={(val) => setPromoForm(p => ({ ...p, branchId: String(val) }))}
                                    options={[
                                        { value: '', label: 'Semua Cabang' },
                                        ...branches.map(branch => ({ value: branch.id.toString(), label: branch.name }))
                                    ]}
                                    placeholder="Semua Cabang"
                                />
                                <p className="text-xs text-gray-400 mt-1">Kosongkan untuk berlaku di semua cabang</p>
                            </div>

                            {/* Tipe Diskon */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Diskon</label>
                                    <div className="flex p-1 bg-gray-100 rounded-lg">
                                        <button
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${promoForm.type === 'percent' ? 'bg-white shadow-sm text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => setPromoForm(p => ({ ...p, type: 'percent', discount: p.discount > 100 ? 100 : p.discount }))}
                                        >
                                            % Persen
                                        </button>
                                        <button
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${promoForm.type === 'nominal' ? 'bg-white shadow-sm text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => setPromoForm(p => ({ ...p, type: 'nominal' }))}
                                        >
                                            Rp
                                        </button>
                                        <button
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${promoForm.type === 'service' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => { setPromoForm(p => ({ ...p, type: 'service' })); loadServices(); }}
                                        >
                                            <Tag size={13} />
                                            Layanan
                                        </button>
                                    </div>
                                </div>

                                {/* Nilai Diskon — hanya untuk percent & nominal */}
                                {(promoForm.type === 'percent' || promoForm.type === 'nominal') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Diskon *</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                                {promoForm.type === 'nominal' ? 'Rp' : <Percent size={14} />}
                                            </div>
                                            <input
                                                type="text"
                                                value={promoForm.type === 'nominal' ? (promoForm.discount ? new Intl.NumberFormat('id-ID').format(promoForm.discount) : '') : (promoForm.discount || '')}
                                                onChange={(e) => {
                                                    let val = parseInt(e.target.value.replace(/\D/g, ''));
                                                    if (isNaN(val)) val = 0;
                                                    if (promoForm.type === 'percent' && val > 100) val = 100;
                                                    setPromoForm(p => ({ ...p, discount: val }));
                                                }}
                                                placeholder="0"
                                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Layanan Didiskon — tipe service */}
                            {promoForm.type === 'service' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-700">
                                            Layanan yang Didiskon
                                            {promoForm.promoServices.length > 0 && (
                                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                                                    {promoForm.promoServices.length} dipilih
                                                </span>
                                            )}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => { loadServices(); setShowServicePickerModal(true); }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                        >
                                            <Plus size={13} />
                                            Kelola Layanan
                                        </button>
                                    </div>

                                    {promoForm.promoServices.length === 0 ? (
                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                                            <Tag size={28} className="mx-auto text-gray-300 mb-2" />
                                            <p className="text-sm text-gray-400 font-medium">Belum ada layanan dipilih</p>
                                            <p className="text-xs text-gray-300 mt-1">Klik "Kelola Layanan" untuk menambahkan</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {promoForm.promoServices.map((ps, idx) => (
                                                <div key={idx} className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
<span className="text-sm font-semibold text-purple-900 truncate pr-2">
    {ps.name}{ps.variant_name ? ` — ${ps.variant_name}` : ''}
</span>
                                                        <button type="button" onClick={() => removePromoService(idx)} className="p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex p-0.5 bg-white border border-purple-100 rounded-lg flex-shrink-0">
                                                            <button type="button" onClick={() => updatePromoServiceField(idx, 'discount_type', 'percent')} className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${ps.discount_type === 'percent' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-purple-600'}`}>%</button>
                                                            <button type="button" onClick={() => updatePromoServiceField(idx, 'discount_type', 'nominal')} className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${ps.discount_type === 'nominal' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-purple-600'}`}>Rp</button>
                                                        </div>
                                                        <div className="relative flex-1">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
                                                                {ps.discount_type === 'percent' ? '%' : 'Rp'}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={ps.discount_type === 'nominal' ? (ps.discount_value ? new Intl.NumberFormat('id-ID').format(ps.discount_value) : '') : (ps.discount_value || '')}
                                                                onChange={e => {
                                                                    let val = parseInt(e.target.value.replace(/\D/g, ''));
                                                                    if (isNaN(val)) val = 0;
                                                                    if (ps.discount_type === 'percent' && val > 100) val = 100;
                                                                    updatePromoServiceField(idx, 'discount_value', val);
                                                                }}
                                                                placeholder="0"
                                                                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-purple-100 bg-white text-sm outline-none focus:border-purple-400 transition-all"
                                                            />
                                                        </div>
                                                        {ps.discount_value > 0 && (
                                                            <span className="flex-shrink-0 text-[10px] font-bold bg-purple-600 text-white px-2 py-1 rounded-full">
                                                                -{ps.discount_value}{ps.discount_type === 'percent' ? '%' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Kategori Layanan — hanya untuk percent & nominal */}
                            {(promoForm.type === 'percent' || promoForm.type === 'nominal') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori Layanan (Opsional)</label>
                                    <SearchableSelect
                                        value={promoForm.serviceCategoryId}
                                        onChange={(val) => setPromoForm(p => ({ ...p, serviceCategoryId: String(val) }))}
                                        options={serviceCategories}
                                        placeholder="Semua Kategori Layanan"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Kosongkan agar berlaku untuk semua layanan</p>
                                </div>
                            )}

                            {/* Kode & Kuota */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Kode Voucher *</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={promoForm.code}
                                            onChange={(e) => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                            placeholder="PROM2024"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none uppercase font-mono"
                                        />
                                        <button
                                            onClick={() => setPromoForm(p => ({ ...p, code: 'PRM' + Math.floor(1000 + Math.random() * 9000) }))}
                                            className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                            title="Generate Code"
                                        >
                                            <RotateCcw size={18} className="text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Kuota</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={promoForm.quota ? new Intl.NumberFormat('id-ID').format(promoForm.quota) : ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                                            setPromoForm(p => ({ ...p, quota: val === '' ? 0 : parseInt(val) }));
                                        }}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Tanggal */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                                    <input
                                        type="datetime-local"
                                        value={promoForm.startDate}
                                        onChange={(e) => {
                                            const newStart = e.target.value;
                                            setPromoForm(p => {
                                                const updates: any = { ...p, startDate: newStart };
                                                if (p.endDate && new Date(p.endDate) < new Date(newStart)) updates.endDate = '';
                                                return updates;
                                            });
                                        }}
                                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
                                    <input
                                        type="datetime-local"
                                        value={promoForm.endDate}
                                        onChange={(e) => setPromoForm(p => ({ ...p, endDate: e.target.value }))}
                                        min={promoForm.startDate || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            {/* Deskripsi */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                <textarea
                                    value={promoForm.description}
                                    onChange={(e) => setPromoForm(p => ({ ...p, description: e.target.value }))}
                                    rows={2}
                                    placeholder="Deskripsi promo..."
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none"
                                />
                            </div>

                            {/* Terms & Ketentuan */}
<div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
        Syarat & Ketentuan
    </label>
    {promoForm.terms.map((term, idx) => (
        <div key={idx} className="flex gap-2 mb-2">
            <input
                type="text"
                value={term}
                onChange={(e) => {
                    const updated = [...promoForm.terms];
                    updated[idx] = e.target.value;
                    setPromoForm(p => ({ ...p, terms: updated }));
                }}
                placeholder={`Syarat ${idx + 1}`}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-naqupos-primary transition-all"
            />
            <button
                type="button"
                onClick={() => setPromoForm(p => ({ ...p, terms: p.terms.filter((_, i) => i !== idx) }))}
                className="p-2.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    ))}
    <button
        type="button"
        onClick={() => setPromoForm(p => ({ ...p, terms: [...p.terms, ''] }))}
        className="flex items-center gap-1.5 text-xs text-naqupos-primary font-medium hover:underline mt-1"
    >
        <Plus size={13} />
        Tambah Syarat
    </button>
</div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Batal</button>
                            <button
                                onClick={handleSavePromo}
                                disabled={isSaveDisabled}
                                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isSaveDisabled ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}
                            >
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Promo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Service Picker Modal */}
            {showServicePickerModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-fadeIn">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Pilih Layanan</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{promoForm.promoServices.length} layanan dipilih</p>
                            </div>
                            <button onClick={() => { setShowServicePickerModal(false); setServicePickerSearch(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-100 flex-shrink-0">
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari nama layanan atau kategori..."
                                    value={servicePickerSearch}
                                    onChange={e => setServicePickerSearch(e.target.value)}
                                    autoFocus
                                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none transition-all bg-gray-50 focus:bg-white ${pickerColors.border}`}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {servicesLoading ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="w-8 h-8 border-[3px] border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: pickerAccent === 'orange' ? '#f97316' : '#9333ea', borderTopColor: 'transparent' }} />
                                    <p className="text-sm text-gray-400">Memuat layanan...</p>
                                </div>
                            ) : filteredServices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <Search size={32} className="text-gray-200 mb-3" />
                                    <p className="text-sm text-gray-400">Layanan tidak ditemukan</p>
                                </div>
                            ) : (
                            <div className="divide-y divide-gray-50">
    {filteredServices.map(service => {
        const hasVariants = service.variants && service.variants.length > 0;

        if (hasVariants) {
            // Service dengan variants — tampilkan header + sub-list variant
            return (
                <div key={service.id} className="border-b border-gray-50">
                    {/* Service header — non-clickable, hanya label */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/60">
                        <span className="font-semibold text-sm text-gray-700">{service.name}</span>
                        {service.category && (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{service.category}</span>
                        )}
                    </div>
                    {/* Variants */}
                    {service.variants!.map(variant => {
                        const alreadyAdded = promoForm.promoServices.some(
                            ps => ps.service_id === service.id && ps.variant_id === variant.id
                        );
                        return (
                            <button
                                key={variant.id}
                                type="button"
                                onClick={() => {
                                    if (alreadyAdded) {
                                        setPromoForm(p => ({
                                            ...p,
                                            promoServices: p.promoServices.filter(
                                                ps => !(ps.service_id === service.id && ps.variant_id === variant.id)
                                            )
                                        }));
                                    } else {
                                        setPromoForm(p => ({
                                            ...p,
                                            promoServices: [
                                                ...p.promoServices,
                                                {
                                                    service_id: service.id,
                                                    variant_id: variant.id,
                                                    name: service.name,
                                                    variant_name: variant.name,
                                                    discount_type: 'percent',
                                                    discount_value: 0,
                                                }
                                            ]
                                        }));
                                    }
                                }}
                                className={`w-full flex items-center gap-3 px-5 py-2.5 pl-10 text-left text-sm transition-colors ${alreadyAdded ? pickerColors.bg + ' ' + pickerColors.text : 'hover:bg-gray-50 text-gray-600'}`}
                            >
                                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${alreadyAdded ? pickerColors.checkBg : 'border-gray-300'}`}>
                                    {alreadyAdded && <Check size={11} className="text-white" strokeWidth={3} />}
                                </span>
                                <span className="text-sm">{variant.name}</span>
                            </button>
                        );
                    })}
                </div>
            );
        }

        // Service tanpa variants — sama seperti sebelumnya
        const alreadyAdded = promoForm.promoServices.some(
            ps => ps.service_id === service.id && !ps.variant_id
        );
        return (
            <button
                key={service.id}
                type="button"
                onClick={() => {
                    if (alreadyAdded) {
                        setPromoForm(p => ({
                            ...p,
                            promoServices: p.promoServices.filter(ps => ps.service_id !== service.id)
                        }));
                    } else {
                        addPromoService(service);
                    }
                }}
                className={`w-full flex items-center justify-between px-5 py-3 text-left text-sm transition-colors ${alreadyAdded ? pickerColors.bg + ' ' + pickerColors.text : 'hover:bg-gray-50 text-gray-700'}`}
            >
                <span className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${alreadyAdded ? pickerColors.checkBg : 'border-gray-300'}`}>
                        {alreadyAdded && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <span>
                        <span className="font-medium">{service.name}</span>
                        {service.category && (
                            <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{service.category}</span>
                        )}
                    </span>
                </span>
            </button>
        );
    })}
</div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 flex-shrink-0">
                            <button
                                onClick={() => { setShowServicePickerModal(false); setServicePickerSearch(''); }}
                                className={`w-full py-3 text-white font-semibold rounded-xl transition-colors ${pickerColors.btn}`}
                            >
                                Selesai ({promoForm.promoServices.length} dipilih)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                            <h3 className="text-xl font-bold text-naqupos-dark">Hapus Promo</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                                <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-red-800">Peringatan!</p>
                                    <p className="text-sm text-red-600">Data yang dihapus tidak dapat dikembalikan.</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                <p className="font-bold text-naqupos-dark">{selectedPromo?.title}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                            <button onClick={closeAllModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button
                                onClick={handleDeletePromo}
                                disabled={isProcessing}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}
                            >
                                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalItems > 0 && (
                <div className="mt-6">
                    <Pagination
                        currentPage={page}
                        totalItems={totalItems}
                        itemsPerPage={perPage}
                        onPageChange={setPage}
                        onItemsPerPageChange={(val) => {
                            setPerPage(val);
                            setPage(1);
                        }}
                    />
                </div>
            )}
        </div>
    );
}