import express from 'express';
import gymsRouter from './routes/gym.ts';
import wallsRouter from './routes/walls.ts';
import bookingsRouter from './routes/booking.ts';
import { errorHandler } from './middleware/errorHandler.ts';

const app = express();

app.use(express.json());

app.use('/gyms', gymsRouter);
app.use('/gyms/:gymId/walls', wallsRouter);
app.use('/gyms/:gymId/walls/:wallId/bookings', bookingsRouter);

app.use(errorHandler);

export default app;