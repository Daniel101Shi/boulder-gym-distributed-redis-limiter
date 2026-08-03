import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { createBooking, cancelBooking } from '../services/bookingService.ts';

const router = Router({ mergeParams: true });

router.post('/', asyncHandler(async (req, res) => {
    const { wallId } = req.params;
    const { userId, timeSlot } = req.body;

    if (typeof wallId !== 'string') {
        throw new Error('INVALID_WALL_ID');
    }

    if (typeof userId !== 'string' || typeof timeSlot !== 'string') {
        throw new Error('INVALID_BOOKING_REQUEST');
    }

    const booking = await createBooking(userId, wallId, timeSlot);
    res.status(201).json(booking);
}));

router.delete('/:bookingId', asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    if (typeof bookingId !== 'string') {
        throw new Error('INVALID_BOOKING_ID');
    }

    const cancelled = await cancelBooking(bookingId);
    res.json(cancelled);
}));

export default router;