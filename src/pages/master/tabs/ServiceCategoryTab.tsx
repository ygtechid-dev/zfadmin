import React, { useState, useEffect } from 'react';
import { Search, Loader2, Pencil, Trash2, Plus, X, Check, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { api } from '../../../services/api';
import MultiSelectBranch from '../../../components/common/MultiSelectBranch';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import swal from '../../../utils/swal';

interface ServiceCategoryTabProps {
    branchId: string | number;
    branches: any[];
    globalBranchId: string | number;
    setBranchFilter?: (id: string | number) => void;
}


interface CategoryDisplay {
    id?: number;
    name: string;
    count: number;
    branchNames: string[];
    is_global: boolean;
    branch_ids: number[];
    image?: string;
}

export default function ServiceCategoryTab({ branchId, branches, globalBranchId }: ServiceCategoryTabProps) {
    const [categories, setCategories] = useState<CategoryDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState<CategoryDisplay | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);

    const [isReordering, setIsReordering] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

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

            const [servicesRes, categoriesRes] = await Promise.all([
                api.getServices(params),
                api.getServiceCategories()
            ]);

            const services = servicesRes.data || [];
            const masterCategories = categoriesRes || [];

            const catMap: Record<string, CategoryDisplay & { position: number }> = {};

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
                        branch_ids: itemBranchIds,
                        position: mc.position || 0,
                        image: mc.image
                    };
                }
            });

            // Count usage from Services
            services.forEach((s: any) => {
                const c = s.category || 'Lainnya';

                if (!catMap[c]) {
                    catMap[c] = {
                        name: c,
                        count: 0,
                        branchNames: [],
                        is_global: true,
                        branch_ids: [],
                        position: 999
                    };
                }

                catMap[c].count++;
            });

            const sorted = Object.values(catMap).sort((a, b) => {
                if (a.position !== b.position) return a.position - b.position;
                return b.count - a.count;
            });

            setCategories(sorted);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newCats = [...categories];
        [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
        setCategories(newCats);
    };

    const handleMoveDown = (index: number) => {
        if (index === categories.length - 1) return;
        const newCats = [...categories];
        [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
        setCategories(newCats);
    };

    const saveOrder = async () => {
        setIsSavingOrder(true);
        try {
            const reorderData = categories
                .filter(c => c.id)
                .map((c, idx) => ({ id: c.id!, position: idx + 1 }));

            await api.reorderServiceCategories(reorderData);
            setIsReordering(false);
            fetchData();
        } catch (err) {
            swal.error('Gagal menyimpan urutan');
        } finally {
            setIsSavingOrder(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [branchId, selectedBranchIds]);

    const [deleteModal, setDeleteModal] = useState<{ show: boolean; category: CategoryDisplay | null; loading: boolean }>({
        show: false, category: null, loading: false
    });

    const handleDelete = (category: CategoryDisplay) => {
        setDeleteModal({ show: true, category, loading: false });
    };

    const confirmDelete = async () => {
        if (!deleteModal.category?.id) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            await api.deleteServiceCategory(deleteModal.category.id);
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
            <div className="mb-6 flex flex-col xl:flex-row gap-4 items-start xl:items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cari kategori layanan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-naqupos-primary transition-colors text-sm font-bold shadow-sm"
                    />
                </div>

                <div className="flex gap-2 w-full xl:w-auto">
                    {isReordering ? (
                        <>
                            <button
                                onClick={() => { setIsReordering(false); fetchData(); }}
                                className="flex-1 xl:flex-none px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={saveOrder}
                                disabled={isSavingOrder}
                                className="flex-1 xl:flex-none px-4 py-3 bg-naqupos-primary text-white font-bold rounded-xl hover:bg-[#B07835] transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                {isSavingOrder && <Loader2 size={16} className="animate-spin" />}
                                Simpan Urutan
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsReordering(true)}
                            className="flex-1 xl:flex-none px-4 py-3 bg-white border border-gray-100 text-naqupos-primary font-bold rounded-xl hover:bg-naqupos-primary/5 transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
                        >
                            <GripVertical size={16} />
                            Atur Urutan
                        </button>
                    )}

                    {globalBranchId === 'all' && (
                        <div className="relative flex-1 xl:flex-none">
                            <MultiSelectBranch
                                branches={branches}
                                selectedIds={selectedBranchIds}
                                onChange={setSelectedBranchIds}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {isLoading ? <div className="col-span-full py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></div> : filteredCategories.length === 0 ? <div className="col-span-full py-12 text-center text-gray-400">Tidak ada kategori ditemukan</div> :
                    getPaginatedData(filteredCategories).map((c, idx) => (
                        <div key={c.name} className={`bg-white border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${isReordering ? 'border-naqupos-primary/30 ring-1 ring-naqupos-primary/10' : 'border-gray-100'}`}>
                            {isReordering && (
                                <div className="absolute top-0 left-0 w-1 h-full bg-naqupos-primary"></div>
                            )}

                            {/* Category Image */}
                            <div className="mb-4 -mx-4 -mt-4 bg-gray-50 h-24 flex items-center justify-center overflow-hidden">
                                {c.image ? (
                                    <img
                                        src={`${import.meta.env.VITE_STORAGE_URL || 'https://zafaranbe.memofy-dev.my.id'}${c.image}`}
                                        alt={c.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Plus size={24} className="text-naqupos-primary/10" />
                                )}
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                {isReordering && <GripVertical className="text-naqupos-primary/40" size={16} />}
                                <div className="w-2 h-2 rounded-full bg-naqupos-primary shadow-[0_0_10px_rgba(197,137,64,0.4)]"></div>
                                <h4 className="font-bold text-naqupos-dark text-base flex-1 truncate" title={c.name}>{c.name}</h4>

                                {isReordering && (
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => handleMoveUp(idx)}
                                            disabled={idx === 0}
                                            className={`p-1 rounded hover:bg-gray-100 ${idx === 0 ? 'text-gray-200' : 'text-gray-400'}`}
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleMoveDown(idx)}
                                            disabled={idx === filteredCategories.length - 1}
                                            className={`p-1 rounded hover:bg-gray-100 ${idx === filteredCategories.length - 1 ? 'text-gray-200' : 'text-gray-400'}`}
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Layanan</p>
                                    <p className="text-lg font-bold text-naqupos-dark">{c.count}</p>
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
                                {!isReordering && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        {c.id && (
                                            <>
                                                <button
                                                    onClick={() => { setEditingCategory(c); setShowModal(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-naqupos-primary hover:bg-naqupos-primary/5 rounded-lg transition-all"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
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
                <ServiceCategoryModal
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
                title="Hapus Kategori Layanan"
                message={`Anda yakin ingin menghapus kategori layanan "${deleteModal.category?.name}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmLabel="Hapus"
                type="danger"
                isLoading={deleteModal.loading}
            />
        </div>
    );
}

function ServiceCategoryModal({ category, onClose, onSuccess, isNew = false, branches }: any) {
    const [newName, setNewName] = useState(category?.name || '');
    const [isGlobal, setIsGlobal] = useState(category ? category.is_global : true);
    const [branchIds, setBranchIds] = useState<number[]>(category ? category.branch_ids : []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState(category?.image ? `${import.meta.env.VITE_STORAGE_URL || 'https://zafaranbe.memofy-dev.my.id'}${category.image}` : '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                name: newName,
                is_global: isGlobal,
                branch_ids: isGlobal ? [] : branchIds
            };

            let categoryId = category?.id;

            if (isNew) {
                const res = await api.createServiceCategory(payload);
                categoryId = res.id;
            } else {
                await api.updateServiceCategory(category.id, payload);
            }

            if (categoryId && imageFile) {
                try {
                    await api.uploadServiceCategoryImage(categoryId, imageFile);
                } catch (imgErr) {
                    console.error('Category image upload failed:', imgErr);
                }
            }

            onSuccess();
        } catch (err) { swal.error('Gagal menyimpan kategori'); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-naqupos-dark/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slideUp">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-naqupos-dark">{isNew ? 'Tambah Kategori Layanan' : 'Ubah Kategori Layanan'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex flex-col items-center gap-2 mb-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 group-hover:border-naqupos-primary transition-colors">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-2">
                                        <Plus size={20} className="text-gray-300 mx-auto mb-1" />
                                        <span className="text-[8px] text-gray-400 font-bold uppercase">Foto</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            if (file.size > 5 * 1024 * 1024) {
                                                swal.warning('File terlalu besar. Max 5MB.');
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setImageFile(file);
                                                setImagePreview(reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            {imagePreview && (
                                <button
                                    type="button"
                                    onClick={() => { setImageFile(null); setImagePreview(''); }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
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
