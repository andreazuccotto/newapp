var express = require('express');
var session = require('express-session');
var config = require('config');
var nodemailer = require('nodemailer');
const publicIp = require('public-ip');
var { Pool } = require('pg');
var generatePassword = require('password-generator');
const activateUserPath = '/doActivateUser';

var router = express.Router();

var auth = config.get('auth');

var transporter = nodemailer.createTransport({
	host: 'out.alice.it',
	port: 587,
	secure: false,
	auth: {
		user: 'zuccotto.andrea@alice.it',
		pass: 'spartan118'
	}
});

var mailOptions = {
	from: auth.user,
	subject: 'Registrazione it.starwars',
	text: ''
};

var pool = new Pool(config.get('dbPool'));

router.get('/', function (req, res, next) {
	res.render('login', {
		title: 'login'
	});
});

router.post('/', function (req, res, next) {

	pool.query('SELECT USERNAME, STATO, TIPO_UTENTE, DATA_REGISTRAZIONE, DATA_ULTIMO_ACCESSO, EMAIL FROM UTENTI WHERE USERNAME = $1 AND PASSWORD = crypt($2, password)', [req.body.username, req.body.password], (err, response) => {

		if (err) {
			throw err;
		}
		var result = response.rows[0];
		console.log(result);
		
		if (typeof result === 'undefined') {
			res.render('login', {
				title: 'login',
				error: 'Credenziali errate'
			});
		}
		else if (result.stato === 'ATTIVO'){
			req.session.user = response.rows[0];
			res.redirect('/main');
		}
		else {
			res.render('login', {
				title: 'login',
				error: 'Utente non attivo'
			});
		}
 
	});	

});

router.get('/registrati', function (req, res, next) {
	res.render('registrati', {
		title: 'Registrazione'
	});
});

router.post('/registrati', function (req, res, next) {

	if (req.body.password !== req.body.confirmPassword) {
		res.render('registrati', {
			title: 'Registrazione',
			error : 'La password di conferma non coincide'
		});
		return;
	}

	pool.query('INSERT INTO UTENTI (USERNAME, PASSWORD, EMAIL) VALUES ($1, crypt($2, gen_salt(\'bf\')), $3)',[req.body.username, req.body.password, req.body.email], (err, response) => {
		if (err) {
			console.log(err.stack);
			res.render('registrati', {
				title: 'Registrazione',
				error : 'Errore in fase di creazione utente'
			});
			return;
		  } else {
			console.log(response.rows[0]);
		  }
	});

	(async () => {
		var ip = await publicIp.v4();
		mailOptions.to = req.body.email;
		mailOptions.text = 'Benvenuto ' + req.body.username + '!\n\nGrazie per esserti registrato, clicca il seguente link per attivare il tuo account:\n\nhttp://' + ip + activateUserPath + '?username=' + req.body.username + '\n';

		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
				res.redirect('/');
			}
		});
	})();
	
});

router.get(activateUserPath, function (req, res, next) {
	console.log(req.query.username);
	pool.query('UPDATE UTENTI SET STATO = \'ATTIVO\' WHERE STATO = \'LOGON\' AND USERNAME = $1',[req.query.username], (err, response) => {
		if (err) {
			console.log(err.stack);
			res.send('Errore durante l\'attivazione dell\'account');
		} else if (response.rowCount < 1) {
			res.send('Errore durante l\'attivazione dell\'account');
		} else {
			res.send('Account attivato');
		}
	});
});

router.get('/recuperaPassword', function (req, res, next) {
	res.render('recuperaPassword', {
		title: 'Recupera Password'
	});
});

router.post('/recuperaPassword', function (req, res, next) {

	var user = {};

	pool.query('SELECT USERNAME FROM UTENTI WHERE EMAIL = $1', [req.body.email], (err, response) => {

		if (err) {
			throw err;
		}
		console.log(response.rows[0]);
		user = response.rows[0];
 
	});

	var newPwd = generatePassword(8, false);

	pool.query('UPDATE UTENTI SET PASSWORD = crypt($1, gen_salt(\'bf\')) WHERE EMAIL = $2', [newPwd, req.body.email], (err, response) => {

		if (err) {
			throw err;
		}
		
		mailOptions.to = req.body.email;
		mailOptions.text = 'Ciao ' + user.username + '!\n\nPer la tua sicurezza è stata generata una nuova password per accedere. La tua nuova password è: ' + newPwd + '\n\nTi consigliamo di cambiare questa password dal tuo account.\n';

		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
				res.redirect('/login');
			}
		});
 
	});	

});

module.exports = router;
