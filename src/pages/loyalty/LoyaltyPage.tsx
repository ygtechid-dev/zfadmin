import { useState, useEffect, useMemo } from 'react';
import {
    Search, Gift, TrendingUp, TrendingDown, Settings, X, AlertTriangle,
    Award, Star, Users, ShoppingBag, ArrowUpRight, ArrowDownRight,
    Building, Phone, FileText, RotateCcw,
    Calendar
} from 'lucide-react';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';

interface LoyaltyTransaction {
    id: number;
    customerId: number;
    customerName: string;
    type: 'earn' | 'redeem';
    points: number;
    description: string;
    date: string;
    bookingId?: string;
}

interface LoyaltySettings {
    earnRate: number; // Points earned per Rp 10,000
    redeemRate: number; // Rp value per point
    minRedeem: number; // Minimum points to redeem
    expiryMonths: number; // Points expiry in months
    birthdayBonus: number; // Bonus points on birthday
    firstVisitBonus: number; // Bonus points on first visit
}

interface Customer {
    id: number;
    name: string;
    phone: string;
    totalPoints: number;
    usedPoints: number;
    availablePoints: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    totalSpent: number;
    joinDate: string;
}

const tierConfig = {
    bronze: { label: 'Bronze', color: 'bg-amber-700 text-white', minSpent: 0 },
    silver: { label: 'Silver', color: 'bg-gray-400 text-white', minSpent: 1000000 },
    gold: { label: 'Gold', color: 'bg-yellow-500 text-white', minSpent: 5000000 },
    platinum: { label: 'Platinum', color: 'bg-purple-600 text-white', minSpent: 10000000 },
};

