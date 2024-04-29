const pool = require("../config/dbconfig")

const createquestion = async (req, res) => {
    const { question, placeholder } = req.body;

    // Validate input
    if (!question) {
        return res.status(400).json({ error: 'Please provide a body.' });
    }

    try {
        const insertQuestionQuery =
            'INSERT INTO questions (question, placeholder) VALUES ($1, $2) RETURNING *';
        const newQuestion = await pool.query(insertQuestionQuery, [question, placeholder]);

        res.status(201).json({ error: false, msg: 'Question created successfully', question: newQuestion.rows[0] });
    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while creating the question.' });
    }
};

const getAllQuestions = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const allQuestionsQuery = `
            SELECT *
            FROM questions
            ORDER BY id
            LIMIT $1 OFFSET $2
        `;

        const allQuestionsData = await pool.query(allQuestionsQuery, [limit, offset]);

        res.status(200).json({
            error: false,
            count: allQuestionsData.rows.length,
            data: allQuestionsData.rows,
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while fetching questions.' });
    }
};

const getQuestionByID = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: true, msg: 'Please provide a question ID.' });
        }

        const questionQuery = 'SELECT * FROM questions WHERE id = $1';
        const questionData = await pool.query(questionQuery, [id]);

        if (questionData.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'Question not found.' });
        }

        res.status(200).json({
            error: false,
            data: questionData.rows[0],
        });
    } catch (error) {
        console.error('Error fetching question:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while fetching the question.' });
    }
};

const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, placeholder } = req.body;

        if (!id) {
            return res.status(400).json({ error: true, msg: 'Please provide a question ID.' });
        }

        if (!question) {
            return res.status(400).json({ error: true, msg: 'Please provide an updated question.' });
        }

        const updateQuestionQuery = 'UPDATE questions SET question = $1, placeholder = $2, updated_at = NOW() WHERE id = $3 RETURNING *';
        const updatedQuestion = await pool.query(updateQuestionQuery, [question, placeholder, id]);

        if (updatedQuestion.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'Question not found.' });
        }

        res.status(200).json({
            error: false,
            msg: 'Question updated successfully',
            data: updatedQuestion.rows[0],
        });
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while updating the question.' });
    }
};

const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: true, msg: 'Please provide a question ID.' });
        }

        // Delete related answers first
        const deleteAnswersQuery = 'DELETE FROM answers WHERE question_id = $1';
        await pool.query(deleteAnswersQuery, [id]);

        // Now delete the question
        const deleteQuestionQuery = 'DELETE FROM questions WHERE id = $1 RETURNING *';
        const deletedQuestion = await pool.query(deleteQuestionQuery, [id]);

        if (deletedQuestion.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'Question not found.' });
        }

        res.status(200).json({
            error: false,
            msg: 'Question deleted successfully',
            data: deletedQuestion.rows[0],
        });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while deleting the question.' });
    }
};

module.exports = { createquestion, getAllQuestions, getQuestionByID, updateQuestion, deleteQuestion };