const pool = require("../config/dbconfig")

const createsubscription = async (req, res) => {
    try {
        const { title, description } = req.body;

        const query = await pool.query('INSERT INTO subscription (title, description) VALUES ($1, $2) RETURNING *', [title, description])

        res.status(200).json({ error: false, msg: 'Subscription created successfully', data: query.rows[0] });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while creating the subscription.' });
    }
};

const updatesubscription = async (req, res) => {
    try {
        const { id, title, description } = req.body;

        const checkExistence = await pool.query('SELECT * FROM subscription WHERE id = $1', [id])

        if (checkExistence.rows.length == 0) {
            return res.status(400).json({ error: true, msg: 'Subscription not found' });
        }

        // Construct the dynamic update query
        const updateFields = [];
        const values = [];

        if (title) {
            updateFields.push('title = $' + (updateFields.length + 1));
            values.push(title);
        }

        if (description) {
            updateFields.push('description = $' + (updateFields.length + 1));
            values.push(description);
        }

        const updateQuery = `
              UPDATE subscription
              SET ${updateFields.join(', ')}
              WHERE id = $${values.length + 1}
              RETURNING *;
          `;

        const updateValues = [...values, id];

        const result = await pool.query(updateQuery, updateValues);

        res.status(200).json({ error: false, msg: 'Subscription updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while updating the subscription.' });
    }
};

const getsubscriptionList = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || null;

        let query = "SELECT * FROM subscription ORDER BY created_at DESC ";

        if (page && limit) {
            const offset = (page - 1) * limit;
            query += 'LIMIT $1 OFFSET $2';

            const result = await pool.query(query, [limit, offset]);

            res.status(200).json({ error: false, count: result.rows.length, data: result.rows });
        } else {
            const result = await pool.query(query);
            // console.log(result.rows);
            res.status(200).json({ error: false, count: result.rows.length, data: result.rows });
        }
    } catch (error) {
        console.error("Error in fetching subscriptions", error);
        res.status(500).json({ error: true, msg: "An error occurred while fetching the subscription." })
    }
}

const getsubscriptionByID = async (req, res) => {
    try {
        const id = req.params.id

        const checkExistence = await pool.query('SELECT * FROM subscription WHERE id = $1', [id])

        if (checkExistence.rows.length == 0) {
            return res.status(404).json({ error: true, msg: "Subscription not found" });
        }

        res.json({ error: true, msg: "Subscription fetched", data: checkExistence.rows[0] });

    } catch (error) {
        console.error("Error in fetching subscription", error);
        res.status(500).json({ error: true, msg: "An error occurred while fetching the subscription." })
    }
}

const deleteSubscription = async (req, res) => {
    try {
        const id = req.params.id

        const checkExistence = await pool.query('SELECT * FROM subscription WHERE id = $1', [id])

        if (checkExistence.rows.length == 0) {
            return res.status(404).json({ error: true, msg: "Subscription not found" });
        }

        const query = await pool.query('DELETE FROM subscription WHERE id = $1 RETURNING *', [id])

        res.json({ error: false, msg: "Subscription deleted successfully", data: query.rows[0] });

    } catch (error) {
        console.error("Error in deleting subscription", error);
        res.status(500).json({ error: true, msg: "An error occurred while deleting the subscription." })
    }
}

module.exports = { createsubscription, updatesubscription, getsubscriptionList, getsubscriptionByID, deleteSubscription };