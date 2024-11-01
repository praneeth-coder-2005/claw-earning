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
const DAILY_FREE_SPINS = 1;
const SPIN_COST = 10;
const SPIN_REWARD_VALUES = [10, 20, 5, 50, 15, 30, 25, 100];

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

// Tier Levels and Achievements Setup
const TIER_LEVELS = {
  Bronze: 0,
  Silver: 500,
  Gold: 1000,
  Platinum: 2000
};

const ACHIEVEMENTS = {
  AdsWatched: { count: 100, description: "Watched 100 ads" },
  Referrals: { count: 10, description: "10 successful referrals" },
  Earnings: { count: 1000, description: "Earned a total of 1000 rupees" }
};

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

// Function to get a random reward for the spin
const getRandomReward = () => {
  const index = Math.floor(Math.random() * SPIN_REWARD_VALUES.length);
  return SPIN_REWARD_VALUES[index];
};

// Reset daily spins for each user
function resetDailySpins(users) {
  const currentDate = new Date().toDateString();
  for (let userId in users) {
    if (users[userId].lastSpinDate !== currentDate) {
      users[userId].dailySpins = 0;
      users[userId].lastSpinDate = currentDate;
    }
  }
}

// Function to update user tier based on earnings
function updateUserTier(user) {
  const earnings = user.totalEarnings;
  if (earnings >= TIER_LEVELS.Platinum) user.tier = 'Platinum';
  else if (earnings >= TIER_LEVELS.Gold) user.tier = 'Gold';
  else if (earnings >= TIER_LEVELS.Silver) user.tier = 'Silver';
  else user.tier = 'Bronze';
}

// Function to update achievements based on milestones
function updateAchievements(user) {
  if (user.adsWatched >= ACHIEVEMENTS.AdsWatched.count && !user.achievements.includes(ACHIEVEMENTS.AdsWatched.description)) {
    user.achievements.push(ACHIEVEMENTS.AdsWatched.description);
  }
  if (user.referrals >= ACHIEVEMENTS.Referrals.count && !user.achievements.includes(ACHIEVEMENTS.Referrals.description)) {
    user.achievements.push(ACHIEVEMENTS.Referrals.description);
  }
  if (user.totalEarnings >= ACHIEVEMENTS.Earnings.count && !user.achievements.includes(ACHIEVEMENTS.Earnings.description)) {
    user.achievements.push(ACHIEVEMENTS.Earnings.description);
  }
}

