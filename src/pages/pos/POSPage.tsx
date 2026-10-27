import { ShoppingCart, Plus, Search, Banknote, Printer, Clock, CheckCircle, X, Play, Square, Wallet, Receipt, TrendingUp, TrendingDown, AlertTriangle, DollarSign, User, Calendar as CalendarIcon, Loader2, ChevronDown, Check, Building, Upload, FileText, Phone, Package, Sparkles, Globe, CreditCard, Settings, Utensils, Lightbulb, Droplets, Wrench, Megaphone, Gift, Pill, Eraser, Laptop, Coffee, Car, MessageSquare, History, Edit, QrCode, Landmark, MapPin } from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import type { Branch } from '../../services/api';
import POSBankDepositsTab from './POSBankDepositsTab';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { useBranchSync } from '../../hooks/useBranchSync';
import { formatDateYMD } from '../../utils/date';
import swal from '../../utils/swal';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
        .format(Number.isFinite(value) ? value : 0);

const formatNumber = (value: number) =>
    new Intl.NumberFormat('id-ID').format(Number.isFinite(value) ? value : 0);

// Render Lucide icons for expense categories
const renderExpenseIcon = (iconName: string, size = 18) => {
const iconMap: Record<string, any> = {
    'Settings': Settings,
    'Package': Package,
    'Car': Car,
    'FileText': FileText,
    'Utensils': Utensils,
    'Lightbulb': Lightbulb,
    'Droplets': Droplets,
    'Wrench': Wrench,
    'Megaphone': Megaphone,
    'Gift': Gift,
    'ShoppingCart': ShoppingCart,
    'Pill': Pill,
    'Eraser': Eraser,
    'Laptop': Laptop,
    'Phone': Phone,
    'Coffee': Coffee,
    'Wallet': Wallet
};
const IconComp = iconMap[iconName] || FileText;
return <IconComp size={size} />;
};

const getCategoryName = (item: any, fallback: string) => {
    const candidates = [
        item?.category,
        item?.category?.name,
        item?.service_category?.name,
        item?.product_category?.name,
        item?.category_name
    ];
    const category = candidates.find(value => typeof value === 'string' && value.trim());
    return category ? category.trim() : fallback;
};

const isSameCategory = (left: string, right: string) =>
    left.trim().toLocaleLowerCase('id-ID') === right.trim().toLocaleLowerCase('id-ID');

const isPaymentMethodActive = (method: any): boolean => {
    const statusValue = method?.is_active ?? method?.isActive ?? method?.active ?? method?.enabled;

    if (statusValue !== undefined && statusValue !== null) {
        if (typeof statusValue === 'boolean') return statusValue;
        if (typeof statusValue === 'number') return statusValue === 1;

        const normalizedStatus = String(statusValue).trim().toLowerCase();
        return !['0', 'false', 'inactive', 'nonaktif', 'non-aktif', 'disabled', 'off'].includes(normalizedStatus);
    }

    if (method?.status !== undefined && method?.status !== null) {
        const normalizedStatus = String(method.status).trim().toLowerCase();
        return !['inactive', 'nonaktif', 'non-aktif', 'disabled', 'off', '0', 'false'].includes(normalizedStatus);
    }

    return true;
};

const isPaymentMethodVisibleInCashier = (method: any): boolean => {
    const value = method?.is_cashier_enabled ?? method?.show_in_cashier ?? method?.is_cashier ?? method?.cashier_enabled ?? method?.is_pos_enabled;

    if (value === undefined || value === null) return true;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;

    return !['0', 'false', 'inactive', 'nonaktif', 'non-aktif', 'disabled', 'off'].includes(String(value).trim().toLowerCase());
};

// Interface for service data
interface Service {
id: number;
name: string;
price: number;
special_price?: number;
category: string;
duration?: number;
is_limited_availability?: boolean;
availability_type?: 'specific_dates' | 'recurring';
availability_data?: string[];
is_variant?: boolean;
base_service_id?: number;
}

interface Product {
id: number;
name: string;
price: number;
special_price?: number;
category: string;
sku?: string;
stock?: number;
image?: string;
is_variant?: boolean;
base_product_id?: number;
}

interface Therapist {
id: number;
name: string;
available: boolean;
specialization?: string;
rating?: number;
schedule?: { start: string; end: string };
gender?: string;
}

interface Customer {
id: number;
name: string;
phone: string;
member: boolean;
}

interface Room {
id: number;
name: string;
type: 'vip' | 'regular' | 'couple';
capacity: number;
status: 'available' | 'occupied' | 'maintenance';
price?: number;
}


interface StaffSchedule {
staffId: number;
name: string;
shifts: { start: string; end: string; type: string; label?: string }[];
workHours?: { start: string; end: string }[];
specialization?: string;
gender?: string;
rating?: number;
}

interface CartItem {
type: 'service' | 'product';
service?: Service;
product?: Product;
therapist?: Therapist;
room?: Room;
quantity: number;
scheduledTime?: string;
time?: string; // Selected booking time (HH:mm format)
date?: string; // Date of the service (YYYY-MM-DD)
notes?: string;
}

interface Transaction {
id: string;
items: CartItem[];
subtotal: number;
roomCharge: number;
total: number;
promoAmount?: number;
promoCode?: string;
discountAmount?: number;
taxAmount?: number;
taxName?: string;
serviceChargeAmount?: number;
paymentMethod: 'cash' | 'qris' | 'transfer';
date: Date;
cashier: string;
customer?: { name: string; phone: string };
}

interface ShiftData {
id: string;
startTime: Date;
endTime?: Date;
openingCash: number;
closingCash?: number;
cashier: string;
status: 'open' | 'closed';
totalSales: number;
totalTransactions: number;
cashSales: number;
nonCashSales: number;
dpSales?: number;
fullSales?: number;
totalRefund?: number;
bankDeposits?: number;
methodBreakdown?: { code: string; name: string; total: number }[];
}

interface ExpenseCategory {
id: number;
name: string;
type: string;
icon: string;
}

interface PettyCashItem {
id: string | number;
description: string;
amount: number;
categoryId: number;
categoryName: string;
timestamp: Date;
shiftId: string;
receipt_url?: string;
creator_name?: string;
}

const generateInvoiceId = () => {
const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
return `NQP-${dateStr}-${random}`;
};



// ----------------------------------------------------------------------

// Move expensive parsing and lookups outside the frequent render paths
const getGeneralSettings = () => {
try {
    const saved = localStorage.getItem('naqupos_general_settings');
    return saved ? JSON.parse(saved) : null;
} catch {
    return null;
}
};

// Business Logic Helpers
const getStaffSlots = (
staffShifts: { start: string; end: string; type: string; label?: string }[],
workHours: { start: string; end: string }[] | undefined,
staffId: number | undefined,
businessStart: string,
businessEnd: string,
cart: any[],
posDate: string
) => {
const toMin = (t: string) => {
    if (!t) return 0;
    const parts = t.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return h * 60 + m;
};

const combinedOccupied = [...staffShifts];

// If staffId is provided, also consider items in cart for the same date
if (staffId) {
    cart.forEach(item => {
        if (item.type === 'service' && item.therapist && item.therapist.id === staffId && item.date === posDate && item.time) {
            const duration = item.service?.duration || 60;
            const [h, m] = item.time.split(':').map(Number);
            const startMins = h * 60 + m;
            const endMins = startMins + duration;
            const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

            combinedOccupied.push({
                start: item.time,
                end: endTime,
                type: 'booked',
                label: 'Di Keranjang'
            });
        }
    });
}

const sortedOccupied = combinedOccupied.sort((a, b) => toMin(a.start) - toMin(b.start));
const combined: { start: string; end: string; type: string; label?: string }[] = [];

// Strictly use work hours. If not defined, the staff has no working time for this date.
const activeWorkHours = workHours && workHours.length > 0
    ? [...workHours].sort((a, b) => toMin(a.start) - toMin(b.start))
    : [];

activeWorkHours.forEach(wh => {
    let currentMin = toMin(wh.start);
    const whEndMin = toMin(wh.end);

    // Find occupied periods within this work shift
    const whOccupied = sortedOccupied.filter(o => {
        const oStart = toMin(o.start);
        const oEnd = toMin(o.end);
        return (oStart >= currentMin && oStart < whEndMin) || (oEnd > currentMin && oEnd <= whEndMin);
    });

    whOccupied.forEach(o => {
        const oStartMin = toMin(o.start);
        const oEndMin = toMin(o.end);

        // Add available gap before occupied period if exists
        if (oStartMin > currentMin) {
            combined.push({
                start: `${Math.floor(currentMin / 60).toString().padStart(2, '0')}:${(currentMin % 60).toString().padStart(2, '0')}`,
                end: o.start,
                type: 'available'
            });
        }

        // Add the occupied period (clamped to work shift boundaries)
        const clampedStart = Math.max(currentMin, oStartMin);
        const clampedEnd = Math.min(whEndMin, oEndMin);

        combined.push({
            ...o,
            start: `${Math.floor(clampedStart / 60).toString().padStart(2, '0')}:${(clampedStart % 60).toString().padStart(2, '0')}`,
            end: `${Math.floor(clampedEnd / 60).toString().padStart(2, '0')}:${(clampedEnd % 60).toString().padStart(2, '0')}`,
        });

        currentMin = Math.max(currentMin, oEndMin);
    });

    // Add available gap after last occupied period until end of work shift
    if (currentMin < whEndMin) {
        combined.push({
            start: `${Math.floor(currentMin / 60).toString().padStart(2, '0')}:${(currentMin % 60).toString().padStart(2, '0')}`,
            end: wh.end,
            type: 'available'
        });
    }
});

// If after processing all work hours we have no slots, or if there's a huge gap from business start to first work hour
if (combined.length === 0) {
    combined.push({ start: businessStart, end: businessEnd, type: 'off', label: 'Libur/Off' });
}

return combined;
};


function TrxCard({ trx }: { trx: any }) {
const [expanded, setExpanded] = useState(false);
const items: any[] = trx.items || trx.transaction_items || [];

return (
    <div className="hover:bg-gray-50 transition-colors">
        <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-3 text-left"
        >
            <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${trx.payment_type === 'dp' ? 'bg-orange-400' : 'bg-green-500'}`} />
                <div>
                    <p className="font-mono font-bold text-[10px] text-naqupos-dark">{trx.invoice_number || `#${trx.id}`}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-gray-400">{trx.customer?.name || trx.customer_name || 'Guest'}</p>
                        <span className="text-[9px] text-gray-300">·</span>
                        <p className="text-[9px] text-gray-400">{new Date(trx.created_at || trx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                    <p className="text-xs font-black text-naqupos-primary">Rp {parseInt(trx.total || 0).toLocaleString('id-ID')}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500 uppercase">{trx.payment_method}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${trx.payment_type === 'dp' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                            {trx.payment_type === 'dp' ? 'DP' : 'Lunas'}
                        </span>
                    </div>
                </div>
                <ChevronDown size={14} className={`text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
        </button>

        {expanded && (
            <div className="px-5 pb-3 bg-gray-50/60">
                {items.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic py-2">Tidak ada detail item</p>
                ) : (
                    <div className="space-y-1.5">
                        {items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${item.item_type === 'service' ? 'bg-naqupos-primary/10 text-naqupos-primary' : 'bg-orange-50 text-orange-400'}`}>
                                        {item.item_type === 'service' ? <Sparkles size={11} /> : <Package size={11} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-700">{item.service?.name || item.product?.name || item.item_name || '-'}</p>
                                        {item.therapist && <p className="text-[9px] text-gray-400">Terapis: {item.therapist.name}</p>}
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-gray-600 flex-shrink-0">
                                    {item.quantity > 1 ? `${item.quantity}x ` : ''}Rp {parseInt(item.price || item.subtotal || 0).toLocaleString('id-ID')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
                {/* Breakdown */}
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                    {parseInt(trx.discount_amount || 0) > 0 && (
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Diskon</span>
                            <span className="text-red-400">-Rp {parseInt(trx.discount_amount).toLocaleString('id-ID')}</span>
                        </div>
                    )}
                    {parseInt(trx.tax_amount || trx.tax || 0) > 0 && (
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Pajak</span>
                            <span>Rp {parseInt(trx.tax_amount || trx.tax).toLocaleString('id-ID')}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[10px] font-bold text-naqupos-dark pt-1">
                        <span>Total</span>
                        <span>Rp {parseInt(trx.total || 0).toLocaleString('id-ID')}</span>
                    </div>
                </div>
            </div>
        )}
    </div>
);
}


function POSPage() {
const location = useLocation();

// Data States
const [services, setServices] = useState<Service[]>([]);
const [products, setProducts] = useState<Product[]>([]);
const [customers, setCustomers] = useState<Customer[]>([]);
const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
const [isLoadingData, setIsLoadingData] = useState(true);

// Infinite Scroll State for Services/Products
const [servicePage, setServicePage] = useState(1);
const [hasMoreServices, setHasMoreServices] = useState(true);
const [isLoadingMoreServices, setIsLoadingMoreServices] = useState(false);
const [productPage, setProductPage] = useState(1);
const [hasMoreProducts, setHasMoreProducts] = useState(true);
const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
const itemsPerPage = 20;

// Auth & Branch State
const [branches, setBranches] = useState<Branch[]>([]);
// Sync with global branch
const {
    selectedBranchId,
    setSelectedBranchId
} = useBranchSync<number>(undefined, 0);

const [userRole, setUserRole] = useState<string>('');
const globalBranchId = selectedBranchId === 0 ? 'all' : selectedBranchId.toString();

const isSuperAdminOrAdmin = useMemo(() => {
    const role = userRole?.toLowerCase();
    return ['super admin', 'super_admin', 'owner'].includes(role);
}, [userRole]);

const branchId = selectedBranchId;


const [activeTab, setActiveTab] = useState<'pos' | 'petty-cash' | 'bank-deposits'>('pos');
const [posTab, setPosTab] = useState<'services' | 'products'>('services');
const [cart, setCart] = useState<CartItem[]>([]);
const [selectedCategory, setSelectedCategory] = useState('All');
const [serviceCategories, setServiceCategories] = useState<string[]>(['All']);
const [productCategories, setProductCategories] = useState<string[]>(['All']);
const [serviceCategoryIds, setServiceCategoryIds] = useState<Record<string, number>>({});
const [staffCurrentPage, setStaffCurrentPage] = useState(1);
const [isStaffLastPage, setIsStaffLastPage] = useState(false);
const [cachedScheduleData, setCachedScheduleData] = useState<any[]>([]);
const [cachedBookingsData, setCachedBookingsData] = useState<any[]>([]);
const staffPerPage = 50;
const [posViewMode, setPosViewMode] = useState<'services' | 'schedule'>('services');
const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
const [searchQuery, setSearchQuery] = useState('');
const [paymentMethod, setPaymentMethod] = useState<string>('cash');
const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
const [cashReceived, setCashReceived] = useState('');
const [paymentLogId, setPaymentLogId] = useState<number | null>(null);
const [isStaffLoadingMore, setIsStaffLoadingMore] = useState(false);
const loadMoreRef = useRef<HTMLDivElement>(null);
const [bookingData, setBookingData] = useState<any>(null);
const [isDP, setIsDP] = useState(false);
const [dpAmount, setDpAmount] = useState<string>('');
const [paymentReference, setPaymentReference] = useState('');
const [bookingNotes, setBookingNotes] = useState('');
const [taxAmount, setTaxAmount] = useState(0);
const [discountAmount, setDiscountAmount] = useState(0);
const [manualDiscountType, setManualDiscountType] = useState<'nominal' | 'percent'>('nominal');
const [manualDiscountInput, setManualDiscountInput] = useState('');

const [promoAmount, setPromoAmount] = useState(0);
const [availableTaxes, setAvailableTaxes] = useState<any[]>([]);
const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([]);
const [availablePromos, setAvailablePromos] = useState<any[]>([]);
const [selectedDiscountId] = useState<number | null>(null);
const [selectedPromoId, setSelectedPromoId] = useState<number | null>(null);
const [promoCode, setPromoCode] = useState('');
const [companySettings, setCompanySettings] = useState<any>(null);
const [serviceChargeAmount, setServiceChargeAmount] = useState(0);

const [dpAlreadyPaid, setDpAlreadyPaid] = useState(0);
const receiptRef = useRef<HTMLDivElement>(null);
const branchDataRequestId = useRef(0);
const activeCatalogFilter = useRef('');
activeCatalogFilter.current = `${selectedBranchId}:${posTab}:${selectedCategory}`;

const customerOptions = useMemo(() => {
    const opts = customers.map(c => ({
        value: c.id,
        label: c.name
    }));
    if (selectedCustomer && selectedCustomer.id === 0) {
        opts.unshift({ value: 0, label: selectedCustomer.name });
    }
    return opts;
}, [customers, selectedCustomer]);


// Sync branch selection with global header and check active shift
useEffect(() => {
    const initializePOS = async () => {
        // 1. First check if there is an active shift
        try {
            const shiftData = await api.getCurrentShift();
            if (shiftData && shiftData.id && shiftData.status === 'open') {
                // If active shift exists, FORCE the branch to the shift's branch
                const shiftBranchId = Number(shiftData.branch_id);
                if (shiftBranchId) {
                    setSelectedBranchId(shiftBranchId);
                    // Also update global state to match if it doesn't match
                    const saved = localStorage.getItem('naqupos_selected_branch');
                    if (saved !== shiftBranchId.toString()) {
                        localStorage.setItem('naqupos_selected_branch', shiftBranchId.toString());
                        window.dispatchEvent(new CustomEvent('naqupos-branch-change', { detail: { branchId: shiftBranchId.toString() } }));
                    }
                    return; // Stop here, we found our branch
                }
            }
        } catch (e) {
            console.error("Error checking active shift", e);
        }
    };

    initializePOS();
}, [location.pathname]);

// Therapist & Time Selection Modal States

const [showTherapistModal, setShowTherapistModal] = useState(false);
const [showTimeSelectionModal, setShowTimeSelectionModal] = useState(false);
const [selectedServiceForCart, setSelectedServiceForCart] = useState<Service | null>(null);
const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
const [selectedTime, setSelectedTime] = useState('');
const [posDate, setPosDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
});
const todayDate = formatDateYMD(new Date());
const [minDateAllowed, setMinDateAllowed] = useState(todayDate);
const [availableTherapists, setAvailableTherapists] = useState<Therapist[]>([]);
const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
const [isLoadingTherapists, setIsLoadingTherapists] = useState(false);
const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);

// Configurable Interval
const [bookingInterval] = useState(() => {
    try {
        const s = localStorage.getItem('naqupos_general_settings');
        const settings = s ? JSON.parse(s) : null;
        const interval = settings ? (settings.posTimeInterval || settings.timeInterval || 15) : 15;
        return Math.max(1, interval);
    } catch { return 15; }
});




// Room Selection States
const [showRoomModal, setShowRoomModal] = useState(false);
const [rooms, setRooms] = useState<Room[]>([]);
const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
const [isLoadingRooms, setIsLoadingRooms] = useState(false);

// Shift Management States
const [currentShift, setCurrentShift] = useState<ShiftData | null>(null);
const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
const [openingCashInput, setOpeningCashInput] = useState('');
const [closingCashInput, setClosingCashInput] = useState('');

// Shift History & Correction
const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false);
const [shiftHistory, setShiftHistory] = useState<any[]>([]);
const [shiftHistoryStartDate, setShiftHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of month
    return formatDateYMD(d);
});
const [shiftHistoryEndDate, setShiftHistoryEndDate] = useState(todayDate);
const [isLoadingShifts, setIsLoadingShifts] = useState(false);
const [selectedShiftForCorrection, setSelectedShiftForCorrection] = useState<any>(null);
const [showShiftCorrectionModal, setShowShiftCorrectionModal] = useState(false);
// Shift History Tab States
const [shiftHistoryTab, setShiftHistoryTab] = useState<'expenses' | 'transactions'>('transactions');
const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<any>(null);
const [shiftDetailExpenses, setShiftDetailExpenses] = useState<any[]>([]);
const [shiftDetailTransactions, setShiftDetailTransactions] = useState<any[]>([]);
const [isLoadingShiftDetail, setIsLoadingShiftDetail] = useState(false);
const [editingExpenseFromHistory, setEditingExpenseFromHistory] = useState<any | null>(null);
const [editExpenseForm, setEditExpenseForm] = useState({ description: '', amount: '', categoryId: 0, receipt_file: null as File | null });
const [editExpenseReceiptPreview, setEditExpenseReceiptPreview] = useState<string | null>(null);
const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
const [isSavingExpense, setIsSavingExpense] = useState(false);
const [correctionCashInput, setCorrectionCashInput] = useState('');

// Prefill opening cash with current balance
const [lastShiftCash, setLastShiftCash] = useState<number>(0);

useEffect(() => {
    if (showOpenShiftModal && selectedBranchId) {
        const fetchLastShiftCash = async () => {
            try {
                const [shiftsData, balanceData] = await Promise.all([
                    api.getShifts({
                        branch_id: selectedBranchId,
                        include_active: true,
                        limit: 20
                    }),
                    api.getCashBalance(selectedBranchId).catch(() => null)
                ]);
                const shifts = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.data || []);
                const lastClosedShift = shifts.find((shift: any) => shift.clock_out && shift.ending_cash !== null && shift.ending_cash !== undefined);

                if (lastClosedShift) {
                    const endingCash = Math.max(0, Math.floor(Number(lastClosedShift.ending_cash || 0)));
                    let depositedAfterShift = 0;

                    try {
                        const depositsData = await api.getBankDeposits({
                            branch_id: selectedBranchId,
                            limit: 1000
                        });
                        const deposits = Array.isArray(depositsData) ? depositsData : (depositsData?.data || []);
                        const shiftClosedAt = lastClosedShift.clock_out ? new Date(lastClosedShift.clock_out).getTime() : 0;
                        const shiftClosedDate = lastClosedShift.clock_out ? String(lastClosedShift.clock_out).slice(0, 10) : '';

                        depositedAfterShift = deposits.reduce((sum: number, deposit: any) => {
                            const depositCreatedAt = deposit.created_at ? new Date(deposit.created_at).getTime() : 0;
                            const depositDate = String(deposit.deposit_date || '').slice(0, 10);
                            const isAfterShift = shiftClosedAt > 0 && depositCreatedAt > 0
                                ? depositCreatedAt >= shiftClosedAt
                                : shiftClosedDate && depositDate >= shiftClosedDate;

                            return isAfterShift ? sum + Number(deposit.amount || 0) : sum;
                        }, 0);
                    } catch (depositError) {
                        console.warn('Failed to calculate bank deposits after last shift', depositError);
                    }

                    const balanceCash = balanceData?.current_balance !== undefined
                        ? Math.max(0, Math.floor(Number(balanceData.current_balance || 0)))
                        : null;
                    const cashAfterDeposit = Math.max(0, endingCash - Math.floor(depositedAfterShift));

                    setLastShiftCash(balanceCash !== null ? Math.min(cashAfterDeposit, balanceCash) : cashAfterDeposit);
                    setOpeningCashInput('');
                    return;
                }

                if (balanceData && balanceData.current_balance !== undefined) {
                    setLastShiftCash(Math.max(0, Math.floor(Number(balanceData.current_balance))));
                    setOpeningCashInput('');
                }
            } catch (error) {
                console.error("Failed to fetch previous cashier nominal for opening shift", error);
                setOpeningCashInput('');
            }
        };
        fetchLastShiftCash();
    }
}, [showOpenShiftModal, selectedBranchId]);

useEffect(() => {
    const refreshCurrentShiftAfterDeposit = async (event: Event) => {
        const detail = (event as CustomEvent<{ branchId?: number }>).detail;
        if (detail?.branchId && Number(detail.branchId) !== Number(selectedBranchId)) return;

        try {
            const currentShiftData = await api.getCurrentShift();
            const shift = currentShiftData?.shift || currentShiftData;
            if (!shift?.id) return;

            setCurrentShift(prev => prev ? {
                ...prev,
                totalSales: parseFloat(shift.total_sales || prev.totalSales || 0),
                totalTransactions: parseInt(shift.transaction_count || String(prev.totalTransactions || 0)),
                cashSales: parseFloat(shift.cash_sales || prev.cashSales || 0),
                nonCashSales: parseFloat(shift.non_cash_sales || prev.nonCashSales || 0),
                dpSales: parseFloat(shift.dp_sales || String(prev.dpSales || 0)),
                fullSales: parseFloat(shift.full_sales || String(prev.fullSales || 0)),
                totalRefund: parseFloat(shift.total_refund || String(prev.totalRefund || 0)),
                bankDeposits: parseFloat(shift.bank_deposits || '0'),
                methodBreakdown: shift.method_breakdown || prev.methodBreakdown
            } : prev);
        } catch (error) {
            console.error('Failed to refresh current shift after bank deposit', error);
        }
    };

    window.addEventListener('naqupos-bank-deposit-created', refreshCurrentShiftAfterDeposit);
    return () => window.removeEventListener('naqupos-bank-deposit-created', refreshCurrentShiftAfterDeposit);
}, [selectedBranchId]);


