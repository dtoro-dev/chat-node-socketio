# DToroChat Socket.io

- Socket.io
- Node.js
- TailwindCss
- Express
- Morgan
- Moment
- libsql / Turso
- Dotenv

# HTTP vs Web Sockets
➡️ https://ably.com/topic/websockets-vs-http

Comparativa: 01-comparativa.webp

HTTP es un protocolo de comunicación que se basa en el intercambio de mensajes entre un cliente y un servidor. Usa TCP como protocolo de transporte.

El cliente realiza una petición y el servidor responde con una respuesta.

Explicación: 02-http.webp

Web Sockets es un protocolo de comunicación que se basa en el intercambio de mensajes entre un cliente y un servidor. Usa TCP como protocolo de transporte.

La diferencia es que el cliente y el servidor pueden intercambiar mensajes en cualquier momento.

Explicación: 03-websockets.webp

Cuando HTTP es mejor:
- Para pedir recursos
- Recursos cacheables
- Para REST API y uso de metodos HTTP
- Sincronizar eventos

Cuando Web Sockets es mejor:
- Para comunicación bidireccional
- Para comunicación en tiempo real
- Para comunicación de alta frecuencia
- Actualización con poca latencia

# Instalación de Express

npm install express

```javascript
import express from 'express'

const port = process.env.PORT ?? 3000;

const app = express();

app.get('/', (req, res) => {
  res.send('<h1>Front Page</h1>');
});

// no usar app, si no server
server.listen(port, () => {
  console.log(`Started at ${port}`);
});
```

# Instalando para mejorar el logging de Express

```javascript
import express from 'express'
import logger from 'morgan'

const port = process.env.PORT ?? 3000;

const app = express();
app.use(logger('dev'));

app.get('/', (req, res) => {
  res.send('<h1>Front Page</h1>');
});

app.listen(port, () => {
  console.log(`Started at ${port}`);
});
```

# Servir nuestro HTML

```javascript
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html');
});
```

# Crear el HTML, Luego se le aplicaron estilos con tailwind css

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>DtoroChat</title>
</head>
<body>
  <section id="chat">
    <h1>DToroChat</h1>
    <span><input type="text" placeholder="username" id="username" /></span>
    <div id="message">
      <div>
        <p>Usuario 1</p>
        <p>Hola es es un test</p>
      </div>
      <div>
        <p>Usuario 2</p>
        <p>Hola es es un test</p>
      </div>
    </div>
    <form id="form" action="">
      <input id="input" autocomplete="off" /><button>Enviar</button>
    </form>
  </section>
</body>
</html>
```

# Instalando socket.io

`npm install socket.io`

```js
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const server = createServer(app)
const io = new Server(server)

io.on('connection', (socket) => {
  console.log('a user connected')
})
```

# Cargamos socket en el client

```html
<script type="module">
  import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";

  const socket = io()
</script>
```

Vemos que ahora cuando se conecta un usuario, se muestra en el servidor "a user connected". Vamos a ver también cuando se desconecta.

```js
io.on('connection', (socket) => {
  console.log('a user connected')

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})
```

# Enviar eventos

```html
<script>
const form = document.getElementById('form');
const input = document.getElementById('input');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});
</script>
```

# Escuchar evento en el servidor

```javascript
io.on('connection', (socket) => {
  console.log('a user connected')

  socket.on('chat message', (msg) => {
    console.log('message: ' + msg)
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})
```

# Enviar broadcast desde el servidor

Emitir el evento a todos los clientes que tenemos conectados:

```javascript
io.on('connection', (socket) => {
  console.log('a user connected')

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg) // <-----
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})
```

# Escuchar broadcasting en cliente

```html
<script>
  const messages = document.getElementById('messages');

  socket.on('chat message', msg => {
    const item = `<li>${msg}</li>`;
    messages.insertAdjacentHTML('beforeend', item);
  })
</script>
```

# Recuperar usuario desconectado
 
¿Qué pasa si el usuario se desconecta?
Los mensajes se pierden.

Cómo evitarlo:

```javascript
const io = new Server(server, {
  connectionStateRecovery: {}
})
```

# Mostrar al usuario cuando pierde conexión

```html
<script>
  socket.on('disconnect', (socket) => {
    console.log(socket)
    logMessage('disconnected')
  })

  function logMessage(msg) {
    log.insertAdjacentHTML('beforeend', `<p>${msg}</p>`);
  }
</script>
```

# Sincronizar con base de datos

https://turso.tech/

```sh
$ brew install tursodatabase/tap/turso
$ turso auth login
$ turso db create
$ turso db show humble-spectrum
```

```sh
$ npm install @libsql/client dotenv
```

Crear la conexión:

```javascript
import dotenv from 'dotenv'
import { createClient } from "@libsql/client"

dotenv.config()

// Datos entregado por Turso CLI e incorporados en .env, ver env.example
const db = createClient({
  url: process.env.DB_URL, 
  authToken: process.env.DB_TOKEN
});
```

```sh
$ turso db show humble-spectrum
$ turso db tokens create humble-spectrum | pbcopy
```

Crear la tabla si no existe, se considera fecha/hora de envio y usuario que envia:
```javascript
await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(150),
    content TEXT,
    create_at DATETIME NOT NULL
  );
`);
```

Guarda el mensaje cada vez que se envía:
```javascript
socket.on('chat message', async (msg) => {
  let result;
  try {
    console.log(msg)
  
    result = await db.execute({
      sql: `INSERT INTO messages (content, username, create_at) VALUES (:content, :username, :createat)`,
      args: {
        content: msg,
        username,
        createat: createAt,
      },
    });
  } catch (e) {
    console.error(e)
    return
  }

  io.emit('chat message', msg, result.lastInsertRowid.toString())
})
```

# Saber en qué mensaje se quedó el cliente

```javascript
const socket = io({
  auth: {
    serverOffset: 0
  }
})

socket.on("chat message", (msg, serverOffset, username) => {
  const identityUserColorMsg =
    usernameWeb.value === username
      ? "self-end bg-green-200"
      : "self-start bg-gray-200";

  localStorage.setItem("username", usernameWeb.value);

  const item = `<div class="w-auto ${identityUserColorMsg} p-2 rounded-lg">
    <p class="text-md font-bold">${username}</p>
    <p class="text-left break-normal">${msg}</p>
  </div>`;

  message.insertAdjacentHTML("beforeend", item);

  socket.auth.serverOffset = serverOffset;
  socket.auth.username = username;
  scrollToBottom();
});
```

# Recuperar mensajes anteriores

```javascript
io.on('connection', async (socket) => {
  console.log('a user connected')

  socket.on('chat message', async (msg) => {
    // ...
  })

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: `SELECT id, content FROM messages WHERE id > ?`,
        args: [socket.handshake.auth.serverOffset ?? 0]
      })

      results.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id)
      })
    } catch (e) {
      console.error(e)
    }
  }
```