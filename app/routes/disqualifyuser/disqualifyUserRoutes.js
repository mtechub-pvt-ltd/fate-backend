const express = require('express');
const router = express.Router();
const disqualifyUserController = require("../../controllers/disqualifyuserController");

router.post('/v1/disqualify', disqualifyUserController.disqualifyuser); 
router.get('/v1/getDisqualifyUsersList', disqualifyUserController.getDisqualifyUserList);
router.get('/v1/getUsersDisqualification/:user_id', disqualifyUserController.getUsersDisqualification);  
router.put('/v1/deleteDisqualification', disqualifyUserController.updatedisqualificationreason);    
router.delete('/v1/deleteDisqualification/:id', disqualifyUserController.deleteDisqualification);   
router.get('/v1/disqualified-users', disqualifyUserController.disqualifiedusers);          

module.exports = router;