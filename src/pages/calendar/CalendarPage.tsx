import { api } from '../../services/api';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, User, Sparkles, Calendar, MapPin, Search, ChevronDown, ChevronUp, RefreshCw, ShoppingCart, Phone, Edit, Receipt, Users, DoorOpen, AlertTriangle, CheckCircle, Ban, Loader2, Clock, ThumbsUp, ClipboardList, MessageSquare, Plus, UserPlus, AlertCircle, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import swal from '../../utils/swal';

// HOURS removed as we use dynamic SLOTS
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'https://zafaranbe.memofy-dev.my.id';
    return `${STORAGE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};


// Interfaces (aligned with backend)
interface Guest {
    id: number;
    name?: string;
    phone?: string;
    type?: 'dewasa' | 'anak';
    age?: string | number;
    serviceId: number;
    serviceName: string;
    variantName?: string;
    servicePrice: number;
    serviceDuration: number;
    roomId: number;
    roomName: string;
    roomPrice: number;
    staffId: number;
    staffName: string;
    startTime: string;
}

interface Booking {
    id: number;
    staffId: number;
    start: string;
    duration: number;
    customer: string;
    customerPhone?: string;
    service: string;
    servicePrice?: number;
    date: string;
    isBlocked?: boolean;
    blockReason?: string;
    roomId?: number;
    roomName?: string;
    roomPrice?: number;
    guestCount?: number;
    guests?: Guest[];
    status?: 'pending' | 'awaiting_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    paymentStatus?: 'unpaid' | 'partial' | 'paid';
    invoiceNumber?: string;
    notes?: string;
    createdAt?: string;
    user_id?: number;
    totalPaid?: number;
    items?: any[];
    serviceId?: number;
    service_id?: number;
    therapist_id?: number;
    room_id?: number;
    booking_date?: string;
    start_time?: string;
    promoCode?: string;
     refundAmount?: number; 
    discountAmount?: number;
    products?: {
        id: number;
        name: string;
        quantity: number;
        price: number;
        subtotal: number;
        variant?: string;
    }[];
}

interface StaffShift {
    staffId: number;
    date: string;
    startTime: string;
    endTime: string;
}

interface Staff {
    id: number;
    name: string;
    gender?: string;
    photo?: string;
    color: string;
    specialization?: string;
    start_work_date?: string;
    end_work_date?: string;
    is_calendar_enabled?: string;

}

interface Service {
    id: number;
    name: string;
    category: string;
    description?: string;
    duration: number;
    price: number;
    special_price?: number;
    requires_room?: boolean | number | string;
    variants?: ServiceVariant[];
}

interface ServiceVariant {
    id: number;
    service_id: number;
    name: string;
    duration: number;
    price: number;
    special_price?: number;
}

interface Customer {
    id: number;
    name: string;
    phone: string;
    member?: boolean;
    is_member?: boolean;
    status?: string;
}

interface Room {
    id: number;
    name: string;
    type: string;
    price: number;
    extra_charge?: number;
    capacity?: number;
    quantity?: number;
    min_booking_capacity?: number;
    blocks?: {
        id: number;
        start_date: string;
        end_date: string;
        start_time: string;
        end_time: string;
        is_active?: boolean;
    }[];
}

interface Branch {
    id: number;
    name: string;
}

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

const normalizeService = (service: any): Service => {
    const variants = Array.isArray(service.variants)
        ? service.variants
        : (service.variants && typeof service.variants === 'object' ? Object.values(service.variants) : []);
    const category = typeof service.category === 'string'
        ? service.category
        : service.category?.name || service.service_category?.name || service.category_name || 'Lainnya';

    return {
        ...service,
        id: Number(service.id),
        category,
        duration: Number(service.duration || 0),
        price: Number(service.price || 0),
        special_price: service.special_price != null ? Number(service.special_price) : undefined,
        variants: variants.map((variant: any) => ({
            ...variant,
            id: Number(variant.id),
            service_id: Number(variant.service_id || service.id),
            duration: Number(variant.duration || service.duration || 0),
            price: Number(variant.price || 0),
            special_price: variant.special_price != null ? Number(variant.special_price) : undefined
        }))
    };
};

const fetchAllServices = async (branchId?: number): Promise<Service[]> => {
    const perPage = 100;
    const params = {
        branch_id: branchId && branchId > 0 ? branchId : undefined,
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

    const uniqueServices = new Map<number, Service>();
    [firstResponse, ...remainingResponses]
        .flatMap(getPaginatedItems)
        .map(normalizeService)
        .forEach(service => uniqueServices.set(service.id, service));

    return Array.from(uniqueServices.values());
};

const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekDates = (date: Date, startDayStr: string = 'sunday') => {
    const start = new Date(date);
    const currentDay = start.getDay(); // 0 (Sun) - 6 (Sat)
    const dayMap: { [key: string]: number } = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6
    };
    const targetDay = dayMap[startDayStr.toLowerCase()] ?? 0;

    let diff = currentDay - targetDay;
    if (diff < 0) diff += 7;

    start.setDate(start.getDate() - diff);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
};

import { useBranchSync } from '../../hooks/useBranchSync';

export default function CalendarPage() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'schedule' | 'week' | 'day'>('schedule');
    const [selectedStaffId, setSelectedStaffId] = useState<number>(0);

    // Sync with global branch
    const {
        selectedBranchId,
        setSelectedBranchId
    } = useBranchSync<number>(undefined, 0);


    const [showBranchDropdown, setShowBranchDropdown] = useState(false);

    const [branchSearchQuery, setBranchSearchQuery] = useState('');
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
const [confirmAction, setConfirmAction] = useState<{
    type: 'reschedule' | 'edit' | 'complete' | 'cancel' | 'no_show';
    item: Guest;
} | null>(null);
    // New Customer State
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({
        name: '',
        phone: '',
        email: '',
        dob: ''
    });
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
const [guestNotes, setGuestNotes] = useState<Record<string, string>>({});
const [isEditingGuestNotes, setIsEditingGuestNotes] = useState(false);
const [isSavingGuestNotes, setIsSavingGuestNotes] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [shifts, setShifts] = useState<StaffShift[]>([]);
    const [loading, setLoading] = useState(false);
    const [now, setNow] = useState(new Date());
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [isRescheduleMode, setIsRescheduleMode] = useState(false);
    const [editAgendaPriceType, setEditAgendaPriceType] = useState<'member' | 'non_member'>('non_member');
    const [calendarSettings, setCalendarSettings] = useState<any>(null);
    const [companySettings, setCompanySettings] = useState<any>(null);
    const [user, setUser] = useState<any>(null);


    const rescheduleInterval = useMemo(() => {
    return calendarSettings?.reschedule_interval || 15;
}, [calendarSettings]);



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

    // Derived settings with defaults
    // Company settings (Jam Buka/Tutup Salon) always take priority
    const startHour = useMemo(() => {
        if (companySettings?.default_open_time) {
            const [h] = companySettings.default_open_time.split(':').map(Number);
            return isNaN(h) ? (calendarSettings?.start_hour ?? 9) : h;
        }
        return calendarSettings?.start_hour ?? 9;
    }, [calendarSettings, companySettings]);

    const endHour = useMemo(() => {
        if (companySettings?.default_close_time) {
            const [h, m] = companySettings.default_close_time.split(':').map(Number);
            if (!isNaN(h)) {
                // If close time has non-zero minutes (e.g. 21:30), include that hour too
                return m > 0 ? h + 1 : h;
            }
        }
        return calendarSettings?.end_hour ?? 22;
    }, [calendarSettings, companySettings]);
    const slotDuration = useMemo(() => calendarSettings?.slot_duration || 15, [calendarSettings]);
    const weekStart = useMemo(() => calendarSettings?.week_start || 'sunday', [calendarSettings]);
    // const viewDefault = useMemo(() => calendarSettings?.default_view || 'day', [calendarSettings]);

   const activeStaffList = useMemo(() => {
    const viewDate = new Date(currentDate);
    const y = viewDate.getFullYear();
    const m = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const d = viewDate.getDate().toString().padStart(2, '0');
    const viewDateStr = `${y}-${m}-${d}`;

    return staffList.filter(s => {
        // Filter: kalau calendar disabled
        if (s.is_calendar_enabled === false || (s as any).is_calendar_enabled === 0) return false;

        // Filter: kalau tidak punya shift di tanggal ini
        const hasShift = shifts.some(sh => sh.staffId === s.id && sh.date === viewDateStr);
        if (!hasShift) return false;

        const startRaw = s.start_work_date || (s as any).startWorkDate;
        const endRaw = s.end_work_date || (s as any).endWorkDate;

        const startStr = startRaw ? startRaw.toString().substring(0, 10).trim() : '';
        const endStr = endRaw ? endRaw.toString().substring(0, 10).trim() : '';

        if (startStr && startStr !== 'null' && startStr !== 'undefined') {
            if (viewDateStr < startStr) return false;
        }

        if (endStr && endStr !== 'null' && endStr !== 'undefined') {
            if (viewDateStr > endStr) return false;
        }

        return true;
    });
}, [staffList, currentDate, shifts]); // tambah shifts ke dependency
    const isStaffActiveOn = (staffId: number, date: Date) => {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return false;

        const dDate = new Date(date);
        const y = dDate.getFullYear();
        const m = (dDate.getMonth() + 1).toString().padStart(2, '0');
        const d = dDate.getDate().toString().padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        const startRaw = staff.start_work_date || (staff as any).startWorkDate;
        const endRaw = staff.end_work_date || (staff as any).endWorkDate;

        const startStr = startRaw ? startRaw.toString().substring(0, 10).trim() : '';
        const endStr = endRaw ? endRaw.toString().substring(0, 10).trim() : '';

        if (startStr && startStr !== 'null' && startStr !== 'undefined' && dateKey < startStr) return false;
        if (endStr && endStr !== 'null' && endStr !== 'undefined' && dateKey > endStr) return false;

        return true;
    };

    useEffect(() => {
        // Only update every minute to avoid constant re-renders and excessive API calls
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const datePickerRef = useRef<HTMLDivElement>(null);



    // Initial Fetch
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch branches first or default
                const branchesRes = await api.getBranches();
                setBranches(branchesRes);

                // Then fetch other resources that might depend on branch
                // 2. Process Staff
                // If branchID is 0 or null, we pass undefined to fetch ALL
                const branchQuery = {
                    branch_id: (selectedBranchId && Number(selectedBranchId) > 0) ? selectedBranchId : undefined,
                    is_active: 1,
                    per_page: 100 // Get more staff to avoid pagination issues in calendar
                };
                const staffRes = await api.getTherapists(branchQuery);
                const colors = ['bg-pink-300', 'bg-sky-300', 'bg-green-300', 'bg-purple-300', 'bg-rose-200', 'bg-amber-300', 'bg-orange-300', 'bg-teal-300'];
                const staffData = Array.isArray(staffRes) ? staffRes : (staffRes.data || []);
           const coloredStaff = staffData.map((s: any, idx: number) => ({
    ...s,
    id: Number(s.id),
    color: s.color || colors[idx % colors.length]
}));
                setStaffList(coloredStaff);
                if (coloredStaff.length > 0 && selectedStaffId === 0) setSelectedStaffId(coloredStaff[0].id);

                // 2. Process Services with Filter
                const fetchedServices = await fetchAllServices(
                    selectedBranchId && Number(selectedBranchId) > 0 ? Number(selectedBranchId) : undefined
                );
                setServices(fetchedServices);

                // 3. Process Rooms
                const roomsQuery = (selectedBranchId && Number(selectedBranchId) > 0) ? { branch_id: selectedBranchId } : undefined;
                const roomsRes = await api.getRooms(roomsQuery);
                const mappedRooms = (Array.isArray(roomsRes) ? roomsRes : (roomsRes.data || [])).map((r: any) => ({
                    ...r,
                    price: parseFloat(String(r.extra_charge || r.price || 0)),
                    capacity: Number(r.capacity || 1),
                    quantity: Number(r.quantity || r.total_rooms || r.room_count || 1),
                    min_booking_capacity: Number(r.min_booking_capacity || r.minimum_capacity || r.min_capacity || (String(r.type || '').toLowerCase() === 'vvip' ? 2 : 1)),
                    blocks: Array.isArray(r.blocks) ? r.blocks : []
                }));
                setRooms(mappedRooms);

                // 4. Process Customers - Filter by branch
                const customersRes = await api.getCustomers();
                const customersData = Array.isArray(customersRes) ? customersRes : (customersRes.data || []);
                const filteredByBranch = (selectedBranchId && Number(selectedBranchId) > 0)
                    ? customersData.filter((c: any) => !c.branch_id || c.branch_id === selectedBranchId)
                    : customersData;
                setCustomers(filteredByBranch);
                setFilteredCustomers(filteredByBranch);

                // 5. Fetch Calendar Settings
                const settingsRes = await api.getCalendarSettings(selectedBranchId && Number(selectedBranchId) > 0 ? selectedBranchId : undefined);
                setCalendarSettings(settingsRes);

                // 6. Fetch Company Settings
                const companyRes = await api.getCompanySettings(selectedBranchId && Number(selectedBranchId) > 0 ? selectedBranchId : undefined);
                setCompanySettings(companyRes);

                // Set default view if configured and not manually changed (logic can be refined)
                // setViewMode(settingsRes.default_view || 'schedule'); 
            } catch (error) {
                console.error("Failed to fetch initial data", error);
            }
        };
        fetchInitialData();
    }, [selectedBranchId]);

    // Track last parameters to avoid unnecessary full-page loading indicators
    const lastFetchParams = useRef<string>('');

    // Fetch Bookings & Shifts on Date/Branch Change
    useEffect(() => {
        const fetchBookings = async () => {
            const dateStr = formatDateInput(currentDate);
            const currentParams = `${selectedBranchId}-${dateStr}-${viewMode}`;

            // Only show full loader if main parameters changed
            const isInitialLoad = lastFetchParams.current !== currentParams;
            if (isInitialLoad) {
                setLoading(true);
                lastFetchParams.current = currentParams;
            }

            try {
                if (!selectedBranchId || Number(selectedBranchId) === 0) {
                    setBookings([]);
                    setShifts([]);
                    setLoading(false);
                    return;
                }
                const dateStr = formatDateInput(currentDate);

                // Calculate date range for shifts based on viewMode
                let startDate = dateStr;
                let endDate = dateStr;
                // Note: We use the weekStart setting here
                const weekDates = getWeekDates(currentDate, weekStart);

                if (viewMode === 'week') {
                    startDate = formatDateInput(weekDates[0]);
                    endDate = formatDateInput(weekDates[6]);
                }

                const calQuery = {
                    branch_id: (!selectedBranchId || Number(selectedBranchId) === 0) ? undefined : selectedBranchId,
                    date: dateStr,
                    view: viewMode === 'schedule' ? 'month' : viewMode
                };

                const scheduleQuery = {
                    branch_id: (!selectedBranchId || Number(selectedBranchId) === 0) ? undefined : selectedBranchId,
                    start_date: startDate,
                    end_date: endDate
                };

                // API calls
                const [bookingsData, shiftsData] = await Promise.all([
                    api.getCalendar(calQuery),
                    api.getTherapistSchedule(scheduleQuery)
                ]);

                console.log('CALENDAR RESPONSE:', bookingsData);
console.log('BOOKINGS:', (bookingsData.bookings || []).map((b: any) => ({
    id: b.id,
    customer: b.customer,
    status: b.status,
    payment_status: b.payment_status || b.paymentStatus,
    refund_amount: b.refund_amount,
    guests: (b.guests || []).map((g: any) => ({ name: g.name, status: g.status, refund_amount: g.refund_amount }))
})));


                // Map backend booking fields
                const fetchedBookings = bookingsData.bookings || [];
                console.log('ALL BOOKINGS FROM API:', fetchedBookings.map((b: any) => ({
    id: b.id,
    status: b.status,
    payment_status: b.payment_status || b.paymentStatus,
    refund_amount: b.refund_amount,
    guests: (b.guests || []).map((g: any) => ({ name: g.name, status: g.status }))
})));
                // Use default 1 minute or fetch from settings (fetched in initialData, but here we might not have it in closure if parallel? 
                // Actually fetchBookings depends on selectedBranchId, which triggers initialData. 
                // But better to use companySettings state. However, state might not be updated inside this useEffect immediately if they run in parallel or loop.
                // Let's rely on companySettings state if available, or default 15.
                const timeoutMinutes = companySettings?.paymentTimeout ? parseInt(companySettings.paymentTimeout) : 15;
                const now = new Date();

                const expiredIds: number[] = [];

                const formattedBookings = fetchedBookings
                    .map((b: any) => ({
                        ...b,
                        staffId: Number(b.staffId || b.therapist_id),
                        start: b.start || b.start_time || '',
                        date: b.date || b.booking_date || '',
                        isBlocked: b.isBlocked || b.is_blocked || false,
                        blockReason: b.blockReason || b.block_reason || '',
                        paymentStatus: b.paymentStatus || b.payment_status || 'unpaid',
                        servicePrice: parseFloat(b.servicePrice || 0),
                        roomPrice: parseFloat(b.roomPrice || 0),
                        guestCount: parseInt(b.guestCount || 1)
                    }))
                    .filter((b: any) => {
                        // Blocked bookings always pass through regardless of status
                       if (b.isBlocked || b.is_blocked) return true;
    
    // Tampilkan cancelled kalau ada refund_amount
    if (b.status === 'cancelled') {
        if (b.refundAmount > 0 || b.refund_amount > 0) return true;
        return false;
    }

                        // Hide bookings where all guests have been refunded (full refund)
                        const guests = b.guests ? (Array.isArray(b.guests) ? b.guests : Object.values(b.guests)) : [];
                        if (b.status === 'refunded') {
                            // Only hide if ALL guests are refunded (full refund)
                            if (guests.length === 0) return false;
                            if ((guests as any[]).every((g: any) => g.status === 'refunded')) return false;
                            // Partial refund - keep showing
                            return true;
                        }

                        // Check for expired unpaid bookings
                        if (b.paymentStatus === 'unpaid' && b.status === 'pending' && b.createdAt) {
                            const createdAt = new Date(b.createdAt);
                            const deadline = new Date(createdAt.getTime() + timeoutMinutes * 60000);
                            if (now > deadline) {
                                expiredIds.push(b.id);
                                return false;
                            }
                        }
                        return true;
                    });

                // Proactively delete expired bookings from DB
                if (expiredIds.length > 0) {
                    console.log(`Cleaning up ${expiredIds.length} expired bookings...`);
                    Promise.all(expiredIds.map(id => api.deleteBooking(id))).catch(err => console.error("Failed to cleanup expired bookings", err));
                }

                setBookings(formattedBookings);

                // Process shifts - Backend now returns { data: [...] } with flat shifts
                const fetchedShifts = shiftsData.data || (Array.isArray(shiftsData) ? shiftsData : []);
                setShifts(normalizeShifts(fetchedShifts));

            } catch (error) {
                console.error("Failed to fetch bookings", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [currentDate, viewMode, selectedBranchId, now, weekStart]);


    // Booking Modal 
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [selectedSlot, setSelectedSlot] = useState<{ staffId: number; date: string; time: string } | null>(null);
    const [formData, setFormData] = useState({
        serviceIds: [] as number[],
        roomIds: [] as (number | null)[],
        customerId: null as number | null,
        roomId: null as number | null,
        notes: ''
    });

    interface ManualBookingItem {
        tempId: string;
        serviceId: number;
        variantId?: number | null;
        staffId: number;
        roomId: number | null;
        startTime: string; // HH:mm
        guestIndex: number; // Groups services by guest
        guestName?: string;
        guestPhone?: string;
        guestType?: 'dewasa' | 'anak';
        guestAge?: string | number;
    }
    const [bookingItems, setBookingItems] = useState<ManualBookingItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    // Slot picker popup: which item's time picker is open
    const [slotPickerItem, setSlotPickerItem] = useState<ManualBookingItem | null>(null);


    const [customerSearch, setCustomerSearch] = useState('');
    const [customerHistory, setCustomerHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Item Reschedule State
    const [rescheduleItemTarget, setRescheduleItemTarget] = useState<{ bookingId: number, item: Guest } | null>(null);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
const [rescheduleModalData, setRescheduleModalData] = useState<{
    bookingId: number;
    item: Guest;
    selectedDate: string;
    selectedStaffId: number;
    selectedTime: string;
} | null>(null);
    const rescheduleShiftFetchKeys = useRef<Set<string>>(new Set());
    const [rescheduleConfirmData, setRescheduleConfirmData] = useState<{ staffId: number, dateStr: string, timeStr: string, bookingId: number, item: Guest } | null>(null);
    const [itemToCancel, setItemToCancel] = useState<Guest | null>(null);
    const [itemToRefund, setItemToRefund] = useState<Guest | null>(null);
const [showRefundModal, setShowRefundModal] = useState(false);
const [refundForm, setRefundForm] = useState({ amount: '', method: 'cash', reason: '' });

    const getRoomMinBookingCapacity = (room: Room | undefined) => Math.max(1, Number(room?.min_booking_capacity || 1));
    const getRoomCapacity = (room: Room | undefined) => {
        const capacityPerRoom = Math.max(1, Number(room?.capacity || 1));
        const roomQuantity = Math.max(1, Number(room?.quantity || 1));
        return capacityPerRoom * roomQuantity;
    };
    const serviceRequiresRoom = (service?: Service | null) => {
        const value = service?.requires_room;
        return !(value === false || value === 0 || value === '0' || value === 'false');
    };
    const itemRequiresRoom = (item: ManualBookingItem) => serviceRequiresRoom(services.find(s => s.id === item.serviceId));
    const getItemRoomId = (item: ManualBookingItem) => itemRequiresRoom(item) ? item.roomId : null;

    const countOverlappingDraftRoomBookings = (roomId: number, startTime: string, duration: number, excludeTempId?: string) => {
        const currentStartM = toMin(startTime);
        const currentEndM = currentStartM + duration;

        return bookingItems.filter(bi => {
            if (excludeTempId && bi.tempId === excludeTempId) return false;
            if (!itemRequiresRoom(bi)) return false;
            if (bi.roomId !== roomId || !bi.startTime || !bi.serviceId) return false;

            const biDur = getManualItemDuration(bi);
            const biStartM = toMin(bi.startTime);
            const biEndM = biStartM + biDur;
            return currentStartM < biEndM && currentEndM > biStartM;
        }).length;
    };

    const validateRoomBookingRules = () => {
        for (const item of bookingItems) {
            if (!item.roomId || !item.startTime || !item.serviceId) continue;

            const room = rooms.find(r => r.id === item.roomId);
            const service = services.find(s => s.id === item.serviceId);
            if (!room || !service) continue;
            if (!serviceRequiresRoom(service)) continue;

            const roomCapacity = getRoomCapacity(room);
            const minBookingCapacity = getRoomMinBookingCapacity(room);
            const totalSameRoomTime = 1 + countOverlappingDraftRoomBookings(item.roomId, item.startTime, service.duration, item.tempId);

            if (totalSameRoomTime < minBookingCapacity) {
                return {
                    valid: false,
                    message: `${room.name} hanya bisa dibooking untuk minimal ${minBookingCapacity} orang. Tambahkan tamu lain di ruangan dan jam yang sama.`
                };
            }

            if (totalSameRoomTime > roomCapacity) {
                return {
                    valid: false,
                    message: `${room.name} maksimal untuk ${roomCapacity} orang pada jam yang sama.`
                };
            }
        }

        return { valid: true, message: '' };
    };
const [isRefunding, setIsRefunding] = useState(false);
    const [showItemCancelConfirm, setShowItemCancelConfirm] = useState(false);

    // Item Complete State
    const [itemToComplete, setItemToComplete] = useState<Guest | null>(null);
    const [showItemCompleteConfirm, setShowItemCompleteConfirm] = useState(false);

    // Fetch customer history when customerId changes
    useEffect(() => {
        const fetchHistory = async () => {
            if (formData.customerId) {
                setIsLoadingHistory(true);
                try {
                    const res = await api.getCustomerHistory(formData.customerId);
                    // Handle both paginated and flat array responses
                    setCustomerHistory(res.data || res.bookings || res.history || (Array.isArray(res) ? res : []));
                } catch (e) {
                    console.error("Failed to fetch customer history", e);
                } finally {
                    setIsLoadingHistory(false);
                }
            } else {
                setCustomerHistory([]);
            }
        };
        fetchHistory();
    }, [formData.customerId]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [editedNotes, setEditedNotes] = useState('');
    const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);

    // Auto dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Generate Slots (Minutes)
    const SLOTS = useMemo(() => {
        const slots: number[] = [];
        const startM = startHour * 60;
        const endM = endHour * 60;
        for (let m = startM; m < endM; m += slotDuration) {
            slots.push(m);
        }
        return slots;
    }, [startHour, endHour, slotDuration]);

    const SLOT_HEIGHT = 76; // px per slot; keep short 10-15 minute calendar cards readable

    const toMin = (t: string) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const formatTimeSlot = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };


    // Customer Search Debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            const fetchCustomers = async () => {
                try {
                    // Only search if there is a query, providing a 'q' or 'search' param depends on API
                    // User requirements said "api.getCustomers with a search parameter".
                    // api.getCustomers uses params object which becomes query string.
                    const params = customerSearch ? { search: customerSearch } : {};
                    const res = await api.getCustomers(params);
                    setFilteredCustomers(Array.isArray(res) ? res : (res.data || []));
                } catch (error) {
                    console.error("Failed to search customers", error);
                }
            };
            fetchCustomers();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [customerSearch]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [isBlockingTime, setIsBlockingTime] = useState(false);
    const [blockReason, setBlockReason] = useState('');
const [blockStaffId, setBlockStaffId] = useState<number>(0);
const [blockStartTime, setBlockStartTime] = useState('');
const [blockEndTime, setBlockEndTime] = useState('');
const [editingBlockId, setEditingBlockId] = useState<number | null>(null);    // Booking Detail Modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [selectedGuestContext, setSelectedGuestContext] = useState<{ staffId: number; startTime: string } | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);


    const [showServicePopup, setShowServicePopup] = useState<{ guestIdx: number; tempId: string } | null>(null);
    const [serviceSearch, setServiceSearch] = useState('');

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);



    // Use weekStart for rendering the gri
    const weekDates = getWeekDates(currentDate, weekStart);

    const prevPeriod = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    };

    const nextPeriod = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    };

    const normalizeShifts = (rawShifts: any[]): StaffShift[] => {
        if (!Array.isArray(rawShifts)) return [];
        return rawShifts
            .map((shift: any) => ({
                staffId: Number(shift.staffId ?? shift.staff_id ?? shift.therapist_id),
                date: String(shift.date ?? shift.schedule_date ?? '').substring(0, 10),
                startTime: String(shift.startTime ?? shift.start_time ?? '').substring(0, 5),
                endTime: String(shift.endTime ?? shift.end_time ?? '').substring(0, 5),
            }))
            .filter(shift => shift.staffId && shift.date && shift.startTime && shift.endTime);
    };

    const mergeShifts = (incomingShifts: StaffShift[]) => {
        setShifts(prev => {
            const merged = new Map(prev.map(shift => [`${shift.staffId}-${shift.date}`, shift]));
            incomingShifts.forEach(shift => merged.set(`${shift.staffId}-${shift.date}`, shift));
            return Array.from(merged.values());
        });
    };

    const getShift = (staffId: number, date: Date) => shifts.find(s => Number(s.staffId) === Number(staffId) && s.date === formatDateInput(date));

    const getShiftByDateString = (staffId: number, dateStr: string) => shifts.find(s => Number(s.staffId) === Number(staffId) && s.date === dateStr);

    useEffect(() => {
        if (!showRescheduleModal || !rescheduleModalData || !selectedBranchId || Number(selectedBranchId) === 0) return;

        const { selectedStaffId, selectedDate } = rescheduleModalData;
        if (!selectedStaffId || !selectedDate) return;
        if (getShiftByDateString(selectedStaffId, selectedDate)) return;
        const fetchKey = `${selectedBranchId}-${selectedStaffId}-${selectedDate}`;
        if (rescheduleShiftFetchKeys.current.has(fetchKey)) return;

        let cancelled = false;
        rescheduleShiftFetchKeys.current.add(fetchKey);

        const fetchSelectedDateShift = async () => {
            try {
                const response = await api.getTherapistSchedule({
                    branch_id: selectedBranchId,
                    start_date: selectedDate,
                    end_date: selectedDate
                });
                if (cancelled) return;

                const fetchedShifts = normalizeShifts(response?.data || (Array.isArray(response) ? response : []));
                mergeShifts(fetchedShifts);
            } catch (error) {
                console.error('Failed to fetch selected therapist shift', error);
            }
        };

        fetchSelectedDateShift();

        return () => {
            cancelled = true;
        };
    }, [showRescheduleModal, rescheduleModalData?.selectedDate, rescheduleModalData?.selectedStaffId, selectedBranchId, shifts]);

    // const dummyShifts = generateShifts(); // REMOVED

    const getSlotStatus = (staffId: number, date: Date, timeMin: number): 'available' | 'booked' | 'blocked' | 'no-shift' => {
         const staffData = staffList.find(s => s.id === staffId);
    if (staffData && ((staffData as any).is_calendar_enabled === 0 || (staffData as any).is_calendar_enabled === false)) {
        return 'no-shift';
    }
        if (!isStaffActiveOn(staffId, date)) return 'no-shift';

        // Block past times
        const now = new Date();
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkDate < today) return 'no-shift';
        if (checkDate.getTime() === today.getTime()) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            if (timeMin < currentMinutes) return 'no-shift';
        }

        const shift = getShift(staffId, date);

        // Default from Calendar Settings 
        const defaultStart = `${startHour.toString().padStart(2, '0')}:00`;
        const defaultEnd = `${endHour.toString().padStart(2, '0')}:00`;

        let shiftStartMin = toMin(defaultStart);
        let shiftEndMin = toMin(defaultEnd);

        if (shift) {
            shiftStartMin = toMin(shift.startTime);
            shiftEndMin = toMin(shift.endTime);
        }

        if (timeMin < shiftStartMin || timeMin >= shiftEndMin) return 'no-shift';

        const dateStr = formatDateInput(date);
        const slotEndMin = timeMin + slotDuration;

     const booking = bookings.find(b => {
    if (b.date !== dateStr) return false;
    if (editingBooking && b.id === editingBooking.id) return false;
    if (b.status === 'cancelled') return false;

    // Cek apakah staff ini terlibat dalam booking ini
    const rawGuests = b.guests || [];
    const guests = Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests);

    // If booking is refunded, only skip if ALL guests are refunded
    if (b.status === 'refunded') {
        if (guests.length === 0) return false;
        if ((guests as any[]).every((g: any) => g.status === 'refunded')) return false;
    }

    const staffInvolved = Number(b.staffId) === Number(staffId) ||
        (guests as any[]).some((g: any) => Number(g.staffId) === Number(staffId) && g.status !== 'refunded');
    if (!staffInvolved) return false;

    const bStartMin = toMin(b.start);
    // Untuk grup booking, cek startTime per guest yang relevan
    if (guests.length > 0) {
        const relevantGuests = (guests as any[]).filter((g: any) => Number(g.staffId) === Number(staffId) && g.status !== 'refunded');
        if (relevantGuests.length > 0) {
            return relevantGuests.some((g: any) => {
                const gStart = toMin(g.startTime || b.start);
                const gEnd = gStart + (g.serviceDuration || 60);
                return gStart < slotEndMin && gEnd > timeMin;
            });
        }
    }

    const bEndMin = bStartMin + b.duration;
    return (bStartMin < slotEndMin && bEndMin > timeMin);
});
        if (booking) return booking.isBlocked ? 'blocked' : 'booked';
        return 'available';
    };

    const getBookingAt = (staffId: number, date: Date, timeMin: number) => {
    const dateStr = formatDateInput(date);
    return bookings.find(b => {
        if (b.date !== dateStr) return false;
        if (editingBooking && b.id === editingBooking.id) return false;
        if (b.status === 'cancelled') return false;

        const rawGuests = b.guests || [];
        const guests = Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests);

        // If booking is refunded, only skip if ALL guests are refunded
        if (b.status === 'refunded') {
            if (guests.length === 0) return false;
            if ((guests as any[]).every((g: any) => g.status === 'refunded')) return false;
        }

        const staffInvolved = Number(b.staffId) === Number(staffId) ||
            (guests as any[]).some((g: any) => Number(g.staffId) === Number(staffId) && g.status !== 'refunded');
        if (!staffInvolved) return false;

        // Untuk grup booking, cek per guest yang relevan
        if (guests.length > 0) {
            const relevantGuests = (guests as any[]).filter((g: any) => Number(g.staffId) === Number(staffId) && g.status !== 'refunded');
            if (relevantGuests.length > 0) {
                return relevantGuests.some((g: any) => {
                    const gStart = toMin(g.startTime || b.start);
                    return gStart >= timeMin && gStart < timeMin + slotDuration;
                });
            }
        }

        const bStartMin = toMin(b.start);
        return bStartMin >= timeMin && bStartMin < timeMin + slotDuration;
    });
};

    const handleSlotClick = (staffId: number, date: Date, timeMin: number) => {
        if (!selectedBranchId || Number(selectedBranchId) === 0) {
            setToast({ message: 'Harap pilih cabang terlebih dahulu sebelum membuat reservasi', type: 'error' });
            return;
        }
        if (!isStaffActiveOn(staffId, date)) {
            setToast({ message: 'Terapis ini sudah tidak aktif pada tanggal yang dipilih', type: 'error' });
            return;
        }
        const status = getSlotStatus(staffId, date, timeMin);
        if (status !== 'available') return;


        const dateStr = formatDateInput(date);
        const timeStr = formatTimeSlot(timeMin);

        // Blocking Time
      if (isBlockingTime) {
    setBlockStaffId(staffId);
    setBlockStartTime(timeStr);
    setBlockEndTime('');
    setSelectedSlot({ staffId, date: dateStr, time: timeStr });
    setShowBookingModal(true);
    return;
}

        // Reschedule Item Logic
        // if (rescheduleItemTarget) {
        //     const { bookingId, item } = rescheduleItemTarget;
        //     const duration = item.serviceDuration || 60; // fallback

        //     const overlap = checkBookingOverlap(staffId, dateStr, timeStr, duration);
        //     if (overlap.hasOverlap) {
        //         setToast({ message: "Jadwal bentrok dengan booking lain", type: 'error' });
        //         return;
        //     }

        //     // Show Confirmation Modal instead of window.confirm
        //     setRescheduleConfirmData({
        //         staffId,
        //         dateStr,
        //         timeStr,
        //         bookingId,
        //         item
        //     });
        //     return;
        // }

        setSelectedSlot({ staffId, date: dateStr, time: timeStr });

        if (editingBooking) {
            // Populate items from editingBooking but with NEW slot info (staffId and time)
            const items: ManualBookingItem[] = [];
            let runningTime = timeStr;

            if (editingBooking.items && editingBooking.items.length > 0) {
                // Tracking unique guests to assign guestIndex
                const guestMap = new Map<string, number>();
                // The main customer is ALWAYS index 0
                const mainKey = `${(editingBooking.customer || '').toLowerCase().trim()}-${(editingBooking.customerPhone || '').toLowerCase().trim()}`;
                guestMap.set(mainKey, 0);

                editingBooking.items.forEach((it: any) => {
                    const srv = services.find(s => s.id === it.service_id);
                    const duration = srv ? (srv.duration || 60) : (it.duration || 60);
                    const requiresRoom = serviceRequiresRoom(srv);

                    // Determine guestIndex for this item
                    const itName = it.guest_name || editingBooking.customer || '';
                    const itPhone = it.guest_phone || editingBooking.customerPhone || '';
                    const itKey = `${itName.toLowerCase().trim()}-${itPhone.toLowerCase().trim()}`;

                    if (!guestMap.has(itKey)) {
                        guestMap.set(itKey, guestMap.size);
                    }
                    const gIdx = guestMap.get(itKey) || 0;

                    items.push({
                        tempId: Math.random().toString(36).substr(2, 9),
                        serviceId: it.service_id,
                        staffId: staffId, // New Staff ID
                        roomId: requiresRoom ? (it.room_id || null) : null, // Keep original room preference only if service needs room
                        startTime: runningTime,
                        guestIndex: gIdx,
                        guestName: it.guest_name,
                        guestPhone: it.guest_phone,
                        guestType: it.guest_type,
                        guestAge: it.guest_age
                    });

                    // Increment running time for next service
                    const [h, m] = runningTime.split(':').map(Number);
                    const totalMins = h * 60 + m + duration;
                    const rh = Math.floor(totalMins / 60);
                    const rm = totalMins % 60;
                    runningTime = `${rh.toString().padStart(2, '0')}:${rm.toString().padStart(2, '0')}`;
                    // Note: Here we update our local runningTime for sequential calculation if needed, 
                    // though for 'moved' bookings usually they might have had specific times.
                    // But usually the form recalculates or allows edit.
                });
            } else {
                // Legacy/Single service booking
                let sId = editingBooking.serviceId || editingBooking.service_id;
                // If ID missing, try to find by name
                if (!sId && editingBooking.service) {
                    const found = services.find(s => s.name === editingBooking.service);
                    if (found) sId = found.id;
                }

                items.push({
                    tempId: Math.random().toString(36).substr(2, 9),
                    serviceId: sId || 0,
                    staffId: staffId,
                    roomId: serviceRequiresRoom(services.find(s => s.id === sId)) ? (editingBooking.roomId || editingBooking.room_id || null) : null,
                    startTime: timeStr,
                    guestIndex: 0
                });
            }

            setBookingItems(items);
            setCustomerSearch(editingBooking.customer);

            setFormData({
                serviceIds: items.map(i => i.serviceId),
                roomIds: items.map(i => i.roomId),
                customerId: editingBooking.user_id || null,
                roomId: items[0]?.roomId || null,
                notes: editingBooking.notes || ''
            });

            setBookingStep(isRescheduleMode ? 3 : (editingBooking ? 2 : 1));
        } else {
            setFormData({ serviceIds: [], roomIds: [], customerId: null, roomId: null, notes: '' });
            setBookingItems([]);
            setCustomerSearch('');
            setBookingStep(1);
        }

        setShowSuccess(false);

        setShowBookingModal(true);
    };



    const checkBookingOverlap = (staffId: number, dateStr: string, startTime: string, duration: number): { hasOverlap: boolean; conflictingBooking?: Booking } => {
        const [startH, startM] = startTime.split(':').map(Number);
        const newStartMinutes = startH * 60 + startM;
        const newEndMinutes = newStartMinutes + duration;

        const conflicting = bookings.find(b => {
            if (b.staffId !== staffId || b.date !== dateStr) return false;
            // Abaikan booking yang sedang diubah
            if (editingBooking && b.id === editingBooking.id) return false;

            // Ignore reschedule source booking item if it's the same
            if (rescheduleItemTarget && b.id === rescheduleItemTarget.bookingId && b.staffId === staffId) return false;

            const bStart = b.start;
            const [bH, bM] = bStart.split(':').map(Number);
            const bStartMinutes = bH * 60 + bM;
            const bEndMinutes = bStartMinutes + b.duration;

            // Check if ranges overlap
            return (newStartMinutes < bEndMinutes && newEndMinutes > bStartMinutes);
        });

        return { hasOverlap: !!conflicting, conflictingBooking: conflicting };
    };

    const checkRoomOverlap = (roomId: number, dateStr: string, startTime: string, duration: number): { hasOverlap: boolean; conflictingBooking?: Booking; usedCount: number; capacity: number } => {
        if (!roomId) return { hasOverlap: false, usedCount: 0, capacity: 0 };
        const [startH, startM] = startTime.split(':').map(Number);
        const newStartMinutes = startH * 60 + startM;
        const newEndMinutes = newStartMinutes + duration;
        const room = rooms.find(r => r.id === roomId);
        const roomCapacity = getRoomCapacity(room);

        const hasScheduledBlock = room?.blocks?.some(block => {
            if (block.is_active === false) return false;
            const blockStartDate = String(block.start_date).slice(0, 10);
            const blockEndDate = String(block.end_date).slice(0, 10);
            if (dateStr < blockStartDate || dateStr > blockEndDate) return false;

            const blockStartMinutes = toMin(String(block.start_time).slice(0, 5));
            const blockEndMinutes = toMin(String(block.end_time).slice(0, 5));
            return blockStartMinutes < newEndMinutes && blockEndMinutes > newStartMinutes;
        });

        if (hasScheduledBlock) return { hasOverlap: true, usedCount: roomCapacity, capacity: roomCapacity };

        let usedCount = 0;
        let firstConflict: Booking | undefined;
        const countedRoomUsageKeys = new Set<string>();

        bookings.forEach(b => {
            if (b.date !== dateStr) return false;
            // Mode Pindah/Reschedule: Abaikan booking yang dsedang dipindah agar bisa overlap dengan posisi aslinya
            if (editingBooking && b.id === editingBooking.id) return false;

            // Show all bookings (including unpaid) - only filter out cancelled
            if (b.status === 'cancelled') return false;

            const overlappingGuestCount = (b.guests || []).filter(g => {
                if (g.roomId !== roomId) return false;
                const guestStartMin = toMin(g.startTime || b.start);
                const guestEndMin = guestStartMin + Number(g.serviceDuration || b.duration || duration);
                if (!(guestStartMin < newEndMinutes && guestEndMin > newStartMinutes)) return false;

                const usageKey = `guest-${g.id || `${b.id}-${g.staffId}-${g.roomId}-${g.startTime}-${g.serviceId}`}`;
                if (countedRoomUsageKeys.has(usageKey)) return false;
                countedRoomUsageKeys.add(usageKey);

                return true;
            }).length;

            if (overlappingGuestCount > 0) {
                usedCount += overlappingGuestCount;
                if (!firstConflict) firstConflict = b;
                return;
            }

            if (b.roomId !== roomId) return false;

            const bStartMin = toMin(b.start);
            const bEndMin = bStartMin + b.duration;
            if (bStartMin < newEndMinutes && bEndMin > newStartMinutes) {
                const usageKey = `booking-${b.id}`;
                if (countedRoomUsageKeys.has(usageKey)) return false;
                countedRoomUsageKeys.add(usageKey);
                usedCount += 1;
                if (!firstConflict) firstConflict = b;
            }
        });

        return { hasOverlap: usedCount >= roomCapacity, conflictingBooking: firstConflict, usedCount, capacity: roomCapacity };
    };



    const handleCompleteItem = (guest: Guest) => {
        if (!selectedBooking) return;
        setItemToComplete(guest);
        setShowItemCompleteConfirm(true);
    };

    const confirmCompleteItem = async () => {
        if (!selectedBooking || !itemToComplete) return;

        try {
            await api.completeBookingItem(selectedBooking.id, itemToComplete.id);
            setToast({ message: "Item selesai", type: 'success' });

            // Refresh
            const bookingsRes = await api.getCalendar({ branch_id: selectedBranchId, date: formatDateInput(currentDate), view: 'day' });
            setBookings(bookingsRes.bookings || []);

            const updated = bookingsRes.bookings.find((b: any) => b.id === selectedBooking.id);
            if (updated) setSelectedBooking(updated);
            else {
                closeDetailModal();
            }

        } catch (e) {
            console.error(e);
            setToast({ message: "Gagal menyelesaikan item", type: 'error' });
        } finally {
            setShowItemCompleteConfirm(false);
            setItemToComplete(null);
        }
    };

    const handleConfirmReschedule = async () => {
        if (!rescheduleConfirmData) return;
        const { staffId, dateStr, timeStr, bookingId, item } = rescheduleConfirmData;

        try {
            await api.rescheduleBookingItem(bookingId, item.id, {
                booking_date: dateStr,
                start_time: timeStr,
                therapist_id: staffId,
                reason: '-'
            });

            setToast({ message: 'Item berhasil dipindah', type: 'success' });
            setRescheduleItemTarget(null);
            setViewMode('day'); // Switch to day view after reschedule
            setCurrentDate(new Date(dateStr)); // Navigate to the target date

            // Refresh
            const bRes = await api.getCalendar({ branch_id: selectedBranchId, date: dateStr, view: 'day' });
            setBookings(bRes.bookings || []);
        } catch (e: any) {
            console.error(e);
            setToast({ message: e.message || "Gagal memindah item", type: 'error' });
        } finally {
            setRescheduleConfirmData(null);
        }
    };

    const cancelItem = (guest: Guest) => {
        setItemToCancel(guest);
        setShowItemCancelConfirm(true);
    };

    const confirmCancelItem = async () => {
        if (!selectedBooking || !itemToCancel) return;

        try {
            await api.cancelBookingItem(selectedBooking.id, itemToCancel.id);
            setToast({ message: "Item dibatalkan", type: 'success' });

            // Refresh
            const bookingsRes = await api.getCalendar({ branch_id: selectedBranchId, date: formatDateInput(currentDate), view: 'day' });
            setBookings(bookingsRes.bookings || []);

            const updated = bookingsRes.bookings.find((b: any) => b.id === selectedBooking.id);
            if (updated) setSelectedBooking(updated);
            else {
                closeDetailModal(); // If booking totally gone
            }

        } catch (e) {
            console.error(e);
            setToast({ message: "Gagal membatalkan item", type: 'error' });
        } finally {
            setShowItemCancelConfirm(false);
            setItemToCancel(null);
        }
    };
    
   const confirmRefundItem = async () => {
    if (!selectedBooking || !itemToRefund) return;

    const amount = parseFloat(refundForm.amount);
    const maxAmount = Number(itemToRefund.servicePrice || 0) + Number(itemToRefund.roomPrice || 0);

    if (!amount || amount <= 0) {
        setToast({ message: 'Nominal refund harus lebih dari 0', type: 'error' });
        return;
    }
    if (amount > maxAmount) {
        setToast({ message: `Maksimal refund item ini Rp ${maxAmount.toLocaleString('id-ID')}`, type: 'error' });
        return;
    }

    setIsRefunding(true);
    try {
        await api.refundBookingItem(selectedBooking.id, itemToRefund.id, {
            refund_amount: amount,
            refund_method: refundForm.method,
            reason: refundForm.reason || 'Refund oleh admin',
        });

        setToast({ message: 'Refund berhasil diproses', type: 'success' });
        setShowRefundModal(false);
        setItemToRefund(null);

        const bookingsRes = await api.getCalendar({
            branch_id: selectedBranchId,
            date: formatDateInput(currentDate),
            view: 'day'
        });
  const refreshedBookings = (bookingsRes.bookings || []).filter((b: any) => {
    if (b.isBlocked || b.is_blocked) return true;
    if (b.status === 'cancelled') {
        if (b.refundAmount > 0 || b.refund_amount > 0) return true;
        return false;
    }
    return true;
});
        setBookings(refreshedBookings);

        const updated = refreshedBookings.find((b: any) => b.id === selectedBooking.id);
        if (updated) setSelectedBooking(updated);
        else closeDetailModal();

    } catch (e: any) {
        setToast({ message: e.message || 'Gagal memproses refund', type: 'error' });
    } finally {
        setIsRefunding(false);
    }
};

  const startRescheduleItem = (guest: Guest) => {
    if (!selectedBooking) return;
    setRescheduleModalData({
        bookingId: selectedBooking.id,
        item: guest,
        selectedDate: selectedBooking.date || formatDateInput(new Date()),
        selectedStaffId: guest.staffId || selectedBooking.staffId,
        selectedTime: guest.startTime || selectedBooking.start,
    });
    setShowRescheduleModal(true);
};

const handleConfirmRescheduleModal = async () => {
    if (!rescheduleModalData) return;
    const { bookingId, item, selectedDate, selectedStaffId, selectedTime } = rescheduleModalData;
    if (!selectedTime) {
        setToast({ message: 'Pilih jam terlebih dahulu', type: 'error' });
        return;
    }
    try {
        await api.rescheduleBookingItem(bookingId, item.id, {
            booking_date: selectedDate,
            start_time: selectedTime,
            therapist_id: selectedStaffId,
            reason: '-',
        });
        setToast({ message: 'Item berhasil dipindah!', type: 'success' });
        setShowRescheduleModal(false);
        setRescheduleModalData(null);

        // Refresh di tanggal yang sedang ditampilkan (bukan selectedDate)
        // karena booking utama tidak pindah booking_date-nya
        const refreshDate = formatDateInput(currentDate);
        const bRes = await api.getCalendar({
            branch_id: selectedBranchId,
            date: refreshDate,
            view: 'day'
        });
        setBookings(bRes.bookings || []);

        // Update detail modal kalau masih terbuka
        const updated = (bRes.bookings || []).find((b: any) => b.id === bookingId);
        if (updated) setSelectedBooking(updated);
        else closeDetailModal();

    } catch (e: any) {
        setToast({ message: e.message || 'Gagal memindah item', type: 'error' });
    }
};

  const handleSubmitBooking = async (proceedToCheckout = false) => {
    if (!selectedSlot) return;

    // VALIDASI TAMU
    if (!isBlockingTime) {
        let hasError = false;
        let errorMessage = '';

        for (const item of bookingItems) {
            if (item.guestIndex !== 0) {
                if (!item.guestName || item.guestName.trim() === '') {
                    hasError = true;
                    errorMessage = `Nama untuk Tamu ${item.guestIndex + 1} wajib diisi.`;
                    break;
                }
                if (item.guestType === 'anak') {
                    if (!item.guestAge || item.guestAge.toString().trim() === '') {
                        hasError = true;
                        errorMessage = `Usia untuk Tamu ${item.guestIndex + 1} wajib diisi.`;
                        break;
                    }
                } else {
                    if (!item.guestPhone || item.guestPhone.toString().trim() === '') {
                        hasError = true;
                        errorMessage = `Nomor WhatsApp untuk Tamu ${item.guestIndex + 1} wajib diisi.`;
                        break;
                    }
                }
            }
        }

        if (hasError) {
            setToast({ message: errorMessage, type: 'error' });
            return;
        }

        const roomRuleValidation = validateRoomBookingRules();
        if (!roomRuleValidation.valid) {
            setToast({ message: roomRuleValidation.message, type: 'error' });
            return;
        }
    }

    setIsSubmitting(true);

    try {
        // BLOCKING TIME LOGIC
        if (isBlockingTime) {
            const [sh, sm] = blockStartTime.split(':').map(Number);
            const [eh, em] = blockEndTime.split(':').map(Number);
            const blockDuration = (eh * 60 + em) - (sh * 60 + sm);

            if (blockDuration <= 0) {
                setToast({ message: 'Jam berakhir harus setelah jam mulai', type: 'error' });
                setIsSubmitting(false);
                return;
            }

            const payload = {
                branch_id: selectedBranchId,
                therapist_id: blockStaffId,
                booking_date: selectedSlot.date,
                start_time: blockStartTime,
                is_blocked: true,
                block_reason: blockReason || 'Busy',
                duration: blockDuration
            };

            if (editingBlockId) {
                await api.updateBooking(editingBlockId, payload);
            } else {
                await api.createBooking(payload);
            }
        }
        // EDIT EXISTING BOOKING
        else if (editingBooking) {
            const firstItem = bookingItems[0];
            const newStaffId = firstItem ? firstItem.staffId : selectedSlot.staffId;
            const newStartTime = firstItem ? firstItem.startTime : selectedSlot.time;
            const firstRoomItem = bookingItems.find(i => getItemRoomId(i));

            const selectedCustomer = customers.find(c => c.id === formData.customerId);
            const mainName = selectedCustomer?.name || customerSearch.trim() || 'Guest';
            const mainPhone = selectedCustomer?.phone || '';
            const { grandTotal } = getBookingItemsTotals(bookingItems);
            const paidAmount = getPaidAmountForEditingBooking();
            const isUnpaidBooking = editingBooking.paymentStatus === 'unpaid' || (editingBooking.paymentStatus as string) === 'pending';
            const payableAmount = isUnpaidBooking ? grandTotal : Math.max(0, grandTotal - paidAmount);

            const payload = {
                branch_id: selectedBranchId,
                therapist_id: newStaffId,
                booking_date: selectedSlot.date,
                start_time: newStartTime,
                service_ids: bookingItems.map(i => i.serviceId),
                variant_ids: bookingItems.map(i => i.variantId || null),
                room_ids: bookingItems.map(i => getItemRoomId(i)),
                therapist_ids: bookingItems.map(i => i.staffId),
                start_times: bookingItems.map(i => i.startTime),
                guest_names: bookingItems.map(i => i.guestIndex === 0 ? mainName : (i.guestName || null)),
                guest_phones: bookingItems.map(i => i.guestIndex === 0 ? mainPhone : (i.guestPhone || null)),
                guest_types: bookingItems.map(i => i.guestType || 'dewasa'),
                guest_ages: bookingItems.map(i => i.guestAge || null),
                user_id: formData.customerId,
                guest_name: !formData.customerId ? mainName : undefined,
                room_id: firstRoomItem ? getItemRoomId(firstRoomItem) : null,
                guest_count: new Set(bookingItems.map(i => `${i.guestName || 'Guest'}-${i.guestPhone || ''}`.toLowerCase().trim())).size,
                notes: formData.notes
            };
            await api.updateBooking(editingBooking.id, payload);

            if (proceedToCheckout && payableAmount > 0) {
                const firstBillableItem = bookingItems.find(i => i.serviceId > 0) || firstItem;
                const service = firstBillableItem ? services.find(s => s.id === firstBillableItem.serviceId) : null;
                const variant = firstBillableItem?.variantId ? service?.variants?.find(v => v.id === firstBillableItem.variantId) : null;
                const staff = firstBillableItem ? staffList.find(s => s.id === firstBillableItem.staffId) : null;

                const checkoutData = {
                    bookingId: editingBooking.id,
                    bookingIds: [editingBooking.id],
                    customer: selectedCustomer || { id: formData.customerId, name: mainName, phone: mainPhone },
                    services: [{
                        id: firstBillableItem?.variantId || firstBillableItem?.serviceId || editingBooking.serviceId || 0,
                        name: isUnpaidBooking
                            ? (variant ? `${service?.name || 'Layanan'} - ${variant.name}` : (service?.name || editingBooking.service || 'Layanan'))
                            : `Kekurangan ${variant ? `${service?.name || 'Layanan'} - ${variant.name}` : (service?.name || editingBooking.service || 'Layanan')}`,
                        price: payableAmount,
                        staff: {
                            id: firstBillableItem?.staffId || newStaffId,
                            name: staff?.name || staffList.find(s => s.id === newStaffId)?.name || 'Staff'
                        }
                    }],
                    room_ids: [],
                    date: selectedSlot.date,
                    time: newStartTime,
                    total: payableAmount,
                    paid: paidAmount,
                    dp: paidAmount,
                    isSettlement: paidAmount > 0,
                    notes: `${formData.notes || ''}${formData.notes ? ' | ' : ''}${isUnpaidBooking ? 'Pembayaran booking setelah ubah agenda' : `Pembayaran kekurangan ubah agenda dari Rp ${paidAmount.toLocaleString('id-ID')} ke Rp ${grandTotal.toLocaleString('id-ID')}`}`,
                    staff: { id: newStaffId, name: staffList.find(s => s.id === newStaffId)?.name || 'Staff' }
                };

                setIsSubmitting(false);
                closeModal();
                navigate('/pos', { state: { bookingData: checkoutData } });
                return;
            }

            setEditingBooking(null);
            setViewMode('day');
            if (selectedSlot?.date) {
                setCurrentDate(new Date(selectedSlot.date));
            }
        }
        // CREATE NEW BOOKING (Multiple Items)
        else {
            const firstItem = bookingItems[0];
            if (!firstItem) {
                setIsSubmitting(false);
                return;
            }
            const firstRoomItem = bookingItems.find(i => getItemRoomId(i));

            const selectedCustomer = customers.find(c => c.id === formData.customerId);
            const mainName = selectedCustomer?.name || customerSearch.trim() || 'Guest';
            const mainPhone = selectedCustomer?.phone || '';

            const payload = {
                branch_id: selectedBranchId,
                therapist_id: firstItem.staffId,
                booking_date: selectedSlot.date,
                start_time: firstItem.startTime,
                service_ids: bookingItems.map(i => i.serviceId),
                variant_ids: bookingItems.map(i => i.variantId || null),
                room_ids: bookingItems.map(i => getItemRoomId(i)),
                therapist_ids: bookingItems.map(i => i.staffId),
                start_times: bookingItems.map(i => i.startTime),
                guest_names: bookingItems.map(i => i.guestIndex === 0 ? mainName : (i.guestName || null)),
                guest_phones: bookingItems.map(i => i.guestIndex === 0 ? mainPhone : (i.guestPhone || null)),
                guest_types: bookingItems.map(i => i.guestType || 'dewasa'),
                guest_ages: bookingItems.map(i => i.guestAge || null),
                user_id: formData.customerId,
                guest_name: !formData.customerId ? mainName : undefined,
                room_id: firstRoomItem ? getItemRoomId(firstRoomItem) : null,
                guest_count: new Set(bookingItems.map(i => `${i.guestName || 'Guest'}-${i.guestPhone || ''}`.toLowerCase().trim())).size,
                notes: formData.notes
            };

            const response = await api.createBooking(payload);
            const responses = [response];

            if (proceedToCheckout) {
                const lastBooking = responses[responses.length - 1].booking || responses[responses.length - 1];

                const selectedServices = services.filter(s => bookingItems.map(bi => bi.serviceId).includes(s.id));
                const customer = customers.find(c => c.id === formData.customerId);
                const firstCheckoutRoomId = getItemRoomId(bookingItems[0]);
                const room = firstCheckoutRoomId ? rooms.find(r => r.id === firstCheckoutRoomId) : undefined;
                const staff = staffList.find(s => s.id === bookingItems[0].staffId);

                const totalServicePrice = bookingItems.reduce((sum, bi) => {
                    const svc = services.find(s => s.id === bi.serviceId);
                    if (!svc) return sum;
                    const v = bi.variantId ? svc.variants?.find(vx => vx.id === bi.variantId) : null;
                    return sum + getEffectivePrice(svc, v);
                }, 0);
                const totalRoomCharge = getBookingItemsRoomTotal(bookingItems);

                const checkoutData = {
                    bookingId: lastBooking.id,
                    customer: customer,
                    services: bookingItems.map(bi => {
                        const svc = services.find(s => s.id === bi.serviceId);
                        const v = bi.variantId ? svc?.variants?.find(vx => vx.id === bi.variantId) : null;
                        const staff = staffList.find(s => s.id === bi.staffId);
                        return {
                            id: bi.serviceId,
                            name: svc ? svc.name : 'Service',
                            price: svc ? getEffectivePrice(svc, v) : 0,
                            staff: { id: bi.staffId, name: staff ? staff.name : 'Staff' }
                        };
                    }),
                    room: room,
                    room_ids: bookingItems.map(i => getItemRoomId(i)),
                    room_charges: getBookingItemsRoomCharges(bookingItems),
                    staff: staff,
                    date: selectedSlot.date,
                    time: bookingItems[0].startTime,
                    total: totalServicePrice + totalRoomCharge,
                    notes: formData.notes,
                    bookingIds: responses.map(r => (r.booking?.id || r.id))
                };
                navigate('/pos', { state: { bookingData: checkoutData } });
            }
        }

        // Refresh bookings
        const targetDateStr = selectedSlot?.date || formatDateInput(currentDate);
        const bookingsRes = await api.getCalendar({
            branch_id: selectedBranchId,
            date: targetDateStr,
            view: 'day'
        });
        const fetchedBookings = bookingsRes.bookings || [];
        const formattedBookings = fetchedBookings
            .map((b: any) => ({
                ...b,
                staffId: Number(b.staffId || b.therapist_id),
                start: b.start || b.start_time || '',
                date: b.date || b.booking_date || '',
                isBlocked: b.isBlocked || b.is_blocked || false,
                blockReason: b.blockReason || b.block_reason || '',
                paymentStatus: b.paymentStatus || b.payment_status || 'unpaid',
                servicePrice: parseFloat(b.servicePrice || 0),
                roomPrice: parseFloat(b.roomPrice || 0),
                guestCount: parseInt(b.guestCount || 1)
            }))
            .filter((b: any) => {
                if (b.isBlocked || b.is_blocked) return true;
                if (b.status === 'cancelled') return false;
                const guests = b.guests ? (Array.isArray(b.guests) ? b.guests : Object.values(b.guests)) : [];
              
                return true;
            });
        setBookings(formattedBookings);

        if (isBlockingTime) {
            // Block time: langsung tutup modal dan tampilkan toast
            setToast({ message: editingBlockId ? 'Blokir waktu berhasil diperbarui' : 'Blokir waktu berhasil dibuat', type: 'success' });
            closeModal();
            setIsSubmitting(false);
            return;
        }

        setShowBookingModal(false);
        setFormData({ serviceIds: [], roomIds: [], customerId: null, roomId: null, notes: '' });
        setBookingItems([]);
        setSelectedSlot(null);
        setShowSuccess(true);
        setIsSubmitting(false);

    } catch (error: any) {
        console.error("Failed to create booking", error);
        const msg = error.message || 'Gagal membuat booking. Silakan coba lagi.';
        swal.error(msg);
        setIsSubmitting(false);
    }
};




    const closeModal = () => {
        setShowBookingModal(false);
        setSelectedSlot(null);
        setCustomerSearch('');

        setIsBlockingTime(false);
        setBlockReason('');
           setBlockStaffId(0);       // tambah
    setBlockStartTime('');    // tambah
    setBlockEndTime('');      // tambah
    setEditingBlockId(null);
        if (editingBooking) setEditingBooking(null);
        setIsRescheduleMode(false);
    };

    // Booking Detail Handlers
const openBookingDetail = (booking: Booking, guestContext?: { staffId: number; startTime: string }) => {
    if (booking.isBlocked) {
        openBlockEdit(booking);
        return;
    }
    setSelectedBooking(booking);
    setSelectedGuestContext(guestContext || null);
    setEditedNotes(booking.notes || '');
    
    // Parse guest notes dari JSON
    try {
        const parsed = booking.notes ? JSON.parse(booking.notes) : {};
        setGuestNotes(typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
    } catch {
        // Kalau bukan JSON (notes lama plain text), taruh di tamu 1
        setGuestNotes({ '0': booking.notes || '' });
    }
    
    setShowDetailModal(true);
};

const openBlockEdit = (booking: Booking) => {
    const startTime = booking.start || '';
    const duration = booking.duration || 60;
    const [sh, sm] = startTime.split(':').map(Number);
    const endMin = sh * 60 + sm + duration;
    const endH = Math.floor(endMin / 60).toString().padStart(2, '0');
    const endM = (endMin % 60).toString().padStart(2, '0');

    setEditingBlockId(booking.id);
    setIsBlockingTime(true);
    setBlockStaffId(Number(booking.staffId));
    setBlockStartTime(startTime);
    setBlockEndTime(`${endH}:${endM}`);
    setBlockReason(booking.blockReason || '');
    setSelectedSlot({ staffId: Number(booking.staffId), date: booking.date, time: startTime });
    setShowBookingModal(true);
};

    const handleEditAgenda = () => {
        if (!selectedBooking) return;
        setEditingBooking(selectedBooking);
        setIsRescheduleMode(false);

        const items: ManualBookingItem[] = [];
        const rawGuests = selectedBooking.guests || [];
        const guests = Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests);

        if (guests.length > 0) {
            const guestMap = new Map<string, number>();
            const mainKey = `${(selectedBooking.customer || '').toLowerCase().trim()}-${(selectedBooking.customerPhone || '').toLowerCase().trim()}`;
            guestMap.set(mainKey, 0);

            guests.forEach((g: any) => {
                const gName = g.name || selectedBooking.customer || '';
                const gPhone = g.phone || selectedBooking.customerPhone || '';
                const gKey = `${gName.toLowerCase().trim()}-${gPhone.toLowerCase().trim()}`;
                if (!guestMap.has(gKey)) guestMap.set(gKey, guestMap.size);

                items.push({
                    tempId: Math.random().toString(36).substr(2, 9),
                    serviceId: g.serviceId || 0,
                    staffId: g.staffId || selectedBooking.staffId,
                    roomId: g.roomId || null,
                    startTime: g.startTime || selectedBooking.start,
                    guestIndex: guestMap.get(gKey) || 0,
                    guestName: g.name,
                    guestPhone: g.phone,
                    guestType: g.type,
                    guestAge: g.age
                });
            });
        } else {
            items.push({
                tempId: Math.random().toString(36).substr(2, 9),
                serviceId: selectedBooking.serviceId || 0,
                staffId: selectedBooking.staffId,
                roomId: selectedBooking.roomId || null,
                startTime: selectedBooking.start,
                guestIndex: 0
            });
        }

        setBookingItems(items);
        setCustomerSearch(selectedBooking.customer);
        setFormData({
            serviceIds: items.map(i => i.serviceId),
            roomIds: items.map(i => i.roomId),
            customerId: selectedBooking.user_id || null,
            roomId: items[0]?.roomId || null,
            notes: selectedBooking.notes || ''
        });

        const bookingCustomer = customers.find(c => Number(c.id) === Number(selectedBooking.user_id));
        setEditAgendaPriceType(
            bookingCustomer?.member || bookingCustomer?.is_member || bookingCustomer?.status === 'vip' || bookingCustomer?.status === 'loyal'
                ? 'member'
                : 'non_member'
        );

        setSelectedSlot({
            staffId: items[0].staffId,
            date: selectedBooking.date,
            time: items[0].startTime
        });

        closeDetailModal();
        setBookingStep(2);
        setShowBookingModal(true);
    };

 const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedBooking(null);
    setSelectedGuestContext(null); // tambah ini
    setEditedNotes('');
    setIsEditingNotes(false);
    setShowCancelConfirm(false);
};

    useEffect(() => {
        if (showDetailModal || showBookingModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showDetailModal, showBookingModal]);

    const handleUpdateNotes = async () => {
        if (!selectedBooking) return;
        setIsUpdatingNotes(true);
        try {
            await api.updateBooking(selectedBooking.id, {
                notes: editedNotes
            });

            // local update in modal
            setSelectedBooking({
                ...selectedBooking,
                notes: editedNotes
            });

            // update in global bookings list
            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, notes: editedNotes } : b));

            setToast({ message: 'Catatan berhasil diperbarui', type: 'success' });
            setIsEditingNotes(false);
        } catch (error: any) {
            console.error("Failed to update notes", error);
            setToast({ message: error.message || 'Gagal memperbarui catatan', type: 'error' });
        } finally {
            setIsUpdatingNotes(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!selectedBooking) return;
        setIsSubmitting(true);
        try {
            await api.updateBookingStatus(selectedBooking.id, { status: 'cancelled' });
            // Refresh
            const dateStr = formatDateInput(currentDate);
            const bookingsRes = await api.getCalendar({ branch_id: selectedBranchId, date: dateStr, view: 'day' });
            setBookings(bookingsRes.bookings || []);
            closeDetailModal();
        } catch (error: any) {
            console.error("Failed to cancel", error);
            setToast({ message: error.message || 'Gagal membatalkan booking', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNoShowBooking = async () => {
        if (!selectedBooking) return;
        setIsSubmitting(true);
        try {
            await api.updateBookingStatus(selectedBooking.id, { status: 'no_show' });
            const dateStr = formatDateInput(currentDate);
            const bookingsRes = await api.getCalendar({ branch_id: selectedBranchId, date: dateStr, view: 'day' });
            setBookings(bookingsRes.bookings || []);
            setToast({ message: 'Booking ditandai sebagai Tidak Hadir', type: 'success' });
            closeDetailModal();
        } catch (error: any) {
            console.error("Failed to mark no show", error);
            setToast({ message: error.message || 'Gagal menandai tidak hadir', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const [completeModal, setCompleteModal] = useState({ show: false, loading: false });

    const handleCompleteBooking = () => {
        if (!selectedBooking) return;
        setCompleteModal({ show: true, loading: false });
    };

    const confirmCompleteBooking = async () => {
        if (!selectedBooking) return;
        setCompleteModal(prev => ({ ...prev, loading: true }));
        // setIsSubmitting(true); // Redundant if using local loading
        try {
            await api.updateBookingStatus(selectedBooking.id, { status: 'completed' });
            // Refresh
            const dateStr = formatDateInput(currentDate);
            const bookingsRes = await api.getCalendar({ branch_id: selectedBranchId, date: dateStr, view: 'day' });
            setBookings(bookingsRes.bookings || []);
            setToast({ message: 'Booking berhasil diselesaikan', type: 'success' });
            setCompleteModal({ show: false, loading: false });
            closeDetailModal();
        } catch (error: any) {
            console.error("Failed to complete", error);
            setToast({ message: error.message || 'Gagal menyelesaikan booking', type: 'error' });
            setCompleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    const getPaymentStatusBadge = (status?: string) => {
        switch (status) {
            case 'paid': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Lunas' };
            case 'partial': return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'DP' };
            case 'unpaid': return { bg: 'bg-orange-100', text: 'text-orange-700', label: '⏱️ Menunggu Bayar' };
            default: return { bg: 'bg-red-100', text: 'text-red-700', label: 'Belum Bayar' };
        }
    };

    const getItemRefundStatus = (booking: Booking, staffId?: number) => {
    const rawG = booking.guests || [];
    const gs = Array.isArray(rawG) ? rawG : Object.values(rawG);
    if (!gs.length) return false;
    const relevant = staffId
        ? (gs as any[]).filter((g: any) => Number(g.staffId) === Number(staffId))
        : gs as any[];
    return relevant.length > 0 && relevant.every((g: any) => g.status === 'refunded');
};



  const getStatusBadge = (status?: string, refundAmount?: number) => {
    if (refundAmount && refundAmount > 0) {
        return { bg: 'bg-orange-100', text: 'text-orange-700', label: '↩ Refund' };
    }
    switch (status) {
        case 'confirmed': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Dikonfirmasi' };
        case 'completed': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Selesai' };
        case 'cancelled': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Dibatalkan' };
        case 'no_show': return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Tidak Hadir' };
        default: return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' };
    }
};

    const selectedServices = services.filter(s => formData.serviceIds.includes(s.id));
    const selectedService = selectedServices.length > 0 ? {
        id: selectedServices[0].id,
        name: selectedServices.map(s => s.name).join(', '),
        price: selectedServices.reduce((sum, s) => sum + parseFloat(s.price.toString()), 0),
        duration: selectedServices.reduce((sum, s) => sum + s.duration, 0)
    } : null;

    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const selectedRoom = rooms.find(r => r.id === (formData.roomIds[0] || formData.roomId));

    // Helper: get effective price
    // Manual booking lama tetap pakai harga member kalau ada customer.
    // Khusus Ubah Agenda, harga dikontrol eksplisit oleh pilihan Member / Non Member.
    const hasSelectedCustomer = !!formData.customerId;
    const useMemberPrice = editingBooking && !isRescheduleMode
        ? editAgendaPriceType === 'member'
        : hasSelectedCustomer;
    const getEffectivePrice = (service: Service, variant?: ServiceVariant | null) => {
        if (useMemberPrice) {
            if (variant && variant.special_price && Number(variant.special_price) > 0) return Number(variant.special_price);
            if (!variant && service.special_price && Number(service.special_price) > 0) return Number(service.special_price);
        }
        return Number(variant ? variant.price : service.price);
    };

    const getManualItemEndTime = (item: ManualBookingItem) => {
        const service = services.find(srv => srv.id === item.serviceId);
        const variant = item.variantId ? service?.variants?.find(v => v.id === item.variantId) : null;
        const duration = Number(variant?.duration || service?.duration || 60);
        const [hours, minutes] = (item.startTime || '00:00').split(':').map(Number);
        const start = new Date(2000, 0, 1, hours || 0, minutes || 0);
        start.setMinutes(start.getMinutes() + duration);
        return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    };

    const getRoomChargeKey = (item: ManualBookingItem) => {
        const roomId = getItemRoomId(item);
        if (!roomId) return '';
        return `${roomId}|${item.startTime || ''}|${getManualItemEndTime(item)}`;
    };

    const getBookingItemsRoomTotal = (items: ManualBookingItem[]) => {
        return getBookingItemsRoomCharges(items).reduce((sum, charge) => sum + charge, 0);
    };

    const getBookingItemsRoomCharges = (items: ManualBookingItem[]) => {
        const chargedRoomSlots = new Set<string>();

        return items.map((item) => {
            const roomId = getItemRoomId(item);
            if (!roomId) return 0;

            const chargeKey = getRoomChargeKey(item);
            if (chargedRoomSlots.has(chargeKey)) return 0;
            chargedRoomSlots.add(chargeKey);

            const room = rooms.find(r => r.id === roomId);
            return Number(room?.price || room?.extra_charge || 0);
        });
    };

    const getBookingItemsTotals = (items: ManualBookingItem[]) => {
        const serviceTotal = items.reduce((acc, item) => {
            const service = services.find(srv => srv.id === item.serviceId);
            if (!service) return acc;
            const variant = item.variantId ? service.variants?.find(v => v.id === item.variantId) : null;
            return acc + getEffectivePrice(service, variant);
        }, 0);

        const roomTotal = getBookingItemsRoomTotal(items);

        return {
            serviceTotal,
            roomTotal,
            grandTotal: serviceTotal + roomTotal,
        };
    };

    const getManualItemDuration = (item: ManualBookingItem) => {
        const service = services.find(srv => srv.id === item.serviceId);
        const variant = item.variantId ? service?.variants?.find(v => v.id === item.variantId) : null;
        return Number(variant?.duration || service?.duration || 60);
    };

    const getPaidAmountForEditingBooking = () => {
        if (!editingBooking) return 0;
        const totalPaid = Number((editingBooking as any).totalPaid || 0);
        if (totalPaid > 0) return totalPaid;
        const oldTotal = Number(editingBooking.servicePrice || 0) + Number(editingBooking.roomPrice || 0);
        return editingBooking.paymentStatus === 'paid' ? oldTotal : 0;
    };

    const selectedStaff = staffList.find(s => s.id === selectedStaffId);
    // const selectedBranch = branches.find(b => b.id === selectedBranchId);
    const slotStaff = selectedSlot ? staffList.find(s => s.id === selectedSlot.staffId) : null;

    // filteredCustomers is now state


    const getWeekRangeText = () => {
        const s = weekDates[0], e = weekDates[6];
        return `${s.getDate().toString().padStart(2, '0')} ${MONTHS_SHORT[s.getMonth()]} - ${e.getDate().toString().padStart(2, '0')} ${MONTHS_SHORT[e.getMonth()]}, ${e.getFullYear()}`;
    };

    const formatDisplayDate = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

    // Get bookings for schedule view
    const getStaffBookings = (staffId: number, date: Date) => {
        const dateStr = formatDateInput(date);
        return bookings
            .filter(b => b.staffId === staffId && b.date === dateStr)
            .filter(b => !editingBooking || b.id !== editingBooking.id) // Hide being moved
            .sort((a, b) => a.start.localeCompare(b.start));
    };

    const getEndTime = (start: string, duration: number) => {
        const [h, m] = start.split(':').map(Number);
        const end = h * 60 + m + duration;
        return `${Math.floor(end / 60).toString().padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`;
    };

    // Calendar picker
    const getCalendarDays = (year: number, month: number) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];
        for (let i = firstDay - 1; i >= 0; i--) days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
        for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
        return days;
    };

    const handleCreateNewCustomer = async () => {
        if (!newCustomerForm.name || !newCustomerForm.phone) {
            setToast({ message: 'Nama dan No. Telepon wajib diisi', type: 'error' });
            return;
        }

        // Validate name (letters only)
        const nameRegex = /^[A-Za-z\s']+$/;
        if (!nameRegex.test(newCustomerForm.name)) {
            setToast({ message: 'Nama hanya boleh berisi huruf', type: 'error' });
            return;
        }

        // Validate phone (numbers only)
        const phoneRegex = /^[0-9]+$/;
        if (!phoneRegex.test(newCustomerForm.phone.replace(/[-\s+]/g, ''))) {
            setToast({ message: 'Nomor telepon harus berupa angka', type: 'error' });
            return;
        }

        setIsCreatingCustomer(true);
        try {
            const payload = {
                name: newCustomerForm.name,
                phone: newCustomerForm.phone,
                email: newCustomerForm.email || null,
                dob: newCustomerForm.dob || null,
                branch_id: selectedBranchId || null,
                registration_source: 'walk-in'
            };

            const response = await api.createCustomer(payload);

            // Refresh customers list
            const customersData = await api.getCustomers({ branch_id: selectedBranchId || undefined });
            const rawCustomers = Array.isArray(customersData) ? customersData : customersData.data || [];
            const formattedCustomers = rawCustomers.map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone || '',
                member: !!c.is_member || c.status === 'vip' || c.status === 'loyal'
            }));
            setCustomers(formattedCustomers);

            // Re-filter if needed, but optimally just append
            // For now, let's just trigger a re-filter by updating customers

            // Auto-select the new customer
            const newCustomer = response?.customer || response;
            if (newCustomer && newCustomer.id) {
                setFormData(p => ({ ...p, customerId: newCustomer.id }));
                setCustomerSearch(newCustomer.name);
            }

            setShowNewCustomerModal(false);
            setNewCustomerForm({ name: '', phone: '', email: '', dob: '' });
            setToast({ message: 'Pelanggan baru berhasil ditambahkan', type: 'success' });
        } catch (error: any) {
            console.error('Failed to create customer:', error);
            setToast({ message: error?.message || 'Gagal menambahkan pelanggan', type: 'error' });
        } finally {
            setIsCreatingCustomer(false);
        }
    };
    const calendarDays = getCalendarDays(currentDate.getFullYear(), currentDate.getMonth());

  const renderScheduleView = () => (
    <div className="space-y-3 w-full">
        <div className="bg-white rounded-xl border border-gray-200 overflow-auto relative shadow-sm" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="min-w-max">
                {/* Staff Header */}
              <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-30">

                    <div className="w-12 flex-shrink-0 p-2 border-r border-gray-200 text-[10px] text-gray-400 font-bold uppercase flex items-center justify-center sticky left-0 bg-gray-50 z-30">All</div>
                    {activeStaffList.map(s => (
                        <div key={s.id} className="w-[180px] flex-shrink-0 p-2 text-center border-r last:border-r-0">
                            <div className="flex items-center justify-center gap-2">
                                <div className={`w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}
                                    style={s.photo ? {} : (s.color?.startsWith('#') ? { backgroundColor: s.color } : {})}
                                >
                                    {s.photo ? (
                                        <img src={getImageUrl(s.photo)} alt={s.name} className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.classList.add((!s.color || !s.color.startsWith('#')) ? (s.color || 'bg-gray-400') : 'custom-color');
                                                (e.target as HTMLImageElement).parentElement!.innerText = s.name[0];
                                            }}
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${(!s.color || !s.color.startsWith('#')) ? (s.color || 'bg-gray-400') : ''}`}>
                                            {s.name[0]}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-gray-700 truncate tracking-tight uppercase">{s.name}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grid Content */}
                <div className="flex">
                    <div className="w-12 flex-shrink-0 bg-gray-50 border-r border-gray-200 sticky left-0 z-10" />
                    {activeStaffList.map(staff => {

                        // Build subBlocks — filter by staff.id
                        interface ScheduleSubBlock {
                            bookingId: number;
                            booking: Booking;
                            startMin: number;
                            startTime: string;
                            durationMin: number;
                            serviceNames: string[];
                            guestName: string;
                            isBlocked: boolean;
                        }

                        const subBlocks: ScheduleSubBlock[] = [];

                        // Ambil semua booking yang relevan untuk staff ini
                       const relevantBookings = bookings.filter(b => {
    if (b.date !== formatDateInput(currentDate)) return false;
    if (editingBooking && b.id === editingBooking.id) return false;

    const rawG = b.guests || [];
    const gs = Array.isArray(rawG) ? rawG : Object.values(rawG);

    if (gs.length > 0) {
        // Kalau ada guests, include HANYA kalau ada guest yang staffId-nya match DAN belum refunded
        return (gs as any[]).some((g: any) => Number(g.staffId) === Number(staff.id) && g.status !== 'refunded');
    } else {
        // Tidak ada guests, fallback ke b.staffId
        return Number(b.staffId) === Number(staff.id);
    }
});

                    relevantBookings.forEach(b => {
    if (b.isBlocked) {
        const [sh, sm] = b.start.split(':').map(Number);
        subBlocks.push({
            bookingId: b.id,
            booking: b,
            startMin: sh * 60 + sm,
            startTime: b.start,
            durationMin: b.duration,
            serviceNames: [],
            guestName: '',
            isBlocked: true,
        });
        return;
    }

    const rawGuests = b.guests || [];
    const guests = Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests);

    if (guests.length > 0) {
        // Selalu pakai guests logic kalau ada guests — jangan fallback ke b.staffId
        const relevantGuests = (guests as any[]).filter((g: any) =>
            Number(g.staffId) === Number(staff.id) && g.status !== 'refunded'
        );
        if (relevantGuests.length === 0) return;

        const timeGroups: Record<string, any[]> = {};
        relevantGuests.forEach((g: any) => {
            const t = g.startTime || b.start;
            if (!timeGroups[t]) timeGroups[t] = [];
            timeGroups[t].push(g);
        });

        Object.entries(timeGroups).forEach(([startTime, groupGuests]) => {
            const [sh, sm] = startTime.split(':').map(Number);
            const dur = Math.max(...(groupGuests as any[]).map((g: any) => g.serviceDuration || 60));
            const serviceNames = [...new Set((groupGuests as any[]).map((g: any) => getServiceVariantLabel(g.serviceName || b.service, g.variantName)))];
            const guestNames = [...new Set((groupGuests as any[]).map((g: any) => g.name || b.customer))];
            subBlocks.push({
                bookingId: b.id,
                booking: b,
                startMin: sh * 60 + sm,
                startTime,
                durationMin: dur,
                serviceNames,
              guestName: b.customer,
                isBlocked: false,
            });
        });
    } else {
        // Single service — hanya push kalau b.staffId === staff.id
        if (Number(b.staffId) !== Number(staff.id)) return;
        
        const [sh, sm] = b.start.split(':').map(Number);
        subBlocks.push({
            bookingId: b.id,
            booking: b,
            startMin: sh * 60 + sm,
            startTime: b.start,
            durationMin: b.duration,
            serviceNames: [getServiceVariantLabel(b.service)],
            guestName: b.customer,
            isBlocked: false,
        });
    }
});

                        // Sort by startTime
                       const seen = new Set<string>();
const dedupedBlocks = subBlocks.filter(sb => {
    const key = `${sb.bookingId}-${sb.startTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
});
dedupedBlocks.sort((a, b) => a.startMin - b.startMin);
                        return (
                            <div key={staff.id} className="w-[180px] flex-shrink-0 border-r last:border-r-0 p-2 space-y-2 bg-[#FAF8F1]/30 min-h-[500px]">
                                {dedupedBlocks.length === 0 ? (
                                    <div className="h-full flex items-center justify-center opacity-20 py-10">
                                        <Calendar size={32} className="text-gray-300" />
                                    </div>
                                ) : (
                                    dedupedBlocks.map((sb, sbIdx) => {
                                        const b = sb.booking;
                                        const paymentBadge = getPaymentStatusBadge(b.paymentStatus);
                                        const isCancelled = b.status === 'cancelled';
                                        const staffColor = staff.color || 'bg-sky-200';
                                        const isHexColor = staffColor.startsWith('#');

                              // Cek apakah guest yang relevan di kolom ini sudah di-refund
const isRefunded = (() => {
    const rawG = b.guests || [];
    const gs = Array.isArray(rawG) ? rawG : Object.values(rawG);
    const relevant = (gs as any[]).filter((g: any) => Number(g.staffId) === Number(staff.id));
    return relevant.length > 0 && relevant.every((g: any) => g.status === 'refunded');
})();

let statusBorder = 'border-sky-500';
if (sb.isBlocked) statusBorder = 'border-red-400';
else if (isCancelled) statusBorder = 'border-gray-400';
else if (isRefunded) statusBorder = 'border-orange-400';
else if (b.paymentStatus === 'paid') statusBorder = 'border-green-500';
else if (b.paymentStatus === 'partial') statusBorder = 'border-amber-500';

const bgClass = sb.isBlocked
    ? 'bg-red-100 border-l-4 border-red-400'
    : isCancelled
        ? 'bg-gray-200 border-l-4 border-gray-400 opacity-60'
        : isRefunded
            ? 'bg-orange-50 border-l-4 border-orange-400 opacity-80'
            : isHexColor
                ? `border-l-4 ${statusBorder}`
                : `${staffColor} border-l-4 ${statusBorder}`;
                                        return (
                                            <div
                                                key={`${sb.bookingId}-${sb.startTime}-${sbIdx}`}
                                               onClick={() => openBookingDetail(b, { staffId: staff.id, startTime: sb.startTime })}
                                                style={(!sb.isBlocked && !isCancelled && isHexColor) ? { backgroundColor: staffColor + '20' } : {}}
                                                className={`rounded-xl p-2.5 text-[10px] border border-gray-100 shadow-sm ${bgClass} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-bold text-[#2d3b2d] bg-white/50 px-1.5 py-0.5 rounded-md shadow-sm text-[9px]">
                                                        {sb.startTime} - {getEndTime(sb.startTime, sb.durationMin)}
                                                    </p>
                                                    {b.status === 'completed' && (
                                                        <div className="bg-green-600 text-white rounded-full p-0.5 shadow-sm">
                                                            <ThumbsUp size={9} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>

                                                {sb.isBlocked ? (
                                                    <div className="flex items-center gap-1.5 text-red-700">
                                                        <Ban size={12} />
                                                        <p className="font-bold uppercase tracking-tight text-[9px]">Blocked: {b.blockReason}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                      {(b as any).is_rescheduled && (
            <div className="mb-1">
                <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200">
                    ↻ Reschedule
                </span>
            </div>
        )}
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <User size={10} className="text-gray-400 flex-shrink-0" />
                                                            <p className="font-bold text-gray-900 truncate text-[10px]">
                                                                {sb.guestName || b.customer || 'Walk-in'}
                                                            </p>
                                                        </div>

                                                        <div className="space-y-0.5 mt-0.5">
                                                            {sb.serviceNames.map((name, i) => (
                                                                <div key={i} className="flex items-center gap-1">
                                                                    <div className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                                                                    <p className="text-gray-600 font-medium truncate text-[9px]">{name}</p>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1.5 border-t border-black/5">
                                                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${paymentBadge.bg} ${paymentBadge.text}`}>
                                                                {paymentBadge.label}
                                                                {isRefunded && (
    <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
        ↩ Refund
    </span>
)}
                                                            </span>
                                                            {b.paymentStatus === 'unpaid' && b.createdAt && (
                                                                <span className="text-[8px] text-red-600 font-bold bg-white px-1 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                                                    <Clock size={9} />
                                                                    {(() => {
                                                                        const timeout = companySettings?.paymentTimeout ? parseInt(companySettings.paymentTimeout) : 15;
                                                                        const deadline = new Date(new Date(b.createdAt!).getTime() + timeout * 60000);
                                                                        return deadline.getHours().toString().padStart(2, '0') + ":" + deadline.getMinutes().toString().padStart(2, '0');
                                                                    })()}
                                                                </span>
                                                            )}
                                                            {isCancelled && (
                                                                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-gray-500 text-white">
                                                                    BATAL
                                                                </span>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
);

    const renderTimeGrid = (staffList: Staff[], dateList: Date[], isWeeklyForOneStaff: boolean) => (
        <div className="space-y-3 w-full">
            {/* Content Card - Scrolls Both X and Y */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-auto relative shadow-sm" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                <div className="min-w-max">
                    {/* Header Row - Sticky Top */}
                    <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
                        <div className="w-14 flex-shrink-0 p-2 border-r border-gray-200 text-xs text-gray-600 font-medium flex items-center justify-center sticky left-0 bg-gray-50 z-30">All</div>
                        {isWeeklyForOneStaff ? dateList.map((d, i) => {
                            const isToday = formatDateInput(d) === formatDateInput(new Date());
                            return (
                                <div key={i} className={`w-[140px] flex-shrink-0 p-2 text-center border-r last:border-r-0 ${isToday ? 'bg-blue-50 border-b-2 border-blue-500' : ''}`}>
                                    <p className="text-xs text-gray-500">{DAYS_SHORT[d.getDay()]}</p>
                                    <p className={`font-bold text-sm ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>{d.getDate()} {MONTHS_SHORT[d.getMonth()]}</p>
                                </div>
                            );
                        }) : staffList.map(s => (
                            <div key={s.id} className="w-[220px] flex-shrink-0 p-2 text-center border-r last:border-r-0">
                                <div className="w-8 h-8 rounded-full overflow-hidden mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                    style={s.photo ? {} : (s.color?.startsWith('#') ? { backgroundColor: s.color } : {})}
                                >
                                    {s.photo ? (
                                        <img
                                            src={getImageUrl(s.photo)}
                                            alt={s.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.classList.add((!s.color || !s.color.startsWith('#')) ? (s.color || 'bg-gray-400') : 'custom-color');
                                                (e.target as HTMLImageElement).parentElement!.innerText = s.name[0];
                                            }}
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${(!s.color || !s.color.startsWith('#')) ? (s.color || 'bg-gray-400') : ''}`}>
                                            {s.name[0]}
                                        </div>
                                    )}
                                </div>
                                 <p className={`text-[10px] font-bold truncate px-1 uppercase tracking-tight ${s.is_calendar_enabled === 0 || s.is_calendar_enabled === false ? 'text-gray-300 line-through' : 'text-gray-700'}`}>
        {s.name}
    </p>
    {(s.is_calendar_enabled === 0 || s.is_calendar_enabled === false) && (
        <span className="text-[8px] font-bold text-red-400 uppercase">Off</span>
    )}
                            </div>
                        ))}
                    </div>

                    {(!selectedBranchId || Number(selectedBranchId) === 0) && (
                        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                            <div className="bg-white shadow-xl border border-gray-100 p-8 rounded-2xl max-w-sm">
                                <div className="w-16 h-16 bg-[#FAEAB1] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MapPin size={32} className="text-[#C58940]" />
                                </div>
                                <h3 className="text-lg font-bold text-[#453C67] mb-2">Pilih Cabang</h3>
                                <p className="text-gray-500 text-sm mb-6">Silakan pilih cabang terlebih dahulu untuk melihat jadwal dan membuat reservasi</p>
                                <button
                                    onClick={() => setShowBranchDropdown(true)}
                                    className="px-6 py-2.5 bg-[#C58940] text-white rounded-xl font-bold hover:bg-[#B07835] transition-all shadow-lg shadow-orange-900/10"
                                >
                                    Pilih Cabang Sekarang
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex">
                        {/* Time Axis - Sticky Left */}
                        <div className="w-14 flex-shrink-0 bg-gray-50 border-r relative sticky left-0 z-10">
                            {SLOTS.map(m => (
                                <div key={m} className={`w-full px-1 text-[10px] text-gray-400 border-b border-gray-100 flex items-start justify-center overflow-hidden`} style={{ height: `${SLOT_HEIGHT}px` }}>
                                    {formatTimeSlot(m)}
                                </div>
                            ))}
                            {/* Red line in time axis */}
                            {((isWeeklyForOneStaff && dateList.some(d => formatDateInput(d) === formatDateInput(now))) || (!isWeeklyForOneStaff && dateList.some(d => formatDateInput(d) === formatDateInput(now)))) && (
                                (() => {
                                    const nowTimeMin = now.getHours() * 60 + now.getMinutes();
                                    const startMin = startHour * 60;
                                    const redLineTop = ((nowTimeMin - startMin) / slotDuration) * SLOT_HEIGHT;
                                    if (redLineTop >= 0 && redLineTop <= SLOTS.length * SLOT_HEIGHT) {
                                        return (
                                            <div
                                                className="absolute right-0 z-30 flex items-center justify-end"
                                                style={{ top: `${redLineTop}px`, width: '100%' }}
                                            >
                                                <div className="bg-red-500 text-white text-[9px] px-1 rounded-sm font-bold -mr-0.5 shadow-sm">
                                                    {now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()
                            )}
                        </div>

                        {/* Grid Columns */}
                        {(isWeeklyForOneStaff ? dateList : staffList).map((item, idx) => {
                            const date = isWeeklyForOneStaff ? item as Date : currentDate;
                            const staffId = isWeeklyForOneStaff ? selectedStaffId : (item as Staff).id;
                            const isToday = formatDateInput(date) === formatDateInput(now);

                            const nowTimeMin = now.getHours() * 60 + now.getMinutes();
                            const startMin = startHour * 60;
                            const redLineTop = ((nowTimeMin - startMin) / slotDuration) * SLOT_HEIGHT;

                            return (
                                <div key={idx} className={`${isWeeklyForOneStaff ? 'w-[140px]' : 'w-[220px]'} flex-shrink-0 relative border-r last:border-r-0 ${isToday && isWeeklyForOneStaff ? 'bg-blue-50/30' : ''}`}>
                                    {isToday && redLineTop >= 0 && redLineTop <= SLOTS.length * SLOT_HEIGHT && (
                                        <div
                                            className="absolute left-0 right-0 border-t border-red-500 z-20 pointer-events-none"
                                            style={{ top: `${redLineTop}px` }}
                                        >
                                        </div>
                                    )}
                                {(() => {
    // Kumpulkan semua "sub-blok" yang perlu dirender di kolom ini
    // Setiap guest dengan startTime unik = 1 blok terpisah
    const dateStr = formatDateInput(date);
    
    // Cari semua booking di kolom ini
   const columnBookings = bookings.filter(b => {
    if (b.date !== dateStr) return false;
    if (b.status === 'cancelled') return false;
    if (editingBooking && b.id === editingBooking.id) return false;

    // Include jika booking utama milik staff ini
    if (Number(b.staffId) === Number(staffId)) return true;

    // Include jika ada guest yang staffId-nya staff ini DAN belum refunded
    const rawGuests = b.guests || [];
    const guests = Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests);
    if ((guests as any[]).some((g: any) => Number(g.staffId) === Number(staffId) && g.status !== 'refunded')) return true;

    return false;
});

    // Build sub-blocks dari guests
    interface SubBlock {
        bookingId: number;
        booking: Booking;
        startMin: number;
        durationMin: number;
        label: string;
        isBlocked: boolean;
    }

    const subBlocks: SubBlock[] = [];
    
  columnBookings.forEach(b => {
    const rawGuests = b.guests || [];
    const guests = Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests);
    
    if (guests.length > 0) {
        // Filter guests yang staffId-nya sesuai kolom ini
        const relevantGuests = (guests as any[]).filter((g: any) => 
            Number(g.staffId) === Number(staffId) && g.status !== 'refunded'
        );

        // Kalau tidak ada guest untuk staff ini, skip
        if (relevantGuests.length === 0) return;

        // Group by startTime
        const timeGroups: Record<string, any[]> = {};
        relevantGuests.forEach((g: any) => {
            const t = g.startTime || b.start;
            if (!timeGroups[t]) timeGroups[t] = [];
            timeGroups[t].push(g);
        });

        // Push ke subBlocks per timeGroup
        Object.entries(timeGroups).forEach(([startTime, groupGuests]) => {
            const [sh, sm] = startTime.split(':').map(Number);
            const startMin = sh * 60 + sm;
            const dur = Math.max(...(groupGuests as any[]).map((g: any) => g.serviceDuration || 60));
            const serviceNames = [...new Set((groupGuests as any[]).map((g: any) => getServiceVariantLabel(g.serviceName || b.service, g.variantName)))];
            
            subBlocks.push({
                bookingId: b.id,
                booking: b,
                startMin,
                durationMin: dur,
                label: serviceNames.join(', '),
                isBlocked: b.isBlocked || false,
            });
        });

    } else {
        // Single service booking
        const [sh, sm] = b.start.split(':').map(Number);
        subBlocks.push({
            bookingId: b.id,
            booking: b,
            startMin: sh * 60 + sm,
            durationMin: b.duration,
            label: b.service || '',
            isBlocked: b.isBlocked || false,
        });
    }
});


// Dedup subBlocks
const seenSB = new Set<string>();
const finalSubBlocks = subBlocks.filter(sb => {
    const key = `${sb.bookingId}-${sb.startMin}`;
    if (seenSB.has(key)) return false;
    seenSB.add(key);
    return true;
});

// Ganti subBlocks -> finalSubBlocks di blocksStartingHere


    return SLOTS.map(min => {
        const _rawStatus = getSlotStatus(staffId, date, min);
        const _rawBooking = getBookingAt(staffId, date, min);
        const hasBooking = (_rawBooking && _rawBooking.status !== 'cancelled');
        const status = (_rawStatus === 'booked' && !hasBooking) ? 'available' : _rawStatus;

        // Sub-blocks yang START di slot ini
const blocksStartingHere = finalSubBlocks.filter(sb => sb.startMin >= min && sb.startMin < min + slotDuration);

        return (
            <div
                key={min}
                onClick={() => handleSlotClick(staffId, date, min)}
                className={`border-b relative ${status === 'no-shift' ? 'bg-gray-100/50' : status === 'available' ? 'bg-white hover:bg-sky-50 cursor-pointer' : ''}`}
                style={{ height: `${SLOT_HEIGHT}px` }}
            >
                {blocksStartingHere.map((sb, sbIdx) => {
                    const b = sb.booking;
                    const offsetInSlot = sb.startMin - min;
                    const topOffset = (offsetInSlot / slotDuration) * SLOT_HEIGHT;
                    const blockHeight = (sb.durationMin / slotDuration) * SLOT_HEIGHT - 2;
                    const isCompactCard = sb.durationMin < 20;
                    
                    return (
                        <div
                            key={`${sb.bookingId}-${sb.startMin}-${sbIdx}`}
                            onClick={(e) => {
    e.stopPropagation();
    openBookingDetail(b, { staffId: staffId, startTime: formatTimeSlot(sb.startMin) });
}}
                  className={`absolute inset-x-1 rounded-lg ${isCompactCard ? 'p-1.5 text-[10px]' : 'p-2 text-[11px]'} overflow-hidden z-10 shadow-sm transition-all hover:z-40 hover:scale-[1.02] cursor-pointer ${(() => {
    if (sb.isBlocked) return 'bg-red-100 border-l-4 border-red-400';
    // Cek refund status untuk guest di kolom staff ini
    const rawG = b.guests || [];
    const gs = Array.isArray(rawG) ? rawG : Object.values(rawG);
    const relevant = (gs as any[]).filter((g: any) => Number(g.staffId) === Number(staffId));
    const isRefunded = relevant.length > 0 && relevant.every((g: any) => g.status === 'refunded');
    if (isRefunded) return 'bg-orange-100 border-l-4 border-orange-400 opacity-80';
    if ((b as any).is_rescheduled) return 'bg-violet-100 border-l-4 border-violet-500';
    return 'bg-sky-200 border-l-4 border-sky-500';
})()}`}
                            style={{ top: `${topOffset}px`, height: `${blockHeight}px` }}
                        >
                         <div className="flex justify-between items-start">
    <p className="font-black truncate text-[#2d3b2d] leading-tight">
        {formatTimeSlot(sb.startMin)} - {getEndTime(formatTimeSlot(sb.startMin), sb.durationMin)}
    </p>
    {(b as any).is_rescheduled && (
        <span className="text-[7px] font-black bg-violet-500 text-white px-1 py-0.5 rounded-full shrink-0 ml-1">
            ↻
        </span>
    )}
</div>
                        <p className={`truncate font-bold text-gray-900 leading-tight ${isCompactCard ? 'mt-0.5' : 'mt-1'}`}>
    {sb.isBlocked ? b.blockReason : (() => {
        const rawGuests = b.guests || [];
        const guests = Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests);
        const relevantGuests = (guests as any[]).filter((g: any) => Number(g.staffId) === Number(staffId));
        if (relevantGuests.length > 0) {
            // Ambil nama unik dari guest yang relevan
            const names = [...new Set(relevantGuests.map((g: any) => g.name || b.customer))];
         return b.customer;
        }
        return b.customer || 'Walk-in';
    })()}
</p>
                            {!sb.isBlocked && isCompactCard && (
                                <p className="truncate opacity-90 text-gray-700 leading-tight text-[9px] mt-0.5">
                                    {sb.label}
                                </p>
                            )}
                            {!sb.isBlocked && !isCompactCard && (
                                <>
                                    <p className="truncate opacity-90 text-gray-700 leading-tight">{sb.label}</p>
                                    <p className="truncate opacity-70 flex items-center gap-1 leading-tight">
                                        <MapPin size={8} /> {rooms.find(r => r.id === b.roomId)?.name || '-'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                        <span className={`px-1 py-0 rounded-[3px] text-[7px] font-bold ${getPaymentStatusBadge(b.paymentStatus).bg} ${getPaymentStatusBadge(b.paymentStatus).text}`}>
                                            {getPaymentStatusBadge(b.paymentStatus).label}
                                        </span>
                                        {(() => {
    const rawG = b.guests || [];
    const gs = Array.isArray(rawG) ? rawG : Object.values(rawG);
    const relevant = (gs as any[]).filter((g: any) => Number(g.staffId) === Number(staffId));
    const isRefunded = relevant.length > 0 && relevant.every((g: any) => g.status === 'refunded');
    return isRefunded ? (
        <span className="bg-orange-100 text-orange-700 px-1 py-0 rounded-[3px] text-[7px] font-bold border border-orange-200">
            ↩ Refund
        </span>
    ) : null;
})()}
                                        {(b.guestCount || 0) > 1 && (
                                            <span className="bg-amber-100 text-amber-700 px-1 py-0 rounded-[3px] text-[7px] font-black border border-amber-200 shadow-sm">
                                                GRUP
                                            </span>
                                        )}
                                        {b.status === 'completed' && (
                                            <span className="bg-green-600 text-white rounded-full p-0.5 ml-0.5 shadow-sm">
                                                <ThumbsUp size={7} strokeWidth={3} />
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    });
})()}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto space-y-4 relative min-h-screen">
            {loading && (
                <div className="absolute inset-0 bg-white/50 z-[100] flex items-center justify-center backdrop-blur-sm rounded-xl">
                    <Loader2 className="animate-spin text-[#C58940]" size={48} />
                </div>
            )}

            <div className="bg-[#2d3b2d] text-white rounded-xl p-3 flex items-center justify-between sticky top-[72px] z-[80] shadow-md">
                <div className="flex items-center gap-2">
                    {editingBooking && (
                        <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2 animate-pulse mr-4">
                            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Mode Pindah Jam:</span>
                            <span className="text-sm font-medium">{editingBooking.customer} - {typeof editingBooking.service === 'object' ? (editingBooking.service as any).name : editingBooking.service}</span>
                            <button onClick={() => setEditingBooking(null)} className="ml-2 hover:text-red-400"><X size={14} /></button>
                        </div>
                    )}
                    {/* {rescheduleItemTarget && (
                        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2 animate-pulse mr-4">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Mode Reschedule Item:</span>
                            <span className="text-sm font-medium">{getServiceVariantLabel(rescheduleItemTarget.item.serviceName, rescheduleItemTarget.item.variantName, 'Item')} - {rescheduleItemTarget.item.name || 'Tamu'}</span>
                            <button onClick={() => setRescheduleItemTarget(null)} className="ml-2 hover:text-red-400"><X size={14} /></button>
                        </div>
                    )} */}
                    {/* Branch Selector */}
                    {isSuperAdminOrAdmin && (
                        <div className="relative">
                            <button onClick={() => { setShowBranchDropdown(!showBranchDropdown); setShowStaffDropdown(false); }} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                                <div className="w-5 h-5 bg-[#C58940] rounded flex items-center justify-center text-[10px] font-bold text-white">{selectedBranchId === 0 ? '?' : (branches.find(b => b.id === selectedBranchId)?.name?.[0] || 'Z')}</div>
                                <span className="text-sm text-white">{selectedBranchId === 0 ? 'Pilih Cabang' : (branches.find(b => b.id === selectedBranchId)?.name || 'Pilih Cabang')}</span>
                                <ChevronDown size={14} className="text-white" />
                            </button>
                            {showBranchDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg z-50 min-w-[200px] border border-gray-100 overflow-hidden text-gray-800">
                                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Cari cabang..."
                                                value={branchSearchQuery}
                                                onChange={(e) => setBranchSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940]"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        <button
                                            onClick={() => { setSelectedBranchId(0); setShowBranchDropdown(false); setBranchSearchQuery(''); }}
                                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${selectedBranchId === 0 ? 'bg-[#FAEAB1] font-bold' : ''}`}
                                        >
                                            Pilih Cabang
                                        </button>
                                        {branches.filter(b => b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())).map(b => (
                                            <button key={b.id} onClick={() => { setSelectedBranchId(b.id); setShowBranchDropdown(false); setBranchSearchQuery(''); }} className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${selectedBranchId === b.id ? 'bg-[#FAEAB1] font-bold' : ''}`}>
                                                {b.name}
                                            </button>
                                        ))}

                                        {branches.filter(b => b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())).length === 0 && (
                                            <div className="px-3 py-4 text-center text-sm text-gray-500 italic">
                                                Cabang tidak ditemukan
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Staff Selector (Only for Week view) */}
                    {viewMode === 'week' && (
                        <div className="relative">
                            <button onClick={() => { setShowStaffDropdown(!showStaffDropdown); setShowBranchDropdown(false); }} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                                <div className={`w-5 h-5 rounded-full ${(!selectedStaff?.color || !selectedStaff.color.startsWith('#')) ? (selectedStaff?.color || 'bg-gray-400') : ''}`} style={selectedStaff?.color?.startsWith('#') ? { backgroundColor: selectedStaff.color } : {}} />
                                <span className="text-sm">{selectedStaff?.name}</span>
                                <ChevronDown size={14} />
                            </button>
                            {showStaffDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg z-50 min-w-[200px] max-h-64 overflow-y-auto">
                                    {activeStaffList.map(s => (
                                        <button key={s.id} onClick={() => { setSelectedStaffId(s.id); setShowStaffDropdown(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-gray-800 hover:bg-gray-100 ${selectedStaffId === s.id ? 'bg-[#FAEAB1]' : ''}`}>
                                            <div className={`w-5 h-5 rounded-full ${(!s.color || !s.color.startsWith('#')) ? (s.color || 'bg-gray-400') : ''}`} style={s.color?.startsWith('#') ? { backgroundColor: s.color } : {}} />
                                            <span className="text-sm">{s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Date Navigation */}
                    <div className="flex items-center gap-1">
                        <button onClick={prevPeriod} className="p-1.5 hover:bg-white/10 rounded"><ChevronLeft size={18} /></button>
                        <div className="relative" ref={datePickerRef}>
                            <button onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                                <Calendar size={14} />
                                <span className="text-sm">{viewMode === 'week' ? getWeekRangeText() : formatDisplayDate(currentDate)}</span>
                            </button>
                            {showDatePicker && (
                                <div
                                    className="absolute left-1/2 top-full z-[120] mt-3 w-[min(92vw,320px)] -translate-x-1/2 rounded-xl bg-white p-4 text-gray-800 shadow-2xl ring-1 ring-black/5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Month/Year Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex gap-1">
                                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                                <ChevronsLeft size={16} />
                                            </button>
                                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                                <ChevronLeft size={16} />
                                            </button>
                                        </div>
                                        <span className="font-medium text-gray-800">{currentDate.getFullYear()}  {MONTHS[currentDate.getMonth()]}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                                <ChevronRight size={16} />
                                            </button>
                                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                                <ChevronsRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Days Header */}
                                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-gray-500 py-1 font-medium">{d}</div>)}
                                    </div>

                                    {/* Calendar Days */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {calendarDays.map((d, i) => {
                                            const isInWeek = viewMode === 'week' && weekDates.some(wd => formatDateInput(wd) === formatDateInput(d.date));
                                            const isWeekStart = viewMode === 'week' && formatDateInput(weekDates[0]) === formatDateInput(d.date);
                                            const isWeekEnd = viewMode === 'week' && formatDateInput(weekDates[6]) === formatDateInput(d.date);
                                            const isSelected = formatDateInput(d.date) === formatDateInput(currentDate);
                                            const isToday = formatDateInput(d.date) === formatDateInput(new Date());

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => { setCurrentDate(d.date); setShowDatePicker(false); }}
                                                    className={`p-2 text-sm transition-colors
                                                        ${!d.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                                                        ${isInWeek && d.isCurrentMonth ? 'bg-blue-100 text-blue-700' : ''}
                                                        ${isWeekStart ? 'rounded-l-full' : ''}
                                                        ${isWeekEnd ? 'rounded-r-full' : ''}
                                                        ${isSelected ? 'bg-blue-500 text-white rounded-full' : ''}
                                                        ${isToday && !isSelected ? 'bg-gray-200 rounded-full font-bold' : ''}
                                                        ${!isInWeek && d.isCurrentMonth && !isSelected && !isToday ? 'hover:bg-gray-100 rounded-full' : ''}
                                                    `}
                                                >
                                                    {d.day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={nextPeriod} className="p-1.5 hover:bg-white/10 rounded"><ChevronRight size={18} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white/10 rounded-lg p-1">
                        <button onClick={() => setViewMode('schedule')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'schedule' ? 'bg-white text-[#2d3b2d]' : ''}`}>Schedule View</button>
                        <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'week' ? 'bg-white text-[#2d3b2d]' : ''}`}>Week</button>
                        <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'day' ? 'bg-white text-[#2d3b2d]' : ''}`}>Day</button>
                    </div>
                    <button onClick={() => window.location.reload()} className="p-2 hover:bg-white/10 rounded"><RefreshCw size={18} /></button>
                </div>
            </div>

            {/* Calendar Views */}
            {viewMode === 'schedule' && renderScheduleView()}
            {viewMode === 'week' && renderTimeGrid([], weekDates, true)}
            {viewMode === 'day' && renderTimeGrid(activeStaffList, [currentDate], false)}

            {/* Manual Booking Modal */}
            {showBookingModal && selectedSlot && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
                    <div className="relative z-[201] bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header - Naqupos Gold */}
                        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-[#C58940] to-[#E5BA73] text-white">
                            <div>
                                <h3 className="text-lg font-bold ">{editingBlockId ? 'Edit Blokir Waktu' : 'Manual Booking'}</h3>
                                {!showSuccess && !editingBlockId && <p className="text-sm opacity-90">Step {editingBooking ? bookingStep - 1 : bookingStep} dari {editingBooking ? 2 : 3}</p>}
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-full"><X size={20} /></button>
                        </div>

                        {/* Slot Info */}
                        {!showSuccess && (
                            <div className="p-3 bg-[#FAEAB1] border-b flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full ${slotStaff?.color} flex items-center justify-center font-medium text-sm`}>{slotStaff?.name[0]}</div>
                                <div>
                                    <p className="font-medium text-[#453C67]">{slotStaff?.name}</p>
                                    <p className="text-sm text-gray-600">{selectedSlot.date} • {selectedSlot.time}</p>
                                </div>
                            </div>
                        )}

                        {/* Block Time Toggle */}
                        {!showSuccess && !editingBlockId && (
                            <div className="px-4 py-2 border-b bg-gray-50 flex items-center">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={isBlockingTime}
                                        onChange={e => setIsBlockingTime(e.target.checked)}
                                        className="w-4 h-4 text-[#C58940] border-gray-300 rounded focus:ring-[#C58940]"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Blokir waktu ini</span>
                                </label>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4">
                            {showSuccess ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Calendar size={32} className="text-green-600" />
                                    </div>
                                    <h4 className="text-lg font-bold text-[#453C67] mb-2 ">Booking Berhasil!</h4>
                                    <div className="bg-[#FAF8F1] rounded-lg p-3 text-left text-sm space-y-1">
                                        <p><span className="text-gray-500">Pelanggan:</span> {selectedCustomer?.name || customerSearch.trim() || 'Guest'}</p>
                                        <p><span className="text-gray-500">Layanan:</span> {selectedService?.name}</p>
                                        <p><span className="text-gray-500">Terapis:</span> {slotStaff?.name}</p>
                                        <p><span className="text-gray-500">Jadwal:</span> {selectedSlot.date} • {selectedSlot.time}</p>
                                        <p><span className="text-gray-500">Ruangan:</span> {selectedRoom?.name}</p>
                                    </div>
                                </div>
                            ) : isBlockingTime ? (
    <div className="space-y-4">
        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex gap-3 items-start">
            <div className="p-1 bg-orange-100 rounded">
                <AlertTriangle size={16} className="text-orange-600" />
            </div>
            <div>
                <p className="text-sm font-medium text-orange-800">Perhatian</p>
                <p className="text-xs text-orange-700 mt-0.5">
                    Waktu yang diblokir tidak akan tersedia untuk booking online maupun offline.
                </p>
            </div>
        </div>

        {/* Staff */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Terapis <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
                value={blockStaffId}
                onChange={(val) => setBlockStaffId(Number(val))}
                options={activeStaffList.map(st => {
                    const gender = st.gender?.toLowerCase();
                    const genderLabel =
                        gender === 'perempuan' || gender === 'female' || gender === 'p' || gender === 'f' ? '(P)' :
                        gender === 'laki-laki' || gender === 'male' || gender === 'l' || gender === 'm' ? '(L)' : '';
                    return { value: st.id, label: `${st.name} ${genderLabel}`.trim() };
                })}
            />
        </div>

        {/* Jam Mulai & Berakhir */}
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Mulai <span className="text-red-500">*</span>
                </label>
                <input
                    type="time"
                    value={blockStartTime}
                    onChange={e => setBlockStartTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none transition-all"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Berakhir <span className="text-red-500">*</span>
                </label>
                <input
                    type="time"
                    value={blockEndTime}
                    min={blockStartTime}
                    onChange={e => setBlockEndTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none transition-all"
                />
            </div>
        </div>

        {/* Info Durasi */}
        {blockStartTime && blockEndTime && (() => {
            const [sh, sm] = blockStartTime.split(':').map(Number);
            const [eh, em] = blockEndTime.split(':').map(Number);
            const dur = (eh * 60 + em) - (sh * 60 + sm);
            if (dur <= 0) return (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertTriangle size={12} /> Jam berakhir harus setelah jam mulai
                </p>
            );
            return (
                <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    ⏱ Durasi blokir: <strong>{dur} menit</strong>
                </p>
            );
        })()}

        {/* Alasan */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Alasan <span className="text-red-500">*</span>
            </label>
            <input
                type="text"
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Cth: Istirahat, Meeting, Maintenance, dll"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none transition-all"
            />
        </div>
    </div>
                            ) : (
                                <>
                                    {/* Step 1: Service */}
                                    {bookingStep === 1 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                                                <Sparkles size={18} className="text-[#C58940]" />
                                                <h4 className="font-bold text-[#453C67]">Pilih Layanan</h4>
                                            </div>

                                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                                {(() => {
                                                    const categories = Array.from(new Set(services.map(s => s.category)));
                                                    return categories.map(cat => {
                                                        const isOpen = activeCategory === cat;
                                                        const catServices = services.filter(s => s.category === cat);

                                                        // Group by name for services that might have variants
                                                        const serviceGroups: { [name: string]: Service[] } = {};
                                                        catServices.forEach(s => {
                                                            if (!serviceGroups[s.name]) serviceGroups[s.name] = [];
                                                            serviceGroups[s.name].push(s);
                                                        });

                                                        return (
                                                            <div key={cat} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                                                <button
                                                                    onClick={() => setActiveCategory(isOpen ? null : cat)}
                                                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-[#C58940]/10 flex items-center justify-center">
                                                                            <Sparkles size={16} className="text-[#C58940]" />
                                                                        </div>
                                                                        <span className="font-bold text-gray-800">{cat}</span>
                                                                    </div>
                                                                    {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                                                </button>

                                                                {isOpen && (
                                                                    <div className="bg-white divide-y divide-gray-50">
                                                                        {Object.entries(serviceGroups).map(([name, group]) => {
                                                                            return (
                                                                                <div key={name} className="p-4 space-y-3">
                                                                                    <h5 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#C58940]"></div>
                                                                                        {name}
                                                                                    </h5>
                                                                                    <div className="grid gap-2 pl-3">
                                                                                        {group.map(s => {
                                                                                            // Check if we have sub-variants
                                                                                            if (s.variants && s.variants.length > 0) {
                                                                                                return s.variants.map(v => {
                                                                                                    const variantInstances = bookingItems.filter(item => item.serviceId === s.id && item.variantId === v.id);
                                                                                                    const vCount = variantInstances.length;
                                                                                                    const isSelected = vCount > 0;
                                                                                                    const calculateNextTime = () => {
                                                                                                        const baseTime = selectedSlot?.time || "09:00";
                                                                                                        let totalDur = 0;
                                                                                                        bookingItems.forEach(item => {
                                                                                                            const srv = services.find(x => x.id === item.serviceId);
                                                                                                            if (srv) {
                                                                                                                let dur = srv.duration;
                                                                                                                if (item.variantId) {
                                                                                                                    const variant = srv.variants?.find(vx => vx.id === item.variantId);
                                                                                                                    if (variant) dur = variant.duration;
                                                                                                                }
                                                                                                                totalDur += dur;
                                                                                                            }
                                                                                                        });
                                                                                                        const [h, m] = baseTime.split(':').map(Number);
                                                                                                        if (isNaN(h) || isNaN(m)) return baseTime;
                                                                                                        return formatTimeSlot(h * 60 + m + totalDur);
                                                                                                    };
                                                                                                    const nextTime = calculateNextTime();
                                                                                                    const overlap = selectedSlot ? checkBookingOverlap(selectedSlot.staffId, selectedSlot.date, nextTime, v.duration) : { hasOverlap: false };

                                                                                                    return (
                                                                                                        <div
                                                                                                            key={v.id}
                                                                                                            role="button"
                                                                                                            tabIndex={0}
                                                                                                            onClick={() => {
                                                                                                                const isFirst = bookingItems.length === 0;
                                                                                                                const newItem: ManualBookingItem = {
                                                                                                                    tempId: Math.random().toString(36).substr(2, 9),
                                                                                                                    serviceId: s.id,
                                                                                                                    variantId: v.id,
                                                                                                                    staffId: isFirst ? selectedSlot!.staffId : 0,
                                                                                                                    roomId: null,
                                                                                                                    startTime: isFirst ? selectedSlot!.time : '',
                                                                                                                    guestIndex: 0
                                                                                                                };
                                                                                                                setBookingItems(prev => [...prev, newItem]);
                                                                                                                setFormData(p => ({ ...p, serviceIds: [...p.serviceIds, s.id] }));
                                                                                                            }}
                                                                                                            onKeyDown={(e) => {
                                                                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                    const isFirst = bookingItems.length === 0;
                                                                                                                    const newItem: ManualBookingItem = {
                                                                                                                        tempId: Math.random().toString(36).substr(2, 9),
                                                                                                                        serviceId: s.id,
                                                                                                                        variantId: v.id,
                                                                                                                        staffId: isFirst ? selectedSlot!.staffId : 0,
                                                                                                                        roomId: null,
                                                                                                                        startTime: isFirst ? selectedSlot!.time : '',
                                                                                                                        guestIndex: 0
                                                                                                                    };
                                                                                                                    setBookingItems(prev => [...prev, newItem]);
                                                                                                                    setFormData(p => ({ ...p, serviceIds: [...p.serviceIds, s.id] }));
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`w-full p-3 rounded-xl border text-left transition-all relative cursor-pointer outline-none focus:ring-2 focus:ring-[#C58940]/50 ${isSelected ? 'border-[#C58940] bg-[#C58940]/5 shadow-sm' : 'border-gray-100 hover:border-[#C58940]/30 hover:bg-gray-50'}`}
                                                                                                        >
                                                                                                            {vCount > 0 && (
                                                                                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#C58940] text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm z-10">
                                                                                                                    {vCount}
                                                                                                                </div>
                                                                                                            )}
                                                                                                            <div className="flex justify-between items-center">
                                                                                                                <div>
                                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                                        <p className={`text-sm font-semibold ${isSelected ? 'text-[#C58940]' : 'text-gray-700'}`}>{v.name}</p>
                                                                                                                        {vCount > 0 && (
                                                                                                                            <button
                                                                                                                                type="button"
                                                                                                                                onClick={(e) => {
                                                                                                                                    e.stopPropagation();
                                                                                                                                    const updated = [...bookingItems];
                                                                                                                                    const lastIdx = updated.findIndex(i => i.serviceId === s.id && i.variantId === v.id);
                                                                                                                                    if (lastIdx > -1) {
                                                                                                                                        updated.splice(lastIdx, 1);
                                                                                                                                        setBookingItems(updated);
                                                                                                                                        setFormData(p => ({ ...p, serviceIds: updated.map(u => u.serviceId) }));
                                                                                                                                    }
                                                                                                                                }}
                                                                                                                                className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                                                                                                                            >
                                                                                                                                <X size={12} />
                                                                                                                            </button>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">{v.duration} Menit</span>
                                                                                                                        <span className="text-[10px] text-gray-400">Dimulai {nextTime}</span>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                <p className="font-bold text-[#C58940] text-sm">
                                                                                                                    {hasSelectedCustomer && v.special_price && v.special_price > 0 ? (
                                                                                                                        <><span className="line-through text-gray-400 text-xs mr-1">Rp {parseFloat(v.price.toString()).toLocaleString('id-ID')}</span>Rp {parseFloat(v.special_price.toString()).toLocaleString('id-ID')}</>
                                                                                                                    ) : (
                                                                                                                        <>Rp {parseFloat(v.price.toString()).toLocaleString('id-ID')}</>
                                                                                                                    )}
                                                                                                                </p>
                                                                                                            </div>
                                                                                                            {overlap.hasOverlap && !isSelected && (
                                                                                                                <p className="text-[10px] text-red-500 mt-1 font-medium flex items-center gap-1">
                                                                                                                    <AlertTriangle size={10} /> Bentrok
                                                                                                                </p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    );
                                                                                                });
                                                                                            }

                                                                                            // Base service (no variants logic)
                                                                                            const serviceInstances = bookingItems.filter(item => item.serviceId === s.id && !item.variantId);
                                                                                            const count = serviceInstances.length;
                                                                                            const isSelected = count > 0;
                                                                                            const calculateNextTime = () => {
                                                                                                const baseTime = selectedSlot?.time || "09:00";
                                                                                                let totalDur = 0;
                                                                                                bookingItems.forEach(item => {
                                                                                                    const srv = services.find(x => x.id === item.serviceId);
                                                                                                    if (srv) {
                                                                                                        let dur = srv.duration;
                                                                                                        if (item.variantId) {
                                                                                                            const variant = srv.variants?.find(vx => vx.id === item.variantId);
                                                                                                            if (variant) dur = variant.duration;
                                                                                                        }
                                                                                                        totalDur += dur;
                                                                                                    }
                                                                                                });
                                                                                                const [h, m] = baseTime.split(':').map(Number);
                                                                                                if (isNaN(h) || isNaN(m)) return baseTime;
                                                                                                return formatTimeSlot(h * 60 + m + totalDur);
                                                                                            };
                                                                                            const nextTime = calculateNextTime();
                                                                                            const overlap = selectedSlot ? checkBookingOverlap(selectedSlot.staffId, selectedSlot.date, nextTime, s.duration) : { hasOverlap: false };

                                                                                            return (
                                                                                                <div
                                                                                                    key={s.id}
                                                                                                    role="button"
                                                                                                    tabIndex={0}
                                                                                                    onClick={() => {
                                                                                                        const isFirst = bookingItems.length === 0;
                                                                                                        const newItem: ManualBookingItem = {
                                                                                                            tempId: Math.random().toString(36).substr(2, 9),
                                                                                                            serviceId: s.id,
                                                                                                            staffId: isFirst ? selectedSlot!.staffId : 0,
                                                                                                            roomId: null,
                                                                                                            startTime: isFirst ? selectedSlot!.time : '',
                                                                                                            guestIndex: 0
                                                                                                        };
                                                                                                        setBookingItems(prev => [...prev, newItem]);
                                                                                                        setFormData(p => ({ ...p, serviceIds: [...p.serviceIds, s.id] }));
                                                                                                    }}
                                                                                                    onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                                            const isFirst = bookingItems.length === 0;
                                                                                                            const newItem: ManualBookingItem = {
                                                                                                                tempId: Math.random().toString(36).substr(2, 9),
                                                                                                                serviceId: s.id,
                                                                                                                staffId: isFirst ? selectedSlot!.staffId : 0,
                                                                                                                roomId: null,
                                                                                                                startTime: isFirst ? selectedSlot!.time : '',
                                                                                                                guestIndex: 0
                                                                                                            };
                                                                                                            setBookingItems(prev => [...prev, newItem]);
                                                                                                            setFormData(p => ({ ...p, serviceIds: [...p.serviceIds, s.id] }));
                                                                                                        }
                                                                                                    }}
                                                                                                    className={`w-full p-3 rounded-xl border text-left transition-all relative cursor-pointer outline-none focus:ring-2 focus:ring-[#C58940]/50 ${isSelected ? 'border-[#C58940] bg-[#C58940]/5 shadow-sm' : 'border-gray-100 hover:border-[#C58940]/30 hover:bg-gray-50'}`}
                                                                                                >
                                                                                                    {count > 0 && (
                                                                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#C58940] text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm z-10">
                                                                                                            {count}
                                                                                                        </div>
                                                                                                    )}
                                                                                                    <div className="flex justify-between items-center">
                                                                                                        <div>
                                                                                                            <div className="flex items-center gap-1.5">
                                                                                                                <p className={`text-sm font-semibold ${isSelected ? 'text-[#C58940]' : 'text-gray-700'}`}>{s.name}</p>
                                                                                                                {count > 0 && (
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={(e) => {
                                                                                                                            e.stopPropagation();
                                                                                                                            const updated = [...bookingItems];
                                                                                                                            const lastIdx = updated.map(i => i.serviceId).lastIndexOf(s.id);
                                                                                                                            if (lastIdx > -1) {
                                                                                                                                updated.splice(lastIdx, 1);
                                                                                                                                setBookingItems(updated);
                                                                                                                                setFormData(p => ({ ...p, serviceIds: updated.map(u => u.serviceId) }));
                                                                                                                            }
                                                                                                                        }}
                                                                                                                        className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                                                                                                                    >
                                                                                                                        <X size={12} />
                                                                                                                    </button>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">{s.duration} Menit</span>
                                                                                                                <span className="text-[10px] text-gray-400">Dimulai {nextTime}</span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <p className="font-bold text-[#C58940] text-sm">
                                                                                                            {hasSelectedCustomer && s.special_price && s.special_price > 0 ? (
                                                                                                                <><span className="line-through text-gray-400 text-xs mr-1">Rp {parseFloat(s.price.toString()).toLocaleString('id-ID')}</span>Rp {parseFloat(s.special_price.toString()).toLocaleString('id-ID')}</>
                                                                                                            ) : (
                                                                                                                <>Rp {parseFloat(s.price.toString()).toLocaleString('id-ID')}</>
                                                                                                            )}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    {overlap.hasOverlap && !isSelected && (
                                                                                                        <p className="text-[10px] text-red-500 mt-1 font-medium flex items-center gap-1">
                                                                                                            <AlertTriangle size={10} /> Bentrok
                                                                                                        </p>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                    {/* Step 2: Customer */}
                                    {bookingStep === 2 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-1"><User size={18} className="text-[#C58940]" /><h4 className="font-bold text-[#453C67]">Pilih Pelanggan</h4></div>

                                            <div className="relative mb-2">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Cari nama/telepon..." className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:border-[#C58940] outline-none" />
                                            </div>
                                            {!formData.customerId && !customerSearch.trim() && (
                                                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                                    <User size={14} className="mt-0.5 flex-shrink-0" />
                                                    <span>Pelanggan boleh dikosongkan. Booking akan otomatis dicatat atas nama <strong>Guest</strong>.</span>
                                                </div>
                                            )}
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {filteredCustomers.map(c => (
                                                    <button key={c.id} onClick={() => setFormData(p => ({ ...p, customerId: c.id }))} className={`w-full p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${formData.customerId === c.id ? 'border-[#C58940] bg-[#FAEAB1] ring-1 ring-[#C58940]' : 'border-gray-200 hover:border-[#E5BA73]'}`}>
                                                        <div className="w-8 h-8 rounded-full bg-[#9EB29C] flex items-center justify-center text-xs font-medium text-white shadow-sm">{c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-800 text-sm truncate">{c.name}</p>
                                                            <p className="text-xs text-gray-500">{c.phone}</p>
                                                        </div>
                                                        {formData.customerId === c.id && <CheckCircle size={14} className="text-[#C58940]" />}
                                                    </button>
                                                ))}
                                                {customerSearch && !filteredCustomers.some(c => c.name.toLowerCase() === customerSearch.toLowerCase()) && (
                                                    <button
                                                        onClick={() => {
                                                            setNewCustomerForm(prev => ({ ...prev, name: customerSearch }));
                                                            setShowNewCustomerModal(true);
                                                        }}
                                                        className="w-full p-2.5 rounded-lg border border-dashed border-[#C58940] text-[#C58940] bg-[#C58940]/10 hover:bg-[#C58940]/20 transition-all flex items-center justify-center gap-2 mt-1"
                                                    >
                                                        <Plus size={16} />
                                                        <span className="font-semibold text-sm">Tambah "{customerSearch}"</span>
                                                    </button>
                                                )}
                                            </div>

                                            {formData.customerId && (
                                                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    {/* Visit History */}
                                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <ClipboardList size={16} className="text-teal-600" />
                                                            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Riwayat Kunjungan</span>
                                                        </div>
                                                        {isLoadingHistory ? (
                                                            <div className="flex justify-center py-4">
                                                                <Loader2 className="animate-spin text-teal-600" size={16} />
                                                            </div>
                                                        ) : customerHistory.length > 0 ? (
                                                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                                                {customerHistory.slice(0, 5).map((h: any) => (
                                                                    <div key={h.id} className="bg-white p-2 rounded-lg border border-gray-200 text-[11px] shadow-sm">
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <span className="font-bold text-gray-700">
                                                                                {new Date(h.booking_date).toLocaleDateString('id-ID', {
                                                                                    day: 'numeric',
                                                                                    month: 'short',
                                                                                    year: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                            </span>
                                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${h.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                                {h.status === 'completed' ? 'Selesai' : h.status}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-gray-600 mb-1">{h.service?.name || h.service_name}</p>
                                                                        {h.notes && (
                                                                            <div className="mt-1 bg-amber-50 p-1.5 rounded border border-amber-100 text-amber-800">
                                                                                <p className="italic">"{h.notes}"</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                {customerHistory.length > 5 && (
                                                                    <p className="text-center text-[10px] text-gray-400 mt-1">Dan {customerHistory.length - 5} kunjungan lainnya...</p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-center py-4 text-xs text-gray-400 italic">Belum ada riwayat kunjungan.</p>
                                                        )}
                                                    </div>

                                                    {/* Add Note for this visit */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <MessageSquare size={16} className="text-[#C58940]" />
                                                            <span className="text-xs font-bold text-[#C58940] uppercase tracking-wider">Catatan Kunjungan Ini</span>
                                                        </div>
                                                        <textarea
                                                            value={formData.notes}
                                                            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                                                            placeholder="Tambahkan catatan untuk kunjungan hari ini..."
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none text-xs min-h-[80px] transition-all"
                                                        />
                                                    </div>

                                                    {/* Additional Guests Info */}
                                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                                        <div className="flex justify-between items-center px-1">
                                                            <div className="flex items-center gap-2">
                                                                <Users size={16} className="text-[#C58940]" />
                                                                <span className="text-xs font-bold text-[#C58940] uppercase tracking-wider">Detail Tamu Tambahan</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const maxGIdx = Math.max(...bookingItems.map(i => i.guestIndex), 0);
                                                                    const newItem: ManualBookingItem = {
                                                                        tempId: Math.random().toString(36).substr(2, 9),
                                                                        serviceId: 0, // Force select service
                                                                        staffId: 0, // Force select staff
                                                                        roomId: null,
                                                                        startTime: '', // Force select time
                                                                        guestIndex: maxGIdx + 1,
                                                                        guestName: '',
                                                                        guestPhone: '',
                                                                        guestType: 'dewasa',
                                                                        guestAge: '',
                                                                    };
                                                                    const newItems = [...bookingItems, newItem];
                                                                    setBookingItems(newItems);
                                                                    setFormData(p => ({ ...p, serviceIds: newItems.map(i => i.serviceId) }));
                                                                }}
                                                                className="text-[10px] font-bold text-[#C58940] hover:text-[#A67030] flex items-center gap-1 transition-colors px-2 py-1 bg-[#C58940]/10 rounded-lg shadow-sm"
                                                            >
                                                                <Plus size={12} strokeWidth={3} /> Tambah Tamu
                                                            </button>
                                                        </div>
                                                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {bookingItems.length <= 1 && (
                                                                <div className="text-center py-10 px-4 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                                        <Users size={20} className="text-gray-200" />
                                                                    </div>
                                                                    <p className="text-xs font-medium">Belum ada tamu tambahan</p>
                                                                    <p className="text-[10px] mt-1 opacity-70">Klik "Tambah Tamu" di atas untuk menambahkan informasi tamu lain.</p>
                                                                </div>
                                                            )}
                                                            {(() => {
                                                                const uniqueGuestIndices = Array.from(new Set(bookingItems.map(i => i.guestIndex)))
                                                                    .sort((a, b) => a - b);

                                                                const selectedCustomer = customers.find(c => c.id === formData.customerId);

                                                                return uniqueGuestIndices.map((gIdx, displayIdx) => {
                                                                    const itemsInGroup = bookingItems.filter(i => i.guestIndex === gIdx);
                                                                    const firstInGroup = itemsInGroup[0];
                                                                    const isMainGuest = gIdx === 0;

                                                                    return (
                                                                        <div key={gIdx} className="bg-white p-4 rounded-2xl space-y-4 border border-gray-100 shadow-sm transition-all hover:shadow-md relative animate-in fade-in slide-in-from-top-2">
                                                                            {/* Header Tamu */}
                                                                            <div className="flex justify-between items-center bg-[#C58940]/5 -mx-4 -mt-4 px-4 py-2.5 rounded-t-2xl border-b border-[#C58940]/10">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-6 h-6 bg-[#C58940] text-white text-xs font-black rounded-lg flex items-center justify-center shadow-lg shadow-[#C58940]/20">
                                                                                        {displayIdx + 1}
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-[10px] font-black text-[#C58940] uppercase tracking-widest leading-none">Tamu {displayIdx + 1} {isMainGuest ? '(Utama)' : ''}</p>
                                                                                        <p className="text-[9px] text-[#C58940]/60 font-medium">{itemsInGroup.length} Layanan</p>
                                                                                    </div>
                                                                                </div>
                                                                                {!isMainGuest && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            const updated = bookingItems.filter(i => i.guestIndex !== gIdx);
                                                                                            setBookingItems(updated);
                                                                                            setFormData(p => ({ ...p, serviceIds: updated.map(u => u.serviceId) }));
                                                                                        }}
                                                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                                        title="Hapus Seluruh Tamu"
                                                                                    >
                                                                                        <X size={14} />
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            {/* Informasi Tamu */}
                                                                            <div className="grid grid-cols-2 gap-3 pt-1">
                                                                                <div className="col-span-2">
                                                                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Nama Lengkap</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Ketik nama tamu..."
                                                                                        value={isMainGuest ? (selectedCustomer?.name || customerSearch.trim() || 'Guest') : (firstInGroup.guestName || '')}
                                                                                        readOnly={isMainGuest}
                                                                                        onChange={e => {
                                                                                            if (isMainGuest) return;
                                                                                            const updated = bookingItems.map(i =>
                                                                                                i.guestIndex === gIdx ? { ...i, guestName: e.target.value } : i
                                                                                            );
                                                                                            setBookingItems(updated);
                                                                                        }}
                                                                                        className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-100 text-xs font-semibold outline-none focus:border-[#C58940] focus:ring-4 focus:ring-[#C58940]/5 transition-all ${isMainGuest ? 'bg-gray-100/50 cursor-not-allowed opacity-80' : 'bg-gray-50/30'}`}
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Kategori</label>
                                                                                    {isMainGuest ? (
                                                                                        <div className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 text-xs font-semibold bg-gray-100/50 opacity-80">Dewasa</div>
                                                                                    ) : (
                                                                                        <SearchableSelect
                                                                                            value={firstInGroup.guestType || 'dewasa'}
                                                                                            onChange={val => {
                                                                                                const newType = val as 'dewasa' | 'anak';
                                                                                                const updated = bookingItems.map(i => {
                                                                                                    if (i.guestIndex === gIdx) {
                                                                                                        const newItem = { ...i, guestType: newType };
                                                                                                        if (newType === 'anak') newItem.guestPhone = '';
                                                                                                        else newItem.guestAge = '';
                                                                                                        return newItem;
                                                                                                    }
                                                                                                    return i;
                                                                                                });
                                                                                                setBookingItems(updated);
                                                                                            }}
                                                                                            options={[
                                                                                                { value: 'dewasa', label: 'Dewasa' },
                                                                                                { value: 'anak', label: 'Anak-anak' }
                                                                                            ]}
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">
                                                                                        {isMainGuest ? "WhatsApp" : (firstInGroup.guestType === 'anak' ? "Usia (Tahun)" : "WhatsApp")}
                                                                                    </label>
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder={isMainGuest ? "0812..." : (firstInGroup.guestType === 'anak' ? "Contoh: 7" : "0812...")}
                                                                                        value={isMainGuest ? (selectedCustomer?.phone || '') : (firstInGroup.guestType === 'anak' ? (firstInGroup.guestAge || '') : (firstInGroup.guestPhone || ''))}
                                                                                        readOnly={isMainGuest}
                                                                                        onChange={e => {
                                                                                            if (isMainGuest) return;
                                                                                            const updated = bookingItems.map(i => {
                                                                                                if (i.guestIndex === gIdx) {
                                                                                                    const newItem = { ...i };
                                                                                                    if (i.guestType === 'anak') newItem.guestAge = e.target.value;
                                                                                                    else newItem.guestPhone = e.target.value;
                                                                                                    return newItem;
                                                                                                }
                                                                                                return i;
                                                                                            });
                                                                                            setBookingItems(updated);
                                                                                        }}
                                                                                        className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-100 text-xs font-semibold outline-none focus:border-[#C58940] focus:ring-4 focus:ring-[#C58940]/5 transition-all ${isMainGuest ? 'bg-gray-100/50 cursor-not-allowed opacity-80' : 'bg-gray-50/30'}`}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
                                                                                <div className="flex justify-between items-center mb-1 px-1">
                                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Layanan Dipesan</p>
                                                                                </div>
                                                                                <div className="grid gap-2">
                                                                                    {itemsInGroup.map((item) => {
                                                                                        const s = services.find(srv => srv.id === item.serviceId);
                                                                                        const v = item.variantId ? s?.variants?.find(vx => vx.id === item.variantId) : null;

                                                                                        return (
                                                                                            <div key={item.tempId} className="group relative">
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.preventDefault();
                                                                                                        setShowServicePopup({ guestIdx: gIdx, tempId: item.tempId });
                                                                                                    }}
                                                                                                    className="w-full flex items-center justify-between pl-4 pr-3 py-3 bg-gray-50/50 border border-gray-100/80 rounded-xl hover:border-[#C58940]/40 hover:bg-white hover:shadow-sm transition-all text-left"
                                                                                                >
                                                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                                                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[#C58940] shadow-xs group-hover:scale-110 transition-transform">
                                                                                                            <Sparkles size={14} />
                                                                                                        </div>
                                                                                                        <div className="overflow-hidden">
                                                                                                            <p className="text-[11px] font-bold text-gray-700 leading-tight truncate">
                                                                                                                {s ? s.name : 'Pilih Layanan...'}
                                                                                                            </p>
                                                                                                            {v && (
                                                                                                                <p className="text-[9px] font-semibold text-[#C58940] mt-0.5">{v.name}</p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        {s && <span className="text-[10px] font-black text-gray-300">Rp {getEffectivePrice(s, v).toLocaleString('id-ID')}</span>}
                                                                                                        <ChevronDown size={12} className="text-gray-300 group-hover:text-[#C58940] transition-colors" />
                                                                                                    </div>
                                                                                                </button>
                                                                                                {itemsInGroup.length > 1 && (
                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            const updated = bookingItems.filter(i => i.tempId !== item.tempId);
                                                                                                            setBookingItems(updated);
                                                                                                            setFormData(p => ({ ...p, serviceIds: updated.map(u => u.serviceId) }));
                                                                                                        }}
                                                                                                        className="absolute -right-2 -top-2 w-6 h-6 bg-white border border-gray-100 text-gray-300 hover:text-red-500 hover:border-red-100 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                                                                                    >
                                                                                                        <X size={10} strokeWidth={3} />
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        const lastInGuest = itemsInGroup[itemsInGroup.length - 1];

                                                                                        const newItem: ManualBookingItem = {
                                                                                            ...lastInGuest,
                                                                                            tempId: Math.random().toString(36).substr(2, 9),
                                                                                            staffId: 0, // Force select staff for new service
                                                                                            startTime: '' // Force select time for new service
                                                                                        };
                                                                                        const updated = [...bookingItems, newItem];
                                                                                        setBookingItems(updated);
                                                                                        setFormData(p => ({ ...p, serviceIds: updated.map(i => i.serviceId) }));
                                                                                    }}
                                                                                    className="w-full py-2.5 border-2 border-dashed border-gray-100 rounded-xl text-[10px] font-black text-gray-300 hover:text-[#C58940] hover:border-[#C58940]/30 hover:bg-[#C58940]/5 transition-all flex items-center justify-center gap-1.5 mt-2 group"
                                                                                >
                                                                                    <Plus size={12} strokeWidth={3} className="group-hover:rotate-90 transition-transform" /> TAMBAH LAYANAN
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 3: Detailed Configuration */}
                                    {bookingStep === 3 && (
                                        <div className="space-y-6 pb-24">
                                            {bookingItems.length === 0 && <p className="text-center text-gray-400 italic">Tidak ada layanan dipilih.</p>}
                                            {bookingItems.map((item, index) => {
                                                const service = services.find(s => s.id === item.serviceId);
                                                const selectedCustomer = customers.find(c => c.id === formData.customerId);
                                                const mainCustomerName = selectedCustomer?.name || customerSearch.trim() || 'Guest';
                                                const itemDuration = getManualItemDuration(item);
                                                const requiresRoom = serviceRequiresRoom(service);
                                                // Time calc
                                                let endM = 0;
                                                let endTime = '';
                                                if (item.startTime && service) {
                                                    const [sh, sm] = item.startTime.split(':').map(Number);
                                                    endM = sh * 60 + sm + itemDuration;
                                                    const eh = Math.floor(endM / 60);
                                                    const em = endM % 60;
                                                    endTime = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
                                                }

                                                return (
                                                    <div key={item.tempId} className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
                                                        <div className="absolute top-2 right-2 flex items-center gap-1">
                                                            <span className="text-xs font-bold text-gray-300">#{index + 1}</span>
                                                            <button
                                                                onClick={() => {
                                                                    setBookingItems(prev => prev.filter(i => i.tempId !== item.tempId));
                                                                    setFormData(p => ({ ...p, serviceIds: p.serviceIds.filter(id => id !== item.serviceId) }));
                                                                }}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Sparkles size={16} className="text-[#C58940]" />
                                                            <div className="flex flex-col">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setShowServicePopup({ guestIdx: item.guestIndex, tempId: item.tempId });
                                                                    }}
                                                                    className="group flex items-center gap-1.5 text-left font-bold text-[#453C67] leading-tight hover:text-[#C58940] transition-colors"
                                                                    title="Ubah layanan"
                                                                >
                                                                    <span>{service?.name || 'Pilih Layanan...'}</span>
                                                                    <ChevronDown size={13} className="text-gray-300 group-hover:text-[#C58940]" />
                                                                </button>
                                                                {item.variantId && (() => {
                                                                    const variant = service?.variants?.find(v => v.id === item.variantId);
                                                                    return variant ? (
                                                                        <span className="text-[9px] font-bold text-[#C58940] mt-0.5">{variant.name}</span>
                                                                    ) : null;
                                                                })()}
                                                                <p className="text-[10px] font-bold text-[#C58940]">
                                                                    Tamu: {item.guestIndex === 0 ? mainCustomerName : (item.guestName || `Tamu ${item.guestIndex + 1}`)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Terapis</label>
                                                                <div className="relative">
                                                                    <SearchableSelect
                                                                        value={item.staffId}
                                                                        onChange={(val) => {
                                                                            setBookingItems(prev => {
                                                                                const updated = [...prev];
                                                                                const idx = updated.findIndex(i => i.tempId === item.tempId);
                                                                                if (idx > -1) updated[idx].staffId = Number(val);
                                                                                return updated;
                                                                            });
                                                                        }}
                                                                        options={activeStaffList.map(st => {
                                                                            const gender = st.gender?.toLowerCase();
                                                                            const genderLabel = gender === 'perempuan' || gender === 'female' || gender === 'p' || gender === 'f' ? '(P)' :
                                                                                gender === 'laki-laki' || gender === 'male' || gender === 'l' || gender === 'm' ? '(L)' : '';
                                                                            return {
                                                                                value: st.id,
                                                                                label: `${st.name} ${genderLabel}`.trim()
                                                                            };
                                                                        })}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Jam Mulai</label>
                                                                <button
                                                                    onClick={() => setSlotPickerItem(item)}
                                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${item.startTime
                                                                        ? 'border-[#C58940] bg-[#FAEAB1]/40 text-[#453C67]'
                                                                        : 'border-gray-200 bg-white text-gray-400'
                                                                        }`}
                                                                >
                                                                    <span>{item.startTime || 'Pilih Jam...'}</span>
                                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </button>
                                                                <p className="text-[10px] text-gray-400 mt-1">Selesai: {endTime}</p>
                                                            </div>
                                                        </div>

                                                        {requiresRoom && (
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Ruangan</label>
                                                                <SearchableSelect
                                                                    placeholder="Pilih Ruangan..."
                                                                    value={item.roomId || ''}
                                                                    portal
                                                                    dropdownClassName="max-h-[320px]"
                                                                    onChange={(val) => {
                                                                        setBookingItems(prev => {
                                                                            const updated = [...prev];
                                                                            const idx = updated.findIndex(i => i.tempId === item.tempId);
                                                                            if (idx > -1) updated[idx].roomId = val ? Number(val) : null;
                                                                            return updated;
                                                                        });
                                                                    }}
                                                                    options={rooms.map(r => {
                                                                        const dateStr = formatDateInput(currentDate);
                                                                        let isAvailable = true;
                                                                        let errorMsg = '';
                                                                        const roomCapacity = getRoomCapacity(r);
                                                                        const minBookingCapacity = getRoomMinBookingCapacity(r);
                                                                        if (item.startTime && service) {
                                                                            const overlap = checkRoomOverlap(r.id, dateStr, item.startTime, itemDuration);
                                                                            const sameRoomDraftCount = countOverlappingDraftRoomBookings(r.id, item.startTime, itemDuration, item.tempId);
                                                                            const totalRoomUsage = overlap.usedCount + sameRoomDraftCount + 1;
                                                                            if (totalRoomUsage > roomCapacity) {
                                                                                isAvailable = false;
                                                                                errorMsg = `Terisi ${overlap.usedCount + sameRoomDraftCount}/${roomCapacity}`;
                                                                            }
                                                                        } else {
                                                                            isAvailable = false;
                                                                            errorMsg = 'Pilih Jam Dahulu';
                                                                        }

                                                                        return {
                                                                            value: r.id,
                                                                            label: r.name,
                                                                            disabled: !isAvailable,
                                                                            display: (
                                                                                <div className="flex justify-between items-center w-full gap-4">
                                                                                    <div className="flex flex-col">
                                                                                        <span>{r.name} - <span className="text-[10px] opacity-70 uppercase">{r.type}</span></span>
                                                                                        {isAvailable && minBookingCapacity > 1 && (
                                                                                            <span className="text-[10px] text-amber-600 font-bold uppercase">
                                                                                                Khusus minimal {minBookingCapacity} orang
                                                                                            </span>
                                                                                        )}
                                                                                        {!isAvailable && <span className="text-[10px] text-red-500 font-bold uppercase">{errorMsg}</span>}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {r.price > 0 && <span className="text-[10px] font-bold text-[#C58940]">+{parseFloat(r.price.toString()).toLocaleString('id-ID')}</span>}
                                                                                        {isAvailable ? (
                                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-[8px] font-bold text-green-600 uppercase border border-green-100">
                                                                                                <div className="w-1 h-1 rounded-full bg-green-500" /> Tersedia
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-[8px] font-bold text-red-600 uppercase border border-red-100">
                                                                                                <X size={8} /> {errorMsg === 'Pilih Jam Dahulu' ? 'N/A' : 'Terisi'}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        };
                                                                    })}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            <div className="bg-[#FAF8F1] rounded-lg p-3 mt-3">
                                                <h5 className="font-medium text-[#453C67] mb-2 text-sm">Ringkasan</h5>
                                                {(() => {
                                                    const { serviceTotal: totalService, roomTotal: totalRoom, grandTotal } = getBookingItemsTotals(bookingItems);
                                                    const _paidAmount = editingBooking ? getPaidAmountForEditingBooking() : 0;
                                                    const _diff = grandTotal - _paidAmount;

                                                    const isUnpaid = editingBooking && (editingBooking.paymentStatus === 'unpaid' || (editingBooking.paymentStatus as string) === 'pending');

                                                    return (
                                                        <div className="space-y-1 text-xs">
                                                            <div className="flex justify-between font-medium">
                                                                <span className="text-gray-500">Total Layanan ({bookingItems.length} item)</span>
                                                                <span>Rp {totalService.toLocaleString('id-ID')}</span>
                                                            </div>
                                                            {totalRoom > 0 && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500">Biaya Ruangan</span>
                                                                    <span>Rp {totalRoom.toLocaleString('id-ID')}</span>
                                                                </div>
                                                            )}

                                                            <hr className="my-1" />

                                                            {editingBooking ? (
                                                                isUnpaid ? (
                                                                    <div className="flex justify-between font-bold">
                                                                        <span>Total Tagihan</span>
                                                                        <span className="text-[#C58940]">Rp {grandTotal.toLocaleString('id-ID')}</span>
                                                                    </div>
                                                                        ) : (
                                                                    <>
                                                                        <div className="flex justify-between text-gray-500"><span>Total Lama (Sudah Bayar)</span><span>Rp {_paidAmount.toLocaleString('id-ID')}</span></div>
                                                                        <div className="flex justify-between font-bold"><span>Total Baru</span><span className="text-[#C58940]">Rp {grandTotal.toLocaleString('id-ID')}</span></div>

                                                                        {_diff !== 0 && (
                                                                            <div className={`flex justify-between font-bold mt-1 ${_diff > 0 ? 'text-red-500 bit-italic' : 'text-green-600'}`}>
                                                                                <span>{_diff > 0 ? 'Kurang Bayar' : 'Lebih Bayar (Refund)'}</span>
                                                                                <span>Rp {Math.abs(_diff).toLocaleString('id-ID')}</span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )
                                                            ) : (
                                                                <div className="flex justify-between font-bold">
                                                                    <span>Total Estimasi</span>
                                                                    <span className="text-[#C58940]">Rp {grandTotal.toLocaleString('id-ID')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-white">
                            {showSuccess ? (
                                <button onClick={closeModal} className="w-full py-3 bg-gradient-to-r from-[#C58940] to-[#E5BA73] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
                                    Tutup
                                </button>
                            ) : isBlockingTime ? (
                                <div className="flex gap-3">
                                    {editingBlockId && (
                                        <button
                                            onClick={async () => {
                                                if (!editingBlockId) return;
                                                const confirmed = window.confirm('Hapus blokir waktu ini?');
                                                if (!confirmed) return;
                                                try {
                                                    await api.deleteBooking(editingBlockId);
                                                    // Refresh bookings
                                                    const targetDateStr = selectedSlot?.date || formatDateInput(currentDate);
                                                    const bookingsRes = await api.getCalendar({
                                                        branch_id: selectedBranchId,
                                                        date: targetDateStr,
                                                        view: 'day'
                                                    });
                                                    const fetchedBookings = bookingsRes.bookings || [];
                                                    const refreshedBookings = fetchedBookings
                                                        .map((b: any) => ({
                                                            ...b,
                                                            staffId: Number(b.staffId || b.therapist_id),
                                                            start: b.start || b.start_time || '',
                                                            date: b.date || b.booking_date || '',
                                                            isBlocked: b.isBlocked || b.is_blocked || false,
                                                            blockReason: b.blockReason || b.block_reason || '',
                                                            paymentStatus: b.paymentStatus || b.payment_status || 'unpaid',
                                                            servicePrice: parseFloat(b.servicePrice || 0),
                                                            roomPrice: parseFloat(b.roomPrice || 0),
                                                            guestCount: parseInt(b.guestCount || 1)
                                                        }))
                                                        .filter((b: any) => {
                                                            if (b.isBlocked || b.is_blocked) return true;
                                                            if (b.status === 'cancelled') return false;
                                                            const guests = b.guests ? (Array.isArray(b.guests) ? b.guests : Object.values(b.guests)) : [];
                                                        
                                                            return true;
                                                        });
                                                    setBookings(refreshedBookings);
                                                    setToast({ message: 'Blokir waktu berhasil dihapus', type: 'success' });
                                                    closeModal();
                                                } catch (err: any) {
                                                    setToast({ message: err.message || 'Gagal menghapus blokir', type: 'error' });
                                                }
                                            }}
                                            className="px-5 py-3 border-2 border-red-500 text-red-500 rounded-xl font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={18} />
                                            Hapus
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleSubmitBooking(false)}
                                    disabled={isSubmitting || !blockReason || !blockStaffId || !blockStartTime || !blockEndTime}

                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <AlertTriangle size={20} />}
                                        {editingBlockId ? 'Simpan Perubahan' : 'Blokir Waktu'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    {bookingStep > (editingBooking ? 2 : 1) && !isRescheduleMode && (
                                        <button
                                            onClick={() => setBookingStep(p => p - 1)}
                                            className={`${bookingStep === 3 ? 'flex-1' : 'px-5'} py-3 border-2 border-[#C58940] text-[#C58940] rounded-xl font-semibold hover:bg-[#FAEAB1] transition-all duration-200 flex items-center justify-center gap-2`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Kembali
                                        </button>
                                    )}
                                    {bookingStep < 3 ? (
                                        <button
                                            onClick={() => setBookingStep(p => p + 1)}
                                            disabled={(bookingStep === 1 && formData.serviceIds.length === 0) || (bookingStep === 2 && bookingItems.some(i => i.serviceId === 0))}
                                            className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${(bookingStep === 1 && formData.serviceIds.length === 0) || (bookingStep === 2 && bookingItems.some(i => i.serviceId === 0))
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-[#C58940] to-[#E5BA73] text-white hover:shadow-lg hover:scale-[1.02]'
                                                }`}
                                        >
                                            Lanjut
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <>
                                            {(() => {
                                                const { grandTotal: _newTotal } = getBookingItemsTotals(bookingItems);
                                                const _paidAmount = editingBooking ? getPaidAmountForEditingBooking() : 0;
                                                const _diff = _newTotal - _paidAmount;

                                                const isUnpaid = editingBooking && (editingBooking.paymentStatus === 'unpaid' || (editingBooking.paymentStatus as string) === 'pending');
                                                const isStep3Valid = bookingItems.length > 0 && bookingItems.every(it =>
                                                    it.serviceId > 0 &&
                                                    it.staffId > 0 &&
                                                    it.startTime !== '' &&
                                                    (!itemRequiresRoom(it) || it.roomId !== null)
                                                );

                                                return (
                                                    <div className="flex gap-3 w-full">
                                                        <button
                                                            onClick={() => handleSubmitBooking(false)}
                                                            disabled={!isStep3Valid || isSubmitting}
                                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${!isStep3Valid || isSubmitting
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                                : 'bg-white border-2 border-[#C58940] text-[#C58940] hover:bg-[#FAEAB1] hover:shadow-md'
                                                                }`}
                                                        >
                                                            {isSubmitting ? 'Menyimpan...' : 'Simpan Saja'}
                                                        </button>

                                                        {editingBooking && !isUnpaid && _diff < 0 ? (
                                                            <button
                                                                onClick={() => {
                                                                    swal.info(`Refund sebesar Rp ${Math.abs(_diff).toLocaleString('id-ID')} akan diproses.`);
                                                                    handleSubmitBooking(false);
                                                                }}
                                                                disabled={!isStep3Valid || isSubmitting}
                                                                className="flex-[1.5] py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-200 hover:scale-[1.02]"
                                                            >
                                                                <Receipt size={18} />
                                                                Refund Rp {Math.abs(_diff).toLocaleString('id-ID')}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleSubmitBooking(true)}
                                                                disabled={!isStep3Valid || isSubmitting}
                                                                className={`flex-[1.5] py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${!isStep3Valid || isSubmitting
                                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                    : 'bg-gradient-to-r from-emerald-500 to-[#059669] text-white hover:shadow-emerald-200 hover:scale-[1.02]'
                                                                    } ${editingBooking && !isUnpaid && _diff <= 0 ? 'hidden' : ''}`}
                                                            >
                                                                <ShoppingCart size={18} />
                                                                {isSubmitting ? 'Proses...' : (editingBooking && !isUnpaid && _diff > 0 ? `Bayar (+Rp ${_diff.toLocaleString('id-ID')})` : 'Bayar & Checkout')}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* === Slot Picker Popup === */}
            {slotPickerItem && (() => {
                const pickerItem = slotPickerItem;
                const pickerStaff = activeStaffList.find(s => s.id === pickerItem.staffId);
                const pickerSrv = services.find(s => s.id === pickerItem.serviceId);
                const pickerVariant = pickerItem.variantId ? pickerSrv?.variants?.find(v => v.id === pickerItem.variantId) : null;
                const pickerDuration = pickerVariant?.duration || pickerSrv?.duration || 60;
                const dateObj = new Date(selectedSlot!.date);
                const dateStr = selectedSlot!.date;

                const shift = getShift(pickerItem.staffId, dateObj);
                const shiftStartMin = shift ? toMin(shift.startTime) : 0;
                const shiftEndMin = shift ? toMin(shift.endTime) : 0;

                // Build all slots within shift
                const pickerSlots: number[] = [];
                if (shift) {
                    for (let m = shiftStartMin; m + pickerDuration <= shiftEndMin; m += rescheduleInterval) {
                        pickerSlots.push(m);
                    }
                }
                const getSlotMeta = (m: number) => {
                    const timeStr = formatTimeSlot(m);
                    const endM = m + pickerDuration;
                    // Check if it's the currently selected time
                    if (pickerItem.startTime === timeStr) return 'selected';
                    // Check draft conflicts
                    const inDraft = bookingItems.some(bi => {
                        if (bi.tempId === pickerItem.tempId || !bi.staffId || bi.staffId !== pickerItem.staffId || !bi.startTime) return false;
                        const biSrv = services.find(s => s.id === bi.serviceId);
                        const biDur = (bi.variantId ? biSrv?.variants?.find(v => v.id === bi.variantId)?.duration : null) || biSrv?.duration || 60;
                        const biStart = toMin(bi.startTime);
                        return m < biStart + biDur && endM > biStart;
                    });
                    if (inDraft) return 'draft-conflict';
                    // Check DB bookings
                    const dbBooking = bookings.find(b => {
                        if (b.staffId !== pickerItem.staffId || b.date !== dateStr) return false;
                        if (b.status === 'cancelled') return false;
                        if (editingBooking && b.id === editingBooking.id) return false;
                        const [bH, bMn] = b.start.split(':').map(Number);
                        const bStart = bH * 60 + bMn;
                        const bEnd = bStart + b.duration;
                        return m < bEnd && endM > bStart;
                    });
                    if (dbBooking) return dbBooking.isBlocked ? 'blocked' : 'booked';
                    // Past time
                    const now = new Date();
                    const checkDate = new Date(dateStr);
                    checkDate.setHours(0, 0, 0, 0);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    if (checkDate < today) return 'past';
                    if (checkDate.getTime() === today.getTime() && m < now.getHours() * 60 + now.getMinutes()) return 'past';
                    return 'available';
                };

                // Group slots into rows of 4
                const rows: number[][] = [];
                for (let i = 0; i < pickerSlots.length; i += 4) rows.push(pickerSlots.slice(i, i + 4));

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[230] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-[#C58940] to-[#E5BA73] p-4 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full ${pickerStaff?.color || 'bg-gray-400'} flex items-center justify-center font-bold text-white text-sm shadow-md`}>
                                            {(pickerStaff?.name || 'T')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">
                                                {(() => {
                                                    const gender = pickerStaff?.gender?.toLowerCase();
                                                    const genderLabel = gender === 'perempuan' || gender === 'female' || gender === 'p' || gender === 'f' ? '(P)' :
                                                        gender === 'laki-laki' || gender === 'male' || gender === 'l' || gender === 'm' ? '(L)' : '';
                                                    return `${pickerStaff?.name || 'Terapis'} ${genderLabel}`.trim();
                                                })()}
                                            </p>
                                            <p className="text-xs opacity-80">
                                                {shift ? `${shift.startTime} – ${shift.endTime}` : 'Tidak ada shift'}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSlotPickerItem(null)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                                        {pickerSrv?.name}{pickerVariant ? ` – ${pickerVariant.name}` : ''} • {pickerDuration} mnt
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex gap-3 px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />Tersedia</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />Terboking</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-700 inline-block" />Diblokir</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#FAEAB1] border border-[#C58940] inline-block" />Dipilih</span>
                            </div>

                            {/* Slot Grid */}
                            <div className="p-4 pt-2 max-h-72 overflow-y-auto space-y-2">
                                {pickerSlots.length === 0 && (
                                    <p className="text-center text-gray-400 italic py-6 text-sm">Tidak ada slot tersedia dalam shift ini.</p>
                                )}
                                {rows.map((row, ri) => (
                                    <div key={ri} className="grid grid-cols-4 gap-2">
                                        {row.map(m => {
                                            const timeStr = formatTimeSlot(m);
                                            const meta = getSlotMeta(m);
                                            const isSelectable = meta === 'available' || meta === 'selected';

                                            let cls = 'rounded-lg py-2.5 text-center text-xs font-bold transition-all border ';
                                            if (meta === 'selected') {
                                                cls += 'bg-[#FAEAB1] border-[#C58940] text-[#7B5D2A] shadow-sm ring-2 ring-[#C58940]/40';
                                            } else if (meta === 'available') {
                                                cls += 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm cursor-pointer';
                                            } else if (meta === 'booked') {
                                                cls += 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed line-through';
                                            } else if (meta === 'blocked') {
                                                cls += 'bg-gray-700 border-gray-800 text-gray-300 cursor-not-allowed';
                                            } else if (meta === 'draft-conflict') {
                                                cls += 'bg-orange-50 border-orange-200 text-orange-400 cursor-not-allowed';
                                            } else {
                                                cls += 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed';
                                            }

                                            return (
                                                <button
                                                    key={m}
                                                    disabled={!isSelectable}
                                                    onClick={() => {
                                                        if (!isSelectable) return;
                                                        setBookingItems(prev => {
                                                            const updated = [...prev];
                                                            const idx = updated.findIndex(i => i.tempId === pickerItem.tempId);
                                                            if (idx > -1) updated[idx] = { ...updated[idx], startTime: timeStr };
                                                            return updated;
                                                        });
                                                        setSlotPickerItem(prev => prev ? { ...prev, startTime: timeStr } : null);
                                                    }}
                                                    className={cls}
                                                >
                                                    {timeStr}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="px-4 pb-4">
                                <button
                                    onClick={() => setSlotPickerItem(null)}
                                    className="w-full py-2.5 bg-gradient-to-r from-[#C58940] to-[#E5BA73] text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all"
                                >
                                    Konfirmasi {pickerItem.startTime ? `– ${pickerItem.startTime}` : ''}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Booking Detail Modal */}
   {showDetailModal && selectedBooking && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
        <div className="w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden" style={{ maxHeight: '90vh', background: '#faf8f5', boxShadow: '0 32px 80px rgba(0,0,0,0.18)', border: '1px solid rgba(180,160,130,0.2)' }}>

            {/* Header */}
         {/* Header */}
<div className="flex-shrink-0 px-6 pt-6 pb-5" style={{ background: 'linear-gradient(135deg, #453C67 0%, #6B5B95 100%)', borderBottom: '1px solid rgba(180,160,130,0.15)' }}>
    <div className="flex justify-between items-start">
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Detail Booking</p>
            <h3 className="text-xl font-black text-white">{selectedBooking.invoiceNumber || `#${selectedBooking.id}`}</h3>
            <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                    {selectedBooking.customer[0].toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-bold text-white leading-tight">{selectedBooking.customer}</p>
                    {selectedBooking.customerPhone && (
                        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{selectedBooking.customerPhone}</p>
                    )}
                </div>
            </div>
        </div>
        <button onClick={closeDetailModal}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
            <X size={16} />
        </button>
    </div>
    <div className="flex gap-2 mt-4">
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            {getStatusBadge(selectedBooking.status).label}{getStatusBadge(selectedBooking.status, (selectedBooking as any).refundAmount).label}
     </span>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(245,158,11,0.25)', color: '#fef3c7', border: '1px solid rgba(245,158,11,0.3)' }}>
            {getPaymentStatusBadge(selectedBooking.paymentStatus).label}
        </span>
    </div>
</div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d4c5a9 transparent' }}>

                {/* Customer Card */}
                <div className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid #ede8df', boxShadow: '0 1px 4px rgba(120,100,70,0.06)' }}>
                    <div className="flex items-center gap-4">
                        
                    
                        {selectedBooking.createdAt && (
                            <div className="text-right flex-shrink-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Dibuat</p>
                                <p className="text-sm font-bold text-gray-700">{new Date(selectedBooking.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                {selectedBooking.paymentStatus === 'unpaid' && (
                                    <>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mt-1.5">Deadline</p>
                                        <p className="text-sm font-black text-red-500">
                                            {(() => {
                                                const timeout = companySettings?.paymentTimeout ? parseInt(companySettings.paymentTimeout) : 15;
                                                const d = new Date(new Date(selectedBooking.createdAt).getTime() + timeout * 60000);
                                                return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                            })()}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                  {selectedBooking.status === 'cancelled' && (selectedBooking.paymentStatus === 'paid' || selectedBooking.paymentStatus === 'partial') && (
    <div className="relative group/refund">
        <button
            onClick={() => {
                const rawG = selectedBooking.guests || [];
                const parsedG = Array.isArray(rawG) ? rawG : Object.values(rawG);
                const amount = parsedG.length > 0
                    ? (parsedG as any[]).reduce((sum: number, g: any) =>
                        sum + Number(g.servicePrice || 0) + Number(g.roomPrice || 0), 0)
                    : Number(selectedBooking.servicePrice || 0) + Number(selectedBooking.roomPrice || 0);
                swal.info(`Silakan proses pengembalian dana sebesar Rp ${amount.toLocaleString('id-ID')} melalui menu Kasir.`);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80"
            style={{ background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca' }}>
            <Receipt size={16} />
            Pengembalian Dana
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                style={{ background: '#fecaca', color: '#dc2626' }}>
                ?
            </span>
        </button>
        <div className="absolute bottom-full left-0 right-0 mb-2 px-3 py-2.5 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/refund:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl text-center leading-relaxed">
            Booking dibatalkan setelah ada pembayaran.<br />
            Proses pengembalian dana ke customer secara<br />
            manual melalui metode pembayaran asal.
        </div>
    </div>
)}
                </div>

{/* === GRUP BOOKING INFO === */}
{(() => {
    const rawG = selectedBooking.guests || [];
    const gs = Array.isArray(rawG) ? rawG : Object.values(rawG);
    if (gs.length <= 1) return null; // Skip kalau cuma 1 tamu

    // Kalau ada selectedGuestContext, tampilkan semua tamu dalam grup ini
    // Group by nama+phone untuk deduplikasi
    const uniqueGuests = (gs as any[]).reduce((acc: any[], g: any) => {
        const key = `${g.name || ''}-${g.phone || ''}`;
        if (!acc.find((x: any) => `${x.name || ''}-${x.phone || ''}` === key)) {
            acc.push(g);
        }
        return acc;
    }, []);

    return (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #ede8df', boxShadow: '0 1px 4px rgba(120,100,70,0.06)' }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#faf7f2', borderBottom: '1px solid #f0ebe0' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0" style={{ background: '#fef3c7' }}>
                    <Users size={13} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">
                    Booking Grup · {uniqueGuests.length} Tamu
                </p>
            </div>

            {/* Daftar tamu */}
            <div className="divide-y divide-stone-50">
                {uniqueGuests.map((g: any, idx: number) => {
                    const staff = staffList.find(s => s.id === g.staffId);
                    const isCurrentGuest = selectedGuestContext
                        ? Number(g.staffId) === Number(selectedGuestContext.staffId)
                        : idx === 0;

                    return (
                        <div key={idx} className={`flex items-start gap-3 px-4 py-3 transition-colors ${isCurrentGuest ? 'bg-violet-50/60' : ''}`}>
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0 mt-0.5"
                                style={{ background: isCurrentGuest ? 'linear-gradient(135deg, #453C67, #8b5cf6)' : '#e5e7eb', color: isCurrentGuest ? 'white' : '#6b7280' }}>
                                {(g.name || 'T')[0].toUpperCase()}
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-sm text-gray-800 leading-tight">
                                        {g.name || selectedBooking.customer}
                                    </p>
                                    {isCurrentGuest && (
                                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                            style={{ background: '#ede9fe', color: '#7c3aed' }}>
                                            Tamu ini
                                        </span>
                                    )}
                                    {idx === 0 && !isCurrentGuest && (
                                        <span className="text-[9px] font-bold text-gray-400">(Utama)</span>
                                    )}
                                </div>
                                {g.phone && (
                                    <p className="text-xs text-gray-400 mt-0.5">{g.phone}</p>
                                )}
                                {g.type === 'anak' && g.age && (
                                    <p className="text-xs text-blue-500 font-medium mt-0.5">Anak · {g.age} Tahun</p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                        style={{ background: '#f5f0ff', color: '#7c3aed' }}>
                                        {getServiceVariantLabel(g.serviceName, g.variantName, '-')}
                                    </span>
                                    {staff && (
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            · {staff.name}
                                        </span>
                                    )}
                                    {g.startTime && (
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <Clock size={9} /> {g.startTime}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Harga */}
                            <div className="text-right flex-shrink-0">
                                <p className="text-sm font-black" style={{ color: '#453C67' }}>
                                    Rp {(Number(g.servicePrice || 0) + Number(g.roomPrice || 0)).toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
})()}


                {/* Jadwal + Ruangan */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid #ede8df', boxShadow: '0 1px 4px rgba(120,100,70,0.06)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600 mb-3">Jadwal</p>
                        <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe' }}>
                                <Calendar size={15} style={{ color: '#7c3aed' }} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{selectedBooking.date}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{selectedBooking.start} – {getEndTime(selectedBooking.start, selectedBooking.duration)}</p>
                             <p className="text-sm font-black text-gray-700 mt-0.5">{selectedBooking.duration} <span className="text-xs font-bold text-gray-400">menit</span></p>

                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid #ede8df', boxShadow: '0 1px 4px rgba(120,100,70,0.06)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600 mb-3">Ruangan</p>
                        <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                                <DoorOpen size={15} style={{ color: '#d97706' }} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{rooms.find(r => r.id === selectedBooking.roomId)?.name || '-'}</p>
                                {(selectedBooking.roomPrice || 0) > 0 && (
                                    <p className="text-xs text-amber-600 font-bold mt-0.5">+Rp {(selectedBooking.roomPrice || 0).toLocaleString('id-ID')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
              {/* Notes Per Tamu */}
<div className="rounded-2xl p-4 transition-all"
    style={{
        background: 'white',
        border: isEditingGuestNotes ? '1px solid #c4b5fd' : '1px solid #ede8df',
        boxShadow: isEditingGuestNotes ? '0 0 0 3px rgba(196,181,253,0.15)' : '0 1px 4px rgba(120,100,70,0.06)'
    }}>
    <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
            <ClipboardList size={13} className={isEditingGuestNotes ? 'text-violet-500' : 'text-gray-400'} />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Catatan Per Tamu</p>
        </div>
        {!isEditingGuestNotes ? (
            <button onClick={() => setIsEditingGuestNotes(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                style={{ background: '#f5f2ec', color: '#9c8a6e', border: '1px solid #e8dfd0' }}>
                <Edit size={10} /> Edit
            </button>
        ) : (
            <div className="flex gap-2">
                <button
                    onClick={() => {
                        setIsEditingGuestNotes(false);
                        try {
                            const parsed = selectedBooking.notes ? JSON.parse(selectedBooking.notes) : {};
                            setGuestNotes(typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
                        } catch {
                            setGuestNotes({ '0': selectedBooking.notes || '' });
                        }
                    }}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full text-gray-400 hover:text-gray-600">
                    Batal
                </button>
                <button
                    onClick={async () => {
                        setIsSavingGuestNotes(true);
                        try {
                            const notesJson = JSON.stringify(guestNotes);
                            await api.updateBooking(selectedBooking.id, { notes: notesJson });
                            setSelectedBooking({ ...selectedBooking, notes: notesJson });
                            setBookings(prev => prev.map(b =>
                                b.id === selectedBooking.id ? { ...b, notes: notesJson } : b
                            ));
                            setToast({ message: 'Catatan berhasil disimpan', type: 'success' });
                            setIsEditingGuestNotes(false);
                        } catch {
                            setToast({ message: 'Gagal menyimpan catatan', type: 'error' });
                        } finally {
                            setIsSavingGuestNotes(false);
                        }
                    }}
                    disabled={isSavingGuestNotes}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: '#7c3aed', color: 'white' }}>
                    {isSavingGuestNotes
                        ? <Loader2 size={10} className="animate-spin" />
                        : <CheckCircle size={10} />}
                    Simpan
                </button>
            </div>
        )}
    </div>

    {(() => {
        const rawG = selectedBooking.guests || [];
        const gs = Array.isArray(rawG) ? rawG : Object.values(rawG);

        const uniqueGuests = (gs as any[]).reduce((acc: any[], g: any) => {
            const key = `${g.name || ''}-${g.phone || ''}`;
            if (!acc.find((x: any) => `${x.name || ''}-${x.phone || ''}` === key)) {
                acc.push(g);
            }
            return acc;
        }, []);

        const guestListForNotes = uniqueGuests.length > 0
            ? uniqueGuests
            : [{ name: selectedBooking.customer, phone: selectedBooking.customerPhone }];

        return (
            <div className="space-y-3">
                {guestListForNotes.map((g: any, idx: number) => (
                    <div key={idx}>
                        <p className="text-[10px] font-bold text-gray-400 mb-1">
                            {g.name || `Tamu ${idx + 1}`}
                            {idx === 0 && <span className="ml-1 font-normal">(Utama)</span>}
                        </p>
                        {isEditingGuestNotes ? (
                            <textarea
                                value={guestNotes[String(idx)] || ''}
                                onChange={e => setGuestNotes(prev => ({ ...prev, [String(idx)]: e.target.value }))}
                                placeholder={`Catatan untuk ${g.name || `Tamu ${idx + 1}`}...`}
                                rows={2}
                                style={{ border: '1px solid #ede8df' }}
                                className="w-full text-sm px-3 py-2 rounded-xl resize-none text-gray-700 placeholder:text-gray-300 placeholder:italic outline-none transition-all focus:border-violet-200 bg-gray-50/50"
                            />
                        ) : (
                            <div onClick={() => setIsEditingGuestNotes(true)} className="cursor-pointer">
                                {guestNotes[String(idx)]
                                    ? <p className="text-sm text-gray-600 leading-relaxed">{guestNotes[String(idx)]}</p>
                                    : <p className="text-sm text-gray-300 italic">Klik untuk menambahkan catatan...</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    })()}
</div>

                {/* Guest Details */}
                {((selectedBooking.guests && Object.keys(selectedBooking.guests).length > 0) || (selectedBooking.guestCount || 0) > 0) && (() => {
                    const rawList = selectedBooking.guests || [];
                    const parsedList = Array.isArray(rawList) ? rawList : Object.values(rawList);
                    const guestList: Guest[] = parsedList.length > 0
                        ? (parsedList as any[]).map((g: any) => ({ ...g, name: g.name || selectedBooking.customer, phone: g.phone || selectedBooking.customerPhone })) as Guest[]
                        : [{ id: selectedBooking.id, name: selectedBooking.customer, phone: selectedBooking.customerPhone, type: 'dewasa' as const, serviceId: selectedBooking.serviceId || 0, serviceName: selectedBooking.service, servicePrice: selectedBooking.servicePrice || 0, serviceDuration: selectedBooking.duration || 0, roomId: selectedBooking.roomId || 0, roomName: rooms.find(r => r.id === selectedBooking.roomId)?.name || 'Regular', roomPrice: selectedBooking.roomPrice || 0, staffId: selectedBooking.staffId || 0, staffName: staffList.find(s => s.id === selectedBooking.staffId)?.name || 'Staff', startTime: selectedBooking.start || '' } as Guest];

               // Filter guestList berdasarkan selectedGuestContext
const filteredGuestList = selectedGuestContext
    ? guestList.filter((g: any) => 
        Number(g.staffId) === Number(selectedGuestContext.staffId)
      )
    : guestList;

// Kalau filtered kosong, tampilkan semua (fallback)
const displayGuestList = guestList;

const groupedGuests = displayGuestList.reduce((acc, g) => {
    const key = `${g.name || 'Tamu'}-${g.phone || ''}`;
    if (!acc[key]) acc[key] = { name: g.name, phone: g.phone, type: g.type, age: g.age, items: [] };
    acc[key].items.push(g);
    return acc;
}, {} as Record<string, any>);

const guestGroups = Object.values(groupedGuests).sort((a: any, b: any) => 
    (a.name === selectedBooking.customer ? -1 : b.name === selectedBooking.customer ? 1 : 0));


                    return (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 px-1">Detail Per Tamu</p>
                            {guestGroups.map((group, index) => {
                                const groupTotal = group.items.reduce((sum: number, item: any) => sum + Number(item.servicePrice || 0) + Number(item.roomPrice || 0), 0);
                                return (
                                    <div key={index} className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #ede8df', boxShadow: '0 1px 4px rgba(120,100,70,0.06)' }}>
                                        {/* Guest Header */}
                                        <div className="flex items-center justify-between px-4 py-3" style={{ background: '#faf7f2', borderBottom: '1px solid #f0ebe0' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #92400e, #d97706)' }}>{index + 1}</div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm leading-tight">
                                                        {group.name || 'Tamu'}
                                                        {index === 0 && <span className="ml-1 text-[10px] font-normal text-gray-400">(Utama)</span>}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">{group.items.length} Layanan</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Subtotal</p>
                                                <p className="font-black text-sm" style={{ color: '#453C67' }}>Rp {groupTotal.toLocaleString('id-ID')}</p>
                                            </div>
                                        </div>

                                        {/* Guest Info */}
                                        <div className="px-4 py-2.5 flex gap-3 items-center" style={{ borderBottom: '1px solid #f5f0e8', background: '#fffcf8' }}>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: group.type === 'anak' ? '#dbeafe' : '#ede9fe', color: group.type === 'anak' ? '#1d4ed8' : '#6d28d9' }}>
                                                {group.type === 'anak' ? 'Anak' : 'Dewasa'}
                                            </span>
                                            {group.type === 'anak'
                                                ? <span className="text-xs text-gray-500">{group.age || '-'} Tahun</span>
                                                : group.phone && (
                                                    <a href={`https://wa.me/${group.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline">
                                                        <Phone size={10} /> {group.phone}
                                                    </a>
                                                )
                                            }
                                        </div>

                                        {/* Items */}
                                        <div className="divide-y divide-stone-50">
                                            {group.items.map((item: any, itemIdx: number) => (
                                                <div key={itemIdx} className="px-4 py-3 flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#ede9fe' }}>
                                                            <Sparkles size={14} style={{ color: '#7c3aed' }} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-800 text-sm leading-tight truncate">
                                                                {getServiceVariantLabel(item.serviceName, item.variantName, '-')}
                                                            </p>
                                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-400">
    <span className="flex items-center gap-1">
        <User size={10} /> {item.staffName || '-'}
    </span>
   <span className="flex items-center gap-1">
    <Clock size={10} /> {item.startTime || '-'}
    {item.serviceDuration > 0 && (
        <span className="text-xs font-black text-gray-700 ml-0.5">
            ({item.serviceDuration} mnt)
        </span>
    )}
</span>
    {item.roomName && (
        <span className="flex items-center gap-1">
            <DoorOpen size={10} /> {item.roomName}
            {Number(item.roomPrice) > 0 && (
                <span className="text-amber-500 font-bold ml-0.5">
                    +Rp {Number(item.roomPrice).toLocaleString('id-ID')}
                </span>
            )}
        </span>
    )}
</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        <p className="font-black text-sm" style={{ color: '#453C67' }}>Rp {(Number(item.servicePrice || 0) + Number(item.roomPrice || 0)).toLocaleString('id-ID')}</p>
                                                        {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && selectedBooking.status !== 'no_show' && (
                                                            <div className="flex flex-wrap justify-end gap-1.5">
                                                      {[
    { icon: <Calendar size={15} />, action: () => setConfirmAction({ type: 'reschedule', item }), bg: '#ede9fe', color: '#7c3aed', title: 'Ubah Jadwal' },
    { icon: <Edit size={15} />, action: () => setConfirmAction({ type: 'edit', item }), bg: '#f3e8ff', color: '#9333ea', title: 'Ubah Agenda' },
    { icon: <CheckCircle size={15} />, action: () => setConfirmAction({ type: 'complete', item }), bg: '#f0fdf4', color: '#16a34a', title: 'Selesaikan' },
    { icon: <AlertTriangle size={15} />, action: () => setConfirmAction({ type: 'no_show', item }), bg: '#fff7ed', color: '#ea580c', title: 'Tidak Hadir' },
    { icon: <Ban size={15} />, action: () => setConfirmAction({ type: 'cancel', item }), bg: '#fff5f5', color: '#dc2626', title: 'Batalkan' },
    ...((['paid', 'partial'] as const).includes(selectedBooking.paymentStatus as any) ? [{
        icon: <Receipt size={15} />,
        action: () => {
            setItemToRefund(item);
            setRefundForm({
                amount: String(Number(item.servicePrice || 0) + Number(item.roomPrice || 0)),
                method: 'cash',
                reason: ''
            });
            setShowRefundModal(true);
        },
        bg: '#fef3c7',
        color: '#b45309',
        title: 'Refund Item'
    }] : []),
].map((btn, i) => (
    <button key={i} onClick={btn.action} title={btn.title}
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-80 hover:scale-105 active:scale-95 shadow-sm"
        style={{ background: btn.bg, color: btn.color }}>
        {btn.icon}
    </button>
))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* Products */}
                {selectedBooking.products && selectedBooking.products.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 px-1">Pembelian Produk</p>
                        {selectedBooking.products.map((prod, i) => (
                            <div key={i} className="flex justify-between items-center p-3.5 rounded-2xl" style={{ background: 'white', border: '1px solid #ede8df' }}>
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{prod.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{prod.quantity} x Rp {prod.price.toLocaleString('id-ID')}{prod.variant ? ` · ${prod.variant}` : ''}</p>
                                </div>
                                <p className="text-sm font-black text-amber-700">Rp {prod.subtotal.toLocaleString('id-ID')}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grand Total */}
              {/* Grand Total */}
<div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #453C67 0%, #6B5B95 100%)', boxShadow: '0 4px 20px rgba(69,60,103,0.25)' }}>
    <div className="flex justify-between items-start">
        <div>
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>Total Pembayaran</span>
            <div className="flex items-center gap-1.5 mt-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>
                    {selectedBooking.customer[0].toUpperCase()}
                </div>
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Tagihan atas nama <span className="text-white">{selectedBooking.customer}</span>
                </span>
            </div>
            {(() => {
                const rawG = selectedBooking.guests || [];
                const gs = Array.isArray(rawG) ? rawG : Object.values(rawG);
                const uniqueGuests = [...new Set((gs as any[]).map((g: any) => g.name).filter(Boolean))];
                if (uniqueGuests.length > 1) {
                    return (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {uniqueGuests.map((name, i) => (
                                <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
                                    {name}{i === 0 ? ' (Utama)' : ''}
                                </span>
                            ))}
                        </div>
                    );
                }
                return null;
            })()}
        </div>
   <div className="text-right">
    {(selectedBooking as any).refundAmount > 0 && (() => {
        const rawG = selectedBooking.guests || [];
        const parsedG = Array.isArray(rawG) ? rawG : Object.values(rawG);
        const guestTotal = parsedG.length > 0
            ? (parsedG as any[]).reduce((sum: number, g: any) =>
                sum + Number(g.servicePrice || 0) + Number(g.roomPrice || 0), 0)
            : Number(selectedBooking.servicePrice || 0) + Number(selectedBooking.roomPrice || 0);
        const productTotal = (selectedBooking.products || [])
            .reduce((sum: number, p: any) => sum + Number(p.subtotal || 0), 0);
        const total = guestTotal + productTotal;
        const refund = Number((selectedBooking as any).refundAmount);
        const sisa = total - refund;
        return (
            <div className="space-y-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs opacity-60 line-through">
                        Rp {total.toLocaleString('id-ID')}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(251,146,60,0.2)', color: '#fed7aa' }}>
                        ↩ Refund Rp {refund.toLocaleString('id-ID')}
                    </span>
                </div>
                <span className="text-2xl font-black text-white block">
                    Rp {sisa.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] opacity-60 block">Sisa setelah refund</span>
            </div>
        );
    })()}
    {!((selectedBooking as any).refundAmount > 0) && (
        <span className="text-2xl font-black text-white">
            Rp {(() => {
                const rawG = selectedBooking.guests || [];
                const parsedG = Array.isArray(rawG) ? rawG : Object.values(rawG);
                const guestTotal = parsedG.length > 0
                    ? (parsedG as any[]).reduce((sum: number, g: any) =>
                        sum + Number(g.servicePrice || 0) + Number(g.roomPrice || 0), 0)
                    : Number(selectedBooking.servicePrice || 0) + Number(selectedBooking.roomPrice || 0);
                const productTotal = (selectedBooking.products || [])
                    .reduce((sum: number, p: any) => sum + Number(p.subtotal || 0), 0);
                return (guestTotal + productTotal).toLocaleString('id-ID');
            })()}
        </span>
    )}
</div>
    </div>
</div>

                {/* Status Banner */}
              {(selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled') && (
    <div className="rounded-2xl p-4 flex items-center gap-3" style={{
        background: selectedBooking.status === 'completed' ? '#f0fdf8' :
                    (selectedBooking as any).refundAmount > 0 ? '#fff7ed' : '#fafaf9',
        border: `1px solid ${selectedBooking.status === 'completed' ? '#ccfbf1' :
                 (selectedBooking as any).refundAmount > 0 ? '#fed7aa' : '#e7e5e4'}`,
        color: selectedBooking.status === 'completed' ? '#0d9488' :
               (selectedBooking as any).refundAmount > 0 ? '#c2410c' : '#a8a29e'
    }}>
        {selectedBooking.status === 'completed' ? <CheckCircle size={16} /> :
         (selectedBooking as any).refundAmount > 0 ? <Receipt size={16} /> : <Ban size={16} />}
        <div className="flex-1">
            <p className="text-sm font-bold">
                {selectedBooking.status === 'completed' ? 'Booking ini telah selesai.' :
                 (selectedBooking as any).refundAmount > 0
                    ? `Refund Rp ${Number((selectedBooking as any).refundAmount).toLocaleString('id-ID')} telah diproses.`
                    : 'Booking ini telah dibatalkan.'}
            </p>
            {(selectedBooking as any).refundAmount > 0 && (() => {
                const rawG = selectedBooking.guests || [];
                const parsedG = Array.isArray(rawG) ? rawG : Object.values(rawG);
                const totalTagihan = parsedG.length > 0
                    ? (parsedG as any[]).reduce((sum: number, g: any) => sum + Number(g.servicePrice || 0) + Number(g.roomPrice || 0), 0)
                    : Number(selectedBooking.servicePrice || 0) + Number(selectedBooking.roomPrice || 0);
                const sisa = totalTagihan - Number((selectedBooking as any).refundAmount);
                return (
                    <p className="text-xs mt-0.5 opacity-80">
                        Total tagihan Rp {totalTagihan.toLocaleString('id-ID')} · Sisa Rp {sisa.toLocaleString('id-ID')}
                    </p>
                );
            })()}
        </div>
    </div>
)}

                {/* Refund */}
                {selectedBooking.status === 'cancelled' && (selectedBooking.paymentStatus === 'paid' || selectedBooking.paymentStatus === 'partial') && (
                    <button onClick={() => { const amount = (selectedBooking.servicePrice || 0) + (selectedBooking.roomPrice || 0); swal.info(`Silakan proses refund sebesar Rp ${amount.toLocaleString('id-ID')} melalui menu Kasir.`); }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80"
                        style={{ background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca' }}>
                        <Receipt size={16} /> Proses Refund
                    </button>
                )}

                {/* Bayar */}
                {selectedBooking.status !== 'cancelled' && (selectedBooking.paymentStatus === 'unpaid' || selectedBooking.paymentStatus === 'partial') && (
                    <button onClick={() => {
                        const total = (selectedBooking.servicePrice || 0) + (selectedBooking.roomPrice || 0);
                        const paid = selectedBooking.totalPaid || 0;
                        const rawGuests = selectedBooking.guests || [];
                        const parsedGuests = Array.isArray(rawGuests) ? rawGuests : Object.values(rawGuests);
                        navigate('/pos', { state: { bookingData: {
                            bookingId: selectedBooking.id,
                            customer: { name: selectedBooking.customer, phone: selectedBooking.customerPhone || '-' },
                            notes: selectedBooking.notes || '',
                    services: parsedGuests.length > 0
    ? parsedGuests.map((g: any) => ({
        id: g.variantId || g.serviceId,   // ← prioritaskan variantId kalau ada
        name: getServiceVariantLabel(g.serviceName, g.variantName),
        price: g.servicePrice,
        staff: { id: g.staffId, name: g.staffName || staffList.find(s => s.id === g.staffId)?.name || 'Staff' }
    }))
                                : [{ id: selectedBooking.serviceId || selectedBooking.service_id, name: selectedBooking.service, price: selectedBooking.servicePrice || 0 }],
                            products: selectedBooking.products || [], // ← TAMBAH INI
                            room_ids: parsedGuests.length > 0 ? parsedGuests.map((g: any) => g.roomId) : [selectedBooking.roomId],
                            room_charges: parsedGuests.length > 0 ? parsedGuests.map((g: any) => Number(g.roomPrice || 0)) : [Number(selectedBooking.roomPrice || 0)],
                            room: { name: selectedBooking.roomName || `Ruangan ${selectedBooking.roomId}`, id: selectedBooking.roomId, price: selectedBooking.roomPrice || 0 },
                            date: selectedBooking.date, time: selectedBooking.start, total, paid, dp: paid,
                            promoCode: selectedBooking.promoCode, discountAmount: selectedBooking.discountAmount,
                            isSettlement: paid > 0,
                            staff: { id: selectedBooking.staffId, name: staffList.find(s => s.id === selectedBooking.staffId)?.name || 'Staff' }
                        }}});
                    }}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-base transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', boxShadow: '0 8px 24px rgba(16,185,129,0.2)' }}>
                        <ShoppingCart size={20} />
                        {selectedBooking.paymentStatus === 'partial' ? 'Bayar Pelunasan' : 'Bayar di Kasir'}
                    </button>
                )}

                {/* Lihat Nota */}
                {selectedBooking.invoiceNumber && (
                    <button onClick={() => window.open(`/print/${selectedBooking.invoiceNumber}`, '_blank')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80"
                        style={{ background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                        <Receipt size={16} /> Lihat Nota
                    </button>
                )}

                {/* Tutup */}
                <button onClick={closeDetailModal}
                    className="w-full py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80 mb-2"
                    style={{ background: '#f5f2ec', color: '#9c8a6e', border: '1px solid #e8dfd0' }}>
                    Tutup
                </button>

            </div>
        </div>
    </div>
)}

            {/* Cancel Confirmation Sub-Modal */}
            {
                showCancelConfirm && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]">
                        <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            <h4 className="font-bold text-lg mb-2">Batalkan Booking?</h4>
                            <p className="text-gray-500 text-sm mb-5">
                                Yakin ingin membatalkan booking untuk <strong>{selectedBooking?.customer}</strong>? Aksi ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Tidak</button>
                                <button onClick={handleCancelBooking} disabled={isSubmitting} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
                                    {isSubmitting ? 'Membatalkan...' : 'Ya, Batalkan'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* New Customer Modal */}
            {
                showNewCustomerModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[240]">
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-[#453C67]">Tambah Pelanggan Baru</h3>
                                <button
                                    onClick={() => setShowNewCustomerModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 absolute right-4 top-4"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={newCustomerForm.name}
                                        onChange={e => setNewCustomerForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none"
                                        placeholder="Nama pelanggan"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={newCustomerForm.phone}
                                        onChange={e => setNewCustomerForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none"
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                    <input
                                        type="email"
                                        value={newCustomerForm.email}
                                        onChange={e => setNewCustomerForm(p => ({ ...p, email: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none"
                                        placeholder="email@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                    <input
                                        type="date"
                                        value={newCustomerForm.dob}
                                        onChange={e => setNewCustomerForm(p => ({ ...p, dob: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none"
                                    />
                                </div>

                                <button
                                    onClick={handleCreateNewCustomer}
                                    disabled={isCreatingCustomer}
                                    className="w-full py-3 bg-[#C58940] text-white rounded-xl font-bold hover:bg-[#B07836] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isCreatingCustomer ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            Simpan Pelanggan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                toast && (
                    <div className={`fixed bottom-5 right-5 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-[100] animate-slide-up ${toast.type === 'success' ? 'bg-green-600 text-white' :
                        toast.type === 'info' ? 'bg-blue-600 text-white' :
                            'bg-red-600 text-white'
                        }`}>
                        {toast.type === 'success' ? <CheckCircle size={24} /> :
                            toast.type === 'info' ? <AlertCircle size={24} /> :
                                <AlertTriangle size={24} />}
                        <p className="font-medium">{toast.message}</p>
                    </div>
                )
            }

            <ConfirmationModal
                isOpen={completeModal.show}
                onClose={() => setCompleteModal({ show: false, loading: false })}
                onConfirm={confirmCompleteBooking}
                title="Selesaikan Booking"
                message="Tandai booking ini sebagai Selesai? Komisi akan dicatat untuk terapis saat ini."
                confirmLabel="Selesaikan"
                type="success"
                isLoading={completeModal.loading}
            />

            <ConfirmationModal
    isOpen={!!confirmAction}
    onClose={() => setConfirmAction(null)}
    onConfirm={() => {
        if (!confirmAction) return;
        const { type, item } = confirmAction;
        if (type === 'reschedule') startRescheduleItem(item);
        else if (type === 'edit') handleEditAgenda();
        else if (type === 'complete') handleCompleteItem(item);
        else if (type === 'no_show') handleNoShowBooking();
        else if (type === 'cancel') cancelItem(item);
        setConfirmAction(null);
    }}
    title={
        confirmAction?.type === 'reschedule' ? 'Ubah Jadwal?' :
        confirmAction?.type === 'edit' ? 'Ubah Agenda?' :
        confirmAction?.type === 'complete' ? 'Selesaikan Item?' :
        confirmAction?.type === 'no_show' ? 'Tandai Tidak Hadir?' :
        'Batalkan Item?'
    }
    message={
        confirmAction?.type === 'reschedule' ? `Ubah jadwal ${getServiceVariantLabel(confirmAction.item.serviceName, confirmAction.item.variantName)} untuk ${confirmAction.item.name || 'tamu ini'}?` :
        confirmAction?.type === 'edit' ? `Ubah agenda booking ini? Semua perubahan akan diterapkan ke seluruh booking.` :
        confirmAction?.type === 'complete' ? `Tandai ${getServiceVariantLabel(confirmAction?.item.serviceName, confirmAction?.item.variantName)} untuk ${confirmAction?.item.name || 'tamu ini'} sebagai selesai?` :
        confirmAction?.type === 'no_show' ? `Tandai ${getServiceVariantLabel(confirmAction?.item.serviceName, confirmAction?.item.variantName)} untuk ${confirmAction?.item.name || 'tamu ini'} sebagai tidak hadir? Data ini tidak akan dihitung sebagai selesai.` :
        `Batalkan ${getServiceVariantLabel(confirmAction?.item.serviceName, confirmAction?.item.variantName)} untuk ${confirmAction?.item.name || 'tamu ini'}? Tindakan ini tidak dapat dibatalkan.`
    }
    confirmLabel={
        confirmAction?.type === 'reschedule' ? 'Ya, Ubah Jadwal' :
        confirmAction?.type === 'edit' ? 'Ya, Ubah' :
        confirmAction?.type === 'complete' ? 'Ya, Selesaikan' :
        confirmAction?.type === 'no_show' ? 'Ya, Tidak Hadir' :
        'Ya, Batalkan'
    }
    cancelLabel="Batal"
    type={
        confirmAction?.type === 'cancel' ? 'danger' :
        confirmAction?.type === 'no_show' ? 'warning' :
        confirmAction?.type === 'complete' ? 'success' : 'info'
    }
/>

            {
                showNewCustomerModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[240]">
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-[#453C67]">Tambah Pelanggan Baru</h3>
                                <button
                                    onClick={() => setShowNewCustomerModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 absolute right-4 top-4"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={newCustomerForm.name}
                                        onChange={e => setNewCustomerForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none"
                                        placeholder="Nama pelanggan"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={newCustomerForm.phone}
                                        onChange={e => setNewCustomerForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none"
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                    <input
                                        type="email"
                                        value={newCustomerForm.email}
                                        onChange={e => setNewCustomerForm(p => ({ ...p, email: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none"
                                        placeholder="email@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                    <input
                                        type="date"
                                        value={newCustomerForm.dob}
                                        onChange={e => setNewCustomerForm(p => ({ ...p, dob: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none"
                                    />
                                </div>

                                <button
                                    onClick={handleCreateNewCustomer}
                                    disabled={isCreatingCustomer}
                                    className="w-full py-3 bg-[#C58940] text-white rounded-xl font-bold hover:bg-[#B07836] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isCreatingCustomer ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            Simpan Pelanggan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {showRescheduleModal && rescheduleModalData && (() => {
	    const { item, selectedDate, selectedStaffId, selectedTime } = rescheduleModalData;
	    const dateObj = new Date(selectedDate + 'T00:00:00');
	    const pickerStaff = staffList.find(s => s.id === selectedStaffId);
	    const pickerSrv = services.find(s => s.id === item.serviceId);
	    const pickerDuration = item.serviceDuration || pickerSrv?.duration || 60;
	    const shift = getShift(selectedStaffId, dateObj);
	    const shiftStartMin = shift ? toMin(shift.startTime) : 0;
	    const shiftEndMin = shift ? toMin(shift.endTime) : 0;
	    const pickerSlots: number[] = [];
	    if (shift) {
	        for (let m = shiftStartMin; m + pickerDuration <= shiftEndMin; m += rescheduleInterval) {
	            pickerSlots.push(m);
	        }
	    }
    const getSlotMeta = (m: number) => {
        const timeStr = formatTimeSlot(m);
        const endM = m + pickerDuration;
        if (selectedTime === timeStr) return 'selected';
        const dbBooking = bookings.find(b => {
            if (b.staffId !== selectedStaffId || b.date !== selectedDate) return false;
            if (b.status === 'cancelled') return false;
            if (b.id === rescheduleModalData.bookingId) return false;
            const bStart = toMin(b.start);
            return m < bStart + b.duration && endM > bStart;
        });
        if (dbBooking) return dbBooking.isBlocked ? 'blocked' : 'booked';
        const nowDate = new Date(); 
        const checkDate = new Date(selectedDate + 'T00:00:00');
        checkDate.setHours(0,0,0,0); 
        const today = new Date(); 
        today.setHours(0,0,0,0);
        if (checkDate < today) return 'past';
        if (checkDate.getTime() === today.getTime() && m < nowDate.getHours() * 60 + nowDate.getMinutes()) return 'past';
        return 'available';
    };

    const rows: number[][] = [];
    for (let i = 0; i < pickerSlots.length; i += 4) rows.push(pickerSlots.slice(i, i + 4));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#453C67] to-[#6B5B95] p-4 text-white flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60 mb-0.5">Ubah Jadwal</p>
                            <h3 className="text-lg font-black">{getServiceVariantLabel(item.serviceName, item.variantName, 'Item')}</h3>
                            <p className="text-xs opacity-70 mt-0.5">{item.name || 'Tamu'} · {pickerDuration} menit</p>
                        </div>
                        <button onClick={() => { setShowRescheduleModal(false); setRescheduleModalData(null); }}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Tanggal */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Tanggal</label>
                        <input type="date" value={selectedDate}
                            min={formatDateInput(new Date())}
                            onChange={e => setRescheduleModalData(prev => prev ? { ...prev, selectedDate: e.target.value, selectedTime: '' } : null)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#453C67] focus:ring-2 focus:ring-[#453C67]/10 outline-none text-sm font-semibold text-gray-700"
                        />
                    </div>

                    {/* Terapis */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Terapis</label>
                        <select value={selectedStaffId}
                            onChange={e => setRescheduleModalData(prev => prev ? { ...prev, selectedStaffId: Number(e.target.value), selectedTime: '' } : null)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#453C67] outline-none text-sm font-semibold text-gray-700">
                            {activeStaffList.map(s => {
                                const g = s.gender?.toLowerCase();
                                const gl = g === 'perempuan' || g === 'female' || g === 'p' || g === 'f' ? '(P)' : g === 'laki-laki' || g === 'male' || g === 'l' || g === 'm' ? '(L)' : '';
                                return <option key={s.id} value={s.id}>{s.name} {gl}</option>;
                            })}
                        </select>
                    </div>

                    {/* Info Shift */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${(!pickerStaff?.color || !pickerStaff.color.startsWith('#')) ? (pickerStaff?.color || 'bg-gray-400') : ''}`}
                            style={pickerStaff?.color?.startsWith('#') ? { backgroundColor: pickerStaff.color } : {}}>
                            {(pickerStaff?.name || 'T')[0]}
                        </div>
                        <div>
	                            <p className="text-xs font-bold text-gray-700">{pickerStaff?.name || '-'}</p>
	                            <p className="text-[10px] text-gray-400">{shift ? `Shift: ${shift.startTime} – ${shift.endTime}` : 'Tidak ada shift di tanggal ini'}</p>
                        </div>
                    </div>

                    {/* Slot Grid */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pilih Jam</label>
                            <div className="flex gap-2 text-[9px] font-bold text-gray-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-100 border border-emerald-300 inline-block"/>Tersedia</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-100 border border-red-200 inline-block"/>Terisi</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#FAEAB1] border border-[#C58940] inline-block"/>Dipilih</span>
                            </div>
                        </div>
                        {pickerSlots.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
	                                <p className="text-xs italic">{shift ? 'Tidak ada slot tersedia.' : 'Terapis tidak punya shift di tanggal ini.'}</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {rows.map((row, ri) => (
                                    <div key={ri} className="grid grid-cols-4 gap-1.5">
                                        {row.map(m => {
                                            const timeStr = formatTimeSlot(m);
                                            const meta = getSlotMeta(m);
                                            const isSelectable = meta === 'available' || meta === 'selected';
                                            let cls = 'rounded-xl py-2 text-center text-xs font-bold transition-all border ';
                                            if (meta === 'selected') cls += 'bg-[#FAEAB1] border-[#C58940] text-[#7B5D2A] ring-2 ring-[#C58940]/30';
                                            else if (meta === 'available') cls += 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 cursor-pointer';
                                            else if (meta === 'booked') cls += 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed line-through';
                                            else if (meta === 'blocked') cls += 'bg-gray-700 border-gray-800 text-gray-300 cursor-not-allowed';
                                            else cls += 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed';
                                            return (
                                                <button key={m} disabled={!isSelectable}
                                                    onClick={() => setRescheduleModalData(prev => prev ? { ...prev, selectedTime: timeStr } : null)}
                                                    className={cls}>
                                                    {timeStr}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                 {/* Summary */}
{selectedTime && (
    <div className="bg-[#453C67]/5 border border-[#453C67]/15 rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#453C67] rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar size={14} className="text-white" />
        </div>
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#453C67]/60">Jadwal Baru</p>
            <p className="text-sm font-black text-[#453C67]">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs font-bold text-[#453C67]/80">
                {selectedTime} – {getEndTime(selectedTime, pickerDuration)} · {pickerStaff?.name}
            </p>

            {/* ← TAMBAH INI: warning kalau beda tanggal dari booking asli */}
            {selectedDate !== (rescheduleModalData.item as any).bookingDate &&
             selectedDate !== selectedBooking?.date && (
                <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                    ⚠ Item pindah ke tanggal ini, tapi nota tetap 1 dengan tamu lain
                </p>
            )}
        </div>
    </div>
)}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex-shrink-0 flex gap-3">
                    <button onClick={() => { setShowRescheduleModal(false); setRescheduleModalData(null); }}
                        className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all">
                        Batal
                    </button>
                    <button onClick={handleConfirmRescheduleModal}
                        disabled={!selectedTime}
                        className={`flex-[1.5] py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${!selectedTime ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#453C67] to-[#6B5B95] text-white hover:opacity-90 hover:scale-[1.02]'}`}>
                        <Calendar size={15} /> Pindahkan
                    </button>
                </div>
            </div>
        </div>
    );
})()}

            {showItemCancelConfirm && itemToCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Batalkan Item?</h3>
                            <p className="text-gray-500 mb-6">
                                Apakah Anda yakin ingin membatalkan pesanan untuk <span className="font-bold text-gray-900">{itemToCancel.name || 'Tamu'}</span>?
                                Tindakan ini akan menghapus item dari tagihan.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setShowItemCancelConfirm(false);
                                        setItemToCancel(null);
                                    }}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmCancelItem}
                                    className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    Ya, Batalkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

         {showRefundModal && itemToRefund && (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #92400e, #d97706)' }}>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200 mb-0.5">
                        Pengembalian Dana
                    </p>
                    <h3 className="text-base font-black text-white leading-tight">
                        {getServiceVariantLabel(itemToRefund.serviceName, itemToRefund.variantName, 'Layanan')}
                    </h3>
                    <p className="text-xs text-amber-200 mt-0.5">
                        {itemToRefund.name || 'Tamu'}
                        {itemToRefund.staffName ? ` · ${itemToRefund.staffName}` : ''}
                    </p>
                </div>
                <button
                    onClick={() => { setShowRefundModal(false); setItemToRefund(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-all">
                    <X size={16} />
                </button>
            </div>

            {/* Nilai item */}
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-amber-700">Harga layanan</span>
                    <span className="text-sm font-bold text-amber-800">
                        Rp {Number(itemToRefund.servicePrice || 0).toLocaleString('id-ID')}
                    </span>
                </div>
                {Number(itemToRefund.roomPrice || 0) > 0 && (
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-amber-700">Biaya ruangan</span>
                        <span className="text-sm font-bold text-amber-800">
                            Rp {Number(itemToRefund.roomPrice || 0).toLocaleString('id-ID')}
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-amber-200">
                    <span className="text-xs font-black text-amber-800 uppercase tracking-wide">Maks. refund</span>
                    <span className="text-base font-black text-amber-900">
                        Rp {(Number(itemToRefund.servicePrice || 0) + Number(itemToRefund.roomPrice || 0)).toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">

                {/* Nominal */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                        Nominal Refund <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">
                            Rp
                        </span>
                        <input
                            type="number"
                            min="1"
                            max={Number(itemToRefund.servicePrice || 0) + Number(itemToRefund.roomPrice || 0)}
                            value={refundForm.amount}
                            onChange={e => setRefundForm(p => ({ ...p, amount: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm font-semibold text-gray-800"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                    {refundForm.amount && (() => {
                        const val = parseFloat(refundForm.amount);
                        const max = Number(itemToRefund.servicePrice || 0) + Number(itemToRefund.roomPrice || 0);
                        if (val > max) return (
                            <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                                <AlertTriangle size={11} /> Melebihi nilai item
                            </p>
                        );
                        if (val === max) return (
                            <p className="text-[11px] text-green-600 font-bold mt-1.5 flex items-center gap-1">
                                <CheckCircle size={11} /> Refund penuh
                            </p>
                        );
                        if (val > 0) return (
                            <p className="text-[11px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                                <AlertTriangle size={11} /> Refund sebagian · sisa Rp {(max - val).toLocaleString('id-ID')}
                            </p>
                        );
                        return null;
                    })()}
                </div>

                {/* Metode */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                        Metode Pengembalian <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={refundForm.method}
                        onChange={e => setRefundForm(p => ({ ...p, method: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm font-semibold text-gray-700 bg-white">
                        <option value="cash">💵 Tunai (Cash)</option>
                        <option value="bank_transfer">🏦 Transfer Bank</option>
                        <option value="wallet">📱 E-Wallet / Dompet Digital</option>
                        <option value="qris">📲 QRIS</option>
                    </select>
                </div>

                {/* Alasan */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                        Alasan <span className="text-gray-300 font-normal normal-case">(opsional)</span>
                    </label>
                    <textarea
                        value={refundForm.reason}
                        onChange={e => setRefundForm(p => ({ ...p, reason: e.target.value }))}
                        placeholder="Contoh: Layanan tidak sesuai, double booking..."
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm resize-none placeholder:text-gray-300 placeholder:italic"
                    />
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                        Refund dicatat di sistem dan mengurangi total tagihan.
                        Pastikan dana sudah dikembalikan ke customer secara fisik.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-3">
                <button
                    onClick={() => { setShowRefundModal(false); setItemToRefund(null); }}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                    Batal
                </button>
                <button
                    onClick={confirmRefundItem}
                    disabled={
                        isRefunding ||
                        !refundForm.amount ||
                        parseFloat(refundForm.amount) <= 0 ||
                        parseFloat(refundForm.amount) > (Number(itemToRefund.servicePrice || 0) + Number(itemToRefund.roomPrice || 0))
                    }
                    className={`flex-[1.5] py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                        ${isRefunding ||
                            !refundForm.amount ||
                            parseFloat(refundForm.amount) <= 0 ||
                            parseFloat(refundForm.amount) > (Number(itemToRefund.servicePrice || 0) + Number(itemToRefund.roomPrice || 0))
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-amber-200 hover:scale-[1.02]'
                        }`}>
                    {isRefunding
                        ? <><Loader2 size={14} className="animate-spin" /> Memproses...</>
                        : <><Receipt size={14} /> Proses Refund</>
                    }
                </button>
            </div>
        </div>
    </div>
)}

            <ConfirmationModal
                isOpen={showItemCompleteConfirm}
                onClose={() => {
                    setShowItemCompleteConfirm(false);
                    setItemToComplete(null);
                }}
                onConfirm={confirmCompleteItem}
                title="Selesaikan Item?"
                message={`Anda akan menyelesaikan pesanan untuk ${itemToComplete?.name || 'Tamu'}. Booking akan dipisah menjadi invoice baru yang sudah 'Completed'. Lanjutkan?`}
                confirmLabel="Ya, Selesaikan"
                cancelLabel="Batal"
                type="success"
            />

            <ConfirmationModal
                isOpen={!!rescheduleConfirmData}
                onClose={() => setRescheduleConfirmData(null)}
                onConfirm={handleConfirmReschedule}
                title="Pindahkan Item?"
                message={`Pindahkan item ${getServiceVariantLabel(rescheduleConfirmData?.item.serviceName, rescheduleConfirmData?.item.variantName)} ke ${rescheduleConfirmData?.dateStr} jam ${rescheduleConfirmData?.timeStr}? Ini akan membuat booking baru.`}
                confirmLabel="Ya, Pindahkan"
                cancelLabel="Batal"
                type="info"
            />
            {/* Service Selection Popup for Additional Guests */}
            {showServicePopup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[220] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-[#C58940] to-[#E5BA73] text-white">
                            <div>
                                <h3 className="text-lg font-bold">Pilih Layanan</h3>
                                <p className="text-xs opacity-90">Tamu {showServicePopup.guestIdx + 1}</p>
                            </div>
                            <button onClick={() => setShowServicePopup(null)} className="p-2 hover:bg-white/20 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-4 bg-gray-50 border-b space-y-3">
                            {editingBooking && !isRescheduleMode && (
                                <div className="bg-white rounded-2xl border border-gray-200 p-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 mb-2">
                                        Tipe Harga Ubah Agenda
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditAgendaPriceType('member')}
                                            className={`py-2 rounded-xl text-xs font-bold transition-all border ${editAgendaPriceType === 'member'
                                                ? 'bg-[#C58940] text-white border-[#C58940] shadow-sm'
                                                : 'bg-white text-gray-500 border-gray-100 hover:border-[#C58940]/40'
                                                }`}
                                        >
                                            Member
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditAgendaPriceType('non_member')}
                                            className={`py-2 rounded-xl text-xs font-bold transition-all border ${editAgendaPriceType === 'non_member'
                                                ? 'bg-[#453C67] text-white border-[#453C67] shadow-sm'
                                                : 'bg-white text-gray-500 border-gray-100 hover:border-[#453C67]/40'
                                                }`}
                                        >
                                            Non Member
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={serviceSearch}
                                    onChange={e => setServiceSearch(e.target.value)}
                                    placeholder="Cari layanan..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#C58940] focus:ring-1 focus:ring-[#C58940] outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {(() => {
                                const filteredServices = services.filter(s =>
                                    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                                    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
                                );
                                const categories = Array.from(new Set(filteredServices.map(s => s.category)));

                                if (categories.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-gray-400">
                                            <Sparkles size={40} className="mx-auto mb-2 opacity-10" />
                                            <p className="text-sm italic">Layanan tidak ditemukan.</p>
                                        </div>
                                    );
                                }

                                return categories.map(cat => (
                                    <div key={cat} className="space-y-2">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{cat}</h4>
                                        <div className="grid gap-2">
                                            {filteredServices.filter(s => s.category === cat).map(s => {
                                                const hasVariants = s.variants && s.variants.length > 0;

                                                if (hasVariants) {
                                                    return s.variants!.map(v => {
                                                        const displayPrice = getEffectivePrice(s, v);
                                                        const basePrice = Number(v.price || 0);
                                                        const showMemberDiscount = editAgendaPriceType === 'member' && displayPrice < basePrice;
                                                        return (
                                                        <button
                                                            key={`${s.id}-${v.id}`}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const updated = [...bookingItems];
                                                                const itemIdx = updated.findIndex(i => i.tempId === showServicePopup.tempId);
                                                                if (itemIdx > -1) {
                                                                    const changed = updated[itemIdx].serviceId !== s.id || updated[itemIdx].variantId !== v.id;
                                                                    updated[itemIdx].serviceId = s.id;
                                                                    updated[itemIdx].variantId = v.id;
                                                                    if (changed) {
                                                                        updated[itemIdx].startTime = '';
                                                                        updated[itemIdx].roomId = null;
                                                                    }
                                                                    setBookingItems(updated);
                                                                    setFormData(p => ({ ...p, serviceIds: updated.map(u => u.serviceId) }));
                                                                }
                                                                setShowServicePopup(null);
                                                                setServiceSearch('');
                                                            }}
                                                            className="w-full text-left p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#C58940] hover:shadow-md transition-all group flex justify-between items-center"
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-gray-700 group-hover:text-[#C58940] transition-colors">{s.name}</p>
                                                                    <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-bold border border-amber-100">{v.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-md font-medium border border-gray-100">{v.duration} Menit</span>
                                                                    <span className="text-[10px] font-bold text-[#C58940]">
                                                                        {showMemberDiscount && (
                                                                            <span className="line-through text-gray-400 mr-1">Rp {basePrice.toLocaleString('id-ID')}</span>
                                                                        )}
                                                                        Rp {displayPrice.toLocaleString('id-ID')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#FAEAB1] group-hover:text-[#C58940] transition-all">
                                                                <ChevronRight size={18} />
                                                            </div>
                                                        </button>
                                                    )});
                                                }

                                                const displayPrice = getEffectivePrice(s, null);
                                                const basePrice = Number(s.price || 0);
                                                const showMemberDiscount = editAgendaPriceType === 'member' && displayPrice < basePrice;
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            const updated = [...bookingItems];
                                                            const itemIdx = updated.findIndex(i => i.tempId === showServicePopup.tempId);
                                                            if (itemIdx > -1) {
                                                                const changed = updated[itemIdx].serviceId !== s.id || !!updated[itemIdx].variantId;
                                                                updated[itemIdx].serviceId = s.id;
                                                                updated[itemIdx].variantId = undefined;
                                                                if (changed) {
                                                                    updated[itemIdx].startTime = '';
                                                                    updated[itemIdx].roomId = null;
                                                                }
                                                                setBookingItems(updated);
                                                                setFormData(p => ({ ...p, serviceIds: updated.map(u => u.serviceId) }));
                                                            }
                                                            setShowServicePopup(null);
                                                            setServiceSearch('');
                                                        }}
                                                        className="w-full text-left p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#C58940] hover:shadow-md transition-all group flex justify-between items-center"
                                                    >
                                                        <div className="flex-1">
                                                            <p className="font-bold text-gray-700 group-hover:text-[#C58940] transition-colors">{s.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-md font-medium border border-gray-100">{s.duration} Menit</span>
                                                                <span className="text-[10px] font-bold text-[#C58940]">
                                                                    {showMemberDiscount && (
                                                                        <span className="line-through text-gray-400 mr-1">Rp {basePrice.toLocaleString('id-ID')}</span>
                                                                    )}
                                                                    Rp {displayPrice.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                            {s.description && (
                                                                <p className="text-[10px] text-gray-400 mt-2 line-clamp-2 italic leading-relaxed">"{s.description}"</p>
                                                            )}
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#FAEAB1] group-hover:text-[#C58940] transition-all">
                                                            <ChevronRight size={18} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
}
