let incorrectAnswers = [];


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

  inputs.forEach((input) => {
    const isCorrect = input.dataset.isCorrect === "true";
    if (input.checked) {
      correctAnswerFound = correctAnswerFound || isCorrect;
      toggleAnswerState(input, isCorrect);
    }
  });

  if (!correctAnswerFound) {
    incorrectAnswers.push(questionId);
    button.nextElementSibling.style.display = "inline-block";
  }

  button.disabled = true;
  button.nextElementSibling.nextElementSibling.disabled = false;
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

  incorrectAnswers.forEach((questionId) => {
    const hiddenField = document.createElement("input");
    hiddenField.type = "hidden";
    hiddenField.name = "incorrect_answers[]";
    hiddenField.value = questionId;
    document.getElementById("quizForm").appendChild(hiddenField);
  });
  document.getElementById("quizForm").submit();
}


function translateQuestion(questionId) {
  const button = document.querySelector(
    `.question[data-question-id="${questionId}"] .translate-button`
  );

  const progressBar = document.createElement("span");
  progressBar.classList.add("progress-bar");
  button.appendChild(progressBar);
  button.disabled = true;

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
  const duration = 15000;
  const maxProgressBeforeTranslationEnds = 95;

  const animate = (time) => {
    const currentTime = performance.now();
    const elapsedTime = currentTime - startTime;
    progress = (elapsedTime / duration) * 100;
    progress = Math.min(progress, maxProgressBeforeTranslationEnds);
    progressBar.style.width = `${progress}%`;

    if (progress < maxProgressBeforeTranslationEnds) {
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

      const cardBack = document.querySelector(
        `.question[data-question-id="${questionId}"] .card-back`
      );
      const translatedContent =
        `<h3>${data.question}</h3>` +
        data.answers.map((answer) => `<p>${answer}</p>`).join("");

      cardBack.querySelector(".translated-text").innerHTML = translatedContent;

      setTimeout(() => {
        flipCard(questionId);
        setTimeout(() => {
          progressBar.remove();
          button.disabled = false;
        }, 500);
      }, 500);
    })

    .catch((error) => {
      console.error("Error:", error);
      cancelAnimationFrame(animationFrameId);
      progressBar.remove();
      button.disabled = false;
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

