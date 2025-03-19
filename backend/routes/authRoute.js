const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {check} = require('express-validator');
const authentication = require('../middlewares/authentication');


router.post('/create-user', [
	check('name', 'Name is required').not().isEmpty(),
	check('email', 'Email is required').isEmail(),
	check('password', 'Password is required').isLength({min: 6}),
	check('department', 'Department is required').not().isEmpty(),
	check('position', 'Position is required').not().isEmpty(),
	check('phoneNumber', 'Phone number is required').not().isEmpty()
], authController.createUser);

router.post('/login', [
	check('email', 'Email is required').isEmail(),
	check('password', 'Password is required').isLength({min: 6})
], authController.login);

router.post('/change-password', authentication, [
	check('currentPassword', 'Current password is required').isLength({min: 6}),
	check('newPassword', 'New password is required').isLength({min: 6})
], authController.changePassword);

router.put('/update-user/:userId', authentication, authController.updateUser);

// router.delete('/delete-user', authentication, authController.deleteUser);

router.post('/reset-password', [
	check('email', 'Email is required').isEmail()
], authController.resetPassword);

router.get('/get-user', authentication, authController.getUsers);
router.get('/get-user/:userId', authentication, authController.getUserId);


module.exports = router;
