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
const SPIN_COST = 10;
const SPIN_REWARD_VALUES = [10, 20, 5, 50, 15, 30, 25, 100];
const TIER_LEVELS = { Bronze: 0, Silver: 500, Gold: 1000, Platinum: 2000 };

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
      achievements: []
    };
    writeData(users);
  }
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
    `/referral - Get referral link\n` +
    `/watch_ad - Earn rewards by watching ads\n` +
    `/balance - Check balance\n` +
    `/withdraw - Request payout\n` +
    `/daily_bonus - Claim daily bonus\n` +
    `/streak_bonus - Claim streak bonus\n` +
    `/quiz - Start quiz\n` +
    `/support - Support options\n` +
    `/stats - View stats\n` +
    `/leaderboard - Top earners\n` +
    `/referral_leaderboard - Top referrers\n` +
    `/tier - Check your tier\n` +
    `/spin - Spin the wheel\n` +
    `/buy_spin - Buy extra spins`
  );
});

// Referral link command
bot.command('referral', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  if (users[userId]) {
    const botUsername = ctx.botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=ref=${userId}`;
    ctx.reply(`Your referral link: ${referralLink}`);
  } else {
    ctx.reply('Please start the bot first using /start.');
  }
});

// Watch Ad command
bot.command('watch_ad', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const currentDate = new Date().toDateString();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  if (users[userId].lastAdDate !== currentDate) {
    users[userId].adsWatched = 0;
    users[userId].lastAdDate = currentDate;
  }

  if (users[userId].adsWatched >= MAX_DAILY_ADS) {
    ctx.reply('You have reached your daily ad viewing limit. Come back tomorrow!');
    return;
  }

  users[userId].adsWatched += 1;
  if (users[userId].adsWatched % ADS_PER_REWARD === 0) {
    users[userId].balance += REWARD_AMOUNT;
    users[userId].totalEarnings += REWARD_AMOUNT;
    ctx.reply(`🎉 You've watched ${users[userId].adsWatched} ads and earned ${REWARD_AMOUNT} rupees!`);
  } else {
    ctx.reply(`You've watched ${users[userId].adsWatched} ads today.`);
  }

  writeData(users);
});

// Balance command
bot.command('balance', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  if (users[userId]) {
    ctx.reply(`Your current balance is ${users[userId].balance} rupees.`);
  } else {
    ctx.reply('Please start the bot first using /start.');
  }
});

// Tier Command
bot.command('tier', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  const user = users[userId];
  let currentTier = user.tier;
  let nextTier = null;
  let progressMessage = '';

  if (user.totalEarnings >= TIER_LEVELS.Platinum) {
    currentTier = 'Platinum';
    progressMessage = 'You are at the highest tier, Platinum!';
  } else if (user.totalEarnings >= TIER_LEVELS.Gold) {
    currentTier = 'Gold';
    nextTier = 'Platinum';
  } else if (user.totalEarnings >= TIER_LEVELS.Silver) {
    currentTier = 'Silver';
    nextTier = 'Gold';
  } else {
    currentTier = 'Bronze';
    nextTier = 'Silver';
  }

  if (nextTier) {
    const nextTierRequirement = TIER_LEVELS[nextTier];
    const difference = nextTierRequirement - user.totalEarnings;
    progressMessage = `Earn ${difference} more rupees to reach ${nextTier} tier.`;
  }

  ctx.reply(
    `Your Current Tier: ${currentTier}\n${progressMessage}`
  );
});

// Spin Command
bot.command('spin', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const currentDate = new Date().toDateString();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  const user = users[userId];
  
  if (user.lastSpinDate !== currentDate) {
    user.dailySpins = 0;
    user.lastSpinDate = currentDate;
  }

  if (user.dailySpins >= 1 && user.extraSpins <= 0) {
    ctx.reply(`You've used all your free spins. Buy more with /buy_spin.`);
    return;
  }

  let reward = getRandomReward();
  user.balance += reward;
  user.totalEarnings += reward;
  user.dailySpins += 1;

  if (user.dailySpins > 1) user.extraSpins -= 1;

  writeData(users);
  ctx.reply(`🎉 You spun the wheel and won ${reward} rupees! Current balance: ${user.balance} rupees.`);
});

