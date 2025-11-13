#!/bin/bash

###############################################################################
# Database Backup Script
# Creates a PostgreSQL database backup with compression and encryption
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/caris}"
BACKUP_TYPE="${1:-full}"  # full or incremental
COMPRESS="${COMPRESS:-true}"
ENCRYPT="${ENCRYPT:-true}"

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

# Extract connection details
DB_URL=$POSTGRES_URL
PG_USER=$(echo $DB_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
PG_PASSWORD=$(echo $DB_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
PG_HOST=$(echo $DB_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
PG_PORT=$(echo $DB_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
PG_DATABASE=$(echo $DB_URL | sed -n 's|.*/\([^?]*\).*|\1|p')

# Generate backup ID
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
BACKUP_ID="caris_${BACKUP_TYPE}_${TIMESTAMP}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}/metadata"

echo -e "${GREEN}Starting ${BACKUP_TYPE} database backup...${NC}"
echo "Backup ID: ${BACKUP_ID}"
echo "Database: ${PG_DATABASE}"
echo "Host: ${PG_HOST}:${PG_PORT}"

# Export password for pg_dump
export PGPASSWORD="${PG_PASSWORD}"

# Create backup
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_ID}.sql"

echo -e "${YELLOW}Creating database dump...${NC}"
if [ "$BACKUP_TYPE" = "incremental" ]; then
    # Incremental: schema only (for simplified version)
    pg_dump -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DATABASE}" \
        --schema-only -F p -f "${BACKUP_FILE}"
else
    # Full backup
    pg_dump -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DATABASE}" \
        -F p -f "${BACKUP_FILE}"
fi

# Get file size
ORIGINAL_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")
echo -e "${GREEN}Dump created: $(echo "scale=2; ${ORIGINAL_SIZE}/1024/1024" | bc) MB${NC}"

# Compress if enabled
if [ "$COMPRESS" = "true" ]; then
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip -9 "${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")
    echo -e "${GREEN}Compressed: $(echo "scale=2; ${COMPRESSED_SIZE}/1024/1024" | bc) MB${NC}"
fi

# Encrypt if enabled
if [ "$ENCRYPT" = "true" ]; then
    echo -e "${YELLOW}Encrypting backup...${NC}"

    # Use AES-256-CBC encryption
    ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-${JWT_SECRET}}"

    if [ -z "$ENCRYPTION_KEY" ]; then
        echo -e "${RED}Warning: No encryption key set, using default (not secure!)${NC}"
        ENCRYPTION_KEY="default-backup-key"
    fi

    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "${BACKUP_FILE}" \
        -out "${BACKUP_FILE}.enc" \
        -pass pass:"${ENCRYPTION_KEY}"

    # Remove unencrypted file
    rm "${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.enc"

    ENCRYPTED_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")
    echo -e "${GREEN}Encrypted: $(echo "scale=2; ${ENCRYPTED_SIZE}/1024/1024" | bc) MB${NC}"
fi

# Calculate checksum
echo -e "${YELLOW}Calculating checksum...${NC}"
CHECKSUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
echo "Checksum: ${CHECKSUM}"

# Create metadata file
METADATA_FILE="${BACKUP_DIR}/metadata/${BACKUP_ID}.json"
cat > "${METADATA_FILE}" <<EOF
{
  "id": "${BACKUP_ID}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "type": "${BACKUP_TYPE}",
  "size": $(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}"),
  "compressed": ${COMPRESS},
  "encrypted": ${ENCRYPT},
  "checksum": "${CHECKSUM}",
  "filePath": "${BACKUP_FILE}",
  "database": "${PG_DATABASE}",
  "status": "completed"
}
EOF

echo -e "${GREEN}Backup completed successfully!${NC}"
echo "Backup file: ${BACKUP_FILE}"
echo "Metadata: ${METADATA_FILE}"

# Unset password
unset PGPASSWORD

exit 0
