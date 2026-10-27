/* eslint-disable @typescript-eslint/no-explicit-any */

// SweetAlert2 utility wrapper (loaded via CDN)
const getSwal = () => (window as any).Swal || {
    fire: (opts: any) => {
        console.warn('SweetAlert2 not loaded yet', opts);
        // Fail-safe: destructive actions must NOT be auto-confirmed
        return Promise.resolve({ isConfirmed: false, isDismissed: true, value: null });
    },
    mixin: () => ({ fire: () => Promise.resolve({ isConfirmed: false, isDismissed: true, value: null }) }),
    stopTimer: () => undefined,
    resumeTimer: () => undefined,
};

const escapeHtml = (value: string) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const swal = {
    /**
     * Show a success alert
     */
    success: (message: string, title: string = 'Berhasil') => {
        return getSwal().fire({
            icon: 'success',
            title,
            text: message,
            confirmButtonColor: '#C58940',
            timer: 2500,
            timerProgressBar: true,
        });
    },

    /**
     * Show an error alert
     */
    error: (message: string, title: string = 'Gagal') => {
        return getSwal().fire({
            icon: 'error',
            title,
            text: message,
            confirmButtonColor: '#C58940',
        });
    },

    /**
     * Show a warning alert
     */
    warning: (message: string, title: string = 'Peringatan') => {
        return getSwal().fire({
            icon: 'warning',
            title,
            text: message,
            confirmButtonColor: '#C58940',
        });
    },

    /**
     * Show an info alert
     */
    info: (message: string, title: string = 'Informasi') => {
        return getSwal().fire({
            icon: 'info',
            title,
            text: message,
            confirmButtonColor: '#C58940',
        });
    },

    /**
     * Show a confirmation dialog
     */
    confirm: (message: string, title: string = 'Konfirmasi', confirmText: string = 'Ya, Lanjutkan') => {
        return getSwal().fire({
            icon: 'question',
            title,
            text: message,
            showCancelButton: true,
            confirmButtonColor: '#C58940',
            cancelButtonColor: '#6b7280',
            confirmButtonText: confirmText,
            cancelButtonText: 'Batal',
        });
    },

    /**
     * Show a delete confirmation dialog
     */
    confirmDelete: (itemName: string = 'data ini') => {
        return getSwal().fire({
            icon: 'warning',
            title: 'Hapus Data?',
            html: `Apakah Anda yakin ingin menghapus <strong>${escapeHtml(itemName)}</strong>? Tindakan ini tidak dapat dibatalkan.`,
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
        });
    },

    /**
     * Show a toast notification (mini alert at top-right)
     */
    toast: (message: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        const Toast = getSwal().mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast: any) => {
                toast.onmouseenter = getSwal().stopTimer;
                toast.onmouseleave = getSwal().resumeTimer;
            },
        });
        return Toast.fire({ icon, title: message });
    },
};

export default swal;
