
import { useState, useEffect } from 'react';
import { Building, Calendar, Save, Plus, Trash2, Clock, Filter, AlertCircle, Monitor, Palette, Tag, Search, GripVertical, Check, X, Settings, Type, Copy, Edit2, Sparkles, Layout, Users, Loader2, CheckCircle, Bell, CalendarDays, CreditCard, Banknote, Briefcase, FileText, MessageSquare, XCircle, Award, Wallet, CircleDollarSign, Coins, Ticket, Info, Star, Gift, Minus, MapPin, ChevronRight, Percent, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';
import type { Branch, Role, BankAccount, ClosedDate, Facility } from '../../services/api';
import { toast } from 'react-hot-toast';
import { SearchableSelect, Toggle } from '../../components/common';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useBranchSync } from '../../hooks/useBranchSync';
import swal from '../../utils/swal';
import FeaturedServicesTab from './FeaturedServicesTab';

import DateFilterModal, { formatDateRangeDisplay, getInitialDateRange } from '../../components/common/DateFilterModal';
import WhatsAppTemplatesTab from './WhatsAppTemplateTab';
import WhatsAppNotifSettingsTab from './WhatsAppNotifSettingsTab';



interface SettlementItem {
    id: string;
    invoiceNo: string;
    customer: string;
    invoiceDate: string;
    completeDate: string;
    location: string;
    grossTotal: number;
    status: 'pending' | 'completed';
}



// interface BarcodeElement {
//     id: string;
//     label: string;
//     visible: boolean;
// }

interface CancellationReason {
    id: number;
    reason: string;
}

// interface BarcodeConfig {
//     paperType: string;
//     barcodeType: string;
//     height: number;
//     width: number;
//     elements: BarcodeElement[];
// }

interface LoyaltyRedemption {
    id: number;
    type: 'discount' | 'free_item';
    pointsRequired: number;
    // For discount
    discountAmount?: number;
    discountType?: 'fixed' | 'percentage';
    // For free item
    itemName?: string;
    itemId?: string | number;
}

interface LoyaltySettings {
    enabled: boolean;
    earningType: 'amount_spent' | 'item_purchased';
    pointsPerAmount: number;
    minOrderAmount: number;
    expiration: string;
    applyMultiples: boolean;
    earnWhenRedeeming: boolean;
    // Rules
    channels: string[];
    customerGroups: string[];
    services: string[];
    packages: string[];
    classes: string[];
    products: string[];
    vouchers: string[];
    plans: string[];
    excludedServices: string[];
}


