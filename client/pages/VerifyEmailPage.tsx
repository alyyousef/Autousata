import React, { useState, useEffect } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import {
  ShieldCheck,
  ArrowRight,
  Mail,
  CheckCircle,
  XCircle,
  Loader,
  RefreshCw,
} from "lucide-react";
import { apiService } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

const VerifyEmailPage: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const token = searchParams.get("token");

  // Verification States
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "otp">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying your email...");

  // ✅ RESEND OTP STATES
  const [resendTimer, setResendTimer] = useState(0); // 0 = ready to send
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  // 1. Handle token-based verification (email link)
  useEffect(() => {
    if (token) {
      const verifyToken = async () => {
        try {
          const response = await fetch(`/api/auth/verify-email?token=${token}`);
          const data = await response.json();

          if (response.ok) {
            setStatus("success");
            setMessage(
              data.message ||
                t("Email verified successfully!", "تم تفعيل الإيميل بنجاح!"),
            );
            setTimeout(() => navigate("/login"), 2000);
          } else {
            setStatus("error");
            setMessage(data.error || t("Verification failed.", "فشل التفعيل."));
          }
        } catch (error) {
          setStatus("error");
          setMessage(
            t(
              "Network error. Please try again.",
              "حصل خطأ في الشبكة. جرب تاني.",
            ),
          );
        }
      };
      verifyToken();
    } else if (!state?.email) {
      // No token and no email in state - redirect to signup
      navigate("/signup");
    } else {
      // Has email in state - show OTP form
      setStatus("otp");
    }
  }, [token, state, navigate, t]);

  // ✅ 2. Handle Resend Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const email = state?.email || "";

  // ✅ 3. Handle Resend OTP Action
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setResendLoading(true);
    setResendMessage("");
    setError("");

    try {
      // ✅ FIX: Use the centralized API service (which uses the proxy)
      // instead of manually fetching from localhost:5000
      const response = await apiService.resendOtp(email);

      if (response.data) {
        setResendTimer(60);
        setResendMessage("New code sent! Check your inbox.");
      } else {
        setError(response.error || "Failed to resend code.");
      }
    } catch (err) {
      setError("Network error. Could not resend code.");
    } finally {
      setResendLoading(false);
    }
  };

  // 4. Handle Verify OTP Logic
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage("");
    setLoading(true);

    try {
      const response = await apiService.verifyEmailOtp(email, otp);

      if (response.data && (response.data as any).success) {
        setSuccess(true);
        try {
          const userResponse = await apiService.getCurrentUser();
          if (userResponse.data?.user) {
            updateUser(userResponse.data.user);
          }
        } catch (fetchError) {
          console.error("Could not refresh user profile", fetchError);
        }
        setTimeout(() => {
          navigate("/browse");
        }, 1500);
      } else {
        setError(response.error || "Invalid code. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        {/* Token Verification: Loading State */}
        {status === "loading" && (
          <div className="px-8 py-16">
            <div className="flex flex-col items-center">
              <Loader className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-slate-900">
                {t("Verifying...", "جاري التفعيل...")}
              </h2>
              <p className="text-slate-500 mt-2 text-center">
                {t(
                  "Please wait while we activate your account.",
                  "استنى شوية وإحنا بنفعل حسابك.",
                )}
              </p>
            </div>
          </div>
        )}

        {/* Token Verification: Success State */}
        {status === "success" && (
          <div className="px-8 py-16">
            <div className="flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-emerald-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900">
                {t("Email Verified!", "تم تفعيل الإيميل!")}
              </h2>
              <p className="text-slate-600 mt-2 mb-6 text-center">{message}</p>
              <Link
                to="/login"
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-center"
              >
                {t("Go to Login", "روح لتسجيل الدخول")}
              </Link>
            </div>
          </div>
        )}

        {/* Token Verification: Error State */}
        {status === "error" && (
          <div className="px-8 py-16">
            <div className="flex flex-col items-center">
              <XCircle className="w-16 h-16 text-red-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900">
                {t("Verification Failed", "فشل التفعيل")}
              </h2>
              <p className="text-slate-600 mt-2 mb-6 text-center">{message}</p>
              <Link
                to="/login"
                className="text-indigo-600 font-semibold hover:underline"
              >
                {t("Back to Login", "ارجع لتسجيل الدخول")}
              </Link>
            </div>
          </div>
        )}

        {/* OTP Entry Form */}
        {status === "otp" && (
          <>
            {/* Header Section */}
            <div className="bg-slate-900 px-8 py-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                {success ? (
                  <ShieldCheck className="text-emerald-400 w-8 h-8" />
                ) : (
                  <Mail className="text-white w-8 h-8" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {success ? "Account Verified!" : "Check your inbox"}
              </h2>
              <p className="text-slate-400 text-sm">
                We sent a secure code to <br />
                <span className="text-white font-semibold">{email}</span>
              </p>
            </div>

            {/* Body Section */}
            <div className="px-8 py-10">
              <form onSubmit={handleVerify} className="space-y-6">
                {/* General Error */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-medium animate-pulse">
                    {error}
                  </div>
                )}

                {/* Resend Success Message */}
                {resendMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-xl text-center font-bold flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> {resendMessage}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl text-center font-bold">
                    Verification successful. Redirecting...
                  </div>
                )}

                <div>
                  <label
                    htmlFor="otp"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center"
                  >
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="000000"
                    className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-xl border-2 border-slate-200 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-200 text-slate-800"
                    autoFocus
                    disabled={success}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6 || success}
                  className={`w-full py-4 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group ${success ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"}`}
                >
                  {loading ? (
                    "Verifying..."
                  ) : success ? (
                    "Verified"
                  ) : (
                    <>
                      Verify Account{" "}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </form>

              {!success && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-1">
                    Didn't receive the email?{" "}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || resendLoading}
                      className={`font-semibold flex items-center gap-1 transition-colors ${
                        resendTimer > 0
                          ? "text-slate-400 cursor-not-allowed"
                          : "text-indigo-600 hover:text-indigo-700 hover:underline"
                      }`}
                    >
                      {resendLoading ? (
                        <span className="flex items-center gap-1">
                          <Loader size={14} className="animate-spin" />{" "}
                          Sending...
                        </span>
                      ) : resendTimer > 0 ? (
                        <span className="flex items-center gap-1">
                          Resend available in {resendTimer}s
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <RefreshCw size={14} /> Resend Code
                        </span>
                      )}
                    </button>
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
