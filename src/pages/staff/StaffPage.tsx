import { Search, Plus, Edit, Trash2, X, ChevronDown, ChevronLeft, ChevronRight, User, Clock, Sparkles } from 'lucide-react';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import EmptyState from '../../components/common/EmptyState';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { mapRole } from '../../utils/role';

import type { Branch } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import { SearchableSelect } from '../../components/common/SearchableSelect';

type StaffTab = 'jam-kerja' | 'anggota-staf' | 'komisi';

interface StaffMember { id: number; name: string; role?: string; photo?: string; initials: string; color: string; email?: string; phone?: string; bookingStatus?: string; branch_id?: number; gender?: string; social_media?: string; notes?: string; start_work_date?: string; end_work_date?: string; bookingOnline?: boolean; }
    interface ShiftData { id?: number; staffId: number; date: string; startTime: string; endTime: string; type?: 'specific' | 'recurring' | string; }
    interface DeletedShiftTarget { id: number; date: string; }

const tabs: { id: StaffTab; label: string }[] = [
    { id: 'jam-kerja', label: 'Jam Kerja' },
    { id: 'anggota-staf', label: 'Anggota Staf' },
    { id: 'komisi', label: 'Komisi' },
];

interface TherapistResponse {
    id: number;
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    gender?: string;
    specialization?: string;
    photo?: string;
    branch_id?: number;
    social_media?: string;
    notes?: string;
    start_work_date?: string;
    end_work_date?: string;
    color?: string;
     is_calendar_enabled?: number | boolean;  // ← tambah ini
}

interface CommissionData {
    id: number;
    staff_name: string;
    amount: number;
    date: string;
    description: string;
    [key: string]: any;
}

interface CommissionParams {
    branch_id: number | null;
    start_date: string;
    end_date: string;
    staff_id?: number;
}

// ─── Service types with variant support ───────────────────────────────────────
interface ServiceVariant {
    id: number;
    name: string;
    price?: number;
     special_price?: number | null;  // ← tambah
}

interface ServiceItem {
    id: number;
    name: string;
    price?: number;
    variants: ServiceVariant[];
}

interface ServiceCategory {
    category: { id: number; name: string };
    services: ServiceItem[];
}

// A flat "selectable" unit — either a service (no variant) or a specific variant
interface SelectableService {
    /** Unique key for selection state */
    key: string;
    /** Display label */
    label: string;
    /** The parent service id */
    serviceId: number;
    /** If this is a variant row, the variant id; otherwise null */
    variantId: number | null;
}
// ─────────────────────────────────────────────────────────────────────────────

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['bg-yellow-200', 'bg-pink-200', 'bg-green-200', 'bg-purple-200', 'bg-blue-200', 'bg-orange-200'];

const AGENDA_COLORS = ['#00BCD4', '#4DD0E1', '#26A69A', '#66BB6A', '#9CCC65', '#FFEE58', '#FFA726', '#FF7043', '#AB47BC', '#7E57C2', '#42A5F5', '#26C6DA', '#D4E157', '#FFCA28', '#FFA000'];

const getWeekDates = (date: Date) => { const start = new Date(date); start.setDate(start.getDate() - start.getDay()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; }); };
const getMonthDates = (date: Date) => Array.from({ length: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() }, (_, i) => new Date(date.getFullYear(), date.getMonth(), i + 1));
const formatDateKey = (date: Date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num || 0);
};

