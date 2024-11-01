// index.js

const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const express = require('express');

const MAX_DAILY_ADS = 100;
const ADS_PER_REWARD = 15;
const REWARD_AMOUNT = 20;
const INITIAL_MIN_PAYOUT = 20;
const SUBSEQUENT_MIN_PAYOUT = 100;
const DAILY_BONUS_AMOUNT = 5;
const STREAK_BONUS_AMOUNT = 10;
const SPIN_COST = 10;
const SPIN_REWARD_VALUES = [10, 20, 5, 50, 15, 30, 25, 100];
const TIER_LEVELS = { Bronze: 0, Silver: 500, Gold: 1000, Platinum: 2000 };
const ACHIEVEMENT_REQUIREMENTS = {
  '50 Ads Watched': { type: 'adsWatched', count: 50 },
  'Earned 500 Rupees': { type: 'totalEarnings', count: 500 },
  '5 Referrals': { type: 'referrals', count: 5 }
};

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('webapp'));
app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});

const webAppUrl = `https://claw-earning.onrender.com`;
const channelId = '@ClawEarning';
const adminUserIds = ['@Mass_Raja_1024', '@clawoffice'];
const dataFilePath = path.join(__dirname, 'data.json');

// Function to check if the user is an admin
const isAdmin = (username) => adminUserIds.includes(username);

// Function to read data from JSON file
const readData = () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath);
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading data:', error);
    return {};
  }
};

// Function to write data to JSON file
const writeData = (data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data:', error);
  }
};

// Bot /start command with command list
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  
  if (!users[userId]) {
    users[userId] = {
      balance: 20,
      referrals: 0,
      adsWatched: 0,
      totalEarnings: 20,
      withdrawals: 0,
      lastAdDate: new Date().toDateString(),
      hasWithdrawn: false,
      lastBonusDate: null,
      dailySpins: 0,
      extraSpins: 0,
      tier: 'Bronze',
      streakDays: 0,
      upiId: null,
      achievements: [],
      lastNotificationDate: null
    };
    writeData(users);
  }

  const referralLink = `https://t.me/${ctx.botInfo.username}?start=ref=${userId}`;
  ctx.reply(
    `Welcome! You have received a 20 rupees bonus.\n\n` +
    `Your referral link: ${referralLink}\n\n` +
    `Commands:\n` +
    `/start - Restart the bot\n` +
    `/profile - View profile\n` +
    `/referral - Get referral link\n` +
    `/watch_ad - Earn rewards by watching ads\n` +
    `/balance - Check balance\n` +
    `/withdraw - Request payout\n` +
    `/set_upi - Set your UPI ID for withdrawals\n` +
    `/daily_bonus - Claim daily bonus\n` +
    `/streak_bonus - Claim streak bonus\n` +
    `/quiz - Start quiz\n` +
    `/support - Support options\n` +
    `/stats - View stats\n` +
    `/leaderboard - Top earners\n` +
    `/referral_leaderboard - Top referrers\n` +
    `/tier - Check your tier\n` +
    `/spin - Spin the wheel\n` +
    `/buy_spin - Buy extra spins\n` +
    `/achievements - View achievements`
  );
});

// Admin Commands

// User Stats Command
bot.command('user_stats', (ctx) => {
  if (!isAdmin(ctx.from.username)) return ctx.reply("Unauthorized access.");

  const args = ctx.message.text.split(" ");
  const userId = args[1];
  const users = readData();

  if (users[userId]) {
    const user = users[userId];
    ctx.reply(
      `User ID: ${userId}\n` +
      `Balance: ${user.balance}\n` +
      `Total Earnings: ${user.totalEarnings}\n` +
      `Referrals: ${user.referrals}\n` +
      `Ads Watched: ${user.adsWatched}\n` +
      `Withdrawals: ${user.withdrawals}\n` +
      `Tier: ${user.tier}\n` +
      `Achievements: ${user.achievements.join(", ")}`
    );
  } else {
    ctx.reply("User not found.");
  }
});

// Pending Withdrawals Command
bot.command('pending_withdrawals', (ctx) => {
  if (!isAdmin(ctx.from.username)) return ctx.reply("Unauthorized access.");

  const users = readData();
  let pendingList = "Pending Withdrawals:\n\n";
  let hasPending = false;

  for (const [userId, user] of Object.entries(users)) {
    if (user.balance >= INITIAL_MIN_PAYOUT && !user.hasWithdrawn) {
      pendingList += `User ID: ${userId}, Balance: ${user.balance}\n`;
      hasPending = true;
    }
  }

  ctx.reply(hasPending ? pendingList : "No pending withdrawals.");
});

// Approve Withdrawal Command
bot.command('approve_withdrawal', (ctx) => {
  if (!isAdmin(ctx.from.username)) return ctx.reply("Unauthorized access.");

  const args = ctx.message.text.split(" ");
  const userId = args[1];
  const users = readData();

  if (users[userId]) {
    const user = users[userId];
    const minPayout = user.hasWithdrawn ? SUBSEQUENT_MIN_PAYOUT : INITIAL_MIN_PAYOUT;

    if (user.balance >= minPayout) {
      user.balance -= minPayout;
      user.withdrawals += 1;
      user.hasWithdrawn = true;
      writeData(users);
      ctx.reply(`Approved withdrawal of ${minPayout} rupees for User ID: ${userId}.`);
    } else {
      ctx.reply("User does not meet the minimum balance for withdrawal.");
    }
  } else {
    ctx.reply("User not found.");
  }
});

// Reject Withdrawal Command
bot.command('reject_withdrawal', (ctx) => {
  if (!isAdmin(ctx.from.username)) return ctx.reply("Unauthorized access.");

  const args = ctx.message.text.split(" ");
  const userId = args[1];

  if (userId) {
    ctx.reply(`Rejected withdrawal request for User ID: ${userId}.`);
  } else {
    ctx.reply("Please specify a user ID to reject.");
  }
});

// Send Announcement Command
bot.command('send_announcement', (ctx) => {
  if (!isAdmin(ctx.from.username)) return ctx.reply("Unauthorized access.");

  const announcement = ctx.message.text.replace('/send_announcement', '').trim();
  if (announcement) {
    const users = readData();
    for (const userId of Object.keys(users)) {
      bot.telegram.sendMessage(userId, announcement);
    }
    ctx.reply("Announcement sent to all users.");
  } else {
    ctx.reply("Please provide a message to send as an announcement.");
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An unexpected error occurred. Please try again later.');
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot is running...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
