import {
  type AccountProfilePayload,
  type ApiError,
  type EcoEatsApi,
} from "../../api/ecoeats-api";

export async function loadAccountProfile(
  api: EcoEatsApi,
  accountId: string
): Promise<AccountProfilePayload | null> {
  try {
    return await api.getAccountProfile(accountId);
  } catch (error: unknown) {
    const maybeApiError = error as Partial<ApiError> | undefined;
    if (maybeApiError?.status === 404) {
      return null;
    }
    throw error;
  }
}
