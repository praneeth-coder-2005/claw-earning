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
const adminUserIds = ['@Mass_Raja_1024', '@clawoffice'];

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Parse JSON data
app.use(express.static('webapp'));
app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});

const dataFilePath = path.join(__dirname, 'data.json');

// Functions to read and write data
const readData = () => {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return {};
};

const writeData = (data) => {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// Initialize user data if not present
const initializeUser = (userId) => {
  const users = readData();
  if (!users[userId]) {
    users[userId] = {
      balance: 20,
      totalEarnings: 20,
      adsWatched: 0,
      referrals: 0,
      hasWithdrawn: false,
      upiId: null,
      achievements: [],
      lastBonusDate: null,
      dailySpins: 0,
      extraSpins: 0,
      tier: 'Bronze',
      streakDays: 0
    };
    writeData(users);
  }
};

// Bot /start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  initializeUser(userId);
  
  const referralLink = `https://t.me/${ctx.botInfo.username}?start=ref=${userId}`;
  ctx.reply(
    `Welcome! You have received a 20 rupees bonus.\n\n` +
    `Your referral link: ${referralLink}\n\n` +
    `Commands:\n/start, /profile, /referral, /watch_ad, /balance, /withdraw, /set_upi, /daily_bonus, /streak_bonus, /quiz, /support, /stats, /leaderboard, /referral_leaderboard, /tier, /spin, /buy_spin, /achievements`
  );
});

// Profile Command
bot.command('profile', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const user = users[userId];
  
  if (user) {
    ctx.reply(`Balance: ${user.balance} rupees\nTotal Earnings: ${user.totalEarnings} rupees\nReferrals: ${user.referrals}`);
  } else {
    ctx.reply('Please start the bot first using /start.');
  }
});

// Referral Command
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

// Watch Ad Command (for AdsGram Integration)
bot.command('watch_ad', (ctx) => {
  ctx.reply("Watch an ad to earn rewards! An ad will be shown now.");
  
  // Placeholder for ad display logic. Here, you would trigger the ad display from AdsGram.
});

// Balance Command
bot.command('balance', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const user = users[userId];
  
  if (user) {
    ctx.reply(`Your current balance is ${user.balance} rupees.`);
  } else {
    ctx.reply('Please start the bot first using /start.');
  }
});

// Tier Command
bot.command('tier', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const user = users[userId];

  if (user) {
    const currentTier = user.tier;
    ctx.reply(`Your Current Tier: ${currentTier}`);
  } else {
    ctx.reply('Please start the bot first using /start.');
  }
});

// Spin Command
bot.command('spin', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const user = users[userId];
  
  if (user) {
    if (user.dailySpins < 1) {
      const reward = SPIN_REWARD_VALUES[Math.floor(Math.random() * SPIN_REWARD_VALUES.length)];
      user.balance += reward;
      user.totalEarnings += reward;
      user.dailySpins += 1;
      writeData(users);
      ctx.reply(`You spun the wheel and won ${reward} rupees!`);
    } else {
      ctx.reply("You've used your daily free spin. Try again tomorrow!");
    }
  } else {
    ctx.reply('Please start the bot first using /start.');
  }
});

// Buy Spin Command
bot.command('buy_spin', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const user = users[userId];
  
  if (user && user.balance >= SPIN_COST) {
    user.balance -= SPIN_COST;
    user.extraSpins += 1;
    writeData(users);
    ctx.reply("You purchased an extra spin!");
  } else {
    ctx.reply("Insufficient balance to buy a spin.");
  }
});

// Daily Bonus Command
bot.command('daily_bonus', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const user = users[userId];
  
  if (user) {
    const today = new Date().toDateString();
    if (user.lastBonusDate !== today) {
      user.balance += DAILY_BONUS_AMOUNT;
      user.totalEarnings += DAILY_BONUS_AMOUNT;
      user.lastBonusDate = today;
      writeData(users);
      ctx.reply(`You've claimed your daily bonus of ${DAILY_BONUS_AMOUNT} rupees!`);
    } else {
      ctx.reply("You've already claimed today's bonus.");
    }
  } else {
    ctx.reply('Please start the bot first using /start.');
  }
});

// Reward URL Endpoint for AdsGram Integration
app.post('/reward', (req, res) => {
  const { userId, completionStatus } = req.body;
  const users = readData();
  
  if (completionStatus === 'completed' && users[userId]) {
    users[userId].balance += REWARD_AMOUNT;
    users[userId].totalEarnings += REWARD_AMOUNT;
    writeData(users);
    res.status(200).send({ success: true, message: 'Reward credited' });
  } else {
    res.status(400).send({ success: false, message: 'Ad not completed or user not found' });
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred. Try again later.');
});

// Launch bot and Express server
bot.launch().then(() => console.log('Bot is running...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
