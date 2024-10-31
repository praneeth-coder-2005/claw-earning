const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');


// Initialize the bot with the token from the environment variable
const bot = new Telegraf(process.env.BOT_TOKEN);
const channelId = '@ClawEarning'; // Replace with your actual channel ID

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// User Schema and Model
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  balance: { type: Number, default: 0 },
  receivedBonus: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Bot /start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  try {
    // Check if user is already in the database
    let user = await User.findOne({ userId });

    if (!user) {
      // If user is new, add them to the database and set initial balance with bonus
      user = new User({ userId, balance: 20, receivedBonus: true });
      await user.save();
      ctx.reply('Thank you for joining the channel! You have received a 20 rupees bonus.');

      // Display earning rules
      ctx.reply('Here’s how you can earn:\n' +
                '- Every successful referral lets you watch 15 ads, worth 20 rupees.\n' +
                '- You can watch up to 100 ads per day.\n' +
                'Come back tomorrow for any remaining ads!');
    } else if (user.receivedBonus) {
      // If user already received bonus, welcome them back
      ctx.reply('Welcome back! You have already received your 20 rupees bonus.');
    }
  } catch (error) {
    console.error("Error handling user data:", error);
    ctx.reply('There was an error processing your request. Please try again later.');
  }
});

// Check channel membership and give bonus if joined
bot.command('check_joined', async (ctx) => {
  const userId = ctx.from.id;

  try {
    // Check if user is a member of the channel
    const member = await ctx.telegram.getChatMember(channelId, userId);

    if (member.status === 'member' || member.status === 'administrator' || member.status === 'creator') {
      let user = await User.findOne({ userId });

      if (user && !user.receivedBonus) {
        user.balance += 20; // Add bonus
        user.receivedBonus = true;
        await user.save();
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
