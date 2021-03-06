const express = require('express');
const router = express.Router();
const passport = require('passport');
const loginController = require('../controller/loginController');

router.get('/', loginController.login);

router.post('/create_session',
    passport.authenticate('local', {
        failureRedirect: '/login'
        // failureFlash: 'Invalid username or password.'
    }), function (req, res) {
        // console.log("\nLogged in successfully");
        req.session.save(() => {
            res.status(200).redirect(`/user/profile/${req.user.user}`);
        })
    });


module.exports = router;
