import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Percent, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import type { Tax, Branch } from '../../services/api';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../../components/common/ConfirmationModal';

export default function TaxPage() {
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showTaxModal, setShowTaxModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [taxForm, setTaxForm] = useState<{ id?: number; name: string; percentage: string; locations: number[] }>({
        name: '',
        percentage: '',
        locations: []
    });

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchTaxes = async () => {
        try {
            const data = await api.getTaxes();
            setTaxes(data);
        } catch (error) {
            console.error('Error fetching taxes:', error);
            toast.error('Gagal memuat data pajak');
        }
    };

    const fetchBranches = async () => {
        try {
            const data = await api.getBranches();
            setBranches(data);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchTaxes(), fetchBranches()]);
            setIsLoading(false);
        };
        loadData();
    }, []);

    const handleSaveTax = async () => {
        if (!taxForm.name || !taxForm.percentage) return toast.error('Mohon lengkapi form');
        try {
            setSaving(true);
            if (taxForm.id) {
                await api.updateTax(taxForm.id, {
                    name: taxForm.name,
                    percentage: Number(taxForm.percentage),
                    locations: taxForm.locations
                });
                toast.success('Pajak berhasil diperbarui');
            } else {
                await api.createTax({
                    name: taxForm.name,
                    percentage: Number(taxForm.percentage),
                    locations: taxForm.locations
                });
                toast.success('Pajak berhasil ditambahkan');
            }
            setShowTaxModal(false);
            setTaxForm({ name: '', percentage: '', locations: [] });
            fetchTaxes();
        } catch (error) {
            console.error('Error saving tax:', error);
            toast.error('Gagal menyimpan pajak');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTax = (id: number) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteTax(deleteId);
            toast.success('Pajak berhasil dihapus');
            fetchTaxes();
        } catch (error) {
            console.error('Error deleting tax:', error);
            toast.error('Gagal menghapus pajak');
        } finally {
            setDeleteId(null);
        }
    };

    const handleEditTax = (tax: Tax) => {
        setTaxForm({
            id: tax.id,
            name: tax.name,
            percentage: String(tax.percentage),
            locations: tax.locations || []
        });
        setShowTaxModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manajemen Pajak</h1>
                    <p className="text-sm text-gray-500">Kelola daftar pajak yang berlaku untuk layanan dan produk Anda.</p>
                </div>
                <button
                    onClick={() => {
                        setTaxForm({ name: '', percentage: '', locations: [] });
                        setShowTaxModal(true);
                    }}
                    className="px-4 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent transition-colors flex items-center gap-2"
                >
                    <Plus size={18} /> Pajak Baru
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Nama Pajak</th>
                                <th className="px-6 py-4">Persentase</th>
                                <th className="px-6 py-4">Berlaku di Cabang</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Loader2 size={32} className="animate-spin text-naqupos-primary mb-2" />
                                            <p>Memuat data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : taxes.length > 0 ? taxes.map(tax => (
                                <tr key={tax.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{tax.name}</td>
                                    <td className="px-6 py-4">{tax.percentage}%</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {tax.locations.length === branches.length && branches.length > 0 ? (
                                                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold">Semua Cabang</span>
                                            ) : tax.locations.length > 0 ? (
                                                tax.locations.map((branchId: number) => {
                                                    const branch = branches.find(b => b.id === branchId);
                                                    return branch ? (
                                                        <span key={branchId} className="px-2 py-0.5 bg-orange-50 text-naqupos-primary rounded text-[10px] font-bold">
                                                            {branch.name}
                                                        </span>
                                                    ) : null;
                                                })
                                            ) : (
                                                <span className="text-gray-400 italic">Belum ditentukan</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEditTax(tax)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTax(tax.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Percent size={48} className="text-gray-200 mb-2" />
                                            <p>Belum ada data pajak</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tax Modal */}
            {showTaxModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{taxForm.id ? 'Edit Pajak' : 'Pajak Baru'}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Tetapkan nama pajak dan tingkat persentase yang akan diterapkan pada transaksi.
                                </p>
                            </div>
                            <button onClick={() => setShowTaxModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
                                        <input
                                            type="text"
                                            value={taxForm.name}
                                            onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-naqupos-primary outline-none"
                                            placeholder="e.g. PPN 11%"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Persentase</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={taxForm.percentage}
                                                onChange={(e) => setTaxForm({ ...taxForm, percentage: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-naqupos-primary outline-none"
                                                placeholder="0.0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Terapkan pada Cabang</label>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-4 py-3 w-10">
                                                            <input
                                                                type="checkbox"
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setTaxForm({ ...taxForm, locations: branches.map(b => b.id) });
                                                                    else setTaxForm({ ...taxForm, locations: [] });
                                                                }}
                                                                checked={taxForm.locations.length === branches.length && branches.length > 0}
                                                                className="rounded border-gray-300 text-naqupos-primary focus:ring-naqupos-primary w-4 h-4"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 border-l border-gray-100">Nama Cabang</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {branches.map(branch => (
                                                        <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={taxForm.locations.includes(branch.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setTaxForm({ ...taxForm, locations: [...taxForm.locations, branch.id] });
                                                                        else setTaxForm({ ...taxForm, locations: taxForm.locations.filter(id => id !== branch.id) });
                                                                    }}
                                                                    className="rounded border-gray-300 text-naqupos-primary focus:ring-naqupos-primary w-4 h-4"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-700 border-l border-gray-50">{branch.name}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50">
                            <button
                                onClick={() => setShowTaxModal(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium shadow-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveTax}
                                disabled={saving}
                                className="px-6 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent transition-colors disabled:opacity-50 font-bold flex items-center gap-2 shadow-sm"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Hapus Pajak?"
                message="Apakah Anda yakin ingin menghapus pajak ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Ya, Hapus"
                cancelLabel="Batal"
                type="danger"
            />
        </div>
    );
}
