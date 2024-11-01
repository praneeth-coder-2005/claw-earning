document.addEventListener('DOMContentLoaded', () => {
  const watchAdButton = document.getElementById('watchAdButton');
  const resultDisplay = document.getElementById('result');
  const balanceDisplay = document.getElementById('balance');
  
  // Initialize AdsGram ad controller with your block ID
  const AdController = window.Adsgram.init({ blockId: "your-block-id" });

  // Fetch initial balance
  async function fetchBalance() {
    try {
      const response = await fetch('/api/balance');
      const data = await response.json();
      balanceDisplay.textContent = data.balance || 0;
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }

  // Update balance after watching an ad
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

  // Click event for watching an ad
  watchAdButton.addEventListener('click', () => {
    AdController.show()
      .then(async () => {
        resultDisplay.textContent = "Ad completed! You've earned rewards.";
        
        // Reward the user after watching the ad
        await updateBalance(20); // Example reward amount
        await fetchBalance();
      })
      .catch((err) => {
        console.error("Error displaying ad:", err);
        resultDisplay.textContent = "Error displaying ad. Try again.";
      });
  });

  // Initialize balance on page load
  fetchBalance();
});
