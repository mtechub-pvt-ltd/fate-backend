const express = require('express');
const router = express.Router();
const imageController = require("../../controllers/imageController");

const multer = require('multer');
// this si hereo

const upload = multer({ dest: 'uploads/' });

router.post('/v1/uploadimage', upload.single('image'), imageController.uploadimage);
router.delete('/v1/deleteimage', imageController.deleteimage);
router.get('/v1/getAllimages', imageController.getAllimages);

module.exports = router;