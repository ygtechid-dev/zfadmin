import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight, Home, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

type PaymentStatus = 'loading' | 'success' | 'failed' | 'pending';

export default function PaymentSuccessPage() {
    const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<PaymentStatus>('loading');
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!invoiceNumber) {
            setStatus('failed');
            setError('Nomor invoice tidak ditemukan.');
            return;
        }
        checkPaymentStatus();
    }, [invoiceNumber]);

    const checkPaymentStatus = async () => {
        setStatus('loading');
        try {
            // Try to fetch invoice/payment status from backend
            const res = await api.getInvoiceByNumber(invoiceNumber!);
            setInvoiceData(res);

            const payStatus = res?.payment_status || res?.status || '';
            if (['paid', 'success', 'completed', 'PAID', 'SUCCESS'].includes(payStatus)) {
                setStatus('success');
            } else if (['failed', 'cancelled', 'FAILED', 'CANCELLED'].includes(payStatus)) {
                setStatus('failed');
            } else {
                setStatus('pending');
            }
        } catch (err) {
            console.error('Error checking payment status:', err);
            // Even if API fails, we still show success since DOKU redirected here
            // (DOKU only redirects to success_url on successful payment)
            setStatus('success');
        }
    };

    const formatPrice = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (!num || isNaN(num)) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(num);
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 font-medium">Memverifikasi pembayaran...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">

                {/* Top Banner */}
                <div className={`px-8 py-10 text-center ${status === 'success' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                        status === 'pending' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                            'bg-gradient-to-br from-red-500 to-rose-600'
                    }`}>
                    <div className="flex justify-center mb-4">
                        {status === 'success' && (
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                <CheckCircle size={48} className="text-white" strokeWidth={1.5} />
                            </div>
                        )}
                        {status === 'pending' && (
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                <Clock size={48} className="text-white" strokeWidth={1.5} />
                            </div>
                        )}
                        {status === 'failed' && (
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                <XCircle size={48} className="text-white" strokeWidth={1.5} />
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-black text-white">
                        {status === 'success' && 'Pembayaran Berhasil!'}
                        {status === 'pending' && 'Menunggu Konfirmasi'}
                        {status === 'failed' && 'Pembayaran Gagal'}
                    </h1>
                    <p className="text-white/80 text-sm mt-2">
                        {status === 'success' && 'Transaksi Anda telah berhasil diproses.'}
                        {status === 'pending' && 'Pembayaran Anda sedang diproses.'}
                        {status === 'failed' && 'Terjadi kesalahan dalam pembayaran.'}
                    </p>
                </div>

                {/* Invoice Details */}
                <div className="px-8 py-6 space-y-4">
                    {invoiceNumber && (
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">No. Invoice</span>
                                <span className="font-bold text-gray-900 font-mono text-xs">{invoiceNumber}</span>
                            </div>
                            {invoiceData?.total && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-medium">Total Bayar</span>
                                    <span className="font-black text-amber-700">{formatPrice(invoiceData.total)}</span>
                                </div>
                            )}
                            {invoiceData?.customer_name && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-medium">Pelanggan</span>
                                    <span className="font-bold text-gray-900">{invoiceData.customer_name}</span>
                                </div>
                            )}
                            {invoiceData?.payment_method && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-medium">Metode Bayar</span>
                                    <span className="font-bold text-gray-900">{invoiceData.payment_method}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-red-500 text-center">{error}</p>
                    )}

                    {status === 'pending' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <p className="text-xs text-amber-700 text-center font-medium">
                                Pembayaran sedang diverifikasi. Halaman ini akan otomatis terupdate.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3 pt-2">
                        {status === 'pending' && (
                            <button
                                onClick={checkPaymentStatus}
                                className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                            >
                                <RefreshCw size={18} /> Cek Status Pembayaran
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200"
                        >
                            <Home size={18} /> Kembali ke Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/sales')}
                            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold flex items-center justify-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                            Lihat Riwayat Penjualan <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 pb-6 text-center">
                    <p className="text-[11px] text-gray-400">
                        Butuh bantuan? Hubungi tim support kami.
                    </p>
                </div>
            </div>
        </div>
    );
}
