# Payment Configuration Feature - Implementation Summary

## ✅ Backend Implementation (COMPLETE)

### 1. Database Migration
**File**: `database/migrations/2026_01_07_012900_create_branch_payment_configs_table.php`

**Fields**:
- `branch_id` - Foreign key to branches table
- `payment_gateway` - enum: midtrans, xendit, manual
- **Midtrans Config**: server_key, client_key, merchant_id, is_production
- **Xendit Config**: api_key, callback_token, is_production
- `enabled_payment_methods` - JSON array: credit_card, bank_transfer, e_wallet, cash, qris
- `bank_accounts` - JSON array for manual bank transfer
- `ewallet_accounts` - JSON array for e-wallet accounts
- `minimum_payment` - Minimum transaction amount
- `down_payment_percentage` - DP percentage (0-100%)
- `allow_installment` - Boolean
- `max_installment_months` - Integer (0-24)
- `auto_confirm_payment` - Boolean
- `payment_confirmation_timeout` - Hours (1-168)
- `is_active` - Boolean

**Status**: ✅ Migrated successfully

### 2. Model
**File**: `app/Models/BranchPaymentConfig.php`

**Features**:
- Relationship with Branch model
- Automatic JSON casting for arrays
- Hidden sensitive fields (API keys)
- Masked keys for display (`masked_server_key`, `masked_client_key`, `masked_xendit_key`)

### 3. Controller
**File**: `app/Http/Controllers/Admin/PaymentConfigController.php`

**Endpoints**:
- `GET /api/v1/admin/payment-configs` - Get all configurations
- `GET /api/v1/admin/payment-configs/branch/{branchId}` - Get config for specific branch
- `POST /api/v1/admin/payment-configs` - Create/Update configuration
- `PUT /api/v1/admin/payment-configs/{id}` - Update configuration
- `DELETE /api/v1/admin/payment-configs/{id}` - Delete configuration
- `POST /api/v1/admin/payment-configs/test-connection` - Test gateway connection

**Validation**:
- Required fields based on selected gateway
- Midtrans fields required if gateway = midtrans
- Xendit fields required if gateway = xendit
- Payment methods validation
- Bank accounts structure validation
- Numeric validations for amounts and percentages

### 4. Routes
**File**: `routes/web.php`

**Middleware**: `auth`, `role:admin,owner`

**Routes Added**:
```php
$router->group(['prefix' => 'payment-configs'], function () use ($router) {
    $router->get('/', 'Admin/PaymentConfigController@index');
    $router->get('/branch/{branchId}', 'Admin/PaymentConfigController@show');
    $router->post('/', 'Admin/PaymentConfigController@store');
    $router->put('/{id}', 'Admin/PaymentConfigController@update');
    $router->delete('/{id}', 'Admin/PaymentConfigController@destroy');
    $router->post('/test-connection', 'Admin/PaymentConfigController@testConnection');
});
```

## 🎨 Frontend Implementation (IN PROGRESS)

### 1. API Service Updated
**File**: `src/services/api.ts`

**Methods Added**:
```typescript
getPaymentConfigs()
getPaymentConfigByBranch(branchId)
createPaymentConfig(data)
updatePaymentConfig(id, data)
deletePaymentConfig(id)
testPaymentConnection(data)
```

### 2. Payment Config Page
**File**: `src/pages/payment/PaymentConfigPage.tsx`

**Features**:
- List all payment configurations by branch
- Add/Edit/Delete configurations
- Support for multiple payment gateways (Midtrans, Xendit, Manual)
- Payment methods toggle (Credit Card, Bank Transfer, E-Wallet, Cash, QRIS)
- Bank accounts management
- E-wallet accounts management
- Test connection feature
- Masked sensitive keys display
- Real-time validation

**Status**: ⚠️ Basic structure created, needs full modal implementation

## 🔐 Security Features

1. **Sensitive Data Protection**:
   - API keys hidden in responses
   - Masked display (show first 8 and last 4 characters)
   - Never send full keys in GET requests

2. **Role-Based Access**:
   - Only admin and owner roles can access
   - Middleware protection on all routes

3. **Validation**:
   - Server-side validation for all inputs
   - Gateway-specific field requirements
   - Numeric range validations

## 📋 Usage Guide

### For Admin Users:

1. **Navigate to Payment Configuration**:
   - Go to Settings > Payment Configuration (need to add to menu)

