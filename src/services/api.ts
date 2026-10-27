/* eslint-disable @typescript-eslint/no-explicit-any */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://zafaranbe.memofy-dev.my.id/api/v1';
const WA_API_BASE = 'https://apinaqu.zafarangroupindonesia.com';
// const WA_API_BASE = import.meta.env.VITE_WA_API_URL || 'https://apicekat.zafaranspasolo.com';
export interface LoginResponse {
    message: string;
    user: any;
    token: string;
    token_type: string;
    expires_in: number;
}

export interface DashboardData {
    stats: {
        total_revenue_today: number;
        bookings_today: number;
        unpaid_bookings_today?: number;
        new_customers_today: number;
        active_therapists: number;
        total_revenue_month: number;
        total_bookings_month: number;
        pending_payments: number;
    };
    today_agenda: any[];
    room_status: any[];
    alerts: any[];
}

export interface Tax {
    id: number;
    name: string;
    percentage: number;
    locations: number[];
}

export interface Branch {
    id: number;
    name: string;
    code: string;
    address: string;
    phone: string;
    city: string;
    province: string;
    latitude: number;
    longitude: number;
    opening_time: string;
    closing_time: string;
    operating_days: string[];
    use_specific_operating_hours?: boolean;
    is_active: boolean;
    bookings_count?: number;
    facilities?: Facility[];
    // Aggregates
    therapists_count?: number;
    rooms_count?: number;
}

export interface Facility {
    id: number;
    name: string;
    icon?: string;
    branch_id?: number;
    is_global: boolean;
    branch?: Branch;
}

export interface BankAccount {
    id: number;
    bank_name: string;
    account_number: string;
    account_name: string;
    branch?: string;
    branch_id?: number;
}

export interface ClosedDate {
    id?: number;
    name: string;
    start_date: string;
    end_date: string;
    reason?: string;
    branch_id?: number;
}

export interface Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
    user_count?: number;
    created_at?: string;
    updated_at?: string;
}



export class ApiError extends Error {
    status: number;
    errors?: Record<string, string[] | string>;
    constructor(message: string, status: number, errors?: Record<string, string[] | string>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}

export function getAuthToken(): string {
    const authData = localStorage.getItem('naqupos_admin_auth');
    if (!authData) return '';
    try {
        const parsed = JSON.parse(authData);
        return parsed?.token || '';
    } catch (e) {
        console.error('Failed to parse auth token', e);
        return '';
    }
}

function handleUnauthorized() {
    localStorage.removeItem('naqupos_admin_auth');
    localStorage.removeItem('naqupos_selected_branch');
    if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }
}

async function readBody(response: Response): Promise<any> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers,
    });

    // Handle 401 Unauthorized - auto logout
    if (response.status === 401) {
        handleUnauthorized();
        throw new ApiError('Unauthorized', 401);
    }

    const data = await readBody(response);

    if (!response.ok) {
        // Extract the most specific error message available
        const payload = data && typeof data === 'object' ? data : {};
        let errMsg = payload.message || payload.error || `API request failed (${response.status})`;
        if (payload.errors) {
            const firstField = Object.values(payload.errors)[0];
            if (Array.isArray(firstField) && firstField.length > 0) {
                errMsg = firstField[0] as string;
            } else if (typeof firstField === 'string') {
                errMsg = firstField;
            }
        }
        throw new ApiError(errMsg, response.status, payload.errors);
    }

    return data;
}


// ============================================
// WhatsApp Templates (apinaqu endpoint)
// ============================================

// ============================================
// WhatsApp Templates (apicekat wrapper)
// ============================================


async function fetchWaApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${WA_API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await readBody(response);

  if (!response.ok) {
    const payload = data && typeof data === 'object' ? data : {};
    throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
  }

  return data;
}

export const waApi = {
  // GET /templates?status=APPROVED
  getTemplates: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return fetchWaApi<any>(`/templates${qs}`);
  },

  // POST /templates — multipart, tidak pakai fetchWaApi
//   createTemplate: (data: {
//     name: string;
//     category: string;
//     language: string;
//     components: any[];
//   }) => {
//     const bodyComp    = data.components.find((c: any) => c.type === 'BODY');
//     const bodyText    = bodyComp?.text || '';
//     const bodyExample = bodyComp?.example?.body_text?.[0] || [];

//     const form = new FormData();
//     form.append('name',     data.name.toLowerCase().replace(/\s+/g, '_'));
//     form.append('category', data.category);
//     form.append('language', data.language);
//     form.append('body',     bodyText);
//     form.append('inbox_id', import.meta.env.VITE_CEKAT_INBOX_ID || '');
//     if (bodyExample.length > 0) {
//       form.append('body_placeholder', JSON.stringify(bodyExample));
//     }

//     return fetch(`${WA_API_BASE}/templates`, { method: 'POST', body: form })
//       .then(r => r.json())
//       .then(j => { if (!j.success && j.error) throw j; return j; });
//   },

//   // PUT /templates/:id — multipart
//   editTemplate: (templateId: string, components: any[]) => {
//     const bodyComp    = components.find((c: any) => c.type === 'BODY');
//     const bodyText    = bodyComp?.text || '';
//     const bodyExample = bodyComp?.example?.body_text?.[0] || [];

//     const form = new FormData();
//     form.append('body', bodyText);
//     if (bodyExample.length > 0) {
//       form.append('body_placeholder', JSON.stringify(bodyExample));
//     }

//     return fetch(`${WA_API_BASE}/templates/${templateId}`, { method: 'PUT', body: form })
//       .then(r => r.json())
//       .then(j => { if (!j.success && j.error) throw j; return j; });
//   },


createTemplate: (data: {
  name: string;
  category: string;
  language: string;
  components: any[];
}) => {
  return fetchWaApi<any>('/templates', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name.toLowerCase().replace(/\s+/g, '_'),
      category: data.category,
      language: data.language,
      components: data.components,
    }),
  });
},

