import { useState } from 'react';
import { api, type DashboardData } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    Users,
    CalendarCheck,
    DollarSign,
    Clock,
    UserCheck,
    AlertCircle
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const omzetPayload = payload.find((item: any) => item.dataKey === 'omzet');
        const visitorsPayload = payload.find((item: any) => item.dataKey === 'visitors');
        const omzet = Number(omzetPayload?.value || 0);
        const visitors = Number(visitorsPayload?.value || 0);

        return (
            <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
                <p className="font-medium text-gray-900 mb-2">{label}</p>
                <div className="space-y-1">
                    <p className="text-naqupos-primary flex items-center justify-between gap-4">
                        <span>Omzet:</span>
                        <span className="font-bold">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(omzet)}
                        </span>
                    </p>
                    <p className="text-purple-500 flex items-center justify-between gap-4">
                        <span>Pengunjung:</span>
                        <span className="font-bold">{visitors.toLocaleString('id-ID')} Orang</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const toNumber = (value: unknown) => {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num : 0;
};

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getLastSevenDaysChartData = (charts: any) => {
    const revenueByDate = new Map(
        (charts?.revenue_trend || []).map((item: any) => [item.date, toNumber(item.revenue)])
    );
    const visitorsByDate = new Map(
        (charts?.bookings_trend || []).map((item: any) => [item.date, toNumber(item.count)])
    );

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const dateKey = formatDateKey(date);

        return {
            date: dateKey,
            name: date.toLocaleDateString('id-ID', { weekday: 'short' }),
            omzet: revenueByDate.get(dateKey) || 0,
            visitors: visitorsByDate.get(dateKey) || 0,
        };
    });
};

