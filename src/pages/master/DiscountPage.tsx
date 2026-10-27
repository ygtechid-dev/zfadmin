import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Tag, Loader2, Info } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../../components/common/ConfirmationModal';

interface DiscountType {
    id: number;
    name: string;
    type: 'fixed' | 'percentage';
    value: number;
    appliesTo: {
        service: boolean;
        class: boolean;
        product: boolean;
        voucher: boolean;
        total: boolean;
    };
}

export default function DiscountPage() {
    const [discounts, setDiscounts] = useState<DiscountType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [discountForm, setDiscountForm] = useState<{
        id?: number;
        name: string;
        value: string;
        type: 'fixed' | 'percentage';
        appliesTo: {
            service: boolean;
            class: boolean;
            product: boolean;
            voucher: boolean;
            total: boolean;
        };
    }>({
        name: '',
        value: '',
        type: 'percentage',
        appliesTo: {
            service: true,
            class: false,
            product: false,
            voucher: false,
            total: false
        }
    });

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchDiscountTypes = async () => {
        try {
            const data = await api.getDiscountTypes();
            setDiscounts(data);
        } catch (error) {
            console.error('Error fetching discount types:', error);
            toast.error('Gagal memuat tipe diskon');
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await fetchDiscountTypes();
            setIsLoading(false);
        };
        loadData();
    }, []);

    const handleSaveDiscount = async () => {
        if (!discountForm.name || !discountForm.value) return toast.error('Mohon lengkapi form');
        try {
            setSaving(true);
            const payload = {
                name: discountForm.name,
                value: Number(discountForm.value),
                type: discountForm.type,
                appliesTo: discountForm.appliesTo
            };

            if (discountForm.id) {
                await api.updateDiscountType(discountForm.id, payload);
                toast.success('Tipe diskon berhasil diperbarui');
            } else {
                await api.createDiscountType(payload);
                toast.success('Tipe diskon berhasil ditambahkan');
            }
            setShowDiscountModal(false);
            setDiscountForm({
                name: '',
                value: '',
                type: 'percentage',
                appliesTo: {
                    service: true,
                    class: false,
                    product: false,
                    voucher: false,
                    total: false
                }
            });
            fetchDiscountTypes();
        } catch (error) {
            console.error('Error saving discount type:', error);
            toast.error('Gagal menyimpan tipe diskon');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDiscount = (id: number) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteDiscountType(deleteId);
            toast.success('Tipe diskon berhasil dihapus');
            fetchDiscountTypes();
        } catch (error) {
            console.error('Error deleting discount type:', error);
            toast.error('Gagal menghapus tipe diskon');
        } finally {
            setDeleteId(null);
        }
    };

    const handleEditDiscount = (discount: DiscountType) => {
        setDiscountForm({
            id: discount.id,
            name: discount.name,
            value: String(discount.value),
            type: discount.type,
            appliesTo: { ...discount.appliesTo }
        });
        setShowDiscountModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Tipe Diskon</h1>
                    <p className="text-sm text-gray-500">Kelola berbagai jenis diskon yang dapat diterapkan pada transaksi pelanggan.</p>
                </div>
                <button
                    onClick={() => {
                        setDiscountForm({
                            name: '',
                            value: '',
                            type: 'percentage',
                            appliesTo: {
                                service: true,
                                class: false,
                                product: false,
                                voucher: false,
                                total: false
                            }
                        });
                        setShowDiscountModal(true);
                    }}
                    className="px-4 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent transition-colors flex items-center gap-2"
                >
                    <Plus size={18} /> Diskon Baru
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Nama Diskon</th>
                                <th className="px-6 py-4">Nilai</th>
                                <th className="px-6 py-4">Tipe</th>
                                <th className="px-6 py-4">Berlaku Untuk</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Loader2 size={32} className="animate-spin text-naqupos-primary mb-2" />
                                            <p>Memuat data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : discounts.length > 0 ? discounts.map(discount => (
                                <tr key={discount.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{discount.name}</td>
                                    <td className="px-6 py-4">
                                        {discount.value}{discount.type === 'percentage' ? '%' : ''}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${discount.type === 'percentage' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                            {discount.type === 'percentage' ? 'Persentase' : 'Tetap (Fixed)'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(discount.appliesTo)
                                                .filter(([, value]) => value)
                                                .map(([key]) => (
                                                    <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                                    </span>
                                                ))}
                                            {Object.values(discount.appliesTo).every(v => !v) && <span className="text-gray-400 italic">None</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEditDiscount(discount)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDiscount(discount.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Tag size={48} className="text-gray-200 mb-2" />
                                            <p>Belum ada data tipe diskon</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Discount Modal */}
            {showDiscountModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">{discountForm.id ? 'Edit Tipe Diskon' : 'Buat Tipe Diskon'}</h3>
                            <button onClick={() => setShowDiscountModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Diskon</label>
                                <input
                                    type="text"
                                    value={discountForm.name}
                                    onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-naqupos-primary outline-none"
                                    placeholder="e.g. Birthday Disc."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Diskon</label>
                                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                                    <input
                                        type="number"
                                        value={discountForm.value}
                                        onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                                        className="w-full px-4 py-2 outline-none font-medium"
                                        placeholder="0"
                                    />
                                    <div className="flex border-l border-gray-300">
                                        <button
                                            onClick={() => setDiscountForm({ ...discountForm, type: 'fixed' })}
                                            className={`px-4 py-2 text-sm font-bold transition-colors ${discountForm.type === 'fixed' ? 'bg-naqupos-primary text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'} `}
                                        >
                                            Rp
                                        </button>
                                        <button
                                            onClick={() => setDiscountForm({ ...discountForm, type: 'percentage' })}
                                            className={`px-4 py-2 text-sm font-bold transition-colors ${discountForm.type === 'percentage' ? 'bg-naqupos-primary text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'} `}
                                        >
                                            %
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <div className="flex gap-3">
                                    <Info size={18} className="text-naqupos-primary shrink-0 mt-0.5" />
                                    <div>
                                        <label className="block text-[10px] font-bold text-naqupos-primary mb-3 uppercase tracking-wider">Berlaku Untuk</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'service', label: 'Layanan' },
                                                { id: 'class', label: 'Kelas' },
                                                { id: 'product', label: 'Produk' },
                                                { id: 'voucher', label: 'Voucher' },
                                                { id: 'total', label: 'Total Transaksi' },
                                            ].map((item) => (
                                                <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={discountForm.appliesTo[item.id as keyof typeof discountForm.appliesTo]}
                                                        onChange={(e) => setDiscountForm({
                                                            ...discountForm,
                                                            appliesTo: {
                                                                ...discountForm.appliesTo,
                                                                [item.id]: e.target.checked
                                                            }
                                                        })}
                                                        className="rounded border-gray-300 text-naqupos-primary focus:ring-naqupos-primary w-4 h-4"
                                                    />
                                                    <span className="text-sm text-gray-600 group-hover:text-naqupos-dark transition-colors">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDiscountModal(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveDiscount}
                                disabled={saving}
                                className="px-6 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-accent transition-colors disabled:opacity-50 font-bold flex items-center gap-2"
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
                title="Hapus Tipe Diskon?"
                message="Apakah Anda yakin ingin menghapus tipe diskon ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Ya, Hapus"
                cancelLabel="Batal"
                type="danger"
            />
        </div>
    );
}
