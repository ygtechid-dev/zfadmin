import React from 'react';
import { Layers } from 'lucide-react';

interface EmptyStateProps {
    title?: string;
    message?: string;
    icon?: React.ElementType;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title = 'Belum ada data',
    message = 'Tidak ditemukan data untuk saat ini.',
    icon: Icon = Layers
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 w-full animate-fadeIn">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <Icon size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="text-gray-500 text-sm">{message}</p>
        </div>
    );
};

export default EmptyState;
