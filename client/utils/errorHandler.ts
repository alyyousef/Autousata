/**
 * Centralized Error Handler Utility
 * Translates technical errors into user-friendly messages
 */

type TranslateFunction = (en: string, ar: string) => string;

export const handleApiError = (error: any, t: TranslateFunction): string => {
  // Network/Connection errors
  if (
    error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('fetch') ||
    error.message?.toLowerCase().includes('failed to fetch') ||
    error.name === 'NetworkError' ||
    !navigator.onLine
  ) {
    return t(
      'Connection lost. Please check your internet connection and try again.',
      'انقطع الاتصال. تحقق من الإنترنت وحاول مرة أخرى.'
    );
  }

  // Authentication errors (401)
  if (
    error.message?.includes('401') ||
    error.message?.toLowerCase().includes('unauthorized') ||
    error.message?.toLowerCase().includes('auth')
  ) {
    return t(
      'Please log in to continue.',
      'من فضلك سجل دخول للمتابعة.'
    );
  }

  // Permission errors (403)
  if (
    error.message?.includes('403') ||
    error.message?.toLowerCase().includes('forbidden')
  ) {
    return t(
      "You don't have permission for this action.",
      'ليس لديك صلاحية لهذا الإجراء.'
    );
  }

  // Not Found errors (404)
  if (
    error.message?.includes('404') ||
    error.message?.toLowerCase().includes('not found')
  ) {
    return t(
      'Resource not found. It may have been removed.',
      'المورد غير موجود. ربما تم حذفه.'
    );
  }

  // Server errors (500)
  if (
    error.message?.includes('500') ||
    error.message?.toLowerCase().includes('internal server') ||
    error.message?.toLowerCase().includes('server error')
  ) {
    return t(
      'Server error. Please try again later.',
      'خطأ في الخادم. حاول لاحقاً.'
    );
  }

  // Timeout errors
  if (
    error.message?.toLowerCase().includes('timeout') ||
    error.name === 'TimeoutError'
  ) {
    return t(
      'Request timed out. Please check your connection and try again.',
      'انتهت مهلة الطلب. تحقق من الاتصال وحاول مرة أخرى.'
    );
  }

  // Validation errors
  if (
    error.message?.includes('400') ||
    error.message?.toLowerCase().includes('validation') ||
    error.message?.toLowerCase().includes('invalid')
  ) {
    return error.message || t(
      'Invalid input. Please check your information.',
      'إدخال غير صحيح. تحقق من المعلومات.'
    );
  }

  // Rate limit errors (429)
  if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
    return t(
      'Too many requests. Please wait a moment and try again.',
      'طلبات كثيرة جداً. انتظر قليلاً وحاول مرة أخرى.'
    );
  }

  // Fallback to error message or generic error
  return error.message || t(
    'Something went wrong. Please try again.',
    'حدث خطأ ما. حاول مرة أخرى.'
  );
};

/**
 * Handle file upload specific errors
 */
export const handleFileUploadError = (error: any, t: TranslateFunction): string => {
  if (error.message?.toLowerCase().includes('file size') || error.message?.toLowerCase().includes('too large')) {
    return t(
      'File is too large. Maximum size is 5MB per image.',
      'الملف كبير جداً. الحد الأقصى 5 ميجابايت لكل صورة.'
    );
  }

  if (error.message?.toLowerCase().includes('file type') || error.message?.toLowerCase().includes('invalid type')) {
    return t(
      'Invalid file type. Please upload images only (JPG, PNG, WEBP).',
      'نوع ملف غير صالح. ارفع صور فقط (JPG, PNG, WEBP).'
    );
  }

  if (error.message?.toLowerCase().includes('upload failed')) {
    return t(
      'Failed to upload images. Please check your connection and try again.',
      'فشل رفع الصور. تحقق من اتصالك وحاول مرة أخرى.'
    );
  }

  return handleApiError(error, t);
};

/**
 * Handle payment specific errors
 */
export const handlePaymentError = (error: any, t: TranslateFunction): string => {
  const errorCode = error.code?.toLowerCase() || '';
  const errorMessage = error.message?.toLowerCase() || '';

  // Stripe-specific error codes
  if (errorCode === 'card_declined' || errorMessage.includes('card was declined')) {
    return t(
      'Your card was declined. Please use a different payment method.',
      'تم رفض البطاقة. استخدم وسيلة دفع أخرى.'
    );
  }

  if (errorCode === 'insufficient_funds' || errorMessage.includes('insufficient funds')) {
    return t(
      'Insufficient funds. Please use a different card.',
      'رصيد غير كافٍ. استخدم بطاقة أخرى.'
    );
  }

  if (errorCode === 'expired_card' || errorMessage.includes('expired')) {
    return t(
      'Your card has expired. Please use a different card.',
      'البطاقة منتهية الصلاحية. استخدم بطاقة أخرى.'
    );
  }

  if (errorCode === 'incorrect_cvc' || errorMessage.includes('cvc')) {
    return t(
      'Incorrect security code (CVC). Please check and try again.',
      'رمز الأمان (CVC) غير صحيح. تحقق وحاول مرة أخرى.'
    );
  }

  if (errorCode === 'processing_error' || errorMessage.includes('processing')) {
    return t(
      'Payment processing error. Please try again in a moment.',
      'خطأ في معالجة الدفع. حاول مرة أخرى بعد قليل.'
    );
  }

  if (errorCode === 'authentication_required' || errorMessage.includes('authentication')) {
    return t(
      'Additional authentication required. You will be redirected.',
      'مطلوب مصادقة إضافية. ستتم إعادة توجيهك.'
    );
  }

  // Generic payment error fallback
  return t(
    'Payment failed. Please check your card details and try again.',
    'فشل الدفع. تحقق من تفاصيل البطاقة وحاول مرة أخرى.'
  );
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  return (
    !navigator.onLine ||
    error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('fetch') ||
    error.name === 'NetworkError'
  );
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: any): boolean => {
  return (
    error.message?.includes('401') ||
    error.message?.toLowerCase().includes('unauthorized') ||
    error.message?.toLowerCase().includes('auth')
  );
};
