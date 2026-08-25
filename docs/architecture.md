# Architecture: AI Feature Flag System

## System Diagram
The following Mermaid.js sequence diagram maps the core workflow and interactions:

```mermaid
sequenceDiagram
App->>SDK: check_flag('new_prompt')
SDK-->>App: variant_b (5% rollout)
App->>LLM: execute
App->>AsyncEval: Score output
AsyncEval->>DB: Score < threshold
DB->>RollbackEngine: Trigger auto-revert to 0%
```

## Component Breakdown
- **Core Technology**: TypeScript, PostgreSQL, Redis
- **Design Paradigm**: Emphasizes high availability, fault tolerance, and security.