editTemplate: (templateId: string, components: any[]) => {
  return fetchWaApi<any>(`/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify({ components }),
  });
},
  // DELETE /templates/:name
  deleteTemplate: (templateName: string) =>
    fetchWaApi<any>(`/templates/${templateName}`, { method: 'DELETE' }),

  // GET /notif-settings
  getNotifSettings: () => fetchWaApi<any>('/notif-settings'),

  // POST /notif-settings
  saveNotifSettings: (settings: Record<string, any>) =>
    fetchWaApi<any>('/notif-settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),
};



const buildQueryString = (params?: any) => {
    if (!params) return '';
    const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) =>
            v != null && v !== '' && v !== 'undefined' && v !== undefined && v !== 'null'
        )
    );
    const queryString = new URLSearchParams(filtered as any).toString();
    return queryString ? `?${queryString}` : '';
};

export const api = {
    // Generic Get
    get: (url: string) => fetchJson<any>(url),

    // Auth
    login: (credentials: any) => fetchJson<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
    }),

    downloadFile: async (path: string, filename: string) => {
        const token = getAuthToken();
        const response = await fetch(`${BASE_URL}${path}`, {
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });
        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) throw new ApiError('Download failed', response.status);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    post: (url: string, data: any) => fetchJson<any>(url, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    put: (url: string, data: any) => fetchJson<any>(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    delete: (url: string) => fetchJson<any>(url, {
        method: 'DELETE'
    }),

    // Dashboard
    getDashboard: (branchId?: number) => fetchJson<DashboardData>(`/admin/dashboard${branchId ? '?branch_id=' + branchId : ''}`),
    getDashboardCharts: (period: string = 'week', branchId?: number) => fetchJson<any>(`/admin/dashboard/charts?period=${period}${branchId ? '&branch_id=' + branchId : ''}`),

    // Facilities
    getFacilities: (params?: any) => fetchJson<Facility[]>(`/admin/facilities${buildQueryString(params)}`),
    createFacility: (data: Partial<Facility>) => fetchJson<Facility>('/admin/facilities', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateFacility: (id: number, data: Partial<Facility>) => fetchJson<Facility>(`/admin/facilities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteFacility: (id: number) => fetchJson<{ message: string }>(`/admin/facilities/${id}`, {
        method: 'DELETE'
    }),

    // Branches
    getBranches: () => fetchJson<Branch[]>('/admin/branches'),
    createBranch: (data: Partial<Branch>) => fetchJson<{ message: string, branch: Branch }>('/admin/branches', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateBranch: (id: number, data: Partial<Branch>) => fetchJson<{ message: string, branch: Branch }>(`/admin/branches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteBranch: (id: number) => fetchJson<{ message: string }>(`/admin/branches/${id}`, {
        method: 'DELETE'
    }),
    updateBranchFacilities: (id: number, facilityIds: number[]) => fetchJson<any>(`/admin/branches/${id}/facilities`, {
        method: 'POST',
        body: JSON.stringify({ facility_ids: facilityIds })
    }),

    // Bookings
    getBookings: (params?: any) => fetchJson<any>(`/admin/bookings${buildQueryString(params)}`),
    getBooking: (id: number) => fetchJson<any>(`/admin/bookings/${id}`),
    createBooking: (data: any) => fetchJson<any>('/admin/bookings', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateBooking: (id: number, data: any) => fetchJson<any>(`/admin/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    updateBookingStatus: (id: number, data: any) => fetchJson<any>(`/admin/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    rescheduleBooking: (id: number, data: any) => fetchJson<any>(`/admin/bookings/${id}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    processRefund: (id: number, data: any) => fetchJson<any>(`/admin/bookings/${id}/refund`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteBooking: (id: number) => fetchJson<any>(`/admin/bookings/${id}`, {
        method: 'DELETE'
    }),
    cancelBookingItem: (id: number, itemId: number) => fetchJson<any>(`/admin/bookings/${id}/items/${itemId}/cancel`, {
        method: 'POST'
    }),
    rescheduleBookingItem: (id: number, itemId: number, data: any) => fetchJson<any>(`/admin/bookings/${id}/items/${itemId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    completeBookingItem: (id: number, itemId: number) => fetchJson<any>(`/admin/bookings/${id}/items/${itemId}/complete`, {
        method: 'POST'
    }),
    refundBookingItem: (id: number, itemId: number, data: any) => fetchJson<any>(`/admin/bookings/${id}/items/${itemId}/refund`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getBookingAgendaLogs: (id: number) => fetchJson<any>(`/admin/bookings/${id}/agenda-logs`),

    // Commissions
    getCommissions: (params?: any) => fetchJson<any>(`/admin/commissions${buildQueryString(params)}`),
    updateCommission: (id: number, data: any) => fetchJson<any>(`/admin/commissions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Calendar
    getCalendar: (params?: any) => fetchJson<any>(`/admin/calendar${buildQueryString(params)}`),
    getTherapistSchedule: (params?: any) => fetchJson<any>(`/admin/calendar/therapists${buildQueryString(params)}`),
    getCalendarSettings: (branchId?: number) => fetchJson<any>(`/admin/calendar/settings${branchId ? '?branch_id=' + branchId : ''}`),
    updateCalendarSettings: (data: any) => fetchJson<any>('/admin/calendar/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Notifications
    getNotificationSettings: () => fetchJson<any>('/admin/notifications/settings'),
    updateNotificationSettings: (data: any) => fetchJson<any>('/admin/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Company Settings
    getCompanySettings: (branchId?: number) => fetchJson<any>(`/admin/company/settings${branchId ? '?branch_id=' + branchId : ''}`),
    updateCompanySettings: (data: any) => fetchJson<any>('/admin/company/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    updateIntervalSettings: (data: any) => fetchJson<any>('/admin/company/intervals', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Queue Settings
    getQueueSettings: () => fetchJson<any>('/admin/queue/settings'),
    updateQueueSettings: (data: any) => fetchJson<any>('/admin/queue/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

getInvoiceSettings: (branchId?: number) => 
    fetchJson<any>(`/admin/invoice/settings${branchId ? '?branch_id=' + branchId : ''}`),
    updateInvoiceSettings: (data: any) => fetchJson<any>('/admin/invoice/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    uploadInvoiceLogo: async (branchId: number, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('branch_id', branchId.toString());

    const token = getAuthToken();

    const response = await fetch(`${BASE_URL}/admin/invoice/logo`, {
        method: 'POST',
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData
    });

    if (response.status === 401) {
        handleUnauthorized();
        throw new ApiError('Unauthorized', 401);
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Upload logo gagal');
    }

    return response.json().catch(() => null);
},

    // Closed Dates
    getClosedDates: (params?: any) => fetchJson<any>(`/admin/closed-dates${buildQueryString(params)}`),
    createClosedDate: (data: any) => fetchJson<any>('/admin/closed-dates', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteClosedDate: (id: number) => fetchJson<any>(`/admin/closed-dates/${id}`, {
        method: 'DELETE'
    }),

    // Taxes
    getTaxes: () => fetchJson<any[]>('/admin/taxes'),
    createTax: (data: any) => fetchJson<any>('/admin/taxes', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTax: (id: number, data: any) => fetchJson<any>(`/admin/taxes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteTax: (id: number) => fetchJson<any>(`/admin/taxes/${id}`, {
        method: 'DELETE'
    }),

    // Discounts
    getDiscountTypes: () => fetchJson<any[]>('/admin/discounts'),
    createDiscountType: (data: any) => fetchJson<any>('/admin/discounts', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateDiscountType: (id: number, data: any) => fetchJson<any>(`/admin/discounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteDiscountType: (id: number) => fetchJson<any>(`/admin/discounts/${id}`, {
        method: 'DELETE'
    }),

    // Cancellation Reasons
    getCancellationReasons: () => fetchJson<any[]>('/admin/cancellation-reasons'),
    createCancellationReason: (data: any) => fetchJson<any>('/admin/cancellation-reasons', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateCancellationReason: (id: number, data: any) => fetchJson<any>(`/admin/cancellation-reasons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteCancellationReason: (id: number) => fetchJson<any>(`/admin/cancellation-reasons/${id}`, {
        method: 'DELETE'
    }),

    // Loyalty Settings
    getLoyaltySettings: () => fetchJson<any>('/admin/loyalty/settings'),
    updateLoyaltySettings: (data: any) => fetchJson<any>('/admin/loyalty/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Customers
    getCustomers: (params?: any) => fetchJson<any>(`/admin/customers${buildQueryString(params)}`),
    getCustomer: (id: number) => fetchJson<any>(`/admin/customers/${id}`),
    createCustomer: (data: any) => fetchJson<any>('/admin/customers', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateCustomer: (id: number, data: any) => fetchJson<any>(`/admin/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteCustomer: (id: number) => fetchJson<any>(`/admin/customers/${id}`, {
        method: 'DELETE'
    }),
    // Previously missing: "Tambah Poin" faked success with a local-only update
    adjustCustomerPoints: (id: number, points: number, reason?: string) => fetchJson<any>(`/admin/customers/${id}/points`, {
        method: 'POST',
        body: JSON.stringify({ points, reason: reason || 'Penyesuaian manual admin' })
    }),
    getCustomerHistory: (id: number) => fetchJson<any>(`/admin/customers/${id}/history`),
    // Alias: previously called but never defined (crashed with TypeError at runtime)
    getCustomerVisitHistory: (id: number) => fetchJson<any>(`/admin/customers/${id}/history`),

    // Therapists/Staff
    getTherapists: (params?: any) => fetchJson<any>(`/admin/therapists${buildQueryString(params)}`),
    getTherapist: (id: number) => fetchJson<any>(`/admin/therapists/${id}`),
    createTherapist: (data: any) => fetchJson<any>('/admin/therapists', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTherapist: (id: number, data: any) => fetchJson<any>(`/admin/therapists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteTherapist: (id: number) => fetchJson<any>(`/admin/therapists/${id}`, {
        method: 'DELETE'
    }),
    getTherapistSchedules: (id: number) => fetchJson<any>(`/admin/therapists/${id}/schedules`),
    createTherapistSchedule: (id: number, data: any) => fetchJson<any>(`/admin/therapists/${id}/schedules`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTherapistSchedule: (scheduleId: number, data: any) => fetchJson<any>(`/admin/therapists/schedules/${scheduleId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteTherapistSchedule: (scheduleId: number, params?: { date?: string }) => fetchJson<any>(`/admin/therapists/schedules/${scheduleId}${buildQueryString(params)}`, {
        method: 'DELETE'
    }),
    uploadTherapistPhoto: async (id: number, file: File) => {
        const formData = new FormData();
        formData.append('photo', file);

        const token = getAuthToken();

        const response = await fetch(`${BASE_URL}/admin/therapists/${id}/photo`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Upload failed');
        }

        return response.json().catch(() => null);
    },
    getTherapistCommissions: (id: number) => fetchJson<any>(`/admin/therapists/${id}/commissions`),
    saveTherapistCommissions: (id: number, data: any) => fetchJson<any>(`/admin/therapists/${id}/commissions`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getAvailableTherapists: (params?: any) => fetchJson<any>(`/cashier/therapists/available${buildQueryString(params)}`),

    // Services
    getServices: (params?: any) => fetchJson<any>(`/admin/services${buildQueryString(params)}`),
    
    getService: (id: number) => fetchJson<any>(`/admin/services/${id}`),
    createService: (data: any) => fetchJson<any>('/admin/services', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateService: (id: number, data: any) => fetchJson<any>(`/admin/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteService: (id: number) => fetchJson<any>(`/admin/services/${id}`, {
        method: 'DELETE'
    }),
    uploadServiceImage: async (id: number, file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        const token = getAuthToken();
        const response = await fetch(`${BASE_URL}/admin/services/${id}/image`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData
        });
        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Upload failed');
        }
        return response.json().catch(() => null);
    },
    reorderServices: (services: { id: number, position: number }[]) => fetchJson<any>('/admin/services/reorder', {
        method: 'POST',
        body: JSON.stringify({ services })
    }),
    getFeaturedServices: (params?: any) => fetchJson<any>(`/admin/services/featured${buildQueryString(params)}`),
updateFeaturedServices: (data: { services: { id: number; is_featured: boolean; featured_order: number }[] }) => 
    fetchJson<any>('/admin/services/featured', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateServiceVariant: (id: number, data: any) => fetchJson<any>(`/admin/services/variants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    getServicePriceLogs: (params?: any) => fetchJson<any>(`/admin/services/price-logs${buildQueryString(params)}`),
    getServicePriceLogsById: (id: number) => fetchJson<any>(`/admin/services/${id}/price-logs`),

    // Rooms
    getRooms: (params?: any) => fetchJson<any>(`/admin/rooms${buildQueryString(params)}`),
    getRoom: (id: number) => fetchJson<any>(`/admin/rooms/${id}`),
    createRoom: (data: any) => fetchJson<any>('/admin/rooms', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateRoom: (id: number, data: any) => fetchJson<any>(`/admin/rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    getRoomBlocks: (id: number, params?: any) => fetchJson<any>(`/admin/rooms/${id}/blocks${buildQueryString(params)}`),
    createRoomBlock: (id: number, data: any) => fetchJson<any>(`/admin/rooms/${id}/blocks`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteRoomBlock: (roomId: number, blockId: number) => fetchJson<any>(`/admin/rooms/${roomId}/blocks/${blockId}`, {
        method: 'DELETE'
    }),
    deleteRoom: (id: number) => fetchJson<any>(`/admin/rooms/${id}`, {
        method: 'DELETE'
    }),

    // Service Categories
    getServiceCategories: () => fetchJson<any[]>('/admin/services/categories'),
    createServiceCategory: (data: any) => fetchJson<any>('/admin/services/categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateServiceCategory: (id: number, data: any) => fetchJson<any>(`/admin/services/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteServiceCategory: (id: number) => fetchJson<any>(`/admin/services/categories/${id}`, {
        method: 'DELETE'
    }),
    uploadServiceCategoryImage: async (id: number, file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        const token = getAuthToken();
        const response = await fetch(`${BASE_URL}/admin/services/categories/${id}/image`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData
        });
        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Upload failed');
        }
        return response.json().catch(() => null);
    },
    reorderServiceCategories: (categories: { id: number, position: number }[]) => fetchJson<any>('/admin/services/categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ categories })
    }),

    // Banners
    getBanners: (params?: any) => fetchJson<any>(`/admin/banners${buildQueryString(params)}`),
    getBanner: (id: number) => fetchJson<any>(`/admin/banners/${id}`),
    createBanner: (data: any) => fetchJson<any>('/admin/banners', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateBanner: (id: number, data: any) => fetchJson<any>(`/admin/banners/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteBanner: (id: number) => fetchJson<any>(`/admin/banners/${id}`, {
        method: 'DELETE'
    }),
    uploadBannerImage: async (id: number, file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        const token = getAuthToken();
        const response = await fetch(`${BASE_URL}/admin/banners/${id}/image`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: formData
        });
        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Upload failed');
        }
        return response.json().catch(() => null);
    },
    reorderBanners: (ids: number[]) => fetchJson<any>('/admin/banners/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids })
    }),

    // Reports
    getRevenueReport: (params?: any) => fetchJson<any>(`/admin/reports/revenue${buildQueryString(params)}`),
    getProfitLossReport: (params?: any) => fetchJson<any>(`/admin/reports/profit-loss${buildQueryString(params)}`),
    getBookingsReport: (params?: any) => fetchJson<any>(`/admin/reports/bookings${buildQueryString(params)}`),
    getTherapistPerformanceReport: (params?: any) => fetchJson<any>(`/admin/reports/therapist-performance${buildQueryString(params)}`),
    getPopularServicesReport: (params?: any) => fetchJson<any>(`/admin/reports/popular-services${buildQueryString(params)}`),
    getFinancialSummary: (params?: any) => fetchJson<any>(`/admin/reports/financial-summary${buildQueryString(params)}`),
    getTaxSummary: (params?: any) => fetchJson<any>(`/admin/reports/tax-summary${buildQueryString(params)}`),
    getPaymentSummary: (params?: any) => fetchJson<any>(`/admin/reports/payment-summary${buildQueryString(params)}`),
    getPaymentLog: (params?: any) => fetchJson<any>(`/admin/reports/payment-log${buildQueryString(params)}`),
    getTipsSummary: (params?: any) => fetchJson<any>(`/admin/reports/tips-summary${buildQueryString(params)}`),
    getDiscountSummary: (params?: any) => fetchJson<any>(`/admin/reports/discount-summary${buildQueryString(params)}`),
    getUnsettledInvoices: (params?: any) => fetchJson<any>(`/admin/reports/unsettled-invoices${buildQueryString(params)}`),
    getCashRegisterMovement: (params?: any) => fetchJson<any>(`/admin/reports/cash-register-movement${buildQueryString(params)}`),
    getSalesProfitLoss: (params?: any) => fetchJson<any>(`/admin/reports/sales-profit-loss${buildQueryString(params)}`),
    getCashFlow: (params?: any) => fetchJson<any>(`/admin/reports/cash-flow${buildQueryString(params)}`),
    getDPReport: (params?: any) => fetchJson<any>(`/admin/reports/dp-report${buildQueryString(params)}`),

    // Sales Reports (Laporan Penjualan)
    getSalesItem: (params?: any) => fetchJson<any>(`/admin/reports/sales/item${buildQueryString(params)}`),
    getSalesByItem: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-item${buildQueryString(params)}`),
    getSalesByItemDetail: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-item-detail${buildQueryString(params)}`),
    getSalesByType: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-type${buildQueryString(params)}`),
    getSalesByService: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-service${buildQueryString(params)}`),
    getSalesByProduct: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-product${buildQueryString(params)}`),
    getSalesByLocation: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-location${buildQueryString(params)}`),
    getSalesByChannel: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-channel${buildQueryString(params)}`),
    getSalesByCustomer: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-customer${buildQueryString(params)}`),
    getSalesByStaffDetailed: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-staff-detailed${buildQueryString(params)}`),
    getSalesByStaff: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-staff${buildQueryString(params)}`),
    getSalesByHour: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-hour${buildQueryString(params)}`),
    getSalesByHourPerDay: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-hour-per-day${buildQueryString(params)}`),
    getSalesPerDay: (params?: any) => fetchJson<any>(`/admin/reports/sales/per-day${buildQueryString(params)}`),
    getSalesPerMonth: (params?: any) => fetchJson<any>(`/admin/reports/sales/per-month${buildQueryString(params)}`),
    getSalesPerQuarter: (params?: any) => fetchJson<any>(`/admin/reports/sales/per-quarter${buildQueryString(params)}`),
    getRevenuePerYear: (params?: any) => fetchJson<any>(`/admin/reports/sales/per-year${buildQueryString(params)}`),
    getSalesLog: (params?: any) => fetchJson<any>(`/admin/reports/sales/log${buildQueryString(params)}`),
    getSalesItemByDate: (params?: any) => fetchJson<any>(`/admin/reports/sales/item-by-date${buildQueryString(params)}`),
    getSalesByServicePackage: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-service-package${buildQueryString(params)}`),
    getSalesByCategory: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-category${buildQueryString(params)}`),
    getSalesByServiceVariant: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-service-variant${buildQueryString(params)}`),
    getSalesByProductVariant: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-product-variant${buildQueryString(params)}`),
    getSalesRefund: (params?: any) => fetchJson<any>(`/admin/reports/sales/refund${buildQueryString(params)}`),
    getSalesCancelled: (params?: any) => fetchJson<any>(`/admin/reports/sales/cancelled${buildQueryString(params)}`),
    getSalesByServiceDetailed: (params?: any) => fetchJson<any>(`/admin/reports/sales/by-service-detailed${buildQueryString(params)}`),

    // Product Management (Inventory)
    getProducts: (params?: any) => fetchJson<any>(`/admin/products${buildQueryString(params)}`),
    getProduct: (id: number) => fetchJson<any>(`/admin/products/${id}`),
    createProduct: (data: any) => fetchJson<any>('/admin/products', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateProduct: (id: number, data: any) => fetchJson<any>(`/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteProduct: (id: number) => fetchJson<any>(`/admin/products/${id}`, {
        method: 'DELETE'
    }),
    uploadProductImage: async (productId: number, formData: FormData) => {
    const token = getAuthToken();

    const response = await fetch(`${BASE_URL}/admin/products/${productId}/upload-image`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData
    });

    if (response.status === 401) {
        handleUnauthorized();
        throw new ApiError('Unauthorized', 401);
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Upload gambar gagal');
    }

    return response.json().catch(() => null);
},
    updateBrand: (data: { old_name: string, new_name: string, branch_id?: number }) => fetchJson<any>('/admin/products/update-brand', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteBrand: (name: string) => fetchJson<any>('/admin/products/delete-brand', {
        method: 'POST',
        body: JSON.stringify({ name })
    }),
    updateCategory: (data: { old_name: string, new_name: string, branch_id?: number }) => fetchJson<any>('/admin/products/update-category', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteCategory: (name: string) => fetchJson<any>('/admin/products/delete-category', {
        method: 'POST',
        body: JSON.stringify({ name })
    }),

    // Asset Management
    getAssets: (params?: any) => fetchJson<any>(`/admin/assets${buildQueryString(params)}`),
    getAsset: (id: number) => fetchJson<any>(`/admin/assets/${id}`),
    createAsset: (data: any) => fetchJson<any>('/admin/assets', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAsset: (id: number, data: any) => fetchJson<any>(`/admin/assets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteAsset: (id: number) => fetchJson<any>(`/admin/assets/${id}`, {
        method: 'DELETE'
    }),

    // Asset Categories
    getAssetCategories: () => fetchJson<any[]>('/admin/assets/categories'),
    createAssetCategory: (data: any) => fetchJson<any>('/admin/assets/categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAssetCategory: (id: number, data: any) => fetchJson<any>(`/admin/assets/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteAssetCategory: (id: number) => fetchJson<any>(`/admin/assets/categories/${id}`, {
        method: 'DELETE'
    }),

    // Brands
    getBrands: () => fetchJson<any[]>('/admin/products/brands'),
    createBrand: (data: any) => fetchJson<any>('/admin/products/brands', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateMasterBrand: (id: number, data: any) => fetchJson<any>(`/admin/products/brands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteMasterBrand: (id: number) => fetchJson<any>(`/admin/products/brands/${id}`, {
        method: 'DELETE'
    }),

    // Categories
    getCategories: () => fetchJson<any[]>('/admin/products/categories'),
    createCategory: (data: any) => fetchJson<any>('/admin/products/categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateMasterCategory: (id: number, data: any) => fetchJson<any>(`/admin/products/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteMasterCategory: (id: number) => fetchJson<any>(`/admin/products/categories/${id}`, {
        method: 'DELETE'
    }),

    // Suppliers
    getSuppliers: (params?: any) => fetchJson<any>(`/admin/suppliers${buildQueryString(params)}`),
    createSupplier: (data: any) => fetchJson<any>('/admin/suppliers', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateSupplier: (id: number, data: any) => fetchJson<any>(`/admin/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteSupplier: (id: number) => fetchJson<any>(`/admin/suppliers/${id}`, {
        method: 'DELETE'
    }),

    // Stock Movements
    getStockMovements: (params?: any) => fetchJson<any>(`/admin/stock-movements${buildQueryString(params)}`),
    createStockMovement: (data: any) => fetchJson<any>('/admin/stock-movements', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Inventory Reports (Laporan Inventori)
    getCurrentStock: (params?: any) => fetchJson<any>(`/admin/reports/inventory/current-stock${buildQueryString(params)}`),
    getProductPerformance: (params?: any) => fetchJson<any>(`/admin/reports/inventory/product-performance${buildQueryString(params)}`),
    getStockMovementLog: (params?: any) => fetchJson<any>(`/admin/reports/inventory/stock-movement-log${buildQueryString(params)}`),
    getStockCalculation: (params?: any) => fetchJson<any>(`/admin/reports/inventory/stock-calculation${buildQueryString(params)}`),
    getProductConsumption: (params?: any) => fetchJson<any>(`/admin/reports/inventory/product-consumption${buildQueryString(params)}`),
    getProductConsumptionDetail: (productId: number, params?: any) => fetchJson<any>(`/admin/reports/inventory/product-consumption/${productId}${buildQueryString(params)}`),

    // Voucher Reports (Laporan Voucher)
    getVoucherRemainingBalance: (params?: any) => fetchJson<any>(`/admin/reports/voucher/remaining-balance${buildQueryString(params)}`),
    getVoucherSales: (params?: any) => fetchJson<any>(`/admin/reports/voucher/sales${buildQueryString(params)}`),
    getVoucherUsage: (params?: any) => fetchJson<any>(`/admin/reports/voucher/usage${buildQueryString(params)}`),
    getVoucherPromoCodes: (params?: any) => fetchJson<any>(`/admin/reports/voucher/promo-codes${buildQueryString(params)}`),
    getVoucherPromoRedemption: (params?: any) => fetchJson<any>(`/admin/reports/voucher/promo-redemption${buildQueryString(params)}`),
    getVoucherFreeProductRedemption: (params?: any) => fetchJson<any>(`/admin/reports/voucher/free-product-redemption${buildQueryString(params)}`),
    getVoucherMembershipExpiry: (params?: any) => fetchJson<any>(`/admin/reports/voucher/membership-expiry${buildQueryString(params)}`),

    // Staff Reports
    getStaffAttendance: (params?: any) => fetchJson<any>(`/admin/reports/staff/attendance${buildQueryString(params)}`),
    getStaffTips: (params?: any) => fetchJson<any>(`/admin/reports/staff/tips${buildQueryString(params)}`),
    getStaffCommissionSummary: (params?: any) => fetchJson<any>(`/admin/reports/staff/commission-summary${buildQueryString(params)}`),
    getStaffCommissionDetailed: (params?: any) => fetchJson<any>(`/admin/reports/staff/commission-detailed${buildQueryString(params)}`),
    getStaffCommissionItemGroup: (params?: any) => fetchJson<any>(`/admin/reports/staff/commission-item-group${buildQueryString(params)}`),

    // Agenda Reports
    getAgendaKalkulasi: (params?: any) => fetchJson<any>(`/admin/reports/agenda/kalkulasi${buildQueryString(params)}`),
    getAgendaPembatalan: (params?: any) => fetchJson<any>(`/admin/reports/agenda/pembatalan${buildQueryString(params)}`),
    getAgendaDetail: (params?: any) => fetchJson<any>(`/admin/reports/agenda/detail${buildQueryString(params)}`),

    // Customer Reports
    getCustomerList: (params?: any) => fetchJson<any>(`/admin/reports/customer/list${buildQueryString(params)}`),
    getCustomerRetention: (params?: any) => fetchJson<any>(`/admin/reports/customer/retention${buildQueryString(params)}`),

    // Loyalty Reports
    getLoyaltyFreeItems: (params?: any) => fetchJson<any>(`/admin/reports/loyalty/free-items${buildQueryString(params)}`),
    getLoyaltyAvailablePoints: (params?: any) => fetchJson<any>(`/admin/reports/loyalty/available-points${buildQueryString(params)}`),
    getLoyaltyDiscounts: (params?: any) => fetchJson<any>(`/admin/reports/loyalty/discounts${buildQueryString(params)}`),

    // New Loyalty Management
    getLoyaltyTransactions: (params?: any) => fetchJson<any>(`/admin/loyalty/transactions${buildQueryString(params)}`),
    getLoyaltyMembers: (params?: any) => fetchJson<any>(`/admin/loyalty/members${buildQueryString(params)}`),
    getLoyaltyStats: (params?: any) => fetchJson<any>(`/admin/loyalty/stats${buildQueryString(params)}`),


    // Feedbacks
    getFeedbacks: (params?: any) => fetchJson<any>(`/admin/feedbacks${buildQueryString(params)}`),
    replyFeedback: (id: number, data: any) => fetchJson<any>(`/admin/feedbacks/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Users (Admin/Cashier Management)
    getUsers: (params?: any) => fetchJson<any>(`/admin/users${buildQueryString(params)}`),
    getUser: (id: number) => fetchJson<any>(`/admin/users/${id}`),
    createUser: (data: any) => fetchJson<any>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateUser: (id: number, data: any) => fetchJson<any>(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteUser: (id: number) => fetchJson<any>(`/admin/users/${id}`, {
        method: 'DELETE'
    }),
    getAvailableStaff: () => fetchJson<any[]>('/admin/users/available-staff'),

    // Payment Configuration (Admin only)
    getPaymentConfig: (params?: any) => fetchJson<any>(`/payment-configs${buildQueryString(params)}`),
    getPaymentConfigs: () => fetchJson<any>('/admin/payment-configs'),
    getPaymentConfigByBranch: (branchId: number) => fetchJson<any>(`/admin/payment-configs/branch/${branchId}`),
    createPaymentConfig: (data: any) => fetchJson<any>('/admin/payment-configs', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updatePaymentConfig: (id: number, data: any) => fetchJson<any>(`/admin/payment-configs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deletePaymentConfig: (id: number) => fetchJson<any>(`/admin/payment-configs/${id}`, {
        method: 'DELETE'
    }),
    testPaymentConnection: (data: any) => fetchJson<any>('/admin/payment-configs/test-connection', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Payment - Invoice lookup (public, used for payment success/callback page)
    getInvoiceByNumber: (invoiceNumber: string) => fetchJson<any>(`/payment/invoice/${invoiceNumber}`),
    checkPaymentStatus: (invoiceNumber: string) => fetchJson<any>(`/payment/status/${invoiceNumber}`),

    // Marketing - Promos/Vouchers
    getPromos: (params?: any) => fetchJson<any>(`/admin/promos${buildQueryString(params)}`),
    getPromo: (id: number) => fetchJson<any>(`/admin/promos/${id}`),
    createPromo: (data: any) => fetchJson<any>('/admin/promos', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updatePromo: (id: number, data: any) => fetchJson<any>(`/admin/promos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deletePromo: (id: number) => fetchJson<any>(`/admin/promos/${id}`, {
        method: 'DELETE'
    }),
    togglePromoFeatured: (id: number, isFeatured: boolean) => fetchJson<any>(`/admin/promos/${id}/featured`, {
        method: 'PUT',
        body: JSON.stringify({ is_featured: isFeatured })
    }),
    validatePromoCode: (code: string) => fetchJson<any>('/admin/promos/validate', {
        method: 'POST',
        body: JSON.stringify({ code })
    }),

    // Marketing - News Categories
    getNewsCategories: () => fetchJson<any[]>('/admin/news-categories'),
    createNewsCategory: (data: any) => fetchJson<any>('/admin/news-categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateNewsCategory: (id: number, data: any) => fetchJson<any>(`/admin/news-categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteNewsCategory: (id: number) => fetchJson<any>(`/admin/news-categories/${id}`, {
        method: 'DELETE'
    }),

    // Marketing - News/Articles
    getNews: (params?: any) => fetchJson<any>(`/admin/news${buildQueryString(params)}`),
    getNewsItem: (id: number) => fetchJson<any>(`/admin/news/${id}`),
    createNews: (data: any) => fetchJson<any>('/admin/news', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateNews: (id: number, data: any) => fetchJson<any>(`/admin/news/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteNews: (id: number) => fetchJson<any>(`/admin/news/${id}`, {
        method: 'DELETE'
    }),

    // Marketing - Campaign Types
    getCampaignTypes: () => fetchJson<any[]>('/admin/campaign-types'),
    createCampaignType: (data: { name: string }) => fetchJson<any>('/admin/campaign-types', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateCampaignType: (id: number, data: { name: string }) => fetchJson<any>(`/admin/campaign-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteCampaignType: (id: number) => fetchJson<any>(`/admin/campaign-types/${id}`, {
        method: 'DELETE'
    }),

    createNewsWithImage: async (formData: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${BASE_URL}/admin/news`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: formData
    });
    if (response.status === 401) {
        handleUnauthorized();
        throw new ApiError('Unauthorized', 401);
    }
    if (!response.ok) throw new Error('Gagal membuat artikel');
    return response.json().catch(() => null);
},

updateNewsWithImage: async (id: number, formData: FormData) => {
    const token = getAuthToken();
    formData.append('_method', 'PUT');
    const response = await fetch(`${BASE_URL}/admin/news/${id}`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: formData
    });
    if (response.status === 401) {
        handleUnauthorized();
        throw new ApiError('Unauthorized', 401);
    }
    if (!response.ok) throw new Error('Gagal update artikel');
    return response.json().catch(() => null);
},


    // Marketing - Campaigns
    getCampaigns: (params?: any) => fetchJson<any>(`/admin/campaigns${buildQueryString(params)}`),
    getCampaign: (id: number) => fetchJson<any>(`/admin/campaigns/${id}`),
    createCampaign: (data: any) => fetchJson<any>('/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateCampaign: (id: number, data: any) => fetchJson<any>(`/admin/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteCampaign: (id: number) => fetchJson<any>(`/admin/campaigns/${id}`, {
        method: 'DELETE'
    }),
    toggleCampaignStatus: (id: number) => fetchJson<any>(`/admin/campaigns/${id}/toggle-status`, {
        method: 'POST'
    }),
    previewAudience: (params?: any) => fetchJson<any>(`/admin/campaigns/preview-audience${buildQueryString(params)}`),
    uploadCampaignImage: async (id: number, file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        const token = getAuthToken();

        const response = await fetch(`${BASE_URL}/admin/campaigns/${id}/image`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Upload failed');
        }

        return response.json().catch(() => ({}));
    },

    // Marketing - Automation Rules
    getAutomations: (params?: any) => fetchJson<any>(`/admin/automations${buildQueryString(params)}`),
    getAutomation: (id: number) => fetchJson<any>(`/admin/automations/${id}`),
    createAutomation: (data: any) => fetchJson<any>('/admin/automations', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAutomation: (id: number, data: any) => fetchJson<any>(`/admin/automations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteAutomation: (id: number) => fetchJson<any>(`/admin/automations/${id}`, {
        method: 'DELETE'
    }),
    toggleAutomation: (id: number) => fetchJson<any>(`/admin/automations/${id}/toggle`, {
        method: 'POST'
    }),

    getAuditLogs: (params?: any) => fetchJson<any>(`/admin/audit-logs${buildQueryString(params)}`),
    getAuditLog: (id: number) => fetchJson<any>(`/admin/audit-logs/${id}`),
    getAuditModules: () => fetchJson<any>('/admin/audit-logs/modules'),
    getAuditUsers: () => fetchJson<any>('/admin/audit-logs/users'),
    exportAuditLogs: (params?: any) => fetchJson<any>(`/admin/audit-logs/export${buildQueryString(params)}`),

    // Shift Management
    openShift: (data: { branch_id: number, starting_cash: number }) => fetchJson<any>('/cashier/shift/clock-in', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    closeShift: (data: { ending_cash: number, notes?: string }) => fetchJson<any>('/cashier/shift/clock-out', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getCurrentShift: () => fetchJson<any>('/cashier/shift/current'),
    getShifts: (params?: any) => fetchJson<any>(`/cashier/shifts${buildQueryString(params)}`),
    updateShift: (id: number, data: any) => fetchJson<any>(`/cashier/shifts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Transactions / POS
    getTransactions: (params?: any) => fetchJson<any>(`/admin/transactions${buildQueryString(params)}`),
    createTransaction: (data: any) => fetchJson<any>('/cashier/transactions', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    initiatePayment: (data: any) => fetchJson<any>('/customer/payments/initiate', { // Reusing customer endpoint for DOKU generation
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getPaymentStatus: (paymentId: number) => fetchJson<any>(`/customer/payments/${paymentId}`),
    // Payment Methods
    getPaymentMethods: () => fetchJson<any>('/cashier/payment-methods'),
    getAllPaymentMethods: () => fetchJson<any>('/cashier/payment-methods/all'),
    createPaymentMethod: (data: any) => fetchJson<any>('/cashier/payment-methods', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updatePaymentMethod: (id: number, data: any) => fetchJson<any>(`/cashier/payment-methods/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deletePaymentMethod: (id: number) => fetchJson<any>(`/cashier/payment-methods/${id}`, {
        method: 'DELETE'
    }),
    togglePaymentMethodStatus: (id: number) => fetchJson<any>(`/cashier/payment-methods/${id}/toggle`, {
        method: 'POST'
    }),

    // Expenses (Petty Cash)
    getExpenseCategories: () => fetchJson<any>('/cashier/expenses/categories'),
    createExpenseCategory: (data: any) => fetchJson<any>('/cashier/expenses/categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateExpenseCategory: (id: number, data: any) => fetchJson<any>(`/cashier/expenses/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteExpenseCategory: (id: number) => fetchJson<any>(`/cashier/expenses/categories/${id}`, {
        method: 'DELETE'
    }),
    getExpenses: (params?: any) => fetchJson<any>(`/cashier/expenses${buildQueryString(params)}`),
    createExpense: async (data: any) => {
        const token = getAuthToken();

        const headers: any = {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };

        // Don't set Content-Type for FormData, browser will set it with boundary
        const response = await fetch(`${BASE_URL}/cashier/expenses`, {
            method: 'POST',
            headers,
            body: data // FormData object
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to create expense');
        }

        return response.json().catch(() => null);
    },
    updateExpense: async (id: number | string, data: any) => {
        const token = getAuthToken();
        const headers: any = {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };

        if (data instanceof FormData) {
            data.append('_method', 'PUT');
        }

        const response = await fetch(`${BASE_URL}/cashier/expenses/${id}`, {
            method: 'POST',
            headers,
            body: data
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update expense');
        }
        return response.json().catch(() => null);
    },
    deleteExpense: (id: number | string) => fetchJson<any>(`/cashier/expenses/${id}`, {
        method: 'DELETE'
    }),


    // Bank Deposits
    getBankDeposits: (params?: any) => fetchJson<any>(`/cashier/bank-deposits${buildQueryString(params)}`),
    createBankDeposit: async (data: any) => {
        const token = getAuthToken();

        const headers: any = {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };

        const response = await fetch(`${BASE_URL}/cashier/bank-deposits`, {
            method: 'POST',
            headers,
            body: data // FormData object
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Failed to create deposit');
        }

        return response.json().catch(() => null);
    },
    getCashBalance: (branchId: number) => fetchJson<any>(`/cashier/bank-deposits/cash-balance?branch_id=${branchId}`),
    updateCashBalance: (data: any) => fetchJson<any>('/cashier/bank-deposits/cash-balance/update', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getBankDepositStats: (params?: any) => fetchJson<any>(`/cashier/bank-deposits/stats${buildQueryString(params)}`),

    // Role Management
    getRoles: () => fetchJson<any>('/admin/roles'),
    getRole: (id: number) => fetchJson<any>(`/admin/roles/${id}`),
    createRole: (data: any) => fetchJson<any>('/admin/roles', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateRole: (id: number, data: any) => fetchJson<any>(`/admin/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteRole: (id: number) => fetchJson<any>(`/admin/roles/${id}`, {
        method: 'DELETE'
    }),
    getPermissions: () => fetchJson<any>('/admin/roles/permissions'),
    seedDefaultRoles: () => fetchJson<any>('/admin/roles/seed-defaults', {
        method: 'POST'
    }),

    // Locations
    getProvinces: () => fetchJson<any[]>('/provinces'),
    getRegencies: (provinceId?: string) => fetchJson<any[]>(`/regencies${provinceId ? '?province_id=' + provinceId : ''}`),

    // WhatsApp Manual Triggers
    sendWhatsAppPromo: (data: { customer_id: number, service_name: string, discount_rate?: string }) => fetchJson<any>('/admin/whatsapp/promo', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    sendWhatsAppBirthday: (data: { customer_id: number, discount?: string, expiry_date?: string }) => fetchJson<any>('/admin/whatsapp/birthday', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    sendWhatsAppText: (data: { phone: string, message: string }) => fetchJson<any>('/admin/whatsapp/send-text', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Subscription Management
    getSubscriptionPlans: () => fetchJson<any>('/admin/subscriptions/plans'),
    updateSubscriptionPlans: (plans: any[]) => fetchJson<any>('/admin/subscriptions/plans', {
        method: 'PUT',
        body: JSON.stringify({ plans })
    }),
    seedSubscriptionPlans: () => fetchJson<any>('/admin/subscriptions/plans/seed', {
        method: 'POST'
    }),
    getSubscriptionStatus: () => fetchJson<any>('/admin/subscriptions/status'),
    getSubscriptionHistory: (params?: any) => fetchJson<any>(`/admin/subscriptions/history${buildQueryString(params)}`),
    subscribe: (data: { plan_key: string, interval: string, payment_method?: string, branch_id?: number }) => fetchJson<any>('/admin/subscriptions/subscribe', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    unsubscribe: (branch_id?: number) => fetchJson<any>('/admin/subscriptions/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ branch_id })
    }),
    confirmSubscriptionPayment: (subscriptionId: number) => fetchJson<any>(`/admin/subscriptions/${subscriptionId}/confirm-payment`, {
        method: 'POST'
    }),
    
};
