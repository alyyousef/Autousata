const bcrypt = require("bcrypt");
const oracledb = require("oracledb");
const db = require("../config/db");
const { generateTokens, verifyRefreshToken } = require("../middleware/auth");
const { uploadToS3 } = require("../middleware/uploadMiddleware");
const { sendVerificationEmail } = require("../services/emailService");
require("dotenv").config();

// ==========================================
// 1. REGISTER (With OTP)
// ==========================================
async function register(req, res) {
  const { firstName, lastName, email, phone, password } = req.body;
  const file = req.file;
  let connection;

  try {
    console.log(`👉 Registering: ${email}`);

    // A. Upload Profile Image (Optional)
    let profilePicUrl = null;
    if (file) {
      console.log("📸 [1] Starting S3 Upload...");
      profilePicUrl = await uploadToS3(file, "profiles");
      console.log("✅ [2] S3 Upload Finished:", profilePicUrl);
    }

    // B. Hash Password
    console.log("🔑 [3] Hashing Password...");
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("🔌 [4] Requesting Database Connection...");
    connection = await db.getConnection();

    // C. Execute Registration Procedure (Handles Soft Deletes/Revival)
    console.log("📝 [5] Executing Stored Procedure...");
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
      },
    );

    const status = result.outBinds.out_status;
    const newUserId = result.outBinds.out_id;

    if (status === "SUCCESS") {
      console.log("✅ [6] User Record Created/Updated.");

      // D. Generate 6-Digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // E. Save OTP to DB
      await connection.execute(
        `BEGIN sp_save_email_otp(:email, :otp, :status); END;`,
        {
          email: email,
          otp: otpCode,
          status: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        },
      );

      // F. Send Email
      console.log("✉️ [7] Sending OTP Email...");
      sendVerificationEmail(email, otpCode).catch((err) =>
        console.error("Email failed in background:", err),
      );

      const user = {
        id: newUserId,
        role: "client",
      };

      const token = generateToken(user);
      // G. Generate Tokens (So user is logged in, but unverified)
      const { accessToken, refreshToken } = generateTokens(newUserId);

      res.status(201).json({
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
          emailVerified: false, // Flag for Frontend to redirect to OTP page
        },
      });
    } else {
      console.log("❌ DB Returned Error:", status);
      res.status(400).json({ error: status });
    }
  } catch (err) {
    console.error("❌ Registration Error:", err);
    res.status(500).json({ error: "Registration failed" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error("Error closing connection:", e);
      }
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
    console.log(`👉 Logging in: ${email}`);
    connection = await db.getConnection();

    const result = await connection.execute(
      `BEGIN 
                sp_login_user(:em, :id, :hash, :fn, :ln, :role, :img, :status); 
             END;`,
      {
        em: email,
        id: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        hash: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        fn: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        role: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        img: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        status: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      },
    );

    const userData = result.outBinds;

    if (userData.status === "UNVERIFIED") {
      return res.status(403).json({
        error: "Please verify your email address to log in.",
        needsVerification: true,
      });
    }

    if (userData.status !== "FOUND") {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, userData.hash);

    if (match) {
      const token = generateToken({ id: userData.id, role: userData.role });
      const { accessToken, refreshToken } = generateTokens(userData.id);

      res.json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: userData.id,
          firstName: userData.fn,
          lastName: userData.ln,
          email: email,
          role: userData.role,
          profileImage: userData.img,
        },
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ error: "Login failed" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
}

// ==========================================
// 3. VERIFY EMAIL OTP (New!)
// ==========================================
async function verifyEmailOtp(req, res) {
  const { email, otp } = req.body;
  let connection;

  try {
    console.log(`👉 Verifying OTP for: ${email}`);
    connection = await db.getConnection();

    const result = await connection.execute(
      `BEGIN sp_verify_email_otp(:email, :otp, :status); END;`,
      {
        email: email,
        otp: otp,
        status: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      },
    );

    const status = result.outBinds.status;

    if (status === "SUCCESS") {
      res.json({ success: true, message: "Email verified successfully!" });
    } else {
      // Map DB errors to friendly messages
      let errorMsg = "Verification failed";
      if (status === "INVALID_OTP")
        errorMsg = "Invalid code. Please try again.";
      if (status === "OTP_EXPIRED")
        errorMsg = "Code expired. Please request a new one.";
      if (status === "NO_OTP_REQUESTED")
        errorMsg = "No verification request found.";

      res.status(400).json({ error: errorMsg, code: status });
    }
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    res.status(500).json({ error: "Verification failed" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
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

  res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

// ==========================================
// 5. GET CURRENT USER
// ==========================================
async function getMe(req, res) {
  // req.user is already populated by the 'authenticate' middleware
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Simply return the user attached to the request
  res.json({
    user: req.user,
  });
}

module.exports = { register, login, verifyEmailOtp, refreshToken, getMe };
