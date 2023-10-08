const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const User = require('../models/user')

/*
loginRouter.get("/", async(request, response)=>{
  const users = await User.find({})
      .populate("blogs", { title: 1, author: 1, url: 1 })

  response.json(users.map(u=>u.toJSON()))
})
*/

loginRouter.post('/', async (request, response) => {
  const { username, password } = request.body

  const user = await User.findOne({ username })
  const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password'
    })
  }

  const userForToken = {
    username: user.username,
    id: user._id,
  }

  const token = jwt.sign(userForToken, process.env.JWT_SECRET )//, { expiresIn: 60*60 })

  response
    .status(200)
    .send({ token: token, username: user.username, name: user.name })
})


module.exports = loginRouter