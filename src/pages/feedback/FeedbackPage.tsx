import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, Reply, User, Calendar, X, Search, Filter, Send, RotateCcw, Edit2, ChevronUp, ChevronDown, ChevronsUpDown, FileText } from 'lucide-react';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';

interface Feedback {
    id: number;
    user_id: number;
    user_name: string;
    booking_ref: string;
    branch_name: string;
    service_name: string;
    therapist_name: string;
    rating: number;
    comment: string;
    reply?: string;
    is_published: boolean;
    created_at: string;
    treatment_date?: string;
    appointment_id?: string | number;
    invoice_no?: string;
}

interface FeedbackResponse {
    id: number;
    user_id: number;
    user_name?: string;
    customer_name?: string;
    booking_ref?: string;
    branch_name?: string;
    service_name?: string;
    therapist_name?: string;
    rating: string | number;
    comment?: string;
    reply?: string;
    is_published: boolean;
    created_at: string;
    treatment_date?: string;
    appointment_id?: string | number;
    invoice_no?: string;
    [key: string]: any;
}

type SortField = 'user_name' | 'rating' | 'branch_name' | 'treatment_date' | 'invoice_no' | 'comment';
type SortDir = 'asc' | 'desc';

const StarRow = ({ rating, size = 14 }: { rating: number; size?: number }) => (
    <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
            <Star
                key={i}
                size={size}
                className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}
            />
        ))}
    </div>
);

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) => {
    if (sortField !== field) return <ChevronsUpDown size={13} className="text-gray-300 ml-0.5" />;
    return sortDir === 'asc'
        ? <ChevronUp size={13} className="text-naqupos-primary ml-0.5" />
        : <ChevronDown size={13} className="text-naqupos-primary ml-0.5" />;
};

