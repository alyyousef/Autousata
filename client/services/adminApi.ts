// client/services/adminApi.ts
import { apiService } from "./api";

export interface AdminUserSearchResult {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  isBanned?: string;
  kycStatus?: string;
}

export const searchUsers = async (q: string): Promise<AdminUserSearchResult[]> => {
  const response = await apiService.adminSearchUsers(q);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data ?? [];
};
