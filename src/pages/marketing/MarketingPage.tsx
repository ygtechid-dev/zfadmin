import { Plus, Edit, Trash2, Tag, Newspaper, Send, Calendar, Percent, X, AlertTriangle, Zap, Clock, Gift, Users, RotateCcw, MessageSquare, ToggleLeft, ToggleRight, Building, Phone, FileText, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatDate } from '../../utils/date';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import swal from '../../utils/swal';

interface Promo {
    id: number;
    title: string;
    type: 'percent' | 'nominal';
    discount: number;
    code: string;
    quota: number;
    used: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'expired';
    description?: string;
    branch_id?: number;
}

interface News {
    id: number;
    title: string;
    category: string;
    status: 'published' | 'draft';
    date: string;
    content?: string;
}

interface Campaign {
    id: number;
    name: string;
    type: string;
    sent: number;
    opened: number;
    converted: number;
    status: 'active' | 'paused';
    targetAudience?: string;
    message?: string;
}

interface AutomationRule {
    id: number;
    name: string;
    trigger: 'birthday' | 'winback' | 'post_visit' | 'anniversary' | 'first_visit';
    isActive: boolean;
    daysOffset: number;
    channel: 'whatsapp' | 'email' | 'sms';
    message: string;
    discountCode?: string;
    lastTriggered?: string;
    totalSent: number;
    [key: string]: any;
}

interface PromoResponse {
    id: number;
    title: string;
    type: 'percent' | 'nominal';
    discount: number;
    code: string;
    quota: number;
    used: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'expired';
    description?: string;
    branch_id?: number;
}

interface NewsResponse {
    id: number;
    title: string;
    category: string;
    status: 'published' | 'draft';
    created_at?: string;
    published_at?: string;
    content?: string;
}

interface CampaignResponse {
    id: number;
    name: string;
    type: string;
    sent: number;
    opened: number;
    converted: number;
    status: 'active' | 'paused';
    target_audience?: string;
    message?: string;
}

interface AutomationResponse {
    id: number;
    name: string;
    trigger: 'birthday' | 'winback' | 'post_visit' | 'anniversary' | 'first_visit';
    is_active: boolean;
    days_offset: number;
    channel: 'whatsapp' | 'email' | 'sms';
    message: string;
    discount_code?: string;
    last_triggered?: string;
    total_sent: number;
}



const triggerTypes = [
    { id: 'birthday', label: 'Ulang Tahun', icon: Gift, desc: 'Kirim pesan saat hari ulang tahun pelanggan' },
    { id: 'winback', label: 'Win Back', icon: RotateCcw, desc: 'Kirim pesan jika pelanggan tidak aktif' },
    { id: 'post_visit', label: 'Setelah Kunjungan', icon: MessageSquare, desc: 'Kirim pesan setelah selesai treatment' },
    { id: 'anniversary', label: 'Anniversary Member', icon: Calendar, desc: 'Kirim pesan di anniversary jadi member' },
    { id: 'first_visit', label: 'Kunjungan Pertama', icon: Users, desc: 'Follow up setelah kunjungan pertama' },
];



// const newsCategories = ['News', 'Tips', 'Event', 'Promo']; // Replaced by API
// const campaignTypes = ['birthday', 'winback', 'feedback', 'promo', 'reminder']; // Replaced by API

