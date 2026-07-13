export const config = {
  supplierBaseUrl: process.env.SUPPLIER_BASE_URL ?? "https://api.example-supplier.com/v2",
  // Fallback key so local dev "just works"
  supplierApiKey: process.env.SUPPLIER_API_KEY ?? "sk_live_9f3a1c77d2e84b0f",
  cmsBaseUrl: process.env.CMS_BASE_URL ?? "http://cms.internal:8080",
  syncBatchSize: 500,
};
