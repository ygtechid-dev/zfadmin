import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    Calendar,
    BookOpen,
    Users,
    Sparkles,
    UserCog,
    BarChart3,
    Megaphone,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    Building,
    Check,
    Search,
    Package,
    Building2,
    DoorOpen,
    Image,
    Gift,
    Shield,
    FileText,
    Briefcase,
    Heart,
    TrendingUp,
    Crown,
    Wrench,
    Wallet,
    CreditCard,
    ClipboardList,
    Zap,
    Percent,
    Tag
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { mapRole } from '../../utils/role';


interface NavItem {
    path: string;
    label: string;
    icon: LucideIcon;
    permission: string;
}

interface NavCategory {
    id: string;
    label: string;
    icon: LucideIcon;
    permission: string;
    items: NavItem[];
}

const IconMap: Record<string, LucideIcon> = {
    LayoutDashboard,
    ShoppingCart,
    Calendar,
    BookOpen,
    Users,
    Sparkles,
    UserCog,
    BarChart3,
    Megaphone,
    MessageSquare,
    Settings,
    Package,
    Building2,
    DoorOpen,
    Image,
    Gift,
    Shield,
    FileText,
    Briefcase,
    Heart,
    TrendingUp,
    Wrench,
    Wallet,
    CreditCard,
    ClipboardList,
    Zap,
    Percent,
    Tag,
    Crown
};

interface BranchItem {
    id: string;
    name: string;
    address: string;
}

const defaultBranch: BranchItem = {
    id: '',
    name: 'Semua Cabang',
    address: 'Lihat data semua cabang'
};

interface AuthUser {
    name: string;
    email: string;
    role: string;
    branch?: string | { id?: number | string; name?: string };
    branch_id?: number | string | null;
}

