import { useState, useEffect } from 'react';
import {
    Plus, Trash2, Edit2, Search, X, Check, Layout, AlertCircle,
    Wifi, Coffee, Bath, Tv, Waves, Utensils,
    Dumbbell, Music, Car, Bike, Wind, ShieldCheck,
    Thermometer, Trees, CheckCircle, Info
} from 'lucide-react';
import { api, type Facility, type Branch } from '../../services/api';
import { toast } from 'react-hot-toast';
import swal from '../../utils/swal';
import { SearchableSelect } from '../../components/common/SearchableSelect';

const AVAILABLE_ICONS = [
    { name: 'wifi', icon: Wifi, label: 'WiFi' },
    { name: 'coffee', icon: Coffee, label: 'Coffee' },
    { name: 'bath', icon: Bath, label: 'Bathtub' },
    { name: 'tv', icon: Tv, label: 'TV' },
    { name: 'waves', icon: Waves, label: 'Pool' },
    { name: 'utensils', icon: Utensils, label: 'Dining' },
    { name: 'dumbbell', icon: Dumbbell, label: 'Gym' },
    { name: 'music', icon: Music, label: 'Music' },
    { name: 'car', icon: Car, label: 'Parking' },
    { name: 'bike', icon: Bike, label: 'Bike' },
    { name: 'wind', icon: Wind, label: 'AC/Fan' },
    { name: 'shield-check', icon: ShieldCheck, label: 'Safe' },
    { name: 'thermometer', icon: Thermometer, label: 'Sauna/Heater' },
    { name: 'trees', icon: Trees, label: 'Garden' },
    { name: 'check-circle', icon: CheckCircle, label: 'Standard' },
];

