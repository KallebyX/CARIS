#!/bin/bash

###############################################################################
# Backup Cleanup Script
# Applies retention policy and removes old backups
# Retention: 7 daily, 4 weekly, 12 monthly
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/caris}"
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=12

DRY_RUN="${1:-false}"

if [ "$DRY_RUN" = "true" ] || [ "$DRY_RUN" = "--dry-run" ]; then
    echo -e "${YELLOW}DRY RUN MODE - No backups will be deleted${NC}"
    DRY_RUN=true
else
    DRY_RUN=false
fi

echo -e "${GREEN}Applying backup retention policy...${NC}"
echo "Daily: Keep last ${DAILY_RETENTION}"
echo "Weekly: Keep last ${WEEKLY_RETENTION}"
echo "Monthly: Keep last ${MONTHLY_RETENTION}"
echo ""

METADATA_DIR="${BACKUP_DIR}/metadata"

if [ ! -d "$METADATA_DIR" ]; then
    echo -e "${YELLOW}No backups found${NC}"
    exit 0
fi

# Find all backup metadata files
BACKUPS=$(find "${METADATA_DIR}" -name "*.json" -type f | sort -r)

if [ -z "$BACKUPS" ]; then
    echo -e "${YELLOW}No backups found${NC}"
    exit 0
fi

TOTAL_BACKUPS=$(echo "$BACKUPS" | wc -l | tr -d ' ')
echo "Total backups: ${TOTAL_BACKUPS}"

# Arrays to store backups to keep
DAILY_BACKUPS=()
WEEKLY_BACKUPS=()
MONTHLY_BACKUPS=()

NOW=$(date +%s)

# Process each backup
while IFS= read -r METADATA_FILE; do
    # Extract timestamp from metadata
    TIMESTAMP=$(grep -o '"timestamp": "[^"]*"' "$METADATA_FILE" | sed 's/"timestamp": "\([^"]*\)"/\1/')

    # Convert to epoch
    BACKUP_TIME=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${TIMESTAMP%.*}" +%s 2>/dev/null || date -d "$TIMESTAMP" +%s)

    # Calculate age in days
    AGE_SECONDS=$((NOW - BACKUP_TIME))
    AGE_DAYS=$((AGE_SECONDS / 86400))

    BACKUP_ID=$(basename "$METADATA_FILE" .json)

    # Categorize backup
    if [ $AGE_DAYS -le 7 ]; then
        # Daily backups (last 7 days)
        if [ ${#DAILY_BACKUPS[@]} -lt $DAILY_RETENTION ]; then
            DAILY_BACKUPS+=("$BACKUP_ID")
        fi
    elif [ $AGE_DAYS -le 30 ]; then
        # Weekly backups (last 4 weeks)
        if [ ${#WEEKLY_BACKUPS[@]} -lt $WEEKLY_RETENTION ]; then
            WEEKLY_BACKUPS+=("$BACKUP_ID")
        fi
    elif [ $AGE_DAYS -le 365 ]; then
        # Monthly backups (last 12 months)
        if [ ${#MONTHLY_BACKUPS[@]} -lt $MONTHLY_RETENTION ]; then
            MONTHLY_BACKUPS+=("$BACKUP_ID")
        fi
    fi

done <<< "$BACKUPS"

# Create set of backups to keep
KEEP_BACKUPS=()
KEEP_BACKUPS+=("${DAILY_BACKUPS[@]}")
KEEP_BACKUPS+=("${WEEKLY_BACKUPS[@]}")
KEEP_BACKUPS+=("${MONTHLY_BACKUPS[@]}")

echo ""
echo -e "${GREEN}Backups to keep:${NC}"
echo "Daily: ${#DAILY_BACKUPS[@]}"
echo "Weekly: ${#WEEKLY_BACKUPS[@]}"
echo "Monthly: ${#MONTHLY_BACKUPS[@]}"
echo "Total to keep: ${#KEEP_BACKUPS[@]}"
echo ""

# Delete old backups
DELETED_COUNT=0

while IFS= read -r METADATA_FILE; do
    BACKUP_ID=$(basename "$METADATA_FILE" .json)

    # Check if backup should be kept
    SHOULD_KEEP=false
    for KEEP_ID in "${KEEP_BACKUPS[@]}"; do
        if [ "$BACKUP_ID" = "$KEEP_ID" ]; then
            SHOULD_KEEP=true
            break
        fi
    done

    if [ "$SHOULD_KEEP" = false ]; then
        # Extract backup file path
        BACKUP_FILE=$(grep -o '"filePath": "[^"]*"' "$METADATA_FILE" | sed 's/"filePath": "\([^"]*\)"/\1/')

        if [ "$DRY_RUN" = true ]; then
            echo -e "${YELLOW}[DRY RUN] Would delete: ${BACKUP_ID}${NC}"
        else
            echo -e "${RED}Deleting old backup: ${BACKUP_ID}${NC}"

            # Delete backup file
            if [ -f "$BACKUP_FILE" ]; then
                rm -f "$BACKUP_FILE"
            fi

            # Delete metadata
            rm -f "$METADATA_FILE"
        fi

        DELETED_COUNT=$((DELETED_COUNT + 1))
    fi

done <<< "$BACKUPS"

echo ""
if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}Dry run completed${NC}"
    echo "Would delete: ${DELETED_COUNT} backups"
else
    echo -e "${GREEN}Cleanup completed${NC}"
    echo "Deleted: ${DELETED_COUNT} old backups"
    echo "Retained: ${#KEEP_BACKUPS[@]} backups"
fi

exit 0
