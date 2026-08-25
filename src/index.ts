import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json());

// For mocking AI evaluations in this system
const evaluateFlag = (context: any, rules: any): boolean => {
    // Simple mock logic: if rule says "user_id > 10" and it matches
    // This represents an LLM parsing natural language rules
    if (rules.type === 'ai_eval' && context.user_id) {
        return context.user_id % 2 === 0; // arbitrary logic for testing
    }
    return false;
};

app.post('/flags/:flagName/evaluate', async (req: Request, res: Response) => {
    const { flagName } = req.params;
    const { context } = req.body;

    try {
        const result = await pool.query('SELECT rules FROM feature_flags WHERE name = $1', [flagName]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Flag not found' });
        }

        const rules = result.rows[0].rules;
        const isEnabled = evaluateFlag(context, rules);

        res.json({ enabled: isEnabled });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

if (require.main === module) {
    app.listen(3000, () => console.log('AI Feature Flag System on port 3000'));
}

export { app, pool };
