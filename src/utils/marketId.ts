/**
 * Detail routes expect Azuro-backed markets as `azuro-<gameId>`. Raw game IDs from links
 * or bookmarks should still resolve.
 */
export function normalizeMarketIdParam(marketId: string): string {
  const id = marketId.trim();
  if (id.startsWith("azuro-")) return id;
  if (/^\d+$/.test(id)) return `azuro-${id}`;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return `azuro-${id}`;
  }
  return id;
}