export default function FeedbackPage() {
    const navigate = useNavigate();

    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [staffFilter, setStaffFilter] = useState<string | number>('all');
    const [serviceFilter, setServiceFilter] = useState<string | number>('all');
    const [staffList, setStaffList] = useState<any[]>([]);
    const [serviceList, setServiceList] = useState<any[]>([]);
    const [sortField, setSortField] = useState<SortField>('treatment_date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // Reply Modal
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [branches, setBranches] = useState<any[]>([]);
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || '');
    const [branchFilter, setBranchFilter] = useState<string | number>('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(30);
    const [totalItems, setTotalItems] = useState(0);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) setUser(JSON.parse(authData).user);
    }, []);

    const isSuperAdminOrAdmin = useMemo(() => {
        if (!user?.role) return false;
        const role = user.role.toLowerCase();
        return ['super admin', 'super_admin', 'owner'].includes(role);
    }, [user]);

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
                const saved = localStorage.getItem('naqupos_selected_branch') || '';
                setGlobalBranchId(saved);
                setBranchFilter(saved === 'all' || saved === '' ? '' : Number(saved));
            } catch (error) { console.error('Failed to load branches', error); }
        };
        loadBranches();
    }, []);

    useEffect(() => {
        const loadFilterData = async () => {
            try {
                const params = { branch_id: (branchFilter === '' || branchFilter === 'all') ? undefined : branchFilter, limit: 100 };
                const [staffData, serviceData] = await Promise.all([api.getTherapists(params), api.getServices(params)]);
                setStaffList(Array.isArray(staffData) ? staffData : (staffData.data || []));
                setServiceList(Array.isArray(serviceData) ? serviceData : (serviceData.data || []));
            } catch (error) { console.error('Failed to load filter data', error); }
        };
        loadFilterData();
    }, [branchFilter]);

    useEffect(() => {
        const syncBranch = () => {
            const saved = localStorage.getItem('naqupos_selected_branch') || '';
            setGlobalBranchId(saved);
            setBranchFilter(saved === 'all' || saved === '' ? '' : Number(saved));
        };
        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, []);

    useEffect(() => { loadFeedbacks(); }, [searchTerm, ratingFilter, branchFilter, staffFilter, serviceFilter, startDate, endDate, page, perPage]);

    const loadFeedbacks = async () => {
        try {
            setLoading(true);
            const params: any = {
                search: searchTerm,
                rating: ratingFilter !== 'all' ? ratingFilter : undefined,
                branch_id: (branchFilter === '' || branchFilter === 'all') ? undefined : branchFilter,
                therapist_id: staffFilter !== 'all' ? staffFilter : undefined,
                service_id: serviceFilter !== 'all' ? serviceFilter : undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                page,
                limit: perPage,
            };
            const response = await api.getFeedbacks(params);
            const rawData = Array.isArray(response) ? response : (response.data || []);
            setTotalItems(response.total || (Array.isArray(response) ? response.length : (response.data?.length || 0)));

            const mappedData = rawData.map((item: FeedbackResponse) => ({
                id: item.id,
                user_id: item.user_id,
                user_name: item.user_name || item.customer_name || 'Anonymous',
                booking_ref: item.booking_ref || '-',
                branch_name: item.branch_name || '-',
                service_name: item.service_name || '-',
                therapist_name: item.therapist_name || '-',
                rating: parseInt(String(item.rating)) || 0,
                comment: item.comment || '',
                reply: item.reply,
                is_published: item.is_published,
                created_at: item.created_at,
                treatment_date: item.treatment_date || item.created_at,
                appointment_id: item.appointment_id || item.booking_ref || '-',
                invoice_no: item.invoice_no || item.booking_ref || '-',
            }));
            setFeedbacks(mappedData);
        } catch (error) {
            console.error('Error loading feedbacks:', error);
            setFeedbacks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReply = (feedback: Feedback) => {
        setSelectedFeedback(feedback);
        setReplyText(feedback.reply || '');
        setShowReplyModal(true);
    };

    const handleSubmitReply = async () => {
        if (!selectedFeedback) return;
        try {
            setIsSubmitting(true);
            await api.replyFeedback(selectedFeedback.id, { reply: replyText });
            setFeedbacks(feedbacks.map(f => f.id === selectedFeedback.id ? { ...f, reply: replyText } : f));
            setShowReplyModal(false);
            setReplyText('');
            setSelectedFeedback(null);
        } catch (error) {
            console.error('Error submitting reply:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Klik invoice → buka PrintPage di tab baru ──
    const handleOpenInvoice = (invoiceNo: string) => {
        if (!invoiceNo || invoiceNo === '-') return;
        window.open(`/print/${invoiceNo}`, '_blank');
    };

    const resetFilters = () => {
        setSearchTerm(''); setRatingFilter('all');
        setStartDate(''); setEndDate('');
        setStaffFilter('all'); setServiceFilter('all');
        setPage(1);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    // Summary stats
    const avgRating = feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
        : '0.0';

    const activeBranch = branches.find(b => b.id === Number(branchFilter));

    // Sorted display data
    const sortedFeedbacks = useMemo(() => {
        return [...feedbacks].sort((a, b) => {
            let va: any = a[sortField] ?? '';
            let vb: any = b[sortField] ?? '';
            if (sortField === 'rating') { va = Number(va); vb = Number(vb); }
            if (sortField === 'treatment_date') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [feedbacks, sortField, sortDir]);

    const hasActiveFilter = searchTerm || ratingFilter !== 'all' || startDate || endDate || staffFilter !== 'all' || serviceFilter !== 'all';

    const thClass = "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider select-none whitespace-nowrap";
    const thBtn = (field: SortField) => (
        <button onClick={() => handleSort(field)} className="flex items-center hover:text-naqupos-primary transition-colors">
            {field === 'user_name' ? 'Customer Name' :
             field === 'rating' ? 'Avg Rating' :
             field === 'branch_name' ? 'Location' :
             field === 'treatment_date' ? 'Treatment Date' :
             field === 'invoice_no' ? 'Invoice' : 'Review'}
            <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
        </button>
    );

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-naqupos-dark">Review & Logs</h1>
                        <p className="text-gray-500 text-sm">Kelola ulasan dan masukan dari pelanggan</p>
                    </div>
                    {isSuperAdminOrAdmin && (
                        <div className="bg-white p-1.5 rounded-2xl border border-naqupos-primary/20 shadow-sm">
                            <BranchSelector
                                selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)}
                                onBranchChange={(id) => { setBranchFilter(id || ''); setPage(1); }}
                                showAllOption={true}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Cari nama, ulasan, layanan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none text-sm"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-gray-400 shrink-0" />
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm" />
                        <span className="text-gray-400 text-sm">-</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm" />
                    </div>
                    <div className="flex items-center gap-2 border-l pl-3 border-gray-100">
                        <Filter size={15} className="text-gray-400 shrink-0" />
                        <div className="w-[160px]">
                            <SearchableSelect placeholder="Semua Layanan" value={serviceFilter}
                                onChange={(val) => setServiceFilter(val)}
                                options={[{ value: 'all', label: 'Semua Layanan' }, ...serviceList.map(s => ({ value: s.id, label: s.name }))]} />
                        </div>
                        <div className="w-[155px]">
                            <SearchableSelect placeholder="Semua Staff" value={staffFilter}
                                onChange={(val) => setStaffFilter(val)}
                                options={[{ value: 'all', label: 'Semua Staff' }, ...staffList.map(s => ({ value: s.id, label: s.name }))]} />
                        </div>
                        <div className="w-[150px]">
                            <SearchableSelect value={ratingFilter}
                                onChange={(val: string | number) => setRatingFilter(val === 'all' ? 'all' : Number(val))}
                                options={[
                                    { value: 'all', label: 'All Ratings' },
                                    { value: 5, label: '⭐ 5 Bintang' },
                                    { value: 4, label: '⭐ 4 Bintang' },
                                    { value: 3, label: '⭐ 3 Bintang' },
                                    { value: 2, label: '⭐ 2 Bintang' },
                                    { value: 1, label: '⭐ 1 Bintang' },
                                ]} />
                        </div>
                    </div>
                    {hasActiveFilter && (
                        <button onClick={resetFilters}
                            className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium border border-transparent hover:border-red-100">
                            <RotateCcw size={14} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Branch info + Summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Branch header row */}
                <div className="flex items-center gap-6 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-naqupos-cream flex items-center justify-center text-naqupos-primary font-bold text-sm overflow-hidden">
                            {activeBranch?.logo
                                ? <img src={activeBranch.logo} alt="" className="w-full h-full object-cover" />
                                : <User size={16} />}
                        </div>
                        <span className="font-semibold text-naqupos-dark text-sm">
                            {activeBranch?.name || 'Semua Cabang'}
                        </span>
                    </div>

                    {/* Avg rating */}
                    <div className="flex items-center gap-2 pl-5 border-l border-gray-200">
                        <span className="text-2xl font-bold text-naqupos-dark">{avgRating}</span>
                        <StarRow rating={Math.round(Number(avgRating))} size={16} />
                    </div>

                    {/* Review count */}
                    <div className="flex items-center gap-2 pl-5 border-l border-gray-200">
                        <MessageSquare size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                            <span className="font-bold text-naqupos-dark">{totalItems}</span> Review(s)
                        </span>
                    </div>

                    {/* Booking count kalau ada */}
                    {activeBranch?.total_bookings !== undefined && (
                        <div className="flex items-center gap-2 pl-5 border-l border-gray-200">
                            <Calendar size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-600">
                                <span className="font-bold text-naqupos-dark">{activeBranch.total_bookings}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary" />
                    </div>
                ) : sortedFeedbacks.length === 0 ? (
                    <div className="text-center py-16">
                        <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
                        <h3 className="font-medium text-gray-500">Belum ada ulasan</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className={thClass}>{thBtn('user_name')}</th>
                                    <th className={thClass}>{thBtn('rating')}</th>
                                    <th className={thClass}>{thBtn('branch_name')}</th>
                                    <th className={thClass}>Therapist</th>
                                    <th className={thClass}>{thBtn('treatment_date')}</th>
                                    <th className={thClass}>{thBtn('invoice_no')}</th>
                                    <th className={thClass}>{thBtn('comment')}</th>
                                    <th className={`${thClass} text-center`}>Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sortedFeedbacks.map((feedback) => (
                                    <tr key={feedback.id} className="hover:bg-gray-50/70 transition-colors group">
                                        {/* Customer */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-naqupos-cream flex items-center justify-center shrink-0">
                                                    <User size={14} className="text-naqupos-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-naqupos-dark text-sm leading-tight">
                                                        {feedback.user_name === 'Anonymous' ? 'Anonymous User' : feedback.user_name}
                                                    </p>
                                                    {feedback.service_name !== '-' && (
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{feedback.service_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Rating */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-naqupos-dark">{feedback.rating}</span>
                                                <StarRow rating={feedback.rating} />
                                            </div>
                                        </td>

                                        {/* Location */}
                                        <td className="px-4 py-3.5 text-gray-600 text-sm">{feedback.branch_name}</td>

                                        {/* Therapist */}
                                        <td className="px-4 py-3.5 text-gray-600 text-sm">{feedback.therapist_name}</td>

                                        {/* Treatment Date */}
                                        <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                                            {feedback.treatment_date
                                                ? new Date(feedback.treatment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '-'}
                                        </td>

                                        {/* Invoice — klik buka struk di tab baru */}
                                        <td className="px-4 py-3.5">
                                            {feedback.invoice_no && feedback.invoice_no !== '-' ? (
                                                <button
                                                    onClick={() => handleOpenInvoice(feedback.invoice_no!)}
                                                    className="flex items-center gap-1.5 text-naqupos-primary font-medium text-sm hover:underline hover:text-naqupos-accent transition-colors group/inv"
                                                    title="Lihat struk"
                                                >
                                                    <FileText size={13} className="opacity-60 group-hover/inv:opacity-100 transition-opacity" />
                                                    {feedback.invoice_no}
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>

                                        {/* Review */}
                                        <td className="px-4 py-3.5 max-w-[260px]">
                                            <p className="text-gray-700 text-sm line-clamp-2">{feedback.comment || '-'}</p>
                                            {feedback.reply && (
                                                <div className="mt-1.5 flex items-start gap-1.5">
                                                    <Reply size={11} className="text-naqupos-primary mt-0.5 shrink-0" />
                                                    <p className="text-[11px] text-gray-400 line-clamp-1 italic">{feedback.reply}</p>
                                                </div>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="px-4 py-3.5 text-center">
                                            <button
                                                onClick={() => handleOpenReply(feedback)}
                                                title={feedback.reply ? 'Edit Balasan' : 'Balas Ulasan'}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-naqupos-primary hover:bg-naqupos-cream transition-colors"
                                            >
                                                {feedback.reply ? <Edit2 size={15} /> : <Reply size={15} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalItems > 0 && (
                    <div className="border-t border-gray-100">
                        <Pagination
                            currentPage={page}
                            totalItems={totalItems}
                            itemsPerPage={perPage}
                            onPageChange={setPage}
                            onItemsPerPageChange={(val) => { setPerPage(val); setPage(1); }}
                        />
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            {showReplyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-naqupos-dark">
                                {selectedFeedback?.reply ? 'Edit Balasan' : 'Balas Ulasan'}
                            </h3>
                            <button onClick={() => setShowReplyModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Original review preview */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-naqupos-cream flex items-center justify-center">
                                            <User size={12} className="text-naqupos-primary" />
                                        </div>
                                        <span className="font-semibold text-sm text-naqupos-dark">{selectedFeedback?.user_name}</span>
                                    </div>
                                    <StarRow rating={selectedFeedback?.rating || 0} size={13} />
                                </div>
                                {selectedFeedback?.therapist_name && selectedFeedback.therapist_name !== '-' && (
                                    <p className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
                                        <User size={10} />
                                        {selectedFeedback.therapist_name}
                                    </p>
                                )}
                                {selectedFeedback?.treatment_date && (
                                    <p className="text-[11px] text-gray-400 mb-1.5 flex items-center gap-1">
                                        <Calendar size={10} />
                                        {new Date(selectedFeedback.treatment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                                <p className="text-sm text-gray-600 italic">"{selectedFeedback?.comment}"</p>
                            </div>

                            {/* Reply textarea */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Balasan Anda</label>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:ring-1 focus:ring-naqupos-primary outline-none text-sm resize-none"
                                    placeholder="Tulis balasan apresiasi atau permohonan maaf..."
                                />
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowReplyModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                                    Batal
                                </button>
                                <button onClick={handleSubmitReply}
                                    disabled={!replyText.trim() || isSubmitting}
                                    className="flex-1 py-2.5 bg-naqupos-primary text-white rounded-xl text-sm font-medium hover:bg-naqupos-accent disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-colors">
                                    {isSubmitting
                                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <><Send size={14} /><span>Kirim Balasan</span></>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}