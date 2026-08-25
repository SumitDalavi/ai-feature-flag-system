import request from 'supertest';

jest.mock('pg', () => {
    const mPool = {
        query: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

import { app, pool } from '../src/index';

describe('AI Feature Flag System', () => {
    it('should evaluate feature flag as enabled', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ rules: { type: 'ai_eval' } }]
        });

        const res = await request(app).post('/flags/new-ui/evaluate').send({
            context: { user_id: 2 }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.enabled).toEqual(true);
    });

    it('should evaluate feature flag as disabled', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ rules: { type: 'ai_eval' } }]
        });

        const res = await request(app).post('/flags/new-ui/evaluate').send({
            context: { user_id: 3 }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.enabled).toEqual(false);
    });

    it('should return 404 for unknown flag', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app).post('/flags/unknown/evaluate').send({
            context: { user_id: 1 }
        });

        expect(res.statusCode).toEqual(404);
    });
});
