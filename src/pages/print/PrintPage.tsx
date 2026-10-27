import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Printer, X } from 'lucide-react';
import { api } from '../../services/api';

interface BookingData {
    id: number;
    invoiceNumber: string;
    customer: string;
    customerPhone?: string;
    customerAddress?: string;
    service: string;
    servicePrice: number;
    roomName?: string;
    roomPrice?: number;
    therapist?: string;
    cashier?: string;
    date: string;
    time: string;
    duration: number;
    guestCount: number;
    status: string;
    paymentStatus: string;
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    paymentMethod?: string;
    paidAt?: string;
    notes?: string;
    items?: Array<{
        name: string;
        price: number;
        duration: number;
        therapist?: string;
        room?: string;
    }>;
}

// camelCase sesuai response API
interface InvoiceConfig {
    logoUrl?: string;
    businessNameOverride?: string;
    invoiceTitle?: string;
    customHeader?: string;
    customFooter?: string;
    showLogo?: boolean;
    hideCompanyName?: boolean;
    showCustomerName?: boolean;
    showCustomerContact?: boolean;
    showCustomerAddress?: boolean;
    showStaffName?: boolean;
    hideCashierName?: boolean;
    showItemDetails?: boolean;
    showItemPrice?: boolean;
    showTax?: boolean;
    autoPrint?: boolean;
    applyToAllLocations?: boolean;
    socialMedia?: {
        instagram?: string;
        facebook?: string;
        twitter?: string;
    };
}

interface CompanyInfo {
    name?: string;
    address?: string;
    phone?: string;
    city?: string;
    logo_url?: string;
    tax_percentage?: number;
    is_tax_enabled?: boolean;
    service_charge_percentage?: number;
    is_service_charge_enabled?: boolean;
}

const GENERIC_SERVICE_NAMES = ['perawatan lainnya', 'perawatan lainya', 'lainnya', 'lainya'];

