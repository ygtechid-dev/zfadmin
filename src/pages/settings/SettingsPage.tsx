import {
    Building, FileText,
    Save, X, Plus, Trash2, AlertTriangle, Phone, Clock, Mail, Key, Eye, EyeOff, Check,
    Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Branch as ApiBranch, Role as ApiRole } from '../../services/api';
import { Toggle } from '../../components/common';

interface Branch {
    id: number;
    name: string;
    address: string;
    phone: string;
    openTime: string;
    closeTime: string;
    status: 'active' | 'coming_soon' | 'inactive';
}

interface Room {
    id: number;
    name: string;
    type: 'reguler' | 'vip' | 'vvip';
    capacity: number;
    price: number;
    status: 'active' | 'inactive';
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    branch: string;
    status: 'active' | 'inactive';
    lastLogin?: string;
}

interface Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
    userCount: number;
}

interface ActivityLog {
    id: number;
    action: string;
    user: string;
    email: string;
    details: string;
    ip: string;
    timestamp: string;
}

interface GeneralSettings {
    minDP: number;
    paymentTimeout: number;
    tax: number;
    isTaxEnabled: boolean;
    serviceCharge: number;
    isServiceChargeEnabled: boolean;
    timeInterval: number;
    posTimeInterval: number;
    refundPolicy: string;
    isClosed: boolean;
    openTime: string;
    closeTime: string;
}

const allPermissions = [
    { id: 'dashboard', label: 'Dashboard', desc: 'Lihat ringkasan bisnis' },
    { id: 'pos', label: 'Kasir (POS)', desc: 'Akses point of sale' },
    { id: 'calendar', label: 'Kalender', desc: 'Lihat dan kelola jadwal' },
    { id: 'bookings', label: 'Reservasi', desc: 'Kelola booking' },
    { id: 'customers', label: 'Pelanggan', desc: 'Kelola data pelanggan' },
    { id: 'services', label: 'Layanan', desc: 'Kelola layanan' },
    { id: 'staff', label: 'Staff & Jadwal', desc: 'Kelola staff' },
    { id: 'reports', label: 'Laporan', desc: 'Lihat laporan' },
    { id: 'marketing', label: 'Marketing', desc: 'Kelola promo & konten' },
    { id: 'settings', label: 'Pengaturan', desc: 'Akses pengaturan sistem' },
];

