#!/bin/bash

###############################################################################
# Database Restore Script
# Restores PostgreSQL database from backup
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
DRY_RUN="${DRY_RUN:-false}"

if [ -z "$BACKUP_ID" ]; then
    echo -e "${RED}Usage: $0 <backup-id> [DRY_RUN=true]${NC}"
    echo ""
    echo "Available backups:"
    ls -1 "${BACKUP_DIR}/metadata/" | sed 's/.json$//' | head -10
    exit 1
fi

# Load environment variables
if [ -f .env.local ]; then
    source .env.local
elif [ -f .env ]; then
    source .env
fi

# Parse PostgreSQL connection string
if [ -z "$POSTGRES_URL" ]; then
    echo -e "${RED}Error: POSTGRES_URL environment variable not set${NC}"
    exit 1
fi

DB_URL=$POSTGRES_URL
PG_USER=$(echo $DB_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
PG_PASSWORD=$(echo $DB_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
PG_HOST=$(echo $DB_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
PG_PORT=$(echo $DB_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
PG_DATABASE=$(echo $DB_URL | sed -n 's|.*/\([^?]*\).*|\1|p')

# Load metadata
METADATA_FILE="${BACKUP_DIR}/metadata/${BACKUP_ID}.json"

if [ ! -f "$METADATA_FILE" ]; then
    echo -e "${RED}Error: Backup metadata not found: ${METADATA_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}Loading backup metadata...${NC}"
BACKUP_FILE=$(grep -o '"filePath": "[^"]*"' "$METADATA_FILE" | sed 's/"filePath": "\([^"]*\)"/\1/')
ENCRYPTED=$(grep -o '"encrypted": [^,]*' "$METADATA_FILE" | sed 's/"encrypted": //')
COMPRESSED=$(grep -o '"compressed": [^,]*' "$METADATA_FILE" | sed 's/"compressed": //')
CHECKSUM=$(grep -o '"checksum": "[^"]*"' "$METADATA_FILE" | sed 's/"checksum": "\([^"]*\)"/\1/')

echo "Backup ID: ${BACKUP_ID}"
echo "Backup file: ${BACKUP_FILE}"
echo "Encrypted: ${ENCRYPTED}"
echo "Compressed: ${COMPRESSED}"

# Verify backup exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Verify checksum
echo -e "${YELLOW}Verifying checksum...${NC}"
CURRENT_CHECKSUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')

if [ "$CURRENT_CHECKSUM" != "$CHECKSUM" ]; then
    echo -e "${RED}Error: Checksum mismatch! Backup may be corrupted.${NC}"
    echo "Expected: ${CHECKSUM}"
    echo "Got: ${CURRENT_CHECKSUM}"
    exit 1
fi

echo -e "${GREEN}Checksum verified!${NC}"

# Prepare temporary directory
TEMP_DIR="${BACKUP_DIR}/temp"
mkdir -p "${TEMP_DIR}"

RESTORE_FILE="${BACKUP_FILE}"

# Decrypt if needed
if [ "$ENCRYPTED" = "true" ]; then
    echo -e "${YELLOW}Decrypting backup...${NC}"

    ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-${JWT_SECRET}}"

    if [ -z "$ENCRYPTION_KEY" ]; then
        echo -e "${RED}Error: Encryption key not set${NC}"
        exit 1
    fi

    DECRYPTED_FILE="${TEMP_DIR}/${BACKUP_ID}_decrypted"

    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "${RESTORE_FILE}" \
        -out "${DECRYPTED_FILE}" \
        -pass pass:"${ENCRYPTION_KEY}"

    RESTORE_FILE="${DECRYPTED_FILE}"
    echo -e "${GREEN}Backup decrypted${NC}"
fi

# Decompress if needed
if [ "$COMPRESSED" = "true" ]; then
    echo -e "${YELLOW}Decompressing backup...${NC}"

    DECOMPRESSED_FILE="${RESTORE_FILE%.gz}"
    gunzip -c "${RESTORE_FILE}" > "${DECOMPRESSED_FILE}"

    # Clean up encrypted file if it was created
    if [ "$ENCRYPTED" = "true" ]; then
        rm "${RESTORE_FILE}"
    fi

    RESTORE_FILE="${DECOMPRESSED_FILE}"
    echo -e "${GREEN}Backup decompressed${NC}"
fi

# Dry run mode
if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}DRY RUN MODE - No actual restoration will be performed${NC}"

    FILE_SIZE=$(stat -f%z "${RESTORE_FILE}" 2>/dev/null || stat -c%s "${RESTORE_FILE}")
    echo -e "${GREEN}Backup file readable: $(echo "scale=2; ${FILE_SIZE}/1024/1024" | bc) MB${NC}"

    # Preview first few lines
    echo ""
    echo "Preview of backup file:"
    echo "----------------------"
    head -n 10 "${RESTORE_FILE}"
    echo "----------------------"

    # Cleanup
    rm -rf "${TEMP_DIR}"

    echo -e "${GREEN}Dry run completed successfully${NC}"
    exit 0
fi

# Perform actual restoration
echo -e "${RED}⚠️  WARNING: This will OVERWRITE your current database!${NC}"
echo -e "${RED}⚠️  Database: ${PG_DATABASE}${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restoration cancelled"
    rm -rf "${TEMP_DIR}"
    exit 0
fi

echo -e "${YELLOW}Restoring database...${NC}"

# Export password for psql
export PGPASSWORD="${PG_PASSWORD}"

# Restore database
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DATABASE}" -f "${RESTORE_FILE}"

# Unset password
unset PGPASSWORD

# Cleanup temp files
rm -rf "${TEMP_DIR}"

echo -e "${GREEN}Database restoration completed successfully!${NC}"
echo -e "${YELLOW}Please verify your data and restart your application if needed.${NC}"

exit 0
