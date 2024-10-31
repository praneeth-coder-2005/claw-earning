const { Telegraf } = require('telegraf');
const fs = require('fs'); // Import file system module
const path = require('path');

// Initialize the bot with the token from environment variables
const bot = new Telegraf(process.env.BOT_TOKEN);
const channelId = '@ClawEarning'; // Replace with your actual channel ID
const dataFilePath = path.join(__dirname, 'data.json'); // Path to your JSON file

// Function to read data from JSON file
const readData = () => {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return {}; // Return empty object if file does not exist
};

// Function to write data to JSON file
const writeData = (data) => {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// Bot /start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  const users = readData(); // Read current users from file

  // Check for referral parameter in the context
  const messageText = ctx.message.text;
  let referralUserId = null;
  if (messageText.includes('ref=')) {
    referralUserId = messageText.split('ref=')[1]; // Get the referrer ID from the text
  }

  if (!users[userId]) {
    // If user is new, add them to the file and set initial balance with bonus
    users[userId] = { balance: 20, receivedBonus: true, referrals: 0 };
    writeData(users);

    // Increase the referrer's referral count if a referral link was used
    if (referralUserId && users[referralUserId]) {
      users[referralUserId].referrals += 1; // Increment referrals for the referrer
      writeData(users);
      ctx.reply(`Thank you for joining through your referral link! Your referrer now has ${users[referralUserId].referrals} successful referrals.`);
    }

    // Generate the referral link
    const botUsername = ctx.botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=ref=${userId}`;

    // Combine the referral link with the welcome message
    ctx.reply(
      `Thank you for joining the channel! You have received a 20 rupees bonus.\n\n` +
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
  } else if (users[userId].receivedBonus) {
    // If user already received bonus, welcome them back
    ctx.reply('Welcome back! You have already received your 20 rupees bonus.');
  }
});

// Command to get the referral link again
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

// Check channel membership and give bonus if joined
bot.command('check_joined', async (ctx) => {
  const userId = ctx.from.id;

  try {
    // Check if user is a member of the channel
    const member = await ctx.telegram.getChatMember(channelId, userId);

    if (member.status === 'member' || member.status === 'administrator' || member.status === 'creator') {
      const users = readData(); // Read current users from file

      if (users[userId] && !users[userId].receivedBonus) {
        users[userId].balance += 20; // Add bonus
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
    console.error("Error checking channel membership:", error);
    ctx.reply('There was an error checking your membership. Please try again later.');
  }
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot is running...');
});
