import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText } from 'lucide-react';

interface ExportDropdownProps {
    onExportCSV: () => void;
    onExportExcel: () => void;
    onExportPDF: () => void;
}

export default function ExportDropdown({ onExportCSV, onExportExcel, onExportPDF }: ExportDropdownProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
                <Download size={16} />
                Export
                <ChevronDown size={14} />
            </button>
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <button
                        onClick={() => { onExportCSV(); setShowDropdown(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    >
                        <span className="text-green-500">📄</span>
                        Export CSV
                    </button>
                    <button
                        onClick={() => { onExportExcel(); setShowDropdown(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    >
                        <span className="text-green-600">📊</span>
                        Export Excel
                    </button>
                    <button
                        onClick={() => { onExportPDF(); setShowDropdown(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    >
                        <FileText size={16} className="text-red-500" />
                        Export PDF
                    </button>
                </div>
            )}
        </div>
    );
}
