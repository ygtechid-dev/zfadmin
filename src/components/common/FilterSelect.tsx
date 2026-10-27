import { ChevronDown } from 'lucide-react';

interface FilterSelectProps {
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string | number; label: string }[];
    className?: string;
}

export const FilterSelect = ({ value, onChange, options, className }: FilterSelectProps) => {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                className={`appearance-none w-full bg-white border border-gray-200 text-gray-700 text-xs font-medium py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#C58940] hover:border-gray-300 transition-colors cursor-pointer shadow-sm ${className}`}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <ChevronDown size={14} />
            </div>
        </div>
    );
};
