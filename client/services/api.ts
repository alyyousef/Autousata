const API_BASE_URL = 'http://localhost:5002/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  // 1. Get tokens from storage
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  // 2. Helper to save both tokens
  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // =========================================================
  // CORE REQUEST HANDLER (With Auto-Refresh Logic)
  // =========================================================
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false // Prevents infinite loops
  ): Promise<ApiResponse<T>> {
    
    const token = this.getAccessToken();
    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // A. If Success, return data
      if (response.ok) {
        return { data: await response.json() };
      }

      const errorData = await response.json();

      // B. If Token Expired (401), try to refresh!
      if (response.status === 401 && !isRetry && errorData.error === 'TokenExpired') {
        const success = await this.refreshAccessToken();
        if (success) {
          // Retry the ORIGINAL request with the NEW token
          return this.request<T>(endpoint, options, true);
        } else {
          // Refresh failed -> Logout user
          this.logout();
          window.location.href = '/login'; 
          return { error: 'Session expired. Please login again.' };
        }
      }

      return { error: errorData.error || 'Request failed' };

    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // =========================================================
  // HELPER: Call the Backend to Swap Refresh Token
  // =========================================================
  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    }
    
    this.clearTokens();
    return false;
  }

  // =========================================================
  // AUTH METHODS
  // =========================================================
  
  async register(firstName: string, lastName: string, email: string, phone: string, password: string, profileImage?: File) {
    const formData = new FormData();
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', password);
    if (profileImage) formData.append('profileImage', profileImage);

    // Note: We expect accessToken/refreshToken now
    const response = await this.request<{ accessToken: string; refreshToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: formData,
    });

    if (response.data?.accessToken) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
    }
    return response;
  }

  async verifyEmailOtp(email: string, otp: string) {
    return this.request('/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async uploadKYC(file: File) {
    const formData = new FormData();
    formData.append('kycDocument', file); 

    return this.request<{ kycStatus: string; kycDocumentUrl: string }>('/profile/kyc', {
      method: 'PUT',
      body: formData,
    });
  }

  async login(email: string, password: string) {
    const response = await this.request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.accessToken) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
    }
    return response;
  }

  async logout() {
    this.clearTokens();
    return { data: { success: true } }; // Just clear local state
  }

  // =========================================================
  // PASSWORD RESET METHODS (Correctly placed inside class)
  // =========================================================
  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // =========================================================
  // OTHER METHODS
  // =========================================================
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

  async getAuctionById(auctionId: string) {
    return this.request<any>(`/auctions/${auctionId}`);
  }

  async getAuctionBids(auctionId: string, limit = 20) {
    const queryParams = new URLSearchParams({ limit: limit.toString() });
    return this.request<{ bids: any[] }>(`/auctions/${auctionId}/bids?${queryParams.toString()}`);
  }

  async placeBid(auctionId: string, amount: number) {
    return this.request<{ bid: any; currentBid: number }>(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  }

  async getSellerVehicles() {
    return this.request<any[]>('/vehicles');
  }

  async getVehicleById(vehicleId: string) {
    return this.request<any>(`/vehicles/${vehicleId}`);
  }

  async createVehicle(data: any, files: File[]) {
    const formData = new FormData();

    Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null && key !== 'images') {
             if(Array.isArray(data[key])) {
                 formData.append(key, JSON.stringify(data[key]));
             } else {
                 formData.append(key, String(data[key]));
             }
        }
    });

    files.forEach((file) => {
        formData.append('images', file);
    });

    return this.request<{ _id: string }>('/vehicles', {
      method: 'POST',
      body: formData, 
    });
  }

  async createAuction(data: any) {
    return this.request<any>('/auctions', {
        method: 'POST',
        body: JSON.stringify(data)
    });
  }

  async getSellerAuctions() {
    return this.request<{ auctions: any[] }>('/auctions/seller');
  }

  // Profile endpoints
  async updateProfile(data: { name?: string; firstName?: string; lastName?: string; phone?: string; location?: { city: string; country?: string } }) {
    return this.request<{ user: any }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Update Avatar Image
  async updateAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.request<{ avatar: string }>('/profile/avatar', {
      method: 'PUT',
      body: formData,
    });
  }

  // =========================================================
  // PAYMENT METHODS
  // =========================================================
  
  async createPaymentIntent(auctionId: string) {
    return this.request<{
      success: boolean;
      clientSecret: string;
      paymentId: string;
      breakdown: {
        bidAmount: number;
        platformCommission: number;
        stripeFee: number;
        totalAmount: number;
        sellerPayout: number;
      };
      auction: {
        id: string;
        vehicle: string;
        deadline: string;
      };
    }>('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ auctionId }),
    });
  }

  async confirmPayment(paymentId: string) {
    return this.request<{
      success: boolean;
      message: string;
      paymentId: string;
      escrowId: string;
    }>(`/payments/${paymentId}/confirm`, {
      method: 'POST',
    });
  }

  async getPaymentByAuction(auctionId: string) {
    return this.request<{
      success: boolean;
      payment: {
        id: string;
        auctionId: string;
        amountEGP: number;
        status: string;
        initiatedAt: string;
        completedAt?: string;
        escrow?: {
          id: string;
          status: string;
          commissionEGP: number;
          sellerPayoutEGP: number;
        };
      };
    }>(`/payments/auction/${auctionId}`);
  }

  async getEscrowDetails(escrowId: string) {
    return this.request<{
      success: boolean;
      escrow: {
        id: string;
        auctionId: string;
        totalAmountEGP: number;
        commissionEGP: number;
        sellerPayoutEGP: number;
        status: string;
        buyerReceived?: string;
        vehicle: {
          year: number;
          make: string;
          model: string;
        };
      };
    }>(`/payments/escrows/${escrowId}`);
  }

  async confirmVehicleReceipt(escrowId: string) {
    return this.request<{
      success: boolean;
      message: string;
      escrowId: string;
      sellerPayoutEGP: number;
    }>(`/payments/escrows/${escrowId}/confirm-receipt`, {
      method: 'POST',
    });
  }

  async initiateDispute(escrowId: string, reason: string) {
    return this.request<{
      success: boolean;
      message: string;
      escrowId: string;
    }>(`/payments/escrows/${escrowId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getDisputedEscrows() {
    return this.request<{
      success: boolean;
      disputes: Array<{
        id: string;
        auctionId: string;
        totalAmountEGP: number;
        disputeReason: string;
        disputedAt: string;
        vehicle: {
          year: number;
          make: string;
          model: string;
        };
        buyer: {
          name: string;
          email: string;
        };
        seller: {
          name: string;
          email: string;
        };
      }>;
    }>('/payments/escrows/disputed');
  }

  async processRefund(paymentId: string, reason: string, amount?: number) {
    return this.request<{
      success: boolean;
      message: string;
      refundId: string;
      amountRefundedEGP: number;
    }>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason, amount }),
    });
  }
}

export const apiService = new ApiService();