// Petty Cash States
const [pettyCashItems, setPettyCashItems] = useState<PettyCashItem[]>([]);
const [showPettyCashModal, setShowPettyCashModal] = useState(false);
const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
const [pettyCashForm, setPettyCashForm] = useState({
    description: '',
    amount: '',
    categoryId: 0,
    receipt_file: null as File | null
});
const [pettyCashReceiptPreview, setPettyCashReceiptPreview] = useState<string | null>(null);
const [editingPettyCashId, setEditingPettyCashId] = useState<number | string | null>(null);
const [showDeletePettyCashModal, setShowDeletePettyCashModal] = useState<number | string | null>(null);
const [showPettyCashDetail, setShowPettyCashDetail] = useState<PettyCashItem | null>(null);

// New Customer Modal States
const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    dob: ''
});
const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

// Collapsible Logic
const [isAdjustmentsExpanded, setIsAdjustmentsExpanded] = useState(false);
const [isPriceDetailsExpanded, setIsPriceDetailsExpanded] = useState(false);
const [isNotesExpanded, setIsNotesExpanded] = useState(false);
const [isCustomerExpanded, setIsCustomerExpanded] = useState(false);
const [isShiftDetailsExpanded, setIsShiftDetailsExpanded] = useState(true);

// Payment Config State


// Fetch Initial Data (Auth, Branches, Static Data)
useEffect(() => {
    const loadInitialData = async () => {
        try {
            // 1. Auth Check
            let role = 'staff';
            let uBranchId = 0;

            const authStr = localStorage.getItem('naqupos_admin_auth');
            if (authStr) {
                try {
                    const auth = JSON.parse(authStr);
                    role = auth.user.role;
                    uBranchId = auth.user.branch_id || 0;
                } catch (e) {
                    console.error("Auth parse error", e);
                }
            } else {
                // Demo Auth Fallback
                const demoAuth = {
                    token: "mock-token",
                    user: { name: "Admin Naqupos", role: "admin", branch_id: 1 } // Default to admin for demo
                };
                localStorage.setItem('naqupos_admin_auth', JSON.stringify(demoAuth));
                role = 'admin';
            }

            setUserRole(role);

            // 2. Fetch Branches & Static Data
            const [branchesData, customersData, expenseCategoriesData, currentShiftData, taxesData, discountsData] = await Promise.all([
                api.getBranches(),
                api.getCustomers(),
                api.getExpenseCategories(),
                api.getCurrentShift(),
                api.getTaxes(),
                api.getDiscountTypes()
            ]);

            setBranches(branchesData);
            setAvailableTaxes(taxesData);
            setAvailableDiscounts(discountsData);
            setCustomers((customersData.data || customersData).map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone || '-',
                member: true
            })));

            if (expenseCategoriesData && expenseCategoriesData.length > 0) {
                setExpenseCategories(expenseCategoriesData);
                setPettyCashForm(prev => ({
                    ...prev,
                    categoryId: prev.categoryId || expenseCategoriesData[0].id
                }));
            }

            // 3. Set Initial Branch Selection with Robust Fallback
            let targetBranchId = 0;

            // Priority 1: Current Active Shift
            if (currentShiftData && currentShiftData.id && currentShiftData.status === 'open') {
                const shiftBranchId = Number(currentShiftData.branch_id);
                if (shiftBranchId) {
                    targetBranchId = shiftBranchId;

                    // Also set currentShift state since we already have the data
                    const shift = currentShiftData;
                    const sd: ShiftData = {
                        id: shift.id.toString(),
                        startTime: new Date(shift.start_time || shift.created_at),
                        openingCash: parseFloat(shift.starting_cash || 0),
                        cashier: shift.cashier?.name || 'Cashier',
                        status: 'open',
                        totalSales: parseFloat(shift.total_sales || 0),
                        totalTransactions: parseInt(shift.transaction_count || 0),
                        cashSales: parseFloat(shift.cash_sales || 0),
                        nonCashSales: parseFloat(shift.non_cash_sales || 0),
                        dpSales: parseFloat(shift.dp_sales || 0),
	                        fullSales: parseFloat(shift.full_sales || 0),
	                        totalRefund: parseFloat(shift.total_refund || 0),
	                        bankDeposits: parseFloat(shift.bank_deposits || 0),
	                        methodBreakdown: shift.method_breakdown || []
	                    };
                    setCurrentShift(sd);
                }
            }

            // Priority 2: Saved LocalStorage
            if (!targetBranchId) {
                const savedBranch = localStorage.getItem('naqupos_selected_branch');
                if (savedBranch && savedBranch !== 'all') {
                    targetBranchId = Number(savedBranch);
                }
            }

            // Priority 3: Derived from Auth or Default
            if (!targetBranchId) {
                // Check auth derived branch
                if (uBranchId > 0) {
                    targetBranchId = uBranchId;
                }
            }

            // Apply Selection
            if (targetBranchId > 0) {
                setSelectedBranchId(targetBranchId);
                localStorage.setItem('naqupos_selected_branch', targetBranchId.toString());
                // Force event dispatch to ensure listeners update
                window.dispatchEvent(new Event('naqupos-branch-change'));
            }

        } catch (error) {
            console.error("Failed to load initial data:", error);
            toast.error("Gagal memuat data awal");
        } finally {
            setIsLoadingData(false);
        }
    };
    loadInitialData();
}, []);

// Use the same source as the "Metode Bayar" management page.
useEffect(() => {
    if (!selectedBranchId || Number(selectedBranchId) <= 0) {
        setPaymentMethods([]);
        return;
    }

    let cancelled = false;
    const loadPaymentMethods = async () => {
        try {
            const response = await api.getPaymentMethods();
            if (cancelled) return;

            const rawMethods = Array.isArray(response) ? response : (response?.data || []);
            const methods = rawMethods
                .filter((method: any) => {
                    if (!isPaymentMethodActive(method)) return false;
                    if (!isPaymentMethodVisibleInCashier(method)) return false;

                    const isGlobal = method.is_global === true || method.is_global === 1 || method.is_global === '1';
                    if (isGlobal) return true;

                    const branchIds = [
                        ...(Array.isArray(method.branch_ids) ? method.branch_ids : []),
                        ...(Array.isArray(method.branches) ? method.branches.map((branch: any) => branch.id) : []),
                        ...(method.branch_id != null ? [method.branch_id] : [])
                    ].map(Number);
                    return branchIds.includes(Number(selectedBranchId));
                })
                .map((method: any) => {
                    const type = String(method.type || '').toLowerCase();
                    let group = 'DOKU';
                    if (type === 'cash' || type === 'edc') group = 'OFFLINE';
                    else if (type === 'qris') group = 'QRIS';
                    else if (type === 'transfer') group = 'BANK_TRANSFER';
                    else if (type === 'ewallet') group = 'E-WALLET';

                    let icon = method.icon || 'wallet';
                    if (icon === 'building-2') icon = 'building';
                    if (icon === 'smartphone') icon = 'wallet';

                    return {
                        id: method.id,
                        code: String(method.code || type).toLowerCase(),
                        name: method.name || method.code,
                        type,
                        icon,
                        description: method.description || '',
                        is_active: true,
                        group,
                        fee: Number(method.fee || 0),
                        account_number: method.account_number,
                        account_name: method.account_name
                    };
                });

            setPaymentMethods(methods);
            setPaymentMethod(current => {
                if (methods.some((method: any) => method.code === current)) return current;
                return methods.find((method: any) => method.type === 'cash')?.code || methods[0]?.code || '';
            });
        } catch (error) {
            if (!cancelled) {
                console.error('Failed to load POS payment methods:', error);
                setPaymentMethods([]);
                setPaymentMethod('');
            }
        }
    };

    loadPaymentMethods();
    return () => {
        cancelled = true;
    };
}, [selectedBranchId]);

