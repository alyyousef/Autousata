const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    
    // CHECK: Is this a file upload?
    // If it is FormData, we MUST NOT set 'Content-Type'. The browser does it automatically.
    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
      // Only set JSON header if it's NOT a file upload
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // =========================================================
  // UPDATED REGISTER METHOD (Supports Images)
  // =========================================================
  async register(
    firstName: string, 
    lastName: string, 
    email: string, 
    phone: string, 
    password: string, 
    profileImage?: File // <--- New Optional Parameter
  ) {
    // 1. Create FormData container
    const formData = new FormData();
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', password);

    // 2. Add the file if it exists
    if (profileImage) {
      formData.append('profileImage', profileImage);
    }

    // 3. Send as FormData (not JSON)
    const response = await this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: formData, 
    });

    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }

    return response;
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    localStorage.removeItem('authToken');
    return response;
  }

  async logoutAll() {
    const response = await this.request('/auth/logout-all', {
      method: 'POST',
    });

    localStorage.removeItem('authToken');
    return response;
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(resetToken: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  async getLoginHistory() {
    return this.request<{ loginHistory: any[] }>('/auth/login-history');
  }

  async getAuctions(page = 1, limit = 9, sortBy = 'endingSoon') {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
    });
    return this.request<{ auctions: any[]; pagination: any }>(`/auctions?${queryParams.toString()}`);
  }

  // Profile endpoints
  async updateProfile(data: { name?: string; location?: { city: string; country?: string } }) {
    return this.request<{ user: any }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

 // IN src/services/api.ts
async updateAvatar(file: File) {
  const formData = new FormData();
  formData.append('avatar', file); // Field name must match backend 'upload.single("avatar")'

  return this.request<{ avatar: string }>('/profile/avatar', {
    method: 'PUT',
    body: formData,
  });
}

  async updateLocation(city: string, country?: string) {
    return this.request<{ location: any }>('/profile/location', {
      method: 'PUT',
      body: JSON.stringify({ city, country }),
    });
  }

  async verifyPhone(phone: string, code?: string) {
    return this.request('/profile/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  async verifyEmail(token?: string) {
    return this.request('/profile/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }
}

export const apiService = new ApiService();