const getServiceVariantLabel = (serviceName?: string, variantName?: string, fallback = 'Item') => {
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

export default function PrintPage() {
    const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);
    const [booking, setBooking] = useState<BookingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig | null>(null);

    useEffect(() => {
        const loadBooking = async () => {
            setLoading(true);
            try {
                if (!invoiceNumber) { setLoading(false); return; }

                const res = await api.getBookings({ search: invoiceNumber });
                const foundBooking = res.data?.find((b: any) =>
                    b.booking_ref === invoiceNumber || b.invoiceNumber === invoiceNumber
                ) || (res.data && res.data[0]);

                if (foundBooking) {
                    const fullDetails = await api.getBooking(foundBooking.id);
                    setBooking({
                        id: fullDetails.id,
                        invoiceNumber: fullDetails.booking_ref,
                        customer: fullDetails.user
                            ? fullDetails.user.name
                            : (fullDetails.guest_name || 'Guest'),
                        customerPhone: fullDetails.user
                            ? fullDetails.user.phone
                            : fullDetails.guest_phone,
                        customerAddress: fullDetails.user
                            ? fullDetails.user.address
                            : fullDetails.guest_address,
                        service: fullDetails.service ? fullDetails.service.name : '',
                        servicePrice: Number(fullDetails.service_price),
                        roomName: fullDetails.room ? fullDetails.room.name : '',
                        roomPrice: Number(fullDetails.room_charge),
                        therapist: fullDetails.therapist ? fullDetails.therapist.name : '',
                        cashier: fullDetails.cashier ? fullDetails.cashier.name : (fullDetails.created_by?.name || ''),
                        date: fullDetails.booking_date,
                        time: fullDetails.start_time?.substring(0, 5) || '00:00',
                        duration: Number(fullDetails.duration),
                        guestCount: Number(fullDetails.guest_count),
                        status: fullDetails.status,
                        paymentStatus: fullDetails.payment_status,
                        subtotal: fullDetails.transaction
                            ? Number(fullDetails.transaction.subtotal)
                            : Number(fullDetails.total_price),
                        discount: fullDetails.transaction
                            ? Number(fullDetails.transaction.discount)
                            : (Number(fullDetails.discount_amount) || 0),
                        tax: fullDetails.transaction
                            ? Number(fullDetails.transaction.tax)
                            : 0,
                        total: fullDetails.transaction
                            ? Number(fullDetails.transaction.total)
                            : Number(fullDetails.total_price),
                        paymentMethod: fullDetails.transaction
                            ? fullDetails.transaction.payment_method
                            : (fullDetails.payments?.length > 0 ? fullDetails.payments[0].payment_method : ''),
                        paidAt: fullDetails.completed_at
                            || (fullDetails.payments?.length > 0 ? fullDetails.payments[0].created_at : ''),
                        notes: fullDetails.notes,
                        items: fullDetails.items
                            ? fullDetails.items.map((it: any) => ({
                                name: getServiceVariantLabel(it.service?.name, it.variant?.name),
                                price: Number(it.price),
                                duration: Number(it.duration),
                                therapist: it.therapist
                                    ? it.therapist.name
                                    : (fullDetails.therapist ? fullDetails.therapist.name : ''),
                                room: it.room ? it.room.name : ''
                            }))
                            : []
                    });

                    const branchId = fullDetails.branch_id;

                    const [company, invoice] = await Promise.all([
                        api.getCompanySettings(branchId).catch(() => null),
                        api.getInvoiceSettings(branchId).catch(() => null),
                    ]);

                    if (company) setCompanyInfo(company);
                    if (invoice) {
                        // Response API sudah camelCase, langsung set
                        setInvoiceConfig(invoice);
                    }
                }
            } catch (error) {
                console.error("Failed to load booking for print", error);
            } finally {
                setLoading(false);
            }
        };
        loadBooking();
    }, [invoiceNumber]);

    const handlePrint = () => window.print();
    const handleClose = () => window.history.length > 1 ? navigate(-1) : window.close();

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 text-lg mb-4">Invoice tidak ditemukan</p>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                    >
                        Kembali
                    </button>
                </div>
            </div>
        );
    }

    // ── Resolve semua field — camelCase sesuai response API ──
    const logoUrl = (invoiceConfig?.showLogo !== false)
        ? (invoiceConfig?.logoUrl || companyInfo?.logo_url || null)
        : null;

    const businessName = invoiceConfig?.businessNameOverride
        || companyInfo?.name
        || 'Naqupos';

    const invoiceTitle = invoiceConfig?.invoiceTitle || 'FAKTUR';
