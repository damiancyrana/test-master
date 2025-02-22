let incorrectAnswers = [];
let answeredQuestions = 0;
let translationCache = {};
let totalTranslations = 0;
let completedTranslations = 0;

function toggleAnswerState(input, correct) {
  input.nextElementSibling.classList.toggle("correct", correct);
  input.nextElementSibling.classList.toggle("incorrect", !correct);
  input.disabled = true;
}

function checkAnswer(button) {
  const questionDiv = button.closest(".question");
  const questionId = questionDiv.getAttribute("data-question-id");
  const inputs = questionDiv.querySelectorAll('input[type="checkbox"]');
  let correctAnswerFound = false;
  let correctAnswers = 0;
  let selectedCorrectAnswers = 0;

  inputs.forEach((input) => {
    const isCorrect = input.dataset.isCorrect === "true";
    if (isCorrect) correctAnswers++;
    if (input.checked) {
      if (isCorrect) selectedCorrectAnswers++;
      correctAnswerFound = correctAnswerFound || isCorrect;
      toggleAnswerState(input, isCorrect);
    }
  });

  if (selectedCorrectAnswers !== correctAnswers) {
    incorrectAnswers.push(questionId);
    button.nextElementSibling.style.display = "inline-block";
  }

  button.disabled = true;
  button.nextElementSibling.nextElementSibling.disabled = false;
  
  answeredQuestions++;
  updateIncorrectAnswersCount();
}

function updateIncorrectAnswersCount() {
  const incorrectAnswersCount = incorrectAnswers.length;
  const totalQuestions = document.querySelectorAll('.question').length;
  const percentage = (incorrectAnswersCount / totalQuestions) * 100;
  const incorrectAnswersElement = document.getElementById("incorrectAnswersCount");

  incorrectAnswersElement.innerText = `Udzielono ${incorrectAnswersCount} błędnych odpowiedzi z ${totalQuestions} (${percentage.toFixed(2)} %)`;
  incorrectAnswersElement.className = '';

  if (percentage >= 70) {
    incorrectAnswersElement.classList.add("high");
  } else {
    incorrectAnswersElement.classList.add("low");
  }
}

function restart(button) {
  const questionDiv = button.closest(".question");
  questionDiv.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
    input.disabled = false;
    input.nextElementSibling.classList.remove("correct", "incorrect");
  });
  button.previousElementSibling.disabled = false;
  button.disabled = true;
}

function showCorrectAnswer(button) {
  button
    .closest(".question")
    .querySelectorAll('input[type="checkbox"]')
    .forEach((input) => {
      toggleAnswerState(input, input.dataset.isCorrect === "true");
    });
}

function submitQuiz() {
  document
    .querySelectorAll("#quizForm input[type='hidden']")
    .forEach((e) => e.remove());

  if (incorrectAnswers.length === 0) {
    // Jeśli nie ma błędnych odpowiedzi, wysyłamy pusty formularz
    const hiddenField = document.createElement("input");
    hiddenField.type = "hidden";
    hiddenField.name = "incorrect_answers[]";
    hiddenField.value = "";
    document.getElementById("quizForm").appendChild(hiddenField);
  } else {
    incorrectAnswers.forEach((questionId) => {
      const hiddenField = document.createElement("input");
      hiddenField.type = "hidden";
      hiddenField.name = "incorrect_answers[]";
      hiddenField.value = questionId;
      document.getElementById("quizForm").appendChild(hiddenField);
    });
  }

  document.getElementById("quizForm").submit();
}

function translateQuestion(questionId) {
  const button = document.querySelector(
    `.question[data-question-id="${questionId}"] .translate-button`
  );
  const progressBar = button.querySelector(".progress-bar");

  if (translationCache[questionId]) {
    // Użyj przetłumaczonej zawartości z pamięci podręcznej
    showTranslation(questionId);
  } else {
    // Pobierz tłumaczenie i zapisz w pamięci podręcznej
    fetchAndCacheTranslation(questionId, progressBar, () => {
      showTranslation(questionId);
    });
  }
}

