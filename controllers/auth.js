const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');

const db = mysql.createConnection({ 
    host: process.env.DATABASE_HOST,
    user:  process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME 
})

exports.register = (req, res) => {
    console.log(req.body);

    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    const passwordconfirm = req.body.passwordconfirm
    const type = req.body.type

    if (type == 'tutor'){
        const tutorAbout = req.body.tutorAbout;
        const tutorSubjects = req.body.tutorSubjects;
        const tutorDays = req.body.tutorDays;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
    }

    db.query('SELECT Username from Users where Username = ?', [email], async (err, results) =>{
        console.log(results)
        if(err){
            console.log("ERROR: " + err)
        }
        if(results.length > 0){
            return res.render('register', {
                message: 'Email already in use'
            })
        }
        else if(password !== passwordconfirm){
            return res.render('register', {
                message: 'Passwords do not match'
            })
        }

        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword)

        if(type == 'student'){
            db.query('INSERT INTO Users SET ? ', {Name: name, Username: email, Password: hashedPassword}, (err, results) =>{
                if(err){
                    console.log("ERROR: "+ err);
                }
                else{
                    res.render('login', {
                        message: 'User successfully registered'
                    })
                }
            })
        }
        else{
            res.render('tutorCriminalCheck', {
                email: req.body.email, 
                password: hashedPassword,
                name: req.body.name,
                tutorAbout: req.body.tutorAbout,
                tutorSubjects: req.body.tutorSubjects,
                tutorDays: req.body.tutorDays,
                startTime: req.body.startTime,
                endTime: req.body.endTime
            })
            // db.query('INSERT INTO Tutor SET ? ', {Name: name, Username: email, Password: hashedPassword}, (err, results) =>{
            //     if(err){
            //         console.log("ERROR: "+ err);
            //     }
            //     else{
            //         res.render('login', {
            //             message: 'User successfully registered'
            //         })
            //     }
            // })
        }
        
    }) 

}

exports.login = (req, res) => {
    console.log(req.body);
    const email = req.body.email
    const password = req.body.password

    db.query('SELECT Username, Password, Name from Users where Username = ?', [email], async (err, results) =>{
        console.log(results)
        if(err){
            console.log("ERROR: " + err)
        }
        if(results.length == 0){
            db.query('SELECT Username, Password, Name from Tutor where Username = ?', [email], async (err, results) =>{
                console.log(results[0])
                if(err){
                    console.log("ERROR: " + err)
                }
                if(results.length == 0){
                    return res.render('login', {
                        message: 'Email has not been registered'
                    })
                }
                let match = await bcrypt.compare(password, results[0].Password)
                console.log(match)
                if(match){
                    req.session.username = email;
                    res.locals.username = req.session.username;
                    return res.render('twofa', {type: 'tutor'});
                } else {
                    return res.render('login', {
                        message: 'Invalid password'
                    });
                }
            })
            // return res.render('login', {
            //     message: 'Email has not been registered'
            // })
        }
        else{
            let match = await bcrypt.compare(password, results[0].Password)
            console.log(match)
            if(match){
                req.session.username = email;
                res.locals.username = req.session.username;
                return res.render('twofa', {type: 'student'})
                // return res.redirect('tutorList');
            } else {
                return res.render('login', {
                    message: 'Invalid password'
                });
            }
        }


    })
    
}

exports.tutorCriminalCheck = (req, res) => {
    console.log(req.body);

    const {name, email, password, tutorAbout, tutorSubjects, tutorDays, startTime, endTime, felony, misdemeanor, arrested, drug, sex, currentCharges, whiteCollar} = req.body;
    if(felony == 'yes' || misdemeanor == 'yes' || arrested == 'yes' || drug == 'yes' || sex == 'yes' || currentCharges == 'yes' || whiteCollar == 'yes'){
        return res.render('register', {
            message: 'User cannot be registered due to failed criminal background check'
        })
    }
    else{
        db.query('INSERT INTO Tutor SET ? ', {Name: name, Username: email, Password: password, About_Me: tutorAbout}, (err, results) =>{
            if(err){
                console.log("ERROR: "+ err);
            }
        })
        db.query('INSERT INTO Subject_List SET ?', {T_Username: email, Subject: tutorSubjects}, (err, results) =>{
            if(err){
                console.log("ERROR: " + err);
            }
        });
        db.query('INSERT INTO Tutor_availability SET ?', {T_Username: email, Day: tutorDays, start_time: startTime, end_time: endTime}, (err, results) => {
            if(err){
                console.log("ERROR: " + err);
            }
            else{
                res.render('login', {
                    message: 'User successfully registered'
                })
            }
        });
        
    }

}

exports.tutorList = (req, res) => {
    console.log(req.body);

}

exports.twofa = (req, res) => {
    console.log(req.body)
    console.log(req.session.username)
    req.session.loggedIn = true;
    if(req.body.type == 'student'){
        return res.redirect('tutorList')
    }
    else{
        return res.redirect('profile')
    }
}

function getCurrAppointments(tutorID, date){
    return new Promise((resolve, reject) => {
        db.query('SELECT Start_Time, End_Time FROM Appointment_List WHERE T_Username = ? AND Date = ?;', [tutorID, date], (error, results) => {
        if (error) {
            return reject(error);
        }
        console.log(results)
        resolve(results);
        });
    });
}

