import { X, Clock, Loader2, User as UserIcon, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../../services/api';

interface ServicePriceHistoryModalProps {
    serviceId: number;
    variantId?: number;
    serviceName: string;
    variantName?: string;
    onClose: () => void;
}

export default function ServicePriceHistoryModal({ serviceId, variantId, serviceName, variantName, onClose }: ServicePriceHistoryModalProps) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = variantId
                ? await api.getServicePriceLogs({ variant_id: variantId, all: 'true' })
                : await api.getServicePriceLogsById(serviceId);

            // Handle both direct array and paginated response (data.data)
            const logsArray = Array.isArray(data) ? data : (data?.data || []);
            setLogs(logsArray);
        } catch (error) {
            console.error("Failed to fetch price logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [serviceId, variantId]);

    const formatPrice = (price: number | string | undefined | null) => {
        const num = typeof price === 'string' ? parseFloat(price) : price;
        if (num === undefined || num === null || isNaN(num)) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(num).replace('Rp', 'Rp ');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white/20">
                {/* Header */}
                <div className="p-8 pb-6 flex justify-between items-start bg-gradient-to-b from-gray-50/50 to-transparent">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-naqupos-primary/10 rounded-2xl flex items-center justify-center text-naqupos-primary">
                                <Clock size={22} />
                            </div>
                            <h3 className="text-2xl font-black text-naqupos-dark tracking-tight">Riwayat Harga</h3>
                        </div>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{serviceName} {variantName ? ` - ${variantName}` : ''}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white hover:bg-gray-100 rounded-2xl transition-all shadow-md active:scale-95">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <Loader2 size={40} className="text-naqupos-primary animate-spin" />
                            <p className="text-sm text-gray-400 font-black uppercase tracking-widest animate-pulse">Menghubungkan ke pusat data...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-20 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/[0.02]">
                                <Clock size={40} className="text-gray-200" />
                            </div>
                            <h4 className="text-lg font-black text-gray-400 uppercase tracking-widest">Belum Ada Riwayat</h4>
                            <p className="text-xs text-gray-400 px-12 mt-2 font-medium">Perubahan harga produk atau layanan akan tercatat secara otomatis di sini.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-8">
                            {logs.map((log) => {
                                const diff = (log.new_price || 0) - (log.old_price || 0);
                                const isPromo = log.price_type === 'special';

                                return (
                                    <div key={log.id} className="relative group/log">
                                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-naqupos-primary/40 to-transparent opacity-0 group-hover/log:opacity-100 transition-opacity rounded-full ml-1" />

                                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:border-naqupos-primary/10 transition-all duration-300">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${isPromo ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                        }`}>
                                                        {isPromo ? 'Harga Promo' : 'Harga Reguler'}
                                                    </span>
                                                    <p className="text-[11px] text-gray-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-2">
                                                        <Clock size={12} className="text-gray-300" />
                                                        {new Date(log.created_at).toLocaleString('id-ID', {
                                                            day: '2-digit', month: 'long', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    {diff !== 0 ? (
                                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${diff < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                            {diff < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                                            {diff < 0 ? '-' : '+'}{formatPrice(Math.abs(diff))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-gray-50 text-gray-400">
                                                            <Minus size={14} /> 0
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Harga Lama</p>
                                                    <p className="text-sm font-bold text-gray-400 line-through decoration-red-400/30">{formatPrice(log.old_price)}</p>
                                                </div>
                                                <div className="bg-naqupos-primary/5 p-4 rounded-2xl border border-naqupos-primary/10">
                                                    <p className="text-[9px] font-black text-naqupos-primary/60 uppercase tracking-widest mb-1">Harga Baru</p>
                                                    <p className="text-base font-black text-naqupos-dark">{formatPrice(log.new_price)}</p>
                                                </div>
                                            </div>

                                            {log.notes && (
                                                <div className="mt-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-[11px] text-gray-500 font-medium italic">
                                                    "{log.notes}"
                                                </div>
                                            )}

                                            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-naqupos-cream rounded-full flex items-center justify-center text-naqupos-primary border-2 border-white shadow-sm">
                                                        <UserIcon size={12} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.user?.name || 'System Auto'}</span>
                                                </div>

                                                {log.branch && (
                                                    <div className="text-[9px] font-black text-naqupos-primary/60 bg-naqupos-primary/5 px-3 py-1 rounded-lg uppercase tracking-widest">
                                                        {log.branch.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                    >
                        Tutup Panel
                    </button>
                </div>
            </div>
        </div>
    );
}
