import { Plus, Edit, Trash2, Search, X, AlertTriangle, CreditCard, Banknote, QrCode, Building2, Smartphone, ToggleLeft, ToggleRight, Download, ChevronDown, Building, Wallet, Coins, Gem, Lock, Sparkles, Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Pagination from '../../components/common/Pagination';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import type { Branch } from '../../services/api';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'cash' | 'qris' | 'transfer' | 'edc' | 'ewallet';
    icon: string;
    description: string;
    isActive: boolean;
    fee: number; // Biaya admin dalam persen
    accountNumber?: string; // Nomor rekening untuk transfer
    accountName?: string; // Nama pemilik rekening
    branch_id?: number;
    branch_ids?: number[];
    is_global?: boolean;
    is_online?: boolean;
    is_cashier_enabled?: boolean;
}

const initialPaymentMethods: PaymentMethod[] = [
    {
        id: 1,
        name: 'Cash',
        code: 'CASH',
        type: 'cash',
        icon: 'banknote',
        description: 'Pembayaran tunai',
        isActive: true,
        fee: 0
    },
    {
        id: 2,
        name: 'QRIS',
        code: 'QRIS',
        type: 'qris',
        icon: 'qr-code',
        description: 'Pembayaran via QRIS (GoPay, OVO, Dana, dll)',
        isActive: true,
        fee: 0.7
    },
    {
        id: 3,
        name: 'Transfer Bank BCA',
        code: 'BCA',
        type: 'transfer',
        icon: 'building-2',
        description: 'Transfer via Bank BCA',
        isActive: true,
        fee: 0,
        accountNumber: '1234567890',
        accountName: 'PT Naqupos Beauty Spa'
    },
    {
        id: 4,
        name: 'Transfer Bank Mandiri',
        code: 'MANDIRI',
        type: 'transfer',
        icon: 'building-2',
        description: 'Transfer via Bank Mandiri',
        isActive: true,
        fee: 0,
        accountNumber: '0987654321',
        accountName: 'PT Naqupos Beauty Spa'
    },
    {
        id: 5,
        name: 'EDC BCA',
        code: 'EDC_BCA',
        type: 'edc',
        icon: 'credit-card',
        description: 'Kartu Debit/Kredit via mesin EDC BCA',
        isActive: true,
        fee: 2
    },
    {
        id: 6,
        name: 'GoPay',
        code: 'GOPAY',
        type: 'ewallet',
        icon: 'smartphone',
        description: 'E-Wallet GoPay',
        isActive: false,
        fee: 1.5
    },
];

const paymentTypes = [
    { value: 'cash', label: 'Cash', icon: Banknote, color: 'bg-green-100 text-green-700' },
    { value: 'qris', label: 'QRIS', icon: QrCode, color: 'bg-purple-100 text-purple-700' },
    { value: 'transfer', label: 'Transfer Bank', icon: Building2, color: 'bg-blue-100 text-blue-700' },
    { value: 'edc', label: 'EDC/Kartu', icon: CreditCard, color: 'bg-amber-100 text-amber-700' },
    { value: 'ewallet', label: 'E-Wallet', icon: Smartphone, color: 'bg-pink-100 text-pink-700' },
];

const availableIcons = [
    { name: 'banknote', icon: Banknote },
    { name: 'credit-card', icon: CreditCard },
    { name: 'smartphone', icon: Smartphone },
    { name: 'qr-code', icon: QrCode },
    { name: 'building-2', icon: Building2 },
    { name: 'wallet', icon: Wallet },
    { name: 'coins', icon: Coins },
    { name: 'gem', icon: Gem },
    { name: 'lock', icon: Lock },
    { name: 'sparkles', icon: Sparkles },
    { name: 'star', icon: Star }
];

