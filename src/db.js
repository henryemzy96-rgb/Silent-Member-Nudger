const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertActivity(chatId, userId, username, firstName) {
  await pool.query(
    `INSERT INTO members (chat_id, user_id, username, first_name, last_active)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (chat_id, user_id)
     DO UPDATE SET last_active = now(), username = $3, first_name = $4, nudged_at = NULL`,
    [chatId, userId, username, firstName]
  );
}

async function getInactiveMembers(chatId, days) {
  const { rows } = await pool.query(
    `SELECT * FROM members
     WHERE chat_id = $1
       AND last_active < now() - ($2 || ' days')::interval
       AND opted_out = false
       AND (nudged_at IS NULL OR nudged_at < now() - interval '7 days')`,
    [chatId, days]
  );
  return rows;
}

async function markNudged(chatId, userId) {
  await pool.query(
    `UPDATE members SET nudged_at = now() WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId]
  );
}

async function setOptOut(chatId, userId, optOut) {
  await pool.query(
    `UPDATE members SET opted_out = $3 WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId, optOut]
  );
}

module.exports = { pool, upsertActivity, getInactiveMembers, markNudged, setOptOut };