export default function MarketingPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || '');
    useEffect(() => {
        // Just triggers re-render if needed or kept for consistency
    }, [globalBranchId]);
    const [branchFilter, setBranchFilter] = useState<string | number>('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [activeTab, setActiveTab] = useState<'promo' | 'news' | 'campaign' | 'automation'>('promo');
    const [promos, setPromos] = useState<Promo[]>([]);
    const [news, setNews] = useState<News[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [automations, setAutomations] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [extraFilters, setExtraFilters] = useState<any>({});

    // News Categories
    const [newsCategoryOptions, setNewsCategoryOptions] = useState<{ value: string; label: string }[]>([]);
    // Campaign Types
    const [campaignTypeOptions, setCampaignTypeOptions] = useState<{ value: string; label: string }[]>([]);
    // Target Audience Options (Customer Status)
    const [targetAudienceOptions] = useState<{ value: string; label: string }[]>([
        { value: 'all', label: 'Semua Pelanggan' },
        { value: 'active', label: 'Pelanggan Aktif' },
        { value: 'inactive', label: 'Pelanggan Tidak Aktif' },
        { value: 'vip', label: 'Pelanggan VIP' },
        { value: 'new', label: 'Pelanggan Baru' },
        { value: 'birthday', label: 'Ulang Tahun Bulan Ini' }
    ]);

    const channels = [
        { id: 'whatsapp', label: 'WhatsApp' },
        { id: 'email', label: 'Email' },
        { id: 'sms', label: 'SMS' }
    ];

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.getNewsCategories();
                const branchId = branchFilter;
                const isSpecific = branchId !== 'all' && branchId !== '';

                const filtered = res.filter((c: any) => {
                    if (c.is_global) return true;
                    if (!isSpecific) return true;
                    const itemBranchIds = c.branches ? c.branches.map((b: any) => b.id) : (c.branch_id ? [c.branch_id] : []);
                    return itemBranchIds.includes(Number(branchId));
                });

                setNewsCategoryOptions(filtered.map((c: any) => ({ value: c.name, label: c.name })));
            } catch (e) { console.error("Failed to load categories", e); }
        };
        const fetchCampaignTypes = async () => {
            try {
                const res = await api.getCampaignTypes();
                setCampaignTypeOptions(res.map((c: any) => ({ value: c.name, label: c.name })));
            } catch (e) { console.error("Failed to load campaign types", e); }
        };
        fetchCategories();
        fetchCampaignTypes();
    }, [branchFilter]);

    const handleCreateNewsCategory = async ({ label }: { label: string }) => {
        try {
            const data = await api.createNewsCategory({ name: label });
            // Refresh categories
            const cats = await api.getNewsCategories();
            setNewsCategoryOptions(cats.map((c: any) => ({ value: c.name, label: c.name })));
            return { value: data.name, label: data.name };
        } catch (error) {
            console.error(error);
            // alert('Failed to create category');
            return null;
        }
    };

    const handleCreateCampaignType = async ({ label }: { label: string }) => {
        try {
            const data = await api.createCampaignType({ name: label });
            // Refresh types
            const types = await api.getCampaignTypes();
            setCampaignTypeOptions(types.map((c: any) => ({ value: c.name, label: c.name })));
            return { value: data.name, label: data.name };
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
                const saved = localStorage.getItem('naqupos_selected_branch') || '';
                setGlobalBranchId(saved);
                setBranchFilter(saved === 'all' || saved === '' ? '' : Number(saved));
            } catch (error) {
                console.error("Failed to load branches", error);
            }
        };
        loadBranches();
    }, []);

    useEffect(() => {
        const syncBranch = () => {
            const saved = localStorage.getItem('naqupos_selected_branch') || '';
            setGlobalBranchId(saved);
            setBranchFilter(saved === 'all' || saved === '' ? '' : Number(saved));
        };
        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, []);

    useEffect(() => {
        setPage(1);
        setStatusFilter('all');
        setDateFilter({ start: '', end: '' });
        setExtraFilters({});
    }, [activeTab]);

    useEffect(() => {
        loadAllData();
    }, [activeTab, branchFilter, page, perPage, statusFilter, dateFilter, extraFilters]);

    const loadAllData = async () => {
        try {
            setLoading(true);
            setError('');
            const params: any = {
                page,
                limit: perPage,
                branch_id: (branchFilter === '' || branchFilter === 'all') ? undefined : branchFilter,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                start_date: dateFilter.start || undefined,
                end_date: dateFilter.end || undefined,
                ...extraFilters
            };

            // For now, keep the multi-fetch but inject params
            const [promosData, newsData, campaignsData, automationsData] = await Promise.all([
                api.getPromos(params).catch(() => ({ data: [] })),
                api.getNews(params).catch(() => ({ data: [] })),
                api.getCampaigns(params).catch(() => ({ data: [] })),
                api.getAutomations(params).catch(() => ({ data: [] }))
            ]);

            // Adjust based on active tab for total items
            let activeResponse: any = promosData;
            if (activeTab === 'news') activeResponse = newsData;
            else if (activeTab === 'campaign') activeResponse = campaignsData;
            else if (activeTab === 'automation') activeResponse = automationsData;

            setTotalItems(activeResponse.total || (Array.isArray(activeResponse) ? activeResponse.length : (activeResponse.data?.length || 0)));

            const getRawData = (res: any) => Array.isArray(res) ? res : (res.data || []);

            setPromos(getRawData(promosData).map((p: PromoResponse) => ({
                ...p,
                startDate: p.start_date,
                endDate: p.end_date,
                branch_id: p.branch_id
            })));
            setNews(getRawData(newsData).map((n: NewsResponse) => ({
                ...n,
                date: n.created_at?.split('T')[0] || n.published_at?.split('T')[0] || new Date().toISOString().split('T')[0]
            })));

            // Fallback: Populate categories from data if master list is empty
            if (newsCategoryOptions.length === 0) {
                const uniqueCategories: string[] = Array.from(new Set(getRawData(newsData).map((n: any) => n.category).filter(Boolean)));
                if (uniqueCategories.length > 0) {
                    setNewsCategoryOptions(uniqueCategories.map(c => ({ value: c, label: c })));
                }
            }

            setCampaigns(getRawData(campaignsData).map((c: CampaignResponse) => ({
                ...c,
                targetAudience: c.target_audience
            })));

            // Fallback: Populate campaign types from data if master list is empty
            if (campaignTypeOptions.length === 0) {
                const uniqueTypes: string[] = Array.from(new Set(getRawData(campaignsData).map((c: any) => c.type).filter(Boolean)));
                if (uniqueTypes.length > 0) {
                    setCampaignTypeOptions(uniqueTypes.map(t => ({ value: t, label: t })));
                }
            }

            setAutomations(getRawData(automationsData).map((a: AutomationResponse) => ({
                ...a,
                isActive: a.is_active,
                daysOffset: a.days_offset,
                discountCode: a.discount_code,
                lastTriggered: a.last_triggered,
                totalSent: a.total_sent
            })));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
            console.error('Error loading marketing data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Modal states
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [, setShowDetailModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Selected items
    const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
    const [selectedNews, setSelectedNews] = useState<News | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [selectedAutomation, setSelectedAutomation] = useState<AutomationRule | null>(null);

    // Promo Form
    const [promoForm, setPromoForm] = useState({
        title: '', type: 'percent' as 'percent' | 'nominal', discount: 0, code: '',
        quota: 100, startDate: '', endDate: '', description: '', branchId: ''
    });

    // News Form
    const [newsForm, setNewsForm] = useState({
        title: '', category: 'News', content: '', status: 'draft' as 'published' | 'draft', branchId: ''
    });

    // Campaign Form
    const [campaignForm, setCampaignForm] = useState({
        name: '', type: 'promo', targetAudience: '', message: '', branchId: ''
    });

    // Automation Form
    const [automationForm, setAutomationForm] = useState({
        name: '',
        trigger: 'birthday' as AutomationRule['trigger'],
        daysOffset: 0,
        channel: 'whatsapp' as AutomationRule['channel'],
        message: '',
        discountCode: '',
        branchId: ''
    });

    const closeAllModals = () => {
        setShowAddEditModal(false);
        setShowDeleteModal(false);
        setShowDetailModal(false);
        setSelectedPromo(null);
        setSelectedNews(null);
        setSelectedCampaign(null);
    };

    // Promo handlers
    const openAddPromo = () => {
        setPromoForm({ title: '', type: 'percent', discount: 0, code: '', quota: 100, startDate: '', endDate: '', description: '', branchId: '' });
        setIsEditing(false);
        setShowAddEditModal(true);
    };

    const openEditPromo = (promo: Promo) => {
        setSelectedPromo(promo);
        const toLocalISO = (dateStr: string) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };

        setPromoForm({
            title: promo.title,
            type: promo.type,
            discount: promo.discount,
            code: promo.code,
            quota: promo.quota,
            startDate: toLocalISO(promo.startDate),
            endDate: toLocalISO(promo.endDate),
            description: promo.description || '',
            branchId: promo.branch_id?.toString() || ''
        });
        setIsEditing(true);
        setShowAddEditModal(true);
    };

    const openDeletePromo = (promo: Promo) => {
        setSelectedPromo(promo);
        setShowDeleteModal(true);
    };

    const handleSavePromo = async () => {
        if (!promoForm.title || !promoForm.code) return;
        setIsProcessing(true);
        try {
            const data = {
                title: promoForm.title,
                type: promoForm.type,
                discount: promoForm.discount,
                code: promoForm.code,
                quota: promoForm.quota,
                start_date: promoForm.startDate,
                end_date: promoForm.endDate,
                description: promoForm.description,
                branch_id: promoForm.branchId || null
            };
            if (isEditing && selectedPromo) {
                await api.updatePromo(selectedPromo.id, data);
            } else {
                await api.createPromo(data);
            }
            await loadAllData();
            closeAllModals();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to save promo');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeletePromo = async () => {
        if (!selectedPromo) return;
        setIsProcessing(true);
        try {
            await api.deletePromo(selectedPromo.id);
            await loadAllData();
            closeAllModals();
        } catch (err: unknown) {
            swal.error(err instanceof Error ? err.message : 'Failed to delete promo');
        } finally {
            setIsProcessing(false);
        }
    };

    // News handlers
    const fetchNewsCategoriesForModal = async () => {
        try {
            const res = await api.getNewsCategories();
            const branchId = branchFilter;
            const isSpecific = branchId !== 'all' && branchId !== '';

            const filtered = res.filter((c: any) => {
                if (c.is_global) return true;
                if (!isSpecific) return true;
                const itemBranchIds = c.branches ? c.branches.map((b: any) => b.id) : (c.branch_id ? [c.branch_id] : []);
                return itemBranchIds.includes(Number(branchId));
            });

            setNewsCategoryOptions(filtered.map((c: any) => ({ value: c.name, label: c.name })));
        } catch (e) {
            console.error("Failed to load categories", e);
        }
    };

    const openAddNews = async () => {
        // Fetch fresh categories when opening modal
        await fetchNewsCategoriesForModal();
        setNewsForm({ title: '', category: 'News', content: '', status: 'draft', branchId: '' });
        setIsEditing(false);
        setShowAddEditModal(true);
    };

    const openEditNews = async (item: News) => {
        // Fetch fresh categories when opening modal
        await fetchNewsCategoriesForModal();
        setSelectedNews(item);
        setNewsForm({
            title: item.title, category: item.category, content: item.content || '', status: item.status,
            branchId: (item as any).branch_id?.toString() || ''
        });
        setIsEditing(true);
        setShowAddEditModal(true);
    };

    const openDeleteNews = (item: News) => {
        setSelectedNews(item);
        setShowDeleteModal(true);
    };

    const handleSaveNews = async () => {
        if (!newsForm.title) return;
        setIsProcessing(true);
        try {
            const payload = {
                title: newsForm.title,
                category: newsForm.category,
                content: newsForm.content,
                status: newsForm.status,
                branch_id: newsForm.branchId || null
            };

            if (isEditing && selectedNews) {
                await api.updateNews(selectedNews.id, payload);
                swal.success('Artikel berhasil diperbarui');
            } else {
                await api.createNews(payload);
                swal.success('Artikel berhasil ditambahkan');
            }
            await loadAllData();
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menyimpan artikel');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteNews = async () => {
        if (!selectedNews) return;
        setIsProcessing(true);
        try {
            await api.deleteNews(selectedNews.id);
            swal.success('Artikel berhasil dihapus');
            await loadAllData();
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menghapus artikel');
        } finally {
            setIsProcessing(false);
        }
    };

    // Campaign handlers
    const openAddCampaign = () => {
        setCampaignForm({ name: '', type: 'promo', targetAudience: '', message: '', branchId: '' });
        setIsEditing(false);
        setShowAddEditModal(true);
    };

    const openEditCampaign = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setCampaignForm({
            name: campaign.name, type: campaign.type,
            targetAudience: campaign.targetAudience || '', message: campaign.message || '',
            branchId: (campaign as any).branch_id?.toString() || ''
        });
        setIsEditing(true);
        setShowAddEditModal(true);
    };

    const openDeleteCampaign = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setShowDeleteModal(true);
    };

    const handleSaveCampaign = async () => {
        if (!campaignForm.name) return;
        setIsProcessing(true);
        try {
            const payload = {
                name: campaignForm.name,
                type: campaignForm.type,
                target_audience: campaignForm.targetAudience,
                message: campaignForm.message,
                branch_id: campaignForm.branchId || null
            };

            if (isEditing && selectedCampaign) {
                await api.updateCampaign(selectedCampaign.id, payload);
                swal.success('Kampanye berhasil diperbarui');
            } else {
                await api.createCampaign(payload);
                swal.success('Kampanye berhasil ditambahkan');
            }
            await loadAllData();
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menyimpan kampanye');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCampaign = async () => {
        if (!selectedCampaign) return;
        setIsProcessing(true);
        try {
            await api.deleteCampaign(selectedCampaign.id);
            swal.success('Kampanye berhasil dihapus');
            await loadAllData();
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menghapus kampanye');
        } finally {
            setIsProcessing(false);
        }
    };

    // Automation handlers
    const openAddAutomation = () => {
        setAutomationForm({ name: '', trigger: 'birthday', daysOffset: 0, channel: 'whatsapp', message: '', discountCode: '', branchId: '' });
        setIsEditing(false);
        setShowAddEditModal(true);
    };

    const openEditAutomation = (rule: AutomationRule) => {
        setSelectedAutomation(rule);
        setAutomationForm({
            name: rule.name, trigger: rule.trigger, daysOffset: rule.daysOffset,
            channel: rule.channel, message: rule.message, discountCode: rule.discountCode || '',
            branchId: (rule as any).branch_id?.toString() || ''
        });
        setIsEditing(true);
        setShowAddEditModal(true);
    };

    const openDeleteAutomation = (rule: AutomationRule) => {
        setSelectedAutomation(rule);
        setShowDeleteModal(true);
    };

    const handleSaveAutomation = async () => {
        if (!automationForm.name || !automationForm.message) return;
        setIsProcessing(true);
        try {
            const payload = {
                name: automationForm.name,
                trigger: automationForm.trigger,
                message: automationForm.message,
                days_offset: (automationForm as any).daysOffset,
                discount_code: (automationForm as any).discountCode,
                branch_id: automationForm.branchId || null
            };

            if (isEditing && selectedAutomation) {
                await api.updateAutomation(selectedAutomation.id, payload);
                swal.success('Otomatisasi berhasil diperbarui');
            } else {
                await api.createAutomation(payload);
                swal.success('Otomatisasi berhasil ditambahkan');
            }
            await loadAllData();
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menyimpan otomatisasi');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteAutomation = async () => {
        if (!selectedAutomation) return;
        setIsProcessing(true);
        try {
            await api.deleteAutomation(selectedAutomation.id);
            swal.success('Otomatisasi berhasil dihapus');
            await loadAllData();
            closeAllModals();
        } catch (err: any) {
            swal.error(err.message || 'Gagal menghapus otomatisasi');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleAutomation = async (id: number) => {
        try {
            await api.toggleAutomation(id);
            await loadAllData();
        } catch (err: any) {
            swal.error(err.message || 'Gagal mengubah status otomatisasi');
        }
    };

    const handleAdd = () => {
        if (activeTab === 'promo') openAddPromo();
        else if (activeTab === 'news') openAddNews();
        else if (activeTab === 'campaign') openAddCampaign();
        else openAddAutomation();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-naqupos-dark">Marketing & Konten</h1>
                    <p className="text-gray-500 text-sm">Kelola promo, berita, dan kampanye</p>
                </div>

                <div className="bg-white p-1.5 rounded-2xl border border-naqupos-primary/20 shadow-sm self-start md:self-auto">
                    <BranchSelector
                        selectedBranchId={String(branchFilter) === '' || String(branchFilter) === 'all' ? null : Number(branchFilter)}
                        onBranchChange={(id) => {
                            setBranchFilter(id || '');
                            setPage(1);
                        }}
                        showAllOption={true}
                    />
                </div>
            </div>

            {/* Navigation & Actions */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab('promo')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'promo' ? 'bg-naqupos-primary:10 text-naqupos-primary bg-purple-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Tag size={16} />
                        Voucher & Promo
                    </button>
                    <button
                        onClick={() => setActiveTab('news')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'news' ? 'text-naqupos-primary bg-purple-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Newspaper size={16} />
                        Berita & Artikel
                    </button>
                    <button
                        onClick={() => setActiveTab('campaign')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'campaign' ? 'text-naqupos-primary bg-purple-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Send size={16} />
                        Kampanye
                    </button>
                    <button
                        onClick={() => setActiveTab('automation')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'automation' ? 'text-naqupos-primary bg-purple-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Zap size={16} />
                        Automation
                    </button>
                </div>

                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2.5 rounded-xl hover:bg-naqupos-accent transition-colors shadow-lg shadow-naqupos-primary/20"
                >
                    <Plus size={18} />
                    <span>Buat Baru</span>
                </button>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium min-w-[60px]">
                    <Search size={16} />
                    Filter:
                </div>

                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="w-[180px]">
                        <SearchableSelect
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val as any)}
                            options={[
                                { value: 'all', label: 'Semua Status' },
                                ...(activeTab === 'promo' ? [
                                    { value: 'active', label: 'Aktif' },
                                    { value: 'expired', label: 'Expired' }
                                ] : activeTab === 'news' ? [
                                    { value: 'published', label: 'Published' },
                                    { value: 'draft', label: 'Draft' }
                                ] : activeTab === 'campaign' ? [
                                    { value: 'active', label: 'Active' },
                                    { value: 'paused', label: 'Paused' },
                                    { value: 'completed', label: 'Completed' }
                                ] : activeTab === 'automation' ? [
                                    { value: 'active', label: 'Aktif' },
                                    { value: 'inactive', label: 'Nonaktif' }
                                ] : [])
                            ]}
                            placeholder="Semua Status"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 h-[42px]">
                        <Calendar size={14} className="text-gray-400" />
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                            className="text-xs bg-transparent outline-none w-24 text-gray-600"
                        />
                        <span className="text-gray-300">|</span>
                        <input
                            type="date"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                            className="text-xs bg-transparent outline-none w-24 text-gray-600"
                        />
                    </div>

                    {activeTab === 'news' && (
                        <div className="w-[200px]">
                            <SearchableSelect
                                value={extraFilters.category || 'all'}
                                onChange={(val) => {
                                    setExtraFilters((prev: any) => ({ ...prev, category: val === 'all' ? undefined : val }))
                                }}
                                options={[
                                    { value: 'all', label: 'Semua Kategori' },
                                    ...newsCategoryOptions
                                ]}
                                placeholder="Semua Kategori"
                            />
                        </div>
                    )}

                    {activeTab === 'campaign' && (
                        <div className="w-[200px]">
                            <SearchableSelect
                                value={extraFilters.type || 'all'}
                                onChange={(val) => setExtraFilters((prev: any) => ({ ...prev, type: val === 'all' ? undefined : val }))}
                                options={[
                                    { value: 'all', label: 'Semua Tipe' },
                                    ...campaignTypeOptions
                                ]}
                                placeholder="Semua Tipe"
                            />
                        </div>
                    )}

                    {activeTab === 'automation' && (
                        <>
                            <div className="w-[200px]">
                                <SearchableSelect
                                    value={extraFilters.trigger || 'all'}
                                    onChange={(val) => setExtraFilters((prev: any) => ({ ...prev, trigger: val === 'all' ? undefined : val }))}
                                    options={[
                                        { value: 'all', label: 'Semua Trigger' },
                                        ...triggerTypes.map(t => ({ value: t.id, label: t.label }))
                                    ]}
                                    placeholder="Semua Trigger"
                                />
                            </div>
                            <div className="w-[200px]">
                                <SearchableSelect
                                    value={extraFilters.channel || 'all'}
                                    onChange={(val) => setExtraFilters((prev: any) => ({ ...prev, channel: val === 'all' ? undefined : val }))}
                                    options={[
                                        { value: 'all', label: 'Semua Channel' },
                                        ...channels.map(c => ({ value: c.id, label: c.label }))
                                    ]}
                                    placeholder="Semua Channel"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Branch Info Cards */}
            {branchFilter !== 'all' && branches.find(b => b.id === Number(branchFilter)) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-naqupos-primary/10 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-naqupos-cream flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <Building size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Cabang Terpilih</p>
                            <p className="font-bold text-naqupos-dark text-sm">{branches.find(b => b.id === Number(branchFilter))?.name}</p>
                        </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-naqupos-primary/10 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-naqupos-cream flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <Phone size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Kontak</p>
                            <p className="font-bold text-naqupos-dark text-sm">{branches.find(b => b.id === Number(branchFilter))?.phone || '-'}</p>
                        </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-naqupos-primary/10 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-naqupos-primary transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-naqupos-cream flex items-center justify-center text-naqupos-primary group-hover:bg-naqupos-primary group-hover:text-white transition-colors">
                            <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Alamat</p>
                            <p className="font-bold text-naqupos-dark text-[11px] truncate" title={branches.find(b => b.id === Number(branchFilter))?.address}>
                                {branches.find(b => b.id === Number(branchFilter))?.address || '-'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100">
                    <div className="w-12 h-12 border-4 border-naqupos-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500 font-medium">Memuat data...</p>
                </div>
            ) : error ? (
                <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
                    <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-red-800 mb-2">Terjadi Kesalahan</h3>
                    <p className="text-red-600 mb-6">{error}</p>
                    <button onClick={() => loadAllData()} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Coba Lagi
                    </button>
                </div>
            ) : (
                <>
                    {/* Promo Tab */}
                    {activeTab === 'promo' && (
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-left text-xs text-gray-500 uppercase">
                                        <th className="px-4 py-3 font-medium">Promo</th>
                                        <th className="px-4 py-3 font-medium">Kode</th>
                                        <th className="px-4 py-3 font-medium">Diskon</th>
                                        <th className="px-4 py-3 font-medium">Kuota</th>
                                        <th className="px-4 py-3 font-medium">Periode</th>
                                        {/* Show branch column if user is not restricted to specific branch (logic: admin/owner or no branch_id) */}
                                        {(['admin', 'owner'].includes(JSON.parse(localStorage.getItem('naqupos_admin_auth') || '{}').user?.role) || !JSON.parse(localStorage.getItem('naqupos_admin_auth') || '{}').user?.branch_id) && (
                                            <th className="px-4 py-3 font-medium">Cabang</th>
                                        )}
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {promos.map(promo => (
                                        <tr key={promo.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium text-naqupos-dark">{promo.title}</td>
                                            <td className="px-4 py-3">
                                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{promo.code}</code>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1">
                                                    {promo.type === 'percent' ? (
                                                        <><Percent size={14} /> {promo.discount}%</>
                                                    ) : (
                                                        <>Rp {promo.discount.toLocaleString('id-ID')}</>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-gray-600">{promo.used}/{promo.quota}</span>
                                                <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                                                    <div
                                                        className="h-full bg-naqupos-primary rounded-full"
                                                        style={{ width: `${(promo.used / promo.quota) * 100}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <div className="flex flex-col text-xs">
                                                    <span>Mulai: {formatDate(promo.startDate)}</span>
                                                    <span>Selesai: {formatDate(promo.endDate)}</span>
                                                </div>
                                            </td>
                                            {(['admin', 'owner'].includes(JSON.parse(localStorage.getItem('naqupos_admin_auth') || '{}').user?.role) || !JSON.parse(localStorage.getItem('naqupos_admin_auth') || '{}').user?.branch_id) && (
                                                <td className="px-4 py-3 text-gray-600">
                                                    {promo.branch_id ? (branches.find(b => b.id === promo.branch_id)?.name || '-') : 'Semua Cabang'}
                                                </td>
                                            )}
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${promo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {promo.status === 'active' ? 'Aktif' : 'Expired'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEditPromo(promo)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-gray-500" /></button>
                                                    <button onClick={() => openDeletePromo(promo)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* News Tab */}
                    {activeTab === 'news' && (
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-left text-xs text-gray-500 uppercase">
                                        <th className="px-4 py-3 font-medium">Judul</th>
                                        <th className="px-4 py-3 font-medium">Kategori</th>
                                        <th className="px-4 py-3 font-medium">Tanggal</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {news.map(item => (
                                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium text-naqupos-dark">{item.title}</td>
                                            <td className="px-4 py-3">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{item.category}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{item.date}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {item.status === 'published' ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEditNews(item)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-gray-500" /></button>
                                                    <button onClick={() => openDeleteNews(item)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Campaign Tab */}
                    {activeTab === 'campaign' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {campaigns.map(campaign => (
                                <div key={campaign.id} className="bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-medium text-naqupos-dark">{campaign.name}</p>
                                            <span className="text-xs text-gray-500 uppercase">{campaign.type}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {campaign.status === 'active' ? 'Aktif' : 'Paused'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                        <div>
                                            <p className="text-lg font-bold text-naqupos-dark">{campaign.sent}</p>
                                            <p className="text-xs text-gray-500">Terkirim</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-blue-600">{campaign.opened}</p>
                                            <p className="text-xs text-gray-500">Dibuka</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-green-600">{campaign.converted}</p>
                                            <p className="text-xs text-gray-500">Konversi</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <button onClick={() => openEditCampaign(campaign)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                                        <button onClick={() => openDeleteCampaign(campaign)} className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Automation Tab */}
                    {activeTab === 'automation' && (
                        <div className="space-y-6">
                            {/* Automation Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-purple-100 rounded-lg"><Zap size={20} className="text-purple-600" /></div>
                                        <div>
                                            <p className="text-2xl font-bold text-naqupos-dark">{automations.length}</p>
                                            <p className="text-sm text-gray-500">Total Rules</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-green-100 rounded-lg"><ToggleRight size={20} className="text-green-600" /></div>
                                        <div>
                                            <p className="text-2xl font-bold text-green-600">{automations.filter(a => a.isActive).length}</p>
                                            <p className="text-sm text-gray-500">Aktif</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-100 rounded-lg"><Send size={20} className="text-blue-600" /></div>
                                        <div>
                                            <p className="text-2xl font-bold text-blue-600">{automations.reduce((sum, a) => sum + a.totalSent, 0)}</p>
                                            <p className="text-sm text-gray-500">Total Terkirim</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-amber-100 rounded-lg"><Clock size={20} className="text-amber-600" /></div>
                                        <div>
                                            <p className="text-2xl font-bold text-naqupos-dark">24/7</p>
                                            <p className="text-sm text-gray-500">Auto Running</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Automation Rules List */}
                            <div className="space-y-4">
                                {automations.map(rule => {
                                    const triggerInfo = triggerTypes.find(t => t.id === rule.trigger);
                                    const TriggerIcon = triggerInfo?.icon || Zap;
                                    return (
                                        <div key={rule.id} className={`bg-white rounded-xl border p-5 transition-all ${rule.isActive ? 'border-gray-100' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-3 rounded-lg ${rule.isActive ? 'bg-naqupos-cream' : 'bg-gray-100'}`}>
                                                        <TriggerIcon size={24} className={rule.isActive ? 'text-naqupos-primary' : 'text-gray-400'} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="font-medium text-naqupos-dark">{rule.name}</h4>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                                                {rule.isActive ? 'Aktif' : 'Nonaktif'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-1">{triggerInfo?.desc}</p>
                                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {rule.daysOffset === 0 ? 'Di hari yang sama' : `${rule.daysOffset} hari setelah`}
                                                            </span>
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{rule.channel.toUpperCase()}</span>
                                                            {rule.discountCode && <code className="bg-naqupos-cream px-2 py-0.5 rounded">{rule.discountCode}</code>}
                                                        </div>
                                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-w-lg">
                                                            "{rule.message.substring(0, 100)}{rule.message.length > 100 ? '...' : ''}"
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-3">
                                                    <button
                                                        onClick={() => toggleAutomation(rule.id)}
                                                        className={`p-2 rounded-lg transition-colors ${rule.isActive ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-200 hover:bg-gray-300'}`}
                                                    >
                                                        {rule.isActive ? <ToggleRight size={24} className="text-green-600" /> : <ToggleLeft size={24} className="text-gray-400" />}
                                                    </button>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-naqupos-dark">{rule.totalSent}</p>
                                                        <p className="text-xs text-gray-500">Terkirim</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => openEditAutomation(rule)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-gray-500" /></button>
                                                        <button onClick={() => openDeleteAutomation(rule)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Add/Edit Modal - Promo */}
            {showAddEditModal && activeTab === 'promo' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Promo' : 'Tambah Promo Baru'}
                            </h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Promo *</label>
                                <input type="text" value={promoForm.title} onChange={(e) => setPromoForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Contoh: Weekend Special Discount" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Opsional)</label>
                                <SearchableSelect
                                    value={promoForm.branchId}
                                    onChange={(val) => setPromoForm(p => ({ ...p, branchId: String(val) }))}
                                    options={[
                                        { value: '', label: 'Semua Cabang' },
                                        ...branches.map(branch => ({ value: branch.id.toString(), label: branch.name }))
                                    ]}
                                    placeholder="Semua Cabang"
                                />
                                <p className="text-xs text-gray-400 mt-1">Kosongkan untuk berlaku di semua cabang</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Diskon</label>
                                    <div className="flex p-1 bg-gray-100 rounded-lg">
                                        <button
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${promoForm.type === 'percent' ? 'bg-white shadow-sm text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => setPromoForm(p => ({ ...p, type: 'percent', discount: p.discount > 100 ? 100 : p.discount }))}
                                        >
                                            Persentase (%)
                                        </button>
                                        <button
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${promoForm.type === 'nominal' ? 'bg-white shadow-sm text-naqupos-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => setPromoForm(p => ({ ...p, type: 'nominal' }))}
                                        >
                                            Nominal (Rp)
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Diskon *</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                            {promoForm.type === 'nominal' ? 'Rp' : <Percent size={14} />}
                                        </div>
                                        <input
                                            type="text"
                                            value={promoForm.discount || ''}
                                            onChange={(e) => {
                                                let val = parseInt(e.target.value.replace(/\D/g, ''));
                                                if (isNaN(val)) val = 0;
                                                if (promoForm.type === 'percent' && val > 100) val = 100;
                                                setPromoForm(p => ({ ...p, discount: val }));
                                            }}
                                            placeholder="0"
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Kode Voucher *</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={promoForm.code} onChange={(e) => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                            placeholder="PROM2024" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none uppercase" />
                                        <button onClick={() => setPromoForm(p => ({ ...p, code: 'PRM' + Math.floor(1000 + Math.random() * 9000) }))} className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200" title="Generate Code">
                                            <Zap size={18} className="text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Kuota</label>
                                    <input type="number" value={promoForm.quota} onChange={(e) => setPromoForm(p => ({ ...p, quota: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                                    <input type="datetime-local" value={promoForm.startDate} onChange={(e) => setPromoForm(p => ({ ...p, startDate: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
                                    <input type="datetime-local" value={promoForm.endDate} onChange={(e) => setPromoForm(p => ({ ...p, endDate: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                <textarea value={promoForm.description} onChange={(e) => setPromoForm(p => ({ ...p, description: e.target.value }))}
                                    rows={2} placeholder="Deskripsi promo..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSavePromo} disabled={isProcessing || !promoForm.title || !promoForm.code}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !promoForm.title || !promoForm.code ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Promo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal - News */}
            {showAddEditModal && activeTab === 'news' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Artikel' : 'Tambah Artikel Baru'}
                            </h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Judul *</label>
                                <input type="text" value={newsForm.title} onChange={(e) => setNewsForm(n => ({ ...n, title: e.target.value }))}
                                    placeholder="Judul artikel..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Opsional)</label>
                                <SearchableSelect
                                    value={newsForm.branchId}
                                    onChange={(val) => setNewsForm(n => ({ ...n, branchId: String(val) }))}
                                    options={[
                                        { value: '', label: 'Semua Cabang' },
                                        ...branches.map(branch => ({ value: branch.id.toString(), label: branch.name }))
                                    ]}
                                    placeholder="Semua Cabang"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                                    <SearchableSelect
                                        value={newsForm.category}
                                        onChange={(val) => setNewsForm(n => ({ ...n, category: String(val) }))}
                                        options={newsCategoryOptions}
                                        creatable={true}
                                        onCreate={handleCreateNewsCategory}
                                        placeholder="Pilih Kategori"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                    <SearchableSelect
                                        value={newsForm.status}
                                        onChange={(val) => setNewsForm(n => ({ ...n, status: val as any }))}
                                        options={[
                                            { value: 'draft', label: 'Draft' },
                                            { value: 'published', label: 'Published' }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Konten</label>
                                <textarea value={newsForm.content} onChange={(e) => setNewsForm(n => ({ ...n, content: e.target.value }))}
                                    rows={5} placeholder="Isi artikel..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveNews} disabled={isProcessing || !newsForm.title}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !newsForm.title ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Artikel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal - Campaign */}
            {showAddEditModal && activeTab === 'campaign' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Kampanye' : 'Buat Kampanye Baru'}
                            </h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Kampanye *</label>
                                <input type="text" value={campaignForm.name} onChange={(e) => setCampaignForm(c => ({ ...c, name: e.target.value }))}
                                    placeholder="Contoh: Promo Akhir Tahun" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Opsional)</label>
                                <SearchableSelect
                                    value={campaignForm.branchId}
                                    onChange={(val) => setCampaignForm(c => ({ ...c, branchId: String(val) }))}
                                    options={[
                                        { value: '', label: 'Semua Cabang' },
                                        ...branches.map(branch => ({ value: branch.id.toString(), label: branch.name }))
                                    ]}
                                    placeholder="Semua Cabang"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Kampanye</label>
                                <SearchableSelect
                                    value={campaignForm.type}
                                    onChange={(val) => setCampaignForm(c => ({ ...c, type: String(val) }))}
                                    options={campaignTypeOptions}
                                    creatable={true}
                                    onCreate={handleCreateCampaignType}
                                    placeholder="Pilih Tipe Kampanye"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                                <SearchableSelect
                                    value={campaignForm.targetAudience}
                                    onChange={(val) => setCampaignForm(c => ({ ...c, targetAudience: String(val) }))}
                                    options={targetAudienceOptions}
                                    placeholder="Pilih Target Audience"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pesan</label>
                                <textarea value={campaignForm.message} onChange={(e) => setCampaignForm(c => ({ ...c, message: e.target.value }))}
                                    rows={3} placeholder="Isi pesan kampanye..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveCampaign} disabled={isProcessing || !campaignForm.name}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !campaignForm.name ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Buat Kampanye')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal - Automation */}
            {showAddEditModal && activeTab === 'automation' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Automation' : 'Tambah Automation Baru'}
                            </h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Rule *</label>
                                <input type="text" value={automationForm.name} onChange={(e) => setAutomationForm(a => ({ ...a, name: e.target.value }))}
                                    placeholder="Contoh: Birthday Greeting" className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang (Opsional)</label>
                                <SearchableSelect
                                    value={automationForm.branchId}
                                    onChange={(val) => setAutomationForm(a => ({ ...a, branchId: String(val) }))}
                                    options={[
                                        { value: '', label: 'Semua Cabang' },
                                        ...branches.map(branch => ({ value: branch.id.toString(), label: branch.name }))
                                    ]}
                                    placeholder="Semua Cabang"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Trigger</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {triggerTypes.map(t => {
                                        const Icon = t.icon;
                                        return (
                                            <button key={t.id} type="button" onClick={() => setAutomationForm(a => ({ ...a, trigger: t.id as AutomationRule['trigger'] }))}
                                                className={`p-3 rounded-lg border text-left transition-colors ${automationForm.trigger === t.id ? 'border-naqupos-primary bg-naqupos-cream' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <div className="flex items-center gap-2">
                                                    <Icon size={16} className={automationForm.trigger === t.id ? 'text-naqupos-primary' : 'text-gray-400'} />
                                                    <span className="text-sm font-medium">{t.label}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Delay (Hari)</label>
                                    <input type="number" value={automationForm.daysOffset} onChange={(e) => setAutomationForm(a => ({ ...a, daysOffset: parseInt(e.target.value) || 0 }))}
                                        min={0} className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none" />
                                    <p className="text-xs text-gray-400 mt-1">0 = Kirim di hari yang sama</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                                    <SearchableSelect
                                        value={automationForm.channel}
                                        onChange={(val) => setAutomationForm(a => ({ ...a, channel: val as any }))}
                                        options={channels.map(c => ({ value: c.id, label: c.label }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pesan *</label>
                                <textarea value={automationForm.message} onChange={(e) => setAutomationForm(a => ({ ...a, message: e.target.value }))}
                                    rows={4} placeholder="Gunakan {name} untuk nama pelanggan..." className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Kode Diskon (Opsional)</label>
                                <SearchableSelect
                                    value={automationForm.discountCode}
                                    onChange={(val) => setAutomationForm(a => ({ ...a, discountCode: String(val) }))}
                                    options={promos.map(p => ({ value: p.code, label: `${p.code} - ${p.title}` }))}
                                    placeholder="Pilih Kode Diskon"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSaveAutomation} disabled={isProcessing || !automationForm.name || !automationForm.message}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing || !automationForm.name || !automationForm.message ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Automation')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Hapus {activeTab === 'promo' ? 'Promo' : activeTab === 'news' ? 'Artikel' : activeTab === 'campaign' ? 'Kampanye' : 'Automation'}</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-red-800">Peringatan!</p>
                                <p className="text-sm text-red-600">Data yang dihapus tidak dapat dikembalikan.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                            <p className="font-bold text-naqupos-dark">
                                {selectedPromo?.title || selectedNews?.title || selectedCampaign?.name || selectedAutomation?.name}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closeAllModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={activeTab === 'promo' ? handleDeletePromo : activeTab === 'news' ? handleDeleteNews : activeTab === 'campaign' ? handleDeleteCampaign : handleDeleteAutomation}
                                disabled={isProcessing}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalItems > 0 && (
                <div className="mt-6">
                    <Pagination
                        currentPage={page}
                        totalItems={totalItems}
                        itemsPerPage={perPage}
                        onPageChange={setPage}
                        onItemsPerPageChange={(val) => {
                            setPerPage(val);
                            setPage(1);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