function getUserAppointments(currUser, date){
    return new Promise((resolve, reject) => {
        db.query('SELECT Start_Time, End_Time FROM Appointment_List WHERE U_Username = ? AND Date = ?;', [currUser, date], (error, results) => {
        if (error) {
            return reject(error);
        }
        console.log(results)
        resolve(results);
        });
    });
}

function isTimeSlotAvailable(tutorAppointments, userAppointments, proposedStart, proposedEnd) {
    // Function to convert time in 'HH:MM' format to minutes since midnight
    function timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Convert proposed times to minutes
    const proposedStartMinutes = timeToMinutes(proposedStart);
    const proposedEndMinutes = timeToMinutes(proposedEnd);

    // Function to check for overlap in an array of appointments
    function checkOverlap(appointments, userType) {
        for (let appointment of appointments) {
            const startMinutes = timeToMinutes(appointment.Start_Time);
            const endMinutes = timeToMinutes(appointment.End_Time);

            // Check for overlap
            if (proposedStartMinutes < endMinutes && proposedEndMinutes > startMinutes) {
                return { available: false, overlappingUser: userType };
            }
        }
        return { available: true };
    }

    // Check for overlaps in both tutor and user appointments
    const tutorOverlap = checkOverlap(tutorAppointments, 'tutor');
    if (!tutorOverlap.available) return tutorOverlap;

    const userOverlap = checkOverlap(userAppointments, 'user');
    if (!userOverlap.available) return userOverlap;

    return { available: true }; // No overlap found
}

function getUserName(currUser){
    return new Promise((resolve, reject) => {
        db.query('SELECT Name FROM Users WHERE Username = ?;', [currUser], (error, results) => {
        if (error) {
            return reject(error);
        }
        console.log(results)
        resolve(results);
        });
    });
}

exports.appointment = async (req, res) => {
    console.log(req.body)
    let currAppointments = await getCurrAppointments(req.body.tutorUser, req.body.date);
    let currUserAppointments = await getUserAppointments(req.session.username, req.body.date);
    let name = await getUserName(req.session.username);

    const isAvailable = isTimeSlotAvailable(currAppointments, currUserAppointments,req.body.appStartTime, req.body.appEndTime);
    console.log(isAvailable)

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'tutoring.everywhere.cs@gmail.com',
            pass: 'wawuwlauzhehwouc' // Consider using environment variables or secrets management
        }
    });

    if(isAvailable.available){
        db.query('INSERT INTO Appointment_List SET ?', {T_Username: req.body.tutorUser, Date: req.body.date, Start_Time: req.body.appStartTime, U_Username: req.session.username, End_Time: req.body.appEndTime}, (err, results) => {
            if(err){
                console.log("ERROR: " + err);
            }
            else{
                console.log('Appointment made')
                var tutorEmailBody = `
                    You have a new appointment.

                    Appointment Details:
                    Student: ${name[0].Name}
                    Subject: ${req.body.subject}
                    Date: ${req.body.date}
                    Start Time: ${req.body.appStartTime}
                    End Time: ${req.body.appEndTime}

                    To cancel this appointment, please log into your account and go to your profile.
                `

                var userEmailBody = `
                Your appointment has been scheduled successfully.

                Appointment Details:
                Tutor: ${req.body.name}
                Subject: ${req.body.subject}
                Date: ${req.body.date}
                Start Time: ${req.body.appStartTime}
                End Time: ${req.body.appEndTime}

                To cancel this appointment, please log into your account and go to your profile.
                `
            
                let tutorMailOptions = {
                    from: 'asjad.a.qadri@gmail.com',
                    to: req.body.tutorUser,
                    subject: "New Appointment - Tutoring Everywhere",
                    text: tutorEmailBody
                };

                let userMailOptions = {
                    from: 'asjad.a.qadri@gmail.com',
                    to: req.session.username,
                    subject: "New Appointment - Tutoring Everywhere",
                    text: userEmailBody
                };
            
                transporter.sendMail(tutorMailOptions, (error, info) => {
                    if (error) {
                      console.log('Error sending email: ' + error);
                    } else {
                      console.log('Email sent: ' + info.response);
                    }
                });

                transporter.sendMail(userMailOptions, (error, info) => {
                    if (error) {
                      console.log('Error sending email: ' + error);
                    } else {
                      console.log('Email sent: ' + info.response);
                    }
                });
                res.redirect('/userProfile?message=Appointment+set+successfully')
            }
        });
    }
    else{
        const subjectArray = JSON.parse(req.body.subjectArray);
        if(isAvailable.overlappingUser == 'tutor'){
            let timeSlotsString = currAppointments.map(appointment => {
                return `${appointment.Start_Time} to ${appointment.End_Time}`;
            }).join(', ');
            var errorMessage = "The tutor is not available at the selected time. Please select a different time. Current appointments: " + timeSlotsString;
        }
        else{
            let timeSlotsString = currUserAppointments.map(appointment => {
                return `${appointment.Start_Time} to ${appointment.End_Time}`;
            }).join(', ');
            var errorMessage = "You already have a booking at this date and time. Please select a different time. Current appointments: " + timeSlotsString;
        }
        res.render('appointment', {
            tutorUser: req.body.tutorUser, 
            name: req.body.name, 
            startTime: req.body.startTime, 
            endTime: req.body.endTime,
            subjectArray: subjectArray, // This should be an array of subjects
            daysString: req.body.daysString, // This is a string of days, e.g., "Monday, Wednesday, Friday"
            errorMessage: errorMessage
        });
    }
        
}