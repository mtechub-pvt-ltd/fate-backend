const pool = require("../config/dbconfig")

const addsession = async (req, res) => {
    try {
        const { userId, prompt, prompt_answer } = req.body;

        // Check if the user exists
        const userQuery = await pool.query('SELECT * FROM Users WHERE id = $1', [userId]);
        const user = userQuery.rows[0];
        if (!user) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Insert prompt and prompt_answer into the session table
        const insertQuery = `
          INSERT INTO session (user_id, prompt, prompt_answer)
          VALUES ($1, $2, $3)
          RETURNING *;
        `;
        const sessionQuery = await pool.query(insertQuery, [userId, prompt, prompt_answer]);
        const session = sessionQuery.rows[0];

        res.status(201).json({ error: false, msg: "Session added succussfully", data: session });
    } catch (error) {
        console.error('Error adding session:', error);
        res.status(500).json({ error: "true", msg: 'Internal Server Error' });
    }
};

const getUserSessions = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Check if the user exists
        const userQuery = await pool.query('SELECT * FROM Users WHERE id = $1', [userId]);
        const user = userQuery.rows[0];
        if (!user) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Fetch sessions grouped by day and count
        const sessionsQuery = await pool.query(`
            SELECT 
                DATE(created_at) AS session_day,
                COUNT(*) AS session_count,
                JSON_AGG(session ORDER BY created_at) AS sessions
            FROM 
                session 
            WHERE 
                user_id = $1 
            GROUP BY 
                session_day
            ORDER BY 
                session_day DESC;
        `, [userId]);

        const sessions = sessionsQuery.rows;

        if (sessions.length === 0) {
            return res.status(200).json({ error: true, msg: "No sessions found for this user" });
        }

        // Format the response
        const formattedSessions = sessions.map(session => ({
            session_day: session.session_day,
            session_count: session.session_count,
            sessions: session.sessions
        }));

        res.status(200).json({ error: false, msg: "Sessions retrieved successfully", data: formattedSessions });
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }

};

const deleteSession = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;

        // Check if the session exists
        const sessionQuery = await pool.query('SELECT * FROM session WHERE id = $1', [sessionId]);
        const session = sessionQuery.rows[0];
        if (!session) {
            return res.status(404).json({ error: true, msg: 'Session not found' });
        }

        // Delete the session
        await pool.query('DELETE FROM session WHERE id = $1', [sessionId]);

        res.status(200).json({ error: false, msg: "Session deleted successfully" });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getSessionBySessionAndUserId = async (req, res) => {
    try {
        const { sessionId, userId } = req.params;

        // Check if the user exists
        const userQuery = await pool.query('SELECT * FROM Users WHERE id = $1', [userId]);
        const user = userQuery.rows[0];
        if (!user) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Fetch the session by session ID and user ID
        const sessionQuery = await pool.query('SELECT * FROM session WHERE id = $1 AND user_id = $2', [sessionId, userId]);
        const session = sessionQuery.rows[0];

        if (!session) {
            return res.status(404).json({ error: true, msg: 'Session not found for this user' });
        }

        res.status(200).json({ error: false, msg: "Session retrieved successfully", data: session });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getUserWeeklySessions = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if the user exists
        const userQuery = await pool.query('SELECT * FROM Users WHERE id = $1', [userId]);
        const user = userQuery.rows[0];
        if (!user) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Get the start and end dates of the current week
        const currentDate = new Date();
        const currentDay = currentDate.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
        const firstDayOfWeek = new Date(currentDate);
        firstDayOfWeek.setDate(firstDayOfWeek.getDate() - currentDay); // Set to the first day of the current week
        const lastDayOfWeek = new Date(currentDate);
        lastDayOfWeek.setDate(lastDayOfWeek.getDate() + (6 - currentDay)); // Set to the last day of the current week

        // Format the dates to 'YYYY-MM-DD' format
        const formattedFirstDayOfWeek = firstDayOfWeek.toISOString().split('T')[0];
        const formattedLastDayOfWeek = lastDayOfWeek.toISOString().split('T')[0];

        // Fetch weekly sessions for the user
        const weeklySessionsQuery = await pool.query(
            'SELECT * FROM session WHERE user_id = $1 AND created_at BETWEEN $2 AND $3',
            [userId, formattedFirstDayOfWeek, formattedLastDayOfWeek]
        );
        const weeklySessions = weeklySessionsQuery.rows;

        if (weeklySessions.length === 0) {
            return res.status(200).json({ error: true, msg: "No sessions found for this user this week" });
        }

        res.status(200).json({ error: false, msg: "Weekly sessions retrieved successfully", data: weeklySessions });
    } catch (error) {
        console.error('Error fetching user weekly sessions:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getUserDailySessions = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if the user exists
        const userQuery = await pool.query('SELECT * FROM Users WHERE id = $1', [userId]);
        const user = userQuery.rows[0];
        if (!user) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Get the start and end of the current day
        const currentDate = new Date();
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0); // Set to the start of the day
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999); // Set to the end of the day

        // Format the dates to 'YYYY-MM-DD HH:MM:SS' format
        const formattedStartOfDay = startOfDay.toISOString().slice(0, 19).replace('T', ' ');
        const formattedEndOfDay = endOfDay.toISOString().slice(0, 19).replace('T', ' ');

        // Fetch daily sessions for the user
        const dailySessionsQuery = await pool.query(
            'SELECT * FROM session WHERE user_id = $1 AND created_at BETWEEN $2 AND $3',
            [userId, formattedStartOfDay, formattedEndOfDay]
        );
        const dailySessions = dailySessionsQuery.rows;

        if (dailySessions.length === 0) {
            return res.status(200).json({ error: true, msg: "No sessions found for this user today" });
        }

        res.status(200).json({ error: false, msg: "Daily sessions retrieved successfully", data: dailySessions });
    } catch (error) {
        console.error('Error fetching user daily sessions:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

module.exports = { addsession, getUserSessions, deleteSession, getSessionBySessionAndUserId, getUserWeeklySessions, getUserDailySessions };