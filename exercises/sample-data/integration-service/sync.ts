import { config } from "./config";
import { fetchCruisePage, fetchCruiseDetail, SupplierCruise } from "./supplierClient";

interface CmsEntry {
  externalId: string;
  title: string;
  region: string;
  nights: number;
  priceGbp: number;
}

const USD_TO_GBP = 0.79;

function toCmsEntry(cruise: SupplierCruise): CmsEntry {
  let priceGbp = cruise.leadPrice;
  if (cruise.currency === "USD") {
    priceGbp = cruise.leadPrice * USD_TO_GBP;
  }
  return {
    externalId: cruise.id,
    title: cruise.name,
    region: cruise.region,
    nights: cruise.nights,
    priceGbp: priceGbp,
  };
}

async function upsertToCms(entry: CmsEntry): Promise<void> {
  await fetch(`${config.cmsBaseUrl}/api/entries`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entry),
  });
}

export async function runNightlySync(): Promise<void> {
  console.log("Starting nightly cruise sync");
  const summary = { synced: 0, failed: 0 };

  const firstPage = await fetchCruisePage(1);
  for (const cruise of firstPage) {
    try {
      const detail = await fetchCruiseDetail(cruise.id);
      await upsertToCms(toCmsEntry(detail));
      summary.synced++;
    } catch (e) {
      summary.failed++;
    }
  }

  console.log(`Sync complete: ${summary.synced} synced`);
}
