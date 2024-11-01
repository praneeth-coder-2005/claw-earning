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
    };
    writeData(users);

    const botUsername = ctx.botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=ref=${userId}`;
    ctx.reply(
      `Welcome! You have received a 20 rupees bonus.\n\n` +
      `Your referral link: ${referralLink}\n\n` +
      `Here are the available commands:\n\n` +
      `/start - Start or restart the bot\n` +
      `/referral - Get your referral link\n` +
      `/watch_ad - Watch ads to earn rewards\n` +
      `/spin - Spin the wheel (limited daily spins)\n` +
      `/buy_spin - Purchase an extra spin for ${SPIN_COST} rupees\n` +
      `/balance - Check your current balance\n` +
      `/withdraw - Request a payout\n` +
      `/daily_bonus - Claim your daily login bonus\n` +
      `/quiz - Start a quiz for extra rewards\n` +
      `/support - Access support options\n` +
      `/stats - View your statistics\n` +
      `/leaderboard - See the top earners\n\n` +
      `Start earning by watching ads and referring friends!`,
      { parse_mode: 'Markdown' }
    );
  } else {
    ctx.reply(
      'Welcome back! Here are the available commands:\n\n' +
      `/start - Start or restart the bot\n` +
      `/referral - Get your referral link\n` +
      `/watch_ad - Watch ads to earn rewards\n` +
      `/spin - Spin the wheel (limited daily spins)\n` +
      `/buy_spin - Purchase an extra spin for ${SPIN_COST} rupees\n` +
      `/balance - Check your current balance\n` +
      `/withdraw - Request a payout\n` +
      `/daily_bonus - Claim your daily login bonus\n` +
      `/quiz - Start a quiz for extra rewards\n` +
      `/support - Access support options\n` +
      `/stats - View your statistics\n` +
      `/leaderboard - See the top earners\n\n` +
      `Let’s continue earning!`
    );
  }
});

// Spin command with daily limit and extra spins handling
bot.command('spin', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const user = users[userId];

  if (user.dailySpins >= DAILY_FREE_SPINS + user.extraSpins) {
    return ctx.reply("You've used up your daily free spins! Use /buy_spin to purchase more spins.");
  }

  if (user.dailySpins >= DAILY_FREE_SPINS) {
    user.extraSpins -= 1;
  }

  user.dailySpins += 1;
  const rewardAmount = getRandomReward();
  user.balance += rewardAmount;
  writeData(users);

  ctx.reply(`🎉 You won ${rewardAmount} rupees! Your new balance is ${user.balance} rupees.`);
});

// Command to buy extra spins
bot.command('buy_spin', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();
  const user = users[userId];

  if (user.balance < SPIN_COST) {
    return ctx.reply("You don't have enough balance to buy an extra spin.");
  }

  user.balance -= SPIN_COST;
  user.extraSpins += 1;
  writeData(users);

  ctx.reply(`You bought an extra spin! You now have ${user.extraSpins} extra spins.`);
});

// Schedule daily reset of spins
setInterval(() => {
  const users = readData();
  resetDailySpins(users);
  writeData(users);
}, 86400000);

// Command to simulate watching an ad
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

// Command to check balance
bot.command('balance', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();

  if (users[userId]) {
    ctx.reply(`Your current balance is ${users[userId].balance} rupees.`);
  } else {
    ctx.reply('Please start the bot first using /start.');
  }
});

// Withdrawal command
bot.command('withdraw', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  const user = users[userId];
  const minPayout = user.hasWithdrawn ? SUBSEQUENT_MIN_PAYOUT : INITIAL_MIN_PAYOUT;

  if (user.balance < minPayout) {
    ctx.reply(`Your balance is too low to request a withdrawal. Minimum payout is ${minPayout} rupees.`);
    return;
  }

  user.balance -= minPayout;
  user.totalEarnings -= minPayout;
  user.withdrawals += 1;
  user.hasWithdrawn = true;
  writeData(users);

  ctx.reply(`✅ Your withdrawal of ${minPayout} rupees has been processed. Your new balance is ${user.balance} rupees.`);
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

// Command to view user statistics
bot.command('stats', (ctx) => {
  const userId = ctx.from.id;
  const users = readData();

  if (!users[userId]) {
    ctx.reply('Please start the bot first using /start.');
    return;
  }

  const user = users[userId];
  ctx.reply(
    `📊 Here are your statistics:\n\n` +
    `Total Referrals: ${user.referrals}\n` +
    `Total Ads Watched: ${user.adsWatched}\n` +
    `Total Earnings: ${user.totalEarnings} rupees\n` +
    `Total Withdrawals: ${user.withdrawals}\n\n` +
    `Keep up the great work!`
  );
});

// Mini App Command - Launch Quiz Web App
bot.command('quiz', (ctx) => {
  ctx.reply('Click the button below to start the quiz:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Start Quiz',
            web_app: {
              url: `${webAppUrl}/index.html`
            }
          }
        ]
      ]
    }
  });
});

// Handle data sent from the web app
bot.on('web_app_data', (ctx) => {
  const userId = ctx.from.id;
  const data = JSON.parse(ctx.webAppData.data);
  const users = readData();

  if (data.score !== undefined && users[userId]) {
    const bonus = data.score * 5;
    users[userId].balance += bonus;
    users[userId].totalEarnings += bonus;
    writeData(users);
    ctx.reply(`🎉 You earned ${bonus} rupees from the quiz! Your new balance is ${users[userId].balance} rupees.`);
  }
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
  console.error(`Error: ${ctx.updateType}`, err);
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