function fetchAndCacheTranslation(questionId, progressBar, callback) {
  const button = document.querySelector(
    `.question[data-question-id="${questionId}"] .translate-button`
  );
  button.disabled = true;
  progressBar.style.width = "0%";

  var questionText = document.querySelector(
    `.question[data-question-id="${questionId}"] .card-front h3`
  ).innerText;

  var answers = Array.from(
    document.querySelectorAll(
      `.question[data-question-id="${questionId}"] .card-front .answer-container label`
    )
  ).map((label) => label.innerText);

  let animationFrameId;
  let progress = 0;
  const startTime = performance.now();
  const duration = 18000; // 15 sekund

  const animate = (time) => {
    const currentTime = performance.now();
    const elapsedTime = currentTime - startTime;
    progress = (elapsedTime / duration) * 100;
    progressBar.style.width = `${Math.min(progress, 95)}%`;

    if (progress < 95) {
      animationFrameId = requestAnimationFrame(animate);
    }
  };

  animationFrameId = requestAnimationFrame(animate);

  fetch("/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: questionText, answers: answers }),
  })
    .then((response) => response.json())
    .then((data) => {
      cancelAnimationFrame(animationFrameId);
      progressBar.style.width = "100%";

      // Zapisz tłumaczenie w pamięci podręcznej
      translationCache[questionId] = {
        question: data.question,
        answers: data.answers,
      };
      button.disabled = false;
      setTimeout(() => {
        progressBar.style.width = "0%";
      }, 500);
      if (callback) callback();
    })
    .catch((error) => {
      console.error("Error:", error);
      cancelAnimationFrame(animationFrameId);
      button.disabled = false;
      progressBar.style.width = "0%";
    });
}

function showTranslation(questionId) {
  const cardBack = document.querySelector(
    `.question[data-question-id="${questionId}"] .card-back`
  );

  const data = translationCache[questionId];

  const translatedContent =
    `<h3>${data.question}</h3>` +
    data.answers.map((answer) => `<p>${answer}</p>`).join("");

  cardBack.querySelector(".translated-text").innerHTML = translatedContent;

  flipCard(questionId);
}

function translateAll() {
  const questionDivs = document.querySelectorAll('.question');
  const translateAllButton = document.getElementById('translateAllButton');
  const progressBar = translateAllButton.querySelector('.progress-bar');
  translateAllButton.disabled = true;

  totalTranslations = questionDivs.length;
  completedTranslations = 0;

  let progress = 0;

  const updateProgressBar = () => {
    progress = (completedTranslations / totalTranslations) * 100;
    progressBar.style.width = `${progress}%`;
    if (completedTranslations === totalTranslations) {
      translateAllButton.disabled = false;
      setTimeout(() => {
        progressBar.style.width = "0%";
      }, 500);
    }
  };

  questionDivs.forEach((questionDiv) => {
    const questionId = questionDiv.getAttribute('data-question-id');
    if (!translationCache[questionId]) {
      const button = questionDiv.querySelector('.translate-button');
      const individualProgressBar = button.querySelector('.progress-bar');
      fetchAndCacheTranslation(questionId, individualProgressBar, () => {
        completedTranslations++;
        updateProgressBar();
      });
    } else {
      completedTranslations++;
      updateProgressBar();
    }
  });
}

function flipCard(questionId) {
  const questionDiv = document.querySelector(
    `.question[data-question-id="${questionId}"]`
  );
  const cardFront = questionDiv.querySelector(".card-front");
  const cardBack = questionDiv.querySelector(".card-back");

  [cardFront.style.display, cardBack.style.display] = [
    cardBack.style.display,
    cardFront.style.display,
  ];
}

function flipCardBack(questionId) {
  flipCard(questionId);
}
