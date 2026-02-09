const bcrypt = require("bcrypt");
const oracledb = require("oracledb");
const crypto = require("crypto");
const db = require("../config/db");
const { generateTokens, verifyRefreshToken } = require("../middleware/auth");
const { uploadToS3 } = require("../middleware/uploadMiddleware");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");
require("dotenv").config();

// ==========================================
// 1. REGISTER
// ==========================================
async function register(req, res) {
  const { firstName, lastName, email, phone, password } = req.body;
  const file = req.file;
  let connection;

  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .json({ error: "Invalid phone format. Only numbers allowed (10-15 digits)." });
  }
  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password too weak. Minimum 8 characters." });
  }

  try {
    let profilePicUrl = null;
    if (file) profilePicUrl = await uploadToS3(file, "profiles");

    const hashedPassword = await bcrypt.hash(password, 10);
    connection = await db.getConnection();

    const result = await connection.execute(
      `BEGIN 
        sp_register_user(:fn, :ln, :em, :ph, :pw, :img, :out_id, :out_status); 
       END;`,
      {
        fn: firstName,
        ln: lastName,
        em: email,
        ph: phone,
        pw: hashedPassword,
        img: profilePicUrl,
        out_id: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        out_status: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      }
    );

    const status = result.outBinds.out_status;
    const newUserId = result.outBinds.out_id;

    if (status === "SUCCESS") {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

      await connection.execute(
        `UPDATE users 
         SET email_verification_token = :otp,
             email_token_expiry = :expiry
         WHERE LOWER(email) = :email`,
        { otp: otpCode, expiry: expiryTime, email: email.toLowerCase() },
        { autoCommit: true }
      );

      sendVerificationEmail(email, otpCode).catch((e) =>
        console.error("Email failed:", e)
      );

      const { accessToken, refreshToken } = generateTokens(newUserId);
      return res.status(201).json({
        message: "User registered successfully. Please verify your email.",
        accessToken,
        refreshToken,
        user: {
          id: newUserId,
          firstName,
          lastName,
          email,
          role: "client",
          profileImage: profilePicUrl,
          emailVerified: false,
        },
      });
    }

    return res.status(400).json({ error: status });
  } catch (err) {
    console.error("Registration Error:", err);
    if (err.message?.includes("ORA-00001")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Registration failed" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
}

// ==========================================
// 2. LOGIN
// ==========================================
async function login(req, res) {
  const { email, password } = req.body;
  let connection;

  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `BEGIN sp_login_user(:em, :id, :hash, :fn, :ln, :role, :img, :status); END;`,
      {
        em: email,
        id: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        hash: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        fn: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        role: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        img: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        status: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      }
    );

    const authData = result.outBinds;

    if (authData.status === "UNVERIFIED") {
      return res.status(403).json({
        error: "Please verify your email.",
        needsVerification: true,
      });
    }
    if (authData.status !== "FOUND") {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, authData.hash);

    if (match) {
      try {
        const userResult = await connection.execute(
          `SELECT ID, FIRST_NAME, LAST_NAME, EMAIL, PHONE, ROLE, PROFILE_PIC_URL, EMAIL_VERIFIED, PHONE_VERIFIED, KYC_STATUS, KYC_DOCUMENT_URL, LOCATION_CITY FROM USERS WHERE ID = :id`,
          [authData.id],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (userResult.rows.length > 0) {
          const dbUser = userResult.rows[0];
          const fullUser = {
            id: dbUser.ID,
            firstName: dbUser.FIRST_NAME,
            lastName: dbUser.LAST_NAME,
            email: dbUser.EMAIL,
            phone: dbUser.PHONE,
            role: dbUser.ROLE,
            profileImage: dbUser.PROFILE_PIC_URL,
            emailVerified: dbUser.EMAIL_VERIFIED == 1,
            phoneVerified: dbUser.PHONE_VERIFIED == 1,
            kycStatus: dbUser.KYC_STATUS || "not_uploaded",
            kycDocumentUrl: dbUser.KYC_DOCUMENT_URL,
            location: { city: dbUser.LOCATION_CITY || "" },
          };
          const { accessToken, refreshToken } = generateTokens(fullUser.id);
          return res.json({
            message: "Login successful",
            accessToken,
            refreshToken,
            user: fullUser,
          });
        }
      } catch (sqlError) {
        console.error("SQL Error in Login:", sqlError);
      }

      const { accessToken, refreshToken } = generateTokens(authData.id);
      return res.json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: authData.id,
          firstName: authData.fn,
          lastName: authData.ln,
          email,
          role: authData.role,
          profileImage: authData.img,
          emailVerified: true,
        },
      });
    }

    return res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "Login failed" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
}

