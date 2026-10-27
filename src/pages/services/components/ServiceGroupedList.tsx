import { useState, useEffect } from 'react';
import {
    ChevronDown, ChevronRight, Edit, Trash2, Plus,
    Sparkles, ChevronLeft, GripVertical, Clock, Globe
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { Service, ServiceCategory } from '../serviceTypes';
import { api } from '../../../services/api';

interface ServiceGroupedListProps {
    categories: ServiceCategory[];
    summaryMode?: boolean;
    searchQuery: string;
    branchFilter: string | number;
    filterStatus: 'all' | 'active' | 'inactive';
    onEditService: (service: Service) => void;
    onDeleteService: (service: Service) => void;
    onToggleStatus: (service: Service) => void;
    onEditCategory: (category: ServiceCategory) => void;
    onDeleteCategory: (category: ServiceCategory) => void;
    onToggleCategoryStatus: (category: ServiceCategory) => void;
    onAddServiceToCategory: (categoryId: number, categoryName: string) => void;
    onToggleVariantStatus?: (variantId: number, currentStatus: boolean) => void;
    onViewPriceHistory?: (service: Service, variant?: any) => void;
    onReorderCategories?: (newOrder: ServiceCategory[]) => void;
}

const fixImageUrl = (image: string | null | undefined): string => {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    return `https://zafaranbe.memofy-dev.my.id${image}`;
};

export default function ServiceGroupedList({
    
    categories,
    summaryMode = false,
    searchQuery,
    branchFilter,
    filterStatus,
    onEditService,
    onDeleteService,
    onToggleStatus,
    onEditCategory,
    onDeleteCategory,
    onToggleCategoryStatus,
    onAddServiceToCategory,
    onToggleVariantStatus,
    onViewPriceHistory,
    onReorderCategories
}: ServiceGroupedListProps) {
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const toggleCollapse = (id: string | number) => {
        setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatPrice = (price: number | string | undefined | null) => {
        const num = typeof price === 'string' ? parseFloat(price) : price;
        if (num === undefined || num === null || isNaN(num)) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num).replace('Rp', 'Rp ');
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0 && m > 0) return `${h}h ${m}min`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    const onDragEnd = (result: any) => {
        if (!result.destination || !onReorderCategories) return;

        const items = Array.from(categories);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        onReorderCategories(items);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="categories-list">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-8 pb-32"
                    >
                        {categories.map((category, index) => (
                            <Draggable
                                key={category.id}
                                draggableId={`cat-${category.id}`}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`${snapshot.isDragging ? 'z-50' : ''}`}
                                    >
                                        <CategorySection
                                            category={category}
                                            summaryMode={summaryMode}
                                            searchQuery={searchQuery}
                                            branchFilter={branchFilter}
                                            filterStatus={filterStatus}
                                            isCollapsed={!!collapsed[`c-${category.id}`]}
                                            onToggleCollapse={() => toggleCollapse(`c-${category.id}`)}
                                            onEditService={onEditService}
                                            onDeleteService={onDeleteService}
                                            onToggleStatus={onToggleStatus}
                                            onEditCategory={onEditCategory}
                                            onDeleteCategory={onDeleteCategory}
                                            onToggleCategoryStatus={onToggleCategoryStatus}
                                            onAddServiceToCategory={onAddServiceToCategory}
                                            formatPrice={formatPrice}
                                            formatDuration={formatDuration}
                                            setGlobalCollapsedState={(isCollapsed: boolean) => setCollapsed(prev => ({ ...prev, [`c-${category.id}`]: isCollapsed }))}
                                            onToggleVariantStatus={onToggleVariantStatus}
                                            onViewPriceHistory={onViewPriceHistory}
                                            dragHandleProps={provided.dragHandleProps}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}

function CategorySection({
    category, summaryMode, searchQuery, branchFilter, filterStatus,
    isCollapsed, onToggleCollapse,
    onEditService, onDeleteService, onToggleStatus,
    onEditCategory, onDeleteCategory, onAddServiceToCategory, onToggleCategoryStatus,
    onToggleVariantStatus,
    onViewPriceHistory,
    formatPrice, formatDuration, setGlobalCollapsedState,
    dragHandleProps
}: any) {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);
    const [hasCheckedStatus, setHasCheckedStatus] = useState(false);



  
const fixImageUrl = (image: string | null | undefined): string => {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    return `https://zafaranbe.memofy-dev.my.id${image}`;
};


    const loadServices = async () => {
        if (summaryMode) return;
        try {
            setLoading(true);
            const params: any = {
                page,
                service_category_id: category.id,
                per_page: 50
            };
            if (searchQuery) params.search = searchQuery;
            if (branchFilter !== 'all' && branchFilter !== '') params.branch_id = branchFilter;
            if (filterStatus !== 'all') params.is_active = filterStatus === 'active' ? 1 : 0;

            const res = await api.getServices(params);

            const data = res.data || [];
console.log('====================================');
console.log('datalayanann', data);
console.log('====================================');

          const mapped = data.map((item: any) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category,
    gender: item.gender || 'all',
    duration: item.duration,
    price: typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0,
    special_price: typeof item.special_price === 'string' ? parseFloat(item.special_price) : item.special_price || null,
    status: item.is_active ? 'active' : 'inactive',
    description: item.description || '',
    image: item.image || null, // ← as-is, jangan di-fixImageUrl
    variants: item.variants || [],
    service_category_id: item.service_category_id,
    is_booking_online_enabled: item.is_booking_online_enabled ?? true,
    requires_room: item.requires_room ?? true,
    is_limited_availability: item.is_limited_availability || false,
    availability_type: item.availability_type || 'specific_dates',
    availability_data: typeof item.availability_data === 'string' ? JSON.parse(item.availability_data) : (item.availability_data || []),
    is_global: item.is_global || false,
    branches: item.branches || [],
    all_branches_same_price: item.all_branches_same_price ?? true,
    branch_prices: typeof item.branch_prices === 'string' ? JSON.parse(item.branch_prices) : (item.branch_prices || {}),
}));
            setServices(mapped);
            setPagination(res.meta || null);

            // If no services and haven't checked before, collapse this category
            if (data.length === 0 && !hasCheckedStatus) {
                setGlobalCollapsedState(true);
            }
            setHasCheckedStatus(true);
        } catch (err) {
            console.error("Failed to load category services", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadServices();
    }, [category.id, searchQuery, branchFilter, filterStatus, page, summaryMode]);

    // Reset to page 1 when criteria changes
    useEffect(() => {
        setPage(1);
    }, [searchQuery, branchFilter, filterStatus]);

    const onServiceDragEnd = async (result: any) => {
        if (!result.destination) return;

        const items = Array.from(services);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setServices(items);

        try {
            await api.reorderServices(items.map((s, i) => ({ id: s.id, position: i + 1 })));
        } catch (err) {
            console.error("Failed to persist service order", err);
        }
    };

    if (!loading && services.length === 0 && !!searchQuery && !summaryMode) {
        return null;
    }

    if (summaryMode && searchQuery && !category.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return null;
    }

    return (
        <div className={`group/cat relative transition-all duration-500 ${summaryMode ? 'scale-[0.98] hover:scale-100' : ''}`}>
            {!summaryMode && <div className={`absolute -inset-1 bg-gradient-to-r from-naqupos-primary/20 to-gray-50 rounded-[2.5rem] blur opacity-15 group-hover/cat:opacity-30 transition duration-1000`} />}

            <div className={`relative bg-white/95 backdrop-blur-2xl rounded-[2.2rem] shadow-sm border border-white/60 overflow-hidden ring-1 ring-black/[0.03] ${summaryMode ? 'hover:shadow-md' : 'shadow-xl shadow-black/5'}`}>
                {/* Category Header */}
                <div
                    className={`flex items-center justify-between p-6 bg-gradient-to-b from-white/80 to-transparent border-b border-gray-100/50 hover:bg-white transition-all cursor-pointer group/header ${summaryMode ? 'py-4' : ''}`}
                    onClick={onToggleCollapse}
                >
                    <div className="flex items-center gap-5 flex-1">
                        <div {...dragHandleProps} className="p-2 text-gray-300 hover:text-naqupos-primary cursor-grab active:cursor-grabbing transition-colors">
                            <GripVertical size={20} />
                        </div>

                        <div className="relative">
                            {category.image ? (
                                <img
                                   src={fixImageUrl(category.image)}
                                    alt={category.name}
                                    className="w-16 h-16 rounded-[1.2rem] object-cover shadow-lg border-2 border-white ring-4 ring-gray-50/50"
                                />
                            ) : (
                                <div
                                    className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center shadow-inner relative overflow-hidden ring-4 ring-gray-50/50"
                                    style={{ backgroundColor: `${category.color || '#C58940'}15` }}
                                >
                                    <Sparkles className="absolute -top-1 -right-1 opacity-20" size={24} style={{ color: category.color || '#C58940' }} />
                                    <div className="w-6 h-6 rounded-full shadow-lg" style={{ backgroundColor: category.color || '#C58940' }} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h3 className="font-extrabold text-xl text-gray-900 tracking-tight leading-none">{category.name}</h3>
                                {pagination && pagination.total > 0 && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-naqupos-primary/10 text-naqupos-primary rounded-full border border-naqupos-primary/20">
                                        <span className="text-[10px] font-black uppercase tracking-wider">{pagination.total} Layanan</span>
                                    </div>
                                )}
                            </div>
                            {category.description && !summaryMode && (
                                <p className="text-sm text-gray-400 font-medium line-clamp-1">{category.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pl-6 border-l border-gray-100 ml-4">
                        {!summaryMode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddServiceToCategory(category.id, category.name); }}
                                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-naqupos-primary text-white hover:bg-naqupos-dark rounded-2xl transition-all shadow-xl shadow-naqupos-primary/20 text-xs font-black uppercase tracking-wider"
                            >
                                <Plus size={16} />
                                <span>Layanan Baru</span>
                            </button>
                        )}

                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleCategoryStatus(category); }}
                                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${category.is_active
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                                    }`}
                            >
                                {category.is_active ? 'Aktif' : 'Nonaktif'}
                            </button>

                            <div className="relative group/actions inline-flex items-center gap-0.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditCategory(category); }}
                                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteCategory(category); }}
                                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="w-px h-8 bg-gray-100 mx-3" />
                            {!summaryMode && (
                                <div className={`p-2 rounded-xl transition-all ${isCollapsed ? 'text-gray-300' : 'text-naqupos-primary bg-naqupos-primary/5'}`}>
                                    {isCollapsed ? <ChevronRight size={24} /> : <ChevronDown size={24} />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {!isCollapsed && !summaryMode && (
                    <div className="bg-[#FAFAFA]/50 relative pb-4">
                        {/* Nested Tree Visual - Category to Service */}
                        <div className="absolute left-12 top-0 bottom-8 w-px border-l-2 border-dashed border-gray-200" />

                        {loading && services.length === 0 ? (
                            <div className="p-16 flex justify-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-naqupos-primary"></div>
                            </div>
                        ) : services.length === 0 ? (
                            <div className="p-16 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white shadow-sm mb-4 border border-gray-100">
                                    <Sparkles className="text-gray-200" size={28} />
                                </div>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Belum ada layanan</p>
                            </div>
                        ) : (
                            <div className="p-8 pb-4 pl-12 space-y-6 relative z-10">
                                <DragDropContext onDragEnd={onServiceDragEnd}>
                                    <Droppable droppableId={`services-${category.id}`}>
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                                                {services.map((service, idx) => (
                                                    <Draggable key={service.id} draggableId={`svc-${service.id}`} index={idx}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={`relative group/svc-wrap ${snapshot.isDragging ? 'z-50' : ''}`}
                                                            >
                                                                {/* Connector line from main path to service */}
                                                                <div className="absolute -left-1 w-8 h-px border-t-2 border-dashed border-gray-200 top-1/2 -translate-y-1/2" />
                                                                <div className="absolute -left-1 w-2 h-2 rounded-full bg-gray-200 top-1/2 -translate-y-1/2" />

                                                                <ServiceItem
                                                                    service={service}
                                                                    onEdit={() => onEditService(service)}
                                                                    onDelete={() => onDeleteService(service)}
                                                                    onToggleStatus={() => onToggleStatus(service)}
                                                                    onToggleVariantStatus={onToggleVariantStatus}
                                                                    formatPrice={formatPrice}
                                                                    formatDuration={formatDuration}
                                                                    onViewPriceHistory={() => onViewPriceHistory?.(service)}
                                                                    onViewVariantPriceHistory={(v: any) => onViewPriceHistory?.(service, v)}
                                                                    dragHandleProps={provided.dragHandleProps}
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>

                                {/* Section Pagination inside Category */}
                                {pagination && pagination.last_page > 1 && (
                                    <div className="flex items-center justify-between pt-6 px-4 border-t border-gray-100 mt-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                                            Halaman {pagination.current_page} / {pagination.last_page}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className={`p-2 rounded-xl border-2 transition-all ${page === 1 ? 'opacity-30 border-gray-100 text-gray-200 cursor-not-allowed' : 'bg-white hover:bg-naqupos-primary/5 hover:border-naqupos-primary border-gray-100 text-gray-600'}`}
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button
                                                onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                                                disabled={page === pagination.last_page}
                                                className={`p-2 rounded-xl border-2 transition-all ${page === pagination.last_page ? 'opacity-30 border-gray-100 text-gray-200 cursor-not-allowed' : 'bg-white hover:bg-naqupos-primary/5 hover:border-naqupos-primary border-gray-100 text-gray-600'}`}
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ServiceItem({ service, onEdit, onDelete, formatPrice, formatDuration, onToggleStatus, onToggleVariantStatus, onViewPriceHistory, onViewVariantPriceHistory, dragHandleProps }: any) {
   console.log('SIMM', service.image);
   
    const [expanded, setExpanded] = useState(true);
    const hasVariants = service.variants && service.variants.length > 0;

    return (
        <div className="group/item bg-white/80 backdrop-blur-sm hover:bg-white rounded-[1.8rem] border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ring-1 ring-black/[0.02]">
            <div className="p-5 flex items-center gap-5 bg-white">
                <div {...dragHandleProps} className="text-gray-200 hover:text-naqupos-primary cursor-grab active:cursor-grabbing p-1 transition-colors">
                    <GripVertical size={20} />
                </div>

                {/* Status Indicator Bar */}
                <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${service.status === 'active' ? 'bg-naqupos-primary shadow-[0_0_10px_rgba(197,137,64,0.3)]' : 'bg-gray-200'}`} />

                {/* Service Image */}
  {service.image && (
    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm">
        <img
            src={fixImageUrl(service.image)}
            alt={service.name}
            className="w-full h-full object-cover"
            onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
        />
    </div>
)}
                {/* Service Info */}
                <div className="flex-1 min-w-0" onClick={() => hasVariants && setExpanded(!expanded)}>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-black text-gray-800 text-base tracking-tight group-hover/item:text-naqupos-primary transition-colors cursor-pointer">{service.name}</h4>
                        {service.code && (
                            <span className="px-2 py-0.5 text-[9px] font-black tracking-widest text-gray-400 bg-gray-50 rounded-lg border border-gray-100 uppercase">{service.code}</span>
                        )}
                        {!hasVariants && service.special_price && service.special_price > 0 && (
                            <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Promo Spesial</span>
                        )}
                        {service.is_booking_online_enabled && (
                            <span className="text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1">
                                <Globe size={10} /> Booking Online
                            </span>
                        )}
                    </div>
                    {!hasVariants && (
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <span className="flex items-center gap-1"><Clock size={12} className="text-naqupos-primary/40" /> {formatDuration(service.duration)}</span>
                        </div>
                    )}
                </div>

                {/* Price Display for Quick Info */}
                {!hasVariants && (
                    <div className="px-4 text-right flex flex-col items-end">
                        {service.special_price && service.special_price > 0 ? (
                            <>
                                <span className="text-[10px] text-gray-400 font-bold line-through mb-0.5">
                                    {formatPrice(service.price)}
                                </span>
                                <span className="text-sm font-black text-emerald-600">
                                    {formatPrice(service.special_price)}
                                </span>
                            </>
                        ) : (
                            <span className="block text-sm font-black text-gray-900">{formatPrice(service.price)}</span>
                        )}
                    </div>
                )}

                {/* Status Toggle & Actions */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onToggleStatus(service)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${service.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                            }`}
                    >
                        {service.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </button>

                    <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                        <button onClick={onEdit} className="p-2 text-gray-400 hover:text-naqupos-primary hover:bg-white rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-black/5">
                            <Edit size={16} />
                        </button>
                        <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-black/5">
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onViewPriceHistory?.(); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Riwayat Harga"
                    >
                        <Clock size={18} />
                    </button>

                    {hasVariants && (
                        <button onClick={() => setExpanded(!expanded)} className={`ml-1 p-2 rounded-xl transition-all ${expanded ? 'text-naqupos-primary bg-naqupos-primary/5' : 'text-gray-300 hover:text-gray-400'}`}>
                            {expanded ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Variants Visualization */}
            {hasVariants && expanded && (
                <div className="bg-[#FBFAFA] border-t border-gray-100 relative pt-2 pb-4">
                    {/* Nested Tree Visual - Service to Variants */}
                    <div className="absolute left-10 top-0 bottom-6 w-px border-l border-dashed border-gray-200" />

                    <div className="space-y-2 px-4 pl-12">
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-2">Varian Layanan</div>
                        {service.variants.map((variant: any) => (
                            <div key={variant.id} className="relative group/var flex justify-between items-center py-4 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-naqupos-primary/20 transition-all">
                                {/* Connector line from service path to variant */}
                                <div className="absolute -left-2 w-2.5 h-px bg-gray-200 top-1/2 -translate-y-1/2" />
                                <div className="absolute -left-2.5 w-1.5 h-1.5 rounded-full bg-gray-200 top-1/2 -translate-y-1/2" />

                                <div className="space-y-1">
                                    <p className="text-sm font-black text-gray-800 group-hover/var:text-naqupos-primary transition-colors">
                                        {variant.name}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                                            <Clock size={12} className="text-gray-300" /> {formatDuration(variant.duration)}
                                        </p>
                                        {variant.special_price && (
                                            <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Promo Spesial</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleVariantStatus?.(variant.id, !!variant.is_active); }}
                                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${variant.is_active
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                                                }`}
                                        >
                                            {variant.is_active ? 'Aktif' : 'Nonaktif'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onViewVariantPriceHistory?.(variant); }}
                                            className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Riwayat Harga Varian"
                                        >
                                            <Clock size={16} />
                                        </button>
                                    </div>
                                    <div className="text-right flex flex-col items-end justify-center min-w-[120px]">
                                        {variant.special_price ? (
                                            <>
                                                <span className="text-[10px] text-gray-300 font-bold line-through mb-0.5">
                                                    {formatPrice(variant.price)}
                                                </span>
                                                <span className="text-base font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
                                                    {formatPrice(variant.special_price)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-base font-black text-gray-900 bg-gray-50 px-3 py-1 rounded-xl group-hover/var:bg-naqupos-primary/5 group-hover/var:text-naqupos-primary transition-all">
                                                {formatPrice(variant.price)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