export default function SettingsPageNew() {
    const [activeTab, setActiveTab] = useState<string>('company');
    const { selectedBranchId, setSelectedBranchId } = useBranchSync<number | ''>(undefined, '');

    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

    // Customer Notification States
    const [showNotifSettings, setShowNotifSettings] = useState(false);
    const [showNotifPreview, setShowNotifPreview] = useState(false);
    const [notificationTime, setNotificationTime] = useState({ value: 1, unit: 'Jam' });

    // Company Settings
    const [companySettings, setCompanySettings] = useState({
        name: '',
        description: '',
        logo: '',
        businessType: 'Spa',
        website: '',
        address: '',
        phone: '',
        city: '',
        province: '',
        latitude: '',
        longitude: '',
        timeFormat: '24h',
        timezone: 'WIB',
        country: 'Indonesia',
        currency: 'Rupiah',
        defaultOpenTime: '09:00',
        defaultCloseTime: '21:30',
        operating_days: [] as any[],
        use_specific_operating_hours: false,
        paymentTimeout: 1,
        minDP: 50000,
        minDPType: 'global' as 'global' | 'per_guest',
        enableFullPayment: true,
        enableDp: true,
        enableCod: false,
        tax: 11,
        isTaxEnabled: true,
        serviceCharge: 5,
        isServiceChargeEnabled: true,
        timeInterval: 15,
        posTimeInterval: 15,
        tnc_enabled: true,
tnc_title: 'Syarat & Ketentuan',
tnc_content: '',
        facilities: [] as number[]
    });

    const [, setAllFacilities] = useState<Facility[]>([]);





    // Date Filter for Closed Dates
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateRange, setDateRange] = useState(() => getInitialDateRange('this_month'));
    const [selectedQuickOption, setSelectedQuickOption] = useState('this_month');

    // Closed Dates
    const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
    const [showClosedDateModal, setShowClosedDateModal] = useState(false);
    const [closedDateForm, setClosedDateForm] = useState({
        name: '',
        start_date: '',
        end_date: '',
        reason: ''
    });

    // Bank Accounts
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [showBankModal, setShowBankModal] = useState(false);
    const [bankForm, setBankForm] = useState({
        bank_name: '',
        account_number: '',
        account_name: '',
        branch: ''
    });

    // Settlement Settings
    const [settlementTab, setSettlementTab] = useState<'pending' | 'completed'>('pending');
    const [settlementDateRange, setSettlementDateRange] = useState(() => getInitialDateRange('30_days'));
    const [settlementQuickOption, setSettlementQuickOption] = useState('30_days');
    const [showSettlementDateFilter, setShowSettlementDateFilter] = useState(false);

    // Mock Settlement Data
    const [settlements] = useState<SettlementItem[]>([
        { id: 'INV-001', invoiceNo: 'INV/2026/01/001', customer: 'Budi Santoso', invoiceDate: '2026-01-20', completeDate: '2026-01-20', location: 'Naqupos Spa Solo', grossTotal: 150000, status: 'pending' },
        { id: 'INV-002', invoiceNo: 'INV/2026/01/002', customer: 'Siti Aminah', invoiceDate: '2026-01-21', completeDate: '2026-01-21', location: 'Naqupos Spa Solo', grossTotal: 250000, status: 'pending' },
        { id: 'INV-003', invoiceNo: 'INV/2026/01/003', customer: 'Rudi Hartono', invoiceDate: '2026-01-15', completeDate: '2026-01-15', location: 'Naqupos Spa Solo', grossTotal: 300000, status: 'completed' }
    ]);

    // Calendar Settings
    const [calendarSettings, setCalendarSettings] = useState({
        agendaColor: 'staff',
        slotInterval: 15,
         rescheduleInterval: 15,
        defaultView: 'day',
        weekStart: 'sunday',
        staffOrder: 'default',
        startHour: 9,
        endHour: 21,
        allow_reschedule: true,
        reschedule_deadline: 24
    });

    // Notification Settings
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [notificationSettings, setNotificationSettings] = useState({
        agenda: {
            enabled: true,
            notifyBookedStaff: true,
            notifyRoles: false,
            notifyEmail: false,
            emailRecipients: '',
            targetRoles: [] as number[]
        },
        inventory: {
            enabled: false,
            notifyBookedStaff: false,
            notifyRoles: false,
            notifyEmail: false,
            emailRecipients: '',
            targetRoles: [] as number[]
        },
        whatsapp_config: {
            baseUrl: '',
            token: ''
        }
    });

    // Queue Settings
    const [queueSettings, setQueueSettings] = useState({
        theme: {
            ongoingBg: '#FF4500',
            ongoingText: '#000000'
        },
        kiosk: {
            maxServices: 'unlimited',
            requireNamePhone: true
        },
        queueMode: {
            enabled: false
        }
    });



    // Barcode Settings
    // const [barcodeConfig, setBarcodeConfig] = useState<BarcodeConfig>({
    //     paperType: 'Tom and Jerry 107',
    //     barcodeType: 'C93',
    //     height: 50.00,
    //     width: 2.00,
    //     elements: [
    //         { id: 'barcode', label: 'Kode Batang', visible: true },
    //         { id: 'name', label: 'Nama', visible: true },
    //         { id: 'code', label: 'No. Kode Batang', visible: false },
    //         { id: 'price', label: 'Harga', visible: true }
    //     ]
    // });
    // const [barcodeProducts, setBarcodeProducts] = useState<any[]>([]); // Mock product list

    // Cancellation Reasons
    const [cancellationReasons, setCancellationReasons] = useState<CancellationReason[]>([
        { id: 1, reason: 'Appointment Made by Mistake' },
        { id: 2, reason: 'Appointment invoice not paid' },
        { id: 3, reason: 'Other' },
        { id: 4, reason: 'Canceled because payment time is expired' },
        { id: 5, reason: 'Rebooking' }
    ]);
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [newCancellationReason, setNewCancellationReason] = useState('');
    const [editingCancellationReasonId, setEditingCancellationReasonId] = useState<number | null>(null);


    // Delete Confirmation States
    const [deleteClosedDateId, setDeleteClosedDateId] = useState<number | null>(null);
    const [deleteBankId, setDeleteBankId] = useState<number | null>(null);
    const [deleteReasonId, setDeleteReasonId] = useState<number | null>(null);
    const [salesSettings, setSalesSettings] = useState({
        registerEnabled: true,
        commissionByPriceBeforeDiscount: false,
        commissionAfterDiscount: false, // New field requested by user
        commissionByPriceIncludeTax: true,
        assistantCommission: 'Bagi rata',
        allowUnpaidVoucherExchange: true,
        voucherExpiration: '1 month',
        paymentRounding: {
            enabled: true,
            mode: 'up' as 'up' | 'down',
            amount: 100
        }
    });

    // Invoice Settings
   const [invoiceSettings, setInvoiceSettings] = useState({
    autoPrint: true,
    logoUrl: '',
    invoiceTitle: 'INVOICE',
    businessNameOverride: '',
    showCustomerName: true,
    showCustomerContact: false,
    showCustomerAddress: false,
    showLogo: true,
    showItemDetails: true,
    showItemPrice: false,
    showStaffName: true,
    showTax: true,
    hideCompanyName: false,
    hideCashierName: false,
    applyToAllLocations: true,
    socialMedia: {
        instagram: '',
        facebook: '',
        twitter: ''
    },
    customHeader: '',
    customFooter: '',
     invoiceAddress: '',
    invoicePhone: '',
    invoiceCity: '',
});

    // Customer Notification Settings
    const [customerNotificationTab, setCustomerNotificationTab] = useState('reminder_h1');
    const [customerNotifications, setCustomerNotifications] = useState<Record<string, { enabled: boolean; title: string; message: string }>>({
        reminder_h1: { enabled: true, title: 'Pengingat H-1 Janji Temu', message: 'Hi CUSTOMER_NAME,\n\nMengingatkan jadwal reservasi Anda BESOK (BOOKING_DATE) jam BOOKING_TIME di BUSINESS_NAME (Cabang: BRANCH_NAME).\n\nLayanan: SERVICE_NAME\n\nSilakan datang tepat waktu.\nTerima Kasih.' },
        reminder_h2: { enabled: true, title: 'Pengingat 2 Jam Sebelum Janji Temu', message: 'Hi CUSTOMER_NAME,\n\nMengingatkan jadwal reservasi Anda dalam 2 JAM LAGI (jam BOOKING_TIME) di BUSINESS_NAME (Cabang: BRANCH_NAME).\n\nLayanan: SERVICE_NAME\n\nSilakan datang tepat waktu.\nTerima Kasih.' },
        confirmation: { enabled: true, title: 'Janji temu Anda telah dikonfirmasi', message: 'Hi CUSTOMER_NAME,\n\nReservasi Anda dengan referensi pemesanan BOOKING_REFERENCE  telah diterima.\nBerikut detailnya:\n\nBUSINESS_NAME\nSERVICE_NAME\nBOOKING_DATE_TIME\n\nLokasi:\n\nLOCATION_NAME\nLOCATION_MAP\nLOCATION_PHONE\n\nSegera melakukan Dp minimal DP_AMOUNT dan kirimkan bukti dp nya ke nomor customer service kami , agar reservasi anda tidak batal secara otomatis dalam waktu 15 menit \n\nPembayaran reservasi ke link dibawah ini :\n - PAYMENT_LINK\n\nPerlu mengubah reservasi Anda? Silakan hubungi kami melalui nomor telepon di atas.' },
        reschedule: {
            enabled: true,
            title: 'Reservasi Anda telah berubah',
            message: 'Hi CUSTOMER_NAME,\n\nReservasi Anda dengan referensi pemesanan BOOKING_REFERENCE telah di perbarui.\nberikut detailnya:\n\nBUSINESS_NAME\nSERVICE_NAME\nBOOKING_DATE_TIME\n\nlokasi:\n\nLOCATION_NAME\nLOCATION_MAP\nLOCATION_PHONE\n\nPerlu mengubah reservasi Anda? Silakan hubungi kami melalui nomor telepon di atas..'
        },
        cancellation: { enabled: true, title: 'Reservasi Anda dibatalkan', message: 'Hi CUSTOMER_NAME,\n\nReservasi Anda dengan referensi pemesanan .telah dibatalkan \nberikut detailnya :\n\nBUSINESS_NAME\nSERVICE_NAME\nBOOKING_DATE_TIME\n\nLokasi :\n\nLOCATION_NAME\nLOCATION_MAP\nLOCATION_PHONE\n\nPerlu mengubah reservasi Anda? Silakan hubungi kami melalui nomor telepon di atas..' },
        review_request: { enabled: true, title: 'Bagaimana pengalaman Anda?', message: 'Halo CUSTOMER_NAME,\n\nTerima kasih telah berkunjung ke BUSINESS_NAME (REF: BOOKING_REFERENCE).\n\nBagaimana pengalaman Anda hari ini? Kami sangat menghargai ulasan Anda untuk meningkatkan layanan kami.\n\nSilakan berikan ulasan di sini: REVIEW_LINK\n\nTerima Kasih!' }
    });

    // Loyalty Points Settings
    const [loyaltyTab, setLoyaltyTab] = useState<'redemption' | 'settings'>('redemption');
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
        enabled: true,
        earningType: 'amount_spent',
        pointsPerAmount: 1,
        minOrderAmount: 50000,
        expiration: 'After 1 Year',
        applyMultiples: true,
        earnWhenRedeeming: true,
        channels: ['All'],
        customerGroups: ['All'],
        services: ['All'],
        packages: ['All'],
        classes: ['All'],
        products: ['All'],
        vouchers: ['All'],
        plans: ['All'],
        excludedServices: []
    });
    const [activeRuleSidebar, setActiveRuleSidebar] = useState<string | null>(null);
    const [tempSelectedItems, setTempSelectedItems] = useState<string[]>([]);
    const [isAllSelected, setIsAllSelected] = useState(true);

    // Mock Data for Sidebars
    const mockDataRules = {
        'Channel Transaksi': [
            { id: 'online', name: 'Online' },
            { id: 'pos', name: 'Point Of Sale' },
            { id: 'marketplace', name: 'Marketplace' }
        ],
        'Pelanggan': [
            { id: 'member_wanita', name: 'Member Wanita', count: 2648 },
            { id: 'member_pria', name: 'Member Pria', count: 455 }
        ],
        'Layanan yang Dibeli': [
            { id: 'svc1', name: 'Hair Cut' },
            { id: 'svc2', name: 'Cream Bath' },
            { id: 'svc3', name: 'Manicure' }
        ],
        'Paket yang Dibeli': [
            { id: 'pkg1', name: 'Paket Hemat 1' },
            { id: 'pkg2', name: 'Complete Spa Package' }
        ],
        'Kelas yang Dibeli': [
            { id: 'cls1', name: 'Yoga Morning' },
            { id: 'cls2', name: 'Pilates' }
        ],
        'Produk Dibeli': [
            { id: 'prd1', name: 'Shampoo Organic' },
            { id: 'prd2', name: 'Vitamin Hair' }
        ],
        'Voucher yang Dibeli': [
            { id: 'vch1', name: 'Gift Voucher 100k' },
            { id: 'vch2', name: 'Gift Voucher 50k' }
        ],
        'Plan yang Dibeli': [
            { id: 'pln1', name: 'Membership Gold' },
            { id: 'pln2', name: 'Membership Silver' }
        ]
    };
    const [loyaltyRedemptions, setLoyaltyRedemptions] = useState<LoyaltyRedemption[]>([
        { id: 1, type: 'discount', pointsRequired: 50, discountAmount: 200000, discountType: 'fixed' }
    ]);
    const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
    const [editingLoyaltyRewardId, setEditingLoyaltyRewardId] = useState<number | null>(null);
    const [loyaltyModalType, setLoyaltyModalType] = useState<'discount' | 'free_item' | null>(null);
    const [loyaltyForm, setLoyaltyForm] = useState({
        pointsRequired: '',
        discountAmount: '',
        discountType: 'fixed' as 'fixed' | 'percentage',
        itemName: '',
        itemId: ''
    });
    const [freeItemSearch, setFreeItemSearch] = useState('');
    const [freeItemTab, setFreeItemTab] = useState<'produk' | 'voucher' | 'layanan'>('produk');
    const [masterProducts, setMasterProducts] = useState<any[]>([]);
    const [masterVouchers, setMasterVouchers] = useState<any[]>([]);
    const [masterServices, setMasterServices] = useState<any[]>([]);
    const [loadingMaster, setLoadingMaster] = useState(false);
    const [showFreeItemSearchList, setShowFreeItemSearchList] = useState(false);

    // Adjust Point Per Item States
    const [showPointPerItemSidebar, setShowPointPerItemSidebar] = useState(false);
    const [pointPerItemTab, setPointPerItemTab] = useState<'layanan' | 'paket' | 'kelas' | 'produk' | 'voucher' | 'plan'>('layanan');
    const [pointPerItemSearch, setPointPerItemSearch] = useState('');
    const [selectedItemsForPoint, setSelectedItemsForPoint] = useState<string[]>([]);
    const [masterPackages, setMasterPackages] = useState<any[]>([]);
    const [masterClasses, setMasterClasses] = useState<any[]>([]);
    const [masterPlans, setMasterPlans] = useState<any[]>([]);

    useEffect(() => {
        loadBranches();
    }, []);

    useEffect(() => {
        if (selectedBranchId) {
            const branch = branches.find(b => b.id === selectedBranchId);
            setSelectedBranch(branch || null);
        } else {
            setSelectedBranch(null);
        }
    }, [selectedBranchId, branches]);

    useEffect(() => {
        if (activeTab === 'profile') fetchProfile();
        if (activeTab === 'calendar') fetchCalendarSettings();
        if (activeTab === 'notifications' || activeTab === 'customer_notifications') fetchNotificationSettings();
        if (activeTab === 'company' || activeTab === 'payment_settings') fetchCompanySettings();
        if (activeTab === 'queue') fetchQueueSettings();
        if (activeTab === 'closed') fetchClosedDates();
        if (activeTab === 'bank') fetchBankAccounts();
        if (activeTab === 'cancellation_reasons') fetchCancellationReasons();
        if (activeTab === 'loyalty') fetchLoyaltySettings();
        if (activeTab === 'invoice') fetchInvoiceSettings();
    }, [activeTab, selectedBranchId, branches]);


    const loadBranches = async () => {
        try {
            setLoading(true);
            const data = await api.getBranches();
            setBranches(data);
        } catch (error) {
            console.error('Error loading branches:', error);
            toast.error('Gagal memuat data cabang');
        } finally {
            setLoading(false);
        }
    };



    const fetchProfile = async () => {
        // Load branch-specific data here
        // For now, using mock data
        setClosedDates([]);
        setBankAccounts([]);
    };

    const fetchNotificationSettings = async () => {
        try {
            setLoading(true);
            const [rolesData, settingsData] = await Promise.all([
                api.getRoles(),
                api.getNotificationSettings().catch(() => null) // Handle 404 gracefully
            ]);

            setAllRoles(rolesData || []);

            if (settingsData) {
                setNotificationSettings(prev => ({
                    ...prev,
                    agenda: {
                        ...prev.agenda,
                        ...settingsData.agenda,
                        notifyRoles: (settingsData.agenda?.targetRoles?.length || 0) > 0,
                           notifyStaffWhatsapp: true,
    notifyStaffEmail: true,
    notifyRoleWhatsapp: true,
    notifyRoleEmail: true,
                    },
                    inventory: {
                        ...prev.inventory,
                        ...(settingsData.inventory || {}),
                        notifyRoles: (settingsData.inventory?.targetRoles?.length || 0) > 0,
                           notifyRoleWhatsapp: true,
    notifyRoleEmail: true,
                    },
                    whatsapp_config: {
                        baseUrl: settingsData.whatsapp_config?.baseUrl || '',
                        token: settingsData.whatsapp_config?.token || ''
                    }
                }));

                if (settingsData.customer) {
                    setCustomerNotifications(prev => ({
                        ...prev,
                        ...settingsData.customer
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch notification settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotificationSettings = async () => {
        try {
            setSaving(true);
            await api.updateNotificationSettings(notificationSettings);
            toast.success('Pengaturan pemberitahuan berhasil disimpan');
        } catch (error) {
            console.error('Error saving notification settings:', error);
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const fetchCalendarSettings = async () => {
        try {
            setLoading(true);
            const data = await api.getCalendarSettings(typeof selectedBranchId === 'number' ? selectedBranchId : Number(selectedBranchId) || undefined);
            if (data) {
                setCalendarSettings({
                    agendaColor: data.agenda_color || 'staff',
                    slotInterval: data.slot_duration || 15,
                    defaultView: data.default_view || 'day',
                    weekStart: data.week_start || 'sunday',
                    staffOrder: data.staff_order || 'default',
                      rescheduleInterval: data.reschedule_interval || 15,
                    startHour: data.start_hour ?? 9,
                    endHour: data.end_hour ?? 21,
                    allow_reschedule: data.allow_reschedule ?? true,
                    reschedule_deadline: data.reschedule_deadline ?? 24
                });
            }
        } catch (error) {
            console.error('Failed to fetch calendar settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCalendarSettings = async () => {
        try {
            setSaving(true);
            const payload = {
                branch_id: selectedBranchId || undefined,
                agenda_color: calendarSettings.agendaColor,
                slot_duration: calendarSettings.slotInterval,
                 reschedule_interval: calendarSettings.rescheduleInterval, 
                default_view: calendarSettings.defaultView,
                week_start: calendarSettings.weekStart,
                staff_order: calendarSettings.staffOrder,
                start_hour: calendarSettings.startHour,
                end_hour: calendarSettings.endHour,
                allow_reschedule: calendarSettings.allow_reschedule,
                reschedule_deadline: calendarSettings.reschedule_deadline
            };
            await api.updateCalendarSettings(payload);
            toast.success('Pengaturan kalender berhasil disimpan');
        } catch (error) {
            console.error('Error saving calendar settings:', error);
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

   const fetchCompanySettings = async () => {
    try {
        setLoading(true);
        const [data, facilitiesData] = await Promise.all([
            api.getCompanySettings(selectedBranchId || undefined).catch(err => {
                console.warn('Company settings not found:', err);
                return null;
            }),
            api.getFacilities().catch(() => [])
        ]);
 
        if (facilitiesData) setAllFacilities(facilitiesData);
 
        const currentBranch = branches.find(
            b => b.id === (typeof selectedBranchId === 'number'
                ? selectedBranchId
                : Number(selectedBranchId))
        );
 
        if (data) {
            // Data dari settings table yang menang — branch master hanya fallback
            setCompanySettings({
                name: data.name || currentBranch?.name || '',
                description: data.description || currentBranch?.address || '',
                logo: data.logo || '',
                businessType: data.business_type || data.businessType || 'Spa',
                website: data.website || '',
                // Alamat, phone, kota: dari settings table dulu, baru fallback branch
                address: data.address || currentBranch?.address || '',
                phone: data.phone || currentBranch?.phone || '',
                city: data.city || currentBranch?.city || '',
                province: data.province || currentBranch?.province || '',
                latitude: data.latitude?.toString() || currentBranch?.latitude?.toString() || '',
                longitude: data.longitude?.toString() || currentBranch?.longitude?.toString() || '',
                timeFormat: data.time_format || data.timeFormat || '24h',
                timezone: data.timezone || 'WIB',
                country: data.country || 'Indonesia',
                currency: data.currency || 'Rupiah',
                operating_days: (
                    typeof data.operating_days === 'string'
                        ? JSON.parse(data.operating_days)
                        : (data.operating_days || currentBranch?.operating_days || [])
                ).map((d: any) => {
                    if (typeof d === 'string') return {
                        day: d, active: true,
                        open: (data.default_open_time || '09:00').substring(0, 5),
                        close: (data.default_close_time || '21:30').substring(0, 5)
                    };
                    return {
                        ...d,
                        open: (d.open || data.default_open_time || '09:00').substring(0, 5),
                        close: (d.close || data.default_close_time || '21:30').substring(0, 5)
                    };
                }),
                defaultOpenTime: (
                    data.default_open_time || data.defaultOpenTime
                    || currentBranch?.opening_time || '09:00'
                ).substring(0, 5),
                defaultCloseTime: (
                    data.default_close_time || data.defaultCloseTime
                    || currentBranch?.closing_time || '21:30'
                ).substring(0, 5),
                use_specific_operating_hours: !!(
                    data.use_specific_operating_hours
                    ?? currentBranch?.use_specific_operating_hours
                ),
                timeInterval: data.time_interval ?? 15,
                posTimeInterval: data.pos_time_interval ?? 15,
                tax: data.tax_percentage ?? 0,
                isTaxEnabled: data.is_tax_enabled ?? true,
                serviceCharge: data.service_charge_percentage ?? 0,
                isServiceChargeEnabled: data.is_service_charge_enabled ?? true,
                paymentTimeout: data.payment_timeout ?? 15,
                minDP: data.min_dp ?? 0,
                minDPType: data.min_dp_type || 'global',
                enableFullPayment: data.enable_full_payment ?? true,
                enableDp: data.enable_dp ?? true,
                enableCod: data.enable_cod ?? false,
                tnc_enabled: data.tnc_enabled ?? true,
tnc_title: data.tnc_title || 'Syarat & Ketentuan',
tnc_content: data.tnc_content || '',
                facilities: data.facilities || [],
            } as any);
 
            setSalesSettings({
                registerEnabled: data.register_enabled ?? true,
                commissionByPriceBeforeDiscount: data.commission_before_discount ?? false,
                commissionAfterDiscount: data.commission_after_discount ?? false,
                commissionByPriceIncludeTax: data.commission_include_tax ?? true,
                assistantCommission: data.assistant_commission || 'Bagi rata',
                allowUnpaidVoucherExchange: data.allow_unpaid_voucher_exchange ?? true,
                voucherExpiration: data.voucher_expiration || '1 month',
                paymentRounding: {
                    enabled: data.rounding_enabled ?? true,
                    mode: (data.rounding_mode as 'up' | 'down') || 'up',
                    amount: data.rounding_amount ?? 100,
                }
            });
        } else if (currentBranch) {
            // Fallback ke branch master jika settings belum ada sama sekali
            setCompanySettings(prev => ({
                ...prev,
                name: currentBranch.name || '',
                address: currentBranch.address || '',
                phone: currentBranch.phone || '',
                city: currentBranch.city || '',
                province: currentBranch.province || '',
                latitude: currentBranch.latitude?.toString() || '',
                longitude: currentBranch.longitude?.toString() || '',
            }));
        }
    } catch (error) {
        console.error('Failed to fetch company settings', error);
    } finally {
        setLoading(false);
    }
};
 

const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
        toast.error('Ukuran file terlalu besar. Maksimal 1MB.');
        return;
    }

    if (!selectedBranchId) {
        toast.error('Pilih cabang terlebih dahulu');
        return;
    }

    setUploadingLogo(true);
    try {
        const res = await api.uploadInvoiceLogo(Number(selectedBranchId), file);
        const uploadedUrl = res.logo_url || res.url || res.path;
        setInvoiceSettings(prev => ({ ...prev, logoUrl: uploadedUrl }));
        toast.success('Logo berhasil diupload');
    } catch (err: any) {
        toast.error(err.message || 'Gagal upload logo');
    } finally {
        setUploadingLogo(false);
    }
};

    const handleSaveCompanySettings = async () => {
        if (!companySettings.enableFullPayment && !companySettings.enableDp && !companySettings.enableCod) {
            toast.error('Minimal satu opsi pembayaran (Full Payment, DP, atau COD) harus aktif.');
            return;
        }
        try {
            setSaving(true);
            const operatingDays = companySettings.use_specific_operating_hours
                ? companySettings.operating_days
                : (companySettings.operating_days || []).map((d: any) => {
                    const base = typeof d === 'string' ? { day: d } : d;
                    return {
                        ...base,
                        open: companySettings.defaultOpenTime,
                        close: companySettings.defaultCloseTime
                    };
                });

            const payload = {
                ...companySettings,
                operating_days: operatingDays,
                branch_id: selectedBranchId || undefined,
                time_format: companySettings.timeFormat, // Ensure consistent snake_case for backend
                business_type: companySettings.businessType,
                // Ensure strings are sent for latitude/longitude if API expects them
                latitude: companySettings.latitude?.toString(),
                longitude: companySettings.longitude?.toString(),
                time_interval: companySettings.timeInterval,
                pos_time_interval: companySettings.posTimeInterval,
                tax_percentage: companySettings.tax,
                is_tax_enabled: companySettings.isTaxEnabled,
                service_charge_percentage: companySettings.serviceCharge,
                is_service_charge_enabled: companySettings.isServiceChargeEnabled,
                payment_timeout: companySettings.paymentTimeout,
                min_dp: companySettings.minDP,
                min_dp_type: companySettings.minDPType,
                enable_full_payment: companySettings.enableFullPayment,
                enable_dp: companySettings.enableDp,
                enable_cod: companySettings.enableCod,
                default_open_time: companySettings.defaultOpenTime,
                default_close_time: companySettings.defaultCloseTime,
                // Include sales settings in the payload
                register_enabled: salesSettings.registerEnabled,
                commission_before_discount: salesSettings.commissionByPriceBeforeDiscount,
                commission_after_discount: salesSettings.commissionAfterDiscount,
                commission_include_tax: salesSettings.commissionByPriceIncludeTax,
                assistant_commission: salesSettings.assistantCommission,
                allow_unpaid_voucher_exchange: salesSettings.allowUnpaidVoucherExchange,
                voucher_expiration: salesSettings.voucherExpiration,
                rounding_enabled: salesSettings.paymentRounding.enabled,
                rounding_mode: salesSettings.paymentRounding.mode,
                rounding_amount: salesSettings.paymentRounding.amount,
            };
            const { facilities, ...payloadWithoutFacilities } = payload;
            await api.updateCompanySettings(payloadWithoutFacilities);
            toast.success('Pengaturan perusahaan berhasil disimpan');
        } catch (error) {
            console.error('Error saving company settings:', error);
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveIntervalSettings = async () => {
        try {
            setSaving(true);
            const payload = {
                branch_id: selectedBranchId || undefined,
                pos_time_interval: companySettings.posTimeInterval,
                reschedule_interval: calendarSettings.rescheduleInterval,
            };
            await api.updateIntervalSettings(payload);
            toast.success('Pengaturan interval berhasil disimpan');
        } catch (error) {
            console.error('Error saving interval settings:', error);
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const fetchQueueSettings = async () => {
        try {
            setLoading(true);
            const data = await api.getQueueSettings();
            if (data) setQueueSettings(data);
        } catch (error) {
            console.error('Failed to fetch queue settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveQueueSettings = async () => {
        try {
            setSaving(true);
            await api.updateQueueSettings(queueSettings);
            toast.success('Pengaturan antrian berhasil disimpan');
        } catch (error) {
            console.error('Error saving queue settings:', error);
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

const fetchInvoiceSettings = async () => {
    try {
        setLoading(true);
        const branchId = selectedBranchId ? Number(selectedBranchId) : undefined;
          console.log('Fetching invoice settings with branchId:', branchId);
        const data = await api.getInvoiceSettings(branchId);
              console.log('Invoice settings response:', data);
        if (data) {
            setInvoiceSettings({
                autoPrint: data.autoPrint ?? true,
                logoUrl: data.logoUrl || '',
                invoiceTitle: data.invoiceTitle || 'INVOICE',
                businessNameOverride: data.businessNameOverride || '',
                showCustomerName: data.showCustomerName ?? true,
                showCustomerContact: data.showCustomerContact ?? false,
                showCustomerAddress: data.showCustomerAddress ?? false,
                showLogo: data.showLogo ?? true,
                showItemDetails: data.showItemDetails ?? true,
                showItemPrice: data.showItemPrice ?? false,
                showStaffName: data.showStaffName ?? true,
                showTax: data.showTax ?? true,
                hideCompanyName: data.hideCompanyName ?? false,
                hideCashierName: data.hideCashierName ?? false,
                applyToAllLocations: data.applyToAllLocations ?? true,
                socialMedia: {
                    instagram: data.socialMedia?.instagram || '',
                    facebook: data.socialMedia?.facebook || '',
                    twitter: data.socialMedia?.twitter || '',
                },
                customHeader: data.customHeader || '',
                customFooter: data.customFooter || '',
                invoiceAddress: data.invoiceAddress || '',
invoicePhone: data.invoicePhone || '',
invoiceCity: data.invoiceCity || '',
            });
        }
    } catch (error) {
        console.error('Failed to fetch invoice settings', error);
    } finally {
        setLoading(false);
    }
};

const handleSaveInvoiceSettings = async () => {
    try {
        setSaving(true);
        await api.updateInvoiceSettings({
            branch_id: selectedBranchId || undefined,
            auto_print: invoiceSettings.autoPrint,
            logo_url: invoiceSettings.logoUrl,
            invoice_title: invoiceSettings.invoiceTitle,
            business_name_override: invoiceSettings.businessNameOverride,
            // Tambah 3 ini:
            invoiceAddress: invoiceSettings.invoiceAddress,
            invoicePhone: invoiceSettings.invoicePhone,
            invoiceCity: invoiceSettings.invoiceCity,
            show_customer_name: invoiceSettings.showCustomerName,
            show_customer_contact: invoiceSettings.showCustomerContact,
            show_customer_address: invoiceSettings.showCustomerAddress,
            show_logo: invoiceSettings.showLogo,
            show_item_details: invoiceSettings.showItemDetails,
            show_item_price: invoiceSettings.showItemPrice,
            show_staff_name: invoiceSettings.showStaffName,
            show_tax: invoiceSettings.showTax,
            hide_company_name: invoiceSettings.hideCompanyName,
            hide_cashier_name: invoiceSettings.hideCashierName,
            apply_to_all_locations: invoiceSettings.applyToAllLocations,
            custom_header: invoiceSettings.customHeader,
            custom_footer: invoiceSettings.customFooter,
            instagram: invoiceSettings.socialMedia.instagram,
            facebook: invoiceSettings.socialMedia.facebook,
            twitter: invoiceSettings.socialMedia.twitter,
        });
        toast.success('Pengaturan invoice berhasil disimpan');
    } catch (error) {
        console.error('Error saving invoice settings:', error);
        toast.error('Gagal menyimpan pengaturan');
    } finally {
        setSaving(false);
    }
};

    const fetchClosedDates = async () => {
        try {
            setLoading(true);
            const data = await api.getClosedDates({ branch_id: selectedBranchId || undefined });
            if (data) setClosedDates(data);
        } catch (error) {
            console.error('Failed to fetch closed dates', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBankAccounts = async () => {
        // Assume bank accounts might be global or branch-specific
        try {
            setLoading(true);
            // This endpoint might need specific implementation in api.ts if not generic
            // For now using mock or adding to api if I missed it
            const data = await api.get('/admin/bank-accounts');
            if (data) setBankAccounts(data);
        } catch (error) {
            console.error('Failed to fetch bank accounts', error);
        } finally {
            setLoading(false);
        }
    };


    const fetchMasterDataForLoyalty = async () => {
        try {
            setLoadingMaster(true);
            const [products, promos, services] = await Promise.all([
                api.getProducts({ branch_id: selectedBranchId }),
                api.getPromos({ branch_id: selectedBranchId }),
                api.getServices({ branch_id: selectedBranchId })
            ]);
            const prods = Array.isArray(products) ? products : (products.data || []);
            const prms = Array.isArray(promos) ? promos : (promos.data || []);
            const svcs = Array.isArray(services) ? services : (services.data || []);

            setMasterProducts(prods.length > 0 ? prods : [
                { id: 'prd1', name: 'Shampoo Organic', price: 85000, points: 10, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop' },
                { id: 'prd2', name: 'Vitamin Hair', price: 45000, points: 5 }
            ]);
            setMasterVouchers(prms.length > 0 ? prms : [
                { id: 'vch1', name: 'Gift Voucher 100k', price: 100000, points: 100 },
                { id: 'vch2', name: 'Gift Voucher 50k', price: 50000, points: 50 }
            ]);
            setMasterServices(svcs.length > 0 ? svcs : [
                { id: 'svc1', name: 'Hair Cut', price: 150000, points: 15 },
                { id: 'svc2', name: 'Cream Bath', price: 200000, points: 20 },
                { id: 'svc3', name: 'Manicure', price: 120000, points: 12 }
            ]);

            // Mocking other data
            setMasterPackages([
                { id: 'pkg1', name: 'Paket Hemat 1', price: 350000, points: 35 },
                { id: 'pkg2', name: 'Complete Spa Package', price: 750000, points: 75 }
            ]);
            setMasterClasses([
                { id: 'cls1', name: 'Yoga Morning', price: 100000, points: 10 },
                { id: 'cls2', name: 'Pilates', price: 150000, points: 15 }
            ]);
            setMasterPlans([
                { id: 'pln1', name: 'Membership Gold', price: 1000000, points: 100 },
                { id: 'pln2', name: 'Membership Silver', price: 500000, points: 50 }
            ]);
        } catch (error) {
            console.error('Failed to fetch master data for loyalty', error);
        } finally {
            setLoadingMaster(false);
        }
    };

    const getFilteredItems = () => {
        const search = freeItemSearch.toLowerCase();
        let items: any[] = [];
        if (freeItemTab === 'produk') items = masterProducts;
        else if (freeItemTab === 'voucher') items = masterVouchers;
        else if (freeItemTab === 'layanan') items = masterServices;

        return items.filter(item =>
            (item.name || item.title || '').toLowerCase().includes(search)
        );
    };

    const handleSelectFreeItem = (item: any) => {
        setLoyaltyForm({
            ...loyaltyForm,
            itemName: item.name || item.title,
            itemId: item.id
        });
        setShowFreeItemSearchList(false);
    };

    const openLoyaltyModal = (type: 'discount' | 'free_item', item?: LoyaltyRedemption) => {
        setLoyaltyModalType(type);
        if (item) {
            setEditingLoyaltyRewardId(item.id);
            setLoyaltyForm({
                pointsRequired: item.pointsRequired.toString(),
                discountAmount: item.discountAmount?.toString() || '',
                discountType: item.discountType || 'fixed',
                itemName: item.itemName || '',
                itemId: item.itemId?.toString() || ''
            });
        } else {
            setEditingLoyaltyRewardId(null);
            setLoyaltyForm({ pointsRequired: '', discountAmount: '', discountType: 'fixed', itemName: '', itemId: '' });
        }

        if (type === 'free_item') {
            fetchMasterDataForLoyalty();
            setFreeItemSearch('');
            setFreeItemTab('produk');
            setShowFreeItemSearchList(false);
        }

        setShowLoyaltyModal(true);
    };

    const fetchCancellationReasons = async () => {
        try {
            setLoading(true);
            const data = await api.getCancellationReasons();
            if (data) setCancellationReasons(data);
        } catch (error) {
            console.error('Failed to fetch cancellation reasons', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLoyaltySettings = async () => {
        try {
            setLoading(true);
            const data = await api.getLoyaltySettings();
            if (data) setLoyaltySettings({ ...loyaltySettings, ...data });
        } catch (error) {
            console.error('Failed to fetch loyalty settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLoyaltySettings = async () => {
        try {
            setSaving(true);
            await api.updateLoyaltySettings(loyaltySettings);
            toast.success('Pengaturan loyalitas berhasil disimpan');
        } catch (error) {
            console.error('Error saving loyalty settings:', error);
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };



    const handleAddClosedDate = async () => {
        if (!closedDateForm.name || !closedDateForm.start_date || !selectedBranchId) {
            toast.error('Mohon lengkapi semua field');
            return;
        }

        if (closedDateForm.end_date && closedDateForm.end_date < closedDateForm.start_date) {
            toast.error('Tanggal akhir tidak boleh sebelum tanggal mulai');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...closedDateForm,
                branch_id: selectedBranchId as number
            };
            await api.createClosedDate(payload);
            toast.success('Hari libur berhasil ditambahkan');
            fetchClosedDates();
            setClosedDateForm({ name: '', start_date: '', end_date: '', reason: '' });
            setShowClosedDateModal(false);
        } catch (error) {
            console.error('Error adding closed date:', error);
            toast.error('Gagal menambahkan hari libur');
        } finally {
            setSaving(false);
        }
    };



    const handleDeleteClosedDate = (id: number | undefined) => {
        if (id) setDeleteClosedDateId(id);
    };


    const confirmDeleteClosedDate = async () => {
        if (!deleteClosedDateId) return;
        try {
            await api.deleteClosedDate(deleteClosedDateId);
            toast.success('Tanggal tutup berhasil dihapus');
            fetchClosedDates();
        } catch (error) {
            console.error('Error deleting closed date:', error);
            toast.error('Gagal menghapus tanggal tutup');
        } finally {
            setDeleteClosedDateId(null);
        }
    };


    const handleAddBankAccount = async () => {
        if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name || !bankForm.branch || !selectedBranchId) {
            toast.error('Mohon lengkapi semua field');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...bankForm,
                branch_id: selectedBranchId
            };

            await api.post('/admin/bank-accounts', payload); // Generic post for now
            toast.success('Rekening bank berhasil ditambahkan');
            fetchBankAccounts();
            setBankForm({ bank_name: '', account_number: '', account_name: '', branch: '' });
            setShowBankModal(false);
        } catch (error) {
            console.error('Error adding bank account:', error);
            toast.error('Gagal menambahkan rekening bank');
        } finally {
            setSaving(false);
        }
    };




    const handleDeleteBank = (id: number) => {
        setDeleteBankId(id);
    };

    const confirmDeleteBank = async () => {
        if (!deleteBankId) return;
        try {
            await api.delete(`/admin/bank-accounts/${deleteBankId}`);
            toast.success('Rekening bank berhasil dihapus');
            fetchBankAccounts();
        } catch (error) {
            console.error('Error deleting bank account:', error);
            toast.error('Gagal menghapus rekening bank');
        } finally {
            setDeleteBankId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-140px)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C58940]"></div>
            </div>
        );
    }



    const sidebarItems = [
        {
            category: 'Account',
            items: [
                { id: 'company', label: 'Perusahaan', icon: <Building size={18} /> },
                { id: 'calendar', label: 'Pengaturan Kalender', icon: <Calendar size={18} /> },
                { id: 'notifications', label: 'Pemberitahuan Staf', icon: <Bell size={18} /> },
                { id: 'closed', label: 'Tanggal Tutup', icon: <CalendarDays size={18} /> },
            ]
        },
        {
            category: 'Point of Sale',
            items: [
                { id: 'payment_settings', label: 'Pengaturan Pembayaran', icon: <CreditCard size={18} /> },
                { id: 'interval_settings', label: 'Pengaturan Interval', icon: <Clock size={18} /> },
                { id: 'bank', label: 'Rekening Bank Pembayaran', icon: <Banknote size={18} /> },
                { id: 'sales', label: 'Pengaturan Penjualan', icon: <Briefcase size={18} /> },
                { id: 'invoice', label: 'Faktur & Penerimaan', icon: <FileText size={18} /> }
            ]
        },
        {
            category: 'Customer',
            items: [
                { id: 'cancellation_reasons', label: 'Alasan Pembatalan', icon: <XCircle size={18} /> },
                { id: 'loyalty', label: 'Poin Loyalitas', icon: <Award size={18} /> },
                { id: 'tnc', label: 'Syarat & Ketentuan', icon: <FileText size={18} /> },
                { id: 'featured_services', label: 'Layanan Rekomendasi', icon: <Sparkles size={18} /> },
{ id: 'whatsapp_templates', label: 'Template WhatsApp', icon: <MessageSquare size={18} /> },
{ id: 'whatsapp_notif_settings', label: 'Notifikasi Template', icon: <MessageSquare size={18} /> },


            ]
        }
    ];

    return (
        <div className="flex bg-gray-50 min-h-[calc(100vh-140px)]">
            {/* Sidebar */}
            <div className="w-72 bg-white border-r border-gray-100 flex-shrink-0">
                <div className="p-4">
                    {sidebarItems.map((section, idx) => (
                        <div key={idx} className="mb-8">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">{section.category}</h3>
                            <div className="space-y-1">
                                {section.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-3 ${activeTab === item.id
                                            ? 'bg-naqupos-cream text-naqupos-primary shadow-sm ring-1 ring-naqupos-primary/10'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                            } `}
                                    >
                                        <span className={`${activeTab === item.id ? 'text-naqupos-primary' : 'text-gray-400'}`}>
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 px-8 py-6 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
                            <p className="text-sm text-gray-500 mt-1">Kelola seluruh konfigurasi salon dan layanan Anda di sini.</p>
                        </div>
                        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <label className="text-sm text-gray-600 font-bold ml-2">Pilih Cabang:</label>
                            <SearchableSelect
                                value={selectedBranchId}
                                onChange={(val: string | number) => setSelectedBranchId(val === '' ? '' : Number(val))}
                                options={[
                                    { value: '', label: 'Semua Cabang' },
                                    ...branches.map(branch => ({ value: branch.id, label: branch.name }))
                                ]}
                                className="min-w-[220px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
                    {/* Company Details Tab */}
                    {activeTab === 'company' && (
                        <div className="w-full space-y-6">
                            {!selectedBranchId ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <Building size={64} className="mb-4 text-gray-300" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Pilih Cabang</h3>
                                        <p className="max-w-md mx-auto">Silakan pilih cabang terlebih dahulu di bagian atas untuk mengatur informasi perusahaan dan lokasi.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Perusahaan</label>
                                            <input
                                                type="text"
                                                value={companySettings.name}
                                                onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                            <textarea
                                                rows={3}
                                                value={companySettings.description}
                                                onChange={(e) => setCompanySettings({ ...companySettings, description: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none resize-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Alamat Lengkap</label>
                                            <textarea
                                                rows={2}
                                                value={companySettings.address}
                                                onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none resize-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                                            <input
                                                type="url"
                                                value={companySettings.website}
                                                onChange={(e) => setCompanySettings({ ...companySettings, website: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
                                            <input
                                                type="tel"
                                                value={companySettings.phone}
                                                onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Kota</label>
                                            <input
                                                type="text"
                                                value={companySettings.city}
                                                onChange={(e) => setCompanySettings({ ...companySettings, city: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Provinsi</label>
                                            <input
                                                type="text"
                                                value={companySettings.province}
                                                onChange={(e) => setCompanySettings({ ...companySettings, province: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                                            <input
                                                type="text"
                                                value={companySettings.latitude}
                                                onChange={(e) => setCompanySettings({ ...companySettings, latitude: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                                            <input
                                                type="text"
                                                value={companySettings.longitude}
                                                onChange={(e) => setCompanySettings({ ...companySettings, longitude: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                placeholder=""
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Format Waktu</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setCompanySettings({ ...companySettings, timeFormat: '24h' })}
                                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${companySettings.timeFormat === '24h' ? 'bg-naqupos-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} `}
                                                >
                                                    24h
                                                </button>
                                                <button
                                                    onClick={() => setCompanySettings({ ...companySettings, timeFormat: '12h' })}
                                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${companySettings.timeFormat === '12h' ? 'bg-naqupos-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} `}
                                                >
                                                    12h
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Zona Waktu</label>
                                            <SearchableSelect
                                                value={companySettings.timezone}
                                                onChange={(val: string | number) => setCompanySettings({ ...companySettings, timezone: val.toString() })}
                                                options={[
                                                    { value: 'WIB', label: 'WIB (Waktu Indonesia Barat)' },
                                                    { value: 'WITA', label: 'WITA (Waktu Indonesia Tengah)' },
                                                    { value: 'WIT', label: 'WIT (Waktu Indonesia Timur)' }
                                                ]}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Negara</label>
                                            <SearchableSelect
                                                value={companySettings.country}
                                                onChange={(val: string | number) => setCompanySettings({ ...companySettings, country: val.toString() })}
                                                options={[{ value: 'Indonesia', label: 'Indonesia' }]}
                                                disabled
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Mata Uang</label>
                                            <SearchableSelect
                                                value={companySettings.currency}
                                                onChange={(val: string | number) => setCompanySettings({ ...companySettings, currency: val.toString() })}
                                                options={[{ value: 'Rupiah', label: 'Rupiah' }]}
                                                disabled
                                            />
                                        </div>

                                    </div>


                                    {/* Jam Kerja Standar */}
                                    <div className="mt-8 pt-6 border-t border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Jam Kerja Standar</h3>
                                        <p className="text-sm text-gray-500 mb-6">Anda dapat mengatur Jam Kerja untuk setiap lokasi</p>

                                        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-gray-900">Mode Jadwal Operasional</h4>
                                                <p className="text-xs text-gray-500">Pilih apakah ingin menggunakan jam operasional yang sama untuk setiap hari (Pukul Rata) atau berbeda-beda (Terpisah-pisah).</p>
                                            </div>
                                            <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => setCompanySettings({ ...companySettings, use_specific_operating_hours: false })}
                                                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${!companySettings.use_specific_operating_hours ? 'bg-naqupos-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    Pukul Rata
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCompanySettings({ ...companySettings, use_specific_operating_hours: true })}
                                                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${companySettings.use_specific_operating_hours ? 'bg-naqupos-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    Terpisah-pisah
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            {/* Column Headers */}
                                            <div className="grid grid-cols-3 gap-4 px-3 pb-2 border-b border-gray-100 mb-2">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hari</span>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jam Buka</span>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jam Tutup</span>
                                            </div>
                                            {/* Day Rows */}
                                            <div className="space-y-2">
                                                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                                                    const dayConfig = companySettings.operating_days?.find((d: any) => (typeof d === 'object' ? d.day === day : d === day));
                                                    const isActive = !!dayConfig;
                                                    const openTime = !companySettings.use_specific_operating_hours ? companySettings.defaultOpenTime : ((typeof dayConfig === 'object' && dayConfig.open) ? dayConfig.open : companySettings.defaultOpenTime);
                                                    const closeTime = !companySettings.use_specific_operating_hours ? companySettings.defaultCloseTime : ((typeof dayConfig === 'object' && dayConfig.close) ? dayConfig.close : companySettings.defaultCloseTime);
                                                    const isTimeDisabled = !isActive || !companySettings.use_specific_operating_hours;

                                                    return (
                                                        <div key={day} className={`grid grid-cols-3 gap-4 items-center px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-naqupos-primary/5' : 'bg-gray-50/50'}`}>
                                                            {/* Col 1: Day checkbox */}
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isActive}
                                                                    onChange={(e) => {
                                                                        const current = companySettings.operating_days || [];
                                                                        let next;
                                                                        if (e.target.checked) {
                                                                            next = [...current, { day, active: true, open: companySettings.defaultOpenTime, close: companySettings.defaultCloseTime }];
                                                                        } else {
                                                                            next = current.filter((d: any) => (typeof d === 'object' ? d.day !== day : d !== day));
                                                                        }
                                                                        setCompanySettings({ ...companySettings, operating_days: next });
                                                                    }}
                                                                    className="w-4 h-4 rounded text-naqupos-primary focus:ring-naqupos-primary"
                                                                />
                                                                <span className={`text-sm font-semibold ${isActive ? 'text-naqupos-primary' : 'text-gray-400'}`}>{day}</span>
                                                            </label>
                                                            {/* Col 2: Open time */}
                                                            <input
                                                                type="time"
                                                                value={openTime}
                                                                onChange={(e) => {
                                                                    const next = companySettings.operating_days.map((d: any) => {
                                                                        const dDay = typeof d === 'object' ? d.day : d;
                                                                        if (dDay === day) {
                                                                            return { day, active: true, open: e.target.value, close: closeTime };
                                                                        }
                                                                        return d;
                                                                    });
                                                                    setCompanySettings({ ...companySettings, operating_days: next });
                                                                }}
                                                                className={`w-full px-3 py-1.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-naqupos-primary transition-all ${isTimeDisabled ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300'}`}
                                                                disabled={isTimeDisabled}
                                                            />
                                                            {/* Col 3: Close time */}
                                                            <input
                                                                type="time"
                                                                value={closeTime}
                                                                onChange={(e) => {
                                                                    const next = companySettings.operating_days.map((d: any) => {
                                                                        const dDay = typeof d === 'object' ? d.day : d;
                                                                        if (dDay === day) {
                                                                            return { day, active: true, open: openTime, close: e.target.value };
                                                                        }
                                                                        return d;
                                                                    });
                                                                    setCompanySettings({ ...companySettings, operating_days: next });
                                                                }}
                                                                className={`w-full px-3 py-1.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-naqupos-primary transition-all ${isTimeDisabled ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300'}`}
                                                                disabled={isTimeDisabled}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Default open/close time — shown below the per-day schedule */}
                                        {!companySettings.use_specific_operating_hours && (
                                            <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Jam Buka</label>
                                                    <input
                                                        type="time"
                                                        value={companySettings.defaultOpenTime}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            const nextDays = (companySettings.operating_days || []).map((d: any) => ({
                                                                ...(typeof d === 'string' ? { day: d } : d),
                                                                open: newVal
                                                            }));
                                                            setCompanySettings({ ...companySettings, defaultOpenTime: newVal, operating_days: nextDays });
                                                        }}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Jam Tutup</label>
                                                    <input
                                                        type="time"
                                                        value={companySettings.defaultCloseTime}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            const nextDays = (companySettings.operating_days || []).map((d: any) => ({
                                                                ...(typeof d === 'string' ? { day: d } : d),
                                                                close: newVal
                                                            }));
                                                            setCompanySettings({ ...companySettings, defaultCloseTime: newVal, operating_days: nextDays });
                                                        }}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C58940] focus:border-[#C58940] outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Settings */}


                                    <div className="mt-6 flex justify-end">
                                        <button
                                            onClick={handleSaveCompanySettings}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent transition-colors disabled:opacity-50"
                                        >
                                            <Save size={18} />
                                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Settings Tab - Moved from Company */}
                    {activeTab === 'payment_settings' && (
                        <div className="w-full space-y-6 animate-in fade-in duration-500">
                            {!selectedBranchId ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                            <CreditCard size={40} className="text-gray-300" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Pilih Cabang</h3>
                                        <p className="max-w-md mx-auto text-gray-500">Silakan pilih cabang terlebih dahulu di bagian atas untuk mengatur konfigurasi pembayaran cabang.</p>                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Pengaturan Pembayaran</h3>
                                            <p className="text-sm text-gray-500 font-medium">Atur kebijakan DP, pajak, dan biaya layanan cabang ini.</p>
                                        </div>
                                    </div>

                                    {/* Opsi Pembayaran: Full Payment / DP / COD toggles */}
                                    <div className="space-y-1 pl-1">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Opsi Pembayaran Booking Online</label>
                                        <p className="text-xs text-gray-400 font-medium">Pilih metode pembayaran yang bisa dipakai customer saat booking. Bisa aktifkan lebih dari satu, minimal satu harus aktif.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-start justify-between gap-3 p-5 rounded-2xl border-2 border-gray-50 bg-gray-50/50">
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">Pembayaran Penuh</p>
                                                <p className="text-xs text-gray-400 font-medium mt-1">Customer bayar lunas di muka, tanpa DP.</p>
                                            </div>
                                            <Toggle
                                                checked={companySettings.enableFullPayment}
                                                onChange={(val) => setCompanySettings({ ...companySettings, enableFullPayment: val })}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-3 p-5 rounded-2xl border-2 border-gray-50 bg-gray-50/50">
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">DP (Uang Muka)</p>
                                                <p className="text-xs text-gray-400 font-medium mt-1">Customer bayar sebagian dulu untuk konfirmasi.</p>
                                            </div>
                                            <Toggle
                                                checked={companySettings.enableDp}
                                                onChange={(val) => setCompanySettings({ ...companySettings, enableDp: val })}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-3 p-5 rounded-2xl border-2 border-gray-50 bg-gray-50/50">
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">COD (Bayar di Tempat)</p>
                                                <p className="text-xs text-gray-400 font-medium mt-1">Booking langsung terkonfirmasi, bayar tunai saat kedatangan.</p>
                                            </div>
                                            <Toggle
                                                checked={companySettings.enableCod}
                                                onChange={(val) => setCompanySettings({ ...companySettings, enableCod: val })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Timeout Bayar (Menit)</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={companySettings.paymentTimeout === 0 ? '' : companySettings.paymentTimeout.toString()}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setCompanySettings({ ...companySettings, paymentTimeout: val === '' ? 0 : parseInt(val) });
                                                    }}
                                                    placeholder="15"
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all"
                                                />
                                                <Clock size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-naqupos-primary transition-colors" />
                                            </div>
                                        </div>

                                        <div className={`space-y-4 transition-all duration-300 ${!companySettings.enableDp ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Minimal DP (Rp)</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                                                <input
                                                    type="text"
                                                    value={companySettings.minDP === 0 ? '' : companySettings.minDP.toLocaleString('id-ID')}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                                        const numValue = rawValue === '' ? 0 : parseInt(rawValue);
                                                        setCompanySettings({ ...companySettings, minDP: numValue });
                                                    }}
                                                    placeholder="50.000"
                                                    className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className={`col-span-1 md:col-span-2 space-y-4 transition-all duration-300 ${!companySettings.enableDp ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Tipe Minimal DP (Opsional)</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setCompanySettings({ ...companySettings, minDPType: 'global' })}
                                                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${companySettings.minDPType === 'global'
                                                        ? 'border-naqupos-primary bg-naqupos-cream/30 text-naqupos-primary shadow-md'
                                                        : 'border-gray-50 hover:border-gray-200 text-gray-500 bg-gray-50/50'
                                                        }`}
                                                >
                                                    <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${companySettings.minDPType === 'global' ? 'border-naqupos-primary' : 'border-gray-300'}`}>
                                                        {companySettings.minDPType === 'global' && <div className="w-3.5 h-3.5 rounded-full bg-naqupos-primary shadow-sm" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-base font-bold mb-1">DP Global</p>
                                                        <p className="text-xs leading-relaxed opacity-70 font-medium">Minimal DP berlaku untuk satu reservasi (Contoh: tetap Rp 50.000 berapapun tamunya)</p>
                                                    </div>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setCompanySettings({ ...companySettings, minDPType: 'per_guest' })}
                                                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${companySettings.minDPType === 'per_guest'
                                                        ? 'border-naqupos-primary bg-naqupos-cream/30 text-naqupos-primary shadow-md'
                                                        : 'border-gray-50 hover:border-gray-200 text-gray-500 bg-gray-50/50'
                                                        }`}
                                                >
                                                    <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${companySettings.minDPType === 'per_guest' ? 'border-naqupos-primary' : 'border-gray-300'}`}>
                                                        {companySettings.minDPType === 'per_guest' && <div className="w-3.5 h-3.5 rounded-full bg-naqupos-primary shadow-sm" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-base font-bold mb-1">DP Per Tamu</p>
                                                        <p className="text-xs leading-relaxed opacity-70 font-medium">Minimal DP dikalikan jumlah tamu (Contoh: Rp 50.000 x 2 tamu = Rp 100.000)</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between pl-1">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Pajak (%)</label>
                                                <Toggle
                                                    checked={companySettings.isTaxEnabled}
                                                    onChange={(val) => setCompanySettings({ ...companySettings, isTaxEnabled: val })}
                                                />
                                            </div>
                                            <div className={`relative group transition-all duration-300 ${!companySettings.isTaxEnabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                                <input
                                                    type="text"
                                                    value={companySettings.tax === 0 ? '' : companySettings.tax.toString()}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                                        setCompanySettings({ ...companySettings, tax: val === '' ? 0 : parseFloat(val) });
                                                    }}
                                                    placeholder="11"
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all"
                                                />
                                                <Percent size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-naqupos-primary" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between pl-1">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Service Charge (%)</label>
                                                <Toggle
                                                    checked={companySettings.isServiceChargeEnabled}
                                                    onChange={(val) => setCompanySettings({ ...companySettings, isServiceChargeEnabled: val })}
                                                />
                                            </div>
                                            <div className={`relative group transition-all duration-300 ${!companySettings.isServiceChargeEnabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                                <input
                                                    type="text"
                                                    value={companySettings.serviceCharge === 0 ? '' : companySettings.serviceCharge.toString()}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                                        setCompanySettings({ ...companySettings, serviceCharge: val === '' ? 0 : parseFloat(val) });
                                                    }}
                                                    placeholder="5"
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all"
                                                />
                                                <Percent size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-naqupos-primary" />
                                            </div>
                                        </div>

                                        {/* T&C Booking */}
<div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10 space-y-6">
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                <FileText size={24} />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-900">Syarat & Ketentuan Booking</h3>
                <p className="text-sm text-gray-500 font-medium">Teks T&C yang muncul saat pelanggan checkout.</p>
            </div>
        </div>
        <Toggle
            checked={companySettings.tnc_enabled}
            onChange={(val) => setCompanySettings({ ...companySettings, tnc_enabled: val })}
        />
    </div>

    {companySettings.tnc_enabled && (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Judul Modal
                </label>
                <input
                    type="text"
                    value={companySettings.tnc_title}
                    onChange={(e) => setCompanySettings({ ...companySettings, tnc_title: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700"
                    placeholder="Syarat & Ketentuan"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Isi Konten
                </label>
                <textarea
                    rows={14}
                    value={companySettings.tnc_content}
                    onChange={(e) => setCompanySettings({ ...companySettings, tnc_content: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none text-gray-700 resize-none font-mono text-sm leading-relaxed"
                    placeholder={"1. Down Payment\nDP yang dibayarkan tidak dapat dikembalikan...\n\n2. Pembatalan\nPembatalan kurang dari 24 jam..."}
                />
                <p className="text-xs text-gray-400 mt-2 pl-1">
                    Gunakan format: <code className="bg-gray-100 px-1 rounded">1. Judul Poin</code> lalu baris baru untuk isi. Pisah antar poin dengan baris kosong.
                </p>
            </div>
        </div>
    )}
</div>
                                    </div>

                                    <div className="pt-6 flex justify-end">
                                        <button
                                            onClick={handleSaveCompanySettings}
                                            disabled={saving}
                                            className="group flex items-center gap-3 px-10 py-4 bg-naqupos-primary text-white rounded-2xl hover:bg-naqupos-accent transition-all duration-300 font-bold shadow-lg shadow-naqupos-primary/25 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
                                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interval Settings Tab */}
                    {activeTab === 'interval_settings' && (
                        <div className="w-full space-y-6 animate-in fade-in duration-500">
                            {!selectedBranchId ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                            <Clock size={40} className="text-gray-300" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Pilih Cabang</h3>
                                        <p className="max-w-md mx-auto text-gray-500">Silakan pilih cabang terlebih dahulu di bagian atas untuk mengatur interval waktu operasional.</p>                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Pengaturan Interval</h3>
                                            <p className="text-sm text-gray-500 font-medium">Atur interval waktu untuk jadwal kasir dan durasi layanan.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Interval Kasir / POS (Menit)</label>
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    value={companySettings.posTimeInterval}
                                                    onChange={(e) => setCompanySettings({ ...companySettings, posTimeInterval: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all text-xl"
                                                />
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-400">MENIT</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 pl-1 font-medium italic">
                                                * Digunakan untuk pembagian jadwal pada menu Kasir (POS).
                                            </p>
                                        </div>

<div className="space-y-4">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Interval Ubah Jadwal (Menit)</label>
                        <div className="relative group">
                            <select
                                value={calendarSettings.rescheduleInterval}
                                onChange={(e) => setCalendarSettings({ ...calendarSettings, rescheduleInterval: Number(e.target.value) })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all text-xl appearance-none"
                            >
                                <option value={5}>5 Menit</option>
                                <option value={10}>10 Menit</option>
                                <option value={15}>15 Menit</option>
                                <option value={20}>20 Menit</option>

                                <option value={30}>30 Menit</option>
                                <option value={60}>60 Menit</option>
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown size={18} className="text-gray-400" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 pl-1 font-medium italic">
                            * Digunakan untuk pilihan slot waktu saat melakukan ubah jadwal.
                        </p>
                    </div>


                                        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200/50 flex gap-4">
                                            <Info className="shrink-0 text-amber-600 mt-1" size={20} />
                                            <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                                <strong>Pengaturan Konsolidasi:</strong><br />
                                                Interval Kalender sekarang dikelola sepenuhnya di tab <span className="font-bold underline cursor-pointer" onClick={() => setActiveTab('calendar')}>Pengaturan Kalender</span>. Perubahan di sana akan otomatis diterapkan pada Kalender Admin dan aplikasi Booking Pelanggan.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-6 flex justify-end">
                                        <button
                                            onClick={handleSaveIntervalSettings}
                                            disabled={saving}
                                            className="group flex items-center gap-3 px-10 py-4 bg-naqupos-primary text-white rounded-2xl hover:bg-naqupos-accent transition-all duration-300 font-bold shadow-lg shadow-naqupos-primary/25 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
                                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}



                    {/* Closed Dates Tab */}
                    {activeTab === 'closed' && (
                        <div className="w-full animate-in fade-in duration-500">
                            <div className="bg-white rounded-lg border border-gray-200">
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">Tanggal Tutup</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowDateFilter(true)}
                                            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 bg-white"
                                        >
                                            <Filter size={16} />
                                            {formatDateRangeDisplay(dateRange.start, dateRange.end)}
                                        </button>
                                        <button
                                            onClick={() => setShowClosedDateModal(true)}
                                            disabled={!selectedBranchId}
                                            className="flex items-center gap-2 px-4 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Plus size={18} />
                                            Tambah
                                        </button>
                                    </div>
                                </div>

                                {!selectedBranchId ? (
                                    <div className="p-8 text-center text-gray-500">
                                        Pilih cabang terlebih dahulu untuk melihat tanggal tutup
                                    </div>
                                ) : closedDates.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        Belum ada tanggal tutup
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {closedDates.map((date) => (
                                            <div key={date.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                                <div className="flex items-center gap-4">
                                                    <Calendar className="text-gray-400" size={20} />
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">{date.name}</h4>
                                                        <p className="text-sm text-gray-500">
                                                            {new Date(date.start_date).toLocaleDateString('id-ID')}
                                                            {date.end_date && date.end_date !== date.start_date && ` - ${new Date(date.end_date).toLocaleDateString('id-ID')} `}
                                                        </p>
                                                        {date.reason && <p className="text-xs text-gray-400 mt-1">{date.reason}</p>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteClosedDate(date.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bank Accounts / Settlement Tab */}
              {activeTab === 'bank' && (
    <div className="w-full animate-in fade-in duration-500">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex items-center justify-center">
            <div className="text-center px-8 py-20">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-naqupos-cream rounded-3xl rotate-6"></div>
                    <div className="absolute inset-0 bg-naqupos-primary/10 rounded-3xl -rotate-3"></div>
                    <div className="relative w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center border border-gray-100">
                        <Banknote size={40} className="text-naqupos-primary" />
                    </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full mb-6">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Segera Hadir</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Rekening Bank & Settlement</h3>
                <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed font-medium">
                    Fitur manajemen rekening bank dan penyelesaian transaksi sedang dalam pengembangan. Segera hadir untuk memudahkan pengelolaan keuangan cabang Anda.
                </p>
                <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400 font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                        Manajemen Rekening
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                        Laporan Settlement
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                        Riwayat Transaksi
                    </div>
                </div>
            </div>
        </div>
    </div>
)}

                    {/* Calendar Settings */}
                    {activeTab === 'calendar' && (
                        <div className="w-full animate-in fade-in duration-500">
                            {/* Header Section */}
                            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm mb-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-naqupos-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2 relative z-10">Pengaturan Kalender</h3>
                                <p className="text-gray-500 relative z-10">Sesuaikan tampilan dan perilaku kalender operasional Anda untuk efisiensi maksimal.</p>
                            </div>

                            {!selectedBranchId ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <Calendar size={64} className="mb-4 text-gray-300" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Pilih Cabang</h3>
                                        <p className="max-w-md mx-auto">Silakan pilih cabang terlebih dahulu di bagian atas untuk mengatur kalender operasional.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Left Column */}
                                        <div className="space-y-6">
                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                                                        <Sparkles size={16} />
                                                    </div>
                                                    Warna Agenda
                                                </label>
                                                <SearchableSelect
                                                    value={calendarSettings.agendaColor}
                                                    onChange={(val: string | number) => setCalendarSettings({ ...calendarSettings, agendaColor: val.toString() })}
                                                    options={[
                                                        { value: 'staff', label: 'Berdasarkan staf dipesan' },
                                                        { value: 'status', label: 'Berdasarkan status pemesanan' },
                                                        { value: 'service_group', label: 'Berdasarkan kelompok layanan' }
                                                    ]}
                                                />
                                                <p className="mt-2 text-xs text-gray-400">Pilih bagaimana warna blok reservasi ditampilkan di kalender.</p>
                                            </div>

                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                        <Clock size={16} />
                                                    </div>
                                                    Interval Slot Waktu
                                                </label>
                                                <SearchableSelect
                                                    value={calendarSettings.slotInterval}
                                                    onChange={(val: string | number) => setCalendarSettings({ ...calendarSettings, slotInterval: Number(val) })}
                                                    options={[
                                                        { value: 5, label: '5 Menit' },
                                                        { value: 10, label: '10 Menit' },
                                                        { value: 15, label: '15 Menit' },
                                                        { value: 30, label: '30 Menit' },
                                                        { value: 60, label: '60 Menit' }
                                                    ]}
                                                />
                                                <p className="mt-2 text-xs text-gray-400">Durasi setiap kotak grid pada tampilan kalender.</p>
                                            </div>

                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                                        <Layout size={16} />
                                                    </div>
                                                    Tampilan Default
                                                </label>
                                                <SearchableSelect
                                                    value={calendarSettings.defaultView}
                                                    onChange={(val: string | number) => setCalendarSettings({ ...calendarSettings, defaultView: val.toString() })}
                                                    options={[
                                                        { value: 'day', label: 'Harian (Day)' },
                                                        { value: 'week', label: 'Mingguan (Week)' },
                                                        { value: 'month', label: 'Bulanan (Month)' }
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="space-y-6">
                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                                        <Calendar size={16} />
                                                    </div>
                                                    Awal Minggu
                                                </label>
                                                <SearchableSelect
                                                    value={calendarSettings.weekStart}
                                                    onChange={(val: string | number) => setCalendarSettings({ ...calendarSettings, weekStart: val.toString() })}
                                                    options={[
                                                        { value: 'sunday', label: 'Minggu' },
                                                        { value: 'monday', label: 'Senin' },
                                                        { value: 'tuesday', label: 'Selasa' },
                                                        { value: 'wednesday', label: 'Rabu' },
                                                        { value: 'thursday', label: 'Kamis' },
                                                        { value: 'friday', label: 'Jumat' },
                                                        { value: 'saturday', label: 'Sabtu' }
                                                    ]}
                                                />
                                                <p className="mt-2 text-xs text-gray-400">Hari pertama yang muncul pada tampilan mingguan.</p>
                                            </div>

                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                                        <Users size={16} />
                                                    </div>
                                                    Urutan Terapis
                                                </label>
                                                <SearchableSelect
                                                    value={calendarSettings.staffOrder}
                                                    onChange={(val: string | number) => setCalendarSettings({ ...calendarSettings, staffOrder: val.toString() })}
                                                    options={[
                                                        { value: 'default', label: 'Urutan Bawaan' },
                                                        { value: 'name', label: 'Dipesan berdasarkan kehadiran staff' }
                                                    ]}
                                                />
                                            </div>



                                            {/* Reschedule Policy Section */}
                                            <div className="p-5 bg-naqupos-cream/30 rounded-2xl border border-naqupos-primary/10">
                                                <h4 className="text-xs font-bold text-naqupos-primary uppercase tracking-widest mb-4">Kebijakan Jadwal Ulang</h4>
                                                <div className="space-y-4">
                                                    <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all">
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900">Aktifkan Jadwal Ulang</p>
                                                            <p className="text-[10px] text-gray-500">Pelanggan bisa mengubah jadwal</p>
                                                        </div>
                                                        <Toggle
                                                            checked={calendarSettings.allow_reschedule}
                                                            onChange={(checked) => setCalendarSettings({ ...calendarSettings, allow_reschedule: checked })}
                                                        />
                                                    </label>

                                                    {calendarSettings.allow_reschedule && (
                                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Batas Waktu (Jam)</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={calendarSettings.reschedule_deadline}
                                                                    onChange={(e) => setCalendarSettings({ ...calendarSettings, reschedule_deadline: parseInt(e.target.value) })}
                                                                    className="w-full pl-4 pr-12 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary outline-none font-bold text-gray-700 text-sm"
                                                                    placeholder="24"
                                                                />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">JAM</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end items-center gap-4">
                                        <button
                                            onClick={() => { /* reset logic if needed */ }}
                                            className="px-6 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                                        >
                                            Batalkan
                                        </button>
                                        <button
                                            onClick={handleSaveCalendarSettings}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-8 py-3 bg-naqupos-primary text-white rounded-xl hover:bg-naqupos-accent transition-all transform active:scale-95 shadow-lg shadow-naqupos-primary/20 font-bold disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={18} />
                                                    Simpan Perubahan
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notifications Tab */}
                  {activeTab === 'notifications' && (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
        {!selectedBranchId ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                <div className="flex flex-col items-center justify-center text-gray-500">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Bell size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Pilih Cabang</h3>
                    <p className="max-w-md mx-auto text-gray-500">Silakan pilih cabang terlebih dahulu di bagian atas untuk mengatur pemberitahuan staf.</p>
                </div>
            </div>
        ) : (
            <>
                {/* Agenda Notification */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 flex items-center justify-between border-b border-gray-100 bg-gray-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Pemberitahuan Agenda</h3>
                                <p className="text-sm text-gray-500">Notifikasi status booking secara otomatis ke staf.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${notificationSettings.agenda.enabled ? 'text-naqupos-primary' : 'text-gray-400'}`}>
                                {notificationSettings.agenda.enabled ? 'Aktif' : 'Nonaktif'}
                            </span>
                            <Toggle
                                checked={notificationSettings.agenda.enabled}
                                onChange={(checked) => setNotificationSettings({
                                    ...notificationSettings,
                                    agenda: { ...notificationSettings.agenda, enabled: checked }
                                })}
                            />
                        </div>
                    </div>
                    {notificationSettings.agenda.enabled && (
                        <div className="p-6 space-y-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex gap-3 text-sm text-gray-600">
                                <Calendar size={20} className="shrink-0 text-gray-500" />
                                <p>Kirim notifikasi status booking ke staff secara otomatis, seperti "dikonfirmasi", "diperbarui", dan "dibatalkan"</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Kirim ke Staff */}
                                <div className="space-y-4">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Penerima</p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.agenda.notifyBookedStaff}
                                                onChange={(e) => setNotificationSettings({
                                                    ...notificationSettings,
                                                    agenda: { ...notificationSettings.agenda, notifyBookedStaff: e.target.checked }
                                                })}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                            />
                                            <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                            Kirim ke staff yang dibooking
                                        </span>
                                    </label>

                                    {notificationSettings.agenda.notifyBookedStaff && (
                                        <div className="pl-8 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Via</p>
                                            <label className="flex items-center gap-2 cursor-pointer group/ch">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={notificationSettings.agenda.notifyStaffWhatsapp ?? true}
                                                        onChange={(e) => setNotificationSettings({
                                                            ...notificationSettings,
                                                            agenda: { ...notificationSettings.agenda, notifyStaffWhatsapp: e.target.checked }
                                                        })}
                                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                    />
                                                    <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                </div>
                                                <span className="text-sm text-gray-600 group-hover/ch:text-gray-900 transition-colors flex items-center gap-1.5">
                                                    <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-[8px] font-black">W</span>
                                                    </span>
                                                    WhatsApp
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer group/ch">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={notificationSettings.agenda.notifyStaffEmail ?? true}
                                                        onChange={(e) => setNotificationSettings({
                                                            ...notificationSettings,
                                                            agenda: { ...notificationSettings.agenda, notifyStaffEmail: e.target.checked }
                                                        })}
                                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                    />
                                                    <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                </div>
                                                <span className="text-sm text-gray-600 group-hover/ch:text-gray-900 transition-colors flex items-center gap-1.5">
                                                    <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-[8px] font-black">@</span>
                                                    </span>
                                                    Email
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Kirim ke Role */}
                                <div className="space-y-4">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Role Tertentu</p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.agenda.notifyRoles}
                                                onChange={(e) => setNotificationSettings({
                                                    ...notificationSettings,
                                                    agenda: {
                                                        ...notificationSettings.agenda,
                                                        notifyRoles: e.target.checked,
                                                        targetRoles: e.target.checked ? notificationSettings.agenda.targetRoles : []
                                                    }
                                                })}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                            />
                                            <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                            Kirim ke Role Tertentu
                                        </span>
                                    </label>

                                    {notificationSettings.agenda.notifyRoles && (
                                        <div className="pl-8 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                            {/* Channel */}
                                            <div className="space-y-1.5 mb-3">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Via</p>
                                                <label className="flex items-center gap-2 cursor-pointer group/ch">
                                                    <div className="relative flex items-center">
                                                        <input type="checkbox"
                                                            checked={notificationSettings.agenda.notifyRoleWhatsapp ?? true}
                                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, agenda: { ...notificationSettings.agenda, notifyRoleWhatsapp: e.target.checked } })}
                                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                        />
                                                        <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className="text-sm text-gray-600 group-hover/ch:text-gray-900 transition-colors flex items-center gap-1.5">
                                                        <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px] font-black">W</span></span>
                                                        WhatsApp
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer group/ch">
                                                    <div className="relative flex items-center">
                                                        <input type="checkbox"
                                                            checked={notificationSettings.agenda.notifyRoleEmail ?? true}
                                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, agenda: { ...notificationSettings.agenda, notifyRoleEmail: e.target.checked } })}
                                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                        />
                                                        <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className="text-sm text-gray-600 group-hover/ch:text-gray-900 transition-colors flex items-center gap-1.5">
                                                        <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px] font-black">@</span></span>
                                                        Email
                                                    </span>
                                                </label>
                                            </div>
                                            {/* Roles list */}
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Role</p>
                                            {allRoles.map(role => (
                                                <label key={role.id} className="flex items-center gap-2 cursor-pointer group/role">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={notificationSettings.agenda.targetRoles.includes(role.id)}
                                                            onChange={(e) => {
                                                                const newRoles = e.target.checked
                                                                    ? [...notificationSettings.agenda.targetRoles, role.id]
                                                                    : notificationSettings.agenda.targetRoles.filter(id => id !== role.id);
                                                                setNotificationSettings({ ...notificationSettings, agenda: { ...notificationSettings.agenda, targetRoles: newRoles } });
                                                            }}
                                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                        />
                                                        <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className="text-sm text-gray-600 group-hover/role:text-gray-900 transition-colors">{role.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Kirim ke Email custom */}
                                <div className="space-y-4">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Kustom</p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.agenda.notifyEmail}
                                                onChange={(e) => setNotificationSettings({
                                                    ...notificationSettings,
                                                    agenda: { ...notificationSettings.agenda, notifyEmail: e.target.checked }
                                                })}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                            />
                                            <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                            Kirim ke email tertentu
                                        </span>
                                    </label>
                                    {notificationSettings.agenda.notifyEmail && (
                                        <div className="pl-8 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <input
                                                type="email"
                                                value={notificationSettings.agenda.emailRecipients}
                                                onChange={(e) => setNotificationSettings({
                                                    ...notificationSettings,
                                                    agenda: { ...notificationSettings.agenda, emailRecipients: e.target.value }
                                                })}
                                                placeholder="manager@naqupos.com"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-naqupos-primary focus:border-naqupos-primary outline-none text-sm transition-all"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Pisahkan dengan koma untuk banyak email</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Inventory Notification */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 flex items-center justify-between border-b border-gray-100 bg-gray-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                <Briefcase size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Pemberitahuan Inventaris</h3>
                                <p className="text-sm text-gray-500">Notifikasi saat stok produk mencapai batas minimum.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${notificationSettings.inventory.enabled ? 'text-naqupos-primary' : 'text-gray-400'}`}>
                                {notificationSettings.inventory.enabled ? 'Aktif' : 'Nonaktif'}
                            </span>
                            <Toggle
                                checked={notificationSettings.inventory.enabled}
                                onChange={(checked) => setNotificationSettings({
                                    ...notificationSettings,
                                    inventory: { ...notificationSettings.inventory, enabled: checked }
                                })}
                            />
                        </div>
                    </div>
                    {notificationSettings.inventory.enabled && (
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Role */}
                                <div className="space-y-4">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Role Tertentu</p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.inventory.notifyRoles}
                                                onChange={(e) => setNotificationSettings({
                                                    ...notificationSettings,
                                                    inventory: {
                                                        ...notificationSettings.inventory,
                                                        notifyRoles: e.target.checked,
                                                        targetRoles: e.target.checked ? notificationSettings.inventory.targetRoles : []
                                                    }
                                                })}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                            />
                                            <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Kirim ke Role Tertentu</span>
                                    </label>
                                    {notificationSettings.inventory.notifyRoles && (
                                        <div className="pl-8 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="space-y-1.5 mb-3">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Via</p>
                                                <label className="flex items-center gap-2 cursor-pointer group/ch">
                                                    <div className="relative flex items-center">
                                                        <input type="checkbox"
                                                            checked={notificationSettings.inventory.notifyRoleWhatsapp ?? true}
                                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, inventory: { ...notificationSettings.inventory, notifyRoleWhatsapp: e.target.checked } })}
                                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                        />
                                                        <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                                                        <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px] font-black">W</span></span>
                                                        WhatsApp
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer group/ch">
                                                    <div className="relative flex items-center">
                                                        <input type="checkbox"
                                                            checked={notificationSettings.inventory.notifyRoleEmail ?? true}
                                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, inventory: { ...notificationSettings.inventory, notifyRoleEmail: e.target.checked } })}
                                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                        />
                                                        <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                                                        <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px] font-black">@</span></span>
                                                        Email
                                                    </span>
                                                </label>
                                            </div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Role</p>
                                            {allRoles.map(role => (
                                                <label key={role.id} className="flex items-center gap-2 cursor-pointer group/role">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={notificationSettings.inventory.targetRoles.includes(role.id)}
                                                            onChange={(e) => {
                                                                const newRoles = e.target.checked
                                                                    ? [...notificationSettings.inventory.targetRoles, role.id]
                                                                    : notificationSettings.inventory.targetRoles.filter(id => id !== role.id);
                                                                setNotificationSettings({ ...notificationSettings, inventory: { ...notificationSettings.inventory, targetRoles: newRoles } });
                                                            }}
                                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                        />
                                                        <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className="text-sm text-gray-600 group-hover/role:text-gray-900 transition-colors">{role.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Email kustom */}
                                <div className="space-y-4">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Kustom</p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.inventory.notifyEmail}
                                                onChange={(e) => setNotificationSettings({
                                                    ...notificationSettings,
                                                    inventory: { ...notificationSettings.inventory, notifyEmail: e.target.checked }
                                                })}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm focus:ring-naqupos-primary checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                            />
                                            <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Kirim ke email tertentu</span>
                                    </label>
                                    {notificationSettings.inventory.notifyEmail && (
                                        <div className="pl-8 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <input
                                                type="email"
                                                value={notificationSettings.inventory.emailRecipients}
                                                onChange={(e) => setNotificationSettings({
                                                    ...notificationSettings,
                                                    inventory: { ...notificationSettings.inventory, emailRecipients: e.target.value }
                                                })}
                                                placeholder="purchasing@naqupos.com"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-naqupos-primary focus:border-naqupos-primary outline-none text-sm transition-all"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Pisahkan dengan koma untuk banyak email</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSaveNotificationSettings}
                        disabled={saving}
                        className="px-6 py-2.5 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent transition-all font-medium disabled:opacity-50 shadow-md hover:shadow-lg transform active:scale-95 duration-200 flex items-center gap-2"
                    >
                        {saving ? <><Loader2 size={18} className="animate-spin" />Menyimpan...</> : <><CheckCircle size={18} />Simpan Perubahan</>}
                    </button>
                </div>
            </>
        )}
    </div>
)}

                    {/* Queue / Kiosk Settings */}
                    {activeTab === 'queue' && (
                        <div className="w-full space-y-6 animate-in fade-in duration-500">
                            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle size={20} className="shrink-0 text-gray-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-gray-900 text-sm">
                                        Gunakan Mode Antrean untuk mengelola pemesanan dengan mudah tanpa menentukan waktu dan durasi janji temu.
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Antrean akan diterapkan untuk setiap faktur yang dibuat Online atau Offline di Kios Anda!
                                    </p>
                                </div>
                            </div>

                            {/* Theme */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-6">Tema</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Palette size={18} className="text-gray-500" />
                                            <span className="text-sm text-gray-700">Warna latar belakang yang sedang berlangsung</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={queueSettings.theme.ongoingBg}
                                                onChange={(e) => setQueueSettings({
                                                    ...queueSettings,
                                                    theme: { ...queueSettings.theme, ongoingBg: e.target.value }
                                                })}
                                                className="w-8 h-8 rounded-full overflow-hidden border-0 p-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Type size={18} className="text-gray-500" />
                                            <span className="text-sm text-gray-700">Warna teks yang sedang berlangsung</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={queueSettings.theme.ongoingText}
                                                onChange={(e) => setQueueSettings({
                                                    ...queueSettings,
                                                    theme: { ...queueSettings.theme, ongoingText: e.target.value }
                                                })}
                                                className="w-8 h-8 rounded-full overflow-hidden border-0 p-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Kiosk */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-6">Kiosk</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Layanan maksimum yang dapat dipesan oleh pelanggan</label>
                                        <SearchableSelect
                                            value={queueSettings.kiosk.maxServices}
                                            onChange={(val: string | number) => setQueueSettings({
                                                ...queueSettings,
                                                kiosk: { ...queueSettings.kiosk, maxServices: val.toString() }
                                            })}
                                            options={[
                                                { value: 'unlimited', label: 'Tak terbatas' },
                                                { value: '1', label: '1 Layanan' },
                                                { value: '2', label: '2 Layanan' },
                                                { value: '3', label: '3 Layanan' }
                                            ]}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">Nama & nomor telepon diperlukan untuk pemesanan pelanggan</span>
                                        <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                            <input
                                                type="checkbox"
                                                name="toggle"
                                                id="kiosk-phone-toggle"
                                                checked={queueSettings.kiosk.requireNamePhone}
                                                onChange={(e) => setQueueSettings({
                                                    ...queueSettings,
                                                    kiosk: { ...queueSettings.kiosk, requireNamePhone: e.target.checked }
                                                })}
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-blue-500"
                                                style={{ right: queueSettings.kiosk.requireNamePhone ? '0' : 'auto', left: queueSettings.kiosk.requireNamePhone ? 'auto' : '0' }}
                                            />
                                            <label
                                                htmlFor="kiosk-phone-toggle"
                                                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${queueSettings.kiosk.requireNamePhone ? 'bg-naqupos-primary' : 'bg-gray-300'} `}
                                            ></label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Queue Mode Toggle */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-6">Mode Antrian</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">{selectedBranch?.name || 'Pilih Cabang untuk Aktivasi'}</span>
                                    <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                        <input
                                            type="checkbox"
                                            name="toggle"
                                            id="queue-mode-toggle"
                                            checked={queueSettings.queueMode.enabled}
                                            onChange={(e) => setQueueSettings({
                                                ...queueSettings,
                                                queueMode: { ...queueSettings.queueMode, enabled: e.target.checked }
                                            })}
                                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-gray-300"
                                            style={{ right: queueSettings.queueMode.enabled ? '0' : 'auto', left: queueSettings.queueMode.enabled ? 'auto' : '0' }}
                                        />
                                        <label
                                            htmlFor="queue-mode-toggle"
                                            className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${queueSettings.queueMode.enabled ? 'bg-naqupos-primary' : 'bg-gray-300'} `}
                                        ></label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveQueueSettings}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent transition-colors font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Closed Date Modal */}
                    {showClosedDateModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                            <div className="bg-white rounded-[32px] max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-naqupos-cream/30">
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 leading-tight">Tanggal Tutup</h3>
                                        <p className="text-sm text-naqupos-primary font-bold uppercase tracking-widest mt-1">Konfigurasi Libur</p>
                                    </div>
                                    <button onClick={() => setShowClosedDateModal(false)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Nama Hari Libur / Tanggal Tutup</label>
                                        <input
                                            type="text"
                                            value={closedDateForm.name}
                                            onChange={(e) => setClosedDateForm({ ...closedDateForm, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all font-sans"
                                            placeholder="Contoh: Libur Idul Fitri"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Mulai Tanggal</label>
                                            <div className="relative">
                                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={closedDateForm.start_date}
                                                    onChange={(e) => {
                                                        const newStart = e.target.value;
                                                        setClosedDateForm(prev => {
                                                            const updates = { ...prev, start_date: newStart };
                                                            if (prev.end_date && prev.end_date < newStart) {
                                                                updates.end_date = newStart;
                                                            }
                                                            return updates;
                                                        });
                                                    }}
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all text-sm font-sans"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Sampai Tanggal</label>
                                            <div className="relative">
                                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={closedDateForm.end_date}
                                                    onChange={(e) => setClosedDateForm({ ...closedDateForm, end_date: e.target.value })}
                                                    min={closedDateForm.start_date}
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all text-sm font-sans"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Keterangan (Opsional)</label>
                                        <textarea
                                            rows={3}
                                            value={closedDateForm.reason}
                                            onChange={(e) => setClosedDateForm({ ...closedDateForm, reason: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-medium text-gray-700 transition-all resize-none font-sans"
                                            placeholder="Tambahkan catatan jika perlu..."
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            onClick={() => setShowClosedDateModal(false)}
                                            className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all font-bold"
                                        >
                                            BATAL
                                        </button>
                                        <button
                                            onClick={handleAddClosedDate}
                                            disabled={saving}
                                            className="flex-1 px-6 py-4 bg-naqupos-primary text-white rounded-2xl hover:bg-naqupos-accent transition-all font-bold shadow-lg shadow-naqupos-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                            {saving ? 'MENYIMPAN...' : 'SIMPAN'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Bank Account Modal */}
                    {showBankModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                            <div className="bg-white rounded-[32px] max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-naqupos-cream/30">
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 leading-tight">Rekening Bank</h3>
                                        <p className="text-sm text-naqupos-primary font-bold uppercase tracking-widest mt-1">Pembayaran Cabang</p>
                                    </div>
                                    <button onClick={() => {
                                        setShowBankModal(false);
                                        setBankForm({ bank_name: '', account_number: '', account_name: '', branch: '' });
                                    }} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Nama Bank</label>
                                            <input
                                                type="text"
                                                value={bankForm.bank_name}
                                                onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all font-sans"
                                                placeholder="Contoh: BCA"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Kantor Cabang</label>
                                            <input
                                                type="text"
                                                value={bankForm.branch}
                                                onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all font-sans"
                                                placeholder="Contoh: Solo"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Nama Pemilik Rekening</label>
                                        <input
                                            type="text"
                                            value={bankForm.account_name}
                                            onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all font-sans"
                                            placeholder="Nama Sesuai Buku Tabungan"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Nomor Rekening</label>
                                        <input
                                            type="text"
                                            value={bankForm.account_number}
                                            onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value.replace(/[^0-9]/g, '') })}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all font-sans"
                                            placeholder="0000000000"
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            onClick={() => {
                                                setShowBankModal(false);
                                                setBankForm({ bank_name: '', account_number: '', account_name: '', branch: '' });
                                            }}
                                            className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all font-bold"
                                        >
                                            BATAL
                                        </button>
                                        <button
                                            onClick={handleAddBankAccount}
                                            disabled={saving || !bankForm.bank_name || !bankForm.account_number || !bankForm.account_name || !bankForm.branch}
                                            className="flex-1 px-6 py-4 bg-naqupos-primary text-white rounded-2xl hover:bg-naqupos-accent transition-all font-bold shadow-lg shadow-naqupos-primary/20 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                            {saving ? 'MENYIMPAN...' : 'SIMPAN'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Date Filter Modal */}
                    <DateFilterModal
                        isOpen={showDateFilter}
                        onClose={() => setShowDateFilter(false)}
                        onApply={(start, end, option) => {
                            setDateRange({ start, end });
                            setSelectedQuickOption(option);
                        }}
                        initialStartDate={dateRange.start}
                        initialEndDate={dateRange.end}
                        initialQuickOption={selectedQuickOption}
                    />

                    {/* Settlement Date Filter Modal */}
                    <DateFilterModal
                        isOpen={showSettlementDateFilter}
                        onClose={() => setShowSettlementDateFilter(false)}
                        onApply={(start, end, option) => {
                            setSettlementDateRange({ start, end });
                            setSettlementQuickOption(option);
                        }}
                        initialStartDate={settlementDateRange.start}
                        initialEndDate={settlementDateRange.end}
                        initialQuickOption={settlementQuickOption}
                    />

                    {/* Sales Settings Tab */}
                    {activeTab === 'sales' && (
                        <div className="w-full space-y-8 animate-in fade-in duration-500">
                            {!selectedBranchId ? (
                                <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                            <Wallet size={40} className="text-gray-300" />                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Pilih Cabang</h3>
                                        <p className="max-w-md mx-auto text-gray-500">Silakan pilih cabang terlebih dahulu di bagian atas untuk mengatur pengaturan penjualan cabang.</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Cash Register & General */}
                                        <div className="space-y-8">
                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                                        <Wallet size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900">Cash Register</h3>
                                                        <p className="text-sm text-gray-500">Kelola pengaturan laci kasir dan pencatatan kas.</p>
                                                    </div>
                                                </div>

                                                <label className="group flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${salesSettings.registerEnabled ? 'bg-naqupos-primary text-white' : 'bg-white text-gray-400'} `}>
                                                            <CircleDollarSign size={20} />
                                                        </div>
                                                        <span className={`text-sm font-bold transition-colors ${salesSettings.registerEnabled ? 'text-naqupos-primary' : 'text-gray-600'} `}>Aktifkan Cash Register</span>
                                                    </div>
                                                    <Toggle
                                                        checked={salesSettings.registerEnabled}
                                                        onChange={(checked) => setSalesSettings({ ...salesSettings, registerEnabled: checked })}
                                                    />
                                                </label>
                                            </div>

                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                                        <Coins size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900">Pembulatan Pembayaran</h3>
                                                        <p className="text-sm text-gray-500">Atur aturan pembulatan untuk transaksi tunai.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={salesSettings.paymentRounding.enabled}
                                                            onChange={(e) => setSalesSettings({
                                                                ...salesSettings,
                                                                paymentRounding: { ...salesSettings.paymentRounding, enabled: e.target.checked }
                                                            })}
                                                            className="w-5 h-5 text-naqupos-primary bg-gray-100 border-gray-300 rounded focus:ring-naqupos-primary"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">Aktifkan Pembulatan Otomatis</span>
                                                    </label>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Metode Pembulatan</label>
                                                            <SearchableSelect
                                                                value={salesSettings.paymentRounding.mode}
                                                                onChange={(val: string | number) => setSalesSettings({
                                                                    ...salesSettings,
                                                                    paymentRounding: { ...salesSettings.paymentRounding, mode: val as 'up' | 'down' }
                                                                })}
                                                                options={[
                                                                    { value: 'up', label: 'Bulatkan Ke Atas' },
                                                                    { value: 'down', label: 'Bulatkan Ke Bawah' }
                                                                ]}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Jumlah Pembulatan</label>
                                                            <input
                                                                type="number"
                                                                value={salesSettings.paymentRounding.amount}
                                                                onChange={(e) => setSalesSettings({
                                                                    ...salesSettings,
                                                                    paymentRounding: { ...salesSettings.paymentRounding, amount: parseInt(e.target.value) || 0 }
                                                                })}
                                                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-naqupos-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Commission & Vouchers */}
                                        <div className="space-y-8">
                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                                        <Ticket size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900">Voucher & Komisi</h3>
                                                        <p className="text-sm text-gray-500">Konfigurasi perilaku voucher dan perhitungan bonus.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={salesSettings.allowUnpaidVoucherExchange}
                                                            onChange={(e) => setSalesSettings({ ...salesSettings, allowUnpaidVoucherExchange: e.target.checked })}
                                                            className="w-5 h-5 text-naqupos-primary bg-gray-100 border-gray-300 rounded focus:ring-naqupos-primary"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">Izinkan penukaran voucher yang belum lunas</span>
                                                    </label>

                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={salesSettings.commissionByPriceBeforeDiscount}
                                                            onChange={(e) => setSalesSettings({ ...salesSettings, commissionByPriceBeforeDiscount: e.target.checked })}
                                                            className="w-5 h-5 text-naqupos-primary bg-gray-100 border-gray-300 rounded focus:ring-naqupos-primary"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">Hitung komisi berdasarkan harga sebelum diskon</span>
                                                    </label>

                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={salesSettings.commissionAfterDiscount}
                                                            onChange={(e) => setSalesSettings({ ...salesSettings, commissionAfterDiscount: e.target.checked })}
                                                            className="w-5 h-5 text-naqupos-primary bg-gray-100 border-gray-300 rounded focus:ring-naqupos-primary"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">Hitung komisi setelah diskon</span>
                                                    </label>

                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={salesSettings.commissionByPriceIncludeTax}
                                                            onChange={(e) => setSalesSettings({ ...salesSettings, commissionByPriceIncludeTax: e.target.checked })}
                                                            className="w-5 h-5 text-naqupos-primary bg-gray-100 border-gray-300 rounded focus:ring-naqupos-primary"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">Hitung komisi termasuk pajak</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={handleSaveCompanySettings}
                                            disabled={saving}
                                            className="px-8 py-3 bg-naqupos-primary text-white rounded-xl hover:bg-naqupos-accent transition-all font-bold shadow-lg shadow-naqupos-primary/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                            {saving ? 'Menyimpan...' : 'Simpan Peraturan Penjualan'}
                                        </button>
                                    </div>
                                </>)}
                        </div>
                    )}

                    {/* Invoice Settings Tab */}
              {activeTab === 'invoice' && (
    <div className="w-full grid grid-cols-12 gap-8 animate-in fade-in duration-500">
        {!selectedBranchId ? (
            <div className="col-span-12 bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                <div className="flex flex-col items-center justify-center text-gray-500">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <FileText size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Pilih Cabang</h3>
                    <p className="max-w-md mx-auto text-gray-500">Silakan pilih cabang terlebih dahulu.</p>
                </div>
            </div>
        ) : (
            <>
                {/* LEFT PANEL */}
                <div className="col-span-12 lg:col-span-5 space-y-6">

                    {/* Upload Logo & Judul */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                <Monitor size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Identitas Invoice</h3>
                                <p className="text-sm text-gray-500">Logo dan judul yang tampil di bagian atas invoice.</p>
                            </div>
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Logo Bisnis</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                                    {invoiceSettings.logoUrl ? (
                                        <img src={invoiceSettings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <div className="text-center">
                                            <Monitor size={24} className="text-gray-300 mx-auto mb-1" />
                                            <p className="text-[9px] text-gray-400 font-bold">LOGO</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-naqupos-cream text-naqupos-primary rounded-xl font-bold text-sm hover:bg-naqupos-primary hover:text-white transition-all w-fit">
                                        {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        {uploadingLogo ? 'Mengupload...' : 'Upload Logo'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={uploadingLogo}
                                            onChange={handleLogoUpload}
                                        />
                                    </label>
                                    {invoiceSettings.logoUrl && (
                                        <button
                                            onClick={() => setInvoiceSettings({ ...invoiceSettings, logoUrl: '' })}
                                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-bold"
                                        >
                                            <Trash2 size={12} /> Hapus Logo
                                        </button>
                                    )}
                                    <p className="text-[10px] text-gray-400">PNG/JPG, maks 1MB. Disarankan 200x200px.</p>
                                </div>
                            </div>
                        </div>

                        {/* Judul Invoice */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Judul Invoice</label>
                            <input
                                type="text"
                                value={invoiceSettings.invoiceTitle ?? 'INVOICE'}
                                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceTitle: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all text-sm font-bold"
                                placeholder="Contoh: NOTA, STRUK, INVOICE"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Teks yang muncul sebagai judul besar di invoice.</p>
                        </div>

                        {/* Nama Bisnis Override */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nama Bisnis (Override)</label>
                            <input
                                type="text"
                                value={invoiceSettings.businessNameOverride ?? ''}
                                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, businessNameOverride: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all text-sm font-bold"
                                placeholder={companySettings.name || 'Nama bisnis dari pengaturan perusahaan'}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Kosongkan untuk pakai nama dari pengaturan perusahaan.</p>
                        </div>
                    </div>

                    {/* Alamat Invoice Override */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Info Kontak Invoice</h4>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Alamat (Override)</label>
                            <textarea
                                value={invoiceSettings.invoiceAddress}
                                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceAddress: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all text-sm"
                                placeholder={companySettings.address || 'Alamat dari pengaturan perusahaan'}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Kosongkan untuk pakai alamat dari pengaturan perusahaan.</p>
                        </div>

                        {/* Telepon Invoice Override */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Telepon (Override)</label>
                            <input
                                type="text"
                                value={invoiceSettings.invoicePhone}
                                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoicePhone: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all text-sm font-bold"
                                placeholder={companySettings.phone || 'Telepon dari pengaturan perusahaan'}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Kosongkan untuk pakai telepon dari pengaturan perusahaan.</p>
                        </div>

                        {/* Kota Invoice Override */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kota (Override)</label>
                            <input
                                type="text"
                                value={invoiceSettings.invoiceCity}
                                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceCity: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all text-sm font-bold"
                                placeholder={companySettings.city || 'Kota dari pengaturan perusahaan'}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Kosongkan untuk pakai kota dari pengaturan perusahaan.</p>
                        </div>
                    </div>

                    {/* Konten Invoice */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Konten Invoice</h3>
                                <p className="text-sm text-gray-500">Atur informasi apa saja yang muncul di invoice.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {[
                                { key: 'autoPrint', label: 'Print nota secara otomatis' },
                                { key: 'showLogo', label: 'Tampilkan logo' },
                                { key: 'hideCompanyName', label: 'Sembunyikan nama perusahaan' },
                                { key: 'showCustomerName', label: 'Tampilkan nama pelanggan' },
                                { key: 'showCustomerContact', label: 'Tampilkan kontak pelanggan' },
                                { key: 'showCustomerAddress', label: 'Tampilkan alamat pelanggan' },
                                { key: 'showStaffName', label: 'Tampilkan nama staff' },
                                { key: 'hideCashierName', label: 'Sembunyikan nama kasir' },
                                { key: 'showItemDetails', label: 'Tampilkan detail item' },
                                { key: 'showItemPrice', label: 'Tampilkan harga per item' },
                                { key: 'showTax', label: 'Tampilkan pajak', hidden: !companySettings?.isTaxEnabled },
                            ].filter(item => !item.hidden).map((item) => (
                                <label key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer group hover:bg-naqupos-cream/30 transition-all">
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{item.label}</span>
                                    <Toggle
                                        checked={invoiceSettings[item.key as keyof typeof invoiceSettings] as boolean}
                                        onChange={(val) => setInvoiceSettings({ ...invoiceSettings, [item.key]: val })}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Teks Kustom */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Teks Kustom</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Header Kustom</label>
                                <textarea
                                    value={invoiceSettings.customHeader}
                                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, customHeader: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all text-sm"
                                    placeholder="Teks di bagian atas invoice..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Footer Kustom</label>
                                <textarea
                                    value={invoiceSettings.customFooter}
                                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, customFooter: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary transition-all text-sm"
                                    placeholder="Teks di bagian bawah invoice..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveInvoiceSettings}
                            disabled={saving}
                            className="px-8 py-3 bg-naqupos-primary text-white rounded-xl hover:bg-naqupos-accent transition-all font-bold shadow-lg shadow-naqupos-primary/20 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Invoice'}
                        </button>
                    </div>
                </div>

                {/* RIGHT PANEL - PREVIEW */}
                <div className="col-span-12 lg:col-span-7">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sticky top-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Monitor size={20} className="text-gray-400" />
                            <h3 className="text-lg font-bold text-gray-900">Pratinjau Invoice</h3>
                            <span className="text-[10px] font-black bg-green-100 text-green-600 px-2 py-1 rounded-full uppercase tracking-wider">Live Preview</span>
                        </div>

                        <div className="max-w-[300px] mx-auto bg-white border border-gray-200 shadow-xl p-6 font-mono text-[10px] space-y-4">
                            {/* Header */}
                            <div className="text-center space-y-2">
                                {/* Logo */}
                                {invoiceSettings.showLogo && invoiceSettings.logoUrl && (
                                    <div className="flex justify-center mb-2">
                                        <img src={invoiceSettings.logoUrl} alt="Logo" className="h-12 object-contain" />
                                    </div>
                                )}
                                {/* Judul */}
                                <p className="font-black text-sm tracking-widest uppercase">
                                    {invoiceSettings.invoiceTitle || 'INVOICE'}
                                </p>
                                {/* Nama Bisnis */}
                                {!invoiceSettings.hideCompanyName && (
                                    <h4 className="font-bold text-xs uppercase">
                                        {invoiceSettings.businessNameOverride || companySettings.name || 'Naqupos Spa'}
                                    </h4>
                                )}
                                {/* Alamat — override dulu, fallback company settings */}
                                {(invoiceSettings.invoiceAddress || companySettings.address) && (
                                    <p className="text-gray-500 leading-snug">
                                        {invoiceSettings.invoiceAddress || companySettings.address}
                                        {(invoiceSettings.invoiceCity || companySettings.city) && (
                                            <>, {invoiceSettings.invoiceCity || companySettings.city}</>
                                        )}
                                    </p>
                                )}
                                {/* Telepon — override dulu, fallback company settings */}
                                {(invoiceSettings.invoicePhone || companySettings.phone) && (
                                    <p className="text-gray-500">
                                        Telp: {invoiceSettings.invoicePhone || companySettings.phone}
                                    </p>
                                )}
                                {invoiceSettings.customHeader && (
                                    <p className="mt-2 italic border-t border-dashed pt-2 line-clamp-2 text-gray-500">
                                        {invoiceSettings.customHeader}
                                    </p>
                                )}
                            </div>

                            {/* Info Transaksi */}
                            <div className="border-t border-dashed border-gray-300 pt-4 space-y-1">
                                <div className="flex justify-between"><span>No: INV/2026/01/001</span></div>
                                <div className="flex justify-between"><span>Tgl: 27 Jan 2026</span><span>14:30</span></div>
                                {!invoiceSettings.hideCashierName && (
                                    <div className="flex justify-between"><span>Kasir: Admin</span></div>
                                )}
                                {invoiceSettings.showStaffName && (
                                    <div className="flex justify-between"><span>Terapis: Sari</span></div>
                                )}
                                {invoiceSettings.showCustomerName && (
                                    <div className="flex justify-between font-bold border-t border-dashed border-gray-300 mt-2 pt-2">
                                        <span>Pelanggan: Budi Santoso</span>
                                    </div>
                                )}
                                {invoiceSettings.showCustomerContact && (
                                    <div className="flex justify-between text-gray-500"><span>HP: 0812-xxx-xxxx</span></div>
                                )}
                                {invoiceSettings.showCustomerAddress && (
                                    <div className="flex justify-between text-gray-500"><span>Alamat: Jl. Merdeka No.1</span></div>
                                )}
                            </div>

                            {/* Items */}
                            <div className="border-t border-dashed border-gray-300 pt-4 space-y-2">
                                <div className="flex justify-between">
                                    <div className="flex-1">
                                        <p className="font-bold">Massage Tradisional 60'</p>
                                        {invoiceSettings.showItemPrice && (
                                            <p className="text-[8px] text-gray-500">1 x Rp 150.000</p>
                                        )}
                                        {invoiceSettings.showItemDetails && (
                                            <p className="text-[8px] text-gray-500 italic">- Aroma Therapy Lavender</p>
                                        )}
                                    </div>
                                    <span className="font-bold">Rp 150.000</span>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="border-t border-dashed border-gray-300 pt-4 space-y-1">
                                <div className="flex justify-between"><span>Subtotal</span><span>Rp 150.000</span></div>
                                {invoiceSettings.showTax && companySettings?.isTaxEnabled && (
                                    <div className="flex justify-between">
                                        <span>Pajak ({companySettings.tax}%)</span>
                                        <span>Rp {Math.round(150000 * companySettings.tax / 100).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-gray-300">
                                    <span>TOTAL</span>
                                    <span>Rp {(150000 + (invoiceSettings.showTax && companySettings?.isTaxEnabled ? Math.round(150000 * companySettings.tax / 100) : 0)).toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center pt-4 space-y-2 border-t border-dashed border-gray-300">
                                {invoiceSettings.customFooter ? (
                                    <p className="text-gray-500">{invoiceSettings.customFooter}</p>
                                ) : (
                                    <p className="text-gray-500">Terima kasih atas kunjungan Anda!</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )}
    </div>
)}



{/* T&C Tab */}
{activeTab === 'tnc' && (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
        {!selectedBranchId ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                <div className="flex flex-col items-center justify-center text-gray-500">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <FileText size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Pilih Cabang</h3>
                    <p className="max-w-md mx-auto text-gray-500">
                        Silakan pilih cabang terlebih dahulu untuk mengatur Syarat & Ketentuan.
                    </p>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-naqupos-cream rounded-xl flex items-center justify-center text-naqupos-primary">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Syarat & Ketentuan Booking</h3>
                            <p className="text-sm text-gray-500 font-medium">
                                Teks T&C yang muncul saat pelanggan checkout di aplikasi.
                            </p>
                        </div>
                    </div>
                    <Toggle
                        checked={companySettings.tnc_enabled ?? true}
                        onChange={(val) => setCompanySettings({ ...companySettings, tnc_enabled: val })}
                    />
                </div>

                <div className={`space-y-6 transition-all duration-300 ${!(companySettings.tnc_enabled ?? true) ? 'opacity-40 pointer-events-none' : ''}`}>
                    {/* Judul */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Judul Modal
                        </label>
                        <input
                            type="text"
                            value={companySettings.tnc_title ?? 'Syarat & Ketentuan'}
                            onChange={(e) => setCompanySettings({ ...companySettings, tnc_title: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all"
                            placeholder="Syarat & Ketentuan"
                        />
                    </div>

                    {/* Editor + Preview side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Editor */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Isi Konten
                            </label>
                            <textarea
                                rows={18}
                                value={companySettings.tnc_content ?? ''}
                                onChange={(e) => setCompanySettings({ ...companySettings, tnc_content: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none text-gray-700 resize-none font-mono text-sm leading-relaxed transition-all"
                                placeholder={"1. Down Payment\nDP yang dibayarkan tidak dapat dikembalikan...\n\n2. Pembatalan\nPembatalan kurang dari 24 jam..."}
                            />
                            <p className="text-xs text-gray-400 mt-2 pl-1">
                                Format: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">1. Judul Poin</code> lalu Enter untuk isi, baris kosong untuk pisah antar poin.
                            </p>
                        </div>

                        {/* Preview */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Preview
                            </label>
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 min-h-[400px] max-h-[450px] overflow-y-auto space-y-4">
                                {/* Mock Modal Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                    <p className="font-bold text-gray-900 font-serif">
                                        {companySettings.tnc_title || 'Syarat & Ketentuan'}
                                    </p>
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                        <X size={12} className="text-gray-500" />
                                    </div>
                                </div>

                                {/* Content */}
                                {companySettings.tnc_content ? (
                                    companySettings.tnc_content.split(/\n\n+/).map((section: string, idx: number) => {
                                        const lines = section.split('\n');
                                        const heading = lines[0];
                                        const body = lines.slice(1).join('\n');
                                        const isHeading = /^\d+\./.test(heading);
                                        return (
                                            <div key={idx} className="space-y-1">
                                                {isHeading ? (
                                                    <>
                                                        <p className="text-sm font-bold text-gray-800">{heading}</p>
                                                        {body && (
                                                            <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-gray-500 leading-relaxed">{section}</p>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-40 flex items-center justify-center">
                                        <p className="text-xs text-gray-400 italic text-center">
                                            Belum ada konten.<br />Tulis di sebelah kiri untuk preview.
                                        </p>
                                    </div>
                                )}

                                {/* Mock Agree Button */}
                                {companySettings.tnc_content && (
                                    <div className="pt-3 border-t border-gray-200">
                                        <div className="w-full py-2.5 bg-gray-200 rounded-xl text-center text-xs font-bold text-gray-500">
                                            Saya Setuju
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="pt-6 flex justify-end">
                    <button
                        onClick={handleSaveCompanySettings}
                        disabled={saving}
                        className="group flex items-center gap-3 px-10 py-4 bg-naqupos-primary text-white rounded-2xl hover:bg-naqupos-accent transition-all duration-300 font-bold shadow-lg shadow-naqupos-primary/25 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </div>
        )}
    </div>
)}

{activeTab === 'featured_services' && (
    <FeaturedServicesTab selectedBranchId={selectedBranchId} />
)}


{activeTab === 'whatsapp_templates' && (
  <WhatsAppTemplatesTab apiBaseUrl={notificationSettings.whatsapp_config.baseUrl} />
)}

{activeTab === 'whatsapp_notif_settings' && (
  <WhatsAppNotifSettingsTab />
)}

                    {/* Customer Notification Settings Only */}
                    {
                        activeTab === 'customer_notifications' && (
                            <div className="w-full space-y-8 animate-in fade-in duration-500">
                                {!selectedBranchId ? (
                                    <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                                                <MessageSquare size={48} className="text-gray-300" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Pilih Cabang</h3>
                                            <p className="max-w-md mx-auto text-gray-500 font-medium">Silakan pilih cabang terlebih dahulu di bagian atas untuk mulai mengonfigurasi pesan notifikasi pelanggan.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                                        {/* Abstract background elements */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-naqupos-cream/20 rounded-full blur-3xl -mr-32 -mt-32"></div>

                                        <div className="flex bg-gray-50/80 p-2.5 gap-2.5 border-b border-gray-100 backdrop-blur-sm overflow-x-auto">
                                            {['reminder_h1', 'reminder_h2', 'confirmation', 'reschedule', 'cancellation', 'review_request', 'whatsapp_config'].map((tab) => {
                                                const labels: Record<string, string> = {
                                                    reminder_h1: 'Pengingat H-1',
                                                    reminder_h2: 'Pengingat H-2 Jam',
                                                    confirmation: 'Konfirmasi',
                                                    reschedule: 'Jadwal Ulang',
                                                    cancellation: 'Pembatalan',
                                                    review_request: 'Ulasan',
                                                    whatsapp_config: 'Konfigurasi WhatsApp'
                                                };
                                                const icons: Record<string, any> = {
                                                    reminder_h1: <CalendarDays size={14} />,
                                                    reminder_h2: <Clock size={14} />,
                                                    confirmation: <CheckCircle size={14} />,
                                                    reschedule: <Sparkles size={14} />,
                                                    cancellation: <XCircle size={14} />,
                                                    review_request: <Star size={14} />,
                                                    whatsapp_config: <Settings size={14} />
                                                };
                                                return (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setCustomerNotificationTab(tab)}
                                                        className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${customerNotificationTab === tab
                                                            ? 'bg-white text-naqupos-primary shadow-lg shadow-black/5 scale-[1.02] ring-1 ring-black/5'
                                                            : 'text-gray-500 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.01]'} `}
                                                    >
                                                        <span className={customerNotificationTab === tab ? 'text-naqupos-primary' : 'text-gray-400 opacity-70'}>
                                                            {icons[tab]}
                                                        </span>
                                                        {labels[tab]}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-12 pb-10 border-b border-gray-50">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-naqupos-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-naqupos-primary/20">
                                                        <MessageSquare size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                                                                {customerNotificationTab === 'whatsapp_config' ? 'Konfigurasi WhatsApp' : `Notifikasi ${customerNotificationTab === 'reminder_h1' ? 'Pengingat H-1' : customerNotificationTab === 'reminder_h2' ? 'Pengingat H-2 Jam' : customerNotificationTab === 'confirmation' ? 'Konfirmasi' : customerNotificationTab === 'reschedule' ? 'Jadwal Ulang' : customerNotificationTab === 'cancellation' ? 'Pembatalan' : 'Permintaan Ulasan'}`}
                                                            </h3>
                                                            <span className="px-2 py-0.5 bg-naqupos-cream text-naqupos-primary text-[9px] font-black uppercase tracking-wider rounded-full">
                                                                {customerNotificationTab === 'whatsapp_config' ? 'Settings' : 'Automated'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-500 mt-0.5">
                                                            {customerNotificationTab === 'whatsapp_config' ? 'Atur API Base URL dan Token untuk integrasi WhatsApp Business.' : 'Kustomisasi pesan otomatis yang akan dikirimkan ke pelanggan Anda.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {customerNotificationTab !== 'whatsapp_config' && (
                                                    <div className="flex items-center gap-4 bg-white px-2 py-2 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                                                        <div className="flex-1 text-right pl-4 pr-3 border-r border-gray-100">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Status Fitur</p>
                                                            <p className={`text-sm font-bold transition-colors duration-300 ${customerNotifications[customerNotificationTab]?.enabled ? 'text-naqupos-primary' : 'text-gray-400'}`}>
                                                                {customerNotifications[customerNotificationTab]?.enabled ? 'AKTIF' : 'NONAKTIF'}
                                                            </p>
                                                        </div>
                                                        <Toggle
                                                            checked={customerNotifications[customerNotificationTab]?.enabled}
                                                            onChange={(checked) => setCustomerNotifications({
                                                                ...customerNotifications,
                                                                [customerNotificationTab]: { ...customerNotifications[customerNotificationTab], enabled: checked }
                                                            })}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {customerNotificationTab === 'whatsapp_config' ? (
                                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in slide-in-from-bottom-4 duration-500">
                                                    <div className="lg:col-span-8 space-y-10">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                                                <span className="w-8 h-[2px] bg-naqupos-primary"></span>
                                                                Konfigurasi API
                                                            </h4>
                                                        </div>

                                                        <div className="space-y-8">
                                                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                                                                <div className="flex items-center gap-4 p-4 bg-naqupos-cream/20 rounded-2xl border border-naqupos-primary/10 mb-6">
                                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-naqupos-primary">
                                                                        <MapPin size={24} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Konfigurasi Untuk:</p>
                                                                        <p className="text-sm font-bold text-gray-900">
                                                                            {!selectedBranchId ? 'Seluruh Cabang (Global)' : branches.find(b => b.id === Number(selectedBranchId))?.name || 'Cabang Terpilih'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Base URL</label>
                                                                    <input
                                                                        type="text"
                                                                        value={notificationSettings.whatsapp_config.baseUrl}
                                                                        onChange={(e) => setNotificationSettings({
                                                                            ...notificationSettings,
                                                                            whatsapp_config: { ...notificationSettings.whatsapp_config, baseUrl: e.target.value }
                                                                        })}
                                                                        className="w-full px-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50/30 focus:bg-white focus:ring-2 focus:ring-naqupos-primary/5 focus:border-naqupos-primary outline-none text-sm font-bold text-gray-800 transition-all font-mono"
                                                                        placeholder="https://apinaqu.naquposgroupindonesia.com"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">API Token</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="password"
                                                                            value={notificationSettings.whatsapp_config.token}
                                                                            onChange={(e) => setNotificationSettings({
                                                                                ...notificationSettings,
                                                                                whatsapp_config: { ...notificationSettings.whatsapp_config, token: e.target.value }
                                                                            })}
                                                                            className="w-full px-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50/30 focus:bg-white focus:ring-2 focus:ring-naqupos-primary/5 focus:border-naqupos-primary outline-none text-sm font-bold text-gray-800 transition-all font-mono"
                                                                            placeholder="Masukkan API Token..."
                                                                        />
                                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                            <div className="w-8 h-8 bg-naqupos-cream rounded-lg flex items-center justify-center text-naqupos-primary">
                                                                                <CreditCard size={14} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <p className="mt-2 text-[10px] text-gray-400 font-medium italic">* Token ini digunakan untuk autentikasi ke WhatsApp Business API.</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end pt-4">
                                                            <button
                                                                onClick={handleSaveNotificationSettings}
                                                                disabled={saving}
                                                                className="px-8 py-3 bg-naqupos-primary text-white text-sm font-black rounded-xl hover:bg-naqupos-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-naqupos-primary/20 disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                                                            >
                                                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                                SIMPAN PERUBAHAN
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="lg:col-span-4">
                                                        <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden h-fit">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-naqupos-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                                            <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                                                    <Info size={18} className="text-naqupos-primary" />
                                                                </div>
                                                                Informasi
                                                            </h4>
                                                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                                                Konfigurasi ini memungkinkan sistem untuk terhubung dengan layanan WhatsApp Business API secara dinamis.
                                                            </p>
                                                            <div className="space-y-4">
                                                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                                                    <p className="text-white text-xs font-bold mb-1">Penting:</p>
                                                                    <p className="text-gray-400 text-[10px] leading-relaxed">
                                                                        Perubahan pada pengaturan ini akan langsung berdampak pada seluruh fitur pengiriman WhatsApp di sistem (OTP, Reservasi, Promo, dll).
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : customerNotifications[customerNotificationTab]?.enabled ? (
                                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in slide-in-from-bottom-4 duration-500">
                                                    <div className="lg:col-span-8 space-y-10">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                                                <span className="w-8 h-[2px] bg-naqupos-primary"></span>
                                                                Konfigurasi Pesan
                                                            </h4>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setShowNotifSettings(true)}
                                                                    className="flex items-center gap-2 px-4 py-2 border border-gray-100 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all bg-white shadow-sm hover:border-naqupos-primary/20"
                                                                >
                                                                    <Settings size={14} /> Opsi Lanjutan
                                                                </button>
                                                                <button
                                                                    onClick={() => setShowNotifPreview(true)}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all shadow-md shadow-black/10 hover:scale-[1.02]"
                                                                >
                                                                    <Monitor size={14} /> Pratinjau Mobile
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-8">
                                                            <div className="bg-white p-2 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                                                                <div className="p-4 pb-0">
                                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subjek Notifikasi</label>
                                                                    <input
                                                                        type="text"
                                                                        value={customerNotifications[customerNotificationTab].title}
                                                                        onChange={(e) => setCustomerNotifications({
                                                                            ...customerNotifications,
                                                                            [customerNotificationTab]: { ...customerNotifications[customerNotificationTab], title: e.target.value }
                                                                        })}
                                                                        className="w-full px-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50/30 focus:bg-white focus:ring-2 focus:ring-naqupos-primary/5 focus:border-naqupos-primary outline-none text-sm font-bold text-gray-800 transition-all"
                                                                        placeholder="Masukkan subjek pesan..."
                                                                    />
                                                                </div>

                                                                <div className="p-6">
                                                                    <div className="flex justify-between items-center mb-4">
                                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Isi Pesan</label>
                                                                        <span className="text-[10px] font-bold text-naqupos-primary py-1 px-3 bg-naqupos-cream rounded-full">DASHBOARD_VAR ENABLED</span>
                                                                    </div>
                                                                    <div className="relative group">
                                                                        <textarea
                                                                            rows={10}
                                                                            value={customerNotifications[customerNotificationTab].message}
                                                                            onChange={(e) => setCustomerNotifications({
                                                                                ...customerNotifications,
                                                                                [customerNotificationTab]: { ...customerNotifications[customerNotificationTab], message: e.target.value }
                                                                            })}
                                                                            className="w-full px-4 py-4 border border-gray-100 rounded-[1.5rem] bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-naqupos-primary/5 focus:border-naqupos-primary outline-none resize-none font-mono text-xs leading-relaxed text-gray-700 transition-all scrollbar-hide"
                                                                            placeholder="Tulis pesan Anda di sini..."
                                                                        />
                                                                        <div className="absolute right-4 bottom-4 px-3 py-1.5 bg-white border border-gray-100 shadow-md rounded-lg text-[9px] font-black text-gray-400 tracking-wider">
                                                                            {customerNotifications[customerNotificationTab].message.length} <span className="text-gray-300">MODELS</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end pt-4">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        setSaving(true);
                                                                        await api.updateNotificationSettings({
                                                                            customer: customerNotifications,
                                                                            branch_id: selectedBranchId || undefined
                                                                        });
                                                                        toast.success('Pengaturan pemberitahuan pelanggan berhasil disimpan');
                                                                    } catch (error) {
                                                                        console.error('Error saving customer notifications:', error);
                                                                        toast.error('Gagal menyimpan pengaturan');
                                                                    } finally {
                                                                        setSaving(false);
                                                                    }
                                                                }}
                                                                disabled={saving}
                                                                className="flex items-center gap-2 px-6 py-2.5 bg-naqupos-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-naqupos-accent transition-all shadow-lg shadow-naqupos-primary/20 disabled:opacity-50 hover:scale-[1.02] active:scale-95 group"
                                                            >
                                                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} className="group-hover:rotate-12 transition-transform" />}
                                                                {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="lg:col-span-4 space-y-8">
                                                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm h-fit sticky top-8">
                                                            <div className="w-14 h-14 bg-naqupos-cream rounded-2xl flex items-center justify-center text-naqupos-primary mb-6">
                                                                <Copy size={24} />
                                                            </div>
                                                            <h4 className="text-lg font-black text-gray-900 mb-2 border-b-2 border-naqupos-cream pb-4">
                                                                Variabel Cerdas
                                                            </h4>
                                                            <p className="text-xs font-medium text-gray-500 mb-8 leading-relaxed">
                                                                Gunakan variabel di bawah ini untuk mempersonalisasi pesan secara dinamis berdasarkan data pelanggan.
                                                            </p>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {['CUSTOMER_NAME', 'BOOKING_DATE_TIME', 'BOOKING_REFERENCE', 'SERVICE_NAME', 'BUSINESS_NAME', 'LOCATION_NAME', 'LOCATION_MAP', 'LOCATION_PHONE', ...(customerNotificationTab === 'cancellation' ? ['CANCELLATION_REASON'] : []), ...(customerNotificationTab === 'confirmation' ? ['PAYMENT_LINK', 'DP_AMOUNT'] : []), ...(customerNotificationTab === 'review_request' ? ['REVIEW_LINK'] : [])].map((tag) => (
                                                                    <button
                                                                        key={tag}
                                                                        onClick={() => {
                                                                            const newMsg = customerNotifications[customerNotificationTab].message + ` ${tag} `;
                                                                            setCustomerNotifications({
                                                                                ...customerNotifications,
                                                                                [customerNotificationTab]: { ...customerNotifications[customerNotificationTab], message: newMsg }
                                                                            });
                                                                            toast.success(`${tag} ditambahkan`);
                                                                        }}
                                                                        className="px-3 py-2 bg-gray-50/50 hover:bg-naqupos-cream/50 border border-gray-50 rounded-lg text-[9px] font-bold font-mono text-gray-500 hover:text-naqupos-primary hover:border-naqupos-primary/30 transition-all flex items-center justify-between group text-left"
                                                                    >
                                                                        {tag}
                                                                        <Plus size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="mt-10 p-6 bg-naqupos-cream/30 rounded-3xl border border-naqupos-cream/50">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <div className="w-8 h-8 bg-naqupos-primary text-white rounded-lg flex items-center justify-center">
                                                                        <Sparkles size={16} />
                                                                    </div>
                                                                    <h5 className="text-[10px] font-black text-naqupos-primary uppercase tracking-widest">Tips Ahli</h5>
                                                                </div>
                                                                <p className="text-xs font-medium text-naqupos-primary/80 leading-relaxed">
                                                                    Selalu sertakan <strong>BOOKING_REFERENCE</strong> untuk memudahkan pelacakan pesanan.
                                                                </p>                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-32 text-center bg-gray-50/50 rounded-[3rem] border-4 border-dashed border-gray-50 animate-in fade-in zoom-in duration-500">
                                                    <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl text-gray-200">
                                                        <MessageSquare size={48} />
                                                    </div>
                                                    <h4 className="text-2xl font-black text-gray-900 mb-3">Sistem Nonaktif</h4>
                                                    <p className="text-gray-500 max-w-sm mx-auto font-medium text-lg leading-relaxed">Aktifkan pengaturan di atas untuk mulai membangun komunikasi otomatis yang cerdas dengan pelanggan Anda.</p>
                                                    <button
                                                        onClick={() => setCustomerNotifications({
                                                            ...customerNotifications,
                                                            [customerNotificationTab]: { ...customerNotifications[customerNotificationTab], enabled: true }
                                                        })}
                                                        className="mt-12 px-12 py-5 bg-white border-2 border-gray-100 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.15em] text-gray-700 hover:bg-gray-50 hover:border-naqupos-primary/20 transition-all shadow-xl shadow-black/5"
                                                    >
                                                        AKTIFKAN SEKARANG
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* Customer Notification Settings Sidebar */}
                    {
                        activeTab === 'customer_notifications' && showNotifSettings && (
                            <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-100 overflow-y-auto">
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">Pengaturan</h3>
                                    <button onClick={() => setShowNotifSettings(false)} className="text-gray-400 hover:text-gray-600">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-8">
                                    {customerNotificationTab === 'reminder' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-2">Pengingat pemberitahuan sebelumnya</label>
                                            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 px-3">
                                                <input
                                                    type="number"
                                                    value={notificationTime.value}
                                                    onChange={(e) => setNotificationTime({ ...notificationTime, value: Number(e.target.value) })}
                                                    className="w-full py-2 bg-transparent outline-none text-sm"
                                                />
                                                <span className="text-sm text-gray-500 border-l border-gray-200 pl-3">Jam</span>                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                                                {loadingMaster ? (
                                                    <div className="py-10 text-center text-gray-400">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary mx-auto mb-2"></div>
                                                        <p className="text-xs font-bold uppercase tracking-widest">Memuat Data...</p>
                                                    </div>
                                                ) : getFilteredItems().length > 0 ? (
                                                    <div className="space-y-1">
                                                        <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{freeItemTab}</p>
                                                        {getFilteredItems().map((item: any) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => handleSelectFreeItem(item)}
                                                                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-naqupos-cream group transition-all"
                                                            >
                                                                <div className="flex items-center gap-4 text-left">
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${freeItemTab === 'produk' ? 'bg-orange-50 text-orange-500' : freeItemTab === 'voucher' ? 'bg-yellow-50 text-yellow-500' : 'bg-blue-50 text-blue-500'}`}>
                                                                        {freeItemTab === 'produk' ? 'P' : freeItemTab === 'voucher' ? 'V' : 'S'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-gray-900 leading-tight">{item.name || item.title}</p>
                                                                        <p className="text-xs text-gray-400 font-medium">
                                                                            {freeItemTab === 'voucher' ? `${item.days_valid} days` : freeItemTab === 'produk' ? item.brand : item.category}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full bg-naqupos-cream opacity-0 group-hover:opacity-100 flex items-center justify-center text-naqupos-primary transition-all">
                                                                    <Plus size={18} />
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-10 text-center text-gray-400">
                                                        <Gift size={32} className="mx-auto mb-3 opacity-20" />
                                                        <p className="text-xs font-bold uppercase tracking-widest">No Data Found</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {!showFreeItemSearchList && loyaltyForm.itemName && (
                                        <div className="p-6 bg-naqupos-sage/10 rounded-3xl border border-naqupos-sage/20 flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-naqupos-sage/100 shadow-sm">
                                                <Gift size={32} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-naqupos-sage uppercase tracking-widest leading-tight">Terpilih</p>
                                                <p className="text-xl font-bold text-gray-900 leading-tight">{loyaltyForm.itemName}</p>
                                                <p className="text-xs text-gray-400 font-medium capitalize mt-1">Kategori: {freeItemTab}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-3">Gunakan kata kunci di bawah ini untuk ditambahkan ke pesan</label>
                                        <div className="space-y-2">
                                            {['CUSTOMER_NAME', 'BOOKING_DATE_TIME', 'BOOKING_REFERENCE', 'SERVICE_NAME', 'BUSINESS_NAME', 'LOCATION_NAME', 'LOCATION_MAP', 'LOCATION_PHONE', 'ACARA_LINK', 'LINK_CLASS_ONLINE', 'CANCELLATION_REASON', 'REVIEW_LINK'].map((tag) => (
                                                <button
                                                    key={tag}
                                                    onClick={() => {
                                                        const newMsg = customerNotifications[customerNotificationTab].message + ` ${tag} `;
                                                        setCustomerNotifications({
                                                            ...customerNotifications,
                                                            [customerNotificationTab]: { ...customerNotifications[customerNotificationTab], message: newMsg }
                                                        });
                                                    }}
                                                    className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded px-3 py-2 text-xs font-mono text-gray-600 flex items-center justify-between group"
                                                >
                                                    {tag}
                                                    <Copy size={12} className="opacity-0 group-hover:opacity-100 text-gray-400" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3">
                                    <button
                                        onClick={() => {
                                            // Reset logic if needed
                                        }}
                                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                    >
                                        Reset Default
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Placeholder for saving customer notification settings
                                            // You might want to call an API here to save the settings
                                            // For now, just close the sidebar
                                            setShowNotifSettings(false);
                                        }}
                                        className="flex-1 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent text-sm font-medium"
                                    >
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    {/* Customer Notification Preview Modal */}
                    {
                        activeTab === 'customer_notifications' && showNotifPreview && (
                            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-gray-900">Pratinjau</h3>
                                        <button onClick={() => setShowNotifPreview(false)}><X size={24} className="text-gray-400" /></button>
                                    </div>
                                    <div className="p-8">
                                        <div className="mb-6">
                                            <h4 className="font-semibold text-gray-900 mb-4">{customerNotifications[customerNotificationTab].title}</h4>
                                            <div className="whitespace-pre-line text-sm text-gray-600 leading-relaxed font-sans bg-gray-50 p-6 rounded-lg border border-gray-100">
                                                {customerNotifications[customerNotificationTab].message
                                                    .replace(/CUSTOMER_NAME/g, 'Budi Santoso')
                                                    .replace(/BOOKING_REFERENCE/g, 'REF-123456')
                                                    .replace(/BUSINESS_NAME/g, 'Naqupos Spa Solo')
                                                    .replace(/SERVICE_NAME/g, 'Hair Cut Premium')
                                                    .replace(/BOOKING_DATE_TIME/g, 'Senin, 27 Jan 2025, 14:00')
                                                    .replace(/LOCATION_NAME/g, 'Naqupos Head Office')
                                                    .replace(/LOCATION_MAP/g, 'https://maps.google.com/...')
                                                    .replace(/LOCATION_PHONE/g, '0812-3456-7890')
                                                    .replace(/LINK_CLASS_ONLINE/g, 'https://zoom.us/j/...')
                                                    .replace(/CANCELLATION_REASON/g, 'Alasan Pribadi')
                                                    .replace(/REVIEW_LINK/g, 'https://g.page/r/...')
                                                }
                                            </div>
                                            <p className="text-xs text-gray-500 mt-4 italic">Perlu mengubah janji temu Anda? Silakan hubungi kami melalui nomor telepon di atas.</p>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span>Dipersembahkan oleh</span>
                                            <span className="font-bold text-naqupos-primary">naqupos</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    {/* Cancellation Reasons Tab */}
                    {
                        activeTab === 'cancellation_reasons' && (
                            <div className="w-full space-y-6 animate-in fade-in duration-500">
                                {!selectedBranchId ? (
                                    <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                                                <XCircle size={48} className="text-gray-300" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Pilih Cabang</h3>
                                            <p className="max-w-md mx-auto text-gray-500 font-medium">Silakan pilih cabang terlebih dahulu di bagian atas untuk mulai mengonfigurasi alasan pembatalan.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                                                    <XCircle size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Alasan Pembatalan</h3>
                                                    <p className="text-sm text-gray-500">Daftar alasan yang dapat dipilih pelanggan saat membatalkan janji temu.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingCancellationReasonId(null);
                                                    setNewCancellationReason('');
                                                    setShowCancellationModal(true);
                                                }}
                                                className="px-4 py-2 bg-naqupos-primary text-white rounded-lg font-bold hover:bg-naqupos-accent transition-all flex items-center gap-2 shadow-lg shadow-naqupos-primary/20 text-xs"
                                            >
                                                <Plus size={16} />
                                                TAMBAH ALASAN
                                            </button>
                                        </div>

                                        <div className="divide-y divide-gray-50">
                                            {cancellationReasons.length === 0 ? (
                                                <div className="p-12 text-center">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                                        <XCircle size={32} />
                                                    </div>
                                                    <p className="text-gray-500 font-medium">Belum ada alasan pembatalan.</p>
                                                </div>
                                            ) : (
                                                cancellationReasons.map((item) => (
                                                    <div key={item.id} className="p-4 flex items-center gap-3 hover:bg-gray-50 group transition-colors">
                                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                                            <GripVertical size={16} className="cursor-move" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="text-xs font-bold text-gray-700">{item.reason}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                                                                onClick={() => {
                                                                    setEditingCancellationReasonId(item.id);
                                                                    setNewCancellationReason(item.reason);
                                                                    setShowCancellationModal(true);
                                                                }}
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                                onClick={() => setDeleteReasonId(item.id)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* Cancellation Reason Modal */}
                    {
                        showCancellationModal && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                                <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-naqupos-cream/30">
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                                                {editingCancellationReasonId ? 'Ubah Alasan' : 'Tambah Alasan'}
                                            </h3>
                                            <p className="text-sm text-naqupos-primary font-bold uppercase tracking-widest mt-1">
                                                {editingCancellationReasonId ? 'Perbarui Alasan' : 'Pembatalan Baru'}
                                            </p>
                                        </div>
                                        <button onClick={() => setShowCancellationModal(false)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Deskripsi Alasan</label>
                                            <textarea
                                                value={newCancellationReason}
                                                onChange={(e) => setNewCancellationReason(e.target.value)}
                                                rows={3}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary outline-none resize-none font-medium text-gray-700 transition-all text-sm"
                                                placeholder="Contoh: Jadwal bertabrakan dengan urusan mendadak..."
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => setShowCancellationModal(false)}
                                                className="flex-1 px-4 py-3 border-2 border-gray-100 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold text-xs"
                                            >
                                                BATAL
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!newCancellationReason.trim()) return toast.error('Alasan tidak boleh kosong');
                                                    try {
                                                        setSaving(true);
                                                        if (editingCancellationReasonId) {
                                                            await api.updateCancellationReason(editingCancellationReasonId, { reason: newCancellationReason });
                                                            toast.success('Alasan pembatalan diperbarui');
                                                        } else {
                                                            await api.createCancellationReason({ reason: newCancellationReason, branch_id: selectedBranchId });
                                                            toast.success('Alasan pembatalan ditambahkan');
                                                        }
                                                        setNewCancellationReason('');
                                                        setEditingCancellationReasonId(null);
                                                        setShowCancellationModal(false);
                                                        fetchCancellationReasons();
                                                    } catch (error) {
                                                        console.error('Error saving cancellation reason:', error);
                                                        toast.error('Gagal menyimpan alasan');
                                                    } finally {
                                                        setSaving(false);
                                                    }
                                                }}
                                                disabled={saving}
                                                className="flex-1 px-4 py-3 bg-naqupos-primary text-white rounded-xl hover:bg-naqupos-accent transition-all font-bold shadow-lg shadow-naqupos-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                                            >
                                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                {saving ? 'MENYIMPAN...' : 'SIMPAN'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Loyalty Points Settings */}
                    {
                        activeTab === 'loyalty' && (
                            <div className="w-full space-y-8 animate-in fade-in duration-500">
                                {!selectedBranchId ? (
                                    <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                                                <Award size={48} className="text-gray-300" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Pilih Cabang</h3>
                                            <p className="max-w-md mx-auto text-gray-500 font-medium">Silakan pilih cabang terlebih dahulu di bagian atas untuk mulai mengonfigurasi loyalty points.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Sub Tabs */}
                                        <div className="flex justify-center">
                                            <div className="inline-flex p-1.5 bg-gray-100 rounded-2xl">
                                                <button
                                                    onClick={() => setLoyaltyTab('redemption')}
                                                    className={`px-8 py-3 text-sm font-bold rounded-xl transition-all ${loyaltyTab === 'redemption' ? 'bg-white shadow-md text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'} `}
                                                >
                                                    OPSI PENGGUNAAN
                                                </button>
                                                <button
                                                    onClick={() => setLoyaltyTab('settings')}
                                                    className={`px-8 py-3 text-sm font-bold rounded-xl transition-all ${loyaltyTab === 'settings' ? 'bg-white shadow-md text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'} `}
                                                >
                                                    PENGATURAN POINT
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[500px] relative overflow-hidden">
                                            {/* Abstract background elements for premium feel */}
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-naqupos-cream/20 rounded-full blur-3xl -mr-32 -mt-32"></div>

                                            <div className="relative flex items-center justify-between mb-10 border-b border-gray-50 pb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-naqupos-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-naqupos-primary/30">
                                                        <Award size={32} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-gray-900">Loyalty Rewards</h3>
                                                        <p className="text-sm text-gray-500 font-medium">Berikan apresiasi kepada pelanggan setia Anda dengan sistem poin.</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                                                    <span className={`text-xs font-bold uppercase tracking-wider ${loyaltySettings.enabled ? 'text-naqupos-primary' : 'text-gray-400'} `}>{loyaltySettings.enabled ? 'Aktif' : 'Nonaktif'}</span>
                                                    <Toggle
                                                        checked={loyaltySettings.enabled}
                                                        onChange={(checked) => setLoyaltySettings({ ...loyaltySettings, enabled: checked })}
                                                    />
                                                </div>
                                            </div>

                                            {loyaltySettings.enabled ? (
                                                <div className="relative">
                                                    {loyaltyTab === 'redemption' && (
                                                        <div className="space-y-6 animate-in fade-in duration-300">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                {loyaltyRedemptions.length === 0 ? (
                                                                    <div className="col-span-full py-20 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200 shadow-sm">
                                                                            <Gift size={40} />
                                                                        </div>
                                                                        <h4 className="text-lg font-bold text-gray-900 mb-2">Belum Ada Reward</h4>
                                                                        <p className="text-gray-500 max-w-xs mx-auto">Mulai buat opsi penukaran poin seperti diskon atau item gratis.</p>
                                                                    </div>
                                                                ) : (
                                                                    loyaltyRedemptions.map(item => (
                                                                        <div key={item.id} className="group bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:border-naqupos-primary/20 transition-all relative overflow-hidden">
                                                                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                                                <button
                                                                                    className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                                                                                    onClick={() => openLoyaltyModal(item.type === 'discount' ? 'discount' : 'free_item', item)}
                                                                                >
                                                                                    <Edit2 size={14} />
                                                                                </button>
                                                                                <button
                                                                                    className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                                                                    onClick={async () => {
                                                                                        const result = await swal.confirm('Apakah Anda yakin ingin menghapus reward ini?', 'Hapus Reward', 'Ya, Hapus');
                                                                                        if (result.isConfirmed) {
                                                                                            setLoyaltyRedemptions(loyaltyRedemptions.filter(r => r.id !== item.id));
                                                                                            toast.success('Reward berhasil dihapus');
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${item.type === 'discount' ? 'bg-orange-50 text-orange-500' : 'bg-naqupos-sage/10 text-naqupos-sage/100'} transition-transform group-hover:scale-110`}>
                                                                                {item.type === 'discount' ? <Tag size={28} /> : <Gift size={28} />}
                                                                            </div>
                                                                            <h4 className="text-lg font-bold text-gray-900 mb-1 leading-tight">
                                                                                {item.type === 'discount'
                                                                                    ? `Diskon ${item.discountType === 'fixed' ? 'Rp' : ''}${Number(item.discountAmount).toLocaleString('id-ID')}${item.discountType === 'percentage' ? '%' : ''}`
                                                                                    : `Item Gratis: ${item.itemName}`
                                                                                }
                                                                            </h4>
                                                                            <div className="flex items-center justify-between mt-4">
                                                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-naqupos-cream rounded-full">
                                                                                    <div className="w-2 h-2 bg-naqupos-primary rounded-full animate-pulse"></div>
                                                                                    <span className="text-xs font-bold text-naqupos-primary">{item.pointsRequired} Point</span>
                                                                                </div>
                                                                                <ChevronRight size={18} className="text-gray-300 group-hover:text-naqupos-primary group-hover:translate-x-1 transition-all" />
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>

                                                            <div className="flex justify-center pt-10">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingLoyaltyRewardId(null);
                                                                        setLoyaltyForm({ pointsRequired: '', discountAmount: '', discountType: 'fixed', itemName: '', itemId: '' });
                                                                        setShowLoyaltyModal(true);
                                                                    }}
                                                                    className="w-16 h-16 bg-naqupos-primary text-white rounded-2xl shadow-xl shadow-naqupos-primary/30 hover:bg-naqupos-accent hover:scale-110 transition-all flex items-center justify-center group"
                                                                >
                                                                    <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {loyaltyTab === 'settings' && (
                                                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                                            {/* Point Earning Method Selection */}
                                                            <div className="flex bg-gray-100/50 rounded-2xl p-1.5 w-full max-w-2xl mx-auto">
                                                                <button
                                                                    onClick={() => setLoyaltySettings({ ...loyaltySettings, earningType: 'amount_spent' })}
                                                                    className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${loyaltySettings.earningType === 'amount_spent' ? 'bg-naqupos-sage text-white shadow-lg shadow-naqupos-sage/20' : 'text-gray-500 hover:text-gray-700'} `}
                                                                >
                                                                    Jumlah Dibeli
                                                                </button>
                                                                <button
                                                                    onClick={() => setLoyaltySettings({ ...loyaltySettings, earningType: 'item_purchased' })}
                                                                    className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${loyaltySettings.earningType === 'item_purchased' ? 'bg-naqupos-sage text-white shadow-lg shadow-naqupos-sage/20' : 'text-gray-500 hover:text-gray-700'} `}
                                                                >
                                                                    Item Dibeli
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                                <div className="space-y-10">
                                                                    <div className="space-y-6">
                                                                        <h4 className="text-xl font-bold text-gray-900">Point Diperoleh</h4>

                                                                        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 flex gap-4">
                                                                            <div className="w-10 h-10 bg-orange-100 rounded-xl shrink-0 flex items-center justify-center text-orange-500">
                                                                                <AlertCircle size={24} />
                                                                            </div>
                                                                            <p className="text-sm font-medium text-orange-800 leading-relaxed">
                                                                                {loyaltySettings.earningType === 'amount_spent'
                                                                                    ? "Pelanggan akan mendapatkan poin setelah membeli pesanan dalam jumlah tertentu sebagai pengaturan berikut"
                                                                                    : "Pelanggan akan mendapatkan poin setelah membeli item yang valid"
                                                                                }
                                                                            </p>
                                                                        </div>

                                                                        {loyaltySettings.earningType === 'amount_spent' ? (
                                                                            <div className="space-y-6">
                                                                                <div>
                                                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Point Diperoleh</label>
                                                                                    <div className="flex bg-gray-50 rounded-2xl border border-gray-100 p-1 items-center">
                                                                                        <div className="flex-1 px-5 py-4 font-bold text-xl text-gray-700">
                                                                                            {loyaltySettings.pointsPerAmount.toFixed(0)}
                                                                                        </div>
                                                                                        <div className="flex gap-2 pr-4">
                                                                                            <button
                                                                                                onClick={() => setLoyaltySettings({ ...loyaltySettings, pointsPerAmount: Math.max(0, loyaltySettings.pointsPerAmount - 1) })}
                                                                                                className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-naqupos-primary hover:bg-naqupos-primary hover:text-white transition-all"
                                                                                            >
                                                                                                <Minus size={20} />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => setLoyaltySettings({ ...loyaltySettings, pointsPerAmount: loyaltySettings.pointsPerAmount + 1 })}
                                                                                                className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-naqupos-primary hover:bg-naqupos-primary hover:text-white transition-all"
                                                                                            >
                                                                                                <Plus size={20} />
                                                                                            </button>
                                                                                            <span className="text-sm font-bold text-gray-400 ml-4 flex items-center">Point</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <div>
                                                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Min. Total Order</label>
                                                                                    <div className="relative group">
                                                                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={loyaltySettings.minOrderAmount === 0 ? '' : loyaltySettings.minOrderAmount.toLocaleString('id-ID')}
                                                                                            onChange={(e) => {
                                                                                                const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                                                                                const numValue = rawValue === '' ? 0 : parseInt(rawValue);
                                                                                                setLoyaltySettings({ ...loyaltySettings, minOrderAmount: numValue });
                                                                                            }}
                                                                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all text-xl"
                                                                                            placeholder="50.000"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="pt-4">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        fetchMasterDataForLoyalty();
                                                                                        setShowPointPerItemSidebar(true);
                                                                                    }}
                                                                                    className="w-full py-4 bg-white border-2 border-naqupos-primary text-naqupos-primary rounded-2xl font-bold hover:bg-naqupos-cream transition-all flex items-center justify-center gap-2"
                                                                                >
                                                                                    Adjust point per item
                                                                                </button>
                                                                            </div>
                                                                        )}

                                                                        <div>
                                                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Point Kedaluwarsa</label>
                                                                            <div className="relative">
                                                                                <SearchableSelect
                                                                                    value={loyaltySettings.expiration}
                                                                                    onChange={(val: string | number) => setLoyaltySettings({ ...loyaltySettings, expiration: val.toString() })}
                                                                                    options={[
                                                                                        { value: 'After 1 Year', label: 'After 1 Year' },
                                                                                        { value: 'After 6 Months', label: 'After 6 Months' },
                                                                                        { value: 'Never', label: 'Never' }
                                                                                    ]}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4 pt-6 mt-6">
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-sm font-bold text-gray-800">Berlaku Kelipatan</p>
                                                                            <Toggle
                                                                                checked={loyaltySettings.applyMultiples}
                                                                                onChange={(checked) => setLoyaltySettings({ ...loyaltySettings, applyMultiples: checked })}
                                                                            />
                                                                        </div>

                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-sm font-bold text-gray-800 max-w-[300px]">Tambahan poin tetap didapat ketika menggunakan poin</p>
                                                                            <Toggle
                                                                                checked={loyaltySettings.earnWhenRedeeming}
                                                                                onChange={(checked) => setLoyaltySettings({ ...loyaltySettings, earnWhenRedeeming: checked })}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-6">
                                                                    <h4 className="text-xl font-bold text-gray-900 mb-2">Saat pelanggan mendapatkan poin</h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {(loyaltySettings.earningType === 'amount_spent' ? [
                                                                            { key: 'channels', label: 'Channel Transaksi', icon: <Monitor size={20} /> },
                                                                            { key: 'customerGroups', label: 'Pelanggan', icon: <Users size={20} /> },
                                                                            { key: 'services', label: 'Layanan', icon: <Sparkles size={20} /> },
                                                                            { key: 'packages', label: 'Paket', icon: <Briefcase size={20} /> },
                                                                            { key: 'classes', label: 'Kelas', icon: <CalendarDays size={20} /> },
                                                                            { key: 'products', label: 'Produk', icon: <Tag size={20} /> },
                                                                            { key: 'vouchers', label: 'Voucher', icon: <Ticket size={20} /> },
                                                                            { key: 'plans', label: 'Membership Plan', icon: <Layout size={20} /> }
                                                                        ] : [
                                                                            { key: 'channels', label: 'Channel Transaksi', icon: <Monitor size={20} /> },
                                                                            { key: 'customerGroups', label: 'Pelanggan', icon: <Users size={20} /> }
                                                                        ]).map((item) => {
                                                                            const rawValue = loyaltySettings[item.key as keyof LoyaltySettings];
                                                                            const currentSelection: string[] = Array.isArray(rawValue) ? rawValue as string[] : [];

                                                                            let displayValue = '';
                                                                            if (item.key === 'services' && loyaltySettings.excludedServices?.length > 0) {
                                                                                displayValue = `Kecualikan (${loyaltySettings.excludedServices.length} Item)`;
                                                                            } else if (currentSelection.length > 0 && currentSelection[0] === 'All') {
                                                                                if (item.key === 'customerGroups') displayValue = 'Semua Pelanggan';
                                                                                else if (item.key === 'channels') displayValue = 'Semua Channel';
                                                                                else displayValue = `Semua ${item.label}`;
                                                                            } else if (currentSelection.length === 0) {
                                                                                displayValue = 'Belum ada terpilih';
                                                                            } else {
                                                                                displayValue = `${currentSelection.length} Item Terpilih`;
                                                                            }

                                                                            return (
                                                                                <div key={item.key} className="bg-white border border-gray-100 px-6 py-5 rounded-[2rem] flex items-center justify-between group hover:border-naqupos-primary/30 hover:shadow-xl hover:shadow-naqupos-primary/5 transition-all duration-300">
                                                                                    <div className="flex items-center gap-4">
                                                                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-naqupos-cream group-hover:text-naqupos-primary transition-all duration-300">
                                                                                            {item.icon}
                                                                                        </div>
                                                                                        <div className="space-y-0.5">
                                                                                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.15em]">{item.label}</p>
                                                                                            <p className="text-sm font-bold text-gray-700 tracking-tight">
                                                                                                {displayValue}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setActiveRuleSidebar(item.label);
                                                                                            const key = item.key as keyof LoyaltySettings;
                                                                                            const rawValue = loyaltySettings[key];
                                                                                            const currentSelection: string[] = Array.isArray(rawValue) ? rawValue as string[] : ['All'];
                                                                                            setIsAllSelected(currentSelection.length > 0 && currentSelection[0] === 'All');
                                                                                            setTempSelectedItems(currentSelection.includes('All') ? [] : currentSelection);
                                                                                        }}
                                                                                        className="text-xs font-bold text-naqupos-primary bg-naqupos-cream/50 px-4 py-2 rounded-xl hover:bg-naqupos-primary hover:text-white transition-all duration-300"
                                                                                    >
                                                                                        Ganti
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    <div className="pt-8">
                                                                        <button
                                                                            onClick={handleSaveLoyaltySettings}
                                                                            disabled={saving}
                                                                            className="w-full py-5 bg-naqupos-primary text-white rounded-2xl font-bold hover:bg-naqupos-accent transition-all shadow-xl shadow-naqupos-primary/20 flex items-center justify-center gap-2 group"
                                                                        >
                                                                            {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} className="group-hover:scale-110 transition-transform" />}
                                                                            {saving ? 'MENYIMPAN...' : 'SIMPAN PENGATURAN'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="py-32 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                                                    <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200 mb-8 border border-gray-100">
                                                        <Award size={48} />
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-gray-400 mb-2">Loyalty Points Dinonaktifkan</h3>
                                                    <p className="text-gray-500 max-w-sm mb-10">Aktifkan fitur ini untuk mulai membangun loyalitas pelanggan Anda melalui sistem reward yang menarik.</p>
                                                    <button
                                                        onClick={() => setLoyaltySettings({ ...loyaltySettings, enabled: true })}
                                                        className="px-10 py-4 bg-naqupos-primary text-white rounded-2xl font-bold hover:bg-naqupos-accent transition-all shadow-xl shadow-naqupos-primary/20 hover:scale-105"
                                                    >
                                                        AKTIFKAN FITUR SEKARANG
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    }


                    {/* Loyalty Modals */}
                    {
                        showLoyaltyModal && !loyaltyModalType && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                                <div className="bg-white rounded-3xl shadow-2xl p-4 w-72 animate-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-gray-50 mb-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pilih Jenis Reward</p>
                                    </div>
                                    <button
                                        onClick={() => setLoyaltyModalType('discount')}
                                        className="w-full text-left px-5 py-4 text-sm font-bold text-gray-700 hover:bg-naqupos-cream/50 hover:text-naqupos-primary rounded-2xl flex items-center gap-3 transition-all"
                                    >
                                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                                            <Tag size={20} />
                                        </div>
                                        Diskon
                                    </button>
                                    <button
                                        onClick={() => {
                                            setLoyaltyModalType('free_item');
                                            fetchMasterDataForLoyalty();
                                            setFreeItemSearch('');
                                            setFreeItemTab('produk');
                                            setShowFreeItemSearchList(false);
                                        }}
                                        className="w-full text-left px-5 py-4 text-sm font-bold text-gray-700 hover:bg-naqupos-cream/50 hover:text-naqupos-primary rounded-2xl flex items-center gap-3 transition-all mt-1"
                                    >
                                        <div className="w-10 h-10 bg-naqupos-sage/10 rounded-xl flex items-center justify-center text-naqupos-sage/100">
                                            <Gift size={20} />
                                        </div>
                                        Item Gratis
                                    </button>
                                    <button
                                        onClick={() => { setShowLoyaltyModal(false); setEditingLoyaltyRewardId(null); }}
                                        className="w-full text-center px-5 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 rounded-2xl mt-4 border-t border-gray-50 pt-6"
                                    >
                                        TUTUP
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    {/* Loyalty Discount Modal */}
                    {
                        showLoyaltyModal && loyaltyModalType === 'discount' && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                                <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-naqupos-cream/30">
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900">{editingLoyaltyRewardId ? 'Ubah Diskon' : 'Diskon Baru'}</h3>
                                            <p className="text-xs font-bold text-naqupos-primary uppercase tracking-widest mt-1">Loyalty Reward</p>
                                        </div>
                                        <button onClick={() => { setShowLoyaltyModal(false); setLoyaltyModalType(null); setEditingLoyaltyRewardId(null); }} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="p-8 space-y-8">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Poin yang Dibutuhkan</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={loyaltyForm.pointsRequired}
                                                    onChange={(e) => setLoyaltyForm({ ...loyaltyForm, pointsRequired: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700"
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-naqupos-primary bg-naqupos-cream px-2 py-1 rounded-md">POINT</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Besaran Diskon</label>
                                            <div className="flex bg-gray-50 rounded-2xl border border-gray-100 p-1">
                                                <input
                                                    type="number"
                                                    value={loyaltyForm.discountAmount}
                                                    onChange={(e) => setLoyaltyForm({ ...loyaltyForm, discountAmount: e.target.value })}
                                                    className="flex-1 px-4 py-3 bg-transparent outline-none font-bold text-gray-700"
                                                    placeholder="0"
                                                />
                                                <div className="flex bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 p-1">
                                                    <button
                                                        onClick={() => setLoyaltyForm({ ...loyaltyForm, discountType: 'fixed' })}
                                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${loyaltyForm.discountType === 'fixed' ? 'bg-naqupos-primary text-white' : 'text-gray-400 hover:text-gray-600'} `}
                                                    >
                                                        IDR
                                                    </button>
                                                    <button
                                                        onClick={() => setLoyaltyForm({ ...loyaltyForm, discountType: 'percentage' })}
                                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${loyaltyForm.discountType === 'percentage' ? 'bg-naqupos-primary text-white' : 'text-gray-400 hover:text-gray-600'} `}
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <button
                                                onClick={() => { setShowLoyaltyModal(false); setLoyaltyModalType(null); }}
                                                className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all font-bold"
                                            >
                                                BATAL
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!loyaltyForm.pointsRequired || !loyaltyForm.discountAmount) return toast.error('Mohon lengkapi semua field');

                                                    if (editingLoyaltyRewardId) {
                                                        setLoyaltyRedemptions(loyaltyRedemptions.map(r =>
                                                            r.id === editingLoyaltyRewardId
                                                                ? {
                                                                    ...r,
                                                                    pointsRequired: Number(loyaltyForm.pointsRequired),
                                                                    discountAmount: Number(loyaltyForm.discountAmount),
                                                                    discountType: loyaltyForm.discountType
                                                                }
                                                                : r
                                                        ));
                                                        toast.success('Reward diskon diperbarui');
                                                    } else {
                                                        const newItem: LoyaltyRedemption = {
                                                            id: Date.now(),
                                                            type: 'discount',
                                                            pointsRequired: Number(loyaltyForm.pointsRequired),
                                                            discountAmount: Number(loyaltyForm.discountAmount),
                                                            discountType: loyaltyForm.discountType
                                                        };
                                                        setLoyaltyRedemptions([...loyaltyRedemptions, newItem]);
                                                        toast.success('Opsi diskon berhasil ditambahkan');
                                                    }

                                                    setLoyaltyForm({ pointsRequired: '', discountAmount: '', discountType: 'fixed', itemName: '', itemId: '' });
                                                    setEditingLoyaltyRewardId(null);
                                                    setShowLoyaltyModal(false);
                                                    setLoyaltyModalType(null);
                                                }}
                                                className="flex-1 px-6 py-4 bg-naqupos-primary text-white rounded-2xl hover:bg-naqupos-accent transition-all font-bold shadow-lg shadow-naqupos-primary/20"
                                            >
                                                {editingLoyaltyRewardId ? 'PERBARUI' : 'SIMPAN'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Loyalty Free Item Modal */}
                    {
                        showLoyaltyModal && loyaltyModalType === 'free_item' && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                                <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-naqupos-cream/30">
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900">{editingLoyaltyRewardId ? 'Ubah Item Gratis' : 'Item Gratis Baru'}</h3>
                                            <p className="text-xs font-bold text-naqupos-primary uppercase tracking-widest mt-1">Loyalty Reward</p>
                                        </div>
                                        <button onClick={() => { setShowLoyaltyModal(false); setLoyaltyModalType(null); setEditingLoyaltyRewardId(null); }} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="p-8 space-y-8">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Point yang Dibutuhkan</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={loyaltyForm.pointsRequired}
                                                    onChange={(e) => setLoyaltyForm({ ...loyaltyForm, pointsRequired: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700"
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-naqupos-primary bg-naqupos-cream px-2 py-1 rounded-md">POINT</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Item Gratis</label>
                                            <div className="relative group mb-4">
                                                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-naqupos-primary transition-colors" />
                                                <input
                                                    type="text"
                                                    value={freeItemSearch || loyaltyForm.itemName}
                                                    onFocus={() => setShowFreeItemSearchList(true)}
                                                    onChange={(e) => {
                                                        setFreeItemSearch(e.target.value);
                                                        setShowFreeItemSearchList(true);
                                                    }}
                                                    className="w-full pl-14 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary outline-none font-bold text-gray-700 transition-all"
                                                    placeholder="Cari untuk menambahkan item"
                                                />
                                                {(freeItemSearch || loyaltyForm.itemName) && (
                                                    <button
                                                        onClick={() => {
                                                            setFreeItemSearch('');
                                                            setLoyaltyForm({ ...loyaltyForm, itemName: '', itemId: '' });
                                                        }}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                )}
                                            </div>

                                            {showFreeItemSearchList && (
                                                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
                                                    <div className="flex bg-gray-50 p-1 gap-1">
                                                        {(['produk', 'voucher', 'layanan'] as const).map(tab => (
                                                            <button
                                                                key={tab}
                                                                onClick={() => setFreeItemTab(tab)}
                                                                className={`flex-1 py-3 text-sm font-bold rounded-2xl capitalize transition-all ${freeItemTab === tab ? 'bg-naqupos-accent text-white shadow-md' : 'text-gray-400 hover:text-gray-600'} `}
                                                            >
                                                                {tab}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                                                        {loadingMaster ? (
                                                            <div className="py-10 text-center text-gray-400">
                                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary mx-auto mb-2"></div>
                                                                <p className="text-xs font-bold uppercase tracking-widest">Memuat Data...</p>
                                                            </div>
                                                        ) : getFilteredItems().length > 0 ? (
                                                            <div className="space-y-1">
                                                                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{freeItemTab}</p>
                                                                {getFilteredItems().map((item: any) => (
                                                                    <button
                                                                        key={item.id}
                                                                        onClick={() => handleSelectFreeItem(item)}
                                                                        className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-naqupos-cream group transition-all"
                                                                    >
                                                                        <div className="flex items-center gap-4 text-left">
                                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${freeItemTab === 'produk' ? 'bg-orange-50 text-orange-500' : freeItemTab === 'voucher' ? 'bg-yellow-50 text-yellow-500' : 'bg-blue-50 text-blue-500'}`}>
                                                                                {freeItemTab === 'produk' ? 'P' : freeItemTab === 'voucher' ? 'V' : 'S'}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-gray-900 leading-tight">{item.name || item.title}</p>
                                                                                <p className="text-xs text-gray-400 font-medium">
                                                                                    {freeItemTab === 'voucher' ? `${item.days_valid} days` : freeItemTab === 'produk' ? item.brand : item.category}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-8 h-8 rounded-full bg-naqupos-cream opacity-0 group-hover:opacity-100 flex items-center justify-center text-naqupos-primary transition-all">
                                                                            <Plus size={18} />
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="py-10 text-center text-gray-400">
                                                                <Gift size={32} className="mx-auto mb-3 opacity-20" />
                                                                <p className="text-xs font-bold uppercase tracking-widest">No Data Found</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {!showFreeItemSearchList && loyaltyForm.itemName && (
                                                <div className="p-6 bg-naqupos-sage/10 rounded-3xl border border-naqupos-sage/20 flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-naqupos-sage/100 shadow-sm">
                                                        <Gift size={32} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-naqupos-sage uppercase tracking-widest leading-tight">Terpilih</p>
                                                        <p className="text-xl font-bold text-gray-900 leading-tight">{loyaltyForm.itemName}</p>
                                                        <p className="text-xs text-gray-400 font-medium capitalize mt-1">Kategori: {freeItemTab}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <button
                                                onClick={() => { setShowLoyaltyModal(false); setLoyaltyModalType(null); }}
                                                className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all font-bold"
                                            >
                                                BATAL
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!loyaltyForm.pointsRequired || !loyaltyForm.itemName) return toast.error('Mohon lengkapi semua field');

                                                    if (editingLoyaltyRewardId) {
                                                        setLoyaltyRedemptions(loyaltyRedemptions.map(r =>
                                                            r.id === editingLoyaltyRewardId
                                                                ? {
                                                                    ...r,
                                                                    pointsRequired: Number(loyaltyForm.pointsRequired),
                                                                    itemName: loyaltyForm.itemName,
                                                                    itemId: loyaltyForm.itemId
                                                                }
                                                                : r
                                                        ));
                                                        toast.success('Reward item gratis diperbarui');
                                                    } else {
                                                        const newItem: LoyaltyRedemption = {
                                                            id: Date.now(),
                                                            type: 'free_item',
                                                            pointsRequired: Number(loyaltyForm.pointsRequired),
                                                            itemName: loyaltyForm.itemName,
                                                            itemId: loyaltyForm.itemId
                                                        };
                                                        setLoyaltyRedemptions([...loyaltyRedemptions, newItem]);
                                                        toast.success('Opsi item gratis berhasil ditambahkan');
                                                    }

                                                    setLoyaltyForm({ pointsRequired: '', discountAmount: '', discountType: 'fixed', itemName: '', itemId: '' });
                                                    setEditingLoyaltyRewardId(null);
                                                    setShowLoyaltyModal(false);
                                                    setLoyaltyModalType(null);
                                                }}
                                                className="flex-1 px-6 py-4 bg-naqupos-primary text-white rounded-2xl hover:bg-naqupos-accent transition-all font-bold shadow-lg shadow-naqupos-primary/20"
                                            >
                                                {editingLoyaltyRewardId ? 'PERBARUI' : 'SIMPAN'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Rule Selection Sidebar */}
                    {
                        activeRuleSidebar && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-end animate-in fade-in duration-300">
                                <div className="w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                                    <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-2xl font-bold text-gray-900">{activeRuleSidebar}</h3>
                                        <button onClick={() => setActiveRuleSidebar(null)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        {activeRuleSidebar === 'Pelanggan' ? (
                                            <div className="space-y-8">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-lg font-bold text-gray-800">Semua pelanggan</span>
                                                    <Toggle
                                                        checked={isAllSelected}
                                                        onChange={(checked) => {
                                                            setIsAllSelected(checked);
                                                            if (checked) setTempSelectedItems([]);
                                                        }}
                                                        activeColor="bg-naqupos-sage"
                                                    />
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="All Tags"
                                                        className="w-full px-5 py-4 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-naqupos-primary/10 transition-all font-medium"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    {mockDataRules['Pelanggan'].map((item: any) => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => {
                                                                if (tempSelectedItems.includes(item.id)) {
                                                                    setTempSelectedItems(tempSelectedItems.filter(id => id !== item.id));
                                                                } else {
                                                                    setTempSelectedItems([...tempSelectedItems, item.id]);
                                                                    setIsAllSelected(false);
                                                                }
                                                            }}
                                                            className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${tempSelectedItems.includes(item.id) ? 'bg-naqupos-cream/50' : 'hover:bg-gray-50'} `}
                                                        >
                                                            <span className="font-bold text-gray-700">{item.name}</span>
                                                            <span className="text-sm font-bold text-gray-400">{item.count}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <label className="flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer group hover:bg-white hover:shadow-md transition-all">
                                                    <span className="text-lg font-bold text-gray-800">Ceklis Semua</span>
                                                    <div className="w-7 h-7 rounded-lg border-2 border-naqupos-sage flex items-center justify-center relative overflow-hidden">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllSelected}
                                                            onChange={(e) => {
                                                                setIsAllSelected(e.target.checked);
                                                                if (e.target.checked) setTempSelectedItems([]);
                                                            }}
                                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        />
                                                        {isAllSelected && <div className="w-4 h-4 bg-naqupos-sage rounded-sm"></div>}
                                                    </div>
                                                </label>

                                                <div className="space-y-3">
                                                    {/* @ts-ignore */}
                                                    {(mockDataRules[activeRuleSidebar as keyof typeof mockDataRules] || []).map((item: any) => (
                                                        <label key={item.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl cursor-pointer group hover:border-naqupos-sage transition-all">
                                                            <span className="text-lg font-bold text-gray-700">{item.name}</span>
                                                            <div className="w-7 h-7 rounded-lg border-2 border-gray-200 flex items-center justify-center relative overflow-hidden transition-colors group-hover:border-naqupos-sage">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={tempSelectedItems.includes(item.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setTempSelectedItems([...tempSelectedItems, item.id]);
                                                                            setIsAllSelected(false);
                                                                        } else {
                                                                            setTempSelectedItems(tempSelectedItems.filter(id => id !== item.id));
                                                                        }
                                                                    }}
                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                />
                                                                {tempSelectedItems.includes(item.id) && <div className="w-4 h-4 bg-naqupos-sage rounded-sm"></div>}
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                                        <button
                                            onClick={() => {
                                                let keyMap: Record<string, keyof LoyaltySettings> = {
                                                    'Channel Transaksi': 'channels',
                                                    'Pelanggan': 'customerGroups',
                                                    'Layanan yang Dibeli': 'services',
                                                    'Paket yang Dibeli': 'packages',
                                                    'Kelas yang Dibeli': 'classes',
                                                    'Produk Dibeli': 'products',
                                                    'Voucher yang Dibeli': 'vouchers',
                                                    'Plan yang Dibeli': 'plans'
                                                };

                                                const stateKey = keyMap[activeRuleSidebar];
                                                if (stateKey) {
                                                    setLoyaltySettings({
                                                        ...loyaltySettings,
                                                        [stateKey]: isAllSelected ? ['All'] : tempSelectedItems
                                                    });
                                                }
                                                setActiveRuleSidebar(null);
                                            }}
                                            className="w-full py-5 bg-naqupos-sage text-white rounded-2xl font-bold hover:bg-naqupos-sage/100 transition-all shadow-xl shadow-naqupos-sage/20 flex items-center justify-center gap-2"
                                        >
                                            KONFIRMASI PILIHAN
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Point Per Item Sidebar */}
                    {
                        showPointPerItemSidebar && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-end animate-in fade-in duration-300">
                                <div className="w-[500px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                                    {/* Header */}
                                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-gray-900">Point per item</h3>
                                        <button
                                            onClick={() => setShowPointPerItemSidebar(false)}
                                            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    {/* Search and Select All */}
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-7 h-7 rounded-lg border-2 border-gray-200 flex items-center justify-center relative overflow-hidden transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItemsForPoint.length > 0 && selectedItemsForPoint.length === (
                                                        pointPerItemTab === 'layanan' ? masterServices :
                                                            pointPerItemTab === 'paket' ? masterPackages :
                                                                pointPerItemTab === 'kelas' ? masterClasses :
                                                                    pointPerItemTab === 'produk' ? masterProducts :
                                                                        pointPerItemTab === 'voucher' ? masterVouchers :
                                                                            masterPlans
                                                    ).length}
                                                    onChange={(e) => {
                                                        const items = (
                                                            pointPerItemTab === 'layanan' ? masterServices :
                                                                pointPerItemTab === 'paket' ? masterPackages :
                                                                    pointPerItemTab === 'kelas' ? masterClasses :
                                                                        pointPerItemTab === 'produk' ? masterProducts :
                                                                            pointPerItemTab === 'voucher' ? masterVouchers :
                                                                                masterPlans
                                                        );
                                                        if (e.target.checked) {
                                                            setSelectedItemsForPoint(items.map((it: any) => it.id.toString()));
                                                        } else {
                                                            setSelectedItemsForPoint([]);
                                                        }
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                />
                                                {selectedItemsForPoint.length > 0 && <div className="w-4 h-4 bg-naqupos-sage rounded-sm"></div>}
                                            </div>
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    placeholder="Cari..."
                                                    value={pointPerItemSearch}
                                                    onChange={(e) => setPointPerItemSearch(e.target.value)}
                                                    className="w-full pl-5 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-naqupos-primary/10 outline-none font-medium"
                                                />
                                                <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex px-6 border-b border-gray-100 overflow-x-auto no-scrollbar">
                                        {[
                                            { id: 'layanan', label: 'Layanan' },
                                            { id: 'paket', label: 'Paket Layanan' },
                                            { id: 'kelas', label: 'Kelas' },
                                            { id: 'produk', label: 'Produk' },
                                            { id: 'voucher', label: 'Voucher' },
                                            { id: 'plan', label: 'Plan' }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setPointPerItemTab(tab.id as any)}
                                                className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-all relative ${pointPerItemTab === tab.id ? 'text-naqupos-primary' : 'text-gray-400 font-medium'} `}
                                            >
                                                {tab.label}
                                                {pointPerItemTab === tab.id && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-naqupos-primary rounded-t-full"></div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* List */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                        {(
                                            pointPerItemTab === 'layanan' ? masterServices :
                                                pointPerItemTab === 'paket' ? masterPackages :
                                                    pointPerItemTab === 'kelas' ? masterClasses :
                                                        pointPerItemTab === 'produk' ? masterProducts :
                                                            pointPerItemTab === 'voucher' ? masterVouchers :
                                                                masterPlans
                                        ).filter((item: any) => (item.name || item.title || '').toLowerCase().includes(pointPerItemSearch.toLowerCase()))
                                            .map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer group ${selectedItemsForPoint.includes(item.id.toString()) ? 'bg-naqupos-cream/30' : 'hover:bg-gray-50'} `}
                                                    onClick={() => {
                                                        const id = item.id.toString();
                                                        if (selectedItemsForPoint.includes(id)) {
                                                            setSelectedItemsForPoint(selectedItemsForPoint.filter(sid => sid !== id));
                                                        } else {
                                                            setSelectedItemsForPoint([...selectedItemsForPoint, id]);
                                                        }
                                                    }}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center relative overflow-hidden transition-colors ${selectedItemsForPoint.includes(item.id.toString()) ? 'border-naqupos-sage' : 'border-gray-200'} `}>
                                                        {selectedItemsForPoint.includes(item.id.toString()) && <div className="w-3.5 h-3.5 bg-naqupos-sage rounded-sm"></div>}
                                                    </div>

                                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt="" className="w-full h-full object-crop" />
                                                        ) : (
                                                            <Palette className="text-gray-400" size={20} />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 truncate">{item.name || item.title}</h4>
                                                        <p className="text-xs font-bold text-gray-400">Rp {item.price?.toLocaleString() || '0'}</p>
                                                    </div>

                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-blue-500">{item.points || 0} pts</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {/* Bottom Button */}
                                    <div className="p-6 border-t border-gray-100">
                                        <button
                                            className="w-full py-5 bg-naqupos-sage text-white rounded-2xl font-bold hover:bg-naqupos-sage/100 transition-all shadow-xl shadow-naqupos-sage/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={selectedItemsForPoint.length === 0}
                                        >
                                            Edit point ({selectedItemsForPoint.length})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }


                    {/* Confirmation Modals */}
                    <ConfirmationModal
                        isOpen={!!deleteClosedDateId}
                        onClose={() => setDeleteClosedDateId(null)}
                        onConfirm={confirmDeleteClosedDate}
                        title="Hapus Tanggal Tutup?"
                        message="Apakah Anda yakin ingin menghapus tanggal tutup ini?"
                        confirmLabel="Ya, Hapus"
                        cancelLabel="Batal"
                        type="danger"
                    />

                    <ConfirmationModal
                        isOpen={!!deleteBankId}
                        onClose={() => setDeleteBankId(null)}
                        onConfirm={confirmDeleteBank}
                        title="Hapus Rekening Bank?"
                        message="Apakah Anda yakin ingin menghapus rekening bank ini?"
                        confirmLabel="Ya, Hapus"
                        cancelLabel="Batal"
                        type="danger"
                    />

                    <ConfirmationModal
                        isOpen={!!deleteReasonId}
                        onClose={() => setDeleteReasonId(null)}
                        onConfirm={async () => {
                            if (!deleteReasonId) return;
                            try {
                                setSaving(true);
                                await api.deleteCancellationReason(deleteReasonId);
                                toast.success('Alasan pembatalan berhasil dihapus');
                                fetchCancellationReasons();
                            } catch (error) {
                                console.error('Error deleting cancellation reason:', error);
                                toast.error('Gagal menghapus alasan');
                            } finally {
                                setSaving(false);
                                setDeleteReasonId(null);
                            }
                        }}
                        title="Hapus Alasan Pembatalan?"
                        message="Apakah Anda yakin ingin menghapus alasan ini?"
                        confirmLabel="Ya, Hapus"
                        cancelLabel="Batal"
                        type="danger"
                    />
                </div>
            </div>
        </div>
    );
}