// ==========================================
// 3. VERIFY EMAIL OTP (FIXED TIMEZONE & WHITESPACE)
// ==========================================
async function verifyEmailOtp(req, res) {
  const { email, otp } = req.body;
  let connection;

  try {
    const safeEmail = email.toLowerCase();
    connection = await db.getConnection();

    const result = await connection.execute(
      `SELECT TRIM(email_verification_token) as TOKEN, email_token_expiry as EXPIRY
       FROM users WHERE LOWER(email) = :email`,
      [safeEmail],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User not found." });
    }

    const user = result.rows[0];
    const dbToken = user.TOKEN;

    if (!dbToken) {
      return res.status(400).json({ error: "No active code. Please click Resend." });
    }

    const expiry = new Date(user.EXPIRY);
    const now = new Date();

    if (String(dbToken) !== String(otp)) {
      return res.status(400).json({ error: "Invalid code." });
    }

    if (now > expiry) {
      return res.status(400).json({ error: "Code expired. Resend a new one." });
    }

    await connection.execute(
      `UPDATE users SET email_verified = '1', email_verification_token = NULL, email_token_expiry = NULL WHERE LOWER(email) = :email`,
      { email: safeEmail },
      { autoCommit: true }
    );

    return res.json({ success: true, message: "Email verified successfully!" });
  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({ error: "Verification failed" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
}

// ==========================================
// 4. REFRESH TOKEN
// ==========================================
async function refreshToken(req, res) {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }

  const tokens = generateTokens(decoded.userId);

  return res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

// ==========================================
// 5. GET CURRENT USER
// ==========================================
async function getMe(req, res) {
  let connection;

  try {
    const targetId = req.user?.userId || req.user?.id;
    if (!targetId) return res.status(401).json({ error: "Not authenticated" });

    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT ID, FIRST_NAME, LAST_NAME, EMAIL, PHONE, ROLE, PROFILE_PIC_URL, EMAIL_VERIFIED, PHONE_VERIFIED, KYC_STATUS, KYC_DOCUMENT_URL, LOCATION_CITY FROM USERS WHERE ID = :id`,
      [targetId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const dbUser = result.rows[0];
    return res.json({
      user: {
        id: dbUser.ID,
        firstName: dbUser.FIRST_NAME,
        lastName: dbUser.LAST_NAME,
        email: dbUser.EMAIL,
        phone: dbUser.PHONE,
        role: dbUser.ROLE,
        profileImage: dbUser.PROFILE_PIC_URL,
        emailVerified: dbUser.EMAIL_VERIFIED == 1,
        phoneVerified: dbUser.PHONE_VERIFIED == 1,
        kycStatus: dbUser.KYC_STATUS || "not_uploaded",
        kycDocumentUrl: dbUser.KYC_DOCUMENT_URL,
        location: { city: dbUser.LOCATION_CITY || "" },
      },
    });
  } catch (err) {
    console.error("GetMe Error:", err);
    return res.status(500).json({ error: "Server Error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
}

// ==========================================
// 6. FORGOT PASSWORD
// ==========================================
async function forgotPassword(req, res) {
  const { email } = req.body;
  let connection;

  try {
    if (!email) return res.status(400).json({ error: "Email required" });

    connection = await db.getConnection();
    const check = await connection.execute(
      `SELECT id FROM users WHERE email = :email`,
      [email]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        error: "Email not found",
        message: "This email is not registered.",
      });
    }

    const userId = check.rows[0][0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await connection.execute(
      `UPDATE users SET reset_password_token = :token, reset_password_expiry = :expiry WHERE id = :id`,
      { token: resetToken, expiry: expiry, id: userId },
      { autoCommit: true }
    );

    await sendPasswordResetEmail(email, resetToken);
    return res.json({ success: true, message: "Password reset link sent." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
}

// ==========================================
// 7. RESET PASSWORD
// ==========================================
async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  let connection;

  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `SELECT id, reset_password_expiry FROM users WHERE reset_password_token = :token`,
      [token],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return res.status(400).json({ error: "Invalid token." });

    const user = result.rows[0];
    if (new Date() > new Date(user.RESET_PASSWORD_EXPIRY)) {
      return res.status(400).json({ error: "Token expired." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await connection.execute(
      `UPDATE users SET password_hash = :pw, reset_password_token = NULL, reset_password_expiry = NULL WHERE id = :id`,
      { pw: hashedPassword, id: user.ID },
      { autoCommit: true }
    );

    return res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
}

// ==========================================
// 8. RESEND OTP (FIXED TIMEZONE)
// ==========================================
async function resendOtp(req, res) {
  const { email } = req.body;
  let connection;

  try {
    if (!email) return res.status(400).json({ error: "Email is required" });

    connection = await db.getConnection();

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

    const result = await connection.execute(
      `UPDATE users 
       SET email_verification_token = :otp,
           email_token_expiry = :expiry
       WHERE email = :email`,
      { otp: newOtp, expiry: expiryTime, email: email },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    try {
      await sendVerificationEmail(email, newOtp);
    } catch (e) {
      console.error("Email failed", e);
    }

    return res.json({ message: "Verification code resent. Check your inbox." });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    return res.status(500).json({ error: "Failed to resend OTP" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
}

module.exports = {
  register,
  login,
  verifyEmailOtp,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  resendOtp,
};
