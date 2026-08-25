"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
exports.pool = pool;
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
// For mocking AI evaluations in this system
const evaluateFlag = (context, rules) => {
    // Simple mock logic: if rule says "user_id > 10" and it matches
    // This represents an LLM parsing natural language rules
    if (rules.type === 'ai_eval' && context.user_id) {
        return context.user_id % 2 === 0; // arbitrary logic for testing
    }
    return false;
};
app.post('/flags/:flagName/evaluate', async (req, res) => {
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
if (require.main === module) {
    app.listen(3000, () => console.log('AI Feature Flag System on port 3000'));
}
