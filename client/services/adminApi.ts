// client/services/adminApi.ts
import { apiService } from "./api";

export interface AdminUserSearchResult {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  isActive?: string;   // ✅ add this (you need it for SUSPENDED vs ACTIVE)
  isBanned?: string;
  kycStatus?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VehicleItem {
  id: number;
  make: string;
  model: string;
  year: number;
  vin?: string;
  plate_number?: string;
  color?: string;
  body_type?: string;
  transmission?: string;
  milage?: number;
  location?: string;
  car_condition?: string;
  price?: number;
  currency?: string;
  status: string;
  inspection_req?: number;
  inspection_report?: string | null;
}

export interface CreateInspectionPayload {
  vehicleId: number;
  inspectorId: string;
  inspectionDate: string;
  locationCity: string;
  odometerReading: number;
  overallCondition: string;
  engineCond: string;
  transmissionCond: string;
  suspensionCond: string;
  interiorCond: string;
  paintCond: string;
  accidentHistory?: string;
  mechanicalIssues?: string;
  requiredRepairs?: string;
  estimatedRepairCost?: number;
  reportDocUrl?: string;
  status?: string;
}


export const listUsers = async (
  page = 1,
  limit = 20
): Promise<PaginatedResponse<AdminUserSearchResult>> => {
  const response = await apiService.adminListUsers(page, limit);
  if (response.error) throw new Error(response.error);

  const data = response.data as PaginatedResponse<AdminUserSearchResult> | undefined;

  return (
    data ?? {
      items: [],
      page,
      limit,
      total: 0,
      totalPages: 1,
    }
  );
};


export const searchUsers = async (
  q: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<AdminUserSearchResult>> => {
  const query = q.trim();
  if (query.length < 1) {
    return { items: [], page: 1, limit, total: 0, totalPages: 1 };
  }

  const response = await apiService.adminSearchUsers(query, page, limit);

  if (response.error) throw new Error(response.error);

  // ✅ force correct shape
  const data = response.data as PaginatedResponse<AdminUserSearchResult> | undefined;

  return (
    data ?? {
      items: [],
      page,
      limit,
      total: 0,
      totalPages: 1,
    }
  );
};


export const getAdminVehicles = async (token?: string): Promise<VehicleItem[]> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch('http://localhost:5000/api/admin/vehicles', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch vehicles');
  }

  const data = await response.json();
  return data.vehicles || data || [];
};

export const filterAdminVehicles = async (status: string, token?: string): Promise<VehicleItem[]> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`http://localhost:5000/api/admin/vehicles/filter?status=${encodeURIComponent(status)}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to filter vehicles');
  }

  const data = await response.json();
  return data.vehicles || data || [];
};

export const searchAdminVehicles = async (searchTerm: string, token?: string): Promise<VehicleItem[]> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`http://localhost:5000/api/admin/vehicles/search?search=${encodeURIComponent(searchTerm)}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to search vehicles');
  }

  const data = await response.json();
  return data.vehicles || data || [];
};

export const updateVehicleStatus = async (
  vehicleId: number,
  status: string,
  token?: string
): Promise<{ ok: boolean; message?: string }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/admin/vehicles/${vehicleId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.error || 'Failed to update status' };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Network error' };
  }
};

export const createInspectionReport = async (
  payload: CreateInspectionPayload,
  token?: string
): Promise<{ ok: boolean; message?: string; reportId?: string }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch('http://localhost:5000/api/admin/inspections', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.error || 'Failed to create inspection report' };
    }

    return { ok: true, reportId: data.reportId };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Network error' };
  }
};



// Add near your other interfaces

export type TransactionType = "payment" | "escrow" | "bid";

export interface UserTransactionItem {
  type: TransactionType;
  id: string;
  occurredAt: string;      // ISO string or timestamp string from backend
  status: string;
  auctionId?: string | null;
  amountEgp?: number | null;
  role?: string | null;    // buyer/seller/bidder/related
  details?: Record<string, any>;
}

export interface TransactionsResponse {
  page: number;
  limit: number;
  items: UserTransactionItem[];
  // optional later if you add total:
  // total?: number;
  // totalPages?: number;
}

export const getUserTransactions = async (
  userId: string,
  params?: {
    page?: number;
    limit?: number;
    type?: TransactionType | "";
    status?: string | "";
  }
): Promise<TransactionsResponse> => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (params?.type) qs.set("type", params.type);
  if (params?.status) qs.set("status", params.status);

  const response = await apiService.adminGetUserTransactions(userId, qs.toString());

  if (response.error) throw new Error(response.error);

  // backend returns { page, limit, items }
  return (
    response.data ?? {
      page,
      limit,
      items: [],
    }
  );
};



export interface ModerateUserResponse {
  message?: string;
  user?: {
    id: string;
    isActive?: string;
    isBanned?: string;
    banReason?: string | null;
  };
}

export const suspendUser = async (
  userId: string,
  reason: string
): Promise<ModerateUserResponse> => {
  const response = await apiService.adminSuspendUser(userId, { reason });
  if (response.error) throw new Error(response.error);
  return response.data ?? { message: "User suspended" };
};

export const reactivateUser = async (userId: string): Promise<ModerateUserResponse> => {
  const response = await apiService.adminReactivateUser(userId);
  if (response.error) throw new Error(response.error);
  return response.data ?? { message: "User reactivated" };
};

export const banUser = async (
  userId: string,
  payload: { reason: string; evidence?: any }
): Promise<ModerateUserResponse> => {
  const response = await apiService.adminBanUser(userId, payload);
  if (response.error) throw new Error(response.error);
  return response.data ?? { message: "User banned" };
};
