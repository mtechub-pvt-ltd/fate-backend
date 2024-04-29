const pool = require("../config/dbconfig")
const textract = require('textract');

const addreview = async (req, res) => {
    const { sender_id, receiver_id, review } = req.body;

    try {
        // Check if both sender_id and receiver_id exist in the Users table
        const usersExistQuery = 'SELECT * FROM Users WHERE id IN ($1)';
        const senderExistResult = await pool.query(usersExistQuery, [sender_id]);

        if (senderExistResult.rows.length == 0) {
            // If one or both users do not exist, return an error response
            return res.status(400).json({ error: true, msg: 'Sender not found.' });
        }

        const ReceiverExistResult = await pool.query('SELECT * FROM Users WHERE id IN ($1)', [receiver_id]);

        if (ReceiverExistResult.rows.length == 0) {
            // If one or both users do not exist, return an error response
            return res.status(400).json({ error: true, msg: 'Receiver not found.' });
        }

        // Insert a new review into the chat_review table
        const addReviewQuery = `
            INSERT INTO chat_review (sender_id, receiver_id, review)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const addedReviewResult = await pool.query(addReviewQuery, [sender_id, receiver_id, review]);

        // Respond with the newly added review
        res.status(201).json({ msg: 'Review added successfully', error: false, data: addedReviewResult.rows[0] });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getAllChatReviews = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        // Retrieve all reviews with sender and receiver details
        const getAllReviewsQuery = `
            SELECT 
                cr.sender_id,
                u_sender.name AS sender_name,
                u_sender.email AS sender_email,
                u_sender.images AS sender_images,
                u_sender.profile_image AS sender_profile_image,
                u_sender.gender AS sender_gender,
                u_sender.age AS sender_age,
                u_sender.role AS sender_role,
                u_sender.block_status AS sender_block_status,
                u_sender.deleted_status AS sender_deleted_status,
                u_sender.reported_status AS sender_reported_status,
                cr.receiver_id,
                u_receiver.name AS receiver_name,
                u_receiver.email AS receiver_email,
                u_receiver.images AS receiver_images,
                u_receiver.profile_image AS receiver_profile_image,
                u_receiver.gender AS receiver_gender,
                u_receiver.age AS receiver_age,
                u_receiver.role AS receiver_role,
                u_receiver.block_status AS receiver_block_status,
                u_receiver.deleted_status AS receiver_deleted_status,
                u_receiver.reported_status AS receiver_reported_status,
                cr.id,
                cr.review,
                cr.created_at,
                cr.updated_at
            FROM 
                chat_review cr
            INNER JOIN 
                users u_sender ON cr.sender_id = u_sender.id
            INNER JOIN 
                users u_receiver ON cr.receiver_id = u_receiver.id
            ORDER BY cr.id
            LIMIT $1 OFFSET $2
        `;
        const allReviewsResult = await pool.query(getAllReviewsQuery, [limit, offset]);

        // Group reviews by sender and receiver
        const reviewsMap = new Map();
        allReviewsResult.rows.forEach(review => {
            const key = `${review.sender_id}_${review.receiver_id}`;
            if (!reviewsMap.has(key)) {
                reviewsMap.set(key, {
                    sender: {
                        id: review.sender_id,
                        name: review.sender_name,
                        email: review.sender_email,
                        images: review.sender_images,
                        profile_image: review.sender_profile_image,
                        age: review.sender_age,
                        role: review.sender_role,
                        block_status: review.sender_block_status,
                        deleted_status: review.sender_deleted_status,
                        reported_status: review.sender_reported_status,
                    },
                    receiver: {
                        id: review.receiver_id,
                        name: review.receiver_name,
                        email: review.receiver_email,
                        images: review.receiver_images,
                        profile_image: review.receiver_profile_image,
                        age: review.receiver_age,
                        role: review.receiver_role,
                        block_status: review.receiver_block_status,
                        deleted_status: review.receiver_deleted_status,
                        reported_status: review.receiver_reported_status,
                    },
                    reviews: [],
                });
            }
            reviewsMap.get(key).reviews.push({
                id: review.id,
                review: review.review,
                created_at: review.created_at,
                updated_at: review.updated_at,
            });
        });

        // Convert map values to an array for response
        const groupedReviews = Array.from(reviewsMap.values());

        // Respond with the list of grouped reviews along with count
        res.status(200).json({
            error: false,
            count: allReviewsResult.rows.length,
            data: groupedReviews,
        });
    } catch (error) {
        console.error('Error fetching all reviews:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getReviewsBySender = async (req, res) => {
    try {
        const senderId = req.params.sender_id;

        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        // Retrieve reviews with sender and receiver details for a specific sender
        const getReviewsBySenderQuery = `
            SELECT 
                cr.sender_id,
                u_sender.name AS sender_name,
                u_sender.email AS sender_email,
                u_sender.images AS sender_images,
                u_sender.profile_image AS sender_profile_image,
                u_sender.gender AS sender_gender,
                u_sender.age AS sender_age,
                u_sender.role AS sender_role,
                u_sender.block_status AS sender_block_status,
                u_sender.deleted_status AS sender_deleted_status,
                u_sender.reported_status AS sender_reported_status,
                cr.receiver_id,
                u_receiver.name AS receiver_name,
                u_receiver.email AS receiver_email,
                u_receiver.images AS receiver_images,
                u_receiver.profile_image AS receiver_profile_image,
                u_receiver.gender AS receiver_gender,
                u_receiver.age AS receiver_age,
                u_receiver.role AS receiver_role,
                u_receiver.block_status AS receiver_block_status,
                u_receiver.deleted_status AS receiver_deleted_status,
                u_receiver.reported_status AS receiver_reported_status,
                cr.id,
                cr.review,
                cr.created_at,
                cr.updated_at
            FROM 
                chat_review cr
            INNER JOIN 
                users u_sender ON cr.sender_id = u_sender.id
            INNER JOIN 
                users u_receiver ON cr.receiver_id = u_receiver.id
            WHERE 
                cr.sender_id = $1
                ORDER BY cr.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const reviewsBySenderResult = await pool.query(getReviewsBySenderQuery, [senderId, limit, offset]);

        // Group reviews by receiver
        const reviewsMap = new Map();
        reviewsBySenderResult.rows.forEach(review => {
            const key = review.receiver_id;
            if (!reviewsMap.has(key)) {
                reviewsMap.set(key, {
                    sender: {
                        id: review.sender_id,
                        name: review.sender_name,
                        email: review.sender_email,
                        images: review.sender_images,
                        profile_image: review.sender_profile_image,
                        age: review.sender_age,
                        role: review.sender_role,
                        block_status: review.sender_block_status,
                        deleted_status: review.sender_deleted_status,
                        reported_status: review.sender_reported_status,
                    },
                    receiver: {
                        id: review.receiver_id,
                        name: review.receiver_name,
                        email: review.receiver_email,
                        images: review.receiver_images,
                        profile_image: review.receiver_profile_image,
                        age: review.receiver_age,
                        role: review.receiver_role,
                        block_status: review.receiver_block_status,
                        deleted_status: review.receiver_deleted_status,
                        reported_status: review.receiver_reported_status,
                    },
                    reviews: [],
                });
            }
            reviewsMap.get(key).reviews.push({
                id: review.id,
                review: review.review,
                created_at: review.created_at,
                updated_at: review.updated_at,
            });
        });

        // Convert map values to an array for response
        const groupedReviews = Array.from(reviewsMap.values());

        // Respond with the list of grouped reviews along with count
        res.status(200).json({
            error: false,
            count: reviewsBySenderResult.rows.length,
            data: groupedReviews,
        });
    } catch (error) {
        console.error('Error fetching reviews by sender:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getReviewsBySenderReceiver = async (req, res) => {
    try {
        const senderId = req.params.sender_id;
        const receiverId = req.params.receiver_id;

        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        // Retrieve reviews with sender and receiver details for a specific sender and receiver
        const getReviewsBySenderReceiverQuery = `
            SELECT 
                cr.sender_id,
                u_sender.name AS sender_name,
                u_sender.email AS sender_email,
                u_sender.images AS sender_images,
                u_sender.profile_image AS sender_profile_image,
                u_sender.gender AS sender_gender,
                u_sender.age AS sender_age,
                u_sender.role AS sender_role,
                u_sender.block_status AS sender_block_status,
                u_sender.deleted_status AS sender_deleted_status,
                u_sender.reported_status AS sender_reported_status,
                cr.receiver_id,
                u_receiver.name AS receiver_name,
                u_receiver.email AS receiver_email,
                u_receiver.images AS receiver_images,
                u_receiver.profile_image AS receiver_profile_image,
                u_receiver.gender AS receiver_gender,
                u_receiver.age AS receiver_age,
                u_receiver.role AS receiver_role,
                u_receiver.block_status AS receiver_block_status,
                u_receiver.deleted_status AS receiver_deleted_status,
                u_receiver.reported_status AS receiver_reported_status,
                cr.id,
                cr.review,
                cr.created_at,
                cr.updated_at
            FROM 
                chat_review cr
            INNER JOIN 
                users u_sender ON cr.sender_id = u_sender.id
            INNER JOIN 
                users u_receiver ON cr.receiver_id = u_receiver.id
            WHERE 
                cr.sender_id = $1
                AND cr.receiver_id = $2
            ORDER BY cr.id
            LIMIT $3 OFFSET $4
        `;
        const reviewsBySenderReceiverResult = await pool.query(
            getReviewsBySenderReceiverQuery,
            [senderId, receiverId, limit, offset]
        );

        // Group reviews by sender and receiver
        const reviewsMap = new Map();
        reviewsBySenderReceiverResult.rows.forEach(review => {
            const key = `${review.sender_id}_${review.receiver_id}`;
            if (!reviewsMap.has(key)) {
                reviewsMap.set(key, {
                    sender: {
                        id: review.sender_id,
                        name: review.sender_name,
                        email: review.sender_email,
                        images: review.sender_images,
                        profile_image: review.sender_profile_image,
                        age: review.sender_age,
                        role: review.sender_role,
                        block_status: review.sender_block_status,
                        deleted_status: review.sender_deleted_status,
                        reported_status: review.sender_reported_status,
                    },
                    receiver: {
                        id: review.receiver_id,
                        name: review.receiver_name,
                        email: review.receiver_email,
                        images: review.receiver_images,
                        profile_image: review.receiver_profile_image,
                        age: review.receiver_age,
                        role: review.receiver_role,
                        block_status: review.receiver_block_status,
                        deleted_status: review.receiver_deleted_status,
                        reported_status: review.receiver_reported_status,
                    },
                    reviews: [],
                });
            }
            reviewsMap.get(key).reviews.push({
                id: review.id,
                review: review.review,
                created_at: review.created_at,
                updated_at: review.updated_at,
            });
        });

        // Convert map values to an array for response
        const groupedReviews = Array.from(reviewsMap.values());

        // Respond with the list of grouped reviews along with count
        res.status(200).json({
            error: false,
            count: reviewsBySenderReceiverResult.rows.length,
            data: groupedReviews,
        });
    } catch (error) {
        console.error('Error fetching reviews by sender and receiver:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const updateReview = async (req, res) => {
    const { reviewId, review } = req.body;

    try {
        // Check if the review with the specified ID exists
        const reviewExistQuery = 'SELECT * FROM chat_review WHERE id = $1';
        const reviewExistResult = await pool.query(reviewExistQuery, [reviewId]);

        if (reviewExistResult.rows.length === 0) {
            // If the review does not exist, return an error response
            return res.status(404).json({ error: true, msg: 'Review not found.' });
        }

        // Update the review in the chat_review table
        const updateReviewQuery = `
            UPDATE chat_review
            SET review = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;
        const updatedReviewResult = await pool.query(updateReviewQuery, [review, reviewId]);

        // Respond with the updated review
        res.status(200).json({ msg: 'Review updated successfully', error: false, data: updatedReviewResult.rows[0] });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const deleteReview = async (req, res) => {
    const reviewId = req.params.review_id;

    try {
        // Check if the review with the specified ID exists
        const reviewExistQuery = 'SELECT * FROM chat_review WHERE id = $1';
        const reviewExistResult = await pool.query(reviewExistQuery, [reviewId]);

        if (reviewExistResult.rows.length === 0) {
            // If the review does not exist, return an error response
            return res.status(404).json({ error: true, msg: 'Review not found.' });
        }

        // Delete the review from the chat_review table
        const deleteReviewQuery = 'DELETE FROM chat_review WHERE id = $1 RETURNING *';
        const deletedReviewResult = await pool.query(deleteReviewQuery, [reviewId]);

        // Respond with the deleted review
        res.status(200).json({ msg: 'Review deleted successfully', error: false, data: deletedReviewResult.rows[0] });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
};

const getMaximumReviewForReceivers = async (req, res) => {
    try {
        const result = await pool.query(`
          SELECT u.*, STRING_AGG(cr.review, ' ') AS reviews
          FROM Users u
          JOIN chat_review cr ON u.id = cr.receiver_id
          WHERE cr.created_at >= NOW() - INTERVAL '7 days'
          GROUP BY u.id
          ORDER BY COUNT(DISTINCT cr.sender_id) DESC
          LIMIT 1;
        `);

        const maxReviewsReceiverDetails = result.rows[0];

        // Extract text using textract
        textract.fromBufferWithName('fake.txt', Buffer.from(maxReviewsReceiverDetails.reviews), (err, text) => {
            if (err) {
                console.error('Error extracting text:', err);
                res.status(500).send({ error: true, msg: 'Internal Server Error' });
                return;
            }

            // Include only required details in the response
            const response = {
                id: maxReviewsReceiverDetails.id,
                name: maxReviewsReceiverDetails.name,
                email: maxReviewsReceiverDetails.email,
                images: maxReviewsReceiverDetails.images,
                profile_image: maxReviewsReceiverDetails.profile_image,
                age: maxReviewsReceiverDetails.age,
                gender: maxReviewsReceiverDetails.gender,
                reveiw: text,
            };

            res.json({ error: false, data: response });
        });
    } catch (error) {
        console.error('Error fetching max reviews receiver details:', error);
        res.status(500).send({ error: true, msg: 'Internal Server Error' });
    }
};

module.exports = { addreview, getAllChatReviews, getReviewsBySender, getReviewsBySenderReceiver, updateReview, deleteReview, getMaximumReviewForReceivers };