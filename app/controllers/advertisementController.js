const pool = require("../config/dbconfig")

function isValidDateFormat(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(dateString);
}

const createadvertisement = async (req, res) => {
    try {
        const { image, link, title, start_date, end_date } = req.body;

        // Validate date formats
        if (!isValidDateFormat(start_date) || !isValidDateFormat(end_date)) {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        // Set the status to 'INACTIVE' initially
        const status = 'INACTIVE';

        const query = `
            INSERT INTO advertizement (image, link, title, start_date, end_date, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
          `;

        const values = [image, link, title, start_date, end_date, status];

        const result = await pool.query(query, values);

        res.json({ msg: "Advertisement created successfully", error: false, data: result.rows[0] });
    } catch (error) {
        console.error('Error adding advertisement:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const updateAdvertisement = async (req, res) => {
    try {
        const { id, image, link, title, start_date, end_date, status } = req.body;

        // Check if the ID is provided
        if (!id) {
            return res.status(400).json({ success: false, error: 'Advertisement ID is required for updating.' });
        }

        // Validate date formats
        if (start_date && !isValidDateFormat(start_date) || end_date && !isValidDateFormat(end_date)) {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        // Construct the dynamic update query
        const updateFields = [];
        const values = [];

        if (image) {
            updateFields.push('image = $1');
            values.push(image);
        }

        if (link) {
            updateFields.push('link = $' + (updateFields.length + 1));
            values.push(link);
        }

        if (title) {
            updateFields.push('title = $' + (updateFields.length + 1));
            values.push(title);
        }

        if (start_date) {
            updateFields.push('start_date = $' + (updateFields.length + 1));
            values.push(start_date);
        }

        if (end_date) {
            updateFields.push('end_date = $' + (updateFields.length + 1));
            values.push(end_date);
        }

        if (status) {
            updateFields.push('status = $' + (updateFields.length + 1));
            values.push(status);
        }

        const updateQuery = `
            UPDATE advertizement
            SET ${updateFields.join(', ')}
            WHERE id = $${values.length + 1}
            RETURNING *;
        `;

        const updateValues = [...values, id];

        const result = await pool.query(updateQuery, updateValues);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Advertisement not found.' });
        }

        res.json({ msg: "Advertisement updated successfully", error: false, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating advertisement:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getAdvetisementList = async (req, res) => {
    try {
        let { page, limit } = req.query;

        // Default values if not provided
        page = parseInt(page) || 1;
        limit = parseInt(limit) || null; // Set limit to null if not provided

        let query = 'SELECT * FROM advertizement ORDER BY created_at DESC';

        // Check if pagination parameters are provided
        if (page && limit) {
            const offset = (page - 1) * limit;
            query += 'LIMIT $1 OFFSET $2';

            const result = await pool.query(query, [limit, offset]);
            res.json({ error: false, count: result.rows.length, data: result.rows });
        } else {
            const result = await pool.query(query);
            res.json({ error: false, count: result.rows.length, data: result.rows });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

const getAdvetisementByID = async (req, res) => {
    try {
        const id = req.params.id;

        const checkExistence = await pool.query('SELECT * FROM advertizement WHERE id = $1', [id]);
        // console.log("existence", checkExistence.rows);

        if (checkExistence.rows.length == 0) {
            return res.status(404).json({ error: true, msg: "Advertisement not found" })
        }

        res.json({ error: false, msg: "Advertisement fetched", data: checkExistence.rows[0] })

    } catch (error) {
        console.error('Error checking existence:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

const getAdvetisementByStatus = async (req, res) => {
    try {
        const status = req.params.status
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || null;

        if (status !== "ACTIVE" && status !== "INACTIVE") {
            return res.status(400).json({ error: true, msg: "Status can only ACTIVE or INACTIVE" });
        }

        const query = 'SELECT * FROM advertizement WHERE status = $1';

        // const
        if (page && limit) {
            const offset = (page - 1) * limit;
            const paginatedQuery = query + 'LIMIT $2 OFFSET $3';

            const result = await pool.query(paginatedQuery, [status, limit, offset]);
            res.json({ error: false, count: result.rows.length, data: result.rows });
        } else {
            const result = await pool.query(query, [status]);

            res.json({ error: false, count: result.rows.length, data: result.rows });
        }
        // res.json({ error: false, count: query.rows.length, data: query.rows });

    } catch (error) {
        console.error('Error checking existence:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

const deleteAdvetisement = async (req, res) => {
    try {
        const id = req.params.id
        console.log(id);

        const checkExistence = await pool.query('SELECT * FROM advertizement WHERE id = $1', [id])

        // console.log("checkExistence", checkExistence.rows)
        if (checkExistence.rows.length == 0) {
            return res.status(404).json({ error: true, msg: "Advertisement not found" });
        }

        const query = await pool.query('DELETE FROM advertizement WHERE id = $1 RETURNING *', [id])
        // console.log(query);
        res.json({ error: false, msg: "Advertisement deleted successfully", data: query.rows[0] });
    } catch (error) {
        console.error('Error in deleting advertisement', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}


module.exports = { createadvertisement, updateAdvertisement, getAdvetisementList, getAdvetisementByID, getAdvetisementByStatus, deleteAdvetisement };