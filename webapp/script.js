document.addEventListener('DOMContentLoaded', () => {
  const spinButton = document.getElementById('spinButton');
  const wheel = document.getElementById('wheel');
  const resultDisplay = document.getElementById('result');
  const balanceDisplay = document.getElementById('balance');
  const leaderboardList = document.getElementById('leaderboardList');

  let isSpinning = false;
  const spinRewards = [10, 20, 5, 50, 15, 30, 25, 100]; // Prize amounts on the wheel

  // Initialize balance and leaderboard
  async function initialize() {
    await fetchBalance();
    await fetchLeaderboard();
  }

  // Fetch user balance
  async function fetchBalance() {
    try {
      const response = await fetch('/api/balance');
      const data = await response.json();
      balanceDisplay.textContent = data.balance || 0;
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }

  // Fetch leaderboard
  async function fetchLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      leaderboardList.innerHTML = '';
      data.leaderboard.forEach((user, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${index + 1}. ${user.username || `User ID: ${user.userId}`} - ${user.totalEarnings} rupees`;
        leaderboardList.appendChild(listItem);
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }

  // Spin button logic
  spinButton.addEventListener('click', async () => {
    if (isSpinning) return;

    isSpinning = true;
    resultDisplay.textContent = '';
    spinButton.disabled = true;

    // Select a random reward and calculate the rotation
    const rewardIndex = Math.floor(Math.random() * spinRewards.length);
    const rewardAmount = spinRewards[rewardIndex];
    const rotation = (360 / spinRewards.length) * rewardIndex + (360 * 5); // Adds extra spins for visual effect

    // Animate the spin
    wheel.style.transition = 'transform 4s ease-out';
    wheel.style.transform = `rotate(${rotation}deg)`;

    // After animation ends
    setTimeout(async () => {
      wheel.style.transition = 'none';
      wheel.style.transform = `rotate(${(360 / spinRewards.length) * rewardIndex}deg)`;

      // Display result and update balance
      resultDisplay.textContent = `🎉 You won ${rewardAmount} rupees!`;
      await updateBalance(rewardAmount);
      await fetchBalance();
      await fetchLeaderboard();

      isSpinning = false;
      spinButton.disabled = false;
    }, 4000);
  });

  // Update user balance
  async function updateBalance(amount) {
    try {
      await fetch('/api/updateBalance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  }

  // Initialize the app
  initialize();
});
