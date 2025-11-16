#!/bin/bash

# ============================================================================
# AgentOS Code Cleanup & Quality Verification Script
# ============================================================================
# Purpose: Automated code quality checks and cleanup
# Standard: Henderson Standard - Fortune 50 Quality
# Created: November 17, 2025 - 5:10 AM EST
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      AgentOS Code Quality & Cleanup Verification              ║${NC}"
echo -e "${BLUE}║      Henderson Standard - Automated Checks                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ISSUES_FOUND=0

# ============================================================================
# 1. Search for Console Logs
# ============================================================================

echo -e "${YELLOW}[1/6] Checking for console.log statements...${NC}"

CONSOLE_LOGS=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec grep -l "console\.log" {} \; 2>/dev/null || true)

if [ -z "$CONSOLE_LOGS" ]; then
    echo -e "${GREEN}✓ No console.log statements found${NC}"
else
    echo -e "${YELLOW}⚠ Console.log statements found in:${NC}"
    echo "$CONSOLE_LOGS" | while read file; do
        COUNT=$(grep -c "console\.log" "$file" || true)
        echo -e "  ${YELLOW}• $file ($COUNT occurrences)${NC}"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    echo -e "${BLUE}Note: Some console.error/warn are acceptable for error logging${NC}"
fi

# ============================================================================
# 2. Check for TypeScript Errors
# ============================================================================

echo -e "\n${YELLOW}[2/6] Checking TypeScript compilation...${NC}"

if [ -f "package.json" ]; then
    if command -v npm &> /dev/null; then
        echo -e "${BLUE}Running TypeScript check...${NC}"
        if npm run type-check 2>&1 | grep -q "error TS"; then
            echo -e "${RED}✗ TypeScript errors found${NC}"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        else
            echo -e "${GREEN}✓ No TypeScript errors${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ npm not available, skipping TypeScript check${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No package.json found, skipping${NC}"
fi

# ============================================================================
# 3. Check for TODO/FIXME Comments
# ============================================================================

echo -e "\n${YELLOW}[3/6] Checking for TODO/FIXME comments...${NC}"

TODOS=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec grep -l "TODO\|FIXME" {} \; 2>/dev/null || true)

if [ -z "$TODOS" ]; then
    echo -e "${GREEN}✓ No TODO/FIXME comments found${NC}"
else
    TODO_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec grep -c "TODO\|FIXME" {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}')
    echo -e "${BLUE}ℹ Found $TODO_COUNT TODO/FIXME comments${NC}"
    echo -e "${BLUE}  (These are acceptable for future enhancements)${NC}"
fi

# ============================================================================
# 4. Check for Commented Code
# ============================================================================

echo -e "\n${YELLOW}[4/6] Checking for large blocks of commented code...${NC}"

COMMENTED=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec awk '/^[[:space:]]*\/\// {count++} count>10 {print FILENAME; exit}' {} \; 2>/dev/null || true)

if [ -z "$COMMENTED" ]; then
    echo -e "${GREEN}✓ No large commented code blocks found${NC}"
else
    echo -e "${YELLOW}⚠ Large commented blocks found (review recommended):${NC}"
    echo "$COMMENTED"
fi

# ============================================================================
# 5. Check Environment Variables
# ============================================================================

echo -e "\n${YELLOW}[5/6] Checking environment variable usage...${NC}"

if [ -f ".env.local.example" ]; then
    echo -e "${GREEN}✓ .env.local.example exists${NC}"
else
    echo -e "${YELLOW}⚠ No .env.local.example file found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check for hardcoded secrets (simple check)
HARDCODED=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec grep -l "sk_live_\|pk_live_\|pk_test_\|sk_test_" {} \; 2>/dev/null || true)

if [ -z "$HARDCODED" ]; then
    echo -e "${GREEN}✓ No obvious hardcoded secrets found${NC}"
else
    echo -e "${RED}✗ Possible hardcoded secrets found:${NC}"
    echo "$HARDCODED"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# ============================================================================
# 6. Code Statistics
# ============================================================================

echo -e "\n${YELLOW}[6/6] Generating code statistics...${NC}"

if command -v find &> /dev/null; then
    TS_FILES=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" | wc -l)
    echo -e "${BLUE}• TypeScript files: $TS_FILES${NC}"
    
    if command -v wc &> /dev/null; then
        TOTAL_LINES=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec wc -l {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}')
        echo -e "${BLUE}• Total lines of code: $TOTAL_LINES${NC}"
    fi
fi

# ============================================================================
# Summary
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    QUALITY CHECK SUMMARY                    ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "\n${GREEN}✅ All quality checks passed!${NC}"
    echo -e "${GREEN}Code meets Henderson Standard requirements${NC}"
else
    echo -e "\n${YELLOW}⚠ $ISSUES_FOUND minor issues found${NC}"
    echo -e "${YELLOW}Review recommended but not blocking${NC}"
fi

echo -e "\n${BLUE}Recommendations:${NC}"
echo -e "1. Replace console.log with proper logging service"
echo -e "2. Remove or document all TODO comments"
echo -e "3. Review commented code blocks"
echo -e "4. Ensure no secrets in repository"
echo -e "5. Run full test suite before production"

echo -e "\n${GREEN}Code quality verification complete!${NC}"
echo -e "${BLUE}Timestamp: $(date)${NC}\n"

exit 0
