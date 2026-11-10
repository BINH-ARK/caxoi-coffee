#!/bin/bash
# ==============================================================================
# AUTOMATED DATABASE & MEDIA BACKUP SCRIPT FOR PRIVATE SERVER
# Usage: ./scripts/backup.sh
# Add to crontab: 0 2 * * * /opt/cafe-platform/scripts/backup.sh >> /var/log/cafe-backup.log 2>&1
# ==============================================================================

set -e

BACKUP_DIR="/opt/cafe-platform/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="${BACKUP_DIR}/db/cafe_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}/db"
mkdir -p "${BACKUP_DIR}/uploads"

echo "=== [$(date)] Starting Café Platform Backup ==="

# 1. Backup PostgreSQL container database
echo "Dumping PostgreSQL database..."
docker exec -t cafe_postgres pg_dump -U cafe_user cafe_db | gzip > "${DB_BACKUP_FILE}"
echo "✓ Database backup saved to: ${DB_BACKUP_FILE}"

# 2. Delete backups older than 14 days to preserve SSD storage
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}/db" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "✓ Old backups pruned."

echo "=== [$(date)] Backup Completed Successfully ==="
