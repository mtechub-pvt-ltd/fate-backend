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

const usersignup = async (req, res) => {
  const { email, password, device_id, role } = req.body;

  // Validate input
  if (!email || !password || !device_id || !role) {
    return res.status(400).json({
      error: true,
      msg: "Please provide email, password, device_id, and role.",
    });
  }

  if (role !== "user" && role !== "admin") {
    return res
      .status(400)
      .json({ error: true, msg: 'Role can only be "user" or "admin".' });
  }

  // Validate email format
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: true, msg: "Invalid email format." });
  }

  try {
    const emailExistsQuery = "SELECT COUNT(*) FROM Users WHERE email = $1";
    const emailExistsResult = await pool.query(emailExistsQuery, [email]);
    const emailExists = emailExistsResult.rows[0].count > 0;

    if (emailExists) {
      return res
        .status(400)
        .json({ error: true, msg: "Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUserQuery =
      "INSERT INTO Users (email, password, device_id, role, subscription_type) VALUES ($1, $2, $3, $4, $5) RETURNING *";
    const newUser = await pool.query(insertUserQuery, [
      email,
      hashedPassword,
      device_id,
      role,
      "silver",
    ]);

    // email template
    await sendConfirmationEmail.sendConfirmationEmail(email);

    res.status(201).json({
      msg: "Sign Up Successfull",
      error: false,
      data: newUser.rows[0],
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ error: "An error occurred during signup." });
  }
};

const usersignin = async (req, res) => {
  const { email, password, device_id } = req.body;

  // Validate input
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: true, msg: "Please provide email and password." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: true, msg: "Invalid email format." });
  }

  try {
    // Check if the email exists
    const userQuery = "SELECT * FROM Users WHERE email = $1";
    const userData = await pool.query(userQuery, [email]);

    if (userData.rows.length === 0) {
      return res.status(404).json({ error: true, msg: "Email is incorrect." });
    }

    const user = userData.rows[0];

    // Verify the password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ error: true, msg: "Password is incorrect." });
    }

    let updatedDeviceId = user.device_id;

    // Update device_id if a new one is provided
    if (device_id && device_id !== user.device_id) {
      const updateDeviceQuery =
        "UPDATE Users SET device_id = $1 WHERE email = $2 RETURNING device_id";
      const updatedDevice = await pool.query(updateDeviceQuery, [
        device_id,
        email,
      ]);
      updatedDeviceId = updatedDevice.rows[0].device_id; // Fetch the updated device_id
    }

    const token = jwt.sign({ email: user.email, role: user.role }, secretkey, {
      expiresIn: "1h",
    });

    loginToken = token;
    console.log(loginToken);
    // Extract expiry time from token (for demonstration purposes)
    const decodedToken = jwt.verify(token, secretkey);
    const currentTime = Math.floor(Date.now() / 1000); // Current time in UNIX timestamp format
    const remainingSeconds = decodedToken.exp - currentTime;

    const remainingMinutes = Math.floor(remainingSeconds / 60); // Remaining time in minutes
    const remainingHours = Math.floor(remainingSeconds / 3600); // Remaining time in hours

    // Return user data with the updated device_id and token expiry time in minutes and hours
    res.status(200).json({
      msg: "Sign in successful",
      error: false,
      data: {
        ...user, // Include existing user data
        device_id: updatedDeviceId, // Include updated device_id
      },
      token: token,
      // expiresInSeconds: remainingSeconds, // Include token expiry time in seconds (optional)
      // expiresInMinutes: remainingMinutes, // Include token expiry time in minutes
      expirytime: `${remainingHours} hour`,
    });
  } catch (error) {
    console.error("Error during signin:", error);
    res
      .status(500)
      .json({ error: true, msg: "An error occurred during signin." });
  }
};

