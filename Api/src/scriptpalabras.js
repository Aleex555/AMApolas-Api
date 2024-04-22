const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// Define el esquema de la colección
const palabraSchema = new mongoose.Schema({
  idioma: { type: String, required: true },
  palabra: { type: String, required: true },
  veces_utilizadas: { type: Number, default: 0 }
});

// Modelo de Mongoose para la colección 'Diccionario'
const Palabra = mongoose.model('Diccionario', palabraSchema);

async function main() {
    // Usa __dirname para construir la ruta del archivo ZIP relativa al script actual
    const zipFilePath = path.join(__dirname, 'Api', 'data', 'DISC2-LP.zip');
    const mongoUri = 'mongodb://elTeuUsuari:laTeuaContrasenya@localhost:27017/dam2-pj03';

    // Conexión a MongoDB utilizando Mongoose
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        // Verificar que el archivo ZIP existe
        if (!fs.existsSync(zipFilePath)) {
            console.error('Archivo ZIP no encontrado:', zipFilePath);
            return;
        }

        // Leer el archivo ZIP
        const zip = new AdmZip(zipFilePath);
        const zipEntry = zip.getEntry('DISC2/DISC2-LP.txt');

        if (zipEntry) {
            const data = zipEntry.getData().toString('utf8');
            const lines = data.split(/\r?\n/);
            const documents = lines.map(line => new Palabra({
                idioma: 'catalan',
                palabra: line.trim(),
                veces_utilizadas: 0
            }));

            // Inserta los documentos en MongoDB
            await Palabra.insertMany(documents);
            console.log("Datos insertados correctamente en MongoDB.");
        } else {
            console.log("No se encontró el archivo dentro del ZIP.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        // Cierra la conexión con MongoDB
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
}

main().catch(err => console.error(err));
