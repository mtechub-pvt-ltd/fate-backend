const pool = require("../config/dbconfig")
const cloudinary = require('cloudinary').v2;

// testing
// cloudinary.config({
//     cloud_name: 'dxfdrtxi3',
//     api_key: '899294253274324',
//     api_secret: 'dqKt9iSOVO65Pk7Rwbm7rqrqTyw'
// });

// personal
cloudinary.config({
    cloud_name: 'ddorrmob5',
    api_key: '692473286591324',
    api_secret: '3zHFr4sLAWnpDT3KU8BygKdl1Pk'
});

const uploadimage = async (req, res) => {
    const { user_id } = req.body;

    try {
        // Check if the user exists
        const userExistsQuery = 'SELECT * FROM Users WHERE id = $1';
        const userExists = await pool.query(userExistsQuery, [user_id]);

        if (userExists.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Upload the new image to Cloudinary
        const uploadedImage = await cloudinary.uploader.upload(req.file.path);

        // Insert new image details into the database
        const insertImageQuery = 'INSERT INTO images (user_id, cloudinary_id, url, description) VALUES ($1, $2, $3, $4)';
        const values = [user_id, uploadedImage.public_id, uploadedImage.secure_url, req.body.description || ''];
        await pool.query(insertImageQuery, values);

        res.json({ msg: 'Image uploaded successfully', error: false, user_id: user_id, cloudinary_id: uploadedImage.public_id, imageUrl: uploadedImage.secure_url });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: true, msg: 'An error occurred' });
    } finally {
        // Remove uploaded file from server
        if (req.file) {
            const fs = require('fs');
            fs.unlinkSync(req.file.path);
        }
    }
};

const deleteimage = async (req, res) => {
    const { user_id, cloudinary_id } = req.body;

    try {
        // Check if the user exists
        const userExistsQuery = 'SELECT * FROM Users WHERE id = $1';
        const userExists = await pool.query(userExistsQuery, [user_id]);

        if (userExists.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Check if the image exists for the user
        const imageExistsQuery = 'SELECT * FROM images WHERE user_id = $1 AND cloudinary_id = $2';
        const imageExists = await pool.query(imageExistsQuery, [user_id, cloudinary_id]);

        if (imageExists.rows.length === 0) {
            return res.status(404).json({ error: true, msg: 'Image not found for the user' });
        }

        // Delete the specified image from Cloudinary
        await cloudinary.uploader.destroy(cloudinary_id);

        // Delete the image record from the database
        const deleteImageQuery = 'DELETE FROM images WHERE user_id = $1 AND cloudinary_id = $2';
        await pool.query(deleteImageQuery, [user_id, cloudinary_id]);

        res.json({ msg: 'Image deleted successfully', error: false });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: true, msg: 'An error occurred' });
    }
};

const getAllimages = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        const allImagesQuery = `
          SELECT *
          FROM images 
          ORDER BY  id
          LIMIT $1 OFFSET $2
        `;

        const countQuery = 'SELECT COUNT(*) FROM images';
        const countResult = await pool.query(countQuery);
        const totalCount = parseInt(countResult.rows[0].count);

        const allImagesData = await pool.query(allImagesQuery, [limit, offset]);

        res.status(200).json({
            error: false,
            count: allImagesData.rows.length,
            data: allImagesData.rows,
        });
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: true, msg: 'An error occurred while fetching images.' });
    }
};

module.exports = { uploadimage, deleteimage, getAllimages };