const pool = require("../config/dbconfig")

async function userExists(userId) {
    const result = await pool.query('SELECT COUNT(*) FROM Users WHERE id = $1', [userId]);
    return result.rows[0].count > 0;
}

async function hasAlreadyReported(reporterId, reportedId) {
    const result = await pool.query(
        'SELECT COUNT(*) FROM report_user WHERE reporter_id = $1 AND reported_id = $2',
        [reporterId, reportedId]
    );
    return result.rows[0].count > 0;
}

const reportuser = async (req, res) => {
    try {
        const { reporter_id, reported_id, reason } = req.body;

        // Check if both the reporter and reported users exist
        if (!(await userExists(reporter_id))) {
            return res.status(404).json({ error: true, msg: 'Reporter user not found' });
        }

        if (!(await userExists(reported_id))) {
            return res.status(404).json({ error: true, msg: 'Reported user not found' });
        }

        // Check if the reporter has already reported the specified user
        if (await hasAlreadyReported(reporter_id, reported_id)) {
            return res.status(400).json({ error: true, msg: 'This user already reported by this reporter' });
        }

        // Update reported_status in Users table
        const updateUserQuery = 'UPDATE Users SET reported_status = true WHERE id = $1';
        await pool.query(updateUserQuery, [reported_id]);

        // Insert into report_user table
        const insertReportQuery =
            'INSERT INTO report_user (reporter_id, reported_id, reason) VALUES ($1, $2, $3) RETURNING *';
        const result = await pool.query(insertReportQuery, [reporter_id, reported_id, reason]);

        res.json({ msg: "User reported successfully", error: false, data: result.rows[0] });
    } catch (error) {
        console.error('Error reporting user:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getAllReports = async (req, res) => {
    try {
        const getAllReportsQuery = `
        SELECT
        ru.reporter_id,
        reporter.id AS reporter_id,
        reporter.name AS reporter_name,
        reporter.email AS reporter_email,
        reporter.images AS reporter_images,
        reporter.profile_image AS reporter_profile_image,
        reporter.gender AS reporter_gender,
        reporter.age AS reporter_age,
        reporter.role AS reporter_role,
        reporter_location.latitude AS reporter_latitude,
        reporter_location.longitude AS reporter_longitude,
        reporter_location.complete_address AS reporter_complete_address,
        jsonb_agg(jsonb_build_object(
            'report_id', ru.id,
            'reason', ru.reason,
            'reported_id', ru.reported_id,
            'reported_name', reported.name,
            'reported_images', reported.images,
            'reported_email', reported.email,
            'reported_profile_image', reported.profile_image,
            'reported_gender', reported.gender,
            'reported_age', reported.age,
            'reported_role', reported.role,
            'reported_latitude', reported_location.latitude,
            'reported_longitude', reported_location.longitude,
            'reported_complete_address', reported_location.complete_address
        )) AS reports
    FROM
        report_user ru
        JOIN Users reporter ON ru.reporter_id = reporter.id
        JOIN Users reported ON ru.reported_id = reported.id
        LEFT JOIN users_location reporter_location ON reporter.id = reporter_location.user_id
        LEFT JOIN users_location reported_location ON reported.id = reported_location.user_id
    GROUP BY
        ru.reporter_id, reporter.id, reporter.name, reporter.email, reporter.images,
        reporter.profile_image, reporter.gender, reporter.age, reporter.role,
        reporter_location.latitude, reporter_location.longitude, reporter_location.complete_address;
        `;
        // count: result.rowCount,
        const result = await pool.query(getAllReportsQuery);
        res.json({ error: false, msg: 'Reports Fetched', data: result.rows });
    } catch (error) {
        console.error('Error fetching all reports:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getReportedUsersByReporter = async (req, res) => {
    try {
        const { reporter_id } = req.params;

        // Validate if the reporter_id is a valid integer
        if (!parseInt(reporter_id)) {
            return res.status(400).json({ error: true, msg: 'Invalid reporter_id' });
        }

        const getReportedUsersQuery = `
            SELECT
                reported.id AS reported_id,
                reported.name AS reported_name,
                reported.email AS reported_email,
                reported.images AS reported_images,
                reported.profile_image AS reported_profile_image,
                reported.gender AS reported_gender,
                reported.age AS reported_age,
                reported.role AS reported_role,
                reported_location.latitude AS reported_latitude,
                reported_location.longitude AS reported_longitude,
                reported_location.complete_address AS reported_complete_address
            FROM
                report_user ru
                JOIN Users reporter ON ru.reporter_id = reporter.id
                JOIN Users reported ON ru.reported_id = reported.id
                LEFT JOIN users_location reported_location ON reported.id = reported_location.user_id
            WHERE
                reporter.id = $1
            GROUP BY
                reported.id, reported.name, reported.email, reported.images,
                reported.profile_image, reported.gender, reported.age, reported.role,
                reported_location.latitude, reported_location.longitude, reported_location.complete_address
        `;

        const result = await pool.query(getReportedUsersQuery, [reporter_id]);
        // console.log("result", result.rows);

        if (result.rows.length == 0) {
            res.status(400).json({ error: true, msg: 'Reported Users not found' });
        } else {
            res.json({ error: false, msg: 'Reported Users Fetched', data: result.rows });
        }

    } catch (error) {
        console.error('Error fetching reported users:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

module.exports = { reportuser, getAllReports, getReportedUsersByReporter };