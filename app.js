const express = require("express");
const session = require('express-session');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require("path");
const mysql = require("mysql");
const dotenv = require("dotenv");
const { error } = require("console");

dotenv.config({path: './.env'})

const app = express();

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if you're using HTTPS
  }));

const db = mysql.createConnection({ 
    host: process.env.DATABASE_HOST,
    user:  process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
})

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({extended: false}));
app.use(express.json())

app.set('view engine', 'hbs');
app.use('/js', express.static(__dirname + '/public/js', { 'Content-Type': 'application/javascript' }));
app.use(bodyParser.json());

db.connect((error) => {
    if (error){
        console.log("Error: " + error)
    }
    else{
        console.log("MYSQL SUCCESSFULLY CONNECTED")
    }
}
)

app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

function getTutors() {
    return new Promise((resolve, reject) => {
        // Replace this with your actual database query logic
        db.query('SELECT Name, Username, About_Me, s.Subject, a.Day, a.start_time, a.end_time FROM Tutor as t LEFT JOIN Subject_List as s ON s.T_Username = t.Username LEFT JOIN Tutor_availability as a ON a.T_Username = t.Username', (error, results) => {
        if (error) {
            return reject(error);
        }
        resolve(results);
        });
    });
}
function getFavTutors(currUser) {
    //console.log("get fav: " + currUser);
    return new Promise((resolve, reject) => {
        // Replace this with your actual database query logic
        db.query('SELECT T_Username FROM User_Favorites WHERE U_Username = ?', [currUser], (error, results) => {
        if (error) {
            return reject(error);
        }
        console.log(results)
        resolve(results);
        });
    });
}
  

app.get('/auth/tutorList', async (req, res) => {
    console.log(req.session.username)
    if(req.session.username){
        const tutors = await getTutors()
        // db.query('', (err, results) => {
        //     if (err){
        //         console.log("ERROR: " + err)
        //     }
        //     else{
        //         console.log(results)
        //         //res.render('tutorList', {tutors: results});
        //     }
        // })
        const favTutors = (await getFavTutors(req.session.username)).map(row => row.T_Username);
        // db.query('SELECT T_Username FROM User_Favorites WHERE U_Username = ?', {U_Username: req.session.username}, (err, results1) =>{
        //     if(err){
        //         console.log("ERROR: " + err);
        //     }
        //     else{
        //         console.log(results1)
        //     }
        // })
        const tutorsWithFavorites = tutors.map(tutors => {
            return {
              ...tutors,
              isFavorite: favTutors.includes(tutors.Username)
            };
          });
        //console.log(tutorsWithFavorites)
        res.render('tutorList', {tutors: tutorsWithFavorites});
        
    }
    else{
        res.render('login', {message: "Please login to access page"})
    }
    
});

app.use(bodyParser.json());

app.post('/send-email', async (req, res) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'asjad.a.qadri@gmail.com',
            pass: 'sqqsenugiivtajrb' // Consider using environment variables or secrets management
        }
    });

    let mailOptions = {
        from: 'asjad.a.qadri@gmail.com',
        to: req.body.to,
        subject: req.body.subject,
        text: req.body.body
    };

    // try {
    //     await transporter.sendMail(mailOptions);
    //     res.status(200).send('Email sent successfully');
    // } catch (error) {
    //     res.status(500).send('Error sending email');
    // }
    transporter.sendMail(mailOptions, (error, info) => {
        if(error){
            console.log("ERROR: " + error)
        }
        else{
            console.log("Email sent successfully")
        }
    })
});

app.post('/add-to-favorites', (req, res) => {
    console.log(req.body.tutorId)
    console.log(req.session.username)
    const tutorEmail = req.body.tutorId;
    db.query('INSERT INTO User_Favorites SET ?', {T_Username: tutorEmail, U_Username: req.session.username}, (err, results) => {
        if (err){
            console.log("ERROR: " + err);
            res.json({ success: false });
        }
        else{
            console.log("Favorite added");
            res.json({ success: true });
        }
    })
    
});

app.post('/remove-from-favorites', (req, res) => {
    const tutorId = req.body.tutorId;
    console.log(tutorId);
    console.log(req.session.username);
    db.query('DELETE FROM User_Favorites WHERE T_Username = ? AND U_Username = ?', [tutorId, req.session.username], (err, results) => {
        if (err){
            console.log("ERROR: " + err);
            res.json({ success: false });
        }
        else{
            console.log("Favorite removed");
            res.json({ success: true });
        }
    })
});

app.get('/favorites', async (req, res) => {
    console.log(req.session.username)
    if(req.session.username){
        query = `SELECT f.T_Username, t.Name, s.subject, a.start_time, a.Day, a.end_time
                FROM User_Favorites as f
                LEFT JOIN Tutor as t on t.Username = f.T_Username
                LEFT JOIN Subject_List as s on s.T_Username = f.T_Username
                LEFT JOIN Tutor_availability as a on a.T_Username = f.T_Username
                WHERE f.U_Username = '${req.session.username}'`
        db.query(query, (err, results) =>{
            if (err){
                console.log("ERROR: " + err);
            }
            else{
                console.log(results)
                const tutorsWithFavorites = results.map(results => {
                    return {
                      ...results,
                      isFavorite: true
                    };
                });
                res.render('favorites', {tutors: tutorsWithFavorites})
            }
        })
    }
    else{
        res.render('login', {message: "Please login to access page"})
    }
    
});

app.get('/twofa', (req, res) => {
    console.log(req.session.username)
    if(!req.session.username){
        res.render('login', {message: 'Please login to access this page'})   
    }
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
})