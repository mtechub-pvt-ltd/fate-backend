const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../config/dbconfig");
const validator = require("validator");
const sendConfirmationEmail = require("../middleware/registrationSuccessfulTemplate");
const OTPVerificationEmail = require("../middleware/OTPVerificationTemplate");
const secretkey = "12345678";
const natural = require("natural");
const stemmer = natural.PorterStemmer;
const { JaroWinklerDistance } = require("natural");
const jaccard = require("jaccard");
const tokenizer = new natural.WordTokenizer();
const tf = require("@tensorflow/tfjs");
const use = require("@tensorflow-models/universal-sentence-encoder");

let loginToken;
let storeotp;

const fillerWords = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further",
  "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how",
  "i", "if", "in", "into", "is", "it", "its", "itself", "just",
  "me", "more", "most", "my", "myself",
  "no", "nor", "not",
  "of", "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own",
  "same", "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up",
  "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would",
  "you", "your", "yours", "yourself", "yourselves"
]);

const processText = (text) => {
  let tokens = tokenizer.tokenize(text);
  tokens = tokens.map((token) => token.toLowerCase()).filter((token) => !fillerWords.has(token));
  let stems = tokens.map(stemmer.stem);
  return stems;
};

const calculateCompatibilityScore = (currentUserAnswers, otherUserAnswers) => {
  let score = 0;
  currentUserAnswers.forEach((currentUserAnswer, index) => {
    const currentUserStems = processText(currentUserAnswer.answers);
    const otherUserStems = processText(otherUserAnswers[index].answers);
    const commonStems = currentUserStems.filter((stem) => otherUserStems.includes(stem));
    score += commonStems.length * 0.1;
  });
  return score / currentUserAnswers.length; // Normalized to be within [0, 1]
};

