const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
let letras = null;
let letraslista = null;
let partidaId = null;
let cont = 0;


const server = http.createServer(app);
const io = new Server(server);
const valorsLletres = {
  'a': 1, 'b': 3, 'c': 3, 'd': 2, 'e': 1, 'f': 4, 'g': 2, 'h': 4, 'i': 1,
  'j': 8, 'k': 5, 'l': 1, 'm': 3, 'n': 1, 'o': 1, 'p': 3, 'q': 8,
  'r': 1, 's': 1, 't': 1, 'u': 1, 'v': 4, 'w': 4, 'x': 8, 'y': 4, 'z': 10
};

class Joc {
  constructor(partidaDuracio, pausaDuracio) {
    this.partidaDuracio = partidaDuracio;
    this.pausaDuracio = pausaDuracio;
    this.properInici = Date.now() + this.partidaDuracio;
    this.enPartida = false;
    this.ciclarJoc();
    this.iniciarPartida();
  }

  ciclarJoc() {
    setTimeout(() => {
      this.enPartida = !this.enPartida;
      const nextDuration = this.enPartida ? this.partidaDuracio : this.pausaDuracio;
      this.properInici = Date.now() + nextDuration;
      if(this.enPartida){
        console.log("\nPARTIDA INICIADA\n");
        io.emit('PARTIDA_INICIADA', { message: '\n¡Una nueva partida ha comenzado!', enPartida: this.enPartida ,letras : letraslista});

      }else if (!this.enPartida){
        this.actualizarFechaFinPartida(partidaId);
        this.iniciarPartida();
      }
      this.ciclarJoc();
    }, this.enPartida ? this.partidaDuracio : this.pausaDuracio);
  }

  async iniciarPartida() {
    try {
      letras = this.generarLetrasAleatorias();
      letraslista = letras.map(obj => obj.letra);
      const response = await axios.post('https://roscodrom6.ieti.site/api/games', {
        letrasDelRosco: letras
      });
      console.log('Partida creada:', response.data);
      partidaId = response.data._id;
      return partidaId;
    } catch (error) {
      console.error('Error al crear la partida:', error);
    }
  }

