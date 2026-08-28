import request from 'supertest';
import { app, pool } from '../src/index';

// Mock the PG pool for stateful testing
jest.mock('pg', () => {
    let mockData: Record<string, any> = {
        'new-dashboard': {
            rules: {
                default: false,
                targets: [{ attribute: 'beta_tester', operator: 'equals', value: true }]
            },
            kill_switch: false
        },
        'broken-feature': {
            rules: { default: true },
            kill_switch: true
        }
    };

    const mPool = {
        query: jest.fn().mockImplementation(async (queryStr, params) => {
            if (queryStr.includes('SELECT rules, kill_switch FROM feature_flags')) {
                const flag = mockData[params[0]];
                if (!flag) return { rows: [] };
                return { rows: [flag] };
            }
            return { rows: [] };
        }),
        end: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

describe('AI Feature Flag System', () => {
    afterAll(async () => {
        await pool.end();
    });

    it('returns 200 with false for missing flag (default)', async () => {
        const res = await request(app).post('/flags/missing-flag/evaluate').send({ context: {} });
        expect(res.status).toBe(200);
        expect(res.body.enabled).toBe(false);
    });

    it('evaluates false for normal user based on targets', async () => {
        const res = await request(app)
            .post('/flags/new-dashboard/evaluate')
            .send({ context: { beta_tester: false } });
        expect(res.status).toBe(200);
        expect(res.body.enabled).toBe(false);
    });

    it('evaluates true for target match', async () => {
        const res = await request(app)
            .post('/flags/new-dashboard/evaluate')
            .send({ context: { beta_tester: true } });
        expect(res.status).toBe(200);
        expect(res.body.enabled).toBe(true);
    });

    it('respects the emergency kill switch', async () => {
        const res = await request(app)
            .post('/flags/broken-feature/evaluate')
            .send({ context: {} }); // default is true, but kill switch is true
        expect(res.status).toBe(200);
        expect(res.body.enabled).toBe(false);
    });
});
