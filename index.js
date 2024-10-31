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

  if (!users[userId]) {
    // If user is new, add them to the file and set initial balance with bonus
    users[userId] = { balance: 20, receivedBonus: true };
    writeData(users);
    ctx.reply('Thank you for joining the channel! You have received a 20 rupees bonus.');

    // Display earning rules
    ctx.reply('Here’s how you can earn:\n' +
              '- Every successful referral lets you watch 15 ads, worth 20 rupees.\n' +
              '- You can watch up to 100 ads per day.\n' +
              'Come back tomorrow for any remaining ads!');
  } else if (users[userId].receivedBonus) {
    // If user already received bonus, welcome them back
    ctx.reply('Welcome back! You have already received your 20 rupees bonus.');
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
