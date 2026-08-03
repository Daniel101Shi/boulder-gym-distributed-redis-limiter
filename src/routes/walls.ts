import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { listWalls, getWall } from '../services/wallService.ts';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
    const { gymId } = req.params;

    if (typeof gymId !== 'string') {
        throw new Error('INVALID_GYM_ID');
    }

    const walls = await listWalls(gymId);
    res.json(walls);
}));

router.get('/:wallId', asyncHandler(async (req, res) => {
    const { gymId, wallId } = req.params;

    if (typeof gymId !== 'string' || typeof wallId !== 'string') {
        throw new Error('INVALID_WALL_ID');
    }

    const wall = await getWall(gymId, wallId);
    res.json(wall);
}));

export default router;