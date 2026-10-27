import { Search, Plus, Eye, Edit, Star, Gift, History, X, Trash2, User, Phone, Mail, AlertTriangle, Smartphone, UserCheck, Send, CheckCircle, XCircle, Building, FileText, RotateCcw, Users, MessageSquare, Cake, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { useBranchSync } from '../../hooks/useBranchSync';

interface Customer {
    id: number;
    name: string;
    phone: string;
    email: string;
    dob: string;
    dob_formatted?: string;
    visits: number;
    totalSpend: number;
    points: number;
    lastVisit: string;
    status: 'new' | 'regular' | 'loyal' | 'vip';
    notes?: string;
    registrationSource: 'app' | 'walk-in';
    hasAppAccount: boolean;
    branch_id?: number | string;
    address?: string;
}

interface VisitHistory {
    date: string;
    services: string[];
    therapist: string;
    amount: number;
    status: string;
    ref: string;
    notes?: string;
}

interface CustomerStats {
    total: number;
    vip: number;
    new_this_month: number;
    total_points: number;
}

interface CustomerFormData {
    name: string;
    phone: string;
    email: string;
    dob: string;
    address: string;
    notes: string;
    branch_id: string | number;
}

const statusBadge: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    regular: 'bg-gray-100 text-gray-700',
    loyal: 'bg-green-100 text-green-700',
    vip: 'bg-amber-100 text-amber-700',
};

const bookingStatusBadge: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
};

function deriveStatus(visits: number, totalSpend: number): 'new' | 'regular' | 'loyal' | 'vip' {
    if (totalSpend >= 5000000 || visits >= 20) return 'vip';
    if (totalSpend >= 1000000 || visits >= 10) return 'loyal';
    if (visits >= 3) return 'regular';
    return 'new';
}

const toNumber = (value: any): number => {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric : 0;
};

const isSuccessfulPaymentStatus = (status: any): boolean =>
    ['paid', 'success', 'successful', 'settlement', 'capture', 'berhasil', 'completed'].includes(String(status || '').toLowerCase());

const isCompletedBooking = (booking: any): boolean =>
    String(booking?.status || '').toLowerCase() === 'completed';

const getBookingTotal = (booking: any): number =>
    toNumber(booking?.total_price ?? booking?.grand_total ?? booking?.total ?? booking?.transaction?.total_price ?? booking?.amount);

const getPaidAmount = (booking: any): number => {
    const payments = Array.isArray(booking?.payments) ? booking.payments : [];
    const paidFromPayments = payments.reduce((sum: number, payment: any) => {
        if (!isSuccessfulPaymentStatus(payment?.status || payment?.payment_status)) return sum;
        return sum + toNumber(payment?.amount ?? payment?.paid_amount ?? payment?.total);
    }, 0);

    if (paidFromPayments > 0) return paidFromPayments;

    const explicitPaid = toNumber(
        booking?.paid_amount ??
        booking?.total_paid ??
        booking?.amount_paid ??
        booking?.dp_amount ??
        booking?.down_payment_amount ??
        booking?.nominal_dp
    );
    if (explicitPaid > 0) return explicitPaid;

    const paymentStatus = String(booking?.payment_status || '').toLowerCase();
    if (paymentStatus === 'paid') return getBookingTotal(booking);

    const transactionPaymentType = String(booking?.transaction?.payment_type || booking?.payment_type || '').toLowerCase();
    const transactionPaid = toNumber(booking?.transaction?.total ?? booking?.transaction?.amount ?? booking?.transaction?.paid_amount);
    if (transactionPaid > 0 && (paymentStatus === 'partial' || transactionPaymentType === 'dp' || transactionPaymentType === 'down_payment')) {
        return transactionPaid;
    }

    return 0;
};

