import React, { useState, useEffect } from 'react';
import { Search, Loader2, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { api } from '../../../services/api';
import MultiSelectBranch from '../../../components/common/MultiSelectBranch';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import swal from '../../../utils/swal';

interface ArticleCategoryTabProps {
    branchId: string | number;
    branches: any[];
    globalBranchId: string | number;
    setBranchFilter: (id: string | number) => void;
}

interface CategoryDisplay {
    id?: number;
    name: string;
    count: number;
    branchNames: string[];
    is_global: boolean;
    branch_ids: number[];
}

export default function ArticleCategoryTab({ branchId, branches, globalBranchId }: ArticleCategoryTabProps) {
    const [categories, setCategories] = useState<CategoryDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState<CategoryDisplay | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);

    useEffect(() => {
        if (branchId !== 0 && branchId !== 'all') setSelectedBranchIds([]);
    }, [branchId]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params: any = { limit: 1000 };
            const isSpecificGlobal = branchId && branchId !== 0 && branchId !== 'all';

            if (isSpecificGlobal) {
                params.branch_id = branchId;
            }

            const [newsRes, categoriesRes] = await Promise.all([
                api.getNews(params),
                api.getNewsCategories()
            ]);

            const newsItems = newsRes.data || [];
            const masterCategories = categoriesRes || [];

            const catMap: Record<string, CategoryDisplay> = {};

            masterCategories.forEach((mc: any) => {
                const isItemGlobal = mc.is_global === 1 || mc.is_global === true || mc.is_global === '1';
                const itemBranchIds = mc.branches ? mc.branches.map((br: any) => Number(br.id)) : (mc.branch_id ? [Number(mc.branch_id)] : []);

                const currentBranchIdNum = branchId === 'all' ? 0 : Number(branchId);
                const isSpecificGlobal = currentBranchIdNum !== 0;

                const matchesBranch =
                    !isSpecificGlobal ? (
                        // If Global view, show if Global OR matches selected sub-branches (if any selected) OR show all if no sub-selection
                        selectedBranchIds.length === 0 || isItemGlobal || selectedBranchIds.some((id: number) => itemBranchIds.includes(id))
                    ) : (
                        // If Specific Branch view, show if Global OR belongs to this branch
                        isItemGlobal || itemBranchIds.includes(currentBranchIdNum)
                    );

                if (matchesBranch) {
                    const brNames = isItemGlobal ? ['Global'] : (mc.branches ? mc.branches.map((br: any) => br.name) : []);
                    catMap[mc.name] = {
                        id: mc.id,
                        name: mc.name,
                        count: 0,
                        branchNames: brNames,
                        is_global: isItemGlobal,
                        branch_ids: itemBranchIds
                    };
                }
            });

            // Count usage from News
            newsItems.forEach((n: any) => {
                const c = n.category || 'Umum';

                if (!catMap[c]) {
                    catMap[c] = {
                        name: c,
                        count: 0,
                        branchNames: [],
                        is_global: true,
                        branch_ids: []
                    };
                }

                catMap[c].count++;
            });

            setCategories(Object.values(catMap).sort((a, b) => b.count - a.count));
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [branchId, selectedBranchIds]);

    const [deleteModal, setDeleteModal] = useState<{ show: boolean; category: CategoryDisplay | null; loading: boolean }>({
        show: false,
        category: null,
        loading: false
    });

    const handleDelete = (category: CategoryDisplay) => {
        setDeleteModal({ show: true, category, loading: false });
    };

    const confirmDelete = async () => {
        if (!deleteModal.category?.id) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            await api.deleteNewsCategory(deleteModal.category.id);
            setDeleteModal({ show: false, category: null, loading: false });
            fetchData();
        } catch (err) {
            swal.error('Gagal menghapus kategori');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    const getPaginatedData = (data: typeof categories) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [search, branchId, selectedBranchIds]);

    return (
        <div className="p-6">
            <div className="mb-6 flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cari kategori artikel..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-naqupos-primary transition-colors text-sm font-bold shadow-sm"
                    />
                </div>
                {globalBranchId === 'all' && (
                    <div className="relative">
                        <MultiSelectBranch
                            branches={branches}
                            selectedIds={selectedBranchIds}
                            onChange={setSelectedBranchIds}
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {isLoading ? <div className="col-span-full py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></div> : filteredCategories.length === 0 ? <div className="col-span-full py-12 text-center text-gray-400">Tidak ada kategori ditemukan</div> :
                    getPaginatedData(filteredCategories).map(c => (
                        <div key={c.name} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-naqupos-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-naqupos-primary shadow-[0_0_10px_rgba(197,137,64,0.4)]"></div>
                                <h4 className="font-bold text-naqupos-dark text-lg">{c.name}</h4>
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Artikel</p>
                                    <p className="text-xl  font-bold text-naqupos-dark">{c.count}</p>
                                    {(branchId === 0 || branchId === 'all') && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {c.is_global ? (
                                                <span className="px-1.5 py-0.5 bg-naqupos-cream text-naqupos-primary text-[9px] font-bold rounded uppercase tracking-wider border border-naqupos-primary/20">Global</span>
                                            ) : c.branchNames.length > 0 ? (
                                                c.branchNames.length === branches.length ? (
                                                    <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded font-bold uppercase">Semua Cabang</span>
                                                ) : (
                                                    c.branchNames.slice(0, 2).map((bn, idx) => (
                                                        <span key={idx} className="text-[9px] bg-gray-50 text-gray-400 px-1 py-0.5 rounded font-bold uppercase">{bn}</span>
                                                    )).concat(c.branchNames.length > 2 ? [<span key="more" className="text-[9px] text-gray-400 font-bold">+{c.branchNames.length - 2}</span>] : [])
                                                )
                                            ) : (
                                                <span className="text-[9px] text-gray-300 italic">Tanpa Cabang</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    {c.id && (
                                        <>
                                            <button
                                                onClick={() => { setEditingCategory(c); setShowModal(true); }}
                                                className="p-2 text-gray-400 hover:text-naqupos-primary hover:bg-naqupos-primary/5 rounded-lg transition-all"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {filteredCategories.length > 0 && (
                <div className="mt-6 mb-20">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredCategories.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            <button
                onClick={() => { setEditingCategory(null); setShowModal(true); }}
                className="fixed bottom-8 right-8 w-14 h-14 bg-naqupos-primary hover:bg-naqupos-primary/90 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-40"
            >
                <Plus size={28} />
            </button>

            {showModal && (
                <ArticleCategoryModal
                    category={editingCategory}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); fetchData(); }}
                    isNew={!editingCategory}
                    branches={branches}
                />
            )}

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, category: null, loading: false })}
                onConfirm={confirmDelete}
                title="Hapus Kategori Artikel"
                message={`Anda yakin ingin menghapus kategori "${deleteModal.category?.name}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmLabel="Hapus"
                type="danger"
                isLoading={deleteModal.loading}
            />
        </div>
    );
}

function ArticleCategoryModal({ category, onClose, onSuccess, isNew = false, branches }: any) {
    const [newName, setNewName] = useState(category?.name || '');
    const [isGlobal, setIsGlobal] = useState(category ? category.is_global : true);
    const [branchIds, setBranchIds] = useState<number[]>(category ? category.branch_ids : []);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                name: newName,
                is_global: isGlobal,
                branch_ids: isGlobal ? [] : branchIds
            };

            if (isNew) {
                await api.createNewsCategory(payload);
            } else {
                await api.updateNewsCategory(category.id, payload);
            }
            onSuccess();
        } catch (err) { swal.error('Gagal menyimpan kategori'); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-naqupos-dark/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slideUp">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-naqupos-dark">{isNew ? 'Tambah Kategori Artikel' : 'Ubah Kategori Artikel'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nama Kategori</label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-naqupos-primary transition-colors font-bold"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Akses Cabang</label>
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white hover:border-naqupos-primary transition-all group">
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isGlobal ? 'bg-naqupos-primary border-naqupos-primary' : 'bg-white border-gray-300'}`}>
                                {isGlobal && <Check size={14} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
                            <span className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</span>
                        </label>

                        {!isGlobal && (
                            <div className="grid grid-cols-1 gap-2 mt-2 animate-fadeIn max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {branches.map((branch: any) => {
                                    const isSelected = branchIds.includes(branch.id);
                                    return (
                                        <label key={branch.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white hover:border-naqupos-primary transition-all group">
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-naqupos-primary border-naqupos-primary' : 'bg-white border-gray-300'}`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={isSelected}
                                                onChange={() => {
                                                    const newBranchIds = isSelected
                                                        ? branchIds.filter(id => id !== branch.id)
                                                        : [...branchIds, branch.id];
                                                    setBranchIds(newBranchIds);

                                                    // Auto-check global if all branches are now selected
                                                    if (newBranchIds.length === branches.length) {
                                                        setIsGlobal(true);
                                                        setBranchIds([]);
                                                    }
                                                }}
                                            />
                                            <span className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">{branch.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !newName || (!isGlobal && branchIds.length === 0)}
                        className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting || !newName || (!isGlobal && branchIds.length === 0) ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary hover:bg-[#B07835]'}`}
                    >
                        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                        {isNew ? 'Tambah Kategori' : 'Simpan Perubahan'}
                    </button>
                </form>
            </div>
        </div>
    );
}