const getMaxStartTime = (closeTime: string) => {
    if (!closeTime) return "21:59";
    const [h, m] = closeTime.split(':').map(Number);
    let total = h * 60 + m - 1;
    if (total < 0) total = 0;
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

const buildPhotoUrl = (photo: string): string => {
    if (!photo) return '';
    if (photo.startsWith('data:') || photo.startsWith('blob:')) return photo;
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    const base = (import.meta.env.VITE_STORAGE_URL || 'https://apinaqupos.zafarangroupindonesia.com').replace(/\/$/, '');
    const path = photo.startsWith('/') ? photo : `/${photo}`;
    return `${base}${path}`;
};

const OLD_STORAGE_URL = 'https://zafaranbe.memofy-dev.my.id';

const extractPath = (photo: string): string => {
    try {
        return new URL(photo).pathname;
    } catch {
        return photo.startsWith('/') ? photo : `/${photo}`;
    }
};

const TimePickerFiltered = ({
    value,
    onChange,
    min,
    max
}: {
    value: string;
    onChange: (val: string) => void;
    min: string;
    max: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toMinutes = (t: string) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
    };

    const minMinutes = toMinutes(min);
    const maxMinutes = toMinutes(max);

    const options = useMemo(() => {
        const result = [];
        for (let m = 0; m < 24 * 60; m += 15) {
            if (m >= minMinutes && m <= maxMinutes) {
                const h = Math.floor(m / 60);
                const mins = m % 60;
                const timeStr = `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                result.push(timeStr);
            }
        }
        if (maxMinutes % 15 !== 0) {
            const h = Math.floor(maxMinutes / 60);
            const mins = maxMinutes % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            if (!result.includes(timeStr)) result.push(timeStr);
        }
        return result;
    }, [minMinutes, maxMinutes]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:border-[#C58940] outline-none font-medium text-gray-700 transition-all ${isOpen ? 'border-[#C58940] ring-2 ring-orange-50' : 'border-gray-200'}`}
            >
                <div className="flex items-center gap-2">
                    <span className={value ? 'text-gray-700' : 'text-gray-400'}>
                        {value ? value.replace(':', '.') : '--.--'}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[1001] bottom-full mb-2 left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar animate-slideUp">
                    <div className="p-2 space-y-1">
                        {options.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${value === opt ? 'bg-orange-50 text-[#C58940]' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span>{opt.replace(':', '.')}</span>
                                {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-[#C58940]" />}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <div className="py-8 text-center text-gray-400 text-xs font-medium">
                                Tidak ada jam tersedia
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

import { useBranchSync } from '../../hooks/useBranchSync';

// ─── StaffAvatar (defined outside StaffPage) ──────────────────────────────────
const StaffAvatar = ({ staff, size = 'sm' }: { staff: StaffMember; size?: 'sm' | 'lg' }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const [triedOld, setTriedOld] = useState(false);

    const sizeClass = size === 'lg' ? 'w-20 h-20' : 'w-8 h-8';
    const textClass = size === 'lg' ? 'text-2xl' : 'text-xs';
    const bgStyle = staff.color?.startsWith('#') ? { backgroundColor: staff.color } : {};
    const bgClass = !staff.color?.startsWith('#') ? (staff.color || 'bg-gray-400') : '';

    if (staff.photo && !imgFailed) {
        const primarySrc = buildPhotoUrl(staff.photo);
        const fallbackSrc = `${OLD_STORAGE_URL}${extractPath(staff.photo)}`;

        return (
            <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0`}>
                <img
                    src={triedOld ? fallbackSrc : primarySrc}
                    alt={staff.name}
                    className="w-full h-full object-cover"
                    onError={() => {
                        if (!triedOld) {
                            setTriedOld(true);
                        } else {
                            setImgFailed(true);
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div
            className={`${sizeClass} rounded-full flex-shrink-0 flex items-center justify-center ${textClass} font-medium text-white shadow-sm ${bgClass}`}
            style={bgStyle}
        >
            {staff.initials}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffPage() {
    const [activeTab, setActiveTab] = useState<StaffTab>('jam-kerja');
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());

    // ── Keahlian Layanan — grouped by category, each service has variants ────
    const [servicesByCategory, setServicesByCategory] = useState<ServiceCategory[]>([]);
    const [servicesCategoryCollapsed, setServicesCategoryCollapsed] = useState<Record<number, boolean>>({});
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    // ─────────────────────────────────────────────────────────────────────────

    const {
        selectedBranchId,
        setSelectedBranchId
    } = useBranchSync<number | null>((id) => {
        setSelectedKomisiBranch(id);
    }, null);

    const globalBranchId = selectedBranchId === null ? 'all' : selectedBranchId.toString();
    const [shifts, setShifts] = useState<ShiftData[]>([]);
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

    const [companySettings, setCompanySettings] = useState<any>(null);
    const [branchList, setBranchList] = useState<Branch[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [filterStaffId, setFilterStaffId] = useState<number | 'all'>('all');
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [deletedShiftTargets, setDeletedShiftTargets] = useState<DeletedShiftTarget[]>([]);

    interface ModalShift {
        id?: number;
        start: string;
        end: string;
        type?: 'specific' | 'recurring' | string;
        repeatType: 'none' | 'weekly' | 'daily' | 'custom';
        repeatDays: string[];
        endRepeatType: 'specific' | 'ongoing';
        endRepeatDate: string;
    }

    const [modalShifts, setModalShifts] = useState<ModalShift[]>([]);
    const [isEditingShift, setIsEditingShift] = useState(false);

    const [showAddStaffModal, setShowAddStaffModal] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchCriteria, setSearchCriteria] = useState<'name' | 'phone' | 'email' | 'location'>('name');
    const [showSearchCriteriaDropdown, setShowSearchCriteriaDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

    const [deleteStaffModal, setDeleteStaffModal] = useState<{ show: boolean; staffId: number | null; loading: boolean }>({
        show: false, staffId: null, loading: false
    });

    const [showBulkScheduleModal, setShowBulkScheduleModal] = useState(false);
    const [bulkSelectedStaffIds, setBulkSelectedStaffIds] = useState<number[]>([]);
    const [bulkModalShifts, setBulkModalShifts] = useState<ModalShift[]>([]);
    const [bulkStartDate, setBulkStartDate] = useState<string>(formatDateKey(new Date()));
    const [isSavingBulkShift, setIsSavingBulkShift] = useState(false);

    const openBulkScheduleModal = () => {
        setBulkSelectedStaffIds([]);
        setBulkModalShifts([{
            start: '',
            end: '',
            repeatType: 'none',
            repeatDays: [],
            endRepeatType: 'ongoing',
            endRepeatDate: ''
        }]);
        setBulkStartDate(formatDateKey(new Date()));
        setShowBulkScheduleModal(true);
    };

    const handleSaveBulkShift = async () => {
        if (bulkSelectedStaffIds.length === 0 || !bulkStartDate) {
            toast.error('Pilih staff dan tanggal mulai');
            return;
        }

        setIsSavingBulkShift(true);
        try {
            const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const startDayDate = new Date(bulkStartDate);
            const selectedDayName = daysMap[startDayDate.getDay()];

            for (const staffId of bulkSelectedStaffIds) {
                for (const s of bulkModalShifts) {
                    if (!s.start || !s.end) continue;

                    const saveSingleBulkEntry = async (data: any) => {
                        return api.createTherapistSchedule(staffId, {
                            ...data,
                            branch_id: selectedBranchId
                        });
                    };

                    if (s.repeatType === 'none') {
                        await saveSingleBulkEntry({ date: bulkStartDate, start_time: s.start, end_time: s.end });
                    } else {
                        if (s.endRepeatType === 'specific' && s.endRepeatDate) {
                            const startAt = new Date(bulkStartDate);
                            const endAt = new Date(s.endRepeatDate);
                            const targetDays = s.repeatType === 'daily' ? daysMap : s.repeatType === 'weekly' ? [selectedDayName] : s.repeatDays;

                            let current = new Date(startAt);
                            while (current <= endAt) {
                                const currentDayName = daysMap[current.getDay()];
                                if (targetDays.includes(currentDayName)) {
                                    await saveSingleBulkEntry({ date: formatDateKey(current), start_time: s.start, end_time: s.end });
                                }
                                current.setDate(current.getDate() + 1);
                            }
                        } else {
                            const targetDays = s.repeatType === 'daily' ? ['daily'] : s.repeatType === 'weekly' ? [selectedDayName] : s.repeatDays;
                            for (const day of targetDays) {
                                await saveSingleBulkEntry({
                                    day_of_week: day,
                                    start_date: bulkStartDate,
                                    end_date: null,
                                    start_time: s.start,
                                    end_time: s.end
                                });
                            }
                        }
                    }
                }
            }

            fetchShifts();
            setShowBulkScheduleModal(false);
            toast.success('Jadwal massal berhasil disimpan');
        } catch (error: any) {
            console.error('Failed to save bulk shift', error);
            if (error.message?.includes('409') || error.status === 409) {
                toast.error('Gagal menyimpan jadwal massal. Beberapa jadwal mungkin sudah ada atau bentrok.');
            } else {
                toast.error('Gagal menyimpan jadwal massal. Silakan coba lagi.');
            }
        } finally {
            setIsSavingBulkShift(false);
        }
    };

    const confirmDeleteStaff = async () => {
        if (!deleteStaffModal.staffId) return;
        setDeleteStaffModal(prev => ({ ...prev, loading: true }));
        try {
            await api.deleteTherapist(deleteStaffModal.staffId);
            setStaffList(prev => prev.filter(s => s.id !== deleteStaffModal.staffId));
            await fetchStaffList();
            toast.success('Staff berhasil dihapus');
            setDeleteStaffModal({ show: false, staffId: null, loading: false });
        } catch (error) {
            console.error('Failed to delete staff:', error);
            toast.error('Gagal menghapus staff');
            setDeleteStaffModal(prev => ({ ...prev, loading: false }));
        }
    };

    const [showKomisiPopup, setShowKomisiPopup] = useState<'layanan' | 'produk' | null>(null);
    const [komisiDefault, setKomisiDefault] = useState({ layanan: 0, produk: 0 });
    const [serviceKomisiMode, setServiceKomisiMode] = useState<'percent' | 'rupiah'>('percent');
    const [productKomisiMode, setProductKomisiMode] = useState<'percent' | 'rupiah'>('percent');
    const [useDefaultLayanan, setUseDefaultLayanan] = useState(true);
    const [useDefaultProduk, setUseDefaultProduk] = useState(true);
    const [komisiPopupSearch, setKomisiPopupSearch] = useState('');
    const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);

    const [showDateFilter, setShowDateFilter] = useState(false);
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);
    const [activeRowStaffEdit, setActiveRowStaffEdit] = useState<number | null>(null);
    const [selectedKomisiStaff, setSelectedKomisiStaff] = useState<StaffMember | null>(null);
    const [komisiDateRange, setKomisiDateRange] = useState(() => {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return { start: formatDateKey(start), end: formatDateKey(today) };
    });
    const [komisiQuickOption, setKomisiQuickOption] = useState('this_week');
    const [selectedKomisiBranch, setSelectedKomisiBranch] = useState<number | null>(null);
    const [komisiStaffList, setKomisiStaffList] = useState<StaffMember[]>([]);
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const [serviceSearchQuery, setServiceSearchQuery] = useState('');

    const [showEditKomisiTransaction, setShowEditKomisiTransaction] = useState(false);
    const [selectedKomisiTransaction, setSelectedKomisiTransaction] = useState<CommissionData | null>(null);
    const [editKomisiValue, setEditKomisiValue] = useState(0);

    const [newStaffForm, setNewStaffForm] = useState({
        nama: '',
        gender: 'disable' as 'disable' | 'pria' | 'wanita',
        phone: '',
        email: '',
        izinPengguna: 'Basic',
        bookingAgenda: false,
        bookingOnline: true,
        warnaAgenda: '#00BCD4',
        tanggalMulai: '',
        tanggalAkhir: '',
        staffTitle: '',
        catatan: '',
        mediaSosial: '',
        selectedLocations: [] as number[],
        // ── selectedServices now stores "serviceId" or "serviceId:variantId" keys
        selectedServices: [] as string[],
        photoFile: null as File | null,
        photoPreview: '',
        branch_id: null as number | null
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // ── Flat list of selectable units (service without variants | individual variants)
    const selectableServices = useMemo<SelectableService[]>(() => {
        const result: SelectableService[] = [];
        for (const group of servicesByCategory) {
            for (const svc of group.services) {
                if (svc.variants && svc.variants.length > 0) {
                    for (const v of svc.variants) {
                        result.push({
                            key: `${svc.id}:${v.id}`,
                            label: `${svc.name} — ${v.name}`,
                            serviceId: svc.id,
                            variantId: v.id,
                        });
                    }
                } else {
                    result.push({
                        key: `${svc.id}`,
                        label: svc.name,
                        serviceId: svc.id,
                        variantId: null,
                    });
                }
            }
        }
        return result;
    }, [servicesByCategory]);

    const isFormValid = useMemo(() => {
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStaffForm.email);
        const isPhoneValid = newStaffForm.phone.length >= 8 && /^\d+$/.test(newStaffForm.phone);
        const hasLocation = newStaffForm.selectedLocations.length > 0;
        const hasService = newStaffForm.selectedServices.length > 0;

        return (
            newStaffForm.nama.trim() !== '' &&
            isEmailValid &&
            isPhoneValid &&
            newStaffForm.gender !== 'disable' &&
            hasLocation &&
            hasService
        );
    }, [newStaffForm]);

    const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [servicesList, setServicesList] = useState<{ id: number, name: string, price?: number }[]>([]);
    const [productsList, setProductsList] = useState<{ id: number, name: string, price?: number, variant_id?: number }[]>([]);
const [serviceCommissions, setServiceCommissions] = useState<{ 
    service_id: number, 
    service_variant_id?: number | null,  // ← tambah
    commission_rate: number, 
    commission_type: 'percent' | 'fixed' 
}[]>([]);
    const [productCommissions, setProductCommissions] = useState<{ product_id: number, product_variant_id?: number, commission_rate: number, commission_type: 'percent' | 'fixed' }[]>([]);
    const [commissions, setCommissions] = useState<CommissionData[]>([]);
    const [commissionPage, setCommissionPage] = useState(1);
    const [commissionMeta, setCommissionMeta] = useState({ total: 0, last_page: 1, current_page: 1 });

    useEffect(() => {
        if (useDefaultProduk && showKomisiPopup === 'produk') {
            const mode = productKomisiMode === 'rupiah' ? 'fixed' : 'percent';
            setProductCommissions(productsList.map(p => ({
                product_id: p.id,
                product_variant_id: p.variant_id,
                commission_rate: komisiDefault.produk || 0,
                commission_type: mode
            })));
        }
    }, [komisiDefault.produk, productKomisiMode, useDefaultProduk, productsList, showKomisiPopup]);

    useEffect(() => {
        if (useDefaultLayanan && showKomisiPopup === 'layanan') {
            const mode = serviceKomisiMode === 'rupiah' ? 'fixed' : 'percent';
const rows: { service_id: number, service_variant_id?: number | null, commission_rate: number, commission_type: 'percent' | 'fixed' }[] = [];

            servicesByCategory.forEach(group => {
                group.services.forEach(svc => {
                    if (svc.variants.length > 0) {
svc.variants.forEach(v => rows.push({ service_id: svc.id, service_variant_id: v.id, commission_rate: komisiDefault.layanan || 0, commission_type: mode }));
} else {
    rows.push({ service_id: svc.id, service_variant_id: null, commission_rate: komisiDefault.layanan || 0, commission_type: mode });
                    }
                });
            });
            setServiceCommissions(rows);
        }
    }, [komisiDefault.layanan, serviceKomisiMode, useDefaultLayanan, servicesByCategory, showKomisiPopup]);

    const fetchCommissions = useCallback(async () => {
        try {
            const params: CommissionParams & { page: number, search?: string, limit?: number } = {
                branch_id: selectedKomisiBranch,
                start_date: komisiDateRange.start,
                end_date: komisiDateRange.end,
                page: commissionPage,
                search: searchQuery,
                limit: 10
            };
            if (selectedKomisiStaff?.id) {
                params.staff_id = selectedKomisiStaff.id;
            }
            const res = await api.getCommissions(params);

            if (res.data && Array.isArray(res.data)) {
                setCommissions(res.data);
                setCommissionMeta({
                    total: res.total || 0,
                    last_page: res.last_page || 1,
                    current_page: res.current_page || 1
                });
            } else if (Array.isArray(res)) {
                setCommissions(res);
                setCommissionMeta({ total: res.length, last_page: 1, current_page: 1 });
            } else {
                setCommissions([]);
                setCommissionMeta({ total: 0, last_page: 1, current_page: 1 });
            }
        } catch (e) {
            console.error("Failed to fetch commissions", e);
            setCommissions([]);
        }
    }, [selectedKomisiBranch, komisiDateRange, selectedKomisiStaff, commissionPage, searchQuery]);

    const handleSaveEditCommission = async () => {
        if (!selectedKomisiTransaction) return;
        try {
            await api.updateCommission(selectedKomisiTransaction.id, {
                amount: editKomisiValue
            });
            toast.success('Nilai komisi berhasil diperbarui');
            setShowEditKomisiTransaction(false);
            fetchCommissions();
        } catch (error) {
            console.error('Failed to update commission:', error);
            toast.error('Gagal memperbarui nilai komisi');
        }
    };

    const handleUpdateCommissionStaff = async (commissionId: number, staffId: number) => {
        try {
            await api.updateCommission(commissionId, {
                therapist_id: staffId
            });
            toast.success('Staff komisi berhasil diperbarui');
            setActiveRowStaffEdit(null);
            fetchCommissions();
        } catch (error) {
            console.error('Failed to update commission staff:', error);
            toast.error('Gagal memperbarui staff komisi');
        }
    };

    const fetchShifts = useCallback(async () => {
        try {
            let start = new Date(currentDate);
            let end = new Date(currentDate);

            if (viewMode === 'week') {
                const week = getWeekDates(currentDate);
                start = week[0];
                end = week[6];
            } else {
                start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            }

            const res = await api.getTherapistSchedule({
                start_date: formatDateKey(start),
                end_date: formatDateKey(end),
                branch_id: selectedBranchId
            });

            const backendShifts = res.data || (Array.isArray(res) ? res : []);
            const mappedShifts: ShiftData[] = backendShifts.map((s: any) => ({
                id: s.id,
                staffId: s.staffId || s.therapist_id,
                date: s.date,
                startTime: s.startTime || (s.start_time ? s.start_time.substring(0, 5) : '09:00'),
                endTime: s.endTime || (s.end_time ? s.end_time.substring(0, 5) : '17:00'),
                type: s.type
            }));
            setShifts(mappedShifts);

        } catch (e) {
            console.error("Failed to fetch shifts", e);
        }
    }, [currentDate, viewMode, selectedBranchId]);

    useEffect(() => {
        const loadStaticData = async () => {
            try {
                try {
                    const branches = await api.getBranches();
                    setBranchList(branches);
                } catch (err) {
                    console.error('Error loading branches:', err);
                }

                // ── Load services grouped by category, including variants ──────────
                try {
                    setIsLoadingServices(true);
                    const categoriesRes = await api.getServiceCategories();
                    const cats = Array.isArray(categoriesRes) ? categoriesRes : [];

                    const grouped: ServiceCategory[] = [];
                    const flatServices: { id: number; name: string; price?: number }[] = [];

                    for (const cat of cats) {
                        try {
                            const res = await api.getServices({ service_category_id: cat.id, per_page: 200 });
                            const data = res.data || (Array.isArray(res) ? res : []);

                            const services: ServiceItem[] = data.map((s: any) => {
                                const variants: ServiceVariant[] = (s.variants || []).map((v: any) => ({
                                    id: v.id,
                                    name: v.name,
                                    price: v.price || v.retail_price || 0,
    special_price: v.special_price ? parseFloat(v.special_price) : null,
 // ← tambah

                                }));
                                return {
                                    id: s.id,
                                    name: s.name,
                                    price: s.price || 0,
                                    variants,
                                };
                            });

                            if (services.length > 0) {
                                grouped.push({ category: { id: cat.id, name: cat.name }, services });
                                // flatten for komisi servicesList (no variant detail needed there)
                                services.forEach(svc => flatServices.push({ id: svc.id, name: svc.name, price: svc.price }));
                            }
                        } catch (err) {
                            console.error(`Failed to load services for category ${cat.id}`, err);
                        }
                    }

                    setServicesByCategory(grouped);
                    setServicesList(flatServices);
                } catch (err) {
                    console.error('Error loading services by category:', err);
                } finally {
                    setIsLoadingServices(false);
                }
                // ─────────────────────────────────────────────────────────────────

                try {
                    const productsRes = await api.getProducts({ limit: 1000 });
                    const productsResData = Array.isArray(productsRes?.data) ? productsRes.data : Array.isArray(productsRes) ? productsRes : [];
                    const flattenedProducts: { id: number, name: string, price?: number, variant_id?: number }[] = [];

                    productsResData.forEach((p: any) => {
                        const variants = Array.isArray(p.variants) ? p.variants : (p.variants ? Object.values(p.variants) : []);

                        if (variants.length > 0) {
                            variants.forEach((v: any) => {
                                flattenedProducts.push({
                                    id: p.id,
                                    variant_id: v.id,
                                    name: `${p.name} - ${v.name}`,
                                    price: v.retail_price || 0
                                });
                            });
                        } else {
                            flattenedProducts.push({
                                id: p.id,
                                name: p.name,
                                price: p.retail_price || 0
                            });
                        }
                    });
                    setProductsList(flattenedProducts);
                } catch (err) {
                    console.error('Error loading products:', err);
                }
            } catch (err) {
                console.error('Unexpected error in loadStaticData:', err);
            }
        };
        loadStaticData();
    }, []);

    const fetchStaffList = useCallback(async () => {
        try {
            const branchQuery = (selectedBranchId && Number(selectedBranchId) > 0) ? { branch_id: selectedBranchId } : undefined;
            const therapistsRes = await api.getTherapists(branchQuery);

            const staff = (Array.isArray(therapistsRes) ? therapistsRes : therapistsRes.data || []).map((t: TherapistResponse, i: number) => ({
                id: t.id,
                name: t.name,
                role: t.specialization || 'Terapis',
                email: t.email,
                phone: t.phone,
                photo: t.photo || null,
                branch_id: t.branch_id,
                gender: t.gender,
                social_media: t.social_media,
                notes: t.notes,
                initials: t.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2),
                color: t.color || COLORS[i % COLORS.length],
                bookingStatus: 'Kalender Pemesanan diaktifkan',
                start_work_date: t.start_work_date,
                end_work_date: t.end_work_date,
                bookingOnline: (t as any).is_booking_online_enabled !== false,
                is_calendar_enabled: (t as any).is_calendar_enabled,  // ← tambah ini
            }));
            setStaffList(staff);
            setKomisiStaffList(staff);
        } catch (err) {
            console.error('Error loading staff data:', err);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        fetchStaffList();
        const fetchSettings = async () => {
            try {
                const settings = await api.getCompanySettings(selectedBranchId || undefined);
                const normalized = {
                    ...settings,
                    default_open_time: settings?.default_open_time || settings?.defaultOpenTime || '09:00',
                    default_close_time: settings?.default_close_time || settings?.defaultCloseTime || '22:00'
                };
                normalized.default_open_time = normalized.default_open_time.substring(0, 5);
                normalized.default_close_time = normalized.default_close_time.substring(0, 5);
                setCompanySettings(normalized);
            } catch (err) {
                console.error('Error fetching company settings:', err);
            }
        };
        fetchSettings();
    }, [fetchStaffList, selectedBranchId]);

    useEffect(() => {
        if (staffList.length > 0) {
            fetchShifts();
        }
    }, [currentDate, viewMode, selectedBranchId, staffList.length, fetchShifts]);

    useEffect(() => {
        setFilterStaffId('all');
    }, [selectedBranchId]);

    useEffect(() => {
        if (activeTab === 'komisi') {
            const fetchStaff = async () => {
                try {
                    const params = selectedKomisiBranch ? { branch_id: selectedKomisiBranch } : undefined;
                    const res = await api.getTherapists(params);
                    const staff = (Array.isArray(res) ? res : res.data || []).map((t: TherapistResponse, i: number) => ({
                        id: t.id,
                        name: t.name,
                        role: t.role || 'Terapis',
                        email: t.email,
                        phone: t.phone,
                        initials: t.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2),
                        color: COLORS[i % COLORS.length],
                        bookingStatus: 'Kalender Pemesanan diaktifkan'
                    }));
                    setKomisiStaffList(staff);
                } catch (e) {
                    console.error("Failed to fetch komisi staff", e);
                }
            };
            fetchStaff();
        }
    }, [activeTab, selectedKomisiBranch]);

    useEffect(() => {
        if (activeTab === 'komisi') {
            fetchCommissions();
        }
    }, [activeTab, fetchCommissions]);

const filteredStaffList = staffList.filter(s => {
    const matchesStaff = filterStaffId === 'all' || s.id === filterStaffId;
    if (!matchesStaff) return false;

    const week = getWeekDates(currentDate);
    const viewStart = viewMode === 'week' ? week[0] : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const viewEnd = viewMode === 'week' ? week[6] : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    viewStart.setHours(0, 0, 0, 0);
    viewEnd.setHours(23, 59, 59, 999);

    if (s.start_work_date) {
        const startDateStr = s.start_work_date.substring(0, 10);
        const viewEndStr = formatDateKey(viewEnd);
        if (startDateStr > viewEndStr) return false;
    }

    if (s.end_work_date) {
        const endDateStr = s.end_work_date.substring(0, 10);
        const viewStartStr = formatDateKey(viewStart);
        if (endDateStr < viewStartStr) return false;
    }

    return true;
});

    const getShiftForStaffAndDate = (staffId: number, date: Date) => shifts.filter(s => s.staffId === staffId && s.date === formatDateKey(date));

    const isDateValidForStaff = (staff: StaffMember, date: Date) => {
        const dStr = formatDateKey(date);
        const startDateRaw = staff.start_work_date || '';
        const endDateRaw = staff.end_work_date || '';

        if (startDateRaw) {
            const startStr = startDateRaw.substring(0, 10);
            if (dStr < startStr) return false;
        }

        if (endDateRaw) {
            const endStr = endDateRaw.substring(0, 10);
            if (dStr > endStr) return false;
        }

        return true;
    };

    const weekDates = getWeekDates(currentDate);
    const monthDates = getMonthDates(currentDate);

    const prevPeriod = () => { const d = new Date(currentDate); d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 30)); setCurrentDate(d); };
    const nextPeriod = () => { const d = new Date(currentDate); d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 30)); setCurrentDate(d); };

    const openShiftModal = (staff: StaffMember, date: Date) => {
        if (!isDateValidForStaff(staff, date)) return;
        const existing = getShiftForStaffAndDate(staff.id, date);
        setSelectedStaff(staff);
        setSelectedDate(date);
        setDeletedShiftTargets([]);

        if (existing.length > 0) {
            setModalShifts(existing.map(s => ({
                id: s.id,
                start: s.startTime,
                end: s.endTime,
                type: s.type,
                repeatType: 'none',
                repeatDays: [],
                endRepeatType: 'ongoing',
                endRepeatDate: ''
            })));
        } else {
            setModalShifts([{
                start: '',
                end: '',
                repeatType: 'none',
                repeatDays: [],
                endRepeatType: 'ongoing',
                endRepeatDate: ''
            }]);
        }
        setIsEditingShift(existing.length > 0);
        setShowShiftModal(true);
    };

    const handleSaveShift = async () => {
        if (!selectedStaff || !selectedDate) return;

        try {
            const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const selectedDayName = daysMap[selectedDate.getDay()];

            const saveSingleEntry = async (data: any, shiftId?: number) => {
                if (shiftId) {
                    return api.updateTherapistSchedule(shiftId, {
                        ...data,
                        branch_id: selectedBranchId
                    });
                }
                return api.createTherapistSchedule(selectedStaff.id, {
                    ...data,
                    branch_id: selectedBranchId
                });
            };

            for (const target of deletedShiftTargets) {
                try {
                    await api.deleteTherapistSchedule(target.id, { date: target.date });
                } catch (e) {
                    console.error("Failed to delete shift during sync", e);
                }
            }

            for (const s of modalShifts) {
                if (!s.start || !s.end) continue;

                if (s.repeatType === 'none') {
                    await saveSingleEntry({
                        date: formatDateKey(selectedDate),
                        day_of_week: null,
                        start_time: s.start,
                        end_time: s.end
                    }, s.id);
                } else {
                    if (s.endRepeatType === 'specific' && s.endRepeatDate) {
                        const startAt = new Date(selectedDate);
                        const endAt = new Date(s.endRepeatDate);
                        const targetDays = s.repeatType === 'daily'
                            ? daysMap
                            : s.repeatType === 'weekly'
                                ? [selectedDayName]
                                : s.repeatDays;

                        let current = new Date(startAt);
                        while (current <= endAt) {
                            const currentDayName = daysMap[current.getDay()];
                            if (targetDays.includes(currentDayName)) {
                                await saveSingleEntry({ date: formatDateKey(current), start_time: s.start, end_time: s.end });
                            }
                            current.setDate(current.getDate() + 1);
                        }
                    } else {
                        const targetDays = s.repeatType === 'daily'
                            ? ['daily']
                            : s.repeatType === 'weekly'
                                ? [selectedDayName]
                                : s.repeatDays;

                        for (const day of targetDays) {
                            await saveSingleEntry({
                                day_of_week: day,
                                date: null,
                                start_date: formatDateKey(selectedDate),
                                end_date: null,
                                start_time: s.start,
                                end_time: s.end
                            }, s.id);
                        }
                    }
                }
            }

            fetchShifts();
            setShowShiftModal(false);
            toast.success('Shift berhasil disimpan');
        } catch (error: any) {
            console.error('Failed to save shift', error);
            if (error.message?.includes('409') || error.status === 409) {
                toast.error('Gagal menyimpan shift. Jadwal untuk staf ini sudah ada di tanggal/waktu tersebut.');
            } else {
                toast.error('Gagal menyimpan shift. Silakan coba lagi nanti.');
            }
        }
    };

	   const handleDeleteShift = async () => {
	    if (!selectedStaff || !selectedDate) return;
	    
	    // Hapus hanya shift/tanggal yang sedang dibuka di modal (bukan semua rangkaian jadwal berulang)
	    const shiftId = modalShifts[0]?.id;
	    if (!shiftId) return;
	    const dateKey = formatDateKey(selectedDate);
	    
	    try {
	        await api.deleteTherapistSchedule(shiftId, { date: dateKey });
	        fetchShifts();
	        setShowShiftModal(false);
	        toast.success('Jadwal berhasil dihapus');
    } catch (error) {
        console.error("Failed to delete", error);
        toast.error('Gagal menghapus jadwal');
    }
};

    const validateStaffForm = (data: typeof newStaffForm) => {
        const errors: Record<string, string> = {};
        const nameRegex = /^[A-Za-z\s']+$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneClean = data.phone.replace(/[\s-]/g, '');

        if (data.nama && !nameRegex.test(data.nama)) {
            errors.nama = 'Nama staf hanya boleh berisi huruf';
        } else if (!data.nama.trim()) {
            errors.nama = 'Nama staf wajib diisi';
        }

        if (phoneClean && phoneClean.length < 8) {
            errors.phone = 'Nomor telepon minimal 8 digit';
        } else if (!phoneClean) {
            errors.phone = 'Nomor telepon wajib diisi';
        }

        if (data.email && !emailRegex.test(data.email)) {
            errors.email = 'Format email tidak valid';
        } else if (!data.email) {
            errors.email = 'Email wajib diisi';
        }

        if (data.gender === 'disable') {
            errors.gender = 'Harap pilih jenis kelamin';
        }

        if (data.tanggalMulai && data.tanggalAkhir) {
            if (new Date(data.tanggalAkhir) < new Date(data.tanggalMulai)) {
                errors.tanggalAkhir = 'Tanggal akhir tidak boleh mendahului tanggal mulai';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

  const handleSaveStaff = async () => {
    if (!validateStaffForm(newStaffForm)) {
        toast.error('Mohon perbaiki kesalahan pada formulir');
        return;
    }

    const genderMap: Record<string, string> = { 'pria': 'male', 'wanita': 'female' };
    const backendGender = genderMap[newStaffForm.gender] || 'female';

    const payload = {
        branch_id: newStaffForm.branch_id || selectedBranchId,
        name: newStaffForm.nama,
        email: newStaffForm.email,
        phone: newStaffForm.phone,
        gender: backendGender,
        specialization: newStaffForm.staffTitle || 'Terapis',
        social_media: newStaffForm.mediaSosial,
        notes: newStaffForm.catatan,
        start_work_date: newStaffForm.tanggalMulai || null,
        end_work_date: newStaffForm.tanggalAkhir || null,
        color: newStaffForm.warnaAgenda,
        is_booking_online_enabled: newStaffForm.bookingOnline,
        is_calendar_enabled: newStaffForm.bookingAgenda ? 1 : 0,

    };

    try {
        setIsUploadingPhoto(true);
        let therapistId = editingStaffId;

        if (editingStaffId) {
            await api.updateTherapist(editingStaffId, payload);
        } else {
            const result = await api.createTherapist(payload);
            therapistId = result.therapist?.id;
        }

        if (therapistId && newStaffForm.photoFile) {
            try {
                await api.uploadTherapistPhoto(therapistId, newStaffForm.photoFile);
            } catch (photoError) {
                console.error('Photo upload failed:', photoError);
            }
        }

     // ── Build finalServiceCommissions dari selectedServices keys ──
const finalServiceCommissions = newStaffForm.selectedServices.map(key => {
    const parts = key.split(':');
    const serviceId = parseInt(parts[0], 10);
    const variantId = parts[1] ? parseInt(parts[1], 10) : null;
    const existing = serviceCommissions.find((c: any) =>
        c.service_id === serviceId && (c.service_variant_id ?? null) === variantId
    );
    return {
        service_id: serviceId,
        service_variant_id: variantId,
        commission_rate: existing?.commission_rate ?? 0,
        commission_type: existing?.commission_type ?? (serviceKomisiMode === 'rupiah' ? 'fixed' : 'percent')
    };
}).filter((item, index, self) =>
    // Hapus duplikat: jika ada key "serviceId:variantId", skip row "serviceId" (tanpa variant) untuk service yang sama
    index === self.findIndex(t => t.service_id === item.service_id && t.service_variant_id === item.service_variant_id)
);

        const validProductCommissions = useDefaultProduk ? [] : productCommissions.filter(c => c.commission_rate > 0);

        if (therapistId && (finalServiceCommissions.length > 0 || komisiDefault.layanan > 0 || komisiDefault.produk > 0 || validProductCommissions.length > 0 || editingStaffId)) {
            try {
                await api.saveTherapistCommissions(therapistId, {
                    default_service_commission: komisiDefault.layanan,
                    default_product_commission: komisiDefault.produk,
                    service_commission_type: serviceKomisiMode === 'rupiah' ? 'fixed' : 'percent',
                    product_commission_type: productKomisiMode === 'rupiah' ? 'fixed' : 'percent',
                    commission_type: serviceKomisiMode === 'rupiah' ? 'fixed' : 'percent',
                    service_commissions: finalServiceCommissions,
                    product_commissions: validProductCommissions
                });
            } catch (commissionError) {
                console.error('Commission save failed:', commissionError);
            }
        }

        toast.success(editingStaffId ? 'Staff updated successfully' : 'Staff created successfully');
        await fetchStaffList();
        setShowAddStaffModal(false);
    } catch (error) {
        console.error('Failed to save staff', error);
        toast.error('Gagal menyimpan staff. Pastikan semua field wajib terisi (Nama, Telepon, Gender, Lokasi, dan Layanan).');
    } finally {
        setIsUploadingPhoto(false);
    }
};

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File terlalu besar. Maksimum 5MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewStaffForm(prev => ({
                    ...prev,
                    photoFile: file,
                    photoPreview: reader.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

const loadStaffCommissions = async (staffId: number): Promise<string[]> => {
    try {
        const data = await api.getTherapistCommissions(staffId);
           console.log('RAW API response:', data); // ← tambah ini
        console.log('service_commissions:', data.service_commissions); // ← tambah ini
        setKomisiDefault({
            layanan: parseFloat(data.default_service_commission) || 0,
            produk: parseFloat(data.default_product_commission) || 0
        });
        setServiceKomisiMode(data.service_commission_type === 'fixed' ? 'rupiah' : 'percent');
        setProductKomisiMode(data.product_commission_type === 'fixed' ? 'rupiah' : 'percent');

        let selectedKeys: string[] = [];

        if (data.service_commissions && Array.isArray(data.service_commissions)) {
            setServiceCommissions(data.service_commissions.map((c: any) => ({
                service_id: c.service_id,
                service_variant_id: c.service_variant_id ?? null,
                commission_rate: parseFloat(c.commission_rate) || 0,
                commission_type: c.commission_type === 'fixed' ? 'fixed' : 'percent'
            })));
            setUseDefaultLayanan(data.service_commissions.length === 0);

            selectedKeys = data.service_commissions.map((c: any) =>
                c.service_variant_id
                    ? `${c.service_id}:${c.service_variant_id}`
                    : `${c.service_id}`
            );
        } else {
            setServiceCommissions([]);
            setUseDefaultLayanan(true);
        }

        if (data.product_commissions && Array.isArray(data.product_commissions)) {
            setProductCommissions(data.product_commissions.map((c: any) => ({
                product_id: c.product_id,
                product_variant_id: c.product_variant_id,
                commission_rate: parseFloat(c.commission_rate) || 0,
                commission_type: c.commission_type === 'fixed' ? 'fixed' : 'percent'
            })));
            setUseDefaultProduk(data.product_commissions.length === 0);
        } else {
            setProductCommissions([]);
            setUseDefaultProduk(true);
        }

        return selectedKeys; // ← return keys, jangan set di sini
    } catch (error) {
        console.error('Failed to load commissions:', error);
        setServiceCommissions([]);
        return [];
    }
};

    const filteredStaff = staffList
        .filter(staff => {
            if (selectedBranchId && staff.branch_id && staff.branch_id !== selectedBranchId) {
                return false;
            }
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            if (searchCriteria === 'name') {
                return staff.name.toLowerCase().includes(query);
            } else if (searchCriteria === 'email') {
                return staff.email && staff.email.toLowerCase().includes(query);
            } else if (searchCriteria === 'phone') {
                return staff.phone && staff.phone.includes(searchQuery);
            } else if (searchCriteria === 'location') {
                const branchName = branchList.find(b => b.id === staff.branch_id)?.name || '';
                return branchName.toLowerCase().includes(query);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortOrder === 'asc') return a.name.localeCompare(b.name);
            return b.name.localeCompare(a.name);
        });

    const exportToCSV = () => {
        let csv = 'Nama,Email,Telepon,Peran,Lokasi\n';
        filteredStaff.forEach(staff => {
            const branchName = branchList.find(b => b.id === staff.branch_id)?.name || '-';
            csv += `"${staff.name}","${staff.email || '-'}","${staff.phone || '-'}","${staff.role || '-'}","${branchName}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `staff_members_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const exportToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Daftar Anggota Staf</h2>`;
        html += `<table border="1"><tr><th>Nama</th><th>Email</th><th>Telepon</th><th>Peran</th><th>Lokasi</th></tr>`;
        filteredStaff.forEach(staff => {
            const branchName = branchList.find(b => b.id === staff.branch_id)?.name || '-';
            html += `<tr><td>${staff.name}</td><td>${staff.email || '-'}</td><td>${staff.phone || '-'}</td><td>${staff.role || '-'}</td><td>${branchName}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `staff_members_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();
    };

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Daftar Anggota Staf</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
        </head><body>
        <h2>Daftar Anggota Staf</h2>
        <table><thead><tr><th>Nama</th><th>Email</th><th>Telepon</th><th>Peran</th><th>Lokasi</th></tr></thead><tbody>
        ${filteredStaff.map(staff => {
            const branchName = branchList.find(b => b.id === staff.branch_id)?.name || '-';
            return `<tr><td>${staff.name}</td><td>${staff.email || '-'}</td><td>${staff.phone || '-'}</td><td>${staff.role || '-'}</td><td>${branchName}</td></tr>`;
        }).join('')}
        </tbody></table>
        <script>window.onload=function(){window.print()}</script></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const exportCommissionToCSV = () => {
        let csv = 'No Faktur,Tanggal Faktur,Anggota Staf,Lokasi,Barang Terjual,Jumlah,Nilai Jual\n';
        commissions.forEach(row => {
            const staff = row.staff || row.therapist_name || '-';
            const location = row.lokasi || row.branch_name || 'Naqupos Spa Solo';
            const item = row.barang || row.item_name || '-';
            const qty = row.jumlah || row.quantity || 1;
            const amount = row.nilai || row.amount || 0;
            csv += `"${row.noFaktur || row.invoice_number}","${row.tanggal || row.date}","${staff}","${location}","${item}",${qty},${amount}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `komisi_staff_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const exportCommissionToExcel = () => {
        let html = `<html><head><meta charset="UTF-8"></head><body>`;
        html += `<h2>Rincian Komisi Staff</h2>`;
        html += `<table border="1"><thead><tr><th>No Faktur</th><th>Tanggal Faktur</th><th>Anggota Staf</th><th>Lokasi</th><th>Barang Terjual</th><th>Jumlah</th><th>Nilai Jual</th></tr></thead><tbody>`;
        commissions.forEach(row => {
            const staff = row.staff || row.therapist_name || '-';
            const location = row.lokasi || row.branch_name || 'Naqupos Spa Solo';
            const item = row.barang || row.item_name || '-';
            const qty = row.jumlah || row.quantity || 1;
            const amount = row.nilai || row.amount || 0;
            html += `<tr><td>${row.noFaktur || row.invoice_number}</td><td>${row.tanggal || row.date}</td><td>${staff}</td><td>${location}</td><td>${item}</td><td>${qty}</td><td>${formatCurrency(amount)}</td></tr>`;
        });
        html += `</tbody></table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `komisi_staff_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();
    };

    const exportCommissionToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = `<!DOCTYPE html><html><head><title>Rincian Komisi Staff</title>
        <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
        </head><body>
        <h2>Rincian Komisi Staff</h2>
        <table><thead><tr><th>No Faktur</th><th>Tanggal Faktur</th><th>Anggota Staf</th><th>Lokasi</th><th>Barang Terjual</th><th>Jumlah</th><th>Nilai Jual</th></tr></thead><tbody>
        ${commissions.map(row => {
            const staff = row.staff || row.therapist_name || '-';
            const location = row.lokasi || row.branch_name || 'Naqupos Spa Solo';
            const item = row.barang || row.item_name || '-';
            const qty = row.jumlah || row.quantity || 1;
            const amount = row.nilai || row.amount || 0;
            return `<tr><td>${row.noFaktur || row.invoice_number}</td><td>${row.tanggal || row.date}</td><td>${staff}</td><td>${location}</td><td>${item}</td><td>${qty}</td><td>${formatCurrency(amount)}</td></tr>`;
        }).join('')}
        </tbody></table>
        <script>window.onload=function(){window.print()}</script></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex justify-center border-b border-gray-200">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-#C58940 text-#B07835' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* JAM KERJA TAB */}
            {activeTab === 'jam-kerja' && (
                <>
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex rounded-lg overflow-hidden border border-gray-300">
                            <button onClick={() => setViewMode('week')} className={`px-5 py-2 text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-[#C58940] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Week</button>
                            <button onClick={() => setViewMode('month')} className={`px-5 py-2 text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-[#C58940] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Month</button>
                        </div>

                        {isSuperAdminOrAdmin && (globalBranchId === 'all' || globalBranchId === '') && (
                            <BranchSelector
                                selectedBranchId={selectedBranchId}
                                onBranchChange={(id) => setSelectedBranchId(id)}
                                showAllOption={true}
                                allOptionLabel="Semua Cabang"
                                className="min-w-[200px]"
                            />
                        )}

                        <div className="w-[180px]">
                            <SearchableSelect
                                value={filterStaffId}
                                onChange={(val: string | number) => setFilterStaffId(val === 'all' ? 'all' : Number(val))}
                                options={[
                                    { value: 'all', label: 'Semua Staff' },
                                    ...staffList.map(s => ({ value: s.id, label: s.name }))
                                ]}
                            />
                        </div>

                        <div className="ml-auto flex items-center gap-2 relative">
                            <button onClick={prevPeriod} className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200"><ChevronLeft size={18} /></button>
                            <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium">
                                📅 {viewMode === 'month' ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}` : `${weekDates[0].getDate().toString().padStart(2, '0')} ${MONTHS[weekDates[0].getMonth()]} - ${weekDates[6].getDate().toString().padStart(2, '0')} ${MONTHS[weekDates[6].getMonth()]}, ${currentDate.getFullYear()}`}
                            </button>
                            <button onClick={nextPeriod} className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200"><ChevronRight size={18} /></button>

                            {showMonthPicker && viewMode === 'month' && (
                                <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-xl z-20 p-4 w-64">
                                    <div className="flex items-center justify-between mb-4">
                                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))} className="p-1 hover:bg-gray-100 rounded">«</button>
                                        <span className="font-medium">{currentDate.getFullYear()}</span>
                                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))} className="p-1 hover:bg-gray-100 rounded">»</button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {MONTHS.map((m, i) => (
                                            <button key={m} onClick={() => { setCurrentDate(new Date(currentDate.getFullYear(), i, 1)); setShowMonthPicker(false); }}
                                                className={`py-2 rounded text-sm ${currentDate.getMonth() === i ? 'bg-[#C58940] text-white' : 'hover:bg-gray-100'}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showMonthPicker && viewMode === 'week' && (
                                <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-xl z-20 p-4 min-w-[280px]">
                                    <div className="flex items-center justify-between mb-3">
                                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded">«</button>
                                        <span className="font-medium">{currentDate.getFullYear()} {MONTHS[currentDate.getMonth()]}</span>
                                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded">»</button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                                        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-gray-500 py-1">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {(() => {
                                            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
                                            const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                                            const days = [];
                                            for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
                                            for (let d = 1; d <= daysInMonth; d++) {
                                                const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                                const isCurrentWeek = weekDates.some(wd => wd.toDateString() === thisDate.toDateString());
                                                const isTodayDate = isToday(thisDate);
                                                days.push(
                                                    <button key={d} onClick={() => { setCurrentDate(thisDate); setShowMonthPicker(false); }}
                                                        className={`p-2 text-sm rounded-full ${isTodayDate ? 'bg-[#C58940] text-white font-bold' : isCurrentWeek ? 'bg-[#C58940]/20 text-[#C58940]' : 'hover:bg-gray-100'}`}>
                                                        {d}
                                                    </button>
                                                );
                                            }
                                            return days;
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Week View */}
                    {viewMode === 'week' && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3 text-left w-52"><span className="text-[#C58940] text-sm font-medium">Staf ({filteredStaffList.length})</span></th>
                                    {weekDates.map((date, i) => {
                                        const isTodayDate = isToday(date);
                                        return (
                                            <th key={i} className={`px-2 py-3 text-center ${isTodayDate ? 'bg-blue-50 border-b-2 border-blue-500' : ''}`}>
                                                <div className="text-xs text-gray-500">{DAYS[date.getDay()]}</div>
                                                <div className={`text-sm ${isTodayDate ? 'text-blue-600 font-bold' : ''}`}>{date.getDate()} {MONTHS[date.getMonth()]} {date.getFullYear().toString().slice(-2)}</div>
                                            </th>
                                        );
                                    })}
                                </tr></thead>
                                <tbody>
                                    {filteredStaffList.length > 0 ? (
                                        filteredStaffList.map(staff => (
                                            <tr key={staff.id} className="border-b border-gray-100 hover:bg-gray-50">
                                             <td className="px-4 py-3">
    <div className="flex items-center gap-3">
        <StaffAvatar staff={staff} size="sm" />
        <div>
            <p className="text-sm font-medium">{staff.name}</p>
            {staff.role && <p className="text-xs text-gray-500">{staff.role}</p>}
            {!staff.bookingOnline && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 text-[10px] font-bold uppercase">
                    Tidak menerima booking online
                </span>
            )}
        </div>
    </div>
</td>
                                                {weekDates.map((date, i) => {
                                                    const shiftsFound = getShiftForStaffAndDate(staff.id, date);
                                                    const shift = shiftsFound[0];
                                                    const isTodayDate = isToday(date);
                                                    const isValid = isDateValidForStaff(staff, date);
                                                    return (
                                                        <td key={i} className={`px-2 py-3 text-center ${isTodayDate ? 'bg-blue-50' : ''} ${!isValid ? 'bg-gray-50/50' : ''}`}>
                                                        <button
    onClick={() => openShiftModal(staff, date)}
    disabled={!isValid || !staff.bookingOnline}
    className={`w-full py-1 text-sm transition-all ${
        !isValid || !staff.bookingOnline 
            ? 'opacity-40 cursor-not-allowed' 
            : 'hover:bg-gray-100 rounded'
    }`}
>
                                                                {!isValid ? (
                                                                    <span className="text-gray-300">-</span>
                                                                ) : shiftsFound.length > 1 ? (
                                                                    <span className="font-bold text-[#C58940]">{shiftsFound.length} Shifts</span>
                                                                ) : shift ? (
                                                                    <span className="font-medium">{shift.startTime} - {shift.endTime}</span>
                                                                ) : (
                                                                    <Plus size={16} className="mx-auto text-gray-400" />
                                                                )}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <User size={32} className="text-gray-300" />
                                                    <p className="font-medium">Belum ada data staff</p>
                                                    <p className="text-xs">Tambahkan staff atau ubah filter cabang untuk melihat jadwal</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}</tbody>
                            </table>
                        </div>
                    )}

                    {/* Month View */}
                    {viewMode === 'month' && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                            <table className="w-full min-w-max">
                                <thead><tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3 text-left w-52 sticky left-0 bg-gray-50 z-10">
                                        <span className="text-[#C58940] text-sm font-medium">Staf ({filteredStaffList.length})</span>
                                    </th>
                                    {monthDates.map((date, i) => {
                                        const isTodayDate = isToday(date);
                                        return (
                                            <th key={i} className={`px-1 py-3 text-center min-w-[32px] ${isTodayDate ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}>
                                                <div className={`text-xs font-medium ${isTodayDate ? 'text-blue-600' : ''}`}>{date.getDate()}</div>
                                            </th>
                                        );
                                    })}
                                </tr></thead>
                                <tbody>
                                    {filteredStaffList.length > 0 ? (
                                        filteredStaffList.map(staff => (
                                            <tr key={staff.id} className="border-b border-gray-100">
                                                <td className="px-4 py-3 sticky left-0 bg-white z-10">
                                                    <div className="flex items-center gap-3">
                                                        <StaffAvatar staff={staff} size="sm" />
                                                        <p className="text-sm font-medium">{staff.name}</p>
                                                    </div>
                                                </td>
                                                {monthDates.map((date, i) => {
                                                    const shiftsFound = getShiftForStaffAndDate(staff.id, date);
                                                    const hasShift = shiftsFound.length > 0;
                                                    const isTodayDate = isToday(date);
                                                    const isValid = isDateValidForStaff(staff, date);
                                                    return (
                                                        <td key={i} className={`px-1 py-2 text-center ${isTodayDate ? 'bg-blue-50' : ''} ${!isValid ? 'bg-gray-50/50' : ''}`}>
                                                            <button
                                                                onClick={() => openShiftModal(staff, date)}
                                                                disabled={!isValid}
                                                                className={`w-7 h-7 rounded transition-all flex items-center justify-center ${hasShift && isValid ? 'bg-[#C58940]' : (isValid ? 'hover:bg-gray-200' : 'bg-gray-50 cursor-not-allowed')}`}
                                                            >
                                                                {!isValid && <span className="text-[10px] text-gray-300">-</span>}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={monthDates.length + 1} className="px-4 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <User size={32} className="text-gray-300" />
                                                    <p className="font-medium">Belum ada data staff</p>
                                                    <p className="text-xs">Tambahkan staff untuk melihat kalender bulanan</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {filteredStaffList.length > 0 && (
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded"><ChevronLeft size={16} /></button>
                            <button className="w-8 h-8 bg-[#C58940] text-white rounded text-sm font-medium">1</button>
                            <button className="p-2 hover:bg-gray-100 rounded"><ChevronRight size={16} /></button>
                        </div>
                    )}
                </>
            )}

            {/* ANGGOTA STAF TAB */}
            {activeTab === 'anggota-staf' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        {(globalBranchId === 'all' || globalBranchId === '') && (
                            <BranchSelector
                                selectedBranchId={selectedBranchId}
                                onBranchChange={(id) => setSelectedBranchId(id)}
                                showAllOption={true}
                                allOptionLabel="Semua Lokasi"
                                className="min-w-[200px]"
                            />
                        )}

                        <div className="relative">
                            <button onClick={() => { setShowSortDropdown(!showSortDropdown); setShowDownloadDropdown(false); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50">
                                Pengurutan <ChevronDown size={14} />
                            </button>
                            {showSortDropdown && (
                                <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 w-40">
                                    <button onClick={() => { setSortOrder('asc'); setShowSortDropdown(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1] ${sortOrder === 'asc' ? 'bg-[#FAEAB1] text-[#C58940] font-medium' : ''}`}>Nama (A-Z)</button>
                                    <button onClick={() => { setSortOrder('desc'); setShowSortDropdown(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1] ${sortOrder === 'desc' ? 'bg-[#FAEAB1] text-[#C58940] font-medium' : ''}`}>Nama (Z-A)</button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button onClick={() => { setShowDownloadDropdown(!showDownloadDropdown); setShowSortDropdown(false); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50">
                                Unduh <ChevronDown size={14} />
                            </button>
                            {showDownloadDropdown && (
                                <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 w-32">
                                    <button onClick={() => { exportToPDF(); setShowDownloadDropdown(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1]">PDF</button>
                                    <button onClick={() => { exportToExcel(); setShowDownloadDropdown(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1]">XLS</button>
                                    <button onClick={() => { exportToCSV(); setShowDownloadDropdown(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1]">CSV</button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                            <div className="relative">
                                <button onClick={() => { setShowSearchCriteriaDropdown(!showSearchCriteriaDropdown); setShowSortDropdown(false); setShowDownloadDropdown(false); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 min-w-[120px]">
                                    {searchCriteria === 'name' ? 'Nama' : searchCriteria === 'phone' ? 'Nomor Ponsel' : searchCriteria === 'email' ? 'Email' : 'Lokasi'} <ChevronDown size={14} />
                                </button>
                                {showSearchCriteriaDropdown && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[140px]">
                                        <button onClick={() => { setSearchCriteria('name'); setShowSearchCriteriaDropdown(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1] ${searchCriteria === 'name' ? 'bg-[#FAEAB1] text-[#C58940] font-medium' : ''}`}>Nama</button>
                                        <button onClick={() => { setSearchCriteria('phone'); setShowSearchCriteriaDropdown(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1] ${searchCriteria === 'phone' ? 'bg-[#FAEAB1] text-[#C58940] font-medium' : ''}`}>Nomor Ponsel</button>
                                        <button onClick={() => { setSearchCriteria('email'); setShowSearchCriteriaDropdown(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1] ${searchCriteria === 'email' ? 'bg-[#FAEAB1] text-[#C58940] font-medium' : ''}`}>Email</button>
                                        {(globalBranchId === 'all' || globalBranchId === '') && (
                                            <button onClick={() => { setSearchCriteria('location'); setShowSearchCriteriaDropdown(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1] ${searchCriteria === 'location' ? 'bg-[#FAEAB1] text-[#C58940] font-medium' : ''}`}>Lokasi</button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ketik kata kunci"
                                    className="pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:border-[#C58940] outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-xs text-gray-500">
                                    <th className="px-4 py-3 text-left w-64">Nama</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">Telepon</th>
                                    {(globalBranchId === 'all' || globalBranchId === '') && <th className="px-4 py-3 text-left">Lokasi</th>}
                                    <th className="px-4 py-3 text-center w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.length > 0 ? (
                                    filteredStaff.map(staff => {
                                        const isResigned = staff.end_work_date && staff.end_work_date.substring(0, 10) < formatDateKey(new Date());
                                        return (
                                            <tr key={staff.id} className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${isResigned ? 'opacity-50' : ''}`} onClick={async() => {
                                                   setEditingStaffId(staff.id); 
                                              const keys = await loadStaffCommissions(staff.id); // ← await dulu
    setNewStaffForm({
        nama: staff.name,
        gender: staff.gender === 'male' ? 'pria' : (staff.gender === 'female' ? 'wanita' : 'disable'),
        phone: staff.phone || '',
        email: staff.email || '',
        izinPengguna: 'Basic',
     bookingAgenda: (staff as any).is_calendar_enabled !== false && (staff as any).is_calendar_enabled !== 0,
        bookingOnline: (staff as any).bookingOnline !== false,
        warnaAgenda: staff.color || '#00BCD4',
        tanggalMulai: staff.start_work_date ? staff.start_work_date.split('T')[0] : '',
        tanggalAkhir: staff.end_work_date ? staff.end_work_date.split('T')[0] : '',
        staffTitle: staff.role || '',
        catatan: staff.notes || '',
        mediaSosial: staff.social_media || '',
        selectedLocations: staff.branch_id ? [staff.branch_id] : [],
        selectedServices: keys, // ← pakai keys dari API
        photoFile: null,
        photoPreview: staff.photo || '',
        branch_id: staff.branch_id || null
    });
    setFormErrors({});
    setShowAddStaffModal(true);
                                            }}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <StaffAvatar staff={staff} size="sm" />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{staff.name}</p>
                                                                {isResigned && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase">Kontrak Berakhir</span>}
                                                                {!staff.bookingOnline && <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold uppercase">Booking Offline</span>}
                                                            </div>
                                                            <p className="text-xs text-gray-500">{mapRole(staff.role || '-')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-blue-600">{staff.email}</td>
                                                <td className="px-4 py-3 text-blue-600">{staff.phone}</td>
                                                {(globalBranchId === 'all' || globalBranchId === '') && (
                                                    <td className="px-4 py-3">
                                                        {branchList.find(b => b.id === staff.branch_id)?.name || '-'}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={async() => {
                                                                setEditingStaffId(staff.id);
                                                           const keys = await loadStaffCommissions(staff.id); // ← await dulu
setNewStaffForm({
    nama: staff.name,
    gender: staff.gender === 'male' ? 'pria' : (staff.gender === 'female' ? 'wanita' : 'disable'),
    phone: staff.phone || '',
    email: staff.email || '',
    izinPengguna: 'Basic',
bookingAgenda: (staff as any).is_calendar_enabled !== false && (staff as any).is_calendar_enabled !== 0,
    bookingOnline: (staff as any).bookingOnline !== false,
    warnaAgenda: staff.color || '#00BCD4',
    tanggalMulai: staff.start_work_date ? staff.start_work_date.split('T')[0] : '',
    tanggalAkhir: staff.end_work_date ? staff.end_work_date.split('T')[0] : '',
    staffTitle: staff.role || '',
    catatan: staff.notes || '',
    mediaSosial: staff.social_media || '',
    selectedLocations: staff.branch_id ? [staff.branch_id] : [],
    selectedServices: keys, // ← pakai hasil dari loadStaffCommissions
    photoFile: null,
    photoPreview: staff.photo || '',
    branch_id: staff.branch_id || null
});
setShowAddStaffModal(true);
                                                                setFormErrors({});
                                                            }}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        >
                                                            <Edit size={16} />
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteStaffModal({ show: true, staffId: staff.id, loading: false });
                                                            }}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8">
                                            <EmptyState
                                                title="Belum ada staf"
                                                message="Tidak ditemukan data staf untuk kriteria ini."
                                                icon={User}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <button onClick={() => {
                        setEditingStaffId(null);
                        setNewStaffForm({
                            nama: '', gender: 'disable', phone: '', email: '',
                            izinPengguna: 'Basic', bookingAgenda: false, bookingOnline: true, warnaAgenda: '#00BCD4',
                            tanggalMulai: formatDateKey(new Date()), tanggalAkhir: '', staffTitle: '', catatan: '',
                            mediaSosial: '', selectedLocations: [], selectedServices: [],
                            photoFile: null, photoPreview: '',
                            branch_id: (selectedBranchId) ? (selectedBranchId as number) : null
                        });
                        setKomisiDefault({ layanan: 0, produk: 0 });
                        setServiceCommissions([]);
                        setProductCommissions([]);
                        setUseDefaultLayanan(true);
                        setUseDefaultProduk(true);
                        setFormErrors({});
                        setShowAddStaffModal(true);
                    }} className="fixed bottom-8 right-8 w-16 h-16 bg-naqupos-primary hover:bg-[#B07835] text-white rounded-full flex items-center justify-center shadow-2xl shadow-orange-900/40 transition-all hover:scale-105 active:scale-95 z-40 group"><Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" /></button>

                    <ConfirmationModal
                        isOpen={deleteStaffModal.show}
                        onClose={() => setDeleteStaffModal({ show: false, staffId: null, loading: false })}
                        onConfirm={confirmDeleteStaff}
                        title="Hapus Staff"
                        message="Apakah Anda yakin ingin menghapus staf ini? Tindakan ini tidak dapat dibatalkan."
                        confirmLabel="Hapus"
                        type="danger"
                        isLoading={deleteStaffModal.loading}
                    />
                </div>
            )}

            {/* KOMISI TAB */}
            {activeTab === 'komisi' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        {isSuperAdminOrAdmin && (
                            <BranchSelector
                                selectedBranchId={selectedKomisiBranch}
                                onBranchChange={(id) => setSelectedKomisiBranch(id)}
                                showAllOption={true}
                                allOptionLabel="Semua Cabang"
                                className="min-w-[200px]"
                            />
                        )}

                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowStaffDropdown(!showStaffDropdown);
                                    setShowDateFilter(false);
                                    setShowDownloadDropdown(false);
                                    setStaffSearchQuery('');
                                }}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 flex items-center gap-2 min-w-[140px]"
                            >
                                {selectedKomisiStaff ? (
                                    <>
                                        <div className={`w-6 h-6 rounded-full ${selectedKomisiStaff.color} flex items-center justify-center text-xs font-medium`}>{selectedKomisiStaff.initials}</div>
                                        <span>{selectedKomisiStaff.name}</span>
                                    </>
                                ) : (
                                    <span className="text-gray-500">Semua Staff</span>
                                )}
                                <ChevronDown size={14} className={`transition-transform ${showStaffDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showStaffDropdown && (
                                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 w-64 p-2">
                                    <div className="relative mb-2">
                                        <input
                                            type="text"
                                            placeholder="Cari staff..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-[#C58940]"
                                            value={staffSearchQuery}
                                            onChange={(e) => setStaffSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                                        <button
                                            onClick={() => {
                                                setSelectedKomisiStaff(null);
                                                setShowStaffDropdown(false);
                                                setStaffSearchQuery('');
                                            }}
                                            className={`w-full px-3 py-2 text-left text-xs rounded hover:bg-[#FAEAB1] hover:text-[#C58940] ${!selectedKomisiStaff ? 'bg-[#FAEAB1] text-[#C58940] font-medium' : ''}`}
                                        >
                                            Semua Staff
                                        </button>
                                        {komisiStaffList
                                            .filter(s => {
                                                const matchesSearch = s.name.toLowerCase().includes(staffSearchQuery.toLowerCase());
                                                const matchesBranch = !selectedKomisiBranch ? true : Number(s.branch_id) === Number(selectedKomisiBranch);
                                                return matchesSearch && matchesBranch;
                                            })
                                            .map(staff => (
                                                <button
                                                    key={staff.id}
                                                    onClick={() => {
                                                        setSelectedKomisiStaff(staff);
                                                        setShowStaffDropdown(false);
                                                        setStaffSearchQuery('');
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs rounded hover:bg-[#FAEAB1] hover:text-[#C58940] ${selectedKomisiStaff?.id === staff.id ? 'bg-[#FAEAB1] text-[#C58940] font-medium' : ''}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full ${staff.color} flex items-center justify-center text-[10px]`}>{staff.initials}</div>
                                                    <span>{staff.name}</span>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowDateFilter(true)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 flex items-center gap-2"
                        >
                            📅 {(() => {
                                const start = new Date(komisiDateRange.start);
                                const end = new Date(komisiDateRange.end);
                                const optionLabels: Record<string, string> = {
                                    'today': 'Hari ini',
                                    'yesterday': 'Kemarin',
                                    'this_month': 'Bulan ini',
                                    'this_week': 'Minggu ini',
                                    '7_days': '7 hari sebelumnya',
                                    '30_days': '30 hari sebelumnya',
                                    'last_month': 'Bulan kemarin'
                                };
                                const label = optionLabels[komisiQuickOption];
                                return `${label ? label + ', ' : ''}${start.getDate()} ${MONTHS[start.getMonth()]} - ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
                            })()}
                        </button>

                        <div className="relative">
                            <button onClick={() => { setShowDownloadDropdown(!showDownloadDropdown); setShowSortDropdown(false); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50">
                                Unduh <ChevronDown size={14} />
                            </button>
                            {showDownloadDropdown && (
                                <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 w-32">
                                    <button onClick={() => { exportCommissionToPDF(); setShowDownloadDropdown(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1]">PDF</button>
                                    <button onClick={() => { exportCommissionToExcel(); setShowDownloadDropdown(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1]">XLS</button>
                                    <button onClick={() => { exportCommissionToCSV(); setShowDownloadDropdown(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAEAB1]">CSV</button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Ketik kata kunci"
                                className="pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm w-40 focus:border-[#C58940] outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-xs text-gray-500">
                                    <th className="px-4 py-3 text-left">No Faktur</th>
                                    <th className="px-4 py-3 text-left">Tanggal Faktur</th>
                                    <th className="px-4 py-3 text-left">Anggota Staf</th>
                                    <th className="px-4 py-3 text-left">Lokasi</th>
                                    <th className="px-4 py-3 text-left">Barang Terjual</th>
                                    <th className="px-4 py-3 text-right">Jumlah</th>
                                    <th className="px-4 py-3 text-right">Nilai Komisi</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commissions.length > 0 ? (
                                    commissions.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3 text-[#C58940] font-medium">{row.noFaktur || row.invoice_number}</td>
                                            <td className="px-4 py-3">{row.tanggal || row.date}</td>
                                            <td className="px-4 py-3 relative">
                                                <button
                                                    onClick={() => setActiveRowStaffEdit(activeRowStaffEdit === i ? null : i)}
                                                    className="text-[#C58940] hover:underline flex items-center gap-1"
                                                >
                                                    {row.staff || row.therapist_name} <Edit size={12} />
                                                </button>
                                                {activeRowStaffEdit === i && (
                                                    <div className="absolute left-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 w-48 p-2">
                                                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                                                            {komisiStaffList.map(staff => (
                                                                <button
                                                                    key={staff.id}
                                                                    onClick={() => handleUpdateCommissionStaff(row.id, staff.id)}
                                                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs rounded hover:bg-[#FAEAB1] hover:text-[#C58940]"
                                                                >
                                                                    <div className={`w-5 h-5 rounded-full ${staff.color} flex items-center justify-center text-[10px]`}>{staff.initials}</div>
                                                                    <span>{staff.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{row.lokasi || row.branch_name || 'Naqupos Spa Solo'}</td>
                                            <td className="px-4 py-3">{row.barang || row.item_name}</td>
                                            <td className="px-4 py-3 text-right">{row.jumlah || row.quantity || 1}</td>
                                            <td className="px-4 py-3 text-right">{new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
}).format(parseFloat(row.nilai || row.amount || 0))}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedKomisiTransaction(row);
                                                        setEditKomisiValue(row.nilai || row.amount || 0);
                                                        setShowEditKomisiTransaction(true);
                                                    }}
                                                    className="text-[#C58940] hover:text-[#B07835]"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Tidak ada data komisi</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {commissions.length > 0 && (
                        <div className="flex justify-end mt-4">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCommissionPage(p => Math.max(1, p - 1))}
                                    disabled={commissionPage === 1}
                                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={14} className="text-gray-600" />
                                </button>
                                {Array.from({ length: commissionMeta.last_page }, (_, i) => i + 1)
                                    .filter(p => {
                                        if (commissionMeta.last_page <= 5) return true;
                                        return Math.abs(p - commissionPage) <= 1 || p === 1 || p === commissionMeta.last_page;
                                    })
                                    .map((p, i, arr) => {
                                        const showDots = i > 0 && p !== arr[i - 1] + 1;
                                        return (
                                            <React.Fragment key={p}>
                                                {showDots && <span className="px-1 text-gray-400">...</span>}
                                                <button
                                                    onClick={() => setCommissionPage(p)}
                                                    className={`w-8 h-8 rounded-lg border text-xs font-medium transition-all ${commissionPage === p ? 'bg-[#C58940] text-white border-[#C58940] shadow-sm' : 'bg-white hover:bg-[#FAEAB1] hover:text-[#C58940] border-gray-200'}`}
                                                >
                                                    {p}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                                <button
                                    onClick={() => setCommissionPage(p => Math.min(commissionMeta.last_page, p + 1))}
                                    disabled={commissionPage === commissionMeta.last_page}
                                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={14} className="text-gray-600" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Date Filter Popup */}
            {showDateFilter && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-[#453C67]">Date Filter</h3>
                            <button onClick={() => setShowDateFilter(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 flex gap-6">
                            <div className="space-y-2 w-40">
                                <button onClick={() => { const today = new Date(); const str = formatDateKey(today); setKomisiDateRange({ start: str, end: str }); setKomisiQuickOption('today'); }} className="w-full py-2 px-3 text-sm border rounded-lg hover:bg-[#FAEAB1] text-left">Hari ini</button>
                                <button onClick={() => { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const str = formatDateKey(yesterday); setKomisiDateRange({ start: str, end: str }); setKomisiQuickOption('yesterday'); }} className="w-full py-2 px-3 text-sm border rounded-lg hover:bg-[#FAEAB1] text-left">Kemarin</button>
                                <button onClick={() => { const today = new Date(); const firstDay = new Date(today.getFullYear(), today.getMonth(), 1); setKomisiDateRange({ start: formatDateKey(firstDay), end: formatDateKey(today) }); setKomisiQuickOption('this_month'); }} className="w-full py-2 px-3 text-sm border rounded-lg hover:bg-[#FAEAB1] text-left">Bulan ini</button>
                                <button onClick={() => { const today = new Date(); const start = new Date(today); start.setDate(today.getDate() - today.getDay()); setKomisiDateRange({ start: formatDateKey(start), end: formatDateKey(today) }); setKomisiQuickOption('this_week'); }} className="w-full py-2 px-3 text-sm border rounded-lg hover:bg-[#FAEAB1] text-left">Minggu ini</button>
                                <button onClick={() => { const today = new Date(); const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(today.getDate() - 7); setKomisiDateRange({ start: formatDateKey(sevenDaysAgo), end: formatDateKey(today) }); setKomisiQuickOption('7_days'); }} className="w-full py-2 px-3 text-sm border rounded-lg hover:bg-[#FAEAB1] text-left">7 hari sebelumnya</button>
                                <button onClick={() => { const today = new Date(); const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(today.getDate() - 30); setKomisiDateRange({ start: formatDateKey(thirtyDaysAgo), end: formatDateKey(today) }); setKomisiQuickOption('30_days'); }} className="w-full py-2 px-3 text-sm border rounded-lg hover:bg-[#FAEAB1] text-left">30 hari sebelumnya</button>
                                <button onClick={() => { const today = new Date(); const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0); setKomisiDateRange({ start: formatDateKey(firstDayLastMonth), end: formatDateKey(lastDayLastMonth) }); setKomisiQuickOption('last_month'); }} className="w-full py-2 px-3 text-sm border rounded-lg hover:bg-[#FAEAB1] text-left">Bulan kemarin</button>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 block mb-1">Mulai Tanggal</label>
                                        <input type="date" value={komisiDateRange.start} onChange={(e) => { const newStart = e.target.value; setKomisiDateRange(prev => { const updates = { ...prev, start: newStart }; if (prev.end && prev.end < newStart) { updates.end = newStart; } return updates; }); }} className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 block mb-1">Sampai Tanggal</label>
                                        <input type="date" value={komisiDateRange.end} onChange={(e) => setKomisiDateRange(prev => ({ ...prev, end: e.target.value }))} min={komisiDateRange.start} className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-medium">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">Previous Month</button>
                                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">Today</button>
                                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">Next Month</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="py-2 text-gray-500 font-medium">{d}</div>)}
                                        {(() => {
                                            const year = currentDate.getFullYear();
                                            const month = currentDate.getMonth();
                                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                                            const firstDayRaw = new Date(year, month, 1).getDay();
                                            const startingEmptyDays = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

                                            return Array.from({ length: 42 }, (_, i) => {
                                                const day = i - startingEmptyDays + 1;
                                                const isValidDay = day > 0 && day <= daysInMonth;
                                                if (!isValidDay) return <div key={i}></div>;

                                                const dateObj = new Date(year, month, day);
                                                const dateStr = formatDateKey(dateObj);
                                                const isStart = dateStr === komisiDateRange.start;
                                                const isEnd = dateStr === komisiDateRange.end;
                                                const isInRange = dateStr >= komisiDateRange.start && dateStr <= komisiDateRange.end;

                                                let bgClass = 'hover:bg-gray-100';
                                                if (isStart || isEnd) bgClass = 'bg-[#C58940] text-white hover:bg-[#B07835]';
                                                else if (isInRange) bgClass = 'bg-[#FAEAB1] text-[#805000]';

                                                return (
                                                    <button key={i} onClick={() => {
                                                        if (komisiDateRange.start === komisiDateRange.end) {
                                                            if (dateStr >= komisiDateRange.start) setKomisiDateRange(prev => ({ ...prev, end: dateStr }));
                                                            else setKomisiDateRange({ start: dateStr, end: dateStr });
                                                        } else {
                                                            setKomisiDateRange({ start: dateStr, end: dateStr });
                                                        }
                                                    }} className={`py-2 rounded transition-colors ${bgClass}`}>{day}</button>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setShowDateFilter(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">Reset</button>
                            <button onClick={() => setShowDateFilter(false)} className="px-6 py-2 bg-[#2E8B57] text-white rounded-lg font-medium hover:bg-[#267349]">Terapkan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transaction Commission Modal */}
            {showEditKomisiTransaction && selectedKomisiTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-[#453C67]">Edit Komisi</h3>
                            <button onClick={() => setShowEditKomisiTransaction(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="text-gray-500 block">No Faktur</label>
                                    <p className="font-medium">{selectedKomisiTransaction.noFaktur}</p>
                                </div>
                                <div>
                                    <label className="text-gray-500 block">Tanggal</label>
                                    <p className="font-medium">{selectedKomisiTransaction.tanggal}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-gray-500 block">Item</label>
                                    <p className="font-medium">{selectedKomisiTransaction.barang}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-gray-500 block">Staff</label>
                                    <p className="font-medium text-[#C58940]">{selectedKomisiTransaction.staff}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t">
                                <label className="block text-sm font-medium mb-2">Nilai Komisi (Rp)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                    <input type="number" value={editKomisiValue} onChange={(e) => setEditKomisiValue(Number(e.target.value))} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#C58940] focus:border-[#C58940] outline-none" />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Ubah manual nilai komisi untuk transaksi ini.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setShowEditKomisiTransaction(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">Batal</button>
                            <button onClick={handleSaveEditCommission} className="px-6 py-2 bg-[#C58940] text-white rounded-lg font-medium hover:bg-[#B07835]">Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Modal */}
            {showShiftModal && selectedStaff && selectedDate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[#453C67]">Jam Kerja - {selectedStaff.name}</h3>
                            <button onClick={() => setShowShiftModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-8">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hari Terpilih</label>
                                <p className="text-lg font-bold text-[#453C67]">{DAYS[selectedDate.getDay()]}, {selectedDate.getDate().toString().padStart(2, '0')} {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</p>
                            </div>

                            <div className="space-y-10">
                                {modalShifts.map((shift, index) => (
                                    <div key={index} className="space-y-6 p-5 bg-gray-50/50 rounded-2xl border border-gray-100 relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-black text-[#C58940] uppercase tracking-widest">Shift {index + 1}</h4>
                                            {modalShifts.length > 1 && (
                                                <button
	                                                    onClick={() => {
	                                                        const shiftToRemove = modalShifts[index];
	                                                        if (shiftToRemove.id) setDeletedShiftTargets(prev => [...prev, { id: shiftToRemove.id!, date: formatDateKey(selectedDate) }]);
	                                                        setModalShifts(prev => prev.filter((_, i) => i !== index));
	                                                    }}
                                                    className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                                                >
                                                    <Trash2 size={14} /> Hapus
                                                </button>
                                            )}
                                        </div>

                                        {(() => {
                                            const openTime = companySettings?.default_open_time || '08:00';
                                            const closeTime = companySettings?.default_close_time || '22:00';
                                            const startErr = shift.start && (shift.start < openTime || shift.start >= closeTime) ? `Harus antara ${openTime} – ${closeTime}` : '';
                                            const endErr = shift.end && (shift.end <= (shift.start || openTime) || shift.end > closeTime) ? `Harus setelah ${shift.start || openTime} dan maks ${closeTime}` : '';
                                            return (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 block mb-2">Shift Mulai</label>
                                                        <div className="relative">
                                                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C58940]" />
                                                            <TimePickerFiltered value={shift.start} min={openTime} max={getMaxStartTime(closeTime)} onChange={(val) => { const newShifts = [...modalShifts]; newShifts[index].start = val; if (newShifts[index].end && newShifts[index].end <= val) newShifts[index].end = ''; setModalShifts(newShifts); }} />
                                                        </div>
                                                        {startErr && <p className="text-[10px] text-red-500 mt-1 font-bold">{startErr}</p>}
                                                        <p className="text-[10px] text-gray-400 mt-0.5">Buka: {openTime}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 block mb-2">Shift Berakhir</label>
                                                        <div className="relative">
                                                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C58940]" />
                                                            <TimePickerFiltered value={shift.end} min={shift.start || openTime} max={closeTime} onChange={(val) => { const newShifts = [...modalShifts]; newShifts[index].end = val; setModalShifts(newShifts); }} />
                                                        </div>
                                                        {endErr && <p className="text-[10px] text-red-500 mt-1 font-bold">{endErr}</p>}
                                                        <p className="text-[10px] text-gray-400 mt-0.5">Tutup: {closeTime}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="pt-4 border-t border-dashed border-gray-200 space-y-5">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 block mb-2">Perulangan untuk Shift {index + 1}</label>
                                                <div className="flex gap-2 flex-wrap">
                                                    {[{ id: 'none', label: 'Tidak berulang' }, { id: 'weekly', label: 'Mingguan' }, { id: 'daily', label: 'Setiap Hari' }, { id: 'custom', label: 'Kustom' }].map(opt => (
                                                        <button key={opt.id} onClick={() => { const newShifts = [...modalShifts]; newShifts[index].repeatType = opt.id as any; setModalShifts(newShifts); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${shift.repeatType === opt.id ? 'bg-[#C58940] text-white border-[#C58940] shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{opt.label}</button>
                                                    ))}
                                                </div>
                                            </div>

                                            {shift.repeatType === 'custom' && (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[{ id: 'monday', label: 'Sen' }, { id: 'tuesday', label: 'Sel' }, { id: 'wednesday', label: 'Rab' }, { id: 'thursday', label: 'Kam' }, { id: 'friday', label: 'Jum' }, { id: 'saturday', label: 'Sab' }, { id: 'sunday', label: 'Min' }].map(day => (
                                                        <button key={day.id} onClick={() => { const newShifts = [...modalShifts]; const currentDays = newShifts[index].repeatDays; newShifts[index].repeatDays = currentDays.includes(day.id) ? currentDays.filter(d => d !== day.id) : [...currentDays, day.id]; setModalShifts(newShifts); }} className={`py-2 rounded-lg text-[10px] font-black border transition-all ${shift.repeatDays.includes(day.id) ? 'bg-[#C58940] border-[#C58940] text-white' : 'bg-white border-gray-200 text-gray-400'}`}>{day.label}</button>
                                                    ))}
                                                </div>
                                            )}

                                            {shift.repeatType !== 'none' && (
                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold text-gray-500 block">Akhir Perulangan (Shift {index + 1})</label>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { const newShifts = [...modalShifts]; newShifts[index].endRepeatType = 'ongoing'; setModalShifts(newShifts); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${shift.endRepeatType === 'ongoing' ? 'bg-[#C58940] text-white border-[#C58940]' : 'bg-white text-gray-500 border-gray-200'}`}>Berlangsung</button>
                                                        <button onClick={() => { const newShifts = [...modalShifts]; newShifts[index].endRepeatType = 'specific'; setModalShifts(newShifts); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${shift.endRepeatType === 'specific' ? 'bg-[#C58940] text-white border-[#C58940]' : 'bg-white text-gray-500 border-gray-200'}`}>Sampai Tanggal</button>
                                                    </div>
                                                    {shift.endRepeatType === 'specific' && (
                                                        <input type="date" value={shift.endRepeatDate} onChange={(e) => { const newShifts = [...modalShifts]; newShifts[index].endRepeatDate = e.target.value; setModalShifts(newShifts); }} min={formatDateKey(selectedDate)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:border-[#C58940] outline-none" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <button onClick={() => setModalShifts(prev => [...prev, { start: '', end: '', repeatType: 'none', repeatDays: [], endRepeatType: 'ongoing', endRepeatDate: '' }])} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-[#C58940] font-bold hover:bg-orange-50 hover:border-[#C58940] transition-all group">
                                    <Plus size={20} className="group-hover:scale-125 transition-transform" />
                                    Tambah Shift Baru di Hari Ini
                                </button>
                            </div>

                            {isEditingShift && modalShifts.length === 1 && (
                                <button onClick={handleDeleteShift} className="w-full py-3 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-red-100 transition-colors">
                                    <Trash2 size={16} /> Hapus Jadwal dari Kalender
                                </button>
                            )}
                        </div>
                        <div className="p-4 border-t flex gap-3 bg-white sticky bottom-0">
                            <button onClick={() => setShowShiftModal(false)} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">Batal</button>
                            <button onClick={handleSaveShift} disabled={modalShifts.some(s => !s.start || !s.end)} className={`flex-1 py-3.5 rounded-xl font-bold transition-all shadow-md ${!modalShifts.some(s => !s.start || !s.end) ? 'bg-[#C58940] text-white hover:bg-[#B07835] hover:shadow-lg active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                Simpan Semua Jadwal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Staff Modal */}
            {showAddStaffModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 py-5">
                    <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl h-[95vh] flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b shrink-0 bg-white z-20">
                            <div>
                                <h2 className="text-xl font-bold text-[#453C67]">{editingStaffId ? 'Edit Anggota Staf' : 'Tambah Anggota Staf'}</h2>
                                <p className="text-sm text-gray-500">Lengkapi informasi staff di bawah ini</p>
                            </div>
                            <button onClick={() => { setShowAddStaffModal(false); setFormErrors({}); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-500" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-12">
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#FAEAB1] text-[#C58940] flex items-center justify-center text-sm font-bold">1</div>
                                    Informasi Dasar
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 ml-11">
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nama <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="Nama Lengkap" className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-[#C58940] focus:border-[#C58940] outline-none transition-all ${formErrors.nama ? 'border-red-500' : 'border-gray-300'}`} value={newStaffForm.nama} onChange={e => { const val = e.target.value; setNewStaffForm(prev => { const newData = { ...prev, nama: val }; validateStaffForm(newData); return newData; }); }} />
                                            {formErrors.nama && <p className="text-[10px] text-red-500 mt-1 ml-1">{formErrors.nama}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin <span className="text-red-500">*</span></label>
                                            <div className={`flex bg-gray-100 rounded-xl p-1 border transition-all ${formErrors.gender ? 'border-red-500' : 'border-gray-200'}`}>
                                                {['Disable', 'Pria', 'Wanita'].map(g => (
                                                    <button key={g} onClick={() => { const newVal = g.toLowerCase() as 'disable' | 'pria' | 'wanita'; setNewStaffForm(prev => { const newData = { ...prev, gender: newVal }; validateStaffForm(newData); return newData; }); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${newStaffForm.gender === g.toLowerCase() ? 'bg-white text-[#C58940] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{g}</button>
                                                ))}
                                            </div>
                                            {formErrors.gender && <p className="text-[10px] text-red-500 mt-1 ml-1">{formErrors.gender}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Ponsel <span className="text-red-500">*</span></label>
                                            <div className="flex">
                                                <span className="px-3 py-2.5 bg-gray-100 text-gray-600 border border-r-0 border-gray-300 rounded-l-xl font-medium flex items-center text-sm">+62</span>
                                                <input type="text" placeholder="8123456789" className={`flex-1 px-4 py-2.5 bg-white border rounded-r-xl focus:ring-[#C58940] focus:border-[#C58940] outline-none transition-all ${formErrors.phone ? 'border-red-500' : 'border-gray-300'}`} value={newStaffForm.phone} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, ''); setNewStaffForm(prev => { const newData = { ...prev, phone: val }; validateStaffForm(newData); return newData; }); }} />
                                            </div>
                                            {formErrors.phone && <p className="text-[10px] text-red-500 mt-1 ml-1">{formErrors.phone}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                                            <input type="email" placeholder="alamat@email.com" className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-[#C58940]/20 focus:border-[#C58940] outline-none transition-all ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`} value={newStaffForm.email} onChange={e => { const val = e.target.value; setNewStaffForm(prev => { const newData = { ...prev, email: val }; validateStaffForm(newData); return newData; }); }} />
                                            {formErrors.email && <p className="text-[10px] text-red-500 mt-1 ml-1">{formErrors.email}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Instagram / Social Media</label>
                                            <div className="relative group">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-lg text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform">IG</div>
                                                <input type="text" placeholder="@username" className="w-full pl-14 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#C58940]/20 focus:border-[#C58940] outline-none transition-all" value={newStaffForm.mediaSosial} onChange={e => setNewStaffForm({ ...newStaffForm, mediaSosial: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-sm font-medium text-gray-700">Aktifkan Booking Agenda</label>
                                                <button onClick={() => setNewStaffForm({ ...newStaffForm, bookingAgenda: !newStaffForm.bookingAgenda })} className={`w-11 h-6 rounded-full p-1 transition-colors ${newStaffForm.bookingAgenda ? 'bg-[#C58940]' : 'bg-gray-300'}`}>
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${newStaffForm.bookingAgenda ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>
                                            {newStaffForm.bookingAgenda && (
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                    <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Warna Agenda Kalender</label>
                                                    <div className="flex flex-wrap gap-3">
                                                        {AGENDA_COLORS.map(c => (
                                                            <button key={c} onClick={() => setNewStaffForm({ ...newStaffForm, warnaAgenda: c })} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${newStaffForm.warnaAgenda === c ? 'ring-2 ring-offset-2 ring-[#C58940]' : ''}`} style={{ backgroundColor: c }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700 block">Aktifkan Booking Online</label>
                                                    <p className="text-xs text-gray-500">Staff akan muncul di halaman booking pelanggan</p>
                                                </div>
                                                <button onClick={() => setNewStaffForm({ ...newStaffForm, bookingOnline: !newStaffForm.bookingOnline })} className={`w-11 h-6 rounded-full p-1 transition-colors ${newStaffForm.bookingOnline ? 'bg-[#C58940]' : 'bg-gray-300'}`}>
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${newStaffForm.bookingOnline ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        {/* Photo Upload */}
                                        <label className="flex flex-col items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#C58940] hover:bg-[#C58940]/5 transition-all group cursor-pointer">
                                            <input type="file" accept="image/jpeg,image/png,image/jpg,image/gif" onChange={handlePhotoChange} className="hidden" />
                                            {newStaffForm.photoPreview ? (
                                                <img
                                                    src={(() => {
                                                        const photo = newStaffForm.photoPreview;
                                                        if (photo.startsWith('data:') || photo.startsWith('blob:')) return photo;
                                                        return buildPhotoUrl(photo);
                                                    })()}
                                                    alt="Preview"
                                                    className="w-20 h-20 rounded-full object-cover shadow-sm mb-3 group-hover:scale-110 transition-transform"
                                                    onError={(e) => {
                                                        const img = e.target as HTMLImageElement;
                                                        const photo = newStaffForm.photoPreview;
                                                        if (!img.src.includes('zafaranbe.memofy-dev.my.id') && !photo.startsWith('data:') && !photo.startsWith('blob:')) {
                                                            const path = photo.startsWith('/') ? photo : `/${photo}`;
                                                            img.src = `${OLD_STORAGE_URL}${path}`;
                                                        } else {
                                                            img.style.display = 'none';
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                                    <User size={32} />
                                                </div>
                                            )}
                                            <p className="text-sm font-medium text-gray-600 group-hover:text-[#C58940]">{newStaffForm.photoPreview ? 'Ganti Foto' : 'Upload Foto Profil'}</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                            {isUploadingPhoto && <p className="text-xs text-[#C58940] mt-2">Mengupload...</p>}
                                        </label>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Mulai Bekerja</label>
                                                <input type="date" className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-[#C58940] focus:border-[#C58940] outline-none text-sm ${formErrors.tanggalMulai ? 'border-red-500' : 'border-gray-300'}`} value={newStaffForm.tanggalMulai} onChange={e => { const val = e.target.value; setNewStaffForm(prev => { const newData = { ...prev, tanggalMulai: val }; validateStaffForm(newData); return newData; }); }} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Akhir Bekerja</label>
                                                <input type="date" className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-[#C58940] focus:border-[#C58940] outline-none text-sm ${formErrors.tanggalAkhir ? 'border-red-500' : 'border-gray-300'}`} value={newStaffForm.tanggalAkhir} onChange={e => { const val = e.target.value; setNewStaffForm(prev => { const newData = { ...prev, tanggalAkhir: val }; validateStaffForm(newData); return newData; }); }} />
                                                {formErrors.tanggalAkhir && <p className="text-[10px] text-red-500 mt-1 ml-1">{formErrors.tanggalAkhir}</p>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Staff Title</label>
                                            <input type="text" placeholder="Contoh: Senior Therapist" className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-[#C58940] focus:border-[#C58940] outline-none transition-all" value={newStaffForm.staffTitle} onChange={e => setNewStaffForm({ ...newStaffForm, staffTitle: e.target.value })} />
                                            <p className="text-xs text-gray-500 mt-1 ml-1">*Ditampilkan di halaman booking online</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Catatan Internal</label>
                                            <textarea placeholder="Catatan khusus tentang staff ini..." className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-[#C58940] focus:border-[#C58940] outline-none transition-all h-24 resize-none" value={newStaffForm.catatan} onChange={e => setNewStaffForm({ ...newStaffForm, catatan: e.target.value })}></textarea>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <hr className="border-gray-100" />

                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#FAEAB1] text-[#C58940] flex items-center justify-center text-sm font-bold">2</div>
                                    Lokasi Penugasan <span className="text-red-500">*</span>
                                </h3>
                                <div className="ml-11">
                                    <div className="relative mb-4 group">
                                        <input type="text" placeholder="Cari cabang..." value={locationSearchQuery} onChange={(e) => setLocationSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C58940]/20 focus:border-[#C58940] outline-none transition-all" />
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C58940] transition-colors" />
                                    </div>
                                    <div className={`space-y-1 bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${newStaffForm.selectedLocations.length === 0 ? 'border-red-300' : 'border-gray-100'}`}>
                                        <label className="flex items-center justify-between p-3 hover:bg-[#FAEAB1]/30 cursor-pointer transition-colors border-b border-gray-50">
                                            <span className="font-medium text-gray-700">Semua Lokasi</span>
                                            <input type="checkbox" className="w-5 h-5 border-gray-300 rounded text-[#C58940] focus:ring-[#C58940]" checked={newStaffForm.selectedLocations.length === branchList.length && branchList.length > 0} onChange={() => { const allSelected = newStaffForm.selectedLocations.length === branchList.length; setNewStaffForm({ ...newStaffForm, selectedLocations: allSelected ? [] : branchList.map(b => b.id), branch_id: allSelected ? null : (branchList.length > 0 ? branchList[0].id : null) }); }} />
                                        </label>
                                        <div className="max-h-60 overflow-y-auto">
                                            {branchList.filter(b => b.name.toLowerCase().includes(locationSearchQuery.toLowerCase())).map(b => (
                                                <label key={b.id} className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                                                    <span className="text-sm text-gray-600">{b.name}</span>
                                                    <input type="checkbox" className="w-5 h-5 border-gray-300 rounded text-[#C58940] focus:ring-[#C58940]" checked={newStaffForm.selectedLocations.includes(b.id)} onChange={() => { const isSelected = newStaffForm.selectedLocations.includes(b.id); const newLocations = isSelected ? newStaffForm.selectedLocations.filter(id => id !== b.id) : [...newStaffForm.selectedLocations, b.id]; setNewStaffForm({ ...newStaffForm, selectedLocations: newLocations, branch_id: newLocations.length > 0 ? newLocations[0] : null }); }} />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    {newStaffForm.selectedLocations.length === 0 && <p className="text-[10px] text-red-500 mt-1 ml-1">Pilih minimal satu lokasi penugasan</p>}
                                </div>
                            </section>

                            <hr className="border-gray-100" />

                            {/* ── STEP 3: Keahlian Layanan — grouped with variant support ── */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#FAEAB1] text-[#C58940] flex items-center justify-center text-sm font-bold">3</div>
                                    Keahlian Layanan <span className="text-red-500">*</span>
                                </h3>
                                <div className="ml-11">
                                    <div className="relative mb-4 group">
                                        <input
                                            type="text"
                                            placeholder="Cari layanan atau varian..."
                                            value={serviceSearchQuery}
                                            onChange={(e) => setServiceSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C58940]/20 focus:border-[#C58940] outline-none transition-all"
                                        />
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C58940] transition-colors" />
                                    </div>

                                    {/* Select All */}
                                    <div className="flex items-center justify-between px-3 py-2 mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-[#C58940] focus:ring-[#C58940]"
                                                checked={
                                                    selectableServices.length > 0 &&
                                                    selectableServices.every(s => newStaffForm.selectedServices.includes(s.key))
                                                }
                                                onChange={() => {
                                                    const allKeys = selectableServices.map(s => s.key);
                                                    const allSelected = allKeys.every(k => newStaffForm.selectedServices.includes(k));
                                                    setNewStaffForm(prev => ({
                                                        ...prev,
                                                        selectedServices: allSelected ? [] : allKeys
                                                    }));
                                                }}
                                            />
                                            <span className="text-sm font-medium text-gray-700">Pilih Semua Layanan</span>
                                        </label>
                                        <span className="text-xs text-gray-400">{newStaffForm.selectedServices.length} terpilih</span>
                                    </div>

                                    {isLoadingServices ? (
                                        <div className="flex justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-[#C58940] border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <div className={`border rounded-xl overflow-hidden shadow-sm ${newStaffForm.selectedServices.length === 0 ? 'border-red-300' : 'border-gray-100'}`}>
                                            {servicesByCategory
                                                .filter(group => {
                                                    if (!serviceSearchQuery) return true;
                                                    const q = serviceSearchQuery.toLowerCase();
                                                    return (
                                                        group.category.name.toLowerCase().includes(q) ||
                                                        group.services.some(s =>
                                                            s.name.toLowerCase().includes(q) ||
                                                            s.variants.some(v => v.name.toLowerCase().includes(q))
                                                        )
                                                    );
                                                })
                                                .map(group => {
                                                    const isCollapsed = servicesCategoryCollapsed[group.category.id] ?? false;
                                                    const q = serviceSearchQuery.toLowerCase();

                                                    // Filter services (and their variants) that match search
                                                    const filteredServices = group.services.filter(s => {
                                                        if (!serviceSearchQuery) return true;
                                                        return (
                                                            group.category.name.toLowerCase().includes(q) ||
                                                            s.name.toLowerCase().includes(q) ||
                                                            s.variants.some(v => v.name.toLowerCase().includes(q))
                                                        );
                                                    });

                                                    // All selectable keys under this category (respecting search)
                                                    const catKeys = filteredServices.flatMap(s =>
                                                        s.variants.length > 0
                                                            ? s.variants
                                                                .filter(v => !serviceSearchQuery || v.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || group.category.name.toLowerCase().includes(q))
                                                                .map(v => `${s.id}:${v.id}`)
                                                            : [`${s.id}`]
                                                    );

                                                    const allInCatSelected = catKeys.length > 0 && catKeys.every(k => newStaffForm.selectedServices.includes(k));
                                                    const someInCatSelected = catKeys.some(k => newStaffForm.selectedServices.includes(k));

                                                    return (
                                                        <div key={group.category.id} className="border-b border-gray-100 last:border-b-0">
                                                            {/* Category Header */}
                                                            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 rounded border-gray-300 text-[#C58940] focus:ring-[#C58940]"
                                                                    checked={allInCatSelected}
                                                                    ref={el => {
                                                                        if (el) el.indeterminate = !allInCatSelected && someInCatSelected;
                                                                    }}
                                                                    onChange={() => {
                                                                        if (allInCatSelected) {
                                                                            setNewStaffForm(prev => ({
                                                                                ...prev,
                                                                                selectedServices: prev.selectedServices.filter(k => !catKeys.includes(k))
                                                                            }));
                                                                        } else {
                                                                            setNewStaffForm(prev => ({
                                                                                ...prev,
                                                                                selectedServices: [...new Set([...prev.selectedServices, ...catKeys])]
                                                                            }));
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="flex-1 flex items-center gap-2 text-left"
                                                                    onClick={() => setServicesCategoryCollapsed(prev => ({
                                                                        ...prev,
                                                                        [group.category.id]: !prev[group.category.id]
                                                                    }))}
                                                                >
                                                                    <span className="text-sm font-semibold text-gray-700">{group.category.name}</span>
                                                                    <span className="text-xs text-gray-400">({catKeys.length})</span>
                                                                    <span className="ml-auto">
                                                                        {isCollapsed
                                                                            ? <ChevronRight size={14} className="text-gray-400" />
                                                                            : <ChevronDown size={14} className="text-gray-400" />
                                                                        }
                                                                    </span>
                                                                </button>
                                                            </div>

                                                            {/* Services + their variants */}
                                                            {!isCollapsed && (
                                                                <div className="bg-white">
                                                                    {filteredServices.map(svc => {
                                                                        const hasVariants = svc.variants.length > 0;

                                                                        if (!hasVariants) {
                                                                            // Simple service row — no variant breakdown
                                                                            const key = `${svc.id}`;
                                                                            return (
                                                                                <label
                                                                                    key={svc.id}
                                                                                    className="flex items-center justify-between px-4 py-2.5 pl-10 hover:bg-gray-50 cursor-pointer transition-colors border-t border-gray-50"
                                                                                >
                                                                                    <span className="text-sm text-gray-600 truncate mr-2">{svc.name}</span>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="w-4 h-4 border-gray-300 rounded text-[#C58940] focus:ring-[#C58940] flex-shrink-0"
                                                                                        checked={newStaffForm.selectedServices.includes(key)}
                                                                                        onChange={() => {
                                                                                            const isSelected = newStaffForm.selectedServices.includes(key);
                                                                                            setNewStaffForm(prev => ({
                                                                                                ...prev,
                                                                                                selectedServices: isSelected
                                                                                                    ? prev.selectedServices.filter(k => k !== key)
                                                                                                    : [...prev.selectedServices, key]
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </label>
                                                                            );
                                                                        }

                                                                        // Service with variants — show service name as sub-header + variant rows
                                                                        const filteredVariants = svc.variants.filter(v =>
                                                                            !serviceSearchQuery ||
                                                                            v.name.toLowerCase().includes(q) ||
                                                                            svc.name.toLowerCase().includes(q) ||
                                                                            group.category.name.toLowerCase().includes(q)
                                                                        );
                                                                        const variantKeys = filteredVariants.map(v => `${svc.id}:${v.id}`);
                                                                        const allVarsSelected = variantKeys.length > 0 && variantKeys.every(k => newStaffForm.selectedServices.includes(k));
                                                                        const someVarsSelected = variantKeys.some(k => newStaffForm.selectedServices.includes(k));

                                                                        return (
                                                                            <div key={svc.id} className="border-t border-gray-50">
                                                                                {/* Service sub-header with its own indeterminate checkbox */}
                                                                                <div className="flex items-center gap-2 px-4 py-2 pl-10 bg-gray-50/60">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="w-4 h-4 rounded border-gray-300 text-[#C58940] focus:ring-[#C58940]"
                                                                                        checked={allVarsSelected}
                                                                                        ref={el => {
                                                                                            if (el) el.indeterminate = !allVarsSelected && someVarsSelected;
                                                                                        }}
                                                                                        onChange={() => {
                                                                                            if (allVarsSelected) {
                                                                                                setNewStaffForm(prev => ({
                                                                                                    ...prev,
                                                                                                    selectedServices: prev.selectedServices.filter(k => !variantKeys.includes(k))
                                                                                                }));
                                                                                            } else {
                                                                                                setNewStaffForm(prev => ({
                                                                                                    ...prev,
                                                                                                    selectedServices: [...new Set([...prev.selectedServices, ...variantKeys])]
                                                                                                }));
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                    <span className="text-xs font-semibold text-gray-500">{svc.name}</span>
                                                                                    <span className="text-xs text-gray-400">({filteredVariants.length} varian)</span>
                                                                                </div>

                                                                                {/* Variant rows */}
                                                                                {filteredVariants.map(v => {
                                                                                    const vKey = `${svc.id}:${v.id}`;
                                                                                    return (
                                                                                        <label
                                                                                            key={v.id}
                                                                                            className="flex items-center justify-between px-4 py-2 pl-16 hover:bg-gray-50 cursor-pointer transition-colors border-t border-gray-50"
                                                                                        >
                                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                                <span className="text-[10px] text-gray-300 flex-shrink-0">└</span>
                                                                                                <span className="text-sm text-gray-600 truncate">{v.name}</span>
                                                                                                {v.price !== undefined && v.price > 0 && (
                                                                                                    <span className="text-[10px] text-gray-400 flex-shrink-0">Rp {formatCurrency(v.price)}</span>
                                                                                                )}
                                                                                            </div>
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                className="w-4 h-4 border-gray-300 rounded text-[#C58940] focus:ring-[#C58940] flex-shrink-0 ml-2"
                                                                                                checked={newStaffForm.selectedServices.includes(vKey)}
                                                                                                onChange={() => {
                                                                                                    const isSelected = newStaffForm.selectedServices.includes(vKey);
                                                                                                    setNewStaffForm(prev => ({
                                                                                                        ...prev,
                                                                                                        selectedServices: isSelected
                                                                                                            ? prev.selectedServices.filter(k => k !== vKey)
                                                                                                            : [...prev.selectedServices, vKey]
                                                                                                    }));
                                                                                                }}
                                                                                            />
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                            {servicesByCategory.length === 0 && !isLoadingServices && (
                                                <div className="py-8 text-center text-gray-400 text-sm">Tidak ada layanan tersedia</div>
                                            )}
                                        </div>
                                    )}

                                    {newStaffForm.selectedServices.length === 0 && (
                                        <p className="text-[10px] text-red-500 mt-2 ml-1">Pilih minimal satu keahlian layanan</p>
                                    )}
                                </div>
                            </section>
                            {/* ── end Keahlian Layanan ── */}

                            <hr className="border-gray-100" />

                            <section className="pb-16">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#FAEAB1] text-[#C58940] flex items-center justify-center text-sm font-bold">4</div>
                                    Pengaturan Komisi
                                </h3>
                                <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:border-[#C58940]/30 hover:bg-white hover:shadow-sm transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-semibold text-gray-800">Komisi Layanan</h4>
                                                <p className="text-xs text-gray-500 mt-1">Nilai standar untuk semua layanan</p>
                                            </div>
                                            <div className="p-2 bg-[#FAEAB1]/50 rounded-lg text-[#C58940]"><Sparkles size={20} /></div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                            <span className="text-sm font-medium text-gray-600">{komisiDefault.layanan > 0 ? (serviceKomisiMode === 'percent' ? `${komisiDefault.layanan}%` : `Rp ${formatCurrency(komisiDefault.layanan)}`) : 'Belum diatur'}</span>
                                            <button onClick={() => setShowKomisiPopup('layanan')} className="text-[#C58940] text-sm font-medium hover:underline">Atur nilai</button>
                                        </div>
                                    </div>

                                    <div className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:border-[#C58940]/30 hover:bg-white hover:shadow-sm transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-semibold text-gray-800">Komisi Produk</h4>
                                                <p className="text-xs text-gray-500 mt-1">Nilai standar untuk penjualan produk</p>
                                            </div>
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Sparkles size={20} /></div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                            <span className="text-sm font-medium text-gray-600">{komisiDefault.produk > 0 ? (productKomisiMode === 'percent' ? `${komisiDefault.produk}%` : `Rp ${formatCurrency(komisiDefault.produk)}`) : 'Belum diatur'}</span>
                                            <button onClick={() => setShowKomisiPopup('produk')} className="text-[#C58940] text-sm font-medium hover:underline">Atur nilai</button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="p-5 border-t shrink-0 bg-white flex items-center justify-end gap-3 rounded-b-xl z-20">
                            <button onClick={() => { setShowAddStaffModal(false); setFormErrors({}); }} className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors">Batal</button>
                            <button onClick={handleSaveStaff} disabled={!isFormValid || isUploadingPhoto} className={`px-8 py-2.5 rounded-xl font-medium transition-all ${isFormValid && !isUploadingPhoto ? 'bg-[#C58940] text-white hover:bg-[#B07835] shadow-lg shadow-orange-900/10 hover:-translate-y-0.5' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                {isUploadingPhoto ? 'Menyimpan...' : 'Simpan Staff'}
                            </button>
                        </div>

                        {/* Komisi Popup Modal */}
                        {showKomisiPopup && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                                <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-hidden">
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-[#453C67]">Komisi per {showKomisiPopup === 'layanan' ? 'Layanan' : 'Produk'}</h3>
                                        <button onClick={() => setShowKomisiPopup(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                                    </div>

                                    <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                                        <div>
                                            <label className="text-sm text-gray-500 block mb-2">Komisi {showKomisiPopup} default</label>
                                            <div className="flex">
                                                <input type="text" inputMode="numeric" pattern="[0-9]*" value={showKomisiPopup === 'layanan' ? (komisiDefault.layanan || '') : (komisiDefault.produk || '')} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); const numVal = val === '' ? 0 : parseInt(val, 10); setKomisiDefault(prev => ({ ...prev, [showKomisiPopup as string]: numVal })); }} className="flex-1 px-4 py-2 border rounded-l-lg focus:border-[#C58940] outline-none" placeholder="0" />
                                                <button onClick={() => showKomisiPopup === 'layanan' ? setServiceKomisiMode('percent') : setProductKomisiMode('percent')} className={`px-4 py-2 ${(showKomisiPopup === 'layanan' ? serviceKomisiMode : productKomisiMode) === 'percent' ? 'bg-[#C58940] text-white' : 'bg-gray-100'}`}>%</button>
                                                <button onClick={() => showKomisiPopup === 'layanan' ? setServiceKomisiMode('rupiah') : setProductKomisiMode('rupiah')} className={`px-4 py-2 rounded-r-lg ${(showKomisiPopup === 'layanan' ? serviceKomisiMode : productKomisiMode) === 'rupiah' ? 'bg-[#C58940] text-white' : 'bg-gray-100'}`}>Rp</button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={showKomisiPopup === 'layanan' ? useDefaultLayanan : useDefaultProduk} onChange={(e) => {
                                                if (showKomisiPopup === 'layanan') {
                                                    setUseDefaultLayanan(e.target.checked);
                                                if (e.target.checked) {
    const mode = serviceKomisiMode === 'rupiah' ? 'fixed' : 'percent';
    const rows: any[] = [];
    servicesByCategory.forEach(group => {
        group.services.forEach(svc => {
            if (svc.variants.length > 0) {
                svc.variants.forEach(v => rows.push({ service_id: svc.id, service_variant_id: v.id, commission_rate: komisiDefault.layanan, commission_type: mode }));
            } else {
                rows.push({ service_id: svc.id, service_variant_id: null, commission_rate: komisiDefault.layanan, commission_type: mode });
            }
        });
    });
    setServiceCommissions(rows);
}
                                                } else {
                                                    setUseDefaultProduk(e.target.checked);
                                                    if (e.target.checked) setProductCommissions(productsList.map(p => ({ product_id: p.id, product_variant_id: p.variant_id, commission_rate: komisiDefault.produk, commission_type: productKomisiMode === 'rupiah' ? 'fixed' : 'percent' })));
                                                }
                                            }} className="w-5 h-5 rounded border-gray-300 text-[#C58940] focus:ring-[#C58940]" />
                                            <span className="text-sm text-gray-600">Semua {showKomisiPopup} menggunakan komisi default yang sama</span>
                                        </div>

                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <input type="text" placeholder={`Cari ${showKomisiPopup === 'layanan' ? 'layanan' : 'produk'}...`} className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C58940]/20 focus:border-[#C58940]" value={komisiPopupSearch} onChange={(e) => setKomisiPopupSearch(e.target.value)} />
                                                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowOnlyAssigned(!showOnlyAssigned)}>
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#C58940] focus:ring-[#C58940]" checked={showOnlyAssigned} onChange={() => { }} />
                                                <span className="text-sm text-gray-600 truncate">{showKomisiPopup === 'layanan' ? 'Assigned services only' : 'Assigned products only'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-[#C58940]">
                                            <span>📍</span>
                                            <span>Lokasi: {newStaffForm.selectedLocations.length > 0 ? (newStaffForm.selectedLocations.length === branchList.length ? 'Semua Cabang' : branchList.filter(b => newStaffForm.selectedLocations.includes(b.id)).map(b => b.name).join(', ')) : 'Semua Cabang'}</span>
                                        </div>

                                        <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 border-b">
                                                    <tr className="text-left">
                                                        <th className="px-4 py-3">Nama</th>
                                                        <th className="px-4 py-3">Harga</th>
                                                        <th className="px-4 py-3">Komisi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {showKomisiPopup === 'layanan' ? (() => {
                                                        const q = komisiPopupSearch.toLowerCase();
                                                        const filteredGroups = servicesByCategory.map(group => ({
                                                            ...group,
                                                            services: group.services.filter(s => {
                                                                const matchesSearch = !q || group.category.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.variants.some(v => v.name.toLowerCase().includes(q));
                                                                if (!matchesSearch) return false;
                                                                if (!showOnlyAssigned) return true;
if (s.variants.length > 0) return s.variants.some(v => serviceCommissions.some(c => c.service_id === s.id && c.service_variant_id === v.id && c.commission_rate > 0));
return serviceCommissions.some(c => c.service_id === s.id && !c.service_variant_id && c.commission_rate > 0);
                                                            })
                                                        })).filter(g => g.services.length > 0);

                                                        if (filteredGroups.length === 0) return <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Tidak ada layanan ditemukan</td></tr>;

                                                        return filteredGroups.flatMap(group => {
                                                            const rows: React.ReactNode[] = [];

                                                            // Category header row
                                                            rows.push(
                                                                <tr key={`cat-${group.category.id}`} className="bg-gray-50 border-b">
                                                                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{group.category.name}</td>
                                                                </tr>
                                                            );

                                                            group.services.forEach(svc => {
                                                                if (svc.variants.length === 0) {
                                                                    // Simple service row — no variant
                                                                    const isMatch = (c: any) => c.service_id === svc.id && !c.variant_id;
                                                                    const existing = serviceCommissions.find(isMatch);
                                                                    rows.push(
                                                                        <tr key={`svc-${svc.id}`} className="border-b hover:bg-gray-50 transition-colors">
                                                                            <td className="px-4 py-3 font-medium text-gray-800 pl-6">{svc.name}</td>
                                                                            <td className="px-4 py-3 text-gray-600">{formatCurrency(svc.price || 0)}</td>
                                                                            <td className="px-4 py-3">
                                                                                <div className="flex items-center shadow-sm rounded-lg overflow-hidden border border-gray-200 w-fit">
                                                                                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={existing?.commission_rate || ''} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); const rate = val === '' ? 0 : parseInt(val, 10); setUseDefaultLayanan(false); setServiceCommissions(prev => { const ex = prev.find(isMatch); if (ex) return prev.map(c => isMatch(c) ? { ...c, commission_rate: rate } : c); return [...prev, { service_id: svc.id, commission_rate: rate, commission_type: 'percent' }]; }); }} className="w-20 px-2 py-1.5 focus:outline-none text-center font-medium" placeholder="0" />
                                                                                    <button onClick={() => { setUseDefaultLayanan(false); setServiceCommissions(prev => { const ex = prev.find(isMatch); if (ex) return prev.map(c => isMatch(c) ? { ...c, commission_type: 'percent' } : c); return [...prev, { service_id: svc.id, commission_rate: 0, commission_type: 'percent' }]; }); }} className={`px-3 py-1.5 text-xs font-bold transition-colors ${existing?.commission_type === 'percent' || !existing ? 'bg-[#C58940] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>%</button>
                                                                                    <button onClick={() => { setUseDefaultLayanan(false); setServiceCommissions(prev => { const ex = prev.find(isMatch); if (ex) return prev.map(c => isMatch(c) ? { ...c, commission_type: 'fixed' } : c); return [...prev, { service_id: svc.id, commission_rate: 0, commission_type: 'fixed' }]; }); }} className={`px-3 py-1.5 text-xs font-bold transition-colors ${existing?.commission_type === 'fixed' ? 'bg-[#C58940] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Rp</button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                } else {
                                                                    // Service sub-header
                                                                    rows.push(
                                                                        <tr key={`svc-header-${svc.id}`} className="border-b bg-gray-50/60">
                                                                            <td colSpan={3} className="px-4 py-1.5 pl-6 text-xs font-semibold text-gray-400">{svc.name}</td>
                                                                        </tr>
                                                                    );

                                                                    // Variant rows
                                                                    const filteredVariants = svc.variants.filter(v =>
                                                                        !q || v.name.toLowerCase().includes(q) || svc.name.toLowerCase().includes(q) || group.category.name.toLowerCase().includes(q)
                                                                    );
                                                                    filteredVariants.forEach(v => {
                                                                        const isMatchV = (c: any) => c.service_id === svc.id && (c.service_variant_id ?? c.variant_id) === v.id;
                                                                        const existingV = serviceCommissions.find(isMatchV);
                                                                        rows.push(
                                                                            <tr key={`svc-${svc.id}-var-${v.id}`} className="border-b hover:bg-gray-50 transition-colors">
                                                                                <td className="px-4 py-2.5 pl-10 text-gray-700">
                                                                                    <span className="text-gray-300 mr-1">└</span>{v.name}
                                                                                </td>
<td className="px-4 py-2.5 text-gray-600 text-sm">
    {v.special_price ? (
        <div className="flex flex-col">
            <span className="text-green-600 font-medium text-xs">{formatCurrency(v.special_price)}</span>
            <span className="line-through text-gray-400 text-xs">{formatCurrency(v.price || 0)}</span>
        </div>
    ) : (
        formatCurrency(v.price || 0)
    )}
</td>
                                                                                <td className="px-4 py-2.5">
                                                                                    <div className="flex items-center shadow-sm rounded-lg overflow-hidden border border-gray-200 w-fit">
                                                                                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={existingV?.commission_rate || ''} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); const rate = val === '' ? 0 : parseInt(val, 10); setUseDefaultLayanan(false); setServiceCommissions(prev => { const ex = prev.find(isMatchV); if (ex) return prev.map(c => isMatchV(c) ? { ...c, commission_rate: rate } : c); return [...prev, { service_id: svc.id, service_variant_id: v.id, commission_rate: rate, commission_type: 'percent' }]; }); }} className="w-20 px-2 py-1.5 focus:outline-none text-center font-medium" placeholder="0" />
                                                                                        <button onClick={() => { setUseDefaultLayanan(false); setServiceCommissions(prev => { const ex = prev.find(isMatchV); if (ex) return prev.map(c => isMatchV(c) ? { ...c, commission_type: 'percent' } : c); return [...prev, { service_id: svc.id, service_variant_id: v.id, commission_rate: 0, commission_type: 'percent' }]; }); }} className={`px-3 py-1.5 text-xs font-bold transition-colors ${existingV?.commission_type === 'percent' || !existingV ? 'bg-[#C58940] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>%</button>
                                                                                        <button onClick={() => { setUseDefaultLayanan(false); setServiceCommissions(prev => { const ex = prev.find(isMatchV); if (ex) return prev.map(c => isMatchV(c) ? { ...c, commission_type: 'fixed' } : c); return [...prev, { service_id: svc.id, service_variant_id: v.id, commission_rate: 0, commission_type: 'fixed' }]; }); }} className={`px-3 py-1.5 text-xs font-bold transition-colors ${existingV?.commission_type === 'fixed' ? 'bg-[#C58940] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Rp</button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    });
                                                                }
                                                            });

                                                            return rows;
                                                        });
                                                    })() : (() => {
                                                        const list = productsList.filter(p => {
                                                            const matchesSearch = p.name.toLowerCase().includes(komisiPopupSearch.toLowerCase());
                                                            if (!showOnlyAssigned) return matchesSearch;
                                                            return matchesSearch && productCommissions.some(c => { if (p.variant_id) return c.product_variant_id === p.variant_id; return c.product_id === p.id && !c.product_variant_id && c.commission_rate > 0; });
                                                        });
                                                        if (list.length === 0) return <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Tidak ada produk ditemukan</td></tr>;
                                                        return list.map((product) => {
                                                            const isMatch = (c: any) => { if (product.variant_id) return c.product_variant_id === product.variant_id; return c.product_id === product.id && !c.product_variant_id; };
                                                            const existingProductCommission = productCommissions.find(isMatch);
                                                            return (
                                                                <tr key={`${product.id}-${product.variant_id || 'main'}`} className="border-b hover:bg-gray-50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                                                                    <td className="px-4 py-3 text-gray-600">{formatCurrency(product.price || 0)}</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center shadow-sm rounded-lg overflow-hidden border border-gray-200 w-fit">
                                                                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={existingProductCommission?.commission_rate || ''} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); const rate = val === '' ? 0 : parseInt(val, 10); setUseDefaultProduk(false); setProductCommissions(prev => { const existing = prev.find(isMatch); if (existing) return prev.map(c => isMatch(c) ? { ...c, commission_rate: rate } : c); return [...prev, { product_id: product.id, product_variant_id: product.variant_id, commission_rate: rate, commission_type: 'percent' }]; }); }} className="w-20 px-2 py-1.5 focus:outline-none text-center font-medium" placeholder="0" />
                                                                            <button onClick={() => { setUseDefaultProduk(false); setProductCommissions(prev => { const existing = prev.find(isMatch); if (existing) return prev.map(c => isMatch(c) ? { ...c, commission_type: 'percent' } : c); return [...prev, { product_id: product.id, product_variant_id: product.variant_id, commission_rate: 0, commission_type: 'percent' }]; }); }} className={`px-3 py-1.5 text-xs font-bold transition-colors ${existingProductCommission?.commission_type === 'percent' || !existingProductCommission ? 'bg-[#C58940] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>%</button>
                                                                            <button onClick={() => { setUseDefaultProduk(false); setProductCommissions(prev => { const existing = prev.find(isMatch); if (existing) return prev.map(c => isMatch(c) ? { ...c, commission_type: 'fixed' } : c); return [...prev, { product_id: product.id, product_variant_id: product.variant_id, commission_rate: 0, commission_type: 'fixed' }]; }); }} className={`px-3 py-1.5 text-xs font-bold transition-colors ${existingProductCommission?.commission_type === 'fixed' ? 'bg-[#C58940] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Rp</button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
                                        <button onClick={() => setShowKomisiPopup(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">Batal</button>
                                        <button onClick={() => setShowKomisiPopup(null)} className="px-6 py-2 bg-[#C58940] text-white rounded-lg font-medium hover:bg-[#B07835]">Simpan</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Action Button for Bulk Schedule */}
            {activeTab === 'jam-kerja' && (
                <button onClick={openBulkScheduleModal} className="fixed bottom-8 right-8 w-14 h-14 bg-[#C58940] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#B07835] hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white" title="Tambah Jadwal Massal">
                    <Plus size={32} />
                </button>
            )}

            {/* Bulk Schedule Modal */}
            {showBulkScheduleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-5 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-[#453C67]">Tambah Jadwal Massal</h3>
                                <p className="text-xs text-gray-500">Atur jadwal untuk beberapa staff sekaligus</p>
                            </div>
                            <button onClick={() => setShowBulkScheduleModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <section className="space-y-4">
                                <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#C58940] text-white flex items-center justify-center text-[10px]">1</div>
                                    Pilih Anggota Staf
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {staffList.map(staff => (
                                        <button key={staff.id} onClick={() => { setBulkSelectedStaffIds(prev => prev.includes(staff.id) ? prev.filter(id => id !== staff.id) : [...prev, staff.id]); }} className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${bulkSelectedStaffIds.includes(staff.id) ? 'bg-orange-50 border-[#C58940] shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                                            <div className={`w-8 h-8 rounded-full ${staff.color || 'bg-gray-100'} flex items-center justify-center text-xs font-bold shrink-0`}>{staff.initials}</div>
                                            <span className={`text-sm font-bold truncate ${bulkSelectedStaffIds.includes(staff.id) ? 'text-[#C58940]' : 'text-gray-700'}`}>{staff.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#C58940] text-white flex items-center justify-center text-[10px]">2</div>
                                    Tanggal Mulai
                                </label>
                                <input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} className="w-full max-w-xs px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#C58940] outline-none font-bold text-gray-700" />
                            </section>

                            <section className="space-y-6">
                                <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#C58940] text-white flex items-center justify-center text-[10px]">3</div>
                                    Tentukan Jam Kerja & Perulangan
                                </label>

                                <div className="space-y-6">
                                    {bulkModalShifts.map((shift, index) => (
                                        <div key={index} className="space-y-6 p-5 bg-gray-50 rounded-2xl border border-gray-100 relative">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-[#C58940] uppercase tracking-widest">Shift {index + 1}</h4>
                                                {bulkModalShifts.length > 1 && (
                                                    <button onClick={() => setBulkModalShifts(prev => prev.filter((_, i) => i !== index))} className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1">
                                                        <Trash2 size={14} /> Hapus
                                                    </button>
                                                )}
                                            </div>

                                            {(() => {
                                                const openTime = companySettings?.default_open_time || '08:00';
                                                const closeTime = companySettings?.default_close_time || '22:00';
                                                const startErr = shift.start && (shift.start < openTime || shift.start >= closeTime) ? `Harus antara ${openTime} – ${closeTime}` : '';
                                                const endErr = shift.end && (shift.end <= (shift.start || openTime) || shift.end > closeTime) ? `Harus setelah ${shift.start || openTime} dan maks ${closeTime}` : '';
                                                return (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-500 block mb-2">Shift Mulai</label>
                                                            <div className="relative">
                                                                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C58940]" />
                                                                <TimePickerFiltered value={shift.start} min={openTime} max={getMaxStartTime(closeTime)} onChange={(val) => { const newS = [...bulkModalShifts]; newS[index].start = val; if (newS[index].end && newS[index].end <= val) newS[index].end = ''; setBulkModalShifts(newS); }} />
                                                            </div>
                                                            {startErr && <p className="text-[10px] text-red-500 mt-1 font-bold">{startErr}</p>}
                                                            <p className="text-[10px] text-gray-400 mt-0.5">Buka: {openTime}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-500 block mb-2">Shift Berakhir</label>
                                                            <div className="relative">
                                                                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C58940]" />
                                                                <TimePickerFiltered value={shift.end} min={shift.start || openTime} max={closeTime} onChange={(val) => { const newS = [...bulkModalShifts]; newS[index].end = val; setBulkModalShifts(newS); }} />
                                                            </div>
                                                            {endErr && <p className="text-[10px] text-red-500 mt-1 font-bold">{endErr}</p>}
                                                            <p className="text-[10px] text-gray-400 mt-0.5">Tutup: {closeTime}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            <div className="pt-4 border-t border-dashed border-gray-200 space-y-4">
                                                <div className="flex gap-2 flex-wrap">
                                                    {['none', 'weekly', 'daily', 'custom'].map(type => (
                                                        <button key={type} onClick={() => { const newS = [...bulkModalShifts]; newS[index].repeatType = type as any; setBulkModalShifts(newS); }} className={`flex-1 py-2 rounded-lg text-[11px] font-black border transition-all ${shift.repeatType === type ? 'bg-[#C58940] text-white border-[#C58940]' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>
                                                            {type === 'none' ? 'TIDAK ULANG' : type === 'weekly' ? 'MINGGUAN' : type === 'daily' ? 'SETIAP HARI' : 'KUSTOM'}
                                                        </button>
                                                    ))}
                                                </div>

                                                {shift.repeatType === 'custom' && (
                                                    <div className="grid grid-cols-7 gap-1">
                                                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                                            <button key={day} onClick={() => { const newS = [...bulkModalShifts]; newS[index].repeatDays = newS[index].repeatDays.includes(day) ? newS[index].repeatDays.filter(d => d !== day) : [...newS[index].repeatDays, day]; setBulkModalShifts(newS); }} className={`py-1.5 rounded-lg text-[10px] font-black border transition-all ${shift.repeatDays.includes(day) ? 'bg-[#C58940] border-[#C58940] text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                                {day.slice(0, 3).toUpperCase()}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {shift.repeatType !== 'none' && (
                                                    <div className="flex gap-3 items-center">
                                                        <button onClick={() => { const newS = [...bulkModalShifts]; newS[index].endRepeatType = 'ongoing'; setBulkModalShifts(newS); }} className={`flex-1 py-2 rounded-lg text-[11px] font-black border ${shift.endRepeatType === 'ongoing' ? 'bg-[#C58940] text-white' : 'bg-white text-gray-400'}`}>BERLANGSUNG</button>
                                                        <button onClick={() => { const newS = [...bulkModalShifts]; newS[index].endRepeatType = 'specific'; setBulkModalShifts(newS); }} className={`flex-1 py-2 rounded-lg text-[11px] font-black border ${shift.endRepeatType === 'specific' ? 'bg-[#C58940] text-white' : 'bg-white text-gray-400'}`}>S/D TANGGAL</button>
                                                        {shift.endRepeatType === 'specific' && (
                                                            <input type="date" value={shift.endRepeatDate} onChange={(e) => { const newS = [...bulkModalShifts]; newS[index].endRepeatDate = e.target.value; setBulkModalShifts(newS); }} className="px-2 py-1.5 border rounded-lg text-xs" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <button onClick={() => setBulkModalShifts(prev => [...prev, { start: '', end: '', repeatType: 'none', repeatDays: [], endRepeatType: 'ongoing', endRepeatDate: '' }])} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-[#C58940] text-sm font-bold hover:bg-orange-50 transition-all">
                                        <Plus size={16} /> Tambah Shift Lain
                                    </button>
                                </div>
                            </section>
                        </div>

                        <div className="p-4 border-t flex gap-3 bg-white sticky bottom-0">
                            <button onClick={() => setShowBulkScheduleModal(false)} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200">Batal</button>
                            <button onClick={handleSaveBulkShift} disabled={bulkSelectedStaffIds.length === 0 || bulkModalShifts.some(s => !s.start || !s.end) || isSavingBulkShift} className={`flex-1 py-3.5 rounded-xl font-bold transition-all shadow-md ${bulkSelectedStaffIds.length > 0 && !bulkModalShifts.some(s => !s.start || !s.end) && !isSavingBulkShift ? 'bg-[#C58940] text-white hover:bg-[#B07835]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                {isSavingBulkShift ? 'Menyimpan...' : `Simpan ${bulkSelectedStaffIds.length} Jadwal Staff`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