  async actualizarFechaFinPartida(partidaId) {
    const url = `https://roscodrom6.ieti.site/api/games/${partidaId}/finish`;
  
    try {
      const response = await axios.patch(url);
      console.log('Partida actualizada con fecha de finalización:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar la fecha de finalización de la partida:', error);
      return null;
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

  generarLetrasAleatorias() {
    const consonants = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'X', 'Z'];
    const vowels = ['A', 'E', 'I', 'O', 'U', 'Y'];

    const numeroLetras = Math.floor(Math.random() * (10 - 6 + 1)) + 6;
    const numVocales = (numeroLetras >= 10 || numeroLetras === 9) ? 3 : 2;

    this.shuffleArray(vowels);
    this.shuffleArray(consonants);

    const vocalesElegidas = vowels.slice(0, numVocales);
    const numConsonantes = numeroLetras - numVocales;
    const consonantesElegidas = consonants.slice(0, numConsonantes);

    const letras = vocalesElegidas.concat(consonantesElegidas);
    this.shuffleArray(letras);

    return letras.map(letra => ({ letra }));
}


  consultaTempsRestant() {
    const tempsRestant = this.properInici - Date.now();
    return { tempsRestant, enPartida: this.enPartida };
  }
}



function calcularPuntuacio(paraula) {
  let puntuacio = 0;
  for (let lletra of paraula) {
      lletra = lletra.toLowerCase();
      if (lletra in valorsLletres) {
          puntuacio += valorsLletres[lletra];
      }
  }
  return puntuacio;
}

const joc = new Joc(60000, 60000);

io.on('connection', (socket) => {
  console.log('Usuari connectat');
  
  const participantsIntervalId = setInterval(async () => {
    if (joc.enPartida) {
      try {
        const res = await fetch(`https://roscodrom6.ieti.site/api/games/${partidaId}/participants`);
        const playerData = await res.json();
        io.emit('DATOS_PARTICIPANTES', playerData);
      } catch (error) {
        console.error('Error fetching participant data:', error);
        io.emit('ERROR_PARTICIPANTES', 'Error obtaining participant data');
      }
    } else {
      io.emit('ESPERANDO_PARTIDA');
    }
  }, 1000);
  
  
  const intervalId = setInterval(() => {
    const resposta = joc.consultaTempsRestant();
    io.emit('TEMPS_PER_INICI', resposta);
  }, 1000);

  socket.on('TEMPS_PER_INICI', () => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
  });

  socket.on('RANKING', async () => {
    if (joc.enPartida) {
      try {
        const res = await fetch(`https://roscodrom6.ieti.site/api/games/${partidaId}/participants`);
        const playerData = await res.json();
        io.emit('DATOS_PARTICIPANTES', playerData);
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    }
  });

  socket.on('ALTA', async (data) => {
    if (!joc.enPartida) {  
      const result = await unirJugadorAPartida(data, partidaId);
      socket.emit('ALTA_CONFIRMADA', result);
    } else {
      socket.emit('ALTA_CONFIRMADA', { message: 'La partida ya ha empezado'});
    }
  });
  


  socket.on('PARAULA', async (data) => {
    if (joc.enPartida) {
      console.log(`Palabra: ${data.palabra}, API_KEY: ${data.apiKey}, Nickname : ${data.nickname}`);
      if (data.palabra && data.apiKey) {
        const result = await mirarPalabra(data, partidaId);
      if (result.exists) {
        let puntuacion = calcularPuntuacio(data.palabra);
        io.emit('Puntuacion', {
          message: `Puntuación de la palabra '${data.palabra}': ${puntuacion}`,
          palabra: data.palabra,
          puntuacion: puntuacion,
          nickname: data.nickname,
          existe: true
      });
        const updateResult = await actualizarPuntuacionPalabra(data.apiKey, partidaId, data.palabra, puntuacion);
        if (updateResult.success) {
          console.log(`Puntuación de la palabra '${data.palabra}': ${puntuacion} actualizada correctamente en la base de datos.`);
        } else {
          console.log(`Error al actualizar la puntuación de la palabra '${data.palabra}': ${updateResult.message}`);
        }
        
      } else {
        socket.emit('Puntuacion', {
            message: result.message,
            existe: false
        });
      }
      } else {
          socket.emit('Puntuacion', { message: "No se proporcionó una palabra válida.", data });
      }
    } else {
      socket.emit('Puntuacion', { message: `No estamos en partida`, data });
    }
});

  socket.onAny((event, ...args) => {
    if (event !== 'TEMPS_PER_INICI' && event !== 'disconnect' && event !== 'connect' && event !== 'ALTA' && event !== 'PARAULA') {
      console.log(`Comanda no reconeguda: ${event}`);
      const resposta = joc.consultaTempsRestant();
      socket.emit('TEMPS_PER_INICI', resposta);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuari desconnectat');
    clearInterval(intervalId);
    clearInterval(participantsIntervalId);
  });
});

async function unirJugadorAPartida(data, partidaId) {
  try {
      // Verifica que la data incluya la API key y el ID de la partida
      if (!data.apiKey) {
          console.error('API key no proporcionada');
          return { message: 'API key no proporcionada' };
      }
      if (!partidaId) {
          console.error('ID de la partida no proporcionado');
          return { message: 'ID de la partida no proporcionado' };
      }

      // Configura la URL del endpoint dinámicamente con el ID de la partida
      const url = `https://roscodrom6.ieti.site/api/games/${partidaId}/join`;  // Usa el parámetro `id` aquí

      // Configura las opciones para la solicitud de Axios
      const config = {
          headers: {
              'x-api-key': data.apiKey // Usa la API key proporcionada por el jugador
          }
      };

      const response = await axios.post(url, {}, config);
      console.log('Jugador unido a la partida:', response.data);
      return { message: 'Jugador unido a la partida correctamente', data: response.data };
  } catch (error) {
      console.error('Error al unir jugador a la partida:', error);
      return { message: 'Error al unir jugador a la partida', error: error.message };
  }
}


async function mirarPalabra(data, partidaId) {
  try {
    // Verifica que la data incluya la API key y el ID de la partida
    if (!data.apiKey) {
        console.error('API key no proporcionada');
        return { message: 'API key no proporcionada' };
    }
    if (!partidaId) {
        console.error('ID de la partida no proporcionado');
        return { message: 'ID de la partida no proporcionado' };
    }

    const url = `https://roscodrom6.ieti.site/api/words/check`;
    const response = await axios.post(url, {
      palabra: data.palabra,
      idioma: "catalan",
      api_key: data.apiKey,
      idPartida: partidaId
    });

    if (response.data && response.data.exists) {
      return { exists: true, message: 'Palabra encontrada y contabilizada' };
    } else {
      return { exists: false, message: 'Palabra no encontrada en el diccionario' };
    }
  } catch (error) {
    console.error('Error al verificar la palabra:', error);
    return { exists: false, message: 'Error al verificar la palabra', error: error.message };
  }
}

async function actualizarPuntuacionPalabra(apiKey, gameId, palabra, puntuacion) {
  try {
    const url = 'https://roscodrom6.ieti.site/api/update-word-score';
    const body = {
      apiKey: apiKey,
      gameId: gameId,
      palabra: palabra,
      puntuacion: puntuacion
    };
    const response = await axios.post(url, body);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al actualizar la puntuación de la palabra:', error);
    return { success: false, message: error.message };
  }
}

const port = process.env.PORT || 80;
server.listen(port, () => console.log(`Escoltant en el port ${port}...`));
