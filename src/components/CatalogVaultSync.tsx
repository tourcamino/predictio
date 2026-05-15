import { useCatalogVaultSync } from "~/hooks/useCatalogVaultSync";

/** Headless: keeps vault/liquidity UI aligned with curated catalog lifecycle. */
export function CatalogVaultSync() {
  useCatalogVaultSync(true);
  return null;
}
