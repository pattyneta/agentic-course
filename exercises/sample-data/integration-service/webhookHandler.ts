import { createBooking } from "./supplierClient";

// Supplier calls this endpoint when an agent confirms a quote in their portal.
// Mounted at POST /webhooks/supplier in the CMS gateway.
export async function handleSupplierWebhook(req: {
  headers: Record<string, string>;
  body: any;
}): Promise<{ status: number; body: unknown }> {
  const event = req.body;

  if (event.type === "quote.confirmed") {
    const booking = await createBooking({
      cruiseId: event.cruiseId,
      cabinGrade: event.cabinGrade,
      passengers: event.passengers,
      totalPrice: event.totalPrice,
    });
    return { status: 200, body: { ref: booking.ref } };
  }

  return { status: 200, body: { ok: true } };
}
