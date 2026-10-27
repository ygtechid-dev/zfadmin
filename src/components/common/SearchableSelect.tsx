import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, Loader2, Plus } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
    display?: React.ReactNode;
    disabled?: boolean;
}

interface SearchableSelectProps {
    label?: string;
    placeholder?: string;
    value: string | number | undefined;
    onChange: (value: string | number) => void;
    options: Option[];
    isLoading?: boolean;
    disabled?: boolean;
    className?: string;
    onSearch?: (query: string) => void;
    onCreate?: (params: { label: string }) => Promise<any>;
    creatable?: boolean;
    portal?: boolean;
    dropdownClassName?: string;
}

export function SearchableSelect({
    label,
    placeholder = 'Pilih opsi...',
    value,
    onChange,
    options = [],
    isLoading = false,
    disabled = false,
    className = '',
    onSearch,
    onCreate,
    creatable = false,
    portal = false,
    dropdownClassName = ''
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [localOptions, setLocalOptions] = useState<Option[]>(options);
    const [isCreating, setIsCreating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [dropUp, setDropUp] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        setLocalOptions(options);
    }, [options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isInsideContainer = containerRef.current?.contains(target);
            const isInsideDropdown = dropdownRef.current?.contains(target);

            if (!isInsideContainer && !isInsideDropdown) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If less than 280px below (max-h 240 + padding/search), open up
            if (spaceBelow < 280) {
                setDropUp(true);
            } else {
                setDropUp(false);
            }

            if (portal) {
                const openUp = spaceBelow < 280;
                setDropdownStyle({
                    position: 'fixed',
                    left: rect.left,
                    top: openUp ? undefined : rect.bottom + 8,
                    bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
                    width: rect.width,
                    zIndex: 10000,
                });
            }
        }
    }, [isOpen, portal]);

    useEffect(() => {
        if (!isOpen || !portal) return;

        const closeOnLayoutChange = () => setIsOpen(false);
        window.addEventListener('scroll', closeOnLayoutChange, true);
        window.addEventListener('resize', closeOnLayoutChange);

        return () => {
            window.removeEventListener('scroll', closeOnLayoutChange, true);
            window.removeEventListener('resize', closeOnLayoutChange);
        };
    }, [isOpen, portal]);

    const filteredOptions = localOptions.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = localOptions.find(opt => opt.value === value);

    const handleSelect = (option: Option) => {
        if (option.disabled) return;
        onChange(option.value);
        setIsOpen(false);
        setSearch('');
    };

    const handleCreate = async () => {
        if (!onCreate || !search) return;
        setIsCreating(true);
        try {
            const newOption = await onCreate({ label: search });
            if (newOption) {
                // Assuming onCreate returns the new option object { value, label }
                // or we just call onChange if the parent handles the refetch/update
                onChange(newOption.value);
                setIsOpen(false);
                setSearch('');
            }
        } catch (error) {
            console.error('Failed to create option:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const dropdown = isOpen && !disabled ? (
        <div
            ref={dropdownRef}
            className={`${portal ? '' : `absolute z-[100] w-full ${dropUp ? 'bottom-full mb-2 animate-slideDown' : 'top-full mt-2 animate-slideUp'}`} bg-white border border-gray-100 rounded-xl shadow-xl shadow-orange-900/10 overflow-hidden ${dropdownClassName}`}
            style={portal ? dropdownStyle : undefined}
        >
            <div className="p-2 border-b border-gray-50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[#C58940]/20 transition-all placeholder:font-normal placeholder:text-gray-400"
                        placeholder="Cari..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            onSearch?.(e.target.value);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleSelect(option)}
                            className={`
                                px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors
                                ${option.disabled
                                    ? 'text-gray-400 opacity-60 cursor-not-allowed bg-gray-50/60'
                                    : option.value === value
                                        ? 'bg-[#FAF8F1] text-[#C58940] font-bold cursor-pointer'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer'}
                            `}
                        >
                            <span className="w-full">{option.display || option.label}</span>
                            {option.value === value && <Check size={12} className="text-[#C58940] flex-shrink-0" />}
                        </div>
                    ))
                ) : (
                    <div className="px-3 py-4 text-center">
                        <p className="text-xs text-gray-400 mb-2">Tidak ada hasil ditemukan</p>
                        {creatable && search && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreate();
                                }}
                                disabled={isCreating}
                                className="w-full py-2 bg-[#C58940] hover:bg-[#B07835] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                {isCreating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                Tambah "{search}"
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <div className={`relative ${isOpen ? 'z-[60]' : 'z-auto'} ${className}`} ref={containerRef}>
            {label && (
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full px-4 py-2.5 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all
                    ${isOpen ? 'border-[#C58940] ring-4 ring-[#C58940]/10 bg-white' : 'border-gray-200 hover:border-gray-300'}
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-xs font-bold truncate ${selectedOption ? 'text-gray-700' : 'text-gray-400 font-normal'}`}>
                        {selectedOption ? (selectedOption.display || selectedOption.label) : placeholder}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <Loader2 size={14} className="animate-spin text-[#C58940]" />
                    ) : (
                        <ChevronDown
                            size={14}
                            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#C58940]' : ''}`}
                        />
                    )}
                </div>
            </div>

            {portal && dropdown ? createPortal(dropdown, document.body) : dropdown}
        </div>
    );
}