// Fetch Branch Specific Data (Services, Shift, Rooms, Schedule)
// Cross-tab Synchronization
const loadBranchData = useCallback(async () => {
    if (!selectedBranchId) return;

    const requestId = ++branchDataRequestId.current;
    setIsLoadingData(true);
    setStaffSchedules([]); // Clear old staff to avoid jump
    setIsStaffLastPage(false);
    setStaffCurrentPage(1);
    setPettyCashItems([]);
    if (posTab === 'services') {
        setServices([]);
    } else {
        setProducts([]);
    }
    try {
        const today = posDate;
        const selectedServiceCategoryId = posTab === 'services' && selectedCategory !== 'All'
            ? serviceCategoryIds[selectedCategory]
            : undefined;
        const selectedProductCategory = posTab === 'products' && selectedCategory !== 'All'
            ? selectedCategory
            : undefined;

        const [servicesData, productsData, therapistScheduleData, roomsData, currentShiftData, therapistsData, calendarData, promosData] = await Promise.all([
            api.getServices({
                branch_id: selectedBranchId,
                is_active: true,
                service_category_id: selectedServiceCategoryId,
                page: 1,
                limit: itemsPerPage,
                per_page: itemsPerPage
            }),
            api.getProducts({
                branch_id: selectedBranchId,
                is_active: 1,
                category: selectedProductCategory,
                page: 1,
                limit: itemsPerPage,
                per_page: itemsPerPage
            }),
            api.getTherapistSchedule({ branch_id: selectedBranchId, start_date: today, end_date: today }),
            api.getRooms({ branch_id: selectedBranchId }),
            api.getCurrentShift(),
            api.getTherapists({ branch_id: selectedBranchId, page: 1, limit: staffPerPage }),
            api.getCalendar({ branch_id: selectedBranchId, date: today, view: 'day' }),
            api.getPromos({ status: 'active', limit: 1000 }).catch(() => ({ data: [] }))
        ]);

        // Abaikan respons filter lama yang selesai setelah pengguna memilih kategori lain.
        if (requestId !== branchDataRequestId.current) return;

        const allPromos = promosData.data ? promosData.data : (Array.isArray(promosData) ? promosData : []);
        setAvailablePromos(allPromos.filter((p: any) => !p.branch_id || p.branch_id === 'all' || p.branch_id == selectedBranchId));

        // Cache global branch data for paginated staff mapping
        const rawScheduleData = therapistScheduleData.data || (Array.isArray(therapistScheduleData) ? therapistScheduleData : []);
        const rawBookingsData = calendarData.bookings || [];
        setCachedScheduleData(rawScheduleData);
        setCachedBookingsData(rawBookingsData);

        // 1. Transform Therapists into a lookup map
        const therapistsList = (therapistsData.data || (Array.isArray(therapistsData) ? therapistsData : []))
            .filter((t: any) => {
                if (t.end_work_date) {
                    const endDate = new Date(t.end_work_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    endDate.setHours(0, 0, 0, 0);
                    if (endDate < today) return false;
                }
                return true;
            });
        const therapistNameMap = new Map<number, string>();
        therapistsList.forEach((t: any) => therapistNameMap.set(t.id, t.name));

        // 2. Transform Services with Variants and Special Prices
        const serviceList = servicesData.data || (Array.isArray(servicesData) ? servicesData : []);
        const transformedServices: Service[] = [];

        serviceList.forEach((s: any) => {
            const variants = Array.isArray(s.variants) ? s.variants : (s.variants ? Object.values(s.variants) : []);

            if (variants.length > 0) {
                // If service has variants, create an item for each variant
                variants.forEach((v: any) => {
                    // Helper to get prices for the current branch
                    const getBranchPrices = (item: any, basePrice: number, baseSpecial?: number) => {
                        let retail = parseFloat(String(item.price || basePrice || 0));
                        let special = parseFloat(String(item.special_price || baseSpecial || 0));

                        // 1. Try branch_prices (Manual overrides)
                        if (item.branch_prices) {
                            let branchPrice: any = null;

                            if (Array.isArray(item.branch_prices)) {
                                branchPrice = item.branch_prices.find((bp: any) =>
                                    String(bp.branch_id) === String(selectedBranchId)
                                );
                            } else if (typeof item.branch_prices === 'object') {
                                branchPrice = item.branch_prices[selectedBranchId] || item.branch_prices[String(selectedBranchId)];
                            }

                            if (branchPrice) {
                                if (branchPrice.price !== undefined && branchPrice.price !== null && branchPrice.price !== '') {
                                    retail = parseFloat(String(branchPrice.price));
                                }
                                if (branchPrice.special_price !== undefined && branchPrice.special_price !== null && branchPrice.special_price !== '') {
                                    special = parseFloat(String(branchPrice.special_price));
                                }
                            }
                        }
                        return { retail, special };
                    };

                    const { retail, special } = getBranchPrices(v, v.price, v.special_price);

                    transformedServices.push({
                        id: v.id,
                        name: `${s.name} - ${v.name}`,
                        price: retail,
                        special_price: special > 0 ? special : undefined,
                        category: getCategoryName(s, 'Lainnya'),
                        duration: v.duration || s.duration || 60,
                        is_limited_availability: v.is_limited_availability || s.is_limited_availability,
                        availability_type: v.availability_type || s.availability_type,
                        availability_data: v.availability_data || s.availability_data,
                        is_variant: true,
                        base_service_id: s.id
                    });
                });
            } else {
                // No variants, use base service
                let retail = parseFloat(s.price || 0);
                let special = parseFloat(s.special_price || 0);

                // Branch price overrides
                if (s.branch_prices) {
                    let branchPrice: any = null;
                    if (Array.isArray(s.branch_prices)) {
                        branchPrice = s.branch_prices.find((bp: any) => String(bp.branch_id) === String(selectedBranchId));
                    } else if (typeof s.branch_prices === 'object') {
                        branchPrice = s.branch_prices[selectedBranchId] || s.branch_prices[String(selectedBranchId)];
                    }

                    if (branchPrice) {
                        if (branchPrice.price !== undefined && branchPrice.price !== null && branchPrice.price !== '') retail = parseFloat(String(branchPrice.price));
                        if (branchPrice.special_price !== undefined && branchPrice.special_price !== null && branchPrice.special_price !== '') special = parseFloat(String(branchPrice.special_price));
                    }
                }

                transformedServices.push({
                    id: s.id,
                    name: s.name,
                    price: retail,
                    special_price: special > 0 ? special : undefined,
                    category: getCategoryName(s, 'Lainnya'),
                    duration: s.duration || 60,
                    is_limited_availability: s.is_limited_availability,
                    availability_type: s.availability_type,
                    availability_data: s.availability_data
                });
            }
        });

        setServices(transformedServices);

        // Init Service Pagination
        setServicePage(1);
        const sList = servicesData.data || (Array.isArray(servicesData) ? servicesData : []);
        const sMeta = servicesData.meta || servicesData;
        setHasMoreServices(
            sMeta?.last_page
                ? Number(sMeta.current_page || 1) < Number(sMeta.last_page)
                : sList.length >= itemsPerPage
        );

        // 2.1 Transform Products with Variants and Location Pricing
        const productList = productsData.data || (Array.isArray(productsData) ? productsData : []);
        const transformedProducts: Product[] = [];

        productList.forEach((p: any) => {
            // Helper to get prices for the current branch
            const getBranchPrices = (item: any, basePrice: number, baseSpecial?: number) => {
                let retail = parseFloat(String(item.retail_price || basePrice || 0));
                let special = parseFloat(String(item.special_price || baseSpecial || 0));

                // 1. Try location_prices (Manual overrides)
                if (item.location_prices) {
                    let locPrice: any = null;

                    // Handle Array format
                    if (Array.isArray(item.location_prices)) {
                        locPrice = item.location_prices.find((lp: any) =>
                            String(lp.branch_id) === String(selectedBranchId)
                        );
                    }
                    // Handle Object format (Keyed by branch_id)
                    else if (typeof item.location_prices === 'object') {
                        locPrice = item.location_prices[selectedBranchId] || item.location_prices[String(selectedBranchId)];
                    }

                    if (locPrice) {
                        // Extract retail
                        const retailVal = locPrice.retail !== undefined ? locPrice.retail : (locPrice.price !== undefined ? locPrice.price : locPrice.retail_price);
                        if (retailVal !== undefined && retailVal !== null && retailVal !== '') {
                            retail = parseFloat(String(retailVal));
                        }

                        // Extract special
                        const specialVal = locPrice.special !== undefined ? locPrice.special : locPrice.special_price;
                        if (specialVal !== undefined && specialVal !== null && specialVal !== '') {
                            special = parseFloat(String(specialVal));
                        }
                    }
                }

                // 2. If no location override, and computed_retail_price is available from backend
                else if (item.computed_retail_price) {
                    retail = parseFloat(item.computed_retail_price);
                }

                return { retail, special };
            };

            // Helper to get stock for current branch
            const getBranchStock = (item: any, totalStock: number) => {
                if (item.stocks && Array.isArray(item.stocks)) {
                    const branchStock = item.stocks.find((s: any) => Number(s.branch_id) === Number(selectedBranchId));
                    return branchStock ? Number(branchStock.quantity) : 0;
                }
                return totalStock || 0;
            };

            const variants = Array.isArray(p.variants) ? p.variants : (p.variants ? Object.values(p.variants) : []);

            if (variants.length > 0) {
                // If product has variants, create an item for each variant
                variants.forEach((v: any) => {
                    const { retail, special } = getBranchPrices(v, v.retail_price, v.special_price);
                    const vStock = getBranchStock(v, v.total_stock);
                    transformedProducts.push({
                        id: v.id, // Ensure this ID is unique enough or handled by backend
                        is_variant: true,
                        base_product_id: p.id,
                        name: `${p.name} - ${v.name}`,
                        price: retail,
                        special_price: special > 0 ? special : undefined,
                        category: getCategoryName(p, 'Product'),
                        sku: v.sku || p.sku,
                        stock: vStock,
                        image: p.image
                    });
                });
            } else {
                // Standard product
                const { retail, special } = getBranchPrices(p, p.retail_price, p.special_price);
                const pStock = getBranchStock(p, p.total_stock);
                transformedProducts.push({
                    id: p.id,
                    name: p.name,
                    price: retail,
                    special_price: special > 0 ? special : undefined,
                    category: getCategoryName(p, 'Product'),
                    sku: p.sku,
                    stock: pStock,
                    image: p.image
                });
            }
        });

        setProducts(transformedProducts);

        // Init Product Pagination
        setProductPage(1);
        const pList = productsData.data || (Array.isArray(productsData) ? productsData : []);
        const pMeta = productsData.meta || productsData;
        setHasMoreProducts(
            pMeta?.last_page
                ? Number(pMeta.current_page || 1) < Number(pMeta.last_page)
                : pList.length >= itemsPerPage
        );

        // 3. Transform Schedule
        const scheduleData = therapistScheduleData.data || (Array.isArray(therapistScheduleData) ? therapistScheduleData : []);
        const therapistMap = new Map<number, StaffSchedule>();

        // Initialize map with all therapists to ensure they show up even without bookings
        therapistsList.forEach((t: any) => {
            therapistMap.set(t.id, {
                staffId: t.id,
                name: t.name,
                shifts: [],
                workHours: [],
                specialization: t.specialization || 'Therapist',
                gender: t.gender
            });
        });

        // 3.1 Process Shifts from Schedule
        scheduleData.forEach((schedule: any) => {
            const sId = Number(schedule.staffId || schedule.therapist_id);
            if (!therapistMap.has(sId)) return;

            const startTime = (schedule.startTime || schedule.start_time).substring(0, 5);
            const endTime = (schedule.endTime || schedule.end_time).substring(0, 5);
            const sType = (schedule.type || 'booked').toLowerCase();

            // If it's a work shift (specific or recurring from CalendarController)
            if (sType === 'specific' || sType === 'recurring' || sType === 'work') {
                therapistMap.get(sId)!.workHours!.push({
                    start: startTime,
                    end: endTime
                });
            }
            // If it's an explicit Off/Break
            else if (sType.includes('off') || sType.includes('libur')) {
                therapistMap.get(sId)!.shifts.push({
                    start: startTime,
                    end: endTime,
                    type: 'off'
                });
            } else if (sType.includes('break')) {
                therapistMap.get(sId)!.shifts.push({
                    start: startTime,
                    end: endTime,
                    type: 'break'
                });
            }
        });

        // 3.2 Process Bookings from Calendar
        const bookingsData = calendarData.bookings || [];
        bookingsData.forEach((booking: any) => {
            if (booking.status === 'cancelled') return;
            const bId = Number(booking.staffId || booking.therapist_id);
            if (!therapistMap.has(bId)) return;

            const duration = booking.duration || 60;
            const startTime = booking.start || "00:00";
            const [h, m] = startTime.split(':').map(Number);
            const endMins = (h || 0) * 60 + (m || 0) + duration;
            const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

            const bookingLabel = booking.isBlocked
                ? (booking.blockReason || 'Blocked')
                : `${booking.customer} (${booking.service})`;

            therapistMap.get(bId)!.shifts.push({
                start: startTime.substring(0, 5),
                end: endTime,
                type: booking.isBlocked ? 'off' : 'booked',
                label: bookingLabel
            });
        });

        // Pagination check
        // Pagination check
        const meta = therapistsData.meta;
        const total = meta?.total ?? therapistsData.total;
        const results = Array.from(therapistMap.values());
        const count = results.length;

        // Check raw response length for safe pagination
        const rawResponseList = therapistsData.data || (Array.isArray(therapistsData) ? therapistsData : []);
        const rawCount = rawResponseList.length;

        let isLast = false;
        if (rawCount < staffPerPage) {
            isLast = true;
        } else if (count === 0) {
            isLast = true;
        } else if (total !== undefined) {
            isLast = count >= Number(total);
        } else if (meta?.last_page) {
            isLast = (meta.current_page || 1) >= meta.last_page;
        } else {
            isLast = count < staffPerPage;
        }

        setIsStaffLastPage(isLast);
        setStaffCurrentPage(1);
        setStaffSchedules(results);

        // Transform Rooms
        const roomList = Array.isArray(roomsData) ? roomsData : roomsData.data || [];
        const availableRooms = roomList.filter((r: Room) => r.status === 'available');
        setRooms(availableRooms.length > 0 ? availableRooms : []); // Logic to mock handles inside fetchRooms but we update main state here too if needed

        // Transform Shift 
        // WARNING: If admin views Branch B, but token is for Branch A, getCurrentShift might return Branch A's shift.
        // We'll assume for now this works or simply display what returns.
      if (currentShiftData && currentShiftData.shift) {
    const shift = currentShiftData.shift;
    const shiftData: ShiftData = {
        id: shift.id.toString(),
        startTime: new Date(shift.clock_in),
        endTime: shift.clock_out ? new Date(shift.clock_out) : undefined,
        openingCash: parseFloat(shift.starting_cash),
        cashier: shift.cashier?.name || 'Cashier',
        status: 'open',
        totalSales: parseFloat(shift.total_sales || 0),
        totalTransactions: parseInt(shift.transaction_count || 0),
        cashSales: parseFloat(shift.cash_sales || 0),
        nonCashSales: parseFloat(shift.non_cash_sales || 0),
	        dpSales: parseFloat(shift.dp_sales || 0),
	        fullSales: parseFloat(shift.full_sales || 0),
	        totalRefund: parseFloat(shift.total_refund || 0),
	        bankDeposits: parseFloat(shift.bank_deposits || 0),
	        methodBreakdown: shift.method_breakdown || []
	    };
    setCurrentShift(shiftData);

    // Reset dulu sebelum fetch
    setPettyCashItems([]);

    try {
        const expensesData = await api.getExpenses({ shift_id: shift.id, limit: 2000 });
        const items = (expensesData.data || expensesData)
            .filter((e: any) => String(e.cashier_shift_id) === String(shift.id)) // filter double safety
            .map((e: any) => ({
                id: e.id,
                description: e.description,
                amount: parseFloat(e.amount),
                categoryId: e.category_id,
                categoryName: e.category?.name || 'Unknown',
                timestamp: new Date(e.created_at),
                shiftId: shift.id.toString(),
                receipt_url: e.receipt_url,
                creator_name: e.creator?.name
            }));
        setPettyCashItems(items);
    } catch (err) { 
        console.error(err);
        setPettyCashItems([]);
    }
} else {
    setCurrentShift(null);
    setPettyCashItems([]);
}

        // 4. Fetch Company Settings for branch
        try {
            const settings = await api.getCompanySettings(selectedBranchId);
            setCompanySettings(settings);
        } catch (err) {
            console.error("Failed to fetch company settings for POS", err);
            setCompanySettings(null);
        }

    } catch (error) {
        if (requestId !== branchDataRequestId.current) return;
        console.error("Failed to load branch data", error);
        toast.error("Gagal memuat data cabang");
    } finally {
        if (requestId === branchDataRequestId.current) {
            setIsLoadingData(false);
        }
    }
}, [selectedBranchId, posDate, staffPerPage, itemsPerPage, posTab, selectedCategory, serviceCategoryIds]);

useEffect(() => {
    loadBranchData();
}, [loadBranchData]);

// Cross-tab Synchronization Event Listener
useEffect(() => {
    const channel = new BroadcastChannel('zafara-pos-sync');
    channel.onmessage = (event) => {
        if (event.data === 'data-updated' && selectedBranchId) {
            console.log('POS data update signal received');
            loadBranchData();
        }
    };
    return () => channel.close();
}, [selectedBranchId, loadBranchData]);

// Auto-advance date logic removed to prevent confusion after closing hours
useEffect(() => {
    const todayStr = formatDateYMD(new Date());
    setMinDateAllowed(todayStr); // Always allow today as minimum
}, []);

// Load shift data from localStorage on mount
// Local Storage logic removed for Shift Persistence (using Backend)

// 1. Capture incoming booking data
const [incomingBooking, setIncomingBooking] = useState<any>(null);
useEffect(() => {
    if (location.state?.bookingData) {
        setIncomingBooking(location.state.bookingData);
        // Clear the location state immediately so refresh doesn't re-trigger
        window.history.replaceState({}, document.title);
    }

    
}, [location.state]);

// 2. Process incoming booking data when dependencies are ready
useEffect(() => {
    const bData = incomingBooking;
    if (bData && currentShift && services.length > 0) {
        setBookingData(bData);
        const bookingTherapist = {
            id: bData.staff?.id || 1,
            name: bData.staff?.name || 'Staff',
            available: true
        };

        const newCart: CartItem[] = [];

        if (bData.services && Array.isArray(bData.services) && bData.services.length > 0) {
            // Multi-service booking
            bData.services.forEach((s: any, index: number) => {
               const actualService = services.find(svc => svc.id === s.id)
        || services.find(svc => svc.name === s.name || svc.name.startsWith(s.name))
        || s;

                // Handle room for this service
                const rId = bData.room_ids ? bData.room_ids[index] : (index === 0 ? bData.room?.id : null);
                const roomCharge = Array.isArray(bData.room_charges)
                    ? Number(bData.room_charges[index] || 0)
                    : (index === 0 ? Number(bData.room?.price || 0) : 0);
                const selectedRoom = rId ? rooms.find(room => room.id === rId) : null;
                const cartRoom = rId
                    ? {
                        ...(selectedRoom || bData.room || { id: rId, name: `Ruangan ${rId}`, type: 'regular', capacity: 1, status: 'available' }),
                        id: rId,
                        price: roomCharge
                    }
                    : undefined;

                const bookingItem: CartItem = {
                    type: 'service',
                    service: {
                        id: actualService.id ?? s.id,
                        name: s.name,
                        price: parseFloat(s.price || actualService.price),
                        category: actualService.category || 'Booking',
                        is_variant: actualService.is_variant,
                        base_service_id: actualService.base_service_id
                    },
                    therapist: s.staff ? { id: s.staff.id, name: s.staff.name, available: true } : bookingTherapist,
                    room: cartRoom,
                    quantity: 1
                };
                newCart.push(bookingItem);
            });
        } else {
            // Legacy single-service fallback
            let actualService = services.find(s => s.name === bData.service?.name);
            if (!actualService && services.length > 0) {
                actualService = services[0];
            }

            const bookingItem: CartItem = {
                type: 'service',
                    service: {
                        id: actualService?.id || 0,
                        name: bData.service?.name || actualService?.name || 'Unknown Service',
                        price: bData.service?.price || actualService?.price || 0,
                        category: actualService?.category || 'Booking',
                        is_variant: actualService?.is_variant,
                        base_service_id: actualService?.base_service_id
                },
                therapist: bookingTherapist,
                room: bData.room
                    ? { ...bData.room, price: Array.isArray(bData.room_charges) ? Number(bData.room_charges[0] || 0) : Number(bData.room.price || 0) }
                    : undefined,
                quantity: 1
            };
            newCart.push(bookingItem);
        }

        setCart(newCart);

        // Setelah loop bData.services / legacy single-service
// Tambahkan produk ke cart jika ada
if (bData.products && Array.isArray(bData.products) && bData.products.length > 0) {
    bData.products.forEach((prod: any) => {
        const actualProduct = products.find(p => p.id === prod.id || p.name === prod.name);
        
        const cartProduct: CartItem = {
            type: 'product',
            product: {
                id: actualProduct?.id || prod.id || 0,
                name: prod.name || actualProduct?.name || 'Unknown Product',
                price: parseFloat(prod.price || actualProduct?.price || 0),
                special_price: actualProduct?.special_price,
                category: prod.variant || actualProduct?.category || 'Product',
                sku: actualProduct?.sku,
                stock: actualProduct?.stock,
                is_variant: actualProduct?.is_variant,
                base_product_id: actualProduct?.base_product_id
            },
            quantity: prod.quantity || 1,
        };
        newCart.push(cartProduct);
    });
}

setCart(newCart);


        if (bData.bookingId && typeof bData.bookingId === 'string' && bData.bookingId.startsWith('PL-')) {
            const logId = parseInt(bData.bookingId.replace('PL-', ''));
            if (!isNaN(logId)) {
                setPaymentLogId(logId);
            }
        }

        // Handle Settlement / DP already paid
        if (bData.isSettlement && bData.dp) {
            setDpAlreadyPaid(parseFloat(bData.dp));
        } else {
            setDpAlreadyPaid(0);
        }

        // Handle Promo/Voucher from booking
        if (bData.promoCode) {
            setPromoCode(bData.promoCode || '');
            const promo = availablePromos.find(p => p.code.toUpperCase() === (bData.promoCode || '').toUpperCase());
            if (promo) {
                setSelectedPromoId(promo.id);
            } else if (bData.discountAmount) {
                // Fallback to manual discount if promo code not found in active list
                setDiscountAmount(parseFloat(bData.discountAmount));
            }
        } else if (bData.discountAmount) {
            setDiscountAmount(parseFloat(bData.discountAmount));
        }

        // Set customer if available
        if (bData.customer) {
            const searchName = (bData.customer.name || '').trim().toLowerCase();
            const searchPhone = (bData.customer.phone || '').trim().replace(/\D/g, '');

            // Try to find existing customer by name or phone (case-insensitive)
            const existingCustomer = customers.find(c => {
                const cName = (c.name || '').trim().toLowerCase();
                const cPhone = (c.phone || '').trim().replace(/\D/g, '');
                return (searchName && cName === searchName) || (searchPhone && cPhone && cPhone === searchPhone);
            });

            if (bData.notes) {
                setBookingNotes(bData.notes);
            } else {
                setBookingNotes('');
            }

            if (existingCustomer) {
                setSelectedCustomer({ ...existingCustomer });
            } else if (bData.customer.name) {
                // Create a temporary customer object for display
                setSelectedCustomer({
                    id: 0, // Temporary ID for non-account guests
                    name: bData.customer.name,
                    phone: bData.customer.phone || '-',
                    member: false
                });
            }
        }
        setIncomingBooking(null);
    }
}, [incomingBooking, currentShift, customers, services, rooms, availablePromos, availableTaxes, availableDiscounts]);

useEffect(() => {
    const preferredPaymentMethod = String(incomingBooking?.paymentMethod || incomingBooking?.payment_method || '').toLowerCase();
    if (preferredPaymentMethod && paymentMethods.some(method => method.code === preferredPaymentMethod)) {
        setPaymentMethod(preferredPaymentMethod);
    }
}, [incomingBooking, paymentMethods]);

useEffect(() => {
    const fetchCategories = async () => {
        try {
            const [serviceRes, productRes] = await Promise.all([
                api.getServiceCategories(),
                api.getCategories()
            ]);

            // 1. Process Service Categories
            const allServiceCats = Array.isArray(serviceRes) ? serviceRes : [];
            const filteredServiceCats = allServiceCats.filter((c: any) => {
                if (!selectedBranchId || selectedBranchId === 0) return true;
                const isGlobal = c.is_global === 1 || c.is_global === true || c.is_global === '1';
                if (isGlobal) return true;
                const branchIds = c.branches ? c.branches.map((b: any) => Number(b.id)) : (c.branch_id ? [Number(c.branch_id)] : []);
                return branchIds.includes(selectedBranchId);
            });
            const serviceNames = filteredServiceCats
                .map((category: any) => String(category.name || '').trim())
                .filter(Boolean);
            setServiceCategories(['All', ...Array.from(new Set(serviceNames))]);
            setServiceCategoryIds(
                filteredServiceCats.reduce((result: Record<string, number>, category: any) => {
                    const name = String(category.name || '').trim();
                    if (name && category.id != null) result[name] = Number(category.id);
                    return result;
                }, {})
            );

            // 2. Process Product Categories
            const allProductCats = Array.isArray(productRes) ? productRes : [];
            // Assuming product categories are global or handled similarly, but just taking names for now
            const productNames = allProductCats
                .map((category: any) => String(category.name || '').trim())
                .filter(Boolean);
            setProductCategories(['All', ...Array.from(new Set(productNames))]);

        } catch (error) {
            console.error("Failed to load categories", error);
            setServiceCategoryIds({});
            setServiceCategories(['All', 'Massage', 'Facial', 'Body', 'Hair', 'Booking']);
            setProductCategories(['All', 'Product', 'Skincare']);
        }
    };
    fetchCategories();
}, [selectedBranchId]);

// Reset category when tab changes
useEffect(() => {
    setSelectedCategory('All');
}, [posTab]);

// Consolidate staff reset logic
useEffect(() => {
    setStaffCurrentPage(1);
    setIsStaffLastPage(false);
    setStaffSchedules([]);
}, [selectedBranchId, posDate]);

// Load More Staff (Backend Paginated)
const loadMoreStaff = async () => {
    if (isStaffLastPage || isStaffLoadingMore || !selectedBranchId) return;

    setIsStaffLoadingMore(true);
    const nextPage = staffCurrentPage + 1;

    try {
        const therapistsData = await api.getTherapists({
            branch_id: selectedBranchId,
            page: nextPage,
            limit: staffPerPage
        });

        const therapistsList = (therapistsData.data || (Array.isArray(therapistsData) ? therapistsData : []))
            .filter((t: any) => {
                if (t.end_work_date) {
                    const endDate = new Date(t.end_work_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    endDate.setHours(0, 0, 0, 0);
                    if (endDate < today) return false;
                }
                return true;
            });

        if (therapistsList.length === 0) {
            setIsStaffLastPage(true);
            setIsStaffLoadingMore(false);
            return;
        }

        const therapistMap = new Map<number, StaffSchedule>();
        therapistsList.forEach((t: any) => {
            therapistMap.set(t.id, {
                staffId: t.id,
                name: t.name,
                shifts: [],
                workHours: [],
                specialization: t.specialization || 'Therapist',
                gender: t.gender,
                rating: t.rating || 5
            });
        });

        // Apply cached schedule data
        cachedScheduleData.forEach((schedule: any) => {
            const sId = Number(schedule.staffId || schedule.therapist_id);
            if (!therapistMap.has(sId)) return;
            const startTime = (schedule.startTime || schedule.start_time).substring(0, 5);
            const endTime = (schedule.endTime || schedule.end_time).substring(0, 5);
            const sType = (schedule.type || 'booked').toLowerCase();
            if (sType === 'specific' || sType === 'recurring' || sType === 'work') {
                therapistMap.get(sId)!.workHours!.push({ start: startTime, end: endTime });
            } else if (sType.includes('off') || sType.includes('libur')) {
                therapistMap.get(sId)!.shifts.push({ start: startTime, end: endTime, type: 'off' });
            } else if (sType.includes('break')) {
                therapistMap.get(sId)!.shifts.push({ start: startTime, end: endTime, type: 'break' });
            }
        });

        // Apply cached bookings data
        cachedBookingsData.forEach((booking: any) => {
            if (booking.status === 'cancelled') return;
            const bId = Number(booking.staffId || booking.therapist_id);
            if (!therapistMap.has(bId)) return;
            const duration = booking.duration || 60;
            const startTime = booking.start || "00:00";
            const [h, m] = startTime.split(':').map(Number);
            const endMins = (h || 0) * 60 + (m || 0) + duration;
            const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
            therapistMap.get(bId)!.shifts.push({
                start: startTime.substring(0, 5),
                end: endTime,
                type: booking.isBlocked ? 'off' : 'booked',
                label: booking.isBlocked ? (booking.blockReason || 'Blocked') : `${booking.customer} (${booking.service})`
            });
        });

        const newStaff = Array.from(therapistMap.values());

        if (newStaff.length === 0) {
            setIsStaffLastPage(true);
            setIsStaffLoadingMore(false);
            return;
        }

        // Check for duplicates and update state
        // Determine if this is the last page based on current response
        const meta = therapistsData.meta;
        // const total = meta?.total ?? therapistsData.total; // Clean up unused variable
        const rawResponseList = therapistsData.data || (Array.isArray(therapistsData) ? therapistsData : []);
        const rawCount = rawResponseList.length;

        let reachedEnd = false;
        // If we got fewer items than requested, it's definitely the last page
        if (rawCount < staffPerPage) reachedEnd = true;
        else if (meta?.last_page && nextPage >= meta.last_page) reachedEnd = true;

        // Check based on total if available (though relying on rawCount is safer)
        // Note: We can't easily check 'updatedList.length' here without prev state, 
        // but rawCount < staffPerPage is the most reliable signal.

        if (reachedEnd) {
            setIsStaffLastPage(true);
        }

        // Update staff list
        setStaffSchedules(prev => {
            const existingIds = new Set(prev.map(s => s.staffId));
            const uniqueNew = newStaff.filter(s => !existingIds.has(s.staffId));

            // Secondary check: if we got data but all were duplicates, 
            // we might want to consider it 'end' or fetch next. 
            // For now, let's just append.

            return [...prev, ...uniqueNew];
        });

        // Allow one more empty fetch to confirm end if needed, but the rawCount check should catch it.
        if (rawCount === 0) setIsStaffLastPage(true);

        setStaffCurrentPage(nextPage);

    } catch (error) {
        console.error("Failed to load more staff", error);
    } finally {
        setIsStaffLoadingMore(false);
    }
};

// Load More Services (Infinite Scroll)
const loadMoreServices = async () => {
    if (!hasMoreServices || isLoadingMoreServices || !selectedBranchId) return;
    setIsLoadingMoreServices(true);
    const nextPage = servicePage + 1;
    const requestedFilter = activeCatalogFilter.current;

    try {
        // Update to use both limit and per_page for compatibility
        const res = await api.getServices({
            branch_id: selectedBranchId,
            is_active: true,
            service_category_id: selectedCategory !== 'All' ? serviceCategoryIds[selectedCategory] : undefined,
            page: nextPage,
            limit: itemsPerPage,
            per_page: itemsPerPage
        });
        if (requestedFilter !== activeCatalogFilter.current) return;
        const list = res.data || (Array.isArray(res) ? res : []);
        const meta = res.meta || res;

        if (list.length === 0) {
            setHasMoreServices(false);
        } else {
            const newServices: Service[] = [];
            list.forEach((s: any) => {
                const variants = Array.isArray(s.variants) ? s.variants : (s.variants ? Object.values(s.variants) : []);
                if (variants.length > 0) {
                    variants.forEach((v: any) => {
                        let retail = parseFloat(String(v.price || 0));
                        let special = parseFloat(String(v.special_price || 0));
                        if (v.branch_prices) {
                            let bp: any = null;
                            if (Array.isArray(v.branch_prices)) bp = v.branch_prices.find((b: any) => String(b.branch_id) === String(selectedBranchId));
                            else if (typeof v.branch_prices === 'object') bp = v.branch_prices[selectedBranchId] || v.branch_prices[String(selectedBranchId)];
                            if (bp) {
                                if (bp.price !== undefined && bp.price !== null && bp.price !== '') retail = parseFloat(String(bp.price));
                                if (bp.special_price !== undefined && bp.special_price !== null && bp.special_price !== '') special = parseFloat(String(bp.special_price));
                            }
                        }
                        newServices.push({
                            id: v.id,
                            name: `${s.name} - ${v.name}`,
                            price: retail,
                            special_price: special > 0 ? special : undefined,
                            category: getCategoryName(s, 'Lainnya'),
                            duration: v.duration || s.duration || 60,
                            is_limited_availability: v.is_limited_availability || s.is_limited_availability,
                            availability_type: v.availability_type || s.availability_type,
                            availability_data: v.availability_data || s.availability_data,
                            is_variant: true,
                            base_service_id: s.id
                        });
                    });
                } else {
                    let retail = parseFloat(String(s.price || 0));
                    let special = parseFloat(String(s.special_price || 0));
                    if (s.branch_prices) {
                        let bp: any = null;
                        if (Array.isArray(s.branch_prices)) bp = s.branch_prices.find((b: any) => String(b.branch_id) === String(selectedBranchId));
                        else if (typeof s.branch_prices === 'object') bp = s.branch_prices[selectedBranchId] || s.branch_prices[String(selectedBranchId)];
                        if (bp) {
                            if (bp.price !== undefined && bp.price !== null && bp.price !== '') retail = parseFloat(String(bp.price));
                            if (bp.special_price !== undefined && bp.special_price !== null && bp.special_price !== '') special = parseFloat(String(bp.special_price));
                        }
                    }
                    newServices.push({
                        id: s.id,
                        name: s.name,
                        price: retail,
                        special_price: special > 0 ? special : undefined,
                        category: getCategoryName(s, 'Lainnya'),
                        duration: s.duration || 60,
                        is_limited_availability: s.is_limited_availability,
                        availability_type: s.availability_type,
                        availability_data: s.availability_data
                    });
                }
            });

            setServices(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const uniqueNew = newServices.filter((s: any) => !existingIds.has(s.id));
                return [...prev, ...uniqueNew];
            });
            setServicePage(nextPage);

            const hasMore = (list.length >= itemsPerPage) || (meta?.last_page && nextPage < meta.last_page);
            setHasMoreServices(!!hasMore);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsLoadingMoreServices(false);
    }
};

// Load More Products (Infinite Scroll)
const loadMoreProducts = async () => {
    if (!hasMoreProducts || isLoadingMoreProducts || !selectedBranchId) return;
    setIsLoadingMoreProducts(true);
    const nextPage = productPage + 1;
    const requestedFilter = activeCatalogFilter.current;

    try {
        // Update to use both limit and per_page for compatibility
        const res = await api.getProducts({
            branch_id: selectedBranchId,
            is_active: 1,
            category: selectedCategory !== 'All' ? selectedCategory : undefined,
            page: nextPage,
            limit: itemsPerPage,
            per_page: itemsPerPage
        });
        if (requestedFilter !== activeCatalogFilter.current) return;
        const list = res.data || (Array.isArray(res) ? res : []);
        const meta = res.meta || res;

        if (list.length === 0) {
            setHasMoreProducts(false);
        } else {
            const newProducts: Product[] = [];

            list.forEach((p: any) => {
                // Helper to get prices for the current branch (Inline copy)
                const getBranchPrices = (item: any, basePrice: number, baseSpecial?: number) => {
                    let retail = parseFloat(String(item.retail_price || basePrice || 0));
                    let special = parseFloat(String(item.special_price || baseSpecial || 0));

                    if (item.location_prices) {
                        let locPrice: any = null;
                        if (Array.isArray(item.location_prices)) {
                            locPrice = item.location_prices.find((lp: any) => String(lp.branch_id) === String(selectedBranchId));
                        } else if (typeof item.location_prices === 'object') {
                            locPrice = item.location_prices[selectedBranchId] || item.location_prices[String(selectedBranchId)];
                        }

                        if (locPrice) {
                            const retailVal = locPrice.retail !== undefined ? locPrice.retail : (locPrice.price !== undefined ? locPrice.price : locPrice.retail_price);
                            if (retailVal !== undefined && retailVal !== null && retailVal !== '') retail = parseFloat(String(retailVal));
                            const specialVal = locPrice.special !== undefined ? locPrice.special : locPrice.special_price;
                            if (specialVal !== undefined && specialVal !== null && specialVal !== '') special = parseFloat(String(specialVal));
                        }
                    } else if (item.computed_retail_price) {
                        retail = parseFloat(item.computed_retail_price);
                    }
                    return { retail, special };
                };

                const getBranchStock = (item: any, totalStock: number) => {
                    if (item.stocks && Array.isArray(item.stocks)) {
                        const branchStock = item.stocks.find((s: any) => Number(s.branch_id) === Number(selectedBranchId));
                        return branchStock ? Number(branchStock.quantity) : 0;
                    }
                    return totalStock || 0;
                };

                const variants = Array.isArray(p.variants) ? p.variants : (p.variants ? Object.values(p.variants) : []);
                if (variants.length > 0) {
                    variants.forEach((v: any) => {
                        const { retail, special } = getBranchPrices(v, v.retail_price, v.special_price);
                        const vStock = getBranchStock(v, v.total_stock);
                        newProducts.push({
                            id: v.id,
                            is_variant: true,
                            base_product_id: p.id,
                            name: `${p.name} - ${v.name}`,
                            price: retail,
                            special_price: special > 0 ? special : undefined,
                            category: getCategoryName(p, 'Product'),
                            sku: v.sku || p.sku,
                            stock: vStock,
                            image: p.image
                        });
                    });
                } else {
                    const { retail, special } = getBranchPrices(p, p.retail_price, p.special_price);
                    const pStock = getBranchStock(p, p.total_stock);
                    newProducts.push({
                        id: p.id,
                        name: p.name,
                        price: retail,
                        special_price: special > 0 ? special : undefined,
                        category: getCategoryName(p, 'Product'),
                        sku: p.sku,
                        stock: pStock,
                        image: p.image
                    });
                }
            });

            setProducts(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
                return [...prev, ...uniqueNew];
            });
            setProductPage(nextPage);

            const hasMore = (list.length >= itemsPerPage) || (meta?.last_page && nextPage < meta.last_page);
            setHasMoreProducts(!!hasMore);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsLoadingMoreProducts(false);
    }
};
useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isStaffLoadingMore && !isStaffLastPage) {
            // Ensure we don't trigger if we're already at what looks like a full page but it's actually the end
            loadMoreStaff();
        }
    }, {
        root: target.parentElement,
        rootMargin: '20px',
        threshold: 0.01
    });

    observer.observe(target);
    return () => observer.disconnect();
}, [staffCurrentPage, isStaffLoadingMore, isStaffLastPage, selectedBranchId, posDate, cachedScheduleData, cachedBookingsData]);

const categories = posTab === 'services' ? serviceCategories : productCategories;

const filteredServices = services.filter(s => {
    const matchesCategory = selectedCategory === 'All' || isSameCategory(s.category, selectedCategory);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
});

const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || isSameCategory(p.category, selectedCategory);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
});

const addProductToCart = (product: Product) => {
    if (!currentShift || currentShift.status !== 'open') {
        toast.error('Silakan buka shift terlebih dahulu!');
        return;
    }

    const existingItemIndex = cart.findIndex(item => item.type === 'product' && item.product?.id === product.id);

    if (existingItemIndex > -1) {
        const newCart = [...cart];
        newCart[existingItemIndex].quantity += 1;
        setCart(newCart);
        toast.success(`${product.name} ditambahkan ke keranjang`);
    } else {
        const newItem: CartItem = {
            type: 'product',
            product: product,
            quantity: 1
        };
        setCart([...cart, newItem]);
        toast.success(`${product.name} ditambahkan ke keranjang`);
    }
};

const addToCart = async (service: Service) => {
    if (!currentShift || currentShift.status !== 'open') {
        toast.error('Silakan buka shift terlebih dahulu!');
        return;
    }

    // Set selected service and fetch all therapists
    setSelectedServiceForCart(service);
    setShowTherapistModal(true);
    setIsLoadingTherapists(true);

    try {
        // Use existing staff schedules instead of fetching again
        // This ensures consistent data with the timeline view
        const therapistsFromSchedule = staffSchedules.map(staff => ({
            id: staff.staffId,
            name: staff.name,
            specialization: staff.specialization,
            gender: staff.gender,
            available: true // We'll assume available and let time slots handle specific availability
        }));

        if (therapistsFromSchedule.length > 0) {
            setAvailableTherapists(therapistsFromSchedule);
        } else {
            // Fallback attempt if schedule is empty for some reason
            const response = await api.getAvailableTherapists({
                branch_id: branchId,
                date: posDate
            });
            setAvailableTherapists(response.therapists || []);
        }
    } catch (error) {
        console.error('Failed to fetch therapists:', error);
        setAvailableTherapists([]);
    } finally {
        setIsLoadingTherapists(false);
    }
};

const handleTherapistSelect = async (therapist: Therapist) => {
    setSelectedTherapist(therapist);
    setShowTherapistModal(false);
    setShowTimeSelectionModal(true);
    setIsLoadingTimeSlots(true);

    try {
        const today = posDate;

        // Fetch therapist's schedule and generate available time slots
        // This API call might not be necessary if therapist.schedule is already available
        // Or if the backend can provide available slots for a specific therapist and date
        await api.getAvailableTherapists({ // Reusing for demo, ideally a dedicated endpoint
            branch_id: branchId,
            date: today,
            therapist_id: therapist.id
        });

        // Generate time slots based on therapist schedule
        const slots = generateTimeSlots(therapist, selectedServiceForCart?.duration || 60);
        setAvailableTimeSlots(slots);
    } catch (error) {
        console.error('Failed to fetch time slots:', error);
        setAvailableTimeSlots([]);
    } finally {
        setIsLoadingTimeSlots(false);
    }
};