const getallusers = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || null; // Set limit to null if not provided
    const offset = (page - 1) * limit;

    let allUsersQuery = `
            SELECT U.*, UL.latitude, UL.longitude, UL.complete_address
            FROM Users U
            LEFT JOIN users_location UL ON U.id = UL.user_id
            WHERE U.deleted_status != true
            AND U.role = 'user'
            ORDER BY U.created_at DESC
        `;

    const queryParams = [];

    // Check if pagination parameters are provided
    if (page && limit) {
      allUsersQuery += " LIMIT $1 OFFSET $2";
      queryParams.push(limit, offset);
    }

    const allUsersData = await pool.query(allUsersQuery, queryParams);

    // Map the results to handle null locations
    const usersWithLocations = allUsersData.rows.map((user) => {
      if (
        user.latitude === null &&
        user.longitude === null &&
        user.complete_address === null
      ) {
        // If no location exists, set location as null in response
        return {
          ...user,
          location: null,
        };
      }
      // If location exists, include it in the response as a single object
      return {
        ...user,
        location: {
          latitude: user.latitude,
          longitude: user.longitude,
          complete_address: user.complete_address,
        },
      };
    });

    // Remove longitude and latitude from the response
    const usersWithoutLonLat = usersWithLocations.map(
      ({ latitude, longitude, ...rest }) => rest
    );

    res.status(200).json({
      error: false,
      count: usersWithoutLonLat.length,
      data: usersWithoutLonLat,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ error: true, msg: "An error occurred while fetching users." });
  }
};

const getRandomUsers = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Fetch 8 users with the highest alo_level excluding the provided userId
    const query = `
          SELECT * FROM Users
          WHERE id != $1
          ORDER BY alo_level DESC
          LIMIT 8;
        `;

    const { rows } = await pool.query(query, [userId]);

    // Calculate similarity scores for random users
    const users = await calculateSimilarity(userId, rows);

    // Send the response with the calculated users
    res.json({
      error: false,
      count: users.length,
      msg: "Top users fetched",
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: true, msg: "Internal server error" });
  }
};

function calculateJaccardSimilarity(set1, set2) {
  const set1Tokens = new Set(set1.split(" "));
  const set2Tokens = new Set(set2.split(" "));

  const intersection = new Set(
    [...set1Tokens].filter((token) => set2Tokens.has(token))
  );
  const union = new Set([...set1Tokens, ...set2Tokens]);

  const similarity = intersection.size / union.size;
  return similarity;
}

async function calculateSimilarity(userId, randomUsers) {
  const subscriptionQuery = `
    SELECT subscription_type FROM users WHERE id = $1;
`;
  const subscriptionResult = await pool.query(subscriptionQuery, [userId]);
  const subscriptionType = subscriptionResult.rows[0].subscription_type;

  const similarityScores = [];

  for (let i = 0; i < randomUsers.length; i++) {
    let totalScore = 0;

    // Fetch answers of the provided user
    const userAnswersQuery = `
        SELECT * FROM answers
        WHERE user_id = $1;
    `;
    const userAnswersResult = await pool.query(userAnswersQuery, [userId]);
    const userAnswers = userAnswersResult.rows;

    // Fetch answers of the current random user
    const randomUserAnswersQuery = `
        SELECT * FROM answers
        WHERE user_id = $1;
    `;
    const randomUserAnswersResult = await pool.query(randomUserAnswersQuery, [
      randomUsers[i].id,
    ]);
    const randomUserAnswers = randomUserAnswersResult.rows;

    // Calculate similarity score for each question
    for (const userAnswer of userAnswers) {
      const correspondingAnswer = randomUserAnswers.find(
        (answer) => answer.question_id === userAnswer.question_id
      );
      if (correspondingAnswer) {
        // Calculate Jaccard similarity between userAnswer.answers and correspondingAnswer.answers
        const similarityScore = calculateJaccardSimilarity(
          userAnswer.answers,
          correspondingAnswer.answers
        );
        totalScore += similarityScore;
      }
    }

    similarityScores.push({
      user: randomUsers[i],
      similarityScore: totalScore * 100,
    });
  }

  // Sort users based on their similarity scores in descending order
  similarityScores.sort((a, b) => b.similarityScore - a.similarityScore);

  // Assign card types based on sorted similarity scores and subscription type
  const cardTypes = [];
  for (let index = 0; index < similarityScores.length; index++) {
    let cardType = "";

    // Logic to assign card type based on index and subscription type
    if (subscriptionType === "bronze" || subscriptionType === "gold") {
      if (index === 0) {
        cardType = "fate";
      } else if (index === 1) {
        if (similarityScores[index].user.gender === "MALE") {
          cardType = "king";
        } else if (similarityScores[index].user.gender === "FEMALE") {
          cardType = "queen";
        }
      } else if (index === 2) {
        cardType = "10";
      } else if (index === 3) {
        cardType = "9";
      } else if (index === 4) {
        cardType = "anom";
      } else if (index === 5) {
        cardType = "extra1";
      } else if (index === 6) {
        cardType = "extra2";
      } else if (index === 7) {
        cardType = "joker";
      }
    } else if (subscriptionType === "silver") {
      if (index === 0) {
        cardType = "fate";
      } else if (index === 1) {
        if (similarityScores[index].user.gender === "MALE") {
          cardType = "king";
        } else if (similarityScores[index].user.gender === "FEMALE") {
          cardType = "queen";
        }
      } else if (index === 2) {
        cardType = "10";
      } else if (index === 3) {
        cardType = "9";
      } else if (index === 4) {
        cardType = "anom";
      } else if (index === 5) {
        cardType = "joker";
      }
    }

    cardTypes.push({
      user: similarityScores[index].user,
      similarityScore: similarityScores[index].similarityScore,
      card_type: cardType,
    });
  }

  // Return only the required number of users based on the subscription type
  if (subscriptionType === "bronze" || subscriptionType === "gold") {
    return cardTypes.slice(0, 8);
  } else if (subscriptionType === "silver") {
    return cardTypes.slice(0, 6);
  }
}

