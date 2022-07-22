const express = require('express');
const userRouter = express.Router();
const User = require('../models/userModel');
const EmailVerification = require('../models/userEmailverification')
const nodemailer = require("nodemailer");
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const securePassword = async (password) => {
    const passwordHash = await bcrypt.hash(password, 10)
    return passwordHash;
}
const secureString = async (uniqueString) => {
    const stringHash = await bcrypt.hash(uniqueString,10)
    return stringHash;
}
const {v4 : uuidv4} = require('uuid');
const { Router } = require('express');
const transporter = nodemailer.createTransport({
    service : 'gmail',
    auth: {
      user: 'shaheedhamolshahi@gmail.com' , // generated ethereal user
      pass: 'thkgpudocbmdymjh', // generated ethereal password
    },
});

transporter.verify((err , success)=>{
    if(err) console.log(err);
    else{
        console.log('ready for messages');
        console.log(success);
    }
})

userRouter.get('/', (req, res) => {
    if (req.session.user) res.redirect('/home')
    else res.render('user/homepage');


});
userRouter.get('/register', (req, res) => {
    const message = req.flash('message')
    res.render('user/signup')


});

userRouter.post('/register', [
    check('name', 'Enter a name with minimum of 4 letters')
        .exists()
        .isLength({ min: 4 }),
    check('email', 'Enter a valid email')
        .exists()
        .isEmail(),
    check('contact', 'Enter a 10 digit Mobile No.')
        .exists()
        .isNumeric()
        .isLength({ min: 10, max: 10 }),
    check('password', 'Password at least should be 6 characters')
        .exists()
        .isLength({ min: 6 }),
    check('cpassword', 'Password is not matching')
        .custom(async (cpassword, { req }) => {
            const password = req.body.password


            if (password !== cpassword) {
                throw new Error('Passwords must be same')
            }
        }),

], async (req, res) => {
    errors = validationResult(req)
    if (!errors.isEmpty()) {
        const alert = errors.array();
        res.render('user/signup', { alert })
    } else {
        const { name, email, contact, password, cpassword } = req.body;
        let user = await User.findOne({ email })

        if (user) {
            req.flash('message',`This Email is already registered  in the name '${user.name}'`)
            return res.redirect('/register')
        }
        const spassword = await securePassword(req.body.password)
        user = new User({
            name: req.body.name,
            email: req.body.email,
            contact: req.body.contact,
            password: spassword,
            verified: false,

        })
        
        user.save().then((result)=>{
            sendVerificationEmail(result,res);
            console.log(result);
        })
        .catch((err)=>{
            console.log(err);
        })
        // req.session.user = user

    }


});




userRouter.get('/verify',async (req,res)=>{

    let {userId , uniqueString} = req.query;
    console.log(userId);
    console.log(uniqueString);
    EmailVerification.find({userId})

    .then((result)=>{
        if(result.length>0){
            const {expiresAt} = result[0];
            const hashedString = result[0].uniqueString;
            if(expiresAt < Date.now()){
                console.log('expired');
                EmailVerification.deleteOne({userId})
                .then((result)=>{
                    User.deleteOne({_id: userId})
                    .then(()=>{
                        console.log('signup again due to expired link');
                        req.flash('message',`Your verification link has expired.Signup again`)

                        res.redirect('/register')
                    })
                    .catch((error)=>{
                        console.log('err in user deletion');

                    }) 
                })
                .catch((error)=>{
                    console.log(error);
                    console.log('err in deletion');
                })
            }else{
                bcrypt.compare(uniqueString,hashedString)
                .then((result)=>{
                    if(result){
                        User.updateOne({_id:userId},{$set:{verified:true}})
                        .then(()=>{
                            EmailVerification.deleteOne({userId})
                            .then(()=>{
                                req.flash('message','Your email has been verified.Go and Login now!')

                                res.redirect('/register')
                            })
                            .catch(error=>{
                                console.log(error);
                            })
                        })
                        .catch(error=>{
                            console.log(error);
                        })
                    }else{
                        req.flash('message',`Verification link is not valid.Signup again.`)

                        res.redirect('/register')
                    }
                })
                .catch((error)=>{
                    console.log(error);
                })
            }
        }else{
            req.flash('message',`No registered User found`)

            res.redirect('/register')
        }
    })
    .catch((error)=>{
        console.log(error);
        console.log('error in find');

    })

});

userRouter.get('/login', (req, res) => {

    if (req.session.user) { res.redirect('/home') }

    else {

        const message = req.flash('message')

        res.render('user/login') 

        }



})
userRouter.post('/login', [
    check('email', 'Enter valid email')
        .exists()
        .isEmail(),
    check('password', 'Enter your password')
        .exists()
        .isLength({ min: 6 })
], async (req, res) => {

    errors = validationResult(req)

    if (!errors.isEmpty()) {

        const alert = errors.array();

        res.render('user/login', { alert })

    } else {

        const { email, password } = req.body

        const userData = await User.findOne({ email })

        if (!userData) {

            req.flash('message','No User found!')
            return res.redirect('/login')


        }
        const passwordMatch = await bcrypt.compare(password, userData.password)
        if (!passwordMatch) {

            req.flash('message','Your Password is wrong!')

            return res.redirect('/login')


        }
        if(userData.verified !== true){
            req.flash('message','Your email is not verified! Go to your inbox and verify.')

            return res.redirect('/login')
        }
        req.session.user = userData


        res.redirect('/home')
    }

})
userRouter.get('/home', (req, res) => {

    console.log(req.session.user)

    if (req.session.user) {
        const user = req.session.user
        res.render('user/homepage', { user: user.name })
    } else {
        
        res.redirect('/login')

    }

})
 
userRouter.get('/logout', (req, res) => {
    req.session.destroy((err) => {

        if (err) throw err;
    })

        res.redirect("/login");
})


        
const sendVerificationEmail = async ({_id,email},res)=> {
    try {
        const url = "http://localhost:5000/"
        const uniqueString = uuidv4()
        const mailOptions = {
            from : 'shaheedhamolshahi@gmail.com',
            to : email,
            subject : 'Verify email',
            html : `<p>Please verify your email to complete the registration process.
             Click <a href="${url + 'verify?userId=' + _id + '&uniqueString=' + uniqueString}">here</a> to verify.
             <p>This link will <b>expire in 2 hrs</b>.</p>`
        };
        const hashedString = await secureString(uniqueString);
        const newEmailVerification = await new EmailVerification ({
            userId : _id,
            uniqueString : hashedString,
            createdAt : Date.now(),
            expiresAt : Date.now() + 1000 * 60 * 60 * 2
        })

        await newEmailVerification.save();
        await transporter.sendMail(mailOptions);

        res.redirect('/register')

    } catch (error) {
     console.log(error);   
    }
}




module.exports = userRouter