const generateTimeSlots = (therapist: Therapist, duration: number): string[] => {
    const slots: string[] = [];

    // 1. Get existing occupied times (bookings, breaks, etc.)
    const staffSchedule = staffSchedules.find(s => s.staffId === therapist.id);
    const occupiedTimes = (staffSchedule?.shifts.map(s => {
        const [h1, m1] = s.start.split(':').map(Number);
        const [h2, m2] = s.end.split(':').map(Number);
        return {
            start: h1 * 60 + m1,
            end: h2 * 60 + m2
        };
    }) || []);

    // Add items from cart that are for the same therapist and date
    cart.forEach(item => {
        if (item.type === 'service' && item.therapist && item.therapist.id === therapist.id && item.date === posDate && item.time) {
            const [h, m] = item.time.split(':').map(Number);
            const startMins = h * 60 + m;
            const duration = item.service?.duration || 60;
            occupiedTimes.push({
                start: startMins,
                end: startMins + duration
            });
        }
    });

    // 2. Get therapist work hours for the day
    // Strictly use workHours from staffSchedule if available, otherwise fallback to business hours
    const activeWorkHours = staffSchedule?.workHours && staffSchedule.workHours.length > 0
        ? staffSchedule.workHours
        : []; // Only show slots if workHours are defined, as per user request

    // Generate slots based on configurable interval
    const interval = Math.max(1, bookingInterval);

    activeWorkHours.forEach(wh => {
        const [startHour, startMin] = wh.start.split(':').map(Number);
        const [endHour, endMin] = wh.end.split(':').map(Number);
        const whStartMin = startHour * 60 + startMin;
        const whEndMin = endHour * 60 + endMin;

        for (let time = whStartMin; time + duration <= whEndMin; time += interval) {

            // Filter out past times if date is today
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const selectedDate = new Date(posDate);
            const isToday = selectedDate.getTime() === today.getTime();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            if (isToday && time <= currentMinutes) {
                continue;
            }

            // Check if ANY occupied shift overlaps with the requested duration [time, time + duration)
            const isBlocked = occupiedTimes.some(occ => {
                return time < occ.end && occ.start < (time + duration);
            });

            if (isBlocked) {
                continue;
            }

            const hours = Math.floor(time / 60);
            const minutes = time % 60;
            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            slots.push(timeString);
        }
    });

    return slots;
};

const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
        const response = await api.getRooms({ branch_id: selectedBranchId });
        const roomList = Array.isArray(response) ? response : response.data || [];

        const availableRooms = roomList.filter((r: Room) => r.status === 'available').map((r: any) => ({
            ...r,
            price: typeof r.extra_charge === 'string' ? parseFloat(r.extra_charge) : (r.extra_charge || r.price || 0)
        }));

        if (availableRooms.length > 0) {
            setRooms(availableRooms);
        } else {
            // If API returns no rooms OR no available rooms, throw to trigger fallback
            throw new Error('No available rooms found');
        }
    } catch {
        console.log('Using mock rooms data');
        // Fallback / Mock data matching the design
        setRooms([
            { id: 101, name: 'Standard Room', type: 'regular', capacity: 1, status: 'available', price: 0 },
            { id: 102, name: 'VIP Room', type: 'vip', capacity: 1, status: 'available', price: 50000 },
            { id: 103, name: 'VVIP Room', type: 'vip', capacity: 2, status: 'available', price: 100000 },
        ] as Room[]);
    } finally {
        setIsLoadingRooms(false);
    }
};

const handleContinueToRooms = () => {
    if (!selectedTime) return;
    setShowTimeSelectionModal(false);
    setShowRoomModal(true);
    fetchRooms();
};

const confirmAddToCart = () => {
    if (!selectedServiceForCart || !selectedTherapist || !selectedTime || !selectedRoom) return;

    const newItem: CartItem = {
        type: 'service',
        service: selectedServiceForCart,
        therapist: selectedTherapist,
        quantity: 1,
        scheduledTime: selectedTime,
        time: selectedTime, // Add time for booking creation
        room: selectedRoom,
        date: posDate
    };

    setCart([...cart, newItem]);
    setShowRoomModal(false);
    setSelectedServiceForCart(null);
    setSelectedTherapist(null);
    setSelectedTime('');
    setSelectedRoom(null);
};

const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
};

const subtotal = cart.reduce((sum, item) => {
    const price = item.type === 'service'
        ? (item.service?.special_price || item.service?.price || 0)
        : (item.product?.special_price || item.product?.price || 0);
    return sum + price * item.quantity;
}, 0);
const roomCharge = cart.some(item => item.type === 'service' && item.room) ? cart.reduce((sum, item) => sum + (item.room?.price || 0), 0) : 0;

// Auto-recalculate tax, discount and promo when subtotal changes
useEffect(() => {
    // Tax calculation (Automatic based on settings)
    if (companySettings?.is_tax_enabled && companySettings?.tax_percentage > 0) {
        setTaxAmount(Math.round((subtotal + serviceChargeAmount) * (companySettings.tax_percentage / 100)));
    } else {
        setTaxAmount(0);
    }

    // Discount calculation (manual selection)
    if (selectedDiscountId) {
        const discObj = availableDiscounts.find(d => d.id === selectedDiscountId);
        if (discObj) {
            if (discObj.discount_type === 'percentage' || discObj.type === 'percentage') {
                const val = discObj.percentage || discObj.value;
                setDiscountAmount(Math.round(subtotal * (val / 100)));
            } else {
                setDiscountAmount(discObj.value || discObj.amount || 0);
            }
        }
    } else {
        setDiscountAmount(0);
    }

    // Promo/Voucher calculation
    if (selectedPromoId) {
        const promoObj = availablePromos.find(p => p.id === selectedPromoId);
        if (promoObj) {
            if (promoObj.type === 'percent') {
                setPromoAmount(Math.round(subtotal * (promoObj.discount / 100)));
            } else {
                setPromoAmount(promoObj.discount);
            }
        }
    } else {
        setPromoAmount(0);
    }

    // Service Charge calculation (Automatic based on settings)
    if (companySettings?.is_service_charge_enabled && companySettings?.service_charge_percentage > 0) {
        setServiceChargeAmount(Math.round(subtotal * (companySettings.service_charge_percentage / 100)));
    } else {
        setServiceChargeAmount(0);
    }

    // Auto-apply tax if enabled in global company settings (optional: user might want it to be manual via dropdown still, 
    // but let's make it more obvious if enabled)
    // If companySettings.is_tax_enabled is true and we don't have a tax selected, 
    // we might want to auto-select the default tax? 
    // For now, let's just use it to control visibility.
}, [subtotal, selectedDiscountId, selectedPromoId, availableTaxes, availableDiscounts, availablePromos, companySettings, serviceChargeAmount]);

const total = Math.max(0, subtotal + roomCharge + taxAmount + serviceChargeAmount - discountAmount - promoAmount - dpAlreadyPaid);
const selectedPaymentMethod = paymentMethods.find(method => method.code === paymentMethod);
const isCashPayment = selectedPaymentMethod?.type === 'cash' || paymentMethod === 'cash';

const handleApplyPromo = () => {
    if (!promoCode) return;

    const promo = availablePromos.find(p => p.code.toUpperCase() === promoCode.toUpperCase());
    if (promo) {
        // Check status (active/expired based on backend field or date)
        const now = new Date();
        const start = promo.start_date ? new Date(promo.start_date) : null;
        const end = promo.end_date ? new Date(promo.end_date) : null;

        if (start && now < start) {
            toast.error('Promo belum dimulai');
            return;
        }
        if (end && now > end) {
            toast.error('Promo sudah berakhir');
            return;
        }
        if (promo.quota > 0 && promo.used >= promo.quota) {
            toast.error('Kuota promo sudah habis');
            return;
        }

        setSelectedPromoId(promo.id);
        toast.success(`Promo "${promo.title}" diterapkan`);
    } else {
        toast.error('Kode promo tidak valid atau tidak tersedia di cabang ini');
    }
};

const handleApplyManualDiscount = () => {
    const val = parseInt(manualDiscountInput.replace(/\D/g, '') || '0');
    if (!val || val <= 0) return;
    
    if (manualDiscountType === 'percent') {
        const pct = Math.min(val, 100);
        setDiscountAmount(Math.round(subtotal * (pct / 100)));
    } else {
        setDiscountAmount(Math.min(val, subtotal));
    }
    toast.success('Diskon manual diterapkan');
};

const handleClearManualDiscount = () => {
    setManualDiscountInput('');
    setDiscountAmount(0);
};

const handlePayNow = async () => {
    if (cart.length === 0) {
        toast.error('Keranjang masih kosong, tambahkan item terlebih dahulu');
        return;
    }

    // Validate payment method is selected
    if (!paymentMethod) {
        toast.error('Pilih metode pembayaran terlebih dahulu');
        return;
    }

    setShowPaymentModal(true);
    setCashReceived('');
    setIsDP(false);

    // Calculate DP if there are services
    try {
        const s = localStorage.getItem('naqupos_general_settings');
        const parsedMinDP = s ? JSON.parse(s)?.minDP : undefined;
        const baseMinDP = Number.isFinite(Number(parsedMinDP)) && Number(parsedMinDP) > 0 ? Number(parsedMinDP) : 50000;

        const hasService = cart.some(item => item.type === 'service');
        const productsTotal = cart
            .filter(item => item.type === 'product')
            .reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

        const calculatedDP = hasService ? baseMinDP + productsTotal : productsTotal;
        setDpAmount(String(Number.isFinite(calculatedDP) ? Math.max(0, Math.round(calculatedDP)) : 0));
    } catch (error) {
        console.error('Error calculating DP:', error);
    }
};

const processPayment = async () => {
    if (!currentShift) {
        toast.error('Buka shift terlebih dahulu sebelum melakukan pembayaran');
        return;
    }
    if (cart.length === 0) {
        toast.error('Keranjang masih kosong');
        return;
    }
    if (!paymentMethod) {
        toast.error('Pilih metode pembayaran terlebih dahulu');
        return;
    }

    const parsedTotal = isDP ? Number.parseInt(dpAmount, 10) : total;
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
        toast.error(isDP ? 'Nominal DP tidak valid' : 'Total pembayaran tidak valid');
        return;
    }
    const finalTotal = parsedTotal;

    const paid = isCashPayment ? Number.parseInt(cashReceived || '0', 10) : finalTotal;
    if (!Number.isFinite(paid) || paid < 0) {
        toast.error('Uang diterima tidak valid');
        return;
    }
    if (isCashPayment && paid < finalTotal) {
        toast.error(`Uang diterima kurang. Kurang ${formatCurrency(finalTotal - paid)}`);
        return;
    }
    if (!isCashPayment && !paymentMethod) {
        toast.error('Pilih metode pembayaran terlebih dahulu');
        return;
    }
    if (!isCashPayment && !paymentReference.trim()) {
        // Mirrors the payment button's disabled rule: non-cash always needs a reference
        toast.error('Nomor referensi pembayaran wajib diisi untuk metode non-tunai');
        return;
    }

    setIsProcessing(true);

    try {
        // Save to Backend
        await api.createTransaction({
            branch_id: branchId,
            booking_id: bookingData?.bookingId,
            booking_ids: bookingData?.bookingIds || (bookingData?.bookingId ? [bookingData.bookingId] : []),
            type: bookingData ? 'booking' : 'walk_in',
            payment_type: isDP ? 'dp' : 'full',
            subtotal: subtotal,
            discount: discountAmount + promoAmount,
            discount_amount: discountAmount,
            promo_amount: promoAmount,
            promo_id: selectedPromoId,
            tax: taxAmount,
            service_charge: serviceChargeAmount,
            total: finalTotal, // Transaction total is either DP or Full Total
            original_total: total,
            payment_method: paymentMethod,
            cash_received: isCashPayment ? paid : 0,
            change: isCashPayment ? Math.max(0, paid - finalTotal) : 0,
            room_charge: roomCharge,
            status: 'completed',
            customer_id: selectedCustomer?.id,
            payment_log_id: paymentLogId,
            items: cart.map(item => ({
                item_type: item.type,
                service_id: item.type === 'service'
                    ? (item.service?.is_variant ? item.service.base_service_id : item.service?.id)
                    : null,
                service_variant_id: item.type === 'service' && item.service?.is_variant ? item.service.id : null,
                product_id: item.type === 'product'
                    ? (item.product?.is_variant ? item.product.base_product_id : item.product?.id)
                    : null,
                variant_id: item.type === 'product' && item.product?.is_variant ? item.product.id : null,
                product_variant_id: item.type === 'product' && item.product?.is_variant ? item.product.id : null,
                therapist_id: item.therapist?.id,
                price: item.type === 'service' ? item.service?.price : (item.product?.special_price || item.product?.price),
                quantity: item.quantity,
                room_id: item.room?.id,
                start_time: item.time, // Add selected time
                notes: item.notes
            })),
            payment_reference: paymentReference,
            notes: (selectedCustomer ? `Customer: ${selectedCustomer.name}` : 'Customer: Guest') + (bookingNotes ? ` | ${bookingNotes}` : '') + (paymentReference ? ` | Ref: ${paymentReference}` : '')
        });

        // Local State Logic (Optimistic, for UI updates)
        const transaction: Transaction = {
            id: generateInvoiceId(),
            items: [...cart],
            subtotal,
            roomCharge,
            total: finalTotal,
            promoAmount: promoAmount,
            promoCode: selectedPromoId ? availablePromos.find(p => p.id === selectedPromoId)?.code || 'PROMO' : undefined,
            discountAmount: discountAmount,
            taxAmount: taxAmount,
            taxName: (companySettings?.is_tax_enabled && companySettings?.tax_percentage > 0) ? `Pajak (${companySettings.tax_percentage}%)` : undefined,
            serviceChargeAmount: serviceChargeAmount,
            paymentMethod: paymentMethod as any,
            date: new Date(),
            cashier: 'Admin Staff',
            customer: selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : { name: 'Guest', phone: '-' }
        };

        // Update shift data
        // Update shift data
if (currentShift) {
const isCash = isCashPayment;
setCurrentShift(prev => prev ? {
    ...prev,
    totalSales: prev.totalSales + finalTotal,
    totalTransactions: prev.totalTransactions + 1,
    cashSales: prev.cashSales + (isCash ? finalTotal : 0),
    nonCashSales: prev.nonCashSales + (isCash ? 0 : finalTotal),
    // TAMBAHAN:
    dpSales: (prev.dpSales || 0) + (isDP ? finalTotal : 0),
    fullSales: (prev.fullSales || 0) + (!isDP ? finalTotal : 0),
} : null);
}

        setCurrentTransaction(transaction);
        setShowPaymentModal(false);
        setShowSuccessModal(true);
    } catch (error: any) {
        console.error(error);
        toast.error('Gagal memproses pembayaran: ' + (error.message || 'Error occurred'));
    } finally {
        setIsProcessing(false);
    }
};
const handlePrint = () => {
    if (!currentTransaction) return;
    window.open(`/print/${currentTransaction.id}`, '_blank');
};

const handleNewTransaction = () => {
    setCart([]);
    setCurrentTransaction(null);
    setBookingData(null);
    setIsDP(false);
    setDpAmount('');
    setShowSuccessModal(false);
    setCashReceived('');
    setSelectedCustomer(null);
    setSelectedRoom(null);
    setPaymentMethod(paymentMethods.length > 0 ? paymentMethods[0].code : '');
    setPaymentLogId(null);
    setDpAlreadyPaid(0);
    setManualDiscountInput('');
    setManualDiscountType('nominal');
    setDiscountAmount(0);
    // Reset per-transaction fields so they cannot leak into the next sale
    setPaymentReference('');
    setBookingNotes('');
    setSelectedPromoId(null);
    setPromoCode('');
    setPromoAmount(0);
    setDpAlreadyPaid(0);
};


// Shift Management Functions
const handleOpenShift = async () => {
    const openingCash = Number.parseInt(openingCashInput.replace(/[.\s]/g, '') || '0', 10);
    if (!Number.isFinite(openingCash) || openingCash < 0) {
        toast.error('Saldo awal tidak valid');
        return;
    }
    setIsProcessing(true);
    try {
        const response = await api.openShift({
            branch_id: branchId,
            starting_cash: openingCash
        });

        const shift = response.shift;
        const newShift: ShiftData = {
            id: shift.id.toString(),
            startTime: new Date(shift.clock_in),
            openingCash: parseFloat(shift.starting_cash),
            cashier: shift.cashier?.name || 'Cashier',
            status: 'open',
            totalSales: 0,
            totalTransactions: 0,
            cashSales: 0,
            nonCashSales: 0,
            dpSales: 0,
            fullSales: 0
        };
        setCurrentShift(newShift);
        setPettyCashItems([]);
        setShowOpenShiftModal(false);
        setOpeningCashInput('');
        toast.success('Shift berhasil dibuka');
    } catch (error) {
        console.error(error);
        toast.error('Gagal membuka shift. Pastikan tidak ada shift aktif.');
    } finally {
        setIsProcessing(false);
    }
};

const handleCloseShift = async () => {
    if (!currentShift) {
        toast.error('Tidak ada shift aktif untuk ditutup');
        return;
    }
    const closingCash = Number.parseInt(String(closingCashInput).replace(/[.\s]/g, '') || '0', 10);
    if (!Number.isFinite(closingCash) || closingCash < 0) {
        toast.error('Saldo akhir tidak valid');
        return;
    }

    setIsProcessing(true);
    try {
        await api.closeShift({
            ending_cash: closingCash,
            notes: 'Closed via POS'
        });

        const closedShift: ShiftData = {
            ...currentShift,
            endTime: new Date(),
            closingCash,
            status: 'closed'
        };

        // Print closing report
        printClosingReport(closedShift);

        // Clear current shift
        setCurrentShift(null);
        setPettyCashItems([]);
        localStorage.removeItem('naqupos_current_shift');
        localStorage.removeItem('naqupos_shift_transactions');
        localStorage.removeItem('naqupos_petty_cash');
        toast.success('Shift berhasil ditutup');
    } catch (error) {
        console.error(error);
        toast.error('Gagal menutup shift');
    } finally {
        setShowCloseShiftModal(false);
        setClosingCashInput('');
        setIsProcessing(false);
    }
};

// ── PASTE KE POSPage.tsx — REPLACE fetchShiftHistory & fetchShiftDetail ──

const fetchShiftHistory = async () => {
    setIsLoadingShifts(true);
    try {
        const data = await api.getShifts({
            branch_id: selectedBranchId,
            start_date: shiftHistoryStartDate,
            end_date: shiftHistoryEndDate,
            // include active shifts (no clock_out yet)
            include_active: true,
        });

        const shifts = data.data || data || [];

        const enriched = await Promise.all(shifts.map(async (shift: any) => {
            try {
                // Fetch transaksi & expense berdasarkan shift_id saja
                // JANGAN tambah filter date di client — biarkan backend yang filter
                const [trxRes, expRes] = await Promise.all([
                    api.getTransactions({
                        shift_id: shift.id,
                        limit: 1000,
                    }).catch(() => ({ data: [] })),
                    api.getExpenses({
                        shift_id: shift.id,
                        limit: 1000,
                    }).catch(() => ({ data: [] })),
                ]);

                const trxList: any[] = trxRes.data || (Array.isArray(trxRes) ? trxRes : []);
                const expList: any[] = expRes.data || (Array.isArray(expRes) ? expRes : []);

                // Safety filter: pastikan expense benar-benar milik shift ini
                const filteredExpList = expList.filter((e: any) =>
                    !e.cashier_shift_id || String(e.cashier_shift_id) === String(shift.id)
                );

                // Exclude refunded transactions from sales calculations
                const validTrxList = trxList.filter((t: any) => {
                    const status = (t.status || t.booking?.status || '').toLowerCase();
                    const paymentStatus = (t.payment_status || t.booking?.payment_status || '').toLowerCase();
                    return status !== 'refunded' && paymentStatus !== 'refunded';
                });

                // Calculate total refund from refunded transactions
                const refundedTrxList = trxList.filter((t: any) => {
                    const status = (t.status || t.booking?.status || '').toLowerCase();
                    const paymentStatus = (t.payment_status || t.booking?.payment_status || '').toLowerCase();
                    return status === 'refunded' || paymentStatus === 'refunded';
                });
                const total_refund = refundedTrxList.reduce((s: number, t: any) => s + parseFloat(t.total || t.refund_amount || 0), 0);

                const total_sales = validTrxList.reduce((s: number, t: any) => s + parseFloat(t.total || 0), 0);
                const cash_sales = validTrxList
                    .filter((t: any) => (t.payment_method || '').toLowerCase() === 'cash')
                    .reduce((s: number, t: any) => s + parseFloat(t.total || 0), 0);
                const total_expenses = filteredExpList.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);

                const starting_cash = parseFloat(shift.starting_cash || 0);
                const expected_cash = starting_cash + cash_sales - total_expenses;
                const ending_cash = shift.ending_cash != null ? parseFloat(shift.ending_cash) : null;
                const variance = ending_cash != null ? ending_cash - expected_cash : null;

                return {
                    ...shift,
                    _trxList: trxList,
                    _expList: filteredExpList,
                    transaction_count: trxList.length,
                    total_sales,
                    cash_sales,
                    total_expenses,
                    total_refund,
                    expected_cash,
                    variance,
                };
            } catch {
                return {
                    ...shift,
                    _trxList: [],
                    _expList: [],
                    transaction_count: 0,
                    total_sales: 0,
                    cash_sales: 0,
                    total_expenses: 0,
                    total_refund: 0,
                    expected_cash: parseFloat(shift.starting_cash || 0),
                    variance: null,
                };
            }
        }));

        // Urutkan: shift paling baru di atas
        enriched.sort((a: any, b: any) =>
            new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
        );

        setShiftHistory(enriched);
    } catch (error) {
        console.error('Failed to fetch shift history', error);
        toast.error('Gagal memuat riwayat shift');
    } finally {
        setIsLoadingShifts(false);
    }
};

const fetchShiftDetail = async (shift: any) => {
    setSelectedShiftForDetail(shift);
    setIsLoadingShiftDetail(true);
    setShiftDetailExpenses([]);
    setShiftDetailTransactions([]);
    try {
        // Pakai cache kalau ada, fallback ke fetch
        let trxList: any[] = shift._trxList ?? [];
        let expList: any[] = shift._expList ?? [];

        if (trxList.length === 0 && !shift._trxList) {
            const trxRes = await api.getTransactions({ shift_id: shift.id, limit: 1000 }).catch(() => ({ data: [] }));
            trxList = trxRes.data || (Array.isArray(trxRes) ? trxRes : []);
        }

        if (expList.length === 0 && !shift._expList) {
            const expRes = await api.getExpenses({ shift_id: shift.id, limit: 1000 }).catch(() => ({ data: [] }));
            const raw = expRes.data || (Array.isArray(expRes) ? expRes : []);
            expList = raw.filter((e: any) =>
                !e.cashier_shift_id || String(e.cashier_shift_id) === String(shift.id)
            );
        }

        const expenses = expList.map((e: any) => ({
            id: e.id,
            description: e.description,
            amount: parseFloat(e.amount),
            categoryId: e.category_id,
            categoryName: e.category?.name || 'Unknown',
            timestamp: new Date(e.created_at),
            receipt_url: e.receipt_url,
            creator_name: e.creator?.name,
        }));

        setShiftDetailExpenses(expenses);
        setShiftDetailTransactions(trxList);
    } catch (err) {
        console.error(err);
        toast.error('Gagal memuat detail shift');
    } finally {
        setIsLoadingShiftDetail(false);
    }
}

// const fetchShiftDetail = async (shift: any) => {
// setSelectedShiftForDetail(shift);
// setIsLoadingShiftDetail(true);
// setShiftDetailExpenses([]);
// setShiftDetailTransactions([]);
// try {
//     // Kalau udah ada cache dari fetchShiftHistory, pakai langsung
//     const trxList = shift._trxList ?? (await api.getTransactions({ shift_id: shift.id, limit: 500 }).catch(() => ({ data: [] }))).data ?? [];
//     const expList = shift._expList ?? (await api.getExpenses({ shift_id: shift.id, limit: 500 }).catch(() => ({ data: [] }))).data ?? [];

//     const expenses = expList.map((e: any) => ({
//         id: e.id,
//         description: e.description,
//         amount: parseFloat(e.amount),
//         categoryId: e.category_id,
//         categoryName: e.category?.name || 'Unknown',
//         timestamp: new Date(e.created_at),
//         receipt_url: e.receipt_url,
//         creator_name: e.creator?.name
//     }));

//     setShiftDetailExpenses(expenses);
//     setShiftDetailTransactions(trxList);
// } catch (err) {
//     console.error(err);
//     toast.error('Gagal memuat detail shift');
// } finally {
//     setIsLoadingShiftDetail(false);
// }
// };

const handleEditExpenseFromHistory = (expense: any) => {
setEditingExpenseFromHistory(expense);
setEditExpenseForm({
    description: expense.description,
    amount: expense.amount.toString(),
    categoryId: expense.categoryId,
    receipt_file: null
});
setEditExpenseReceiptPreview(expense.receipt_url || null);
setShowEditExpenseModal(true);
};

