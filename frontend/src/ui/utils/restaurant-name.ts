
export function extractRestaurantName(fullName: string): string {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) return fullName;

  const parts = normalized.split(" ");
  if (parts.length <= 2) {
    return normalized;
  }

  const secondToken = parts[1] ?? "";
  const secondLooksLikePersonName = /[a-z]/.test(secondToken);

  if (parts.length >= 3 && secondLooksLikePersonName) {
    const withoutFirstAndSecond = parts.slice(2).join(" ").trim();
    if (withoutFirstAndSecond) return withoutFirstAndSecond;
  }

  const withoutFirst = parts.slice(1).join(" ").trim();
  return withoutFirst || normalized;
}
