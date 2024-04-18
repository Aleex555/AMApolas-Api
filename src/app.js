const express = require('express');
const mongoose = require('mongoose');
const dbConfig = require('./config/db');
const { v4: uuidv4 } = require('uuid');
const userRoutes = require('./api/routes/userRoutes');
const Event = require('./api/models/event');
const Usuario = require('./api/models/usuari');
const app = express();

app.use(express.json());
app.set('json spaces', 2);

function generateApiKey(length = 64) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

mongoose.connect(dbConfig.MONGODB_URI).then(() => console.log("Connectat a MongoDB"))
  .catch(err => console.error("No s'ha pogut connectar a MongoDB", err));

app.get('/api/health', (req, res) => {
  res.json({ status: "OK" });
});

app.use('/api', userRoutes);

app.post('/api/events', async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).send(event);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).send("L'esdeveniment no s'ha trobat.");
    }
    res.send(event);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/user/register', async (req, res) => {
  try {
    const newUser = new User({
      uuid: uuidv4(),
      nickname: req.body.nickname,
      email: req.body.email,
      phone_number: req.body.phone_number,
      api_key: generateApiKey(),
      avatar: req.body.avatar,
      historial_partides: req.body.historial_partides || []
    });

    await newUser.save();
    res.status(201).send(newUser);
  } catch (err) {
    res.status(400).send(err.message);
  }
});



module.exports = app;
