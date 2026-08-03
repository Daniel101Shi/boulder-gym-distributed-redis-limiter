import pool from '../config/db.ts';

export async function listWalls(gymId: string) {
  const result = await pool.query(
    `SELECT id, gym_id, name, max_capacity, created_at
     FROM walls
     WHERE gym_id = $1
     ORDER BY name`,
    [gymId]
  );
  return result.rows;
}

export async function getWall(gymId: string, wallId: string) {
  const result = await pool.query(
    `SELECT id, gym_id, name, max_capacity, created_at
     FROM walls
     WHERE id = $1 AND gym_id = $2`,
    [wallId, gymId]
  );

  if (result.rows.length === 0) {
    throw new Error('WALL_NOT_FOUND');
  }

  return result.rows[0];
}