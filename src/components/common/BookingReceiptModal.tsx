import { useState, useEffect } from 'react';
import { X, Printer, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface BookingReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId?: number | null;
    invoiceNumber?: string | null;
}

export default function BookingReceiptModal({ isOpen, onClose, bookingId, invoiceNumber }: BookingReceiptModalProps) {
    // state
    const [booking, setBooking] = useState<any>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [invoiceConfig, setInvoiceConfig] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && (bookingId || invoiceNumber)) {
            fetchBookingDetails();
        }
    }, [isOpen, bookingId, invoiceNumber]);

    const fetchBookingDetails = async () => {
        setLoading(true);
        try {
            let idToFetch = bookingId;
            if (!idToFetch && invoiceNumber) {
                const res = await api.getBookings({ search: invoiceNumber });
                const foundBooking = res.data?.find((b: any) => b.booking_ref === invoiceNumber || b.invoiceNumber === invoiceNumber) || (res.data && res.data[0]);
                if (foundBooking) {
                    idToFetch = foundBooking.id;
                }
            }
            if (idToFetch) {
                const data = await api.getBooking(idToFetch);
                setBooking(data);
                const branchId = data?.branch_id || data?.branch?.id;
                if (branchId) {
                    const [company, invoice] = await Promise.all([
                        api.getCompanySettings(branchId).catch(() => null),
                        api.getInvoiceSettings(branchId).catch(() => null),
                    ]);
                    setCompanyInfo(company);
                    setInvoiceConfig(invoice);
                } else {
                    setCompanyInfo(null);
                    setInvoiceConfig(null);
                }
            } else {
                setBooking(null);
                setCompanyInfo(null);
                setInvoiceConfig(null);
            }
        } catch (error) {
            console.error("Failed to fetch booking details:", error);
            setCompanyInfo(null);
            setInvoiceConfig(null);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const toNumber = (value: any, fallback = 0) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    };

    const formatCurrency = (value: any) => {
        const safeValue = toNumber(value);
        return new Intl.NumberFormat('id-ID', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(safeValue);
    };

    const resolveImageUrl = (path?: string | null) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('/')) return path;
        const storageUrl = import.meta.env.VITE_STORAGE_URL || 'https://zafaranbe.memofy-dev.my.id';
        return `${storageUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        return time.substring(0, 5);
    };

    const GENERIC_SERVICE_NAMES = ['perawatan lainnya', 'perawatan lainya', 'lainnya', 'lainya'];

    const getServiceItemName = (item: any, fallback = 'Layanan') => {
        const serviceName = item?.service?.name || item?.serviceName || fallback;
        const variantName = item?.variant?.name || item?.service_variant?.name || item?.variantName;
        const cleanServiceName = String(serviceName || '').trim();
        const cleanVariantName = String(variantName || '').trim();

        if (cleanVariantName) {
            const normalizedServiceName = cleanServiceName.toLowerCase();
            if (!cleanServiceName || GENERIC_SERVICE_NAMES.includes(normalizedServiceName)) {
                return cleanVariantName;
            }
            const genericPrefix = GENERIC_SERVICE_NAMES.find(name => normalizedServiceName.startsWith(`${name} - `));
            if (genericPrefix) {
                return cleanServiceName.slice(genericPrefix.length + 3).trim() || cleanVariantName;
            }

            return cleanServiceName.includes(cleanVariantName)
                ? cleanServiceName
                : `${cleanServiceName} - ${cleanVariantName}`;
        }

        return cleanServiceName || fallback;
    };

    const logoUrl = invoiceConfig?.showLogo === false
        ? null
        : (resolveImageUrl(invoiceConfig?.logoUrl || invoiceConfig?.logo_url || companyInfo?.logo_url) || '/logo-zafaran.png');
    const branchName = invoiceConfig?.businessNameOverride || invoiceConfig?.business_name_override || companyInfo?.name || booking?.branch?.name || 'Zafaran Spa';
    const branchAddress = invoiceConfig?.invoiceAddress || invoiceConfig?.invoice_address || companyInfo?.address || booking?.branch?.address || 'Alamat cabang tidak tersedia';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header Actions */}
                <div className="p-4 border-b border-gray-100 flex justify-end gap-2">
                    <button
                        onClick={() => window.print()}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        title="Print"
                    >
                        <Printer size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 pt-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-amber-600 mb-2" size={32} />
                            <p className="text-gray-500">Memuat data faktur...</p>
                        </div>
                    ) : booking ? (
                        <div className="space-y-6">
                            {/* Logo & Branch Info */}
                            <div className="text-center space-y-2">
                                <div className="flex justify-center mb-4">
                                    <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden bg-white">
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt="Zafaran"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).src = '/logo-naqupos.jpeg';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-black text-white flex items-center justify-center text-2xl font-black">
                                                ZA
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{branchName}</h2>
                                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                                    {branchAddress}
                                </p>
                            </div>

                            {/* Faktur Number & Date */}
                            <div className="text-center py-2 border-y border-gray-100">
                                <h3 className="font-bold text-lg">Faktur {booking.booking_ref?.split('-').pop() || booking.booking_ref}</h3>
                                <p className="text-sm text-gray-600">{formatDate(booking.booking_date)}</p>
                            </div>

                            {/* Customer Name */}
                            <div className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-2">
                                {booking.user?.name || booking.guest_name || 'Guest'}
                            </div>

                            {/* Items List */}
                            <div className="space-y-4">
                                {booking.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-start text-sm">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{item.quantity} {getServiceItemName(item)}</p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(booking.booking_date)} {formatTime(item.start_time || booking.start_time)}
                                            </p>
                                            <p className="text-xs text-gray-400 italic">with {item.therapist?.name || booking.therapist?.name || '-'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">Rp {formatCurrency(toNumber(item.price || item.service_price || item.subtotal || booking.service_price || booking.total_price) * Math.max(1, toNumber(item.quantity, 1)))}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!booking.items || booking.items.length === 0) && (
                                    <div className="flex justify-between items-start text-sm">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">1 {getServiceItemName(booking, booking.service?.name || 'Layanan')}</p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(booking.booking_date)} {formatTime(booking.start_time)}
                                            </p>
                                            <p className="text-xs text-gray-400 italic">with {booking.therapist?.name || '-'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">Rp {formatCurrency(booking.service_price || booking.total_price)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Totals */}
                            <div className="border-t border-gray-900 pt-2 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>Sub Total</span>
                                    <span>Rp {formatCurrency(booking.transaction?.subtotal || booking.total_price)}</span>
                                </div>
                                {(toNumber(booking.room_charge) > 0) && (
                                    <div className="flex justify-between text-sm">
                                        <span>Biaya Ruangan</span>
                                        <span>Rp {formatCurrency(booking.room_charge)}</span>
                                    </div>
                                )}
                                {toNumber(booking.transaction?.tax) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span>Pajak</span>
                                        <span>Rp {formatCurrency(booking.transaction.tax)}</span>
                                    </div>
                                )}
                                {toNumber(booking.transaction?.service_charge) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span>Service Charge</span>
                                        <span>Rp {formatCurrency(booking.transaction.service_charge)}</span>
                                    </div>
                                )}
                                {(Number(booking.transaction?.discount) > 0 || Number(booking.discount_amount) > 0) && (
                                    <div className="flex justify-between text-sm">
                                        <span>Diskon / Voucher</span>
                                        <span>-Rp {formatCurrency(Math.max(Number(booking.transaction?.discount || 0), Number(booking.discount_amount || 0)))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-black border-y border-gray-900 py-1">
                                    <span>Total</span>
                                    <span>Rp {formatCurrency(booking.transaction?.total || booking.total_price)}</span>
                                </div>
                            </div>

                            {/* Payments History */}
                            <div className="space-y-3">
                                {booking.payments?.map((payment: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-start text-sm">
                                        <div>
                                            <p className="font-bold uppercase">{payment.payment_method?.replace(/_/g, ' ')}</p>
                                            <p className="text-xs text-gray-500">{new Date(payment.paid_at || payment.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', ':')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">Rp {formatCurrency(payment.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Point Section */}
                            <div className="border-t border-gray-100 pt-4 space-y-1 text-xs text-gray-600">
                                {(() => {
                                    const pointsObtained = booking.transaction?.loyalty_points?.reduce((sum: number, p: any) => sum + Number(p.points), 0) || 0;
                                    const pointsUsed = booking.transaction?.point_redemptions?.reduce((sum: number, p: any) => sum + Number(p.points_used), 0) || 0;

                                    // This is a simplified calculation for the receipt
                                    return (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Point Diperoleh</span>
                                                <span>{formatCurrency(pointsObtained)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Digunakan</span>
                                                <span>{formatCurrency(pointsUsed)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-50 pt-1 mt-1">
                                                <span>Total Point Transaksi</span>
                                                <span>{formatCurrency(pointsObtained - pointsUsed)}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Footer */}
                            <div className="text-center pt-8 pb-4">
                                <p className="text-sm font-medium text-gray-700">Penjualan oleh {booking.transaction?.cashier?.name || '-'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500">Data tidak ditemukan</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
