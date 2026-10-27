import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// Use a simplified interface or import from api
interface Branch {
    id: number;
    name: string;
}

interface MultiSelectBranchProps {
    branches: Branch[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    placeholder?: string;
}

export default function MultiSelectBranch({ branches, selectedIds, onChange, placeholder = "Semua Cabang" }: MultiSelectBranchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleBranch = (id: number) => {
        if (id === 0) { // "Semua Cabang" logic: clear selection
            onChange([]);
            return;
        }

        const newSelection = selectedIds.includes(id)
            ? selectedIds.filter(bid => bid !== id)
            : [...selectedIds, id];

        onChange(newSelection);
    };

    const isAllSelected = selectedIds.length === 0;

    const displayValue = isAllSelected
        ? placeholder
        : selectedIds.length === 1
            ? (branches.find(b => b.id === selectedIds[0])?.name || placeholder)
            : `${selectedIds.length} Cabang`;

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="pl-4 pr-10 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-naqupos-primary shadow-sm min-w-[180px] text-left relative flex items-center"
            >
                <span className="block truncate">{displayValue}</span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[300px]">
                    <div className="p-2 border-b border-gray-50">
                        <p className="text-xs font-bold text-gray-400 uppercase px-2 py-1">Filter Cabang</p>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1">
                        <button
                            onClick={() => toggleBranch(0)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${isAllSelected ? 'bg-naqupos-primary/10 text-naqupos-primary' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                            <span>Semua Cabang</span>
                            {isAllSelected && <Check size={16} className="text-naqupos-primary" />}
                        </button>

                        <div className="h-px bg-gray-100 my-1" />

                        {branches.filter(b => b.id !== 0).map(branch => {
                            const isSelected = selectedIds.includes(branch.id);
                            return (
                                <button
                                    key={branch.id}
                                    onClick={() => toggleBranch(branch.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${isSelected ? 'bg-naqupos-primary/10 text-naqupos-primary' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <span className="truncate">{branch.name}</span>
                                    {isSelected && <Check size={16} className="text-naqupos-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