const getuserbyID = async (req, res) => {
  try {
    const { id } = req.params;

    if (id) {
      const userQuery = `
                SELECT U.*, UL.latitude, UL.longitude, UL.complete_address
                FROM Users U
                LEFT JOIN users_location UL ON U.id = UL.user_id
                WHERE U.id = $1 AND U.deleted_status!=true AND U.role = 'user';`; // Add condition to filter by role 'user'
      const userData = await pool.query(userQuery, [id]);

      if (userData.rows.length === 0) {
        return res.status(404).json({ error: true, msg: "User not found." });
      }

      // Prepare response by combining latitude and longitude into a single location object
      const user = userData.rows[0];
      if (
        user.latitude === null &&
        user.longitude === null &&
        user.complete_address === null
      ) {
        // If no location exists, set location as null in response
        delete user.latitude;
        delete user.longitude;
        delete user.complete_address;
        user.location = null;
      } else {
        // If location exists, include it in the response as a single object
        user.location = {
          latitude: user.latitude,
          longitude: user.longitude,
          complete_address: user.complete_address,
        };
        delete user.latitude;
        delete user.longitude;
        delete user.complete_address;
      }

      return res.status(200).json({
        error: false,
        data: user,
      });
    }

    // The rest of your code remains unchanged for listing users.
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ error: true, msg: "An error occurred while fetching users." });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    // Check for allowed roles (admin or user)
    if (role !== "admin" && role !== "user") {
      return res.status(400).json({
        error: true,
        msg: "Invalid role. Please provide admin or user.",
      });
    }

    // Check if email exists in your database
    const emailExistsQuery = "SELECT * FROM Users WHERE email = $1";
    const emailExistsResult = await pool.query(emailExistsQuery, [email]);

    if (emailExistsResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "Email not found for the given role." });
    }

    const user = emailExistsResult.rows[0]; // Fetch user details
    const otp = Math.floor(1000 + Math.random() * 9000); // Generate OTP
    storeotp = otp;

    // email template
    await OTPVerificationEmail.OTPVerificationEmail(email, otp);

    return res
      .status(200)
      .json({ error: false, msg: "OTP sent to email.", user, otp: otp });
  } catch (error) {
    console.error("Error in forget password:", error);
    res
      .status(500)
      .json({ error: true, msg: "An error occurred in forget password." });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp, role } = req.body;

    // Check for allowed roles (admin or user)
    if (role !== "admin" && role !== "user") {
      return res.status(400).json({
        error: true,
        msg: "Invalid role. Please provide admin or user.",
      });
    }

    const emailExistsQuery = "SELECT * FROM Users WHERE email = $1";
    const emailExistsResult = await pool.query(emailExistsQuery, [email]);

    if (emailExistsResult.rows.length === 0) {
      return res.status(404).json({ error: true, msg: "Email not found." });
    }

    console.log("otp", otp);
    console.log("storeotp", storeotp);

    if (storeotp != otp) {
      return res.status(401).json({ error: true, msg: "Invalid OTP" });
    }

    return res
      .status(200)
      .json({ error: false, msg: "OTP verified successfully." });
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res
      .status(500)
      .json({ error: true, msg: "An error occurred in OTP verification." });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Check for allowed roles (admin or user)
    if (role !== "admin" && role !== "user") {
      return res.status(400).json({
        error: true,
        msg: "Invalid role. Please provide admin or user.",
      });
    }

    const emailExistsQuery = "SELECT * FROM Users WHERE email = $1";
    const emailExistsResult = await pool.query(emailExistsQuery, [email]);

    if (emailExistsResult.rows.length === 0) {
      return res.status(404).json({ error: true, msg: "Email not found." });
    }

    // Assuming the password is hashed before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10);

    const updatePasswordQuery =
      "UPDATE Users SET password = $1 WHERE email = $2";
    await pool.query(updatePasswordQuery, [hashedPassword, email]);

    // Fetch user details after updating password
    const userDetailsQuery = "SELECT * FROM Users WHERE email = $1";
    const userDetailsResult = await pool.query(userDetailsQuery, [email]);

    if (userDetailsResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "User details not found." });
    }

    const data = userDetailsResult.rows[0]; // User details after password update

    return res
      .status(200)
      .json({ error: false, msg: "Password updated successfully.", data });
  } catch (error) {
    console.error("Error in updating password:", error);
    res
      .status(500)
      .json({ error: true, msg: "An error occurred in updating password." });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, age, gender, images, profile_image } = req.body;

    // Check if the user exists
    const userQuery = "SELECT * FROM Users WHERE id = $1";
    const user = await pool.query(userQuery, [userId]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: true, msg: "User not found" });
    }
    // UPDATE Users
    // SET profile_image = 'new_profile_image_url'
    // Construct the base update query
    let updateQuery = "UPDATE Users SET ";

    const queryParams = [];
    const queryValues = [];

    // Check and add parameters for updating
    if (name !== undefined) {
      queryParams.push("name = $1");
      queryValues.push(name);
    }

    if (age !== undefined) {
      queryParams.push("age = $" + (queryParams.length + 1));
      queryValues.push(age);
    }

    if (gender !== undefined) {
      queryParams.push("gender = $" + (queryParams.length + 1));
      queryValues.push(gender);
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res
          .status(400)
          .json({ error: true, msg: "Images should be an array" });
      }

      if (images.length === 0 || images.length > 9) {
        return res
          .status(400)
          .json({ error: true, msg: "Images should be between 1 and 9" });
      }

      queryParams.push("images = $" + (queryParams.length + 1));
      queryValues.push(JSON.stringify(images));
    }

    if (profile_image !== undefined) {
      queryParams.push("profile_image = $" + (queryParams.length + 1));
      queryValues.push(profile_image);
    }

    if (queryParams.length === 0) {
      return res
        .status(400)
        .json({ error: true, msg: "No valid data provided for update" });
    }

    // Construct the final query
    updateQuery +=
      queryParams.join(", ") +
      ", updated_at = NOW() WHERE id = $" +
      (queryParams.length + 1);
    queryValues.push(userId);

    // Execute the update query
    const result = await pool.query(updateQuery, queryValues);

    // Check the result and send the appropriate response
    if (result.rowCount === 1) {
      // Fetch the updated user details
      const updatedUserQuery = "SELECT * FROM Users WHERE id = $1";
      const updatedUser = await pool.query(updatedUserQuery, [userId]);
      const updatedUserData = updatedUser.rows[0];
      res.status(200).json({
        error: false,
        msg: "User profile updated successfully",
        user: updatedUserData,
      });
    } else {
      res
        .status(500)
        .json({ error: true, msg: "Failed to update user profile" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, msg: "Internal server error" });
  }
};