// Bot /start command with command list
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const currentDate = new Date().toDateString();

  if (!users[userId]) {
    users[userId] = {
      balance: 20,
      receivedBonus: true,
      referrals: 0,
      adsWatched: 0,
      totalEarnings: 20,
      withdrawals: 0,
      lastAdDate: currentDate,
      hasWithdrawn: false,
      lastBonusDate: null,
      dailySpins: 0,
      extraSpins: 0,
      lastSpinDate: null,
      tier: 'Bronze', // Default tier
      achievements: [], // List of achievements
      streakDays: 0 // For streak bonus
    };
    writeData(users);

    const botUsername = ctx.botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=ref=${userId}`;
    ctx.reply(
      `Welcome! You have received a 20 rupees bonus.\n\n` +
      `Your referral link: ${referralLink}\n\n` +
      `Here are the available commands:\n\n` +
      `/start - Start or restart the bot\n` +
      `/profile - View your profile\n` +
      `/referral - Get your referral link\n` +
      `/watch_ad - Watch ads to earn rewards\n` +
      `/spin - Spin the wheel (limited daily spins)\n` +
      `/buy_spin - Purchase an extra spin for ${SPIN_COST} rupees\n` +
      `/balance - Check your current balance\n` +
      `/withdraw - Request a payout\n` +
      `/daily_bonus - Claim your daily login bonus\n` +
      `/streak_bonus - Claim your streak bonus\n` +
      `/quiz - Start a quiz for extra rewards\n` +
      `/support - Access support options\n` +
      `/stats - View your statistics\n` +
      `/tier - Check your tier rank and progress\n` +
      `/leaderboard - See the top earners\n` +
      `/referral_leaderboard - See top referrals\n\n` +
      `Start earning by watching ads and referring friends!`,
      { parse_mode: 'Markdown' }
    );
  } else {
    ctx.reply(
      'Welcome back! Here are the available commands:\n\n' +
      `/start - Start or restart the bot\n` +
      `/profile - View your profile\n` +
      `/referral - Get your referral link\n` +
      `/watch_ad - Watch ads to earn rewards\n` +
      `/spin - Spin the wheel (limited daily spins)\n` +
      `/buy_spin - Purchase an extra spin for ${SPIN_COST} rupees\n` +
      `/balance - Check your current balance\n` +
      `/withdraw - Request a payout\n` +
      `/daily_bonus - Claim your daily login bonus\n` +
      `/streak_bonus - Claim your streak bonus\n` +
      `/quiz - Start a quiz for extra rewards\n` +
      `/support - Access support options\n` +
      `/stats - View your statistics\n` +
      `/tier - Check your tier rank and progress\n` +
      `/leaderboard - See the top earners\n` +
      `/referral_leaderboard - See top referrals\n\n` +
      `Let’s continue earning!`
    );
  }
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
    `👤 **Your Profile**\n\n` +
    `Tier Level: ${user.tier}\n` +
    `Balance: ${user.balance} rupees\n` +
    `Total Referrals: ${user.referrals}\n` +
    `Total Ads Watched: ${user.adsWatched}\n` +
    `Total Earnings: ${user.totalEarnings} rupees\n` +
    `Achievements: ${user.achievements.length > 0 ? user.achievements.join(', ') : 'No achievements yet'}\n\n`
  );
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
  const currentTier = user.tier;
  let nextTier = null;
  let progressMessage = '';

  if (currentTier === 'Bronze' && user.totalEarnings < TIER_LEVELS.Silver) {
    nextTier = 'Silver';
    progressMessage = `Earn ${TIER_LEVELS.Silver - user.totalEarnings} more rupees to reach Silver tier.`;
  } else if (currentTier === 'Silver' && user.totalEarnings < TIER_LEVELS.Gold) {
    nextTier = 'Gold';
    progressMessage = `Earn ${TIER_LEVELS.Gold - user.totalEarnings} more rupees to reach Gold tier.`;
  } else if (currentTier === 'Gold' && user.totalEarnings < TIER_LEVELS.Platinum) {
    nextTier = 'Platinum';
    progressMessage = `Earn ${TIER_LEVELS.Platinum - user.totalEarnings} more rupees to reach Platinum tier.`;
  } else if (currentTier === 'Platinum') {
    progressMessage = 'You are at the highest tier level, Platinum. Keep up the great work!';
  }

  ctx.reply(
    `🌟 Your Current Tier: ${currentTier}\n` +
    `${progressMessage}`
  );
});

// Milestone Rewards for Ads Watched, Referrals, and Earnings
function checkMilestoneRewards(user, ctx) {
  const milestones = [
    { count: 50, reward: 10, description: 'Watched 50 ads' },
    { count: 5, reward: 20, description: 'Referred 5 friends' },
    { count: 500, reward: 50, description: 'Earned 500 rupees' },
  ];

  milestones.forEach(milestone => {
    if (
      (milestone.description.includes('ads') && user.adsWatched >= milestone.count) ||
      (milestone.description.includes('friends') && user.referrals >= milestone.count) ||
      (milestone.description.includes('rupees') && user.totalEarnings >= milestone.count)
    ) {
      if (!user.achievements.includes(milestone.description)) {
        user.balance += milestone.reward;
        user.achievements.push(milestone.description);
        writeData(readData());
        ctx.reply(`🎉 Milestone Achieved: ${milestone.description}! You earned ${milestone.reward} rupees as a reward.`);
      }
    }
  });
}

// /watch_ad Command with Milestone Rewards
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
    checkMilestoneRewards(users[userId], ctx);
  } else {
    ctx.reply(`You've watched ${users[userId].adsWatched} ads today.`);
  }

  writeData(users);
});

// /daily_bonus Command
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
    checkMilestoneRewards(user, ctx);
  }
});

// /referral_leaderboard Command
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

// Error handling and bot launch
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An unexpected error occurred. Please try again later.');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

bot.launch().then(() => {
  console.log('Bot is running...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
