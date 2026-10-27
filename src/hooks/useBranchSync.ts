import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to synchronize local branch selection with the global branch selection from AdminLayout.
 * 
 * @param onBranchChange Optional callback triggered when the branch changes globally.
 * @param allValue The value representing "All Branches" in the local component (default: null)
 * @returns { selectedBranchId, setSelectedBranchId }
 */
export function useBranchSync<T = number | null>(
    onBranchChange?: (branchId: T) => void,
    allValue: T = null as unknown as T
) {
    const [selectedBranchId, setSelectedBranchId] = useState<T>(() => {
        const saved = localStorage.getItem('naqupos_selected_branch');
        if (saved === 'all' || !saved) return allValue;
        const parsed = Number(saved);
        if (!Number.isFinite(parsed)) return allValue;
        return parsed as unknown as T;
    });

    const onBranchChangeRef = useRef(onBranchChange);
    const isFirstSyncRef = useRef(true);

    useEffect(() => {
        onBranchChangeRef.current = onBranchChange;
    }, [onBranchChange]);

    useEffect(() => {
        const syncBranch = (fireCallback: boolean) => {
            const saved = localStorage.getItem('naqupos_selected_branch');
            const parsed = saved ? Number(saved) : NaN;
            const branchId = (saved === 'all' || !saved || !Number.isFinite(parsed))
                ? allValue
                : (parsed as unknown as T);
            setSelectedBranchId(branchId);
            if (fireCallback && onBranchChangeRef.current) {
                onBranchChangeRef.current(branchId);
            }
        };

        // Listen for the custom event dispatched by AdminLayout
        const handler = () => syncBranch(true);
        window.addEventListener('naqupos-branch-change', handler);

        // Initial sync only updates state; avoid firing the change callback on mount
        // (consumers already fetch on mount, this prevented duplicate initial loads).
        syncBranch(!isFirstSyncRef.current);
        isFirstSyncRef.current = false;

        return () => {
            window.removeEventListener('naqupos-branch-change', handler);
        };
    }, [allValue]);


    return { selectedBranchId, setSelectedBranchId };
}
