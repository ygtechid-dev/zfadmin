import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SearchableSelect } from './SearchableSelect';

interface Branch {
    id: number;
    name: string;
}

interface BranchSelectorProps {
    selectedBranchId: number | null;
    onBranchChange: (branchId: number | null, branchName: string) => void;
    showAllOption?: boolean;
    allOptionLabel?: string;
    className?: string; // Add className prop for flexibility
}

export default function BranchSelector({ selectedBranchId, onBranchChange, showAllOption = true, allOptionLabel = 'Semua Cabang', className }: BranchSelectorProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isAuthorized, setIsAuthorized] = useState(true);

    useEffect(() => {
        // Check authorization
        const authData = localStorage.getItem('naqupos_admin_auth');
        if (authData) {
            try {
                const user = JSON.parse(authData).user;
                const role = user?.role?.toLowerCase() || '';
                const allowedRoles = ['super admin', 'super_admin', 'owner'];
                if (!allowedRoles.includes(role)) {
                    setIsAuthorized(false);
                }
            } catch (e) {
                console.error("Auth parse error in BranchSelector", e);
            }
        }

        api.getBranches().then(data => {
            setBranches(data);
            // If no branch selected and we have branches, select first one if not showing all
            if (selectedBranchId === null && data.length > 0 && !showAllOption) {
                onBranchChange(data[0].id, data[0].name);
            }
        }).catch(() => {
            // Fallback dummy data
            setBranches([
                { id: 1, name: 'Naqupos Spa Solo' },
                { id: 2, name: 'Naqupos Spa Jakarta' },
                { id: 3, name: 'Naqupos Spa Surabaya' }
            ]);
        });
    }, []);

    const options = [
        ...(showAllOption ? [{ value: 'all', label: allOptionLabel }] : []),
        ...branches.map(b => ({ value: b.id, label: b.name }))
    ];

    const handleChange = (value: string | number) => {
        if (value === 'all') {
            onBranchChange(null, allOptionLabel);
        } else {
            const branch = branches.find(b => b.id === Number(value));
            if (branch) {
                onBranchChange(branch.id, branch.name);
            }
        }
    };

    if (!isAuthorized) return null;

    return (
        <div className={`min-w-[200px] ${className || ''}`}>
            <SearchableSelect
                value={selectedBranchId ?? 'all'}
                onChange={handleChange}
                options={options}
                placeholder="Pilih Cabang"
            />
        </div>
    );
}
