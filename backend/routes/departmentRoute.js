const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const authorization = require('../middlewares/authorizeAdmin');
const authentication = require('../middlewares/authentication');
const {check} = require('express-validator');

router.post('/create', [
	check('name').not().isEmpty().withMessage('Department name is required'),
	check('description').not().isEmpty().withMessage('Department description is required')
],authentication, authorization, departmentController.create);

router.put('/update/:departmentId', [
	check('name').not().isEmpty().withMessage('Department name is required'),
	check('description').not().isEmpty().withMessage('Department description is required')
],authentication, authorization, departmentController.update);


router.delete('/delete/:departmentId', authentication, authorization, departmentController.remove);

module.exports = router;