import { Search, Eye, RefreshCcw, XCircle, CheckCircle, Clock, X, Calendar, AlertTriangle, AlertCircle, CreditCard, Wallet, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ShoppingCart, ChevronDown, User as UserIcon, Banknote, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import EmptyState from '../../components/common/EmptyState';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { isElevatedRole } from '../../utils/role';
import swal from '../../utils/swal';
import { useBranchSync } from '../../hooks/useBranchSync';

interface Booking {
    rawId: number;
    id: string;
    customer: string;
    phone: string;
    services: string[];
    therapist: string;
    date: string;
    time: string;
    room: string;
    branchName?: string;
    total: number;
    dp: number;
    branchId: number;
    promoCode?: string;
    discountAmount?: number;
    taxAmount?: number;
    serviceChargeAmount?: number;
    status: 'pending_payment' | 'awaiting_payment' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'refunded';
    paymentStatus?: 'paid' | 'unpaid' | 'partial';
    refundAmount?: number;
    refundDate?: string;
    refundReason?: string;
    created_at?: string;
    originalTotal?: number;
    notes?: string;
    products?: {
        id: number;
        name: string;
        quantity: number;
        price: number;
        subtotal: number;
        variant?: string;
    }[];
    subItems?: {
        id: number;
        bookingId: number;
        serviceId?: number;
        variantId?: number;
        variantName?: string;
        service: string;
        staffId?: number;
        therapist: string;
        therapistPhone?: string;
        time: string;
        roomId?: number;
        room: string;
        price: number;
        refundAmount?: number;
        guestName?: string;
        guestPhone?: string;
        status?: string;
    }[];
    guestCount?: number;
    paymentMethod?: string;
}

interface PaymentMethodOption {
    id: number;
    code: string;
    name: string;
    type: string;
    is_global?: boolean;
    branch_id?: number | null;
    branch_ids?: number[];
    branches?: { id: number; name: string }[];
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

const GENERIC_SERVICE_NAMES = ['perawatan lainnya', 'perawatan lainya', 'lainnya', 'lainya'];

const getServiceVariantLabel = (serviceName?: string, variantName?: string, fallback = 'Layanan') => {
    const cleanServiceName = String(serviceName || '').trim();
    const cleanVariantName = String(variantName || '').trim();

    if (cleanVariantName) {
        const normalizedServiceName = cleanServiceName.toLowerCase();
        if (!cleanServiceName || GENERIC_SERVICE_NAMES.includes(normalizedServiceName)) {
            return cleanVariantName;
        }
        const genericPrefix = GENERIC_SERVICE_NAMES.find(name => normalizedServiceName.startsWith(`${name} - `));
        if (genericPrefix) {
            return cleanServiceName.slice(genericPrefix.length + 3).trim() || cleanVariantName;
        }

        return cleanServiceName.includes(cleanVariantName)
            ? cleanServiceName
            : `${cleanServiceName} - ${cleanVariantName}`;
    }

    return cleanServiceName || fallback;
};

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending_payment: { label: 'Menunggu Pembayaran', color: 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FDE68A]', icon: <Clock size={12} /> },
    awaiting_payment: { label: 'Menunggu Pembayaran', color: 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FDE68A]', icon: <Clock size={12} /> },
    confirmed: { label: 'Terkonfirmasi', color: 'bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]', icon: <CheckCircle size={12} /> },
    in_progress: { label: 'Sedang Berlangsung', color: 'bg-[#EFF6FF] text-[#3B82F6] border border-[#BFDBFE]', icon: <Clock size={12} /> },
    completed: { label: 'Selesai', color: 'bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]', icon: <CheckCircle size={12} /> },
    cancelled: { label: 'Dibatalkan', color: 'bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]', icon: <XCircle size={12} /> },
    no_show: { label: 'Tidak Hadir', color: 'bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74]', icon: <AlertTriangle size={12} /> },
    refunded: { label: 'Refund', color: 'bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]', icon: <Wallet size={12} /> },
};

const reservationFilters = [
    { value: 'all', label: 'Semua' },
    { value: 'paid', label: 'Lunas' },
    { value: 'partial', label: 'DP' },
    { value: 'completed', label: 'Selesai' },
    { value: 'cancelled', label: 'Cancel' },
    { value: 'no_show', label: 'Tidak Hadir' },
];

const BOOKINGS_PER_PAGE = 10;
const BOOKINGS_SOURCE_FETCH_PER_PAGE = 100;

const normalizePaymentStatus = (status: unknown): Booking['paymentStatus'] => {
    const value = String(status || '').toLowerCase();
    if (['paid', 'success', 'settlement', 'lunas'].includes(value)) return 'paid';
    if (['partial', 'dp', 'down_payment'].includes(value)) return 'partial';
    return 'unpaid';
};

const mergePaymentStatus = (
    current: Booking['paymentStatus'],
    incoming: Booking['paymentStatus']
): Booking['paymentStatus'] => {
    if (current === 'paid' || incoming === 'paid') return 'paid';
    if (current === 'partial' || incoming === 'partial') return 'partial';
    return 'unpaid';
};

export default function BookingsPage() {
    // 
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    // Sync with global branch
    const {
        selectedBranchId: branchFilter,
        setSelectedBranchId: setBranchFilter
    } = useBranchSync<string | number>(() => setPage(1), '');

    const [searchQuery, setSearchQuery] = useState('');

    const [user, setUser] = useState<any>(null);
    const location = useLocation();
    const navigate = useNavigate();

    // Pagination state
    const [page, setPage] = useState(1);

    // Sorting state
    const [sortBy, setSortBy] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Modal states
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

    // Reschedule form
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('10:00');
    const [isProcessing, setIsProcessing] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Refund form
    const [refundAmount, setRefundAmount] = useState(0);
    const [refundReason, setRefundReason] = useState('');
    const [refundMethod, setRefundMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [branchSettings, setBranchSettings] = useState<any>(null);
    const [agendaLogs, setAgendaLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState<'detail' | 'history'>('detail');
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
    const [selectedPaymentMethodCode, setSelectedPaymentMethodCode] = useState('');

    const [confirmState, setConfirmState] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info' | 'success';
        confirmLabel?: string;
    }>({
        show: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger',
        confirmLabel: 'Ya, Lanjutkan'
    });

    useEffect(() => {
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) {
            setUser(JSON.parse(authData).user);
        }
    }, []);


    // URL params and other initialization
    useEffect(() => {
        // Handle search from URL query (e.g., from Dashboard)
        const params = new URLSearchParams(location.search);
        const ref = params.get('ref');
        if (ref) {
            setSearchQuery(ref);
        }
    }, [location.pathname]);

    useEffect(() => {
        setPage(1); // Reset page on filter/search change
    }, [filter, searchQuery]);


    useEffect(() => {
        loadBookings();
    }, [filter, branchFilter, searchQuery]);

    useEffect(() => {
        let cancelled = false;

        const loadPaymentMethods = async () => {
            try {
                const response = await api.getPaymentMethods();
                if (cancelled) return;

                const rawMethods = Array.isArray(response) ? response : (response?.data || []);
                const activeMethods = rawMethods
                    .filter((method: any) => method.is_active === true || method.is_active === 1 || method.is_active === '1')
                    .filter((method: any) => {
                        if (!branchFilter || branchFilter === 'all') return true;
                        const isGlobal = method.is_global === true || method.is_global === 1 || method.is_global === '1';
                        if (isGlobal) return true;
                        const methodBranchIds = [
                            ...(Array.isArray(method.branch_ids) ? method.branch_ids : []),
                            ...(Array.isArray(method.branches) ? method.branches.map((branch: any) => branch.id) : []),
                            ...(method.branch_id != null ? [method.branch_id] : [])
                        ].map(Number);
                        return methodBranchIds.includes(Number(branchFilter));
                    })
                    .map((method: any) => ({
                        ...method,
                        code: String(method.code || method.type || '').toLowerCase(),
                        name: method.name || method.code || method.type || 'Metode Bayar',
                        type: String(method.type || '').toLowerCase()
                    }))
                    .filter((method: PaymentMethodOption) => !!method.code);

                setPaymentMethods(activeMethods);
            } catch (err) {
                if (!cancelled) {
                    console.error('Gagal memuat metode pembayaran:', err);
                    setPaymentMethods([]);
                }
            }
        };

        loadPaymentMethods();
        return () => {
            cancelled = true;
        };
    }, [branchFilter]);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const formatDateReadable = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            return dateStr;
        }
    };

  const loadBookings = async () => {
    if (branchFilter === '') {
        setBookings([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const params: any = { per_page: BOOKINGS_SOURCE_FETCH_PER_PAGE };
        if (filter === 'paid' || filter === 'partial') {
            params.payment_status = filter;
        } else if (filter !== 'all') {
            params.status = filter;
        }
        if (branchFilter !== 'all') params.branch_id = branchFilter;
        if (searchQuery) params.search = searchQuery;

        const getResponseItems = (response: any) => response?.data || (Array.isArray(response) ? response : []);
        const getLastPage = (response: any) => {
            const value = Number(response?.meta?.last_page || response?.last_page || 1);
            return Number.isFinite(value) && value > 0 ? value : 1;
        };

        const firstRes = await api.getBookings({ ...params, page: 1 });
        const responses = [firstRes];
        const lastPage = getLastPage(firstRes);

        for (let pageToLoad = 2; pageToLoad <= lastPage; pageToLoad += 1) {
            responses.push(await api.getBookings({ ...params, page: pageToLoad }));
        }

        const fetchedData = responses.flatMap(getResponseItems).filter((b: any) => {
            if (filter === 'paid' || filter === 'partial') return true;
            return normalizePaymentStatus(b.payment_status) !== 'unpaid';
        });

        const groupedMap: Record<string, Booking> = {};
        const seenTxIds: Record<string, Set<number>> = {};
        const seenPayIds: Record<string, Set<number>> = {};
        const processedRecordIds = new Set<number>();

        fetchedData.forEach((b: any) => {
              console.log('🔍 BOOKING DEBUG:', {
        id: b.id,
        booking_ref: b.booking_ref,
        payment_status: b.payment_status,
        payment_type: b.payment_type,
        total_price: b.total_price,
        transaction: b.transaction ? {
            id: b.transaction.id,
            total: b.transaction.total,
            payment_type: b.transaction.payment_type,
            original_total: b.transaction.original_total,
            dp_amount: b.transaction.dp_amount,
            nominal_dp: b.transaction.nominal_dp,
        } : null,
        payments: b.payments,
    });
            if (processedRecordIds.has(b.id)) return;
            processedRecordIds.add(b.id);

            let status: any = b.status;
            if (status === 'pending') status = 'pending_payment';
            if (b.payment_status === 'unpaid' && !['cancelled', 'completed', 'refunded'].includes(status)) {
                status = 'pending_payment';
            }
            if (b.status === 'no_show') status = 'no_show';
            const apiPaymentStatus = normalizePaymentStatus(b.payment_status);

            const subItems = (b.items && b.items.length > 0)
                ? b.items.map((item: any) => {
                    const serviceName = item.service?.name || b.service?.name || 'Layanan';
                    const variantName = item.variant?.name || item.service_variant?.name || '';
                    const serviceLabel = getServiceVariantLabel(serviceName, variantName);

                    return {
                        id: item.id,
                        bookingId: item.booking_id || b.id,
                        serviceId: item.service_id || b.service_id || null,
                        variantId: item.service_variant_id || item.variant?.id || null,
                        variantName,
                        service: serviceLabel,
                        staffId: item.therapist_id || b.therapist_id || null,
                        therapist: item.therapist?.name || b.therapist?.name || '-',
                        therapistPhone: item.therapist?.phone || b.therapist?.phone || '',
                        time: item.start_time ? item.start_time.substring(0, 5) : (b.start_time ? b.start_time.substring(0, 5) : '-'),
                        roomId: item.room_id || b.room_id || null,
                        room: item.room?.name || b.room?.name || '-',
                        price: parseFloat(item.price || 0),
                        refundAmount: parseFloat(item.refund_amount || 0),
                        guestName: item.guest_name || b.guest_name || b.user?.name || '-',
                        guestPhone: item.guest_phone || b.guest_phone || b.user?.phone || '-',
                        status: item.status || 'active'
                    };
                })
                : [{
                    id: b.id,
                    bookingId: b.id,
                    service: b.service?.name || '-',
                    therapist: b.therapist?.name || '-',
                    therapistPhone: b.therapist?.phone || '',
                    time: b.start_time ? b.start_time.substring(0, 5) : '-',
                    room: b.room?.name || '-',
                    price: parseFloat(b.total_price || 0),
                    guestName: b.guest_name || b.user?.name || '-',
                    guestPhone: b.guest_phone || b.user?.phone || '-',
                    status: 'active'
                }];

            const ref = b.booking_ref || `ID-${b.id}`;

            if (!seenTxIds[ref]) seenTxIds[ref] = new Set();
            if (!seenPayIds[ref]) seenPayIds[ref] = new Set();

            // ── Hitung DP dari payments array ──
            const payItems = (b.payments || []) as any[];
            let dp = 0;
            payItems.forEach(p => {
                const s = (p.status || '').toLowerCase();
                if ((s === 'paid' || s === 'success' || s === 'berhasil') && !seenPayIds[ref].has(p.id)) {
                    dp += parseFloat(p.amount) || 0;
                    seenPayIds[ref].add(p.id);
                }
            });

            const products = b.transaction?.items
                ? b.transaction.items
                    .filter((item: any) => item.product_id || item.type === 'product')
                    .map((item: any) => ({
                        id: item.id,
                        name: item.product?.name || item.name || 'Produk',
                        quantity: item.quantity,
                        price: parseFloat(item.price),
                        subtotal: parseFloat(item.subtotal),
                        variant: item.variant?.name
                    }))
                : [];

            const productTotal = products.reduce((sum: number, p: any) => sum + p.subtotal, 0);

            // ── Hitung booking total & fallback DP ──
          // Calculate booking total (unique transaction only)
let bookingTotal = 0;
if (b.transaction) {
    if (!seenTxIds[ref].has(b.transaction.id)) {
        // Selalu pakai total_price sebagai harga asli booking
        // transaction.total = nominal yang dibayar (bisa DP atau full)
        bookingTotal = parseFloat(b.total_price || b.transaction.total || 0) + productTotal;
        seenTxIds[ref].add(b.transaction.id);

        // Hitung dp dari payments array (sudah dihitung di atas)
        // Fallback kalau payments kosong
        if (dp === 0) {
            const txPaymentType = (b.payments?.[0]?.payment_type || b.payment_type || '').toLowerCase();
            if (txPaymentType === 'dp' || txPaymentType === 'down_payment') {
                dp = parseFloat(b.transaction.total || 0);
            } else if (b.payment_status === 'paid') {
                dp = bookingTotal;
            }
        }
    }
} else {
    bookingTotal = parseFloat(b.total_price || 0) + productTotal;
    if (dp === 0 && b.payment_status === 'paid') {
        const txPaymentType = (b.payment_type || '').toLowerCase();
        if (txPaymentType !== 'dp' && txPaymentType !== 'down_payment') {
            dp = bookingTotal;
        }
    }
}

            const bTime = b.start_time ? b.start_time.substring(0, 5) : '-';
            const serviceLabels = Array.from(new Set(
                subItems
                    .map((item: any) => item.service)
                    .filter((name: any) => name && name !== '-')
            ));

            if (!groupedMap[ref]) {
                groupedMap[ref] = {
                    rawId: b.id,
                    id: ref,
                    customer: b.user?.name || b.guest_name || 'Guest',
                    phone: b.user?.phone || b.guest_phone || '-',
                    services: serviceLabels.length > 0
                        ? serviceLabels
                        : (b.service ? [getServiceVariantLabel(b.service.name)] : []),
                    therapist: b.therapist?.name || (b.items && b.items[0]?.therapist?.name) || '-',
                    date: b.booking_date,
                    time: bTime,
                    room: b.room?.name || (b.items && b.items[0]?.room?.name) || '-',
                    branchName: b.branch?.name || '-',
                    total: bookingTotal,
                    dp: dp,
                    branchId: b.branch_id,
                    paymentMethod: b.payment_method || b.transaction?.payment_method || b.payments?.[0]?.payment_method || '',
                    promoCode: b.promo_code || undefined,
                    discountAmount: parseFloat(b.discount_amount || 0),
                    taxAmount: parseFloat(b.tax_amount || 0),
                    serviceChargeAmount: parseFloat(b.service_charge_amount || 0),
                    status: status,
                    paymentStatus: apiPaymentStatus,
                    refundAmount: parseFloat(b.refund_amount || 0),
                    created_at: b.created_at,
                    subItems: subItems,
                    products: products,
                    originalTotal: subItems.reduce((sum: number, item: any) => sum + item.price, 0) + productTotal,
                    guestCount: new Set(subItems.map((i: any) => `${i.guestName || 'Guest'}-${i.guestPhone || ''}`.toLowerCase().trim())).size || 1,
                    notes: b.notes
                };
            } else {
                const existing = groupedMap[ref];
                existing.total += bookingTotal;
                existing.dp += dp;
                existing.discountAmount = (existing.discountAmount || 0) + parseFloat(b.discount_amount || 0);
                existing.taxAmount = (existing.taxAmount || 0) + parseFloat(b.tax_amount || 0);
                existing.serviceChargeAmount = (existing.serviceChargeAmount || 0) + parseFloat(b.service_charge_amount || 0);
                if (!existing.promoCode && b.promo_code) existing.promoCode = b.promo_code;
                existing.refundAmount = (existing.refundAmount || 0) + parseFloat(b.refund_amount || 0);
                existing.originalTotal = (existing.originalTotal || 0) + subItems.reduce((sum: number, item: any) => sum + item.price, 0) + productTotal;
                if (b.notes) {
                    if (!existing.notes) existing.notes = b.notes;
                    else if (!existing.notes.includes(b.notes)) existing.notes += `\n${b.notes}`;
                }
                serviceLabels.forEach((serviceName) => {
                    if (!existing.services.includes(serviceName)) {
                        existing.services.push(serviceName);
                    }
                });
                if (b.therapist && !existing.therapist.includes(b.therapist.name)) {
                    existing.therapist = existing.therapist === '-' ? b.therapist.name : `${existing.therapist}, ${b.therapist.name}`;
                }
                if (!existing.subItems) existing.subItems = [];
                existing.subItems.push(...subItems);
                if (products.length > 0) {
                    if (!existing.products) existing.products = [];
                    existing.products.push(...products);
                }
                existing.originalTotal = (existing.originalTotal || 0) + subItems.reduce((sum: number, item: any) => sum + item.price, 0) + productTotal;
                existing.paymentStatus = mergePaymentStatus(existing.paymentStatus, apiPaymentStatus);
            }

            // ── Update paymentStatus dengan toleransi floating point ──
            const currentGroup = groupedMap[ref];
            const tolerance = 1000;
            const isAwaitingPayment = currentGroup.status === 'pending_payment';
            const isPaid = currentGroup.total > 0
                ? currentGroup.dp >= (currentGroup.total - tolerance)
                : currentGroup.dp > 0;

            const calculatedPaymentStatus = isAwaitingPayment
                ? 'unpaid'
                : (isPaid ? 'paid' : (currentGroup.dp > 0 ? 'partial' : 'unpaid'));

            currentGroup.paymentStatus = mergePaymentStatus(currentGroup.paymentStatus, calculatedPaymentStatus);
            if (currentGroup.paymentStatus === 'paid') {
                currentGroup.dp = Math.max(currentGroup.dp, currentGroup.total);
            }
        });

        setBookings(Object.values(groupedMap));
    } catch (error) {
        console.error("Failed to fetch bookings", error);
        setBookings([]);
    } finally {
        setIsLoading(false);
    }
};

    // Handle column sorting
    const handleSort = (column: string) => {
        if (sortBy === column) {
            // Toggle sort order if same column
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // New column, default to ascending
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // Render sort icon
    const renderSortIcon = (column: string) => {
        if (sortBy !== column) {
            return <ArrowUpDown size={14} className="opacity-40" />;
        }
        return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };


    // Apply sorting to bookings
    const filteredBookings = useMemo(() => {
        const matchesFilter = (booking: Booking) => {
            if (filter === 'paid') return booking.paymentStatus === 'paid';
            if (filter === 'partial') return booking.paymentStatus === 'partial';
            if (filter === 'completed') return booking.status === 'completed';
            if (filter === 'cancelled') return booking.status === 'cancelled';
            if (filter === 'no_show') return booking.status === 'no_show';
            return booking.paymentStatus !== 'unpaid';
        };

        return bookings.filter(matchesFilter).sort((a, b) => {
            if (!sortBy) return 0;

            let aValue: any;
            let bValue: any;

            switch (sortBy) {
                case 'id':
                    aValue = a.id;
                    bValue = b.id;
                    break;
                case 'customer':
                    aValue = a.customer.toLowerCase();
                    bValue = b.customer.toLowerCase();
                    break;
                case 'therapist':
                    aValue = a.therapist.toLowerCase();
                    bValue = b.therapist.toLowerCase();
                    break;
                case 'branch':
                    aValue = (a.branchName || '').toLowerCase();
                    bValue = (b.branchName || '').toLowerCase();
                    break;
                case 'date':
                    aValue = new Date(a.date + ' ' + a.time).getTime();
                    bValue = new Date(b.date + ' ' + b.time).getTime();
                    break;
                case 'total':
                    aValue = a.total;
                    bValue = b.total;
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'created_at':
                    aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
                    bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [bookings, filter, sortBy, sortOrder]);

    const displayPagination = useMemo<PaginationMeta>(() => {
        const total = filteredBookings.length;
        const lastPage = Math.max(1, Math.ceil(total / BOOKINGS_PER_PAGE));
        const safePage = Math.min(Math.max(page, 1), lastPage);
        const from = total === 0 ? 0 : ((safePage - 1) * BOOKINGS_PER_PAGE) + 1;
        const to = Math.min(safePage * BOOKINGS_PER_PAGE, total);

        return {
            current_page: safePage,
            last_page: lastPage,
            per_page: BOOKINGS_PER_PAGE,
            total,
            from,
            to
        };
    }, [filteredBookings.length, page]);

    useEffect(() => {
        if (page !== displayPagination.current_page) {
            setPage(displayPagination.current_page);
        }
    }, [displayPagination.current_page, page]);

    const paginatedBookings = useMemo(() => {
        const start = (displayPagination.current_page - 1) * BOOKINGS_PER_PAGE;
        return filteredBookings.slice(start, start + BOOKINGS_PER_PAGE);
    }, [filteredBookings, displayPagination.current_page]);

    const openDetailModal = (booking: Booking) => {
        setSelectedBooking(booking);
        setActiveDetailTab('detail');
        setShowDetailModal(true);
        loadAgendaLogs(booking.rawId);
    };

    const loadAgendaLogs = async (id: number) => {
        setIsLoadingLogs(true);
        try {
            const logs = await api.getBookingAgendaLogs(id);
            setAgendaLogs(logs || []);
        } catch (error) {
            console.error("Failed to fetch agenda logs", error);
            setAgendaLogs([]);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const openRefundModal = async (booking: Booking) => {
        setSelectedBooking(booking);
        setSelectedItem(null); // Refund for entire booking

        // Fetch branch settings
        try {
            const settings = await api.getCompanySettings(booking.branchId);
            setBranchSettings(settings);
        } catch (e) {
            console.error("Failed to fetch branch settings", e);
        }

        const overpayment = booking.dp - booking.total;
        setRefundAmount(Math.max(0, overpayment));
        setShowRefundModal(true);
    };


    const handleReschedule = async () => {
        if (!selectedBooking || !newDate || !newTime) return;

        setIsProcessing(true);
        try {
            if (selectedItem) {
                // Individual item reschedule
                await api.rescheduleBookingItem(selectedItem.bookingId || selectedBooking.rawId, selectedItem.id, {
                    booking_date: newDate,
                    start_time: newTime
                });
            } else {
                // Entire booking reschedule
                await api.updateBooking(selectedBooking.rawId, {
                    booking_date: newDate,
                    start_time: newTime
                });
            }
            await loadBookings();
            setShowRescheduleModal(false);
            setSelectedBooking(null);
            setSelectedItem(null);
        } catch (err: any) {
            swal.error(err.message || 'Gagal reschedule');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = () => {
        if (!selectedBooking) return;
        setConfirmState({
            show: true,
            title: 'Batalkan Booking',
            message: `Apakah Anda yakin ingin membatalkan booking ${selectedBooking.id}?`,
            onConfirm: executeCancel,
            type: 'danger',
            confirmLabel: 'Ya, Batalkan'
        });
    };

    const executeCancel = async () => {
        if (!selectedBooking) return;

        setIsProcessing(true);
        try {
            if (selectedItem) {
                // Individual item cancel
                await api.cancelBookingItem(selectedItem.bookingId || selectedBooking.rawId, selectedItem.id);
            } else {
                // Entire booking cancel
                await api.updateBookingStatus(selectedBooking.rawId, {
                    status: 'cancelled',
                    notes: cancelReason || 'Cancelled by admin'
                });
            }
            await loadBookings();
            setShowCancelModal(false);
            setSelectedBooking(null);
            setSelectedItem(null);
            setConfirmState(prev => ({ ...prev, show: false }));
        } catch (err: any) {
            swal.error(err.message || 'Gagal cancel');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRefund = () => {
        if (!selectedBooking || refundAmount <= 0) return;

        // Enforce non-refundable DP if settings are loaded
        if (branchSettings) {
            const minVal = parseFloat(branchSettings.min_dp || 0);
            let minDP = minVal;
            if (branchSettings.min_dp_type === 'percentage') {
                const originalTotal = selectedBooking.originalTotal || (selectedBooking.total + (selectedItem?.status === 'cancelled' ? selectedItem.price : 0));
                minDP = (minVal / 100) * originalTotal;
            } else if (branchSettings.min_dp_type === 'per_guest') {
                minDP = minVal * (selectedBooking.guestCount || 1);
            }
            const overpayment = selectedBooking.dp - selectedBooking.total;
            // Add a small tolerance (1.0) for potential floating point issues
            const refundableLimit = Math.max(0, overpayment - minDP);

            if (refundAmount > (refundableLimit + 1.0)) {
                swal.error(`Refund melebihi batas. DP Minimum (Rp ${minDP.toLocaleString('id-ID')}) tidak dapat di-refund. Maksimal yang dapat dikembalikan: Rp ${Math.floor(refundableLimit).toLocaleString('id-ID')}`);
                return;
            }
        }

        setConfirmState({
            show: true,
            title: 'Proses Refund',
            message: `Apakah Anda yakin ingin melakukan refund senilai Rp ${refundAmount.toLocaleString('id-ID')} untuk booking ${selectedBooking.id}?`,
            onConfirm: executeRefund,
            type: 'warning',
            confirmLabel: 'Proses Refund'
        });
    };

    const executeRefund = async () => {
        if (!selectedBooking || refundAmount <= 0) return;

        setIsProcessing(true);
        try {
            if (selectedItem) {
                // Per item refund
                await api.refundBookingItem(selectedItem.bookingId || selectedBooking.rawId, selectedItem.id, {
                    refund_amount: refundAmount,
                    refund_method: refundMethod,
                    reason: refundReason || 'Refund processed by admin'
                });
            } else {
                await api.processRefund(selectedBooking.rawId, {
                    refund_amount: refundAmount,
                    refund_method: refundMethod,
                    reason: refundReason || 'Refund processed by admin'
                });
            }
            await loadBookings();
            setShowRefundModal(false);
            setSelectedBooking(null);
            setSelectedItem(null);
            setConfirmState(prev => ({ ...prev, show: false }));
        } catch (err: any) {
            swal.error(err.message || 'Gagal process refund');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmPayment = async (booking: Booking) => {
        setIsProcessing(true);
        try {
            await api.updateBookingStatus(booking.rawId, {
                status: 'confirmed'
            });
            await loadBookings();
            setShowDetailModal(false);
        } catch (err: any) {
            swal.error(err.message || 'Gagal mengonfirmasi pembayaran');
        } finally {
            setIsProcessing(false);
        }
    };

    const openPaymentMethodModal = (booking: Booking) => {
        setSelectedBooking(booking);
        setSelectedPaymentMethodCode(String(booking.paymentMethod || paymentMethods[0]?.code || '').toLowerCase());
        setShowPaymentMethodModal(true);
    };

    const handleUpdatePaymentMethod = async () => {
        if (!selectedBooking || !selectedPaymentMethodCode) return;

        setIsProcessing(true);
        try {
            await api.updateBooking(selectedBooking.rawId, {
                payment_method: selectedPaymentMethodCode
            });
            setSelectedBooking(prev => prev ? { ...prev, paymentMethod: selectedPaymentMethodCode } : prev);
            await loadBookings();
            setShowPaymentMethodModal(false);
            swal.success('Metode pembayaran berhasil diubah');
        } catch (err: any) {
            swal.error(err.message || 'Gagal mengubah metode pembayaran');
        } finally {
            setIsProcessing(false);
        }
    };

    const buildCheckoutData = (booking: Booking) => ({
        bookingId: booking.rawId,
        customer: { name: booking.customer, phone: booking.phone },
        services: booking.subItems && booking.subItems.length > 0
            ? booking.subItems.map(item => ({
                id: item.serviceId || 0,
                name: item.service,
                price: item.price,
                staff: { id: item.staffId || 0, name: item.therapist }
            }))
            : [{ name: booking.services[0], price: booking.total }],
        room_ids: booking.subItems?.map(item => item.roomId || 0),
        room: { name: booking.room, id: 1 },
        date: booking.date,
        time: booking.time,
        total: booking.total,
        dp: booking.dp,
        promoCode: booking.promoCode,
        discountAmount: booking.discountAmount,
        isSettlement: booking.paymentStatus === 'partial',
        paymentMethod: selectedBooking?.rawId === booking.rawId
            ? (selectedPaymentMethodCode || booking.paymentMethod)
            : booking.paymentMethod
    });


    const handleCompleteItem = async (bookingId: number, itemId: number) => {
        const result = await swal.confirm('Selesaikan layanan untuk item ini?', 'Selesaikan Layanan', 'Ya, Selesaikan');
        if (!result.isConfirmed) return;

        setIsProcessing(true);
        try {
            await api.completeBookingItem(bookingId, itemId);
            await loadBookings();
            setShowDetailModal(false);
        } catch (err: any) {
            swal.error(err.message || 'Gagal menyelesaikan item');
        } finally {
            setIsProcessing(false);
        }
    };


    const closeAllModals = () => {
        setShowDetailModal(false);
        setShowRescheduleModal(false);
        setShowCancelModal(false);
        setShowRefundModal(false);
        setSelectedBooking(null);
    };

    const selectedBookingTotal = selectedBooking?.total || 0;
    const selectedBookingPaid = selectedBooking?.paymentStatus === 'paid'
        ? Math.max(selectedBooking?.dp || 0, selectedBookingTotal)
        : (selectedBooking?.dp || 0);
    const selectedBookingBalance = Math.max(0, selectedBookingTotal - selectedBookingPaid);
    const selectedBookingOverpayment = Math.max(0, selectedBookingPaid - selectedBookingTotal);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">Daftar Reservasi</h1>
                    <p className="text-gray-500 text-sm">Kelola booking pelanggan</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari ID booking atau nama pelanggan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none"
                        />
                    </div>

                    {isElevatedRole(user?.role) && (

                        <div className="bg-white/50 p-1 rounded-2xl border border-orange-100/50 shadow-sm">
                            <BranchSelector
                                selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)}
                                onBranchChange={(id) => setBranchFilter(id || '')}
                                showAllOption={true}
                                allOptionLabel="- pilih cabang -"
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {reservationFilters.map(status => (
                            <button
                                key={status.value}
                                onClick={() => setFilter(status.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status.value
                                    ? 'bg-naqupos-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {status.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-left text-xs text-gray-500 uppercase">
                            <th className="px-4 py-3 font-medium w-10"></th>
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('id')}
                            >
                                <div className="flex items-center gap-1.5">
                                    ID Booking
                                    {renderSortIcon('id')}
                                </div>
                            </th>
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('customer')}
                            >
                                <div className="flex items-center gap-1.5">
                                    Pelanggan
                                    {renderSortIcon('customer')}
                                </div>
                            </th>
                            <th className="px-4 py-3 font-medium">Layanan</th>
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('therapist')}
                            >
                                <div className="flex items-center gap-1.5">
                                    Terapis
                                    {renderSortIcon('therapist')}
                                </div>
                            </th>
                            {isElevatedRole(user?.role) && (

                                <th
                                    className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('branch')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Cabang
                                        {renderSortIcon('branch')}
                                    </div>
                                </th>
                            )}
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center gap-1.5">
                                    Jadwal
                                    {renderSortIcon('date')}
                                </div>
                            </th>
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('total')}
                            >
                                <div className="flex items-center gap-1.5">
                                    Total Pembayaran
                                    {renderSortIcon('total')}
                                </div>
                            </th>
                            <th className="px-4 py-3 font-medium">Status Pembayaran</th>
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center gap-1.5">
                                    Status Layanan
                                    {renderSortIcon('status')}
                                </div>
                            </th>
                            <th className="px-4 py-3 font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <RefreshCcw className="animate-spin text-naqupos-primary" size={24} />
                                        <p>Memuat data reservasi...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredBookings.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-8">
                                    <EmptyState
                                        title={branchFilter === '' ? "Pilih Cabang" : "Belum ada reservasi"}
                                        message={branchFilter === '' ? "Silakan pilih cabangnya terlebih dahulu" : "Tidak ditemukan data reservasi yang sesuai dengan kriteria filter."}
                                        icon={Calendar}
                                    />
                                </td>
                            </tr>
                        ) : (
                            paginatedBookings.map(booking => {
                                const isExpanded = expandedRows.has(booking.id);
                                const hasSubItems = booking.subItems && booking.subItems.length > 1;
                                const bookingStatusConfig = statusConfig[booking.status] || statusConfig.pending_payment;

                                return (
                                    <React.Fragment key={booking.id}>
                                        <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-naqupos-cream/20' : ''}`}>
                                            <td className="px-4 py-3">
                                                {hasSubItems && (
                                                    <button
                                                        onClick={() => toggleRow(booking.id)}
                                                        className={`p-1 hover:bg-naqupos-cream rounded-md transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                    >
                                                        <ChevronDown size={16} className="text-naqupos-primary" />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-naqupos-primary font-medium">{booking.id}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-naqupos-dark">{booking.customer}</p>
                                                <p className="text-xs text-gray-500">{booking.phone}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {booking.services.map((s, i) => (
                                                        <span key={i} className="block text-gray-700">{s}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{booking.therapist}</td>
                                            {isElevatedRole(user?.role) && (

                                                <td className="px-4 py-3 text-xs font-medium text-gray-600">{booking.branchName}</td>
                                            )}
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-naqupos-dark">{formatDateReadable(booking.date)}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{booking.time}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-tight">Room {booking.room}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">Rp {booking.total.toLocaleString('id-ID')}</p>
                                                {booking.paymentStatus === 'paid' ? (
                                                    <p className="text-xs text-green-600 font-bold flex items-center gap-1 mt-1">
                                                        <CheckCircle size={12} /> Lunas
                                                    </p>
                                                ) : booking.paymentStatus === 'partial' ? (
                                                    <p className="text-xs text-amber-600 font-semibold mt-1">
                                                        DP: Rp {booking.dp.toLocaleString('id-ID')}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter mt-1 flex items-center gap-1">
                                                        <AlertCircle size={10} /> Belum Bayar
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 min-w-[120px]">
                                                {booking.paymentStatus === 'paid' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0] shadow-sm whitespace-nowrap">
                                                        <CheckCircle size={13} />
                                                        Lunas
                                                    </span>
                                                ) : booking.paymentStatus === 'partial' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#FFFBEB] text-[#F59E0B] border border-[#FDE68A] shadow-sm whitespace-nowrap">
                                                        <Clock size={13} />
                                                        DP
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA] shadow-sm whitespace-nowrap">
                                                        <CreditCard size={13} />
                                                        Belum Bayar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm ${bookingStatusConfig.color}`}>
                                                    {bookingStatusConfig.icon}
                                                    {bookingStatusConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    {/* Eye / Detail is kept */}
                                                    <button
                                                        onClick={() => openDetailModal(booking)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Detail"
                                                    >
                                                        <Eye size={16} className="text-gray-500" />
                                                    </button>

                                                    {booking.paymentStatus === 'unpaid' && (
                                                        <button
                                                            onClick={() => navigate('/pos', { state: { bookingData: buildCheckoutData(booking) } })}
                                                            className="p-2 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 shadow-sm"
                                                            title="Bayar / Checkout"
                                                        >
                                                            <ShoppingCart size={16} className="text-emerald-500" />
                                                        </button>
                                                    )}

                                                    {booking.paymentStatus === 'partial' && (
                                                        <button
                                                            onClick={() => navigate('/pos', { state: { bookingData: buildCheckoutData(booking) } })}
                                                            className="p-2 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 shadow-sm"
                                                            title="Pelunasan DP"
                                                        >
                                                            <Banknote size={16} className="text-emerald-500" />
                                                        </button>
                                                    )}

                                                    {booking.status === 'cancelled' && booking.paymentStatus !== 'unpaid' && (
                                                        <button
                                                            onClick={() => openRefundModal(booking)}
                                                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors border border-purple-100 shadow-sm"
                                                            title="Proses Refund"
                                                        >
                                                            <Wallet size={16} className="text-purple-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && booking.subItems && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={isElevatedRole(user?.role) ? 10 : 9} className="px-4 py-0">

                                                    <div className="py-3 pl-14 pr-4 border-l-4 border-naqupos-primary ml-1 my-2 space-y-2">
                                                        <h6 className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">Sub-Transaksi (Individual Bookings)</h6>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                            {booking.subItems.map((item, idx) => (
                                                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
                                                                    <div>
                                                                        <p className="text-xs font-bold text-naqupos-dark truncate">{item.service}</p>
                                                                        <div className="mt-2 space-y-1">
                                                                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                                <Clock size={10} /> {item.time}
                                                                            </p>
                                                                            <p className="text-[10px] text-gray-500">Terapis: {item.therapist}</p>
                                                                            <p className="text-[10px] text-gray-500">Ruangan: {item.room}</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-xs text-naqupos-primary font-bold mt-2 text-right border-t border-gray-50 pt-2">
                                                                        Rp {item.price.toLocaleString('id-ID')}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {displayPagination.total > 0 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">
                            Menampilkan <span className="font-medium text-gray-900">{displayPagination.from || 0}</span> - <span className="font-medium text-gray-900">{displayPagination.to || 0}</span> dari <span className="font-medium text-gray-900">{displayPagination.total}</span> data
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(1)}
                                disabled={displayPagination.current_page === 1}
                                className={`p-1.5 rounded-lg border transition-colors ${displayPagination.current_page === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-white hover:shadow-sm'}`}
                                title="Halaman Pertama"
                            >
                                <ChevronsLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={displayPagination.current_page === 1}
                                className={`p-1.5 rounded-lg border transition-colors ${displayPagination.current_page === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-white hover:shadow-sm'}`}
                                title="Halaman Sebelumnya"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <span className="text-xs font-medium text-gray-700 px-2">
                                Hal. {displayPagination.current_page} / {displayPagination.last_page}
                            </span>

                            <button
                                onClick={() => setPage(p => Math.min(displayPagination.last_page, p + 1))}
                                disabled={displayPagination.current_page === displayPagination.last_page}
                                className={`p-1.5 rounded-lg border transition-colors ${displayPagination.current_page === displayPagination.last_page ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-white hover:shadow-sm'}`}
                                title="Halaman Selanjutnya"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => setPage(displayPagination.last_page)}
                                disabled={displayPagination.current_page === displayPagination.last_page}
                                className={`p-1.5 rounded-lg border transition-colors ${displayPagination.current_page === displayPagination.last_page ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-white hover:shadow-sm'}`}
                                title="Halaman Terakhir"
                            >
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showDetailModal && selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[70vh] overflow-hidden">
                        <div className="p-6 pb-2 flex justify-between items-center border-b border-gray-50 bg-gray-50/30">
                            <div>
                                <h3 className="text-xl font-bold text-naqupos-dark">Detail Booking</h3>
                                <div className="flex gap-4 mt-2">
                                    <button
                                        onClick={() => setActiveDetailTab('detail')}
                                        className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeDetailTab === 'detail' ? 'border-naqupos-primary text-naqupos-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Informasi
                                    </button>
                                    <button
                                        onClick={() => setActiveDetailTab('history')}
                                        className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeDetailTab === 'history' ? 'border-naqupos-primary text-naqupos-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Riwayat Perubahan
                                    </button>
                                </div>
                            </div>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 py-4 space-y-4 custom-scrollbar">
                            {activeDetailTab === 'detail' ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className=" text-sm text-naqupos-primary">{selectedBooking.id}</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[selectedBooking.status].color}`}>
                                            {statusConfig[selectedBooking.status].icon}
                                            {statusConfig[selectedBooking.status].label}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Pelanggan</span>
                                            <span className="font-medium">{selectedBooking.customer}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Telepon</span>
                                            <span>{selectedBooking.phone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Layanan</span>
                                            <span>{selectedBooking.services.join(', ')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Terapis</span>
                                            <span>{selectedBooking.therapist}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Jadwal</span>
                                            <span>{formatDateReadable(selectedBooking.date)} • {selectedBooking.time}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Cabang</span>
                                            <span>{selectedBooking.branchName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Ruangan</span>
                                            <span>{selectedBooking.room}</span>
                                        </div>

                                        {selectedBooking.notes && (
                                            <div className="mt-4 space-y-3">
                                                {selectedBooking.notes.split('\n').map((note, idx) => {
                                                    const isSystem = note.trim().startsWith('[SISTEM]');
                                                    return (
                                                        <div key={idx} className={`p-3 rounded-xl border ${isSystem ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                                                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isSystem ? 'text-blue-600' : 'text-red-600'}`}>
                                                                {isSystem ? 'Informasi Sistem' : 'Catatan / Alasan Cancel'}
                                                            </p>
                                                            <p className={`text-xs whitespace-pre-wrap ${isSystem ? 'text-blue-900' : 'text-red-900'}`}>
                                                                {isSystem ? note.replace('[SISTEM] ', '') : note}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {selectedBooking.subItems && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Rincian Layanan & Tamu</p>
                                                <div className="space-y-6">
                                                    {(() => {
                                                        const grouped = selectedBooking.subItems.reduce((acc: any, item: any) => {
                                                            const key = `${item.guestName || 'Tamu'}-${item.guestPhone || ''}`;
                                                            if (!acc[key]) acc[key] = { name: item.guestName, phone: item.guestPhone, items: [] };
                                                            acc[key].items.push(item);
                                                            return acc;
                                                        }, {});

                                                        return Object.values(grouped).map((group: any, gIdx: number) => (
                                                            <div key={gIdx} className="space-y-3">
                                                                <div className="flex items-center justify-between bg-gray-50/80 px-3 py-2 rounded-lg border border-gray-100">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-5 h-5 bg-naqupos-primary text-white text-[10px] font-black rounded flex items-center justify-center shadow-sm">
                                                                            {gIdx + 1}
                                                                        </div>
                                                                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-tight">Tamu {gIdx + 1}: {group.name || (group.name === selectedBooking.customer ? group.name : 'Tamu')}</span>
                                                                    </div>
                                                                    {group.phone && <span className="text-[10px] text-gray-400 font-medium">{group.phone}</span>}
                                                                </div>

                                                                <div className="space-y-3 pl-2">
                                                                    {group.items.map((item: any, i: number) => (
                                                                        <div key={i} className={`bg-white p-3 rounded-xl border ${item.status === 'cancelled' ? 'border-red-100 bg-red-50/30' : 'border-gray-100'} shadow-sm`}>
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <div>
                                                                                    <p className="font-bold text-sm text-naqupos-dark">{item.service}</p>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="text-xs font-bold text-naqupos-primary">Rp {item.price.toLocaleString('id-ID')}</p>
                                                                                    {item.refundAmount && item.refundAmount > 0 ? (
                                                                                        <p className="text-[10px] text-red-600">Refund: Rp {item.refundAmount.toLocaleString('id-ID')}</p>
                                                                                    ) : null}
                                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.status === 'cancelled' ? 'bg-red-100 text-red-600' : (item.status === 'refunded' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600')}`}>
                                                                                        {item.status === 'active' ? 'Aktif' : item.status === 'cancelled' ? 'Batal' : 'Refund'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50/50 p-2 rounded-lg border border-gray-50">
                                                                                <div>
                                                                                    <p className="text-gray-400 uppercase text-[9px] font-bold">Terapis</p>
                                                                                    <p className="font-medium text-gray-700">{item.therapist}</p>
                                                                                    {item.therapistPhone && (
                                                                                        <a href={`https://wa.me/${item.therapistPhone.replace(/\D/g, '')}`} target="_blank" className="text-emerald-600 hover:underline flex items-center gap-1 mt-0.5">
                                                                                            WA: {item.therapistPhone}
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-gray-400 uppercase text-[9px] font-bold">Waktu & Ruang</p>
                                                                                    <p className="font-medium text-gray-700">{item.time} • {item.room}</p>
                                                                                </div>
                                                                            </div>

                                                                            {(!['cancelled', 'refunded'].includes(selectedBooking.status)) && (
                                                                                <div className="flex gap-2 mt-3">
                                                                                    {item.status === 'active' && selectedBooking.status !== 'completed' && (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={() => handleCompleteItem(item.bookingId || selectedBooking.rawId, item.id)}
                                                                                                className="flex-1 py-1.5 px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md text-[10px] font-bold hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors"
                                                                                            >
                                                                                                <CheckCircle size={10} /> Selesai
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setSelectedItem(item);
                                                                                                    setShowCancelModal(true);
                                                                                                    setShowDetailModal(false);
                                                                                                }}
                                                                                                className="flex-1 py-1.5 px-2 bg-white border border-red-100 text-red-600 rounded-md text-[10px] font-medium hover:bg-red-50 flex items-center justify-center gap-1"
                                                                                            >
                                                                                                <XCircle size={10} /> Batal
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                    {selectedBooking.paymentStatus !== 'unpaid' && (item.status === 'active' || item.status === 'cancelled') && (
                                                                                        <button
                                                                                            onClick={async () => {
                                                                                                setSelectedItem(item);

                                                                                                // Fetch branch settings to know min_dp
                                                                                                try {
                                                                                                    const settings = await api.getCompanySettings(selectedBooking.branchId);
                                                                                                    setBranchSettings(settings);
                                                                                                } catch (e) {
                                                                                                    console.error("Failed to fetch branch settings", e);
                                                                                                }

                                                                                                const overpayment = selectedBooking.dp - selectedBooking.total;
                                                                                                const maxRefundForItem = Math.min(item.price, Math.max(0, overpayment));
                                                                                                setRefundAmount(maxRefundForItem);
                                                                                                setShowRefundModal(true);
                                                                                                setShowDetailModal(false);
                                                                                            }}
                                                                                            className="flex-1 py-1.5 px-2 bg-purple-50 border border-purple-100 text-purple-600 rounded-md text-[10px] font-bold hover:bg-purple-100 flex items-center justify-center gap-1 transition-colors"
                                                                                        >
                                                                                            <Wallet size={10} /> Refund
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        {selectedBooking.products && selectedBooking.products.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pembelian Produk</p>
                                                <div className="space-y-2">
                                                    {selectedBooking.products.map((prod, i) => (
                                                        <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                            <div>
                                                                <p className="font-bold text-sm text-naqupos-dark">{prod.name}</p>
                                                                <p className="text-[10px] text-gray-500">
                                                                    {prod.quantity} x Rp {prod.price.toLocaleString('id-ID')}
                                                                    {prod.variant && ` • Varian: ${prod.variant}`}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs font-bold text-naqupos-primary">Rp {prod.subtotal.toLocaleString('id-ID')}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-bold text-gray-700">Audit Perubahan Agenda</h4>
                                        <button
                                            onClick={() => loadAgendaLogs(selectedBooking.rawId)}
                                            className="p-1 hover:bg-gray-100 rounded text-naqupos-primary"
                                            title="Refresh Log"
                                        >
                                            <RefreshCcw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
                                        </button>
                                    </div>

                                    {isLoadingLogs ? (
                                        <div className="py-12 flex flex-col items-center justify-center space-y-3">
                                            <Loader2 size={32} className="text-naqupos-primary animate-spin" />
                                            <p className="text-xs text-gray-400 font-medium animate-pulse">Memuat riwayat...</p>
                                        </div>
                                    ) : agendaLogs.length === 0 ? (
                                        <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <Clock size={40} className="mx-auto text-gray-200 mb-3" />
                                            <h5 className="text-sm font-bold text-gray-400">Belum Ada Riwayat</h5>
                                            <p className="text-[10px] text-gray-400 px-8 mt-1 uppercase tracking-widest font-medium">Semua perubahan agenda (cancel, move, refund) akan tercatat di sini.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pb-4">
                                            {agendaLogs.map((log) => (
                                                <div key={log.id} className="relative pl-6 pb-2 border-l-2 border-gray-100 last:border-0">
                                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-naqupos-primary flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-naqupos-primary" />
                                                    </div>

                                                    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${log.action === 'cancel_item' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                    log.action === 'refund_item' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                                        log.action === 'reschedule_item_move' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                            'bg-orange-50 text-orange-600 border border-orange-100'
                                                                    }`}>
                                                                    {log.action.replace(/_/g, ' ')}
                                                                </span>
                                                                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                                                                    {new Date(log.created_at).toLocaleString('id-ID', {
                                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                                        hour: '2-digit', minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`text-xs font-black ${Number(log.price_difference) < 0 ? 'text-emerald-600' : Number(log.price_difference) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                                    {Number(log.price_difference) < 0 ? `- Rp ${Math.abs(Number(log.price_difference)).toLocaleString('id-ID')}` :
                                                                        Number(log.price_difference) > 0 ? `+ Rp ${Number(log.price_difference).toLocaleString('id-ID')}` : 'No Price Change'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {log.booking_item && (
                                                            <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                                <p className="text-[10px] font-bold text-gray-700">{log.booking_item.service?.name || 'Service Deleted'}</p>
                                                            </div>
                                                        )}

                                                        {log.notes && (
                                                            <p className="text-[10px] text-gray-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100/50 line-clamp-2">
                                                                "{log.notes}"
                                                            </p>
                                                        )}

                                                        <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 bg-naqupos-cream rounded-full flex items-center justify-center text-naqupos-primary">
                                                                    <UserIcon size={10} />
                                                                </div>
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{log.user?.name || 'System'}</span>
                                                            </div>
                                                            {log.new_data?.total_price !== undefined && (
                                                                <span className="text-[9px] font-bold text-gray-400">Total Akhir: Rp {log.new_data.total_price.toLocaleString('id-ID')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 pt-4 bg-gray-50/50 border-t border-gray-100 space-y-4">
                            <div className="space-y-2 text-sm">
                                <hr className="border-dashed mb-2" />
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Harga Layanan</span>
                                    <span className="font-medium">Rp {(selectedBooking.originalTotal || 0).toLocaleString('id-ID')}</span>
                                </div>
                                {(selectedBooking.discountAmount || 0) > 0 && (
                                    <div className="flex justify-between text-naqupos-primary">
                                        <span className="text-sm">Potongan Voucher {selectedBooking.promoCode ? `(${selectedBooking.promoCode})` : ''}</span>
                                        <span className="font-medium">-Rp {selectedBooking.discountAmount?.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {(selectedBooking.serviceChargeAmount || 0) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Service Charge</span>
                                        <span className="font-medium">Rp {selectedBooking.serviceChargeAmount?.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {(selectedBooking.taxAmount || 0) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Pajak (Tax)</span>
                                        <span className="font-medium">Rp {selectedBooking.taxAmount?.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between mt-1">
                                    <span className="text-gray-500 font-bold">Total Pembayaran</span>
                                    <span className="font-bold">Rp {selectedBookingTotal.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total Dibayar</span>
                                    <span>Rp {selectedBookingPaid.toLocaleString('id-ID')}</span>
                                </div>
                                {selectedBookingOverpayment > 0 && (
                                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                            <Wallet size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800">Kelebihan Bayar Terdeteksi</p>
                                            <p className="text-[10px] text-emerald-600 leading-relaxed">
                                                Pelanggan telah membayar lebih sebesar <span className="font-bold">Rp {selectedBookingOverpayment.toLocaleString('id-ID')}</span>.
                                                Hal ini biasanya terjadi karena perubahan agenda ke layanan dengan harga lebih murah. Silakan proses refund jika diperlukan.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{selectedBookingOverpayment > 0 ? 'Kelebihan Bayar' : 'Sisa Tagihan'}</span>
                                    <span className={`font-bold ${selectedBookingOverpayment > 0 ? 'text-emerald-600' : 'text-naqupos-primary'}`}>
                                        Rp {(selectedBookingOverpayment > 0 ? selectedBookingOverpayment : selectedBookingBalance).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                {selectedBooking.status === 'refunded' && (
                                    <div className="flex justify-between text-red-600 border-t border-dashed pt-2">
                                        <span>Refunded</span>
                                        <span className="font-bold">Rp {selectedBooking.refundAmount?.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 mt-4">
                                {((selectedBooking.status === 'pending_payment' || selectedBooking.paymentStatus === 'unpaid') &&
                                    !['cancelled', 'completed', 'refunded'].includes(selectedBooking.status)) && (
                                    <>
                                        <button
                                            onClick={() => openPaymentMethodModal(selectedBooking)}
                                            disabled={isProcessing}
                                            className="w-full py-3 bg-white text-naqupos-primary rounded-lg font-medium border border-naqupos-primary/30 hover:bg-naqupos-cream/40 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CreditCard size={16} />
                                            Ubah Metode Pembayaran
                                        </button>
                                        <button
                                            onClick={() => navigate('/pos', { state: { bookingData: buildCheckoutData(selectedBooking) } })}
                                            disabled={isProcessing}
                                            className="w-full py-3 bg-naqupos-primary text-white rounded-lg font-medium hover:bg-naqupos-dark transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ShoppingCart size={16} />
                                            Bayar Sekarang
                                        </button>
                                    </>
                                    )}

                                {selectedBooking.paymentStatus === 'partial' && (
                                    <button
                                        onClick={() => {
                                            const checkoutData = buildCheckoutData(selectedBooking);
                                            navigate('/pos', { state: { bookingData: checkoutData } });
                                        }}
                                        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2"
                                    >
                                        <Banknote size={16} />
                                        Pelunasan DP
                                    </button>
                                )}
                                <button
                                    onClick={closeAllModals}
                                    className="flex-1 py-3 px-6 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Reschedule Modal */}
            {
                showRescheduleModal && selectedBooking && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-naqupos-cream/30">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Jadwal Ulang</h3>
                                    <p className="text-xs font-bold text-naqupos-primary uppercase tracking-widest mt-1">Reschedule Booking</p>
                                </div>
                                <button onClick={closeAllModals} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Booking Saat Ini</p>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{selectedBooking.customer}</p>
                                            <p className="text-xs text-gray-500">{selectedBooking.services.join(', ')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-naqupos-primary bg-white w-fit px-3 py-1.5 rounded-lg border border-naqupos-primary/10">
                                        <Calendar size={14} />
                                        <span>{selectedBooking.date} • {selectedBooking.time}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pilih Tanggal Baru</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <input
                                                type="date"
                                                value={newDate}
                                                onChange={(e) => setNewDate(e.target.value)}
                                                className="w-full pl-14 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pilih Waktu Baru</label>
                                        <div className="relative">
                                            <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <select
                                                value={newTime}
                                                onChange={(e) => setNewTime(e.target.value)}
                                                className="w-full pl-14 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all appearance-none"
                                            >
                                                {TIME_SLOTS.map(slot => (
                                                    <option key={slot} value={slot}>{slot}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={closeAllModals}
                                        className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all font-bold"
                                    >
                                        BATAL
                                    </button>
                                    <button
                                        onClick={handleReschedule}
                                        disabled={isProcessing || !newDate || !newTime}
                                        className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${isProcessing || !newDate || !newTime
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-naqupos-primary text-white hover:bg-naqupos-accent shadow-naqupos-primary/20'
                                            }`}
                                    >
                                        {isProcessing ? <RefreshCcw className="animate-spin" size={20} /> : <Calendar size={20} />}
                                        {isProcessing ? 'MEMPROSES...' : 'PINDAHKAN'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Cancel Modal */}
            {
                showCancelModal && selectedBooking && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl  font-bold text-naqupos-dark">Batalkan Booking</h3>
                                <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-red-50 rounded-lg p-4 flex gap-3">
                                    <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-red-800">Peringatan!</p>
                                        <p className="text-sm text-red-600">Pembatalan booking mungkin mempengaruhi pengembalian DP sesuai kebijakan yang berlaku.</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500 mb-1">Booking yang akan dibatalkan:</p>
                                    <p className="font-bold text-naqupos-dark">{selectedBooking.id}</p>
                                    <p className="text-sm">{selectedBooking.customer} - {selectedBooking.services.join(', ')}</p>
                                    <p className="text-sm text-gray-500">{selectedBooking.date} • {selectedBooking.time}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Alasan Pembatalan (Opsional)</label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        placeholder="Masukkan alasan pembatalan..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={closeAllModals}
                                    className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Kembali
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={isProcessing}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isProcessing
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                >
                                    {isProcessing ? 'Memproses...' : 'Ya, Batalkan Booking'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Refund Modal */}
            {
                showRefundModal && selectedBooking && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-naqupos-dark">Proses Pengembalian Dana</h3>
                                        <p className="text-xs text-gray-500">Booking ID: {selectedBooking.id}</p>
                                    </div>
                                </div>
                                <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <div className="bg-purple-50 rounded-2xl p-4 flex gap-3 border border-purple-100">
                                    <AlertCircle size={20} className="text-purple-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-purple-900">Ketentuan Refund</p>
                                        <p className="text-xs text-purple-700/80 leading-relaxed mt-0.5">
                                            Sesuai kebijakan operasional, Uang Muka (DP) bersifat hangus dan tidak dapat dikembalikan. Refund hanya diproses untuk kelebihan bayar.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Pemesan</p>
                                            <p className="font-bold text-naqupos-dark text-base mt-0.5">{selectedBooking.customer}</p>
                                            <p className="text-xs text-gray-500">{selectedBooking.services.join(', ')}</p>

                                            {selectedItem && (
                                                <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-100 border-dashed">
                                                    <p className="text-[10px] text-purple-700 font-bold uppercase">Item di-Refund:</p>
                                                    <p className="text-xs font-bold text-purple-900">{selectedItem.service}</p>
                                                    <p className="text-[10px] text-purple-600">Rp {selectedItem.price.toLocaleString('id-ID')}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Dibayar</p>
                                            <p className="font-bold text-naqupos-dark text-base mt-0.5">Rp {selectedBooking.dp.toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>

                                    {branchSettings && (
                                        <div className="pt-4 border-t border-gray-200 space-y-2">
                                            {(() => {
                                                const minVal = parseFloat(branchSettings.min_dp || 0);
                                                let minDP = minVal;
                                                if (branchSettings.min_dp_type === 'percentage') {
                                                    const originalTotal = selectedBooking.originalTotal || (selectedBooking.total + (selectedItem?.status === 'cancelled' ? selectedItem.price : 0));
                                                    minDP = (minVal / 100) * originalTotal;
                                                } else if (branchSettings.min_dp_type === 'per_guest') {
                                                    minDP = minVal * (selectedBooking.guestCount || 1);
                                                }
                                                const overpayment = selectedBooking.dp - selectedBooking.total;
                                                const refundableLimit = Math.max(0, overpayment - minDP);

                                                return (
                                                    <>
                                                        <div className="flex justify-between text-xs items-center">
                                                            <span className="text-gray-500">DP Minimum (Non-Refundable)</span>
                                                            <span className="font-medium text-red-500">- Rp {minDP.toLocaleString('id-ID')}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-gray-300">
                                                            <span className="text-sm font-bold text-gray-700">Maksimal Refund</span>
                                                            <span className="text-lg font-extrabold text-naqupos-primary">
                                                                Rp {refundableLimit.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Jumlah Refund</label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-naqupos-primary transition-colors">Rp</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={refundAmount === 0 ? '' : refundAmount.toLocaleString('id-ID')}
                                                onChange={(e) => setRefundAmount(parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:bg-white outline-none font-bold text-naqupos-dark text-lg transition-all"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Metode Refund</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRefundMethod('bank_transfer')}
                                                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${refundMethod === 'bank_transfer' ? 'bg-naqupos-primary text-white border-naqupos-primary shadow-md shadow-naqupos-primary/20' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                            >
                                                Transfer Bank
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRefundMethod('cash')}
                                                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${refundMethod === 'cash' ? 'bg-naqupos-primary text-white border-naqupos-primary shadow-md shadow-naqupos-primary/20' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                            >
                                                Tunai
                                            </button>
                                        </div>
                                    </div>

                                    {refundMethod === 'bank_transfer' && (
                                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="col-span-1">
                                                <label className="block text-sm font-bold text-gray-700 mb-2 text-xs">Bank</label>
                                                <input
                                                    type="text"
                                                    value={bankName}
                                                    onChange={(e) => setBankName(e.target.value)}
                                                    placeholder="BCA, Mandiri, dll"
                                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:bg-white outline-none transition-all"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-sm font-bold text-gray-700 mb-2 text-xs">No. Rekening</label>
                                                <input
                                                    type="text"
                                                    value={accountNumber}
                                                    onChange={(e) => setAccountNumber(e.target.value)}
                                                    placeholder="1234567890"
                                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:bg-white outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Alasan Refund</label>
                                        <textarea
                                            value={refundReason}
                                            onChange={(e) => setRefundReason(e.target.value)}
                                            placeholder="Tuliskan alasan pengembalian dana..."
                                            rows={2}
                                            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:bg-white outline-none resize-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                                <button
                                    onClick={closeAllModals}
                                    className="flex-1 py-3.5 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-white hover:border-gray-300 transition-all active:scale-[0.98]"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleRefund}
                                    disabled={isProcessing || refundAmount <= 0}
                                    className={`flex-[1.5] py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${isProcessing || refundAmount <= 0
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/20'
                                        }`}
                                >
                                    <Wallet size={18} />
                                    {isProcessing ? 'Memproses...' : `Konfirmasi Refund`}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {showPaymentMethodModal && selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-naqupos-dark">Ubah Metode Pembayaran</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Booking {selectedBooking.id}</p>
                            </div>
                            <button
                                onClick={() => setShowPaymentMethodModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto">
                            {paymentMethods.length === 0 ? (
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
                                    Belum ada metode pembayaran aktif untuk cabang ini.
                                </div>
                            ) : (
                                paymentMethods.map(method => (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => setSelectedPaymentMethodCode(method.code)}
                                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${selectedPaymentMethodCode === method.code
                                            ? 'border-naqupos-primary bg-naqupos-cream/40 text-naqupos-primary'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                    >
                                        <div>
                                            <p className="font-bold">{method.name}</p>
                                            <p className="text-xs text-gray-400 uppercase">{method.type || method.code}</p>
                                        </div>
                                        {selectedPaymentMethodCode === method.code && (
                                            <CheckCircle size={18} className="text-naqupos-primary" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="p-5 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowPaymentMethodModal(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleUpdatePaymentMethod}
                                disabled={isProcessing || !selectedPaymentMethodCode || paymentMethods.length === 0}
                                className={`flex-1 py-3 rounded-xl font-bold ${isProcessing || !selectedPaymentMethodCode || paymentMethods.length === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-dark'
                                    }`}
                            >
                                {isProcessing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmState.show}
                onClose={() => setConfirmState(prev => ({ ...prev, show: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                confirmLabel={confirmState.confirmLabel}
                type={confirmState.type}
                isLoading={isProcessing}
            />
        </div >
    );
}