const createUserLocation = async (req, res) => {
  const { user_id, latitude, longitude, complete_address } = req.body;

  if (!user_id || !latitude || !longitude || !complete_address) {
    return res
      .status(400)
      .json({ error: "Please provide all required fields." });
  }

  try {
    // Check if the user exists
    const userExistsQuery = "SELECT * FROM Users WHERE id = $1";
    const userExistsResult = await pool.query(userExistsQuery, [user_id]);
    const user = userExistsResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: true, msg: "User not found." });
    }

    // Check if the user already has a location entry
    const userLocationQuery = "SELECT * FROM users_location WHERE user_id = $1";
    const userLocationResult = await pool.query(userLocationQuery, [user_id]);
    const userLocation = userLocationResult.rows[0];

    if (userLocation) {
      // Update user's current location in the database
      const updateLocationQuery =
        "UPDATE users_location SET latitude = $1, longitude = $2, complete_address = $3, updated_at = NOW() WHERE user_id = $4 RETURNING *";
      const updatedLocation = await pool.query(updateLocationQuery, [
        latitude,
        longitude,
        complete_address,
        user_id,
      ]);

      res.status(200).json({
        error: false,
        msg: "Location added successfully",
        location: updatedLocation.rows[0],
      });
    } else {
      // If the user doesn't have a location entry, insert a new one
      const insertLocationQuery =
        "INSERT INTO users_location (user_id, latitude, longitude, complete_address) VALUES ($1, $2, $3, $4) RETURNING *";
      const newLocation = await pool.query(insertLocationQuery, [
        user_id,
        latitude,
        longitude,
        complete_address,
      ]);

      res.status(201).json({
        error: false,
        msg: "Location added successfully",
        location: newLocation.rows[0],
      });
    }
  } catch (error) {
    console.error("Error in adding user location:", error);
    res.status(500).json({
      error: true,
      msg: "An error occurred while updating/adding user location.",
    });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.params.id; // Assuming the user ID is passed in the request parameters

  try {
    // Check if the user exists
    const userExistsQuery = "SELECT COUNT(*) FROM Users WHERE id = $1";
    const userExistsResult = await pool.query(userExistsQuery, [userId]);
    const userExists = userExistsResult.rows[0].count > 0;

    if (!userExists) {
      return res.status(404).json({ error: true, msg: "User not found." });
    }

    // Delete associated records from other tables
    const deleteUserLocationQuery =
      "DELETE FROM users_location WHERE user_id = $1";
    await pool.query(deleteUserLocationQuery, [userId]);

    const deleteUserAnswersQuery = "DELETE FROM answers WHERE user_id = $1";
    await pool.query(deleteUserAnswersQuery, [userId]);

    const deleteUserImagesQuery = "DELETE FROM images WHERE user_id = $1";
    await pool.query(deleteUserImagesQuery, [userId]);

    // Delete user from Users table
    const deleteUserQuery = "DELETE FROM Users WHERE id = $1 RETURNING *";
    const deletedUser = await pool.query(deleteUserQuery, [userId]);

    res.status(200).json({
      msg: "User deleted successfully.",
      error: false,
      data: deletedUser.rows[0],
    });
  } catch (error) {
    console.error("Error during user deletion:", error);
    res.status(500).json({ error: "An error occurred during user deletion." });
  }
};

