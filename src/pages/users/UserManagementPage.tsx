import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    Plus, Edit, Trash2, X, AlertTriangle, Search,
    User, Shield, Key, Eye, EyeOff, Mail, Phone, CheckCircle, XCircle,
    Building, Check
} from 'lucide-react';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import EmptyState from '../../components/common/EmptyState';
import { mapRole, isElevatedRole } from '../../utils/role';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import Pagination from '../../components/common/Pagination';



interface SystemUser {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    branchId: number | null;
    branchName: string | null;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    avatar?: string;
    subscriptionPlan?: 'Free' | 'Pro';
    staffId: number | null;
    therapist?: {
        id: number;
        name: string;
    } | null;
}

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    userCount: number;
    isGlobal: boolean;
}

const allPermissions = [
    { id: 'dashboard', label: 'Dashboard', module: 'Menu Utama' },
    { id: 'pos', label: 'Kasir (POS)', module: 'Menu Utama' },

    { id: 'calendar', label: 'Kalender', module: 'Operasional' },
    { id: 'bookings', label: 'Reservasi', module: 'Operasional' },
    { id: 'services', label: 'Layanan', module: 'Operasional' },
    { id: 'staff', label: 'Staff & Jadwal', module: 'Operasional' },

    { id: 'inventory', label: 'Produk & Inventori', module: 'Inventori' },
    { id: 'customers', label: 'Pelanggan & CRM', module: 'Pelanggan' },
    { id: 'marketing', label: 'Marketing & Promo', module: 'Marketing' },
    { id: 'reports', label: 'Laporan & Penjualan', module: 'Laporan & Analitik' },
    { id: 'payment', label: 'Metode Pembayaran', module: 'Pembayaran' },
    { id: 'subscription', label: 'Subscription', module: 'Berlangganan' },

    { id: 'settings', label: 'Pengaturan & Master Data', module: 'Sistem' },
    { id: 'users', label: 'Manajemen Pengguna', module: 'Sistem' },
    { id: 'audit', label: 'Audit Log', module: 'Sistem' },
];

const roleTemplates = [
    {
        name: 'admin',
        label: 'Admin Cabang',
        description: 'Admin cabang: akses laporan keuangan, kalender reservasi, aplikasi kasir, dan tambah layanan.',
        permissions: ['reports', 'calendar', 'pos', 'services'],
        isGlobal: false
    },
    {
        name: 'manajer',
        label: 'Manajer',
        description: 'Manajer cabang: akses operasional lengkap cabang, laporan, staff, pelanggan, layanan, dan kasir.',
        permissions: ['dashboard', 'reports', 'calendar', 'bookings', 'pos', 'services', 'staff', 'customers'],
        isGlobal: false
    },
    {
        name: 'spv',
        label: 'SPV',
        description: 'SPV cabang: pantau kalender, reservasi, kasir, pelanggan, dan laporan operasional.',
        permissions: ['dashboard', 'calendar', 'bookings', 'pos', 'customers', 'reports'],
        isGlobal: false
    },
    {
        name: 'cashier',
        label: 'Kasir',
        description: 'Kasir: akses aplikasi kasir, kalender, reservasi, dan pelanggan.',
        permissions: ['dashboard', 'pos', 'calendar', 'bookings', 'customers'],
        isGlobal: false
    },
    {
        name: 'super_admin',
        label: 'Super Admin',
        description: 'Akses penuh semua cabang dan semua fitur.',
        permissions: allPermissions.map(p => p.id),
        isGlobal: true
    },
];

import { useBranchSync } from '../../hooks/useBranchSync';

