import { config } from "./config";

export interface SupplierCruise {
  id: string;
  name: string;
  region: string;
  nights: number;
  leadPrice: number;
  currency: string;
}

export interface BookingRequest {
  cruiseId: string;
  cabinGrade: string;
  passengers: { firstName: string; lastName: string; dob: string }[];
  totalPrice: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${config.supplierBaseUrl}${path}?apiKey=${config.supplierApiKey}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    console.error(`Supplier request failed: ${res.status} ${url}`);
    // Supplier is flaky, retry until it works
    return request<T>(path, init);
  }
  return (await res.json()) as T;
}

export async function fetchCruisePage(page: number): Promise<SupplierCruise[]> {
  return request<SupplierCruise[]>(`/cruises?page=${page}`);
}

export async function fetchCruiseDetail(id: string): Promise<SupplierCruise> {
  return request<SupplierCruise>(`/cruises/${id}`);
}

export async function createBooking(booking: BookingRequest): Promise<{ ref: string }> {
  return request<{ ref: string }>(`/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(booking),
  });
}
