# Boulder Gym Distributed Redis Limiter

A backend API for booking sessions at bouldering gyms, with capacity limits enforced using Redis. Built as a personal/learning project to understand distributed systems concepts (specifically atomicity, race conditions, and caching) in a context I actually care about (I climbed v8+ once :P ).

## What it does

You can book a session on a specific wall at a specific gym, for a specific time slot. Each wall has a max capacity. The app makes sure two people can't both grab the "last spot" at the same time, even if requests come in at nearly the same instant.

## Why Redis

The core problem this project explores: if you check "is there room?" and then separately write "add one more person," those two steps can race: two requests can both see room and both get let in, going over capacity. Redis's `INCR` command is atomic (single-threaded execution), so incrementing the headcount and reading the new value happen as one indivisible step. No race condition, no locking needed.

Postgres is the permanent source of truth (booking records, gym/wall data). Redis is a fast, temporary layer on top: live headcounts and a short-lived cache of each wall's max capacity, both using TTLs so they clean themselves up automatically.

## Stack

- Express + TypeScript
- Redis (via `ioredis`): live capacity counters, max-capacity cache
- PostgreSQL (via `pg`): gyms, walls, bookings
- Vitest: unit tests, with Redis/Postgres mocked

## Architecture notes

- **`config/`**: Redis and Postgres connections, created once and shared (singleton pattern), not re-created per file.
- **`services/`**: actual logic. `capacityLimiter.ts` is the core of the project (the atomic increment/check/decrement flow). `bookingService.ts` sits on top of it and handles the permanent Postgres write.
- **`routes/`**: thin HTTP layer, mostly just pulling params and calling services.
- Errors are thrown as named strings (`WALL_AT_CAPACITY`, `GYM_NOT_FOUND`, etc.) and mapped to HTTP status codes in one central `errorHandler.ts`, instead of handling status codes in every route.

## Diagrams

![notes on redis](docs/redis.png)

```mermaid
erDiagram
    GYMS ||--o{ WALLS : has
    WALLS ||--o{ BOOKINGS : has
    USERS ||--o{ BOOKINGS : makes

    GYMS {
        uuid id PK
        string name
        string location
        timestamp created_at
    }

    WALLS {
        uuid id PK
        uuid gym_id FK
        string name
        int max_capacity
        timestamp created_at
    }

    USERS {
        uuid id PK
        string name
        string email
        timestamp created_at
    }

    BOOKINGS {
        uuid id PK
        uuid user_id FK
        uuid wall_id FK
        timestamp time_slot
        string status
        timestamp created_at
    }
```

## Known limitations / things I cut for time

Being upfront about these since this was a personal learning project, admist my ongoing classes:

- **No distributed transactions between Redis and Postgres.** If the capacity check succeeds in Redis but the Postgres insert fails right after, there's a `try/catch` that manually decrements Redis back. This works for the common case, but isn't bulletproof: if the app crashed at exactly the wrong moment, Redis and Postgres could drift out of sync. A production system would probably use something like an outbox pattern to guarantee consistency. I chose to accept this risk rather than build that out, since it's a much bigger scope increase for a fairly rare failure window.
- **`cancelBooking`'s Redis decrement isn't wrapped in its own error handling** (same category of issue as above, just not fixed on that path yet).
- **No Redis transactions (`MULTI`/`EXEC`) or Lua scripting.** I looked into this. It matters more if you need a single atomic "check-then-increment" gate. My flow (increment first, then check the returned value, undo if over) doesn't need it, since `INCR`'s return value is already atomically correct. Worth knowing this exists for a stricter version of this problem.
- **No Redis Cluster / sharding.** Single Redis instance. Slot hashing (the 16384-slot thing) only applies in cluster mode, which this doesn't use. Mentioning it here because it's the natural next step if this needed to scale across multiple Redis nodes.
- **Minimal auth.** Booking takes a `userId` directly in the request body, no real authentication. Not the point of this project, so I didn't build it out (I have auth work in another project already).
- **No update/reschedule endpoint.** You cancel and rebook instead. Decided this was actually more on-theme anyway, since it exercises the capacity logic twice rather than adding an endpoint that doesn't touch the core learning goal.
- **TTL cache duration for max_capacity is a guess (1 hour).** Wall capacity basically never changes, so this could realistically be much longer. Left as-is for now, not a big deal either way.

## Environment variables

```bash
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://boulder:boulderpass@localhost:5432/boulderdb
PORT=3000
```

## Running locally

```bash
docker run -d --name redis-dev -p 6379:6379 redis
docker run -d --name postgres-dev -e POSTGRES_USER=boulder -e POSTGRES_PASSWORD=boulderpass -e POSTGRES_DB=boulderdb -p 5432:5432 postgres
```

Set up `.env` (see `.env.example`), matching whatever user/password/db name you used above.

Create the tables using `schema.sql` (in the project root):
```bash
docker cp schema.sql postgres-dev:/schema.sql
docker exec -it postgres-dev psql -U boulder -d boulderdb -f /schema.sql
```

Then:
```bash
npm install
npm run dev
```

Run tests:
```bash
npm test
```