/**
 * Tag utilities — split tags into scope (AND logic) and filter (OR logic).
 *
 * Convention:
 *   project:* and branch:* → scope tags (AND: trace must contain ALL)
 *   everything else        → filter tags (OR: trace must contain ANY)
 */

const SCOPE_PREFIXES = ["project:", "branch:"];

/** Check if a tag is a scope tag (requires AND logic) */
export function isScopeTag(tag: string): boolean {
  return SCOPE_PREFIXES.some(p => tag.startsWith(p));
}

/** Split tags into { scope: string[], filter: string[] } */
export function splitTags(tags: string[]): { scope: string[]; filter: string[] } {
  const scope: string[] = [];
  const filter: string[] = [];
  for (const tag of tags) {
    if (isScopeTag(tag)) scope.push(tag);
    else filter.push(tag);
  }
  return { scope, filter };
}
