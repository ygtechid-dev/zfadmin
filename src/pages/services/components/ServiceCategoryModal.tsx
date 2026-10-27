import React, { useState } from 'react';
import { Plus, X, Check, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';
import type { ServiceCategory } from '../serviceTypes';
import swal from '../../../utils/swal';

interface ServiceCategoryModalProps {
    category: ServiceCategory | any;
    onClose: () => void;
    onSuccess: () => void;
    isNew?: boolean;
    branches: any[];
}


export default function ServiceCategoryModal({ category, onClose, onSuccess, isNew = false, branches }: ServiceCategoryModalProps) {
    const [newName, setNewName] = useState(category?.name || '');
    const [description, setDescription] = useState(category?.description || '');
    const [color, setColor] = useState(category?.color || '#3B82F6'); // Default Blue
    const [isGlobal, setIsGlobal] = useState(category ? category.is_global : true);
    const [branchIds, setBranchIds] = useState<number[]>(category ? (category.branch_ids || (category.branches?.map((b: any) => b.id) || [])) : []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState(category?.image ? (category.image.startsWith('http') ? category.image : `${import.meta.env.VITE_STORAGE_URL || 'https://zafaranbe.memofy-dev.my.id'}${category.image}`) : '');

    // Predefined colors for agenda/calendar
    const colors = [
        '#3B82F6', // Blue
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#8B5CF6', // Violet
        '#EC4899', // Pink
        '#6366F1', // Indigo
        '#14B8A6', // Teal
        '#F97316', // Orange
        '#64748B', // Slate
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                name: newName,
                description: description,
                color: color,
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
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slideUp">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">{isNew ? 'Tambah Kategori Layanan' : 'Ubah Kategori Layanan'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama</label>
                        <input
                            required
                            type="text"
                            placeholder="Contoh: Massage"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-naqupos-primary transition-colors text-sm"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi</label>
                        <textarea
                            placeholder="Deskripsi singkat..."
                            rows={2}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-naqupos-primary transition-colors text-sm resize-none"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warna Agenda</label>
                        <div className="flex flex-wrap gap-2">
                            {colors.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 flex items-center justify-center ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && <Check size={14} className="text-white" />}
                                </button>
                            ))}
                            {/* Custom Color Input */}
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Plus size={14} className="text-gray-400" />
                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: color, opacity: colors.includes(color) ? 0 : 1 }}></div>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">Digunakan sebagai warna agenda pada kalender.</p>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Foto (Opsional)</label>
                        <div className="relative group w-full">
                            <div className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden bg-gray-50 group-hover:border-naqupos-primary transition-colors">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-4">
                                        <p className="text-sm text-gray-400">Drop file here or <span className="text-emerald-500 font-bold">click to upload</span></p>
                                        <p className="text-[10px] text-gray-300 mt-1">HD Photos recommended</p>
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
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Branch Access */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Akses Cabang</label>
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white hover:border-naqupos-primary transition-all group">
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isGlobal ? 'bg-naqupos-primary border-naqupos-primary' : 'bg-white border-gray-300'}`}>
                                {isGlobal && <Check size={14} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
                            <span className="text-sm font-bold text-gray-700 group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</span>
                        </label>

                        {!isGlobal && (
                            <div className="grid grid-cols-1 gap-2 mt-2 animate-fadeIn max-h-[150px] overflow-y-auto px-1 custom-scrollbar">
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
                                                    if (newBranchIds.length === branches.length) {
                                                        setIsGlobal(true);
                                                        setBranchIds([]);
                                                    }
                                                }}
                                            />
                                            <span className="text-sm text-gray-600 group-hover:text-naqupos-primary transition-colors">{branch.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !newName || (!isGlobal && branchIds.length === 0)}
                            className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting || !newName || (!isGlobal && branchIds.length === 0) ? 'bg-gray-200 text-gray-400' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                        >
                            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                            {isNew ? 'Simpan' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
