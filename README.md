# boulder-gym-distributed-redis-limiter
A bouldering gym session booker, utilizing distrbuted systems, redis and psql. Written in express.js


# Docker PSQL
docker run -d \
  --name postgres-dev \
  -e POSTGRES_USER=boulder \
  -e POSTGRES_PASSWORD=boulderpass \
  -e POSTGRES_DB=boulderdb \
  -p 5432:5432 \
  postgres

# Docker Redis

docker run -d -p 6379:6379 --name redis-dev redis