const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt');
const { STRING } = Sequelize;
const config = {
  logging: false
};

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

const Note = conn.define('note', {
  text: STRING,
});

User.hasMany(Note);

User.beforeCreate(async (user, option) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;
})

User.byToken = async(token)=> {
  try {
    // use the jsonwebtoken function called verify to check that the given token is valid
    const { userId } = jwt.verify(token, process.env.JWT);
    // const user = await User.findByPk(token);
    // if token is valid, we can now query our database with the userId returned by verify and return the user object
    const user = await User.findByPk(userId);
    if(user){
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async({ username, password })=> {
  const user = await User.findOne({
    where: {
      username,
    }
  });
  // Use the bcrypt library to find out if the hashed password was hashed from the plain text password by using the compare function
  if(user && (await bcrypt.compare(password, user.password))){
    // return user.id; 
    // Replace the token placeholder (user.id) in the authenticate function with a JWT.
    return jwt.sign({ userId: user.id }, process.env.JWT);
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );

  // Create several notes and assign those notes to the seeded users
  const notes = [
    { text: 'hello world' },
    { text: 'reminder to buy groceries' },
    { text: 'reminder to do laundry' }
  ];
  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  await lucy.setNotes(note1);
  await moe.setNotes([note2, note3]);

  return {
    users: {
      lucy,
      moe,
      larry
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  }
};