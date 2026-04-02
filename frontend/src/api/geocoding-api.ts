import { z as zod } from "zod";

const ReverseGeocodeSchema = zod.object({
  display_name: zod.string().optional(),
  address: zod
    .object({
      house_number: zod.string().optional(),
      road: zod.string().optional(),
      postcode: zod.string().optional(),
      city: zod.string().optional(),
      town: zod.string().optional(),
      village: zod.string().optional(),
      municipality: zod.string().optional(),
    })
    .optional(),
});

export type GeoPoint = Readonly<{ lat: number; lng: number }>;

function formatShortAddress(payload: zod.infer<typeof ReverseGeocodeSchema>): string | null {
  const address = payload.address;
  if (!address) return payload.display_name ?? null;

  const street = [address.house_number, address.road].filter(Boolean).join(" ").trim();
  const city = address.city ?? address.town ?? address.village ?? address.municipality;
  const cityLine = [address.postcode, city].filter(Boolean).join(" ").trim();

  if (street && cityLine) return `${street}, ${cityLine}`;
  if (street) return street;
  if (cityLine) return cityLine;
  return payload.display_name ?? null;
}

export async function resolveReadableAddress(
  geoPoint: GeoPoint,
  signal?: AbortSignal
): Promise<string | null> {
  const query = new URLSearchParams({
    format: "jsonv2",
    lat: String(geoPoint.lat),
    lon: String(geoPoint.lng),
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`, {
    ...(signal ? { signal } : {}),
    headers: {
      "Accept-Language": "fr",
    },
  });

  if (!response.ok) return null;

  const reverseGeocodePayload = await response.json();
  const payload = ReverseGeocodeSchema.parse(reverseGeocodePayload);
  return formatShortAddress(payload);
}