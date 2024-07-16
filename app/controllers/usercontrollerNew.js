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
    console.log("Starting new user matching algorithm");

    const { new_user_id, preferred_gender } = req.query;
    const numberOfCards = 5;

    console.log(`Parameters - new_user_id: ${new_user_id}, preferred_gender: ${preferred_gender}`);

    // Fetch new user details including Elo score
    const newUserQuery = `SELECT * FROM users WHERE id = $1`;
    const newUserResult = await pool.query(newUserQuery, [new_user_id]);
    const newUser = newUserResult.rows[0];
    const newUserElo = newUser.alo_level;

    console.log(`New user Elo: ${newUserElo}`);

    // Define Elo score range
    const minElo = newUserElo - 2;
    const maxElo = newUserElo + 10;

    console.log(`Elo range - minElo: ${minElo}, maxElo: ${maxElo}`);

    // Fetch new user answers
    const newUserAnswersQuery = `SELECT * FROM answers WHERE user_id = $1`;
    const newUserAnswersResult = await pool.query(newUserAnswersQuery, [new_user_id]);
    const newUserAnswers = newUserAnswersResult.rows;

    if (!newUserAnswers || newUserAnswers.length === 0) {
      throw new Error("No answers found for the new user.");
    }

    console.log("Fetched new user answers");

    // Fetch existing matches from user logs
    const existingMatchesQuery = `
      SELECT ul.match_user_id as user_id, ul.compatibilityscore as compatibilityScore, u.alo_level, u.name, u.email, u.images, u.profile_image
      FROM user_logs ul
      JOIN users u ON ul.match_user_id = u.id
      WHERE ul.current_user_id = $1
      ORDER BY ul.compatibilityscore DESC
      LIMIT $2
    `;
    const existingMatchesResult = await pool.query(existingMatchesQuery, [new_user_id, numberOfCards]);
    const existingMatches = existingMatchesResult.rows;

    console.log(`Found ${existingMatches.length} existing matches in user logs`);

    // If there are already 5 or more matches in the logs, return them
    if (existingMatches.length >= numberOfCards) {
      console.log("Returning existing matches from user logs");
      return res.status(200).json({
        error: false,
        msg: "Top matches fetched from user logs",
        matches: existingMatches.slice(0, numberOfCards),
      });
    }

    // Fetch previously matched users to exclude them from the waiting pool query
    const previouslyMatchedUsersQuery = `
      SELECT match_user_id 
      FROM user_logs 
      WHERE current_user_id = $1
    `;
    const previouslyMatchedUsersResult = await pool.query(previouslyMatchedUsersQuery, [new_user_id]);
    const previouslyMatchedUserIds = previouslyMatchedUsersResult.rows.map(row => row.match_user_id);

    console.log(`Previously matched user IDs: ${previouslyMatchedUserIds}`);

    // Fetch blacklisted users to exclude them from the waiting pool query
    const blacklistedUsersQuery = `
      SELECT blacklisted_user_id 
      FROM user_blacklist 
      WHERE user_id = $1
    `;
    const blacklistedUsersResult = await pool.query(blacklistedUsersQuery, [new_user_id]);
    const blacklistedUserIds = blacklistedUsersResult.rows.map(row => row.blacklisted_user_id);

    console.log(`Blacklisted user IDs: ${blacklistedUserIds}`);

    // Combine previously matched and blacklisted users to exclude them from the waiting pool query
    const excludedUserIds = [...previouslyMatchedUserIds, ...blacklistedUserIds];

    // Fetch potential matches from the waiting pool, omitting existing matches and previously matched users
    const waitingPoolQuery = `
      SELECT u.*
      FROM waiting_pool wp
      JOIN users u ON wp.user_id = u.id
      WHERE u.gender = $1 AND u.alo_level BETWEEN $2 AND $3
      AND u.id != $4
      ${excludedUserIds.length > 0 ? `AND u.id NOT IN (${excludedUserIds.join(', ')})` : ''}
    `;
    const waitingPoolResult = await pool.query(waitingPoolQuery, [preferred_gender, minElo, maxElo, new_user_id]);
    let waitingPoolUsers = waitingPoolResult.rows;

    console.log(`Found ${waitingPoolUsers.length} potential matches in the waiting pool`);

    // Calculate compatibility scores for waiting pool users
    let processedMatches = await Promise.all(
      waitingPoolUsers.map(async (match) => {
        const matchAnswersQuery = `SELECT * FROM answers WHERE user_id = $1`;
        const matchAnswersResult = await pool.query(matchAnswersQuery, [match.id]);
        const matchAnswers = matchAnswersResult.rows;

        if (!matchAnswers || matchAnswers.length === 0) {
          throw new Error(`No answers found for the match user with ID ${match.id}.`);
        }

        const compatibilityScore = calculateCompatibilityScore(newUserAnswers, matchAnswers);
        // 3/5
        console.log(`Compatibility score between ${newUser.id} and ${match.id}: ${compatibilityScore}`);
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

    // Combine existing matches with new matches from the waiting pool
    const allMatches = [...existingMatches, ...processedMatches];
    // Sort all matches by compatibility score and take the top 5
    allMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    const topMatches = allMatches.slice(0, numberOfCards);

    // Blur the fifth match
    if (topMatches.length === 5) {
      topMatches[4].blurred = true;
    }

    // Assign joker card as per the joker card algorithm (dummy implementation here)
    const jokerCard = assignJokerCard(newUser);

    // Update waiting pool for other users
    const updateUserLogQueries = [];
    for (const match of topMatches) {
      // Update logs for the matched users
      updateUserLogQueries.push(
        pool.query(
          `INSERT INTO user_logs (current_user_id, match_user_id, compatibilityscore, role) VALUES ($1, $2, $3, 'matched') ON CONFLICT (current_user_id, match_user_id) DO NOTHING`,
          [new_user_id, match.user_id, match.compatibilityScore]
        ),
        pool.query(
          `INSERT INTO user_logs (current_user_id, match_user_id, compatibilityscore, role) VALUES ($1, $2, $3, 'matched') ON CONFLICT (current_user_id, match_user_id) DO NOTHING`,
          [match.user_id, new_user_id, match.compatibilityScore]
        )
      );

      // Check if the matched user has filled all their slots
      const filledSlotsQuery = `
        SELECT COUNT(*) AS filled_slots
        FROM user_logs
        WHERE current_user_id = $1 OR match_user_id = $1
      `;
      const filledSlotsResult = await pool.query(filledSlotsQuery, [match.user_id]);
      const filledSlots = filledSlotsResult.rows[0].filled_slots;

      if (filledSlots >= numberOfCards) {
        // Remove user from waiting pool if all slots are filled
        updateUserLogQueries.push(
          pool.query(
            `DELETE FROM waiting_pool WHERE user_id = $1`,
            [match.user_id]
          )
        );
      }
    }
    await Promise.all(updateUserLogQueries);

    console.log("Inserted matched users into user_logs and updated waiting pool");

    // Respond with the sorted matches and joker card
    res.status(200).json({
      error: false,
      msg: "Top matches fetched for new user",
      matches: topMatches,
      jokerCard: jokerCard,
      waitingForMoreMatches: numberOfCards - topMatches.length,
    });
  } catch (error) {
    console.error("Error in newUserMatchingAlgo:", error);
    res.status(500).json({
      error: true,
      msg: "Internal server error",
      details: error.message,
    });
  }
};


// Dummy implementation for joker card assignment
const assignJokerCard = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'joker',
  };
};

module.exports = {
  newMatchAlgo2,
};