export default function SettingsPage() {
    const [activeSection] = useState('general');
    const [loading, setLoading] = useState(true);

    // Data states
    const [branches, setBranches] = useState<Branch[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [branchesData, rolesData] = await Promise.all([
                api.getBranches().catch(() => []),
                api.getRoles().catch(() => [])
            ]);

            setBranches(branchesData.map((b: ApiBranch) => ({
                id: b.id,
                name: b.name,
                address: b.address,
                phone: b.phone,
                openTime: b.opening_time || '08:00',
                closeTime: b.closing_time || '20:00',
                status: b.is_active ? 'active' : 'inactive'
            })));

            setRoles(rolesData.map((r: ApiRole) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                permissions: r.permissions || [],
                userCount: r.user_count || 0
            })));
        } catch (err) {
            console.error('Error loading settings data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Modal states
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteType, setDeleteType] = useState<'branch' | 'room' | 'user' | 'role'>('branch');
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Selected items
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    // Helper for Currency Formatting
    const formatIDR = (val: number) => {
        return new Intl.NumberFormat('id-ID').format(val);
    };

    const parseIDR = (val: string) => {
        return parseInt(val.replace(/[^0-9]/g, '')) || 0;
    };

    // Forms
    const [branchForm, setBranchForm] = useState({
        name: '', address: '', phone: '', openTime: '08:00', closeTime: '20:00', status: 'active' as Branch['status']
    });

    const [roomForm, setRoomForm] = useState({
        name: '', type: 'reguler' as Room['type'], capacity: 1, price: 0, status: 'active' as Room['status']
    });

    const [userForm, setUserForm] = useState({
        name: '', email: '', password: '', role: 'Kasir', branch: 'Naqupos Spa Solo', status: 'active' as User['status']
    });

    const [roleForm, setRoleForm] = useState({
        name: '', description: '', permissions: [] as string[]
    });



    // Activity Logs
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [logFilter, setLogFilter] = useState('all');

    const loadActivityLogs = () => {
        const logs = JSON.parse(localStorage.getItem('naqupos_activity_logs') || '[]');
        setActivityLogs(logs);
    };

    useEffect(() => {
        loadActivityLogs();
    }, [activeSection]);

    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => {
        const saved = localStorage.getItem('naqupos_general_settings');
        return saved ? JSON.parse(saved) : {
            minDP: 50000,
            paymentTimeout: 30,
            tax: 11,
            isTaxEnabled: true,
            serviceCharge: 5,
            isServiceChargeEnabled: true,
            timeInterval: 15,
            posTimeInterval: 15,
            refundPolicy: 'Pembatalan H-1 dikenakan biaya 50% dari DP. Pembatalan H-0 tidak dapat dikembalikan.',
            isClosed: false,
            openTime: '09:00',
            closeTime: '21:00'
        };
    });

    const [saveSuccess, setSaveSuccess] = useState(false);

    const closeAllModals = () => {
        setShowBranchModal(false);
        setShowRoomModal(false);
        setShowUserModal(false);
        setShowRoleModal(false);
        setShowDeleteModal(false);
        setSelectedBranch(null);
        setSelectedRoom(null);
        setSelectedUser(null);
        setSelectedRole(null);
    };

    // Branch handlers
    const openAddBranch = () => {
        setBranchForm({ name: '', address: '', phone: '', openTime: '08:00', closeTime: '20:00', status: 'active' });
        setIsEditing(false);
        setShowBranchModal(true);
    };

    const openEditBranch = (branch: Branch) => {
        setSelectedBranch(branch);
        setBranchForm({
            name: branch.name, address: branch.address, phone: branch.phone,
            openTime: branch.openTime, closeTime: branch.closeTime, status: branch.status
        });
        setIsEditing(true);
        setShowBranchModal(true);
    };

    const openDeleteBranch = (branch: Branch) => {
        setSelectedBranch(branch);
        setDeleteType('branch');
        setShowDeleteModal(true);
    };

    const handleSaveBranch = async () => {
        if (!branchForm.name || !branchForm.address) return;

        // Validate phone (Indonesian formats)
        const phoneClean = branchForm.phone.replace(/[-\s+]/g, '');
        if (branchForm.phone && !/^(\+628|628|08|021)\d{7,13}$/.test(phoneClean)) {
            toast.error('Format nomor telepon tidak valid. Gunakan format 08, +628, atau 021');
            return;
        }

        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));

        if (isEditing && selectedBranch) {
            setBranches(prev => prev.map(b => b.id === selectedBranch.id ? { ...b, ...branchForm } : b));
        } else {
            setBranches(prev => [...prev, { id: prev.length + 1, ...branchForm }]);
        }
        setIsProcessing(false);
        closeAllModals();
    };

    const handleDeleteBranch = async () => {
        if (!selectedBranch) return;
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));
        setBranches(prev => prev.filter(b => b.id !== selectedBranch.id));
        setIsProcessing(false);
        closeAllModals();
    };

    // Room handlers
    const openAddRoom = () => {
        setRoomForm({ name: '', type: 'reguler', capacity: 1, price: 0, status: 'active' });
        setIsEditing(false);
        setShowRoomModal(true);
    };

    const openEditRoom = (room: Room) => {
        setSelectedRoom(room);
        setRoomForm({
            name: room.name, type: room.type, capacity: room.capacity, price: room.price, status: room.status
        });
        setIsEditing(true);
        setShowRoomModal(true);
    };

    const openDeleteRoom = (room: Room) => {
        setSelectedRoom(room);
        setDeleteType('room');
        setShowDeleteModal(true);
    };

    const handleSaveRoom = async () => {
        if (!roomForm.name) return;
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));

        if (isEditing && selectedRoom) {
            setRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, ...roomForm } : r));
        } else {
            setRooms(prev => [...prev, { id: prev.length + 1, ...roomForm }]);
        }
        setIsProcessing(false);
        closeAllModals();
    };

    const handleDeleteRoom = async () => {
        if (!selectedRoom) return;
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));
        setRooms(prev => prev.filter(r => r.id !== selectedRoom.id));
        setIsProcessing(false);
        closeAllModals();
    };

    // User handlers
    const openAddUser = () => {
        setUserForm({ name: '', email: '', password: '', role: 'Kasir', branch: 'Naqupos Spa Solo', status: 'active' });
        setIsEditing(false);
        setShowUserModal(true);
    };

    const openEditUser = (user: User) => {
        setSelectedUser(user);
        setUserForm({
            name: user.name, email: user.email, password: '', role: user.role, branch: user.branch, status: user.status
        });
        setIsEditing(true);
        setShowUserModal(true);
    };

    const openDeleteUser = (user: User) => {
        setSelectedUser(user);
        setDeleteType('user');
        setShowDeleteModal(true);
    };

    const handleSaveUser = async () => {
        if (!userForm.name || !userForm.email) return;
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));

        if (isEditing && selectedUser) {
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...userForm } : u));
        } else {
            setUsers(prev => [...prev, {
                id: prev.length + 1,
                name: userForm.name,
                email: userForm.email,
                role: userForm.role,
                branch: userForm.branch,
                status: userForm.status,
                lastLogin: undefined
            }]);
        }
        setIsProcessing(false);
        closeAllModals();
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
        setIsProcessing(false);
        closeAllModals();
    };

    // Role handlers
    const openAddRole = () => {
        setRoleForm({ name: '', description: '', permissions: [] });
        setIsEditing(false);
        setShowRoleModal(true);
    };

    const openEditRole = (role: Role) => {
        setSelectedRole(role);
        setRoleForm({
            name: role.name, description: role.description, permissions: [...role.permissions]
        });
        setIsEditing(true);
        setShowRoleModal(true);
    };

    const openDeleteRole = (role: Role) => {
        setSelectedRole(role);
        setDeleteType('role');
        setShowDeleteModal(true);
    };

    const handleSaveRole = async () => {
        if (!roleForm.name) return;
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));

        if (isEditing && selectedRole) {
            setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, ...roleForm } : r));
        } else {
            setRoles(prev => [...prev, {
                id: prev.length + 1,
                name: roleForm.name,
                description: roleForm.description,
                permissions: roleForm.permissions,
                userCount: 0
            }]);
        }
        setIsProcessing(false);
        closeAllModals();
    };

    const handleDeleteRole = async () => {
        if (!selectedRole) return;
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));
        setRoles(prev => prev.filter(r => r.id !== selectedRole.id));
        setIsProcessing(false);
        closeAllModals();
    };

    const handleSaveSettings = async () => {
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 800));
        localStorage.setItem('naqupos_general_settings', JSON.stringify(generalSettings));
        setIsProcessing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    const togglePermission = (permId: string) => {
        setRoleForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-140px)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] overflow-y-auto">
            {/* Content */}
            <div className="w-full">
                {/* Branch Management */}
                {activeSection === 'branch' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl  font-bold text-naqupos-dark">Manajemen Cabang</h1>
                            <button onClick={openAddBranch} className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors">
                                <Plus size={18} />
                                Tambah Cabang
                            </button>
                        </div>
                        <div className="grid gap-4">
                            {branches.map(branch => (
                                <div key={branch.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-naqupos-cream rounded-lg">
                                            <Building size={24} className="text-naqupos-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-naqupos-dark">{branch.name}</h3>
                                            <p className="text-sm text-gray-500">{branch.address}</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                <span className="flex items-center gap-1"><Phone size={12} />{branch.phone}</span>
                                                <span className="flex items-center gap-1"><Clock size={12} />{branch.openTime} - {branch.closeTime}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${branch.status === 'active' ? 'bg-green-100 text-green-700' : branch.status === 'coming_soon' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {branch.status === 'active' ? 'Aktif' : branch.status === 'coming_soon' ? 'Coming Soon' : 'Nonaktif'}
                                        </span>
                                        <button onClick={() => openEditBranch(branch)} className="text-sm text-naqupos-primary hover:underline">Edit</button>
                                        <button onClick={() => openDeleteBranch(branch)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={16} className="text-gray-400 hover:text-red-500" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Room Management */}
                {activeSection === 'room' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl  font-bold text-naqupos-dark">Manajemen Ruangan</h1>
                            <button onClick={openAddRoom} className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors">
                                <Plus size={18} />
                                Tambah Ruangan
                            </button>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-left text-xs text-gray-500 uppercase">
                                        <th className="px-4 py-3 font-medium">Nama Ruangan</th>
                                        <th className="px-4 py-3 font-medium">Tipe</th>
                                        <th className="px-4 py-3 font-medium">Kapasitas</th>
                                        <th className="px-4 py-3 font-medium">Harga Add-on</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rooms.map(room => (
                                        <tr key={room.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium">{room.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs uppercase ${room.type === 'vvip' ? 'bg-purple-100 text-purple-700' : room.type === 'vip' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{room.type}</span>
                                            </td>
                                            <td className="px-4 py-3">{room.capacity} orang</td>
                                            <td className="px-4 py-3">{room.price > 0 ? `Rp ${room.price.toLocaleString('id-ID')}` : 'Gratis'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${room.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{room.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => openEditRoom(room)} className="text-sm text-naqupos-primary hover:underline">Edit</button>
                                                    <button onClick={() => openDeleteRoom(room)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* User Management */}
                {activeSection === 'users' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl  font-bold text-naqupos-dark">User Management</h1>
                            <button onClick={openAddUser} className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors">
                                <Plus size={18} />
                                Tambah User
                            </button>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-left text-xs text-gray-500 uppercase">
                                        <th className="px-4 py-3 font-medium">User</th>
                                        <th className="px-4 py-3 font-medium">Role</th>
                                        <th className="px-4 py-3 font-medium">Cabang</th>
                                        <th className="px-4 py-3 font-medium">Login Terakhir</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-naqupos-cream flex items-center justify-center text-naqupos-primary font-bold text-xs">
                                                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-naqupos-dark">{user.name}</p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' : user.role === 'Branch Manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{user.role}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{user.branch}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{user.lastLogin || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{user.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => openEditUser(user)} className="text-sm text-naqupos-primary hover:underline">Edit</button>
                                                    <button onClick={() => openDeleteUser(user)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Roles/Permissions */}
                {activeSection === 'roles' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl  font-bold text-naqupos-dark">Hak Akses (Roles)</h1>
                            <button onClick={openAddRole} className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors">
                                <Plus size={18} />
                                Tambah Role
                            </button>
                        </div>
                        <div className="grid gap-4">
                            {roles.map(role => (
                                <div key={role.id} className="bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-naqupos-dark">{role.name}</h3>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{role.userCount} user</span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEditRole(role)} className="text-sm text-naqupos-primary hover:underline">Edit</button>
                                            {role.name !== 'Super Admin' && (
                                                <button onClick={() => openDeleteRole(role)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {role.permissions.map(perm => {
                                            const permInfo = allPermissions.find(p => p.id === perm);
                                            return (
                                                <span key={perm} className="text-xs bg-naqupos-cream text-naqupos-primary px-2 py-1 rounded-full flex items-center gap-1">
                                                    <Check size={12} />
                                                    {permInfo?.label || perm}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}



                {/* General Settings */}
                {activeSection === 'general' && (
                    <div className="space-y-8 pb-10">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
                            <button
                                onClick={handleSaveSettings}
                                disabled={isProcessing}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all ${saveSuccess ? 'bg-green-600 text-white translate-y-[-2px]' : 'bg-[#C58940] text-white hover:bg-[#A67536] hover:shadow-xl active:scale-95'}`}
                            >
                                <Save size={20} />
                                {saveSuccess ? 'Berhasil Disimpan!' : isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* Operational Stats */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <Clock size={20} />
                                    </div>
                                    <h2 className="font-bold text-gray-800">Status & Jam Operasional</h2>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <div>
                                            <p className="font-bold text-gray-800">Status Operasional Kantor</p>
                                            <p className="text-sm text-gray-500">Tutup kantor secara manual untuk menonaktifkan semua reservasi.</p>
                                        </div>
                                        <button
                                            onClick={() => setGeneralSettings(g => ({ ...g, isClosed: !g.isClosed }))}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${generalSettings.isClosed ? 'bg-red-500' : 'bg-green-500'}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${generalSettings.isClosed ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Jam Buka (Default)</label>
                                            <div className="relative">
                                                <input
                                                    type="time"
                                                    value={generalSettings.openTime}
                                                    onChange={(e) => setGeneralSettings(g => ({ ...g, openTime: e.target.value }))}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-medium text-gray-700"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Jam Tutup (Default)</label>
                                            <div className="relative">
                                                <input
                                                    type="time"
                                                    value={generalSettings.closeTime}
                                                    onChange={(e) => setGeneralSettings(g => ({ ...g, closeTime: e.target.value }))}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-medium text-gray-700"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Interval Booking Kalender (Menit)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={generalSettings.timeInterval === 0 ? '' : generalSettings.timeInterval}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? 0 : (parseInt(e.target.value.replace(/\D/g, '')) || 0);
                                                    setGeneralSettings(g => ({ ...g, timeInterval: val }));
                                                }}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-medium text-gray-700 bg-white"
                                                placeholder="Contoh: 15"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Interval Booking Kasir / POS (Menit)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={generalSettings.posTimeInterval === 0 ? '' : generalSettings.posTimeInterval}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? 0 : (parseInt(e.target.value.replace(/\D/g, '')) || 0);
                                                    setGeneralSettings(g => ({ ...g, posTimeInterval: val }));
                                                }}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-medium text-gray-700 bg-white"
                                                placeholder="Contoh: 1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Timeout Bayar (Menit)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={generalSettings.paymentTimeout === 0 ? '' : generalSettings.paymentTimeout}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? 0 : (parseInt(e.target.value.replace(/\D/g, '')) || 0);
                                                setGeneralSettings(g => ({ ...g, paymentTimeout: val }));
                                            }}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-medium text-gray-700 bg-white"
                                            placeholder="Contoh: 30"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Financial Settings */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                        <Wallet size={20} />
                                    </div>
                                    <h2 className="font-bold text-gray-800">Biaya & Perpajakan</h2>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Minimal Down Payment (DP)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                                            <input
                                                type="text"
                                                value={formatIDR(generalSettings.minDP)}
                                                onChange={(e) => setGeneralSettings(g => ({ ...g, minDP: parseIDR(e.target.value) }))}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-bold text-gray-700 text-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-gray-400 uppercase">Pajak (PPN %)</label>
                                                <Toggle
                                                    checked={generalSettings.isTaxEnabled}
                                                    onChange={(val) => setGeneralSettings(g => ({ ...g, isTaxEnabled: val }))}
                                                />
                                            </div>
                                            <div className={`relative transition-all ${!generalSettings.isTaxEnabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={generalSettings.tax}
                                                    onChange={(e) => setGeneralSettings(g => ({ ...g, tax: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-medium text-gray-700 bg-white"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-gray-400 uppercase">Service Charge (%)</label>
                                                <Toggle
                                                    checked={generalSettings.isServiceChargeEnabled}
                                                    onChange={(val) => setGeneralSettings(g => ({ ...g, isServiceChargeEnabled: val }))}
                                                />
                                            </div>
                                            <div className={`relative transition-all ${!generalSettings.isServiceChargeEnabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={generalSettings.serviceCharge}
                                                    onChange={(e) => setGeneralSettings(g => ({ ...g, serviceCharge: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-medium text-gray-700 bg-white"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-50 rounded-xl flex gap-3 items-start">
                                        <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            Perubahan pada pajak dan service charge akan langsung diterapkan pada semua transaksi baru di POS dan Reservasi.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Policies */}
                            <div className="col-span-1 xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <h2 className="font-bold text-gray-800">Kebijakan & Ketentuan</h2>
                                </div>
                                <div className="p-6">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Kebijakan Pembatalan & Refund</label>
                                    <textarea
                                        rows={4}
                                        value={generalSettings.refundPolicy}
                                        onChange={(e) => setGeneralSettings(g => ({ ...g, refundPolicy: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C58940] outline-none font-medium text-gray-700 leading-relaxed resize-none"
                                        placeholder="Tuliskan kebijakan pembatalan di sini..."
                                    />
                                    <p className="mt-2 text-xs text-gray-400 italic">Kebijakan ini akan ditampilkan pada struk pembayaran dan detail booking pelanggan.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* System Logs */}
                {activeSection === 'logs' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl  font-bold text-naqupos-dark">System Logs</h1>
                            <div className="flex items-center gap-3">
                                <select
                                    value={logFilter}
                                    onChange={(e) => setLogFilter(e.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-200 outline-none text-sm"
                                >
                                    <option value="all">Semua Aktivitas</option>
                                    <option value="Login">Login</option>
                                    <option value="Logout">Logout</option>
                                    <option value="Login Gagal">Login Gagal</option>
                                </select>
                                <button
                                    onClick={loadActivityLogs}
                                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-left text-xs text-gray-500 uppercase">
                                        <th className="px-4 py-3 font-medium">Waktu</th>
                                        <th className="px-4 py-3 font-medium">Aksi</th>
                                        <th className="px-4 py-3 font-medium">User</th>
                                        <th className="px-4 py-3 font-medium">Detail</th>
                                        <th className="px-4 py-3 font-medium">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                                <FileText size={40} className="mx-auto mb-2 opacity-50" />
                                                <p>Belum ada log aktivitas</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        activityLogs
                                            .filter(log => logFilter === 'all' || log.action === logFilter)
                                            .map(log => (
                                                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                        {new Date(log.timestamp).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.action === 'Login' ? 'bg-green-100 text-green-700' :
                                                            log.action === 'Logout' ? 'bg-blue-100 text-blue-700' :
                                                                log.action === 'Login Gagal' ? 'bg-red-100 text-red-700' :
                                                                    'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium text-naqupos-dark">{log.user}</p>
                                                            <p className="text-xs text-gray-400">{log.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{log.details}</td>
                                                    <td className="px-4 py-3 text-gray-500  text-xs">{log.ip}</td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {activityLogs.length > 0 && (
                            <div className="text-center text-sm text-gray-400">
                                Menampilkan {activityLogs.filter(log => logFilter === 'all' || log.action === logFilter).length} dari {activityLogs.length} log aktivitas
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Branch Modal */}
            {showBranchModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">{isEditing ? 'Edit Cabang' : 'Tambah Cabang Baru'}</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nama Cabang *</label><input type="text" value={branchForm.name} onChange={(e) => setBranchForm(b => ({ ...b, name: e.target.value }))} placeholder="Contoh: Naqupos Spa Surabaya" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Alamat *</label><input type="text" value={branchForm.address} onChange={(e) => setBranchForm(b => ({ ...b, address: e.target.value }))} placeholder="Jl. Contoh No. 123" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">No. Telepon</label><input type="tel" value={branchForm.phone} onChange={(e) => setBranchForm(b => ({ ...b, phone: e.target.value }))} placeholder="0xxx-xxxxxx" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Jam Buka</label><input type="time" value={branchForm.openTime} onChange={(e) => setBranchForm(b => ({ ...b, openTime: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Jam Tutup</label><input type="time" value={branchForm.closeTime} onChange={(e) => setBranchForm(b => ({ ...b, closeTime: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Status</label><select value={branchForm.status} onChange={(e) => setBranchForm(b => ({ ...b, status: e.target.value as Branch['status'] }))} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none"><option value="active">Aktif</option><option value="coming_soon">Coming Soon</option><option value="inactive">Nonaktif</option></select></div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveBranch} disabled={isProcessing || !branchForm.name || !branchForm.address} className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !branchForm.name || !branchForm.address ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>{isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Cabang')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Room Modal */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">{isEditing ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nama Ruangan *</label><input type="text" value={roomForm.name} onChange={(e) => setRoomForm(r => ({ ...r, name: e.target.value }))} placeholder="Contoh: VIP Room 3" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label><select value={roomForm.type} onChange={(e) => setRoomForm(r => ({ ...r, type: e.target.value as Room['type'] }))} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none"><option value="reguler">Reguler</option><option value="vip">VIP</option><option value="vvip">VVIP</option></select></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Kapasitas</label><input type="number" value={roomForm.capacity} onChange={(e) => setRoomForm(r => ({ ...r, capacity: parseInt(e.target.value) || 1 }))} min={1} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Harga Add-on (Rp)</label><input type="number" value={roomForm.price} onChange={(e) => setRoomForm(r => ({ ...r, price: parseInt(e.target.value) || 0 }))} placeholder="0 untuk gratis" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Status</label><select value={roomForm.status} onChange={(e) => setRoomForm(r => ({ ...r, status: e.target.value as Room['status'] }))} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none"><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveRoom} disabled={isProcessing || !roomForm.name} className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !roomForm.name ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>{isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Ruangan')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">{isEditing ? 'Edit User' : 'Tambah User Baru'}</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label><input type="text" value={userForm.name} onChange={(e) => setUserForm(u => ({ ...u, name: e.target.value }))} placeholder="Nama lengkap" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" value={userForm.email} onChange={(e) => setUserForm(u => ({ ...u, email: e.target.value }))} placeholder="email@naqupos.com" className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{isEditing ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label>
                                <div className="relative">
                                    <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type={showPassword ? 'text' : 'password'} value={userForm.password} onChange={(e) => setUserForm(u => ({ ...u, password: e.target.value }))} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 outline-none" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Role</label><select value={userForm.role} onChange={(e) => setUserForm(u => ({ ...u, role: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none">{roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Status</label><select value={userForm.status} onChange={(e) => setUserForm(u => ({ ...u, status: e.target.value as User['status'] }))} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none"><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Cabang</label><select value={userForm.branch} onChange={(e) => setUserForm(u => ({ ...u, branch: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none"><option value="Semua Cabang">Semua Cabang</option>{branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveUser} disabled={isProcessing || !userForm.name || !userForm.email} className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !userForm.name || !userForm.email ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>{isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah User')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">{isEditing ? 'Edit Role' : 'Tambah Role Baru'}</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nama Role *</label><input type="text" value={roleForm.name} onChange={(e) => setRoleForm(r => ({ ...r, name: e.target.value }))} placeholder="Contoh: Supervisor" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label><input type="text" value={roleForm.description} onChange={(e) => setRoleForm(r => ({ ...r, description: e.target.value }))} placeholder="Deskripsi singkat role" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Hak Akses</label>
                                <div className="space-y-2">
                                    {allPermissions.map(perm => (
                                        <label key={perm.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${roleForm.permissions.includes(perm.id) ? 'bg-naqupos-cream border border-naqupos-primary' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}>
                                            <input type="checkbox" checked={roleForm.permissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} className="accent-naqupos-primary w-4 h-4" />
                                            <div>
                                                <p className="font-medium text-sm">{perm.label}</p>
                                                <p className="text-xs text-gray-500">{perm.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveRole} disabled={isProcessing || !roleForm.name} className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !roleForm.name ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>{isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Role')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (selectedBranch || selectedRoom || selectedUser || selectedRole) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Hapus {deleteType === 'branch' ? 'Cabang' : deleteType === 'room' ? 'Ruangan' : deleteType === 'user' ? 'User' : 'Role'}</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-red-800">Peringatan!</p>
                                <p className="text-sm text-red-600">Data yang dihapus tidak dapat dikembalikan.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                            <p className="font-bold text-naqupos-dark">{selectedBranch?.name || selectedRoom?.name || selectedUser?.name || selectedRole?.name}</p>
                            {selectedBranch && <p className="text-sm text-gray-500">{selectedBranch.address}</p>}
                            {selectedUser && <p className="text-sm text-gray-500">{selectedUser.email}</p>}
                            {selectedRole && <p className="text-sm text-gray-500">{selectedRole.description}</p>}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closeAllModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={deleteType === 'branch' ? handleDeleteBranch : deleteType === 'room' ? handleDeleteRoom : deleteType === 'user' ? handleDeleteUser : handleDeleteRole} disabled={isProcessing} className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>{isProcessing ? 'Menghapus...' : 'Ya, Hapus'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
