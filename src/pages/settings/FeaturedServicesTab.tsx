import { useState, useEffect, useRef } from 'react';
import { Sparkles, GripVertical, Star, StarOff, Search, Loader2, Save, CheckCircle, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';


interface ServiceItem {
    id: number;
    name: string;
    category: string;
    price: number | string;
    special_price?: number | string | null;
    duration: number;
    image?: string;
    is_active: boolean;
    is_featured: boolean;
    featured_order: number;
    branch_prices?: any;
    variants?: {
        id: number;
        name: string;
        price?: number | string;
        special_price?: number | string | null;
        duration?: number;
        is_active?: boolean;
        is_featured?: boolean;
        featured_order?: number;
        branch_prices?: any;
    }[];
    // internal tracking
    _serviceId?: number;
    _variantId?: number | null;
    _displayName?: string;
}

interface FeaturedServicesTabProps {
    selectedBranchId: number | string | '';
}

export default function FeaturedServicesTab({ selectedBranchId }: FeaturedServicesTabProps) {
    const [allServices, setAllServices] = useState<ServiceItem[]>([]);
    const [featuredServices, setFeaturedServices] = useState<ServiceItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        if (!selectedBranchId) return;
        fetchServices();
    }, [selectedBranchId]);


    const getPaginatedItems = (response: any): any[] => {
        if (Array.isArray(response)) return response;
        return Array.isArray(response?.data) ? response.data : [];
    };

    const getLastPage = (response: any, itemCount: number, perPage: number): number => {
        const explicitLastPage = Number(response?.meta?.last_page ?? response?.last_page);
        if (Number.isFinite(explicitLastPage) && explicitLastPage > 0) return explicitLastPage;

        const total = Number(response?.meta?.total ?? response?.total);
        if (Number.isFinite(total) && total > itemCount) return Math.ceil(total / perPage);

        return 1;
    };

    const toNumber = (value: any, fallback = 0): number => {
        if (value === undefined || value === null || value === '') return fallback;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const getBranchPrice = (item: any) => {
        if (!selectedBranchId || !item?.branch_prices) return null;

        if (Array.isArray(item.branch_prices)) {
            return item.branch_prices.find((bp: any) => String(bp.branch_id) === String(selectedBranchId)) ?? null;
        }

        if (typeof item.branch_prices === 'object') {
            return item.branch_prices[selectedBranchId] || item.branch_prices[String(selectedBranchId)] || null;
        }

        return null;
    };

    const getDisplayPrice = (item: any, fallbackItem?: any) => {
        const branchPrice = getBranchPrice(item);
        const fallbackBranchPrice = fallbackItem ? getBranchPrice(fallbackItem) : null;
        const basePrice = toNumber(item?.price, toNumber(fallbackItem?.price));
        const baseSpecial = toNumber(item?.special_price, toNumber(fallbackItem?.special_price));
        const retail = toNumber(branchPrice?.price, toNumber(fallbackBranchPrice?.price, basePrice));
        const special = toNumber(branchPrice?.special_price, toNumber(fallbackBranchPrice?.special_price, baseSpecial));

        return special > 0 ? special : retail;
    };

const fetchServices = async () => {
    setLoading(true);
    try {
        const perPage = 100;
        const params = {
            ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
            is_active: 1,
            page: 1,
            per_page: perPage
        };
        const firstResponse = await api.getServices(params);
        const firstItems = getPaginatedItems(firstResponse);
        const lastPage = getLastPage(firstResponse, firstItems.length, perPage);
        const remainingResponses = lastPage > 1
            ? await Promise.all(
                Array.from({ length: lastPage - 1 }, (_, index) =>
                    api.getServices({ ...params, page: index + 2 })
                )
            )
            : [];
        const raw: ServiceItem[] = [firstResponse, ...remainingResponses].flatMap(getPaginatedItems);
        const active = raw.filter(s => s.is_active !== false);

        // Flatten per variant
        const flattened: ServiceItem[] = [];
        active.forEach(svc => {
            if (svc.variants && svc.variants.length > 0) {
                svc.variants.filter(v => v.is_active !== false).forEach(v => {
                    flattened.push({
                        ...svc,
                        id: svc.id * 100000 + v.id,
                        name: `${svc.name} — ${v.name}`,
                        price: getDisplayPrice(v, svc),
                        special_price: v.special_price ?? svc.special_price,
                        duration: v.duration ?? svc.duration,
                        is_featured: v.is_featured ?? false,
                        featured_order: v.featured_order ?? 999,
                        _serviceId: svc.id,
                        _variantId: v.id,
                    });
                });
            } else {
                flattened.push({
                    ...svc,
                    price: getDisplayPrice(svc),
                    _serviceId: svc.id,
                    _variantId: null,
                });
            }
        });

        setAllServices(flattened);

        const featured = flattened
            .filter(s => s.is_featured)
            .sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999));
        setFeaturedServices(featured);
    } catch (e) {
        console.error(e);
        toast.error('Gagal memuat layanan');
    } finally {
        setLoading(false);
    }
};

    const toggleFeatured = (service: ServiceItem) => {
        const alreadyFeatured = featuredServices.find(f => f.id === service.id);
        if (alreadyFeatured) {
            setFeaturedServices(prev => prev.filter(f => f.id !== service.id));
        } else {
            setFeaturedServices(prev => [
                ...prev,
                { ...service, is_featured: true, featured_order: prev.length }
            ]);
        }
        setIsDirty(true);
    };

    const handleDragStart = (idx: number) => {
        dragItem.current = idx;
    };

    const handleDragEnter = (idx: number) => {
        dragOverItem.current = idx;
    };

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        if (dragItem.current === dragOverItem.current) return;

        const reordered = [...featuredServices];
        const dragged = reordered.splice(dragItem.current, 1)[0];
        reordered.splice(dragOverItem.current, 0, dragged);

        setFeaturedServices(reordered);
        dragItem.current = null;
        dragOverItem.current = null;
        setIsDirty(true);
    };

