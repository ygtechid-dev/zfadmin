/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import {
    CreditCard, Settings, Plus, Edit, Trash2, X, AlertTriangle,
    Loader, TestTube
} from 'lucide-react';

interface PaymentConfig {
    id?: number;
    branch_id: number;
    branch?: { id: number; name: string; code: string };
    payment_gateway: 'midtrans' | 'xendit' | 'manual';
    midtrans_server_key?: string;
    midtrans_client_key?: string;
    midtrans_merchant_id?: string;
    midtrans_is_production: boolean;
    xendit_api_key?: string;
    xendit_callback_token?: string;
    xendit_is_production: boolean;
    enabled_payment_methods: string[];
    bank_accounts: BankAccount[];
    ewallet_accounts: EwalletAccount[];
    minimum_payment: number;
    down_payment_percentage: number;
    allow_installment: boolean;
    max_installment_months: number;
    auto_confirm_payment: boolean;
    payment_confirmation_timeout: number;
    is_active: boolean;
    masked_server_key?: string;
    masked_client_key?: string;
    masked_xendit_key?: string;
}

interface BankAccount {
    bank_name: string;
    account_number: string;
    account_holder: string;
}

interface EwalletAccount {
    provider: string;
    account_number: string;
}

export default function PaymentConfigPage() {
    const [configs, setConfigs] = useState<PaymentConfig[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<PaymentConfig | null>(null);
    const [showKeys] = useState<Record<string, boolean>>({});
    const [testingConnection, setTestingConnection] = useState(false);

    const [formData, setFormData] = useState<Partial<PaymentConfig>>({
        branch_id: 0,
        payment_gateway: 'manual',
        midtrans_is_production: false,
        xendit_is_production: false,
        enabled_payment_methods: ['cash'],
        bank_accounts: [],
        ewallet_accounts: [],
        minimum_payment: 0,
        down_payment_percentage: 0,
        allow_installment: false,
        max_installment_months: 0,
        auto_confirm_payment: false,
        payment_confirmation_timeout: 24,
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const [configsData, branchesData] = await Promise.all([
                api.getPaymentConfigs(),
                api.getBranches()
            ]);
            setConfigs(configsData.configs || []);
            setBranches(branchesData);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setFormData({
            branch_id: branches[0]?.id || 0,
            payment_gateway: 'manual',
            midtrans_is_production: false,
            xendit_is_production: false,
            enabled_payment_methods: ['cash'],
            bank_accounts: [],
            ewallet_accounts: [],
            minimum_payment: 0,
            down_payment_percentage: 0,
            allow_installment: false,
            max_installment_months: 0,
            auto_confirm_payment: false,
            payment_confirmation_timeout: 24,
            is_active: true
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (config: PaymentConfig) => {
        setSelectedConfig(config);
        setFormData({
            branch_id: config.branch_id,
            payment_gateway: config.payment_gateway,
            midtrans_server_key: '',
            midtrans_client_key: '',
            midtrans_merchant_id: config.midtrans_merchant_id,
            midtrans_is_production: config.midtrans_is_production,
            xendit_api_key: '',
            xendit_callback_token: '',
            xendit_is_production: config.xendit_is_production,
            enabled_payment_methods: config.enabled_payment_methods,
            bank_accounts: config.bank_accounts,
            ewallet_accounts: config.ewallet_accounts,
            minimum_payment: config.minimum_payment,
            down_payment_percentage: config.down_payment_percentage,
            allow_installment: config.allow_installment,
            max_installment_months: config.max_installment_months,
            auto_confirm_payment: config.auto_confirm_payment,
            payment_confirmation_timeout: config.payment_confirmation_timeout,
            is_active: config.is_active
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const openDeleteModal = (config: PaymentConfig) => {
        setSelectedConfig(config);
        setShowDeleteModal(true);
    };

    const closeModals = () => {
        setShowModal(false);
        setShowDeleteModal(false);
        setSelectedConfig(null);
    };

    const handleSave = async () => {
        if (!formData.branch_id) return;

        setIsProcessing(true);
        try {
            if (isEditing && selectedConfig?.id) {
                await api.updatePaymentConfig(selectedConfig.id, formData);
                toast.success('Configuration updated successfully');
            } else {
                await api.createPaymentConfig(formData);
                toast.success('Configuration created successfully');
            }
            await loadData();
            closeModals();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save configuration');
            console.error('Error saving config:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedConfig?.id) return;

        setIsProcessing(true);
        try {
            await api.deletePaymentConfig(selectedConfig.id);
            await loadData();
            closeModals();
            toast.success('Configuration deleted successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete configuration');
            console.error('Error deleting config:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTestConnection = async () => {
        if (!formData.payment_gateway || formData.payment_gateway === 'manual') {
            toast.error('Please select a payment gateway (Midtrans or Xendit)');
            return;
        }

        setTestingConnection(true);
        try {
            const testData: any = {
                gateway: formData.payment_gateway,
                is_production: formData.payment_gateway === 'midtrans'
                    ? formData.midtrans_is_production
                    : formData.xendit_is_production
            };

            if (formData.payment_gateway === 'midtrans') {
                testData.server_key = formData.midtrans_server_key;
            } else {
                testData.api_key = formData.xendit_api_key;
            }

            const result = await api.testPaymentConnection(testData);
            toast.success(result.message || 'Connection test successful!');
        } catch (err: any) {
            toast.error(err.message || 'Connection test failed');
        } finally {
            setTestingConnection(false);
        }
    };

    const togglePaymentMethod = (method: string) => {
        const current = formData.enabled_payment_methods || [];
        setFormData({
            ...formData,
            enabled_payment_methods: current.includes(method)
                ? current.filter(m => m !== method)
                : [...current, method]
        });
    };

    const addBankAccount = () => {
        setFormData({
            ...formData,
            bank_accounts: [
                ...(formData.bank_accounts || []),
                { bank_name: '', account_number: '', account_holder: '' }
            ]
        });
    };

    const removeBankAccount = (index: number) => {
        setFormData({
            ...formData,
            bank_accounts: (formData.bank_accounts || []).filter((_, i) => i !== index)
        });
    };

    const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
        const updated = [...(formData.bank_accounts || [])];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, bank_accounts: updated });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-naqupos-primary mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading payment configurations...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error: {error}</p>
                <button
                    onClick={loadData}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl  font-bold text-naqupos-dark">Payment Configuration</h1>
                    <p className="text-gray-500 text-sm">Manage payment gateway settings per branch</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-naqupos-primary text-white px-4 py-2 rounded-lg hover:bg-naqupos-accent transition-colors"
                >
                    <Plus size={18} />
                    <span>Add Configuration</span>
                </button>
            </div>

            {/* Configurations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {configs.map(config => (
                    <div key={config.id} className="bg-white rounded-xl border border-gray-100 p-5">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-naqupos-dark">{config.branch?.name}</h3>
                                <p className="text-xs text-gray-500">{config.branch?.code}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${config.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {config.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-2">
                                <CreditCard size={16} className="text-gray-400" />
                                <span className="text-sm font-medium capitalize">{config.payment_gateway}</span>
                            </div>

                            {config.payment_gateway !== 'manual' && (
                                <div className="text-xs text-gray-500">
                                    {config.payment_gateway === 'midtrans' && config.masked_server_key && (
                                        <p>Server Key: {config.masked_server_key}</p>
                                    )}
                                    {config.payment_gateway === 'xendit' && config.masked_xendit_key && (
                                        <p>API Key: {config.masked_xendit_key}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1">
                                {config.enabled_payment_methods.map(method => (
                                    <span key={method} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        {method.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                            <button
                                onClick={() => openEditModal(config)}
                                className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
                            >
                                <Edit size={14} /> Edit
                            </button>
                            <button
                                onClick={() => openDeleteModal(config)}
                                className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {configs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <Settings size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No payment configurations found</p>
                    <p className="text-sm">Add a configuration to get started</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl  font-bold text-naqupos-dark">
                                {isEditing ? 'Edit Payment Configuration' : 'Add Payment Configuration'}
                            </h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Branch Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Branch *</label>
                                <select
                                    value={formData.branch_id || ''}
                                    onChange={(e) => setFormData({ ...formData, branch_id: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none"
                                    disabled={isEditing}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Gateway */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Gateway</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['manual', 'midtrans', 'xendit'].map(gateway => (
                                        <button
                                            key={gateway}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, payment_gateway: gateway as any })}
                                            className={`p-3 rounded-lg border text-center transition-colors ${formData.payment_gateway === gateway ? 'border-naqupos-primary bg-naqupos-cream' : 'border-gray-200'}`}
                                        >
                                            <p className="font-medium capitalize">{gateway}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Midtrans Settings */}
                            {formData.payment_gateway === 'midtrans' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium">Midtrans Configuration</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Server Key</label>
                                            <input
                                                type={showKeys['server'] ? 'text' : 'password'}
                                                value={formData.midtrans_server_key || ''}
                                                onChange={(e) => setFormData({ ...formData, midtrans_server_key: e.target.value })}
                                                placeholder="SB-Mid-server-xxx"
                                                className="w-full px-3 py-2 rounded border border-gray-200 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Client Key</label>
                                            <input
                                                type={showKeys['client'] ? 'text' : 'password'}
                                                value={formData.midtrans_client_key || ''}
                                                onChange={(e) => setFormData({ ...formData, midtrans_client_key: e.target.value })}
                                                placeholder="SB-Mid-client-xxx"
                                                className="w-full px-3 py-2 rounded border border-gray-200 outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Merchant ID</label>
                                        <input
                                            type="text"
                                            value={formData.midtrans_merchant_id || ''}
                                            onChange={(e) => setFormData({ ...formData, midtrans_merchant_id: e.target.value })}
                                            className="w-full px-3 py-2 rounded border border-gray-200 outline-none text-sm"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.midtrans_is_production || false}
                                            onChange={(e) => setFormData({ ...formData, midtrans_is_production: e.target.checked })}
                                        />
                                        <span className="text-sm">Production Mode</span>
                                    </label>
                                </div>
                            )}

                            {/* Payment Methods */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Enabled Payment Methods</label>
                                <div className="flex flex-wrap gap-2">
                                    {['cash', 'bank_transfer', 'qris', 'credit_card', 'ewallet', 'debit_card'].map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => togglePaymentMethod(method)}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${(formData.enabled_payment_methods || []).includes(method)
                                                ? 'bg-naqupos-primary text-white border-naqupos-primary'
                                                : 'bg-white border-gray-200'}`}
                                        >
                                            {method.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bank Accounts */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">Bank Accounts</label>
                                    <button type="button" onClick={addBankAccount} className="text-sm text-naqupos-primary hover:underline">+ Add Bank</button>
                                </div>
                                {(formData.bank_accounts || []).map((bank, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={bank.bank_name}
                                            onChange={(e) => updateBankAccount(idx, 'bank_name', e.target.value)}
                                            placeholder="Bank Name"
                                            className="flex-1 px-3 py-2 rounded border border-gray-200 outline-none text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={bank.account_number}
                                            onChange={(e) => updateBankAccount(idx, 'account_number', e.target.value)}
                                            placeholder="Account Number"
                                            className="flex-1 px-3 py-2 rounded border border-gray-200 outline-none text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={bank.account_holder}
                                            onChange={(e) => updateBankAccount(idx, 'account_holder', e.target.value)}
                                            placeholder="Account Holder"
                                            className="flex-1 px-3 py-2 rounded border border-gray-200 outline-none text-sm"
                                        />
                                        <button type="button" onClick={() => removeBankAccount(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Minimum Payment (Rp)</label>
                                    <CurrencyInput
                                        value={formData.minimum_payment || 0}
                                        onChange={(val) => setFormData({ ...formData, minimum_payment: val })}
                                        className="text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Down Payment (%)</label>
                                    <input
                                        type="number"
                                        value={formData.down_payment_percentage || 0}
                                        onChange={(e) => setFormData({ ...formData, down_payment_percentage: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded border border-gray-200 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active || false}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                    <span className="text-sm">Active</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.auto_confirm_payment || false}
                                        onChange={(e) => setFormData({ ...formData, auto_confirm_payment: e.target.checked })}
                                    />
                                    <span className="text-sm">Auto Confirm Payment</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex gap-3">
                            {formData.payment_gateway !== 'manual' && (
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testingConnection}
                                    className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2"
                                >
                                    {testingConnection ? <Loader size={16} className="animate-spin" /> : <TestTube size={16} />}
                                    Test Connection
                                </button>
                            )}
                            <button onClick={closeModals} className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={isProcessing || !formData.branch_id}
                                className={`flex-1 py-2 rounded-lg font-medium ${isProcessing || !formData.branch_id ? 'bg-gray-200 text-gray-400' : 'bg-naqupos-primary text-white hover:bg-naqupos-accent'}`}
                            >
                                {isProcessing ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedConfig && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl  font-bold text-naqupos-dark">Delete Configuration</h3>
                            <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 flex gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-red-800">Warning!</p>
                                <p className="text-sm text-red-600">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                            <p className="font-bold text-naqupos-dark">{selectedConfig.branch?.name}</p>
                            <p className="text-sm text-gray-500 capitalize">{selectedConfig.payment_gateway} Gateway</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closeModals} className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                            <button
                                onClick={handleDelete}
                                disabled={isProcessing}
                                className={`flex-1 py-3 rounded-lg font-medium ${isProcessing ? 'bg-gray-200 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}
                            >
                                {isProcessing ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
