const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
const fs = require('fs');
const readline = require('readline');

// Define el esquema de la colección
const palabraSchema = new mongoose.Schema({
  idioma: { type: String, required: true },
  palabra: { type: String, required: true },
  veces_utilizadas: { type: Number, default: 0 }
});

// Modelo de Mongoose para la colección 'Diccionario'
const Palabra = mongoose.model('Diccionario', palabraSchema);

async function main() {
    const zipFilePath = './data/DISC2-LP.zip';
    const mongoUri = 'mongodb://elTeuUsuari:laTeuaContrasenya@localhost:27017/dam2-pj03';

    // Conexión a MongoDB utilizando Mongoose
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    // Leer el archivo ZIP
    const zip = new AdmZip(zipFilePath);
    const zipEntry = zip.getEntry('DISC2/DISC2-LP.txt');

    if (zipEntry) {
        // Leer el contenido del archivo dentro del ZIP
        const buffer = zipEntry.getData();
        const stream = readline.createInterface({
            input: fs.createReadStream(buffer)
        });

        const documents = [];

        for await (const line of stream) {
            const document = new Palabra({
                idioma: "catalan",
                palabra: line.trim(),
                veces_utilizadas: 0
            });
            documents.push(document);
        }

        // Inserta los documentos en MongoDB
        await Palabra.insertMany(documents);
        console.log("Datos insertados correctamente en MongoDB.");
    } else {
        console.log("No se encontró el archivo dentro del ZIP.");
    }

    // Cierra la conexión con MongoDB
    mongoose.disconnect();
}

main();
