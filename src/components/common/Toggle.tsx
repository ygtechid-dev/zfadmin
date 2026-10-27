import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    activeColor?: string;
}

const Toggle: React.FC<ToggleProps> = ({
    checked,
    onChange,
    disabled = false,
    activeColor = 'bg-naqupos-primary'
}) => {
    return (
        <div
            onClick={() => !disabled && onChange(!checked)}
            className={`
                relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-all duration-500 ease-in-out focus:outline-none
                ${checked ? activeColor : 'bg-gray-300'}
                ${checked && activeColor === 'bg-naqupos-primary' ? 'shadow-[0_0_20px_rgba(197,137,64,0.3)]' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                shadow-inner
            `}
        >
            <span
                className={`
                    pointer-events-none relative inline-block h-[22px] w-[22px] transform rounded-full bg-white 
                    shadow-[0_4px_8px_rgba(0,0,0,0.15)] ring-0 transition-all duration-500 cubic-bezier(0.68, -0.55, 0.265, 1.55)
                    ${checked ? 'translate-x-7' : 'translate-x-0'}
                    mt-[1px] ml-[1px]
                `}
            >
                <span className={`
                    absolute inset-0 flex items-center justify-center transition-opacity duration-300
                    ${checked ? 'opacity-100' : 'opacity-0'}
                `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${activeColor.replace('bg-', 'text-').replace('-400', '-600').replace('-500', '-700') || 'text-naqupos-primary'}`} />
                </span>
            </span>
        </div>
    );
};

export default Toggle;
