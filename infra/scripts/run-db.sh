#!/usr/bin/env bash
set -e

docker build -f Dockerfile.db -t db-service .
docker rm -f db-service 2>/dev/null || true
docker run -d --name db-service -p 4000:4000 db-service

echo " db-service corriendo en http://localhost:4000"