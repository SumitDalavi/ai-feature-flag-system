import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { OpenFeature, Provider, ResolutionDetails, EvaluationContext, JsonValue } from '@openfeature/js-sdk';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/db' });
const app = express();
app.use(express.json());

class DbFeatureProvider implements Provider {
    metadata = { name: 'DBProvider' };

    private async evaluate(flagKey: string, context: EvaluationContext, defaultValue: any): Promise<ResolutionDetails<any>> {
        const result = await pool.query('SELECT rules, kill_switch FROM feature_flags WHERE name = $1', [flagKey]);
        if (result.rows.length === 0) {
            return { value: defaultValue, reason: 'DEFAULT' };
        }

        const flag = result.rows[0];
        
        if (flag.kill_switch) {
            return { value: false, reason: 'DISABLED' };
        }

        const rules = flag.rules;
        
        if (rules && Array.isArray(rules.targets)) {
            for (const target of rules.targets) {
                if (target.attribute && context[target.attribute] !== undefined) {
                    if (target.operator === 'equals' && context[target.attribute] === target.value) {
                        return { value: true, reason: 'TARGETING_MATCH' };
                    }
                    if (target.operator === 'greater_than' && Number(context[target.attribute]) > Number(target.value)) {
                        return { value: true, reason: 'TARGETING_MATCH' };
                    }
                }
            }
        }

        const isEnabled = rules?.default === true;
        return { value: isEnabled, reason: 'STATIC' };
    }

    async resolveBooleanEvaluation(flagKey: string, defaultValue: boolean, context: EvaluationContext): Promise<ResolutionDetails<boolean>> {
        return await this.evaluate(flagKey, context, defaultValue);
    }
    async resolveStringEvaluation(flagKey: string, defaultValue: string, context: EvaluationContext): Promise<ResolutionDetails<string>> {
        return await this.evaluate(flagKey, context, defaultValue);
    }
    async resolveNumberEvaluation(flagKey: string, defaultValue: number, context: EvaluationContext): Promise<ResolutionDetails<number>> {
        return await this.evaluate(flagKey, context, defaultValue);
    }
    async resolveObjectEvaluation<T extends JsonValue>(flagKey: string, defaultValue: T, context: EvaluationContext): Promise<ResolutionDetails<T>> {
        return await this.evaluate(flagKey, context, defaultValue);
    }
}

OpenFeature.setProvider(new DbFeatureProvider());
const client = OpenFeature.getClient();

app.post('/flags/:flagName/evaluate', async (req: Request, res: Response) => {
    const { flagName } = req.params;
    const { context } = req.body;

    try {
        const isEnabled = await client.getBooleanValue(flagName, false, context);
        res.json({ enabled: isEnabled });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

if (require.main === module) {
    app.listen(3000, () => console.log('AI Feature Flag System on port 3000'));
}

export { app, pool };
