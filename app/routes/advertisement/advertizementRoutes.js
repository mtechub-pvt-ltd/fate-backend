const express = require('express');
const router = express.Router();
const advertisementController = require("../../controllers/advertisementController");

router.post('/v1/create', advertisementController.createadvertisement);
router.put('/v1/update', advertisementController.updateAdvertisement);
router.get('/v1/get/list', advertisementController.getAdvetisementList);
router.get('/v1/get/Advetisement/ByID/:id', advertisementController.getAdvetisementByID); 
router.get('/v1/get/Advetisement/ByStatus/:status', advertisementController.getAdvetisementByStatus);   
router.delete('/v1/delete/Advetisement/:id', advertisementController.deleteAdvetisement); 

module.exports = router;