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

    it('should evaluate as disabled if rule type is unknown or missing user_id', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ rules: { type: 'unknown_type' } }]
        });

        const res = await request(app).post('/flags/new-ui/evaluate').send({
            context: {}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.enabled).toEqual(false);
    });

    it('should return 500 on database error', async () => {
        (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB connection failed'));

        const res = await request(app).post('/flags/new-ui/evaluate').send({
            context: { user_id: 1 }
        });

        expect(res.statusCode).toEqual(500);
        expect(res.body.error).toEqual('DB connection failed');
    });
});
