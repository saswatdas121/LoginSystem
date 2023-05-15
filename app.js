const path = require('path');

const express = require('express');
const session=require('express-session');
const mongodbStore=require('connect-mongodb-session');

const db = require('./data/database');
const demoRoutes = require('./routes/demo');

const MongoDBStore=mongodbStore(session);

const app = express();

const sessionStore=new MongoDBStore({
  uri:'mongodb://localhost:27017',
  databaseName:'auth-demo',
  collection:'sessions'
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(session(
  {
    secret:'super-secret',
    resave:false,
    saveUninitialized:false,
    store:sessionStore,

  }
 
));//No session cookies will be generated for Empty session so no entry in database and no cookies will be generated
//The order of the middleware matters.We access req.session in this middleware 
//hence it has to be added after the middleware where the sesssion function is intialized in the incoming request.
app.use(function(req,res,next)
{
   let isAuth=req.session.isAuthenticated;
   
   if(!isAuth)
   {
      return next();//next middleware is called which is app.use(demoroutes)
   }
   res.locals.isAuth=isAuth;//The res.locals is an object that contains the local variables for the response which are scoped to the request only and 
   //therefore just available for the views rendered during that request or response cycle.It is availible by default to all our templates
   //(Please do futher research on this topic).
   //It runs for every incoming request so that before we are going to demoroutes,we just set these variables.Then we pass it to all template files(thats why we used res.locals).
   next();
     
})

  

app.use(demoRoutes);

app.use(function(error, req, res, next) {
  res.render('500');
})

db.connectToDatabase().then(function () {
  app.listen(3000);
});
