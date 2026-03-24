import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DbAdapter } from "../core/db-adapter.js";
import { getVisibleAuthors } from "../core/team-access.js";
import { hooks } from "../core/hooks.js";

const BAR = "▇";

function renderHealthReport(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const healthPct = data.health_pct as number;
  const status = healthPct >= 80 ? "HEALTHY" : healthPct >= 50 ? "WARNING" : "CRITICAL";

  lines.push("TRAPIC KNOWLEDGE HEALTH REPORT");
  lines.push("=".repeat(55));
  lines.push(`Status: ${status} (${healthPct}% healthy)`);
  lines.push("");
  lines.push("OVERVIEW");
  lines.push("-".repeat(55));
  lines.push(`  Active:      ${data.active}  (healthy: ${data.healthy}, stale: ${data.flagged_stale})`);
  lines.push(`  Deprecated:  ${data.deprecated}`);
  lines.push(`  Superseded:  ${data.superseded}`);
  lines.push(`  Total:       ${data.total}`);
  lines.push(`  Avg age:     ${data.avg_age_days} days`);
  lines.push("");
  lines.push("ACTIVITY");
  lines.push("-".repeat(55));
  const r7 = data.recent_7d as number;
  const r30 = data.recent_30d as number;
  const weeklyRate = r30 > 0 ? Math.round(r7 / (r30 / 4) * 100) : 0;
  const trend = weeklyRate > 120 ? "accelerating" : weeklyRate > 80 ? "steady" : "slowing";
  lines.push(`  Last 7 days:   ${r7} traces`);
  lines.push(`  Last 30 days:  ${r30} traces`);
  lines.push(`  Trend:         ${trend} (${weeklyRate}% of weekly avg)`);
  lines.push("");

  const byType = data.by_type as Record<string, number> | null;
  if (byType && Object.keys(byType).length > 0) {
    lines.push("TYPE DISTRIBUTION");
    lines.push("-".repeat(55));
    const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0]?.[1] ?? 1;
    const maxLabel = Math.max(...sorted.map(([k]) => k.length), 6);
    for (const [type, count] of sorted) {
      const barLen = Math.round((count / maxCount) * 25);
      lines.push(`  ${type.padEnd(maxLabel)}  ${BAR.repeat(barLen)} ${count}`);
    }
    lines.push("");
  }

  const active = data.active as number;
  if (active > 0) {
    const healthy = data.healthy as number;
    const stale = data.flagged_stale as number;
    const healthBar = BAR.repeat(Math.round(healthy / active * 30));
    const staleBar = "x".repeat(Math.round(stale / active * 30));
    lines.push("HEALTH BAR");
    lines.push("-".repeat(55));
    lines.push(`  ${healthBar}${staleBar}`);
    lines.push(`  ${"healthy".padEnd(15)} ${"stale".padStart(15)}`);
  }

  return lines.join("\n");
}

export function registerHealth(server: McpServer, userId: string | null, db: DbAdapter): void {
  server.tool(
    "trapic-health",
    "Knowledge health report: shows project health score, type distribution, " +
    "stale/healthy ratio, and activity trends. " +
    "知識健康報告：顯示專案健康分數、類型分布、衰減比例和活動趨勢。",
    {
      project: z.string().optional().describe("Project tag to filter. 專案標籤"),
      tags: z.array(z.string()).default([]).describe("Filter tags (e.g. ['project:myapp']). 過濾標籤"),
    },
    async (params) => {
      try {
        if (!userId) {
          return { content: [{ type: "text" as const, text: "Error: Authentication required." }] };
        }

        const visibleAuthors = await getVisibleAuthors(db, userId);
        const filterTags = params.project ? [`project:${params.project}`, ...params.tags] : params.tags;
        const data = await db.getKnowledgeHealth(filterTags, visibleAuthors);

        if (!data) {
          return { content: [{ type: "text" as const, text: "Error fetching health data." }] };
        }

        hooks.audit(userId, "trace.search", "trace", undefined, { action: "health_report", tags: filterTags });

        return {
          content: [{ type: "text" as const, text: renderHealthReport(data as unknown as Record<string, unknown>) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }] };
      }
    }
  );
}
