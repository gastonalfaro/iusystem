'use strict';

const express = require('express');
// const system = express.Router();
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const request = require('request');
const logger = require('morgan');
const bodyParser = require('body-parser');
const hat = require('hat');
// require('ejs-locals')
const app = express()
const config = require('./config')

//a.key = hat();
//a.secreto = crypto.randomBytes(64).toString('hex'); // Generar secreto por App

var mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hacienda01',
  database: 'system'
});

var ssoConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hacienda01',
  database: 'sso'
})

const knex = require('knex')({
  client: 'mysql',
  connection: {
    host: 'localhost',
    user: 'root',
    password: 'Hacienda01',
    database: 'sso',
    charset: 'utf8'
  }
});

var sessionStore = new MySQLStore({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'cede1727',
  database: 'sessions'
}, connection);

app.use(cookieParser());
app.use(session({
  //store: sessionStore,
  secret: '3lgr@ns3cr3t0',
  resave: false,
  saveUninitialized: true,
  cookie: {
    // secure: true,
    httpOnly: true, // user en session
    expires: new Date(Date.now() + 36000000)
  }
}));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.engine('ejs', require('ejs-locals'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/login', (req, res) => {
  //res.locals.flash = '';
  res.render('login');
});

app.use(express.static('public'))

app.post('/login', (req, res) => {
  let { username, password } = req.body;

  if (username) {
    var query = `select * from usuarios 
      where username = '${username}'`;

    connection.query(query, function (err, rows, fields) {
      if (err) throw err;

      if (rows.length > 0) {

        bcrypt.compare(password, rows[0].password, function (err, valido) {
          if (err) throw err;

          if (valido) {
            req.session.user = {
              username: rows[0].username,
              email: rows[0].email
            };

            res.redirect('/');
          } else {
            res.status(401);
            res.locals.flash = 'Credenciales no válidas';
            // res.render('login', { 'flash': 'Credenciales no válidas' });
            res.render('login');
          }
        });
      } else {
        res.status(401);
        res.locals.flash = 'Usuario no válido';
        // res.render('login', { 'flash': 'Usuario no válido' });
        res.render('login');
      }
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.use(function (req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
});

app.get('/', (req, res) => {
  res.render('index', {
    'session': JSON.stringify(req.session, null, 2),
    'user': req.session.user
  });
});

// app.get('/usuarios', (req, res) => {
//   res.render('usuarios');
// });

app.get('/crear-usuario', (req, res) => res.render('crear-usuario'));

app.post('/crear-usuario', (req, res) => {
  let { username, password, email } = req.body;

  if (username && password && email) {
    bcrypt.genSalt(10, function (err, salt) { // 10 saltrounds
      bcrypt.hash(password, salt, function (err, hash) {
        var query = `insert into usuarios
          (username, password, email) values ('${username}', '${hash}', '${email}')`;

        connection.query(query, function (err, rows, fields) {
          if (err) throw err;

          res.redirect('/');
        });
      });
    });
  } else {
    req.flash = 'Complete todos los campos';

    return;
  }
});

app.get('/usuarios/:email', async (req, res) => {
  let email = req.params.email
  console.log(email)

  if (email) {
    let usuario = await knex('usuarios').where({
      user_id: email
    }).first()

    let membresias = await knex('membresias').join('aplicaciones', 'membresias.app_key', 'aplicaciones.app_key').where({
      user_id: email
    })

    let aplicaciones = await knex('aplicaciones').select('app_key', 'nombre')

    console.log(membresias)

    res.render('editar-usuario', {
      usuario: usuario,
      membresias: membresias,
      aplicaciones: aplicaciones
    })
  } else
    res.sendStatus(404);
});

app.post('/usuarios/:email', async (req, res) => {
  let { email, identificacion, nombre, activo, confirmado } = req.body

  console.log(req.body)

  if (email) {
    let usuario = await knex('usuarios').where({
      user_id: email
    }).update({ identificacion: identificacion, nombre: nombre, activo: activo, cuenta_confirmada: confirmado });

    // res.render('editar-usuario', {
    //   usuario: usuario
    // })
    res.redirect('/usuarios')
  } else
    res.sendStatus(404);
});

app.post('/asociar', async (req, res) => {
  let { email, app_key } = req.body

  if (email && app_key) {
    try {
      let usuario = await knex('membresias')
        .insert({
          user_id: email,
          app_key: app_key
        })
      res.sendStatus(200)
    } catch (e) {
      res.sendStatus(500)
    }
  } else
    res.sendStatus(404);
});

app.get('/me', (req, res) => res.render('me', {
  'session': req.session
}));

app.get('/cambiar-contrasena', (req, res) => res.render('cambiar-contrasena', {
  'session': req.session
}));

app.post('/cambiar-contrasena', (req, res) => {
  let { username, password, email } = req.body;

  if (username && password && email) {

  } else {
    req.flash = 'Complete todos los campos';
  }
});

// Usuarios SSO

app.get('/usuarios', async (req, res) => {
  //var query = `select * from usuarios`;

  let usuarios = await knex('usuarios')

  // ssoConnection.query(query, function (err, rows, fields) {
  //   if (err) throw err;

  res.render('usuarios', { usuarios: usuarios });
  // });
});

app.post('/usuarios', async (req, res) => {
  console.log(req.body)
  let { email, identificacion, nombre } = req.body;

  if (email) {
    let token = crypto.randomBytes(20).toString('hex');
    let insert = await knex('usuarios').insert({ user_id: email, identificacion: identificacion, nombre: nombre, token_confirmacion: token })
    let usuarios = await knex('usuarios')

    var mensaje = {
      from: 'Ministerio de Hacienda <sso@hacienda.go.cr>',
      to: email,
      subject: 'Bienvenido, confirme su cuenta de usuario',
      text: `Confirme su cuenta de usuario en la url http://10.177.27.30:13000/usuarios/confirmar?token=${token}.`
    }

    request.post({ url: 'http://172.18.58.49:14000/enviar', form: mensaje }, function (err, httpResponse, body) {
      if (err) console.log(err);

      res.render('usuarios',
        {
          'flash': `Usuario agregado exitosamente.  Instrucciones enviadas a la dirección de correo electrónico ${email}.`,
          usuarios: usuarios
        });
    });
  } else {
    req.flash = 'Complete todos los campos';

    return;
  }
});

// Aplicaciones SSO

app.get('/aplicaciones', (req, res) => {
  var query = `select * from aplicaciones`;

  ssoConnection.query(query, function (err, rows, fields) {
    if (err) throw err;
    //  req.flash = 'Aplicación agregada exitosamente';
    res.render('aplicaciones', {
      apps: rows
    });
  });
  //res.render('sso/crear-aplicacion');
});

app.get('/aplicaciones/:app_key', async (req, res) => {
  let { app_key } = req.params
  let aplicacion = await knex('aplicaciones')
    .where({ app_key: app_key })
    .first()

  res.render('editar-aplicacion', {
    aplicacion: aplicacion
  })
})

app.get('/membresias/:id', async (req, res) => {
  let { id } = req.params
  let membresia = await knex('membresias')
    .join('aplicaciones', 'aplicaciones.app_key', 'membresias.app_key')
    .where({ id: id })
    .select('aplicaciones.esquema as esquema_app',
    'membresias.esquema as esquema_mem', 'nombre', 'user_id', 'afiliacion', 'id')
    .first()

  res.render('editar-membresia', {
    membresia: membresia
  });
});

app.put('/aplicaciones/:app_key', async (req, res) => {
  let { app_key } = req.params
  let { nombre, url, esquema } = req.body

  console.log(JSON.parse(esquema))

  await knex('aplicaciones')
    .where({ app_key: app_key })
    .update({
      nombre: nombre,
      url: url,
      esquema: esquema
    })

  res.sendStatus(200)
});

app.put('/membresias/:id', async (req, res) => {
  let { id } = req.params
  let { esquema } = req.body

  await knex('membresias')
    .where({ id: id })
    .update({
      esquema: esquema
    })

  res.sendStatus(200)
});

app.post('/aplicaciones', (req, res) => {
  let { nombre, url } = req.body;

  if (nombre) {
    let key = hat();
    let secreto = crypto.randomBytes(64).toString('hex'); // Generar secreto por App

    var insert = `insert into aplicaciones
          (app_key, nombre, descripcion, secreto, url) 
          values ('${key}', '${nombre}', '${nombre}', '${secreto}', '${url}')`;

    ssoConnection.query(insert, function (err, rows, fields) {
      if (err) throw err;

      req.flash = 'Aplicación agregada exitosamente';
      var query = `select * from aplicaciones`;

      ssoConnection.query(query, function (err, rows, fields) {
        if (err) throw err;
        //  req.flash = 'Aplicación agregada exitosamente';
        res.render('aplicaciones', { apps: rows });
      });
    });
  } else {
    req.flash = 'Complete todos los campos';

    return;
  }
})

app.listen(config.port, function () {
  console.log(`> Esperando conexiones en http://${config.host}:${config.port}`)
})