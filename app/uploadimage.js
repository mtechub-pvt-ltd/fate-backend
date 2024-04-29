const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDirectory = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { type } = req.body;

        console.log(type);

        if (!type) {
            return cb(new Error("Missing 'type' parameter"), null);
        }

        const destinationPath = path.join(uploadDirectory, type);

        if (!fs.existsSync(destinationPath)) {
            fs.mkdirSync(destinationPath, { recursive: true });
        }

        cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
        const originalFileName = file.originalname;
        cb(null, originalFileName);
    },
});

const upload = multer({ storage: storage });

const imageUploadRouter = express.Router();

imageUploadRouter.post('/', upload.single('image'), (req, res) => {
    if (req.file) {
        res.json({ status: true, imageUrl: `uploadimage/${req.body.type}/${req.file.filename}` });
    } else {
        res.status(400).json({ status: false, error: 'No file uploaded' });
    }
});

imageUploadRouter.use('/image', express.static(uploadDirectory));

module.exports = imageUploadRouter;