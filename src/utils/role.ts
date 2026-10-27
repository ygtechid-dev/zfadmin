export const mapRole = (role: string): string => {
    switch (role?.toLowerCase()) {
        case 'super_admin':
        case 'super admin':
            return 'Super Admin';
        case 'admin':
            return 'Admin';
        case 'owner':
            return 'Owner';
        case 'branch_manager':
        case 'branch manager':
            return 'Branch Manager';
        case 'cashier':
        case 'kasir':
            return 'Kasir';
        case 'staff':
            return 'Staff';
        default:
            return role || '-';
    }
};

export const isElevatedRole = (role: string): boolean => {
    const r = role?.toLowerCase() || '';
    return ['owner', 'super_admin', 'super admin'].includes(r);
};
