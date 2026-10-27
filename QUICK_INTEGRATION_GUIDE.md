# Quick Integration Guide - Naqupos Admin

## 🚀 Cara Cepat Mengintegrasikan Halaman yang Tersisa

Dokumen ini memberikan panduan step-by-step untuk mengintegrasikan halaman-halaman yang masih menggunakan mock data.

---

## 📋 Checklist Integrasi

Untuk setiap halaman, ikuti langkah berikut:

### ✅ Step 1: Import Dependencies
```typescript
// Tambahkan di bagian atas file
import { useState, useEffect } from 'react'; // Pastikan useEffect ada
import { api } from '../../services/api'; // Import API service
```

### ✅ Step 2: Hapus Mock Data
```typescript
// HAPUS atau comment out mock data seperti:
// const initialData: Type[] = [...]
```

### ✅ Step 3: Setup State
```typescript
// Tambahkan state untuk loading dan error
const [data, setData] = useState<YourType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
```

### ✅ Step 4: Load Data Function
```typescript
useEffect(() => {
    loadData();
}, []);

const loadData = async () => {
    try {
        setLoading(true);
        setError('');
        const result = await api.getYourEndpoint(); // Ganti dengan method yang sesuai
        setData(result);
    } catch (err: any) {
        setError(err.message || 'Failed to load data');
        console.error('Error loading data:', err);
    } finally {
        setLoading(false);
    }
};
```

### ✅ Step 5: Update CRUD Handlers

#### Create Handler:
```typescript
const handleCreate = async (formData: any) => {
    try {
        setIsProcessing(true);
        await api.createYourEndpoint(formData);
        await loadData(); // Refresh data
        closeModal();
    } catch (err: any) {
        alert(err.message || 'Failed to create');
        console.error('Error creating:', err);
    } finally {
        setIsProcessing(false);
    }
};
```

#### Update Handler:
```typescript
const handleUpdate = async (id: number, formData: any) => {
    try {
        setIsProcessing(true);
        await api.updateYourEndpoint(id, formData);
        await loadData();
        closeModal();
    } catch (err: any) {
        alert(err.message || 'Failed to update');
        console.error('Error updating:', err);
    } finally {
        setIsProcessing(false);
    }
};
```

#### Delete Handler:
```typescript
const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
        setIsProcessing(true);
        await api.deleteYourEndpoint(id);
        await loadData();
        closeModal();
    } catch (err: any) {
        alert(err.message || 'Failed to delete');
        console.error('Error deleting:', err);
    } finally {
        setIsProcessing(false);
    }
};
```

### ✅ Step 6: Add Loading & Error UI
```typescript
// Tambahkan SEBELUM return statement utama
if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-naqupos-primary mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading data...</p>
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
```

---

## 📝 Mapping API Methods ke Halaman

| Halaman | API Methods yang Digunakan |
|---------|----------------------------|
| **CustomersPage** | `getCustomers()`, `getCustomer(id)`, `updateCustomer(id, data)`, `deleteCustomer(id)`, `getCustomerHistory(id)` |
| **StaffPage** | `getTherapists()`, `getTherapist(id)`, `createTherapist(data)`, `updateTherapist(id, data)`, `deleteTherapist(id)`, `getTherapistSchedules(id)` |
| **BookingsPage** | `getBookings(params)`, `getBooking(id)`, `updateBookingStatus(id, data)`, `rescheduleBooking(id, data)`, `processRefund(id, data)` |
| **CalendarPage** | `getCalendar(params)`, `getTherapistSchedule(params)` |
| **BannersPage** | `getBanners()`, `getBanner(id)`, `createBanner(data)`, `updateBanner(id, data)`, `deleteBanner(id)` |
| **ReportsPage** | `getRevenueReport(params)`, `getProfitLossReport(params)`, `getBookingsReport(params)`, `getTherapistPerformanceReport(params)`, `getPopularServicesReport(params)` |
| **UserManagementPage** | `getUsers()`, `getUser(id)`, `createUser(data)`, `updateUser(id, data)`, `deleteUser(id)` |

---

## 🔍 Contoh Lengkap: CustomersPage

### Before (Mock Data):
```typescript
const initialCustomers: Customer[] = [
    { id: 1, name: 'John Doe', phone: '0812...', ... },
    // ... more mock data
];

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    
    const handleSave = async () => {
        // Mock save logic
        setCustomers(prev => [...prev, newCustomer]);
    };
    
    return (
        <div>
            {/* UI */}
        </div>
    );
}
```

