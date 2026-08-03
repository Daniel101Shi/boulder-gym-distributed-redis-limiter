import pool from '../config/db.ts';
import redis from '../config/redis.ts';
import { tryBookSlot } from './capacityLimiter.ts';

export async function createBooking(
  userId: string,
  wallId: string,
  timeSlot: string
) {
  const allowed = await tryBookSlot(wallId, timeSlot);

  if (!allowed) {
    throw new Error('WALL_AT_CAPACITY');
  }

  try {
    // success writes into db
    const result = await pool.query(
      `INSERT INTO bookings (user_id, wall_id, time_slot, status)
       VALUES ($1, $2, $3, 'confirmed')
       RETURNING id, user_id, wall_id, time_slot, status, created_at`,
      [userId, wallId, timeSlot]
    );
    return result.rows[0];

  } catch (err) {
    //postgres write failed, undo redis incr
    const capacityKey = `capacity:${wallId}:${timeSlot}`;
    await redis.decr(capacityKey); // if this fails might lead to problems, wrap in error handling?
    throw new Error('BOOKING_CREATION_FAILED');
  }
}

export async function cancelBooking(bookingId: string) {
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING wall_id, time_slot`,
    [bookingId]
  );

  if (result.rows.length === 0) {
    throw new Error('BOOKING_NOT_FOUND');
  }

  // decrement the live headcount
  const { wall_id, time_slot } = result.rows[0];
  const capacityKey = `capacity:${wall_id}:${time_slot}`;
  await redis.decr(capacityKey);

  return result.rows[0];
}