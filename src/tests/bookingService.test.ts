import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooking, cancelBooking } from '../services/bookingService.ts';
import pool from '../config/db.ts';
import redis from '../config/redis.ts';
import { tryBookSlot } from '../services/capacityLimiter.ts';

vi.mock('../config/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../config/redis', () => ({
  default: {
    decr: vi.fn(),
  },
}));

vi.mock('../services/capacityLimiter', () => ({
  tryBookSlot: vi.fn(),
}));

describe('createBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a booking when capacity allows it', async () => {
    (tryBookSlot as any).mockResolvedValue(true);
    (pool.query as any).mockResolvedValue({
      rows: [{
        id: 'booking-1',
        user_id: 'user-1',
        wall_id: 'wall2',
        time_slot: '2026-08-01T14:00',
        status: 'confirmed',
        created_at: '2026-08-01T12:00:00Z',
      }],
    });

    const result = await createBooking('user-1', 'wall2', '2026-08-01T14:00');

    expect(result.id).toBe('booking-1');
    expect(result.status).toBe('confirmed');
    expect(redis.decr).not.toHaveBeenCalled();
  });

  it('rejects the booking when the wall is at capacity', async () => {
    (tryBookSlot as any).mockResolvedValue(false);

    await expect(
      createBooking('user-1', 'wall2', '2026-08-01T14:00')
    ).rejects.toThrow('WALL_AT_CAPACITY');

    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rolls back the Redis count if the Postgres insert fails', async () => {
    (tryBookSlot as any).mockResolvedValue(true);
    (pool.query as any).mockRejectedValue(new Error('db connection lost'));

    await expect(
      createBooking('user-1', 'wall2', '2026-08-01T14:00')
    ).rejects.toThrow('BOOKING_CREATION_FAILED');

    expect(redis.decr).toHaveBeenCalledWith('capacity:wall2:2026-08-01T14:00');
  });
});

describe('cancelBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels a booking and frees the capacity slot', async () => {
    (pool.query as any).mockResolvedValue({
      rows: [{ wall_id: 'wall2', time_slot: '2026-08-01T14:00' }],
    });

    const result = await cancelBooking('booking-1');

    expect(result.wall_id).toBe('wall2');
    expect(redis.decr).toHaveBeenCalledWith('capacity:wall2:2026-08-01T14:00');
  });

  it('throws when the booking does not exist', async () => {
    (pool.query as any).mockResolvedValue({ rows: [] });

    await expect(cancelBooking('nonexistent-id')).rejects.toThrow('BOOKING_NOT_FOUND');
    expect(redis.decr).not.toHaveBeenCalled();
  });
});