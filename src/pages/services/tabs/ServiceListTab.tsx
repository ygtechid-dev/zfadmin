import { Search, Plus, Trash2, Clock, DollarSign, X, AlertTriangle, ChevronLeft, ChevronRight, Layers, Check, Sparkles, Eye, Edit, Filter as FilterIcon, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import BranchSelector from '../../../components/common/BranchSelector';
import { CurrencyInput } from '../../../components/common/CurrencyInput';
import { SearchableSelect } from '../../../components/common';
import ServiceGroupedList from '../components/ServiceGroupedList';
import ServiceCategoryModal from '../components/ServiceCategoryModal';
import ServicePriceHistoryModal from '../components/ServicePriceHistoryModal';
import type { Service, ServiceCategory, ServiceVariant } from '../serviceTypes';
import swal from '../../../utils/swal';
import { useBranchSync } from '../../../hooks/useBranchSync';


const fixImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '';
    console.log('impatg', imagePath);
    
    // Replace domain baru ke domain lama tempat file beneran ada
    if (imagePath.includes('apinaqupos.zafarangroupindonesia.com')) {
        return imagePath.replace(
            'https://apinaqupos.zafarangroupindonesia.com',
            'https://zafaranbe.memofy-dev.my.id'
        );
    }
    if (imagePath.startsWith('http')) return imagePath;
    return `https://zafaranbe.memofy-dev.my.id${imagePath}`;
};
// Interfaces removed as they are now imported.





interface ServiceFormData {
    code: string;
    name: string;
    category: string;
    gender: 'all' | 'male' | 'female';
    duration: number | '';
    price: number | '';
    special_price: number | '';
    commission: number | '';
    status: 'active' | 'inactive';
    description: string;
    is_booking_online_enabled: boolean;
    requires_room: boolean;
    is_limited_availability: boolean;
    availability_type: 'specific_dates' | 'recurring';
    availability_data: any;
    branch_ids: number[];
    all_branches_same_price: boolean;
    branch_prices: Record<number, { price: number; special_price?: number }>;
    variants: ServiceVariant[];
    service_category_id: number | null;
    has_variants: boolean;
    imageFile?: File | null;
    imagePreview?: string;
    image_url?: string;
}

const emptyForm: ServiceFormData = {
    code: '',
    name: '',
    category: '',
    gender: 'all',
    duration: 60,
    price: 0,
    special_price: '',
    commission: 0,
    status: 'active',
    description: '',
    is_booking_online_enabled: true,
    requires_room: true,
    is_limited_availability: false,
    availability_type: 'specific_dates',
    availability_data: [],
    branch_ids: [],
    all_branches_same_price: true,
    branch_prices: {},
    variants: [],
    service_category_id: null,
    has_variants: false,
    imageFile: null,
    imagePreview: '',
    image_url: ''
};

const normalizeNumericValue = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

    const raw = String(value).trim();
    if (!raw) return fallback;

    const hasCommaDecimal = raw.includes(',');
    const normalized = hasCommaDecimal
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw.replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBranchIds = (branchIds?: Array<number | string>): number[] => {
    if (!Array.isArray(branchIds)) return [];
    return Array.from(new Set(
        branchIds
            .map(id => Number(id))
            .filter(id => Number.isInteger(id) && id > 0)
    ));
};

const normalizeJsonArray = (value: unknown): any[] | null => {
    if (!value) return null;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }
    return null;
};

const sanitizeServiceVariantForPayload = (variant: ServiceVariant): Record<string, any> => {
    const sanitized: Record<string, any> = {
        duration: normalizeNumericValue(variant.duration),
        price: normalizeNumericValue(variant.price),
        special_price: normalizeNumericValue(variant.special_price, 0) > 0 ? normalizeNumericValue(variant.special_price) : null,
        capital_price: normalizeNumericValue(variant.capital_price, 0) > 0 ? normalizeNumericValue(variant.capital_price) : null,
        name: variant.name || null,
        is_active: variant.is_active !== false,
        all_branches_same_price: variant.all_branches_same_price ?? true,
        branch_prices: variant.branch_prices || {},
        is_limited_availability: !!variant.is_limited_availability,
        availability_type: variant.is_limited_availability ? variant.availability_type : null,
        availability_data: variant.is_limited_availability ? normalizeJsonArray(variant.availability_data) : null
    };

    if (variant.id) sanitized.id = variant.id;

    const variantBranchIds = normalizeBranchIds(variant.branch_ids || []);
    if (variantBranchIds.length > 0) sanitized.branch_ids = variantBranchIds;

    return sanitized;
};

const stableStringify = (value: unknown): string => {
    const normalize = (input: any): any => {
        if (Array.isArray(input)) return input.map(normalize);
        if (input && typeof input === 'object') {
            return Object.keys(input)
                .sort()
                .reduce((acc: Record<string, any>, key) => {
                    acc[key] = normalize(input[key]);
                    return acc;
                }, {});
        }
        return input;
    };

    return JSON.stringify(normalize(value));
};