2. **Add Configuration**:
   - Click "Add Configuration"
   - Select branch
   - Choose payment gateway (Midtrans/Xendit/Manual)
   - Fill in required credentials
   - Select enabled payment methods
   - Configure bank accounts (if using manual/bank transfer)
   - Set payment rules (minimum, DP percentage, installment)
   - Save

3. **Test Connection**:
   - After entering gateway credentials
   - Click "Test Connection" button
   - Verify connection is successful

4. **Edit Configuration**:
   - Click Edit on any configuration card
   - Update fields as needed
   - API keys are not shown for security (enter new ones to update)
   - Save changes

5. **Delete Configuration**:
   - Click Delete button
   - Confirm deletion

## 🔄 Integration with Booking System

When a customer makes a booking, the system will:

1. Check the branch's payment configuration
2. Show only enabled payment methods
3. Apply minimum payment rules
4. Calculate down payment if configured
5. Process payment through configured gateway
6. Auto-confirm if enabled

## 📊 Payment Gateway Support

### Midtrans
- **Required**: Server Key, Client Key
- **Optional**: Merchant ID
- **Environment**: Sandbox / Production toggle
- **Methods**: Credit Card, Bank Transfer, E-Wallet, QRIS

### Xendit
- **Required**: API Key
- **Optional**: Callback Token
- **Environment**: Test / Live toggle
- **Methods**: Credit Card, Bank Transfer, E-Wallet, QRIS

### Manual
- **No API keys required**
- **Configure**: Bank accounts for transfer
- **Methods**: Cash, Bank Transfer

## 🚀 Next Steps

### To Complete Frontend:

1. **Add Modal Forms**:
   - Complete add/edit modal with all fields
   - Gateway selection (tabs for Midtrans/Xendit/Manual)
   - Payment methods checkboxes
   - Bank accounts dynamic form
   - E-wallet accounts dynamic form
   - Payment rules inputs

2. **Add to Navigation**:
   - Add "Payment Config" to AdminLayout sidebar
   - Under "Settings" or "System" category

3. **Add Route**:
   - Update `src/App.tsx` to include payment config route

4. **Testing**:
   - Test CRUD operations
   - Test connection testing
   - Test validation errors
   - Test with real Midtrans/Xendit credentials

### Example Usage in Booking:

```typescript
// Get payment config for branch
const config = await api.getPaymentConfigByBranch(branchId);

// Check if payment method is enabled
if (config.enabled_payment_methods.includes('credit_card')) {
    // Show credit card option
}

// Apply minimum payment
if (totalAmount < config.minimum_payment) {
    alert(`Minimum payment is Rp ${config.minimum_payment}`);
}

// Calculate down payment
const dpAmount = totalAmount * (config.down_payment_percentage / 100);
```

## 📝 Database Schema

```sql
CREATE TABLE branch_payment_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    branch_id BIGINT NOT NULL UNIQUE,
    payment_gateway ENUM('midtrans', 'xendit', 'manual') DEFAULT 'manual',
    midtrans_server_key VARCHAR(255) NULL,
    midtrans_client_key VARCHAR(255) NULL,
    midtrans_merchant_id VARCHAR(255) NULL,
    midtrans_is_production BOOLEAN DEFAULT FALSE,
    xendit_api_key VARCHAR(255) NULL,
    xendit_callback_token VARCHAR(255) NULL,
    xendit_is_production BOOLEAN DEFAULT FALSE,
    enabled_payment_methods JSON NULL,
    bank_accounts JSON NULL,
    ewallet_accounts JSON NULL,
    minimum_payment DECIMAL(15,2) DEFAULT 0,
    down_payment_percentage DECIMAL(5,2) DEFAULT 0,
    allow_installment BOOLEAN DEFAULT FALSE,
    max_installment_months INT DEFAULT 0,
    auto_confirm_payment BOOLEAN DEFAULT FALSE,
    payment_confirmation_timeout INT DEFAULT 24,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

## ✅ Checklist

### Backend:
- [x] Migration created
- [x] Model created with relationships
- [x] Controller with CRUD operations
- [x] Routes added with middleware
- [x] Validation implemented
- [x] Sensitive data masking
- [x] Migration executed

### Frontend:
- [x] API methods added to service
- [x] Basic page structure created
- [ ] Complete modal forms
- [ ] Add to navigation menu
- [ ] Add route to App.tsx
- [ ] Test all CRUD operations
- [ ] Test connection testing
- [ ] Integration with booking flow

---

**Status**: Backend 100% Complete ✅ | Frontend 40% Complete ⚠️

**Next Action**: Complete the modal forms in PaymentConfigPage.tsx and add to navigation