const handleSave = async () => {
    setSaving(true);
    try {
        const featuredIds = featuredServices.map(s => s.id);

        const payload = allServices.map(s => ({
            id: (s as any)._serviceId,
            variant_id: (s as any)._variantId ?? null,
            is_featured: featuredIds.includes(s.id),
            featured_order: featuredIds.includes(s.id) ? featuredIds.indexOf(s.id) : 0,
        }));

        await api.updateFeaturedServices({ services: payload });
        toast.success('Layanan rekomendasi berhasil disimpan');
        setIsDirty(false);
    } catch (e: any) {
        console.error(e);
        toast.error(e.message || 'Gagal menyimpan');
    } finally {
        setSaving(false);
    }
};

    const filteredAvailable = allServices.filter(s => {
        const isFeatured = featuredServices.find(f => f.id === s.id);
        if (isFeatured) return false;
        if (!search) return true;
        return s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.category?.toLowerCase().includes(search.toLowerCase());
    });

  const formatPrice = (price: number | string) => {
    const n = typeof price === 'string' ? parseFloat(price) : price;
    if (!n || n === 0) return '-';
    return `Rp ${n.toLocaleString('id-ID')}`;
};
    if (!selectedBranchId) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                <div className="flex flex-col items-center justify-center text-gray-500">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Sparkles size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Pilih Cabang</h3>
                    <p className="max-w-md mx-auto text-gray-500">
                        Silakan pilih cabang terlebih dahulu untuk mengatur layanan rekomendasi.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <Star size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Layanan Rekomendasi</h3>
                        <p className="text-sm text-gray-500 font-medium">
                            Pilih dan urutkan layanan yang muncul di halaman utama aplikasi pelanggan.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchServices}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isDirty && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 text-sm"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Menyimpan...' : 'Simpan Urutan'}
                        </button>
                    )}
                    {!isDirty && !loading && (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-bold border border-green-100">
                            <CheckCircle size={14} />
                            Tersimpan
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* LEFT — Featured List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/50 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Ditampilkan</p>
                            <p className="text-sm font-bold text-gray-700 mt-0.5">{featuredServices.length} Layanan</p>
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold bg-white px-2.5 py-1.5 rounded-lg border border-gray-100">
                            Drag untuk urutkan
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-gray-300" />
                        </div>
                    ) : featuredServices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                                <Star size={24} className="text-gray-200" />
                            </div>
                            <p className="text-sm font-bold text-gray-400">Belum ada layanan dipilih</p>
                            <p className="text-xs text-gray-300 mt-1">Pilih dari daftar kanan untuk menambahkan</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {featuredServices.map((service, idx) => (
                                <div
                                    key={service.id}
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragEnter={() => handleDragEnter(idx)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={e => e.preventDefault()}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50/30 transition-colors group cursor-grab active:cursor-grabbing"
                                >
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-300 w-4 text-center">
                                            {idx + 1}
                                        </span>
                                        <GripVertical size={16} className="text-gray-300 group-hover:text-gray-400" />
                                    </div>

                                    {service.image ? (
                                        <img
                                            src={service.image}
                                            alt={service.name}
                                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                            <Sparkles size={16} className="text-amber-400" />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{service.name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{service.category} · {service.duration} mnt · {formatPrice(service.price)}</p>
                                    </div>

                                    <button
                                        onClick={() => toggleFeatured(service)}
                                        className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        title="Hapus dari rekomendasi"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT — Available Services */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Semua Layanan</p>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari layanan..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[500px]">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={24} className="animate-spin text-gray-300" />
                            </div>
                        ) : filteredAvailable.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                <p className="text-sm text-gray-400 font-bold">
                                    {search ? 'Tidak ada hasil' : 'Semua layanan sudah ditambahkan'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filteredAvailable.map(service => (
                                    <div
                                        key={service.id}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                                    >
                                        {service.image ? (
                                            <img
                                                src={service.image}
                                                alt={service.name}
                                                className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                <Sparkles size={16} className="text-gray-300" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-800 truncate">{service.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{service.category} · {service.duration} mnt · {formatPrice(service.price)}</p>
                                        </div>

                                        <button
                                            onClick={() => toggleFeatured(service)}
                                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[11px] font-bold hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"
                                        >
                                            <Star size={11} />
                                            Pilih
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start">
                <Sparkles size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <strong>Tips:</strong> Layanan yang dipilih akan muncul di bagian "Rekomendasi" pada halaman utama aplikasi pelanggan.
                    Urutan bisa diubah dengan drag & drop. Maksimal tampil sesuai batas yang diset di aplikasi (default 3).
                </div>
            </div>
        </div>
    );
}
