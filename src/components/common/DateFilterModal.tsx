import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

interface DateFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (startDate: Date, endDate: Date, quickOption: string) => void;
    initialStartDate?: Date;
    initialEndDate?: Date;
    initialQuickOption?: string;
}

const formatDateInput = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const quickOptions = [
    { id: 'all', label: 'Semua Tanggal' },
    { id: 'today', label: 'Hari ini' },
    { id: 'yesterday', label: 'Kemarin' },
    { id: '7_days', label: '7 hari sebelumnya' },
    { id: 'this_week', label: 'Minggu ini' },
    { id: '30_days', label: '30 hari sebelumnya' },
    { id: 'month', label: 'Bulan ini' },
    { id: 'last_month', label: 'Bulan kemarin' },
    { id: 'this_year', label: 'Tahun ini' },
    { id: 'last_year', label: 'Tahun kemarin' },
];

const getDateRange = (optionId: string): { start: Date; end: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (optionId) {
        case 'all': return { start: new Date(2000, 0, 1), end: today };
        case 'today': return { start: today, end: today };
        case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return { start: yesterday, end: yesterday };
        }
        case '7_days': {
            const start = new Date(today);
            start.setDate(start.getDate() - 6);
            return { start, end: today };
        }
        case 'this_week': {
            const start = new Date(today);
            start.setDate(today.getDate() - today.getDay());
            return { start, end: today };
        }
        case '30_days': {
            const start = new Date(today);
            start.setDate(start.getDate() - 29);
            return { start, end: today };
        }
        case 'month': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return { start, end };
        }
        case 'last_month': {
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const end = new Date(today.getFullYear(), today.getMonth(), 0);
            return { start, end };
        }
        case 'this_year': {
            const start = new Date(today.getFullYear(), 0, 1);
            return { start, end: today };
        }
        case 'last_year': {
            const start = new Date(today.getFullYear() - 1, 0, 1);
            const end = new Date(today.getFullYear() - 1, 11, 31);
            return { start, end };
        }
        default: return { start: today, end: today };
    }
};

export default function DateFilterModal({ isOpen, onClose, onApply, initialStartDate, initialEndDate, initialQuickOption = 'this_week' }: DateFilterModalProps) {
    const [tempStartDate, setTempStartDate] = useState(initialStartDate || new Date());
    const [tempEndDate, setTempEndDate] = useState(initialEndDate || new Date());
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [selectedQuickOption, setSelectedQuickOption] = useState(initialQuickOption);

    useEffect(() => {
        if (isOpen) {
            const { start, end } = getDateRange(initialQuickOption);
            setTempStartDate(initialStartDate || start);
            setTempEndDate(initialEndDate || end);
            setCalendarMonth((initialEndDate || end).getMonth());
            setCalendarYear((initialEndDate || end).getFullYear());
            setSelectedQuickOption(initialQuickOption);
        }
    }, [isOpen, initialStartDate, initialEndDate, initialQuickOption]);

    const handleQuickOptionClick = (option: string) => {
        setSelectedQuickOption(option);
        const { start, end } = getDateRange(option);
        setTempStartDate(start);
        setTempEndDate(end);
        setCalendarMonth(end.getMonth());
        setCalendarYear(end.getFullYear());
    };

    const handleApply = () => {
        onApply(tempStartDate, tempEndDate, selectedQuickOption);
        onClose();
    };

    const handleReset = () => {
        const { start, end } = getDateRange('this_week');
        setTempStartDate(start);
        setTempEndDate(end);
        setSelectedQuickOption('this_week');
    };

    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const updateCalendarMonth = (delta: number) => {
        let m = calendarMonth + delta;
        let y = calendarYear;
        if (m > 11) { m = 0; y++; }
        if (m < 0) { m = 11; y--; }
        setCalendarMonth(m);
        setCalendarYear(y);
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
        const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
        const startOffset = (firstDay + 6) % 7;

        const days = [];
        for (let i = 0; i < startOffset; i++) days.push(<div key={`empty-${i}`} className="p-2"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(calendarYear, calendarMonth, d);
            const isSelected = date >= tempStartDate && date <= tempEndDate;
            const isStart = date.toDateString() === tempStartDate.toDateString();
            const isEnd = date.toDateString() === tempEndDate.toDateString();

            let bgClass = '';
            let textClass = 'text-gray-700 hover:bg-gray-100';

            if (isSelected) {
                bgClass = 'bg-blue-50';
                textClass = 'text-blue-600';
            }
            if (isStart || isEnd) {
                bgClass = 'bg-blue-500 text-white hover:bg-blue-600';
                textClass = 'text-white';
            }

            days.push(
                <button
                    key={d}
                    onClick={() => {
                        if (tempStartDate.getTime() === tempEndDate.getTime()) {
                            if (date < tempStartDate) {
                                setTempStartDate(date);
                            } else {
                                setTempEndDate(date);
                            }
                        } else {
                            setTempStartDate(date);
                            setTempEndDate(date);
                        }
                        setSelectedQuickOption('');
                    }}
                    className={`p-2 w-full aspect-square text-sm rounded transition-colors ${bgClass} ${textClass}`}
                >
                    {d}
                </button>
            );
        }
        return days;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        Filter Tanggal
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mulai Tanggal</label>
                            <input
                                type="date"
                                value={formatDateInput(tempStartDate)}
                                onChange={(e) => {
                                    const newStart = new Date(e.target.value);
                                    setTempStartDate(newStart);
                                    if (tempEndDate < newStart) {
                                        setTempEndDate(newStart);
                                    }
                                    setSelectedQuickOption('');
                                }}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                            <input
                                type="date"
                                value={formatDateInput(tempEndDate)}
                                onChange={(e) => { setTempEndDate(new Date(e.target.value)); setSelectedQuickOption(''); }}
                                min={formatDateInput(tempStartDate)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3 flex flex-col gap-2">
                            <div className="text-sm font-medium text-gray-700 mb-2">Pilihan Cepat</div>
                            {quickOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleQuickOptionClick(opt.id)}
                                    className={`px-4 py-2 text-sm rounded text-left transition-colors ${selectedQuickOption === opt.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => updateCalendarMonth(-1)} className="px-3 py-1 hover:bg-gray-100 rounded text-sm border">←</button>
                                <span className="font-medium text-sm">
                                    {new Date(calendarYear, calendarMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => updateCalendarMonth(1)} className="px-3 py-1 hover:bg-gray-100 rounded text-sm border">→</button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                                    <div key={d} className="text-xs text-gray-500 font-medium py-1">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {renderCalendar()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between">
                    <button onClick={handleReset} className="px-6 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium hover:bg-gray-50">
                        Reset
                    </button>
                    <button onClick={handleApply} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                        Terapkan
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function to format date range display
export function formatDateRangeDisplay(start: Date, end: Date) {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString('id-ID', options)} - ${end.toLocaleDateString('id-ID', options)}`;
}

// Helper to get initial date range
export function getInitialDateRange(option: string = 'this_week') {
    return getDateRange(option);
}
