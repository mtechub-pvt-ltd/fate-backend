const pool = require("../config/dbconfig")
const cron = require('node-cron');

// Assuming you have a function to get user details by ID
const getUserDetailsById = async (userId) => {
    try {
        const userQuery = 'SELECT * FROM Users WHERE id = $1;';
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rows.length !== 1) {
            return null; // User not found
        }

        const userDetails = {
            id: userResult.rows[0].id,
            images: userResult.rows[0].images,
            profile_image: userResult.rows[0].profile_image,
            name: userResult.rows[0].name,
            email: userResult.rows[0].email,
            device_id: userResult.rows[0].device_id,
            gender: userResult.rows[0].gender,
            age: userResult.rows[0].age,
            role: userResult.rows[0].role,
            block_status: userResult.rows[0].block_status,
            created_at: userResult.rows[0].created_at,
            updated_at: userResult.rows[0].updated_at,
            reported_status: userResult.rows[0].reported_status,
        };

        // Fetch user location
        const locationQuery = 'SELECT * FROM users_location WHERE user_id = $1;';
        const locationResult = await pool.query(locationQuery, [userId]);

        if (locationResult.rows.length === 1) {
            userDetails.location = {
                latitude: locationResult.rows[0].latitude,
                longitude: locationResult.rows[0].longitude,
                complete_address: locationResult.rows[0].complete_address
            };
        }

        return userDetails;
    } catch (error) {
        console.error(error);
        throw new Error('Error fetching user details');
    }
};

