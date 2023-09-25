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
        console.log(hashedPassword);

        db.query('INSERT INTO Users SET ? ', {Name: name, Username: email, Password: hashedPassword}, (err, results) =>{
            if(err){
                console.log("ERROR: "+ err);
            }
            else{
                res.render('register', {
                    message: 'User successfully registered'
                })
            }
        })
    }) 

}

