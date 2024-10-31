const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN); // Use environment variable for security
const channelId = '@ClawEarning'; // Replace with your actual Telegram channel ID

// Start command to check if user has joined the channel
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  // Check if user is a member of the channel
  const member = await ctx.telegram.getChatMember(channelId, userId);

  if (member.status === 'member' || member.status === 'administrator' || member.status === 'creator') {
    ctx.reply('Thank you for joining the channel! You have received a 20 rupees bonus.');
    // Here, we will add database code later to store the bonus for the user
  } else {
    ctx.reply('Please join our official channel to get started and receive your 20 rupees bonus.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Join Official Channel', url: `https://t.me/ClawEarning` }],
          [{ text: 'I have joined', callback_data: 'check_joined' }]
        ]
      }
    });
  }
});

// Action to check membership when the user clicks "I have joined"
bot.action('check_joined', async (ctx) => {
  const userId = ctx.from.id;

  const member = await ctx.telegram.getChatMember(channelId, userId);

  if (member.status === 'member' || member.status === 'administrator' || member.status === 'creator') {
    ctx.reply('Thank you for joining! You have received a 20 rupees bonus.');
    // Here, we will add code to save the bonus to the database in the future
  } else {
    ctx.reply('Please join the channel first to receive the bonus.');
  }
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot is running...');
});
