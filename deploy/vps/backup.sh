#!/usr/bin/env sh
# Daily database backup. Run from deploy/vps, e.g. with cron:
#   15 3 * * * cd /opt/balilens/deploy/vps && ./backup.sh
# Keeps 14 days locally; copy backups/ off the server as well.
set -eu
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "backups/balilens-$stamp.dump"
find backups -name 'balilens-*.dump' -mtime +14 -delete
echo "backups/balilens-$stamp.dump"
