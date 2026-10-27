import React, { useState, useEffect } from 'react';
import { Search, Loader2, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { api } from '../../../services/api';

import MultiSelectBranch from '../../../components/common/MultiSelectBranch';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import swal from '../../../utils/swal';

interface BrandTabProps {
    branchId: string | number;
    branches: any[];
    globalBranchId: string | number;
    setBranchFilter: (id: string | number) => void;
}

interface BrandDisplay {
    id?: number;
    name: string;
    count: number;
    branchNames: string[];
    is_global: boolean;
    branch_ids: number[];
}

export default function BrandTab({ branchId, branches, globalBranchId }: BrandTabProps) {
    const [brands, setBrands] = useState<BrandDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingBrand, setEditingBrand] = useState<BrandDisplay | null>(null);
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

            if (isSpecificGlobal) params.branch_id = branchId;

            const [productsRes, brandsRes] = await Promise.all([
                api.getProducts(params),
                api.getBrands()
            ]);

            const products = productsRes.data || [];
            const masterBrands = brandsRes || [];

            // 1. Start with Master Brands
            const brandMap: Record<string, BrandDisplay> = {};

            masterBrands.forEach((mb: any) => {
                const isItemGlobal = mb.is_global === 1 || mb.is_global === true || mb.is_global === '1';
                const itemBranchIds = mb.branches ? mb.branches.map((br: any) => Number(br.id)) : (mb.branch_id ? [Number(mb.branch_id)] : []);

                const currentBranchIdNum = branchId === 'all' ? 0 : Number(branchId);
                const isSpecificGlobal = currentBranchIdNum !== 0;

                const matchesBranch =
                    !isSpecificGlobal ? (
                        selectedBranchIds.length === 0 || isItemGlobal || selectedBranchIds.some((id: number) => itemBranchIds.includes(id))
                    ) : (
                        isItemGlobal || itemBranchIds.includes(currentBranchIdNum)
                    );

                if (matchesBranch) {
                    const brNames = isItemGlobal ? ['Global'] : (mb.branches ? mb.branches.map((br: any) => br.name) : []);
                    brandMap[mb.name] = {
                        id: mb.id,
                        name: mb.name,
                        count: 0,
                        branchNames: brNames,
                        is_global: isItemGlobal,
                        branch_ids: itemBranchIds
                    };
                }
            });

            // 2. Count usage from Products and add missing legacy brands
            products.forEach((p: any) => {
                // Local Multi-Branch Filter (for products calculation)
                if (!isSpecificGlobal && selectedBranchIds.length > 0) {
                    if (!p.branch_id || !selectedBranchIds.includes(p.branch_id)) return;
                }

                const b = p.brand_name || 'Tanpa Merk';

                if (!brandMap[b]) {
                    // It's a legacy brand (string only) or 'Tanpa Merk'
                    brandMap[b] = {
                        name: b,
                        count: 0,
                        branchNames: [],
                        is_global: false,
                        branch_ids: []
                    };
                }

                brandMap[b].count++;

                // Accumulate branch names from products for legacy brands or enriched display
                if (p.branch_id) {
                    const brName = branches.find(br => br.id === p.branch_id)?.name;
                    if (brName && !brandMap[b].branchNames.includes(brName)) {
                        brandMap[b].branchNames.push(brName);
                    }
                }
            });

            setBrands(Object.values(brandMap).sort((a, b) => b.count - a.count));
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [branchId, selectedBranchIds]);

    const [deleteModal, setDeleteModal] = useState<{ show: boolean; brand: BrandDisplay | null; loading: boolean }>({
        show: false, brand: null, loading: false
    });

    const handleDelete = (brand: BrandDisplay) => {
        if (brand.name === 'Tanpa Merk') return;
        setDeleteModal({ show: true, brand, loading: false });
    };

    const confirmDelete = async () => {
        if (!deleteModal.brand) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            if (deleteModal.brand.id) {
                await api.deleteMasterBrand(deleteModal.brand.id);
            }
            // Also try to remove from products string (legacy cleanup)
            await api.deleteBrand(deleteModal.brand.name);
            setDeleteModal({ show: false, brand: null, loading: false });
            fetchData();
        } catch (err) {
            swal.error('Gagal menghapus merk');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

    const getPaginatedData = (data: typeof brands) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    // Reset pagination when filter changes
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
                        placeholder="Cari merk..."
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
                {isLoading ? <div className="col-span-full py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></div> : filteredBrands.length === 0 ? <div className="col-span-full py-12 text-center text-gray-400">Tidak ada merk ditemukan</div> :
                    getPaginatedData(filteredBrands).map(b => (
                        <div key={b.name} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#FAF8F1] text-naqupos-primary flex items-center justify-center rounded-xl  text-xl font-bold border border-naqupos-primary/10">
                                    {b.name[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-naqupos-dark">{b.name}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{b.count} Produk</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{b.count} Produk</p>
                                    {(branchId === 0 || branchId === 'all') && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {b.is_global ? (
                                                <span className="px-1.5 py-0.5 bg-naqupos-cream text-naqupos-primary text-[9px] font-bold rounded uppercase tracking-wider border border-naqupos-primary/20">Global</span>
                                            ) : b.branchNames.length > 0 ? (
                                                b.branchNames.length === branches.length ? (
                                                    <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded font-bold uppercase">Semua Cabang</span>
                                                ) : (
                                                    b.branchNames.slice(0, 2).map((bn, idx) => (
                                                        <span key={idx} className="text-[9px] bg-gray-50 text-gray-400 px-1 py-0.5 rounded font-bold uppercase">{bn}</span>
                                                    )).concat(b.branchNames.length > 2 ? [<span key="more" className="text-[9px] text-gray-400 font-bold">+{b.branchNames.length - 2}</span>] : [])
                                                )
                                            ) : (
                                                <span className="text-[9px] text-gray-300 italic">Tanpa Cabang</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {b.name !== 'Tanpa Merk' && (
                                    <>
                                        <button
                                            onClick={() => { setEditingBrand(b); setShowModal(true); }}
                                            className="p-2 text-gray-400 hover:text-naqupos-primary hover:bg-naqupos-primary/5 rounded-lg transition-all"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(b)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
            </div>

            {filteredBrands.length > 0 && (
                <div className="mt-6 mb-20">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredBrands.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            <button
                onClick={() => { setEditingBrand(null); setShowModal(true); }}
                className="fixed bottom-8 right-8 w-14 h-14 bg-naqupos-primary hover:bg-naqupos-primary/90 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-40"
            >
                <Plus size={28} />
            </button>

            {showModal && (
                <BrandModal
                    brand={editingBrand}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); fetchData(); }}
                    isNew={!editingBrand}
                    branches={branches}
                />
            )}

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, brand: null, loading: false })}
                onConfirm={confirmDelete}
                title="Hapus Merk"
                message={`Anda yakin ingin menghapus merk "${deleteModal.brand?.name}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmLabel="Hapus"
                type="danger"
                isLoading={deleteModal.loading}
            />
        </div>
    );
}

interface BrandModalProps {
    brand: BrandDisplay | null;
    onClose: () => void;
    onSuccess: () => void;
    isNew?: boolean;
    branches: any[];
}

function BrandModal({ brand, onClose, onSuccess, isNew = false, branches }: BrandModalProps) {
    const [newName, setNewName] = useState(brand?.name || '');
    const [isGlobal, setIsGlobal] = useState(brand ? brand.is_global : true);
    const [branchIds, setBranchIds] = useState<number[]>(brand ? brand.branch_ids : []);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial load
    useEffect(() => {
        if (brand) {
            setNewName(brand.name);
            setIsGlobal(brand.is_global);
            setBranchIds(brand.branch_ids);
        }
    }, [brand]);

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
                await api.createBrand(payload);
            } else {
                if (brand?.id) {
                    await api.updateMasterBrand(brand.id, payload);
                }

                if (brand?.name) {
                    await api.updateBrand({
                        old_name: brand.name,
                        new_name: newName,
                        ...payload
                    });
                }
            }
            onSuccess();
        } catch (err) { swal.error('Gagal menyimpan merk'); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-naqupos-dark/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slideUp">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg  font-bold text-naqupos-dark">{isNew ? 'Tambah Merk Baru' : 'Ubah Nama Merk'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nama Merk</label>
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
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={isGlobal}
                                onChange={(e) => setIsGlobal(e.target.checked)}
                            />
                            <span className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</span>
                        </label>

                        {!isGlobal && (
                            <div className="grid grid-cols-1 gap-2 mt-2 animate-fadeIn max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {branches.map(branch => {
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
                        className={`w-full py-3 text-white font-bold rounded-xl shadow-lg shadow-orange-900/10 transition-all flex items-center justify-center gap-2 ${isSubmitting || !newName || (!isGlobal && branchIds.length === 0)
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-naqupos-primary hover:bg-[#B07835]'
                            }`}
                    >
                        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                        {isNew ? 'Tambah Merk' : 'Simpan Perubahan'}
                    </button>
                </form>
            </div>
        </div>
    );
}