export default function LoyaltyPage() {
    const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    type LoyaltyFilterType = 'all' | 'earn' | 'redeem';
    const [filterType, setFilterType] = useState<LoyaltyFilterType>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [customerFilter, setCustomerFilter] = useState<string | number>('all');
    const [tierFilter, setTierFilter] = useState<string>('all');
    const [customerList, setCustomerList] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'transactions' | 'members' | 'settings'>('transactions');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [stats, setStats] = useState({
        totalEarned: 0,
        totalRedeemed: 0,
        activeMembers: 0,
        avgPoints: 0
    });

    const [settings, setSettings] = useState<LoyaltySettings>({
        earnRate: 10,
        redeemRate: 100,
        minRedeem: 100,
        expiryMonths: 12,
        birthdayBonus: 50,
        firstVisitBonus: 100
    });

    const [adjustForm, setAdjustForm] = useState({
        type: 'earn' as 'earn' | 'redeem',
        points: 0,
        reason: ''
    });

    const [branches, setBranches] = useState<any[]>([]);
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || '');
    useEffect(() => {
        // Just triggers re-render if needed or kept for consistency
    }, [globalBranchId]);
    const [branchFilter, setBranchFilter] = useState<string | number>('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
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

    // Initial load for static data
    useEffect(() => {
        const loadStaticData = async () => {
            try {
                const branchData = await api.getBranches();
                setBranches(branchData);

                const saved = localStorage.getItem('naqupos_selected_branch') || '';
                setGlobalBranchId(saved);
                setBranchFilter(saved === 'all' || saved === '' ? '' : Number(saved));
            } catch (error) {
                console.error("Failed to load static data", error);
            }
        };
        loadStaticData();
    }, []);

    // Load Loyalty Data (Transactions, Members, Stats)
    useEffect(() => {
        const loadLoyaltyData = async () => {
            setIsLoading(true);
            try {
                const branchId = (branchFilter === '' || branchFilter === 'all') ? undefined : Number(branchFilter);

                // Fetch stats
                const statsData = await api.getLoyaltyStats({ branch_id: branchId });
                setStats(statsData);

                // Fetch transactions
                const transData = await api.getLoyaltyTransactions({
                    branch_id: branchId,
                    type: filterType === 'all' ? undefined : filterType,
                    customer_id: customerFilter === 'all' ? undefined : customerFilter,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                    search: searchQuery || undefined
                });
                setTransactions(transData);

                // Fetch members
                const memberData = await api.getLoyaltyMembers({
                    branch_id: branchId,
                    tier: tierFilter === 'all' ? undefined : tierFilter,
                    search: searchQuery || undefined
                });
                setCustomers(memberData);

                // Fetch customer list for filter
                const cList = await api.getCustomers({ branch_id: branchId, limit: 100 });
                setCustomerList(Array.isArray(cList) ? cList : (cList.data || []));

            } catch (error) {
                console.error("Failed to load loyalty data", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(loadLoyaltyData, 300); // Debounce
        return () => clearTimeout(timer);
    }, [branchFilter, filterType, customerFilter, startDate, endDate, searchQuery, tierFilter]);

    useEffect(() => {
        const syncBranch = () => {
            const saved = localStorage.getItem('naqupos_selected_branch') || '';
            setGlobalBranchId(saved);
            setBranchFilter(saved === 'all' || saved === '' ? '' : Number(saved));
        };
        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, []);

    const openAdjustModal = (customer: Customer) => {
        setSelectedCustomer(customer);
        setAdjustForm({ type: 'earn', points: 0, reason: '' });
        setShowAdjustModal(true);
    };

    const handleAdjustPoints = async () => {
        if (!selectedCustomer || adjustForm.points <= 0) return;
        setIsProcessing(true);
        try {
            // Need to implement adjust API in backend if required
            // For now, let's pretend we saved it
            await new Promise(r => setTimeout(r, 500));
            // Reload page data
            setSearchQuery(searchQuery + ' '); // Trigger reload
            setSearchQuery(searchQuery);
        } finally {
            setIsProcessing(false);
            setShowAdjustModal(false);
            setSelectedCustomer(null);
        }
    };

    const handleSaveSettings = async () => {
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));
        setIsProcessing(false);
        setShowSettingsModal(false);
    };

    const resetFilters = () => {
        setSearchQuery('');
        setFilterType('all');
        setStartDate('');
        setEndDate('');
        setCustomerFilter('all');
        setTierFilter('all');
        setPage(1);
    };

    const handleNumberChange = (value: string, setter: (val: number) => void) => {
        const cleanValue = value.replace(/^0+(?=\d)/, '');
        setter(cleanValue === '' ? 0 : parseInt(cleanValue));
    };

    const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl  font-bold text-naqupos-dark">Loyalty Program</h1>
                        <p className="text-gray-500 text-sm">Kelola poin loyalitas pelanggan</p>
                    </div>

                    {isSuperAdminOrAdmin && (
                        <div className="bg-white p-1.5 rounded-2xl border border-naqupos-primary/20 shadow-sm">
                            <BranchSelector
                                selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)}
                                onBranchChange={(id) => {
                                    setBranchFilter(id || '');
                                    setPage(1);
                                }}
                                showAllOption={true}
                            />
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setShowSettingsModal(true)}
                    className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm self-start md:self-center"
                >
                    <Settings size={18} />
                    <span>Pengaturan</span>
                </button>
            </div>

            {/* Branch Info Cards */}
            {branchFilter !== '' && branchFilter !== 'all' && branches.find(b => b.id === Number(branchFilter)) && (
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
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-naqupos-primary/10 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-naqupos-cream flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <Phone size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Kontak</p>
                            <p className="font-bold text-naqupos-dark text-sm">{branches.find(b => b.id === Number(branchFilter))?.phone || '-'}</p>
                        </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-naqupos-primary/10 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-naqupos-cream flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Alamat</p>
                            <p className="font-bold text-naqupos-dark text-[11px] truncate" title={branches.find(b => b.id === Number(branchFilter))?.address}>
                                {branches.find(b => b.id === Number(branchFilter))?.address || '-'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg"><TrendingUp size={20} className="text-green-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.totalEarned.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Total Poin Diperoleh</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-lg"><TrendingDown size={20} className="text-red-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{stats.totalRedeemed.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Total Poin Ditukar</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg"><Users size={20} className="text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{stats.activeMembers}</p>
                            <p className="text-sm text-gray-500">Member Aktif</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg"><Star size={20} className="text-purple-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{stats.avgPoints.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Rata-rata Poin</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('transactions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'transactions' ? 'bg-naqupos-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    <ShoppingBag size={16} />
                    Riwayat Transaksi
                </button>
                <button onClick={() => setActiveTab('members')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'members' ? 'bg-naqupos-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    <Award size={16} />
                    Member
                </button>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={activeTab === 'transactions' ? 'Cari nama pelanggan...' : 'Cari member...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                        />
                    </div>
                    {activeTab === 'transactions' && (
                        <>
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-gray-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        const newStart = e.target.value;
                                        setStartDate(newStart);
                                        if (endDate && endDate < newStart) {
                                            setEndDate(newStart);
                                        }
                                    }}
                                    className="px-3 py-2.5 rounded-lg border border-gray-200 outline-none text-sm"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="px-3 py-2.5 rounded-lg border border-gray-200 outline-none text-sm"
                                />
                            </div>
                            <div className="w-[200px]">
                                <SearchableSelect
                                    placeholder="Semua Pelanggan"
                                    value={customerFilter}
                                    onChange={(val) => setCustomerFilter(val)}
                                    options={[
                                        { value: 'all', label: 'Semua Pelanggan' },
                                        ...customerList.map(c => ({ value: c.id, label: c.name }))
                                    ]}
                                />
                            </div>
                            <div className="w-[180px]">
                                <SearchableSelect
                                    value={filterType}
                                    onChange={(val: string | number) => setFilterType(val as LoyaltyFilterType)}
                                    options={[
                                        { value: 'all', label: 'Semua Tipe' },
                                        { value: 'earn', label: 'Perolehan' },
                                        { value: 'redeem', label: 'Penukaran' }
                                    ]}
                                />
                            </div>
                        </>
                    )}
                    {activeTab === 'members' && (
                        <div className="w-[180px]">
                            <SearchableSelect
                                value={tierFilter}
                                onChange={(val: string | number) => setTierFilter(val.toString())}
                                options={[
                                    { value: 'all', label: 'Semua Tier' },
                                    { value: 'bronze', label: 'Bronze' },
                                    { value: 'silver', label: 'Silver' },
                                    { value: 'gold', label: 'Gold' },
                                    { value: 'platinum', label: 'Platinum' }
                                ]}
                            />
                        </div>
                    )}
                    {(searchQuery || filterType !== 'all' || startDate || endDate || customerFilter !== 'all' || tierFilter !== 'all') && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-2 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Transactions Tab */}
            {
                activeTab === 'transactions' && (
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary"></div>
                            </div>
                        )}
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-left text-xs text-gray-500 uppercase">
                                    <th className="px-4 py-3 font-medium">Tanggal</th>
                                    <th className="px-4 py-3 font-medium">Pelanggan</th>
                                    <th className="px-4 py-3 font-medium">Tipe</th>
                                    <th className="px-4 py-3 font-medium">Poin</th>
                                    <th className="px-4 py-3 font-medium">Deskripsi</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {transactions.slice((page - 1) * perPage, page * perPage).map(t => (
                                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-gray-500">{t.date}</td>
                                        <td className="px-4 py-3 font-medium text-naqupos-dark">{t.customerName}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${t.type === 'earn' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {t.type === 'earn' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                {t.type === 'earn' ? 'Perolehan' : 'Penukaran'}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 font-bold ${t.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'earn' ? '+' : '-'}{t.points}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{t.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {transactions.length === 0 && !isLoading && (
                            <div className="text-center py-12 text-gray-500">
                                <Gift size={48} className="mx-auto mb-4 text-gray-300" />
                                <p>Belum ada transaksi poin</p>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Members Tab */}
            {
                activeTab === 'members' && (
                    <div className="relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary"></div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customers.slice((page - 1) * perPage, page * perPage).map(c => (
                                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-medium text-naqupos-dark">{c.name}</h3>
                                            <p className="text-sm text-gray-500">{c.phone}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierConfig[c.tier as keyof typeof tierConfig]?.color || 'bg-gray-100 text-gray-600'}`}>
                                            {tierConfig[c.tier as keyof typeof tierConfig]?.label || c.tier}
                                        </span>
                                    </div>

                                    <div className="bg-gradient-to-r from-naqupos-primary to-naqupos-accent rounded-lg p-4 text-white mb-4">
                                        <p className="text-sm opacity-80">Poin Tersedia</p>
                                        <p className="text-3xl font-bold">{c.availablePoints.toLocaleString()}</p>
                                        <p className="text-xs opacity-70 mt-1">= {formatCurrency(c.availablePoints * settings.redeemRate)}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-gray-500">Total Poin</p>
                                            <p className="font-bold text-naqupos-dark">{c.totalPoints.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-gray-500">Digunakan</p>
                                            <p className="font-bold text-red-600">{c.usedPoints.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                        <span>Total Belanja: {formatCurrency(c.totalSpent)}</span>
                                        <span>Join: {c.joinDate}</span>
                                    </div>

                                    <button onClick={() => openAdjustModal(c)}
                                        className="w-full py-2 border border-naqupos-primary text-naqupos-primary rounded-lg font-medium hover:bg-naqupos-cream transition-colors">
                                        Adjust Poin
                                    </button>
                                </div>
                            ))}
                        </div>
                        {customers.length === 0 && !isLoading && (
                            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
                                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                                <p>Belum ada data member</p>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Pagination Controls */}
            {
                (activeTab === 'transactions' ? transactions.length : customers.length) > 0 && (
                    <div className="mt-4">
                        <Pagination
                            currentPage={page}
                            totalItems={activeTab === 'transactions' ? transactions.length : customers.length}
                            itemsPerPage={perPage}
                            onPageChange={setPage}
                            onItemsPerPageChange={(val) => {
                                setPerPage(val);
                                setPage(1);
                            }}
                        />
                    </div>
                )
            }

            {/* Adjust Points Modal */}
            {
                showAdjustModal && selectedCustomer && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl  font-bold text-naqupos-dark">Adjust Poin</h3>
                                <button onClick={() => setShowAdjustModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="bg-naqupos-cream rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-600">Member:</p>
                                <p className="font-bold text-naqupos-dark">{selectedCustomer.name}</p>
                                <p className="text-sm text-gray-500">Poin saat ini: {selectedCustomer.availablePoints.toLocaleString()}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Adjustment</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setAdjustForm(f => ({ ...f, type: 'earn' }))}
                                            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1 ${adjustForm.type === 'earn' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600'}`}>
                                            <ArrowUpRight size={16} /> Tambah
                                        </button>
                                        <button type="button" onClick={() => setAdjustForm(f => ({ ...f, type: 'redeem' }))}
                                            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1 ${adjustForm.type === 'redeem' ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600'}`}>
                                            <ArrowDownRight size={16} /> Kurangi
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Poin</label>
                                    <input type="number" value={adjustForm.points} onChange={(e) => setAdjustForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))}
                                        min={0} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Alasan</label>
                                    <textarea value={adjustForm.reason} onChange={(e) => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                                        rows={2} placeholder="Alasan adjustment..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none" />
                                </div>
                            </div>

                            {adjustForm.type === 'redeem' && adjustForm.points > selectedCustomer.availablePoints && (
                                <div className="bg-red-50 rounded-lg p-3 flex gap-2 mt-4">
                                    <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                                    <p className="text-sm text-red-600">Jumlah melebihi poin tersedia!</p>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAdjustModal(false)} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                                <button onClick={handleAdjustPoints}
                                    disabled={isProcessing || adjustForm.points <= 0 || (adjustForm.type === 'redeem' && adjustForm.points > selectedCustomer.availablePoints)}
                                    className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || adjustForm.points <= 0 || (adjustForm.type === 'redeem' && adjustForm.points > selectedCustomer.availablePoints) ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                    {isProcessing ? 'Memproses...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl  font-bold text-naqupos-dark">Pengaturan Loyalty</h3>
                                <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="bg-naqupos-cream rounded-lg p-4">
                                    <h4 className="font-medium text-naqupos-dark mb-3 flex items-center gap-2"><TrendingUp size={18} /> Skema Perolehan</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Poin per Rp 10.000</label>
                                            <input
                                                type="number"
                                                value={settings.earnRate === 0 ? '' : settings.earnRate}
                                                onChange={(e) => handleNumberChange(e.target.value, (val) => setSettings(s => ({ ...s, earnRate: val })))}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Kadaluarsa (bulan)</label>
                                            <input
                                                type="number"
                                                value={settings.expiryMonths === 0 ? '' : settings.expiryMonths}
                                                onChange={(e) => handleNumberChange(e.target.value, (val) => setSettings(s => ({ ...s, expiryMonths: val })))}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-purple-50 rounded-lg p-4">
                                    <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2"><Gift size={18} /> Skema Penukaran</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Nilai Rupiah per Poin</label>
                                            <input
                                                type="number"
                                                value={settings.redeemRate === 0 ? '' : settings.redeemRate}
                                                onChange={(e) => handleNumberChange(e.target.value, (val) => setSettings(s => ({ ...s, redeemRate: val })))}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Min. Poin Tukar</label>
                                            <input
                                                type="number"
                                                value={settings.minRedeem === 0 ? '' : settings.minRedeem}
                                                onChange={(e) => handleNumberChange(e.target.value, (val) => setSettings(s => ({ ...s, minRedeem: val })))}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-50 rounded-lg p-4">
                                    <h4 className="font-medium text-amber-800 mb-3 flex items-center gap-2"><Star size={18} /> Bonus Spesial</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Bonus Ulang Tahun</label>
                                            <input
                                                type="number"
                                                value={settings.birthdayBonus === 0 ? '' : settings.birthdayBonus}
                                                onChange={(e) => handleNumberChange(e.target.value, (val) => setSettings(s => ({ ...s, birthdayBonus: val })))}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Bonus Kunjungan Pertama</label>
                                            <input
                                                type="number"
                                                value={settings.firstVisitBonus === 0 ? '' : settings.firstVisitBonus}
                                                onChange={(e) => handleNumberChange(e.target.value, (val) => setSettings(s => ({ ...s, firstVisitBonus: val })))}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowSettingsModal(false)} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                                <button onClick={handleSaveSettings} disabled={isProcessing}
                                    className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                    {isProcessing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