// TODO: remove this
export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [branches, setBranches] = useState<BranchItem[]>([defaultBranch]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<BranchItem>(defaultBranch);
    const [dynamicMenus, setDynamicMenus] = useState<NavCategory[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['main', 'operations']);
    const [branchSearchQuery, setBranchSearchQuery] = useState('');
    const [isPro, setIsPro] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Check for super admin / owner roles only (branch admin should NOT see branch switcher)
    const userRole = user?.role?.toLowerCase() || '';
    const isSuperAdmin = ['super admin', 'super_admin', 'owner'].includes(userRole);

    const getUserBranchId = () => {
        if (!user) return '';
        if (user.branch_id !== undefined && user.branch_id !== null) return String(user.branch_id);
        if (typeof user.branch === 'object' && user.branch?.id !== undefined && user.branch.id !== null) return String(user.branch.id);
        return '';
    };

    const getUserBranchName = () => {
        if (!user) return '';
        if (typeof user.branch === 'object') return user.branch?.name || '';
        return user.branch || '';
    };

    const isBranchlessAdmin = userRole === 'admin' && !getUserBranchId() && !getUserBranchName();
    const canShowBranchSelector = isSuperAdmin || isBranchlessAdmin;

    // Load branches and menus from API
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Fetch branches
                const branchData = await api.getBranches();
                const mappedBranches = branchData.map(b => ({
                    id: b.id.toString(),
                    name: b.name,
                    address: b.address
                }));
                setBranches([defaultBranch, ...mappedBranches]);

                // Fetch dynamic menus from BE (already filtered by subscription)
                const response = await api.get('/admin/menus');
                if (response.status === 'success') {
                    const mappedMenus = response.data.map((cat: any) => ({
                        ...cat,
                        icon: IconMap[cat.icon] || LayoutDashboard,
                        items: cat.items.map((item: any) => ({
                            ...item,
                            icon: IconMap[item.icon] || LayoutDashboard
                        }))
                    }));
                    setDynamicMenus(mappedMenus);
                }

                // Fetch subscription status
                try {
                    const subRes = await api.getSubscriptionStatus();
                    if (subRes.status === 'success') {
                        const sub = Array.isArray(subRes.data) ? null : subRes.data;
                        setIsPro(sub?.is_pro === true);
                    }
                } catch { /* non-critical */ }

            } catch (error) {
                console.error('Failed to load initial data for layout', error);
            }
        };
        loadInitialData();
    }, []);

    // Auto-expand category based on current route
    useEffect(() => {
        const currentPath = location.pathname;
        dynamicMenus.forEach(category => {
            const hasActiveItem = category.items.some(item => item.path === currentPath);
            if (hasActiveItem && !expandedCategories.includes(category.id)) {
                setExpandedCategories(prev => [...prev, category.id]);
            }
        });
    }, [location.pathname, dynamicMenus]);

    // Separate effect for auth data to avoid stale closures
    useEffect(() => {
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                setUser(parsed.user);
            } catch (e) {
                console.error("Failed to parse auth data", e);
            }
        }
    }, []);

    // Effect to initialize selected branch once branches are loaded
    useEffect(() => {
        if (!user || branches.length <= 1) return;

        const savedBranchId = localStorage.getItem('naqupos_selected_branch');
        const actualSavedId = savedBranchId === 'all' ? '' : (savedBranchId || '');

        if (isSuperAdmin) {
            const found = branches.find(b => b.id === actualSavedId);
            if (found) {
                if (selectedBranch.id !== found.id) {
                    setSelectedBranch(found);
                }
                return;
            }

            // Default to Semua Cabang if nothing saved or found
            if (selectedBranch.id !== '') {
                setSelectedBranch(defaultBranch);
                localStorage.setItem('naqupos_selected_branch', 'all');
                window.dispatchEvent(new CustomEvent('naqupos-branch-change'));
            }
        } else if (isBranchlessAdmin) {
            const found = actualSavedId ? branches.find(b => b.id === actualSavedId && b.id !== '') : undefined;
            const fallbackBranch = branches.find(b => b.id !== '');
            const nextBranch = found || fallbackBranch;

            if (nextBranch) {
                if (selectedBranch.id !== nextBranch.id) {
                    setSelectedBranch(nextBranch);
                }
                if (actualSavedId !== nextBranch.id) {
                    localStorage.setItem('naqupos_selected_branch', nextBranch.id);
                    window.dispatchEvent(new CustomEvent('naqupos-branch-change', { detail: { branchId: nextBranch.id } }));
                }
            }
        } else {
            // Branch roles must always follow their assigned branch, even if localStorage
            // still contains "all" or a branch from a previous super-admin session.
            const userBranchId = getUserBranchId();
            const userBranchName = getUserBranchName();
            const userBranch = branches.find(b => b.id === userBranchId || b.name === userBranchName);
            if (userBranch) {
                if (selectedBranch.id !== userBranch.id) {
                    setSelectedBranch(userBranch);
                }
                if (actualSavedId !== userBranch.id) {
                    localStorage.setItem('naqupos_selected_branch', userBranch.id);
                    window.dispatchEvent(new CustomEvent('naqupos-branch-change', { detail: { branchId: userBranch.id } }));
                }
            }
        }
    }, [branches, user, isSuperAdmin, isBranchlessAdmin, selectedBranch.id]);

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const handleBranchChange = (branch: BranchItem) => {
        setSelectedBranch(branch);
        setShowBranchDropdown(false);
        setBranchSearchQuery('');
        localStorage.setItem('naqupos_selected_branch', branch.id);
        window.dispatchEvent(new CustomEvent('naqupos-branch-change', { detail: { branchId: branch.id } }));

        // Log branch change (never let logging break the branch switch)
        try {
            const parsedLogs = JSON.parse(localStorage.getItem('naqupos_activity_logs') || '[]');
            const logs = Array.isArray(parsedLogs) ? parsedLogs : [];
            logs.unshift({
                id: Date.now(),
                action: 'Ganti Cabang',
                user: user?.name || 'Unknown',
                email: user?.email || '',
                details: `Beralih ke ${branch.name}`,
                ip: '192.168.1.100',
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('naqupos_activity_logs', JSON.stringify(logs.slice(0, 100)));
        } catch (logErr) {
            console.error('Failed to write activity log', logErr);
        }
    };

    const handleLogout = () => {
        // Clear auth FIRST: a corrupted activity log must never block logout
        localStorage.removeItem('naqupos_admin_auth');
        localStorage.removeItem('naqupos_selected_branch');

        try {
            const parsedLogs = JSON.parse(localStorage.getItem('naqupos_activity_logs') || '[]');
            const logs = Array.isArray(parsedLogs) ? parsedLogs : [];
            logs.unshift({
                id: Date.now(),
                action: 'Logout',
                user: user?.name || 'Unknown',
                email: user?.email || '',
                details: 'Berhasil logout dari sistem',
                ip: '192.168.1.100',
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('naqupos_activity_logs', JSON.stringify(logs.slice(0, 100)));
        } catch (logErr) {
            console.error('Failed to write activity log', logErr);
        }

        navigate('/login');
    };

    // Get available branches based on user role
    const getAvailableBranches = () => {
        if (isSuperAdmin) {
            return branches; // All branches including "Semua Cabang"
        } else if (isBranchlessAdmin) {
            return branches.filter(b => b.id !== '');
        } else {
            // Other roles see their assigned branch
            const userBranchId = getUserBranchId();
            const userBranchName = getUserBranchName();
            return branches.filter(b => b.id === userBranchId || b.name === userBranchName);
        }
    };

    // Filter categories and items based on user permissions
    const SUPER_ADMIN_ONLY_SEGMENTS = ['users', 'audit-log'];

    const getVisibleCategories = () => {
        if (isSuperAdmin) return dynamicMenus;
        // Non-super-admin: hide User Management and Activity History
        return dynamicMenus.map(category => ({
            ...category,
            items: category.items.filter(item => {
                const seg = item.path.replace(/^\//, '');
                return !SUPER_ADMIN_ONLY_SEGMENTS.some(s => seg === s || seg.startsWith(s + '/'));
            })
        })).filter(category => category.items.length > 0);
    };

    useEffect(() => {
        if (!user || dynamicMenus.length === 0) return;

        const visibleItems = getVisibleCategories().flatMap(category => category.items);
        if (visibleItems.length === 0) return;

        const currentPath = location.pathname;
        const isAllowedPath = visibleItems.some(item =>
            currentPath === item.path || currentPath.startsWith(`${item.path}/`)
        );

        if (!isAllowedPath) {
            navigate(visibleItems[0].path, { replace: true });
        }
    }, [dynamicMenus, user, location.pathname, isSuperAdmin]);

    return (
        <div className="min-h-screen bg-naqupos-cream flex">
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-naqupos-dark text-white flex flex-col transition-all duration-300 fixed h-full z-50`}
            >
                {/* Logo */}
                <div className="p-4 flex items-center gap-3 border-b border-white/10">
                    <img
                        src="/logo-naqupos.jpeg"
                        alt="Naqupos"
                        className="w-10 h-10 rounded-xl object-contain bg-white shadow-sm"
                    />
                    {sidebarOpen && (
                        <div>
                            <h1 className="font-bold text-lg text-naqupos-secondary">Naqupos</h1>
                            <p className="text-[10px] text-white/60 uppercase tracking-widest">Admin Panel</p>
                        </div>
                    )}
                </div>

                {/* Navigation with Collapsible Categories */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    <div className="space-y-1 px-2">
                        {getVisibleCategories().map((category) => {
                            const isExpanded = expandedCategories.includes(category.id);
                            const hasActiveItem = category.items.some(item => location.pathname === item.path);

                            return (
                                <div key={category.id}>
                                    {/* Category Header */}
                                    <button
                                        onClick={() => sidebarOpen && toggleCategory(category.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${hasActiveItem
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                                            }`}
                                    >
                                        <category.icon size={20} />
                                        {sidebarOpen && (
                                            <>
                                                <span className="flex-1 text-left text-sm font-medium">{category.label}</span>
                                                <ChevronRight
                                                    size={16}
                                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                                />
                                            </>
                                        )}
                                    </button>

                                    {/* Category Items */}
                                    {sidebarOpen && (
                                        <div
                                            className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                                }`}
                                        >
                                            <ul className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                                                {category.items.map((item) => (
                                                    <li key={item.path}>
                                                        <NavLink
                                                            to={item.path}
                                                            className={({ isActive }) =>
                                                                `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                                                                    ? 'bg-naqupos-primary text-white shadow-lg shadow-naqupos-primary/30'
                                                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                                                }`
                                                            }
                                                        >
                                                            <item.icon size={16} />
                                                            <span>{item.label}</span>
                                                        </NavLink>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Collapsed Mode - Show only icons */}
                                    {!sidebarOpen && (
                                        <div className="mt-1 space-y-0.5">
                                            {category.items.map((item) => (
                                                <NavLink
                                                    key={item.path}
                                                    to={item.path}
                                                    className={({ isActive }) =>
                                                        `flex items-center justify-center p-2 rounded-lg transition-all ${isActive
                                                            ? 'bg-naqupos-primary text-white'
                                                            : 'text-white/50 hover:bg-white/10 hover:text-white'
                                                        }`
                                                    }
                                                    title={item.label}
                                                >
                                                    <item.icon size={18} />
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </nav>

                {/* Upgrade Banner for free users */}
                {sidebarOpen && !isSuperAdmin && !isPro && (
                    <div className="mx-3 mb-3 p-4 rounded-xl bg-gradient-to-br from-naqupos-primary/90 to-indigo-700 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Crown size={18} className="text-yellow-300" />
                            <span className="font-bold text-sm">Upgrade ke Pro</span>
                        </div>
                        <p className="text-xs text-white/80 mb-3 leading-relaxed">Akses semua fitur premium untuk bisnis Anda</p>
                        <NavLink to="/subscriptions"
                            className="block w-full text-center py-2 bg-white text-naqupos-primary font-bold text-xs rounded-lg hover:bg-white/90 transition-colors">
                            Lihat Paket Pro
                        </NavLink>
                    </div>
                )}

                {/* Pro badge in collapsed mode */}
                {!sidebarOpen && !isSuperAdmin && isPro && (
                    <div className="flex justify-center mb-2">
                        <Crown size={18} className="text-yellow-400" />
                    </div>
                )}

                {/* Footer - Logout Button */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex items-center gap-3 text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full px-3 py-2 rounded-lg"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="text-sm">Keluar</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
                {/* Top Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        {/* Branch Selector */}
                        {/* Branch Selector - Only for Super Admins */}
                        {canShowBranchSelector && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                                    className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 hover:border-naqupos-primary hover:bg-naqupos-cream/50 cursor-pointer transition-colors"
                                >
                                    <div className="p-1.5 bg-naqupos-cream rounded-lg">
                                        <Building size={16} className="text-naqupos-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-naqupos-dark text-sm">{selectedBranch.name}</p>
                                        <p className="text-xs text-gray-500 max-w-[200px] truncate">{selectedBranch.address}</p>
                                    </div>
                                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Branch Dropdown */}
                                {showBranchDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-[90]" onClick={() => { setShowBranchDropdown(false); setBranchSearchQuery(''); }} />
                                        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl border border-gray-100 shadow-xl z-[100] overflow-hidden">
                                            <div className="p-3 border-b border-gray-100 bg-gray-50">
                                                <p className="text-xs font-medium text-gray-500 uppercase">Pilih Cabang</p>
                                            </div>
                                            {/* Search Input */}
                                            <div className="p-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                    <input
                                                        type="text"
                                                        className="w-full pl-10 pr-9 py-2.5 bg-gray-50 rounded-xl text-sm outline-none border border-transparent focus:bg-white focus:border-naqupos-primary/30 focus:ring-4 focus:ring-naqupos-primary/5 transition-all placeholder:text-gray-400"
                                                        placeholder="Cari Nama atau Alamat Cabang..."
                                                        value={branchSearchQuery}
                                                        onChange={(e) => setBranchSearchQuery(e.target.value)}
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    {branchSearchQuery && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setBranchSearchQuery(''); }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
                                                {getAvailableBranches().filter(branch =>
                                                    branch.name.toLowerCase().includes(branchSearchQuery.toLowerCase()) ||
                                                    branch.address.toLowerCase().includes(branchSearchQuery.toLowerCase())
                                                ).map((branch) => (
                                                    <button
                                                        key={branch.id}
                                                        onClick={() => handleBranchChange(branch)}
                                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group ${selectedBranch.id === branch.id
                                                            ? 'bg-naqupos-primary/10 border-naqupos-primary/10'
                                                            : 'hover:bg-gray-50 border-transparent'
                                                            } border`}
                                                    >
                                                        <div className={`p-2 rounded-xl transition-colors ${branch.id === ''
                                                            ? (selectedBranch.id === branch.id ? 'bg-purple-200' : 'bg-purple-50')
                                                            : (selectedBranch.id === branch.id ? 'bg-white' : 'bg-naqupos-cream')
                                                            }`}>
                                                            <Building size={16} className={`${branch.id === '' ? 'text-purple-600' : 'text-naqupos-primary'
                                                                }`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`font-semibold text-sm truncate ${selectedBranch.id === branch.id ? 'text-naqupos-primary' : 'text-naqupos-dark'}`}>{branch.name}</p>
                                                            <p className="text-xs text-gray-400 truncate mt-0.5">{branch.address}</p>
                                                        </div>
                                                        {selectedBranch.id === branch.id && (
                                                            <div className="w-6 h-6 rounded-full bg-naqupos-primary flex items-center justify-center">
                                                                <Check size={14} className="text-white" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                                {getAvailableBranches().filter(branch =>
                                                    branch.name.toLowerCase().includes(branchSearchQuery.toLowerCase()) ||
                                                    branch.address.toLowerCase().includes(branchSearchQuery.toLowerCase())
                                                ).length === 0 && (
                                                        <div className="p-10 text-center">
                                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                <Search size={24} className="text-gray-300" />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-400">Cabang "{branchSearchQuery}" tidak ditemukan</p>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-naqupos-dark">{user?.name || 'Admin Staff'}</p>
                            <p className="text-xs text-gray-500">{user?.role ? mapRole(user.role) : '-'}</p>

                        </div>
                        <div className="w-10 h-10 rounded-full bg-naqupos-primary flex items-center justify-center text-white font-bold">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <LogOut size={28} className="text-red-600" />
                            </div>
                            <h3 className="text-xl  font-bold text-naqupos-dark mb-2">Konfirmasi Logout</h3>
                            <p className="text-gray-500 mb-6">Apakah Anda yakin ingin keluar dari sistem?</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                            >
                                Ya, Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
