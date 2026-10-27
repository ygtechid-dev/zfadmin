/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api, type Branch } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import {
    Plus, Edit, Trash2, MapPin, Phone, Clock, X, AlertTriangle,
    Building2, Users, CheckCircle, XCircle, Search, Locate
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';

// Fix Leaflet Marker Icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function LocationMarker({ lat, lng, onLocationSelect }: { lat: string, lng: string, onLocationSelect: (lat: string, lng: string) => void }) {
    const map = useMap();

    useEffect(() => {
        const l = parseFloat(lat);
        const g = parseFloat(lng);
        if (!isNaN(l) && !isNaN(g)) {
            map.flyTo([l, g], map.getZoom());
        }
    }, [lat, lng, map]);

    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
        },
    });

    const l = parseFloat(lat);
    const g = parseFloat(lng);

    if (isNaN(l) || isNaN(g)) return null;

    return <Marker position={[l, g]} />;
}

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        phone: '',
        city: '',
        province: '',
        opening_time: '09:00',
        closing_time: '21:00',
        lat: '',
        lng: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Province & City Data
    const [provinces, setProvinces] = useState<any[]>([]);
    const [regencies, setRegencies] = useState<any[]>([]);
    const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
    const [isFetchingProvinces, setIsFetchingProvinces] = useState(false);
    const [isFetchingRegencies, setIsFetchingRegencies] = useState(false);

    // Pagination & Filter
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<number>(0);

    useEffect(() => {
        const syncBranch = () => {
            const saved = localStorage.getItem('naqupos_selected_branch') || 'all';
            if (saved === 'all') {
                setSelectedBranchFilter(0);
            } else {
                setSelectedBranchFilter(Number(saved));
            }
        };

        syncBranch();
        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, []);

    useEffect(() => {
        loadBranches();
        loadProvinces();
    }, []);

    const loadProvinces = async () => {
        setIsFetchingProvinces(true);
        try {
            const data = await api.getProvinces();
            setProvinces(data);
        } catch (error) {
            console.error('Failed to fetch provinces', error);
        } finally {
            setIsFetchingProvinces(false);
        }
    };

    const loadRegencies = async (provinceId: string) => {
        setIsFetchingRegencies(true);
        try {
            const data = await api.getRegencies(provinceId);
            setRegencies(data);
        } catch (error) {
            console.error('Failed to fetch regencies', error);
        } finally {
            setIsFetchingRegencies(false);
        }
    };

    useEffect(() => {
        if (selectedProvinceId) {
            loadRegencies(selectedProvinceId);
        } else {
            setRegencies([]);
        }
    }, [selectedProvinceId]);

    const loadBranches = async () => {
        try {
            const data = await api.getBranches();
            setBranches(data);
        } catch (error) {
            console.error('Failed to fetch branches', error);
        }
    };

    const filteredBranches = branches.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.address.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBranch = selectedBranchFilter === 0 || b.id === selectedBranchFilter;
        return matchesSearch && matchesBranch;
    });

    const getPaginatedData = (data: Branch[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedBranchFilter]);

    const openAddModal = () => {
        setFormData({ name: '', code: '', address: '', phone: '', city: '', province: '', opening_time: '09:00', closing_time: '21:00', lat: '', lng: '' });
        setSelectedProvinceId('');
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (branch: Branch) => {
        setSelectedBranch(branch);
        setFormData({
            name: branch.name,
            code: branch.code,
            address: branch.address,
            phone: branch.phone,
            city: branch.city,
            province: branch.province,
            opening_time: branch.opening_time ? branch.opening_time.substring(0, 5) : '09:00',
            closing_time: branch.closing_time ? branch.closing_time.substring(0, 5) : '21:00',
            lat: branch.latitude ? branch.latitude.toString() : '',
            lng: branch.longitude ? branch.longitude.toString() : ''
        });

        // Find province ID by name to load regencies
        const province = provinces.find(p => p.name === branch.province);
        if (province) {
            setSelectedProvinceId(province.id);
        }

        setIsEditing(true);
        setShowModal(true);
    };

    const openDeleteModal = (branch: Branch) => {
        setSelectedBranch(branch);
        setShowDeleteModal(true);
    };

    const validateField = (name: string, value: any) => {
        let error = '';

        switch (name) {
            case 'name':
                if (!value) error = 'Nama cabang harus diisi';
                else if (value.length < 3) error = 'Minimal 3 karakter';
                else if (value.length > 100) error = 'Maksimal 100 karakter';
                else if (!/[a-zA-Z]/.test(value)) error = 'Tidak boleh hanya angka/simbol';
                break;
            case 'code':
                if (!value) error = 'Kode cabang harus diisi';
                break;
            case 'address':
                if (!value) error = 'Alamat harus diisi';
                else if (value.length < 10) error = 'Minimal 10 karakter';
                break;
            case 'phone':
                if (!value) error = 'Nomor telepon harus diisi';
                else if (!/^(\+62|0)[1-9][0-9]{7,15}$/.test(value)) error = 'Format telepon tidak valid (Contoh: 021... atau 08... atau +628...)';
                break;
            case 'city':
                if (!value) error = 'Kota harus diisi';
                else if (!/^[a-zA-Z\s.]+$/.test(value)) error = 'Hanya huruf & spasi dan titik';
                break;
            case 'opening_time':
                if (!value) error = 'Jam buka harus diisi';
                break;
            case 'closing_time':
                if (!value) error = 'Jam tutup harus diisi';
                else if (formData.opening_time && value <= formData.opening_time) error = 'Jam tutup harus > jam buka';
                break;
            case 'lat':
                const latVal = parseFloat(value);
                if (value === '') error = 'Latitude harus diisi';
                else if (isNaN(latVal) || latVal < -90 || latVal > 90) error = 'Range: -90 s/d 90';
                break;
            case 'lng':
                const lngVal = parseFloat(value);
                if (value === '') error = 'Longitude harus diisi';
                else if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) error = 'Range: -180 s/d 180';
                break;
            case 'province':
                if (!value) error = 'Provinsi harus diisi';
                break;
        }

        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const closeModals = () => {
        setShowModal(false);
        setShowDeleteModal(false);
        setSelectedBranch(null);
        setErrors({});
    };

    const handleSave = async () => {
        // Run all validations
        const fields = ['name', 'code', 'address', 'province', 'city', 'phone', 'opening_time', 'closing_time', 'lat', 'lng'];
        let hasError = false;
        fields.forEach(field => {
            const err = validateField(field, (formData as any)[field]);
            if (err) hasError = true;
        });

        if (hasError) return toast.error('Harap perbaiki kesalahan pada form');

        setIsProcessing(true);

        const lat = parseFloat(formData.lat);
        const lng = parseFloat(formData.lng);

        const payload = {
            name: formData.name,
            code: formData.code,
            address: formData.address,
            phone: formData.phone,
            city: formData.city,
            province: formData.province,
            opening_time: formData.opening_time?.substring(0, 5),
            closing_time: formData.closing_time?.substring(0, 5),
            latitude: lat,
            longitude: lng,
            is_active: isEditing ? undefined : true
        };

        try {
            if (isEditing && selectedBranch) {
                await api.updateBranch(selectedBranch.id, payload);
                toast.success('Berhasil memperbarui cabang');
            } else {
                await api.createBranch(payload);
                toast.success('Berhasil menambahkan cabang');
            }
            await loadBranches();
            closeModals();
        } catch (error: any) {
            console.error('Save failed', error);
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0] as string[];
                toast.error(firstError[0] || 'Gagal menyimpan data');
            } else {
                const msg = error.response?.data?.message || error.message || 'Gagal menyimpan data';
                toast.error(msg);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBranch) return;
        setIsProcessing(true);
        try {
            await api.deleteBranch(selectedBranch.id);
            await loadBranches();
            closeModals();
            toast.success('Berhasil menghapus cabang');
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Gagal menghapus data');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleBranchStatus = async (branch: Branch) => {
        try {
            await api.updateBranch(branch.id, { is_active: !branch.is_active });
            loadBranches();
        } catch (error) {
            console.error('Update status failed', error);
        }
    };

    const activeBranches = branches.filter(b => b.is_active).length;
    const totalStaff = branches.reduce((sum, b) => sum + (b.therapists_count || 0), 0);
    const totalRooms = branches.reduce((sum, b) => sum + (b.rooms_count || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">Manajemen Cabang</h1>
                    <p className="text-gray-500 text-sm">Kelola lokasi dan outlet Naqupos Spa</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <SearchableSelect
                            value={selectedBranchFilter}
                            onChange={(val: string | number) => setSelectedBranchFilter(Number(val))}
                            options={[
                                { value: 0, label: 'Semua Cabang' },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                        />
                        {/* Chevron icon manually handled by select appearance or custom svg if needed */}
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                    >
                        <Plus size={18} />
                        <span>Tambah Cabang</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg"><Building2 size={20} className="text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-naqupos-dark">{branches.length}</p>
                            <p className="text-sm text-gray-500">Total Cabang</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{activeBranches}</p>
                            <p className="text-sm text-gray-500">Cabang Aktif</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg"><Users size={20} className="text-purple-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{totalStaff}</p>
                            <p className="text-sm text-gray-500">Total Staff</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg"><MapPin size={20} className="text-amber-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{totalRooms}</p>
                            <p className="text-sm text-gray-500">Total Ruangan</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari cabang..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getPaginatedData(filteredBranches).map(branch => (
                    <div key={branch.id} className={`bg-white rounded-xl border overflow-hidden transition-all ${branch.is_active ? 'border-gray-100' : 'border-gray-200 opacity-70'}`}>
                        <div className="h-32 bg-gradient-to-br from-naqupos-primary to-naqupos-accent flex items-center justify-center">
                            <Building2 size={48} className="text-white/50" />
                        </div>
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-medium text-naqupos-dark">{branch.name}</h3>
                                    <p className="text-xs text-gray-500">{branch.code}</p>
                                    <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${branch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {branch.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleBranchStatus(branch)}
                                    className={`p-1.5 rounded-lg transition-colors ${branch.is_active ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-100 hover:bg-gray-200'}`}
                                >
                                    {branch.is_active ? <CheckCircle size={18} className="text-green-600" /> : <XCircle size={18} className="text-gray-400" />}
                                </button>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span>{branch.address}, {branch.city}, {branch.province}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-gray-400" />
                                    <span>{branch.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-gray-400" />
                                    <span>{branch.opening_time?.substring(0, 5)} - {branch.closing_time?.substring(0, 5)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
                                <div className="flex items-center gap-1 text-gray-500">
                                    <Users size={14} />
                                    <span>{branch.therapists_count || 0} Staff</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                    <Building2 size={14} />
                                    <span>{branch.rooms_count || 0} Ruangan</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button onClick={() => openEditModal(branch)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1">
                                    <Edit size={14} /> Edit
                                </button>
                                <button onClick={() => openDeleteModal(branch)} className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredBranches.length > 0 && (
                <div className="mt-6 mb-20">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredBranches.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            {filteredBranches.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Tidak ada cabang ditemukan</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Cabang' : 'Tambah Cabang Baru'}
                            </h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Building2 size={16} className={`${errors.name ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                        Nama Cabang *
                                    </label>
                                    <input type="text" value={formData.name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData(f => ({
                                                ...f,
                                                name: val,
                                                code: isEditing ? f.code : val.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '')
                                            }));
                                            validateField('name', val);
                                        }}
                                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all shadow-sm ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-naqupos-primary'}`}
                                        placeholder="Naqupos Spa - Lokasi" />
                                    {errors.name && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <X size={16} className={`${errors.code ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                        Kode Cabang *
                                    </label>
                                    <input type="text" value={formData.code}
                                        onChange={(e) => {
                                            setFormData(f => ({ ...f, code: e.target.value }));
                                            validateField('code', e.target.value);
                                        }}
                                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all shadow-sm ${errors.code ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-naqupos-primary'}`}
                                        placeholder="ZSP-XYZ" />
                                    {errors.code && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.code}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <MapPin size={16} className={`${errors.address ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                    Alamat Lengkap *
                                </label>
                                <textarea value={formData.address}
                                    onChange={(e) => {
                                        setFormData(f => ({ ...f, address: e.target.value }));
                                        validateField('address', e.target.value);
                                    }}
                                    rows={2} placeholder="Jl. Terusan No. 123..."
                                    className={`w-full px-4 py-3 rounded-lg border outline-none resize-none transition-all shadow-sm ${errors.address ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-naqupos-primary'}`} />
                                {errors.address && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.address}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Building2 size={16} className={`${errors.province ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                        Provinsi *
                                    </label>
                                    <SearchableSelect
                                        placeholder="Pilih Provinsi"
                                        value={selectedProvinceId}
                                        onChange={(val) => {
                                            const provinceId = val.toString();
                                            setSelectedProvinceId(provinceId);
                                            const province = provinces.find(p => p.id === provinceId);
                                            setFormData(f => ({ ...f, province: province?.name || '', city: '' }));
                                            validateField('province', province?.name);
                                            setErrors(prev => ({ ...prev, city: '' }));
                                        }}
                                        options={provinces.map(p => ({ value: p.id, label: p.name }))}
                                        isLoading={isFetchingProvinces}
                                        className={errors.province ? 'border-red-500' : ''}
                                    />
                                    {errors.province && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.province}</p>}
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Building2 size={16} className={`${errors.city ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                        Kota *
                                    </label>
                                    <SearchableSelect
                                        placeholder={selectedProvinceId ? "Pilih Kota" : "Pilih Provinsi Dulu"}
                                        value={regencies.find(r => r.name === formData.city)?.id}
                                        onChange={(val) => {
                                            const regencyId = val.toString();
                                            const regency = regencies.find(r => r.id === regencyId);
                                            setFormData(f => ({ ...f, city: regency?.name || '' }));
                                            validateField('city', regency?.name);
                                        }}
                                        options={regencies.map(r => ({ value: r.id, label: r.name }))}
                                        isLoading={isFetchingRegencies}
                                        disabled={!selectedProvinceId}
                                        className={errors.city ? 'border-red-500' : ''}
                                    />
                                    {errors.city && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.city}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Phone size={16} className={`${errors.phone ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                    Telepon *
                                </label>
                                <input type="text" value={formData.phone}
                                    onChange={(e) => {
                                        setFormData(f => ({ ...f, phone: e.target.value }));
                                        validateField('phone', e.target.value);
                                    }}
                                    placeholder="0211234567"
                                    className={`w-full px-4 py-3 rounded-lg border outline-none transition-all shadow-sm ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-naqupos-primary'}`} />
                                {errors.phone && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.phone}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Clock size={16} className={`${errors.opening_time ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                        Jam Buka
                                    </label>
                                    <input type="time" value={formData.opening_time}
                                        onChange={(e) => {
                                            setFormData(f => ({ ...f, opening_time: e.target.value }));
                                            validateField('opening_time', e.target.value);
                                            if (formData.closing_time) validateField('closing_time', formData.closing_time);
                                        }}
                                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all shadow-sm ${errors.opening_time ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-naqupos-primary'}`} />
                                    {errors.opening_time && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.opening_time}</p>}
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Clock size={16} className={`${errors.closing_time ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                        Jam Tutup
                                    </label>
                                    <input type="time" value={formData.closing_time}
                                        onChange={(e) => {
                                            setFormData(f => ({ ...f, closing_time: e.target.value }));
                                            validateField('closing_time', e.target.value);
                                        }}
                                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all shadow-sm ${errors.closing_time ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-naqupos-primary'}`} />
                                    {errors.closing_time && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.closing_time}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Locate size={16} className={`${errors.lat ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                        Latitude
                                    </label>
                                    <input type="text" value={formData.lat}
                                        onChange={(e) => {
                                            setFormData(f => ({ ...f, lat: e.target.value }));
                                            validateField('lat', e.target.value);
                                        }}
                                        placeholder="-6.2088"
                                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all shadow-sm ${errors.lat ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-naqupos-primary'}`} />
                                    {errors.lat && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.lat}</p>}
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Locate size={16} className={`${errors.lng ? 'text-red-500' : 'text-naqupos-primary'}`} />
                                        Longitude
                                    </label>
                                    <input type="text" value={formData.lng}
                                        onChange={(e) => {
                                            setFormData(f => ({ ...f, lng: e.target.value }));
                                            validateField('lng', e.target.value);
                                        }}
                                        placeholder="106.8456"
                                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all shadow-sm ${errors.lng ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-naqupos-primary'}`} />
                                    {errors.lng && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.lng}</p>}
                                </div>
                            </div>
                            <div className="mt-4 h-[300px] w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (navigator.geolocation) {
                                            const options = {
                                                enableHighAccuracy: true,
                                                timeout: 10000,
                                                maximumAge: 0
                                            };

                                            navigator.geolocation.getCurrentPosition(
                                                (pos) => {
                                                    const lat = pos.coords.latitude.toString();
                                                    const lng = pos.coords.longitude.toString();
                                                    setFormData(f => ({ ...f, lat, lng }));
                                                    toast.success('Lokasi ditemukan');
                                                },
                                                (err) => {
                                                    console.warn(`ERROR(${err.code}): ${err.message}`);
                                                    // Retry with lower accuracy if high accuracy fails
                                                    console.log('Retrying with low accuracy...');
                                                    navigator.geolocation.getCurrentPosition(
                                                        (pos) => {
                                                            const lat = pos.coords.latitude.toString();
                                                            const lng = pos.coords.longitude.toString();
                                                            setFormData(f => ({ ...f, lat, lng }));
                                                            toast.success('Lokasi ditemukan (Low Accuracy)');
                                                        },
                                                        (retryErr) => {
                                                            console.error(retryErr);
                                                            let msg = 'Gagal mendapatkan lokasi.';
                                                            if (retryErr.code === 1) msg += ' Izin ditolak.';
                                                            else if (retryErr.code === 2) msg += ' Posisi tidak tersedia (pastikan GPS perizinan browser aktif).';
                                                            else if (retryErr.code === 3) msg += ' Waktu habis.';
                                                            toast.error(msg);
                                                        },
                                                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
                                                    );
                                                },
                                                options
                                            );
                                        } else {
                                            toast.error('Browser tidak mendukung geolokasi');
                                        }
                                    }}
                                    className="absolute top-3 right-3 z-[1000] bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-600 hover:text-naqupos-primary hover:bg-gray-50 transition-colors"
                                    title="Gunakan Lokasi Saat Ini"
                                >
                                    <Locate size={20} />
                                </button>
                                <MapContainer
                                    center={[parseFloat(formData.lat) || -6.200000, parseFloat(formData.lng) || 106.816666]}
                                    zoom={13}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <LocationMarker
                                        lat={formData.lat}
                                        lng={formData.lng}
                                        onLocationSelect={(lat, lng) => setFormData(f => ({ ...f, lat, lng }))}
                                    />
                                </MapContainer>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSave} disabled={isProcessing || !formData.name || !formData.address}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !formData.name || !formData.address ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Cabang')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedBranch && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Hapus Cabang</h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-red-800">Peringatan!</p>
                                <p className="text-sm text-red-600">Menghapus cabang akan menghapus semua data terkait.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                            <p className="font-bold text-naqupos-dark">{selectedBranch.name}</p>
                            <p className="text-sm text-gray-500">{selectedBranch.address}</p>
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
