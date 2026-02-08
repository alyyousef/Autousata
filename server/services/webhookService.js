const oracledb = require('oracledb');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const db = require('../config/db');

/**
 * Webhook Service
 * Handles webhook subscriptions, delivery, and signature verification
 */

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms: 1s, 5s, 15s

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * @param {string} payload - JSON stringified payload
 * @param {string} secret - Secret key for signature
 * @returns {string} - Hex signature
 */
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Register a webhook subscription
 * @param {string} userId - User ID
 * @param {string} eventType - Event type (e.g., 'bid.placed')
 * @param {string} webhookUrl - URL to POST webhook to
 * @returns {Promise<Object>} - { id, secretKey }
 */
async function registerWebhook(userId, eventType, webhookUrl) {
  let connection;
  try {
    connection = await db.getConnection();
    
    const id = randomUUID();
    const secretKey = crypto.randomBytes(32).toString('hex');

    await connection.execute(
      `INSERT INTO webhook_subscriptions (
        id,
        user_id,
        event_type,
        webhook_url,
        secret_key,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        :id,
        :userId,
        :eventType,
        :webhookUrl,
        :secretKey,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )`,
      {
        id,
        userId,
        eventType,
        webhookUrl,
        secretKey
      },
      { autoCommit: true }
    );

    return { id, secretKey };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Get active webhook subscriptions for an event type
 * @param {string} eventType - Event type
 * @param {string} userId - Optional: filter by user ID
 * @returns {Promise<Array>} - Array of subscriptions
 */
async function getActiveSubscriptions(eventType, userId = null) {
  let connection;
  try {
    connection = await db.getConnection();

    let sql = `SELECT id, user_id, webhook_url, secret_key
               FROM webhook_subscriptions
               WHERE event_type = :eventType
                 AND is_active = 1`;
    
    const params = { eventType };
    
    if (userId) {
      sql += ' AND user_id = :userId';
      params.userId = userId;
    }

    const result = await connection.execute(
      sql,
      params,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (result.rows || []).map(row => ({
      id: row.ID,
      userId: row.USER_ID,
      webhookUrl: row.WEBHOOK_URL,
      secretKey: row.SECRET_KEY
    }));
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Deliver webhook with retry logic
 * @param {string} subscriptionId - Subscription ID
 * @param {string} webhookUrl - Target URL
 * @param {string} secretKey - Secret for signing
 * @param {Object} payload - Webhook payload
 * @param {number} attemptNumber - Current attempt (1-indexed)
 * @returns {Promise<Object>} - { success: boolean, status: number, response: string }
 */
async function deliverWebhook(subscriptionId, webhookUrl, secretKey, payload, attemptNumber = 1) {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, secretKey);
  const timestamp = Date.now();

  const logId = randomUUID();
  let connection;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Attempt': attemptNumber.toString()
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    const responseBody = await response.text();
    const success = response.ok;

    // Log delivery
    connection = await db.getConnection();
    await connection.execute(
      `INSERT INTO webhook_delivery_log (
        id,
        subscription_id,
        event_type,
        payload,
        response_status,
        response_body,
        attempt_number,
        delivered_at,
        failed_at,
        created_at
      ) VALUES (
        :id,
        :subscriptionId,
        :eventType,
        :payload,
        :status,
        :responseBody,
        :attemptNumber,
        ${success ? 'CURRENT_TIMESTAMP' : 'NULL'},
        ${success ? 'NULL' : 'CURRENT_TIMESTAMP'},
        CURRENT_TIMESTAMP
      )`,
      {
        id: logId,
        subscriptionId,
        eventType: payload.event_type,
        payload: payloadString,
        status: response.status,
        responseBody: responseBody.substring(0, 4000), // Truncate if needed
        attemptNumber
      },
      { autoCommit: true }
    );

    return {
      success,
      status: response.status,
      response: responseBody
    };
  } catch (err) {
    // Log failed delivery
    try {
      if (!connection) {
        connection = await db.getConnection();
      }
      
      await connection.execute(
        `INSERT INTO webhook_delivery_log (
          id,
          subscription_id,
          event_type,
          payload,
          attempt_number,
          failed_at,
          error_message,
          created_at
        ) VALUES (
          :id,
          :subscriptionId,
          :eventType,
          :payload,
          :attemptNumber,
          CURRENT_TIMESTAMP,
          :errorMessage,
          CURRENT_TIMESTAMP
        )`,
        {
          id: logId,
          subscriptionId,
          eventType: payload.event_type,
          payload: payloadString,
          attemptNumber,
          errorMessage: err.message.substring(0, 4000)
        },
        { autoCommit: true }
      );
    } catch (logErr) {
      console.error('Failed to log webhook error:', logErr);
    }

    return {
      success: false,
      error: err.message
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Trigger webhook for an event
 * @param {string} eventType - Event type (e.g., 'bid.placed')
 * @param {Object} payload - Event payload
 * @param {string} userId - Optional: specific user to notify
 * @returns {Promise<Object>} - { deliveredCount, failedCount }
 */
async function triggerWebhook(eventType, payload, userId = null) {
  const subscriptions = await getActiveSubscriptions(eventType, userId);
  
  if (subscriptions.length === 0) {
    return { deliveredCount: 0, failedCount: 0 };
  }

  const fullPayload = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data: payload
  };

  let deliveredCount = 0;
  let failedCount = 0;

  // Deliver webhooks with retry logic
  const deliveryPromises = subscriptions.map(async (sub) => {
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      const result = await deliverWebhook(
        sub.id,
        sub.webhookUrl,
        sub.secretKey,
        fullPayload,
        attempt
      );

      if (result.success) {
        deliveredCount++;
        return;
      }

      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]));
      }
    }

    failedCount++;
  });

  await Promise.allSettled(deliveryPromises);

  return { deliveredCount, failedCount };
}

/**
 * Deactivate a webhook subscription
 * @param {string} subscriptionId - Subscription ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<boolean>} - Success
 */
async function deactivateWebhook(subscriptionId, userId) {
  let connection;
  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `UPDATE webhook_subscriptions
       SET is_active = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = :subscriptionId
         AND user_id = :userId`,
      { subscriptionId, userId },
      { autoCommit: true }
    );

    return result.rowsAffected > 0;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Get user's webhook subscriptions
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of subscriptions
 */
async function getUserWebhooks(userId) {
  let connection;
  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `SELECT id, event_type, webhook_url, is_active, created_at
       FROM webhook_subscriptions
       WHERE user_id = :userId
       ORDER BY created_at DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (result.rows || []).map(row => ({
      id: row.ID,
      eventType: row.EVENT_TYPE,
      webhookUrl: row.WEBHOOK_URL,
      isActive: row.IS_ACTIVE === 1,
      createdAt: row.CREATED_AT
    }));
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

module.exports = {
  generateSignature,
  registerWebhook,
  getActiveSubscriptions,
  deliverWebhook,
  triggerWebhook,
  deactivateWebhook,
  getUserWebhooks
};