// Buy Spin Command
bot.command('buy_spin', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  const user = users[userId];

  if (user.balance < SPIN_COST) {
    ctx.reply(`Insufficient balance. You need ${SPIN_COST} rupees to buy an extra spin.`);
    return;
  }

  user.balance -= SPIN_COST;
  user.extraSpins += 1;
  writeData(users);

  ctx.reply(`You purchased an extra spin! You now have ${user.extraSpins} extra spins available.`);
});

// Daily Bonus Command
bot.command('daily_bonus', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const today = new Date().toDateString();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  const user = users[userId];

  if (user.lastBonusDate === today) {
    ctx.reply('You have already claimed your daily bonus today. Come back tomorrow!');
  } else {
    user.balance += DAILY_BONUS_AMOUNT;
    user.totalEarnings += DAILY_BONUS_AMOUNT;
    user.lastBonusDate = today;
    writeData(users);
    ctx.reply(`🎉 You received your daily bonus of ${DAILY_BONUS_AMOUNT} rupees! Your new balance is ${user.balance} rupees.`);
  }
});

// Leaderboard Command
bot.command('leaderboard', (ctx) => {
  const users = readData();
  const sortedUsers = Object.entries(users)
    .sort(([, a], [, b]) => b.totalEarnings - a.totalEarnings)
    .slice(0, 10);

  let leaderboard = '🏆 Top Earners 🏆\n\n';
  sortedUsers.forEach(([userId, user], index) => {
    leaderboard += `${index + 1}. ${user.username || `User ID: ${userId}`} - ${user.totalEarnings} rupees\n`;
  });

  ctx.reply(leaderboard || 'No users on the leaderboard yet. Start earning to see your name here!');
});

// Referral Leaderboard Command
bot.command('referral_leaderboard', (ctx) => {
  const users = readData();
  const sortedUsers = Object.entries(users)
    .sort(([, a], [, b]) => b.referrals - a.referrals)
    .slice(0, 10);

  let leaderboard = '🏅 Top Referrers 🏅\n\n';
  sortedUsers.forEach(([userId, user], index) => {
    leaderboard += `${index + 1}. ${user.username || `User ID: ${userId}`} - ${user.referrals} referrals\n`;
  });

  ctx.reply(leaderboard || 'No users on the referral leaderboard yet. Start inviting friends to see your name here!');
});

// Support Command for Automated Support Options
bot.command('support', (ctx) => {
  ctx.reply('Welcome to Support! Choose an option below for assistance:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Balance Inquiry', callback_data: 'support_balance' }],
        [{ text: 'Withdrawal Help', callback_data: 'support_withdrawal' }],
        [{ text: 'Referral Questions', callback_data: 'support_referral' }],
        [{ text: 'Contact Support', callback_data: 'support_contact' }]
      ]
    }
  });
});

// Support Responses
bot.action('support_balance', (ctx) => {
  ctx.reply('To check your balance, simply use the /balance command. If you need further assistance, please let us know.');
});

bot.action('support_withdrawal', (ctx) => {
  ctx.reply('To request a withdrawal, ensure your balance meets the minimum payout requirement. Use /withdraw to initiate a payout request.');
});

bot.action('support_referral', (ctx) => {
  ctx.reply('Use your unique referral link (available via /referral) to invite friends. Each successful referral earns you a bonus!');
});

// Contact Admin for Additional Support
bot.action('support_contact', (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'User';

  ctx.reply('An admin will contact you shortly for further assistance.');

  bot.telegram.sendMessage(
    adminUserId,
    `Support request from ${username} (User ID: ${userId}):\n\nThe user requested additional support.`
  );
});

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
