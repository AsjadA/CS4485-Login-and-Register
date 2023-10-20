const express = require("express");
const session = require('express-session');
const path = require("path");
const mysql = require("mysql");
const dotenv = require("dotenv");

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

app.get('/auth/tutorList', (req, res) => {
    console.log(req.session.username)
    db.query('SELECT Name, Username, About_Me, s.Subject, a.Day, a.start_time, a.end_time FROM Tutor as t LEFT JOIN Subject_List as s ON s.T_Username = t.Username LEFT JOIN Tutor_availability as a ON a.T_Username = t.Username', (err, results) => {
        if (err){
            console.log("ERROR: " + err)
        }
        else{
            //console.log(results)
            res.render('tutorList', {tutors: results});
        }
    })
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
})