const deleteuserTemporarily = async (req, res) => {
  const userId = req.params.id;

  try {
    // Check if the user with the provided ID exists
    const userExists = await pool.query("SELECT * FROM Users WHERE id = $1", [
      userId,
    ]);

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: true, msg: "User not found" });
    }

    // Update the user's deleted_status to true and set deleted_at timestamp
    const result = await pool.query(
      "UPDATE Users SET deleted_status = true, deleted_at = NOW() WHERE id = $1 RETURNING *",
      [userId]
    );

    const deletedUser = result.rows[0];
    res.status(200).json({
      error: false,
      msg: "User deleted successfully",
      data: deletedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, msg: "Internal server error" });
  }
};

const getalldeletedusers = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || null;
    const offset = (page - 1) * limit;

    // Fetch users with deleted_status=true and deleted_at not null
    let fetchQuery = `
            SELECT U.*, UL.latitude, UL.longitude, UL.complete_address
            FROM Users U
            LEFT JOIN users_location UL ON U.id = UL.user_id
            WHERE U.deleted_status = true AND U.deleted_at IS NOT NULL
            ORDER BY U.created_at DESC 
        `;

    const queryParams = [];

    if (limit && page) {
      fetchQuery += " LIMIT $1 OFFSET $2";
      queryParams.push(limit, offset);
    }

    const fetchResult = await pool.query(fetchQuery, queryParams);

    const deletedUsers = fetchResult.rows;

    // Calculate the date 90 days ago from the current date
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Check if any users need to be permanently deleted
    const usersToDelete = deletedUsers.filter(
      (user) => new Date(user.deleted_at) < ninetyDaysAgo
    );

    if (usersToDelete.length > 0) {
      // Delete users permanently
      const deleteQuery = `
                DELETE FROM Users
                WHERE id IN (${usersToDelete.map((user) => user.id).join(", ")})
                RETURNING *;
            `;

      const deleteResult = await pool.query(deleteQuery);
      const permanentlyDeletedUsers = deleteResult.rows;

      return res.status(200).json({
        msg: "Deleted users fetched",
        error: false,
        count: permanentlyDeletedUsers.length,
        data: permanentlyDeletedUsers,
      });
    } else {
      // Calculate days left for each user until 90 days complete
      const currentDate = new Date();
      const usersWithDaysLeft = deletedUsers.map((user) => {
        const deletedDate = new Date(user.deleted_at);
        const timeDifference = currentDate.getTime() - deletedDate.getTime(); // Difference in milliseconds
        const daysPassed = Math.ceil(timeDifference / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

        let daysLeft = 90 - daysPassed;
        daysLeft = daysLeft > 0 ? daysLeft : 0; // Ensuring non-negative days left
        return {
          ...user,
          daysLeft: daysLeft,
        };
      });

      return res.status(200).json({
        msg: "Deleted users fetched",
        error: false,
        count: usersWithDaysLeft.length,
        data: usersWithDaysLeft,
      });
    }
  } catch (error) {
    console.error("Error fetching and deleting users:", error);
    res.status(500).json({ msg: "Internal server error", error: true });
  }
};

const updateUserBlockStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { block_status } = req.body;

    // Validate input
    if (block_status === undefined || block_status === null) {
      return res
        .status(400)
        .json({ error: true, msg: "Please provide the block_status value." });
    }

    // Update user block_status in the database
    const updateQuery = `
            UPDATE Users
            SET block_status = $1
            WHERE id = $2
            RETURNING *;
        `;

    const updateResult = await pool.query(updateQuery, [block_status, id]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: true, msg: "User not found." });
    }

    const updatedUser = updateResult.rows[0];

    res.status(200).json({
      error: false,
      msg: "User status updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user block_status:", error);
    res.status(500).json({
      error: true,
      msg: "An error occurred while updating user block_status.",
    });
  }
};

const updateProfileCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_profile_completed } = req.body;

    // Validate input
    if (is_profile_completed === undefined || is_profile_completed === null) {
      return res
        .status(400)
        .json({ error: true, msg: "Please provide the is_profile_completed." });
    }

    // Update user block_status in the database
    const updateQuery = `
            UPDATE Users
            SET is_profile_completed = $1
            WHERE id = $2
            RETURNING *;
        `;

    const updateResult = await pool.query(updateQuery, [
      is_profile_completed,
      id,
    ]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: true, msg: "User not found." });
    }

    const updatedUser = updateResult.rows[0];

    res.status(200).json({
      error: false,
      msg: "User profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      error: true,
      msg: "An error occurred while updating user block_status.",
    });
  }
};

const searchUserByName = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ error: true, msg: "Name parameter is required" });
    }

    const query = `
          SELECT u.*, ul.latitude, ul.longitude, ul.complete_address
          FROM Users u
          LEFT JOIN users_location ul ON u.id = ul.user_id
          WHERE u.name ILIKE $1
          AND u.deleted_status = false
          AND u.block_status = false;
        `;

    const result = await pool.query(query, [`%${name}%`]);

    res.json({ error: false, msg: "User fetched", data: result.rows });
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).json({ error: true, msg: "Internal Server Error" });
  }
};

const updateUserOnlineStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { online_status } = req.body;

    // Validate input
    if (online_status === undefined || online_status === null) {
      return res
        .status(400)
        .json({ error: true, msg: "Please provide the online_status value." });
    }

    // Update user online_status in the database
    const updateQuery = `
            UPDATE Users
            SET online_status = $1
            WHERE id = $2
            RETURNING *;
        `;

    const updateResult = await pool.query(updateQuery, [online_status, id]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: true, msg: "User not found." });
    }

    const updatedUser = updateResult.rows[0];

    res.status(200).json({
      error: false,
      msg: "User online status updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user online_status:", error);
    res.status(500).json({
      error: true,
      msg: "An error occurred while updating user online_status.",
    });
  }
};
// const usamaController = async (req, res) => {
//   const fillerWords = new Set([
//     "a",
//     "about",
//     "above",
//     "after",
//     "again",
//     "against",
//     "all",
//     "am",
//     "an",
//     "and",
//     "any",
//     "are",
//     "as",
//     "at",
//     "be",
//     "because",
//     "been",
//     "before",
//     "being",
//     "below",
//     "between",
//     "both",
//     "but",
//     "by",
//     "could",
//     "did",
//     "do",
//     "does",
//     "doing",
//     "down",
//     "during",
//     "each",
//     "few",
//     "for",
//     "from",
//     "further",
//     "had",
//     "has",
//     "have",
//     "having",
//     "he",
//     "her",
//     "here",
//     "hers",
//     "herself",
//     "him",
//     "himself",
//     "his",
//     "how",
//     "i",
//     "if",
//     "in",
//     "into",
//     "is",
//     "it",
//     "its",
//     "itself",
//     "just",
//     "me",
//     "more",
//     "most",
//     "my",
//     "myself",
//     "no",
//     "nor",
//     "not",
//     "of",
//     "off",
//     "on",
//     "once",
//     "only",
//     "or",
//     "other",
//     "our",
//     "ours",
//     "ourselves",
//     "out",
//     "over",
//     "own",
//     "same",
//     "she",
//     "should",
//     "so",
//     "some",
//     "such",
//     "than",
//     "that",
//     "the",
//     "their",
//     "theirs",
//     "them",
//     "themselves",
//     "then",
//     "there",
//     "these",
//     "they",
//     "this",
//     "those",
//     "through",
//     "to",
//     "too",
//     "under",
//     "until",
//     "up",
//     "very",
//     "was",
//     "we",
//     "were",
//     "what",
//     "when",
//     "where",
//     "which",
//     "while",
//     "who",
//     "whom",
//     "why",
//     "will",
//     "with",
//     "would",
//     "you",
//     "your",
//     "yours",
//     "yourself",
//     "yourselves",
//   ]);

//   function tokenizeAndStem(text) {
//     let tokens = tokenizer.tokenize(text);
//     let stems = tokens.map((token) => stemmer.stem(token.toLowerCase()));
//     return stems;
//   }

//   function calculateCompatibilityScore(currentUserAnswers, otherUserAnswers) {
//     // Tokenize and stem both users' answers
//     let currentUserStems = currentUserAnswers.map((answer) =>
//       tokenizeAndStem(answer)
//     );
//     let otherUserStems = otherUserAnswers.map((answer) =>
//       tokenizeAndStem(answer)
//     );

//     // Calculate the compatibility score by comparing the stems
//     let score = 0;
//     currentUserStems.forEach((currentUserAnswerStems, index) => {
//       const commonStems = currentUserAnswerStems.filter((stem) =>
//         otherUserStems[index].includes(stem)
//       );
//       // Each common stem adds 0.1 to the score for the particular question
//       score += commonStems.length * 0.1;
//     });

//     return score;
//   }

//     try {
//       const { gender, current_user_id } = req.query;
//       const x = gender === "MALE" ? 5 : 7;
//       // current user details
//       const currentUser = `SELECT *
//         FROM users
//         WHERE id = $1`;

//       const currentUserResult = await pool.query(currentUser, [current_user_id]);
//       const questionsQueryUser = `SELECT * FROM questions JOIN answers ON questions.id = answers.question_id WHERE answers.user_id = $1`;
//       const questionsResultUser = await pool.query(questionsQueryUser, [
//         current_user_id,
//       ]);

//       // fetch all user
//       const fetchUser = `SELECT *
//         FROM users
//         WHERE gender = $1 AND id != $3
//         ORDER BY  RANDOM(),alo_level DESC
//         LIMIT $2`;

//       const fetchResult = await pool.query(fetchUser, [
//         gender,
//         x,
//         current_user_id,
//       ]);

//       const data = await Promise.all(
//         fetchResult.rows.map(async (user) => {
//           const questionsQuery = `SELECT * FROM questions JOIN answers ON questions.id = answers.question_id WHERE answers.user_id = $1`;
//           const questionsResult = await pool.query(questionsQuery, [user.id]);

//           return {
//             user_id: user.id,
//             elo_level: user.alo_level,
//             name: user.name,
//             email: user.email,
//             questions: questionsResult.rows,
//           };
//         })
//       );

//       res.status(200).json({
//         error: false,
//         msg: "Top users fetched",
//         gender: gender,
//         current_user_id: parseInt(current_user_id),
//         current_user_details: currentUserResult.rows[0],
//         current_user_answers: questionsResultUser.rows,
//         other_user_details: data,
//       });
//     } catch (error) {
//       console.error("Error fetching users:", error);
//       res.status(500).json({
//         error: true,
//         msg: "Internal server error" + error,
//       });
//     }
// };

