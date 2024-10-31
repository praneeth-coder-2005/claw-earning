const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Initialize the bot with the token from environment variables
const bot = new Telegraf(process.env.BOT_TOKEN);
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

// Bot /start command
bot.start(async (ctx) => {
  try {
    const userId = ctx.from.id;

    const users = readData(); // Read current users from file

    // Check for referral parameter in the context
    const messageText = ctx.message.text;
    let referralUserId = null;
    if (messageText.includes('ref=')) {
      referralUserId = messageText.split('ref=')[1];
    }

    if (!users[userId]) {
      // New user, set initial balance and bonus
      users[userId] = { balance: 20, receivedBonus: true, referrals: 0 };
      writeData(users);

      // Increment referrer's referrals if applicable
      if (referralUserId && users[referralUserId]) {
        users[referralUserId].referrals += 1;
        writeData(users);
        ctx.reply(
          `Thank you for joining through a referral! Your referrer now has ${users[referralUserId].referrals} referrals.`
        );
      }

      // Generate referral link
      const botUsername = ctx.botInfo.username;
      const referralLink = `https://t.me/${botUsername}?start=ref=${userId}`;

      // Send welcome message with referral link
      ctx.reply(
        `Thank you for joining! You have received a 20 rupees bonus.\n\n` +
          `Your referral link: ${referralLink}\n\n` +
          '🎉 **Welcome to the Earning Program!** 🎉\n\n' +
          'Here’s how you can earn rewards:\n\n' +
          '🌟 **Referral Bonuses:**\n' +
          '➡️ For every successful referral, you earn **20 rupees**!\n' +
          '➡️ Each referral gives you the opportunity to watch **15 ads**.\n' +
          '➡️ The more friends you invite, the more you earn!\n\n' +
          '📅 **Daily Ad Viewing Limit:**\n' +
          '➡️ You can watch up to **100 ads** per day!\n' +
          '➡️ Come back tomorrow to continue watching any remaining ads and maximize your earnings!\n\n' +
          '🔥 **Special Bonus:**\n' +
          '➡️ Invite **5 friends** and get an additional **50 rupees** bonus!\n\n' +
          '🎁 **Your earnings are just a referral away!**\n\n' +
          '📢 **Stay tuned for more updates and exciting offers!**',
        { parse_mode: 'Markdown' }
      );
    } else {
      ctx.reply('Welcome back! You have already received your 20 rupees bonus.');
    }
  } catch (error) {
    console.error('Error in /start command:', error);
    ctx.reply('An error occurred while processing your request. Please try again later.');
  }
});

// Command to get the referral link again
bot.command('referral', (ctx) => {
  try {
    const userId = ctx.from.id;
    const users = readData();

    if (users[userId]) {
      const botUsername = ctx.botInfo.username;
      const referralLink = `https://t.me/${botUsername}?start=ref=${userId}`;
      ctx.reply(`Your referral link: ${referralLink}`);
    } else {
      ctx.reply('Please start the bot first using /start.');
    }
  } catch (error) {
    console.error('Error in /referral command:', error);
    ctx.reply('An error occurred while processing your request. Please try again later.');
  }
});

// Mini App Command - Launch Quiz Web App
bot.command('quiz', (ctx) => {
  try {
    // Send a message with a button to open the web app
    ctx.reply('Click the button below to start the quiz:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Start Quiz',
              web_app: {
                url: 'https://your-web-app-url.com' // Replace with your web app URL
              }
            }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error in /quiz command:', error);
    ctx.reply('An error occurred while starting the quiz. Please try again later.');
  }
});

// Handle data sent from the web app
bot.on('web_app_data', (ctx) => {
  try {
    const userId = ctx.from.id;
    const data = JSON.parse(ctx.webAppData.data); // The data sent from the web app
    const users = readData();

    // Update user's balance based on quiz score
    if (data.score !== undefined && users[userId]) {
      const bonus = data.score * 5; // Example: 5 rupees per correct answer
      users[userId].balance += bonus;
      writeData(users);
      ctx.reply(`🎉 You earned ${bonus} rupees from the quiz! Your new balance is ${users[userId].balance} rupees.`);
    }
  } catch (error) {
    console.error('Error handling web app data:', error);
    ctx.reply('An error occurred while processing your quiz results. Please try again later.');
  }
});

// Check channel membership and give bonus if joined
bot.command('check_joined', async (ctx) => {
  try {
    const userId = ctx.from.id;

    const member = await ctx.telegram.getChatMember(channelId, userId);

    if (['member', 'administrator', 'creator'].includes(member.status)) {
      const users = readData();

      if (users[userId] && !users[userId].receivedBonus) {
        users[userId].balance += 20;
        users[userId].receivedBonus = true;
        writeData(users);
        ctx.reply('Thank you for joining! You have received a 20 rupees bonus.');
      } else {
        ctx.reply('You have already received your bonus.');
      }
    } else {
      ctx.reply('Please join our official channel to receive the bonus.');
    }
  } catch (error) {
    console.error('Error in /check_joined command:', error);
    ctx.reply('An error occurred while checking your membership. Please try again later.');
  }
});

// Global error handling
bot.catch((err, ctx) => {
  console.error(`Global error handler: ${ctx.updateType}`, err);
  ctx.reply('An unexpected error occurred. Please try again later.');
});

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot is running...');
});
