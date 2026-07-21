const { Telegraf } = require('telegraf');
const cron = require('node-cron');
require('dotenv').config();
const { upsertActivity, getInactiveMembers, markNudged, setOptOut } = require('./db');

const bot = new Telegraf(process.env.BOT_TOKEN);
const INACTIVITY_DAYS = parseInt(process.env.INACTIVITY_DAYS || '7', 10);

// Track activity on every message in any group the bot is in
bot.on('message', async (ctx) => {
  if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    const { id: userId, username, first_name } = ctx.from;
    await upsertActivity(ctx.chat.id, userId, username, first_name);
  }
});

// Let members opt out of nudges
bot.command('optout', async (ctx) => {
  await setOptOut(ctx.chat.id, ctx.from.id, true);
  ctx.reply("You won't receive activity nudges in this group anymore.");
});

bot.command('optin', async (ctx) => {
  await setOptOut(ctx.chat.id, ctx.from.id, false);
  ctx.reply("You're back in for activity nudges.");
});

// Daily nudge job — runs once a day at the configured hour (UTC)
const nudgeHour = process.env.NUDGE_HOUR_UTC || '9';
cron.schedule(`0 ${nudgeHour} * * *`, async () => {
  // NOTE: in production, loop over all chat_ids you're tracking.
  // For a single-group MVP, hardcode or read from an env var.
  const chatId = process.env.TARGET_CHAT_ID;
  if (!chatId) return;

  const inactive = await getInactiveMembers(chatId, INACTIVITY_DAYS);
  for (const member of inactive) {
    try {
      await bot.telegram.sendMessage(
        member.user_id,
        `Hey${member.first_name ? ' ' + member.first_name : ''} — noticed you've been quiet in the group for a bit. Everything okay? No pressure, just wanted to check in. Reply /optout here if you'd rather not get these.`
      );
      await markNudged(chatId, member.user_id);
    } catch (err) {
      // Most common failure: user hasn't started a DM with the bot yet
      console.error(`Could not DM user ${member.user_id}:`, err.message);
    }
  }
});

bot.launch();
console.log('Silent-Member Nudger is running.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
