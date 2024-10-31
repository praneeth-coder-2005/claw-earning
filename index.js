// index.js

const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const express = require('express');

const MAX_DAILY_ADS = 100;
const ADS_PER_REWARD = 15;
const REWARD_AMOUNT = 20;
const INITIAL_MIN_PAYOUT = 20; // First withdrawal minimum
const SUBSEQUENT_MIN_PAYOUT = 100; // Subsequent withdrawals minimum

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('webapp'));
app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});

const webAppUrl = `https://claw-earning.onrender.com`;
const channelId = '@ClawEarning'; // Replace with your actual channel ID
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

// Bot /start command with referral link
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
      lastAdDate: currentDate,
      hasWithdrawn: false
    };
    writeData(users);

    const botUsername = ctx.botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=ref=${userId}`;
    ctx.reply(
      `Welcome! You have received a 20 rupees bonus.\n\n` +
      `Your referral link: ${referralLink}\n\n` +
      `Start earning by watching ads and referring friends!`,
      { parse_mode: 'Markdown' }
    );
  } else {
    ctx.reply('Welcome back! You have already received your 20 rupees bonus.');
  }
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

  // Deduct balance and mark first withdrawal as complete
  user.balance -= minPayout;
  user.hasWithdrawn = true;
  writeData(users);

  ctx.reply(`✅ Your withdrawal of ${minPayout} rupees has been processed. Your new balance is ${user.balance} rupees.`);
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
    writeData(users);
    ctx.reply(`🎉 You earned ${bonus} rupees from the quiz! Your new balance is ${users[userId].balance} rupees.`);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error: ${ctx.updateType}`, err);
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
