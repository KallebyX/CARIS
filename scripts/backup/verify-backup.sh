#!/bin/bash

###############################################################################
# Backup Verification Script
# Verifies backup integrity by checking checksums
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/caris}"
BACKUP_ID="$1"

if [ -z "$BACKUP_ID" ]; then
    echo -e "${RED}Usage: $0 <backup-id>${NC}"
    echo ""
    echo "Available backups:"
    ls -1 "${BACKUP_DIR}/metadata/" | sed 's/.json$//' | head -10
    exit 1
fi

# Load metadata
METADATA_FILE="${BACKUP_DIR}/metadata/${BACKUP_ID}.json"

if [ ! -f "$METADATA_FILE" ]; then
    echo -e "${RED}Error: Backup metadata not found: ${METADATA_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}Verifying backup: ${BACKUP_ID}${NC}"

# Extract metadata
BACKUP_FILE=$(grep -o '"filePath": "[^"]*"' "$METADATA_FILE" | sed 's/"filePath": "\([^"]*\)"/\1/')
CHECKSUM=$(grep -o '"checksum": "[^"]*"' "$METADATA_FILE" | sed 's/"checksum": "\([^"]*\)"/\1/')
SIZE=$(grep -o '"size": [0-9]*' "$METADATA_FILE" | sed 's/"size": //')

echo "Backup file: ${BACKUP_FILE}"
echo "Expected checksum: ${CHECKSUM}"
echo "Expected size: $(echo "scale=2; ${SIZE}/1024/1024" | bc) MB"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ FAILED: Backup file not found${NC}"
    exit 1
fi

# Check file size
ACTUAL_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")

if [ "$ACTUAL_SIZE" != "$SIZE" ]; then
    echo -e "${RED}❌ FAILED: File size mismatch${NC}"
    echo "Expected: ${SIZE} bytes"
    echo "Got: ${ACTUAL_SIZE} bytes"
    exit 1
fi

echo -e "${GREEN}✓ File size verified${NC}"

# Calculate and verify checksum
echo -e "${YELLOW}Calculating checksum...${NC}"
ACTUAL_CHECKSUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')

if [ "$ACTUAL_CHECKSUM" != "$CHECKSUM" ]; then
    echo -e "${RED}❌ FAILED: Checksum mismatch${NC}"
    echo "Expected: ${CHECKSUM}"
    echo "Got: ${ACTUAL_CHECKSUM}"
    echo ""
    echo -e "${RED}⚠️  WARNING: Backup may be corrupted!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Checksum verified${NC}"
echo ""
echo -e "${GREEN}✅ Backup verification successful!${NC}"
echo "The backup is intact and can be used for restoration."

exit 0
