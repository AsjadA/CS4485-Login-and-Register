const express = require("express");
const session = require('express-session');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require("path");
const mysql = require("mysql");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const multer = require('multer');
const { error } = require("console");

dotenv.config({path: './.env'})

const app = express();

const upload = multer({ storage: multer.memoryStorage() });

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
    if(req.session.loggedIn){
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
    if(req.session.loggedIn){
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

function getName(currUser, type){
    if(type == 'student'){
        return new Promise((resolve, reject) => {
            // Replace this with your actual database query logic
            db.query('SELECT Name, Hours_tutored FROM Users WHERE Username = ?', [currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
    else{
        return new Promise((resolve, reject) => {
            // Replace this with your actual database query logic
            db.query('SELECT Name, Hours_Tutored, About_Me, image FROM Tutor WHERE Username = ?', [currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            else{
                if (results[0].image) {
                    // Convert the image buffer to a base64 string
                    const imageBase64 = results[0].image.toString('base64');
                    // Prepare a data URI for the image
                    results[0].imageDataUri = `data:image/png;base64,${imageBase64}`;
                    // Replace 'image/png' with the correct MIME type if necessary
                }
                else{
                    results[0].imageDataUri = "https://bootdey.com/img/Content/avatar/avatar1.png"
                }
            }
            console.log(results)
            resolve(results);
            });
        });
    }
    
}

function getAppointments(currUser, type){
    if(type == 'student'){
        return new Promise((resolve, reject) => {
            // Replace this with your actual database query logic
            db.query('SELECT a.Date, a.Start_Time, a.End_Time,t.Name, t.Username FROM Appointment_List as a INNER JOIN Tutor as t WHERE a.U_Username = ? AND t.Username = a.T_Username;', [currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
    else{
        return new Promise((resolve, reject) => {
            // Replace this with your actual database query logic
            db.query('SELECT a.Date, a.Start_Time, a.End_Time, u.Name, u.Username FROM Appointment_List as a INNER JOIN Users as u WHERE a.T_Username = ?  AND u.Username = a.U_Username', [currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
    
}

function getHours(currUser, type){
    if(type == 'student'){
        return new Promise((resolve, reject) => {
            // Replace this with your actual database query logic
            db.query(`SELECT COALESCE(sec_to_time(SUM((time_to_sec(End_Time) - time_to_sec(Start_Time)))), '00:00:00') AS Total_Hours_Tutored FROM Appointment_List WHERE Date < NOW() AND U_Username = ?;`, [currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
    else{
        return new Promise((resolve, reject) => {
            // Replace this with your actual database query logic
            db.query(`SELECT COALESCE(sec_to_time(SUM((time_to_sec(End_Time) - time_to_sec(Start_Time)))), '00:00:00') AS Total_Hours_Tutored FROM Appointment_List WHERE Date < NOW() AND T_Username = ?;`, [currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
}

function updateUserHours(currUser, type, userHours){
    let totalHours = userHours[0].Total_Hours_Tutored;
    console.log(totalHours)
    const parts = totalHours.split(':');

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10) / 60;
    const seconds = parseInt(parts[2], 10) / 3600;

    const totalTime = hours + minutes + seconds;
    if(type == 'student'){
        return new Promise((resolve, reject) => {
            // Replace this with your actual database query logic
            db.query(`UPDATE Users SET Hours_Tutored = ? Where Username = ? ;`, [totalTime, currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
    else{
        return new Promise((resolve, reject) => {
            // Replace this with your actual database query logic
            db.query(`UPDATE Tutor SET Hours_Tutored = ? Where Username = ? ;`, [totalTime, currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
}

app.get('/userProfile', async (req, res) => {
    console.log(req.session.username)

    if(req.session.loggedIn){
        const hours = await getHours(req.session.username, 'student')
        const updateHours = await updateUserHours(req.session.username, 'student', hours)
        const name = await getName(req.session.username, 'student')
        const appointments = await getAppointments(req.session.username, 'student')
        console.log(appointments)
    
        appointments.forEach(packet => {
            // Parse the date and time strings
            const dateTimeString = `${packet.Date} ${packet.Start_Time}`;
            const dateTime = new Date(dateTimeString);
            
            // Get the current date and time
            const now = new Date();
            
            // Compare the dates and add the key-value pair
            packet.hasPassed = dateTime < now;
          });
          
        appointments.forEach(packet => {
            const now = new Date();
            const appointmentDateTime = new Date(`${packet.Date} ${packet.Start_Time }`);
            const dateTime = new Date(appointmentDateTime); 
            const hoursDiff = (dateTime - now) / 1000 / 60 / 60;
            if (hoursDiff <= 24) {
                packet.disableCancel = true;
            }
            else{
                packet.disableCancel = false;
            }
        });

        appointments.sort((a, b) => {
            // Assuming date is in the format 'MM/DD/YYYY'
            const dateA = new Date(a.Date);
            const dateB = new Date(b.Date);
            return dateA - dateB;
        }); 

        var upcomingCounter = 1;
        var pastCounter = 1;
        appointments.forEach((packet) => {
            if(!packet.hasPassed){
                packet.displayIndex = upcomingCounter;
                upcomingCounter++;
            }
            else{
                packet.displayIndex = pastCounter;
                pastCounter++;
            }
            
        });
          
        res.render('userProfile', {
            currName: name[0].Name, 
            email: req.session.username,
            hours: name[0].Hours_tutored,
            appointments: appointments,
            appMessage: req.query.message
        })
    }
    else{
        res.render('login', {message: "Please login to access page"})
    }
    
});

app.post('/delete-appointment', (req, res) => {
    console.log(req.body)
    if(req.body.type === 'tutor'){
        db.query('DELETE FROM Appointment_List Where U_Username = ? AND Date = ? AND Start_Time = ?', [req.body.studentEmail, req.body.appDate, req.body.appTime], (err, results) => {
            if (err){
                console.log("ERROR: " + err);
                res.json({ success: false });
            }
            else{
                console.log("Appontment canceled");
                res.json({ success: true });
            }
        })
    }
    else{
        db.query('DELETE FROM Appointment_List Where T_Username = ? AND Date = ? AND Start_Time = ?', [req.body.tutorEmail, req.body.appDate, req.body.appTime], (err, results) => {
            if (err){
                console.log("ERROR: " + err);
                res.json({ success: false });
            }
            else{
                console.log("Appontment canceled");
                res.json({ success: true });
            }
        })
    }
});

function getPassword(currUser, type){
    if(type === 'tutor'){
        return new Promise((resolve, reject) => {
            db.query('SELECT Password From Tutor Where Username = ?', [currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
    else{
        return new Promise((resolve, reject) => {
            db.query('SELECT Password From Users Where Username = ?', [currUser], (error, results) => {
            if (error) {
                return reject(error);
            }
            console.log(results)
            resolve(results);
            });
        });
    }
}

app.post('/change-password', async (req, res) => {
    console.log(req.body)

    const storedPass = await getPassword(req.session.username, req.body.type);
    let match = await bcrypt.compare(req.body.currPass, storedPass[0].Password)

    if(!match){
        console.log("incorrect curr password")
        res.json({ success: false, mismatch: true});
    }
    else{
        if(req.body.type === 'tutor'){
            let hashedPassword = await bcrypt.hash(req.body.newPass, 8);
            db.query('UPDATE Tutor SET Password = ? Where Username = ?', [hashedPassword, req.session.username], (err, results) =>{
                if (err){
                    console.log("ERROR: " + err);
                    res.json({ success: false, mismatch: false});
                }
                else{
                    console.log("Password updated");
                    res.json({success: true});
                }
            })
        }
        else{
            let hashedPassword = await bcrypt.hash(req.body.newPass, 8);
            db.query('UPDATE Users SET Password = ? Where Username = ?', [hashedPassword, req.session.username], (err, results) =>{
                if (err){
                    console.log("ERROR: " + err);
                    res.json({ success: false, mismatch: false});
                }
                else{
                    console.log("Password updated");
                    res.json({success: true});
                }
            })
        }
        
    }

});

app.get('/auth/profile', async (req, res) => {
    console.log(req.session.username)
    if(req.session.loggedIn){
        const hours = await getHours(req.session.username, 'tutor')
        const updateHours = await updateUserHours(req.session.username, 'tutor', hours)
        const name = await getName(req.session.username, 'tutor')
        const appointments = await getAppointments(req.session.username, 'tutor')
        //console.log(name[0].imageDataUri)

        appointments.forEach(packet => {
            // Parse the date and time strings
            const dateTimeString = `${packet.Date} ${packet.Start_Time}`;
            const dateTime = new Date(dateTimeString);
            
            // Get the current date and time
            const now = new Date();
            
            // Compare the dates and add the key-value pair
            packet.hasPassed = dateTime < now;
        });
            
        appointments.forEach(packet => {
            const now = new Date();
            const appointmentDateTime = new Date(`${packet.Date} ${packet.Start_Time}`);
            const dateTime = new Date(appointmentDateTime); 
            const hoursDiff = (dateTime - now) / 1000 / 60 / 60;
            if (hoursDiff <= 24) {
                packet.disableCancel = true;
            }
            else{
                packet.disableCancel = false;
            }
        });

        appointments.sort((a, b) => {
            // Assuming date is in the format 'MM/DD/YYYY'
            const dateA = new Date(a.Date);
            const dateB = new Date(b.Date);
            return dateA - dateB;
        });      

        var upcomingCounter = 1;
            var pastCounter = 1;
            appointments.forEach((packet) => {
                if(!packet.hasPassed){
                    packet.displayIndex = upcomingCounter;
                    upcomingCounter++;
                }
                else{
                    packet.displayIndex = pastCounter;
                    pastCounter++;
                }
                
            });
            
        res.render('profile', {
            currName: name[0].Name, 
            email: req.session.username,
            hours: name[0].Hours_Tutored,
            about: name[0].About_Me,
            imageDataUri: name[0].imageDataUri,
            appointments: appointments
        }) 
    }
    else{
        res.render('login', {message: "Please login to access page"})
    }
    
    
});

app.post('/change-about', async (req, res) => {
    console.log(req.body)
    db.query('UPDATE Tutor SET About_Me = ? Where Username = ?', [req.body.aboutMe, req.session.username], (err, results) =>{
        if (err){
            console.log("ERROR: " + err);
            res.json({ success: false});
        }
        else{
            console.log("About updated");
            res.json({success: true});
        }
    })

});

app.post('/upload-image', upload.single('image'), (req, res) => {
    if (req.file) {
        // Insert into database
        const sql = 'UPDATE Tutor SET image = ? WHERE Username = ?;';
        db.query(sql, [req.file.buffer, req.session.username], (error, results) => {
            if (error) {
                console.log("ERROR: " + error)
                res.json({success: false})
            }
            else{
                console.log("Upload success")
                res.json({success: true})
            }
            // res.status(200).json({ message: 'Image uploaded successfully' });
        });
    } else {
        res.status(400).json({ message: 'No file uploaded' });
    }
});

app.post('/delete-image', (req, res) => {
    // Insert into database
    const sql = 'UPDATE Tutor SET image = NULL WHERE Username = ?;';
    db.query(sql, [req.session.username], (error, results) => {
        if (error) {
            console.log("ERROR: " + error)
            res.json({success: false})
        }
        else{
            console.log("Delete success")
            res.json({success: true})
        }
    });
});

app.get('/logout', function(req, res){
    req.session.destroy(function(err) {
        if(err) {
        console.log(err);
        // handle error case...
        } else {
        console.log('Logged out');
        res.redirect('/'); // Redirect to the home page or login page after logout
        }
    });
});

function convertTo24Hour(timeStr) {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }

    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }

    return `${hours}:${minutes}`;
}

app.post('/make-appointment', async (req, res) => {
    try {
        console.log(req.body)
        const tutorUser = req.body.tutorId;
        const name = req.body.tutorName;
        var startTime = req.body.tutorStartTime;
        var endTime = req.body.tutorEndTime;
        const daysString = req.body.tutorDay;
        let subjectArray = req.body.tutorSubjects.split(', ')
        let daysArray = req.body.tutorDay.split(', ')

        const subjectArrayJSON = JSON.stringify(subjectArray);
        console.log(subjectArrayJSON)
        startTime = convertTo24Hour(startTime);
        endTime = convertTo24Hour(endTime);

        res.render('appointment', {
            tutorUser: tutorUser, 
            name: name, 
            startTime: startTime, 
            endTime: endTime, 
            subjectArray: subjectArray, 
            daysString: daysString,
            daysArray: daysArray,
            subjectArrayJSON: subjectArrayJSON
        });
    } catch (error) {
        console.error('Error in /make-appointment:', error);
        res.status(500).send('An error occurred');
    }
});


  
app.listen(3000, () => {
    console.log("Server started on port 3000");
})