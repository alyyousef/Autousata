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
}

export const searchUsers = async (q: string): Promise<AdminUserSearchResult[]> => {
  const response = await apiService.adminSearchUsers(q);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data ?? [];
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
  console.log('Admin vehicles response status:', response.status);
  console.log(response)

  if (!response.ok) {
    console.log('Admin vehicles response status:', response.status);
  console.log(response)
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
  
  const response = await fetch(`http://localhost:5000/api/admin/vehicles?status=${encodeURIComponent(status)}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to filter vehicles');
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
): Promise<{ ok: boolean; message?: string }> => {
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

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Network error' };
  }
};