const handleSaveExpenseFromHistory = async () => {
if (!editingExpenseFromHistory) { toast.error('Pengeluaran tidak dipilih'); return; }
if (!editExpenseForm.description?.trim()) { toast.error('Deskripsi wajib diisi'); return; }
const editedAmount = Number(editExpenseForm.amount);
if (!Number.isFinite(editedAmount) || editedAmount <= 0) { toast.error('Nominal pengeluaran harus lebih besar dari 0'); return; }
setIsSavingExpense(true);
try {
    const formData = new FormData();
    formData.append('category_id', editExpenseForm.categoryId.toString());
    formData.append('amount', String(editedAmount));
    formData.append('description', editExpenseForm.description.trim());
    if (editExpenseForm.receipt_file) {
        formData.append('receipt_image', editExpenseForm.receipt_file);
    }
    await api.updateExpense(editingExpenseFromHistory.id, formData);
    toast.success('Pengeluaran berhasil diperbarui');
    // Refresh detail
    setShiftDetailExpenses(prev => prev.map(e =>
        e.id === editingExpenseFromHistory.id
            ? { ...e, description: editExpenseForm.description.trim(), amount: editedAmount, categoryId: editExpenseForm.categoryId }
            : e
    ));
    setShowEditExpenseModal(false);
    setEditingExpenseFromHistory(null);
} catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : 'Gagal memperbarui pengeluaran');
} finally {
    setIsSavingExpense(false);
}
};

const handleUpdateShift = async () => {
    if (!selectedShiftForCorrection) { toast.error('Shift tidak dipilih'); return; }
    if (!String(correctionCashInput).trim()) { toast.error('Saldo akhir wajib diisi'); return; }
    const correctedCash = Number.parseInt(String(correctionCashInput).replace(/[.\s]/g, ''), 10);
    if (!Number.isFinite(correctedCash) || correctedCash < 0) {
        toast.error('Saldo akhir tidak valid');
        return;
    }
    const confirmCorrection = await swal.confirm(
        `Koreksi saldo akhir shift menjadi ${formatNumber(correctedCash)}? Tindakan ini mengubah data historis.`,
        'Koreksi Shift'
    );
    if (!confirmCorrection.isConfirmed) return;
    setIsProcessing(true);
    try {
        await api.updateShift(selectedShiftForCorrection.id, {
            ending_cash: correctedCash,
            notes: 'Corrected via POS'
        });
        toast.success('Shift berhasil dikoreksi');
        setShowShiftCorrectionModal(false);
        setSelectedShiftForCorrection(null);
        setCorrectionCashInput('');
        fetchShiftHistory(); // Refresh history
    } catch (error) {
        console.error("Failed to update shift", error);
        toast.error("Gagal mengoreksi shift");
    } finally {
        setIsProcessing(false);
    }
};

const printClosingReport = (shift: ShiftData) => {
    const totalPettyCash = pettyCashItems.reduce((sum, item) => sum + item.amount, 0);
    const expectedCash = shift.openingCash + shift.cashSales - totalPettyCash;
    const difference = (shift.closingCash || 0) - expectedCash;

    const reportContent = `
========================================
    LAPORAN TUTUP SHIFT
        NAQUPOSN BEAUTY & SPA
========================================

Shift ID    : ${shift.id}
Kasir       : ${shift.cashier}
Mulai       : ${shift.startTime.toLocaleString('id-ID')}
Selesai     : ${shift.endTime?.toLocaleString('id-ID')}

========================================
            RINGKASAN
========================================
Total Transaksi    : ${shift.totalTransactions}
Total Penjualan    : Rp ${shift.totalSales.toLocaleString('id-ID')}
Total Refund       : Rp ${(shift.totalRefund || 0).toLocaleString('id-ID')}

Pembayaran Cash    : Rp ${shift.cashSales.toLocaleString('id-ID')}
Pembayaran Non-Cash: Rp ${shift.nonCashSales.toLocaleString('id-ID')}

========================================
        REKAP LACI KAS
========================================
Modal Awal         : Rp ${shift.openingCash.toLocaleString('id-ID')}
(+) Penjualan Cash : Rp ${shift.cashSales.toLocaleString('id-ID')}
(-) Petty Cash     : Rp ${totalPettyCash.toLocaleString('id-ID')}
----------------------------------------
Seharusnya         : Rp ${expectedCash.toLocaleString('id-ID')}
Uang Fisik         : Rp ${(shift.closingCash || 0).toLocaleString('id-ID')}
----------------------------------------
Selisih            : Rp ${difference.toLocaleString('id-ID')} ${difference >= 0 ? '✓' : '⚠️'}

========================================
${pettyCashItems.length > 0 ? `
DETAIL PETTY CASH:
${pettyCashItems.map(item =>
        `  - ${item.description}: Rp ${item.amount.toLocaleString('id-ID')}`
    ).join('\n')}
` : ''}
========================================
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <html>
            <head>
                <title>Laporan Shift - ${shift.id}</title>
                <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; }
                    pre { white-wrap; }
                </style>
            </head>
            <body>
                <pre>${reportContent}</pre>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};

// Petty Cash Functions
const handleAddPettyCash = async () => {
    if (!currentShift) { toast.error('Buka shift terlebih dahulu'); return; }
    if (!pettyCashForm.description?.trim()) { toast.error('Deskripsi wajib diisi'); return; }
    if (!String(pettyCashForm.amount).trim()) { toast.error('Nominal wajib diisi'); return; }

    if (!pettyCashForm.receipt_file && !pettyCashReceiptPreview) {
    toast.error('Nota/bukti pengeluaran wajib diupload');
    return;
}


    setIsProcessing(true);


    try {
        const amount = Number.parseInt(String(pettyCashForm.amount).replace(/[.\s]/g, ''), 10);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Nominal pengeluaran harus lebih besar dari 0');
            setIsProcessing(false);
            return;
        }
        const categoryId = pettyCashForm.categoryId || expenseCategories[0]?.id;
        if (!categoryId) {
            toast.error('Pilih kategori pengeluaran');
            setIsProcessing(false);
            return;
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('branch_id', branchId.toString());
        formData.append('category_id', categoryId.toString());
        formData.append('amount', amount.toString());
        formData.append('description', pettyCashForm.description.trim());
        formData.append('cashier_shift_id', currentShift.id);

        if (pettyCashForm.receipt_file) {
            formData.append('receipt_image', pettyCashForm.receipt_file);
        }

        let response;
        if (editingPettyCashId) {
            response = await api.updateExpense(editingPettyCashId, formData);
            toast.success('Pengeluaran berhasil diperbarui');
        } else {
            response = await api.createExpense(formData);
            toast.success('Pengeluaran berhasil disimpan');
        }

        const category = expenseCategories.find(c => c.id === (pettyCashForm.categoryId || expenseCategories[0]?.id));

        const newItem: PettyCashItem = {
            id: response.id || response.data?.id || editingPettyCashId || `PC-${Date.now()}`,
            description: pettyCashForm.description,
            amount: amount,
            categoryId: pettyCashForm.categoryId || expenseCategories[0]?.id,
            categoryName: category ? category.name : 'Unknown',
            timestamp: editingPettyCashId ? (pettyCashItems.find(i => i.id === editingPettyCashId)?.timestamp || new Date()) : new Date(),
            shiftId: currentShift.id,
            receipt_url: response.receipt_url || response.data?.receipt_url,
            creator_name: response.creator?.name || response.data?.creator?.name
        };

        if (editingPettyCashId) {
            setPettyCashItems(prev => prev.map(item => item.id === editingPettyCashId ? newItem : item));
        } else {
            setPettyCashItems(prev => [...prev, newItem]);
        }

        setPettyCashForm({
            description: '',
            amount: '',
            categoryId: 0,
            receipt_file: null
        });
        setPettyCashReceiptPreview(null);
        setEditingPettyCashId(null);
        setShowPettyCashModal(false);
    } catch (error) {
        console.error(error);
        toast.error(editingPettyCashId ? 'Gagal memperbarui pengeluaran' : 'Gagal menyimpan pengeluaran');
    } finally {
        setIsProcessing(false);
    }
};

const handleEditPettyCash = (item: PettyCashItem) => {
    setEditingPettyCashId(item.id);
    setPettyCashForm({
        description: item.description,
        amount: item.amount.toString(),
        categoryId: item.categoryId,
        receipt_file: null
    });
    // Show existing receipt as preview
    setPettyCashReceiptPreview(item.receipt_url || null);
    setShowPettyCashModal(true);
};

const handleDeletePettyCash = async () => {
    if (!showDeletePettyCashModal) return;
    setIsProcessing(true);
    try {
        await api.deleteExpense(showDeletePettyCashModal);
        setPettyCashItems(prev => prev.filter(item => item.id !== showDeletePettyCashModal));
        toast.success('Pengeluaran berhasil dihapus');
        setShowDeletePettyCashModal(null);
    } catch (error) {
        console.error(error);
        toast.error('Gagal menghapus pengeluaran');
    } finally {
        setIsProcessing(false);
    }
};


const handleDownloadReceipt = async (id: number | string, filename: string) => {
    try {
        await api.downloadFile(`/cashier/expenses/${id}/download`, filename);
    } catch (error) {
        console.error('Download failed:', error);
        toast.error('Gagal mendownload nota');
    }
};


// DOKU Payment Handler


// Handle Create New Customer
const handleCreateNewCustomer = async () => {
    if (!newCustomerForm.name || !newCustomerForm.phone) {
        toast.error('Nama dan No. Telepon wajib diisi');
        return;
    }

    // Validate name (letters only)
    const nameRegex = /^[A-Za-z\s']+$/;
    if (!nameRegex.test(newCustomerForm.name)) {
        toast.error('Nama hanya boleh berisi huruf');
        return;
    }

    // Validate phone (Indonesian formats)
    const phoneClean = newCustomerForm.phone.replace(/[-\s+]/g, '');
    const indonesianPhoneRegex = /^(\+628|628|08|021)\d{7,13}$/;
    if (newCustomerForm.phone && !indonesianPhoneRegex.test(phoneClean)) {
        toast.error('Format nomor telepon tidak valid. Gunakan format 08, +628, atau 021');
        return;
    }

    // Validate email if provided
    if (newCustomerForm.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newCustomerForm.email)) {
            toast.error('Format email tidak valid');
            return;
        }
    }

    setIsCreatingCustomer(true);
    try {
        const payload = {
            name: newCustomerForm.name,
            phone: newCustomerForm.phone,
            email: newCustomerForm.email || null,
            dob: newCustomerForm.dob || null,
            branch_id: branchId || null,
            registration_source: 'walk-in'
        };

        const response = await api.createCustomer(payload);

        // Refresh customers list
        const customersData = await api.getCustomers({ branch_id: branchId || undefined });
        const rawCustomers = Array.isArray(customersData) ? customersData : customersData.data || [];
        setCustomers(rawCustomers.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            member: !!c.is_member || c.status === 'vip' || c.status === 'loyal'
        })));

        // Auto-select the new customer
        const newCustomer = response?.customer || response;
        if (newCustomer && newCustomer.id) {
            setSelectedCustomer({
                id: newCustomer.id,
                name: newCustomer.name || newCustomerForm.name,
                phone: newCustomer.phone || newCustomerForm.phone,
                member: false
            });
        }

        setShowNewCustomerModal(false);
        setNewCustomerForm({ name: '', phone: '', email: '', dob: '' });
        toast.success('Pelanggan baru berhasil ditambahkan');
    } catch (error: any) {
        console.error('Failed to create customer:', error);
        toast.error(error?.message || 'Gagal menambahkan pelanggan');
    } finally {
        setIsCreatingCustomer(false);
    }
};

const totalPettyCash = pettyCashItems.reduce((sum, item) => sum + item.amount, 0);
const currentCashInDrawer = currentShift
    ? currentShift.openingCash + currentShift.cashSales - totalPettyCash - (currentShift.bankDeposits || 0)
    : 0;

const handlePosScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    console.log('Scroll:', { scrollTop, scrollHeight, clientHeight, diff: scrollHeight - scrollTop, threshold: clientHeight + 50 });

    if (scrollHeight - scrollTop <= clientHeight + 50) {
        console.log('Scroll Threshold Met', { posTab, isLoadingMoreServices, hasMoreServices });
        if (posViewMode === 'services') {
            if (posTab === 'services' && !isLoadingMoreServices && hasMoreServices) {
                console.log('Triggering Load More Services');
                loadMoreServices();
            } else if (posTab === 'products' && !isLoadingMoreProducts && hasMoreProducts) {
                console.log('Triggering Load More Products');
                loadMoreProducts();
            }
        }
    }
};

return (
    <div className="h-[calc(100vh-120px)] flex flex-col relative">
        {isLoadingData && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
                    <Loader2 className="w-8 h-8 text-naqupos-primary animate-spin" />
                    <span className="text-naqupos-dark font-medium">Memuat Data...</span>
                </div>
            </div>
        )}
        {/* Tab Navigation & Shift Controls */}
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl  font-bold text-naqupos-dark">Kasir (POS)</h1>

                {/* Tab Buttons */}
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                        onClick={() => setActiveTab('pos')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'pos'
                            ? 'bg-white text-naqupos-primary shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        <ShoppingCart size={14} className="inline mr-1.5" />
                        Transaksi
                    </button>
                    <button
                        onClick={() => setActiveTab('petty-cash')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'petty-cash'
                            ? 'bg-white text-naqupos-primary shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        <Wallet size={14} className="inline mr-1.5" />
                        Petty Cash
                    </button>
                    <button
onClick={() => { setActiveTab('shift-history-tab' as any); fetchShiftHistory(); }}
className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === ('shift-history-tab' as any)
    ? 'bg-white text-naqupos-primary shadow-sm'
    : 'text-gray-600 hover:text-gray-800'
    }`}
