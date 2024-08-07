const express = require("express");
const router = express.Router();
const userController = require("../../controllers/usercontroller");
const userControllerNew = require("../../controllers/usercontrollerNew");

router.post("/v1/usersignup", userController.usersignup);
router.post("/v1/usersignin", userController.usersignin);
router.get("/v1/getallusers", userController.getallusers);
router.get("/v1/getrandomusers/:userId", userController.getRandomUsers);
router.put(
  "/v1/update/online/status/:id",
  userController.updateUserOnlineStatus
);
router.get("/v1/getuserbyID/:id", userController.getuserbyID);
router.post("/v1/forgetpassword", userController.forgetPassword);
router.post("/v1/verifyOTP", userController.verifyOTP);
router.put("/v1/updatePassword", userController.updatePassword);
router.put("/v1/updateProfile/:id", userController.updateProfile);
router.post("/v1/createUserLocation", userController.createUserLocation);
router.delete("/v1/deleteUserPermanently/:id", userController.deleteUser);
router.delete(
  "/v1/deleteUserTemporarily/:id",
  userController.deleteuserTemporarily
);
router.get("/v1/getalldeletedusers", userController.getalldeletedusers);
router.put("/v1/updateUserStatus/:id", userController.updateUserBlockStatus);
router.put(
  "/v1/updateProfileCompletion/:id",
  userController.updateProfileCompletion
);
router.post("/v1/searchUserByName", userController.searchUserByName);
router.get("/v1/getMatchUsers", userController.getMatchUsersController);
// newMatchAlgo
router.get("/v1/newMatchAlgo", userController.newMatchAlgo);
router.get("/v1/newMatchAlgo2", userControllerNew.newMatchAlgo2);
router.post("/v1/disQualifyUser", userController.disQualifyUser);



router.get("/v1/getLogMatchUsers", userController.getMatchUsersFromLog);
router.get("/v1/getLogMatchUsersForChat", userController.getMatchUsersForChat);
router.post("/v1/answerTheCall", userController.answerTheCall);
router.post("/v1/endTheCall", userController.endTheCall);
// joker funciton
router.get("/v1/getUsersforJokerCard", userController.getUsersforJokerCard);

module.exports = router;
