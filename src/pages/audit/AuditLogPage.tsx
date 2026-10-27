/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import {
    Search, Filter, Calendar, Clock, User, FileText, Edit, Trash2,
    Plus, LogIn, LogOut, Settings, Shield, Download, RefreshCw, Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import Pagination from '../../components/common/Pagination';

interface AuditLog {
    id: number;
    userId: number;
    userName: string;
    userRole: string;
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export' | 'settings';
    module: string;
    description: string;
    ipAddress: string;
    userAgent: string;
    timestamp: string;
    details?: Record<string, any>;
}



const actionConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    create: { label: 'Create', color: 'bg-green-100 text-green-700', icon: <Plus size={12} /> },
    update: { label: 'Update', color: 'bg-blue-100 text-blue-700', icon: <Edit size={12} /> },
    delete: { label: 'Delete', color: 'bg-red-100 text-red-700', icon: <Trash2 size={12} /> },
    login: { label: 'Login', color: 'bg-purple-100 text-purple-700', icon: <LogIn size={12} /> },
    logout: { label: 'Logout', color: 'bg-gray-100 text-gray-700', icon: <LogOut size={12} /> },
    view: { label: 'View', color: 'bg-amber-100 text-amber-700', icon: <Eye size={12} /> },
    export: { label: 'Export', color: 'bg-teal-100 text-teal-700', icon: <Download size={12} /> },
    settings: { label: 'Settings', color: 'bg-orange-100 text-orange-700', icon: <Settings size={12} /> },
    clock_in: { label: 'Clock In', color: 'bg-teal-100 text-teal-700', icon: <LogIn size={12} /> },
    clock_out: { label: 'Clock Out', color: 'bg-rose-100 text-rose-700', icon: <LogOut size={12} /> },
};

