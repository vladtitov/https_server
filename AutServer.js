"use strict";
var fs = require("fs");
var crypto = require('crypto');
var path = require("path");
//import db from 'sqlite';
var https = require('https');
var AutServer = (function () {
    function AutServer() {
        this.https = https;
        this.path = path;
        this.url = require('url');
        this.qs = require('querystring');
        this.SESS = 'SESSIONID';
        this.sessions = {};
        this.PUB_DIR = 'pub';
        this.fs = fs;
        this.sqlite3 = require('sqlite3').verbose();
        ///////////////////////////////////////////////////user//////////////////////////////////////
        this.setUserInSession = function (user, resp) {
            var id = this.generate_key();
            user.sid = id;
            user.expired = Math.round(Date.now() / 1000) + 3600;
            this.sessions[id] = user;
            // resp.setHeader("Set-Cookie", ['sessionid=' + id, 'Max-Age=3600', 'Version=1']);// 'sessionid id);
            resp.setHeader('Access-Control-Expose-Headers', 'x-requested-with');
            //resp.setHeader('X-Request-ID',id);
            resp.setHeader('x-requested-with', id);
        };
    }
    AutServer.prototype.generate_key = function () {
        var sha = crypto.createHash('sha256');
        sha.update(Math.random().toString());
        return sha.digest('hex');
    };
    AutServer.prototype.sendFile = function (filename, res) {
        console.log(filename);
        filename = this.PUB_DIR + filename;
        var contentTypesByExtension = {
            '.html': "text/html",
            '.css': "text/css",
            '.js': "text/javascript"
        };
        var sendError = function (res, err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "text/plain");
            res.write(err + "\n");
            res.end();
        };
        var sendNotFound = function (res) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.write("404 Not Found\n");
            res.end();
        };
        var _sendFile = function (res, data, type) {
            res.statusCode = 200;
            if (type)
                res.setHeader("Content-Type", type);
            res.write(data, "binary");
            res.end();
        };
        this.fs.exists(filename, function (exists) {
            console.log(filename + '  hh  ' + exists);
            if (!exists || fs.statSync(filename).isDirectory())
                sendNotFound(res);
            else {
                fs.readFile(filename, "binary", function (err, file) {
                    if (err)
                        sendError(res, err);
                    else
                        _sendFile(res, file, contentTypesByExtension[path.extname(filename)]);
                });
            }
        });
    };
    AutServer.prototype.processGet = function (req, resp, user) {
        var url = decodeURI(req.url);
        resp.write(JSON.stringify({
            url: 'url',
            timestamp: Date.now()
        }));
        resp.end();
        // console.log(url);
        // var q = url.indexOf('?');
        // if (q === -1) this.sendFile(url, res);
        // else this.processGetQuery(url, q, res);
        /*
         if (user && user.role && user.role.indexOf('user') != -1) this.sendFile(u.pathname, res);
         else this.sendFile('/login.html', res);
         */
        //else res.end('Please login to processGet');
    };
    AutServer.prototype.readPostData = function (req, callBack) {
        var body = '';
        req.on('data', function (data) {
            body += data;
            if (body.length > 1e6)
                req.connection.destroy();
        });
        req.on('end', function () {
            callBack(body);
        });
    };
    AutServer.prototype.processPost = function (req, resp, user) {
        this.readPostData(req, function (dataStr) {
            var ar = req.url.split('/');
            switch (ar[1]) {
            }
            resp.write(JSON.stringify({
                data: { ff: dataStr },
                timestamp: Date.now()
            }));
            resp.end();
        });
    };
    AutServer.prototype.startExpired = function () {
        var _this = this;
        setInterval(function () {
            var time = Date.now() / 1000;
            for (var str in _this.sessions)
                if (_this.sessions[str].expired < time)
                    _this.killUserSession(_this.sessions[str]);
        }, 30000);
    };
    AutServer.prototype.killUserSession = function (user) {
        var sid = user.sid;
        var exists = false;
        if (this.sessions[sid]) {
            exists = true;
            delete this.sessions[sid];
        }
        return exists;
    };
    AutServer.prototype.getUserFromSession = function (req) {
        var sid = req.headers['x-requested-with'];
        //console.log('sid ' + sid);
        var user = this.sessions[sid];
        return user;
    };
    AutServer.prototype.loginFunction = function (req, resp) {
        var _this = this;
        this.readData(req, function (data) {
            var user = JSON.parse(data);
            var ar = [
                crypto.createHash('md5').update(user.username).digest("hex"),
                crypto.createHash('md5').update(user.password).digest("hex")
            ];
            if (!_this.db)
                _this.db = new _this.sqlite3.Database('data/directories.db');
            var stmt = _this.db.all('SELECT * FROM users WHERE username=? AND password=?', ar, function (err, rows) {
                console.log(rows);
                if (err) {
                    resp.statusCode = 503;
                    ;
                    resp.end('Server error');
                    return;
                }
                if (rows.length === 1) {
                    _this.setUserInSession(rows[0], resp);
                    resp.end(JSON.stringify({
                        result: 'logedin',
                        status: 'OK'
                    }));
                }
                else {
                    resp.statusCode = 509;
                    resp.end('Authentication error');
                }
            });
        });
    };
    AutServer.prototype.readData = function (req, callback) {
        var data = '';
        req.on('data', function (d) {
            data += d;
        });
        req.on('end', function (d) {
            callback(data);
        });
    };
    AutServer.prototype.addAccessHeaders = function (resp) {
        resp.setHeader('Content-Type', 'application/json');
        resp.setHeader('Access-Control-Allow-Origin', '*');
    };
    AutServer.prototype.doLogin = function (resp) {
        var id = ' gggggggggggggggggggggggggggggggg';
        resp.setHeader("Set-Cookie", ['sessionid=' + id, 'Max-Age=3600', 'Version=1']);
    };
    AutServer.prototype.close = function () {
        this.server.close();
    };
    AutServer.prototype.processRequest = function (req, resp, user) {
        if (req.method == 'GET')
            this.processGet(req, resp, user);
        else if (req.method == 'POST')
            this.processPost(req, resp, user);
    };
    AutServer.prototype.createServer = function (secure, port) {
        var _this = this;
        if (secure === void 0) { secure = true; }
        if (port === void 0) { port = 443; }
        this.isSecure = secure;
        var options = {
            key: fs.readFileSync('data/server.key'),
            cert: fs.readFileSync('data/server.crt')
        };
        var srv = https.createServer(options, function (req, resp) {
            var ip = req.connection.remoteAddress.substr(req.connection.remoteAddress.lastIndexOf(':') + 1);
            var ar = req.url.split('/');
            _this.addAccessHeaders(resp);
            _this.getUserFromSession(req);
            console.log(ar);
            if (ar[1] === 'login') {
                _this.loginFunction(req, resp);
                return;
            }
            var user = _this.getUserFromSession(req);
            if (user) {
                _this.processRequest(req, resp, user);
            }
            else {
                resp.write(JSON.stringify({
                    error: 'login',
                    timestamp: Date.now()
                }));
                resp.end();
            }
        });
        srv.listen(port, function () {
            console.log('Server started on port: ' + srv.address().port);
        });
        this.server = srv;
    };
    return AutServer;
}());
exports.AutServer = AutServer;
var UserSession = (function () {
    function UserSession() {
    }
    return UserSession;
}());
exports.UserSession = UserSession;