const businessAddress = invoiceConfig?.invoiceAddress || companyInfo?.address || '';
const businessPhone = invoiceConfig?.invoicePhone || companyInfo?.phone || '';
const businessCity = invoiceConfig?.invoiceCity || companyInfo?.city || '';
    const customHeader = invoiceConfig?.customHeader || '';
    const customFooter = invoiceConfig?.customFooter || 'Terima kasih atas kunjungan Anda';

    const showCustomerName = invoiceConfig?.showCustomerName !== false;
    const showCustomerContact = invoiceConfig?.showCustomerContact === true;
    const showCustomerAddress = invoiceConfig?.showCustomerAddress === true;
    const showStaffName = invoiceConfig?.showStaffName !== false;
    const hideCashierName = invoiceConfig?.hideCashierName === true;
    const hideCompanyName = invoiceConfig?.hideCompanyName === true;
    const showItemDetails = invoiceConfig?.showItemDetails !== false;
    const showItemPrice = invoiceConfig?.showItemPrice === true;
    const showTax = invoiceConfig?.showTax !== false && companyInfo?.is_tax_enabled === true;

    const taxRate = companyInfo?.tax_percentage || 0;
    const taxAmount = booking.tax ?? 0;

    return (
        <div className="min-h-screen bg-gray-200">
            {/* Action Bar */}
            <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={handleClose}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft size={20} />
                        <span>Kembali</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                        >
                            <Printer size={18} />
                            Print
                        </button>
                        <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Receipt */}
            <div className="max-w-lg mx-auto py-8 px-4">
                <div
                    ref={printRef}
                    className="bg-white print:shadow-none"
                    style={{ fontFamily: "'Courier New', Courier, monospace" }}
                >
                    {/* ── HEADER ── */}
                    <div className="pt-8 pb-4 px-6 text-center border-b border-dashed border-gray-300">
                        {logoUrl ? (
                            <div className="flex justify-center mb-3">
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className="w-20 h-20 object-cover rounded-full border-2 border-gray-200"
                                />
                            </div>
                        ) : (
                            <div className="flex justify-center mb-3">
                                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                                    <span className="text-white text-2xl font-bold">
                                        {businessName.charAt(0)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">
                            {invoiceTitle}
                        </p>

                        {!hideCompanyName && (
                            <h1 className="text-base font-bold text-gray-900">{businessName}</h1>
                        )}

                        {businessAddress && (
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
                                {businessAddress}{businessCity ? `, ${businessCity}` : ''}
                            </p>
                        )}

                        {businessPhone && (
                            <p className="text-xs text-gray-500">Telp: {businessPhone}</p>
                        )}

                        {customHeader && (
                            <p className="text-xs text-gray-500 mt-2 italic border-t border-dashed border-gray-200 pt-2">
                                {customHeader}
                            </p>
                        )}
                    </div>

                    {/* ── INVOICE INFO ── */}
                    <div className="px-6 py-4 text-center border-b border-dashed border-gray-300">
                        <p className="text-sm font-bold text-gray-900">
                            {booking.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(booking.date)}</p>
                    </div>

                    {/* ── KASIR & TERAPIS ── */}
                    {(!hideCashierName || showStaffName) && (
                        <div className="px-6 py-2 border-b border-dashed border-gray-300 space-y-0.5">
                            {!hideCashierName && booking.cashier && (
                                <p className="text-xs text-gray-500">Kasir: {booking.cashier}</p>
                            )}
                            {showStaffName && booking.therapist && !booking.items?.length && (
                                <p className="text-xs text-gray-500">Terapis: {booking.therapist}</p>
                            )}
                        </div>
                    )}

                    {/* ── CUSTOMER ── */}
                    {(showCustomerName || showCustomerContact || showCustomerAddress) && (
                        <div className="px-6 py-3 border-b border-dashed border-gray-300">
                            {showCustomerName && (
                                <p className="text-xs text-gray-900 font-semibold">{booking.customer}</p>
                            )}
                            {showCustomerContact && booking.customerPhone && (
                                <p className="text-xs text-gray-500">{booking.customerPhone}</p>
                            )}
                            {showCustomerAddress && booking.customerAddress && (
                                <p className="text-xs text-gray-500">{booking.customerAddress}</p>
                            )}
                        </div>
                    )}

                {/* ── ITEMS ── */}
<div className="px-6 py-4 border-b border-dashed border-gray-300">
    {booking.items && booking.items.length > 0 ? (
        booking.items.map((item, idx) => (
            <div key={idx} className="mb-3 last:mb-0">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900">
                            {idx + 1}. {item.name}
                        </p>
                        <p className="text-xs text-gray-400">
                            {formatDate(booking.date)} {booking.time}
                            {item.duration > 0 && ` · ${item.duration} mnt`}
                        </p>
                        {showStaffName && item.therapist && (
                            <p className="text-xs text-gray-400">
                                with {item.therapist}
                            </p>
                        )}
                        {showItemDetails && item.room && (
                            <p className="text-xs text-gray-400">
                                Ruang: {item.room}
                            </p>
                        )}
                        {showItemPrice && (
                            <p className="text-xs text-gray-400">
                                1 x {formatCurrency(item.price)}
                            </p>
                        )}
                    </div>
                    <p className="text-xs text-gray-900 whitespace-nowrap">
                        {formatCurrency(item.price)}
                    </p>
                </div>
            </div>
        ))
    ) : (
        <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
                <p className="text-xs font-medium text-gray-900">
                    1. {booking.service}
                </p>
                <p className="text-xs text-gray-400">
                    {formatDate(booking.date)} {booking.time}
                    {booking.duration > 0 && ` · ${booking.duration} mnt`}
                </p>
                {showStaffName && booking.therapist && (
                    <p className="text-xs text-gray-400">
                        with {booking.therapist}
                    </p>
                )}
                {showItemPrice && (
                    <p className="text-xs text-gray-400">
                        1 x {formatCurrency(booking.servicePrice)}
                    </p>
                )}
            </div>
            <p className="text-xs text-gray-900 whitespace-nowrap">
                {formatCurrency(booking.servicePrice)}
            </p>
        </div>
    )}

    {!!booking.roomName && (booking.roomPrice ?? 0) > 0
        && (!booking.items || booking.items.every(i => !i.room)) && (
            <div className="flex justify-between items-start gap-2 mt-3">
                <p className="text-xs text-gray-900">{booking.roomName}</p>
                <p className="text-xs text-gray-900 whitespace-nowrap">
                    {formatCurrency(booking.roomPrice ?? 0)}
                </p>
            </div>
        )}
</div>

                    {/* ── TOTALS ── */}
                    <div className="px-6 py-4 border-b border-dashed border-gray-300 space-y-1.5">
                        <div className="flex justify-between text-xs text-gray-600">
                            <span>Sub Total</span>
                            <span>{formatCurrency(booking.subtotal)}</span>
                        </div>

                        {(booking.discount ?? 0) > 0 && (
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Diskon</span>
                                <span>-{formatCurrency(booking.discount ?? 0)}</span>
                            </div>
                        )}

                        {showTax && taxAmount > 0 && (
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Pajak{taxRate > 0 ? ` (${taxRate}%)` : ''}</span>
                                <span>{formatCurrency(taxAmount)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-xs font-bold text-gray-900 pt-1 border-t border-gray-200">
                            <span>Total</span>
                            <span>{formatCurrency(booking.total)}</span>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Biaya pembayaran</span>
                            <span>{formatCurrency(0)}</span>
                        </div>

                        <div className="flex justify-between text-xs font-bold text-gray-900">
                            <span>Grand Total</span>
                            <span>{formatCurrency(booking.total)}</span>
                        </div>
                    </div>

                    {/* ── PAYMENT ── */}
                    {booking.paymentMethod && (
                        <div className="px-6 py-4 border-b border-dashed border-gray-300 space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                    {booking.paymentMethod}
                                    {booking.paidAt ? ` (${formatDateTime(booking.paidAt)})` : ''}
                                </span>
                                <span className="text-gray-900">{formatCurrency(booking.total)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Saldo sebelumnya</span><span>{formatCurrency(0)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Point Diperoleh</span><span>0</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Digunakan</span><span>0</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Pengembalian</span><span>{formatCurrency(0)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Total Point</span><span>0</span>
                            </div>
                        </div>
                    )}

                    {/* ── NOTES ── */}
                    {booking.notes && (
                        <div className="px-6 py-3 border-b border-dashed border-gray-300">
                            <p className="text-xs text-gray-500 italic">{booking.notes}</p>
                        </div>
                    )}

                    {/* ── FOOTER ── */}
                    <div className="px-6 py-6 text-center">
                        <p className="text-xs text-gray-500">{customFooter}</p>
                        <p className="text-[10px] text-gray-300 mt-4 tracking-widest uppercase">
                            Powered by <span className="font-black text-gray-400">NaquPOS</span>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
}
