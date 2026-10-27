import { Zap, ToggleRight, ToggleLeft, Send, Clock, Edit, Trash2, Plus, Search, Calendar, AlertTriangle, X, Gift, RotateCcw, MessageSquare, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import BranchSelector from '../../components/common/BranchSelector';
import Pagination from '../../components/common/Pagination';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import swal from '../../utils/swal';

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

export default function AutomationPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || 'all');
    const [branchFilter, setBranchFilter] = useState<string | number>('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [automations, setAutomations] = useState<AutomationRule[]>([]);
    const [promos, setPromos] = useState<any[]>([]); // For discount code selection
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [triggerFilter, setTriggerFilter] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');

    const channels = [
        { id: 'whatsapp', label: 'WhatsApp' },
        { id: 'email', label: 'Email' },
        { id: 'sms', label: 'SMS' }
    ];

    // Modal states
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedAutomation, setSelectedAutomation] = useState<AutomationRule | null>(null);

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

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
                const saved = localStorage.getItem('naqupos_selected_branch') || 'all';
                setGlobalBranchId(saved);
                setBranchFilter(saved === 'all' ? 'all' : Number(saved));
            } catch (error) {
                console.error("Failed to load branches", error);
            }
        };
        loadBranches();
    }, []);

    useEffect(() => {
        const syncBranch = () => {
            const saved = localStorage.getItem('naqupos_selected_branch') || 'all';
            setGlobalBranchId(saved);
            setBranchFilter(saved === 'all' ? 'all' : Number(saved));
        };
        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, []);

    // Load available promos for dropdown
    useEffect(() => {
        const fetchPromos = async () => {
            try {
                const res = await api.getPromos({ limit: 100, status: 'active' }).catch(() => []);
                const data = Array.isArray(res) ? res : (res.data || []);
                setPromos(data);
            } catch (e) { console.error("Failed to load promos", e); }
        };
        fetchPromos();
    }, []);

    useEffect(() => {
        loadData();
    }, [branchFilter, page, perPage, statusFilter, triggerFilter, channelFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const params: any = {
                page,
                limit: perPage,
                branch_id: branchFilter !== 'all' ? branchFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined
            };

            if (triggerFilter !== 'all') params.trigger = triggerFilter;
            if (channelFilter !== 'all') params.channel = channelFilter;

            const res = await api.getAutomations(params).catch(() => ({ data: [], total: 0 }));
            const data = Array.isArray(res) ? res : (res.data || []);
            setTotalItems(res.total || data.length);

            setAutomations(data.map((a: AutomationResponse) => ({
                ...a,
                isActive: a.is_active,
                daysOffset: a.days_offset,
                discountCode: a.discount_code,
                lastTriggered: a.last_triggered,
                totalSent: a.total_sent
            })));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const closeAllModals = () => {
        setShowAddEditModal(false);
        setShowDeleteModal(false);
        setSelectedAutomation(null);
    };

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
                channel: automationForm.channel,
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
            await loadData();
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
            await loadData();
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
            await loadData();
        } catch (err: any) {
            swal.error(err.message || 'Gagal mengubah status otomatisasi');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-naqupos-dark">Automation</h1>
                    <p className="text-gray-500 text-sm">Otomatisasi pesan pemasaran berdasarkan trigger tertentu.</p>
                </div>

                {globalBranchId === 'all' && (
                    <div className="bg-white p-1.5 rounded-2xl border border-naqupos-primary/20 shadow-sm self-start md:self-auto">
                        <BranchSelector
                            selectedBranchId={branchFilter === 'all' ? null : Number(branchFilter)}
                            onBranchChange={(id) => {
                                setBranchFilter(id || 'all');
                                setPage(1);
                            }}
                            showAllOption={true}
                        />
                    </div>
                )}
            </div>

            {/* Actions & Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium min-w-[60px]">
                        <Search size={16} />
                        Filter:
                    </div>
                    <div className="w-[180px]">
                        <SearchableSelect
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val as any)}
                            options={[
                                { value: 'all', label: 'Semua Status' },
                                { value: 'active', label: 'Aktif' },
                                { value: 'inactive', label: 'Nonaktif' }
                            ]}
                            placeholder="Semua Status"
                        />
                    </div>
                    <div className="w-[200px]">
                        <SearchableSelect
                            value={triggerFilter}
                            onChange={(val) => setTriggerFilter(String(val))}
                            options={[
                                { value: 'all', label: 'Semua Trigger' },
                                ...triggerTypes.map(t => ({ value: t.id, label: t.label }))
                            ]}
                            placeholder="Semua Trigger"
                        />
                    </div>
                    <div className="w-[200px]">
                        <SearchableSelect
                            value={channelFilter}
                            onChange={(val) => setChannelFilter(String(val))}
                            options={[
                                { value: 'all', label: 'Semua Channel' },
                                ...channels.map(c => ({ value: c.id, label: c.label }))
                            ]}
                            placeholder="Semua Channel"
                        />
                    </div>
                </div>

                <button
                    onClick={openAddAutomation}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2.5 rounded-xl hover:bg-naqupos-accent transition-colors shadow-lg shadow-naqupos-primary/20"
                >
                    <Plus size={18} />
                    <span>Buat Automation</span>
                </button>
            </div>

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
                    <button onClick={() => loadData()} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Coba Lagi
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Automation Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-100 rounded-lg"><Zap size={20} className="text-purple-600" /></div>
                                <div>
                                    <p className="text-2xl font-bold text-naqupos-dark">{automations.length}</p>
                                    <p className="text-sm text-gray-500">Total Rules</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-lg"><ToggleRight size={20} className="text-green-600" /></div>
                                <div>
                                    <p className="text-2xl font-bold text-green-600">{automations.filter(a => a.isActive).length}</p>
                                    <p className="text-sm text-gray-500">Aktif</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-lg"><Send size={20} className="text-blue-600" /></div>
                                <div>
                                    <p className="text-2xl font-bold text-blue-600">{automations.reduce((sum, a) => sum + a.totalSent, 0)}</p>
                                    <p className="text-sm text-gray-500">Total Terkirim</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
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
                        {automations.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
                                Belum ada automation rule.
                            </div>
                        ) : automations.map(rule => {
                            const triggerInfo = triggerTypes.find(t => t.id === rule.trigger);
                            const TriggerIcon = triggerInfo?.icon || Zap;
                            return (
                                <div key={rule.id} className={`bg-white rounded-xl border p-5 transition-all ${rule.isActive ? 'border-gray-100 shadow-sm' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`p-3 rounded-lg ${rule.isActive ? 'bg-naqupos-cream' : 'bg-gray-100'}`}>
                                                <TriggerIcon size={24} className={rule.isActive ? 'text-naqupos-primary' : 'text-gray-400'} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h4 className="font-medium text-naqupos-dark text-lg">{rule.name}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        {rule.isActive ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">{triggerInfo?.desc}</p>
                                                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                        <Clock size={12} />
                                                        {rule.daysOffset === 0 ? 'Di hari yang sama' : `${rule.daysOffset} hari setelah`}
                                                    </span>
                                                    <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100 uppercase font-medium">{rule.channel}</span>
                                                    {rule.discountCode && <code className="bg-naqupos-cream px-2 py-1 rounded text-naqupos-dark border border-naqupos-primary/10">{rule.discountCode}</code>}
                                                </div>
                                                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
                                                    "{rule.message.substring(0, 150)}{rule.message.length > 150 ? '...' : ''}"
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto justify-between md:justify-start border-t md:border-t-0 pt-3 md:pt-0 mt-3 md:mt-0">
                                            <div className="flex items-center gap-3 md:flex-col md:items-end">
                                                <div className="text-left md:text-right">
                                                    <p className="text-lg font-bold text-naqupos-dark">{rule.totalSent}</p>
                                                    <p className="text-xs text-gray-500">Terkirim</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleAutomation(rule.id)}
                                                    className={`p-2 rounded-lg transition-colors ${rule.isActive ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-200 hover:bg-gray-300'}`}
                                                    title={rule.isActive ? "Matikan" : "Hidupkan"}
                                                >
                                                    {rule.isActive ? <ToggleRight size={24} className="text-green-600" /> : <ToggleLeft size={24} className="text-gray-400" />}
                                                </button>
                                                <div className="w-px h-8 bg-gray-200 mx-1"></div>
                                                <button onClick={() => openEditAutomation(rule)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Edit size={16} className="text-gray-500" /></button>
                                                <button onClick={() => openDeleteAutomation(rule)} className="p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                            <h3 className="text-xl font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Automation' : 'Tambah Automation Baru'}
                            </h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
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
                                                className={`p-3 rounded-lg border text-left transition-colors flex items-center gap-2 ${automationForm.trigger === t.id ? 'border-naqupos-primary bg-naqupos-cream ring-1 ring-naqupos-primary' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <Icon size={16} className={automationForm.trigger === t.id ? 'text-naqupos-primary' : 'text-gray-400'} />
                                                <span className={`text-sm font-medium ${automationForm.trigger === t.id ? 'text-naqupos-primary' : 'text-gray-600'}`}>{t.label}</span>
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
                                        onChange={(val: string | number) => setAutomationForm(a => ({ ...a, channel: val as AutomationRule['channel'] }))}
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
                        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                            <button onClick={closeAllModals} className="px-6 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Batal</button>
                            <button onClick={handleSaveAutomation} disabled={isProcessing || !automationForm.name || !automationForm.message}
                                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isProcessing || !automationForm.name || !automationForm.message ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}>
                                {isProcessing ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Automation')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                            <h3 className="text-xl font-bold text-naqupos-dark">Hapus Automation</h3>
                            <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                                <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-red-800">Peringatan!</p>
                                    <p className="text-sm text-red-600">Data yang dihapus tidak dapat dikembalikan.</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                <p className="font-bold text-naqupos-dark">
                                    {selectedAutomation?.name}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                            <button onClick={closeAllModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleDeleteAutomation}
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
