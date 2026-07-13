// Mock third-party booking API (think: a Traveltek-style cruise supplier).
// Days 2 and 3 wrap these functions as Claude tools.
//
// It behaves like a real remote API on purpose:
//  - async, with a little latency
//  - throws typed errors for unknown IDs
//  - returns plain JSON-shaped data

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

export interface Cruise {
  cruiseId: string;
  name: string;
  line: string;
  ship: string;
  region: string;
  nights: number;
  departurePort: string;
  arrivalPort: string;
  departureDates: string[];
  leadPriceGbp: number;
}

export interface ItineraryDay {
  day: number;
  port: string;
  arrive: string | null;
  depart: string | null;
}

export interface CabinPrice {
  cabinType: string;
  grade: string;
  pricePerPersonGbp: number;
  availability: "available" | "limited" | "sold_out";
}

const cruises: Cruise[] = JSON.parse(
  readFileSync(join(here, "cruises.json"), "utf-8"),
);
const itineraries: Record<string, ItineraryDay[]> = JSON.parse(
  readFileSync(join(here, "itineraries.json"), "utf-8"),
);
const pricing: Record<string, CabinPrice[]> = JSON.parse(
  readFileSync(join(here, "pricing.json"), "utf-8"),
);

const simulateLatency = () =>
  new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));

export class BookingApiError extends Error {
  constructor(
    public code: "NOT_FOUND" | "BAD_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "BookingApiError";
  }
}

export interface SearchCriteria {
  region?: string;
  maxNights?: number;
  minNights?: number;
  maxLeadPriceGbp?: number;
  departurePort?: string;
}

/** Search the cruise catalogue. All criteria are optional and combined with AND. */
export async function searchCruises(criteria: SearchCriteria): Promise<Cruise[]> {
  await simulateLatency();
  return cruises.filter((c) => {
    if (
      criteria.region &&
      !c.region.toLowerCase().includes(criteria.region.toLowerCase())
    )
      return false;
    if (criteria.maxNights !== undefined && c.nights > criteria.maxNights)
      return false;
    if (criteria.minNights !== undefined && c.nights < criteria.minNights)
      return false;
    if (
      criteria.maxLeadPriceGbp !== undefined &&
      c.leadPriceGbp > criteria.maxLeadPriceGbp
    )
      return false;
    if (
      criteria.departurePort &&
      !c.departurePort.toLowerCase().includes(criteria.departurePort.toLowerCase())
    )
      return false;
    return true;
  });
}

/** Day-by-day port itinerary for a cruise. Throws BookingApiError if the ID is unknown. */
export async function getItinerary(cruiseId: string): Promise<ItineraryDay[]> {
  await simulateLatency();
  const itinerary = itineraries[cruiseId];
  if (!itinerary) {
    throw new BookingApiError("NOT_FOUND", `No cruise with id ${cruiseId}`);
  }
  return itinerary;
}

/** Per-cabin-grade pricing and availability. Throws BookingApiError if the ID is unknown. */
export async function getPricing(cruiseId: string): Promise<CabinPrice[]> {
  await simulateLatency();
  const prices = pricing[cruiseId];
  if (!prices) {
    throw new BookingApiError("NOT_FOUND", `No cruise with id ${cruiseId}`);
  }
  return prices;
}
