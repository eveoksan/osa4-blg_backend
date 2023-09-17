const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')


usersRouter.get('/', async (request, response) => {
  const users = await User
  .find({}).populate('blogs', { title: 1, author: 1, url: 1, likes: 1 })

  response.json(users)
})


usersRouter.post('/', async (request, response) => {
  const { username, name, password } = request.body

  const existingUser = await User.findOne({ username })
  if (existingUser) {
    return response.status(400).json({
      error: 'Username must be unique'
    })
  }

  if (!username || !password) {
    return response.status(400).json({ error: 'Please provide both username and password' }).end()
  }

  if (password.length < 3) {
    return response.status(400).json({ error: 'Password must be at least 3 characters long' }).end()
  }
  if (username.length < 3) {
    return response.status(400).json({ error: 'Username must be at least 3 characters long' }).end()
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const user = new User({
    username,
    name,
    passwordHash,
  })

  const savedUser = await user.save()

  response.status(201).json(savedUser)
})


module.exports = usersRouter