import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import ServiceCategoryTab from './tabs/ServiceCategoryTab';
import { useBranchSync } from '../../hooks/useBranchSync';

export default function ServiceCategoryPage() {
    const [branches, setBranches] = useState<any[]>([]);

    // Sync with global branch
    const { selectedBranchId: branchFilter } = useBranchSync<number>(undefined, 0);


    const globalBranchId = branchFilter === 0 ? 'all' : branchFilter.toString();

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


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Kategori Layanan</h1>
                <p className="text-sm text-gray-500">Kelola master data kategori layanan.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] relative">
                <ServiceCategoryTab branchId={branchFilter} branches={branches} globalBranchId={globalBranchId} />
            </div>
        </div>
    );

}
