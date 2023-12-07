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
    if(!req.session.loggedIn){
        res.render('login', {message: "Please login to access this page"})
    }
    else{
        res.redirect('tutorList')
    }
})

router.get('/tutorCriminalCheck', (req, res) => {
    res.render('tutorCriminalCheck');
})

router.get('/twofa', (req, res) => {
    if(!req.session.username){
        res.render('login', {message: "Please login to access this page"})
    }
    else{
        res.render('twofa');
    }
})

router.get('/profile', (req, res) => {
    if(!req.session.username){
        res.render('login', {message: "Please login to access this page"})
    }
    else{
        res.redirect('/auth/profile');
    }
})

router.get('/appointment', (req, res) => {
    if(!req.session.loggedIn){
        res.render('login', {message: "Please login to access this page"})
    }
    else{
        res.render('appointment');
    }
    
})

module.exports = router;