export default function PaymentMethodsPage() {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Branch states
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const branchDropdownRef = useRef<HTMLDivElement>(null);
    const exportDropdownRef = useRef<HTMLDivElement>(null);

    // Gateway Config State

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'cash' as PaymentMethod['type'],
        icon: 'banknote',
        description: '',
        isActive: true,
        fee: 0,
        accountNumber: '',
        accountName: '',
        branch_ids: [] as number[],
        is_global: true,
        is_online: false,
        is_cashier_enabled: true
    });

    // Load branches from API
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const data = await api.getBranches();
                // Add "Semua Cabang" option
                const allBranches = [{ id: 0, name: 'Semua Cabang', address: '', phone: '' } as Branch, ...data];
                setBranches(allBranches);

                // Default to "Semua Cabang" (id 0) if no selection
                if (!selectedBranchId) {
                    setSelectedBranchId(0);
                }
            } catch (error) {
                console.error('Failed to fetch branches:', error);
            }
        };
        fetchBranches();
    }, []);


    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
                setShowBranchDropdown(false);
            }
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
                setShowExportDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load methods from backend API
    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const res = await api.getPaymentMethods();
                const data = Array.isArray(res) ? res : (res.data || []);
                // Transform backend data to match frontend interface
                const transformedMethods = data.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    code: m.code,
                    type: m.type as PaymentMethod['type'],
                    icon: m.icon || 'credit-card',
                    description: m.description || '',
                    isActive: m.is_active,
                    fee: m.fee || 0,
                    accountNumber: m.account_number,
                    accountName: m.account_name,
                    branch_id: m.branch_id,
                    branch_ids: m.branches ? m.branches.map((b: any) => b.id) : [],
                    is_global: !!m.is_global,
                    is_online: !!m.is_online,
                    is_cashier_enabled: m.is_cashier_enabled ?? m.show_in_cashier ?? m.is_cashier ?? true
                }));
                setPaymentMethods(transformedMethods);
            } catch (error) {
                console.error('Failed to fetch payment methods:', error);
                // Fallback to initial data if API fails
                setPaymentMethods(initialPaymentMethods);
            }
        };
        fetchPaymentMethods();
    }, [selectedBranchId]);

    // Refresh payment methods from backend
    const refreshPaymentMethods = async () => {
        try {
            const data = await api.getAllPaymentMethods();
            const transformedMethods = data.map((m: any) => ({
                id: m.id,
                name: m.name,
                code: m.code,
                type: m.type as PaymentMethod['type'],
                icon: m.icon || 'credit-card',
                description: m.description || '',
                isActive: m.is_active,
                fee: m.fee || 0,
                accountNumber: m.account_number,
                accountName: m.account_name,
                branch_id: m.branch_id,
                branch_ids: m.branches ? m.branches.map((b: any) => b.id) : [],
                is_global: !!m.is_global,
                is_online: !!m.is_online,
                is_cashier_enabled: m.is_cashier_enabled ?? m.show_in_cashier ?? m.is_cashier ?? true
            }));
            setPaymentMethods(transformedMethods);
        } catch (error) {
            console.error('Failed to refresh payment methods:', error);
        }
    };


    // Export functions
    const exportToCSV = () => {
        const headers = ['Nama', 'Kode', 'Tipe', 'Deskripsi', 'Biaya (%)', 'Status', 'No. Rekening', 'Nama Pemilik'];
        const rows = filteredMethods.map(m => [
            m.name,
            m.code,
            paymentTypes.find(t => t.value === m.type)?.label || m.type,
            m.description,
            m.fee.toString(),
            m.isActive ? 'Aktif' : 'Non-Aktif',
            m.accountNumber || '',
            m.accountName || ''
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `metode_pembayaran_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        setShowExportDropdown(false);
    };

    const exportToExcel = () => {
        // Create a simple HTML table and export as Excel-compatible file
        const headers = ['Nama', 'Kode', 'Tipe', 'Deskripsi', 'Biaya (%)', 'Status', 'No. Rekening', 'Nama Pemilik'];
        const rows = filteredMethods.map(m => [
            m.name,
            m.code,
            paymentTypes.find(t => t.value === m.type)?.label || m.type,
            m.description,
            m.fee.toString(),
            m.isActive ? 'Aktif' : 'Non-Aktif',
            m.accountNumber || '',
            m.accountName || ''
        ]);

        let tableHtml = '<table border="1"><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
        rows.forEach(row => {
            tableHtml += '<tr>' + row.map(c => `<td>${c}</td>`).join('') + '</tr>';
        });
        tableHtml += '</tbody></table>';

        const blob = new Blob([`<html><head><meta charset="UTF-8"></head><body>${tableHtml}</body></html>`], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `metode_pembayaran_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();
        setShowExportDropdown(false);
    };

    const selectedBranch = branches.find(b => b.id === selectedBranchId);

    const filteredMethods = paymentMethods.filter(method => {
        const matchesSearch = method.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            method.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            method.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || method.type === filterType;

        // Branch filtering logic
        const currentBranchId = selectedBranchId || 0;
        const matchesBranch = currentBranchId === 0 || (method.is_global || method.branch_ids?.includes(currentBranchId));

        return matchesSearch && matchesType && matchesBranch;
    });

    const getPaginatedData = (data: PaymentMethod[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType, selectedBranchId]);

    const openAddModal = () => {
        setFormData({
            name: '',
            code: '',
            type: 'cash',
            icon: 'banknote',
            description: '',
            isActive: true,
            fee: 0,
            accountNumber: '',
            accountName: '',
            branch_ids: [],
            is_global: true,
            is_online: false,
            is_cashier_enabled: true
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setFormData({
            name: method.name,
            code: method.code,
            type: method.type,
            icon: method.icon,
            description: method.description,
            isActive: method.isActive,
            fee: method.fee,
            accountNumber: method.accountNumber || '',
            accountName: method.accountName || '',
            branch_ids: method.branch_ids || [],
            is_global: !!method.is_global,
            is_online: !!method.is_online,
            is_cashier_enabled: method.is_cashier_enabled ?? true
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const openDeleteModal = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setShowDeleteModal(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.code) return;
        setIsProcessing(true);

        try {
            const payload = {
                code: formData.code.toUpperCase(),
                name: formData.name,
                type: formData.type,
                icon: formData.icon,
                description: formData.description,
                fee: formData.fee,
                account_number: formData.accountNumber,
                account_name: formData.accountName,
                is_active: formData.isActive,
                is_global: formData.is_global,
                is_online: formData.is_online,
                is_cashier_enabled: formData.is_cashier_enabled,
                show_in_cashier: formData.is_cashier_enabled,
                branch_ids: formData.is_global ? [] : formData.branch_ids
            };

            if (isEditing && selectedMethod) {
                await api.updatePaymentMethod(selectedMethod.id, payload);
            } else {
                await api.createPaymentMethod(payload);
            }

            await refreshPaymentMethods();
            setShowModal(false);
            setSelectedMethod(null);
            toast.success(isEditing ? 'Metode pembayaran diperbarui!' : 'Metode pembayaran ditambahkan!');
        } catch (error: any) {
            console.error('Failed to save payment method:', error);
            toast.error('Gagal menyimpan: ' + (error.message || 'Terjadi kesalahan'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedMethod) return;
        setIsProcessing(true);

        try {
            await api.deletePaymentMethod(selectedMethod.id);
            await refreshPaymentMethods();
            setShowDeleteModal(false);
            setSelectedMethod(null);
            toast.success('Metode pembayaran dihapus!');
        } catch (error: any) {
            console.error('Failed to delete payment method:', error);
            toast.error('Gagal menghapus: ' + (error.message || 'Terjadi kesalahan'));
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleActive = async (method: PaymentMethod) => {
        try {
            await api.togglePaymentMethodStatus(method.id);
            await refreshPaymentMethods();
            toast.success('Status metode pembayaran diperbarui!');
        } catch (error: any) {
            console.error('Failed to toggle payment method status:', error);
            toast.error('Gagal mengubah status: ' + (error.message || 'Terjadi kesalahan'));
        }
    };

    const getTypeInfo = (type: PaymentMethod['type']) => {
        return paymentTypes.find(t => t.value === type) || paymentTypes[0];
    };

    const activeCount = paymentMethods.filter(m => m.isActive).length;
    const inactiveCount = paymentMethods.filter(m => !m.isActive).length;



    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">Metode Pembayaran</h1>
                    <p className="text-gray-500 text-sm">Kelola metode pembayaran dan konfigurasi gateway</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Branch Selector */}
                    <div className="relative" ref={branchDropdownRef}>
                        <button
                            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-naqupos-primary transition-colors"
                        >
                            <Building size={18} className="text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                                {selectedBranch ? selectedBranch.name : 'Pilih Cabang'}
                            </span>
                            <ChevronDown size={16} className="text-gray-400" />
                        </button>
                        {showBranchDropdown && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                                {branches.map(branch => (
                                    <button
                                        key={branch.id}
                                        onClick={() => { setSelectedBranchId(branch.id); setShowBranchDropdown(false); }}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${selectedBranchId === branch.id ? 'bg-naqupos-cream text-naqupos-primary font-medium' : 'text-gray-700'}`}
                                    >
                                        {branch.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Config Needed Warning - Only show if not "Semua Cabang" for Settings tab, or generally relevant */}
            {(!selectedBranchId && selectedBranchId !== 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3 text-yellow-800">
                    <AlertTriangle size={20} />
                    <p className="text-sm">Silakan pilih cabang terlebih dahulu untuk mengatur konfigurasi pembayaran.</p>
                </div>
            )}



            {selectedBranchId !== null ? (
                // Existing Methods View
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                                    <CreditCard size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-blue-600 text-sm font-medium">Total Metode</p>
                                    <p className="text-2xl font-bold text-blue-800">{paymentMethods.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                                    <ToggleRight size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-green-600 text-sm font-medium">Aktif</p>
                                    <p className="text-2xl font-bold text-green-800">{activeCount}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center">
                                    <ToggleLeft size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Non-Aktif</p>
                                    <p className="text-2xl font-bold text-gray-800">{inactiveCount}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex-1 flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari metode pembayaran..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:ring-2 focus:ring-naqupos-primary/20 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                                {paymentTypes.map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => setFilterType(filterType === type.value ? 'all' : type.value)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${filterType === type.value
                                            ? 'bg-naqupos-primary text-white shadow-md'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-naqupos-primary'
                                            }`}
                                    >
                                        <type.icon size={16} />
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="relative" ref={exportDropdownRef}>
                                <button
                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-green-500 hover:text-green-600 transition-colors"
                                >
                                    <Download size={18} />
                                    <span className="text-sm font-medium">Export</span>
                                    <ChevronDown size={16} className="text-gray-400" />
                                </button>
                                {showExportDropdown && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                                        <button onClick={exportToCSV} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                                            <span className="text-green-500">📄</span> Export CSV
                                        </button>
                                        <button onClick={exportToExcel} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                                            <span className="text-green-600">📊</span> Export Excel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={openAddModal}
                                className="flex items-center gap-2 bg-gradient-to-r from-naqupos-primary to-[#E5BA73] text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 font-medium"
                            >
                                <Plus size={18} />
                                Tambah Metode
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100">
                                <tr className="text-left text-xs text-gray-500 uppercase">
                                    <th className="px-6 py-4 font-medium w-20">Icon</th>
                                    <th className="px-6 py-4 font-medium">Nama / Kode</th>
                                    <th className="px-6 py-4 font-medium">Tipe</th>
                                    <th className="px-6 py-4 font-medium">Deskripsi</th>
                                    <th className="px-6 py-4 font-medium text-center">Biaya (%)</th>
                                    <th className="px-6 py-4 font-medium text-center">Status</th>
                                    {selectedBranchId === 0 && <th className="px-6 py-4 font-medium">Cabang</th>}
                                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMethods.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                            <CreditCard size={48} className="mx-auto mb-3 opacity-40" />
                                            <p className="font-medium">Tidak ada metode pembayaran</p>
                                            <p className="text-sm">Klik "Tambah Metode" untuk menambahkan</p>
                                        </td>
                                    </tr>
                                ) : (
                                    getPaginatedData(filteredMethods).map(method => {
                                        const typeInfo = getTypeInfo(method.type);
                                        return (
                                            <tr key={method.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!method.isActive ? 'opacity-60' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center text-naqupos-primary shadow-sm">
                                                        {(() => {
                                                            const IconComponent = availableIcons.find(i => i.name === method.icon)?.icon || CreditCard;
                                                            return <IconComponent size={24} />;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-900">{method.name}</p>
                                                    <p className="text-xs text-gray-400 ">{method.code}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                                        <typeInfo.icon size={12} />
                                                        {typeInfo.label}
                                                    </span>
                                                    {method.is_online && (
                                                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                                                            <Sparkles size={10} /> Online
                                                        </div>
                                                    )}
                                                    {method.is_cashier_enabled === false && (
                                                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                                            <Lock size={10} /> Kasir Off
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 max-w-[200px]">
                                                    <p className="truncate">{method.description || '-'}</p>
                                                    {method.accountNumber && (
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            Rek: {method.accountNumber}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {method.fee > 0 ? (
                                                        <span className="text-amber-600 font-medium">{method.fee}%</span>
                                                    ) : (
                                                        <span className="text-green-600 font-medium">Gratis</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleActive(method)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${method.isActive ? 'bg-green-500' : 'bg-gray-300'
                                                            }`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${method.isActive ? 'translate-x-6' : 'translate-x-1'
                                                            }`} />
                                                    </button>
                                                </td>
                                                {selectedBranchId === 0 && (
                                                    <td className="px-6 py-4 text-gray-500">
                                                        {method.is_global ? (
                                                            <span className="px-2 py-1 bg-naqupos-cream text-naqupos-primary text-[10px] font-bold rounded-lg uppercase tracking-wider border border-naqupos-primary/20">Global</span>
                                                        ) : method.branch_ids && method.branch_ids.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {method.branch_ids.map(bid => {
                                                                    const b = branches.find(br => br.id === bid);
                                                                    return b ? (
                                                                        <span key={bid} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">{b.name}</span>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">-</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => openEditModal(method)}
                                                            className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(method)}
                                                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredMethods.length > 0 && (
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredMethods.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        </div>
                    )}
                </div>
            ) : null}

            {/* Add/Edit Modal and Delete Modal remain unchanged */}
            {/* ... (Existing Modals) ... */}
            {/* Note: I'm reusing the existing modal code but keeping it collapsed here for brevity as header/body/footer structure is same as before. 
                 The only difference is that now we conditionally render the main content based on activeTab.
             */}
            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="p-5 border-b bg-gradient-to-r from-naqupos-primary to-[#E5BA73] text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl  font-bold">
                                    {isEditing ? 'Edit Metode' : 'Tambah Metode Pembayaran'}
                                </h3>
                                <p className="text-white/80 text-sm">
                                    {isEditing ? 'Perbarui detail metode pembayaran' : 'Tambahkan metode pembayaran baru'}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4 overflow-y-auto flex-1">


                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Multiple Selection)</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition-all group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_global}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        is_global: checked,
                                                        branch_ids: checked ? [] : prev.branch_ids
                                                    }));
                                                }}
                                                className="w-5 h-5 text-naqupos-primary focus:ring-naqupos-primary border-gray-300 rounded-md transition-all cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</p>
                                            <p className="text-xs text-gray-500">Metode ini akan tersedia di seluruh cabang</p>
                                        </div>
                                    </label>

                                    {!formData.is_global && (
                                        <div className="pt-2 mt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {branches.filter(b => b.id !== 0).map(branch => (
                                                <label key={branch.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white transition-all border border-transparent hover:border-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.branch_ids.includes(branch.id)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                branch_ids: checked
                                                                    ? [...prev.branch_ids, branch.id]
                                                                    : prev.branch_ids.filter(id => id !== branch.id)
                                                            }));
                                                        }}
                                                        className="w-4 h-4 text-naqupos-primary focus:ring-naqupos-primary border-gray-300 rounded transition-all cursor-pointer"
                                                    />
                                                    <span className="text-sm text-gray-600 font-medium truncate">{branch.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {!formData.is_global && formData.branch_ids.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertTriangle size={12} /> Silakan pilih setidaknya satu cabang
                                    </p>
                                )}
                            </div>

                            {/* Name & Code */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            // Auto-generate code
                                            const autoCode = name
                                                .toUpperCase()
                                                .replace(/[^A-Z0-9\s]/g, '')
                                                .split(' ')
                                                .filter(word => word.length > 0)
                                                .map(word => word.length > 3 ? word.substring(0, 3) : word)
                                                .join('_')
                                                .substring(0, 15);
                                            setFormData(prev => ({
                                                ...prev,
                                                name,
                                                code: !isEditing && (prev.code === '' || prev.code === prev.name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(' ').filter(w => w.length > 0).map(w => w.length > 3 ? w.substring(0, 3) : w).join('_').substring(0, 15))
                                                    ? autoCode
                                                    : prev.code
                                            }));
                                        }}
                                        placeholder="Contoh: QRIS"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:ring-2 focus:ring-naqupos-primary/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Kode * <span className="text-xs text-gray-400 font-normal">(auto-generate)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                                        placeholder="AUTO_GENERATE"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:ring-2 focus:ring-naqupos-primary/20 outline-none  uppercase transition-all bg-gray-50"
                                    />
                                </div>
                            </div>
                            {/* Icon Selection */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableIcons.map((item) => (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, icon: item.name }))}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${formData.icon === item.name
                                                ? 'bg-naqupos-primary text-white border-naqupos-primary shadow-md'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-naqupos-primary hover:text-naqupos-primary'
                                                }`}
                                        >
                                            <item.icon size={20} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Pembayaran</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {paymentTypes.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, type: type.value as PaymentMethod['type'] }))}
                                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${formData.type === type.value
                                                ? 'border-naqupos-primary bg-naqupos-cream'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <type.icon size={20} className={formData.type === type.value ? 'text-naqupos-primary' : 'text-gray-400'} />
                                            <span className={`text-xs font-medium ${formData.type === type.value ? 'text-naqupos-primary' : 'text-gray-600'}`}>
                                                {type.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Keterangan singkat..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:ring-2 focus:ring-naqupos-primary/20 outline-none transition-all resize-none"
                                />
                            </div>

                            {/* Fee */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Biaya Admin (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={formData.fee}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:ring-2 focus:ring-naqupos-primary/20 outline-none transition-all"
                                />
                            </div>

                            {/* Bank Account (for transfer type) */}
                            {formData.type === 'transfer' && (
                                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                                    <p className="text-sm font-medium text-blue-800">Informasi Rekening</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 mb-1">No. Rekening</label>
                                            <input
                                                type="text"
                                                value={formData.accountNumber}
                                                onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                                placeholder="1234567890"
                                                className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white focus:border-blue-400 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 mb-1">Nama Pemilik</label>
                                            <input
                                                type="text"
                                                value={formData.accountName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                                                placeholder="PT Naqupos"
                                                className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white focus:border-blue-400 outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active Toggle */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                                    <div>
                                        <p className="font-medium text-gray-800">Status Aktif</p>
                                        <p className="text-sm text-gray-500 text-[10px]">Aktifkan metode ini</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                                        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                                    <div>
                                        <p className="font-medium text-blue-900">Booking Online</p>
                                        <p className="text-blue-600 text-[10px]">Tampilkan di App</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, is_online: !prev.is_online }))}
                                        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${formData.is_online ? 'bg-blue-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${formData.is_online ? 'translate-x-5' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                                    <div>
                                        <p className="font-medium text-emerald-900">Tampilkan di Kasir</p>
                                        <p className="text-emerald-600 text-[10px]">Tersedia di POS</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, is_cashier_enabled: !prev.is_cashier_enabled }))}
                                        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${formData.is_cashier_enabled ? 'bg-emerald-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${formData.is_cashier_enabled ? 'translate-x-5' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isProcessing || !formData.name || !formData.code || (!formData.is_global && formData.branch_ids.length === 0)}
                                className={`flex-1 py-3 rounded-xl font-medium transition-all ${isProcessing || !formData.name || !formData.code || (!formData.is_global && formData.branch_ids.length === 0)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-naqupos-primary to-[#E5BA73] text-white hover:shadow-lg hover:scale-[1.02]'
                                    }`}
                            >
                                {isProcessing ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Metode'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedMethod && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Metode?</h3>
                            <p className="text-gray-500">
                                Yakin ingin menghapus metode pembayaran <strong className="text-gray-700">{selectedMethod.name}</strong>?
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isProcessing}
                                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                            >
                                {isProcessing ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
