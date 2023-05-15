const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../data/database');

const router = express.Router();

router.get('/', function (req, res) {
  res.render('welcome');
});

router.get('/signup', function (req, res) {
   let inputData=req.session.inputData;

   if(!inputData)
   {
      inputData={
        hasError:false,
        message:'',
        email:'',
        confirmEmail:'',
        password:''

      }
      return res.render('signup',{inputData:inputData});//If i will not write this then the line in 28 changes the session which forces resave in the database.
   }

   req.session.inputData=null;//So that if we get into another page and comes back again then it will not be stored

  
  res.render('signup',{inputData:inputData});
});

router.get('/login', async function (req, res) {
  let inputData=req.session.inputData;

  if(!inputData)
  {
      inputData=
      {
        hasError:false,
        message:'',
        email:'',
        password:''
      }
  }
  req.session.inputData=null;
  res.render('login',{inputData:inputData});
});

router.post('/signup', async function (req, res) {
  let formData = req.body;

  let email = formData.email;
  let confirmEmail = formData["confirm-email"];
  let password = formData.password;

  if (!email || !confirmEmail || !password || password.length < 6 || email !== confirmEmail) {
    req.session.inputData=
    {
      hasError:true,
      message:'Invalid-Input-Please check your data',
      email:email,
      confirmEmail:confirmEmail,
      password:password
    }

    req.session.save(function()
    {
       res.redirect('/signup');
    })//Here we saves the session in the database and a cookie is generated which holds the session id.With subsequent get requests the cookie is transferred always and
    //It searches the session by parsing the session id from cookie in the database and find out the session.
    return;
  }//If any of the conditions get matched up then redirect to signUp

 
  const checkEmail = await db.getDb().collection('users').findOne({ email: email });

  if (checkEmail) {
    req.session.inputData=
    {
      hasError:true,
      message:'EmailID already exists',
      email:email,
      confirmEmail:confirmEmail,
      password:password
    }

    req.session.save(function()
    {
      res.redirect('/signup');
    })

    return;
    
  }

  let hashedPassword = await bcrypt.hash(password, 12);

  //About Hashing and Encryption
  //Encryption is reversible, i.e what is encrypted can also be decrypted. Hashing, is one-way. It is irreversible. 
  //Hashing scrambles plain text to produce a unique message digest. If implemented using a strong algorithm, 
  //there is no way to reverse the hashing process to reveal the original password.It is irreversible in the sense that for each input you have exactly one output, but not the other way around. There are multiple inputs that yields the same output. 
  //To achieve this, irreversible math is used. For instance, it is easy to calculate 10%3. The answer to that is simply 10%3=1.
  // But if I give you the equation x%3=1, what would you do? This equation is true for all x=3*k+1. Thus, you cannot get the number I started with.
  
  let users = {
    email: email,
    password: hashedPassword
  }

  await db.getDb().collection('users').insertOne(users);

  res.redirect('/login');
});

router.post('/login', async function (req, res) {
  let formData = req.body;

  let email = formData.email;
  
  let password = formData.password;


  const existingUsers = await db.getDb().collection('users').findOne({ email: email });//If return null then it will be false

  if (!existingUsers) {
    req.session.inputData=
    {
      hasError:true,
      message:'Could not login-Please check your credentials',
      email:email,
      password:password
    }

    req.session.save(function(){
       res.redirect('/login');
    })
    return;
  }

  let passwordAreEqual = await bcrypt.compare(password, existingUsers.password)//So it takes a plain text and check if it can lead to a hashed text with using its hashed algorithm

  console.log(passwordAreEqual);
  if (!passwordAreEqual) {
    req.session.inputData=
    {
      hasError:true,
      message:'Invalid-Input-Please check your data',
      email:email,
      password:password
    }

    req.session.save(function(){
      res.redirect('/login');
    })
    return;
  }

  req.session.user={
    id:existingUsers._id,
    email:existingUsers.email
  }//Email can be used to get specific data for the user in other routes.So sessions which are having id and email are authenticated users.

  req.session.isAuthenticated=true;//It is not required as we can check the other two value is null or not for authentication

  req.session.save(function(){
    res.redirect('/admin');
  })//Once the session is stored in the database

});

router.get('/admin', function (req, res) {
  if(!req.session.isAuthenticated)//if(!req.session.user)
  {
      return res.status(401).render('401');
  }
  res.render('admin');
});

router.post('/logout',function (req, res){
  req.session.user=null;
  req.session.isAuthenticated=false;

  res.redirect('/');
 
});

module.exports = router;  
