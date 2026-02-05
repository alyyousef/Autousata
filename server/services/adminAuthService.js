const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");
const db = require("../config/db");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

function signAdminToken(userId) {
  // ✅ Must include userId because your authenticate middleware expects decoded.userId
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

exports.loginAdmin = async (email, password) => {
  let connection;

  try {
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

    // Handle DB statuses (adjust if your SP uses different values)
    if (userData.status === "UNVERIFIED") {
      throw { status: 403, message: "Please verify your email to log in." };
    }

    if (userData.status !== "FOUND") {
      throw { status: 401, message: "Invalid credentials" };
    }

    // ✅ Must be admin
    if (userData.role !== "admin") {
      throw { status: 403, message: "Admins only" };
    }

    const ok = await bcrypt.compare(password, userData.hash);
    if (!ok) {
      throw { status: 401, message: "Invalid credentials" };
    }

    const token = signAdminToken(userData.id);

    return {
      token,
      user: {
        id: userData.id,
        firstName: userData.fn,
        lastName: userData.ln,
        email,
        role: userData.role,
        profileImage: userData.img || null,
      },
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error("Error closing connection:", e);
      }
    }
  }
};
