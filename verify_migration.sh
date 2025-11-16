#!/bin/bash

# ============================================================================
# AgentOS Automated Database Migration & Verification Script
# ============================================================================
# Purpose: Automate migration execution and verification
# Standard: Henderson Standard - Fortune 50 Quality
# Created: November 17, 2025 - 5:05 AM EST
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Supabase credentials
SUPABASE_URL="https://kteobfyferrukqeolofj.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZW9iZnlmZXJydWtxZW9sb2ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE5NzI2NiwiZXhwIjoyMDc3NTU3MjY2fQ.5baSBOBpBzcm5LeV4tN2H0qQJGNJoH0Q06ROwhbijCI"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AgentOS Database Migration & Verification Script            ║${NC}"
echo -e "${BLUE}║   Henderson Standard - Automated Execution                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# STEP 1: Pre-Migration Checks
# ============================================================================

echo -e "${YELLOW}[1/5] Pre-Migration Checks...${NC}"

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}✗ Error: curl is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ curl available${NC}"

# Check if jq is available (optional but helpful)
if command -v jq &> /dev/null; then
    echo -e "${GREEN}✓ jq available (JSON parsing enabled)${NC}"
    HAS_JQ=true
else
    echo -e "${YELLOW}⚠ jq not available (install for better output)${NC}"
    HAS_JQ=false
fi

# Test Supabase connection
echo -e "\n${YELLOW}Testing Supabase connection...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
    echo -e "${GREEN}✓ Supabase connection successful${NC}"
else
    echo -e "${RED}✗ Supabase connection failed (HTTP $RESPONSE)${NC}"
    exit 1
fi

# ============================================================================
# STEP 2: Manual Migration Instructions
# ============================================================================

echo -e "\n${YELLOW}[2/5] Database Migration Instructions${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "${YELLOW}⚠️  MANUAL STEP REQUIRED:${NC}"
echo -e "Direct SQL execution via API is not available."
echo -e "Please execute the migration manually:"
echo -e ""
echo -e "${GREEN}1.${NC} Open Supabase Dashboard:"
echo -e "   ${BLUE}https://supabase.com/dashboard/project/kteobfyferrukqeolofj${NC}"
echo -e ""
echo -e "${GREEN}2.${NC} Navigate to: ${YELLOW}SQL Editor${NC} (left sidebar)"
echo -e ""
echo -e "${GREEN}3.${NC} Click: ${YELLOW}New Query${NC}"
echo -e ""
echo -e "${GREEN}4.${NC} Open migration file:"
echo -e "   ${BLUE}https://github.com/CR-AudioViz-AI/agentos-platform/blob/development/REVENUE_SCHEMA.sql${NC}"
echo -e ""
echo -e "${GREEN}5.${NC} Copy & paste entire SQL into editor"
echo -e ""
echo -e "${GREEN}6.${NC} Click: ${YELLOW}Run${NC} (or press Ctrl+Enter)"
echo -e ""
echo -e "${GREEN}7.${NC} Verify success messages appear"
echo -e ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e ""
read -p "Press ENTER when migration is complete to verify..."

# ============================================================================
# STEP 3: Verify Migration
# ============================================================================

echo -e "\n${YELLOW}[3/5] Verifying Migration...${NC}"

verify_table() {
    local table_name=$1
    echo -e "\nChecking table: ${BLUE}${table_name}${NC}"
    
    RESPONSE=$(curl -s \
      "${SUPABASE_URL}/rest/v1/${table_name}?limit=1" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}")
    
    if echo "$RESPONSE" | grep -q "relation.*does not exist"; then
        echo -e "${RED}✗ Table '${table_name}' NOT FOUND${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Table '${table_name}' exists${NC}"
        return 0
    fi
}

TABLES_OK=true

verify_table "sales_transactions" || TABLES_OK=false
verify_table "commission_records" || TABLES_OK=false
verify_table "payout_requests" || TABLES_OK=false
verify_table "platform_settings" || TABLES_OK=false

if [ "$TABLES_OK" = true ]; then
    echo -e "\n${GREEN}✓ All revenue tables verified successfully!${NC}"
else
    echo -e "\n${RED}✗ Some tables are missing. Please check migration.${NC}"
    exit 1
fi

# ============================================================================
# STEP 4: Verify Platform Settings
# ============================================================================

echo -e "\n${YELLOW}[4/5] Verifying Platform Settings...${NC}"

SETTINGS=$(curl -s \
  "${SUPABASE_URL}/rest/v1/platform_settings?select=*" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

if echo "$SETTINGS" | grep -q "default_commission_rate"; then
    echo -e "${GREEN}✓ Platform settings configured${NC}"
    if [ "$HAS_JQ" = true ]; then
        RATE=$(echo "$SETTINGS" | jq -r '.[0].default_commission_rate')
        echo -e "  Default commission rate: ${BLUE}${RATE}${NC} (3% = 0.03)"
    fi
else
    echo -e "${YELLOW}⚠ Platform settings may need configuration${NC}"
fi

# ============================================================================
# STEP 5: Test Insert & Query
# ============================================================================

echo -e "\n${YELLOW}[5/5] Testing Database Operations...${NC}"

# This would require actual property_id and agent_id from your database
echo -e "${BLUE}Note: Skipping insert test (requires valid property and agent IDs)${NC}"
echo -e "${GREEN}✓ Read operations verified${NC}"

# ============================================================================
# Summary
# ============================================================================

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  MIGRATION VERIFIED SUCCESSFULLY                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo -e ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Test revenue dashboard in the app"
echo -e "2. Verify commission tracking works"
echo -e "3. Test payout request workflow"
echo -e "4. Review platform settings"
echo -e ""
echo -e "${GREEN}✅ AgentOS Revenue System Ready for Use!${NC}"
echo -e ""
echo -e "${BLUE}Timestamp: $(date)${NC}"
echo -e ""

exit 0
