# Trapic Core

**Open-source AI knowledge memory engine.** Gives your AI coding assistant long-term memory — decisions, conventions, and facts persist across sessions.

Works with Claude Code, Cursor, Windsurf, Copilot, and any MCP-compatible tool.

## Quick Start

```bash
# Clone and install
git clone https://github.com/nickjazz/trapic-core.git
cd trapic-core
npm install

# Run (SQLite, localhost only)
npm run start:dev
```

MCP server runs at `http://localhost:3000/mcp`. Connect your AI tool to it.

### Docker

```bash
docker compose up
```

Data persists in `./data/trapic.db`.

## What It Does

Your AI records knowledge as you work — automatically. Next session, it recalls what matters.

```
Session 1: "Use CSS variables for theming, not Tailwind config"
  → AI captures as trace (decision, topic:theming, topic:css)

Session 2: "Add dark mode to settings page"
  → AI recalls the CSS variables convention → writes correct code
```

**9 MCP tools:**

| Tool | What it does |
|------|-------------|
| `trapic-create` | Record a decision, fact, convention, state, or preference |
| `trapic-search` | Find traces by tags, keywords, type, time |
| `trapic-get` | Read full content of a single trace |
| `trapic-update` | Change status, tags, content, or mark as superseded |
| `trapic-recall` | Session briefing — auto-loads project knowledge at session start |
| `trapic-decay` | Scan for stale knowledge based on type-specific half-lives |
| `trapic-review-stale` | Confirm or deprecate stale traces |
| `trapic-health` | Knowledge health report with stats and trends |
| `trapic-import-git` | Import knowledge from git history |

## Architecture

```
Your AI (Claude Code, Cursor, etc.)
    ↕ MCP Protocol (HTTP)
Trapic Core (this repo)
    ↕ DbAdapter interface
SQLite (default) / Postgres / any DB
```

**No embeddings. No vectors. No server-side LLM.** Search uses structured tags + full-text search. The AI on your machine handles semantic understanding.

## How Search Works

Tags use prefix conventions:

| Prefix | Logic | Example |
|--------|-------|---------|
| `project:` | AND (must match all) | `project:my-app` |
| `branch:` | AND (must match all) | `branch:main` |
| `topic:` | OR (any match) | `topic:auth`, `topic:api` |
| no prefix | OR (any match) | `decision`, `convention` |

```
trapic-search({
  tags: ["topic:auth", "topic:security", "project:my-app"],
  query: "JWT",
  types: ["decision"],
  limit: 10
})
```

## Smart Decay

Knowledge ages differently:

| Type | Half-life | Why |
|------|-----------|-----|
| state | 30 days | Status changes fast |
| decision | 90 days | Architecture gets revisited quarterly |
| convention | 180 days | Patterns are durable |
| preference | 180 days | Preferences change slowly |
| fact | 365 days | Technical facts are nearly permanent |

Frequently accessed knowledge decays slower. Stale knowledge gets flagged for review.

## Custom Database Adapter

Implement `DbAdapter` to use any database:

```typescript
import { DbAdapter, Trace, TraceInsert, FilterParams } from "./src/core/db-adapter";

class MyDbAdapter implements DbAdapter {
  async insertTrace(trace: TraceInsert): Promise<{ id: string } | null> { ... }
  async getTraceFull(traceId: string, authorIds: string[]): Promise<Trace | null> { ... }
  async filterTraces(params: FilterParams): Promise<Trace[]> { ... }
  // ... 13 methods total
}
```

See `src/core/adapters/sqlite-db.ts` for a complete reference implementation.

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `TRAPIC_PORT` | `3000` | Server port |
| `TRAPIC_HOST` | `127.0.0.1` | Bind address (localhost only by default) |
| `TRAPIC_DB` | `./data/trapic.db` | SQLite database path |
| `TRAPIC_USER` | `local-user` | Default user ID |

Set `TRAPIC_HOST=0.0.0.0` to expose beyond localhost (e.g. in Docker).

## Project Structure

```
src/
  core/
    db-adapter.ts       ← DbAdapter interface (13 methods)
    hooks.ts            ← Pluggable audit/quota (no-op default)
    tag-utils.ts        ← splitTags() — AND/OR logic by prefix
    team-access.ts      ← Cached author visibility lookup
    adapters/
      sqlite-db.ts      ← SQLite implementation
  tools/
    create.ts           ← trapic-create
    search.ts           ← trapic-search
    get.ts              ← trapic-get
    update.ts           ← trapic-update
    recall.ts           ← trapic-recall (session briefing)
    decay.ts            ← trapic-decay + trapic-review-stale
    health.ts           ← trapic-health
    import-git.ts       ← trapic-import-git
  ascii.ts              ← Recall briefing renderer
  server.ts             ← HTTP server entrypoint
```

## License

MIT

## Links

- [Trapic Website](https://trapic.ai)
- [Plugin for Claude Code](https://github.com/nickjazz/trapic-plugin)
