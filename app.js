const express = require('express');
const app = express();
const { models: { User, Note }} = require('./db');
const path = require('path');
require('dotenv').config();

// middleware
app.use(express.json());

// middleware function that takes in 3 parameters: req, res, next. It should extract the token from the request headers, make a call to byToken to get the user object, set the value of req.user to be that user's data, and call next() to pass the request along to the next middleware function in the chain
const requireToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const user = await User.byToken(token);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  };
};

// routes
app.get('/', (req, res)=> res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async(req, res, next)=> {
  try {
    res.send({ token: await User.authenticate(req.body)});
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/auth', requireToken, async(req, res, next)=> {
  // try {
  //   res.send(await User.byToken(req.headers.authorization));
  // }
  // catch(ex){
  //   next(ex);
  // }
  // Replace this logic with your own so that you verify the given token was signed by your app. If it was, you can use the data in the token to identify the user and pull all their information from the database. The route should ultimately return a full user object.
  res.send(req.user);
});

// route for retrieving a user's notes with securing the route by checking the User
app.get('/api/users/:userId/notes', requireToken, async(req, res, next) => {
  try {
    const { userId } = req.params;
    if(req.user.id === +userId) {
      const notes = await Note.findAll({
        where: { userId },
        attributes: ['text'],
      });
      res.send(notes);
    } else {
      next({ message: 'unauthorized' });
    }
  } catch (ex) {
    next(ex);
  }
});

// route for retrieving a user's notes without any security
// app.get('/api/users/:userId/notes', requireToken, async(req, res, next) => {
//   try {
//     const notes = await Note.findAll({
//       where: { userId: req.params.userId },
//       attributes: ['text'],
//     });
//     res.send(notes);
//   } catch (ex) {
//     next(ex);
//   }
// })

// error handling
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;