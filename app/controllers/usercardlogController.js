const pool = require("../config/dbconfig")

const getalluserlogs = async (req, res) => {

    // COUNT(DISTINCT lf.question_id) AS total_questions,
    //         COUNT(DISTINCT lf.answer_id) AS total_answers,
    //         COUNT(DISTINCT ul.id) AS total_locations,
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const query = `
        SELECT
            lf.login_user_id AS login_user_id,
            COUNT(lf.id) AS count, 
            json_agg(
                json_build_object( 
                    'user_id', lf.user_id,
                    'question_id', lf.question_id,
                    'answer_id', lf.answer_id,
                    'similarity', lf.similarity,
                    'date_fetched', lf.created_at,
                    'user_details', json_build_object( 
                        'id',u.id,
                        'images', u.images,
                        'profile_image', u.profile_image,
                        'name', u.name,
                        'email', u.email,
                        'password', u.password,
                        'device_id', u.device_id,
                        'gender', u.gender,
                        'age', u.age,
                        'role', u.role,
                        'latitude', ul.latitude,
                        'longitude', ul.longitude,
                        'complete_address', ul.complete_address,
                        'question', q.question,
                        'answers', a.answers
                    )
                )
            ) AS logs
        FROM user_fetch_log lf
        JOIN Users u ON lf.user_id = u.id
        LEFT JOIN Users login_user ON login_user.id = lf.login_user_id
        LEFT JOIN users_location ul ON ul.user_id = u.id
        LEFT JOIN questions q ON q.id = lf.question_id
        LEFT JOIN answers a ON a.id = lf.answer_id
        GROUP BY lf.login_user_id
        ORDER BY lf.login_user_id
        LIMIT $1 OFFSET $2;
    `;

        const result = await pool.query(query, [limit, offset]);

        res.status(200).json({ msg: "Logs Fetched successfully", error: false, data: result.rows });
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).send({ error: true, msg: 'Internal Server Error' });
    }
};

const getUserLogsByDate = async (req, res) => {
    try {
        const { date } = req.body;
        const formattedDate = new Date(date).toISOString(); // Assuming date is in YYYY-MM-DD format

        const query = `
            SELECT
                lf.login_user_id AS login_user_id,
                COUNT(lf.id) AS count, 
                json_agg(
                    json_build_object( 
                        'user_id', lf.user_id,
                        'question_id', lf.question_id,
                        'answer_id', lf.answer_id,
                        'similarity', lf.similarity,
                        'date_fetched', lf.created_at,
                        'user_details', json_build_object( 
                            'id',u.id,
                        'images', u.images,
                        'profile_image', u.profile_image,
                        'name', u.name,
                        'email', u.email,
                        'password', u.password,
                        'device_id', u.device_id,
                        'gender', u.gender,
                        'age', u.age,
                        'role', u.role,
                        'latitude', ul.latitude,
                        'longitude', ul.longitude,
                        'complete_address', ul.complete_address,
                        'question', q.question,
                        'answers', a.answers
                        )
                    )
                ) AS logs
            FROM user_fetch_log lf
            JOIN Users u ON lf.user_id = u.id
            LEFT JOIN Users login_user ON login_user.id = lf.login_user_id
            LEFT JOIN users_location ul ON ul.user_id = u.id
            LEFT JOIN questions q ON q.id = lf.question_id
            LEFT JOIN answers a ON a.id = lf.answer_id
            WHERE DATE(lf.created_at) = $1
            GROUP BY lf.login_user_id
            ORDER BY lf.login_user_id;
        `;

        const result = await pool.query(query, [formattedDate]);

        res.status(200).json({ msg: "Logs Fetched successfully", error: false, data: result.rows });
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).send({ error: true, msg: 'Internal Server Error' });
    }
};

const getUserLogs = async (req, res) => {
    try {
        const { login_user_id } = req.params;

        // Check if the login_user_id exists in the user_fetch_log table
        const userExistsQuery = 'SELECT COUNT(*) FROM user_fetch_log WHERE login_user_id = $1';
        const userExistsResult = await pool.query(userExistsQuery, [login_user_id]);

        const userExists = userExistsResult.rows[0].count > 0;

        if (!userExists) {
            return res.status(404).json({ msg: 'User not found', error: true });
        }

        // Fetch logs for the specified login_user_id
        const query = `
            SELECT
                lf.login_user_id AS login_user_id,
                lf.id AS log_id,
                lf.user_id,
                lf.question_id,
                lf.answer_id,
                lf.similarity,
                lf.created_at AS date_fetched,
                u.images,
                u.profile_image,
                u.name,
                u.email,
                u.password,
                u.device_id,
                u.gender,
                u.age,
                u.role,
                ul.latitude AS location_latitude,
                ul.longitude AS location_longitude,
                ul.complete_address AS location_complete_address,
                q.question AS question_details,
                a.answers AS answer_details
            FROM user_fetch_log lf
            JOIN Users u ON lf.user_id = u.id
            LEFT JOIN users_location ul ON ul.user_id = u.id
            LEFT JOIN questions q ON q.id = lf.question_id
            LEFT JOIN answers a ON a.id = lf.answer_id
            WHERE lf.login_user_id = $1
            ORDER BY lf.created_at;
        `;

        const result = await pool.query(query, [login_user_id]);

        res.status(200).json({ msg: "User logs fetched successfully", error: false, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).send({ error: true, msg: 'Internal Server Error' });
    }
};

const getUserLogsByDateAndId = async (req, res) => {
    try {
        const { login_user_id, date } = req.params;

        // Check if the login_user_id exists in the user_fetch_log table
        const userExistsQuery = 'SELECT COUNT(*) FROM user_fetch_log WHERE login_user_id = $1';
        const userExistsResult = await pool.query(userExistsQuery, [login_user_id]);

        const userExists = userExistsResult.rows[0].count > 0;

        if (!userExists) {
            return res.status(404).json({ msg: 'User not found in logs', error: true });
        }

        // Fetch logs for the specified login_user_id and date
        const formattedDate = new Date(date).toISOString(); // Assuming date is in YYYY-MM-DD format

        const query = `
            SELECT
                lf.login_user_id AS login_user_id,
                lf.id AS log_id,
                lf.user_id,
                lf.question_id,
                lf.answer_id,
                lf.similarity,
                lf.created_at AS date_fetched,
                u.images,
                u.profile_image,
                u.name,
                u.email,
                u.password,
                u.device_id,
                u.gender,
                u.age,
                u.role,
                ul.latitude AS location_latitude,
                ul.longitude AS location_longitude,
                ul.complete_address AS location_complete_address,
                q.question AS question_details,
                a.answers AS answer_details
            FROM user_fetch_log lf
            JOIN Users u ON lf.user_id = u.id
            LEFT JOIN users_location ul ON ul.user_id = u.id
            LEFT JOIN questions q ON q.id = lf.question_id
            LEFT JOIN answers a ON a.id = lf.answer_id
            WHERE lf.login_user_id = $1
            AND DATE(lf.created_at) = $2
            ORDER BY lf.created_at;
        `;

        const result = await pool.query(query, [login_user_id, formattedDate]);

        res.status(200).json({ msg: "User logs fetched successfully", error: false, data: result.rows });
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).send({ error: true, msg: 'Internal Server Error' });
    }
};

module.exports = { getalluserlogs, getUserLogsByDate, getUserLogs, getUserLogsByDateAndId };