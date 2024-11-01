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
const adminUserId = 'YOUR_ADMIN_USER_ID';
const dataFilePath = path.join(__dirname, 'data.json');

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

// Helper function to get a random reward for spinning
const getRandomReward = () => {
  const index = Math.floor(Math.random() * SPIN_REWARD_VALUES.length);
  return SPIN_REWARD_VALUES[index];
};

// Initialize user data if not present
const initializeUser = (userId) => {
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
};

// Check and unlock achievements
const unlockAchievements = (userId) => {
  const users = readData();
  const user = users[userId];
  const unlockedAchievements = [];

  for (const [achievement, requirement] of Object.entries(ACHIEVEMENT_REQUIREMENTS)) {
    if (
      !user.achievements.includes(achievement) &&
      user[requirement.type] >= requirement.count
    ) {
      user.achievements.push(achievement);
      unlockedAchievements.push(achievement);
    }
  }

  if (unlockedAchievements.length > 0) {
    writeData(users);
  }

  return unlockedAchievements;
};

// Bot /start command with command list
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  initializeUser(userId);

  const botUsername = ctx.botInfo.username;
  const referralLink = `https://t.me/${botUsername}?start=ref=${userId}`;
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

// Profile Command
bot.command('profile', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  const user = users[userId];
  ctx.reply(
    `👤 Your Profile\n\n` +
    `Tier: ${user.tier || 'Bronze'}\n` +
    `Balance: ${user.balance} rupees\n` +
    `Total Earnings: ${user.totalEarnings} rupees\n` +
    `Referrals: ${user.referrals}\n` +
    `Ads Watched: ${user.adsWatched}\n` +
    `Achievements: ${user.achievements.length > 0 ? user.achievements.join(', ') : 'No achievements yet'}`
  );
});

// Set UPI ID Command
bot.command('set_upi', (ctx) => {
  const userId = ctx.from.id;
  ctx.reply('Please enter your UPI ID:');
  bot.on('text', (ctx) => {
    const upiId = ctx.message.text.trim();
    const users = readData();
    if (upiId) {
      users[userId].upiId = upiId;
      writeData(users);
      ctx.reply(`UPI ID successfully set to: ${upiId}`);
    } else {
      ctx.reply('Invalid UPI ID. Please try again.');
    }
  });
});

// Withdrawal command with UPI check
bot.command('withdraw', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  const user = users[userId];
  const minPayout = user.hasWithdrawn ? SUBSEQUENT_MIN_PAYOUT : INITIAL_MIN_PAYOUT;

  if (!user.upiId) {
    ctx.reply('Please set your UPI ID first using /set_upi.');
    return;
  }

  if (user.balance < minPayout) {
    ctx.reply(`Your balance is too low to request a withdrawal. Minimum payout is ${minPayout} rupees.`);
    return;
  }

  user.balance -= minPayout;
  user.totalEarnings -= minPayout;
  user.withdrawals += 1;
  user.hasWithdrawn = true;
  writeData(users);

  ctx.reply(`✅ Your withdrawal of ${minPayout} rupees has been processed to UPI ID: ${user.upiId}. Your new balance is ${user.balance} rupees.`);
});

// Notifications for daily reset
const notifyUsers = () => {
  const users = readData();
  const today = new Date().toDateString();

  Object.entries(users).forEach(([userId, user]) => {
    if (user.lastNotificationDate !== today) {
      bot.telegram.sendMessage(
        userId,
        'Daily limits have reset! You can now watch ads, claim bonuses, and more.'
      );
      user.lastNotificationDate = today;
    }
  });
  writeData(users);
};

// Schedule the notification at midnight daily
setInterval(notifyUsers, 24 * 60 * 60 * 1000);

// Basic Anti-Spam/Anti-Fraud Protection
bot.use((ctx, next) => {
  const userId = ctx.from.id;
  const users = readData();

  if (!users[userId]) initializeUser(userId);

  const user = users[userId];
  if (user.ipAddress && user.ipAddress === ctx.ip) {
    ctx.reply('Multiple accounts on the same IP are not allowed.');
    return;
  }

  user.ipAddress = ctx.ip;
  writeData(users);
  return next();
});

// Additional commands like /watch_ad, /balance, /referral, /daily_bonus, etc., would follow here
// Please refer to previous code snippets for full implementations of these commands

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An unexpected error occurred. Please try again later.');
});

// Handling uncaught errors to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
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
