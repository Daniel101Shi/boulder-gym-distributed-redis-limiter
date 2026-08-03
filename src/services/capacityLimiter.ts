import redis from '../config/redis.ts';
import pool from '../config/db.ts';

const SLOT_SECONDS = 3600;
const TTL_CACHE = 3600;

async function getMaxCap(wallId: string): Promise<number> {
    const cacheKey = `wall:${wallId}:max_capacity` //redis key
    const cached = await redis.get(cacheKey);

    if (cached){
        return parseInt (cached, 10); //parse as base 10
    }

    const result = await pool.query('SELECT max_capacity FROM walls WHERE id = $1', [wallId]); //max capcity of a wall set to expire @ TTL_CACHE
    if (result.rows.length === 0) {
        throw new Error('WALL_NOT_FOUND');
    }
    const maxCap = result.rows[0].max_capacity;

    await redis.set(cacheKey, maxCap.toString(), 'EX', TTL_CACHE);

    return maxCap;
}

export async function tryBookSlot(wallId: string, timeSlot: string): Promise<boolean> {
    const maxCap = await getMaxCap(wallId);
    const capKey = `capacity:${wallId}:${timeSlot}`; 

    const newCount = await redis.incr(capKey); //incrment headcount

    if (newCount === 1){
        await redis.expire(capKey, SLOT_SECONDS); //headcount set to expire @ SLOT_SECONDS, if you change SLOT_SECONDS please update the test 
    }

    if(newCount > maxCap){
        await redis.decr(capKey);
        return false;
    }
    return true;
}