const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const helper = require('./test_helper')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Blog = require('../models/blog')
const User = require('../models/user')
const jwt = require('jsonwebtoken')


describe('when there is initially some blogs saved', () =>{

  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(helper.initialBlogs)
  })
  
  
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })
  
  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')
  
    expect(response.body).toHaveLength(helper.initialBlogs.length)
  })

  test('a specific blog is within the returned blogs', async () => {
    const response = await api.get('/api/blogs')

    const contents = response.body.map(r => r.title)
    expect(contents).toContain(
      'Go To Statement Considered Harmful'
    )
})

})

describe('viewing a specific blog', () => {

  test('a specific blog can be viewed', async () => {
    const blogsAtStart = await helper.blogsInDb()
  
    const blogToView = blogsAtStart[0]
  
    const resultBlog = await api
      .get(`/api/blogs/${blogToView.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)
  
    expect(resultBlog.body).toEqual(blogToView)
  })

 
  test('The id-field in correctly named as id instead of _id', async () => {
  const response = await api.get('/api/blogs')
  expect(response.body[0].id).toBeDefined()
})

  
  test('fails with statuscode 400 id is invalid', async () => {
    const invalidId = '5a3d5da59070081a82a3445'

    await api
      .get(`/api/blogs/${invalidId}`)
      .expect(400)
  })

})


describe('adding new blog', () => {
  test('a valid blog can be added ', async () => {
    const newBlog = {
      title: 'Cat Sitting On a Fence',
      author: 'eveoksan',
      url: 'http://testing.com',
      likes: 3,
      user: user
    }
    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)

  const title = blogsAtEnd.map(n => n.title)
  expect(title).toContain('Cat Sitting On a Fence')
  })
  
  test('blog without title is not added', async () => {
    const newBlog = {
      author: 'No One',
      url: 'www.nothing.com',
      likes: 1
    }
  
    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(400)
  
    const blogsAtEnd = await helper.blogsInDb()
  
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })
  test('blog without url is not added', async () => {
    const newBlog = {
      title: 'Absolutely Nothing',
      author: 'No One',
      likes: 1
    }
  
    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(400)
  
    const blogsAtEnd = await helper.blogsInDb()
  
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })

  test('Blog without likes get a zero as a result for likes', async () => {
    const newBlog = {
      title:"First class tests",
      author:"Robert C. Martin",
      url:"http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.htmll"
  }
  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)
  
  const blogsAtEnd = await helper.blogsInDb()

  expect(blogsAtEnd[helper.initialBlogs.length - 1].likes).toBe(0)
})

})



describe('deleting blog', () => {

  let token = null
  beforeEach(async () => {
    await Blog.deleteMany({})
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('password', 10)
    const user = new User({ username: 'jane', passwordHash })

    await user.save()

    await api
      .post('/api/login')
      .send({ username: 'jane', password: 'password' })
      .then((res) => {
        return (token = res.body.token)
      })

    const newBlog = {
      title: 'Another blog',
      author: 'Jane Doe',
      url: 'www.missing.com',
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    return token
  })

  test('a blog can be deleted', async () => {
    const blogsAtStart = await Blog.find({}).populate('user')

    const blogToDelete = blogsAtStart[0]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const blogsAtEnd = await Blog.find({}).populate('user')

    expect(blogsAtStart).toHaveLength(1)
    expect(blogsAtEnd).toHaveLength(0)
    expect(blogsAtEnd).toEqual([])
  })

  test('updating a blog post', async () => {
    const blogs = await helper.blogsInDb()
    const blogToUpdate = blogs[0]
    const updatedBlog = {
      title: blogToUpdate.title,
      author: blogToUpdate.author,
      url: blogToUpdate.url,
      likes: 100
    }
  
    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(updatedBlog)
      .expect(200)
  
    const updatedBlogs = await helper.blogsInDb()
    const updatedPost = updatedBlogs.find(post => post.id === blogToUpdate.id)
  
    expect(updatedPost.title).toEqual(updatedBlog.title)
    expect(updatedPost.author).toEqual(updatedBlog.author)
    expect(updatedPost.url).toEqual(updatedBlog.url)
    expect(updatedPost.likes).toEqual(updatedBlog.likes)
  })
 
})


describe('when there is initially one user at db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'mousey',
      name: 'Mickey Mouse',
      password: 'secret',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username)
  })
})

test('creation fails with proper statuscode and message if username too short', async () => {
  const usersAtStart = await helper.usersInDb()

  const newUser = {
    username: 'ro',
    name: 'Superuser',
    password: 'shhhhhh',
  }

  const result = await api
    .post('/api/users')
    .send(newUser)
    .expect(400)
    .expect('Content-Type', /application\/json/)

  expect(result.body.error).toContain('Username must be at least 3 characters long')

  const usersAtEnd = await helper.usersInDb()
  expect(usersAtEnd).toHaveLength(usersAtStart.length)
})




afterAll(async () => {
  await mongoose.connection.close() 
})