export default function FacilitiesPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        icon: 'check-circle',
        branch_id: undefined as number | undefined,
        is_global: true
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [facilitiesData, branchesData] = await Promise.all([
                api.getFacilities(selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {}),
                api.getBranches()
            ]);
            setFacilities(facilitiesData);
            setBranches(branchesData);
        } catch (error) {
            toast.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedBranchId]);

    const handleOpenModal = (facility?: Facility) => {
        if (facility) {
            setEditingFacility(facility);
            setFormData({
                name: facility.name,
                icon: facility.icon || 'check-circle',
                branch_id: facility.branch_id,
                is_global: facility.is_global
            });
        } else {
            setEditingFacility(null);
            setFormData({
                name: '',
                icon: 'check-circle',
                branch_id: undefined,
                is_global: true
            });
        }
        setShowModal(true);
    };

    const isNameDuplicate = facilities.some(f =>
        f.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
        (!editingFacility || f.id !== editingFacility.id)
    );

    const isFormInvalid = !formData.name.trim() || isNameDuplicate || !formData.icon || (!formData.is_global && !formData.branch_id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormInvalid) return;

        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                branch_id: formData.is_global ? null : formData.branch_id
            };

            if (editingFacility) {
                await api.updateFacility(editingFacility.id, payload as any);
                toast.success('Fasilitas berhasil diperbarui');
            } else {
                await api.createFacility(payload as any);
                toast.success('Fasilitas berhasil ditambahkan');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error(editingFacility ? 'Gagal memperbarui fasilitas' : 'Gagal menambahkan fasilitas');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (facility: Facility) => {
        const result = await swal.confirm(
            `Apakah Anda yakin ingin menghapus fasilitas <strong>${facility.name}</strong>?`,
            'Hapus Fasilitas'
        );

        if (result.isConfirmed) {
            try {
                await api.deleteFacility(facility.id);
                toast.success('Fasilitas berhasil dihapus');
                fetchData();
            } catch (error) {
                toast.error('Gagal menghapus fasilitas');
            }
        }
    };

    const getIconComponent = (name: string, size: number = 18, className: string = "") => {
        const found = AVAILABLE_ICONS.find(i => i.name === name);
        const Icon = found ? found.icon : Layout;
        return <Icon size={size} className={className} />;
    };

    const filteredFacilities = facilities.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Master Fasilitas</h1>
                    <p className="text-gray-500">Kelola daftar fasilitas yang tersedia di cabang</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#C58940] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#A67536] transition-colors"
                >
                    <Plus size={20} />
                    <span>Tambah Fasilitas</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari fasilitas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#C58940] focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Filter Cabang:</span>
                        <div className="w-[200px]">
                            <SearchableSelect
                                value={selectedBranchId}
                                onChange={(val: string | number) => setSelectedBranchId(val.toString())}
                                options={[
                                    { value: 'all', label: 'Semua Cabang' },
                                    ...branches.map(b => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left">Nama Fasilitas</th>
                                <th className="px-6 py-4 text-left">Icon preview</th>
                                <th className="px-6 py-4 text-left">Cakupan</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-24 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredFacilities.length > 0 ? (
                                filteredFacilities.map((f) => (
                                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-800 font-medium">{f.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                {getIconComponent(f.icon || '', 14, "text-[#C58940]")}
                                                {AVAILABLE_ICONS.find(i => i.name === f.icon)?.label || f.icon}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {f.is_global ? (
                                                <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-bold">Global</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded bg-orange-50 text-orange-600 text-xs font-bold">{f.branch?.name || 'Cabang Spesifik'}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(f)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(f)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle size={40} />
                                            <p>Data fasilitas tidak ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">
                                    {editingFacility ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
                                </h3>
                                <p className="text-sm text-gray-500 font-medium mt-1">Lengkapi informasi fasilitas di bawah ini</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-gray-600 transition-all hover:rotate-90">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Nama Fasilitas</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Contoh: Sauna, Free WiFi, Coffee"
                                        className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none font-bold text-gray-700 transition-all ${isNameDuplicate ? 'border-red-300 focus:ring-red-100 focus:ring-4' : 'border-gray-100 focus:ring-4 focus:ring-naqupos-primary/10 focus:border-naqupos-primary'}`}
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                        {isNameDuplicate ? <AlertCircle size={20} className="text-red-500" /> : <Info size={20} className="text-gray-300" />}
                                    </div>
                                </div>
                                {isNameDuplicate && (
                                    <p className="mt-2 text-xs font-bold text-red-500 flex items-center gap-1.5 px-1 animate-in slide-in-from-top-1">
                                        <AlertCircle size={14} />
                                        Nama fasilitas ini sudah ada
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Pengaturan Cabang</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_global: true })}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-row items-center gap-3 ${formData.is_global ? 'border-naqupos-primary bg-naqupos-primary/5' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.is_global ? 'border-naqupos-primary bg-naqupos-primary' : 'border-gray-300'}`}>
                                            {formData.is_global && <Check size={14} className="text-white" />}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${formData.is_global ? 'text-naqupos-primary' : 'text-gray-500'}`}>Global</p>
                                            <p className="text-[10px] text-gray-400">Tersedia di semua cabang</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_global: false })}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-row items-center gap-3 ${!formData.is_global ? 'border-naqupos-primary bg-naqupos-primary/5' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${!formData.is_global ? 'border-naqupos-primary bg-naqupos-primary' : 'border-gray-300'}`}>
                                            {!formData.is_global && <Check size={14} className="text-white" />}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${!formData.is_global ? 'text-naqupos-primary' : 'text-gray-500'}`}>Pilih Cabang</p>
                                            <p className="text-[10px] text-gray-400">Hanya untuk cabang tertentu</p>
                                        </div>
                                    </button>
                                </div>

                                {!formData.is_global && (
                                    <div className="mt-4 animate-in slide-in-from-top-2">
                                        <SearchableSelect
                                            value={formData.branch_id}
                                            onChange={(val: string | number) => setFormData({ ...formData, branch_id: Number(val) })}
                                            options={branches.map(b => ({ value: b.id, label: b.name }))}
                                            placeholder="Pilih Cabang..."
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Pilih Icon</label>
                                <div className="grid grid-cols-5 gap-3 max-h-[160px] overflow-y-auto p-2 border border-gray-100 rounded-2xl bg-gray-50/30 scrollbar-thin scrollbar-thumb-gray-200">
                                    {AVAILABLE_ICONS.map((item) => (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, icon: item.name })}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 group ${formData.icon === item.name
                                                ? 'bg-naqupos-primary text-white shadow-lg shadow-naqupos-primary/30 scale-105'
                                                : 'bg-white border border-gray-100 text-gray-400 hover:border-naqupos-primary/50 hover:text-naqupos-primary hover:shadow-md'}`}
                                        >
                                            <item.icon size={22} className={`transition-transform duration-300 ${formData.icon === item.name ? 'scale-110' : 'group-hover:scale-110'}`} />
                                            <span className="text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isFormInvalid}
                                    className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl ${isFormInvalid
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed grayscale'
                                        : 'bg-naqupos-primary text-white hover:bg-naqupos-accent shadow-naqupos-primary/30 active:scale-95'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            <span>{editingFacility ? 'Simpan Perubahan' : 'Tambah Fasilitas'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
