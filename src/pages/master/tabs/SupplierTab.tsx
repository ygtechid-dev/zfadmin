import React, { useState, useEffect } from 'react';
import { Search, Loader2, Pencil, Trash2, Plus, X, Check, AlertTriangle } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { api } from '../../../services/api';

import MultiSelectBranch from '../../../components/common/MultiSelectBranch';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import swal from '../../../utils/swal';

interface Supplier {
    id: number;
    name: string;
    code?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    is_active: boolean;
    is_global: boolean;
    branch_ids: number[];
    branchNames: string[];
}

interface SupplierTabProps {
    branchId: string | number;
    branches: any[];
    globalBranchId: string | number;
    setBranchFilter: (id: string | number) => void;
}

export default function SupplierTab({ branchId, branches, globalBranchId }: SupplierTabProps) {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);

    useEffect(() => {
        if (branchId !== 0 && branchId !== 'all') setSelectedBranchIds([]);
    }, [branchId]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params: any = { search: search || undefined };
            const isSpecificGlobal = branchId && branchId !== 0 && branchId !== 'all';

            if (isSpecificGlobal) params.branch_id = branchId;

            const res = await api.getSuppliers(params);

            let data = res || [];

            // Filter LOCAL if global is NOT specific
            if (!isSpecificGlobal && selectedBranchIds.length > 0) {
                // Keep if global or if matches selected branches
                data = data.filter((s: any) => s.is_global || (s.branches && s.branches.some((b: any) => selectedBranchIds.includes(b.id))));
            }

            // Map branches properly
            const mappedSuppliers = data.map((s: any) => ({
                ...s,
                is_global: !!s.is_global,
                branch_ids: s.branches ? s.branches.map((b: any) => b.id) : (s.branch_id ? [s.branch_id] : []),
                branchNames: s.is_global ? ['Global'] : (s.branches ? s.branches.map((b: any) => b.name) : [])
            }));

            setSuppliers(mappedSuppliers);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [search, branchId, selectedBranchIds]);

    const getPaginatedData = (data: Supplier[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [search, branchId, selectedBranchIds]);

    const [deleteModal, setDeleteModal] = useState<{ show: boolean; supplierId: number | null; loading: boolean }>({
        show: false, supplierId: null, loading: false
    });

    const handleDelete = (id: number) => {
        setDeleteModal({ show: true, supplierId: id, loading: false });
    };

    const confirmDelete = async () => {
        if (!deleteModal.supplierId) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            await api.deleteSupplier(deleteModal.supplierId);
            setDeleteModal({ show: false, supplierId: null, loading: false });
            fetchData();
        } catch (err) {
            swal.error('Gagal menghapus supplier');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari supplier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-naqupos-primary/10 transition-all"
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
                {/* <div className="flex gap-2">
                    <button
                        onClick={() => { setEditingSupplier(null); setShowModal(true); }}
                        className="px-4 py-2 bg-naqupos-primary text-white rounded-xl text-sm font-bold shadow-lg hover:bg-naqupos-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Tambah Supplier
                    </button>
                </div> */}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#FAF8F1] text-gray-400 font-bold text-[10px] uppercase tracking-wider border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Nama Pemasok</th>
                            <th className="px-6 py-4">Kontak/Telepon</th>
                            <th className="px-6 py-4">Alamat</th>
                            {(branchId === 0 || branchId === 'all') && <th className="px-6 py-4">Cabang</th>}
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan={(branchId === 0 || branchId === 'all') ? 6 : 5} className="px-6 py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></td></tr>
                        ) : suppliers.length === 0 ? (
                            <tr><td colSpan={(branchId === 0 || branchId === 'all') ? 6 : 5} className="px-6 py-12 text-center text-gray-400">Tidak ada supplier</td></tr>
                        ) : (
                            getPaginatedData(suppliers).map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-naqupos-dark">{s.name}</div>
                                        <div className="text-[10px] text-gray-400 ">{s.code || 'NO-CODE'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-naqupos-dark font-medium">{s.contact_person || '-'}</div>
                                        <div className="text-gray-500 text-xs">{s.phone || s.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">{s.address || '-'}</td>
                                    {(branchId === 0 || branchId === 'all') && (
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {s.is_global ? (
                                                    <span className="px-1.5 py-0.5 bg-naqupos-cream text-naqupos-primary text-[9px] font-bold rounded uppercase tracking-wider border border-naqupos-primary/20">Global</span>
                                                ) : s.branchNames.length > 0 ? (
                                                    s.branchNames.length === branches.length ? (
                                                        <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded font-bold uppercase">Semua Cabang</span>
                                                    ) : (
                                                        s.branchNames.slice(0, 2).map((bn, idx) => (
                                                            <span key={idx} className="text-[9px] bg-gray-50 text-gray-400 px-1 py-0.5 rounded font-bold uppercase">{bn}</span>
                                                        )).concat(s.branchNames.length > 2 ? [<span key="more" className="text-[9px] text-gray-400 font-bold">+{s.branchNames.length - 2}</span>] : [])
                                                    )
                                                ) : (
                                                    <span className="text-[9px] text-gray-300 italic">Tanpa Cabang</span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.is_active ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                                            {s.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingSupplier(s); setShowModal(true); }}
                                                className="p-2 text-gray-400 hover:text-naqupos-primary hover:bg-naqupos-primary/5 rounded-lg transition-all"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {suppliers.length > 0 && (
                <div className="mt-4 mb-20 px-6">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={suppliers.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            <button
                onClick={() => { setEditingSupplier(null); setShowModal(true); }}
                className="fixed bottom-10 right-10 w-14 h-14 bg-naqupos-primary text-white rounded-full shadow-xl shadow-orange-900/20 flex items-center justify-center hover:bg-[#B07835] hover:scale-110 transition-all z-50"
            >
                <Plus size={28} />
            </button>

            {showModal && (
                <SupplierModal
                    supplier={editingSupplier}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); fetchData(); }}
                    branches={branches}
                />
            )}

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, supplierId: null, loading: false })}
                onConfirm={confirmDelete}
                title="Hapus Supplier"
                message="Apakah Anda yakin ingin menghapus supplier ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Hapus"
                type="danger"
                isLoading={deleteModal.loading}
            />
        </div>
    );
}

function SupplierModal({ supplier, onClose, onSuccess, branches }: { supplier: Supplier | null; onClose: () => void; onSuccess: () => void; branches: any[] }) {
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: supplier?.name || '',
        code: supplier?.code || '',
        contact_person: supplier?.contact_person || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        address: supplier?.address || '',
        is_active: supplier ? supplier.is_active : true,
        is_global: supplier ? supplier.is_global : true,
        branch_ids: supplier ? supplier.branch_ids : []
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        // Phone Validation
        const phoneClean = form.phone.replace(/[\s-]/g, '');
        if (phoneClean && !phoneClean.startsWith('08') && !phoneClean.startsWith('+628') && !phoneClean.startsWith('02')) {
            setErrorMsg('Format telepon salah. Harus diawali 08, +628, atau 02');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                branch_ids: form.is_global ? [] : form.branch_ids
            };
            if (supplier) {
                await api.updateSupplier(supplier.id, payload);
            } else {
                await api.createSupplier(payload);
            }
            onSuccess();
        } catch (err) {
            setErrorMsg('Gagal menyimpan supplier');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-naqupos-dark/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slideUp">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-naqupos-cream/30">
                    <h3 className="text-xl  font-bold text-naqupos-dark">{supplier ? 'Edit Supplier' : 'Tambah Supplier'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20} /></button>
                </div>
                {errorMsg && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2 animate-shake">
                        <AlertTriangle size={14} /> {errorMsg}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-3">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Akses Cabang</label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white hover:border-naqupos-primary transition-all group">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${form.is_global ? 'bg-naqupos-primary border-naqupos-primary' : 'bg-white border-gray-300'}`}>
                                    {form.is_global && <Check size={14} className="text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={form.is_global}
                                    onChange={(e) => setForm({ ...form, is_global: e.target.checked })}
                                />
                                <span className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</span>
                            </label>

                            {!form.is_global && (
                                <div className="grid grid-cols-2 gap-2 mt-2 animate-fadeIn max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {branches.map(branch => {
                                        const isSelected = form.branch_ids.includes(branch.id);
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
                                                            ? form.branch_ids.filter(id => id !== branch.id)
                                                            : [...form.branch_ids, branch.id];

                                                        // Auto-check global if all branches are now selected
                                                        if (newBranchIds.length === branches.length) {
                                                            setForm({ ...form, is_global: true, branch_ids: [] });
                                                        } else {
                                                            setForm({ ...form, branch_ids: newBranchIds });
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
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nama Pemasok</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-naqupos-primary transition-colors"
                                value={form.name}
                                onChange={e => {
                                    const val = e.target.value;
                                    setForm(prev => {
                                        const newState = { ...prev, name: val };
                                        if (!supplier) {
                                            const initials = val.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3);
                                            const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
                                            newState.code = val.length > 2 ? `SUP-${initials}${random}` : prev.code;
                                        }
                                        return newState;
                                    });
                                }}
                                placeholder="Contoh: PT. Sumber Makmur"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Kode Supplier</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={form.code}
                                    readOnly={true}
                                    placeholder="Auto-generated"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 text-sm font-mono cursor-not-allowed"
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center">
                                    <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-medium">AUTO</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nama Kontak</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-naqupos-primary transition-colors"
                                value={form.contact_person}
                                onChange={e => setForm({ ...form, contact_person: e.target.value })}
                                placeholder="Nama personil"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telepon</label>
                            <input
                                type="text"
                                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none focus:border-naqupos-primary transition-colors ${errorMsg && form.phone.replace(/[\s-]/g, '') && !form.phone.replace(/[\s-]/g, '').startsWith('08') && !form.phone.replace(/[\s-]/g, '').startsWith('+628') && !form.phone.replace(/[\s-]/g, '').startsWith('02') ? 'border-red-300' : 'border-gray-200'}`}
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                placeholder="0812... / 02..."
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-naqupos-primary transition-colors"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="supplier@mail.com"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Alamat</label>
                            <textarea
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-naqupos-primary transition-colors h-24 resize-none"
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                placeholder="Alamat lengkap supplier..."
                            />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={form.is_active}
                                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                className="w-4 h-4 text-naqupos-primary border-gray-300 rounded focus:ring-naqupos-primary"
                            />
                            <label htmlFor="is_active" className="text-sm text-gray-600 font-medium">Supplier Aktif</label>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !form.name || (!form.is_global && form.branch_ids.length === 0)}
                            className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg shadow-orange-900/10 transition-all flex items-center justify-center gap-2 ${isSubmitting || !form.name || (!form.is_global && form.branch_ids.length === 0)
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-naqupos-primary hover:bg-[#B07835]'
                                }`}
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Supplier'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
