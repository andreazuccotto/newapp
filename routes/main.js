var express = require('express');
var router = express.Router();
var session = require('express-session');
var config = require('config');
var moment = require('moment');
var { Pool } = require('pg');

var pool = new Pool(config.get('dbPool'));
var alert = null;
router.all('*', function(req, res, next) {
	if (typeof req.session.user === 'undefined') {
		res.redirect('/login');
	}
	else {
		next();
	}
});

router.get('/', function(req, res, next) {

	pool.query('UPDATE UTENTI SET DATA_ULTIMO_ACCESSO = LOCALTIMESTAMP WHERE USERNAME = $1',[req.session.user.username], (err, response) => {
		if (err) {
			console.log(err.stack);
		} else if (response.rowCount < 1) {
			console.log('Errore aggiornamento data ultimo accesso');
		} else {
			console.log('Data ultimo accesso aggiornata');
		}
	});
	alert = null;
	res.render('homepage', { title: 'homepage', user: req.session.user});
});

router.get('/settings', function(req, res, next) {

	if (req.session.user.tipo_utente == 1) {
		console.log('Cerco utenti');
		pool.query('SELECT ID, USERNAME, EMAIL, STATO, DATA_REGISTRAZIONE, DATA_ULTIMO_ACCESSO FROM UTENTI WHERE TIPO_UTENTE <> 1 AND STATO NOT LIKE \'LOGON\'', (err, response) => {
			if (err) {
				console.log(err.stack);
			} else {
				console.log(response);
				res.render('settings', { title: 'Impostazioni', user: req.session.user, moment: moment, users: response.rows, alert: alert});
			}
		});
	} else {
		res.render('settings', { title: 'Impostazioni', user: req.session.user, moment: moment, users: [], alert: alert});
	}

});

router.post('/doChangePassword', function(req, res, next) {

	console.log(req.body.newPassword);
	console.log(req.session.user.username);
	console.log(req.body.oldPassword);

	pool.query('UPDATE UTENTI SET PASSWORD = crypt($1, gen_salt(\'bf\')) WHERE USERNAME = $2 AND PASSWORD = crypt($3, password)',[req.body.newPassword, req.session.user.username, req.body.oldPassword], (err, response) => {
		if (err) {
			console.log(err.stack);
			alert = {
				text: 'Errore in fase di aggiornamento password'
			};
		} else if (response.rowCount < 1) {
			console.log(response);
			alert = {
				text: 'Errore in fase di aggiornamento password'
			};
		} else {
			alert = {
				severity: 'info',
				text: 'Password aggiornata con successo'
			};
		}
		res.redirect('/main/settings');
	});
});

router.post('/doUpdateUser', function(req, res, next) {

	var newStato;
	if (req.body.stato) {
		newStato = 'ATTIVO';
	} else {
		newStato = 'NONATTIVO';
	}

	pool.query('UPDATE UTENTI SET STATO = $1 WHERE ID = $2',[newStato, req.body.id], (err, response) => {
		if (err) {
			console.log(err.stack);
			alert = {
				text: 'Errore in fase di aggiornamento utenza'
			};
		} else if (response.rowCount < 1) {
			console.log(response);
			alert = {
				text: 'Errore in fase di aggiornamento utenza'
			};
		} else {
			alert = {
				severity: 'info',
				text: 'Utenza aggiornata con successo'
			};
		}
		res.redirect('/main/settings');
	});
});

module.exports = router;
