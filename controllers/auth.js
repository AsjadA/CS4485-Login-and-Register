const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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
                    return res.render('index'
                    // , {
                    //     email: email,
                    //     name: results[0].Name
                    // }
                    );
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
                return res.redirect('tutorList');
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