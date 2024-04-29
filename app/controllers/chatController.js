const pool = require("../config/dbconfig")

// Function to fetch user details along with location
const getUserDetailsWithLocation = async (userId) => {
    const userDetailsQuery = `
        SELECT Users.*, users_location.latitude, users_location.longitude, users_location.complete_address
        FROM Users
        LEFT JOIN users_location ON Users.id = users_location.user_id
        WHERE Users.id = $1;
    `;
    const userDetailsResult = await pool.query(userDetailsQuery, [userId]);

    return userDetailsResult.rows[0];
};

const createchat = async (req, res) => {
    const { user_id_1, user_id_2 } = req.body;

    // Check if both users exist in the Users table
    const userExistsQuery = 'SELECT COUNT(*) FROM Users WHERE id IN ($1, $2)';
    const userExistsValues = [user_id_1, user_id_2];

    try {
        const userExistsResult = await pool.query(userExistsQuery, userExistsValues);
        const userExistsCount = parseInt(userExistsResult.rows[0].count);

        if (userExistsCount !== 2) {
            return res.status(404).json({ error: false, msg: 'User not found' });
        }

        // Check if the connection already exists
        const connectionExistsQuery = 'SELECT COUNT(*) FROM connections WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)';
        const connectionExistsValues = [user_id_1, user_id_2];

        const connectionExistsResult = await pool.query(connectionExistsQuery, connectionExistsValues);
        const connectionExistsCount = parseInt(connectionExistsResult.rows[0].count);

        if (connectionExistsCount > 0) {
            return res.status(400).json({ error: true, msg: 'Connection already exists' });
        }

        // Create the connection
        const createConnectionQuery =
            'INSERT INTO connections (user_id_1, user_id_2) VALUES ($1, $2) RETURNING *';

        const createConnectionValues = [user_id_1, user_id_2];

        const result = await pool.query(createConnectionQuery, createConnectionValues);

        // Fetch details of both users and their locations
        const user1Details = await getUserDetailsWithLocation(user_id_1);
        const user2Details = await getUserDetailsWithLocation(user_id_2);

        res.json({
            msg: "Connection Created Successfully",
            error: false,
            data: result.rows[0],
            user_1_details: user1Details,
            user_2_details: user2Details,
        });
    } catch (error) {
        console.error('Error creating connection:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

// async function fetchMatchingUsers(userId) {
//     const userDetailsQuery = `
//     SELECT Users.*, questions.question, answers.answers, images.url, users_location.latitude, users_location.longitude, users_location.complete_address
//     FROM Users
//     LEFT JOIN images ON Users.id = images.user_id
//     LEFT JOIN users_location ON Users.id = users_location.user_id
//     LEFT JOIN answers ON Users.id = answers.user_id
//     LEFT JOIN questions ON Users.id = answers.user_id
//     WHERE Users.id = $1;
// `;
//     const userDetailsResult = await pool.query(userDetailsQuery, [userId]);
//     return userDetailsResult.rows
// }

// // Example usage
// const userId = 26;
// fetchMatchingUsers(userId)
//     .then(result => {
//         console.log(result)
//     })
//     .catch(error => console.error(error));

module.exports = { createchat };