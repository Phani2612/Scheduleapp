const Express = require('express')

require('dotenv').config(); // Load environment variables from .env file

const Mongoose = require('mongoose')

const {google} = require('googleapis')

const App = Express()

const axios = require('axios')

const dayjs = require('dayjs')

const uuid = require('uuid')

App.set('view engine', 'ejs')

App.use(Express.urlencoded())

App.use(Express.json())

App.set('views', './Views')

const JWT = require('jsonwebtoken')

const Cookieparser = require('cookie-parser')


App.use(Cookieparser())

const Bcrypt = require('bcryptjs')

const XSS = require('xss')

const Oauth2client = new google.auth.OAuth2(


    process.env.CLIENT_ID,

    process.env.CLIENT_SECRET,

    process.env.REDIRECT_URL


)


const scopes = [

    'https://www.googleapis.com/auth/calendar'
]


const Calendar = google.calendar({

    version : 'v3',
    auth : process.env.API_KEY

})



Mongoose.connect('mongodb+srv://Phani2612:2612@cluster0.nxfzz84.mongodb.net/ScheduleApp?retryWrites=true&w=majority&appName=Cluster0')


const loginSchema = new Mongoose.Schema({

      Email : {

          type : String
      },

      Password : {

          type : String
      }
})


const Registrationschema = new Mongoose.Schema({
     
       Email : {
           type : String
       },

       Password : {

           type : String
       },

       ConfirmPassword : {

          type : String
       }
})

const LoginModel = Mongoose.model("Login",loginSchema)


function Verifytoken(req,res,next)
{

    let fetchedJWT = req.cookies.token

    if(!fetchedJWT)
    {
        return res.redirect('/')
    }

    else{

         JWT.verify(fetchedJWT , "Welcome" , function(error)
        {
             if(error)
             {
                console.error(error)
             }

             else{

                 next()
             }
        })
    }

}





App.get('/' , function(req,res)
{
     res.render('login.ejs')
})


App.get('/register' , function(req,res)
{
     res.render('register.ejs')
})

App.get('/success' , Verifytoken ,function(req,res)
{
    res.render('success.ejs')
})

App.get('/home' ,Verifytoken, function(req,res)
{
    res.render('Home.ejs')
})


App.post('/' , async function(req,res)
{
      
const Entereddata = req.body
const EnteredEmail = XSS(req.body.email)

const result = await LoginModel.findOne({Email : EnteredEmail})

console.log(result)

if(result != null)
{
       const EnteredPassword = XSS(req.body.password)

       const ActualPassword = result.Password


       const Confirmation = await Bcrypt.compare(EnteredPassword , ActualPassword)

       if(Confirmation == true)
       {
            const JWTToken = JWT.sign(Entereddata , "Welcome" , {expiresIn : '2hr'})

            console.log(JWTToken)

            res.cookie('token',JWTToken)
            
            res.redirect('/google')
       }

       else{

           res.redirect('/')
       }
}


else{

      
    res.redirect('/register')
}






    // res.redirect('/google')
})



App.post('/register' , async function(req,res)
{ 

   const EnteredEmail = XSS(req.body.email)

   const EnteredPassword = XSS(req.body.password)

   const HashedPassword = await Bcrypt.hash(EnteredPassword , 12)

   console.log(HashedPassword)

   new LoginModel({

    Email : EnteredEmail,

    Password : HashedPassword

         
   }).save().then(function(output)
{
     console.log(output)

     res.redirect('/')
}).catch(function(error)
{
     console.error(error)
})
      
     
})










App.get('/google' , Verifytoken , function(req,res)
{
    const url = Oauth2client.generateAuthUrl({

          access_type : "offline",

          scope : scopes
    })


    res.redirect(url)
})



App.get('/google/redirect' , Verifytoken , async function(req,res)
{

    // console.log(req.query)

    const code = req.query.code


    const {tokens} = await Oauth2client.getToken(code)
    
    Oauth2client.setCredentials(tokens)


    res.render('Home.ejs')

})



App.post('/schedule', async function(req, res) {

    
    try {

        // console.log(req.body)

        const { event_title, event_datetime ,attendee_email , event_description} = req.body;
      
        const eventDateTime = new Date(event_datetime);

        const result = await Calendar.events.insert({
            calendarId: "primary",
            auth : Oauth2client ,
            conferenceDataVersion: 1,

            requestBody: {
                summary: event_title,
                description: event_description,
                start: {
                    dateTime: dayjs(eventDateTime).toISOString(),
                    timeZone: "Asia/Kolkata"
                },

                end: {
                    dateTime: dayjs(eventDateTime).add(1, 'hour').toISOString(), // Example: End time is 1 hour after the start time
                    timeZone: "Asia/Kolkata"
                },

                conferenceData: {
                    createRequest: {requestId: uuid.v4()}
                  },


                attendees : [{
                     
                    email : attendee_email
                }]

                

            }
        });
        // console.log(result.data);
        res.render('success.ejs');
    } catch (error) {
        console.error('Error creating event:', error.message);
        res.status(500).json({ error: error.message });
    }
});



App.listen(5000 , function(req,res)
{
    console.log("port running at 5000")
})
