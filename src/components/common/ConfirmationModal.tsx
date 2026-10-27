import { AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Ya, Lanjutkan',
    cancelLabel = 'Batal',
    type = 'danger',
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const colors = {
        danger: { bg: 'bg-red-50', text: 'text-red-600', icon: AlertTriangle, button: 'bg-red-600 hover:bg-red-700' },
        warning: { bg: 'bg-amber-50', text: 'text-amber-600', icon: AlertTriangle, button: 'bg-amber-600 hover:bg-amber-700' },
        info: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Info, button: 'bg-blue-600 hover:bg-blue-700' },
        success: { bg: 'bg-green-50', text: 'text-green-600', icon: CheckCircle, button: 'bg-green-600 hover:bg-green-700' }
    };

    const style = colors[type];
    const Icon = style.icon;

    return (
        <div className="fixed inset-0 bg-naqupos-dark/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn">
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${style.bg} flex items-center justify-center animate-bounce-short`}>
                        <Icon className={style.text} size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 mb-8 px-4">{message}</p>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="min-w-[100px] px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`min-w-[100px] px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${style.button}`}
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
