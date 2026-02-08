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
  inspectorNotes?: string;
  photosUrl?: string[];
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

export interface KYCDocument {
  userId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  isActive?: number;
  isBanned?: number;
  kycStatus?: string;
  kycId: string;
  documentType?: string;
  documentNumber?: string;
  fullNameOnDoc?: string;
  dateOfBirth?: Date;
  issueDate?: Date;
  expiryDate?: Date;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieWithDocUrl?: string;
  kycDocStatus?: string;
  rejectionReason?: string;
  verificationMethod?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedByAdminId?: string;
}

export interface LiveAuction {
  id: string;
  vehicleId: number;
  sellerId: string;
  sellerName?: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  originalEndTime?: Date;
  reservePrice?: number;
  startingBid?: number;
  currentBid?: number;
  bidCount?: number;
  minBidIncrement?: number;
  autoExtendEnabled?: number;
  autoExtendMinutes?: number;
  maxAutoExtensions?: number;
  autoExtCount?: number;
  leadingBidderId?: string;
  leadingBidderName?: string;
  winnerId?: string;
  winnerName?: string;
  createdAt?: Date;
  startedAt?: Date;
}

export interface PendingPayment {
  id: string;
  auctionId?: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  sellerName?: string;
  amount?: number;
  currency?: string;
  processorFee?: number;
  paymentMethod?: string;
  gateway?: string;
  gatewayOrderId?: string;
  gatewayTransId?: string;
  status: string;
  failureReason?: string;
  initiatedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
}




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

export const acceptVehicle = async (
  vehicleId: number,
  token?: string
): Promise<{ ok: boolean; message?: string }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/admin/vehicles/${vehicleId}/accept`, {
      method: 'PATCH',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.error || 'Failed to accept vehicle' };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Network error' };
  }
};

export const rejectVehicle = async (
  vehicleId: number,
  token?: string
): Promise<{ ok: boolean; message?: string }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/admin/vehicles/${vehicleId}/reject`, {
      method: 'PATCH',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.error || 'Failed to reject vehicle' };
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
};

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
export const acceptInspectionReport = async (
  inspectionId: string,
  token?: string
): Promise<{ ok: boolean; message?: string }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/admin/inspections/${inspectionId}/accept`, {
      method: 'PATCH',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.error || 'Failed to accept inspection report' };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Network error' };
  }
};

export const rejectInspectionReport = async (
  inspectionId: string,
  token?: string
): Promise<{ ok: boolean; message?: string }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/admin/inspections/${inspectionId}/reject`, {
      method: 'PATCH',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.error || 'Failed to reject inspection report' };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Network error' };
  }
};

export const getPendingKYC = async (token?: string): Promise<KYCDocument[]> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('http://localhost:5000/api/admin-content/kyc/pending', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch pending KYC documents');
  }

  const data = await response.json();
  return data.kycDocuments || data || [];
};

export const getLiveAuctions = async (token?: string): Promise<LiveAuction[]> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('http://localhost:5000/api/admin-content/auctions/live', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch live auctions');
  }

  const data = await response.json();
  return data.auctions || data || [];
};

export const getPendingPayments = async (token?: string): Promise<PendingPayment[]> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('http://localhost:5000/api/admin-content/payments/pending', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch pending payments');
  }

  const data = await response.json();
  return data.payments || data || [];
};


export const getreport = async (reportId: string, token?: string): Promise<any> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`http://localhost:5000/api/admin/inspections/${reportId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch report');
  }

  const data = await response.json();
  return data.report || null;
};

export const editreport = async (reportId: string, payload: Partial<CreateInspectionPayload>, token?: string): Promise<{ ok: boolean; message?: string }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
    if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    }
  try {
    const response = await fetch(`http://localhost:5000/api/admin/inspections/${reportId}/edit`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.error || 'Failed to edit report' };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Network error' };
  }
};
