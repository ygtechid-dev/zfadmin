import { Plus, Trash2, Search, Calendar, AlertTriangle, X, Edit, Play, Pause, Image as ImageIcon, Users, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import swal from '../../utils/swal';

interface Campaign {
    id: number;
    name: string;
    type: string;
    sent: number;
    opened: number;
    converted: number;
    status: 'active' | 'paused';
    targetAudience?: string;
    message?: string;
    startDate?: string;
    endDate?: string;
    image_url?: string;
}

interface CampaignResponse {
    id: number;
    name: string;
    type: string;
    sent: number;
    opened: number;
    converted: number;
    status: 'active' | 'paused';
    target_audience?: string;
    message?: string;
    start_date?: string;
    end_date?: string;
    image_url?: string;
}

export default function CampaignPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || 'all');
    const [branchFilter, setBranchFilter] = useState<string | number>('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState<'kampanye' | 'tipe'>('kampanye');
    const [campaignTypes, setCampaignTypes] = useState<any[]>([]);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showDeleteTypeModal, setShowDeleteTypeModal] = useState(false);
    const [selectedType, setSelectedType] = useState<any>(null);
    const [typeForm, setTypeForm] = useState({ name: '' });

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [campaignTypeOptions, setCampaignTypeOptions] = useState<{ value: string; label: string }[]>([]);
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchFilter, setSearchFilter] = useState('');

    // Target Audience Options
    const [targetAudienceOptions] = useState<{ value: string; label: string }[]>([
        { value: 'all', label: 'Semua Pelanggan' },
        { value: 'active', label: 'Pelanggan Aktif' },
        { value: 'inactive', label: 'Pelanggan Tidak Aktif' },
        { value: 'vip', label: 'Pelanggan VIP' },
        { value: 'new', label: 'Pelanggan Baru' },
        { value: 'birthday', label: 'Ulang Tahun Bulan Ini' }
    ]);

    // Modal states
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    // Campaign Form
    const [campaignForm, setCampaignForm] = useState({
        name: '', type: 'promo', targetAudience: '', message: '', branchId: '', startDate: '', endDate: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [audienceCount, setAudienceCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchAudience = async () => {
            if (!campaignForm.targetAudience) {
                setAudienceCount(null);
                return;
            }
            try {
                const res = await api.previewAudience({
                    target_audience: campaignForm.targetAudience,
                    branch_id: campaignForm.branchId || 'all'
                });
                setAudienceCount(res.count);
            } catch (e) {
                console.error("Failed to estimate audience", e);
            }
        };
        fetchAudience();
    }, [campaignForm.targetAudience, campaignForm.branchId]);

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
                const saved = localStorage.getItem('naqupos_selected_branch') || 'all';
                setGlobalBranchId(saved);
                setBranchFilter(saved === 'all' ? 'all' : Number(saved));
            } catch (error) {
                console.error("Failed to load branches", error);
            }
        };
        loadBranches();
    }, []);

    useEffect(() => {
        const syncBranch = () => {
            const saved = localStorage.getItem('naqupos_selected_branch') || 'all';
            setGlobalBranchId(saved);
            setBranchFilter(saved === 'all' ? 'all' : Number(saved));
        };
        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, []);

    const fetchCampaignTypes = async () => {
        try {
            const res = await api.getCampaignTypes();
            setCampaignTypes(res);
            setCampaignTypeOptions(res.map((c: any) => ({ value: c.name, label: c.name })));
        } catch (e) {
            console.error("Failed to load campaign types", e);
        }
    };

    // Load campaign types
    useEffect(() => {
        fetchCampaignTypes();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadData();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [branchFilter, page, perPage, statusFilter, dateFilter, typeFilter, searchFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const params: any = {
                page,
                limit: perPage,
                branch_id: branchFilter !== 'all' ? branchFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                start_date: dateFilter.start || undefined,
                end_date: dateFilter.end || undefined
            };

            if (typeFilter !== 'all') {
                params.type = typeFilter;
            }
            if (searchFilter) {
                params.search = searchFilter;
            }

            const res = await api.getCampaigns(params).catch(() => ({ data: [], total: 0 }));
            const data = Array.isArray(res) ? res : (res.data || []);
            setTotalItems(res.total || data.length);

            setCampaigns(data.map((c: CampaignResponse) => ({
                ...c,
                targetAudience: c.target_audience,
                startDate: c.start_date || '',
                endDate: c.end_date || '',
                image_url: c.image_url
            })));

            // Fallback: Populate types from data if master list is empty
            if (campaignTypeOptions.length === 0 && data.length > 0) {
                const uniqueTypes: string[] = Array.from(new Set(data.map((c: any) => c.type).filter(Boolean)));
                if (uniqueTypes.length > 0) {
                    setCampaignTypeOptions(uniqueTypes.map(t => ({ value: t, label: t })));
                }
            }

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaignType = async ({ label }: { label: string }) => {
        try {
            const data = await api.createCampaignType({ name: label });
            const types = await api.getCampaignTypes();
            setCampaignTypeOptions(types.map((c: any) => ({ value: c.name, label: c.name })));
            return { value: data.name, label: data.name };
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    const closeAllModals = () => {
        setShowAddEditModal(false);
        setShowDeleteModal(false);
        setSelectedCampaign(null);
    };

    const openAddCampaign = () => {
        setCampaignForm({ name: '', type: 'promo', targetAudience: '', message: '', branchId: '', startDate: '', endDate: '' });
        setImageFile(null);
        setImagePreview('');
        setAudienceCount(null);
        setIsEditing(false);
        setShowAddEditModal(true);
    };

    const openEditCampaign = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        const toLocalISO = (dateStr: string | undefined) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };

        setCampaignForm({
            name: campaign.name, type: campaign.type,
            targetAudience: campaign.targetAudience || '', message: campaign.message || '',
            branchId: (campaign as any).branch_id?.toString() || '',
            startDate: toLocalISO(campaign.startDate),
            endDate: toLocalISO(campaign.endDate)
        });
        setImageFile(null);
        setImagePreview(campaign.image_url || '');
        setIsEditing(true);
        setShowAddEditModal(true);
    };

    const openDeleteCampaign = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setShowDeleteModal(true);
    };

    const handleSaveCampaign = async () => {
        if (!campaignForm.name) return;
        setIsProcessing(true);

        try {
            const payload = {
                name: campaignForm.name,
                type: campaignForm.type,
                target_audience: campaignForm.targetAudience,
                message: campaignForm.message,
                branch_id: campaignForm.branchId || null,
                start_date: campaignForm.startDate || null,
                end_date: campaignForm.endDate || null
            };

            let savedCampaignId = null;

            if (isEditing && selectedCampaign) {
                await api.updateCampaign(selectedCampaign.id, payload);
                savedCampaignId = selectedCampaign.id;
                swal.success('Kampanye berhasil diperbarui');
            } else {
                const res = await api.createCampaign(payload);
                savedCampaignId = res.id;
                swal.success('Kampanye berhasil ditambahkan');
            }

            if (savedCampaignId && imageFile) {
                await api.uploadCampaignImage(savedCampaignId, imageFile);
            }

            await loadData();
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menyimpan kampanye');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCampaign = async () => {
        if (!selectedCampaign) return;
        setIsProcessing(true);
        try {
            await api.deleteCampaign(selectedCampaign.id);
            swal.success('Kampanye berhasil dihapus');
            await loadData();
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menghapus kampanye');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleStatus = async (campaign: Campaign) => {
        try {
            await api.toggleCampaignStatus(campaign.id);
            swal.success('Status kampanye berhasil diubah');
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c));
        } catch (e: any) {
            swal.error(e.message || 'Gagal mengubah status kampanye');
        }
    };

    const closeTypeModals = () => {
        setShowTypeModal(false);
        setShowDeleteTypeModal(false);
        setSelectedType(null);
    };

    const handleSaveType = async () => {
        if (!typeForm.name) return;
        setIsProcessing(true);
        try {
            if (isEditing && selectedType) {
                await api.updateCampaignType(selectedType.id, { name: typeForm.name });
                swal.success('Tipe kampanye berhasil diperbarui');
            } else {
                await api.createCampaignType({ name: typeForm.name });
                swal.success('Tipe kampanye berhasil ditambahkan');
            }
            await fetchCampaignTypes();
            closeTypeModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menyimpan tipe kampanye');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteType = async () => {
        if (!selectedType) return;
        setIsProcessing(true);
        try {
            await api.deleteCampaignType(selectedType.id);
            swal.success('Tipe kampanye berhasil dihapus');
            await fetchCampaignTypes();
            closeTypeModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menghapus tipe kampanye');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-naqupos-dark">Kampanye</h1>
                    <p className="text-gray-500 text-sm">Kelola kampanye pemasaran untuk pelanggan.</p>
                </div>

                {globalBranchId === 'all' && (
                    <div className="bg-white p-1.5 rounded-2xl border border-naqupos-primary/20 shadow-sm self-start md:self-auto">
                        <BranchSelector
                            selectedBranchId={branchFilter === 'all' ? null : Number(branchFilter)}
                            onBranchChange={(id) => {
                                setBranchFilter(id || 'all');
                                setPage(1);
                            }}
                            showAllOption={true}
                        />
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('kampanye')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'kampanye' ? 'border-[#C58940] text-[#B07835]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Kampanye
                </button>
                <button
                    onClick={() => setActiveTab('tipe')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tipe' ? 'border-[#C58940] text-[#B07835]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Tipe Kampanye
                </button>
            </div>

            {activeTab === 'kampanye' && (
                <>
                    {/* Actions & Filters */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium min-w-[60px]">
                                <Search size={16} />
                                Filter:
                            </div>
                            <div className="w-[180px]">
                                <SearchableSelect
                                    value={statusFilter}
                                    onChange={(val) => setStatusFilter(val as any)}
                                    options={[
                                        { value: 'all', label: 'Semua Status' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'paused', label: 'Paused' },
                                        { value: 'completed', label: 'Completed' }
                                    ]}
                                    placeholder="Semua Status"
                                />
                            </div>

                            <div className="w-[200px]">
                                <SearchableSelect
                                    value={typeFilter}
                                    onChange={(val) => setTypeFilter(String(val))}
                                    options={[
                                        { value: 'all', label: 'Semua Tipe' },
                                        ...campaignTypeOptions
                                    ]}
                                    placeholder="Semua Tipe"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 h-[42px]">
                                <Calendar size={14} className="text-gray-400" />
                                <input
                                    type="date"
                                    value={dateFilter.start}
                                    onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                                    className="text-xs bg-transparent outline-none w-24 text-gray-600"
                                />
                                <span className="text-gray-300">|</span>
                                <input
                                    type="date"
                                    value={dateFilter.end}
                                    onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                                    className="text-xs bg-transparent outline-none w-24 text-gray-600"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 h-[42px] min-w-[200px]">
                                <Search size={14} className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari kampanye..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    className="text-sm bg-transparent outline-none w-full text-gray-600 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <button
                            onClick={openAddCampaign}
                            className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2.5 rounded-xl hover:bg-naqupos-accent transition-colors shadow-lg shadow-naqupos-primary/20"
                        >
                            <Plus size={18} />
                            <span>Buat Kampanye</span>
                        </button>
                    </div>

                    {/* Content (Grid) */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100">
                            <div className="w-12 h-12 border-4 border-naqupos-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-500 font-medium">Memuat data...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
                            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                            <h3 className="text-lg font-bold text-red-800 mb-2">Terjadi Kesalahan</h3>
                            <p className="text-red-600 mb-6">{error}</p>
                            <button onClick={() => loadData()} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {campaigns.length === 0 ? (
                                <div className="col-span-3 py-20 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                                    Belum ada kampanye
                                </div>
                            ) : campaigns.map(campaign => (
                                <div key={campaign.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-medium text-naqupos-dark">{campaign.name}</p>
                                            <span className="text-xs text-gray-500 uppercase">{campaign.type}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {campaign.status === 'active' ? 'Aktif' : 'Paused'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                        <div>
                                            <p className="text-lg font-bold text-naqupos-dark">{campaign.sent}</p>
                                            <p className="text-xs text-gray-500">Terkirim</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-blue-600">{campaign.opened}</p>
                                            <p className="text-xs text-gray-500">Dibuka</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-green-600">{campaign.converted}</p>
                                            <p className="text-xs text-gray-500">Konversi</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <button onClick={() => handleToggleStatus(campaign)} className={`px-3 py-2 text-sm border rounded-lg transition-colors flex items-center justify-center ${campaign.status === 'active' ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`} title={campaign.status === 'active' ? 'Pause Kampanye' : 'Aktifkan Kampanye'}>
                                            {campaign.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                        <button onClick={() => openEditCampaign(campaign)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                                        <button onClick={() => openDeleteCampaign(campaign)} className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add/Edit Modal */}
                    {showAddEditModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                                <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                                    <h3 className="text-xl font-bold text-naqupos-dark">
                                        {isEditing ? 'Edit Kampanye' : 'Buat Kampanye Baru'}
                                    </h3>
                                    <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nama Kampanye *</label>
                                        <input type="text" value={campaignForm.name} onChange={(e) => setCampaignForm(c => ({ ...c, name: e.target.value }))}
                                            placeholder="Contoh: Promo Akhir Tahun" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Opsional)</label>
                                        <SearchableSelect
                                            value={campaignForm.branchId}
                                            onChange={(val) => setCampaignForm(c => ({ ...c, branchId: String(val) }))}
                                            options={[
                                                { value: '', label: 'Semua Cabang' },
                                                ...branches.map(branch => ({ value: branch.id.toString(), label: branch.name }))
                                            ]}
                                            placeholder="Semua Cabang"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal & Waktu Mulai (Opsional)</label>
                                            <input type="datetime-local" value={campaignForm.startDate}
                                                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                                onChange={(e) => setCampaignForm(c => ({ ...c, startDate: e.target.value, endDate: e.target.value > c.endDate ? e.target.value : c.endDate }))}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal & Waktu Selesai (Opsional)</label>
                                            <input type="datetime-local" value={campaignForm.endDate}
                                                min={campaignForm.startDate || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                                onChange={(e) => setCampaignForm(c => ({ ...c, endDate: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Kampanye</label>
                                        <SearchableSelect
                                            value={campaignForm.type}
                                            onChange={(val) => setCampaignForm(c => ({ ...c, type: String(val) }))}
                                            options={campaignTypeOptions}
                                            creatable={true}
                                            onCreate={handleCreateCampaignType}
                                            placeholder="Pilih Tipe Kampanye"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                                            {audienceCount !== null && (
                                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
                                                    <Users size={12} /> {audienceCount} Terpilih
                                                </span>
                                            )}
                                        </div>
                                        <SearchableSelect
                                            value={campaignForm.targetAudience}
                                            onChange={(val) => setCampaignForm(c => ({ ...c, targetAudience: String(val) }))}
                                            options={targetAudienceOptions}
                                            placeholder="Pilih target..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Gambar / Poster Kampanye (Opsional)</label>
                                        <div className="border hover:border-naqupos-primary transition-colors border-dashed rounded-lg p-4 text-center">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id="campaign-image"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setImageFile(file);
                                                        setImagePreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                            <label htmlFor="campaign-image" className="cursor-pointer flex flex-col items-center">
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded-md mb-2 shadow-sm" />
                                                ) : (
                                                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                                        <ImageIcon size={24} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <span className="text-sm text-naqupos-primary font-medium hover:underline">
                                                    Pilih Gambar
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Pesan</label>
                                            <span className="text-xs text-gray-500 flex items-center gap-1" title="Variabel tersedia: [Nama_Pelanggan], [Kode_Promo]">
                                                <Info size={12} /> Info Variabel
                                            </span>
                                        </div>
                                        <textarea value={campaignForm.message} onChange={(e) => setCampaignForm(c => ({ ...c, message: e.target.value }))}
                                            rows={4} placeholder="Isi pesan kampanye... Gunakan [Nama_Pelanggan] untuk menyebut nama." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none" />
                                    </div>
                                </div>
                                <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                                    <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Batal</button>
                                    <button onClick={handleSaveCampaign} disabled={isProcessing || !campaignForm.name}
                                        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isProcessing || !campaignForm.name ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                        {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Buat Kampanye')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Modal */}
                    {showDeleteModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                                <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                                    <h3 className="text-xl font-bold text-naqupos-dark">Hapus Kampanye</h3>
                                    <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1">
                                    <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                                        <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-red-800">Peringatan!</p>
                                            <p className="text-sm text-red-600">Data yang dihapus tidak dapat dikembalikan.</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                                        <p className="font-bold text-naqupos-dark">
                                            {selectedCampaign?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                                    <button onClick={closeAllModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                                    <button onClick={handleDeleteCampaign}
                                        disabled={isProcessing}
                                        className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                                        {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <div className="mt-6">
                            <Pagination
                                currentPage={page}
                                totalItems={totalItems}
                                itemsPerPage={perPage}
                                onPageChange={setPage}
                                onItemsPerPageChange={(val) => {
                                    setPerPage(val);
                                    setPage(1);
                                }}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Tipe Kampanye Tab */}
            {activeTab === 'tipe' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-naqupos-dark">Daftar Tipe Kampanye</h2>
                        <button
                            onClick={() => {
                                setTypeForm({ name: '' });
                                setIsEditing(false);
                                setShowTypeModal(true);
                            }}
                            className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2.5 rounded-xl hover:bg-naqupos-accent transition-colors shadow-lg shadow-naqupos-primary/20"
                        >
                            <Plus size={18} />
                            <span>Buat Tipe</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {campaignTypes.length === 0 ? (
                            <div className="col-span-3 py-20 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                                Belum ada tipe kampanye
                            </div>
                        ) : campaignTypes.map(type => (
                            <div key={type.id || type.name} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center">
                                <span className="font-medium text-naqupos-dark">{type.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        setSelectedType(type);
                                        setTypeForm({ name: type.name });
                                        setIsEditing(true);
                                        setShowTypeModal(true);
                                    }} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => {
                                        setSelectedType(type);
                                        setShowDeleteTypeModal(true);
                                    }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tipe Kampanye Modals */}
            {showTypeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                            <h3 className="text-xl font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Tipe Kampanye' : 'Buat Tipe Baru'}
                            </h3>
                            <button onClick={closeTypeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Tipe *</label>
                                <input type="text" value={typeForm.name} onChange={(e) => setTypeForm(c => ({ ...c, name: e.target.value }))}
                                    placeholder="Contoh: Promo Akhir Tahun" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                            <button onClick={closeTypeModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Batal</button>
                            <button onClick={handleSaveType} disabled={isProcessing || !typeForm.name}
                                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isProcessing || !typeForm.name ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan' : 'Buat Tipe')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteTypeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                            <h3 className="text-xl font-bold text-naqupos-dark">Hapus Tipe</h3>
                            <button onClick={closeTypeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                                <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-red-800">Peringatan!</p>
                                    <p className="text-sm text-red-600">Data yang terikat mungkin akan terpengaruh.</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                <p className="font-bold text-naqupos-dark">
                                    {selectedType?.name}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                            <button onClick={closeTypeModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleDeleteType}
                                disabled={isProcessing}
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
