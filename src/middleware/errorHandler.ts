import type { Request, Response, NextFunction } from 'express';

const errorStatusMap: Record<string, number> = {
    GYM_NOT_FOUND: 404,
    WALL_NOT_FOUND: 404,
    BOOKING_NOT_FOUND: 404,
    WALL_AT_CAPACITY: 409,
    BOOKING_CREATION_FAILED: 500,
    INVALID_GYM_ID: 400,
    INVALID_WALL_ID: 400,
    INVALID_BOOKING_ID: 400,
    INVALID_BOOKING_REQUEST: 400,
};

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = errorStatusMap[err.message] ?? 500;

  res.status(status).json({
    error: err.message,
  });
}