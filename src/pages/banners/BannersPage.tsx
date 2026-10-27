import { useState, useEffect, useMemo } from 'react';
import {
    Plus, Edit, Trash2, X, AlertTriangle, Search, Image as ImageIcon,
    Eye, EyeOff, GripVertical, ExternalLink, ArrowUp, ArrowDown, Building, Phone, FileText
} from 'lucide-react';
import { formatDate } from '../../utils/date';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import Pagination from '../../components/common/Pagination';
import swal from '../../utils/swal';

interface Banner {
    id: number;
    title: string;
    imageUrl: string;
    linkUrl?: string;
    linkType: 'none' | 'internal' | 'external';
    position: number;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    views: number;
    clicks: number;
}


export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        imageUrl: '',
        linkUrl: '',
        linkType: 'none' as Banner['linkType'],
        startDate: '',
        endDate: '',
        branchId: ''
    });

    const [imageOption, setImageOption] = useState<'url' | 'upload'>('url');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');

    const [branches, setBranches] = useState<any[]>([]);
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || '');
    // Using globalBranchId to sync filter state but suppressing warning as it's primarily used for effect trigger
    useEffect(() => {
        // Just triggers re-render if needed or kept for consistency
    }, [globalBranchId]);
    const [branchFilter, setBranchFilter] = useState<string | number>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
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

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
                const saved = localStorage.getItem('naqupos_selected_branch') || '';
                setGlobalBranchId(saved);
                setBranchFilter(saved === 'all' || saved === '' ? '' : Number(saved));
            } catch (error) {
                console.error("Failed to load branches", error);
            }
        };
        loadBranches();
    }, []);

    useEffect(() => {
        const syncBranch = () => {
            const saved = localStorage.getItem('naqupos_selected_branch') || '';
            setGlobalBranchId(saved);
            setBranchFilter(saved === 'all' || saved === '' ? '' : Number(saved));
        };
        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, []);

    useEffect(() => {
        loadBanners();
    }, [searchQuery, branchFilter, page, perPage, statusFilter, dateFilter]);

    const loadBanners = async () => {
        try {
            setLoading(true);
            setError('');
            const params: any = {
                search: searchQuery,
                branch_id: (branchFilter === '' || branchFilter === 'all') ? undefined : branchFilter,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                start_date: dateFilter.start || undefined,
                end_date: dateFilter.end || undefined,
                page,
                limit: perPage
            };
            const response = await api.getBanners(params);
            const rawData = Array.isArray(response) ? response : (response.data || []);
            setTotalItems(response.total || (Array.isArray(response) ? response.length : (response.data?.length || 0)));

            // Map API response to frontend format
            const mappedData = rawData.map((item: any) => ({
                id: item.id,
                title: item.title || 'Untitled',
                imageUrl: item.image_url || '',
                linkUrl: item.link_url,
                linkType: item.link_type || 'none',
                position: item.position || 0,
                isActive: !!item.is_active,
                startDate: item.start_date,
                endDate: item.end_date,
                views: item.views || 0,
                clicks: item.clicks || 0
            }));

            setBanners(mappedData);
        } catch (err: any) {
            setError(err.message || 'Failed to load banners');
            console.error('Error loading banners:', err);
            setBanners([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const filteredBanners = banners
        .filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.position - b.position);

    const openAddModal = () => {
        setFormData({ title: '', imageUrl: '', linkUrl: '', linkType: 'none', startDate: '', endDate: '', branchId: '' });
        setImageOption('url');
        setImageFile(null);
        setImagePreview('');
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (banner: Banner) => {
        setSelectedBanner(banner);
        setFormData({
            title: banner.title,
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl || '',
            linkType: banner.linkType,
            startDate: banner.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : '',
            endDate: banner.endDate ? new Date(banner.endDate).toISOString().slice(0, 16) : '',
            branchId: (banner as any).branch_id?.toString() || ''
        });
        setImageOption('url');
        setImageFile(null);
        setImagePreview(banner.imageUrl);
        setIsEditing(true);
        setShowModal(true);
    };

    const openDeleteModal = (banner: Banner) => {
        setSelectedBanner(banner);
        setShowDeleteModal(true);
    };

    const openPreviewModal = (banner: Banner) => {
        setSelectedBanner(banner);
        setShowPreviewModal(true);
    };

    const closeModals = () => {
        setShowModal(false);
        setShowDeleteModal(false);
        setShowPreviewModal(false);
        setSelectedBanner(null);
    };

    const handleSave = async () => {
        if (!formData.title) return;
        if (imageOption === 'url' && !formData.imageUrl) return;
        if (imageOption === 'upload' && !imageFile && !isEditing) return;

        if (formData.startDate && formData.endDate) {
            if (new Date(formData.endDate) < new Date(formData.startDate)) {
                swal.error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
                return;
            }
        }

        setIsProcessing(true);
        try {
            const data = {
                title: formData.title,
                image_url: imageOption === 'url' ? formData.imageUrl : (isEditing && !imageFile ? formData.imageUrl : ''),
                link_url: formData.linkUrl,
                link_type: formData.linkType,
                start_date: formData.startDate || null,
                end_date: formData.endDate || null,
                branch_id: formData.branchId || null
            };

            let bannerId = selectedBanner?.id;

            if (isEditing && selectedBanner) {
                await api.updateBanner(selectedBanner.id, data);
            } else {
                const res = await api.createBanner(data);
                bannerId = res.id;
            }

            if (imageOption === 'upload' && imageFile && bannerId) {
                await api.uploadBannerImage(bannerId, imageFile);
            }

            await loadBanners();
            closeModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menyimpan banner');
            console.error('Error saving banner:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBanner) return;
        setIsProcessing(true);
        try {
            await api.deleteBanner(selectedBanner.id);
            await loadBanners();
            closeModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menghapus banner');
            console.error('Error deleting banner:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleBannerStatus = async (id: number) => {
        try {
            const banner = banners.find(b => b.id === id);
            if (!banner) return;
            await api.updateBanner(id, { is_active: !banner.isActive });
            await loadBanners();
        } catch (err: any) {
            swal.error(err.message || 'Gagal memperbarui status');
            console.error('Error updating status:', err);
        }
    };

    const moveBanner = async (id: number, direction: 'up' | 'down') => {
        const sorted = [...filteredBanners].sort((a, b) => a.position - b.position);
        const currentIndex = sorted.findIndex(b => b.id === id);

        if (currentIndex === -1) return;
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === sorted.length - 1) return;

        const newBanners = [...sorted];
        if (direction === 'up') {
            [newBanners[currentIndex], newBanners[currentIndex - 1]] = [newBanners[currentIndex - 1], newBanners[currentIndex]];
        } else {
            [newBanners[currentIndex], newBanners[currentIndex + 1]] = [newBanners[currentIndex + 1], newBanners[currentIndex]];
        }

        // Update local state immediately for UI responsiveness
        setBanners(prev => {
            return prev.map(b => {
                const found = newBanners.find(nb => nb.id === b.id);
                if (found) {
                    // Find the index in the new sorted array to assign as position
                    const newIndex = newBanners.findIndex(nb => nb.id === b.id);
                    return { ...b, position: newIndex + 1 };
                }
                return b;
            });
        });

        try {
            // Get the IDs in the new order
            const orderedIds = newBanners.map(b => b.id);
            await api.reorderBanners(orderedIds);

            // Optionally reload to sync fully
            // await loadBanners(); 
        } catch (err: any) {
            console.error('Failed to reorder banners:', err);
            // Revert on error could be implemented here
            swal.error('Gagal menyimpan urutan banner');
            await loadBanners(); // Reload to reset state
        }
    };

    const activeBanners = banners.filter(b => b.isActive).length;
    const totalViews = banners.reduce((sum, b) => sum + b.views, 0);
    const totalClicks = banners.reduce((sum, b) => sum + b.clicks, 0);
    const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-naqupos-primary mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading banners...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error: {error}</p>
                <button
                    onClick={loadBanners}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-naqupos-dark">Banner Management</h1>
                        <p className="text-gray-500 text-sm">Kelola banner promosi untuk Customer App</p>
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

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="w-[160px]">
                            <SearchableSelect
                                value={statusFilter}
                                onChange={(val: string | number) => setStatusFilter(val as any)}
                                options={[
                                    { value: 'all', label: 'Semua Status' },
                                    { value: 'active', label: 'Aktif' },
                                    { value: 'inactive', label: 'Nonaktif' }
                                ]}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                            <span className="text-xs text-gray-500">Periode:</span>
                            <input
                                type="date"
                                value={dateFilter.start}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                                className="text-sm outline-none w-32"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={dateFilter.end}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                                className="text-sm outline-none w-32"
                            />
                        </div>
                    </div>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors self-start md:self-center whitespace-nowrap flex-shrink-0"
                >
                    <Plus size={18} />
                    <span>Tambah Banner</span>
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
                        <div className="p-3 bg-blue-100 rounded-lg"><ImageIcon size={20} className="text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-naqupos-dark">{banners.length}</p>
                            <p className="text-sm text-gray-500">Total Banner</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg"><Eye size={20} className="text-green-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{activeBanners}</p>
                            <p className="text-sm text-gray-500">Aktif</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg"><Eye size={20} className="text-purple-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{totalViews.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Total Views</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg"><ExternalLink size={20} className="text-amber-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{avgCtr}%</p>
                            <p className="text-sm text-gray-500">Avg CTR</p>
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
                        placeholder="Cari banner..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary"
                    />
                </div>
            </div>

            {/* Banner List */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-left text-xs text-gray-500 uppercase">
                            <th className="px-4 py-3 font-medium w-12">#</th>
                            <th className="px-4 py-3 font-medium">Banner</th>
                            <th className="px-4 py-3 font-medium">Link</th>
                            <th className="px-4 py-3 font-medium">Periode</th>
                            <th className="px-4 py-3 font-medium text-center">Views</th>
                            <th className="px-4 py-3 font-medium text-center">Clicks</th>
                            <th className="px-4 py-3 font-medium text-center">Status</th>
                            <th className="px-4 py-3 font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredBanners.map((banner, index) => (
                            <tr key={banner.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${!banner.isActive ? 'opacity-60' : ''}`}>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col items-center gap-1">
                                        <button onClick={() => moveBanner(banner.id, 'up')} disabled={index === 0}
                                            className={`p-1 rounded hover:bg-gray-200 ${index === 0 ? 'opacity-30' : ''}`}>
                                            <ArrowUp size={14} className="text-gray-400" />
                                        </button>
                                        <GripVertical size={16} className="text-gray-300" />
                                        <button onClick={() => moveBanner(banner.id, 'down')} disabled={index === filteredBanners.length - 1}
                                            className={`p-1 rounded hover:bg-gray-200 ${index === filteredBanners.length - 1 ? 'opacity-30' : ''}`}>
                                            <ArrowDown size={14} className="text-gray-400" />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {banner.imageUrl ? (
                                            <img src={banner.imageUrl} alt={banner.title}
                                                className="w-24 h-14 object-cover rounded-lg cursor-pointer hover:opacity-80"
                                                onClick={() => openPreviewModal(banner)}
                                                onError={(e) => { e.currentTarget.src = "https://placehold.co/600x400"; }} />
                                        ) : (
                                            <img src="https://placehold.co/600x400" alt="Placeholder"
                                                className="w-24 h-14 object-cover rounded-lg cursor-pointer hover:opacity-80"
                                                onClick={() => openPreviewModal(banner)} />
                                        )}
                                        <div>
                                            <p className="font-medium text-naqupos-dark">{banner.title}</p>
                                            <span className="text-xs text-gray-400">Posisi #{banner.position}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {banner.linkType !== 'none' ? (
                                        <div className="flex items-center gap-1 text-gray-600">
                                            <ExternalLink size={14} />
                                            <span className="text-xs truncate max-w-[150px]">{banner.linkUrl}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">Tidak ada link</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {banner.startDate ? (
                                        <div className="flex flex-col text-xs text-gray-600">
                                            <span>Mulai: {formatDate(banner.startDate)}</span>
                                            <span>Selesai: {formatDate(banner.endDate)}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">Tanpa batas</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center font-medium">{banner.views.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center font-medium text-naqupos-primary">{banner.clicks.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => toggleBannerStatus(banner.id)}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {banner.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                                        {banner.isActive ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openPreviewModal(banner)} className="p-2 hover:bg-gray-100 rounded-lg"><Eye size={16} className="text-gray-500" /></button>
                                        <button onClick={() => openEditModal(banner)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-gray-500" /></button>
                                        <button onClick={() => openDeleteModal(banner)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredBanners.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <ImageIcon size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Tidak ada banner ditemukan</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
                <div className="mt-4">
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

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                            <h3 className="text-xl font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Banner' : 'Tambah Banner Baru'}
                            </h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Judul Banner *</label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Promo Tahun Baru 2026" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Opsional)</label>
                                <SearchableSelect
                                    value={formData.branchId}
                                    onChange={(val) => setFormData(f => ({ ...f, branchId: String(val) }))}
                                    options={[
                                        { value: '', label: 'Semua Cabang' },
                                        ...branches.map(branch => ({ value: branch.id.toString(), label: branch.name }))
                                    ]}
                                    placeholder="Semua Cabang"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Banner *</label>
                                <div className="flex p-1 bg-gray-100 rounded-lg mb-3">
                                    <button
                                        type="button"
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${imageOption === 'url' ? 'bg-white shadow-sm text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setImageOption('url')}
                                    >
                                        URL Gambar
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${imageOption === 'upload' ? 'bg-white shadow-sm text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setImageOption('upload')}
                                    >
                                        Upload File
                                    </button>
                                </div>
                                {imageOption === 'url' ? (
                                    <input type="url" value={formData.imageUrl} onChange={(e) => {
                                        setFormData(f => ({ ...f, imageUrl: e.target.value }));
                                        setImagePreview(e.target.value);
                                    }}
                                        placeholder="https://..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                ) : (
                                    <input type="file" accept="image/*" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setImageFile(file);
                                            setImagePreview(URL.createObjectURL(file));
                                        }
                                    }} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-naqupos-primary/10 file:text-naqupos-primary hover:file:bg-naqupos-primary/20" />
                                )}
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="mt-3 w-full h-auto max-h-48 object-contain bg-gray-50 rounded-lg border border-gray-200" onError={(e) => { e.currentTarget.src = "https://placehold.co/600x400?text=Preview+Tidak+Tersedia"; }} />
                                ) : (
                                    <div className="mt-3 w-full h-32 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-sm text-gray-400">
                                        Preview gambar akan muncul di sini
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Link</label>
                                <SearchableSelect
                                    value={formData.linkType}
                                    onChange={(val: string | number) => setFormData(f => ({ ...f, linkType: val as Banner['linkType'] }))}
                                    options={[
                                        { value: 'none', label: 'Tidak ada link' },
                                        { value: 'internal', label: 'Link Internal (Halaman App)' },
                                        { value: 'external', label: 'Link External (Website/App Store)' }
                                    ]}
                                />
                            </div>
                            {formData.linkType !== 'none' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">URL Tujuan</label>
                                    <input type="url" value={formData.linkUrl} onChange={(e) => setFormData(f => ({ ...f, linkUrl: e.target.value }))}
                                        placeholder={formData.linkType === 'internal' ? '/promo/xxx' : 'https://...'} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                                    <input type="datetime-local" value={formData.startDate}
                                        onChange={(e) => {
                                            const newStart = e.target.value;
                                            setFormData(f => {
                                                const updates = { ...f, startDate: newStart };
                                                if (f.endDate && new Date(f.endDate) < new Date(newStart)) {
                                                    updates.endDate = '';
                                                }
                                                return updates;
                                            });
                                        }}
                                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
                                    <input type="datetime-local" value={formData.endDate} onChange={(e) => setFormData(f => ({ ...f, endDate: e.target.value }))}
                                        min={formData.startDate || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0 bg-gray-50 rounded-b-2xl">
                            <button onClick={closeModals} className="px-6 py-3 bg-white border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSave} disabled={isProcessing || !formData.title || (imageOption === 'url' ? !formData.imageUrl : (!isEditing && !imageFile))}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !formData.title || (imageOption === 'url' ? !formData.imageUrl : (!isEditing && !imageFile)) ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Banner')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && selectedBanner && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={closeModals}>
                    <div className="max-w-4xl w-full mx-4">
                        <img
                            src={selectedBanner.imageUrl}
                            alt={selectedBanner.title}
                            className="w-full rounded-2xl"
                            onError={(e) => { e.currentTarget.src = "https://placehold.co/600x400"; }}
                        />
                        <div className="text-center mt-4">
                            <h3 className="text-white text-xl font-bold">{selectedBanner.title}</h3>
                            <p className="text-white/70 text-sm mt-1">Klik di mana saja untuk menutup</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedBanner && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Hapus Banner</h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-red-800">Peringatan!</p>
                                <p className="text-sm text-red-600">Banner akan dihapus permanen.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                            <img src={selectedBanner.imageUrl} alt={selectedBanner.title} className="w-full h-24 object-cover rounded-lg mb-2" />
                            <p className="font-bold text-naqupos-dark">{selectedBanner.title}</p>
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