export default function UserManagementPage() {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [perPage, setPerPage] = useState(15);

    // Sync with global branch
    const {
        selectedBranchId: filterBranch,
        setSelectedBranchId: setFilterBranch
    } = useBranchSync<number | 'all'>(undefined, 'all');

    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState('');


    useEffect(() => {
        loadRolesAndBranches();
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                const role = parsed.user.role?.toLowerCase() || '';
                setCurrentUserRole(role);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
        }
    }, [currentPage, perPage, searchQuery, filterBranch, activeTab]);

    const isSuperAdmin = isElevatedRole(currentUserRole);

    const loadRolesAndBranches = async () => {
        try {
            const [rolesRes, branchesRes] = await Promise.all([
                api.getRoles().catch(() => []),
                api.getBranches().catch(() => [])
            ]);

            const rawRoles = Array.isArray(rolesRes) ? rolesRes : ((rolesRes as any).data || []);
            const rawBranches = Array.isArray(branchesRes) ? branchesRes : ((branchesRes as any).data || []);

            setRoles(rawRoles.map((r: any) => ({
                id: r.id?.toString() || r.name?.toLowerCase().replace(/\s/g, '_'),
                name: r.name,
                description: r.description || '',
                permissions: r.permissions || [],
                userCount: r.user_count || 0,
                isGlobal: r.is_global || false
            })));

            setBranches(rawBranches);
        } catch (err) {
            console.error('Error loading roles/branches:', err);
        }
    };

    const loadUsers = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                per_page: perPage,
                search: searchQuery,
                branch_id: filterBranch === 'all' ? undefined : filterBranch
            };

            const res = await api.getUsers(params);
            const rawUsers = res.data || [];

            setUsers(rawUsers.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone || '',
                role: u.role,
                branchId: u.branch_id,
                branchName: u.branch?.name || null,
                isActive: u.is_active || u.status === 'active',
                lastLogin: u.last_login_at,
                createdAt: u.created_at?.split('T')[0],
                subscriptionPlan: u.subscription_plan || (u.role === 'admin' ? 'Pro' : 'Free'),
                staffId: u.staff_id,
                therapist: u.therapist
            })));

            setTotalItems(res.total || 0);
            setLoadError('');
        } catch (err: any) {
            console.error('Error loading users:', err);
            setUsers([]);
            setTotalItems(0);
            const msg = err?.message || 'Gagal memuat data user';
            setLoadError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Keep loadAllData for backward compatibility or direct calls
    const loadAllData = () => {
        loadRolesAndBranches();
        loadUsers();
    };


    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'Kasir',
        branchId: null as number | null,
        subscriptionPlan: 'Free',
        password: '',
        staffId: null as number | null
    });

    const [roleForm, setRoleForm] = useState({
        name: '',
        description: '',
        permissions: [] as string[],
        isGlobal: false
    });

    const filteredUsers = users;

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleConfig = (roleName: string) => {
        const normalized = roleName.toLowerCase();
        return roles.find(r => r.name.toLowerCase() === normalized)
            || roleTemplates.find(r => r.name.toLowerCase() === normalized)
            || null;
    };

    const isGlobalRole = (roleName: string) => {
        const normalized = roleName.toLowerCase();
        if (['super_admin', 'super admin', 'owner'].includes(normalized)) return true;
        return !!getRoleConfig(roleName)?.isGlobal;
    };

    const applyRoleTemplate = (template: typeof roleTemplates[number]) => {
        setRoleForm({
            name: template.name,
            description: template.description,
            permissions: [...template.permissions],
            isGlobal: template.isGlobal
        });
    };

    // User handlers
    const openAddUser = () => {
        setUserForm({ name: '', email: '', phone: '', role: 'admin', branchId: null, subscriptionPlan: 'Free', password: '', staffId: null });
        setIsEditing(false);
        setShowUserModal(true);
    };

    const openEditUser = (user: SystemUser) => {
        setSelectedUser(user);
        setUserForm({
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            branchId: user.branchId,
            subscriptionPlan: user.subscriptionPlan || 'Free',
            password: '',
            staffId: user.staffId
        });
        setIsEditing(true);
        setShowUserModal(true);
    };

    const openDeleteUser = (user: SystemUser) => {
        setSelectedUser(user);
        setSelectedRole(null);
        setShowDeleteModal(true);
    };

    const handleSaveUser = async () => {
        const name = (userForm.name || '').trim();
        const email = (userForm.email || '').trim();
        const phone = (userForm.phone || '').trim();

        if (!name) {
            toast.error("Nama wajib diisi");
            return;
        }
        if (name.length < 2) {
            toast.error("Nama minimal 2 karakter");
            return;
        }
        if (!email) {
            toast.error("Email wajib diisi");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("Format email tidak valid");
            return;
        }
        if (phone && !/^(\+?628|628|08|021)[0-9\s-]{7,15}$/.test(phone.replace(/[\s-]/g, ''))) {
            toast.error("Format nomor telepon tidak valid. Gunakan format 08, +628, atau 021");
            return;
        }
        if (userForm.password && userForm.password.length < 8) {
            toast.error("Password minimal 8 karakter");
            return;
        }
        if (!isEditing && userForm.password.length < 8) {
            toast.error("Password wajib diisi minimal 8 karakter untuk user baru");
            return;
        }
        setIsProcessing(true);

        try {
            const roleIsGlobal = isGlobalRole(userForm.role);
            const finalBranchId = roleIsGlobal ? null : userForm.branchId;

            if (!roleIsGlobal && !finalBranchId) {
                toast.error("Cabang wajib dipilih untuk role cabang");
                setIsProcessing(false);
                return;
            }

            // Payload
            const payload = {
                name,
                email,
                phone,
                role: userForm.role,
                branch_id: finalBranchId,
                // Only send password if it's new or being updated
                ...(userForm.password ? { password: userForm.password } : {}),
                subscription_plan: userForm.subscriptionPlan,
                staff_id: userForm.staffId
            };

            if (isEditing && selectedUser) {
                const response = await api.updateUser(selectedUser.id, payload);
                if (response) {
                    toast.success("User berhasil diperbarui");
                    loadAllData();
                }
            } else {
                const response = await api.createUser(payload);
                if (response) {
                    toast.success("User berhasil ditambahkan");
                    loadAllData();
                }
            }
            setShowUserModal(false);
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.message || "Gagal menyimpan user";
            if (errorMsg.includes('role')) {
                toast.error(`Role tidak valid. Pastikan memilih role yang tersedia.`);
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setIsProcessing(true);
        try {
            await api.deleteUser(selectedUser.id);
            toast.success("User berhasil dihapus");
            loadAllData();
            setShowDeleteModal(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Gagal menghapus user");
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleUserStatus = async (id: number) => {
        const user = users.find(u => u.id === id);
        if (!user) return;

        const newStatus = !user.isActive;
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: newStatus } : u));

        try {
            await api.updateUser(id, { is_active: newStatus });
            toast.success(`User ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
        } catch (error) {
            console.error(error);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !newStatus } : u)); // Revert
            toast.error("Gagal mengubah status user");
        }
    };

    // Role handlers
    const openAddRole = () => {
        const adminTemplate = roleTemplates[0];
        setRoleForm({
            name: adminTemplate.name,
            description: adminTemplate.description,
            permissions: [...adminTemplate.permissions],
            isGlobal: adminTemplate.isGlobal
        });
        setIsEditing(false);
        setShowRoleModal(true);
    };

    const openEditRole = (role: Role) => {
        setSelectedRole(role);
        setRoleForm({
            name: role.name,
            description: role.description,
            permissions: [...role.permissions],
            isGlobal: role.isGlobal
        });
        setIsEditing(true);
        setShowRoleModal(true);
    };

    const openDeleteRole = (role: Role) => {
        setSelectedRole(role);
        setSelectedUser(null);
        setShowDeleteModal(true);
    };

    const handleSaveRole = async () => {
        const roleName = (roleForm.name || '').trim();
        if (!roleName) {
            toast.error('Nama role wajib diisi');
            return;
        }
        if (roleName.length < 3) {
            toast.error('Nama role minimal 3 karakter');
            return;
        }
        if (!roleForm.permissions || roleForm.permissions.length === 0) {
            toast.error('Pilih minimal satu izin untuk role ini');
            return;
        }
        const duplicate = roles.some(r => r.name.toLowerCase() === roleName.toLowerCase() && r.id !== (isEditing ? selectedRole?.id : undefined));
        if (duplicate) {
            toast.error('Nama role sudah digunakan');
            return;
        }
        setIsProcessing(true);

        try {
            const payload = {
                name: roleName,
                description: roleForm.description,
                permissions: roleForm.permissions,
                is_global: roleForm.isGlobal
            };

            if (isEditing && selectedRole) {
                const roleId = Number(selectedRole.id);
                if (!Number.isInteger(roleId)) {
                    toast.error('ID role tidak valid, tidak dapat memperbarui role ini');
                    setIsProcessing(false);
                    return;
                }
                await api.updateRole(roleId, payload);
                toast.success("Role berhasil diperbarui");
            } else {
                await api.createRole(payload);
                toast.success("Role berhasil dibuat");
            }
            loadAllData();
            setShowRoleModal(false);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Gagal menyimpan role");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteRole = async () => {
        if (!selectedRole) return;
        setIsProcessing(true);
        try {
            const roleId = Number(selectedRole.id);
            if (!Number.isInteger(roleId)) {
                toast.error('ID role tidak valid, tidak dapat menghapus role ini');
                setIsProcessing(false);
                setShowDeleteModal(false);
                return;
            }
            await api.deleteRole(roleId);
            toast.success("Role berhasil dihapus");
            loadAllData();
            setShowDeleteModal(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Gagal menghapus role");
        } finally {
            setIsProcessing(false);
        }
    };

    const togglePermission = (permId: string) => {
        setRoleForm(f => ({
            ...f,
            permissions: f.permissions.includes(permId)
                ? f.permissions.filter(p => p !== permId)
                : [...f.permissions, permId]
        }));
    };

    const closeModals = () => {
        setShowUserModal(false);
        setShowRoleModal(false);
        setShowDeleteModal(false);
        setSelectedUser(null);
        setSelectedRole(null);
    };

    const formatDateTime = (timestamp?: string) => {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const activeUsers = users.filter(u => u.isActive).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">User Management</h1>
                    <p className="text-gray-500 text-sm">Kelola pengguna dan hak akses sistem</p>
                </div>
                <button
                    onClick={activeTab === 'users' ? openAddUser : openAddRole}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                >
                    <Plus size={18} />
                    <span>{activeTab === 'users' ? 'Tambah User' : 'Tambah Role'}</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg"><User size={20} className="text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-naqupos-dark">{users.length}</p>
                            <p className="text-sm text-gray-500">Total User</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
                            <p className="text-sm text-gray-500">User Aktif</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg"><Shield size={20} className="text-purple-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{roles.length}</p>
                            <p className="text-sm text-gray-500">Total Role</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg"><Key size={20} className="text-amber-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{allPermissions.length}</p>
                            <p className="text-sm text-gray-500">Permissions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-naqupos-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    <User size={16} />
                    Users
                </button>
                <button onClick={() => setActiveTab('roles')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'roles' ? 'bg-naqupos-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    <Shield size={16} />
                    Roles & Permissions
                </button>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 relative z-10">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={activeTab === 'users' ? 'Cari user...' : 'Cari role...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                        />
                    </div>
                    {/* Branch Filter - Only for Super Admins */}
                    {activeTab === 'users' && isSuperAdmin && (
                        <div className="bg-naqupos-primary/5 p-1 rounded-2xl border border-naqupos-primary/10 shadow-sm animate-fadeIn">
                            <BranchSelector
                                selectedBranchId={filterBranch === 'all' ? null : filterBranch}
                                onBranchChange={(id: number | null) => setFilterBranch(id || 'all')}
                                showAllOption={true}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-left text-xs text-gray-500 uppercase">
                                <th className="px-4 py-3 font-medium">User</th>
                                <th className="px-4 py-3 font-medium">Kontak</th>
                                <th className="px-4 py-3 font-medium">Role</th>
                                <th className="px-4 py-3 font-medium">Paket</th>
                                <th className="px-4 py-3 font-medium">Cabang</th>
                                <th className="px-4 py-3 font-medium">Login Terakhir</th>
                                <th className="px-4 py-3 font-medium text-center">Status</th>
                                <th className="px-4 py-3 font-medium">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${!user.isActive ? 'opacity-60' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-naqupos-primary to-naqupos-accent flex items-center justify-center text-white font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-naqupos-dark">{user.name}</p>
                                                <p className="text-xs text-gray-500">Bergabung: {user.createdAt}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-gray-600"><Mail size={12} /> {user.email}</div>
                                            <div className="flex items-center gap-1 text-gray-600"><Phone size={12} /> {user.phone}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isElevatedRole(user.role) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {mapRole(user.role)}
                                        </span>

                                    </td>
                                    <td className="px-4 py-3">
                                        {user.role === 'admin' ? (
                                            <span className="text-xs text-gray-400">-</span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.subscriptionPlan === 'Pro' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {user.subscriptionPlan || 'Free'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{user.branchName || 'Semua Cabang'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(user.lastLogin)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => toggleUserStatus(user.id)}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                            {user.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            {user.isActive ? 'Aktif' : 'Nonaktif'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEditUser(user)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-gray-500" /></button>
                                            <button onClick={() => openDeleteUser(user)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={perPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(newVal) => {
                            setPerPage(newVal);
                            setCurrentPage(1);
                        }}
                    />
                    {filteredUsers.length === 0 && (
                        <div className="p-8">
                            <EmptyState
                                title={loadError ? 'Gagal memuat user' : (loading ? 'Memuat...' : 'Belum ada user')}
                                message={loadError || 'Tidak ditemukan data user untuk kriteria ini.'}
                                icon={User}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Roles Tab */}
            {activeTab === 'roles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRoles.map(role => (
                        <div key={role.id} className="bg-white rounded-xl border border-gray-100 p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg"><Shield size={20} className="text-purple-600" /></div>
                                    <div>
                                        <h3 className="font-medium text-naqupos-dark">{role.name}</h3>
                                        <p className="text-xs text-gray-500">{role.userCount} user</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEditRole(role)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit size={14} className="text-gray-500" /></button>
                                    <button onClick={() => openDeleteRole(role)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-gray-500 hover:text-red-500" /></button>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-3">{role.description}</p>

                            <div className="flex items-center gap-2 mb-3">
                                <Building size={14} className={role.isGlobal ? "text-green-500" : "text-amber-500"} />
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${role.isGlobal ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                    {role.isGlobal ? "Akses Semua Cabang" : "Hanya Cabang Tertentu"}
                                </span>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-2">Permissions ({role.permissions.length})</p>
                                <div className="flex flex-wrap gap-1">
                                    {role.permissions.slice(0, 5).map(p => (
                                        <span key={p} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded">{p}</span>
                                    ))}
                                    {role.permissions.length > 5 && (
                                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">+{role.permissions.length - 5}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredRoles.length === 0 && (
                        <div className="col-span-full">
                            <EmptyState
                                title="Belum ada role"
                                message="Tidak ditemukan data role untuk kriteria ini."
                                icon={Shield}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit User' : 'Tambah User Baru'}
                            </h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-naqupos-dark mb-2 flex items-center gap-2">
                                    <User size={16} className="text-naqupos-primary" />
                                    Nama Lengkap *
                                </label>
                                <input
                                    type="text"
                                    value={userForm.name}
                                    onChange={(e) => setUserForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Masukkan nama lengkap"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-naqupos-primary/20"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-naqupos-dark mb-2 flex items-center gap-2">
                                        <Mail size={16} className="text-naqupos-primary" />
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        maxLength={100}
                                        value={userForm.email}
                                        onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))}
                                        placeholder="email@contoh.com"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-naqupos-primary/20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-naqupos-dark mb-2 flex items-center gap-2">
                                        <Phone size={16} className="text-naqupos-primary" />
                                        Nomor Telepon
                                    </label>
                                    <input
                                        type="tel"
                                        maxLength={20}
                                        inputMode="tel"
                                        value={userForm.phone}
                                        onChange={(e) => setUserForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="0812..."
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-naqupos-primary/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                <SearchableSelect
                                    value={userForm.role}
                                    onChange={(val: string | number) => {
                                        const roleName = val.toString();
                                        setUserForm(f => ({
                                            ...f,
                                            role: roleName,
                                            branchId: isGlobalRole(roleName) ? null : f.branchId
                                        }));
                                    }}
                                    options={roles.length > 0 ? (
                                        roles.map(r => ({
                                            value: r.name,
                                            label: `${r.name} ${r.isGlobal ? '(Akses Semua Cabang)' : '(Per Cabang)'}`
                                        }))
                                    ) : [
                                        { value: 'super_admin', label: 'Super Admin (Akses Penuh)' },
                                        { value: 'manajer', label: 'Manajer (Per Cabang)' },
                                        { value: 'admin', label: 'Admin Cabang (Per Cabang)' },
                                        { value: 'spv', label: 'SPV (Per Cabang)' },
                                        { value: 'cashier', label: 'Kasir (POS & Reservasi)' }
                                    ]}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    *Pilih level akses pengguna dalam sistem
                                </p>
                            </div>

                            {/* Hide Packet for Admins */}
                            {!userForm.role.toLowerCase().includes('admin') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Paket Langganan</label>
                                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-sm">
                                        {userForm.role.toLowerCase().includes('branch')
                                            ? 'Mengikuti Paket Cabang'
                                            : 'Tidak Memerlukan Paket'}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang</label>
                                <SearchableSelect
                                    value={userForm.branchId || ''}
                                    onChange={(val: string | number) => setUserForm(f => ({ ...f, branchId: val ? Number(val) : null }))}
                                    options={[
                                        {
                                            value: '',
                                            label: isGlobalRole(userForm.role) ? 'Semua Cabang (Global)' : 'Pilih Cabang'
                                        },
                                        ...branches.map(b => ({ value: b.id, label: b.name }))
                                    ]}
                                    disabled={isGlobalRole(userForm.role)}
                                />
                                {isGlobalRole(userForm.role) ? (
                                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                        <Shield size={12} /> Role ini memiliki akses otomatis ke semua cabang
                                    </p>
                                ) : (
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                        <Building size={12} /> Role ini wajib memilih satu cabang, termasuk Admin Cabang
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {isEditing ? 'Password (kosongkan jika tidak diubah)' : 'Password *'}
                                </label>
                                <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} value={userForm.password}
                                            onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))}
                                            minLength={8}
                                            placeholder="Minimal 8 karakter" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none pr-10" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveUser} disabled={isProcessing}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah User')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Role Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Role' : 'Tambah Role Baru'}
                            </h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Template Role</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {roleTemplates.map(template => (
                                        <button
                                            key={template.name}
                                            type="button"
                                            onClick={() => applyRoleTemplate(template)}
                                            className={`text-left p-3 rounded-xl border transition-all ${roleForm.name === template.name
                                                ? 'border-naqupos-primary bg-naqupos-primary/10 text-naqupos-dark'
                                                : 'border-gray-100 bg-gray-50 hover:border-naqupos-primary/30'
                                                }`}
                                        >
                                            <p className="text-sm font-bold">{template.label}</p>
                                            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{template.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Role *</label>
                                <input type="text" value={roleForm.name} onChange={(e) => setRoleForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Nama Role" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                <textarea value={roleForm.description} onChange={(e) => setRoleForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2} placeholder="Deskripsi role..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none" />
                            </div>
                            <div className="bg-naqupos-primary/5 p-4 rounded-xl border border-naqupos-primary/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-naqupos-primary/20">
                                            <Building size={20} className="text-naqupos-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-naqupos-dark">Cakupan Akses Cabang</p>
                                            <p className="text-xs text-gray-500">Tentukan apakah role ini bisa akses semua data cabang.</p>
                                        </div>
                                    </div>
                                    <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-naqupos-primary focus:ring-offset-2 bg-gray-200"
                                        style={{ backgroundColor: roleForm.isGlobal ? '#9b7e51' : '#e5e7eb' }}
                                        onClick={() => setRoleForm(f => ({ ...f, isGlobal: !f.isGlobal }))}>
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${roleForm.isGlobal ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${roleForm.isGlobal ? 'bg-naqupos-primary text-white' : 'bg-gray-100 text-gray-400'}`}>SEMUA CABANG</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${!roleForm.isGlobal ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-400'}`}>CABANG TERTENTU</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {Object.entries(
                                        allPermissions.reduce((acc, p) => {
                                            if (!acc[p.module]) acc[p.module] = [];
                                            acc[p.module].push(p);
                                            return acc;
                                        }, {} as Record<string, typeof allPermissions>)
                                    ).map(([module, perms]) => (
                                        <div key={module} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <h4 className="text-sm font-bold text-naqupos-dark mb-3 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-naqupos-primary"></div>
                                                {module}
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {perms.map(p => (
                                                    <label key={p.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:border-naqupos-primary/30 cursor-pointer transition-all group">
                                                        <div className="relative flex items-center justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={roleForm.permissions.includes(p.id)}
                                                                onChange={() => togglePermission(p.id)}
                                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:bg-naqupos-primary checked:border-naqupos-primary transition-all"
                                                            />
                                                            <Check className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" size={14} />
                                                        </div>
                                                        <span className="text-sm text-gray-700 group-hover:text-naqupos-dark font-medium transition-colors">
                                                            {p.label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveRole} disabled={isProcessing || !roleForm.name}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !roleForm.name ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Role')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (selectedUser || selectedRole) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Hapus {selectedUser ? 'User' : 'Role'}</h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-red-800">Peringatan!</p>
                                <p className="text-sm text-red-600">
                                    {selectedUser ? 'User akan kehilangan akses ke sistem.' : 'Role tidak bisa dihapus jika masih ada user yang menggunakannya.'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                            <p className="font-bold text-naqupos-dark">{selectedUser?.name || selectedRole?.name}</p>
                            <p className="text-sm text-gray-500">{selectedUser?.email || selectedRole?.description}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closeModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={selectedUser ? handleDeleteUser : handleDeleteRole} disabled={isProcessing}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
