# AgentOS Revenue Tracking Setup Guide

**Version:** 1.0  
**Last Updated:** November 17, 2025 - 4:50 AM EST  
**Standard:** Henderson Standard - Fortune 50 Quality

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Migration](#database-migration)
4. [Configuration](#configuration)
5. [Component Integration](#component-integration)
6. [API Routes](#api-routes)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The AgentOS Revenue Tracking system provides comprehensive commission management and revenue analytics for real estate platforms. This system includes:

- **Revenue Dashboard:** Real-time analytics, KPIs, and agent performance leaderboards
- **Commission Tracking:** Agent earnings tracking and payout request workflows
- **Automated Calculations:** Commission calculations based on configurable rates
- **Admin Controls:** Approval workflows and commission status management
- **Reporting:** CSV exports and date-range analytics

---

## ✅ Prerequisites

Before setting up the revenue tracking system, ensure you have:

- [x] AgentOS core platform deployed (Phases 1-6)
- [x] Supabase project configured with authentication
- [x] Next.js 14 application running
- [x] Admin and agent user accounts created
- [x] Properties table populated with test data

---

## 🗄️ Database Migration

### Step 1: Access Supabase SQL Editor

1. Navigate to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query** button

### Step 2: Execute Migration

1. Open the migration file from GitHub:
   ```
   https://github.com/CR-AudioViz-AI/agentos-platform/blob/development/REVENUE_SCHEMA.sql
   ```

2. Copy the entire SQL script

3. Paste into the Supabase SQL Editor

4. Click **Run** (or press `Ctrl+Enter`)

### Step 3: Verify Migration

Run these verification queries:

```sql
-- Check all tables were created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'sales_transactions', 
    'commission_records', 
    'payout_requests', 
    'platform_settings'
  );
-- Expected: 4 rows
```

```sql
-- Verify platform settings
SELECT * FROM public.platform_settings;
-- Expected: 1 row with default_commission_rate = 0.03
```

```sql
-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN (
  'sales_transactions', 
  'commission_records', 
  'payout_requests'
);
-- Expected: Multiple RLS policies per table
```

### Database Schema Overview

#### sales_transactions
Stores all property sale records with commission details.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| property_id | UUID | Reference to properties table |
| agent_id | UUID | Reference to agent profile |
| buyer_id | UUID | Reference to buyer profile (nullable) |
| sale_price | DECIMAL | Final sale price |
| commission_rate | DECIMAL | Commission percentage (0-1) |
| commission_amount | DECIMAL | Calculated commission |
| sale_date | TIMESTAMPTZ | Date of sale |
| status | TEXT | pending, completed, cancelled |
| notes | TEXT | Additional notes |

#### commission_records
Tracks individual commission payments to agents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| sale_transaction_id | UUID | Reference to sale |
| agent_id | UUID | Reference to agent |
| property_address | TEXT | Denormalized address |
| commission_amount | DECIMAL | Amount owed |
| status | TEXT | pending, approved, paid, cancelled |
| approved_date | TIMESTAMPTZ | When approved |
| approved_by | UUID | Admin who approved |
| paid_date | TIMESTAMPTZ | When paid |
| payout_method | TEXT | Payment method |

#### payout_requests
Agent-initiated payout requests.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | Requesting agent |
| commission_ids | UUID[] | Array of commission IDs |
| total_amount | DECIMAL | Total requested |
| payout_method | TEXT | direct_deposit, check, wire |
| status | TEXT | pending, approved, paid, rejected |
| requested_at | TIMESTAMPTZ | Request timestamp |

#### platform_settings
Global platform configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| default_commission_rate | DECIMAL | Default rate (e.g., 0.03 = 3%) |
| settings_name | TEXT | Always 'default' |

---

## ⚙️ Configuration

### 1. Set Default Commission Rate

Update the default commission rate in Supabase:

```sql
UPDATE public.platform_settings 
SET default_commission_rate = 0.035 
WHERE settings_name = 'default';
-- Sets default to 3.5%
```

### 2. Configure Environment Variables

No additional environment variables required. The system uses existing Supabase credentials.

### 3. User Role Assignment

Ensure users have proper roles assigned:

```sql
-- Make a user an admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';

-- Make a user an agent
UPDATE public.profiles 
SET role = 'agent' 
WHERE email = 'agent@example.com';
```

---

## 🎨 Component Integration

### RevenueDashboard Component

**Location:** `components/RevenueDashboard.tsx`

**Usage:**

```tsx
import RevenueDashboard from '@/components/RevenueDashboard';

// In admin dashboard
<RevenueDashboard userRole="admin" />

// In agent dashboard
<RevenueDashboard userRole="agent" userId={currentUser.id} />
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| userRole | 'admin' \| 'agent' | Yes | User's role |
| userId | string | No | Required for agents |

**Features:**
- Real-time revenue metrics
- Date range filtering
- Agent performance leaderboards (admin only)
- Transaction history
- CSV export

### CommissionTracking Component

**Location:** `components/CommissionTracking.tsx`

**Usage:**

```tsx
import CommissionTracking from '@/components/CommissionTracking';

// In admin panel
<CommissionTracking userRole="admin" />

// In agent panel
<CommissionTracking userRole="agent" userId={currentUser.id} />
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| userRole | 'admin' \| 'agent' | Yes | User's role |
| userId | string | No | Required for agents |

**Features:**
- Commission status tracking
- Payout request submission
- Admin approval workflows
- Status filtering
- Commission statements export

---

## 🔌 API Routes

### POST /api/revenue/sales

Create a new sales transaction (Admin only).

**Request Body:**

```json
{
  "propertyId": "uuid",
  "agentId": "uuid",
  "buyerId": "uuid or null",
  "salePrice": 450000,
  "commissionRate": 0.03,
  "saleDate": "2025-11-17T12:00:00Z",
  "notes": "Optional notes"
}
```

**Response:**

```json
{
  "success": true,
  "sale": { /* sales_transaction object */ },
  "commission": { /* commission_record object */ }
}
```

**Authorization:** Admin role required

### POST /api/revenue/payout-request

Submit a payout request (Agent only).

**Request Body:**

```json
{
  "commissionIds": ["uuid1", "uuid2", "uuid3"],
  "payoutMethod": "direct_deposit",
  "notes": "Optional notes"
}
```

**Response:**

```json
{
  "success": true,
  "payoutRequest": { /* payout_request object */ }
}
```

**Authorization:** Agent must own all selected commissions

### PATCH /api/revenue/commission-status

Update commission status (Admin only).

**Request Body:**

```json
{
  "commissionId": "uuid",
  "status": "approved",
  "notes": "Optional notes"
}
```

**Response:**

```json
{
  "success": true,
  "commission": { /* updated commission_record */ }
}
```

**Authorization:** Admin role required

---

## 🧪 Testing

### 1. Create Test Data

```sql
-- Insert test sale transaction
INSERT INTO public.sales_transactions (
  property_id,
  agent_id,
  buyer_id,
  sale_price,
  commission_rate,
  commission_amount,
  sale_date,
  status
) VALUES (
  'your-property-id',
  'your-agent-id',
  'your-buyer-id',
  500000,
  0.03,
  15000,
  NOW(),
  'completed'
);

-- Insert test commission record
INSERT INTO public.commission_records (
  sale_transaction_id,
  agent_id,
  property_address,
  sale_price,
  commission_rate,
  commission_amount,
  sale_date,
  status
) VALUES (
  'your-sale-id',
  'your-agent-id',
  '123 Main St, City, ST',
  500000,
  0.03,
  15000,
  NOW(),
  'pending'
);
```

### 2. Test Workflows

#### Admin Workflow
1. Navigate to Revenue Dashboard
2. Verify stats cards display correctly
3. Check agent leaderboard appears
4. Create a new sale transaction via API
5. Verify real-time updates

#### Agent Workflow
1. Navigate to Commission Tracking
2. View pending commissions
3. Select commissions for payout
4. Submit payout request
5. Verify status updates to "approved"

#### Integration Test
1. Create sale → Verify commission auto-created
2. Submit payout → Verify commission status updates
3. Admin approves → Verify agent sees update
4. Export CSV → Verify data accuracy

---

## 🔧 Troubleshooting

### Issue: "Unauthorized" Error

**Cause:** User not authenticated or session expired  
**Solution:**
1. Check user is logged in
2. Verify session cookie exists
3. Refresh authentication token

### Issue: "Forbidden" Error

**Cause:** User lacks required role  
**Solution:**
1. Verify user role in `profiles` table
2. Ensure role is 'admin' or 'agent' as required
3. Check RLS policies are correctly applied

### Issue: Commission Not Auto-Created

**Cause:** Property not found or sale creation failed  
**Solution:**
1. Verify property_id exists in properties table
2. Check agent_id is valid
3. Review API error logs
4. Ensure commission_records table exists

### Issue: Real-Time Updates Not Working

**Cause:** Supabase realtime not configured  
**Solution:**
1. Verify realtime is enabled for tables:
   ```sql
   ALTER PUBLICATION supabase_realtime 
   ADD TABLE sales_transactions, commission_records, payout_requests;
   ```
2. Check browser console for subscription errors
3. Verify Supabase anon key is correct

### Issue: RLS Policy Blocking Access

**Cause:** Row Level Security denying legitimate access  
**Solution:**
1. Review RLS policies in Supabase dashboard
2. Test policies with specific user IDs
3. Temporarily disable RLS for debugging:
   ```sql
   ALTER TABLE sales_transactions DISABLE ROW LEVEL SECURITY;
   -- Re-enable after debugging
   ```

### Issue: Decimal Precision Errors

**Cause:** JavaScript number precision limitations  
**Solution:**
- All currency values stored as DECIMAL(12, 2) in database
- Use `toFixed(2)` for display
- API handles precision automatically

---

## 📊 Performance Optimization

### Indexing Strategy

The migration creates optimal indexes:
- `idx_sales_agent` - Fast agent sales lookup
- `idx_sales_date` - Date range queries
- `idx_commission_agent` - Agent commission filtering
- `idx_commission_status` - Status-based filtering

### Query Optimization

```sql
-- Efficient agent revenue query
SELECT 
  agent_id,
  COUNT(*) as sales_count,
  SUM(sale_price) as total_revenue,
  SUM(commission_amount) as total_commission
FROM sales_transactions
WHERE sale_date >= '2025-01-01'
  AND status = 'completed'
GROUP BY agent_id
ORDER BY total_revenue DESC;
```

### Caching Recommendations

- Cache platform_settings (rarely changes)
- Use React Query for component data
- Implement Vercel Edge caching for APIs

---

## 🔒 Security Considerations

### Row Level Security (RLS)

All tables have comprehensive RLS policies:
- Admins see all records
- Agents see only their own records
- Buyers see their own purchases
- All write operations require proper authorization

### Input Validation

All API routes validate:
- Required fields present
- Data types correct
- Numeric values in valid ranges
- UUIDs properly formatted
- User authorization verified

### Sensitive Data Protection

- Commission amounts encrypted in transit (HTTPS)
- No PII exposed in logs
- Service role key never exposed to client
- All database queries parameterized

---

## 📈 Monitoring & Analytics

### Key Metrics to Track

1. **Revenue Metrics:**
   - Total sales per period
   - Average sale price
   - Commission payout rate
   - Revenue growth rate

2. **Agent Performance:**
   - Sales per agent
   - Average deal size
   - Commission earnings
   - Payout request frequency

3. **System Health:**
   - API response times
   - Database query performance
   - Real-time subscription status
   - Error rates

### Logging

Enable comprehensive logging:
- All API requests logged
- Commission calculations logged
- Payout requests tracked
- Admin actions audited

---

## 🚀 Next Steps

After completing setup:

1. **User Training:**
   - Train admins on sale creation
   - Guide agents through payout process
   - Document common workflows

2. **Data Migration:**
   - Import historical sales data
   - Calculate retroactive commissions
   - Verify data accuracy

3. **Customization:**
   - Adjust commission rates per agent/property
   - Configure payout schedules
   - Set up automated notifications

4. **Scaling:**
   - Monitor database performance
   - Optimize queries as data grows
   - Implement caching layer

---

## 📞 Support

For issues or questions:
- GitHub: https://github.com/CR-AudioViz-AI/agentos-platform
- Email: support@craudiovizai.com

---

**Document Version:** 1.0  
**Last Updated:** November 17, 2025 - 4:50 AM EST  
**Maintained By:** CR AudioViz AI, LLC  
**Standard:** Henderson Standard - Fortune 50 Quality
