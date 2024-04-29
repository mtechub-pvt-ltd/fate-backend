const express = require('express');
const router = express.Router();
const connectionsController = require("../../controllers/connectionsController");

router.post('/v1/createconnection', connectionsController.createconnection);
router.put('/v1/updateconnection', connectionsController.updateConnection);   
router.get('/v1/getAllConnections', connectionsController.getAllConnections);    
router.get('/v1/getConnectionsByUserID/:userId', connectionsController.getConnectionsByUserID);       

module.exports = router;