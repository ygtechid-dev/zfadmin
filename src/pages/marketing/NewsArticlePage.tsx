import { Plus, Edit, Trash2, X, AlertTriangle, Search, Calendar, List, FolderOpen, Image, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import ArticleCategoryTab from '../master/tabs/ArticleCategoryTab';
import swal from '../../utils/swal';

interface News {
    id: number;
    title: string;
    category: string;
    status: 'published' | 'draft';
    date: string;
    content?: string;
    image_url?: string;
}

interface NewsResponse {
    id: number;
    title: string;
    category: string;
    status: 'published' | 'draft';
    created_at?: string;
    published_at?: string;
    content?: string;
    image_url?: string;
}

export default function NewsArticlePage() {
    const [activeTab, setActiveTab] = useState<'list' | 'categories'>('list');
    const [branches, setBranches] = useState<any[]>([]);
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || 'all');
    const [branchFilter, setBranchFilter] = useState<string | number>('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [news, setNews] = useState<News[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [newsCategoryOptions, setNewsCategoryOptions] = useState<{ value: string; label: string }[]>([]);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchFilter, setSearchFilter] = useState('');

    // Modal states
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedNews, setSelectedNews] = useState<News | null>(null);

    // News Form
    const [newsForm, setNewsForm] = useState({
        title: '', category: 'News', content: '', status: 'draft' as 'published' | 'draft', branchId: ''
    });

    // Image states
    const [newsImage, setNewsImage] = useState<File | null>(null);
    const [newsImagePreview, setNewsImagePreview] = useState<string>('');
    const [uploadingImage, setUploadingImage] = useState(false);

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

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.getNewsCategories();
                const filtered = res.filter((c: any) => c.is_global || branchFilter !== 'all' || true);
                setNewsCategoryOptions(filtered.map((c: any) => ({ value: c.name, label: c.name })));
            } catch (e) { console.error("Failed to load categories", e); }
        };
        fetchCategories();
    }, [branchFilter, activeTab]);

    useEffect(() => {
        if (activeTab === 'list') {
            const timeoutId = setTimeout(() => { loadData(); }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [branchFilter, page, perPage, statusFilter, dateFilter, categoryFilter, searchFilter, activeTab]);

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
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (searchFilter) params.search = searchFilter;

            const res = await api.getNews(params).catch(() => ({ data: [], total: 0 }));
            const data = Array.isArray(res) ? res : (res.data || []);
            setTotalItems(res.total || data.length);

            setNews(data.map((n: NewsResponse) => ({
                ...n,
                date: n.created_at?.split('T')[0] || n.published_at?.split('T')[0] || new Date().toISOString().split('T')[0]
            })));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNewsCategory = async ({ label }: { label: string }) => {
        try {
            const data = await api.createNewsCategory({ name: label });
            const cats = await api.getNewsCategories();
            setNewsCategoryOptions(cats.map((c: any) => ({ value: c.name, label: c.name })));
            return { value: data.name, label: data.name };
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    const closeAllModals = () => {
        setShowAddEditModal(false);
        setShowDeleteModal(false);
        setSelectedNews(null);
        setNewsImage(null);
        setNewsImagePreview('');
    };

    const fetchCategoriesForModal = async () => {
        try {
            const res = await api.getNewsCategories();
            setNewsCategoryOptions(res.map((c: any) => ({ value: c.name, label: c.name })));
        } catch (e) {
            console.error("Failed to load categories", e);
        }
    };

    const openAddNews = async () => {
        await fetchCategoriesForModal();
        setNewsForm({ title: '', category: 'News', content: '', status: 'draft', branchId: '' });
        setNewsImage(null);
        setNewsImagePreview('');
        setIsEditing(false);
        setShowAddEditModal(true);
    };

    const openEditNews = async (item: News) => {
        await fetchCategoriesForModal();
        setSelectedNews(item);
        setNewsForm({
            title: item.title,
            category: item.category,
            content: item.content || '',
            status: item.status,
            branchId: (item as any).branch_id?.toString() || ''
        });
        setNewsImage(null);
        setNewsImagePreview(item.image_url || '');
        setIsEditing(true);
        setShowAddEditModal(true);
    };

    const openDeleteNews = (item: News) => {
        setSelectedNews(item);
        setShowDeleteModal(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            swal.error('Ukuran foto maksimal 2MB');
            return;
        }

        setNewsImage(file);
        const reader = new FileReader();
        reader.onload = (ev) => setNewsImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSaveNews = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!newsForm.title) {
            swal.error('Judul wajib diisi');
            return;
        }

        setIsProcessing(true);
        try {
            let savedNews: any;

            // Jika ada file gambar, pakai FormData
            if (newsImage) {
                setUploadingImage(true);
                const formData = new FormData();
                formData.append('title', newsForm.title);
                formData.append('category', newsForm.category);
                formData.append('content', newsForm.content);
                formData.append('status', newsForm.status);
                if (newsForm.branchId) formData.append('branch_id', newsForm.branchId);
                formData.append('image', newsImage);

                if (isEditing && selectedNews) {
                    savedNews = await api.updateNewsWithImage(selectedNews.id, formData);
                } else {
                    savedNews = await api.createNewsWithImage(formData);
                }
                setUploadingImage(false);
            } else {
                const payload = {
                    title: newsForm.title,
                    category: newsForm.category,
                    content: newsForm.content,
                    status: newsForm.status,
                    branch_id: newsForm.branchId || null
                };

                if (isEditing && selectedNews) {
                    savedNews = await api.updateNews(selectedNews.id, payload);
                } else {
                    savedNews = await api.createNews(payload);
                }
            }

            swal.success(isEditing ? 'Artikel berhasil diperbarui' : 'Artikel berhasil ditambahkan');

            if (page === 1) {
                await loadData();
            } else {
                setPage(1);
            }
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menyimpan artikel');
        } finally {
            setIsProcessing(false);
            setUploadingImage(false);
        }
    };

    const handleDeleteNews = async () => {
        if (!selectedNews) return;
        setIsProcessing(true);
        try {
            await api.deleteNews(selectedNews.id);
            swal.success('Artikel berhasil dihapus');
            if (page === 1) {
                await loadData();
            } else {
                setPage(1);
            }
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menghapus artikel');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-naqupos-dark">Berita & Artikel</h1>
                    <p className="text-gray-500 text-sm">Kelola kabar berita, tips, dan artikel untuk pelanggan.</p>
                </div>
                {globalBranchId === 'all' && (
                    <div className="bg-white p-1.5 rounded-2xl border border-naqupos-primary/20 shadow-sm self-start md:self-auto">
                        <BranchSelector
                            selectedBranchId={branchFilter === 'all' ? null : Number(branchFilter)}
                            onBranchChange={(id) => { setBranchFilter(id || 'all'); setPage(1); }}
                            showAllOption={true}
                        />
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-6">
                    {[
                        { id: 'list', label: 'Daftar Artikel', icon: <List size={18} /> },
                        { id: 'categories', label: 'Kategori Artikel', icon: <FolderOpen size={18} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <div className="flex items-center gap-2">{tab.icon}<span>{tab.label}</span></div>
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-naqupos-primary rounded-t-full" />}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'list' ? (
                <>
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium min-w-[60px]">
                                <Search size={16} />Filter:
                            </div>
                            <div className="w-[180px]">
                                <SearchableSelect
                                    value={statusFilter}
                                    onChange={(val) => setStatusFilter(val as any)}
                                    options={[
                                        { value: 'all', label: 'Semua Status' },
                                        { value: 'published', label: 'Published' },
                                        { value: 'draft', label: 'Draft' }
                                    ]}
                                    placeholder="Semua Status"
                                />
                            </div>
                            <div className="w-[200px]">
                                <SearchableSelect
                                    value={categoryFilter}
                                    onChange={(val) => setCategoryFilter(String(val))}
                                    options={[{ value: 'all', label: 'Semua Kategori' }, ...newsCategoryOptions]}
                                    placeholder="Semua Kategori"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 h-[42px]">
                                <Calendar size={14} className="text-gray-400" />
                                <input type="date" value={dateFilter.start} onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))} className="text-xs bg-transparent outline-none w-24 text-gray-600" />
                                <span className="text-gray-300">|</span>
                                <input type="date" value={dateFilter.end} onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))} className="text-xs bg-transparent outline-none w-24 text-gray-600" />
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 h-[42px] min-w-[200px]">
                                <Search size={14} className="text-gray-400" />
                                <input type="text" placeholder="Cari artikel..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="text-sm bg-transparent outline-none w-full text-gray-600 placeholder:text-gray-400" />
                            </div>
                        </div>
                        <button onClick={openAddNews} className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2.5 rounded-xl hover:bg-naqupos-accent transition-colors shadow-lg shadow-naqupos-primary/20">
                            <Plus size={18} /><span>Buat Artikel</span>
                        </button>
                    </div>

                    {/* Table */}
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
                            <button onClick={() => loadData()} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Coba Lagi</button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-left text-xs text-gray-500 uppercase">
                                        <th className="px-4 py-3 font-medium">Foto</th>
                                        <th className="px-4 py-3 font-medium">Judul</th>
                                        <th className="px-4 py-3 font-medium">Kategori</th>
                                        <th className="px-4 py-3 font-medium">Tanggal</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {news.length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Belum ada berita atau artikel</td></tr>
                                    ) : news.map(item => (
                                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                        <Image size={18} className="text-gray-300" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-naqupos-dark">{item.title}</td>
                                            <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{item.category}</span></td>
                                            <td className="px-4 py-3 text-gray-600">{item.date}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {item.status === 'published' ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEditNews(item)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-gray-500" /></button>
                                                    <button onClick={() => openDeleteNews(item)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {totalItems > 0 && (
                        <div className="mt-6">
                            <Pagination
                                currentPage={page}
                                totalItems={totalItems}
                                itemsPerPage={perPage}
                                onPageChange={setPage}
                                onItemsPerPageChange={(val) => { setPerPage(val); setPage(1); }}
                            />
                        </div>
                    )}

                    {/* Add/Edit Modal */}
                    {showAddEditModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                                <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                                    <h3 className="text-xl font-bold text-naqupos-dark">
                                        {isEditing ? 'Edit Artikel' : 'Tambah Artikel Baru'}
                                    </h3>
                                    <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                                </div>
                                <form onSubmit={handleSaveNews} className="flex flex-col flex-1 overflow-hidden">
                                    <div className="space-y-4 p-6 overflow-y-auto flex-1">

                                        {/* Upload Foto */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Foto Artikel</label>
                                            <div className="relative">
                                                {newsImagePreview ? (
                                                    <div className="relative group">
                                                        <img
                                                            src={newsImagePreview}
                                                            alt="Preview"
                                                            className="w-full h-48 object-cover rounded-xl border border-gray-200"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                                                            <label className="cursor-pointer bg-white text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5">
                                                                <Image size={14} />
                                                                Ganti Foto
                                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setNewsImage(null); setNewsImagePreview(''); }}
                                                                className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1.5"
                                                            >
                                                                <Trash2 size={14} />
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label className="cursor-pointer block">
                                                        <div className="w-full h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-naqupos-primary/50 hover:bg-naqupos-cream/20 transition-all">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                                                <Image size={24} className="text-gray-400" />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-500">Klik untuk upload foto</p>
                                                            <p className="text-xs text-gray-400">PNG, JPG, WebP — maks 2MB</p>
                                                        </div>
                                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Judul *</label>
                                            <input
                                                type="text"
                                                value={newsForm.title}
                                                onChange={(e) => setNewsForm(n => ({ ...n, title: e.target.value }))}
                                                placeholder="Judul artikel..."
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:border-naqupos-primary transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Opsional)</label>
                                            <SearchableSelect
                                                value={newsForm.branchId}
                                                onChange={(val) => setNewsForm(n => ({ ...n, branchId: String(val) }))}
                                                options={[
                                                    { value: '', label: 'Semua Cabang' },
                                                    ...branches.map(branch => ({ value: branch.id.toString(), label: branch.name }))
                                                ]}
                                                placeholder="Semua Cabang"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                                                <SearchableSelect
                                                    value={newsForm.category}
                                                    onChange={(val) => setNewsForm(n => ({ ...n, category: String(val) }))}
                                                    options={newsCategoryOptions}
                                                    creatable={true}
                                                    onCreate={handleCreateNewsCategory}
                                                    placeholder="Pilih Kategori"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                                <SearchableSelect
                                                    value={newsForm.status}
                                                    onChange={(val) => setNewsForm(n => ({ ...n, status: val as any }))}
                                                    options={[
                                                        { value: 'draft', label: 'Draft' },
                                                        { value: 'published', label: 'Published' }
                                                    ]}
                                                    placeholder="Pilih Status"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Konten</label>
                                            <textarea
                                                value={newsForm.content}
                                                onChange={(e) => setNewsForm(n => ({ ...n, content: e.target.value }))}
                                                rows={5}
                                                placeholder="Isi artikel..."
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none focus:border-naqupos-primary transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                                        <button type="button" onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Batal</button>
                                        <button
                                            type="submit"
                                            disabled={isProcessing || !newsForm.title}
                                            className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isProcessing || !newsForm.title ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}
                                        >
                                            {isProcessing ? (
                                                <><Loader2 size={18} className="animate-spin" />{uploadingImage ? 'Mengupload foto...' : 'Menyimpan...'}</>
                                            ) : (
                                                isEditing ? 'Simpan Perubahan' : 'Tambah Artikel'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Modal */}
                    {showDeleteModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                                <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                                    <h3 className="text-xl font-bold text-naqupos-dark">Hapus Artikel</h3>
                                    <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1">
                                    <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                                        <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-red-800">Peringatan!</p>
                                            <p className="text-sm text-red-600">Data yang dihapus tidak dapat dikembalikan.</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                                        <p className="font-bold text-naqupos-dark">{selectedNews?.title}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                                    <button onClick={closeAllModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                                    <button
                                        onClick={handleDeleteNews}
                                        disabled={isProcessing}
                                        className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                    >
                                        {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] relative">
                    <ArticleCategoryTab
                        branchId={branchFilter === 'all' ? 0 : Number(branchFilter)}
                        branches={branches}
                        globalBranchId={globalBranchId}
                        setBranchFilter={(val) => setBranchFilter(val)}
                    />
                </div>
            )}
        </div>
    );
}