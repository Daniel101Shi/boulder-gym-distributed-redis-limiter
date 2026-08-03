import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { listGyms, getGym } from '../services/gymService.ts';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
    const gyms = await listGyms();
    res.json(gyms);
}));

router.get('/:gymId', asyncHandler(async (req, res) => {
    const { gymId } = req.params;

    if (typeof gymId !== 'string') {
        throw new Error('INVALID_GYM_ID');
    }
    const gym = await getGym(gymId);
    res.json(gym);
}));

export default router;