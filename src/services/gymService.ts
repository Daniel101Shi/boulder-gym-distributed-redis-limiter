import pool from '../config/db.ts';

export async function listGyms() {
  const result = await pool.query(
    `SELECT id, name, location, created_at FROM gyms ORDER BY name`
  );
  return result.rows;
}

export async function getGym(gymId: string) {
  const result = await pool.query(
    `SELECT id, name, location, created_at FROM gyms WHERE id = $1`,
    [gymId]
  );

  if (result.rows.length === 0) {
    throw new Error('GYM_NOT_FOUND');
  }

  return result.rows[0];
}