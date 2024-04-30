const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
let letras = null;

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
  }

  ciclarJoc() {
    setTimeout(() => {
      this.enPartida = !this.enPartida;
      const nextDuration = this.enPartida ? this.partidaDuracio : this.pausaDuracio;
      this.properInici = Date.now() + nextDuration;
      if (this.enPartida) {
        letras = this.generarLetrasAleatorias();
        io.emit('PARTIDA_INICIADA', { message: '\n¡Una nueva partida ha comenzado!', enPartida: this.enPartida ,letras : letras});
      }
      this.ciclarJoc();
    }, this.enPartida ? this.partidaDuracio : this.pausaDuracio);
  }

  consultaTempsRestant() {
    const tempsRestant = this.properInici - Date.now();
    return { tempsRestant, enPartida: this.enPartida };
  }

  generarLetrasAleatorias() {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J','L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V','X', 'Y', 'Z'];
    return letters.sort(() => 0.5 - Math.random()).slice(0, 7).map(letra => ({ letra }));
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

const joc = new Joc(20000, 20000);

io.on('connection', (socket) => {
  console.log('Usuari connectat');

  const respostaInmediata = joc.consultaTempsRestant();
  socket.emit('TEMPS_PER_INICI', respostaInmediata);
  
  const intervalId = setInterval(() => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
  }, 10000);

  socket.on('TEMPS_PER_INICI', () => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
  });

  socket.on('ALTA', (data) => {

    console.log(`Petició d'alta rebuda amb dades: ${data}`);
    socket.emit('ALTA_CONFIRMADA', {message: 'Alta processada correctament', data });
  });

  socket.on('PARAULA', (data) => {
    if (joc.enPartida ){
      console.log(`Palabra: ${data.paraula}, API_KEY: ${data.API_KEY}`);
      if (data.paraula) {
          let puntuacion = calcularPuntuacio(data.paraula);
          socket.emit('Puntuacion', { message: `Puntuación de la palabra '${data.paraula}': ${puntuacion}`, data });
      }
    }else{
      socket.emit('Puntuacion',{ message: `No estamos en partida`, data })
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
  });
});

const port = process.env.PORT || 80;
server.listen(port, () => console.log(`Escoltant en el port ${port}...`));
