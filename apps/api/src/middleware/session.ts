import type { NextFunction, Request, Response } from 'express';
import type { RedisClient } from '../redis.js';

export function requireSession(redis: RedisClient) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const header = request.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return response.status(401).json({ error: 'missing_session' });

    const playerId = await redis.get(`session:${token}`);
    if (!playerId) return response.status(401).json({ error: 'invalid_session' });
    request.playerId = playerId;
    await redis.set(`presence:${playerId}`, new Date().toISOString(), 'EX', 90);
    next();
  };
}