const summarizeCustomerHistory = (bookings: any[]) => {
    const totalSpend = bookings.reduce((sum, booking) => sum + getPaidAmount(booking), 0);
    const completedVisits = bookings.filter(isCompletedBooking).length;
    return { totalSpend, completedVisits };
};

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);

    // searchInput = apa yang user ketik (tidak trigger API)
    // searchQuery = yang aktif dikirim ke API (update saat Enter/klik Cari)
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [stats, setStats] = useState<CustomerStats>({ total: 0, vip: 0, new_this_month: 0, total_points: 0 });

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [visitHistory, setVisitHistory] = useState<VisitHistory[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const [spendCache, setSpendCache] = useState<Record<number, { spend: number; visits: number; status: 'new' | 'regular' | 'loyal' | 'vip'; failed?: boolean }>>({});

    const [formData, setFormData] = useState<CustomerFormData>({ name: '', phone: '', email: '', dob: '', address: '', notes: '', branch_id: '' });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [pointsToAdd, setPointsToAdd] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);

    const { selectedBranchId: branchFilter, setSelectedBranchId: setBranchFilter } = useBranchSync<string | number>(() => setPage(1), '');

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [user, setUser] = useState<any>(null);

    const [sourceFilter, setSourceFilter] = useState<'all' | 'app' | 'walk-in'>('all');
    const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'regular' | 'loyal' | 'vip'>('all');

    useEffect(() => {
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) setUser(JSON.parse(authData).user);
    }, []);

    const isSuperAdmin = ['owner', 'super_admin', 'super admin'].includes(user?.role?.toLowerCase() || '');

    // isFiltered cek searchQuery (yang sudah dikirim), bukan searchInput
    const isFiltered = searchQuery !== '' || (branchFilter !== '' && branchFilter !== 'all') || sourceFilter !== 'all' || appStatusFilter !== 'all' || statusFilter !== 'all';

    const resetFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setBranchFilter('');
        setSourceFilter('all');
        setAppStatusFilter('all');
        setStatusFilter('all');
        setPage(1);
    };

    useEffect(() => {
        api.getBranches().then(setBranches).catch(console.error);
    }, []);

    // searchQuery tidak masuk dependency — hanya trigger saat eksplisit
    useEffect(() => {
        loadCustomers(searchQuery);
    }, [branchFilter, sourceFilter, appStatusFilter, statusFilter, page, perPage, searchQuery]);

    useEffect(() => { loadStats(); }, [branchFilter]);

    const handleSearch = () => {
        setSearchQuery(searchInput);
        setPage(1);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const loadStats = async () => {
        try {
            const params: any = {
                branch_id: (branchFilter === '' || branchFilter === 'all') ? undefined : branchFilter,
                limit: 1, page: 1
            };
            const response = await api.getCustomers(params);
            if (response.stats) {
                setStats({
                    total: response.stats.total || response.total || 0,
                    vip: response.stats.vip || 0,
                    new_this_month: response.stats.new_this_month || 0,
                    total_points: response.stats.total_points || 0,
                });
            } else {
                const [vipRes, newRes] = await Promise.allSettled([
                    api.getCustomers({ ...params, status: 'vip', limit: 1 }),
                    api.getCustomers({ ...params, status: 'new', limit: 1 }),
                ]);
                setStats({
                    total: response.total || 0,
                    vip: vipRes.status === 'fulfilled' ? (vipRes.value.total || 0) : 0,
                    new_this_month: newRes.status === 'fulfilled' ? (newRes.value.total || 0) : 0,
                    total_points: response.total_points || 0,
                });
            }
        } catch (err) { console.error('Error loading stats:', err); }
    };

    const loadCustomers = async (overrideSearch?: string) => {
        try {
            setLoading(true);
            setError('');
            const activeSearch = overrideSearch !== undefined ? overrideSearch : searchQuery;
            const params: any = {
                search: activeSearch || undefined,
                branch_id: (branchFilter === '' || branchFilter === 'all') ? undefined : branchFilter,
                registration_source: sourceFilter !== 'all' ? sourceFilter : undefined,
                app_account_status: appStatusFilter !== 'all' ? appStatusFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                page,
                limit: perPage
            };
            const response = await api.getCustomers(params);
            const rawData = Array.isArray(response) ? response : (response.data || []);
            const serverTotal = response.total || (Array.isArray(response) ? response.length : (response.data?.length || 0));
            setTotalItems(serverTotal);

            if (statusFilter === 'all' && sourceFilter === 'all' && appStatusFilter === 'all' && !activeSearch) {
                setStats(prev => ({ ...prev, total: serverTotal }));
            }

            const mappedData: Customer[] = rawData.map((item: any) => {
                const cached = spendCache[item.id];
                return {
                    id: item.id,
                    name: item.name || 'Unknown',
                    phone: item.phone || '-',
                    email: item.email || '-',
                    dob: item.dob || '-',
                    dob_formatted: item.dob_formatted || item.dob || '-',
                    visits: cached?.visits ?? (item.completed_visits_count ?? item.completed_visits ?? item.visits_count ?? 0),
                    totalSpend: cached?.spend ?? 0,
                    points: item.loyalty_points || 0,
                    lastVisit: item.last_visit || '-',
                    status: cached?.status ?? (item.status || 'new'),
                    notes: item.notes,
                    registrationSource: item.registration_source || 'walk-in',
                    hasAppAccount: !!item.has_app_account,
                    branch_id: item.branch_id,
                    address: item.address,
                };
            });

            setCustomers(mappedData);
            fetchSpendForPage(mappedData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load customers');
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSpendForPage = async (customerList: Customer[]) => {
        const uncached = customerList.filter(c => !spendCache[c.id]);
        if (uncached.length === 0) return;

        for (let i = 0; i < uncached.length; i += 5) {
            const chunk = uncached.slice(i, i + 5);
            await Promise.allSettled(chunk.map(async (customer) => {
                try {
                    const res = await api.getCustomerHistory(customer.id);
                    const data = Array.isArray(res) ? res : (res.data || res.bookings || []);
                    const { totalSpend, completedVisits } = summarizeCustomerHistory(data);
                    const derivedStatus = deriveStatus(completedVisits, totalSpend);
                    setSpendCache(prev => ({ ...prev, [customer.id]: { spend: totalSpend, visits: completedVisits, status: derivedStatus } }));
                    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, visits: completedVisits, totalSpend, status: derivedStatus } : c));
                } catch (e) {
                    console.error('Failed to load customer spending', e);
                    setSpendCache(prev => ({ ...prev, [customer.id]: { spend: 0, visits: 0, status: customer.status, failed: true } }));
                }
            }));
        }
    };

    const loadVisitHistory = async (customer: Customer) => {
        setIsLoadingHistory(true);
        setVisitHistory([]);
        try {
            const res = await api.getCustomerHistory(customer.id);
            const fetchedData = Array.isArray(res) ? res : (res.data || res.bookings || []);
            const completedBookings = fetchedData.filter(isCompletedBooking);

            const mapped: VisitHistory[] = completedBookings.map((b: any) => {
                const services: string[] = [];
                if (b.items?.length > 0) {
                    b.items.forEach((item: any) => { if (item.service?.name && !services.includes(item.service.name)) services.push(item.service.name); });
                } else if (b.service?.name) { services.push(b.service.name); }

                const therapistNames: string[] = [];
                if (b.items?.length > 0) {
                    b.items.forEach((item: any) => { if (item.therapist?.name && !therapistNames.includes(item.therapist.name)) therapistNames.push(item.therapist.name); });
                } else if (b.therapist?.name) { therapistNames.push(b.therapist.name); }

                return {
                    date: b.booking_date || b.date || '-',
                    services: services.length > 0 ? services : ['-'],
                    therapist: therapistNames.join(', ') || '-',
                    amount: getPaidAmount(b),
                    status: String(b.status || 'confirmed').toLowerCase(),
                    ref: b.booking_ref || b.ref || `#${b.id}`,
                     notes: b.notes || '',  // ← tambah ini
                };
            });

            setVisitHistory(mapped);

            const { totalSpend, completedVisits } = summarizeCustomerHistory(fetchedData);
            const derivedStatus = deriveStatus(completedVisits, totalSpend);
            setSpendCache(prev => ({ ...prev, [customer.id]: { spend: totalSpend, visits: completedVisits, status: derivedStatus } }));
            setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, visits: completedVisits, totalSpend, status: derivedStatus } : c));
            setSelectedCustomer(prev => prev?.id === customer.id ? { ...prev, visits: completedVisits, totalSpend, status: derivedStatus } : prev);
        } catch (err) {
            console.error('Error loading visit history:', err);
            toast.error('Gagal memuat riwayat kunjungan');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const detailTotalSpend = visitHistory.reduce((sum, v) => sum + v.amount, 0);
    const selectedCustomerSpend = selectedCustomer?.totalSpend ?? 0;
    const detailCompletedVisits = visitHistory.filter(v => v.status === 'completed').length;

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === '-') return '-';
        try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)); }
        catch { return dateStr; }
    };

    const openAddModal = () => {
        let defaultBranchId: string | number = '';
        if (isSuperAdmin) { defaultBranchId = branchFilter === 'all' ? '' : branchFilter; }
        else if (user?.branch) { const ub = branches.find(b => b.name === user.branch); if (ub) defaultBranchId = ub.id; }
        setFormData({ name: '', phone: '', email: '', dob: '', address: '', notes: '', branch_id: defaultBranchId });
        setIsEditing(false); setShowAddEditModal(true);
    };

    const openEditModal = (customer: Customer) => {
        setSelectedCustomer(customer);
        const clean = (v?: string) => (v && v.trim() !== '-' ? v : '');
        setFormData({ name: customer.name, phone: clean(customer.phone), email: clean(customer.email), dob: clean(customer.dob), address: clean(customer.address), notes: customer.notes || '', branch_id: customer.branch_id || '' });
        setIsEditing(true); setShowAddEditModal(true);
    };

    const openDetailModal = (customer: Customer) => { setSelectedCustomer(customer); setShowDetailModal(true); loadVisitHistory(customer); };
    const openHistoryModal = (customer: Customer) => { setSelectedCustomer(customer); setShowHistoryModal(true); loadVisitHistory(customer); };
    const openPointsModal = (customer: Customer) => { setSelectedCustomer(customer); setPointsToAdd(''); setShowPointsModal(true); };
    const openDeleteModal = (customer: Customer) => { setSelectedCustomer(customer); setShowDeleteModal(true); };
    const openWhatsAppModal = (customer: Customer) => { setSelectedCustomer(customer); setShowWhatsAppModal(true); };

    const closeAllModals = () => {
        setShowDetailModal(false); setShowAddEditModal(false); setShowHistoryModal(false);
        setShowPointsModal(false); setShowDeleteModal(false); setShowWhatsAppModal(false);
        setSelectedCustomer(null); setFormErrors({}); setVisitHistory([]);
    };

    const validateForm = (data: CustomerFormData) => {
        const errors: Record<string, string> = {};
        const name = (data.name || '').trim();
        if (!name) errors.name = 'Nama lengkap wajib diisi';
        else if (!/^[A-Za-z\s'.]+$/.test(name)) errors.name = 'Nama lengkap hanya boleh berisi huruf';
        if (!(data.phone || '').trim()) errors.phone = 'No. Telepon wajib diisi';
        const phoneClean = data.phone.replace(/[\s-]/g, '');
        if (phoneClean && !/^(\+628|628|08|021)\d{7,13}$/.test(phoneClean)) errors.phone = 'Format nomor telepon tidak valid. Gunakan format 08, +628, atau 021';
        const email = (data.email || '').trim();
        if (email && email !== '-' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Format email tidak valid';
        const dob = (data.dob || '').trim();
        if (dob && dob !== '-') { const d = new Date(dob); if (isNaN(d.getTime())) errors.dob = 'Tanggal lahir tidak valid'; else { const t = new Date(); t.setHours(0, 0, 0, 0); if (d > t) errors.dob = 'Tanggal lahir tidak boleh melebihi hari ini'; } }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveCustomer = async () => {
        const normalized = {
            ...formData,
            name: (formData.name || '').trim(),
            phone: (formData.phone || '').trim(),
            email: (formData.email || '').trim() === '-' ? '' : (formData.email || '').trim(),
            address: (formData.address || '').trim(),
            dob: (formData.dob || '').trim() === '-' ? '' : (formData.dob || '').trim(),
        };
        if (!normalized.name || !normalized.phone) { toast.error('Nama dan No. Telepon wajib diisi'); return; }
        if (!validateForm(normalized)) { toast.error('Mohon perbaiki kesalahan pada formulir'); return; }
        setIsProcessing(true);
        try {
            const payload = {
                ...normalized,
                dob: normalized.dob ? normalized.dob : null,
                birth_date: normalized.dob ? normalized.dob : null,
                branch_id: normalized.branch_id === 'all' || normalized.branch_id === '' ? null : normalized.branch_id
            };
            if (isEditing && selectedCustomer) { await api.updateCustomer(selectedCustomer.id, payload); toast.success('Berhasil memperbarui data pelanggan'); }
            else { await (api as any).createCustomer(payload); toast.success('Berhasil menambah pelanggan'); }
            await loadCustomers(); await loadStats(); closeAllModals();
        } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Gagal menyimpan data pelanggan'); }
        finally { setIsProcessing(false); }
    };

    const handleAddPoints = async () => {
        if (!selectedCustomer) { toast.error('Pelanggan belum dipilih'); return; }
        const points = Number(pointsToAdd);
        if (!pointsToAdd.trim() || !Number.isFinite(points) || !Number.isInteger(points)) {
            toast.error('Jumlah poin harus berupa bilangan bulat');
            return;
        }
        if (points <= 0) { toast.error('Jumlah poin harus lebih besar dari 0'); return; }
        if (points > 1000000) { toast.error('Jumlah poin terlalu besar'); return; }

        setIsProcessing(true);
        try {
            const updated = await api.adjustCustomerPoints(selectedCustomer.id, points);
            const nextPoints = Number(updated?.loyalty_points ?? updated?.points ?? (selectedCustomer.points + points));
            setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, points: nextPoints } : c));
            closeAllModals();
            toast.success(`Berhasil menambahkan ${points} poin`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal menambah poin';
            toast.error(msg.includes('404') || msg.toLowerCase().includes('not found')
                ? 'Fitur penambahan poin belum tersedia di backend'
                : msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCustomer = async () => {
        if (!selectedCustomer) return;
        setIsProcessing(true);
        try { await api.deleteCustomer(selectedCustomer.id); await loadCustomers(); await loadStats(); closeAllModals(); toast.success('Berhasil menghapus pelanggan'); }
        catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to delete customer'); }
        finally { setIsProcessing(false); }
    };

    const handleInviteToApp = (customer: Customer) => {
        const phone = customer.phone.replace(/-/g, '').replace(/^0/, '62');
        const msg = encodeURIComponent(`Halo ${customer.name}! 👋\n\nTerima kasih sudah menjadi pelanggan setia Naqupos Beauty & Spa. ✨\n\nKami ingin mengundang Anda untuk download aplikasi Naqupos App untuk:\n📅 Booking treatment lebih mudah\n🎁 Kumpulkan & tukar poin loyalty\n📢 Dapatkan promo eksklusif\n\nDownload sekarang: https://naqupos.app/download\n\nGunakan nomor WhatsApp ini untuk mendaftar & dapatkan 50 poin bonus! 🎉`);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    const handleSendWhatsApp = async (type: 'promo' | 'birthday') => {
        if (!selectedCustomer) return;
        setIsSendingWhatsApp(true);
        try {
            if (type === 'promo') { await api.sendWhatsAppPromo({ customer_id: selectedCustomer.id, service_name: 'Treatment Favorit', discount_rate: '20%' }); toast.success('Promo WhatsApp berhasil dikirim'); }
            else { await api.sendWhatsAppBirthday({ customer_id: selectedCustomer.id, discount: '30%', expiry_date: '7 hari' }); toast.success('Ucapan Ultah WhatsApp berhasil dikirim'); }
            closeAllModals();
        } catch (err: any) { toast.error(err.message || 'Gagal mengirim pesan WhatsApp'); }
        finally { setIsSendingWhatsApp(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-naqupos-primary mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading customers...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error: {error}</p>
            <button onClick={() => loadCustomers()} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">Try again</button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-naqupos-dark">Data Pelanggan</h1>
                        <p className="text-gray-500 text-sm">Database pelanggan & loyalty program</p>
                    </div>
                    {isSuperAdmin && (
                        <div className="bg-white p-1.5 rounded-2xl border border-naqupos-primary/20 shadow-sm">
                            <BranchSelector selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)} onBranchChange={(id) => { setBranchFilter(id || ''); setPage(1); }} showAllOption={true} />
                        </div>
                    )}
                </div>
                <button onClick={openAddModal} className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors self-start md:self-center">
                    <Plus size={18} /><span>Tambah Pelanggan</span>
                </button>
            </div>

            {/* Branch Info Cards */}
            {branchFilter !== '' && branchFilter !== 'all' && branches.find(b => b.id === Number(branchFilter)) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { icon: <Building size={20} />, label: 'Cabang Terpilih', value: branches.find(b => b.id === Number(branchFilter))?.name },
                        { icon: <Phone size={20} />, label: 'Kontak', value: branches.find(b => b.id === Number(branchFilter))?.phone || '-' },
                        { icon: <FileText size={20} />, label: 'Alamat', value: branches.find(b => b.id === Number(branchFilter))?.address || '-' },
                    ].map((item, i) => (
                        <div key={i} className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-naqupos-primary/10 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                            <div className="w-10 h-10 rounded-xl bg-naqupos-cream flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">{item.icon}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{item.label}</p>
                                <p className="font-bold text-naqupos-dark text-sm truncate">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-sm text-gray-500">Total Pelanggan</p>
                    <p className="text-2xl font-bold text-naqupos-dark mt-1">{stats.total.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-sm text-gray-500">Pelanggan Baru (Bulan Ini)</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{stats.new_this_month.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-sm text-gray-500">VIP Members</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{stats.vip.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-sm text-gray-500">Total Poin Beredar</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.total_points.toLocaleString('id-ID')}</p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                {/* Search box — trigger hanya via Enter atau klik tombol Cari */}
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Nama atau no. telepon, tekan Enter..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full pl-10 pr-20 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none"
                    />
                    <button
                        onClick={handleSearch}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-naqupos-primary text-white rounded-md text-xs font-semibold hover:bg-naqupos-accent transition-colors"
                    >
                        Cari
                    </button>
                </div>

                {isSuperAdmin && (
                    <div className="bg-naqupos-primary/5 p-1 rounded-2xl border border-naqupos-primary/10 shadow-sm">
                        <BranchSelector selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)} onBranchChange={(id) => { setBranchFilter(id || ''); setPage(1); }} showAllOption={true} />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <SearchableSelect value={sourceFilter} onChange={(val) => { setSourceFilter(val as any); setPage(1); }} options={[{ value: 'all', label: 'Semua Sumber' }, { value: 'app', label: 'App' }, { value: 'walk-in', label: 'Walk-in' }]} className="w-[160px]" />
                    <SearchableSelect value={appStatusFilter} onChange={(val) => { setAppStatusFilter(val as any); setPage(1); }} options={[{ value: 'all', label: 'Akun App: Semua' }, { value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Belum Aktif' }]} className="w-[180px]" />
                    <SearchableSelect value={statusFilter} onChange={(val) => { setStatusFilter(val as any); setPage(1); }} options={[{ value: 'all', label: 'Semua Status' }, { value: 'new', label: 'New' }, { value: 'regular', label: 'Regular' }, { value: 'loyal', label: 'Loyal' }, { value: 'vip', label: 'VIP' }]} className="w-[160px]" />
                    {isFiltered && (
                        <button onClick={resetFilters} className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-xs">
                            <RotateCcw size={14} />Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Aktif search indicator */}
            {searchQuery && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Hasil pencarian untuk: <span className="font-semibold text-naqupos-dark">"{searchQuery}"</span></span>
                    <button onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                        <X size={12} /> Hapus
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-left text-xs text-gray-500 uppercase">
                            <th className="px-4 py-3 font-medium">Pelanggan</th>
                            <th className="px-4 py-3 font-medium">Kontak</th>
                            <th className="px-4 py-3 font-medium">Sumber</th>
                            <th className="px-4 py-3 font-medium">Akun App</th>
                            <th className="px-4 py-3 font-medium">Kunjungan</th>
                            <th className="px-4 py-3 font-medium">Total Spending</th>
                            <th className="px-4 py-3 font-medium">Poin</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {customers.length === 0 ? (
                            <tr><td colSpan={9} className="px-4 py-8">
                                <EmptyState
                                    title={searchQuery ? `Tidak ditemukan hasil untuk "${searchQuery}"` : "Belum ada pelanggan"}
                                    message={searchQuery ? "Coba kata kunci lain atau reset pencarian." : "Tidak ditemukan data pelanggan yang sesuai."}
                                    icon={Users}
                                />
                            </td></tr>
                        ) : (
                            customers.map(customer => (
                                <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-naqupos-secondary flex items-center justify-center font-bold text-naqupos-dark">
                                                {customer.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-medium text-naqupos-dark">{customer.name}</p>
                                                <p className="text-xs text-gray-500 max-w-xs truncate">Alamat: {customer.address || '-'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><p>{customer.phone}</p><p className="text-xs text-gray-500">{customer.email}</p></td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${customer.registrationSource === 'app' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {customer.registrationSource === 'app' ? <><Smartphone size={12} /> App</> : <><UserCheck size={12} /> Walk-in</>}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {customer.hasAppAccount
                                            ? <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle size={14} /><span className="text-xs font-medium">Aktif</span></span>
                                            : <span className="inline-flex items-center gap-1 text-gray-400"><XCircle size={14} /><span className="text-xs font-medium">Belum</span></span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 font-medium">{customer.visits}x</td>
                                    <td className="px-4 py-3 font-medium text-naqupos-primary">
                                        {spendCache[customer.id]
                                            ? (spendCache[customer.id].failed
                                                ? <span className="text-gray-400 text-xs">-</span>
                                                : `Rp ${Number(spendCache[customer.id].spend || 0).toLocaleString('id-ID')}`)
                                            : <span className="text-gray-300 text-xs animate-pulse">memuat...</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 text-amber-600"><Star size={14} fill="currentColor" />{customer.points}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${statusBadge[customer.status]}`}>{customer.status}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openDetailModal(customer)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Detail"><Eye size={16} className="text-gray-500" /></button>
                                            <button onClick={() => openEditModal(customer)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit"><Edit size={16} className="text-gray-500" /></button>
                                            <button onClick={() => openHistoryModal(customer)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Riwayat"><History size={16} className="text-gray-500" /></button>
                                            <button onClick={() => openPointsModal(customer)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Beri Poin"><Gift size={16} className="text-gray-500" /></button>
                                            {!customer.hasAppAccount && (
                                                <button onClick={() => handleInviteToApp(customer)} className="p-2 hover:bg-green-50 rounded-lg transition-colors" title="Undang ke App"><Send size={16} className="text-green-500" /></button>
                                            )}
                                            <button onClick={() => openWhatsAppModal(customer)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Kirim WhatsApp"><MessageSquare size={16} className="text-blue-500" /></button>
                                            <button onClick={() => openDeleteModal(customer)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
                <div className="mt-4">
                    <Pagination currentPage={page} totalItems={totalItems} itemsPerPage={perPage} onPageChange={setPage} onItemsPerPageChange={(val) => { setPerPage(val); setPage(1); }} />
                </div>
            )}

            {/* ── Detail Modal ── */}
            {showDetailModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-naqupos-dark">Detail Pelanggan</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-naqupos-secondary mx-auto flex items-center justify-center text-2xl font-bold text-naqupos-dark">
                                {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <h4 className="text-xl font-bold text-naqupos-dark mt-3">{selectedCustomer.name}</h4>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium uppercase ${statusBadge[selectedCustomer.status]}`}>{selectedCustomer.status}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${selectedCustomer.registrationSource === 'app' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {selectedCustomer.registrationSource === 'app' ? <><Smartphone size={10} /> App</> : <><UserCheck size={10} /> Walk-in</>}
                                </span>
                            </div>
                        </div>
                        <div className={`rounded-lg p-4 mb-4 ${selectedCustomer.hasAppAccount ? 'bg-green-50' : 'bg-amber-50'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {selectedCustomer.hasAppAccount
                                        ? <><CheckCircle size={20} className="text-green-600" /><div><p className="font-medium text-green-800">Akun App Aktif</p><p className="text-xs text-green-600">Pelanggan sudah terdaftar di Naqupos App</p></div></>
                                        : <><XCircle size={20} className="text-amber-600" /><div><p className="font-medium text-amber-800">Belum Punya Akun App</p><p className="text-xs text-amber-600">Undang pelanggan untuk download app</p></div></>
                                    }
                                </div>
                                {!selectedCustomer.hasAppAccount && (
                                    <button onClick={() => handleInviteToApp(selectedCustomer)} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                                        <Send size={14} /> Undang
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                            <div className="flex items-center gap-3"><Phone size={16} className="text-gray-400" /><span>{selectedCustomer.phone}</span></div>
                            <div className="flex items-center gap-3"><Mail size={16} className="text-gray-400" /><span>{selectedCustomer.email}</span></div>
                            <div className="flex items-start gap-3"><FileText size={16} className="text-gray-400 mt-0.5" /><span>Alamat: {selectedCustomer.address || '-'}</span></div>
                            <div className="flex items-center gap-3"><Building size={16} className="text-gray-400" /><span>Cabang: {selectedCustomer.branch_id ? (branches.find(b => b.id === Number(selectedCustomer.branch_id))?.name || 'Global') : 'Global'}</span></div>
                            {selectedCustomer.notes && <div className="pt-2 border-t border-gray-200"><p className="text-gray-500 text-xs mb-1">Catatan:</p><p>{selectedCustomer.notes}</p></div>}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="bg-naqupos-cream rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-naqupos-primary">{isLoadingHistory ? selectedCustomer.visits : detailCompletedVisits}x</p>
                                <p className="text-xs text-gray-500">Kunjungan</p>
                            </div>
                            <div className="bg-naqupos-cream rounded-lg p-3 text-center">
                                {isLoadingHistory
                                    ? <Loader2 size={20} className="animate-spin text-naqupos-primary mx-auto my-1" />
                                    : <p className="text-lg font-bold text-naqupos-primary">Rp {selectedCustomerSpend.toLocaleString('id-ID')}</p>
                                }
                                <p className="text-xs text-gray-500">Total Spend</p>
                            </div>
                            <div className="bg-naqupos-cream rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-amber-600 flex items-center justify-center gap-1"><Star size={16} fill="currentColor" />{selectedCustomer.points}</p>
                                <p className="text-xs text-gray-500">Poin</p>
                            </div>
                        </div>
                        <button onClick={closeAllModals} className="w-full mt-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Tutup</button>
                    </div>
                </div>
            )}

            {/* ── Add/Edit Modal ── */}
            {showAddEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-naqupos-dark">{isEditing ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
                                <div className="relative"><User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" value={formData.name} onChange={(e) => { const v = e.target.value; setFormData(p => { const n = { ...p, name: v }; validateForm(n); return n; }); }} placeholder="Masukkan nama lengkap..." className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:border-naqupos-primary outline-none ${formErrors.name ? 'border-red-500' : 'border-gray-200'}`} />
                                </div>
                                {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">No. Telepon *</label>
                                <div className="relative"><Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="tel" value={formData.phone} onChange={(e) => { const v = e.target.value; setFormData(p => { const n = { ...p, phone: v }; validateForm(n); return n; }); }} placeholder="08xx-xxxx-xxxx" className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:border-naqupos-primary outline-none ${formErrors.phone ? 'border-red-500' : 'border-gray-200'}`} />
                                </div>
                                {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <div className="relative"><Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" value={formData.email} onChange={(e) => { const v = e.target.value; setFormData(p => { const n = { ...p, email: v }; validateForm(n); return n; }); }} placeholder="email@example.com" className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:border-naqupos-primary outline-none ${formErrors.email ? 'border-red-500' : 'border-gray-200'}`} />
                                </div>
                                {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                            </div>
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Cabang *</label>
                                    <SearchableSelect value={formData.branch_id} onChange={(val) => setFormData(prev => ({ ...prev, branch_id: val }))} options={[{ value: 'all', label: 'Semua Cabang (Global)' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} placeholder="Pilih Cabang..." />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                                <textarea value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Masukkan alamat lengkap pelanggan..." rows={3} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                                <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Catatan tentang pelanggan..." rows={2} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Batal</button>
                            <button onClick={handleSaveCustomer} disabled={isProcessing || !formData.name || !formData.phone} className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isProcessing || !formData.name || !formData.phone ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Pelanggan')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── History Modal ── */}
            {showHistoryModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <div><h3 className="text-xl font-bold text-naqupos-dark">Riwayat Kunjungan</h3><p className="text-sm text-gray-500">{selectedCustomer.name}</p></div>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        {isLoadingHistory ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-3">
                                <Loader2 size={32} className="text-naqupos-primary animate-spin" />
                                <p className="text-sm text-gray-400 animate-pulse">Memuat riwayat kunjungan...</p>
                            </div>
                        ) : visitHistory.length === 0 ? (
                            <div className="py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <History size={40} className="mx-auto text-gray-200 mb-3" />
                                <h5 className="text-sm font-bold text-gray-400">Belum Ada Riwayat</h5>
                                <p className="text-xs text-gray-400 mt-1">Pelanggan ini belum memiliki kunjungan tercatat.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 p-3 bg-naqupos-cream rounded-xl flex justify-between items-center">
                                    <span className="text-sm text-gray-500 font-medium">{detailCompletedVisits} kunjungan selesai</span>
                                    <span className="font-bold text-naqupos-primary">Terbayar: Rp {detailTotalSpend.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="space-y-3">
                                    {visitHistory.map((visit, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-naqupos-dark">{formatDate(visit.date)}</p>
                                                    <p className="text-sm text-gray-500">Terapis: {visit.therapist}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{visit.ref}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-naqupos-primary">Rp {visit.amount.toLocaleString('id-ID')}</p>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${bookingStatusBadge[visit.status] || 'bg-gray-100 text-gray-600'}`}>
                                                        {visit.status === 'confirmed' ? 'Terkonfirmasi' : visit.status === 'completed' ? 'Selesai' : visit.status === 'in_progress' ? 'Berlangsung' : visit.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {visit.services.map((s, i) => <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">{s}</span>)}
                                           {(visit as any).notes && (
    <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Catatan</p>
        {(() => {
            try {
                const parsed = JSON.parse((visit as any).notes);
                if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return Object.entries(parsed).map(([idx, note]) => (
                        note ? (
                            <p key={idx} className="text-xs text-amber-800 italic">
                                Tamu {Number(idx) + 1}: {note as string}
                            </p>
                        ) : null
                    ));
                }
            } catch {}
            return <p className="text-xs text-amber-800 italic">{(visit as any).notes}</p>;
        })()}
    </div>
)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <button onClick={closeAllModals} className="w-full mt-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Tutup</button>
                    </div>
                </div>
            )}

            {/* ── Points Modal ── */}
            {showPointsModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-naqupos-dark">Tambah Poin</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="text-center mb-4">
                            <p className="text-gray-500">{selectedCustomer.name}</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <Star size={20} className="text-amber-500" fill="currentColor" />
                                <span className="text-2xl font-bold text-amber-600">{selectedCustomer.points}</span>
                                <span className="text-gray-500">poin saat ini</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Poin</label>
                            <input type="number" min={1} max={1000000} step={1} value={pointsToAdd} onChange={(e) => setPointsToAdd(e.target.value)} placeholder="Masukkan jumlah poin..." className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-center text-xl" />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Batal</button>
                            <button onClick={handleAddPoints} disabled={isProcessing || !pointsToAdd} className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isProcessing || !pointsToAdd ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                <Gift size={18} />{isProcessing ? 'Memproses...' : 'Tambah Poin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ── */}
            {showDeleteModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-naqupos-dark">Hapus Pelanggan</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                            <div><p className="font-medium text-red-800">Peringatan!</p><p className="text-sm text-red-600">Data pelanggan yang dihapus tidak dapat dikembalikan.</p></div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="font-bold text-naqupos-dark">{selectedCustomer.name}</p>
                            <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                            <p className="text-sm text-gray-500 mt-1">{selectedCustomer.visits} kunjungan • {selectedCustomer.points} poin</p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Batal</button>
                            <button onClick={handleDeleteCustomer} disabled={isProcessing} className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isProcessing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── WhatsApp Modal ── */}
            {showWhatsAppModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-naqupos-dark">Kirim WhatsApp</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center text-green-600 mb-2"><MessageSquare size={32} /></div>
                            <p className="font-bold text-naqupos-dark">{selectedCustomer.name}</p>
                            <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => handleSendWhatsApp('promo')} disabled={isSendingWhatsApp} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-naqupos-primary hover:bg-naqupos-secondary/10 transition-all text-left group">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors"><Star size={20} /></div>
                                <div className="flex-1"><p className="font-bold text-naqupos-dark">Kirim Promo</p><p className="text-xs text-gray-500">Kirim template pesan promosi treatment</p></div>
                            </button>
                            <button onClick={() => handleSendWhatsApp('birthday')} disabled={isSendingWhatsApp} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-naqupos-primary hover:bg-naqupos-secondary/10 transition-all text-left group">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors"><Cake size={20} /></div>
                                <div className="flex-1"><p className="font-bold text-naqupos-dark">Kirim Ucapan Ultah</p><p className="text-xs text-gray-500">Kirim template ucapan selamat ulang tahun</p></div>
                            </button>
                            <button onClick={() => { window.open(`https://wa.me/${selectedCustomer.phone.replace(/-/g, '').replace(/^0/, '62')}`, '_blank'); closeAllModals(); }} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-naqupos-primary hover:bg-naqupos-secondary/10 transition-all text-left group">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors"><MessageSquare size={20} /></div>
                                <div className="flex-1"><p className="font-bold text-naqupos-dark">Chat WhatsApp</p><p className="text-xs text-gray-500">Buka chat personal langsung ke WhatsApp</p></div>
                                <Send size={16} className="text-gray-400 group-hover:text-naqupos-primary" />
                            </button>
                        </div>
                        {isSendingWhatsApp && (
                            <div className="mt-4 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-naqupos-primary mx-auto"></div>
                                <p className="mt-2 text-xs text-naqupos-primary animate-pulse font-medium">Sedang mengirim pesan...</p>
                            </div>
                        )}
                        <button onClick={closeAllModals} className="w-full mt-6 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-lg transition-colors">Tutup</button>
                    </div>
                </div>
            )}
        </div>
    );
}
