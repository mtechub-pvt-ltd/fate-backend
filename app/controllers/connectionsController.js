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

const createconnection = async (req, res) => {
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

const updateConnection = async (req, res) => {
    const { connectionId, user_id_1, user_id_2 } = req.body;

    // Check if the connection exists
    const connectionExistsQuery = 'SELECT COUNT(*) FROM connections WHERE id = $1';
    const connectionExistsValues = [connectionId];

    try {
        const connectionExistsResult = await pool.query(connectionExistsQuery, connectionExistsValues);
        const connectionExistsCount = parseInt(connectionExistsResult.rows[0].count);

        if (connectionExistsCount === 0) {
            return res.status(404).json({ error: true, msg: 'Connection not found' });
        }

        // Update the connection
        const updateConnectionQuery =
            'UPDATE connections SET user_id_1 = $1, user_id_2 = $2 WHERE id = $3 RETURNING *';

        const updateConnectionValues = [user_id_1, user_id_2, connectionId];

        const result = await pool.query(updateConnectionQuery, updateConnectionValues);

        // Fetch details of both users and their locations
        const user1Details = await getUserDetailsWithLocation(user_id_1);
        const user2Details = await getUserDetailsWithLocation(user_id_2);

        res.json({
            msg: 'Connection Updated Successfully',
            error: false,
            data: result.rows[0],
            user_1_details: user1Details,
            user_2_details: user2Details,
        });
    } catch (error) {
        console.error('Error updating connection:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getAllConnections = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        // Fetch all connections with pagination
        const getAllConnectionsQuery = `
            SELECT * FROM connections
            ORDER BY id
            LIMIT $1 OFFSET $2
        `;

        const getAllConnectionsResult = await pool.query(getAllConnectionsQuery, [limit, offset]);

        // Fetch details of users for each connection
        const connectionsDetails = await Promise.all(
            getAllConnectionsResult.rows.map(async (connection) => {
                const user1Details = await getUserDetailsWithLocation(connection.user_id_1);
                const user2Details = await getUserDetailsWithLocation(connection.user_id_2);

                return {
                    "connection": {
                        user1details: user1Details,
                        user2details: user2Details,
                    }
                };
            })
        );

        res.json({
            msg: 'All Connections Fetched Successfully',
            error: false,
            count: getAllConnectionsResult.rowCount, // Total count of connections
            data: connectionsDetails,
        });
    } catch (error) {
        console.error('Error fetching all connections:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

const doesUserExist = async (userId) => {
    return await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
    );
}

const getConnectionsByUserID = async (req, res) => {
    const userId = req.params.userId;

    // Check if the user with the provided ID exists
    const userExists = await doesUserExist(userId);

    if (userExists.rows.length === 0) {
        return res.status(404).json({ error: true, msg: 'User not found' });
    }

    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        // Fetch details of the requested user
        const requestedUserDetails = await getUserDetailsWithLocation(userId);

        // Fetch all associated users (user 2) based on the provided user ID (user 1)
        const result = await pool.query(
            'SELECT user_id_2 FROM connections WHERE user_id_1 = $1 ORDER BY user_id_2 LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );

        // Extract user_id_2 values from the result
        const associatedUserIds = result.rows.map((row) => row.user_id_2);

        if (associatedUserIds.length === 0) {
            return res.json({
                error: true,
                msg: 'Connection Not Found',
            });
        }

        // Fetch details of the connected users
        const connectedUsersDetails = await Promise.all(
            associatedUserIds.map(async (connectedUserId) => {
                return await getUserDetailsWithLocation(connectedUserId);
            })
        );

        res.json({
            error: false,
            msg: "Connections Fetched",
            count: associatedUserIds.length,
            data: { user: requestedUserDetails, connectedUsers: connectedUsersDetails }
        });
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: true, error: 'Internal Server Error' });
    }
}

module.exports = { createconnection, updateConnection, getAllConnections, getConnectionsByUserID };