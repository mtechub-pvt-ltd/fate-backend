const express = require('express');
const router = express.Router();
const subscriptionController = require("../../controllers/subscriptionController");

router.post('/v1/create', subscriptionController.createsubscription);
router.put('/v1/update', subscriptionController.updatesubscription);
router.get('/v1/get/subscription/list', subscriptionController.getsubscriptionList); 
router.get('/v1/get/subscription/ByID/:id', subscriptionController.getsubscriptionByID); 
router.delete('/v1/delete/subscription/:id', subscriptionController.deleteSubscription);     

module.exports = router;