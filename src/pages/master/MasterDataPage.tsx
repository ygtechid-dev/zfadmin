import { useState, useEffect } from 'react';
import { api } from '../../services/api'; // Adjust path
import BrandTab from './tabs/BrandTab';
import CategoryTab from './tabs/CategoryTab';
import SupplierTab from './tabs/SupplierTab';

type MasterTab = 'merk' | 'kategori' | 'supplier';

import { useBranchSync } from '../../hooks/useBranchSync';

export default function MasterDataPage() {
    const [activeTab, setActiveTab] = useState<MasterTab>('merk');
    const [branches, setBranches] = useState<any[]>([]);

    // Sync with global branch
    const { selectedBranchId: branchFilter, setSelectedBranchId: setBranchFilter } = useBranchSync<string | number>(undefined, 0);
    const globalBranchId = branchFilter === 0 ? 'all' : branchFilter.toString();
    const [refreshTrigger] = useState(0);

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
            } catch (error) {
                console.error("Failed to load branches", error);
            }
        };
        loadBranches();
    }, []);


    const tabs = [
        { key: 'merk', label: 'Merk' },
        { key: 'kategori', label: 'Kategori' },
        { key: 'supplier', label: 'Supplier' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manajemen Produk</h1>
                    <p className="text-sm text-gray-500">Kelola data master data produk.</p>
                </div>
            </div>

            {/* Header Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-2 pt-2">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as MasterTab)}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
                                    ? 'border-naqupos-primary text-naqupos-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] relative">
                {activeTab === 'merk' && <BrandTab key={refreshTrigger} branchId={branchFilter} branches={branches} globalBranchId={globalBranchId} setBranchFilter={setBranchFilter} />}
                {activeTab === 'kategori' && <CategoryTab key={refreshTrigger} branchId={branchFilter} branches={branches} globalBranchId={globalBranchId} setBranchFilter={setBranchFilter} />}
                {activeTab === 'supplier' && <SupplierTab key={refreshTrigger} branchId={branchFilter} branches={branches} globalBranchId={globalBranchId} setBranchFilter={setBranchFilter} />}
            </div>
        </div>
    );
}