const fillerWords = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

// Function to tokenize, stem, and remove filler words
const processText = (text) => {
  let tokens = tokenizer.tokenize(text);
  tokens = tokens
    .map((token) => token.toLowerCase())
    .filter((token) => !fillerWords.has(token));
  let stems = tokens.map(stemmer.stem);
  return stems;
};

// Function to calculate compatibility score
const calculateCompatibilityScore = (currentUserAnswers, otherUserAnswers) => {
  let score = 0;
  currentUserAnswers.forEach((currentUserAnswer, index) => {
    const currentUserStems = processText(currentUserAnswer.answers);
    const otherUserStems = processText(otherUserAnswers[index].answers);
    const commonStems = currentUserStems.filter((stem) =>
      otherUserStems.includes(stem)
    );
    score += commonStems.length * 0.1; // Each common stem adds 0.1 to the score
  });
  return score;
};

const getMatchUsersController = async (req, res) => {
  try {
    // Extract parameters
    const { gender, current_user_id } = req.query;
    const x = gender.toUpperCase() === "MALE" ? 5 : 7;

    // Fetch current user details including Elo score
    const currentUserQuery = `SELECT * FROM users WHERE id = $1`;
    const currentUserResult = await pool.query(currentUserQuery, [
      current_user_id,
    ]);
    const currentUser = currentUserResult.rows[0];
    const currentUserElo = currentUser.alo_level; // Assuming 'alo_level' is the Elo score

    // Define Elo score range
    const eloRange = 5;
    const minElo = currentUserElo - eloRange;
    const maxElo = currentUserElo + eloRange;

    // Fetch current user answers
    const currentUserAnswersQuery = `SELECT * FROM answers WHERE user_id = $1`;
    const currentUserAnswersResult = await pool.query(currentUserAnswersQuery, [
      current_user_id,
    ]);
    const currentUserAnswers = currentUserAnswersResult.rows;

    // Fetch potential matches within the Elo score range
    const fetchMatchesQuery = `
        SELECT * FROM users
        WHERE gender = $1 AND id != $2 AND alo_level BETWEEN $4 AND $5
        ORDER BY RANDOM(), alo_level DESC
        LIMIT $3`;
    const matchesResult = await pool.query(fetchMatchesQuery, [
      gender,
      current_user_id,
      x,
      minElo,
      maxElo,
    ]);
    const matches = matchesResult.rows;

    // Calculate compatibility scores for each potential match
    const processedMatches = await Promise.all(
      matches.map(async (match) => {
        const matchAnswersQuery = `SELECT * FROM answers WHERE user_id = $1`;
        const matchAnswersResult = await pool.query(matchAnswersQuery, [
          match.id,
        ]);
        const matchAnswers = matchAnswersResult.rows;
        const compatibilityScore = calculateCompatibilityScore(
          currentUserAnswers,
          matchAnswers
        );

        return {
          user_id: match.id,
          elo_level: match.alo_level,
          name: match.name,
          email: match.email,
          compatibilityScore: compatibilityScore.toFixed(1), // Format score to one decimal place
        };
      })
    );

    // Sort matches by compatibility score in descending order
    processedMatches.sort(
      (a, b) => b.compatibilityScore - a.compatibilityScore
    );

    // Respond with the sorted matches and current user details
    res.status(200).json({
      error: false,
      msg: "Top users fetched",
      gender: gender,
      current_user_id: parseInt(current_user_id),
      currentUser: {
        id: currentUser.id,
        elo_level: currentUserElo,
        name: currentUser.name,
        email: currentUser.email,
      },
      matches: processedMatches.slice(0, x), // Take the top x matches
    });
  } catch (error) {
    console.error("Error in getMatchUsersController:", error);
    res.status(500).json({
      error: true,
      msg: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  usersignup,
  usersignin,
  getallusers,
  getRandomUsers,
  getuserbyID,
  forgetPassword,
  verifyOTP,
  updatePassword,
  updateProfile,
  createUserLocation,
  deleteUser,
  deleteuserTemporarily,
  getalldeletedusers,
  updateUserBlockStatus,
  updateProfileCompletion,
  searchUserByName,
  updateUserOnlineStatus,
  getMatchUsersController,
};
