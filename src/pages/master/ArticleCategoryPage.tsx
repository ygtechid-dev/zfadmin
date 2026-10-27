import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import ArticleCategoryTab from './tabs/ArticleCategoryTab';

export default function ArticleCategoryPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [globalBranchId, setGlobalBranchId] = useState(() => localStorage.getItem('naqupos_selected_branch') || 'all');
    const [branchFilter, setBranchFilter] = useState<string | number>('all');

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await api.getBranches();
                setBranches(data);
                const saved = localStorage.getItem('naqupos_selected_branch') || 'all';
                if (saved === 'all') {
                    setBranchFilter(0);
                } else {
                    setBranchFilter(Number(saved));
                }
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
            if (saved !== 'all') {
                setBranchFilter(Number(saved));
            } else {
                setBranchFilter(0);
            }
        };

        syncBranch();
        window.addEventListener('naqupos-branch-change' as any, syncBranch);
        return () => window.removeEventListener('naqupos-branch-change' as any, syncBranch);
    }, [branches]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Kategori Artikel</h1>
                <p className="text-sm text-gray-500">Kelola master data kategori artikel.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] relative">
                <ArticleCategoryTab branchId={branchFilter} branches={branches} globalBranchId={globalBranchId} setBranchFilter={setBranchFilter} />
            </div>
        </div>
    );
}
