const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let connection;

async function runCleanupScript() {
  try {
    console.log('🔌 Connecting to Oracle Database...');
    
    // Initialize Oracle Client
    try {
      oracledb.initOracleClient();
    } catch (err) {
      console.log('Oracle Client already initialized or not needed on this platform');
    }

    // Connect to database
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONN_STR
    });

    console.log('✅ Connected successfully!\n');

    // Read the cleanup script
    const scriptPath = path.join(__dirname, 'cleanup_database.sql');
    const sqlScript = fs.readFileSync(scriptPath, 'utf8');

    // Extract the PL/SQL block (between BEGIN and END; including the forward slash)
    const plsqlMatch = sqlScript.match(/BEGIN[\s\S]*?END;\s*\//);
    
    if (!plsqlMatch) {
      throw new Error('Could not find PL/SQL block in cleanup script');
    }

    // Remove the trailing / as it's not needed when executing via oracledb
    const plsqlBlock = plsqlMatch[0].replace(/\s*\/\s*$/, '');

    console.log('🧹 Executing database cleanup script...\n');
    console.log('========================================');
    console.log('WARNING: This will delete all transactional data!');
    console.log('Preserving: USERS, KYC_DOCUMENTS');
    console.log('========================================\n');

    // Enable DBMS_OUTPUT
    await connection.execute(`BEGIN DBMS_OUTPUT.ENABLE(NULL); END;`);

    // Execute the cleanup script
    await connection.execute(plsqlBlock);

    // Retrieve DBMS_OUTPUT
    let line = '';
    const lines = [];
    const result = await connection.execute(
      `BEGIN DBMS_OUTPUT.GET_LINE(:line, :status); END;`,
      {
        line: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
        status: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    // Keep getting lines until status is not 0
    let status = result.outBinds.status;
    if (status === 0) {
      console.log(result.outBinds.line);
    }

    // Get remaining lines
    while (status === 0) {
      const nextResult = await connection.execute(
        `BEGIN DBMS_OUTPUT.GET_LINE(:line, :status); END;`,
        {
          line: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
          status: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      status = nextResult.outBinds.status;
      if (status === 0) {
        console.log(nextResult.outBinds.line);
      }
    }

    console.log('\n✅ Cleanup completed successfully!');
    
    // Run verification query
    console.log('\n📊 Verifying table counts...\n');
    const verificationQuery = `
      SELECT 'USERS', COUNT(*) FROM DIP.USERS
      UNION ALL
      SELECT 'KYC_DOCUMENTS', COUNT(*) FROM DIP.KYC_DOCUMENTS
      UNION ALL
      SELECT 'VEHICLES', COUNT(*) FROM DIP.VEHICLES
      UNION ALL
      SELECT 'AUCTIONS', COUNT(*) FROM DIP.AUCTIONS
      UNION ALL
      SELECT 'BIDS', COUNT(*) FROM DIP.BIDS
      UNION ALL
      SELECT 'PAYMENTS', COUNT(*) FROM DIP.PAYMENTS
      UNION ALL
      SELECT 'ESCROWS', COUNT(*) FROM DIP.ESCROWS
      UNION ALL
      SELECT 'INSPECTION_REPORTS', COUNT(*) FROM DIP.INSPECTION_REPORTS
      UNION ALL
      SELECT 'NOTIFICATIONS', COUNT(*) FROM DIP.NOTIFICATIONS
      ORDER BY 1
    `;

    const verifyResult = await connection.execute(verificationQuery);
    
    console.log('Table Counts After Cleanup:');
    console.log('─────────────────────────────────────');
    verifyResult.rows.forEach(row => {
      console.log(`${row[0].padEnd(25)} : ${row[1]}`);
    });
    console.log('─────────────────────────────────────\n');

  } catch (err) {
    console.error('\n❌ Error executing cleanup script:');
    console.error('Error Code:', err.errorNum || 'N/A');
    console.error('Error Message:', err.message);
    
    if (err.offset) {
      console.error('Error at position:', err.offset);
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Database connection closed.');
      } catch (err) {
        console.error('Error closing connection:', err.message);
      }
    }
  }
}

// Run the cleanup
console.log('╔════════════════════════════════════════╗');
console.log('║   AUTOUSATA Database Cleanup Tool     ║');
console.log('╚════════════════════════════════════════╝\n');

runCleanupScript()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Fatal error:', err.message);
    process.exit(1);
  });