export default function ServiceListTab() {
    const [searchQuery, setSearchQuery] = useState('');

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { selectedBranchId: branchFilter, setSelectedBranchId: setBranchFilter } = useBranchSync<string | number>(undefined, '');
    const globalBranchId = branchFilter === '' ? 'all' : branchFilter.toString();
    const [branches, setBranches] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
    const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
    const [rawCategories, setRawCategories] = useState<ServiceCategory[]>([]);
    const [summaryMode, setSummaryMode] = useState(false);
    const [categoryLimit, setCategoryLimit] = useState(50);
    // Loading and error states are now per-category or removed for global dashboard simplicity

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

    useEffect(() => {
        loadCategories();
    }, [globalBranchId, refreshTrigger]);

    const loadCategories = async () => {
        try {
            const res = await api.getServiceCategories();
            const branchId = globalBranchId;
            const isSpecific = branchId !== 'all' && branchId !== '';

            // Just raw categories from API + filtering
            // Note: API returns array of objects with id, name, is_global, branch_ids, etc.

            // Store raw categories for display
            // Filter by branch logic if needed, or check if backend filters.

            const filteredRaw = res.filter((c: any) => {
                if (!isSpecific) return true;
                const isGlobal = c.is_global === 1 || c.is_global === true || c.is_global === '1';
                const itemBranchIds = c.branches ? c.branches.map((b: any) => b.id) : (c.branch_id ? [c.branch_id] : []);
                if (isGlobal || itemBranchIds.length === 0) return true;
                return itemBranchIds.includes(Number(branchId));
            });

            setRawCategories(filteredRaw.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)));

            setCategories([
                { label: 'Semua', value: 'All' },
                ...filteredRaw.map(c => ({ label: c.name, value: c.id.toString() }))
            ]);
        } catch (err) {
            console.error("Failed to load service categories", err);
            // Fallback to avoid empty list
            setCategories([
                { label: 'Semua', value: 'All' }
            ]);
        }
    };

    const formatAvailability = (isLimited: boolean, type: string, data: any) => {
        if (!isLimited) return 'Tersedia setiap hari';
        if (!data || (Array.isArray(data) && data.length === 0)) return 'Pilih ketersediaan...';

        if (type === 'recurring') {
            return Array.isArray(data) ? data.join(', ') : data;
        }

        if (type === 'specific_dates') {
            if (!Array.isArray(data)) return data;
            // Sort dates if possible
            const sortedData = [...data].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
            return sortedData.map(dateStr => {
                try {
                    const date = new Date(dateStr);
                    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                } catch (e) {
                    return dateStr;
                }
            }).join(', ');
        }

        return 'Terbatas';
    };

    // Pagination state
    // Modals state removed as they are below or kept if needed

    // Modal states
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
    const [currentEditingVariantIndex, setCurrentEditingVariantIndex] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [showBranchPricesDrawer, setShowBranchPricesDrawer] = useState(false);
    const [branchSearch, setBranchSearch] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isEditing, setIsEditing] = useState(false);

    // Category Modal State
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
    const [confirmDeleteCategoryMode, setConfirmDeleteCategoryMode] = useState<{ show: boolean, category: ServiceCategory | null }>({ show: false, category: null });
    const [isDeletingCategory, setIsDeletingCategory] = useState(false);

    // Form state
    const [formData, setFormData] = useState<ServiceFormData>(emptyForm);
    const [isProcessing, setIsProcessing] = useState(false);

    // Price History Modal State
    const [priceHistoryConfig, setPriceHistoryConfig] = useState<{
        show: boolean;
        serviceId: number;
        serviceName: string;
        variantId?: number;
        variantName?: string;
    } | null>(null);

    const openPriceHistory = (service: Service, variant?: any) => {
        setPriceHistoryConfig({
            show: true,
            serviceId: service.id,
            serviceName: service.name,
            variantId: variant?.id,
            variantName: variant?.name
        });
    };

    useEffect(() => {
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) {
            setUser(JSON.parse(authData).user);
        }

        const loadInitialData = async () => {
            try {
                const branchData = await api.getBranches();
                setBranches(branchData);
            } catch (err) {
                console.error("Failed to load branches", err);
            }
        };
        loadInitialData();
    }, []);

    // Sync branch filter with global selection


    // Track if globally filtered to hide/show local filter
    // const isGloballyFiltered = globalBranchId !== 'all' && globalBranchId !== '';

    // Check if user has super admin or admin cabang privileges
    const isAdmin = user?.role && [
        'admin', 'owner', 'super admin', 'super_admin'
    ].includes(user.role.toLowerCase());

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    // Services are now fetched per category inside ServiceGroupedList
    const refreshData = () => {
        setRefreshTrigger(prev => prev + 1);
        loadCategories();
    };

    const openAddModal = async (initialCategoryName?: string, initialCategoryId?: number) => {
        // Fetch fresh categories when opening modal
        await loadCategories();

        const initialForm = { ...emptyForm };
        if (initialCategoryName && typeof initialCategoryName === 'string') {
            initialForm.category = initialCategoryName;
        }
        if (initialCategoryId) {
            initialForm.service_category_id = initialCategoryId;
        }

        setFormData(initialForm);
        setIsEditing(false);
        setShowAddEditModal(true);
    };

    // Category Modal Handlers
    const openAddCategoryModal = () => {
        setEditingCategory(null);
        setShowCategoryModal(true);
    };

    const openEditCategoryModal = (cat: ServiceCategory) => {
        setEditingCategory(cat);
        setShowCategoryModal(true);
    };

    const handleDeleteCategory = (cat: ServiceCategory) => {
        setConfirmDeleteCategoryMode({ show: true, category: cat });
    };

    const confirmDeleteCategoryAction = async () => {
        if (!confirmDeleteCategoryMode.category) return;
        setIsDeletingCategory(true);
        try {
            await api.deleteServiceCategory(confirmDeleteCategoryMode.category.id);
            refreshData();
            swal.toast('Kategori berhasil dihapus', 'success');
        } catch (e) {
            swal.error('Gagal menghapus kategori');
        } finally {
            setIsDeletingCategory(false);
            setConfirmDeleteCategoryMode({ show: false, category: null });
        }
    };

    const openAddServiceToCategory = (catId: number, catName: string) => {
        openAddModal(catName, catId);
    };

    const openEditModal = async (service: Service) => {
        // Fetch fresh categories when opening modal
        await loadCategories();
        setSelectedService(service);
        setFormData({
            code: service.code || '',
            name: service.name,
            category: service.category,
            service_category_id: service.service_category_id || null,
            gender: service.gender || 'all',
            duration: service.duration,
            price: service.price,
            special_price: service.special_price || '',
            commission: service.commission || 0,
            status: service.status,
            description: service.description || '',
            is_booking_online_enabled: service.is_booking_online_enabled ?? true,
            requires_room: service.requires_room ?? true,
            is_limited_availability: service.is_limited_availability || false,
            availability_type: service.availability_type || 'specific_dates',
            availability_data: normalizeJsonArray(service.availability_data) || [],
            branch_ids: service.branches ? service.branches.map(b => b.id) : [],
            all_branches_same_price: service.all_branches_same_price ?? true,
            branch_prices: service.branch_prices ?? {},
            has_variants: (service.variants || []).length > 0,
            variants: (service.variants || []).map((v: any) => ({
                ...v,
                is_limited_availability: !!v.is_limited_availability,
                availability_type: v.availability_type || 'specific_dates',
                availability_data: (typeof v.availability_data === 'string' ? JSON.parse(v.availability_data) : v.availability_data) || [],
                branch_ids: v.branch_ids || [],
                all_branches_same_price: v.all_branches_same_price ?? true,
                branch_prices: v.branch_prices || {}
            })),
            imageFile: null,
          imagePreview: fixImageUrl((service as any).image),
   image_url: fixImageUrl((service as any).image),
        });
        setIsEditing(true);
        setShowAddEditModal(true);
    };

    const openDeleteModal = (service: Service) => {
        setSelectedService(service);
        setShowDeleteModal(true);
    };

    const closeAllModals = () => {
        setShowDetailModal(false);
        setShowAddEditModal(false);
        setShowDeleteModal(false);
        setSelectedService(null);
    };

    const handleSaveService = async () => {
        // Validation Logic
        const price = normalizeNumericValue(formData.price);

        const duration = normalizeNumericValue(formData.duration);

        if (!formData.category) {
            swal.warning('Kategori layanan wajib dipilih');
            return;
        }

        if (formData.name.trim().length < 3 || formData.name.length > 100) {
            swal.warning('Nama layanan harus antara 3 - 100 karakter');
            return;
        }

        if (duration < 5 || duration > 480) {
            swal.warning('Durasi harus antara 5 - 480 menit');
            return;
        }

        // Price Validation
        if (!formData.has_variants) {
            if (!price || price <= 0) {
                swal.warning('Harga retail wajib diisi');
                return;
            }
            const specialPrice = normalizeNumericValue(formData.special_price, 0);
            if (specialPrice && specialPrice >= price) {
                swal.warning('Harga spesial harus lebih kecil dari harga retail');
                return;
            }
        } else {
            // Validate variations prices
            for (let i = 0; i < formData.variants.length; i++) {
                const v = formData.variants[i];
                const vName = v.name || `Variasi ${i + 1}`;
                const variantPrice = normalizeNumericValue(v.price);
                const variantSpecialPrice = normalizeNumericValue(v.special_price, 0);
                if (!variantPrice || variantPrice <= 0) {
                    swal.warning(`Harga retail untuk ${vName} wajib diisi`);
                    return;
                }
                if (variantSpecialPrice && variantSpecialPrice >= variantPrice) {
                    swal.warning(`Harga spesial untuk ${vName} harus lebih kecil dari harga retail`);
                    return;
                }
            }
        }



        const isAdmin = user?.role && ['admin', 'owner', 'super admin', 'super_admin'].includes(user.role.toLowerCase());

        let finalBranchIds = normalizeBranchIds(formData.branch_ids);
        const validBranchIds = new Set((branches || []).map((branch: any) => Number(branch.id)).filter(Boolean));
        if (formData.has_variants) {
            if (formData.variants.length === 0) {
                swal.warning('Wajib tambah minimal satu variasi jika Gunakan Variasi aktif');
                return;
            }
            const allVariantBranchIds = new Set<number>();
            formData.variants.forEach(v => {
                normalizeBranchIds(v.branch_ids || []).forEach(id => allVariantBranchIds.add(id));
            });
            finalBranchIds = Array.from(allVariantBranchIds);
        }
        finalBranchIds = finalBranchIds.filter(id => validBranchIds.has(id));

        const editingGlobalService = isEditing && ((selectedService as any)?.is_global === true || (selectedService as any)?.is_global === 1);

        if (isAdmin && finalBranchIds.length === 0 && !editingGlobalService) {
            swal.warning('Pilih minimal satu cabang');
            return;
        }

        setIsProcessing(true);
        try {
           // eslint-disable-next-line @typescript-eslint/no-unused-vars
const {
    status,
    branch_ids,
    variants,
    has_variants,
    imageFile,
    imagePreview,
    image_url,
    service_category_id,
    is_limited_availability,
    availability_type,
    availability_data,
    all_branches_same_price,
    branch_prices,
    ...rest
} = formData;
            // If No Variants, clear the variants array
            const finalVariants = has_variants ? variants : [];

            // If has variants, use the first variant price/duration as main price/duration
            const finalPrice = has_variants && finalVariants.length > 0
                ? normalizeNumericValue(finalVariants[0].price)
                : normalizeNumericValue(formData.price);

            const finalDuration = has_variants && finalVariants.length > 0
                ? normalizeNumericValue(finalVariants[0].duration)
                : normalizeNumericValue(formData.duration);

            const sanitizedVariants = finalVariants.map(variant => {
                const sanitized = sanitizeServiceVariantForPayload(variant);
                if (Array.isArray(sanitized.branch_ids)) {
                    sanitized.branch_ids = sanitized.branch_ids.filter(id => validBranchIds.has(Number(id)));
                }
                return sanitized;
            });

            const payload: any = {
                ...rest,
                name: formData.name.trim(),
                description: formData.description.trim(),
                price: finalPrice,
                special_price: normalizeNumericValue(formData.special_price, 0) > 0 && !has_variants ? normalizeNumericValue(formData.special_price) : null,
                duration: finalDuration,
                commission: 0,
                is_active: status === 'active',
                is_global: finalBranchIds.length === 0,
            };

            if (formData.service_category_id) {
                payload.service_category_id = formData.service_category_id;
            } else {
                delete payload.service_category_id;
            }

            payload.is_limited_availability = !!formData.is_limited_availability;
            payload.availability_type = formData.is_limited_availability ? formData.availability_type : null;
            payload.availability_data = formData.is_limited_availability ? (normalizeJsonArray(formData.availability_data) || []) : null;

            if (formData.all_branches_same_price === false || Object.keys(formData.branch_prices || {}).length > 0) {
                payload.all_branches_same_price = formData.all_branches_same_price;
                payload.branch_prices = formData.branch_prices;
            }

            const existingVariants = ((selectedService?.variants || []) as ServiceVariant[]).map(sanitizeServiceVariantForPayload);
            const variantsChanged = !isEditing ||
                ((selectedService?.variants || []).length > 0) !== has_variants ||
                stableStringify(existingVariants) !== stableStringify(sanitizedVariants);

            if (variantsChanged) {
                payload.variants = sanitizedVariants;
            }

            if (String(formData.code || '').trim()) {
                payload.code = String(formData.code).trim();
            } else {
                delete payload.code;
            }

            if (finalBranchIds.length > 0) {
                payload.branch_ids = finalBranchIds;
            }

            console.log('[ServiceSave] availability payload:', {
                is_limited_availability: payload.is_limited_availability,
                availability_type: payload.availability_type,
                availability_data: payload.availability_data,
            });

            let serviceId = selectedService?.id;

            if (isEditing && selectedService) {
                await api.updateService(selectedService.id, payload);
            } else {
                const result = await api.createService(payload);
                console.log('[createService] result:', result); 
                serviceId = result.id || result.service?.id;
            }

            // Sync with POS
            try {
                const channel = new BroadcastChannel('zafara-pos-sync');
                channel.postMessage('data-updated');
                channel.close();
            } catch (err) {
                console.error('POS sync failed:', err);
            }
console.log('[upload check] serviceId:', serviceId, 'imageFile:', formData.imageFile);
            // Upload image if selected
            if (serviceId && formData.imageFile) {
                 console.log('[masuk if upload]');
                try {
                    await api.uploadServiceImage(serviceId, formData.imageFile);
                } catch (imgErr) {
                    console.error('Image upload failed:', imgErr);
                }
            }

            refreshData();
            closeAllModals();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to save service');
            console.error('Error saving service:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteService = async () => {
        if (!selectedService) return;

        setIsProcessing(true);
        try {
            await api.deleteService(selectedService.id);
            // Sync with POS
            try {
                const channel = new BroadcastChannel('zafara-pos-sync');
                channel.postMessage('data-updated');
                channel.close();
            } catch (err) {
                console.error('POS sync failed:', err);
            }
            refreshData();
            closeAllModals();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to delete service');
            console.error('Error deleting service:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleStatus = async (service: Service) => {
        try {
            const newStatus = service.status === 'active' ? 'inactive' : 'active';
            await api.updateService(service.id, { is_active: newStatus === 'active' });
            refreshData();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to update status');
            console.error('Error updating status:', err);
        }
    };

    const handleToggleVariantStatus = async (variantId: number, currentStatus: boolean) => {
        try {
            await api.updateServiceVariant(variantId, { is_active: !currentStatus });
            setRefreshTrigger(prev => prev + 1);
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to update status');
            console.error('Error updating status:', err);
        }
    };

    const handleToggleCategoryStatus = async (category: ServiceCategory) => {
        try {
            const newStatus = !category.is_active;
            await api.updateServiceCategory(category.id, { is_active: newStatus });
            refreshData();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to update category status');
            console.error('Error updating category status:', err);
        }
    };

    // Cost Calculator Logic
    const [showCostCalculator, setShowCostCalculator] = useState(false);
    const [calculatorTargetIndex, setCalculatorTargetIndex] = useState<number | null>(null);
    const [calculatorProducts, setCalculatorProducts] = useState<any[]>([]);
    const [calculatorSearch, setCalculatorSearch] = useState('');
    const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([]);
    const [calculatorLoading, setCalculatorLoading] = useState(false);

    const loadCalculatorProducts = async () => {
        if (calculatorProducts.length > 0) return;
        setCalculatorLoading(true);
        try {
            const res = await api.getProducts({ limit: 1000, is_active: 1 });
            const data = res.data || (Array.isArray(res) ? res : []);
            const flattened: any[] = [];

            data.forEach((p: any) => {
                const variants = Array.isArray(p.variants) ? p.variants : (p.variants ? Object.values(p.variants) : []);
                if (variants.length > 0) {
                    variants.forEach((v: any) => {
                        flattened.push({
                            unique_key: `v-${v.id}`,
                            id: v.id,
                            parent_id: p.id,
                            name: `${p.name} - ${v.name}`,
                            cost_price: Number(v.price || 0)
                        });
                    });
                } else {
                    flattened.push({
                        unique_key: `p-${p.id}`,
                        id: p.id,
                        parent_id: null,
                        name: p.name,
                        cost_price: Number(p.price || 0)
                    });
                }
            });
            setCalculatorProducts(flattened);
        } catch (err) {
            console.error("Failed to load products for calculator", err);
        } finally {
            setCalculatorLoading(false);
        }
    };

    const openCostCalculator = (index: number | null) => {
        setCalculatorTargetIndex(index);
        setShowCostCalculator(true);
        setCalculatorSearch('');

        // Seed selection from variant if available
        if (index !== null && formData.variants[index]) {
            setSelectedProductKeys(formData.variants[index].selected_products || []);
        } else {
            setSelectedProductKeys([]);
        }

        loadCalculatorProducts();
    };

    const handleApplyCost = () => {
        const total = selectedProductKeys.reduce((sum, key) => {
            const prod = calculatorProducts.find(p => p.unique_key === key);
            return sum + (prod ? prod.cost_price : 0);
        }, 0);

        if (calculatorTargetIndex !== null) {
            const newVariants = [...formData.variants];
            newVariants[calculatorTargetIndex].capital_price = total;
            newVariants[calculatorTargetIndex].selected_products = [...selectedProductKeys];
            setFormData(prev => ({ ...prev, variants: newVariants }));
        }
        setShowCostCalculator(false);
    };

    const toggleProductSelection = (key: string) => {
        setSelectedProductKeys(prev => {
            if (prev.includes(key)) return prev.filter(x => x !== key);
            return [...prev, key];
        });
    };

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const monthName = (date: Date) => date.toLocaleDateString('id-ID', { month: 'long' });

    const toggleDate = (date: string) => {
        const currentData = Array.isArray(formData.availability_data) ? formData.availability_data : [];
        if (currentData.includes(date)) {
            setFormData(prev => ({ ...prev, availability_data: currentData.filter(d => d !== date) }));
        } else {
            setFormData(prev => ({ ...prev, availability_data: [...currentData, date] }));
        }
    };

    const toggleDay = (day: string) => {
        const currentData = Array.isArray(formData.availability_data) ? formData.availability_data : [];
        if (currentData.includes(day)) {
            setFormData(prev => ({ ...prev, availability_data: currentData.filter(d => d !== day) }));
        } else {
            setFormData(prev => ({ ...prev, availability_data: [...currentData, day] }));
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 bg-naqupos-primary/10 rounded-2xl flex items-center justify-center">
                            <Layers className="text-naqupos-primary" size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-naqupos-dark tracking-tight">Daftar Layanan</h1>
                    </div>
                    <p className="text-gray-500 font-medium ml-13">Kelola katalog layanan, kategori, dan struktur harga di seluruh cabang.</p>
                </div>

                <div className="flex items-center gap-3">
                    {summaryMode && (
                        <button
                            onClick={openAddCategoryModal}
                            className="group flex items-center gap-2 bg-white border border-gray-100 text-gray-700 px-5 py-3 rounded-2xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm hover:shadow-md active:scale-95"
                        >
                            <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                                <Plus size={14} className="text-gray-400 group-hover:text-naqupos-primary" />
                            </div>
                            <span>Kategori</span>
                        </button>
                    )}
                    {!summaryMode && (
                        <button
                            onClick={() => openAddModal()}
                            className="flex items-center gap-2 bg-naqupos-primary text-white px-6 py-3 rounded-2xl hover:bg-naqupos-dark transition-all font-bold text-sm shadow-lg shadow-naqupos-primary/20 active:scale-95"
                        >
                            <Plus size={18} />
                            <span>Tambah Layanan</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter & Search Dashboard */}
            <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-naqupos-primary/5 to-transparent rounded-[2rem] blur-xl opacity-50" />
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white shadow-xl shadow-black/[0.03] p-6 space-y-6">
                    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                        {/* Search Input */}
                        <div className="relative flex-1 group">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-naqupos-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari nama atau kode layanan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-gray-50/50 rounded-2xl border border-gray-100 focus:bg-white focus:border-naqupos-primary focus:ring-4 focus:ring-naqupos-primary/5 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-medium"
                            />
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap items-center gap-4">
                            {isAdmin && (
                                <div className="p-1 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-2">
                                    <div className="pl-3 py-2">
                                        <FilterIcon size={14} className="text-gray-400" />
                                    </div>
                                    <BranchSelector
                                        selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)}
                                        onBranchChange={(id) => setBranchFilter(id || '')}
                                        showAllOption={true}
                                        className="!min-w-[150px] border-none shadow-none bg-transparent"
                                    />
                                </div>
                            )}

                            <div className="p-1 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-3">Status</span>
                                <SearchableSelect
                                    value={filterStatus}
                                    onChange={(val: string | number) => setFilterStatus(val as any)}
                                    options={[
                                        { value: 'all', label: 'Semua Status' },
                                        { value: 'active', label: 'Hanya Aktif' },
                                        { value: 'inactive', label: 'Nonaktif' }
                                    ]}
                                    className="!min-w-[150px] border-none shadow-none bg-transparent"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Services Grid */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm mb-6">
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setSummaryMode(false)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!summaryMode ? 'bg-white text-naqupos-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Layanan
                        </button>
                        <button
                            onClick={() => setSummaryMode(true)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${summaryMode ? 'bg-white text-naqupos-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Kategori
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">
                            Menampilkan {Math.min(categoryLimit, rawCategories.length)} dari {rawCategories.length} Kategori
                        </div>
                    </div>
                </div>

                <ServiceGroupedList
                    key={refreshTrigger}
                    categories={rawCategories.slice(0, categoryLimit)}
                    summaryMode={summaryMode}
                    searchQuery={debouncedSearch}
                    branchFilter={branchFilter}
                    filterStatus={filterStatus}
                    onEditService={openEditModal}
                    onDeleteService={openDeleteModal}
                    onToggleStatus={handleToggleStatus}
                    onEditCategory={openEditCategoryModal}
                    onDeleteCategory={handleDeleteCategory}
                    onToggleCategoryStatus={handleToggleCategoryStatus}
                    onAddServiceToCategory={openAddServiceToCategory}
                    onToggleVariantStatus={handleToggleVariantStatus}
                    onViewPriceHistory={openPriceHistory}
                    onReorderCategories={(newOrder) => {
                        setRawCategories(newOrder);
                        api.reorderServiceCategories(newOrder.map((c, i) => ({ id: c.id, position: i + 1 })));
                    }}
                />

                {categoryLimit < rawCategories.length && (
                    <div className="flex justify-center mt-8 pb-20">
                        <button
                            onClick={() => setCategoryLimit(prev => prev + 20)}
                            className="group flex items-center gap-3 px-8 py-4 bg-white border-2 border-naqupos-primary/20 text-naqupos-primary hover:border-naqupos-primary hover:bg-naqupos-primary/5 rounded-[2rem] transition-all shadow-xl shadow-naqupos-primary/5 font-black uppercase tracking-widest text-sm"
                        >
                            <span>Tampilkan Lebih Banyak Kategori</span>
                            <ChevronDown size={20} className="group-hover:translate-y-1 transition-transform" />
                        </button>
                    </div>
                )}
            </div>

            {showCategoryModal && (
                <ServiceCategoryModal
                    category={editingCategory}
                    onClose={() => setShowCategoryModal(false)}
                    onSuccess={() => {
                        setShowCategoryModal(false);
                        loadCategories();
                    }}
                    isNew={!editingCategory}
                    branches={branches}
                />
            )}

            {/* Detail Modal */}
            {
                showDetailModal && selectedService && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl  font-bold text-naqupos-dark">Detail Layanan</h3>
                                <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-naqupos-cream mx-auto flex items-center justify-center">
                                    <Sparkles size={32} className="text-naqupos-primary" />
                                </div>
                                <h4 className="text-xl font-bold text-naqupos-dark mt-3">{selectedService.name}</h4>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${selectedService.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {selectedService.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                </span>
                                {selectedService.code && (
                                    <p className="text-sm  text-gray-500 mt-1">{selectedService.code}</p>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Kategori</span>
                                    <span className="font-medium">{selectedService.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Gender</span>
                                    <span className="font-medium">
                                        {selectedService.gender === 'female' ? 'Wanita' : selectedService.gender === 'male' ? 'Pria' : 'Semua Gender'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Durasi</span>
                                    <span className="font-medium">{selectedService.duration} Menit</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Harga / Komisi</span>
                                    <div className="space-y-1">
                                        <span className="font-bold text-naqupos-primary">{formatPrice(selectedService.price)}</span>
                                        <span className="text-gray-300 mx-2">•</span>
                                        <span className="font-medium text-green-600">{formatPrice(selectedService.commission)}</span>
                                    </div>
                                </div>
                                {selectedService.description && (
                                    <div className="pt-3 border-t border-gray-200">
                                        <p className="text-gray-500 text-xs mb-1">Deskripsi:</p>
                                        <p>{selectedService.description}</p>
                                    </div>
                                )}

                                {selectedService.branches && selectedService.branches.length > 0 && (
                                    <div className="pt-3 border-t border-gray-200">
                                        <p className="text-gray-500 text-xs mb-1">Tersedia di Cabang:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedService.branches.map(b => (
                                                <span key={b.id} className="px-2 py-0.5 bg-naqupos-cream text-naqupos-primary text-[10px] font-medium rounded-full">
                                                    {b.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        closeAllModals();
                                        openEditModal(selectedService);
                                    }}
                                    className="flex-1 py-3 border border-naqupos-primary text-naqupos-primary rounded-lg font-medium hover:bg-naqupos-cream transition-colors"
                                >
                                    Edit Layanan
                                </button>
                                <button
                                    onClick={closeAllModals}
                                    className="flex-1 py-3 bg-naqupos-primary text-white rounded-lg font-medium hover:bg-naqupos-accent transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add/Edit Modal */}
            {
                showAddEditModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                                <div>
                                    <h3 className="text-xl font-bold text-naqupos-dark flex items-center gap-2">
                                        {isEditing ? <Edit size={20} className="text-naqupos-primary" /> : <Plus size={20} className="text-naqupos-primary" />}
                                        {isEditing ? 'Edit Layanan' : 'Tambah Layanan Baru'}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">Lengkapi informasi layanan di bawah ini</p>
                                </div>
                                <button onClick={closeAllModals} className="p-2 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                                {/* Section: Image Upload */}
                                <section className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                                        <Eye size={16} className="text-naqupos-primary" /> Foto Layanan
                                    </h4>
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative group">
                                            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 group-hover:border-naqupos-primary transition-colors">
                                                {formData.imagePreview ? (
                                                    <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <Sparkles size={24} className="text-gray-300 mx-auto mb-2" />
                                                        <span className="text-[10px] text-gray-400 font-medium">Click to upload</span>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 5 * 1024 * 1024) {
                                                                swal.warning('File terlalu besar. Max 5MB.');
                                                                return;
                                                            }
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    imageFile: file,
                                                                    imagePreview: reader.result as string
                                                                }));
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                            {formData.imagePreview && (
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, imageFile: null, imagePreview: '' }))}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-400">Rekomendasi: 800x800px, Max 5MB</p>
                                    </div>
                                </section>

                                {/* Section: Basic Info */}
                                <section className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                                        <Sparkles size={16} className="text-naqupos-primary" /> Informasi Dasar
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Code Field */}
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kode Layanan</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={formData.code}
                                                    readOnly={true}
                                                    placeholder="Auto-generated"
                                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 text-sm font-mono cursor-not-allowed"
                                                />
                                                <div className="absolute inset-y-0 right-3 flex items-center">
                                                    <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-medium">AUTO</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Name Field */}
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Layanan <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData(prev => {
                                                        const newState = { ...prev, name: val };
                                                        if (!isEditing) {
                                                            const initials = val.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3);
                                                            const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
                                                            newState.code = val.length > 2 ? `SVC-${initials}${random}` : prev.code;
                                                        }
                                                        return newState;
                                                    })
                                                }}
                                                placeholder="Contoh: Balinese Massage 60'"
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kategori</label>
                                            <div className="relative">
                                                <SearchableSelect
                                                    value={formData.service_category_id ? Number(formData.service_category_id) : (formData.category === 'Lainnya' ? 'Lainnya' : '')}
                                                    onChange={(val: string | number) => {
                                                        const selectedCat = categories.find(c => String(c.value) === String(val));
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            category: selectedCat ? selectedCat.label : (val === 'Lainnya' ? 'Lainnya' : ''),
                                                            service_category_id: (selectedCat && selectedCat.value !== 'All' && selectedCat.value !== 'Lainnya') ? Number(selectedCat.value) : null
                                                        }));
                                                    }}
                                                    options={[
                                                        ...categories.filter(c => c.value !== 'All').map(opt => ({
                                                            value: opt.value === 'Lainnya' ? 'Lainnya' : Number(opt.value),
                                                            label: opt.label
                                                        })),
                                                        ...(categories.some(c => c.value === 'Lainnya') ? [] : [{ value: 'Lainnya', label: 'Lainnya' }])
                                                    ]}
                                                    placeholder="Pilih Kategori"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gender</label>
                                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                                {(['all', 'female', 'male'] as const).map(g => (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                                                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${formData.gender === g
                                                            ? (g === 'female' ? 'bg-white text-pink-600 shadow-sm' : g === 'male' ? 'bg-white text-blue-600 shadow-sm' : 'bg-white text-gray-700 shadow-sm')
                                                            : 'text-gray-500 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        {g === 'all' ? 'Semua' : (g === 'female' ? 'Wanita' : 'Pria')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Durasi (Menit)</label>
                                            <div className="relative">
                                                <CurrencyInput
                                                    value={formData.duration}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, duration: val }))}
                                                    placeholder="60"
                                                />
                                                <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none text-gray-400">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Pricing */}
                                <section className="space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                            <DollarSign size={16} className="text-naqupos-primary" /> Harga
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gunakan Variasi</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, has_variants: !prev.has_variants }))}
                                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${formData.has_variants ? 'bg-naqupos-primary' : 'bg-gray-200'}`}
                                            >
                                                <span
                                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.has_variants ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {!formData.has_variants ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                                                <label className="block text-xs font-bold text-green-800 mb-1.5">Harga Retail <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">Rp</span>
                                                    <CurrencyInput
                                                        value={formData.price}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, price: val }))}
                                                        placeholder="0"
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-green-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none bg-white font-medium"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-green-600 mt-1">Harga normal layanan.</p>
                                            </div>

                                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                <label className="block text-xs font-bold text-blue-800 mb-1.5">Harga Spesial (Opsional)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold">Rp</span>
                                                    <CurrencyInput
                                                        value={formData.special_price}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, special_price: val }))}
                                                        placeholder="0"
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-blue-600 mt-1">Harga promo/coret (opsional).</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-center gap-3 animate-in fade-in duration-300">
                                            <Layers size={20} className="text-amber-500" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-800">Variasi Aktif</p>
                                                <p className="text-[10px] text-amber-600">Harga akan ditentukan pada bagian Variasi Layanan di bawah.</p>
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Section: Variants */}
                                {formData.has_variants && (
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                                            <Layers size={16} className="text-naqupos-primary" /> Variasi Layanan
                                        </h4>
                                        {/* ... (existing variants code) ... */}
                                        <div className="space-y-3">
                                            {formData.variants.map((variant, index) => {
                                                const isEditing = editingVariantIndex === index;

                                                if (isEditing) {
                                                    return (
                                                        <div key={index} className="border border-naqupos-primary/30 rounded-xl p-4 bg-naqupos-cream/10 space-y-4">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <h5 className="font-bold text-sm text-naqupos-dark">Edit Variasi</h5>
                                                                <button
                                                                    onClick={() => setEditingVariantIndex(null)}
                                                                    className="text-red-500 hover:bg-red-50 p-1 rounded-full"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Durasi</label>
                                                                    <div className="relative">
                                                                        <CurrencyInput
                                                                            value={variant.duration}
                                                                            onChange={(val) => {
                                                                                const newVariants = [...formData.variants];
                                                                                newVariants[index].duration = Number(val);
                                                                                setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                            }}
                                                                            placeholder="60"
                                                                        />
                                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Menit</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Varian (Opsional)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={variant.name || ''}
                                                                        onChange={(e) => {
                                                                            const newVariants = [...formData.variants];
                                                                            newVariants[index].name = e.target.value;
                                                                            setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                        }}
                                                                        placeholder="e.g. Long Hair"
                                                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Harga Retail</label>
                                                                    <CurrencyInput
                                                                        value={variant.price}
                                                                        onChange={(val) => {
                                                                            const newVariants = [...formData.variants];
                                                                            newVariants[index].price = val;
                                                                            setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                        }}
                                                                        prefix="Rp "
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Harga Spesial (Opsional)</label>
                                                                    <CurrencyInput
                                                                        value={variant.special_price || 0}
                                                                        onChange={(val) => {
                                                                            const newVariants = [...formData.variants];
                                                                            newVariants[index].special_price = val;
                                                                            setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                        }}
                                                                        prefix="Rp "
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Harga Modal (Opsional)</label>
                                                                    <div
                                                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/80 transition-all cursor-pointer group"
                                                                        onClick={() => openCostCalculator(index)}
                                                                    >
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <span className="font-bold text-gray-900">
                                                                                {formatPrice(variant.capital_price)}
                                                                            </span>
                                                                            <span className="text-gray-300 font-bold">•</span>
                                                                            <span className="text-gray-500 text-xs font-medium">{(variant.selected_products?.length || 0)} Produk</span>
                                                                        </div>
                                                                        <button type="button" className="text-xs font-bold text-blue-500 group-hover:underline">
                                                                            Ganti
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Status Toggle */}
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                                                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newVariants = [...formData.variants];
                                                                                newVariants[index].is_active = true;
                                                                                setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                            }}
                                                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${variant.is_active !== false ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                        >
                                                                            Aktif
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newVariants = [...formData.variants];
                                                                                newVariants[index].is_active = false;
                                                                                setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                            }}
                                                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${variant.is_active === false ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                        >
                                                                            Nonaktif
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Variant Access Settings */}
                                                            <div className="space-y-4 border-t border-gray-100 pt-4 mt-2">
                                                                <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                                    <Eye size={14} className="text-naqupos-primary" /> Pengaturan Akses Variasi
                                                                </h5>

                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Harga tiap lokasi</label>
                                                                    <div
                                                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-all cursor-pointer group"
                                                                        onClick={() => {
                                                                            setCurrentEditingVariantIndex(index);
                                                                            setShowBranchPricesDrawer(true);
                                                                        }}
                                                                    >
                                                                        <div className="text-sm">
                                                                            <span className={`font-bold ${(variant.branch_ids?.length || 0) === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                                                                {(variant.branch_ids?.length || 0) > 0
                                                                                    ? (variant.all_branches_same_price ?? true
                                                                                        ? `${variant.branch_ids?.length} Lokasi Terpilih (Harga Sama)`
                                                                                        : `${variant.branch_ids?.length} Lokasi Terpilih (Beda Harga)`)
                                                                                    : 'Wajib pilih lokasi'}
                                                                            </span>
                                                                        </div>
                                                                        <button type="button" className="text-xs font-bold text-blue-500 group-hover:underline">
                                                                            Ganti
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tentukan Waktu Ketersediaan</label>
                                                                    <div
                                                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-all cursor-pointer group"
                                                                        onClick={() => {
                                                                            setCurrentEditingVariantIndex(index);
                                                                            setShowAvailabilityModal(true);
                                                                        }}
                                                                    >
                                                                        <div className="text-sm">
                                                                            <span className={`font-bold ${variant.is_limited_availability ? 'text-gray-900' : 'text-gray-400'}`}>
                                                                                {formatAvailability(!!variant.is_limited_availability, variant.availability_type || 'specific_dates', variant.availability_data)}
                                                                            </span>
                                                                        </div>
                                                                        <button type="button" className="text-xs font-bold text-blue-500 group-hover:underline">
                                                                            Ganti
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-between items-center pt-2">
                                                                <button
                                                                    onClick={() => {
                                                                        const newVariants = formData.variants.filter((_, i) => i !== index);
                                                                        setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                        setEditingVariantIndex(null);
                                                                    }}
                                                                    className="text-red-500 text-xs font-medium hover:underline flex items-center gap-1"
                                                                >
                                                                    <Trash2 size={14} /> Hapus Varian
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingVariantIndex(null)}
                                                                    className="text-naqupos-primary text-sm font-bold hover:underline"
                                                                >
                                                                    Selesai
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Display Mode
                                                return (
                                                    <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors bg-white">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-gray-900">{variant.name || `${variant.duration} Menit`}</span>
                                                                {(variant.special_price ?? 0) > 0 && (
                                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Promo</span>
                                                                )}
                                                                {variant.is_active === false && (
                                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">Nonaktif</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                                <span className="flex items-center gap-1"><Clock size={12} /> {variant.duration}m</span>
                                                                <span className="block w-1 h-1 bg-gray-300 rounded-full"></span>
                                                                <span className={variant.special_price ? 'line-through text-gray-400' : ''}>{formatPrice(variant.price)}</span>
                                                                {(variant.special_price ?? 0) > 0 && (
                                                                    <span className="font-bold text-red-500">{formatPrice(variant.special_price)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setEditingVariantIndex(index)}
                                                            className="px-3 py-1.5 text-xs font-bold text-naqupos-primary hover:bg-naqupos-cream/20 rounded-lg transition-colors"
                                                        >
                                                            Ganti
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {/* Add Button */}
                                            {editingVariantIndex === null && (
                                                <button
                                                    onClick={() => {
                                                        const newVariant: ServiceVariant = {
                                                            name: '',
                                                            duration: 60,
                                                            price: 0,
                                                            is_active: true,
                                                            branch_ids: formData.branch_ids,
                                                            all_branches_same_price: true,
                                                            branch_prices: {},
                                                            is_limited_availability: false,
                                                            availability_type: 'specific_dates',
                                                            availability_data: []
                                                        };
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            variants: [...prev.variants, newVariant]
                                                        }));
                                                        setEditingVariantIndex(formData.variants.length);
                                                    }}
                                                    className="w-full py-3 border border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:border-naqupos-primary hover:text-naqupos-primary hover:bg-naqupos-cream/5 transition-all font-medium"
                                                >
                                                    <Plus size={18} /> Tambah varian lain
                                                </button>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {/* Section: Additional Settings */}
                                <section className="space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                            <Eye size={16} className="text-naqupos-primary" /> Pengaturan Tambahan
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.is_booking_online_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                                Booking Online: {formData.is_booking_online_enabled ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, is_booking_online_enabled: !prev.is_booking_online_enabled }))}
                                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${formData.is_booking_online_enabled ? 'bg-naqupos-primary' : 'bg-gray-200'}`}
                                            >
                                                <span
                                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.is_booking_online_enabled ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {isAdmin && !formData.has_variants && (
                                        <div className="space-y-4 pt-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Harga tiap lokasi</label>
                                                <div
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/80 transition-all cursor-pointer group"
                                                    onClick={() => {
                                                        setCurrentEditingVariantIndex(null);
                                                        setShowBranchPricesDrawer(true);
                                                    }}
                                                >
                                                    <div className="text-sm">
                                                        <span className="font-bold text-gray-900">
                                                            {formData.all_branches_same_price
                                                                ? 'Semua lokasi memiliki harga yang sama'
                                                                : `${formData.branch_ids.length} Lokasi Terpilih`}
                                                        </span>
                                                    </div>
                                                    <button type="button" className="text-xs font-bold text-blue-500 group-hover:underline">
                                                        Ganti
                                                    </button>
                                                </div>
                                            </div>

                                            {formData.branch_ids.length === 0 && (
                                                <p className="text-[10px] text-red-500 flex items-center gap-1 animate-pulse">
                                                    <AlertTriangle size={10} /> Wajib pilih minimal satu cabang operasional
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Branch summary for services WITH variants */}
                                    {isAdmin && formData.has_variants && (
                                        <div className="pt-2">
                                            <label className="block text-xs font-semibold text-gray-700 mb-2">Cabang per Varian</label>
                                            <div className="space-y-2">
                                                {formData.variants.map((v, i) => {
                                                    const branchCount = (v.branch_ids || []).length;
                                                    const branchNames = branches
                                                        .filter(b => (v.branch_ids || []).includes(b.id))
                                                        .map(b => b.name);
                                                    return (
                                                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                                            <span className="font-medium text-gray-700">{v.name || `${v.duration} Menit`}</span>
                                                            {branchCount > 0 ? (
                                                                <span className="text-xs text-gray-500 font-medium" title={branchNames.join(', ')}>
                                                                    {branchCount} cabang
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                                                                    <AlertTriangle size={10} /> Belum ada cabang — klik Ganti di varian
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2">Untuk mengubah cabang, klik "Ganti" pada masing-masing varian di atas.</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold text-gray-800">Memerlukan Ruangan</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, requires_room: !prev.requires_room }))}
                                                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${formData.requires_room ? 'bg-naqupos-primary' : 'bg-gray-200'}`}
                                                >
                                                    <span
                                                        className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${formData.requires_room ? 'translate-x-5' : 'translate-x-0.5'}`}
                                                    />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-500 leading-tight">Jika aktif, pelanggan wajib memilih ruangan saat reservasi.</p>
                                        </div>

                                        {!formData.has_variants && (
                                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                                <label className="block text-xs font-bold text-gray-800 mb-1.5">Waktu Ketersediaan</label>
                                                <div
                                                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-all cursor-pointer group"
                                                    onClick={() => {
                                                        setCurrentEditingVariantIndex(null);
                                                        setShowAvailabilityModal(true);
                                                    }}
                                                >
                                                    <div className="text-[11px]">
                                                        <span className={`font-bold ${formData.is_limited_availability ? 'text-gray-900' : 'text-gray-400'}`}>
                                                            {formatAvailability(formData.is_limited_availability, formData.availability_type, formData.availability_data)}
                                                        </span>
                                                    </div>
                                                    <button type="button" className="text-xs font-bold text-blue-500 group-hover:underline">
                                                        Ganti
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-semibold text-gray-700 mb-2">Status Layanan</label>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${formData.status === 'active' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Aktif
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, status: 'inactive' }))}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${formData.status === 'inactive' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Nonaktif
                                            </button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Deskripsi Tambahan</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Jelaskan detail layanan (urutan step, manfaat, dll)..."
                                            rows={2}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none resize-none text-sm placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                                <button
                                    onClick={closeAllModals}
                                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveService}
                                    disabled={
                                        isProcessing ||
                                        !formData.name ||
                                        ((!formData.price || formData.price <= 0) && !formData.has_variants) ||
                                        (!isEditing && isAdmin && (formData.has_variants
                                            ? !formData.variants.some(v => (v.branch_ids || []).length > 0)
                                            : formData.branch_ids.length === 0))
                                    }
                                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all transform active:scale-[0.98] ${isProcessing ||
                                        !formData.name ||
                                        ((!formData.price || formData.price <= 0) && !formData.has_variants) ||
                                        (!isEditing && isAdmin && (formData.has_variants
                                            ? !formData.variants.some(v => (v.branch_ids || []).length > 0)
                                            : formData.branch_ids.length === 0))
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                        : 'bg-naqupos-primary text-white hover:bg-naqupos-accent hover:shadow-md'
                                        }`}
                                >
                                    {isProcessing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Menyimpan...
                                        </span>
                                    ) : (
                                        <>Simpan Layanan</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Modal */}
            {
                showDeleteModal && selectedService && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl  font-bold text-naqupos-dark">Hapus Layanan</h3>
                                <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                                <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-red-800">Peringatan!</p>
                                    <p className="text-sm text-red-600">Layanan yang dihapus tidak dapat dikembalikan.</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                <h4 className="font-bold text-naqupos-dark">{selectedService.name}</h4>
                                <p className="text-sm text-gray-500">{selectedService.category} • {selectedService.duration} Menit</p>
                                <p className="text-sm font-medium text-naqupos-primary mt-1">{formatPrice(selectedService.price)}</p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={closeAllModals}
                                    className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDeleteService}
                                    disabled={isProcessing}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isProcessing
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                >
                                    {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Cost Calculator (Side Drawer) */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 ${showCostCalculator ? 'visible' : 'invisible'}`}>
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${showCostCalculator ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setShowCostCalculator(false)}
                />
                <div className={`absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 transform ${showCostCalculator ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                    {/* Header */}
                    <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800">Biaya Layanan</h3>
                        <button onClick={() => setShowCostCalculator(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Total Capital Price */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Harga Modal</label>
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-inner">
                                <div className="text-3xl font-black text-naqupos-primary">
                                    {formatPrice(selectedProductKeys.reduce((sum, key) => {
                                        const prod = calculatorProducts.find(p => p.unique_key === key);
                                        return sum + (prod ? prod.cost_price : 0);
                                    }, 0))}
                                </div>
                            </div>
                        </div>

                        {/* Product Search & List */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider">Produk yang digunakan</label>

                            <div className="relative group">
                                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-naqupos-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search Product..."
                                    value={calculatorSearch}
                                    onChange={(e) => setCalculatorSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-naqupos-primary outline-none transition-all text-sm font-medium"
                                />
                            </div>

                            <div className="space-y-3 pb-10">
                                {calculatorLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary"></div>
                                        <p className="text-xs font-medium">Memuat produk...</p>
                                    </div>
                                ) : calculatorProducts.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 text-sm font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        Tidak ada produk ditemukan.
                                    </div>
                                ) : (
                                    calculatorProducts
                                        .filter(p => !calculatorSearch || p.name.toLowerCase().includes(calculatorSearch.toLowerCase()))
                                        .map(product => {
                                            const isSelected = selectedProductKeys.includes(product.unique_key);
                                            return (
                                                <div
                                                    key={product.unique_key}
                                                    onClick={() => toggleProductSelection(product.unique_key)}
                                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${isSelected
                                                        ? 'bg-naqupos-primary/5 border-naqupos-primary shadow-sm'
                                                        : 'bg-white border-gray-100 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`font-bold text-sm truncate ${isSelected ? 'text-naqupos-primary' : 'text-gray-800'}`}>
                                                            {product.name}
                                                        </div>
                                                        <div className="text-xs font-semibold text-gray-400 mt-0.5">
                                                            {formatPrice(product.cost_price)}
                                                        </div>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-naqupos-primary border-naqupos-primary shadow-sm'
                                                        : 'border-gray-200'
                                                        }`}>
                                                        {isSelected && <Check size={14} className="text-white stroke-[3px]" />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-white">
                        <button
                            onClick={handleApplyCost}
                            className="w-full py-4 bg-naqupos-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-naqupos-primary/20 hover:bg-naqupos-accent hover:shadow-naqupos-primary/40 transition-all transform active:scale-[0.98]"
                        >
                            Simpan Biaya
                        </button>
                    </div>
                </div>
            </div>

            {/* Branch Prices Drawer */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 ${showBranchPricesDrawer ? 'visible' : 'invisible'}`}>
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${showBranchPricesDrawer ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setShowBranchPricesDrawer(false)}
                />
                <div className={`absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 transform ${showBranchPricesDrawer ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <DollarSign size={24} className="text-naqupos-primary" />
                                Penetapan harga lokasi
                            </h3>
                            <button onClick={() => setShowBranchPricesDrawer(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-sm font-bold text-gray-700">Semua lokasi memiliki harga yang sama</span>
                                <button
                                    onClick={() => {
                                        if (currentEditingVariantIndex !== null) {
                                            const newVariants = [...formData.variants];
                                            const current = newVariants[currentEditingVariantIndex].all_branches_same_price ?? true;
                                            const next = !current;
                                            newVariants[currentEditingVariantIndex].all_branches_same_price = next;

                                            // Auto-select all branches if turning ON and none selected
                                            if (next && (!newVariants[currentEditingVariantIndex].branch_ids || newVariants[currentEditingVariantIndex].branch_ids.length === 0)) {
                                                newVariants[currentEditingVariantIndex].branch_ids = branches.map(b => b.id);
                                            }

                                            setFormData(prev => ({ ...prev, variants: newVariants }));
                                        } else {
                                            const current = formData.all_branches_same_price;
                                            const next = !current;

                                            let newBranchIds = [...formData.branch_ids];
                                            // Auto-select all branches if turning ON and none selected
                                            if (next && newBranchIds.length === 0) {
                                                newBranchIds = branches.map(b => b.id);
                                            }

                                            setFormData(prev => ({
                                                ...prev,
                                                all_branches_same_price: next,
                                                branch_ids: newBranchIds
                                            }));
                                        }
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${(currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex]?.all_branches_same_price ?? true) : formData.all_branches_same_price) ? 'bg-naqupos-primary' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 ${(currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex]?.all_branches_same_price ?? true) : formData.all_branches_same_price) ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (currentEditingVariantIndex !== null) {
                                            const newVariants = [...formData.variants];
                                            newVariants[currentEditingVariantIndex].branch_ids = branches.map(b => b.id);
                                            setFormData(prev => ({ ...prev, variants: newVariants }));
                                        } else {
                                            setFormData(prev => ({ ...prev, branch_ids: branches.map(b => b.id) }));
                                        }
                                    }}
                                    className="text-xs font-bold text-naqupos-primary hover:text-naqupos-accent transition-colors"
                                >
                                    Pilih Semua Lokasi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (currentEditingVariantIndex !== null) {
                                            const newVariants = [...formData.variants];
                                            newVariants[currentEditingVariantIndex].branch_ids = [];
                                            setFormData(prev => ({ ...prev, variants: newVariants }));
                                        } else {
                                            setFormData(prev => ({ ...prev, branch_ids: [] }));
                                        }
                                    }}
                                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Hapus Semua
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari lokasi..."
                                    value={branchSearch}
                                    onChange={(e) => setBranchSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-naqupos-primary/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-gray-50/30">
                        <div className="space-y-4">
                            {branches
                                .filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()))
                                .map(branch => {
                                    const targetBranchIds = currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex].branch_ids || []) : formData.branch_ids;
                                    const isSelected = targetBranchIds.includes(branch.id);
                                    const bPrice = (currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex].branch_prices?.[branch.id]) : formData.branch_prices[branch.id]) || { price: (currentEditingVariantIndex !== null ? formData.variants[currentEditingVariantIndex].price : formData.price) || 0, special_price: 0 };

                                    return (
                                        <div
                                            key={branch.id}
                                            className={`p-4 rounded-2xl border transition-all duration-300 ${isSelected ? 'bg-white border-naqupos-primary/30 shadow-sm' : 'bg-gray-50/50 border-gray-100 opacity-60'}`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="flex items-center gap-3 cursor-pointer flex-1 group">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-naqupos-primary border-naqupos-primary shadow-sm' : 'border-gray-300 bg-white group-hover:border-naqupos-primary/50'}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (currentEditingVariantIndex !== null) {
                                                                const newVariants = [...formData.variants];
                                                                const currentIds = newVariants[currentEditingVariantIndex].branch_ids || [];
                                                                newVariants[currentEditingVariantIndex].branch_ids = isSelected
                                                                    ? currentIds.filter(id => id !== branch.id)
                                                                    : [...currentIds, branch.id];
                                                                setFormData(prev => ({ ...prev, variants: newVariants }));
                                                            } else {
                                                                const newSelection = isSelected
                                                                    ? formData.branch_ids.filter(id => id !== branch.id)
                                                                    : [...formData.branch_ids, branch.id];
                                                                setFormData(prev => ({ ...prev, branch_ids: newSelection }));
                                                            }
                                                        }}
                                                    >
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <span className="font-bold text-gray-900 group-hover:text-naqupos-primary transition-colors">{branch.name}</span>
                                                </label>
                                                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                                    <Layers size={18} />
                                                </button>
                                            </div>

                                            {!(currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex].all_branches_same_price ?? true) : formData.all_branches_same_price) && isSelected && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Harga Retail</label>
                                                        <CurrencyInput
                                                            value={bPrice.price}
                                                            onChange={(val) => {
                                                                if (currentEditingVariantIndex !== null) {
                                                                    const newVariants = [...formData.variants];
                                                                    const bPrices = newVariants[currentEditingVariantIndex].branch_prices || {};
                                                                    newVariants[currentEditingVariantIndex].branch_prices = {
                                                                        ...bPrices,
                                                                        [branch.id]: { ...bPrice, price: val }
                                                                    };
                                                                    setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                } else {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        branch_prices: {
                                                                            ...prev.branch_prices,
                                                                            [branch.id]: { ...bPrice, price: val }
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                            prefix="Rp "
                                                            className="h-10 text-sm font-bold bg-gray-50/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Harga Spesial</label>
                                                        <CurrencyInput
                                                            value={bPrice.special_price || 0}
                                                            onChange={(val) => {
                                                                if (currentEditingVariantIndex !== null) {
                                                                    const newVariants = [...formData.variants];
                                                                    const bPrices = newVariants[currentEditingVariantIndex].branch_prices || {};
                                                                    newVariants[currentEditingVariantIndex].branch_prices = {
                                                                        ...bPrices,
                                                                        [branch.id]: { ...bPrice, special_price: val }
                                                                    };
                                                                    setFormData(prev => ({ ...prev, variants: newVariants }));
                                                                } else {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        branch_prices: {
                                                                            ...prev.branch_prices,
                                                                            [branch.id]: { ...bPrice, special_price: val }
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                            prefix="Rp "
                                                            className="h-10 text-sm font-bold bg-gray-50/50"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-white">
                        {((currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex]?.branch_ids?.length || 0) : formData.branch_ids.length) === 0) && (
                            <p className="text-[10px] text-red-500 text-center mb-3 font-bold animate-pulse">
                                Mohon pilih minimal satu lokasi operasional
                            </p>
                        )}
                        <button
                            onClick={() => setShowBranchPricesDrawer(false)}
                            className="w-full py-4 bg-naqupos-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-naqupos-primary/20 hover:bg-naqupos-accent transition-all transform active:scale-[0.98]"
                        >
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>

            {/* Availability Drawer */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 ${showAvailabilityModal ? 'visible' : 'invisible'}`}>
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${showAvailabilityModal ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setShowAvailabilityModal(false)}
                />
                <div className={`absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 transform ${showAvailabilityModal ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                    <div className="p-6 border-b border-gray-100 bg-white">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <Clock size={24} className="text-naqupos-primary" />
                                Tentukan Waktu Ketersediaan
                            </h3>
                            <button onClick={() => setShowAvailabilityModal(false)} className="p-4 hover:bg-gray-100 rounded-full text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-sm font-bold text-gray-700">Tersedia di waktu tertentu saja</span>
                            <button
                                onClick={() => {
                                    if (currentEditingVariantIndex !== null) {
                                        const newVariants = [...formData.variants];
                                        const current = !!newVariants[currentEditingVariantIndex].is_limited_availability;
                                        newVariants[currentEditingVariantIndex].is_limited_availability = !current;
                                        newVariants[currentEditingVariantIndex].availability_data = !current ? [] : [];
                                        setFormData(prev => ({ ...prev, variants: newVariants }));
                                    } else {
                                        setFormData(prev => ({
                                            ...prev,
                                            is_limited_availability: !prev.is_limited_availability,
                                            availability_data: !prev.is_limited_availability ? [] : []
                                        }));
                                    }
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${(currentEditingVariantIndex !== null ? formData.variants[currentEditingVariantIndex].is_limited_availability : formData.is_limited_availability) ? 'bg-naqupos-primary' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 ${(currentEditingVariantIndex !== null ? formData.variants[currentEditingVariantIndex].is_limited_availability : formData.is_limited_availability) ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        {(currentEditingVariantIndex !== null ? formData.variants[currentEditingVariantIndex].is_limited_availability : formData.is_limited_availability) && (
                            <div className="space-y-6">
                                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                                    <button
                                        onClick={() => {
                                            if (currentEditingVariantIndex !== null) {
                                                const newVariants = [...formData.variants];
                                                newVariants[currentEditingVariantIndex].availability_type = 'specific_dates';
                                                newVariants[currentEditingVariantIndex].availability_data = [];
                                                setFormData(prev => ({ ...prev, variants: newVariants }));
                                            } else {
                                                setFormData(prev => ({ ...prev, availability_type: 'specific_dates', availability_data: [] }));
                                            }
                                        }}
                                        className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 ${(currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex].availability_type === 'specific_dates') : (formData.availability_type === 'specific_dates')) ? 'bg-naqupos-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Tanggal Spesifik
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (currentEditingVariantIndex !== null) {
                                                const newVariants = [...formData.variants];
                                                newVariants[currentEditingVariantIndex].availability_type = 'recurring';
                                                newVariants[currentEditingVariantIndex].availability_data = [];
                                                setFormData(prev => ({ ...prev, variants: newVariants }));
                                            } else {
                                                setFormData(prev => ({ ...prev, availability_type: 'recurring', availability_data: [] }));
                                            }
                                        }}
                                        className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 ${(currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex].availability_type === 'recurring') : (formData.availability_type === 'recurring')) ? 'bg-naqupos-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Ulang tiap pekan
                                    </button>
                                </div>

                                {(currentEditingVariantIndex !== null ? (formData.variants[currentEditingVariantIndex].availability_type === 'specific_dates') : (formData.availability_type === 'specific_dates')) ? (
                                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors text-naqupos-primary">
                                                <ChevronLeft size={20} />
                                            </button>
                                            <span className="text-sm font-black text-gray-900 tracking-tight uppercase">{monthName(currentMonth)} {currentMonth.getFullYear()}</span>
                                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors text-naqupos-primary">
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 text-center">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                                                <span key={`${d}-${idx}`} className="text-[10px] font-black text-gray-300 py-3 uppercase tracking-tighter">{d}</span>
                                            ))}
                                            {Array.from({ length: firstDayOfMonth(currentMonth) }).map((_, i) => (
                                                <div key={`empty-${i}`} className="h-10" />
                                            ))}
                                            {Array.from({ length: daysInMonth(currentMonth) }).map((_, i) => {
                                                const day = i + 1;
                                                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const availabilityData = (currentEditingVariantIndex !== null ? formData.variants[currentEditingVariantIndex].availability_data : formData.availability_data) || [];
                                                const isSelected = Array.isArray(availabilityData) && availabilityData.includes(dateStr);

                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                                const isPast = cellDate < today;

                                                return (
                                                    <button
                                                        key={day}
                                                        disabled={isPast}
                                                        onClick={() => {
                                                            if (currentEditingVariantIndex !== null) {
                                                                const newVariants = [...formData.variants];
                                                                const currentData = Array.isArray(newVariants[currentEditingVariantIndex].availability_data) ? newVariants[currentEditingVariantIndex].availability_data : [];
                                                                newVariants[currentEditingVariantIndex].availability_data = currentData.includes(dateStr)
                                                                    ? currentData.filter(d => d !== dateStr)
                                                                    : [...currentData, dateStr];
                                                                setFormData(prev => ({ ...prev, variants: newVariants }));
                                                            } else {
                                                                toggleDate(dateStr);
                                                            }
                                                        }}
                                                        className={`h-10 w-full rounded-xl text-xs flex items-center justify-center transition-all ${isPast ? 'opacity-20 cursor-not-allowed grayscale' : isSelected ? 'bg-naqupos-primary text-white font-black shadow-lg shadow-naqupos-primary/30' : 'hover:bg-gray-50 text-gray-700 font-bold'}`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                                            const availabilityData = (currentEditingVariantIndex !== null ? formData.variants[currentEditingVariantIndex].availability_data : formData.availability_data) || [];
                                            const isSelected = Array.isArray(availabilityData) && availabilityData.includes(day);
                                            return (
                                                <div
                                                    key={day}
                                                    onClick={() => {
                                                        if (currentEditingVariantIndex !== null) {
                                                            const newVariants = [...formData.variants];
                                                            const currentData = Array.isArray(newVariants[currentEditingVariantIndex].availability_data) ? newVariants[currentEditingVariantIndex].availability_data : [];
                                                            newVariants[currentEditingVariantIndex].availability_data = currentData.includes(day)
                                                                ? currentData.filter(d => d !== day)
                                                                : [...currentData, day];
                                                            setFormData(prev => ({ ...prev, variants: newVariants }));
                                                        } else {
                                                            toggleDay(day);
                                                        }
                                                    }}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${isSelected ? 'bg-naqupos-primary/5 border-naqupos-primary/30 shadow-sm' : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'}`}
                                                >
                                                    <span className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{day}</span>
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-naqupos-primary border-naqupos-primary shadow-sm' : 'border-gray-300 bg-white'}`}>
                                                        {isSelected && <Check size={14} className="text-white" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-white">
                        <button
                            onClick={() => setShowAvailabilityModal(false)}
                            className="w-full py-4 bg-naqupos-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-naqupos-primary/20 hover:bg-naqupos-accent transition-all transform active:scale-[0.98]"
                        >
                            Selesai
                        </button>
                    </div>
                </div>
            </div>
            {/* Custom Confirm Delete Category Modal */}
            {
                confirmDeleteCategoryMode.show && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] backdrop-blur-sm px-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in-up">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Hapus Kategori?</h3>
                            <p className="text-center text-gray-500 text-sm mb-6">
                                Apakah Anda yakin ingin menghapus kategori "{confirmDeleteCategoryMode.category?.name}"? Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDeleteCategoryMode({ show: false, category: null })}
                                    disabled={isDeletingCategory}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDeleteCategoryAction}
                                    disabled={isDeletingCategory}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
                                >
                                    {isDeletingCategory ? <Loader2 size={16} className="animate-spin" /> : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                priceHistoryConfig?.show && (
                    <ServicePriceHistoryModal
                        serviceId={priceHistoryConfig.serviceId}
                        serviceName={priceHistoryConfig.serviceName}
                        variantId={priceHistoryConfig.variantId}
                        variantName={priceHistoryConfig.variantName}
                        onClose={() => setPriceHistoryConfig(null)}
                    />
                )
            }
        </div >
    );
}
