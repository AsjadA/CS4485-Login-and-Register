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
            db.query('INSERT INTO Tutor SET ? ', {Name: name, Username: email, Password: hashedPassword}, (err, results) =>{
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
        
    }) 

}

exports.login = (req, res) => {
    console.log(req.body);
    const email = req.body.email
    const password = req.body.password

    db.query('SELECT Username, Password from Users where Username = ?', [email], async (err, results) =>{
        console.log(results)
        if(err){
            console.log("ERROR: " + err)
        }
        if(results.length == 0){
            db.query('SELECT Username, Password from Tutor where Username = ?', [email], async (err, results) =>{
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
                    return res.render('index');
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
                return res.render('index');
            } else {
                return res.render('login', {
                    message: 'Invalid password'
                });
            }
        }


    })
    
}