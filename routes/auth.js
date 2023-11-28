const express = require('express');
const authController = require('../controllers/auth')
const router = express.Router();

router.post('/register', authController.register)

router.post('/login', authController.login)

router.post('/tutorCriminalCheck', authController.tutorCriminalCheck)

router.post('/tutorList', authController.tutorList)

router.post('/twofa', authController.twofa)

router.post('/appointment', authController.appointment)

module.exports = router;
