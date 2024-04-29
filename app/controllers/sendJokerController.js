const pool = require("../config/dbconfig")

const sendjoker = async (req, res) => {
    const { user_id, connection_id, joker_id } = req.body;

    try {
        // Check if the same joker already exists for the provided user and connection ID
        const existingJoker = await pool.query(
            'SELECT * FROM joker_card WHERE user_id = $1 AND connection_id = $2 AND joker_id = $3',
            [user_id, connection_id, joker_id]
        );

        if (existingJoker.rowCount > 0) {
            // The same joker already exists for the provided user and connection ID
            return res.status(400).json({ error: true, msg: 'The same joker already exists for the provided user and connection ID' });
        }

        // If no existing joker, proceed to insert
        const result = await pool.query(
            'INSERT INTO joker_card (user_id, connection_id, joker_id) VALUES ($1, $2, $3) RETURNING *',
            [user_id, connection_id, joker_id]
        );

        res.json({ msg: 'Joker send successfully', error: false, data: result.rows[0] });
    } catch (error) {
        console.error('Error adding joker to the database:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getJokerList = async (req, res) => {
    try {
        const allJokersWithDetails = await pool.query(`
            SELECT
                joker_card.id AS joker_id,
                joker_card.user_id,
                joker_card.connection_id,
                joker_card.joker_id AS joker_user_id,
                users.name AS user_name,
                users.email AS user_email,
                users.profile_image AS user_profile_image,
                connections.name AS connection_name,
                connections.email AS connection_email,
                connections.profile_image AS connection_profile_image,
                joker_user.name AS joker_user_name,
                joker_user.email AS joker_user_email,
                joker_user.profile_image AS joker_user_profile_image,
                joker_card.created_at,
                joker_card.updated_at
            FROM
                joker_card
            JOIN
                users ON joker_card.user_id = users.id
            JOIN
                users AS connections ON joker_card.connection_id = connections.id
            JOIN
                users AS joker_user ON joker_card.joker_id = joker_user.id
        `);

        res.json({ msg: 'All jokers with details fetched successfully', error: false, data: allJokersWithDetails.rows });
    } catch (error) {
        console.error('Error fetching all jokers with details from the database:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

const getUserJoker = async (req, res) => {
    const { userId } = req.params;

    try {
        const userJokersWithDetails = await pool.query(`
            SELECT
                joker_card.id AS joker_id,
                joker_card.user_id,
                joker_card.connection_id,
                joker_card.joker_id AS joker_user_id,
                users.name AS user_name,
                users.email AS user_email,
                users.profile_image AS user_profile_image,
                connections.name AS connection_name,
                connections.email AS connection_email,
                connections.profile_image AS connection_profile_image,
                joker_user.name AS joker_user_name,
                joker_user.email AS joker_user_email,
                joker_user.profile_image AS joker_user_profile_image,
                joker_card.created_at,
                joker_card.updated_at
            FROM
                joker_card
            JOIN
                users ON joker_card.user_id = users.id
            JOIN
                users AS connections ON joker_card.connection_id = connections.id
            JOIN
                users AS joker_user ON joker_card.joker_id = joker_user.id
            WHERE
                joker_card.user_id = $1
        `, [userId]);

        res.json({ msg: 'Jokers for the user fetched successfully', error: false, data: userJokersWithDetails.rows });
    } catch (error) {
        console.error('Error fetching jokers for the user from the database:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

module.exports = { sendjoker, getJokerList, getUserJoker };