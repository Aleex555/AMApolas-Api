const mongoose = require('mongoose');

// Define el esquema de la colección
const wordSchema = new mongoose.Schema({
  idioma: { type: String, required: true },
  palabra: { type: String, required: true },
  veces_utilizadas: { type: Number, required: true }
},{ collection: 'Diccionario' });

// Crea el modelo basado en el esquema
const Word = mongoose.model('Word', wordSchema);

module.exports = Word;