### After (Real API):
```typescript
import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    useEffect(() => {
        loadCustomers();
    }, []);
    
    const loadCustomers = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await api.getCustomers();
            setCustomers(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load customers');
        } finally {
            setLoading(false);
        }
    };
    
    const handleSave = async (formData: any) => {
        try {
            setIsProcessing(true);
            if (isEditing && selectedCustomer) {
                await api.updateCustomer(selectedCustomer.id, formData);
            } else {
                // Note: Customers biasanya register sendiri via app
                // Tapi bisa juga admin add manual untuk walk-in
                await api.createCustomer(formData); // Jika ada endpoint
            }
            await loadCustomers();
            closeModal();
        } catch (err: any) {
            alert(err.message || 'Failed to save customer');
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} retry={loadCustomers} />;
    
    return (
        <div>
            {/* UI tetap sama */}
        </div>
    );
}
```

---

## ⚠️ Catatan Penting

### 1. Field Naming Convention
Backend menggunakan **snake_case**, pastikan mapping dengan benar:

```typescript
// Backend response
{
    "branch_id": 1,
    "price_per_hour": 50000,
    "therapists_count": 5
}

// Frontend interface
interface Room {
    branch_id: number;  // Gunakan snake_case untuk match API
    price_per_hour: number;
    therapists_count?: number;
}

// Atau bisa transform di frontend
interface Room {
    branchId: number;
    pricePerHour: number;
    therapistsCount?: number;
}

// Tapi harus transform saat kirim ke API
const apiData = {
    branch_id: formData.branchId,
    price_per_hour: formData.pricePerHour
};
```

### 2. Pagination (Jika Diperlukan)
Untuk data yang banyak, gunakan pagination:

```typescript
const [page, setPage] = useState(1);
const [perPage] = useState(20);

const loadData = async () => {
    try {
        const data = await api.getYourEndpoint({ 
            page, 
            per_page: perPage 
        });
        setData(data.data); // Biasanya response punya structure { data: [], meta: {} }
        setTotal(data.meta.total);
    } catch (err) {
        // handle error
    }
};
```

### 3. Search & Filter
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [filters, setFilters] = useState({});

const loadData = async () => {
    try {
        const params = {
            search: searchQuery,
            ...filters
        };
        const data = await api.getYourEndpoint(params);
        setData(data);
    } catch (err) {
        // handle error
    }
};

// Trigger reload saat search/filter berubah
useEffect(() => {
    loadData();
}, [searchQuery, filters]);
```

### 4. Debounce untuk Search
```typescript
import { useEffect, useState } from 'react';

const [searchQuery, setSearchQuery] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

// Debounce search
useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 500); // 500ms delay
    
    return () => clearTimeout(timer);
}, [searchQuery]);

// Load data saat debounced search berubah
useEffect(() => {
    loadData();
}, [debouncedSearch]);
```

---

## 🎯 Prioritas Integrasi

### HIGH Priority (Kerjakan Dulu):
1. **CustomersPage** - CRM penting untuk bisnis
2. **StaffPage** - Manage therapists
3. **BookingsPage** - Core business (KOMPLEKS!)

### MEDIUM Priority:
4. **CalendarPage** - Scheduling
5. **BannersPage** - Marketing CMS
6. **UserManagementPage** - Admin management

### LOW Priority (Bisa Nanti):
7. **ReportsPage** - Analytics
8. **MarketingPage** - Campaigns
9. **SettingsPage** - Configuration
10. **AuditLogPage** - Logging
11. **LoyaltyPage** - Loyalty program
12. **AssetsPage** - Asset management

---

## 🐛 Troubleshooting

### Error: "Unauthorized" (401)
- Pastikan sudah login
- Check apakah token masih valid
- Coba logout dan login lagi

### Error: "Network Error"
- Pastikan backend running di `localhost:8000`
- Check CORS configuration di backend
- Periksa console browser untuk detail error

### Data tidak muncul
- Check console untuk error
- Verify API endpoint di `api.ts`
- Pastikan backend mengembalikan data dengan struktur yang benar
- Check Network tab di DevTools

### TypeScript Error
- Pastikan interface match dengan response backend
- Gunakan `any` temporary jika perlu, tapi sebaiknya define proper interface
- Check field naming (snake_case vs camelCase)

---

## 📚 Resources

- **API Documentation**: Lihat `src/services/api.ts` untuk semua available methods
- **Integration Status**: Lihat `INTEGRATION_STATUS.md` untuk progress tracking
- **Backend Routes**: Lihat `naqupos-be/routes/web.php` untuk semua endpoint
- **Example**: Lihat `ServicesPage.tsx` atau `RoomsPage.tsx` untuk contoh integrasi lengkap

---

**Happy Coding! 🚀**
