import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import {
    Plus, Edit, Trash2, X, AlertTriangle, Search, Filter,
    DoorOpen, Users, Star, Wrench, CheckCircle, XCircle, Sparkles, Calendar, Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import EmptyState from '../../components/common/EmptyState';

interface Room {
    id: number;
    name: string;
    type: 'standard' | 'vvip';
    branch_id: number;
    branch?: { id: number; name: string };
    capacity: number;
    min_booking_capacity?: number;
    quantity: number;
    extra_charge: number;
    facilities: string[];
    status: 'available' | 'occupied' | 'maintenance';

    description?: string;
    is_global?: boolean;
    branch_ids?: number[];
    blocks?: RoomBlock[];
}

interface RoomBlock {
    id: number;
    room_id: number;
    branch_id?: number | null;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    reason?: string | null;
    is_active?: boolean;
}

interface RoomResponse {
    id: number;
    name: string;
    type?: string | null;
    branch_id: number;
    branch?: { id: number; name: string };
    is_active: boolean;
    status: 'available' | 'occupied' | 'maintenance';
    extra_charge: string | number;
    capacity: number;
    min_booking_capacity?: number | string | null;
    // Legacy/alternative keys some deployments return
    minimum_capacity?: number | string | null;
    min_capacity?: number | string | null;
    quantity: number;
    facilities: string | string[];
    description?: string;
    is_global?: boolean;
    branches?: { id: number; name: string }[];
    blocks?: RoomBlock[];
}



export default function RoomsPage() {
    const normalizeRoomType = (type?: string | null): 'standard' | 'vvip' => (
        type === 'standard' ? 'standard' : 'vvip'
    );

    const [rooms, setRooms] = useState<Room[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBranch, setFilterBranch] = useState<number | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState<{
        name: string;
        type: 'standard' | 'vvip';
        branch_id: number;
        capacity: number | string;
        min_booking_capacity: number | string;
        quantity: number | string;
        facilities: string[];
        extra_charge: number | string;
        description: string;
        is_global: boolean;
        branch_ids: number[];
    }>({
        name: '',
        type: 'standard',
        capacity: 1,
        min_booking_capacity: 1,
        quantity: 1,
        facilities: [] as string[],
        extra_charge: 0,
        description: '',
        branch_id: 0,
        is_global: true,
        branch_ids: []
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);

    const [allFacilities, setAllFacilities] = useState<any[]>([]);
    const today = new Date().toISOString().slice(0, 10);
    const [blockForm, setBlockForm] = useState({
        start_date: today,
        end_date: today,
        start_time: '09:00',
        end_time: '10:00',
        reason: 'Digunakan'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const [roomsData, branchesData, facilitiesData] = await Promise.all([
                api.getRooms(),
                api.getBranches().catch(() => []),
                api.getFacilities().catch(() => [])
            ]);

            const rawRooms = Array.isArray(roomsData) ? roomsData : (roomsData.data || []);

            // Map API response to frontend format
            const mappedRooms = rawRooms.map((item: RoomResponse) => ({
                id: item.id,
                name: item.name || 'Unknown Room',
                type: normalizeRoomType(item.type),
                branch_id: item.branch_id,
                branch: item.branch,
                status: item.is_active ? (item.status || 'available') : 'maintenance',
                extra_charge: parseFloat(String(item.extra_charge || 0)),
                capacity: item.capacity || 1,
                min_booking_capacity: Number(item.min_booking_capacity || item.minimum_capacity || item.min_capacity || (normalizeRoomType(item.type) === 'vvip' ? 2 : 1)),
                quantity: item.quantity || 1,
                facilities: (() => {
                    const f = item.facilities;
                    if (Array.isArray(f)) return f;
                    if (!f) return [];
                    if (typeof f === 'string') {
                        try {
                            return JSON.parse(f);
                        } catch {
                            return f.split(',').map((s: string) => s.trim());
                        }
                    }
                    return [];
                })(),
                description: item.description,
                is_global: !!item.is_global,
                branch_ids: item.branches ? item.branches.map((b: any) => b.id) : [],
                blocks: Array.isArray(item.blocks) ? item.blocks : []
            }));

            setRooms(mappedRooms);
            const branchList = Array.isArray(branchesData) ? branchesData : ((branchesData as { data: any[] }).data || []);
            setBranches(branchList);

            setAllFacilities(facilitiesData || []);

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
            console.error('Error loading data:', err);
            setRooms([]); // Fallback
        } finally {
            setLoading(false);
        }
    };

    const filteredRooms = rooms.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchBranch = filterBranch === 'all' || r.is_global || r.branch_ids?.includes(filterBranch);
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        return matchSearch && matchBranch && matchStatus;
    });

    const getPaginatedData = (data: Room[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterBranch, filterStatus]);

    const openAddModal = () => {
        setFormData({
            name: '',
            type: 'standard',
            capacity: 1,
            min_booking_capacity: 1,
            quantity: 1,
            facilities: [],
            extra_charge: 0,
            description: '',
            branch_id: 0,
            is_global: true,
            branch_ids: []
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (room: Room) => {
        setSelectedRoom(room);
        // Preserve the real values instead of collapsing everything to 1/2
        const capacity = Math.max(1, Math.floor(Number(room.capacity) || 1));
        const minBooking = Math.max(1, Math.min(Math.floor(Number(room.min_booking_capacity) || 1), capacity));
        setFormData({
            name: room.name,
            type: room.type,
            branch_id: room.branch_id,
            capacity,
            min_booking_capacity: minBooking,
            quantity: room.quantity || 1,
            facilities: [...room.facilities],
            extra_charge: room.extra_charge,
            description: room.description || '',
            is_global: !!room.is_global,
            branch_ids: room.branch_ids || []
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const openDeleteModal = (room: Room) => {
        setSelectedRoom(room);
        setShowDeleteModal(true);
    };

    const openBlockModal = (room: Room) => {
        setSelectedRoom(room);
        setBlockForm({
            start_date: today,
            end_date: today,
            start_time: '09:00',
            end_time: '10:00',
            reason: 'Digunakan'
        });
        setShowBlockModal(true);
    };

    const closeModals = () => {
        setShowModal(false);
        setShowBlockModal(false);
        setShowDeleteModal(false);
        setSelectedRoom(null);
    };

    const toggleFacility = (facility: string) => {
        setFormData(f => ({
            ...f,
            facilities: f.facilities.includes(facility)
                ? f.facilities.filter(fac => fac !== facility)
                : [...f.facilities, facility]
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            toast.error('Nama ruangan harus diisi');
            return;
        }

        if (!formData.type) {
            toast.error('Tipe ruangan harus dipilih');
            return;
        }

        const capacity = Number(formData.capacity);
        const minBookingCapacity = Number(formData.min_booking_capacity);
        const quantity = Number(formData.quantity);
        const extraCharge = Number(formData.extra_charge);

        if (!capacity || capacity < 1) {
            toast.error('Kapasitas/Unit minimal harus 1');
            return;
        }

        if (!minBookingCapacity || minBookingCapacity < 1) {
            toast.error('Minimal orang booking harus minimal 1');
            return;
        }

        if (minBookingCapacity > capacity) {
            toast.error('Minimal orang booking tidak boleh melebihi kapasitas ruangan');
            return;
        }

        if (![1, 2].includes(capacity) || minBookingCapacity !== capacity) {
            toast.error('Aturan booking tamu harus dipilih: 1 tamu saja atau khusus 2 tamu');
            return;
        }

        if (!quantity || quantity < 1) {
            toast.error('Jumlah Unit (Qty) minimal harus 1');
            return;
        }

        const payload = {
            ...formData,
            capacity,
            min_booking_capacity: minBookingCapacity,
            quantity,
            facilities: formData.facilities.join(', '),
            extra_charge: isNaN(extraCharge) ? 0 : extraCharge,
            branch_ids: formData.is_global ? [] : formData.branch_ids
        };

        setIsProcessing(true);
        try {
            if (isEditing && selectedRoom) {
                await api.updateRoom(selectedRoom.id, payload);
                toast.success('Berhasil memperbarui ruangan');
            } else {
                await api.createRoom(payload);
                toast.success('Berhasil menambahkan ruangan');
            }
            await loadData();
            closeModals();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save room');
            console.error('Error saving room:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedRoom) return;
        setIsProcessing(true);
        try {
            await api.deleteRoom(selectedRoom.id);
            await loadData();
            closeModals();
            toast.success('Berhasil menghapus ruangan');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete room');
            console.error('Error deleting room:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const changeStatus = async (id: number, status: Room['status']) => {
        try {
            await api.updateRoom(id, { status });
            await loadData();
            toast.success('Status ruangan diperbarui');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update status');
            console.error('Error updating status:', err);
        }
    };

    const handleCreateBlock = async () => {
        if (!selectedRoom) return;
        if (!blockForm.start_date || !blockForm.end_date || !blockForm.start_time || !blockForm.end_time) {
            toast.error('Tanggal dan jam blokir harus lengkap');
            return;
        }
        if (blockForm.end_date < blockForm.start_date) {
            toast.error('Tanggal sampai tidak boleh sebelum tanggal dari');
            return;
        }
        if (blockForm.end_time <= blockForm.start_time) {
            toast.error('Jam sampai harus setelah jam dari');
            return;
        }

        setIsProcessing(true);
        try {
            await api.createRoomBlock(selectedRoom.id, {
                ...blockForm,
                branch_id: selectedRoom.is_global ? null : (selectedRoom.branch_ids?.[0] || selectedRoom.branch_id || null)
            });
            await loadData();
            setShowBlockModal(false);
            setSelectedRoom(null);
            toast.success('Jadwal penggunaan ruangan berhasil dibuat');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Gagal membuat jadwal penggunaan ruangan');
            console.error('Error creating room block:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteBlock = async (roomId: number, blockId: number) => {
        setIsProcessing(true);
        try {
            await api.deleteRoomBlock(roomId, blockId);
            await loadData();
            toast.success('Jadwal penggunaan ruangan dihapus');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Gagal menghapus jadwal penggunaan');
            console.error('Error deleting room block:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

    const getRoomBookingRuleLabel = (room: Pick<Room, 'capacity' | 'min_booking_capacity'>) => {
        const capacity = Number(room.capacity || 1);
        const minBookingCapacity = Number(room.min_booking_capacity || 1);
        return minBookingCapacity >= 2 && capacity >= 2 ? 'Khusus 2 Tamu' : '1 Tamu Saja';
    };



    const getStatusBadge = (status: Room['status']) => {
        switch (status) {
            case 'available': return { bg: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Tersedia' };
            case 'occupied': return { bg: 'bg-red-100 text-red-700', icon: XCircle, label: 'Digunakan' };
            case 'maintenance': return { bg: 'bg-amber-100 text-amber-700', icon: Wrench, label: 'Maintenance' };
            default: return { bg: 'bg-gray-100 text-gray-700', icon: Sparkles, label: 'Unknown' };
        }
    };

    const formatBlockDate = (value: string) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatBlockTime = (value: string) => (value || '').slice(0, 5);

    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-naqupos-primary mx-auto"></div>
                    <p className="mt-4 text-gray-500">Memuat data ruangan...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Galat: {error}</p>
                <button
                    onClick={loadData}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                    Coba lagi
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">Manajemen Ruangan</h1>
                    <p className="text-gray-500 text-sm">Kelola ruangan dan fasilitas spa</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                >
                    <Plus size={18} />
                    <span>Tambah Ruangan</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg"><DoorOpen size={20} className="text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-naqupos-dark">{totalRooms}</p>
                            <p className="text-sm text-gray-500">Total Ruangan</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{availableRooms}</p>
                            <p className="text-sm text-gray-500">Tersedia</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg"><Star size={20} className="text-amber-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{maintenanceRooms}</p>
                            <p className="text-sm text-gray-500">Perbaikan</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg"><Sparkles size={20} className="text-purple-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{branches.length}</p>
                            <p className="text-sm text-gray-500">Cabang</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari ruangan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <div className="w-[180px]">
                            <SearchableSelect
                                value={filterBranch === 'all' ? 'all' : filterBranch}
                                onChange={(val: string | number) => setFilterBranch(val === 'all' ? 'all' : Number(val))}
                                options={[
                                    { value: 'all', label: 'Semua Cabang' },
                                    ...branches.map(b => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>

                        <div className="w-[180px]">
                            <SearchableSelect
                                value={filterStatus}
                                onChange={(val: string | number) => setFilterStatus(val.toString())}
                                options={[
                                    { value: 'all', label: 'Semua Status' },
                                    { value: 'available', label: 'Tersedia' },
                                    { value: 'occupied', label: 'Digunakan' },
                                    { value: 'maintenance', label: 'Perbaikan' }
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Room Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.length > 0 ? (
                    getPaginatedData(filteredRooms).map(room => {
                        const statusInfo = getStatusBadge(room.status);
                        const StatusIcon = statusInfo.icon;
                        const activeBlocks = (room.blocks || []).filter(block => block.is_active !== false);
                        return (
                            <div key={room.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                <div className="h-24 flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600">
                                    <DoorOpen size={36} className="text-white/50" />
                                </div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-medium text-naqupos-dark">{room.name}</h3>
                                            {room.is_global ? (
                                                <span className="px-2 py-0.5 bg-naqupos-cream text-naqupos-primary text-[10px] font-bold rounded uppercase tracking-wider border border-naqupos-primary/20">Global</span>
                                            ) : room.branch_ids && room.branch_ids.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {room.branch_ids.length === branches.length ? (
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">Semua Cabang</span>
                                                    ) : (
                                                        room.branch_ids.map(bid => {
                                                            const b = branches.find(br => br.id === bid);
                                                            return b ? (
                                                                <span key={bid} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{b.name}</span>
                                                            ) : null;
                                                        })
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400">Tidak ada cabang</p>
                                            )}
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                                            Kapasitas: {room.capacity} | Jumlah: {room.quantity}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusInfo.bg}`}>
                                            <StatusIcon size={12} />
                                            {statusInfo.label}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1 uppercase">
                                            <DoorOpen size={12} />
                                            {room.type}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Users size={12} />
                                            {getRoomBookingRuleLabel(room)}
                                        </span>
                                    </div>

                                    <p className="text-lg font-bold text-naqupos-primary mb-3">
                                        {room.extra_charge > 0 ? `+${formatCurrency(room.extra_charge)}` : 'Gratis'}
                                    </p>

                                    {room.facilities.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {room.facilities.slice(0, 4).map(f => (
                                                <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{f}</span>
                                            ))}
                                            {room.facilities.length > 4 && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">+{room.facilities.length - 4}</span>
                                            )}
                                        </div>
                                    )}

                                    {activeBlocks.length > 0 && (
                                        <div className="mb-3 rounded-lg border border-red-100 bg-red-50/60 p-3 space-y-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                                                <Clock size={13} />
                                                Jadwal digunakan
                                            </div>
                                            {activeBlocks.slice(0, 2).map(block => (
                                                <div key={block.id} className="flex items-start justify-between gap-2 text-[11px] text-red-700">
                                                    <div>
                                                        <p className="font-semibold">
                                                            {formatBlockDate(block.start_date)} - {formatBlockDate(block.end_date)}
                                                        </p>
                                                        <p>{formatBlockTime(block.start_time)} - {formatBlockTime(block.end_time)}{block.reason ? ` • ${block.reason}` : ''}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={isProcessing}
                                                        onClick={() => handleDeleteBlock(room.id, block.id)}
                                                        className="p-1 rounded hover:bg-red-100 text-red-500"
                                                        title="Hapus jadwal digunakan"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {activeBlocks.length > 2 && (
                                                <p className="text-[11px] font-medium text-red-500">+{activeBlocks.length - 2} jadwal lainnya</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Status Actions */}
                                    <div className="flex gap-1 mb-3 pt-3 border-t border-gray-100">
                                        <button onClick={() => changeStatus(room.id, 'available')}
                                            className={`flex-1 py-1.5 text-xs rounded-lg border ${room.status === 'available' ? 'bg-green-100 border-green-300 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            Tersedia
                                        </button>
                                        <button onClick={() => openBlockModal(room)}
                                            className={`flex-1 py-1.5 text-xs rounded-lg border ${room.status === 'occupied' || activeBlocks.length > 0 ? 'bg-red-100 border-red-300 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            Digunakan
                                        </button>
                                        <button onClick={() => changeStatus(room.id, 'maintenance')}
                                            className={`flex-1 py-1.5 text-xs rounded-lg border ${room.status === 'maintenance' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            Perbaikan
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(room)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1">
                                            <Edit size={14} /> Edit
                                        </button>
                                        <button onClick={() => openDeleteModal(room)} className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full">
                        <EmptyState
                            title="Belum ada ruangan"
                            message="Tidak ditemukan data ruangan untuk kriteria ini."
                            icon={DoorOpen}
                        />
                    </div>
                )}
            </div>

            {filteredRooms.length > 0 && (
                <div className="mt-6 mb-20">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredRooms.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            {filteredRooms.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <DoorOpen size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Tidak ada ruangan ditemukan</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
                            </h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Ruangan *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Contoh: Ruangan 101" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Ruangan *</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => {
                                        const nextType = e.target.value as 'standard' | 'vvip';
                                        setFormData(f => ({
                                            ...f,
                                            type: nextType,
                                            min_booking_capacity: nextType === 'vvip' && Number(f.min_booking_capacity) < 2 ? 2 : f.min_booking_capacity,
                                            capacity: nextType === 'vvip' && Number(f.capacity) < 2 ? 2 : f.capacity
                                        }));
                                    }}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none bg-white"
                                >
                                    <option value="standard">Standard</option>
                                    <option value="vvip">VVIP</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Multiple Selection)</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition-all group">
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
                                        <div>
                                            <p className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</p>
                                            <p className="text-xs text-gray-500">Ruangan ini akan tersedia di seluruh cabang</p>
                                        </div>
                                    </label>

                                    {!formData.is_global && (
                                        <div className="pt-2 mt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {branches.map(branch => (
                                                <label key={branch.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white transition-all border border-transparent hover:border-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.branch_ids.includes(branch.id)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            const newBranchIds = checked
                                                                ? [...formData.branch_ids, branch.id]
                                                                : formData.branch_ids.filter(id => id !== branch.id);

                                                            // Auto-check global if all branches are now selected
                                                            if (newBranchIds.length === branches.length) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    is_global: true,
                                                                    branch_ids: []
                                                                }));
                                                            } else {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    branch_ids: newBranchIds
                                                                }));
                                                            }
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Aturan Booking Tamu</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        {
                                            value: 1,
                                            title: '1 Tamu Saja',
                                            desc: 'Ruangan hanya untuk booking sendiri.'
                                        },
                                        {
                                            value: 2,
                                            title: 'Khusus 2 Tamu',
                                            desc: 'Contoh VVIP/couple, tidak bisa dibooking 1 orang.'
                                        }
                                    ].map(option => {
                                        const isActive = Number(formData.min_booking_capacity) === option.value && Number(formData.capacity) === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setFormData(f => ({
                                                    ...f,
                                                    capacity: option.value,
                                                    min_booking_capacity: option.value
                                                }))}
                                                className={`p-3 rounded-xl border text-left transition-all ${isActive
                                                    ? 'border-naqupos-primary bg-naqupos-cream/50 text-naqupos-primary shadow-sm'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-naqupos-primary/40'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isActive ? 'border-naqupos-primary' : 'border-gray-300'}`}>
                                                        {isActive && <div className="w-2 h-2 rounded-full bg-naqupos-primary" />}
                                                    </div>
                                                    <span className="font-bold text-sm">{option.title}</span>
                                                </div>
                                                <p className="text-[11px] mt-1 opacity-70 leading-snug">{option.desc}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Biaya Ekstra</label>
                                    <CurrencyInput
                                        value={formData.extra_charge}
                                        onChange={(val) => setFormData(f => ({ ...f, extra_charge: val }))}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Unit (Qty)</label>
                                    <CurrencyInput
                                        value={formData.quantity}
                                        onChange={(val) => setFormData(f => ({ ...f, quantity: val }))}
                                        placeholder="1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fasilitas (dari Master Fasilitas)</label>
                                {(() => {
                                    const availableFacilities = allFacilities.filter(f =>
                                        f.is_global || (formData.is_global ? false : formData.branch_ids.includes(f.branch_id))
                                    );
                                    if (availableFacilities.length > 0) {
                                        return (
                                            <div className="flex flex-wrap gap-2">
                                                {availableFacilities.map((f: any) => (
                                                    <button key={f.id} type="button" onClick={() => toggleFacility(f.name)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${formData.facilities.includes(f.name) ? 'bg-naqupos-primary text-white border-naqupos-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                                        {f.name}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return <p className="text-sm text-gray-500 italic">Tidak ada fasilitas yang tersedia untuk cabang yang dipilih.</p>;
                                })()}
                                <p className="text-sm text-gray-500 italic">Belum ada data fasilitas. Silakan tambahkan di Master Data {'>'} Fasilitas.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                <textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                                    rows={2} placeholder="Deskripsi ruangan..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSubmit}
                                disabled={
                                    isProcessing ||
                                    !formData.name ||
                                    !formData.type ||
                                    !formData.capacity ||
                                    !formData.min_booking_capacity ||
                                    !formData.quantity ||
                                    (!formData.is_global && formData.branch_ids.length === 0) ||
                                    formData.facilities.length === 0 // Wajib pilih minimal 1 fasilitas
                                }
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ||
                                    !formData.name ||
                                    !formData.type ||
                                    !formData.capacity ||
                                    !formData.min_booking_capacity ||
                                    !formData.quantity ||
                                    (!formData.is_global && formData.branch_ids.length === 0) ||
                                    formData.facilities.length === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                    }`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Ruangan')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Room Block Modal */}
            {showBlockModal && selectedRoom && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-xl font-bold text-naqupos-dark">Jadwalkan Ruangan Digunakan</h3>
                                <p className="text-sm text-gray-500 mt-1">{selectedRoom.name}</p>
                            </div>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                                        <Calendar size={14} /> Dari Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={blockForm.start_date}
                                        onChange={(e) => setBlockForm(f => ({
                                            ...f,
                                            start_date: e.target.value,
                                            end_date: f.end_date < e.target.value ? e.target.value : f.end_date
                                        }))}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                                        <Calendar size={14} /> Sampai Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={blockForm.end_date}
                                        min={blockForm.start_date}
                                        onChange={(e) => setBlockForm(f => ({ ...f, end_date: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                                        <Clock size={14} /> Dari Jam
                                    </label>
                                    <input
                                        type="time"
                                        value={blockForm.start_time}
                                        onChange={(e) => setBlockForm(f => ({ ...f, start_time: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                                        <Clock size={14} /> Sampai Jam
                                    </label>
                                    <input
                                        type="time"
                                        value={blockForm.end_time}
                                        onChange={(e) => setBlockForm(f => ({ ...f, end_time: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                                <input
                                    type="text"
                                    value={blockForm.reason}
                                    onChange={(e) => setBlockForm(f => ({ ...f, reason: e.target.value }))}
                                    placeholder="Contoh: Digunakan / Reservasi offline / Perawatan"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary"
                                />
                            </div>

                            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
                                Ruangan ini akan dianggap tidak tersedia pada tanggal dan jam tersebut.
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">
                                Batal
                            </button>
                            <button
                                onClick={handleCreateBlock}
                                disabled={isProcessing}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                            >
                                {isProcessing ? 'Menyimpan...' : 'Simpan Jadwal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedRoom && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Hapus Ruangan</h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-red-800">Peringatan!</p>
                                <p className="text-sm text-red-600">Data ruangan akan dihapus permanen.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                            <p className="font-bold text-naqupos-dark">{selectedRoom.name}</p>
                            <p className="text-sm text-gray-500">{selectedRoom.branch?.name || 'Semua Cabang (Global)'}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closeModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleDelete} disabled={isProcessing}
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