const newMatchAlgo2 = async (req, res) => {
  try {
    console.log("Starting new match algorithm");

    const { current_user_id, preferred_gender } = req.query;
    const numberOfCards = 5;

    console.log(`Parameters - current_user_id: ${current_user_id}, preferred_gender: ${preferred_gender}`);

    const currentUserQuery = `SELECT * FROM users WHERE id = $1`;
    const currentUserResult = await pool.query(currentUserQuery, [current_user_id]);
    const currentUser = currentUserResult.rows[0];
    const currentUserElo = currentUser.alo_level;

    console.log(`Current user Elo: ${currentUserElo}`);

    const minElo = currentUserElo - 10;
    const maxElo = currentUserElo + 10;

    console.log(`Elo range - minElo: ${minElo}, maxElo: ${maxElo}`);

    const currentUserAnswersQuery = `SELECT * FROM answers WHERE user_id = $1`;
    const currentUserAnswersResult = await pool.query(currentUserAnswersQuery, [current_user_id]);
    const currentUserAnswers = currentUserAnswersResult.rows;

    if (!currentUserAnswers || currentUserAnswers.length === 0) {
      throw new Error("No answers found for the current user.");
    }

    console.log("Fetched current user answers");

    const disqualifiedUsersQuery = `
      SELECT disqualify_user_id 
      FROM disqualify_user 
      WHERE user_id = $1 OR disqualify_user_id = $1
    `;
    const disqualifiedUsersResult = await pool.query(disqualifiedUsersQuery, [current_user_id]);
    const disqualifiedUsers = disqualifiedUsersResult.rows.map(row => row.disqualify_user_id);

    console.log(`Disqualified users: ${disqualifiedUsers}`);

    const matchedUsersQuery = `
      SELECT DISTINCT match_user_id 
      FROM user_logs 
      WHERE current_user_id != $1
    `;
    const matchedUsersResult = await pool.query(matchedUsersQuery, [current_user_id]);
    const matchedUsers = matchedUsersResult.rows.map(row => row.match_user_id);

    console.log(`Already matched users: ${matchedUsers}`);

    const excludedUsers = [...new Set([...disqualifiedUsers, ...matchedUsers])];

    let excludedUsersCondition = '';
    if (excludedUsers.length > 0) {
      excludedUsersCondition = `AND u.id NOT IN (${excludedUsers.join(', ')})`;
    }

    const existingMatchesQuery = `
      SELECT ul.match_user_id as user_id, ul.compatibilityscore as compatibilityScore, u.alo_level, u.name, u.email, u.images, u.profile_image
      FROM user_logs ul
      JOIN users u ON ul.match_user_id = u.id
      WHERE ul.current_user_id = $1
      ORDER BY ul.compatibilityscore DESC
      LIMIT $2
    `;
    const existingMatchesResult = await pool.query(existingMatchesQuery, [current_user_id, numberOfCards]);
    const existingMatches = existingMatchesResult.rows;

    console.log(`Found ${existingMatches.length} existing matches in user logs`);

    if (existingMatches.length >= numberOfCards) {
      console.log("Returning existing matches from user logs");
      return res.status(200).json({
        error: false,
        msg: "Top matches fetched from user logs",
        matches: existingMatches.slice(0, numberOfCards),
      });
    }

    const waitingPoolQuery = `
      SELECT u.*
      FROM waiting_pool wp
      JOIN users u ON wp.user_id = u.id
      WHERE u.id != $1 AND u.gender = $2 AND u.alo_level BETWEEN $3 AND $4 ${excludedUsersCondition}
    `;
    const waitingPoolResult = await pool.query(waitingPoolQuery, [current_user_id, preferred_gender, minElo, maxElo]);
    let waitingPoolUsers = waitingPoolResult.rows;
    console.log(`Found ${waitingPoolUsers.length} potential matches in the waiting pool`);

    let processedMatches = await Promise.all(
      waitingPoolUsers.map(async (match) => {
        const matchAnswersQuery = `SELECT * FROM answers WHERE user_id = $1`;
        const matchAnswersResult = await pool.query(matchAnswersQuery, [match.id]);
        const matchAnswers = matchAnswersResult.rows;

        if (!matchAnswers || matchAnswers.length === 0) {
          throw new Error(`No answers found for the match user with ID ${match.id}.`);
        }

        const compatibilityScore = calculateCompatibilityScore(currentUserAnswers, matchAnswers);
        console.log(`Compatibility score between ${currentUser.id} and ${match.id}: ${compatibilityScore}`);
        return {
          user_id: match.id,
          elo_level: match.alo_level,
          name: match.name,
          email: match.email,
          images: match.images,
          profile_image: match.profile_image,
          compatibilityScore: Math.min(1, compatibilityScore.toFixed(1)),
        };
      })
    );

    if (waitingPoolUsers.length < numberOfCards) {
      const additionalUsersQuery = `
        SELECT u.*
        FROM users u
        WHERE u.id NOT IN (
          SELECT wp.user_id FROM waiting_pool wp
        ) AND u.id != $1 AND u.gender = $2 AND u.alo_level BETWEEN $3 AND $4 ${excludedUsersCondition}
      `;
      const additionalUsersResult = await pool.query(additionalUsersQuery, [
        current_user_id,
        preferred_gender,
        minElo,
        maxElo
      ]);
      const additionalUsers = additionalUsersResult.rows;
      console.log(`Found ${additionalUsers.length} additional users from the users table`);

      const additionalProcessedMatches = await Promise.all(
        additionalUsers.map(async (match) => {
          const matchAnswersQuery = `SELECT * FROM answers WHERE user_id = $1`;
          const matchAnswersResult = await pool.query(matchAnswersQuery, [match.id]);
          const matchAnswers = matchAnswersResult.rows;

          if (!matchAnswers || matchAnswers.length === 0) {
            throw new Error(`No answers found for the match user with ID ${match.id}.`);
          }

          const compatibilityScore = calculateCompatibilityScore(currentUserAnswers, matchAnswers);
          console.log(`Compatibility score between ${current_user_id} and ${match.id}: ${compatibilityScore}`);
          return {
            user_id: match.id,
            elo_level: match.alo_level,
            name: match.name,
            email: match.email,
            images: match.images,
            profile_image: match.profile_image,
            compatibilityScore: Math.min(1, compatibilityScore.toFixed(1)),
          };
        })
      );

      const sortedAdditionalMatches = additionalProcessedMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
      const topAdditionalMatches = sortedAdditionalMatches.slice(0, numberOfCards - processedMatches.length);

      processedMatches = processedMatches.concat(topAdditionalMatches);
    }

    const combinedMatches = [...existingMatches, ...processedMatches].slice(0, numberOfCards);

    const userLogQueries = [];
    for (const match of combinedMatches) {
      userLogQueries.push(
        pool.query(
          `INSERT INTO user_logs (current_user_id, match_user_id, compatibilityscore, role) VALUES ($1, $2, $3, 'matched') ON CONFLICT (current_user_id, match_user_id) DO NOTHING`,
          [current_user_id, match.user_id, match.compatibilityScore]
        ),
        pool.query(
          `INSERT INTO user_logs (current_user_id, match_user_id, compatibilityscore, role) VALUES ($1, $2, $3, 'matched') ON CONFLICT (current_user_id, match_user_id) DO NOTHING`,
          [match.user_id, current_user_id, match.compatibilityScore]
        )
      );
    }
    await Promise.all(userLogQueries);
    console.log("Inserted matched users into user_logs");

    res.status(200).json({
      error: false,
      msg: "Top matches fetched",
      matches: combinedMatches.slice(0, numberOfCards).sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    });
  } catch (error) {
    console.error("Error in newMatchAlgo2:", error);
    res.status(500).json({
      error: true,
      msg: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  newMatchAlgo2,
};
