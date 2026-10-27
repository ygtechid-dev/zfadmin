export interface ServiceVariant {
    id?: number;
    name: string;
    duration: number;
    price: number;
    special_price?: number;
    capital_price?: number;
    selected_products?: string[];
    is_active?: boolean;
    branch_ids?: number[];
    all_branches_same_price?: boolean;
    branch_prices?: Record<number, { price: number; special_price?: number }>;
    is_limited_availability?: boolean;
    availability_type?: 'specific_dates' | 'recurring';
    availability_data?: any;
}

export interface Service {
    id: number;
    code?: string;
    name: string;
    category: string;
    service_category_id?: number | null; // Added new field
    gender?: 'all' | 'male' | 'female';
    duration: number;
    price: number;
    special_price?: number;
    commission?: number;
    status: 'active' | 'inactive';
    description?: string;
    image?: string;
    is_booking_online_enabled?: boolean;
    requires_room?: boolean;
    is_limited_availability?: boolean;
    availability_type?: 'specific_dates' | 'recurring';
    availability_data?: any;
    all_branches_same_price?: boolean;
    branch_prices?: Record<number, { price: number; special_price?: number }>;
    branches?: Array<{ id: number; name: string }>;
    variants?: ServiceVariant[];
    position?: number;
}

export interface ServiceCategory {
    id: number;
    name: string;
    description?: string;
    color?: string;
    image?: string;
    is_global: boolean;
    branch_ids?: number[];
    position: number;
    is_active?: boolean;
    count?: number; // Helpers
    branchNames?: string[];
}