>
<History size={14} className="inline mr-1.5" />
Riwayat Shift
</button>
                    <button
                        onClick={() => setActiveTab('bank-deposits')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'bank-deposits'
                            ? 'bg-white text-naqupos-primary shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        <Banknote size={14} className="inline mr-1.5" />
                        Setoran Bank
                    </button>
                </div>
            </div>
            {/* Shift Controls & Branch Selector */}
            {(() => {
                // Anyone without a specific branch selected cannot open a shift
                // (regular cashiers always have a branch set, so this only blocks admins on "Semua Cabang")
                const noBranchSelected = !selectedBranchId || globalBranchId === '' || globalBranchId === 'all';
                return (
                    <div className="flex items-center gap-3">
                        {/* Branch Selector - shown when no specific branch is selected or shift is active */}
                        {isSuperAdminOrAdmin && (noBranchSelected || !!currentShift) && (
                            <div className="relative z-20 min-w-[200px]">
                                <SearchableSelect
                                    placeholder="— Pilih Cabang —"
                                    value={selectedBranchId || 0}
                                    disabled={!!currentShift}
                                    onChange={(val) => {
                                        const numVal = Number(val);
                                        setSelectedBranchId(numVal);
                                        const branchIdStr = numVal === 0 ? 'all' : numVal.toString();
                                        localStorage.setItem('naqupos_selected_branch', branchIdStr);
                                        window.dispatchEvent(new CustomEvent('naqupos-branch-change', { detail: { branchId: branchIdStr } }));

                                    }}
                                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                                    className="text-sm"
                                />
                            </div>
                        )}

                        {currentShift ? (
                            <>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <div className="text-xs">
                                        <span className="text-green-700 font-medium">Shift Aktif</span>
                                        <span className="text-green-600 ml-1.5">{currentShift.startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <DollarSign size={12} className="inline mr-1" />
                                    Laci: <span className="font-bold text-naqupos-primary">Rp {currentCashInDrawer.toLocaleString('id-ID')}</span>
                                </div>
                                <button
                                    onClick={() => setShowCloseShiftModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium"
                                >
                                    <Square size={14} />
                                    Tutup Shift
                                </button>
                            </>
                        ) : (
                            <div className="relative group">
                                <button
                                    onClick={() => !noBranchSelected && setShowOpenShiftModal(true)}
                                    disabled={noBranchSelected}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-white rounded-lg transition-colors text-xs font-medium ${noBranchSelected
                                        ? 'bg-gray-300 cursor-not-allowed opacity-60'
                                        : 'bg-naqupos-primary hover:bg-naqupos-accent'
                                        }`}
                                >
                                    <Play size={14} />
                                    Buka Shift
                                </button>
                                {/* Tooltip when no branch selected */}
                                {noBranchSelected && (
                                    <div className="absolute right-0 top-full mt-2 z-50 w-56 px-3 py-2.5 bg-gray-800 text-white text-[11px] rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="flex items-start gap-2">
                                            <span className="text-amber-400 mt-0.5">⚠</span>
                                            <span>Pilih <strong>cabang</strong> terlebih dahulu sebelum membuka shift.</span>
                                        </div>
                                        <div className="absolute -top-1.5 right-4 w-3 h-3 bg-gray-800 rotate-45" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>

        {/* Main Content based on Tab */}
        {
            activeTab === 'pos' ? (
                <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                    {/* Left: Service Selection */}
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Search & Categories */}
                        <div className="flex gap-4 mb-4">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={posTab === 'services' ? "Cari layanan..." : "Cari produk / SKU..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-12 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none text-xs shadow-sm"
                                />
                                <button
                                    onClick={async () => {
                                        const promise = loadBranchData();
                                        toast.promise(promise, {
                                            loading: 'Memasok data...',
                                            success: 'Data diperbarui',
                                            error: 'Gagal memperbarui data'
                                        });
                                        await promise;
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-naqupos-primary transition-colors hover:bg-gray-100 rounded-md"
                                    title="Segarkan Data"
                                >
                                    <History size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Category Dropdown */}
                        <div className="flex items-center gap-3 mb-4 w-full max-w-sm">
                            <div className="flex-1">
                                <SearchableSelect
                                    placeholder="Filter Kategori"
                                    value={selectedCategory}
                                    onChange={(val) => setSelectedCategory(val.toString())}
                                    options={categories.map(cat => ({
                                        label: cat === 'All' ? 'Semua Kategori' : cat,
                                        value: cat,
                                        display: (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-md bg-naqupos-primary/10 text-naqupos-primary flex items-center justify-center text-[10px] font-bold">
                                                    {cat.charAt(0)}
                                                </div>
                                                <span>{cat === 'All' ? 'Semua Kategori' : cat}</span>
                                            </div>
                                        )
                                    }))}
                                    className="w-full shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Tab Switcher (Layanan / Produk / Jadwal) */}
                        <div className="flex gap-1.5 mb-2 bg-white p-1 rounded-lg border border-gray-200 w-fit">
                            <button
                                onClick={() => { setPosViewMode('services'); setPosTab('services'); }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${posViewMode === 'services' && posTab === 'services'
                                    ? 'bg-naqupos-primary text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Sparkles size={14} /> Layanan
                            </button>
                            <button
                                onClick={() => { setPosViewMode('services'); setPosTab('products'); }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${posViewMode === 'services' && posTab === 'products'
                                    ? 'bg-naqupos-primary text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Package size={14} /> Produk
                            </button>
                            <button
                                onClick={() => setPosViewMode('schedule')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${posViewMode === 'schedule'
                                    ? 'bg-naqupos-primary text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <CalendarIcon size={14} /> Jadwal Staff
                            </button>
                        </div>

                        {/* No Shift Warning */}
                        {posViewMode === 'services' ? (
                            <>
                                {/* No Shift Warning */}
                                {!currentShift && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                                        <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                                        <div>
                                            <p className="font-medium text-amber-800">Shift Belum Dibuka</p>
                                            {['admin', 'owner', 'super admin', 'super_admin'].includes(userRole.toLowerCase()) &&
                                                (!selectedBranchId || globalBranchId === '' || globalBranchId === 'all') ? (
                                                <p className="text-sm text-amber-600">
                                                    Pilih <strong>cabang</strong> terlebih dahulu di dropdown atas kanan, lalu klik tombol <strong>Buka Shift</strong>.
                                                </p>
                                            ) : (
                                                <p className="text-sm text-amber-600">Silakan buka shift terlebih dahulu untuk memulai transaksi.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Services/Products Grid Container with Fixed Height like Staff */}
                                <div
                                    className="flex-1 min-h-0 overflow-y-auto p-2 pr-4 custom-scrollbar scroll-smooth"
                                    onScroll={handlePosScroll}
                                >
                                    {posTab === 'services' ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {filteredServices.map(service => (
                                                <button
                                                    key={service.id}
                                                    onClick={() => addToCart(service)}
                                                    disabled={!currentShift}
                                                    className={`group relative flex flex-col justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-naqupos-primary/30 transition-all duration-300 text-left ${!currentShift ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <div className="flex justify-between items-start w-full mb-3">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="bg-naqupos-primary/5 text-naqupos-primary rounded-lg w-8 h-8 flex items-center justify-center mb-2 group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                                                                <Sparkles size={16} />
                                                            </div>
                                                            <h4 className="font-bold text-naqupos-dark text-sm leading-tight group-hover:text-naqupos-primary transition-colors line-clamp-2">
                                                                {service.name}
                                                            </h4>
                                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-1">{service.category}</p>
                                                        </div>
                                                        <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-naqupos-primary group-hover:text-white transition-all">
                                                            <Plus size={14} />
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto w-full pt-3 border-t border-gray-50">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] text-gray-400">{service.duration || 60} min</span>
                                                            <p className="text-naqupos-primary font-black text-sm flex flex-col items-end">
                                                                {service.special_price && service.special_price > 0 ? (
                                                                    <>
                                                                        <span className="text-[10px] text-gray-400 line-through font-normal">Rp {service.price.toLocaleString('id-ID')}</span>
                                                                        <span>Rp {service.special_price.toLocaleString('id-ID')}</span>
                                                                    </>
                                                                ) : (
                                                                    <span>Rp {service.price.toLocaleString('id-ID')}</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                            {isLoadingMoreServices && (
                                                <div className="col-span-full py-6 text-center">
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 text-naqupos-primary text-xs font-medium">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Memuat layanan...
                                                    </div>
                                                </div>
                                            )}
                                            {!isLoadingMoreServices && filteredServices.length === 0 && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                                                    <Search size={32} className="mb-3 opacity-20" />
                                                    <p className="font-medium text-sm">Tidak ada layanan ditemukan</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {filteredProducts.map(product => (
                                                <button
                                                    key={product.id}
                                                    onClick={() => addProductToCart(product)}
                                                    disabled={!currentShift}
                                                    className={`group relative flex flex-col justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-naqupos-primary/30 transition-all duration-300 text-left h-full min-h-[160px] ${!currentShift ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <div className="flex justify-between items-start w-full mb-2">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="bg-orange-50 text-orange-500 rounded-lg w-8 h-8 flex items-center justify-center mb-2 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                                                <Package size={16} />
                                                            </div>
                                                            <h4 className="font-bold text-naqupos-dark text-sm leading-tight group-hover:text-naqupos-primary transition-colors line-clamp-2">
                                                                {product.name}
                                                            </h4>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">{product.sku || 'NO SKU'}</p>
                                                        </div>
                                                        <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-naqupos-primary group-hover:text-white transition-all">
                                                            <Plus size={14} />
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto w-full pt-3 border-t border-gray-50">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center justify-between text-[10px]">
                                                                <span className="text-gray-400">Stok</span>
                                                                <span className={`font-bold ${product.stock && product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {product.stock || 0}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-end justify-between">
                                                                <span className="text-[10px] text-gray-400">{product.category}</span>
                                                                {product.special_price ? (
                                                                    <div className="text-right">
                                                                        <p className="text-[9px] text-gray-400 line-through">Rp {product.price.toLocaleString('id-ID')}</p>
                                                                        <p className="text-green-600 font-black text-sm">Rp {product.special_price.toLocaleString('id-ID')}</p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-naqupos-primary font-black text-sm">
                                                                        Rp {product.price.toLocaleString('id-ID')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                            {isLoadingMoreProducts && (
                                                <div className="col-span-full py-6 text-center">
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 text-naqupos-primary text-xs font-medium">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Memuat produk...
                                                    </div>
                                                </div>
                                            )}
                                            {!isLoadingMoreProducts && filteredProducts.length === 0 && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                                                    <Package size={32} className="mb-3 opacity-20" />
                                                    <p className="font-medium text-sm">Tidak ada produk ditemukan</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Staff Schedule View */
                            <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden shadow-sm">
                                {!selectedBranchId ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4">
                                            <MapPin size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-500 mb-2">Pilih Cabang Terlebih Dahulu</h3>
                                        <p className="text-sm text-gray-400 max-w-xs">Silakan pilih cabang di bagian atas untuk melihat jadwal staff yang bertugas.</p>
                                    </div>
                                ) : !currentShift ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                                        <div className="w-16 h-16 bg-amber-50 text-amber-300 rounded-full flex items-center justify-center mb-4">
                                            <AlertTriangle size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-amber-600 mb-2">Shift Belum Dibuka</h3>
                                        <p className="text-sm text-amber-500 max-w-xs">Buka shift cabang Anda untuk mulai mengatur jadwal dan melayani pelanggan.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                                            <div>
                                                <h3 className="text-sm font-black text-naqupos-dark uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-naqupos-primary/10 text-naqupos-primary flex items-center justify-center">
                                                        <Clock size={16} />
                                                    </div>
                                                    Jadwal & Ketersediaan Staff
                                                </h3>
                                                <p className="text-[10px] text-gray-400 font-bold mt-1 ml-10">Menampilkan {staffSchedules.length} staff tersedia</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm focus-within:border-naqupos-primary transition-all">
                                                <CalendarIcon size={14} className="text-naqupos-primary" />
                                                <input
                                                    type="date"
                                                    value={posDate}
                                                    min={minDateAllowed}
                                                    onChange={(e) => setPosDate(e.target.value)}
                                                    className="bg-transparent border-none text-[11px] text-naqupos-primary font-black focus:ring-0 cursor-pointer p-0"
                                                />
                                            </div>
                                        </div>

                                        {/* Scrollable Staff Area - Fixed Height for ~5 cards */}
                                        <div className="h-[500px] overflow-y-auto p-5 space-y-4 custom-scrollbar scroll-smooth">
                                            {(() => {
                                                const settings = getGeneralSettings();
                                                const currentBranch = branches.find(b => b.id === selectedBranchId);
                                                const businessStart = currentBranch?.opening_time ? currentBranch.opening_time.substring(0, 5) : (settings?.openTime || "08:00");
                                                const businessEnd = currentBranch?.closing_time ? currentBranch.closing_time.substring(0, 5) : (settings?.closeTime || "22:00");

                                                return staffSchedules
                                                    .map(staff => (
                                                        <div key={staff.staffId} className="group border border-gray-100 rounded-2xl p-4 transition-all duration-300 hover:border-naqupos-primary/40 hover:shadow-md bg-white">
                                                            <div className="flex items-start gap-4">
                                                                <div className="relative">
                                                                    <div className="w-14 h-14 bg-naqupos-cream text-naqupos-primary rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-naqupos-primary/10 transition-transform group-hover:scale-105">
                                                                        {staff.name.charAt(0)}
                                                                    </div>
                                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex flex-col">
                                                                            <p className="font-black text-naqupos-dark text-base tracking-tight uppercase leading-none">{staff.name}</p>
                                                                            <span className="text-[9px] font-black text-naqupos-primary/40 uppercase tracking-[0.2em] mt-1.5">
                                                                                ID: {staff.staffId.toString().padStart(4, '0')}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <span className="text-[9px] font-black px-2.5 py-1 bg-naqupos-cream text-naqupos-primary rounded-lg border border-naqupos-primary/10 uppercase tracking-widest shadow-sm">
                                                                                {staff.specialization || 'Therapist'}
                                                                            </span>
                                                                            <div className="flex items-center gap-1">
                                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                                    <Sparkles key={star} size={8} className={star <= (staff.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                                                        {getStaffSlots(staff.shifts, staff.workHours, staff.staffId, businessStart, businessEnd, cart, posDate).map((s, i) => (
                                                                            <div key={i} className={`group/slot relative flex items-center justify-center text-[10px] px-3 py-2 rounded-xl font-black border tracking-tight transition-all cursor-default ${s.type === 'booked' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' :
                                                                                s.type === 'break' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' :
                                                                                    s.type === 'available' ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' :
                                                                                        s.type === 'available_other' ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' :
                                                                                            'bg-gray-50 text-gray-400 border-gray-100'
                                                                                }`}>
                                                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${s.type === 'booked' ? 'bg-red-500' : s.type === 'break' ? 'bg-amber-500' : s.type === 'available' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                                                {s.start} - {s.end}
                                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-naqupos-dark text-white text-[8px] rounded opacity-0 group-hover/slot:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase font-black tracking-widest z-10">
                                                                                    {s.type === 'booked' ? `Terisi: ${s.label}` : s.type === 'break' ? 'Istirahat' : s.type === 'available' ? 'Tersedia' : s.label || 'Off'}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ));
                                            })()}

                                            {staffSchedules.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
                                                    <AlertTriangle size={48} className="mb-4 opacity-20" />
                                                    <p className="font-bold uppercase tracking-widest text-[11px]">Tidak ada staff terjadwal</p>
                                                </div>
                                            )}
                                            {!isStaffLastPage && staffSchedules.length > 0 && (
                                                <div ref={loadMoreRef} className="py-8 text-center">
                                                    <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-naqupos-primary rounded-2xl text-[10px] font-black uppercase tracking-widest border border-naqupos-primary/10 shadow-sm animate-bounce">
                                                        <Loader2 size={14} className="animate-spin" />
                                                        Memuat Staff Berikutnya...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Cart / Invoice */}
                    {/* Right: Cart / Invoice */}
<div className="w-96 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full min-h-0">
{/* Header */}
<div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
<ShoppingCart size={18} className="text-naqupos-primary" />
<h2 className="font-bold text-naqupos-dark">Keranjang</h2>
<span className="ml-auto bg-naqupos-primary text-white text-xs px-2 py-0.5 rounded-full">
    {cart.length}
</span>
</div>

{/* Scrollable Body */}
<div className="flex-1 overflow-y-auto min-h-0">

{/* Customer Section */}
<div className="border-b border-gray-50">
    <button
    onClick={() => setIsCustomerExpanded(!isCustomerExpanded)}
    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
    >
    <div className="flex items-center gap-2">
        <ChevronDown size={13} className={`text-naqupos-primary transition-transform duration-200 ${isCustomerExpanded ? 'rotate-180' : ''}`} />
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pelanggan</span>
    </div>
    {!isCustomerExpanded && selectedCustomer && (
        <span className="text-[11px] font-bold text-naqupos-primary truncate ml-2">{selectedCustomer.name}</span>
    )}
    {!isCustomerExpanded && !selectedCustomer && (
        <span className="text-[10px] text-gray-400 italic">Pilih Pelanggan</span>
    )}
    </button>

    {isCustomerExpanded && (
    <div className="px-4 pb-3 space-y-2">
        <div className="flex justify-end">
        {selectedCustomer && (
            <button onClick={() => setSelectedCustomer(null)} className="text-[10px] font-bold text-red-400 hover:text-red-600">Hapus</button>
        )}
        </div>
        <SearchableSelect
        placeholder="Cari atau pilih pelanggan..."
        value={selectedCustomer?.id || ''}
        onChange={(val) => {
            if (val === 'new') {
            setShowNewCustomerModal(true);
            } else {
            const customer = customers.find(c => String(c.id) === String(val));
            setSelectedCustomer(customer ? { ...customer } : null);
            }
        }}
        creatable={true}
        onCreate={async ({ label }) => {
            setNewCustomerForm(prev => ({ ...prev, name: label }));
            setShowNewCustomerModal(true);
            return null;
        }}
        options={customerOptions}
        />
        {selectedCustomer && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-naqupos-cream/40 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-naqupos-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {selectedCustomer.name.charAt(0)}
            </div>
            <div className="min-w-0">
            <p className="font-bold text-naqupos-dark text-xs truncate">{selectedCustomer.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{selectedCustomer.phone || '-'}</p>
            </div>
            {selectedCustomer.member && (
            <span className="ml-auto flex-shrink-0 bg-naqupos-primary/10 text-naqupos-primary text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Member</span>
            )}
        </div>
        )}
        {bookingNotes && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100 mt-1">
            <MessageSquare size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 italic leading-tight flex-1">"{bookingNotes}"</p>
            <button onClick={() => setBookingNotes('')} className="text-amber-400 hover:text-amber-600"><X size={10} /></button>
        </div>
        )}
    </div>
    )}
</div>

{/* Cart Items */}
{cart.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <ShoppingCart size={40} className="mb-3 opacity-30" />
    <p className="text-sm font-medium">Keranjang kosong</p>
    <p className="text-xs mt-1 opacity-70">Pilih layanan atau produk</p>
    </div>
) : (
    <div className="divide-y divide-gray-50">
    {cart.map((item, idx) => (
        <div key={idx} className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-naqupos-dark leading-tight">
                {item.type === 'service' ? item.service?.name : item.product?.name}
            </p>
            {item.type === 'service' ? (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {item.therapist && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <User size={9} /> {item.therapist.name}
                    </p>
                )}
                {item.scheduledTime && (
                    <p className="text-[10px] text-naqupos-primary flex items-center gap-0.5">
                    <Clock size={9} /> {item.scheduledTime}
                    </p>
                )}
                {item.room && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Building size={9} /> {item.room.name}
                    </p>
                )}
                </div>
            ) : (
                <p className="text-[10px] text-gray-400 mt-0.5">{item.product?.sku}</p>
            )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1.5 py-1">
                <button
                onClick={() => {
                    const newCart = [...cart];
                    if (newCart[idx].quantity > 1) { newCart[idx].quantity -= 1; setCart(newCart); }
                    else removeFromCart(idx);
                }}
                className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-red-500 font-bold"
                >-</button>
                <span className="text-[11px] font-bold w-4 text-center">{item.quantity}</span>
                <button
                onClick={() => { const newCart = [...cart]; newCart[idx].quantity += 1; setCart(newCart); }}
                className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-naqupos-primary font-bold"
                >+</button>
            </div>
            <button onClick={() => removeFromCart(idx)} className="text-[9px] text-red-400 hover:text-red-600 font-bold">Hapus</button>
            </div>
        </div>
        <div className="flex items-center justify-between mt-2">
            <input
            type="text"
            className="flex-1 bg-gray-50 border border-gray-100 rounded px-2 py-1 text-[10px] outline-none focus:border-naqupos-primary/30 mr-2"
            placeholder="Catatan..."
            value={item.notes || ''}
            onChange={(e) => { const newCart = [...cart]; newCart[idx].notes = e.target.value; setCart(newCart); }}
            />
            <span className="text-xs font-bold text-naqupos-primary flex-shrink-0">
            Rp {((item.type === 'service' ? (item.service?.special_price || item.service?.price || 0) : (item.product?.special_price || item.product?.price || 0)) * item.quantity).toLocaleString('id-ID')}
            </span>
        </div>
        </div>
    ))}
    </div>
)}

{/* Summary inside scroll */}
<div className="px-4 pt-3 pb-2 mt-2 border-t border-dashed border-gray-200 space-y-1.5">
    {/* Subtotal row */}
    <div className="flex justify-between text-xs text-gray-500">
    <span>Subtotal</span>
    <span>Rp {subtotal.toLocaleString('id-ID')}</span>
    </div>
    {roomCharge > 0 && (
    <div className="flex justify-between text-xs text-gray-500">
        <span>Biaya Ruangan</span>
        <span>Rp {roomCharge.toLocaleString('id-ID')}</span>
    </div>
    )}
    {dpAlreadyPaid > 0 && (
    <div className="flex justify-between text-xs text-emerald-600 font-medium">
        <span>DP Sudah Dibayar</span>
        <span>- Rp {dpAlreadyPaid.toLocaleString('id-ID')}</span>
    </div>
    )}

    {/* Adjustments toggle */}
    <button
    onClick={() => setIsAdjustmentsExpanded(!isAdjustmentsExpanded)}
    className="w-full flex items-center justify-between py-1 text-xs text-gray-400 hover:text-gray-600"
    >
    <div className="flex items-center gap-1">
        <ChevronDown size={12} className={`transition-transform ${isAdjustmentsExpanded ? 'rotate-180' : ''}`} />
        <span className="font-bold uppercase tracking-wider text-[10px]">Biaya & Penyesuaian</span>
    </div>
    {(taxAmount + serviceChargeAmount - discountAmount - promoAmount) !== 0 && (
        <span className="font-bold text-naqupos-primary">
        {(taxAmount + serviceChargeAmount - discountAmount - promoAmount) > 0 ? '+' : ''}Rp {(taxAmount + serviceChargeAmount - discountAmount - promoAmount).toLocaleString('id-ID')}
        </span>
    )}
    </button>

    {isAdjustmentsExpanded && (
    <div className="space-y-1.5 pl-3">
        {(companySettings?.is_service_charge_enabled) && (
        <div className="flex justify-between text-xs text-gray-500">
            <span>Service Charge ({companySettings?.service_charge_percentage}%)</span>
            <span>Rp {serviceChargeAmount.toLocaleString('id-ID')}</span>
        </div>
        )}
        {(companySettings?.is_tax_enabled) && (
        <div className="flex justify-between text-xs text-gray-500">
            <span>Pajak ({companySettings?.tax_percentage}%)</span>
            <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
        </div>
        )}
        {/* Voucher */}
        <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1 flex-1 bg-gray-50 rounded-lg px-2 py-1.5 border transition-all ${selectedPromoId ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
            <Gift size={11} className={selectedPromoId ? 'text-green-500' : 'text-gray-400'} />
            <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="KODE PROMO"
            disabled={!!selectedPromoId}
            className="text-[10px] bg-transparent border-none outline-none flex-1 uppercase font-mono"
            onKeyDown={(e) => { if (e.key === 'Enter') handleApplyPromo(); }}
            />
            {selectedPromoId ? (
            <button onClick={() => { setSelectedPromoId(null); setPromoCode(''); }} className="text-red-400 hover:text-red-600"><X size={10} /></button>
            ) : (
            <button onClick={handleApplyPromo} disabled={!promoCode} className="text-naqupos-primary disabled:text-gray-300"><Check size={11} /></button>
            )}
        </div>
        {promoAmount > 0 && <span className="text-xs text-red-500 flex-shrink-0 font-bold">-Rp {promoAmount.toLocaleString('id-ID')}</span>}
        </div>

        {/* Manual Discount */}
<div className="pt-1.5 border-t border-gray-100">
    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Diskon Manual</p>
    <div className="flex items-center gap-1.5">
        {/* Type toggle */}
        <div className="flex bg-gray-100 rounded-md p-0.5 flex-shrink-0">
            <button
                onClick={() => setManualDiscountType('nominal')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${manualDiscountType === 'nominal' ? 'bg-white text-naqupos-primary shadow-sm' : 'text-gray-400'}`}
            >Rp</button>
            <button
                onClick={() => setManualDiscountType('percent')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${manualDiscountType === 'percent' ? 'bg-white text-naqupos-primary shadow-sm' : 'text-gray-400'}`}
            >%</button>
        </div>
        {/* Input */}
        <div className={`flex items-center gap-1 flex-1 bg-gray-50 rounded-lg px-2 py-1.5 border transition-all ${discountAmount > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
            <Eraser size={11} className={discountAmount > 0 ? 'text-amber-500' : 'text-gray-400'} />
            <input
                type="text"
                inputMode="numeric"
                value={manualDiscountInput}
                onChange={(e) => setManualDiscountInput(e.target.value.replace(/\D/g, ''))}
                placeholder={manualDiscountType === 'percent' ? '0 – 100' : '0'}
                disabled={discountAmount > 0}
                className="text-[10px] bg-transparent border-none outline-none flex-1 font-mono"
                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyManualDiscount(); }}
            />
            {discountAmount > 0 ? (
                <button onClick={handleClearManualDiscount} className="text-red-400 hover:text-red-600"><X size={10} /></button>
            ) : (
                <button onClick={handleApplyManualDiscount} disabled={!manualDiscountInput} className="text-naqupos-primary disabled:text-gray-300"><Check size={11} /></button>
            )}
        </div>
        {discountAmount > 0 && (
            <span className="text-xs text-red-500 flex-shrink-0 font-bold">-Rp {discountAmount.toLocaleString('id-ID')}</span>
        )}
    </div>
</div>
    </div>
    )}
</div>
</div>

{/* Sticky Footer */}
<div className="flex-shrink-0 border-t border-gray-100 px-4 pt-3 pb-4 bg-white space-y-3">
{/* Total */}
<div className="flex items-center justify-between">
    <span className="font-black text-base text-naqupos-dark">Total</span>
    <span className="font-black text-xl text-naqupos-primary">Rp {total.toLocaleString('id-ID')}</span>
</div>

{/* Payment Method */}
<div className="relative">
    <button
    onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:border-naqupos-primary transition-all text-sm"
    >
    <span className="flex items-center gap-2 text-gray-700">
        {(() => {
        const selected = paymentMethods.find(m => m.code === paymentMethod);
        if (!selected) return <span className="text-gray-400 text-xs">Pilih Metode Bayar</span>;
        const getIcon = (iconName: string, methodGroup?: string) => {
            if (methodGroup === 'QRIS' || iconName === 'qr-code') return QrCode;
            if (methodGroup === 'VIRTUAL_ACCOUNT' || iconName === 'building') return Landmark;
            const map: any = { 'banknote': Banknote, 'cash': Banknote, 'credit-card': CreditCard, 'globe': Globe, 'wallet': Wallet };
            return map[iconName] || Wallet;
        };
        const Icon = getIcon(selected.icon || selected.type, selected.group);
        return (<><Icon size={15} className="text-naqupos-primary" /><span className="font-medium text-xs">{selected.name}</span></>);
        })()}
    </span>
    <ChevronDown size={14} className={`text-gray-400 transition-transform ${showPaymentDropdown ? 'rotate-180' : ''}`} />
    </button>

    {showPaymentDropdown && (
    <>
        <div className="fixed inset-0 z-10" onClick={() => setShowPaymentDropdown(false)} />
        <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto">
        {(() => {
            const groups: Record<string, { title: string; methods: any[]; color: string }> = {
            'OFFLINE': { title: 'Pembayaran Langsung', methods: [], color: 'bg-green-500' },
            'QRIS': { title: 'QRIS', methods: [], color: 'bg-purple-500' },
            'BANK_TRANSFER': { title: 'Transfer Bank', methods: [], color: 'bg-blue-500' },
            'VIRTUAL_ACCOUNT': { title: 'Virtual Account', methods: [], color: 'bg-blue-500' },
            'E-WALLET': { title: 'E-Wallet', methods: [], color: 'bg-pink-500' },
            'CREDIT_CARD': { title: 'Kartu Kredit', methods: [], color: 'bg-amber-500' },
            'DOKU': { title: 'Metode Lainnya', methods: [], color: 'bg-gray-500' }
            };
            paymentMethods.forEach(method => {
            const group = method.group || 'DOKU';
            if (groups[group]) groups[group].methods.push(method);
            else groups['DOKU'].methods.push(method);
            });
            const getIcon = (iconName: string, group: string) => {
            if (group === 'QRIS' || iconName === 'qr-code') return QrCode;
            if (group === 'VIRTUAL_ACCOUNT' || iconName === 'building') return Landmark;
            if (iconName === 'banknote' || iconName === 'cash') return Banknote;
            if (iconName === 'credit-card') return CreditCard;
            if (iconName === 'wallet') return Wallet;
            return Globe;
            };
            return Object.keys(groups).map(key => {
            const group = groups[key];
            if (group.methods.length === 0) return null;
            return (
                <div key={key}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${group.color}`} />{group.title}
                </div>
                {group.methods.map(method => {
                    const Icon = getIcon(method.icon || method.type, key);
                    return (
                    <button
                        key={method.code}
                        onClick={() => { setPaymentMethod(method.code); setShowPaymentDropdown(false); }}
                        className={`w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-naqupos-cream/30 text-left transition-colors border-b border-gray-50 last:border-0 ${paymentMethod === method.code ? 'bg-naqupos-cream/50 text-naqupos-primary' : 'text-gray-700'}`}
                    >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${paymentMethod === method.code ? 'bg-naqupos-primary text-white' : 'bg-gray-100 text-naqupos-primary'}`}>
                        <Icon size={14} />
                        </div>
                        <span className="text-xs font-medium flex-1">{method.name}</span>
                        {paymentMethod === method.code && <Check size={13} className="text-naqupos-primary" />}
                    </button>
                    );
                })}
                </div>
            );
            });
        })()}
        </div>
    </>
    )}
</div>

{/* Action Buttons */}
<div className="flex gap-2">
    <button
    onClick={handlePayNow}
    disabled={cart.length === 0 || !currentShift || cart.some(item => item.type === 'service' && !item.therapist)}
    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors ${cart.length === 0 || !currentShift || cart.some(item => item.type === 'service' && !item.therapist)
        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
        : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
        }`}
    >
    Bayar Sekarang
    </button>
    <button
    onClick={() => currentTransaction && handlePrint()}
    disabled={!currentTransaction}
    className={`p-2.5 border rounded-lg transition-colors ${currentTransaction ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-100 bg-gray-50 cursor-not-allowed'}`}
    >
    <Printer size={18} className={currentTransaction ? 'text-gray-500' : 'text-gray-300'} />
    </button>
</div>
</div>
</div>
                </div>
            ) : activeTab === 'petty-cash' ? (
                /* Petty Cash Tab */
                <div className="flex-1 flex gap-6 overflow-hidden pb-4">
                    {/* Left: Petty Cash List */}
                    <div className="flex-1 flex flex-col h-full">
                        <div className="bg-white rounded-xl border border-gray-100 h-full flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Wallet size={20} className="text-naqupos-primary" />
                                    <h2 className=" font-bold text-naqupos-dark">Petty Cash (Kas Operasional)</h2>
                                </div>
                                <button
                                    onClick={() => setShowPettyCashModal(true)}
                                    disabled={!currentShift}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentShift
                                        ? 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Plus size={16} /> Tambah Pengeluaran
                                </button>
                            </div>

                            {!currentShift ? (
                                <div className="flex-1 flex items-center justify-center text-center p-8">
                                    <div>
                                        <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
                                        <p className="text-gray-600 font-medium">Shift Belum Dibuka</p>
                                        <p className="text-sm text-gray-400 mt-1">Buka shift untuk mencatat petty cash</p>
                                    </div>
                                </div>
                            ) : pettyCashItems.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-center p-8">
                                    <div>
                                        <Receipt size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p className="text-gray-500">Belum ada pengeluaran</p>
                                        <p className="text-sm text-gray-400 mt-1">Klik "Tambah Pengeluaran" untuk mencatat</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {pettyCashItems.map(item => (
                                        <div key={item.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-naqupos-primary">
                                                    {renderExpenseIcon(expenseCategories.find(c => c.id === item.categoryId)?.icon || '', 20)}
                                                </div>

                                                <div>
                                                    <p className="font-medium text-naqupos-dark">{item.description}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {item.categoryName} • {item.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right mr-4 flex items-center gap-2">
                                                    {item.receipt_url && (
                                                        <FileText size={14} className="text-naqupos-primary animate-pulse" />
                                                    )}
                                                    <p className="font-bold text-red-500">- Rp {item.amount.toLocaleString('id-ID')}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setShowPettyCashDetail(item)}
                                                        className="p-2 text-gray-400 hover:text-naqupos-primary hover:bg-white rounded-lg transition-colors"
                                                        title="Detail"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditPettyCash(item)}
                                                        className="p-2 text-gray-400 hover:text-naqupos-primary hover:bg-white rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeletePettyCashModal(item.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Petty Cash Summary */}
                            {currentShift && pettyCashItems.length > 0 && (
                                <div className="border-t border-gray-100 p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Total Pengeluaran</span>
                                        <span className="text-xl font-bold text-red-500">Rp {totalPettyCash.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Shift Summary */}
                    <div className="w-96 flex flex-col h-full">
                        <div className="bg-white rounded-xl border border-gray-100 p-6 h-full overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-naqupos-dark">Ringkasan Shift</h3>
                                <button
                                    onClick={() => {
                                        setShowShiftHistoryModal(true);
                                        fetchShiftHistory();
                                    }}
                                    className="p-1.5 text-naqupos-primary hover:bg-naqupos-cream rounded-lg transition-colors"
                                    title="Riwayat Shift"
                                >
                                    <History size={18} />
                                </button>
                            </div>
                            {currentShift ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={16} className="text-green-600" />
                                            <span className="text-sm text-green-700">Modal Awal</span>
                                        </div>
                                        <span className="font-bold text-green-700">Rp {currentShift.openingCash.toLocaleString('id-ID')}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Banknote size={16} className="text-blue-600" />
                                            <span className="text-sm text-blue-700">Penjualan Cash</span>
                                        </div>
                                        <span className="font-bold text-blue-700">+ Rp {currentShift.cashSales.toLocaleString('id-ID')}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <TrendingDown size={16} className="text-red-600" />
                                            <span className="text-sm text-red-700">Petty Cash</span>
                                        </div>
                                        <span className="font-bold text-red-700">- Rp {totalPettyCash.toLocaleString('id-ID')}</span>
                                    </div>

                                    <hr className="border-dashed" />

                                    <div className="flex items-center justify-between p-3 bg-naqupos-cream rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <DollarSign size={16} className="text-naqupos-primary" />
                                            <span className="text-sm font-medium text-naqupos-dark">Estimasi Laci</span>
                                        </div>
                                        <span className="font-bold text-naqupos-primary text-lg">Rp {currentCashInDrawer.toLocaleString('id-ID')}</span>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => setIsShiftDetailsExpanded(!isShiftDetailsExpanded)}
                                            className="w-full flex items-center justify-between mb-3 group"
                                        >
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detail Metode Pembayaran</h4>
                                            <div className={`text-gray-400 group-hover:text-naqupos-primary transition-transform duration-200 ${isShiftDetailsExpanded ? 'rotate-180' : ''}`}>
                                                <ChevronDown size={14} />
                                            </div>
                                        </button>

                                        {isShiftDetailsExpanded && (
                                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                                {/* POS Methods */}
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">POS (Offline)</p>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-600">Cash / Tunai</span>
                                                            <span className="font-semibold text-naqupos-dark">Rp {currentShift.cashSales.toLocaleString('id-ID')}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-600">EDC / Kartu</span>
                                                            <span className="font-semibold text-naqupos-dark">
                                                                Rp {(currentShift.methodBreakdown?.find(m => m.code === 'edc')?.total || 0).toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Online / Customer Methods */}
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Customer (Online)</p>
                                                    <div className="space-y-2">
                                                        {currentShift.methodBreakdown?.filter(m => !['cash', 'edc'].includes(m.code.toLowerCase())).map(method => (
                                                            <div key={method.code} className="flex justify-between text-sm">
                                                                <span className="text-gray-600">{method.name}</span>
                                                                <span className="font-semibold text-naqupos-dark">Rp {method.total.toLocaleString('id-ID')}</span>
                                                            </div>
                                                        ))}
                                                        {(!currentShift.methodBreakdown || currentShift.methodBreakdown.filter(m => !['cash', 'edc'].includes(m.code.toLowerCase())).length === 0) && (
                                                            <p className="text-[10px] text-gray-400 italic text-center">Belum ada transaksi online</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3 mt-4 text-center">
<div className="bg-orange-50 rounded-lg p-2">
    <p className="font-bold text-orange-700">
        Rp {parseFloat(String(currentShift.dpSales || 0)).toLocaleString('id-ID')}
    </p>
    <p className="text-[10px] text-orange-600">Total DP</p>
</div>
<div className="bg-emerald-50 rounded-lg p-2">
    <p className="font-bold text-emerald-700">
        Rp {parseFloat(String(currentShift.fullSales || 0)).toLocaleString('id-ID')}
    </p>
    <p className="text-[10px] text-emerald-600">Total Lunas</p>
</div>
</div>

                                        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-2xl font-bold text-naqupos-dark">{currentShift.totalTransactions}</p>
                                                <p className="text-xs text-gray-500">Transaksi</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-2xl font-bold text-naqupos-dark">Rp {(currentShift.totalSales / 1000000).toFixed(1).replace('.', ',')} jt</p>
                                                <p className="text-xs text-gray-500">Total Penjualan</p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Clock size={40} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-gray-500">Belum ada shift aktif</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                ) : activeTab === ('shift-history-tab' as any) ? (
<div className="flex-1 flex gap-5 overflow-hidden pb-4 min-h-0">
    {/* Left: Shift List */}
    <div className="w-80 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
        {/* Date Filter */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col gap-2 flex-shrink-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter Periode</p>
            <div className="flex gap-2">
                <input type="date" value={shiftHistoryStartDate}
                    onChange={e => setShiftHistoryStartDate(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none" />
                <input type="date" value={shiftHistoryEndDate}
                    onChange={e => setShiftHistoryEndDate(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none" />
            </div>
            <button onClick={fetchShiftHistory}
                className="w-full py-1.5 bg-naqupos-primary text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-naqupos-accent transition-colors">
                <Search size={12} /> Tampilkan
            </button>
        </div>

        {isLoadingShifts ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-naqupos-primary animate-spin" /></div>
        ) : shiftHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Tidak ada data shift</div>
        ) : (
            shiftHistory.map(shift => (
                <button key={shift.id}
                    onClick={() => { fetchShiftDetail(shift); setShiftHistoryTab('transactions'); }}
                    className={`w-full text-left bg-white rounded-xl border p-3 transition-all hover:shadow-md ${selectedShiftForDetail?.id === shift.id ? 'border-naqupos-primary shadow-md' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-naqupos-dark">{shift.cashier?.name || 'Cashier'}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${shift.clock_out ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {shift.clock_out ? 'Closed' : 'Active'}
                        </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">
                        {new Date(shift.clock_in).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}
                        {new Date(shift.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        {shift.clock_out && ' – ' + new Date(shift.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
<div className="bg-gray-50 rounded-lg px-2 py-1">
    <p className="text-gray-400">Transaksi</p>
    <p className="font-bold text-naqupos-dark">{shift.transaction_count ?? 0}x</p>
</div>
<div className="bg-gray-50 rounded-lg px-2 py-1">
    <p className="text-gray-400">Total Sales</p>
    <p className="font-bold text-naqupos-primary">
        Rp {(shift.total_sales ?? 0).toLocaleString('id-ID')}
    </p>
</div>
<div className="bg-red-50 rounded-lg px-2 py-1">
    <p className="text-red-400">Pengeluaran</p>
    <p className="font-bold text-red-600">
        Rp {(shift.total_expenses ?? 0).toLocaleString('id-ID')}
    </p>
</div>
<div className="bg-gray-50 rounded-lg px-2 py-1">
    <p className="text-gray-400">Selisih</p>
    <p className={`font-bold ${(shift.variance ?? 0) < 0 ? 'text-red-500' : (shift.variance ?? 0) > 0 ? 'text-green-600' : 'text-gray-500'}`}>
        Rp {(shift.variance ?? 0).toLocaleString('id-ID')}
    </p>
</div>
</div>
                </button>
            ))
        )}
    </div>

    {/* Right: Shift Detail */}
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!selectedShiftForDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 bg-white rounded-xl border border-gray-100">
                <History size={40} className="mb-3 opacity-20" />
                <p className="font-medium text-sm">Pilih shift untuk melihat detail</p>
            </div>
        ) : (
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-black text-naqupos-dark">{selectedShiftForDetail.cashier?.name || 'Cashier'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(selectedShiftForDetail.clock_in).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        {isSuperAdminOrAdmin && (
                            <button onClick={() => { setSelectedShiftForCorrection(selectedShiftForDetail); setCorrectionCashInput(selectedShiftForDetail.ending_cash?.toString() || ''); setShowShiftCorrectionModal(true); }}
                                className="flex items-center gap-1.5 text-xs text-naqupos-primary font-bold px-3 py-1.5 border border-naqupos-primary/20 rounded-lg hover:bg-naqupos-cream transition-colors">
                                <Edit size={13} /> Koreksi Register
                            </button>
                        )}
                    </div>
                    {/* Ringkasan kas */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: 'Modal Awal', val: selectedShiftForDetail.starting_cash || 0, color: 'text-gray-700' },
{ label: 'Cash Sales', val: selectedShiftForDetail.cash_sales ?? 0, color: 'text-green-600' },
                            { label: 'Pengeluaran', val: selectedShiftForDetail.total_expenses || 0, color: 'text-red-500', minus: true },
                            { label: 'Cash Akhir', val: selectedShiftForDetail.ending_cash || 0, color: 'text-naqupos-primary' },
                        ].map(item => (
                            <div key={item.label} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <p className="text-[9px] text-gray-400 uppercase">{item.label}</p>
                                <p className={`text-xs font-black mt-0.5 ${item.color}`}>
                                    {item.minus ? '-' : ''}Rp {parseInt(item.val).toLocaleString('id-ID')}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex border-b border-gray-100 flex-shrink-0">
                    <button onClick={() => setShiftHistoryTab('transactions')}
                        className={`flex-1 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${shiftHistoryTab === 'transactions' ? 'text-naqupos-primary border-b-2 border-naqupos-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Receipt size={13} /> Transaksi ({shiftDetailTransactions.length})
                    </button>
                    <button onClick={() => setShiftHistoryTab('expenses')}
                        className={`flex-1 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${shiftHistoryTab === 'expenses' ? 'text-naqupos-primary border-b-2 border-naqupos-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Wallet size={13} /> Pengeluaran ({shiftDetailExpenses.length})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoadingShiftDetail ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-naqupos-primary animate-spin" /></div>
                    ) : shiftHistoryTab === 'transactions' ? (
                        shiftDetailTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Receipt size={32} className="mb-2 opacity-20" />
                                <p className="text-sm">Tidak ada transaksi</p>
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Invoice</th>
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Customer</th>
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Metode</th>
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Tipe</th>
                                        <th className="text-right px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {shiftDetailTransactions.map((trx: any) => (
                                        <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-mono font-bold text-naqupos-dark text-[10px]">{trx.invoice_number || trx.id}</p>
                                                <p className="text-[9px] text-gray-400">{new Date(trx.created_at || trx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-700">{trx.customer?.name || trx.customer_name || 'Guest'}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[9px] font-bold uppercase">{trx.payment_method}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${trx.payment_type === 'dp' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                                                    {trx.payment_type === 'dp' ? 'DP' : 'Lunas'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-naqupos-primary">
                                                Rp {parseInt(trx.total || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="sticky bottom-0 bg-white border-t-2 border-gray-200">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-500">Total</td>
                                        <td className="px-4 py-2.5 text-right text-sm font-black text-naqupos-primary">
                                            Rp {shiftDetailTransactions.reduce((s: number, t: any) => s + parseInt(t.total || 0), 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        )
                    ) : (
                        shiftDetailExpenses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Wallet size={32} className="mb-2 opacity-20" />
                                <p className="text-sm">Tidak ada pengeluaran</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {shiftDetailExpenses.map(exp => (
                                    <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center flex-shrink-0">
                                                {renderExpenseIcon(expenseCategories.find(c => c.id === exp.categoryId)?.icon || '', 16)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-naqupos-dark">{exp.description}</p>
                                                <p className="text-[9px] text-gray-400">{exp.categoryName} · {exp.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                {exp.creator_name && <p className="text-[9px] text-gray-300">oleh {exp.creator_name}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-bold text-red-500">-Rp {exp.amount.toLocaleString('id-ID')}</p>
                                            {isSuperAdminOrAdmin && (
                                                <button onClick={() => handleEditExpenseFromHistory(exp)}
                                                    className="p-1.5 text-gray-300 hover:text-naqupos-primary hover:bg-naqupos-cream rounded-lg transition-colors">
                                                    <Edit size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center px-5 py-3 bg-gray-50 border-t border-gray-200">
                                    <span className="text-xs font-bold text-gray-500">Total Pengeluaran</span>
                                    <span className="text-sm font-black text-red-500">
                                        -Rp {shiftDetailExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        )}
    </div>
</div>
            ) : activeTab === 'bank-deposits' ? (
                <div className="flex-1">
                    <POSBankDepositsTab branchId={branchId} />
                </div>
            ) : null
        }

        {/* Open Shift Modal */}
        {
            showOpenShiftModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-24 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Buka Shift Baru</h3>
                            <button onClick={() => setShowOpenShiftModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6 space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg mb-4">
                                <p className="text-sm text-blue-700">
                                    <strong>Info:</strong> Masukkan jumlah uang kas yang ada di laci sebelum memulai shift.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-2">Nominal Kasir Sebelumnya</label>
                                <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-medium">
                                    Rp {lastShiftCash.toLocaleString('id-ID')}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nominal Yang Ada Sekarang (Rp)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={openingCashInput !== '' ? parseInt(openingCashInput).toLocaleString('id-ID') : ''}
                                    onChange={(e) => setOpeningCashInput(e.target.value.replace(/\D/g, ''))}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-lg font-bold text-naqupos-dark"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    *Jika sama dengan sebelumnya, mohon tetap diisi {lastShiftCash === 0 ? '0' : lastShiftCash.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowOpenShiftModal(false)}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleOpenShift}
                                disabled={!openingCashInput}
                                className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${!openingCashInput
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                    }`}
                            >
                                <Play size={18} /> Mulai Shift
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        {/* Close Shift Modal */}
        {
            showCloseShiftModal && currentShift && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Tutup Shift</h3>
                            <button onClick={() => setShowCloseShiftModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Shift Summary */}
                        {/* Shift Summary */}
<div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
{/* Rekap Kas */}
<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rekap Kas</p>
<div className="flex justify-between text-sm">
    <span className="text-gray-500">Modal Awal</span>
    <span>Rp {currentShift.openingCash.toLocaleString('id-ID')}</span>
</div>
<div className="flex justify-between text-sm">
    <span className="text-gray-500">Penjualan Cash</span>
    <span className="text-green-600">+ Rp {currentShift.cashSales.toLocaleString('id-ID')}</span>
</div>
<div className="flex justify-between text-sm">
    <span className="text-gray-500">Petty Cash</span>
    <span className="text-red-600">- Rp {totalPettyCash.toLocaleString('id-ID')}</span>
</div>
<hr className="border-dashed" />
<div className="flex justify-between font-bold">
    <span>Seharusnya di Laci</span>
    <span className="text-naqupos-primary">Rp {currentCashInDrawer.toLocaleString('id-ID')}</span>
</div>

{/* Penjualan */}
<hr className="border-dashed mt-1" />
<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 mb-1">Ringkasan Penjualan</p>
<div className="flex justify-between text-sm">
    <span className="text-gray-500">Total Transaksi</span>
    <span className="font-medium">{currentShift.totalTransactions} transaksi</span>
</div>
<div className="flex justify-between text-sm">
    <span className="text-gray-500">Non-Cash</span>
    <span className="font-medium">Rp {currentShift.nonCashSales.toLocaleString('id-ID')}</span>
</div>
<div className="flex justify-between text-sm">
    <span className="text-red-500">Total Refund</span>
    <span className="font-medium text-red-500">Rp {(currentShift.totalRefund || 0).toLocaleString('id-ID')}</span>
</div>

{/* DP & Lunas */}
<hr className="border-dashed mt-1" />
<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 mb-1">Uang Muka & Pelunasan</p>
<div className="flex justify-between text-sm">
    <span className="text-orange-500">Uang Muka (DP)</span>
    <span className="font-medium text-orange-600">Rp {(currentShift.dpSales || 0).toLocaleString('id-ID')}</span>
</div>
<div className="flex justify-between text-sm">
    <span className="text-emerald-600">Pembayaran Lunas</span>
    <span className="font-medium text-emerald-600">Rp {(currentShift.fullSales || 0).toLocaleString('id-ID')}</span>
</div>

{/* Method Breakdown */}
{currentShift.methodBreakdown && currentShift.methodBreakdown.length > 0 && (
    <>
        <hr className="border-dashed mt-1" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 mb-1">Per Metode</p>
        {currentShift.methodBreakdown.map(m => (
            <div key={m.code} className="flex justify-between text-sm">
                <span className="text-gray-500">{m.name}</span>
                <span className="font-medium">Rp {m.total.toLocaleString('id-ID')}</span>
            </div>
        ))}
    </>
)}
</div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hitung Uang Fisik di Laci (Rp)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={closingCashInput !== '' ? parseInt(closingCashInput).toLocaleString('id-ID') : ''}
                                onChange={(e) => setClosingCashInput(e.target.value.replace(/\D/g, ''))}
                                placeholder="Masukkan jumlah uang fisik..."
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-lg"
                            />
                            {closingCashInput && (
                                <div className={`mt-3 p-3 rounded-lg ${parseInt(closingCashInput) === currentCashInDrawer
                                    ? 'bg-green-50'
                                    : parseInt(closingCashInput) > currentCashInDrawer
                                        ? 'bg-blue-50'
                                        : 'bg-red-50'
                                    }`}>
                                    <p className="text-sm">
                                        Selisih:{' '}
                                        <span className={`font-bold ${parseInt(closingCashInput) === currentCashInDrawer
                                            ? 'text-green-600'
                                            : parseInt(closingCashInput) > currentCashInDrawer
                                                ? 'text-blue-600'
                                                : 'text-red-600'
                                            }`}>
                                            Rp {(parseInt(closingCashInput) - currentCashInDrawer).toLocaleString('id-ID')}
                                        </span>
                                        {parseInt(closingCashInput) === currentCashInDrawer && <span className="ml-2">✓ Pas!</span>}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseShiftModal(false)}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCloseShift}
                                disabled={!closingCashInput}
                                className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${!closingCashInput
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                            >
                                <Printer size={18} /> Tutup & Cetak Laporan
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        {/* New Customer Modal */}
        {
            showNewCustomerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-naqupos-dark">Tambah Pelanggan Baru</h3>
                            <button onClick={() => {
                                setShowNewCustomerModal(false);
                                setNewCustomerForm({ name: '', phone: '', email: '', dob: '' });
                            }} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Lengkap <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={newCustomerForm.name}
                                        onChange={(e) => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Contoh: Budi Santoso"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    No. Telepon <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={newCustomerForm.phone}
                                        onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="08123456789"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email (Opsional)</label>
                                <input
                                    type="email"
                                    value={newCustomerForm.email}
                                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="email@contoh.com"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir (Opsional)</label>
                                <input
                                    type="date"
                                    value={newCustomerForm.dob}
                                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, dob: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowNewCustomerModal(false);
                                    setNewCustomerForm({ name: '', phone: '', email: '', dob: '' });
                                }}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateNewCustomer}
                                disabled={isCreatingCustomer || !newCustomerForm.name || !newCustomerForm.phone}
                                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${isCreatingCustomer || !newCustomerForm.name || !newCustomerForm.phone
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                    }`}
                            >
                                {isCreatingCustomer ? 'Menyimpan...' : 'Simpan Pelanggan'}
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        {/* Petty Cash Modal */}
        {
            showPettyCashModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar mb-20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {editingPettyCashId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowPettyCashModal(false);
                                    setEditingPettyCashId(null);
                                    setPettyCashForm({ description: '', amount: '', categoryId: 0, receipt_file: null });
                                    setPettyCashReceiptPreview(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >

                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <SearchableSelect
                                    label="Kategori"
                                    placeholder="Pilih kategori pengeluaran..."
                                    value={pettyCashForm.categoryId}
                                    onChange={(val) => setPettyCashForm(prev => ({ ...prev, categoryId: Number(val) }))}
                                    options={expenseCategories.map(cat => ({
                                        value: cat.id,
                                        label: cat.name,
                                        display: (
                                            <div className="flex items-center gap-2">
                                                <span className="text-naqupos-primary">{renderExpenseIcon(cat.icon, 14)}</span>
                                                <span>{cat.name}</span>
                                            </div>
                                        )
                                    }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                                <input
                                    type="text"
                                    value={pettyCashForm.description}
                                    onChange={(e) => setPettyCashForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Contoh: Beli air galon"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah (Rp)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={pettyCashForm.amount !== '' ? parseInt(pettyCashForm.amount).toLocaleString('id-ID') : ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setPettyCashForm(prev => ({ ...prev, amount: val }));
                                    }}
                                    placeholder="Contoh: 25.000"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Nota (Opsional)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast.error('Ukuran file maksimal 5MB');
                                                    return;
                                                }
                                                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                                                if (!validTypes.includes(file.type)) {
                                                    toast.error('Format file harus JPG, PNG, atau PDF');
                                                    return;
                                                }
                                                setPettyCashForm(prev => ({ ...prev, receipt_file: file }));
                                                if (file.type.startsWith('image/')) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setPettyCashReceiptPreview(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                } else {
                                                    setPettyCashReceiptPreview(null);
                                                }
                                            }
                                        }}
                                        className="hidden"
                                        id="petty-cash-receipt-upload"
                                    />
                                    <label htmlFor="petty-cash-receipt-upload" className="cursor-pointer">
                                        {pettyCashForm.receipt_file || pettyCashReceiptPreview ? (
                                            <div className="space-y-2">
                                                {pettyCashReceiptPreview && !pettyCashReceiptPreview.toLowerCase().includes('.pdf') ? (
                                                    <img src={pettyCashReceiptPreview} alt="Preview" className="mx-auto h-24 object-contain rounded" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center gap-2 text-naqupos-primary">
                                                        <FileText size={32} />
                                                        <span className="text-xs font-medium truncate max-w-[200px]">
                                                            {pettyCashForm.receipt_file?.name || 'Dokumen Terlampir'}
                                                        </span>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-gray-400 font-medium bg-gray-50 py-1 px-2 rounded-full inline-block">Klik untuk ganti file</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
    <Upload size={32} className="mx-auto text-gray-400" />
    <p className="text-sm text-gray-600">Klik untuk upload nota <span className="text-red-500">*</span></p>
    <p className="text-xs text-red-400 font-medium">Wajib diisi</p>
    <p className="text-xs text-gray-400">JPG, PNG, atau PDF (Max 5MB)</p>
</div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowPettyCashModal(false);
                                    setEditingPettyCashId(null);
                                    setPettyCashForm({ description: '', amount: '', categoryId: 0, receipt_file: null });
                                }}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >

                                Batal
                            </button>
                            <button
                                onClick={handleAddPettyCash}
                                disabled={!pettyCashForm.description || !pettyCashForm.amount || isProcessing}
                                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${!pettyCashForm.description || !pettyCashForm.amount || isProcessing
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                    }`}
                            >
                                {isProcessing ? 'Memproses...' : (editingPettyCashId ? 'Update' : 'Simpan')}
                            </button>

                        </div>
                    </div>
                </div>
            )
        }

        {/* Petty Cash Delete Confirmation */}
        {
            showDeletePettyCashModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] pt-32 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Hapus Pengeluaran?</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Tindakan ini tidak dapat dibatalkan. Data pengeluaran akan dihapus permanen.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeletePettyCashModal(null)}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeletePettyCash}
                                disabled={isProcessing}
                                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:bg-gray-200"
                            >
                                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        {/* Petty Cash Detail Modal */}
        {
            showPettyCashDetail && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] p-4 pt-16 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] mb-20">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-naqupos-dark">Detail Pengeluaran</h3>
                                <p className="text-sm text-gray-500">{showPettyCashDetail.id}</p>
                            </div>
                            <button
                                onClick={() => setShowPettyCashDetail(null)}
                                className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Kategori</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-naqupos-cream rounded-lg flex items-center justify-center text-naqupos-primary">
                                            {renderExpenseIcon(expenseCategories.find(c => c.id === showPettyCashDetail.categoryId)?.icon || '', 16)}
                                        </div>
                                        <p className="font-semibold text-naqupos-dark">{showPettyCashDetail.categoryName}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Jumlah</p>
                                    <p className="text-xl font-bold text-red-500">Rp {showPettyCashDetail.amount.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Waktu</p>
                                    <p className="font-medium text-naqupos-dark">
                                        {showPettyCashDetail.timestamp.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        <br />
                                        {showPettyCashDetail.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Dicatat Oleh</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                            <User size={14} />
                                        </div>
                                        <p className="font-medium text-naqupos-dark">{showPettyCashDetail.creator_name || 'System'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Keterangan</p>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-naqupos-dark leading-relaxed">{showPettyCashDetail.description}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Nota / Bukti Bayar</p>
                                {showPettyCashDetail.receipt_url ? (
                                    <div className="space-y-3">
                                        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center min-h-[200px]">
                                            {showPettyCashDetail.receipt_url.toLowerCase().endsWith('.pdf') ? (
                                                <div className="flex flex-col items-center gap-3 p-8">
                                                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                                                        <FileText size={32} />
                                                    </div>
                                                    <p className="font-medium text-gray-600">Dokumen Bukti (PDF)</p>
                                                </div>
                                            ) : (
                                                <img
                                                    src={showPettyCashDetail.receipt_url}
                                                    alt="Receipt"
                                                    className="max-w-full h-auto max-h-[400px] object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Gambar+Tidak+Tersedia';
                                                    }}
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <button
                                                    onClick={() => window.open(showPettyCashDetail!.receipt_url!, '_blank')}
                                                    className="bg-white text-naqupos-dark px-4 py-2 rounded-lg font-medium shadow-xl flex items-center gap-2"
                                                >
                                                    <Search size={16} /> Lihat Full
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDownloadReceipt(showPettyCashDetail.id, `Nota_${showPettyCashDetail.id}_${showPettyCashDetail.description.replace(/\s+/g, '_')}.jpg`)}
                                            className="w-full py-3 bg-naqupos-cream text-naqupos-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-naqupos-primary hover:text-white transition-all border border-naqupos-primary/20"
                                        >
                                            <Upload size={18} className="rotate-180" /> Download Nota
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50/50">
                                        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Receipt size={24} />
                                        </div>
                                        <p className="text-gray-400 text-sm font-medium">Tidak ada nota yang diupload</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        {/* Payment Confirmation Modal */}

        {
            showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-24 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-naqupos-dark">Konfirmasi Pembayaran</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Payment Type Selection - Only for services */}
                        {cart.some(item => item.type === 'service') && (
                            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                                <button
                                    onClick={() => setIsDP(false)}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${!isDP ? 'bg-white text-naqupos-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Bayar Penuh
                                </button>
                                <button
                                    onClick={() => setIsDP(true)}
                                    disabled={parseInt(dpAmount) >= total}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${isDP
                                        ? 'bg-[#C58940] text-white shadow-sm'
                                        : parseInt(dpAmount) >= total
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-500 hover:text-gray-700'}`}
                                    title={parseInt(dpAmount) >= total ? "Total kurang dari minimum DP" : ""}
                                >
                                    Uang Muka (DP)
                                </button>
                            </div>
                        )}

                        <div className="text-center mb-6">
                            <p className="text-gray-500 text-sm">{isDP ? 'Nominal DP' : 'Total Pembayaran'}</p>
                            {isDP ? (
                                <div className="relative mt-2 max-w-[240px] mx-auto">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                                    <input
                                        type="text"
                                        value={dpAmount !== '' ? parseInt(dpAmount).toLocaleString('id-ID') : ''}
                                        onChange={(e) => setDpAmount(e.target.value.replace(/\D/g, ''))}
                                        className="w-full pl-10 pr-4 py-3 bg-naqupos-cream/30 rounded-xl border-2 border-naqupos-primary/20 focus:border-naqupos-primary outline-none text-2xl font-bold text-naqupos-primary text-center"
                                    />
                                </div>
                            ) : (
                                <p className="text-3xl font-bold text-naqupos-primary mt-1">Rp {total.toLocaleString('id-ID')}</p>
                            )}
                            {isDP && (
                                <p className="text-xs text-gray-400 mt-2">Sisa Pelunasan: Rp {(total - (parseInt(dpAmount) || 0)).toLocaleString('id-ID')}</p>
                            )}
                        </div>

                        {/* Reference Input - For non-cash payments */}
                        {!isCashPayment && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Kode Referensi / Trace No <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder="Masukkan nomor referensi..."
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-lg"
                                />
                                <p className="text-xs text-gray-400 mt-1">Wajib diisi untuk verifikasi pembayaran.</p>
                            </div>
                        )}

                        {/* Cash Input - Only for cash payment */}
                        {isCashPayment && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Uang Diterima</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={cashReceived !== '' ? parseInt(cashReceived).toLocaleString('id-ID') : ''}
                                    onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Masukkan nominal..."
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-lg"
                                />
                                <div className="mt-2 text-right">
                                    <button
                                        onClick={() => setCashReceived((isDP ? parseInt(dpAmount) || 0 : total).toString())}
                                        className="text-sm text-naqupos-primary hover:text-naqupos-accent font-medium hover:underline bg-naqupos-cream px-3 py-1 rounded-full transition-colors"
                                    >
                                        Uang Pas (Rp {(isDP ? parseInt(dpAmount) || 0 : total).toLocaleString('id-ID')})
                                    </button>
                                </div>
                                {cashReceived && parseInt(cashReceived) >= (isDP ? parseInt(dpAmount) || 0 : total) && (
                                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Kembalian:</p>
                                        <p className="text-xl font-bold text-green-600">Rp {(parseInt(cashReceived) - (isDP ? parseInt(dpAmount) || 0 : total)).toLocaleString('id-ID')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={processPayment}
                            disabled={
                                isProcessing ||
                                (isCashPayment && (!cashReceived || parseInt(cashReceived) < (isDP ? parseInt(dpAmount) || 0 : total))) ||
                                (!isCashPayment && !paymentReference)
                            }
                            className={`w-full py-3 rounded-lg font-medium transition-colors ${isProcessing ||
                                (isCashPayment && (!cashReceived || parseInt(cashReceived) < (isDP ? parseInt(dpAmount) || 0 : total))) ||
                                (!isCashPayment && !paymentReference)
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {isProcessing ? 'Memproses...' : 'Konfirmasi Pembayaran'}
                        </button>
                    </div>
                </div>
            )
        }


        {/* Success Modal */}
        {
            showSuccessModal && currentTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl text-center relative">
                        {/* Close Button */}
                        <button
                            onClick={handleNewTransaction}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>

                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} className="text-green-600" />
                        </div>
                        <h3 className="text-xl  font-bold text-naqupos-dark mb-2">Pembayaran Berhasil!</h3>
                        <p className="text-gray-500 text-sm mb-4">Transaksi telah selesai diproses.</p>

                        <div ref={receiptRef} className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">No. Invoice</span>
                                <span className=" font-medium">{currentTransaction.id}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">Waktu</span>
                                <span>{currentTransaction.date.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">Metode</span>
                                <span className="uppercase">{currentTransaction.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">Tipe Bayar</span>
                                <span className="font-medium text-naqupos-primary">{isDP ? 'Uang Muka (DP)' : 'Lunas'}</span>
                            </div>
                            {isDP && (
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500">Total Tagihan</span>
                                    <span>Rp {total.toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            <hr className="my-2 border-dashed" />
                            <div className="flex justify-between font-bold">
                                <span>{isDP ? 'DP Dibayar' : 'Total'}</span>
                                <span className="text-naqupos-primary">Rp {currentTransaction.total.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                className="flex-1 py-3 border border-naqupos-primary text-naqupos-primary rounded-lg font-medium hover:bg-naqupos-cream transition-colors flex items-center justify-center gap-2"
                            >
                                <Printer size={18} />
                                Cetak Struk
                            </button>
                            <button
                                onClick={handleNewTransaction}
                                className="flex-1 py-3 bg-naqupos-primary text-white rounded-lg font-medium hover:bg-naqupos-accent transition-colors"
                            >
                                Transaksi Baru
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        {/* Time Selection Modal */}
        {
            showTimeSelectionModal && selectedServiceForCart && selectedTherapist && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-24 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl  font-bold text-naqupos-dark">Pilih Waktu</h3>
                                <p className="text-sm text-gray-500 mt-1">{selectedServiceForCart.name}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Terapis: {selectedTherapist.name} • Durasi: {selectedServiceForCart.duration || 60} menit
                                </p>
                            </div>
                            <button onClick={() => {
                                setShowTimeSelectionModal(false);
                                setSelectedTherapist(null);
                            }} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {isLoadingTimeSlots ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-naqupos-primary animate-spin" />
                                <span className="ml-3 text-gray-600">Memuat jadwal tersedia...</span>
                            </div>
                        ) : availableTimeSlots.length === 0 ? (
                            <div className="text-center py-12">
                                <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-600 font-medium">Tidak ada waktu tersedia</p>
                                <p className="text-sm text-gray-400 mt-1">Silakan pilih terapis lain</p>
                                <button
                                    onClick={() => {
                                        setShowTimeSelectionModal(false);
                                        setSelectedTherapist(null);
                                        setShowTherapistModal(true);
                                    }}
                                    className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Pilih Terapis Lain
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        <Clock size={16} className="inline mr-2" />
                                        Pilih Waktu Tersedia (Interval {bookingInterval} menit)
                                    </label>
                                    <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-1">
                                        {availableTimeSlots.map(time => {
                                            // Check if time is in the past (only if selected date is today)
                                            const now = new Date();
                                            const todayStr = formatDateYMD(now);
                                            const isToday = posDate === todayStr;

                                            let isDisabled = false;

                                            if (isToday) {
                                                const currentTime = now.getHours() * 60 + now.getMinutes();
                                                const [hours, minutes] = time.split(':').map(Number);
                                                const slotTime = hours * 60 + minutes;

                                                // Disable if slot time is less than current time
                                                if (slotTime <= currentTime) {
                                                    isDisabled = true;
                                                }
                                            }

                                            return (
                                                <button
                                                    key={time}
                                                    onClick={() => !isDisabled && setSelectedTime(time)}
                                                    disabled={isDisabled}
                                                    className={`py-3 px-3 rounded-lg text-sm font-medium transition-colors ${selectedTime === time
                                                        ? 'bg-naqupos-primary text-white'
                                                        : isDisabled
                                                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {time}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedTime && (
                                        <p className="text-xs text-gray-500 mt-3">
                                            Treatment akan selesai sekitar: {
                                                (() => {
                                                    const [hours, minutes] = selectedTime.split(':').map(Number);
                                                    const duration = selectedServiceForCart.duration || 60;
                                                    const endMinutes = hours * 60 + minutes + duration;
                                                    const endHours = Math.floor(endMinutes / 60) % 24;
                                                    const endMins = endMinutes % 60;
                                                    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
                                                })()
                                            }
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowTimeSelectionModal(false);
                                            setSelectedTherapist(null);
                                            setShowTherapistModal(true);
                                        }}
                                        className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        onClick={handleContinueToRooms}
                                        disabled={!selectedTime}
                                        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${!selectedTime
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                            }`}
                                    >
                                        Lanjut Pilih Ruangan
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )
        }

        {/* Room Selection Modal */}
        {
            showRoomModal && selectedServiceForCart && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-24 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl  font-bold text-naqupos-dark">Pilih Ruangan</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedTherapist?.name} • {selectedTime}
                                </p>
                            </div>
                            <button onClick={() => setShowRoomModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {isLoadingRooms ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-naqupos-primary animate-spin" />
                                <span className="ml-3 text-gray-600">Mencari ruangan...</span>
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="text-center py-12">
                                <Square size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-600 font-medium">Tidak ada ruangan tersedia</p>
                                <button
                                    onClick={() => setShowRoomModal(false)}
                                    className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">

                                    <h4 className="text-sm font-bold text-naqupos-primary mb-3 flex items-center gap-2">
                                        Pilih Ruangan
                                    </h4>

                                    <div className="space-y-2 max-h-48 overflow-y-auto mb-4 border-t border-gray-100 pt-2">
                                        {rooms.map(room => (
                                            <button
                                                key={room.id}
                                                onClick={() => setSelectedRoom(room)}
                                                className={`w-full p-3 flex items-center justify-between border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${selectedRoom?.id === room.id
                                                    ? 'bg-naqupos-cream/50'
                                                    : ''
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-4 h-0.5 rounded-full ${selectedRoom?.id === room.id ? 'bg-naqupos-primary' : 'bg-gray-300'}`}></span>
                                                    <span className={`text-sm ${selectedRoom?.id === room.id ? 'font-medium text-naqupos-dark' : 'text-gray-600'}`}>
                                                        {room.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-500">
                                                        {room.price ? `Rp ${room.price.toLocaleString('id-ID')}` : 'Gratis'}
                                                    </span>
                                                    {selectedRoom?.id === room.id && <Check size={16} className="text-naqupos-primary" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Summary Section */}
                                    <div className="bg-yellow-50/50 rounded-lg p-4 border border-yellow-100">
                                        <h5 className="font-bold text-sm text-gray-900 mb-2">Ringkasan</h5>
                                        <div className="flex justify-between text-sm mb-1 text-gray-600">
                                            <span>{selectedServiceForCart.name}</span>
                                            <span>Rp {selectedServiceForCart.price.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-naqupos-primary mt-2 pt-2 border-t border-yellow-200 text-sm">
                                            <span>Total</span>
                                            <span>Rp {(selectedServiceForCart.price + (selectedRoom?.price || 0)).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() => {
                                            setShowRoomModal(false);
                                            setShowTimeSelectionModal(true);
                                        }}
                                        className="px-6 py-3 border border-naqupos-primary text-naqupos-primary rounded-xl font-bold hover:bg-naqupos-cream transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        <ChevronDown size={16} className="rotate-90" /> Kembali
                                    </button>
                                    <div className="flex-1"></div>
                                    <button
                                        onClick={confirmAddToCart}
                                        disabled={!selectedRoom}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 ${!selectedRoom
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-100'
                                            : 'bg-naqupos-primary text-white hover:bg-naqupos-accent hover:shadow-lg'
                                            }`}
                                    >
                                        Simpan ke keranjang
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )
        }

        {/* Therapist Selection Modal */}
        {
            showTherapistModal && selectedServiceForCart && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-24 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl  font-bold text-naqupos-dark">Pilih Terapis</h3>
                                <p className="text-sm text-gray-500 mt-1">{selectedServiceForCart.name}</p>
                            </div>
                            <button onClick={() => setShowTherapistModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Date Selector in Modal */}
                        <div className="mb-6 bg-naqupos-cream/50 p-4 rounded-xl border border-naqupos-primary/10 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <CalendarIcon size={20} className="text-naqupos-primary" />
                                <span className="text-sm font-bold text-naqupos-dark">Pilih Tanggal:</span>
                            </div>
                            <input
                                type="date"
                                value={posDate}
                                min={todayDate}
                                onChange={(e) => setPosDate(e.target.value)}
                                className="bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold text-naqupos-primary focus:border-naqupos-primary outline-none cursor-pointer shadow-sm"
                            />
                        </div>

                        {/* Service Availability Validation */}
                        {(() => {
                            const checkServiceAvailability = (service: Service, dateStr: string) => {
                                if (!service.is_limited_availability) return true;
                                if (!service.availability_data || service.availability_data.length === 0) return false;

                                if (service.availability_type === 'specific_dates') {
                                    return service.availability_data.includes(dateStr);
                                } else if (service.availability_type === 'recurring') {
                                    const date = new Date(dateStr);
                                    const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
                                    return service.availability_data.includes(dayName);
                                }
                                return true;
                            };

                            const isServiceAvailable = checkServiceAvailability(selectedServiceForCart, posDate);

                            if (!isServiceAvailable) {
                                return (
                                    <div className="text-center p-6 bg-red-50 rounded-xl border border-red-100 mb-4 animate-in fade-in zoom-in duration-200">
                                        <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
                                        <p className="text-red-700 font-bold">Layanan Tidak Tersedia</p>
                                        <p className="text-sm text-red-600 mt-1">
                                            "{selectedServiceForCart.name}" tidak tersedia pada tanggal {new Date(posDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
                                        </p>
                                        {selectedServiceForCart.availability_type === 'recurring' && (
                                            <p className="text-xs text-red-500 mt-2 bg-white/50 p-2 rounded block">
                                                Hanya tersedia hari: {selectedServiceForCart.availability_data?.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            return isLoadingTherapists ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-naqupos-primary animate-spin" />
                                    <span className="ml-3 text-gray-600">Mencari terapis tersedia...</span>
                                </div>
                            ) : availableTherapists.length === 0 ? (
                                <div className="text-center py-12">
                                    <User size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-gray-600 font-medium">Tidak ada terapis tersedia</p>
                                    <p className="text-sm text-gray-400 mt-1">Silakan pilih waktu lain atau layanan berbeda</p>
                                    <button
                                        onClick={() => setShowTherapistModal(false)}
                                        className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                    {availableTherapists.map(therapist => (
                                        <button
                                            key={therapist.id}
                                            onClick={() => handleTherapistSelect(therapist)}
                                            className="w-full p-4 border border-gray-200 rounded-xl hover:border-naqupos-primary hover:bg-naqupos-cream transition-all text-left group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                                                        {therapist.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-naqupos-dark text-base">{therapist.name}</p>
                                                            {therapist.gender && (
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${['pria', 'male', 'l'].includes(therapist.gender.toLowerCase())
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-pink-100 text-pink-700'
                                                                    }`}>
                                                                    {['pria', 'male', 'l'].includes(therapist.gender.toLowerCase()) ? 'Pria' : 'Wanita'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {(() => {
                                                                const staffData = staffSchedules.find(s => s.staffId === therapist.id);
                                                                if (!staffData) return <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded">Belum ada jadwal</span>;

                                                                const settings = getGeneralSettings();
                                                                const currentBranch = branches.find(b => b.id === selectedBranchId);
                                                                const bStart = currentBranch?.opening_time ? currentBranch.opening_time.substring(0, 5) : (settings?.openTime || "08:00");
                                                                const bEnd = currentBranch?.closing_time ? currentBranch.closing_time.substring(0, 5) : (settings?.closeTime || "22:00");

                                                                const slots = getStaffSlots(staffData.shifts, staffData.workHours, staffData.staffId, bStart, bEnd, cart, posDate);
                                                                const duration = selectedServiceForCart?.duration || 60;

                                                                const availableSlots = slots.filter(s => {
                                                                    if (s.type !== 'available') return false;
                                                                    const [h1, m1] = s.start.split(':').map(Number);
                                                                    const [h2, m2] = s.end.split(':').map(Number);
                                                                    return ((h2 * 60 + m2) - (h1 * 60 + m1)) >= duration;
                                                                });

                                                                // Check if there are work hours defined at all
                                                                const hasWorkHours = staffData.workHours && staffData.workHours.length > 0;
                                                                if (!hasWorkHours) {
                                                                    return <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded font-bold">Tidak Tersedia (Belum ada jadwal)</span>;
                                                                }

                                                                const displaySlots = availableSlots.slice(0, 3);
                                                                return (
                                                                    <>
                                                                        {displaySlots.map((s, i) => (
                                                                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-100 font-bold">
                                                                                {s.start}
                                                                            </span>
                                                                        ))}
                                                                        {availableSlots.length > 3 && (
                                                                            <span className="text-[10px] text-gray-400 font-medium">+{availableSlots.length - 3}</span>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="ml-4 text-right">
                                                    {(() => {
                                                        const staffData = staffSchedules.find(s => s.staffId === therapist.id);
                                                        const settings = getGeneralSettings();
                                                        const currentBranch = branches.find(b => b.id === selectedBranchId);
                                                        const bStart = currentBranch?.opening_time ? currentBranch.opening_time.substring(0, 5) : (settings?.openTime || "08:00");
                                                        const bEnd = currentBranch?.closing_time ? currentBranch.closing_time.substring(0, 5) : (settings?.closeTime || "22:00");
                                                        const slots = staffData ? getStaffSlots(staffData.shifts, staffData.workHours, staffData.staffId, bStart, bEnd, cart, posDate) : [];
                                                        const duration = selectedServiceForCart?.duration || 60;
                                                        const hasAvailable = slots.some(s => {
                                                            if (s.type !== 'available') return false;
                                                            const [h1, m1] = s.start.split(':').map(Number);
                                                            const [h2, m2] = s.end.split(':').map(Number);
                                                            return ((h2 * 60 + m2) - (h1 * 60 + m1)) >= duration;
                                                        });
                                                        return (
                                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${hasAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {hasAvailable ? 'TERSEDIA' : 'PENUH'}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )
        }

        {/* Success Modal, Close Shift Modal, etc. (Other modals not Shown) */}
        {/* Shift History Modal */}
        {
            showShiftHistoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-naqupos-dark">Riwayat Shift</h3>
                            <button onClick={() => setShowShiftHistoryModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Date Filter */}
                        <div className="bg-gray-50 p-4 rounded-xl mb-6 flex flex-wrap items-end gap-4">
                            <div className="space-y-1.5 flex-1 min-w-[150px]">
                                <label className="text-xs font-bold text-gray-500 uppercase">Awal</label>
                                <input
                                    type="date"
                                    value={shiftHistoryStartDate}
                                    onChange={(e) => setShiftHistoryStartDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-[150px]">
                                <label className="text-xs font-bold text-gray-500 uppercase">Akhir</label>
                                <input
                                    type="date"
                                    value={shiftHistoryEndDate}
                                    onChange={(e) => setShiftHistoryEndDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                                />
                            </div>
                            <button
                                onClick={fetchShiftHistory}
                                className="px-4 py-2 bg-naqupos-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-naqupos-accent transition-colors"
                            >
                                <Search size={16} /> Filter
                            </button>
                        </div>

                        {isLoadingShifts ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-naqupos-primary animate-spin" />
                            </div>
                        ) : shiftHistory.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                Tidak ada riwayat shift
                            </div>
                        ) : (
                            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                                {shiftHistory.map((shift) => (
                                    <div key={shift.id} className="border border-gray-100 rounded-xl p-4 хоver:bg-gray-50">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-bold text-naqupos-dark">{shift.cashier?.name || 'Cashier'}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <CalendarIcon size={14} />
                                                    <span>{new Date(shift.clock_in).toLocaleDateString('id-ID')}</span>
                                                    <span>•</span>
                                                    <span>{new Date(shift.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {shift.clock_out && (
                                                        <>
                                                            <span>-</span>
                                                            <span>{new Date(shift.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {shift.clock_out ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Closed</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Active</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                            <div>
                                                <p className="text-gray-500 text-xs">Modal Awal</p>
                                                <p className="font-semibold">Rp {parseInt(shift.starting_cash).toLocaleString('id-ID')}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Penjualan Cash</p>
                                                <p className="font-semibold">Rp {(shift.cash_sales || 0).toLocaleString('id-ID')}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs text-red-500">Pengeluaran</p>
                                                <p className="font-semibold text-red-500">Rp {(shift.total_expenses || 0).toLocaleString('id-ID')}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs text-orange-500">Total Refund</p>
                                                <p className="font-semibold text-orange-500">Rp {(shift.total_refund || 0).toLocaleString('id-ID')}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs text-naqupos-primary">Cash Akhir (Fisik)</p>
                                                <p className="font-semibold text-naqupos-primary">Rp {parseInt(shift.ending_cash || 0).toLocaleString('id-ID')}</p>
                                            </div>
                                        </div>

                                        {shift.clock_out && (
                                            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                                <div className="flex gap-4 text-xs">
                                                    <div className={shift.variance < 0 ? 'text-red-500' : shift.variance > 0 ? 'text-green-500' : 'text-gray-500'}>
                                                        Selisih: Rp {(shift.variance || 0).toLocaleString('id-ID')}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedShiftForCorrection(shift);
                                                        setCorrectionCashInput(shift.ending_cash.toString());
                                                        setShowShiftCorrectionModal(true);
                                                    }}
                                                    className="flex items-center gap-1 text-naqupos-primary text-sm font-medium hover:bg-naqupos-cream px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-naqupos-primary/20"
                                                >
                                                    <Edit size={14} />
                                                    Koreksi Register
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        {/* Shift Correction Modal */}
        {
            showShiftCorrectionModal && selectedShiftForCorrection && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] p-4 pt-24 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl mb-20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-naqupos-dark">Koreksi Register</h3>
                            <button onClick={() => setShowShiftCorrectionModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 mb-4">
                                <p className="font-bold mb-1">Perhatian!</p>
                                Koreksi ini akan mengubah data jumlah uang fisik pada penutupan shift dan memperbarui kalkulasi selisih.
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Uang Fisik Dihitung (Revisi)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                                    <input
                                        type="text"
                                        value={correctionCashInput ? parseInt(correctionCashInput.replace(/\./g, '')).toLocaleString('id-ID') : ''}
                                        onChange={(e) => setCorrectionCashInput(e.target.value.replace(/\D/g, ''))}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-naqupos-primary outline-none font-bold text-lg"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Diharapkan (System)</span>
                                    <span className="font-medium text-gray-900">
                                        Rp {parseInt(String(selectedShiftForCorrection.expected_cash || '0')).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="text-gray-600">Selisih Baru</span>
                                    <span className={`font-bold ${(parseInt(correctionCashInput || '0') - parseInt(String(selectedShiftForCorrection.expected_cash || '0'))) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        Rp {(parseInt(correctionCashInput || '0') - parseInt(String(selectedShiftForCorrection.expected_cash || '0'))).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleUpdateShift}
                            disabled={isProcessing || !correctionCashInput}
                            className="w-full py-3 bg-naqupos-primary text-white rounded-xl font-bold hover:bg-naqupos-accent transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
                        </button>
                    </div>
                </div>
            )
        }
        {showEditExpenseModal && editingExpenseFromHistory && (
<div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] p-4 pt-24 overflow-y-auto">
    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl mb-20">
        <div className="flex justify-between items-center mb-5">
            <div>
                <h3 className="text-lg font-bold text-naqupos-dark">Edit Jumlah Pengeluaran</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editingExpenseFromHistory.description}</p>
            </div>
            <button onClick={() => { setShowEditExpenseModal(false); setEditingExpenseFromHistory(null); }}
                className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="mb-6">
            <div className="bg-gray-50 rounded-xl p-4 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    {renderExpenseIcon(expenseCategories.find(c => c.id === editingExpenseFromHistory.categoryId)?.icon || '', 18)}
                </div>
                <div>
                    <p className="font-semibold text-xs text-naqupos-dark">{editingExpenseFromHistory.description}</p>
                    <p className="text-[10px] text-gray-400">{editingExpenseFromHistory.categoryName}</p>
                </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Baru (Rp)</label>
            <input
                type="text"
                inputMode="numeric"
                value={editExpenseForm.amount !== '' ? parseInt(editExpenseForm.amount).toLocaleString('id-ID') : ''}
                onChange={e => setEditExpenseForm(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }))}
                placeholder="0"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-xl font-bold text-naqupos-primary"
                autoFocus
            />
            {editExpenseForm.amount && (
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400 px-1">
                    <span>Sebelumnya: Rp {editingExpenseFromHistory.amount.toLocaleString('id-ID')}</span>
                    <span className={parseInt(editExpenseForm.amount) !== editingExpenseFromHistory.amount ? 'text-amber-500 font-bold' : 'text-green-500'}>
                        {parseInt(editExpenseForm.amount) !== editingExpenseFromHistory.amount
                            ? `Δ Rp ${(parseInt(editExpenseForm.amount) - editingExpenseFromHistory.amount).toLocaleString('id-ID')}`
                            : '✓ Sama'}
                    </span>
                </div>
            )}
        </div>

        <div className="flex gap-3">
            <button onClick={() => { setShowEditExpenseModal(false); setEditingExpenseFromHistory(null); }}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50">
                Batal
            </button>
            <button onClick={handleSaveExpenseFromHistory}
                disabled={isSavingExpense || !editExpenseForm.amount || parseInt(editExpenseForm.amount) === editingExpenseFromHistory.amount}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isSavingExpense || !editExpenseForm.amount || parseInt(editExpenseForm.amount) === editingExpenseFromHistory.amount
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                {isSavingExpense ? 'Menyimpan...' : 'Simpan'}
            </button>
        </div>
    </div>
</div>
)}
    </div >
);
}

export default POSPage;
