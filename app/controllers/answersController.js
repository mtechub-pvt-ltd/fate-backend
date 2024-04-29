const pool = require("../config/dbconfig")

const createanswer = async (req, res) => {
    try {
        const { user_id, question_id, answer } = req.body;

        // Check if user_id, question_id, and answer are provided
        if (!user_id || !question_id || !answer) {
            return res.status(400).json({ error: true, msg: 'Please provide user_id, question_id, and answer.' });
        }

        // Check if the answer length is greater than 400 characters
        if (answer.length > 400) {
            return res.status(400).json({ error: true, msg: 'Answer should not exceed 400 characters.' });
        }

        // Check if the user exists
        const userQuery = `
            SELECT U.*, Q.question
            FROM Users U
            INNER JOIN questions Q ON U.id = $1 AND Q.id = $2
        `;
        const userData = await pool.query(userQuery, [user_id, question_id]);

        if (userData.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'User or Question not found.' });
        }

        // Add the answer to the answers table
        const insertAnswerQuery = `
            INSERT INTO answers (user_id, question_id, answers) VALUES ($1, $2, $3) RETURNING *
        `;
        const newAnswer = await pool.query(insertAnswerQuery, [user_id, question_id, answer]);

        res.status(201).json({
            error: false,
            msg: 'Answer added successfully',
            answer: {
                ...newAnswer.rows[0],
                user: userData.rows[0],
                question: userData.rows[0].question,
            },
        });
    } catch (error) {
        console.error('Error creating answer:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while creating the answer.' });
    }
};

const getAllAnswers = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM answers;
        `;

        const countResult = await pool.query(countQuery);
        const totalCount = parseInt(countResult.rows[0].total_count);

        const allAnswersQuery = `
            SELECT A.*, U.*, Q.question
            FROM answers A
            INNER JOIN users U ON A.user_id = U.id
            INNER JOIN questions Q ON A.question_id = Q.id
            ORDER BY A.user_id, A.created_at DESC
            LIMIT $1 OFFSET $2;
        `;

        const allAnswersData = await pool.query(allAnswersQuery, [limit, offset]);

        // Structure the data to group answers by user
        const answersByUser = {};
        allAnswersData.rows.forEach((row) => {
            const { user_id, question_id, answers, created_at, updated_at, ...userData } = row;

            if (!answersByUser[user_id]) {
                answersByUser[user_id] = {
                    user: userData,
                    answers: [],
                };
            }

            answersByUser[user_id].answers.push({
                id: question_id,
                answer: answers,
                created_at,
                updated_at,
                question: row.question,
            });
        });

        const formattedData = Object.values(answersByUser);

        res.status(200).json({
            error: false,
            count: totalCount,
            data: formattedData,
        });
    } catch (error) {
        console.error('Error fetching all answers:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while fetching the answers.' });
    }
};

const getUserAnswers = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Check if the user exists
        const userQuery = `
            SELECT *
            FROM users
            WHERE id = $1;
        `;
        const userData = await pool.query(userQuery, [user_id]);

        if (userData.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'User not found.' });
        }

        const user = userData.rows[0];

        const userAnswersQuery = `
            SELECT A.*, Q.question
            FROM answers A
            INNER JOIN questions Q ON A.question_id = Q.id
            WHERE A.user_id = $1;
        `;

        const userAnswersData = await pool.query(userAnswersQuery, [user_id]);

        // Check if the user has answers
        if (userAnswersData.rows.length === 0) {
            return res.status(200).json({ error: false, data: { user: null, answers: [] } });
        }

        const userWithAnswers = {
            user: user,
            answers: userAnswersData.rows.map((row) => ({
                id: row.question_id,
                question: row.question,
                answer: row.answers,
                created_at: row.created_at,
                updated_at: row.updated_at,
            })),
        };

        res.status(200).json({
            error: false,
            data: userWithAnswers,
        });
    } catch (error) {
        console.error('Error fetching user details with answers:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while fetching user details with answers.' });
    }
};

const updateAnswer = async (req, res) => {
    try {
        const { user_id, question_id, answer } = req.body;

        // Check if user_id, question_id, and answer are provided
        if (!user_id || !question_id || answer === undefined) {
            return res.status(400).json({ error: true, msg: 'Please provide user_id, question_id, and answer.' });
        }

        // Check if the answer length is greater than 400 characters
        if (answer.length > 400) {
            return res.status(400).json({ error: true, msg: 'Answer should not exceed 400 characters.' });
        }

        // Check if the user and question exist
        const userQuery = `
            SELECT U.*, Q.question
            FROM Users U
            INNER JOIN questions Q ON U.id = $1 AND Q.id = $2
        `;
        const userData = await pool.query(userQuery, [user_id, question_id]);

        if (userData.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'User or Question not found.' });
        }

        // Check if the answer to be updated exists
        const existingAnswerQuery = `
            SELECT *
            FROM answers
            WHERE user_id = $1 AND question_id = $2
        `;
        const existingAnswerData = await pool.query(existingAnswerQuery, [user_id, question_id]);

        if (existingAnswerData.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'Answer not found.' });
        }

        // Update the answer in the answers table
        const updateAnswerQuery = `
            UPDATE answers
            SET answers = $1
            WHERE user_id = $2 AND question_id = $3
            RETURNING *
        `;
        const updatedAnswer = await pool.query(updateAnswerQuery, [answer, user_id, question_id]);

        res.status(200).json({
            error: false,
            msg: 'Answer updated successfully',
            data: { question: userData.rows[0].question, ...updatedAnswer.rows[0] },  // Include all fields from the updated answer
            user: {
                ...userData.rows[0],
            },
        });
    } catch (error) {
        console.error('Error updating answer:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while updating the answer.' });
    }
};

module.exports = { createanswer, getAllAnswers, getUserAnswers, updateAnswer };