const createCall = async (req, res) => {
    try {
        const { caller_id, receiver_id, channel_name, call_type, call_status } = req.body;

        // Check if caller_id exists in the users table
        const callerCheckQuery = 'SELECT id FROM users WHERE id = $1;';
        const callerCheckResult = await pool.query(callerCheckQuery, [caller_id]);

        if (callerCheckResult.rows.length !== 1) {
            return res.status(400).json({ msg: 'Caller does not exist', error: true });
        }

        // Check if receiver_id exists in the users table
        const receiverCheckQuery = 'SELECT id FROM users WHERE id = $1;';
        const receiverCheckResult = await pool.query(receiverCheckQuery, [receiver_id]);

        if (receiverCheckResult.rows.length !== 1) {
            return res.status(400).json({ msg: 'Receiver does not exist', error: true });
        }

        // Check if the call_type is AUDIO or VIDEO
        const validCallTypes = ['AUDIO', 'VIDEO'];
        if (!validCallTypes.includes(call_type.toUpperCase())) {
            return res.status(400).json({ msg: 'Invalid call type. It must be AUDIO or VIDEO', error: true });
        }

        // Check if the call_status is ACCEPT, DECLINED, or NOTANSWERED
        const validCallStatus = ['ACCEPT', 'DECLINED', 'NOTANSWERED'];
        if (!validCallStatus.includes(call_status.toUpperCase())) {
            return res.status(400).json({
                msg: 'Invalid call status. It must be ACCEPT, DECLINED, or NOTANSWERED',
                error: true
            });
        }

        // Check if the channel_name is unique
        const channelNameCheckQuery = 'SELECT channel_name FROM calls WHERE channel_name = $1;';
        const channelNameCheckResult = await pool.query(channelNameCheckQuery, [channel_name]);

        if (channelNameCheckResult.rows.length !== 0) {
            return res.status(400).json({ msg: 'Channel name must be unique', error: true });
        }

        // Check the number of calls created by the caller on the current day
        const currentDate = new Date();
        const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

        const callsCountQuery = 'SELECT COUNT(*) FROM calls WHERE caller_id = $1 AND created_at >= $2 AND created_at < $3;';
        const callsCountResult = await pool.query(callsCountQuery, [caller_id, startOfDay, endOfDay]);
        const callsCount = parseInt(callsCountResult.rows[0].count);

        if (callsCount >= 5) {
            return res.status(400).json({ msg: 'User has reached the maximum allowed calls for the day', error: true });
        }

        // If all checks pass, proceed with creating the call
        const query = `
          INSERT INTO calls (caller_id, receiver_id, channel_name, call_type, call_status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;

        const values = [caller_id, receiver_id, channel_name, call_type.toUpperCase(), call_status.toUpperCase()];

        const result = await pool.query(query, values);

        // Fetch details of both the caller and receiver using the provided queries
        const callerDetails = await getUserDetailsById(caller_id);
        const receiverDetails = await getUserDetailsById(receiver_id);

        res.json({
            msg: 'Call created successfully',
            error: false,
            call: result.rows[0],
            caller_details: callerDetails,
            receiver_details: receiverDetails,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Internal Server Error', error: error.message });
    }
};

const updateCallDuration = async (req, res) => {
    try {
        const { caller_id, call_id, call_duration } = req.body;

        // Check if caller_id exists in the users table
        const callerCheckQuery = 'SELECT id FROM users WHERE id = $1;';
        const callerCheckResult = await pool.query(callerCheckQuery, [caller_id]);

        if (callerCheckResult.rows.length !== 1) {
            return res.status(400).json({ msg: 'Caller does not exist', error: true });
        }

        // Check if call_id exists in the calls table and matches the provided caller_id
        const callCheckQuery = 'SELECT * FROM calls WHERE call_id = $1 AND caller_id = $2;';
        const callCheckResult = await pool.query(callCheckQuery, [call_id, caller_id]);

        if (callCheckResult.rows.length !== 1) {
            return res.status(400).json({ msg: 'Call does not exist or caller_id does not match', error: true });
        }

        // Check if the call type is AUDIO and the duration is more than 5 minutes
        if (callCheckResult.rows[0].call_type.toUpperCase() === 'AUDIO' && call_duration > '00:05:00') {
            return res.status(400).json({ msg: 'Audio call duration cannot be more than 5 minutes', error: true });
        }

        // Update the call duration
        const updateCallQuery = 'UPDATE calls SET call_duration = $1 WHERE call_id = $2 RETURNING *;';
        const updateResult = await pool.query(updateCallQuery, [call_duration, call_id]);

        // Fetch details of both the caller and receiver using the provided queries
        const callerDetails = await getUserDetailsById(caller_id);
        const receiverDetails = await getUserDetailsById(callCheckResult.rows[0].receiver_id);

        res.json({
            msg: 'Call duration updated successfully',
            error: false,
            call: updateResult.rows[0],
            caller_details: callerDetails,
            receiver_details: receiverDetails,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateCallStatus = async (req, res) => {
    try {
        const { caller_id, call_id, call_status } = req.body;

        // Check if caller_id exists in the users table
        const callerCheckQuery = 'SELECT id FROM users WHERE id = $1;';
        const callerCheckResult = await pool.query(callerCheckQuery, [caller_id]);

        if (callerCheckResult.rows.length !== 1) {
            return res.status(400).json({ msg: 'Caller does not exist', error: true });
        }

        // Check if call_id exists in the calls table and matches the provided caller_id
        const callCheckQuery = 'SELECT * FROM calls WHERE call_id = $1 AND caller_id = $2;';
        const callCheckResult = await pool.query(callCheckQuery, [call_id, caller_id]);

        if (callCheckResult.rows.length !== 1) {
            return res.status(400).json({ msg: 'Call does not exist or caller_id does not match', error: true });
        }

        // Check if the call_status is a valid call status
        const validCallStatus = ['ACCEPT', 'DECLINED', 'NOTANSWERED'];
        if (!validCallStatus.includes(call_status.toUpperCase())) {
            return res.status(400).json({
                msg: 'Invalid call status. It must be ACCEPT, DECLINED, or NOTANSWERED',
                error: true
            });
        }

        // Update the call status
        const updateCallQuery = 'UPDATE calls SET call_status = $1 WHERE call_id = $2 RETURNING *;';
        const updateResult = await pool.query(updateCallQuery, [call_status.toUpperCase(), call_id]);

        // Fetch details of both the caller and receiver using the provided queries
        const callerDetails = await getUserDetailsById(caller_id);
        const receiverDetails = await getUserDetailsById(callCheckResult.rows[0].receiver_id);

        res.json({
            msg: 'Call status updated successfully',
            error: false,
            call: updateResult.rows[0],
            caller_details: callerDetails,
            receiver_details: receiverDetails,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCallsByCallerId = async (req, res) => {
    const callerId = req.params.caller_id; // Caller ID from parameters
    const { page = 1, limit = 10 } = req.query; // Pagination parameters

    try {
        // Fetch total count of calls made by the specified caller_id
        const countQuery = `
          SELECT COUNT(*) AS total_count FROM calls WHERE caller_id = $1;
        `;

        const countResult = await pool.query(countQuery, [callerId]);
        const totalCalls = parseInt(countResult.rows[0].total_count);

        // If there are no calls for the caller, return an empty response
        if (totalCalls === 0) {
            return res.status(200).json({
                msg: 'No calls found for the caller',
                error: false,
                // count: 0,
                // calls: {
                //     data: [],
                // },
            });
        }

        // Fetch caller details only when there are calls
        const userDetails = await getUserDetailsById(callerId); // Fetch caller details using the provided function

        // Fetch all calls made by the specified caller_id with pagination and caller/receiver details
        const offset = (page - 1) * limit;
        const getCallsQuery = `
          SELECT calls.*, 
                 caller_details.*, 
                 receiver_details.*
          FROM calls
          JOIN users AS caller_details ON calls.caller_id = caller_details.id
          JOIN users AS receiver_details ON calls.receiver_id = receiver_details.id
          WHERE calls.caller_id = $1 
          ORDER BY calls.created_at DESC 
          OFFSET $2
          LIMIT $3;
        `;

        const callsResult = await pool.query(getCallsQuery, [callerId, offset, limit]);
        const calls = callsResult.rows;

        res.status(200).json({
            msg: 'Calls retrieved successfully',
            error: false,
            count: totalCalls,
            caller_details: userDetails,
            calls: {
                count: calls.length,
                data: calls,
            },
        });
    } catch (error) {
        res.status(500).json({ msg: 'Internal server error', error: true });
    }
}

const getCallByCallId = async (req, res) => {
    const { caller_id, call_id } = req.body; // Caller ID and Call ID from request body

    try {
        // Check if caller_id exists in the users table
        const callerCheckQuery = `
          SELECT id FROM users WHERE id = $1;
        `;

        const callerCheckResult = await pool.query(callerCheckQuery, [caller_id]);

        if (callerCheckResult.rows.length !== 1) {
            return res.status(404).json({ msg: 'Caller not found', error: true });
        }

        // Fetch caller details
        const userDetails = await getUserDetailsById(caller_id); // Fetch caller details using the provided function

        // Fetch details of the specific call made by the specified caller_id
        const getCallQuery = `
          SELECT * FROM calls WHERE caller_id = $1 AND call_id = $2;
        `;

        const callResult = await pool.query(getCallQuery, [caller_id, call_id]);
        const call = callResult.rows[0];

        if (!call) {
            return res.status(404).json({ msg: 'Call not found for the specified caller', error: true });
        }

        res.status(200).json({
            msg: 'Specific call retrieved successfully',
            error: false,
            caller_details: userDetails,
            call: call,
        });
    } catch (error) {
        res.status(500).json({ msg: 'Internal server error', error: true });
    }
};

const removeCallByCallerId = async (req, res) => {
    const { caller_id, call_id } = req.body; // Caller ID and Call ID from request body

    try {
        // Check if caller_id exists in the users table
        const callerCheckQuery = `
          SELECT id FROM users WHERE id = $1;
        `;

        const callerCheckResult = await pool.query(callerCheckQuery, [caller_id]);

        if (callerCheckResult.rows.length !== 1) {
            return res.status(404).json({ msg: 'Caller not found', error: true });
        }

        // Delete the specific call made by the specified caller_id
        const deleteCallQuery = `
          DELETE FROM calls WHERE caller_id = $1 AND call_id = $2 RETURNING *;
        `;

        const deletedCallResult = await pool.query(deleteCallQuery, [caller_id, call_id]);
        const deletedCall = deletedCallResult.rows[0];

        if (!deletedCall) {
            return res.status(404).json({ msg: 'Call not found for the specified caller', error: true });
        }

        res.status(200).json({
            msg: 'Call removed successfully',
            error: false,
            deleted_call: deletedCall,
        });
    } catch (error) {
        res.status(500).json({ msg: 'Internal server error', error: true });
    }
};

const getRandomUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if the provided user ID exists in the users table
        const userCheckQuery = 'SELECT id FROM users WHERE id = $1';
        const userCheckResult = await pool.query(userCheckQuery, [userId]);

        if (userCheckResult.rows.length === 0) {
            // User ID not found in the users table
            res.status(404).json({ error: true, msg: 'User not found.' });
            return;
        }

        // Query to get a random user with details who has not been repeated
        const getRandomUserQuery = `
          SELECT u.*, ul.latitude, ul.longitude, ul.complete_address
          FROM users u
          LEFT JOIN users_location ul ON u.id = ul.user_id
          WHERE u.id NOT IN (
            SELECT receiver_id
            FROM calls
          ) AND u.id != $1 AND u.role = 'user'
          ORDER BY RANDOM()
          LIMIT 1;
        `;

        const getRandomUserResult = await pool.query(getRandomUserQuery, [userId]);

        if (getRandomUserResult.rows.length === 0) {
            // No available random user
            res.status(404).json({ error: true, msg: 'No available random user.' });
        } else {
            const randomUser = getRandomUserResult.rows[0];
            res.json({ msg: "Random User Fetched For Calling", error: false, data: randomUser });
        }
    } catch (error) {
        console.error('Error fetching random user:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

// cron.schedule('* * * * *', async () => {
//     console.log('Cron job is running at', new Date()); 
// });

module.exports = { createCall, updateCallDuration, updateCallStatus, getCallsByCallerId, getCallByCallId, removeCallByCallerId, getRandomUser };