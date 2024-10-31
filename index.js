const { Telegraf } = require('telegraf');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;
const channelId = 'ClawEarning'; // Replace with your actual channel ID

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const member = await ctx.telegram.getChatMember(channelId, userId);

  if (member.status === 'member' || member.status === 'administrator' || member.status === 'creator') {
    ctx.reply('Thank you for joining the channel! You have received a 20 rupees bonus.');
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

bot.action('check_joined', async (ctx) => {
  const userId = ctx.from.id;
  const member = await ctx.telegram.getChatMember(channelId, userId);

  if (member.status === 'member' || member.status === 'administrator' || member.status === 'creator') {
    ctx.reply('Thank you for joining! You have received a 20 rupees bonus.');
  } else {
    ctx.reply('Please join the channel first to receive the bonus.');
  }
});

// Set the bot to use webhooks
app.use(bot.webhookCallback('/webhook'));
bot.telegram.setWebhook(`https://claw-earning.vercel.app/webhook`);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
