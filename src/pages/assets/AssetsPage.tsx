import { Package, Plus, Edit, Trash2, Search, Filter, AlertTriangle, CheckCircle, XCircle, Wrench, X, Calendar, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import Pagination from '../../components/common/Pagination';
import { api, type Branch } from '../../services/api';
import AssetCategoryTab from '../master/tabs/AssetCategoryTab';
import swal from '../../utils/swal';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import ExportDropdown from '../../components/common/ExportDropdown';
import { formatDateYMD } from '../../utils/date';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type AssetTab = 'daftar-aset' | 'kategori-aset';

interface Asset {
    id: number;
    name: string;
    category: string;
    purchaseDate: string;
    purchasePrice: number;
    condition: 'Baik' | 'Perlu Perbaikan' | 'Rusak';
    lastMaintenance?: string;
    notes?: string;
    status: 'Aktif' | 'Nonaktif';
    cabang?: string;
    branch_id?: number;
    is_global?: boolean;
    branch_ids?: number[];
}

const conditionOptions = [
    { id: 'Baik', label: 'Baik', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    { id: 'Perlu Perbaikan', label: 'Perlu Perbaikan', color: 'bg-amber-100 text-amber-700', icon: Wrench },
    { id: 'Rusak', label: 'Rusak', color: 'bg-red-100 text-red-700', icon: XCircle },
];

const statusOptions = [
    { id: 'Aktif', label: 'Aktif', color: 'bg-green-100 text-green-700' },
    { id: 'Nonaktif', label: 'Nonaktif', color: 'bg-gray-100 text-gray-600' },
];

// ─── Export Helpers ───────────────────────────────────────────────────────────

const buildAssetExportRows = (data: Asset[], branchList: Branch[]) =>
    data.map((a) => {
        let cabangLabel = '-';
        if (a.is_global) {
            cabangLabel = 'Global';
        } else if (a.branch_ids && a.branch_ids.length > 0) {
            const names = a.branch_ids
                .map((bid) => branchList.find((b) => b.id === bid)?.name)
                .filter(Boolean);
            cabangLabel = names.join(', ') || a.cabang || '-';
        } else if (a.cabang) {
            cabangLabel = a.cabang;
        }

        return {
            'Nama Aset': a.name,
            'Kategori': a.category,
            'Tanggal Pembelian': a.purchaseDate ? a.purchaseDate.split('T')[0] : '-',
            'Harga Beli (Rp)': a.purchasePrice,
            'Kondisi': a.condition,
            'Status': a.status,
            'Maintenance Terakhir': a.lastMaintenance ? a.lastMaintenance.split('T')[0] : '-',
            'Cabang': cabangLabel,
            'Catatan': a.notes || '-',
        };
    });

const exportAssetCSV = (data: Asset[], branchList: Branch[]) => {
    const rows = buildAssetExportRows(data, branchList);
    if (!rows.length) return alert('Tidak ada data untuk di-export.');

    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map((r) =>
            headers.map((h) => {
                const val = String((r as any)[h] ?? '');
                return val.includes(',') || val.includes('\n') ? `"${val}"` : val;
            }).join(',')
        ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Aset_${formatDateYMD(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

const exportAssetExcel = (data: Asset[], branchList: Branch[]) => {
    const rows = buildAssetExportRows(data, branchList);
    if (!rows.length) return alert('Tidak ada data untuk di-export.');

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key] ?? '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Aset');
    XLSX.writeFile(wb, `Laporan_Aset_${formatDateYMD(new Date())}.xlsx`);
};

const exportAssetPDF = (data: Asset[], branchList: Branch[]) => {
    if (!data.length) return alert('Tidak ada data untuk di-export.');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Manajemen Aset', 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 22);
    doc.setTextColor(0);

    const head: string[][] = [[
        'Nama Aset', 'Kategori', 'Tgl Pembelian', 'Harga Beli (Rp)',
        'Kondisi', 'Status', 'Maintenance Terakhir', 'Cabang', 'Catatan',
    ]];

    const rows = buildAssetExportRows(data, branchList);
    const body = rows.map((r) => [
        r['Nama Aset'],
        r['Kategori'],
        r['Tanggal Pembelian'],
        Number(r['Harga Beli (Rp)']).toLocaleString('id-ID'),
        r['Kondisi'],
        r['Status'],
        r['Maintenance Terakhir'],
        r['Cabang'],
        r['Catatan'],
    ]);

    autoTable(doc, {
        head,
        body,
        startY: 28,
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
            3: { halign: 'right' },
        },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Halaman ${i} dari ${pageCount}`,
            doc.internal.pageSize.getWidth() - 14,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'right' }
        );
    }

    doc.save(`Laporan_Aset_${formatDateYMD(new Date())}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [conditionFilter, setConditionFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [branchList, setBranchList] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number>(0);
    const [assetCategories, setAssetCategories] = useState<{ id: string; label: string; icon: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<AssetTab>('daftar-aset');

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        purchaseDate: '',
        purchasePrice: '',
        condition: 'Baik' as Asset['condition'],
        lastMaintenance: '',
        notes: '',
        status: 'Aktif' as Asset['status'],
        is_global: true,
        branch_ids: [] as number[]
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchAssets = async () => {
        setIsLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: searchQuery,
                category: categoryFilter !== 'all' ? categoryFilter : undefined,
                condition: conditionFilter !== 'all' ? conditionFilter : undefined,
                branch_id: selectedBranchId !== 0 ? selectedBranchId : undefined
            };

            const response = await api.getAssets(params);

            const mappedAssets = response.data.map((item: any) => ({
                id: item.id,
                name: item.name,
                category: item.category,
                purchaseDate: item.purchase_date,
                purchasePrice: parseFloat(item.purchase_price),
                condition: item.condition,
                lastMaintenance: item.last_maintenance,
                notes: item.notes,
                status: item.status,
                branch_id: item.branch_id,
                cabang: item.branch?.name,
                is_global: !!item.is_global,
                branch_ids: item.branches ? item.branches.map((b: any) => b.id) : []
            }));

            setAssets(mappedAssets);
            setTotalItems(response.total);
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [branches, categories] = await Promise.all([
                    api.getBranches(),
                    api.getAssetCategories()
                ]);

                const allBranchesOption = { id: 0, name: 'Semua Cabang' } as Branch;
                setBranchList([allBranchesOption, ...branches]);

                const isSpecific = selectedBranchId !== 0;
                const filtered = categories.filter((c: any) => {
                    if (c.is_global) return true;
                    if (!isSpecific) return true;
                    const itemBranchIds = c.branches ? c.branches.map((b: any) => b.id) : (c.branch_id ? [c.branch_id] : []);
                    return itemBranchIds.includes(selectedBranchId);
                });

                setAssetCategories(filtered.map((c: any) => ({
                    id: c.name,
                    label: c.name,
                    icon: c.name === 'Elektronik' ? '💻' : c.name === 'Furniture' ? '🪑' : '📦'
                })));

            } catch (err) {
                console.error('Error loading initial data:', err);
                const allBranchesOption = { id: 0, name: 'Semua Cabang' } as Branch;
                setBranchList([allBranchesOption]);
            }
        };

        loadInitialData();
    }, [selectedBranchId]);

    useEffect(() => {
        fetchAssets();
    }, [currentPage, itemsPerPage, searchQuery, categoryFilter, conditionFilter, selectedBranchId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, conditionFilter, selectedBranchId]);

    const fetchAssetCategories = async () => {
        try {
            const categories = await api.getAssetCategories();
            const isSpecific = selectedBranchId !== 0;
            const filtered = categories.filter((c: any) => {
                if (c.is_global) return true;
                if (!isSpecific) return true;
                const itemBranchIds = c.branches ? c.branches.map((b: any) => b.id) : (c.branch_id ? [c.branch_id] : []);
                return itemBranchIds.includes(selectedBranchId);
            });
            setAssetCategories(filtered.map((c: any) => ({
                id: c.name,
                label: c.name,
                icon: c.name === 'Elektronik' ? '💻' : c.name === 'Furniture' ? '🪑' : '📦'
            })));
            return filtered;
        } catch (err) {
            console.error('Error fetching asset categories:', err);
            return [];
        }
    };

    const openAddModal = async () => {
        const freshCategories = await fetchAssetCategories();
        setFormData({
            name: '',
            category: freshCategories.length > 0 ? freshCategories[0].name : '',
            purchaseDate: new Date().toISOString().slice(0, 10),
            purchasePrice: '',
            condition: 'Baik',
            lastMaintenance: '',
            notes: '',
            status: 'Aktif',
            is_global: true,
            branch_ids: []
        });
        setErrors({});
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = async (asset: Asset) => {
        await fetchAssetCategories();
        setSelectedAsset(asset);
        const formatDateForInput = (dateStr?: string) => {
            if (!dateStr) return '';
            return dateStr.split('T')[0];
        };

        setFormData({
            name: asset.name,
            category: asset.category,
            purchaseDate: formatDateForInput(asset.purchaseDate),
            purchasePrice: asset.purchasePrice.toString(),
            condition: asset.condition,
            lastMaintenance: formatDateForInput(asset.lastMaintenance),
            notes: asset.notes || '',
            status: asset.status,
            is_global: !!asset.is_global,
            branch_ids: asset.branch_ids || []
        });
        setErrors({});
        setIsEditing(true);
        setShowModal(true);
    };

    const validateField = (name: string, value: any) => {
        let error = '';
        const today = new Date().toISOString().slice(0, 10);

        switch (name) {
            case 'name':
                if (!value) error = 'Nama aset harus diisi';
                else if (value.length < 2) error = 'Minimal 2 karakter';
                else if (value.length > 100) error = 'Maksimal 100 karakter';
                else if (!/^[A-Za-z0-9\s]+$/.test(value)) error = 'Hanya huruf, angka, dan spasi';
                break;
            case 'category':
                if (!value) error = 'Kategori harus diisi';
                break;
            case 'purchasePrice':
                const price = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) : value;
                if (!value && value !== 0) error = 'Harga beli harus diisi';
                else if (isNaN(price) || price < 1) error = 'Minimal Rp 1';
                else if (price > 1000000000) error = 'Maksimal Rp 1.000.000.000';
                break;
            case 'purchaseDate':
                if (value && value > today) error = 'Tidak boleh melebihi hari ini';
                break;
            case 'lastMaintenance':
                if (value) {
                    if (value > today) error = 'Tidak boleh melebihi hari ini';
                    else if (formData.purchaseDate && value < formData.purchaseDate) error = 'Tidak boleh sebelum tanggal pembelian';
                }
                break;
            case 'notes':
                if (value && value.length > 500) error = 'Maksimal 500 karakter';
                break;
            case 'branch_ids':
                if (!formData.is_global && (!value || value.length === 0)) error = 'Silakan pilih setidaknya satu cabang';
                break;
        }

        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const openDeleteModal = (asset: Asset) => {
        setSelectedAsset(asset);
        setShowDeleteModal(true);
    };

    const handleSave = async () => {
        const fields = ['name', 'category', 'purchasePrice', 'purchaseDate', 'lastMaintenance', 'notes', 'branch_ids'];
        let hasError = false;
        fields.forEach(field => {
            const err = validateField(field, (formData as any)[field]);
            if (err) hasError = true;
        });

        if (hasError) return;

        setIsProcessing(true);

        try {
            const payload = {
                name: formData.name,
                category: formData.category,
                purchase_date: formData.purchaseDate,
                purchase_price: formData.purchasePrice,
                condition: formData.condition,
                last_maintenance: formData.lastMaintenance || null,
                notes: formData.notes || null,
                status: formData.status,
                is_global: formData.is_global,
                branch_ids: formData.is_global ? [] : formData.branch_ids
            };

            if (isEditing && selectedAsset) {
                await api.updateAsset(selectedAsset.id, payload);
            } else {
                await api.createAsset(payload);
            }

            fetchAssets();
            setShowModal(false);
            setSelectedAsset(null);
        } catch (error) {
            console.error('Error saving asset:', error);
            swal.error('Gagal menyimpan aset. Pastikan semua data terisi dengan benar (termasuk cabang).');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedAsset) return;
        setIsProcessing(true);
        try {
            await api.deleteAsset(selectedAsset.id);
            fetchAssets();
            setShowDeleteModal(false);
            setSelectedAsset(null);
        } catch (error) {
            console.error('Error deleting asset:', error);
            swal.error('Gagal menghapus aset');
        } finally {
            setIsProcessing(false);
        }
    };

    // Export handlers — pakai data yang sedang tampil (assets = current page + filter)
    // Kalau mau export semua, bisa fetch ulang tanpa pagination; ini pakai assets (current view)
    const actualBranchList = branchList.filter(b => b.id !== 0);
    const handleExportCSV = () => exportAssetCSV(assets, actualBranchList);
    const handleExportExcel = () => exportAssetExcel(assets, actualBranchList);
    const handleExportPDF = () => exportAssetPDF(assets, actualBranchList);

    const totalValue = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const needsRepair = assets.filter(a => a.condition === 'Perlu Perbaikan' || a.condition === 'Rusak').length;
    const activeAssets = assets.filter(a => a.status === 'Aktif').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-naqupos-dark">Manajemen Aset</h1>
                    <p className="text-gray-500 text-sm">Inventaris peralatan dan furniture spa</p>
                </div>
                <div className="flex items-center gap-3">
                    {branchList.length > 0 && (
                        <SearchableSelect
                            value={selectedBranchId}
                            onChange={(val) => setSelectedBranchId(Number(val))}
                            options={branchList.map(branch => ({
                                value: branch.id,
                                label: branch.name
                            }))}
                        />
                    )}

                    {activeTab === 'daftar-aset' && (
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                        >
                            <Plus size={18} />
                            Tambah Aset
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl border border-gray-100">
                <div className="flex border-b border-gray-100">
                    {[
                        { id: 'daftar-aset', label: 'Daftar Aset', icon: Package },
                        { id: 'kategori-aset', label: 'Kategori Aset', icon: Layers }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as AssetTab)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-naqupos-primary text-naqupos-primary bg-naqupos-cream/30'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'daftar-aset' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Package size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-naqupos-dark">{assets.length}</p>
                                    <p className="text-sm text-gray-500">Total Aset</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <CheckCircle size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-naqupos-dark">{activeAssets}</p>
                                    <p className="text-sm text-gray-500">Aset Aktif</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 rounded-lg">
                                    <AlertTriangle size={24} className="text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-naqupos-dark">{needsRepair}</p>
                                    <p className="text-sm text-gray-500">Perlu Perhatian</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Package size={24} className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-naqupos-dark">Rp {(totalValue / 1000000).toFixed(1).replace('.', ',')} jt</p>
                                    <p className="text-sm text-gray-500">Nilai Total</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4 flex-wrap items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari aset..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-naqupos-primary outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-gray-400" />
                            <SearchableSelect
                                value={categoryFilter}
                                onChange={(val) => setCategoryFilter(val.toString())}
                                options={[
                                    { value: 'all', label: 'Semua Kategori' },
                                    ...assetCategories.map(cat => ({ value: cat.id, label: cat.label }))
                                ]}
                                placeholder="Semua Kategori"
                            />
                            <SearchableSelect
                                value={conditionFilter}
                                onChange={(val) => setConditionFilter(val.toString())}
                                options={[
                                    { value: 'all', label: 'Semua Kondisi' },
                                    ...conditionOptions.map(opt => ({ value: opt.id, label: opt.label }))
                                ]}
                                placeholder="Semua Kondisi"
                            />
                        </div>

                        {/* Export Button */}
                        <div className="ml-auto">
                            <ExportDropdown
                                onExportCSV={handleExportCSV}
                                onExportExcel={handleExportExcel}
                                onExportPDF={handleExportPDF}
                            />
                        </div>
                    </div>

                    {/* Assets Table */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-left text-xs text-gray-500 uppercase">
                                    <th className="px-4 py-3 font-medium">Nama Aset</th>
                                    <th className="px-4 py-3 font-medium">Kategori</th>
                                    <th className="px-4 py-3 font-medium">Kondisi</th>
                                    <th className="px-4 py-3 font-medium">Nilai</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    {selectedBranchId === 0 && <th className="px-4 py-3 font-medium">Cabang</th>}
                                    <th className="px-4 py-3 font-medium">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.length === 0 ? (
                                    <tr>
                                        <td colSpan={selectedBranchId === 0 ? 7 : 6} className="px-4 py-12 text-center text-gray-400">
                                            {isLoading ? (
                                                <div className="flex justify-center flex-col items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary mb-2"></div>
                                                    <p>Memuat data...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Package size={40} className="mx-auto mb-2 opacity-50" />
                                                    <p>Tidak ada aset ditemukan</p>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    assets.map(asset => {
                                        const category = assetCategories.find(c => c.id === asset.category);
                                        const condition = conditionOptions.find(c => c.id === asset.condition);
                                        const status = statusOptions.find(s => s.id === asset.status);
                                        const ConditionIcon = condition?.icon || CheckCircle;

                                        return (
                                            <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                                                            {category?.icon}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-naqupos-dark">{asset.name}</p>
                                                            {asset.notes && (
                                                                <p className="text-xs text-amber-600">{asset.notes}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{category?.label || asset.category}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${condition?.color}`}>
                                                        <ConditionIcon size={12} />
                                                        {condition?.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium">Rp {asset.purchasePrice.toLocaleString('id-ID')}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.color}`}>
                                                        {status?.label}
                                                    </span>
                                                </td>
                                                {selectedBranchId === 0 && (
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {asset.is_global ? (
                                                            <span className="px-2 py-0.5 bg-naqupos-cream text-naqupos-primary text-[10px] font-bold rounded uppercase tracking-wider border border-naqupos-primary/20">Global</span>
                                                        ) : asset.branch_ids && asset.branch_ids.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {asset.branch_ids.length === branchList.length - 1 ? (
                                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">Semua Cabang</span>
                                                                ) : (
                                                                    asset.branch_ids.map(bid => {
                                                                        const b = branchList.find(br => br.id === bid);
                                                                        return b ? (
                                                                            <span key={bid} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{b.name}</span>
                                                                        ) : null;
                                                                    })
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => openEditModal(asset)}
                                                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-naqupos-primary"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(asset)}
                                                            className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        {totalItems > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalItems={totalItems}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        )}
                    </div>

                    {/* Add/Edit Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-naqupos-dark">
                                        {isEditing ? 'Edit Aset' : 'Tambah Aset Baru'}
                                    </h3>
                                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="col-span-2">
                                        <label className={`block text-sm font-medium mb-2 ${errors.name ? 'text-red-500' : 'text-gray-700'}`}>Nama Aset *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData(prev => ({ ...prev, name: val }));
                                                validateField('name', val);
                                            }}
                                            placeholder="Contoh: Bed Massage Premium"
                                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${errors.name ? 'border-red-500 ring-1 ring-red-100' : 'border-gray-200 focus:border-naqupos-primary'}`}
                                        />
                                        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                                    </div>

                                    <div className="col-span-2">
                                        <label className={`block text-sm font-medium mb-2 ${errors.branch_ids ? 'text-red-500' : 'text-gray-700'}`}>Cabang (Multiple Selection)</label>
                                        <div className={`space-y-2 max-h-48 overflow-y-auto p-4 border rounded-xl bg-gray-50/50 transition-all ${errors.branch_ids ? 'border-red-200' : 'border-gray-200'}`}>
                                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition-all group">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_global}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            is_global: checked,
                                                            branch_ids: checked ? [] : prev.branch_ids
                                                        }));
                                                        if (checked) setErrors(prev => ({ ...prev, branch_ids: '' }));
                                                        else validateField('branch_ids', formData.branch_ids);
                                                    }}
                                                    className="w-5 h-5 text-naqupos-primary focus:ring-naqupos-primary border-gray-300 rounded-md transition-all cursor-pointer"
                                                />
                                                <div>
                                                    <p className="text-sm font-bold text-naqupos-dark group-hover:text-naqupos-primary transition-colors">Semua Cabang (Global)</p>
                                                    <p className="text-xs text-gray-500">Aset ini akan tersedia di seluruh cabang</p>
                                                </div>
                                            </label>

                                            {!formData.is_global && (
                                                <div className="pt-2 mt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {branchList.filter(b => b.id !== 0).map(branch => (
                                                        <label key={branch.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white transition-all border border-transparent hover:border-gray-100">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.branch_ids.includes(branch.id)}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    const newBranchIds = checked
                                                                        ? [...formData.branch_ids, branch.id]
                                                                        : formData.branch_ids.filter(id => id !== branch.id);

                                                                    const actualBranches = branchList.filter(b => b.id !== 0);
                                                                    if (newBranchIds.length === actualBranches.length) {
                                                                        setFormData(prev => ({ ...prev, is_global: true, branch_ids: [] }));
                                                                        setErrors(prev => ({ ...prev, branch_ids: '' }));
                                                                    } else {
                                                                        setFormData(prev => ({ ...prev, branch_ids: newBranchIds }));
                                                                        validateField('branch_ids', newBranchIds);
                                                                    }
                                                                }}
                                                                className="w-4 h-4 text-naqupos-primary focus:ring-naqupos-primary border-gray-300 rounded transition-all cursor-pointer"
                                                            />
                                                            <span className="text-sm text-gray-600 font-medium truncate">{branch.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {errors.branch_ids && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={12} /> {errors.branch_ids}</p>}
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${errors.category ? 'text-red-500' : 'text-gray-700'}`}>Kategori *</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {assetCategories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, category: cat.id }));
                                                        validateField('category', cat.id);
                                                    }}
                                                    className={`p-3 rounded-lg border text-left transition-colors ${formData.category === cat.id
                                                        ? 'border-naqupos-primary bg-naqupos-cream'
                                                        : errors.category ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <span className="text-lg mr-2">{cat.icon}</span>
                                                    <span className="text-sm">{cat.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${errors.purchaseDate ? 'text-red-500' : 'text-gray-700'}`}>Tanggal Pembelian</label>
                                        <div className="relative">
                                            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="date"
                                                value={formData.purchaseDate}
                                                max={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => {
                                                    setFormData(prev => ({ ...prev, purchaseDate: e.target.value }));
                                                    validateField('purchaseDate', e.target.value);
                                                    if (formData.lastMaintenance) validateField('lastMaintenance', formData.lastMaintenance);
                                                }}
                                                className={`w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all ${errors.purchaseDate ? 'border-red-500 ring-1 ring-red-100' : 'border-gray-200 focus:border-naqupos-primary'}`}
                                            />
                                        </div>
                                        {errors.purchaseDate && <p className="mt-1 text-xs text-red-500">{errors.purchaseDate}</p>}
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${errors.purchasePrice ? 'text-red-500' : 'text-gray-700'}`}>Harga Beli (Rp) *</label>
                                        <input
                                            type="text"
                                            value={formData.purchasePrice ? Number(formData.purchasePrice).toLocaleString('id-ID') : ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setFormData(prev => ({ ...prev, purchasePrice: val }));
                                                validateField('purchasePrice', val);
                                            }}
                                            placeholder="Contoh: 5.000.000"
                                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${errors.purchasePrice ? 'border-red-500 ring-1 ring-red-100' : 'border-gray-200 focus:border-naqupos-primary'}`}
                                        />
                                        {errors.purchasePrice && <p className="mt-1 text-xs text-red-500">{errors.purchasePrice}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Kondisi *</label>
                                        <div className="flex gap-2">
                                            {conditionOptions.map(opt => {
                                                const Icon = opt.icon;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, condition: opt.id as Asset['condition'] }))}
                                                        className={`flex-1 p-2 rounded-lg border text-center transition-colors text-xs ${formData.condition === opt.id
                                                            ? 'border-naqupos-primary bg-naqupos-cream text-naqupos-primary font-bold'
                                                            : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                                            }`}
                                                    >
                                                        <Icon size={16} className="mx-auto mb-1" />
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                                        <SearchableSelect
                                            value={formData.status}
                                            onChange={(val) => setFormData(prev => ({ ...prev, status: val as Asset['status'] }))}
                                            options={statusOptions.map(opt => ({ value: opt.id, label: opt.label }))}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${errors.lastMaintenance ? 'text-red-500' : 'text-gray-700'}`}>Maintenance Terakhir</label>
                                        <input
                                            type="date"
                                            value={formData.lastMaintenance}
                                            max={new Date().toISOString().split('T')[0]}
                                            min={formData.purchaseDate}
                                            disabled={!formData.purchaseDate || formData.condition === 'Baik'}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, lastMaintenance: e.target.value }));
                                                validateField('lastMaintenance', e.target.value);
                                            }}
                                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${(!formData.purchaseDate || formData.condition === 'Baik') ? 'bg-gray-100 cursor-not-allowed text-gray-400' :
                                                errors.lastMaintenance ? 'border-red-500 ring-1 ring-red-100' : 'border-gray-200 focus:border-naqupos-primary'
                                                }`}
                                        />
                                        {errors.lastMaintenance && <p className="mt-1 text-xs text-red-500">{errors.lastMaintenance}</p>}
                                        {formData.condition === 'Baik' && <p className="mt-1 text-[10px] text-gray-400 italic">Maintenance hanya untuk aset yang perlu perbaikan/rusak.</p>}
                                        {!formData.purchaseDate && <p className="mt-1 text-[10px] text-gray-400 italic">Isi tanggal pembelian dulu.</p>}
                                    </div>

                                    <div className="col-span-2">
                                        <label className={`block text-sm font-medium mb-2 ${errors.notes ? 'text-red-500' : 'text-gray-700'}`}>Catatan</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, notes: e.target.value }));
                                                validateField('notes', e.target.value);
                                            }}
                                            placeholder="Catatan tambahan (Max 500 karakter)..."
                                            rows={2}
                                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${errors.notes ? 'border-red-500 ring-1 ring-red-100' : 'border-gray-200 focus:border-naqupos-primary'}`}
                                        />
                                        {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={
                                            isProcessing ||
                                            !formData.name ||
                                            !formData.purchasePrice ||
                                            !formData.category ||
                                            !formData.purchaseDate ||
                                            (!formData.is_global && formData.branch_ids.length === 0) ||
                                            (formData.condition !== 'Baik' && !formData.lastMaintenance) ||
                                            Object.values(errors).some(err => err !== '')
                                        }
                                        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isProcessing ||
                                            !formData.name ||
                                            !formData.purchasePrice ||
                                            !formData.category ||
                                            !formData.purchaseDate ||
                                            (!formData.is_global && formData.branch_ids.length === 0) ||
                                            (formData.condition !== 'Baik' && !formData.lastMaintenance) ||
                                            Object.values(errors).some(err => err !== '')
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'
                                            }`}
                                    >
                                        {isProcessing ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Aset'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && selectedAsset && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle size={32} className="text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-naqupos-dark mb-2">Hapus Aset?</h3>
                                    <p className="text-gray-500">
                                        Yakin ingin menghapus <strong>{selectedAsset.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isProcessing}
                                        className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                                    >
                                        {isProcessing ? 'Menghapus...' : 'Hapus'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Kategori Aset Tab */}
            {activeTab === 'kategori-aset' && (
                <AssetCategoryTab
                    branchId={selectedBranchId}
                    branches={branchList.filter(b => b.id !== 0)}
                    globalBranchId={selectedBranchId}
                    setBranchFilter={(id) => setSelectedBranchId(Number(id))}
                />
            )}
        </div>
    );
}