// Initial fallback modules
const initialModules = ['All', 'Auth', 'POS', 'Reservasi', 'Layanan', 'Staff', 'Inventori', 'Pelanggan', 'Marketing', 'Laporan', 'Master Data', 'Pembayaran', 'Berlangganan', 'Manajemen User', 'Pengaturan'];

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterModule, setFilterModule] = useState('All');
    const [filterAction, setFilterAction] = useState('all');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [stats, setStats] = useState({ total: 0, today: 0, logins: 0, unique_users: 0 });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [dynamicModules, setDynamicModules] = useState<string[]>(initialModules);

    useEffect(() => {
        loadModules();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadLogs();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, filterModule, filterAction, filterDateFrom, filterDateTo, page, perPage]);

    const loadModules = async () => {
        try {
            const res = await api.get('/admin/audit-logs/modules');
            if (res && Array.isArray(res)) {
                setDynamicModules(['All', ...res]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadLogs = async () => {
        try {
            setLoading(true);
            const params: any = {
                page,
                per_page: perPage,
                module: filterModule !== 'All' ? filterModule : undefined,
                action: filterAction !== 'all' ? filterAction : undefined,
                from: filterDateFrom || undefined,
                to: filterDateTo ? filterDateTo + ' 23:59:59' : undefined,
                search: searchQuery || undefined
            };

            const response = await api.getAuditLogs(params);
            const logsData = response.logs?.data || [];

            setLogs(logsData.map((log: any) => ({
                ...log,
                userId: log.user_id,
                userName: log.user_name,
                userRole: log.user_role,
                ipAddress: log.ip_address,
                userAgent: log.user_agent,
                timestamp: log.created_at
            })));

            setTotalItems(response.logs?.total || 0);
            if (response.stats) {
                setStats(response.stats);
            }
        } catch (err) {
            console.error('Failed to load audit logs:', err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };


    const openDetailModal = (log: AuditLog) => {
        setSelectedLog(log);
        setShowDetailModal(true);
    };

    const formatDateTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterModule('All');
        setFilterAction('all');
        setFilterDateFrom('');
        setFilterDateTo('');
        setPage(1);
    };

    const exportLogs = async () => {
        try {
            const params = {
                from: filterDateFrom || undefined,
                to: filterDateTo || undefined
            };
            const response = await api.exportAuditLogs(params);
            const data = response.data || [];

            const csvContent = [
                ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Module', 'Description', 'IP Address'].join(','),
                ...data.map((log: any) => [
                    log.id, log.created_at, log.user_name, log.user_role, log.action, log.module, `"${log.description}"`, log.ip_address
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        } catch (e) {
            console.error('Failed to export:', e);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">Audit Log</h1>
                    <p className="text-gray-500 text-sm">Pantau semua aktivitas sistem</p>
                </div>
                <button
                    onClick={exportLogs}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                >
                    <Download size={18} />
                    <span>Export CSV</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg"><FileText size={20} className="text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-naqupos-dark">{stats.total}</p>
                            <p className="text-sm text-gray-500">Total Log</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg"><Clock size={20} className="text-green-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.today}</p>
                            <p className="text-sm text-gray-500">Hari Ini</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg"><LogIn size={20} className="text-purple-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{stats.logins}</p>
                            <p className="text-sm text-gray-500">Total Login</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg"><User size={20} className="text-amber-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{stats.unique_users}</p>
                            <p className="text-sm text-gray-500">User Aktif</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 mb-1">Cari</label>
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Nama user atau deskripsi..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Modul</label>
                        <SearchableSelect
                            value={filterModule}
                            onChange={(val: string | number) => setFilterModule(val.toString())}
                            options={dynamicModules.map(m => ({ value: m, label: m }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Aksi</label>
                        <SearchableSelect
                            value={filterAction}
                            onChange={(val: string | number) => setFilterAction(val.toString())}
                            options={[
                                { value: 'all', label: 'Semua' },
                                ...Object.entries(actionConfig).map(([key, val]) => ({
                                    value: key,
                                    label: val.label
                                }))
                            ]}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
                        <input type="date" value={filterDateFrom}
                            onChange={(e) => {
                                const newFrom = e.target.value;
                                setFilterDateFrom(newFrom);
                                if (filterDateTo && filterDateTo < newFrom) {
                                    setFilterDateTo(newFrom);
                                }
                            }}
                            className="px-3 py-2 rounded-lg border border-gray-200 outline-none text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
                        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                            min={filterDateFrom}
                            className="px-3 py-2 rounded-lg border border-gray-200 outline-none text-sm" />
                    </div>
                    <button onClick={clearFilters} className="p-2 hover:bg-gray-100 rounded-lg" title="Reset Filter">
                        <RefreshCw size={18} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-left text-xs text-gray-500 uppercase">
                            <th className="px-4 py-3 font-medium">Waktu</th>
                            <th className="px-4 py-3 font-medium">User</th>
                            <th className="px-4 py-3 font-medium">Aksi</th>
                            <th className="px-4 py-3 font-medium">Modul</th>
                            <th className="px-4 py-3 font-medium">Deskripsi</th>
                            <th className="px-4 py-3 font-medium">IP</th>
                            <th className="px-4 py-3 font-medium w-10 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                                <RefreshCw className="animate-spin text-naqupos-primary" size={24} />
                            </div>
                        )}
                        {logs.map(log => {
                            const { date, time } = formatDateTime(log.timestamp);
                            const config = actionConfig[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700', icon: <FileText size={12} /> };
                            return (
                                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar size={14} className="text-gray-400" />
                                            <span>{date}</span>
                                            <Clock size={14} className="text-gray-400 ml-2" />
                                            <span>{time}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-naqupos-dark">{log.userName}</p>
                                            <p className="text-xs text-gray-500">{log.userRole}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                                            {config.icon}
                                            {config.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{log.module}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">{log.description}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{log.ipAddress}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => openDetailModal(log)} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <Eye size={16} className="text-gray-500" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {logs.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                        <Shield size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Tidak ada log ditemukan</p>
                    </div>
                )}

                <Pagination
                    currentPage={page}
                    totalItems={totalItems}
                    itemsPerPage={perPage}
                    onPageChange={setPage}
                    onItemsPerPageChange={(newPerPage) => {
                        setPerPage(newPerPage);
                        setPage(1);
                    }}
                />
            </div>

            <p className="text-sm text-gray-400 text-center uppercase tracking-widest font-bold">
                Menampilkan {logs.length} dari {totalItems} log
            </p>

            {/* Detail Modal */}
            {showDetailModal && selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Detail Log</h3>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Filter size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${actionConfig[selectedLog.action].color}`}>
                                    {actionConfig[selectedLog.action].icon}
                                    {actionConfig[selectedLog.action].label}
                                </span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{selectedLog.module}</span>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ID</span>
                                    <span className="">#{selectedLog.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Waktu</span>
                                    <span>{formatDateTime(selectedLog.timestamp).date} {formatDateTime(selectedLog.timestamp).time}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">User</span>
                                    <span className="font-medium">{selectedLog.userName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Role</span>
                                    <span>{selectedLog.userRole}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">IP Address</span>
                                    <span className="">{selectedLog.ipAddress}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Browser</span>
                                    <span>{selectedLog.userAgent}</span>
                                </div>
                                <hr className="border-dashed" />
                                <div>
                                    <span className="text-gray-500">Deskripsi</span>
                                    <p className="font-medium mt-1">{selectedLog.description}</p>
                                </div>
                                {selectedLog.details && (
                                    <>
                                        <hr className="border-dashed" />
                                        <div>
                                            <span className="text-gray-500">Detail Tambahan</span>
                                            <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                                                {JSON.stringify(selectedLog.details, null, 2)}
                                            </pre>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowDetailModal(false)} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
