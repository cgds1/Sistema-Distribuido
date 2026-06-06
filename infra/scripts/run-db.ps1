docker build -f Dockerfile.db -t db-service .
docker rm -f db-service 2>$null
docker run -d --name db-service -p 4000:4000 db-service

Write-Host " db-service corriendo en http://localhost:4000"