import { useBranchSync } from '../hooks/useBranchSync';

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const loadData = async (bId: string) => {
        setIsLoading(true);
        try {
            const numericBranchId = bId === 'all' ? undefined : Number(bId);
            const [dashboard, charts] = await Promise.all([
                api.getDashboard(numericBranchId),
                api.getDashboardCharts('week', numericBranchId)
            ]);
            setData(dashboard);

            setChartData(getLastSevenDaysChartData(charts));
        } catch (error) {
            console.error('Failed to load dashboard data', error);
        } finally {
            setIsLoading(false);
        }
    };

    // The useBranchSync hook already pulls data on mount and on branch change
    useBranchSync<string>(
        (id) => loadData(id || 'all'),
        'all'
    );



    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-naqupos-primary"></div>
            </div>
        );
    }

    // Map API data to UI structure
    const stats = [
        {
            label: 'Total Omzet Hari Ini',
            value: data ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.stats.total_revenue_today) : '0',
            note: '',
            change: '',
            trend: 'neutral',
            icon: DollarSign,
            color: 'bg-green-100 text-green-600',
            link: '/reports/ringkasan-keuangan'
        },
        {
            label: 'Booking Terbayar Hari Ini',
            value: data?.stats.bookings_today.toString() || '0',
            note: data?.stats.unpaid_bookings_today ? `${data.stats.unpaid_bookings_today} belum bayar` : '',
            change: '',
            trend: 'neutral',
            icon: CalendarCheck,
            color: 'bg-blue-100 text-blue-600',
            link: '/bookings'
        },
        {
            label: 'Pelanggan Baru',
            value: data?.stats.new_customers_today.toString() || '0',
            note: '',
            change: '',
            trend: 'neutral',
            icon: Users,
            color: 'bg-purple-100 text-purple-600',
            link: '/customers'
        },
        {
            label: 'Terapis Aktif',
            value: data?.stats.active_therapists.toString() || '0',
            note: '',
            change: '',
            trend: 'neutral',
            icon: UserCheck,
            color: 'bg-amber-100 text-amber-600',
            link: '/staff'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">Dashboard</h1>
                    <p className="text-gray-500 text-sm">Ringkasan operasional hari ini</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={16} />
                    <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <Link key={idx} to={stat.link} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between">
                            <div className={`p-3 rounded-lg ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} />
                            </div>
                            {/* Trend UI removed as backend doesn't provide it yet */}
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold text-naqupos-dark">{stat.value}</p>
                            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                            {stat.note && (
                                <p className="text-xs text-amber-600 font-semibold mt-1">{stat.note}</p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Revenue Trend Chart */}
            {(chartData && chartData.some(item => item.omzet > 0 || item.visitors > 0)) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className=" font-bold text-naqupos-dark mb-1">Tren Pendapatan & Kunjungan</h3>
                            <p className="text-xs text-gray-500">Statistik 7 hari terakhir</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-naqupos-primary"></span>
                                <span>Omzet</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-purple-200"></span>
                                <span>Pengunjung</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full min-w-0" style={{ minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#996515" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#996515" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    tickFormatter={(value) => `${value / 1000000}jt`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    hide
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="visitors"
                                    stroke="#d8b4fe"
                                    strokeWidth={2}
                                    fill="#f3e8ff"
                                    fillOpacity={0.5}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="omzet"
                                    stroke="#996515"
                                    strokeWidth={3}
                                    fill="url(#colorOmzet)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Bookings */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className=" font-bold text-naqupos-dark">Agenda Hari Ini</h3>
                        <Link to="/bookings" className="text-sm text-naqupos-primary hover:underline">Lihat Semua</Link>
                    </div>
                    <div className="p-4">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase">
                                    <th className="pb-3 font-medium">Jam</th>
                                    <th className="pb-3 font-medium">Pelanggan</th>
                                    <th className="pb-3 font-medium">Layanan</th>
                                    <th className="pb-3 font-medium">Terapis</th>
                                    <th className="pb-3 font-medium">Ruangan</th>
                                    <th className="pb-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {data?.today_agenda.map((booking: any) => (
                                    <tr
                                        key={booking.id}
                                        className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer group"
                                        onClick={() => navigate(`/bookings?ref=${booking.booking_ref}`)}
                                    >
                                        <td className="py-3 font-medium text-naqupos-dark">{booking.start_time ? booking.start_time.substring(0, 5) : '-'}</td>
                                        <td className="py-3">{booking.user?.name || 'Guest'}</td>
                                        <td className="py-3 text-gray-600">{booking.service?.name || '-'}</td>
                                        <td className="py-3">{booking.therapist?.name || '-'}</td>
                                        <td className="py-3">{booking.room?.name || '-'}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                booking.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                                    booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                            booking.status === 'pending_payment' ? 'bg-purple-100 text-purple-700' :
                                                                booking.status === 'no_show' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {booking.status === 'in_progress' ? 'Sedang Berjalan' :
                                                    booking.status === 'confirmed' ? 'Terkonfirmasi' :
                                                        booking.status === 'completed' ? 'Selesai' :
                                                            booking.status === 'cancelled' ? 'Dibatalkan' :
                                                                booking.status === 'pending_payment' ? 'Menunggu Pembayaran' :
                                                                    booking.status === 'no_show' ? 'Tidak Datang' :
                                                                        booking.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.today_agenda || data.today_agenda.length === 0) && (
                                    <tr><td colSpan={6} className="py-4 text-center text-gray-500">Tidak ada agenda hari ini</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Room Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className=" font-bold text-naqupos-dark">Status Ruangan</h3>
                            <Link to="/rooms" className="text-sm text-naqupos-primary hover:underline">Lihat Semua</Link>
                        </div>
                        <div className="p-4 space-y-3">
                            {data?.room_status.map((room: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">{room.name}</span>
                                    <div className="flex items-center gap-2">
                                        {room.status === 'available' ? (
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        ) : (
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        )}
                                        <span className={`text-xs ${room.status === 'available' ? 'text-green-600' : 'text-gray-500'}`}>
                                            {room.status === 'available' ? 'Tersedia' : `s/d ${room.until ? room.until.substring(0, 5) : '-'}`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!data?.room_status || data.room_status.length === 0) && (
                                <p className="text-center text-gray-500 text-sm">Tidak ada ruangan</p>
                            )}
                        </div>
                    </div>

                    {/* Alerts */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className=" font-bold text-naqupos-dark">Notifikasi</h3>
                            <Link to="/audit-log" className="text-sm text-naqupos-primary hover:underline">Lihat Semua</Link>
                        </div>
                        <div className="p-4 space-y-3">
                            {data?.alerts.map((alert: any, idx: number) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg text-sm flex items-start gap-2 ${alert.type === 'warning'
                                        ? 'bg-amber-50 text-amber-800'
                                        : alert.type === 'info'
                                            ? 'bg-blue-50 text-blue-800'
                                            : 'bg-green-50 text-green-800'
                                        }`}
                                >
                                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                    <span>{alert.message}</span>
                                </div>
                            ))}
                            {(!data?.alerts || data.alerts.length === 0) && (
                                <p className="text-center text-gray-500 text-sm">Tidak ada notifikasi baru</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-naqupos-primary to-naqupos-accent rounded-xl p-4 text-white">
                    <TrendingUp size={24} className="mb-2 opacity-80" />
                    <p className="text-2xl font-bold">
                        {data ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.stats.total_revenue_month) : 'Rp 0'}
                    </p>
                    <p className="text-sm opacity-80">Omzet Bulan Ini</p>
                </div>
                <div className="bg-gradient-to-br from-naqupos-dark to-purple-900 rounded-xl p-4 text-white">
                    <CalendarCheck size={24} className="mb-2 opacity-80" />
                    <p className="text-2xl font-bold">{data?.stats.total_bookings_month || 0}</p>
                    <p className="text-sm opacity-80">Total Booking Bulan Ini</p>
                </div>
                <div className="bg-gradient-to-br from-naqupos-sage to-green-600 rounded-xl p-4 text-white">
                    <Users size={24} className="mb-2 opacity-80" />
                    {/* Assuming new customers this month approx new_customers_today for now or missing field - usage new_customers_today temporarily */}
                    <p className="text-2xl font-bold">{data?.stats.new_customers_today || 0}</p>
                    <p className="text-sm opacity-80">Pelanggan Baru Hari Ini</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
                    <DollarSign size={24} className="mb-2 opacity-80" />
                    <p className="text-2xl font-bold">
                        {data ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.stats.pending_payments) : 'Rp 0'}
                    </p>
                    <p className="text-sm opacity-80">DP Belum Lunas</p>
                </div>
            </div>
        </div>
    );
}
