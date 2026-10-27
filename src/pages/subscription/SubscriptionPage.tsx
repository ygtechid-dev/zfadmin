import { useState, useEffect } from 'react';
import {
    Check, X, Shield, Crown, History, Save, Plus, Trash2,
    DollarSign, Settings, List, Search, Download, Loader2,
    QrCode, Copy, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';
import { SearchableSelect } from '../../components/common/SearchableSelect';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FeatureItem { id: string; name: string; included: boolean; }
interface PlanConfig {
    id: string; plan_key?: string; name: string;
    priceMonthly: number; priceYearly: number;
    description: string; features: FeatureItem[]; isPopular?: boolean;
}
interface SubscriptionStatus {
    id?: number; plan_key: string; status: string;
    interval?: string; amount?: number;
    starts_at?: string; expires_at?: string;
    is_active: boolean; is_pro: boolean;
}
interface SubscriptionRecord {
    id: string; raw_id?: number; payment_ref?: string; branch_name: string; plan_name: string; plan_key: string;
    interval: string; date: string; amount: number;
    status: 'paid' | 'pending' | 'failed' | 'active'; valid_until: string;
}

// ─── Payment Modal ─────────────────────────────────────────────────────────
interface PaymentModalProps {
    plan: PlanConfig;
    interval: 'month' | 'year';
    onClose: () => void;
    onSuccess: () => void;
    branchId?: number;
}

// Types that are excluded from subscription payment (offline only)
const EXCLUDED_TYPES = ['cash', 'tunai', 'edc', 'debit'];
const isExcluded = (pm: any) => {
    const key = (pm.name || pm.key || '').toLowerCase();
    const type = (pm.type || '').toLowerCase();
    return EXCLUDED_TYPES.some(ex => key.includes(ex) || type.includes(ex));
};

// Map icon string names → display letter/symbol for payment methods
const getPmInitial = (pm: any): string => {
    const name = (pm.name || '').toLowerCase();
    if (name.includes('bca')) return 'BCA';
    if (name.includes('bni')) return 'BNI';
    if (name.includes('bri')) return 'BRI';
    if (name.includes('mandiri')) return 'MDR';
    if (name.includes('cimb')) return 'CIMB';
    if (name.includes('permata')) return 'PRM';
    if (name.includes('dana')) return 'DANA';
    if (name.includes('ovo')) return 'OVO';
    if (name.includes('gopay') || name.includes('gojek')) return 'GPay';
    if (name.includes('shopeepay') || name.includes('shopee')) return 'SPay';
    if (name.includes('linkaja')) return 'Link';
    if (name.includes('qris')) return 'QR';
    if (name.includes('kredivo')) return 'KRVO';
    if (name.includes('akulaku')) return 'AKU';
    if (name.includes('indodana')) return 'IDN';
    if (name.includes('credit')) return 'CC';
    if (name.includes('danamon')) return 'DNN';
    return (pm.name || '?').substring(0, 3).toUpperCase();
};

// Color per payment method
const getPmColor = (pm: any): string => {
    if (pm.color && pm.color !== '#000000') return pm.color;
    const name = (pm.name || '').toLowerCase();
    if (name.includes('bca')) return '#005BAA';
    if (name.includes('bni')) return '#F26522';
    if (name.includes('bri')) return '#00529B';
    if (name.includes('mandiri')) return '#003087';
    if (name.includes('cimb')) return '#B31E21';
    if (name.includes('permata')) return '#A80000';
    if (name.includes('dana')) return '#118EEA';
    if (name.includes('ovo')) return '#4C3494';
    if (name.includes('gopay') || name.includes('gojek')) return '#00AA5A';
    if (name.includes('shopeepay') || name.includes('shopee')) return '#EE4D2D';
    if (name.includes('linkaja')) return '#B30006';
    if (name.includes('qris')) return '#7c3aed';
    if (name.includes('kredivo')) return '#E31F26';
    if (name.includes('credit')) return '#2563EB';
    return '#64748b';
};

// Group payment methods
const groupMethods = (methods: any[]) => {
    const groups: Record<string, { label: string; emoji: string; items: any[] }> = {
        qris: { label: 'QRIS', emoji: '⚡', items: [] },
        wallet: { label: 'E-Wallet', emoji: '💳', items: [] },
        va: { label: 'Virtual Account / Transfer', emoji: '🏦', items: [] },
        other: { label: 'Lainnya', emoji: '💰', items: [] },
    };
    for (const pm of methods) {
        const name = (pm.name || '').toLowerCase();
        const type = (pm.type || '').toLowerCase();
        if (type === 'qris' || name.includes('qris')) {
            groups.qris.items.push(pm);
        } else if (['wallet', 'e-wallet', 'ewallet'].includes(type) ||
            ['dana', 'ovo', 'gopay', 'gojek', 'shopeepay', 'shopee', 'linkaja', 'akulaku', 'kredivo', 'indodana'].some(w => name.includes(w))) {
            groups.wallet.items.push(pm);
        } else if (type === 'bank_transfer' || type === 'virtual_account' || name.includes('virtual account') || name.includes('transfer')) {
            groups.va.items.push(pm);
        } else {
            groups.other.items.push(pm);
        }
    }
    return Object.entries(groups).filter(([, g]) => g.items.length > 0);
};

function PaymentModal({ plan, interval, onClose, onSuccess, branchId }: PaymentModalProps) {
    const [step, setStep] = useState<'method' | 'qris' | 'bank' | 'doku' | 'success'>('method');
    const [loading, setLoading] = useState(false);
    const [loadingMethods, setLoadingMethods] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [selectedPm, setSelectedPm] = useState<any>(null);

    const amount = interval === 'year' ? plan.priceYearly : plan.priceMonthly;
    const fmtAmount = amount.toLocaleString('id-ID');

    useEffect(() => {
        api.getAllPaymentMethods()
            .then((res: any) => {
                const methods = Array.isArray(res) ? res : (res.data ?? []);
                const filtered = methods.filter((pm: any) => pm.is_active !== false && !isExcluded(pm));
                setPaymentMethods(filtered.length ? filtered : getFallback());
            })
            .catch(() => setPaymentMethods(getFallback()))
            .finally(() => setLoadingMethods(false));
    }, []);

    const getFallback = () => [
        { id: 'qris', name: 'QRIS', type: 'qris' },
        { id: 'va_bca', name: 'BCA Virtual Account', type: 'bank_transfer' },
        { id: 'va_bni', name: 'BNI Virtual Account', type: 'bank_transfer' },
        { id: 'va_bri', name: 'BRI Virtual Account', type: 'bank_transfer' },
        { id: 'va_mandiri', name: 'Mandiri Virtual Account', type: 'bank_transfer' },
        { id: 'dana', name: 'DANA', type: 'wallet' },
        { id: 'ovo', name: 'OVO', type: 'wallet' },
    ];

    const isQris = (pm: any) => {
        const name = (pm.name || '').toLowerCase();
        const type = (pm.type || '').toLowerCase();
        return type === 'qris' || name.includes('qris');
    };

    const getMethodKey = (pm: any) => {
        const name = (pm.name || '').toLowerCase();
        if (isQris(pm)) return 'qris';
        if (name.includes('bca')) return 'bca';
        if (name.includes('bni')) return 'bni';
        if (name.includes('bri')) return 'bri';
        if (name.includes('mandiri')) return 'mandiri';
        if (name.includes('dana')) return 'dana';
        if (name.includes('ovo')) return 'ovo';
        if (name.includes('gopay')) return 'gopay';
        return pm.key || pm.id?.toString() || 'bank_transfer';
    };

    const handleSelectMethod = async (pm: any) => {
        setSelectedPm(pm);
        setLoading(true);
        try {
            const methodKey = getMethodKey(pm);
            const res = await api.subscribe({
                plan_key: plan.id || plan.plan_key || 'pro',
                interval,
                payment_method: methodKey,
                branch_id: branchId,
            });
            if (res.status === 'success') {
                setPaymentData(res.data);
                const type = res.data?.payment_data?.type;
                if (type === 'doku_checkout') {
                    setStep('doku');
                    const url = res.data?.payment_data?.payment_url;
                    if (url) {
                        if ((window as any).loadJokulCheckout) {
                            (window as any).loadJokulCheckout(url);
                        } else {
                            window.open(url, '_blank');
                        }
                    }
                } else if (isQris(pm) || type === 'qris') {
                    setStep('qris');
                } else {
                    setStep('bank');
                }
            }
        } catch (e: any) {
            toast.error(e.message || 'Gagal membuat transaksi');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!paymentData?.subscription_id) return;
        setLoading(true);
        try {
            await api.confirmSubscriptionPayment(paymentData.subscription_id);
            setStep('success');
            setTimeout(() => { onSuccess(); onClose(); }, 2000);
        } catch (e: any) {
            toast.error(e.message || 'Gagal konfirmasi pembayaran');
        } finally {
            setLoading(false);
        }
    };

    const copyVA = () => {
        const va = paymentData?.payment_data?.va_number;
        if (va) { navigator.clipboard.writeText(va); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    };

    const grouped = groupMethods(paymentMethods);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

                {/* ── Sticky Header ── */}
                <div className="bg-gradient-to-br from-violet-600 via-naqupos-primary to-indigo-700 p-5 rounded-t-3xl relative flex-shrink-0">
                    <div className="absolute inset-0 rounded-t-3xl overflow-hidden pointer-events-none">
                        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-50 cursor-pointer">
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                            <Crown size={26} className="text-yellow-300" />
                        </div>
                        <div>
                            <p className="text-white/60 text-xs font-medium tracking-wide uppercase">Berlangganan</p>
                            <h3 className="text-white font-bold text-lg leading-tight">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-yellow-300 font-bold text-xl">Rp {fmtAmount}</span>
                                <span className="text-white/50 text-xs">/{interval === 'year' ? 'tahun' : 'bulan'}</span>
                            </div>
                        </div>
                    </div>
                    {/* Step indicator */}
                    <div className="flex gap-2 mt-4 relative z-10">
                        {['Metode', 'Pembayaran', 'Selesai'].map((label, i) => {
                            const active = (i === 0 && step === 'method')
                                || (i === 1 && ['qris', 'bank', 'doku'].includes(step))
                                || (i === 2 && step === 'success');
                            const done = (i === 0 && step !== 'method')
                                || (i === 1 && step === 'success');
                            return (
                                <div key={label} className="flex-1 flex flex-col gap-1">
                                    <div className={`h-1 rounded-full transition-all duration-300 ${active ? 'bg-yellow-300' : done ? 'bg-white/50' : 'bg-white/20'}`} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="overflow-y-auto flex-1 p-5">

                    {/* STEP: Pilih Metode */}
                    {step === 'method' && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="font-bold text-gray-800 text-base">Pilih Metode Pembayaran</h4>
                                <p className="text-xs text-gray-400 mt-0.5">Tunai & EDC tidak tersedia untuk subscription</p>
                            </div>

                            {loadingMethods ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 size={32} className="animate-spin text-naqupos-primary" />
                                    <p className="text-sm text-gray-400">Memuat metode pembayaran...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {grouped.map(([key, group]) => (
                                        <div key={key}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm">{group.emoji}</span>
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{group.label}</p>
                                                <div className="flex-1 h-px bg-gray-100" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {group.items.map((pm) => (
                                                    <button
                                                        key={pm.id}
                                                        onClick={() => handleSelectMethod(pm)}
                                                        disabled={loading}
                                                        className="relative flex flex-col items-center gap-2 p-3 border-2 border-gray-100 hover:border-naqupos-primary rounded-2xl transition-all duration-200 group hover:shadow-md hover:shadow-naqupos-primary/10 hover:-translate-y-0.5 disabled:opacity-40"
                                                    >
                                                        <div
                                                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-[10px] shadow-sm transition-transform group-hover:scale-110"
                                                            style={{ background: `linear-gradient(135deg, ${getPmColor(pm)}, ${getPmColor(pm)}cc)` }}
                                                        >
                                                            {isQris(pm) ? <QrCode size={20} /> : getPmInitial(pm)}
                                                        </div>
                                                        <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight group-hover:text-naqupos-primary transition-colors line-clamp-2">
                                                            {pm.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {loading && (
                                <div className="flex items-center justify-center gap-2 py-3 bg-naqupos-primary/5 rounded-xl">
                                    <Loader2 size={16} className="animate-spin text-naqupos-primary" />
                                    <span className="text-sm text-naqupos-primary font-medium">Memproses pembayaran...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP: QRIS */}
                    {step === 'qris' && paymentData && (
                        <div className="space-y-4 text-center">
                            <div className="flex justify-center">
                                <div className="p-3 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border-2 border-violet-100">
                                    <img
                                        src={paymentData.payment_data?.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=payment:${paymentData.payment_ref}`}
                                        className="w-44 h-44 rounded-xl"
                                        alt="QR Code"
                                    />
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-4 space-y-1 border border-violet-100">
                                <p className="text-xs text-gray-500">Total Pembayaran</p>
                                <p className="text-2xl font-bold text-naqupos-primary">Rp {fmtAmount}</p>
                                <p className="text-xs text-gray-400 font-mono">Ref: {paymentData.payment_ref}</p>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Scan QR di atas menggunakan <strong>QRIS</strong> dari aplikasi e-wallet atau m-banking kamu
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={loading}
                                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    Sudah Bayar
                                </button>
                                <button onClick={() => { setStep('method'); setPaymentData(null); }} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                                    ← Ganti Metode
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: Bank Transfer / VA */}
                    {step === 'bank' && paymentData && (
                        <div className="space-y-4">
                            {/* Bank info card */}
                            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(135deg, ${getPmColor(selectedPm)}15, ${getPmColor(selectedPm)}08)` }}>
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-[11px] shadow-md flex-shrink-0"
                                        style={{ background: `linear-gradient(135deg, ${getPmColor(selectedPm)}, ${getPmColor(selectedPm)}cc)` }}
                                    >
                                        {getPmInitial(selectedPm)}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Bayar via</p>
                                        <p className="font-bold text-gray-800">{paymentData.payment_data?.bank || selectedPm?.name}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-white space-y-4">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Nomor Virtual Account</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-2xl font-bold text-gray-800 tracking-widest font-mono flex-1">
                                                {paymentData.payment_data?.va_number}
                                            </p>
                                            <button
                                                onClick={copyVA}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-naqupos-primary/10 hover:text-naqupos-primary'}`}
                                            >
                                                {copied ? <><CheckCircle size={13} /> Tersalin</> : <><Copy size={13} /> Salin</>}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="h-px bg-gray-100" />
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-500">Total Bayar</p>
                                        <p className="text-xl font-bold text-naqupos-primary">Rp {fmtAmount}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="bg-amber-50 rounded-xl p-3 space-y-1.5 border border-amber-100">
                                <p className="flex items-start gap-2 text-xs text-amber-700">
                                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                                    Transfer tepat sesuai nominal agar sistem dapat memverifikasi otomatis
                                </p>
                                <p className="flex items-start gap-2 text-xs text-amber-700">
                                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                                    Kode VA berlaku selama <strong>24 jam</strong>
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setStep('method'); setPaymentData(null); }}
                                    className="px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                                >
                                    Ganti
                                </button>
                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-gradient-to-r from-naqupos-primary to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-naqupos-primary/25"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    Sudah Transfer
                                </button>
                            </div>
                        </div>
                    )}


                    {/* STEP: DOKU Checkout */}
                    {step === 'doku' && paymentData && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 text-center border border-indigo-100">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl font-black text-indigo-700">D</span>
                                </div>
                                <h4 className="font-bold text-gray-800 text-base">Bayar via DOKU</h4>
                                <p className="text-xs text-gray-500 mt-1">
                                    Klik tombol di bawah untuk membuka halaman pembayaran DOKU.
                                    Pilih metode favorit kamu di sana.
                                </p>
                                <div className="mt-3 bg-white rounded-xl p-3 border border-indigo-100">
                                    <p className="text-xs text-gray-400">Total Pembayaran</p>
                                    <p className="text-xl font-bold text-naqupos-primary">Rp {fmtAmount}</p>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">Ref: {paymentData.payment_ref}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const url = paymentData.payment_data?.payment_url;
                                    if (url) {
                                        if ((window as any).loadJokulCheckout) {
                                            (window as any).loadJokulCheckout(url);
                                        } else {
                                            window.open(url, '_blank');
                                        }
                                    }
                                }}
                                className="block w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold text-center hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200"
                            >
                                🔗 Buka Halaman Pembayaran DOKU
                            </button>

                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <p className="text-xs text-amber-700 flex items-start gap-2">
                                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                                    Setelah selesai membayar di halaman DOKU, kembali ke sini dan klik tombol konfirmasi di bawah.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setStep('method'); setPaymentData(null); }}
                                    className="px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-gradient-to-r from-naqupos-primary to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-naqupos-primary/25"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    Sudah Bayar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: Success */}
                    {step === 'success' && (
                        <div className="text-center py-8 space-y-4">
                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
                                <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                                    <CheckCircle size={44} className="text-white" />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-2xl font-bold text-gray-800">Berhasil! 🎉</h4>
                                <p className="text-gray-500 mt-1">Selamat, <strong>Pro Business</strong> kamu telah aktif</p>
                                <p className="text-xs text-gray-400 mt-2">Halaman akan diperbarui secara otomatis...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
const DEFAULT_PLANS: PlanConfig[] = [
    {
        id: 'starter', name: 'Starter', priceMonthly: 0, priceYearly: 0,
        description: 'Untuk bisnis kecil yang baru memulai.',
        features: [
            { id: 'f1', name: 'Dashboard', included: true },
            { id: 'f2', name: 'Kasir (POS)', included: true },
            { id: 'f3', name: 'Kalender', included: true },
            { id: 'f4', name: 'Reservasi', included: true },
            { id: 'f5', name: 'Layanan', included: true },
            { id: 'f6', name: 'Staff', included: true },
            { id: 'f7', name: 'Laporan', included: true },
        ]
    },
    {
        id: 'pro', name: 'Pro Business', priceMonthly: 215000, priceYearly: 2580000,
        description: 'Untuk bisnis yang sedang berkembang dengan fitur lengkap.',
        isPopular: true,
        features: [
            { id: 'p1', name: 'Dashboard', included: true },
            { id: 'p2', name: 'Kasir (POS)', included: true },
            { id: 'p3', name: 'Kalender', included: true },
            { id: 'p4', name: 'Reservasi', included: true },
            { id: 'p5', name: 'Layanan', included: true },
            { id: 'p6', name: 'Staff', included: true },
            { id: 'p7', name: 'Produk & Inventori', included: true },
            { id: 'p8', name: 'Data Pelanggan', included: true },
            { id: 'p9', name: 'Voucher & Promo', included: true },
            { id: 'p10', name: 'Laporan Lengkap', included: true },
            { id: 'p11', name: 'Manajemen Pengguna', included: true },
            { id: 'p12', name: 'Pengaturan Cabang', included: true },
        ]
    },
];

export default function SubscriptionPage() {
    const [userRole, setUserRole] = useState('');
    const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
    const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [plansRes, statusRes] = await Promise.all([
                api.getSubscriptionPlans().catch(() => null),
                api.getSubscriptionStatus().catch(() => null),
            ]);

            // Normalize plans from API
            if (plansRes?.status === 'success' && plansRes.data?.length > 0) {
                const mapped = plansRes.data.map((p: any) => ({
                    id: p.plan_key || p.id,
                    plan_key: p.plan_key,
                    name: p.name,
                    priceMonthly: p.price_monthly ?? p.priceMonthly ?? 0,
                    priceYearly: p.price_yearly ?? p.priceYearly ?? 0,
                    description: p.description,
                    isPopular: p.is_popular,
                    features: Array.isArray(p.features)
                        ? p.features.map((f: any, i: number) =>
                            typeof f === 'string' ? { id: `f${i}`, name: f, included: true } : f
                        )
                        : [],
                }));
                setPlans(mapped);
            }
            // else: keep DEFAULT_PLANS

            if (statusRes?.status === 'success') {
                if (Array.isArray(statusRes.data)) {
                    // Super admin gets array - they are always pro
                    setSubStatus({ plan_key: 'pro', status: 'active', is_active: true, is_pro: true });
                } else if (statusRes.data) {
                    setSubStatus(statusRes.data);
                }
            }
        } catch (e) {
            console.error('Failed to load subscription data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) {
            try { setUserRole(JSON.parse(authData)?.user?.role || ''); } catch { }
        }
        loadData();
    }, []);

    const normalizedRole = userRole.toLowerCase();
    const isSuperAdmin = ['super admin', 'super_admin', 'owner'].includes(normalizedRole);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-3">
                    <Loader2 size={40} className="animate-spin text-naqupos-primary mx-auto" />
                    <p className="text-gray-500">Memuat data subscription...</p>
                </div>
            </div>
        );
    }

    if (isSuperAdmin) {
        return <AdminView plans={plans} setPlans={setPlans} onRefresh={loadData} />;
    }

    return <BranchSubscriptionView subStatus={subStatus} plans={plans} onRefresh={loadData} />;
}

// ─── Super Admin View ──────────────────────────────────────────────────────
function AdminView({ plans, setPlans, onRefresh }: { plans: PlanConfig[], setPlans: (p: PlanConfig[]) => void, onRefresh: () => void }) {
    const [activeTab, setActiveTab] = useState<'config' | 'reports'>('config');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-naqupos-dark">Subscription Management</h1>
                <p className="text-gray-500">Kelola paket langganan dan pantau riwayat pembayaran semua cabang</p>
            </div>
            <div className="flex border-b border-gray-200">
                {[{ id: 'config', label: 'Konfigurasi Paket', icon: Settings }, { id: 'reports', label: 'Laporan Langganan', icon: History }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'border-naqupos-primary text-naqupos-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <tab.icon size={18} />{tab.label}
                    </button>
                ))}
            </div>
            <div className="mt-6">
                {activeTab === 'config'
                    ? <AdminConfigContent plans={plans} setPlans={setPlans} onRefresh={onRefresh} />
                    : <AdminReportsContent />}
            </div>
        </div>
    );
}

// ─── Admin Config Content ──────────────────────────────────────────────────
function AdminConfigContent({ plans, setPlans, onRefresh }: { plans: PlanConfig[], setPlans: (p: PlanConfig[]) => void, onRefresh: () => void }) {
    const AVAILABLE_FEATURES = ["Dashboard", "Kasir (POS)", "Kalender", "Reservasi", "Layanan", "Staff", "Produk", "Pesanan", "Stok Opname", "Data Pelanggan", "Loyalty Point", "Voucher & Promo", "Berita & Artikel", "Kampanye", "Automation", "Kelola Banner", "Laporan", "Penjualan", "Cabang", "Ruangan", "Aset", "Kategori Biaya", "Metode Bayar", "Subscription", "Manajemen Pengguna", "Riwayat Aktivitas", "Pengaturan"];
    const [confirmSeedMode, setConfirmSeedMode] = useState(false);

    const handleSave = async () => {
        try {
            await api.updateSubscriptionPlans(plans.map(p => ({ ...p, id: p.id || p.plan_key })));
            toast.success('Konfigurasi paket berhasil disimpan');
            onRefresh();
        } catch (e: any) {
            toast.error(e.message || 'Gagal menyimpan');
        }
    };

    const handleSeedClick = () => {
        setConfirmSeedMode(true);
    };

    const confirmSeedAction = async () => {
        setConfirmSeedMode(false);
        try {
            await api.seedSubscriptionPlans();
            toast.success('Default plans berhasil di-seed');
            onRefresh();
        } catch (e: any) {
            toast.error(e.message || 'Gagal');
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Settings size={20} /></div>
                    <div>
                        <h4 className="font-semibold text-blue-900 text-sm">Mode Konfigurasi</h4>
                        <p className="text-blue-700 text-xs mt-0.5">Ubah harga dan fitur yang tampil di halaman berlangganan cabang.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSeedClick} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors">
                        <RefreshCw size={14} className="inline mr-1" />Reset Default
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-naqupos-primary text-white rounded-lg hover:bg-naqupos-primary/90 text-sm font-medium shadow-sm">
                        <Save size={16} />Simpan Perubahan
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2 rounded-lg ${plan.id.includes('pro') ? 'bg-naqupos-primary/10 text-naqupos-primary' : 'bg-gray-100 text-gray-600'}`}>
                                {plan.id.includes('pro') ? <Crown size={24} /> : <Shield size={24} />}
                            </div>
                            <div className="flex-1">
                                <input type="text" value={plan.name} onChange={e => setPlans(plans.map(p => p.id === plan.id ? { ...p, name: e.target.value } : p))}
                                    className="font-bold text-lg text-gray-900 w-full border-b border-transparent hover:border-gray-200 focus:border-naqupos-primary focus:outline-none bg-transparent" />
                                <input type="text" value={plan.description} onChange={e => setPlans(plans.map(p => p.id === plan.id ? { ...p, description: e.target.value } : p))}
                                    className="text-sm text-gray-500 w-full border-b border-transparent hover:border-gray-200 focus:border-naqupos-primary focus:outline-none bg-transparent" />
                            </div>
                        </div>
                        <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2"><DollarSign size={16} />Konfigurasi Harga</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {[['priceMonthly', 'Harga Bulanan'], ['priceYearly', 'Harga Tahunan']].map(([field, label]) => (
                                    <div key={field}>
                                        <label className="text-xs text-gray-500 block mb-1">{label}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">Rp</span>
                                            <input type="text" value={(plan[field as keyof PlanConfig] as number).toLocaleString('id-ID')}
                                                onChange={e => setPlans(plans.map(p => p.id === plan.id ? { ...p, [field]: parseInt(e.target.value.replace(/\D/g, '')) || 0 } : p))}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-naqupos-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2"><List size={16} />Fitur & Menu</h4>
                                <button onClick={() => setPlans(plans.map(p => p.id === plan.id ? { ...p, features: [...p.features, { id: `f_${Date.now()}`, name: '', included: true }] } : p))}
                                    className="text-xs text-naqupos-primary font-medium hover:underline flex items-center gap-1"><Plus size={12} />Tambah</button>
                            </div>
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                {plan.features.map((feature) => (
                                    <div key={feature.id} className="flex items-center gap-2 group p-1 hover:bg-gray-50 rounded">
                                        <button onClick={() => setPlans(plans.map(p => p.id === plan.id ? { ...p, features: p.features.map(f => f.id === feature.id ? { ...f, included: !f.included } : f) } : p))}
                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${feature.included ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-gray-400'}`}>
                                            <Check size={12} />
                                        </button>
                                        <SearchableSelect value={feature.name}
                                            onChange={val => setPlans(plans.map(p => p.id === plan.id ? { ...p, features: p.features.map(f => f.id === feature.id ? { ...f, name: val.toString() } : f) } : p))}
                                            options={AVAILABLE_FEATURES.map(f => ({ value: f, label: f }))} placeholder="Pilih fitur..." creatable
                                            onCreate={async ({ label }) => { setPlans(plans.map(p => p.id === plan.id ? { ...p, features: p.features.map(f => f.id === feature.id ? { ...f, name: label } : f) } : p)); return { value: label, label }; }}
                                            className="flex-1" />
                                        <button onClick={() => setPlans(plans.map(p => p.id === plan.id ? { ...p, features: p.features.filter(f => f.id !== feature.id) } : p))}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Custom Seed Confirmation Modal */}
            {confirmSeedMode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in-up">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Konfirmasi Reset</h3>
                        <p className="text-center text-gray-500 text-sm mb-6">
                            Apakah Anda yakin ingin melakukan seed/reset paket ke default? Pengaturan form paket yang ada saat ini akan ditimpa.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmSeedMode(false)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmSeedAction}
                                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
                            >
                                Ya, Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Admin Reports Content ─────────────────────────────────────────────────
function AdminReportsContent() {
    const [records, setRecords] = useState<SubscriptionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadRecords = async () => {
        api.getSubscriptionHistory().then(res => {
            if (res.status === 'success') setRecords(res.data);
        }).catch(() => { }).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadRecords();
    }, []);

    const filtered = records.filter(r => {
        const matchSearch = r.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari cabang atau ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-naqupos-primary/20 focus:border-naqupos-primary" />
                </div>
                <div className="flex gap-2">
                    <select className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-naqupos-primary bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">Semua Status</option>
                        <option value="active">Aktif (Free)</option>
                        <option value="paid">Lunas</option>
                        <option value="pending">Menunggu</option>
                        <option value="failed">Gagal</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 bg-white"><Download size={16} />Export</button>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center"><Loader2 size={32} className="animate-spin mx-auto text-naqupos-primary" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                                <tr>
                                    {['ID Transaksi', 'Cabang', 'Paket', 'Tanggal & Masa Berlaku', 'Status', 'Total'].map(h => (
                                        <th key={h} className={`px-6 py-4 font-medium ${h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length > 0 ? filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-gray-500">{item.id}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.branch_name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {item.plan_key === 'pro' ? <Crown size={14} className="text-naqupos-primary" /> : <Shield size={14} className="text-gray-400" />}
                                                <span>{item.plan_name}</span>
                                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.interval === 'month' ? 'Bulan' : item.interval === 'year' ? 'Tahun' : 'Lifetime'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div><p className="text-gray-900">{item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                                                <p className="text-xs text-gray-500">s/d {item.valid_until}</p></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={item.status} />
                                                {item.status === 'pending' && item.raw_id && (
                                                    <button
                                                        onClick={async () => {
                                                            const toastId = toast.loading('Mengecek status...');
                                                            try {
                                                                await api.confirmSubscriptionPayment(item.raw_id!);
                                                                toast.success('Pembayaran berhasil dikonfirmasi', { id: toastId });
                                                                loadRecords();
                                                            } catch (e: any) {
                                                                toast.error(e.message || 'Pembayaran belum diterima', { id: toastId });
                                                            }
                                                        }}
                                                        className="text-[10px] px-2 py-1 bg-violet-100 font-semibold text-violet-700 hover:bg-violet-200 rounded transition-colors whitespace-nowrap"
                                                    >
                                                        Cek Status
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">Rp {item.amount.toLocaleString('id-ID')}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Tidak ada data langganan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Branch Subscription View ───────────────────────────────────────────────
function BranchSubscriptionView({ subStatus, plans, onRefresh }: { subStatus: SubscriptionStatus | null, plans: PlanConfig[], onRefresh: () => void }) {
    const [activeTab, setActiveTab] = useState<'subscription' | 'history'>('subscription');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
    const [history, setHistory] = useState<SubscriptionRecord[]>([]);
    const [histLoading, setHistLoading] = useState(false);
    const [confirmUnsubMode, setConfirmUnsubMode] = useState(false);
    const [unsubLoading, setUnsubLoading] = useState(false);

    const isPro = subStatus?.is_pro ?? false;
    const proPlan = plans.find(p => p.id === 'pro' || p.plan_key === 'pro') || plans[plans.length - 1];
    const starterPlan = plans.find(p => p.id === 'starter' || p.plan_key === 'starter') || plans[0];

    const loadHistory = async () => {
        setHistLoading(true);
        try {
            const res = await api.getSubscriptionHistory();
            if (res.status === 'success') setHistory(Array.isArray(res.data) ? res.data : [res.data]);
        } catch { } finally { setHistLoading(false); }
    };

    useEffect(() => { if (activeTab === 'history') loadHistory(); }, [activeTab]);

    const handleSuccess = () => { toast.success('Langganan Pro berhasil diaktifkan! 🎉'); onRefresh(); };

    const handleUnsubscribeClick = () => {
        setConfirmUnsubMode(true);
    };

    const confirmUnsubscribeAction = async () => {
        setUnsubLoading(true);
        try {
            const res = await api.unsubscribe();
            if (res.status === 'success') {
                toast.success('Berhasil berhenti berlangganan. Anda kini menggunakan paker Starter.');
                onRefresh();
            }
        } catch (e: any) {
            toast.error(e.message || 'Gagal berhenti berlangganan');
        } finally {
            setUnsubLoading(false);
            setConfirmUnsubMode(false);
        }
    };

    return (
        <div className="space-y-6">
            {showPaymentModal && proPlan && (
                <PaymentModal plan={proPlan} interval={selectedInterval} onClose={() => setShowPaymentModal(false)} onSuccess={handleSuccess} />
            )}

            <div>
                <h1 className="text-2xl font-bold text-naqupos-dark">Berlangganan</h1>
                <p className="text-gray-500">Kelola status langganan untuk cabang Anda</p>
            </div>

            <div className="flex border-b border-gray-200">
                {[{ id: 'subscription', label: 'Status Langganan', icon: Shield }, { id: 'history', label: 'Riwayat Pembayaran', icon: History }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'border-naqupos-primary text-naqupos-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <tab.icon size={16} />{tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'subscription' ? (
                <div className="space-y-8">
                    {/* Active Plan Status Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 rounded-full opacity-10 ${isPro ? 'bg-naqupos-primary' : 'bg-gray-300'}`} />
                        <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isPro ? 'bg-naqupos-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {isPro ? <Crown size={32} /> : <Shield size={32} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{isPro ? proPlan?.name : starterPlan?.name}
                                        {isPro && <span className="ml-2 text-xs bg-naqupos-primary/10 text-naqupos-primary px-2 py-1 rounded-full">Active</span>}</h2>
                                    <p className="text-gray-500 text-sm mt-1">{isPro ? 'Langganan aktif untuk cabang ini' : 'Upgrade untuk akses fitur premium cabang'}</p>
                                    {isPro && subStatus?.expires_at && (
                                        <p className="text-xs text-gray-400 mt-1">Berlaku hingga: {new Date(subStatus.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    )}
                                </div>
                            </div>
                            {isPro ? (
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 mb-1">Status</p>
                                    <p className="font-semibold text-green-600 flex items-center gap-1 justify-end"><Check size={16} />Aktif</p>
                                </div>
                            ) : (
                                <button onClick={() => setShowPaymentModal(true)}
                                    className="px-5 py-2.5 bg-naqupos-primary text-white rounded-xl hover:bg-naqupos-primary/90 transition-colors shadow-lg shadow-naqupos-primary/20 font-medium animate-pulse">
                                    Upgrade Sekarang
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Pricing Cards */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-4">
                            <span className={`text-sm ${selectedInterval === 'month' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>Bulanan</span>
                            <button onClick={() => setSelectedInterval(prev => prev === 'month' ? 'year' : 'month')}
                                className="w-12 h-6 bg-naqupos-primary rounded-full relative focus:outline-none">
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${selectedInterval === 'year' ? 'left-7' : 'left-1'}`} />
                            </button>
                            <span className={`text-sm ${selectedInterval === 'year' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>Tahunan <span className="text-xs text-green-600">(Hemat 20%)</span></span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                            {/* Starter */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                                <div className="mb-4">
                                    <h4 className="text-lg font-bold text-gray-900">{starterPlan?.name}</h4>
                                    <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-gray-900">Gratis</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">{starterPlan?.description}</p>
                                </div>
                                <div className="flex-1 space-y-2.5 mb-6">
                                    {starterPlan?.features.map(f => (
                                        <div key={f.id} className="flex items-center gap-3 text-sm">
                                            {f.included ? <Check size={15} className="text-green-500 flex-shrink-0" /> : <X size={15} className="text-gray-300 flex-shrink-0" />}
                                            <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>{f.name}</span>
                                        </div>
                                    ))}
                                </div>
                                {isPro ? (
                                    <button
                                        onClick={handleUnsubscribeClick}
                                        className="w-full py-2.5 rounded-lg border border-red-200 font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                                    >
                                        Berhenti Berlangganan Pro
                                    </button>
                                ) : (
                                    <button className="w-full py-2.5 rounded-lg border border-gray-200 font-medium text-gray-500 bg-gray-50 cursor-default">
                                        Saat ini digunakan
                                    </button>
                                )}
                            </div>

                            {/* Pro */}
                            <div className="bg-naqupos-primary text-white rounded-xl shadow-xl shadow-naqupos-primary/20 p-6 flex flex-col relative transform hover:-translate-y-1 transition-transform duration-200">
                                {proPlan?.isPopular && (
                                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
                                )}
                                <div className="mb-4">
                                    <h4 className="text-lg font-bold">{proPlan?.name}</h4>
                                    <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-3xl font-bold">
                                            Rp {(selectedInterval === 'year' && proPlan ? proPlan.priceYearly / 12 : proPlan?.priceMonthly ?? 0).toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-indigo-100 text-sm">/bulan</span>
                                    </div>
                                    <p className="text-sm text-indigo-100 mt-2">
                                        {selectedInterval === 'year' ? `Ditagih Rp ${(proPlan?.priceYearly ?? 0).toLocaleString('id-ID')}/tahun` : 'Ditagih setiap bulan'}
                                    </p>
                                </div>
                                <div className="flex-1 space-y-2.5 mb-6">
                                    {proPlan?.features.map(f => (
                                        <div key={f.id} className="flex items-center gap-3 text-sm">
                                            <div className="bg-white/20 p-1 rounded-full flex-shrink-0"><Check size={11} /></div>
                                            <span>{f.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setShowPaymentModal(true)}
                                    className="w-full py-2.5 rounded-lg bg-white text-naqupos-primary font-bold hover:bg-gray-50 transition-colors shadow-lg">
                                    {isPro ? 'Perpanjang Sekarang' : 'Mulai Langganan Pro'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* History Tab */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {histLoading ? (
                        <div className="p-12 text-center"><Loader2 size={32} className="animate-spin mx-auto text-naqupos-primary" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                                    <tr>
                                        {['ID Transaksi', 'Tanggal', 'Deskripsi', 'Status', 'Jumlah'].map(h => (
                                            <th key={h} className={`px-6 py-4 font-medium ${h === 'Jumlah' ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {history.length > 0 ? history.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-gray-500">{item.id}</td>
                                            <td className="px-6 py-4 text-gray-900">{item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900">Langganan {item.plan_name}</p>
                                                <p className="text-xs text-gray-500">Berlaku s/d {item.valid_until}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={item.status} />
                                                    {item.status === 'pending' && item.raw_id && (
                                                        <button
                                                            onClick={async () => {
                                                                const toastId = toast.loading('Mengecek status...');
                                                                try {
                                                                    await api.confirmSubscriptionPayment(item.raw_id!);
                                                                    toast.success('Pembayaran berhasil dikonfirmasi', { id: toastId });
                                                                    loadHistory();
                                                                    onRefresh();
                                                                } catch (e: any) {
                                                                    toast.error(e.message || 'Pembayaran belum diterima', { id: toastId });
                                                                }
                                                            }}
                                                            className="text-[10px] px-2 py-1 bg-violet-100 font-semibold text-violet-700 hover:bg-violet-200 rounded transition-colors whitespace-nowrap"
                                                        >
                                                            Cek Status
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-gray-900">Rp {item.amount.toLocaleString('id-ID')}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <History size={48} className="mx-auto mb-4 opacity-20" /><p>Belum ada riwayat pembayaran.</p>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Custom Unsubscribe Confirmation Modal */}
            {confirmUnsubMode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in-up">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Berhenti Berlangganan</h3>
                        <p className="text-center text-gray-500 text-sm mb-6">
                            Apakah Anda yakin ingin berhenti berlangganan Pro dan kembali ke Starter? Akses ke fitur premium akan langsung dinonaktifkan untuk cabang ini.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmUnsubMode(false)}
                                disabled={unsubLoading}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmUnsubscribeAction}
                                disabled={unsubLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
                            >
                                {unsubLoading ? <Loader2 size={16} className="animate-spin" /> : 'Ya, Berhenti'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        paid: 'bg-green-100 text-green-800', active: 'bg-blue-100 text-blue-800',
        pending: 'bg-yellow-100 text-yellow-800', failed: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = { paid: 'Lunas', active: 'Aktif', pending: 'Menunggu', failed: 'Gagal' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-800'}`}>{labels[status] || status}</span>;
}
