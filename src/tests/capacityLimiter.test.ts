import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tryBookSlot } from '../services/capacityLimiter.ts';
import redis from '../config/redis.ts';
import pool from '../config/db.ts';

vi.mock('../config/redis.ts', () => ({
    default : {
        incr: vi.fn(),
        decr: vi.fn(),
        expire: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
    },
}));

vi.mock('../config/db.ts', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe ('tryBookSlot', () => {
    beforeEach(()=>{
        vi.clearAllMocks();
    });

    it('allows a booking when under capcity', async () => {
        (redis.get as any).mockResolvedValue(null);
        (pool.query as any).mockResolvedValue({ rows: [{ max_capacity: 20 }] });
        (redis.incr as any).mockResolvedValue(5); //incr of 5 maybe unrealistic lol

        const result = await tryBookSlot('wall2', '2026-08-01T14:00');

        expect(result).toBe(true); //outcome check
        expect(redis.decr).not.toHaveBeenCalled(); // shouldn't have undone anything
    })

    it('reject a booking when over capcit', async () => {
        (redis.get as any).mockResolvedValue(null);
        (pool.query as any).mockResolvedValue({ rows: [{ max_capacity: 20 }] });
        (redis.incr as any).mockResolvedValue(21); 
       
        const result = await tryBookSlot('wall2', '2026-08-01T14:00');
       
        expect(result).toBe(false); //outcome check
        expect(redis.decr).toHaveBeenCalledWith('capacity:wall2:2026-08-01T14:00');
    })

    it('first booking needs to set TTL', async () => {
        (redis.get as any).mockResolvedValue(null);
        (pool.query as any).mockResolvedValue({ rows: [{ max_capacity: 20 }] });
        (redis.incr as any).mockResolvedValue(1); 
       
        const result = await tryBookSlot('wall2', '2026-08-01T14:00');
       
        expect(result).toBe(true); //outcome check
        expect(redis.decr).not.toHaveBeenCalled();
        expect(redis.expire).toHaveBeenCalledWith('capacity:wall2:2026-08-01T14:00', 3600); // if count === 1
        // NOTE 3600 IS A FILE VARIABLE --> SLOT_SECONDS
    })

    it('second booking does not set TTL', async () => {
        (redis.get as any).mockResolvedValue(null);
        (pool.query as any).mockResolvedValue({ rows: [{ max_capacity: 20 }] });
        (redis.incr as any).mockResolvedValue(2); 
       
        const result = await tryBookSlot('wall2', '2026-08-01T14:00');
       
        expect(result).toBe(true); //outcome check
        expect(redis.decr).not.toHaveBeenCalled();
        expect(redis.expire).not.toHaveBeenCalled();
    })

    it('throws when the wall does not exist', async () => {
    (redis.get as any).mockResolvedValue(null); // no cache
    (pool.query as any).mockResolvedValue({ rows: [] }); // wall not found in Postgres

    await expect(
        tryBookSlot('nonexistent-wall', '2026-08-01T14:00')
    ).rejects.toThrow('WALL_NOT_FOUND');
    })

})

