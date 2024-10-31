// script.js

// Initialize Telegram Web Apps
let tg = window.Telegram.WebApp;
tg.expand(); // Expand the web app to full height

// Quiz data
const quizQuestions = [
  {
    question: 'What is the capital of France?',
    options: ['Paris', 'Berlin', 'Madrid', 'Rome'],
    correctOptionIndex: 0,
  },
  {
    question: 'Which planet is known as the Red Planet?',
    options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
    correctOptionIndex: 1,
  },
  {
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
    correctOptionIndex: 2,
  },
  // Add more questions as needed
];

let currentQuestionIndex = 0;
let score = 0;

const quizContainer = document.getElementById('quiz-container');

function showQuestion() {
  const questionData = quizQuestions[currentQuestionIndex];
  quizContainer.innerHTML = `
    <div class="question">
      <h2>Question ${currentQuestionIndex + 1}: ${questionData.question}</h2>
    </div>
    <div class="options">
      ${questionData.options
        .map(
          (option, index) => `
        <button onclick="selectOption(${index})">${option}</button>
      `
        )
        .join('')}
    </div>
  `;
}

function selectOption(selectedIndex) {
  const questionData = quizQuestions[currentQuestionIndex];
  if (selectedIndex === questionData.correctOptionIndex) {
    score++;
    alert('✅ Correct!');
  } else {
    alert(`❌ Incorrect. The correct answer was "${questionData.options[questionData.correctOptionIndex]}".`);
  }
  currentQuestionIndex++;
  if (currentQuestionIndex < quizQuestions.length) {
    showQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  quizContainer.innerHTML = `
    <div id="result">
      🎉 Quiz finished! Your score: ${score}/${quizQuestions.length}
    </div>
  `;
  // Optionally send data back to the bot
  tg.sendData(JSON.stringify({ score }));
}

// Start the quiz
showQuestion();
