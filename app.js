var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');

var loginRouter = require('./routes/login');
var mainRouter = require('./routes/main');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
	extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
	maxage: '1d'
}));
app.use(session({
	key: 'user_sid',
	secret: 'test',
	resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));
/*app.use((req, res, next) => {
    if (req.cookies.user_sid && typeof req.session.user !== 'undefined') {
        res.clearCookie('user_sid');        
    }
    next();
});*/

var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/main');
    } else {
        next();
    }
};

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/', sessionChecker, (req, res) => {
    res.redirect('/login');
});

app.use('/login', loginRouter);
app.use('/main', mainRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;