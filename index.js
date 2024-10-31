const { Telegraf } = require('telegraf');
const bot = new Telegraf('7728162826:AAFdjHDjmFl47Oa9ViURU2atR4-jsyXhsXc'); // Replace 'YOUR_BOT_TOKEN' with your actual bot token

// Start Command
bot.start((ctx) => {
  ctx.reply('Welcome to the bot! Please join our official channel to get started.');
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot is running...');
});
