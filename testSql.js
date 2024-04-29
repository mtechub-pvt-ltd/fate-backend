const fs = require("fs");
const { faker } = require("@faker-js/faker");

const questionsTexts = [
  "How long have you been single/Available?",
  "What challenges have you had in dating?",
  "What are you looking for in a Partner?",
  "What are your hobbies?",
  "What is your biggest lesson learnt in Dating so far?",
];

const sampleAnswers = {
  1: [
    "I've been single for about a year now.",
    "Just recently became single.",
    "It's been a few months.",
    "Single? That's a permanent status for me.",
    "Been on my own for over two years now.",
  ],
  2: [
    "Finding someone who's serious and committed.",
    "The hardest part is meeting new people.",
    "I often encounter people not looking for something serious.",
    "Compatibility has been my main challenge.",
    "Time management between work and dating.",
  ],
  3: [
    "Someone who shares my interests and values.",
    "A kind heart, a fierce mind, and a brave spirit.",
    "Just looking for someone who gets me.",
    "I need a partner in crime, someone to share adventures with.",
    "Honesty, loyalty, and a great sense of humor.",
  ],
  4: [
    "I'm into hiking, reading, and occasional binging of series.",
    "I love painting and all things art.",
    "Sports, traveling, and enjoying good food.",
    "I'm a music enthusiast and I play the guitar.",
    "My hobbies include coding, chess, and cycling.",
  ],
  5: [
    "Communication is key in any relationship.",
    "I've learned to be more open and honest.",
    "Not to rush things and let them develop naturally.",
    "The importance of having shared goals.",
    "That self-love is the foundation of a healthy relationship.",
  ],
};

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function generateUsers(n) {
  let usersSql = "";
  for (let i = 1; i <= n; i++) {
    const gender = faker.helpers.arrayElement(["Male", "Female"]);
    const firstName = faker.name.firstName(
      gender === "Male" ? "male" : "female"
    );
    const lastName = faker.name.lastName();
    const email = faker.internet.email(firstName, lastName);
    const alo_level = getRandomInt(100) + 1; // Ensure non-zero alo_level
    usersSql += `INSERT INTO users (name, email, alo_level, gender) VALUES ('${firstName} ${lastName}', '${email}', ${alo_level}, '${gender}');\n`;
  }
  return usersSql;
}

function generateAnswers(n, questionsTexts) {
  let answersSql = "";
  // Assuming the question IDs will be sequential and start at 1
  for (let i = 1; i <= n; i++) {
    // User ID loop
    questionsTexts.forEach((_, qIndex) => {
      const qId = qIndex + 1; // Question ID
      const answers = sampleAnswers[qId];
      const answerText = faker.helpers.arrayElement(answers);
      answersSql += `INSERT INTO answers (user_id, question_id, answer_text) VALUES (${i}, ${qId}, '${answerText.replace(
        /'/g,
        "''"
      )}');\n`;
    });
  }
  return answersSql;
}

function generateQuestions(questionsTexts) {
  return (
    questionsTexts
      .map(
        (q) =>
          `INSERT INTO questions (question_text) VALUES ('${q.replace(
            /'/g,
            "''"
          )}');`
      )
      .join("\n") + "\n"
  );
}

const usersSql = generateUsers(200);
const questionsSql = generateQuestions(questionsTexts);
const answersSql = generateAnswers(200, questionsTexts);

fs.writeFileSync("dummy_data.sql", questionsSql + usersSql + answersSql);
