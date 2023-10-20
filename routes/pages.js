const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
})

router.get('/register', (req, res) => {
    res.render('register');
})

router.get('/login', (req, res) => {
    res.render('login');
})

router.get('/tutorList', (req, res) => {
    res.redirect('tutorList');
})

router.get('/tutorCriminalCheck', (req, res) => {
    res.render('tutorCriminalCheck');
})

module.exports = router;