const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controller/userController');

router.get('/profile/:user', passport.checkAuthentication, userController.profile);
router.get('/remove/:_id', userController.remove_user);
router.get('/logout', userController.logout);
router.get('/user_info', userController.user_info);
router.get('/:username', userController.get_user);

router.post('/create', userController.create);
router.post('/update_details', userController.update_details);
router.post('/upload_avatar', passport.checkAuthentication, userController.upload_avatar);
router.post('/add_team_doc', userController.add_team_doc);
router.post('/add_alumni', userController.add_alumni);

router.get('*', userController.profile);
module.exports = router;
