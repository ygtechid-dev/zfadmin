import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const auth = localStorage.getItem('naqupos_admin_auth');
        if (auth) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Email dan password wajib diisi');
            return;
        }

        setIsLoading(true);

        try {
            // Backend expects 'login' (email/phone) and 'password'
            const response = await api.login({
                login: email,
                password
            });

            // Store auth data as expected by api.ts
            localStorage.setItem('naqupos_admin_auth', JSON.stringify({
                user: response.user,
                token: response.token,
                loginTime: new Date().toISOString()
            }));

            const role = response.user?.role?.toLowerCase?.() || '';
            const isGlobalUser = ['super_admin', 'super admin', 'owner'].includes(role);
            if (isGlobalUser) {
                localStorage.setItem('naqupos_selected_branch', 'all');
            } else if (response.user?.branch_id) {
                localStorage.setItem('naqupos_selected_branch', String(response.user.branch_id));
            } else {
                localStorage.removeItem('naqupos_selected_branch');
            }

            // Log activity (optional) — must never break an already-successful login
            try {
                const parsedLogs = JSON.parse(localStorage.getItem('naqupos_activity_logs') || '[]');
                const logs = Array.isArray(parsedLogs) ? parsedLogs : [];
                logs.unshift({
                    id: Date.now(),
                    action: 'Login',
                    user: response.user?.name || '-',
                    email: response.user?.email || '',
                    details: `Login successful`,
                    ip: 'Client',
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('naqupos_activity_logs', JSON.stringify(logs.slice(0, 100)));
            } catch (logErr) {
                console.error('Failed to write activity log', logErr);
            }

            navigate('/');

        } catch (err: any) {
            console.error('Login error', err);
            setError(err.message || 'Email atau password salah');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-naqupos-cream via-white to-naqupos-cream/50 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23996515' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo & Brand */}
                <div className="text-center mb-8">
                    <div className="inline-block p-1 bg-white rounded-3xl shadow-xl shadow-naqupos-primary/10 mb-4">
                        <img
                            src="/logo-naqupos.jpeg"
                            alt="Naqupos"
                            className="w-24 h-24 rounded-2xl object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-naqupos-dark"> Admin</h1>
                    <p className="text-gray-500 mt-1">Smart POS & Management System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
                    <h2 className="text-xl  font-bold text-naqupos-dark mb-6">Masuk ke Dashboard</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Masukkan email Anda"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:ring-2 focus:ring-naqupos-primary/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password Anda"
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 focus:border-naqupos-primary focus:ring-2 focus:ring-naqupos-primary/20 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full py-3.5 bg-naqupos-primary text-white font-medium rounded-xl hover:bg-naqupos-accent transition-all shadow-lg shadow-naqupos-primary/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                'Masuk'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-400 mt-6">
                    © 2026 Naqupos. All rights reserved.
                </p>
            </div>
        </div>
    );
}
