import React, { useState, useEffect, useRef } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'prefix'> {
    value: number | string;
    onChange: (value: number) => void;
    className?: string;
    prefix?: React.ReactNode;
}

export function CurrencyInput({ value, onChange, className = '', prefix, ...props }: CurrencyInputProps) {
    // Keep local formatted string state
    const [displayValue, setDisplayValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync with external value prop
    useEffect(() => {
        if (value === '' || value === undefined || value === null) {
            setDisplayValue('');
        } else {
            // Using ID locale: 1.000 (dots for thousands)
            setDisplayValue(new Intl.NumberFormat('id-ID').format(Number(value)));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Remove all non-digit characters
        const rawValue = inputValue.replace(/\D/g, '');

        if (rawValue === '') {
            setDisplayValue('');
            onChange(0);
            return;
        }

        const numberValue = parseInt(rawValue, 10);

        // Optimistically update display to avoid lag
        // This might cause cursor jump if we aren't careful, but standard for simple inputs
        // Formatting: 1234 -> "1.234"
        const formatted = new Intl.NumberFormat('id-ID').format(numberValue);
        setDisplayValue(formatted);

        onChange(numberValue);
    };

    return (
        <div className="relative w-full">
            {prefix && (
                <div className="absolute left-0 top-0 bottom-0 min-w-[3rem] px-3 flex items-center justify-center text-gray-500 text-sm font-medium bg-gray-50 rounded-l-lg border-y border-l border-gray-200 pointer-events-none z-10">
                    {prefix}
                </div>
            )}
            <input
                ref={inputRef}
                type="text"
                value={displayValue}
                onChange={handleChange}
                className={`${className} ${prefix ? 'pl-14' : 'pl-4'} w-full pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C58940]/20 focus:border-[#C58940] outline-none transition-all placeholder-gray-400`}
                {...props}
            />
        </div>
    );
}
