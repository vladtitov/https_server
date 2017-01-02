"use strict";
var fs = require("fs");
var crypto = require('crypto');
var path = require("path");
var FM = require('./FileManager');
var https = require('https');
//import {Server} from "https";
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
        this.fileManager = new FM.FileManager();
        this.sendJson = function (res, data) {
            res.setHeader("Content-Type", 'application/json');
            res.end(JSON.stringify(data));
        };
        this.sendError = function (res, reason) {
            res.end(reason);
        };
        this.setUserInSession = function (sid, user) {
            var u = this.sessions[sid];
            //console.log(' setUserInSession  user  fo session: '+sid,u);
            for (var str in user)
                u[str] = user[str];
            this.sessions[sid] = u;
        };
        this.loginFunction = function (user, pass, callBack) {
            if (!this.db)
                this.db = new this.sqlite3.Database('data/directories.db');
            var stmt = this.db.all('SELECT * FROM users WHERE username=? AND password=?', [user, pass], function (err, rows) {
                if (err) {
                    console.log(err);
                    callBack(0);
                }
                else if (rows.length === 0) {
                    callBack(0);
                }
                else {
                    var user = rows[0];
                    callBack(user);
                }
            });
        };
    }
    AutServer.prototype.generate_key = function () {
        var sha = crypto.createHash('sha256');
        sha.update(Math.random().toString());
        return sha.digest('hex');
    };
    AutServer.prototype.getSessionUser = function (req) {
        var cookie = req.headers.cookie;
        if (!cookie)
            return null;
        var l = this.SESS.length;
        var id = cookie.substr(l + 1).trim();
        console.log('session id; ' + id);
        return this.sessions[id];
    };
    AutServer.prototype.setSessionUser = function (resp) {
        var id = this.generate_key();
        var user = {};
        user.sid = id;
        user.expired = Date.now() + 100000;
        this.sessions[id] = user;
        console.log(user);
        resp.setHeader("Set-Cookie", ['sessionid=' + id, 'Max-Age=3600', 'Version=1']); // 'sessionid id);
        return user;
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
    AutServer.prototype.processGetQuery = function (url, q, res) {
        var _this = this;
        var func = url.substr(1, q - 1).split('/');
        var args = url.substr(q + 1).split(',');
        switch (func.shift()) {
            case 'fileM':
                this.fileManager.processRequest(func, args, function (data) { return _this.sendJson(res, data); });
                break;
        }
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
    AutServer.prototype.processPost = function (req, resp, user, dataS) {
    };
    AutServer.prototype.saveUserData = function (user, data) {
        //TODO saveuser session in DB
        console.log('saveUserData user ', user);
        console.log('saveUserData data ', data);
    };
    AutServer.prototype.killUserSession = function (user, data) {
        var sid = user.sid;
        delete this.sessions[sid];
        if (data)
            this.saveUserData(user, data);
    };
    AutServer.prototype.processLogin = function (req, res, suser, data) {
        var _this = this;
        var onLogin = function (user) {
            if (user) {
                _this.setUserInSession(suser.sid, user);
                _this.sendJson(res, { profile: user.profile, sid: suser.sid });
            }
            else
                _this.sendJson(res, { result: 'wrong login' });
        };
        this.loginFunction(data.user, data.pass, onLogin);
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
    AutServer.prototype.setHeaders = function (resp) {
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
        var _this = this;
        if (req.method == 'GET')
            this.processGet(req, resp, user);
        else if (req.method == 'POST')
            this.readPostData(req, function (data) { return _this.processPost(req, resp, user, data); });
    };
    AutServer.prototype.retriveUser = function (req) {
        return { user: 'adnin' };
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
            console.log();
            if (ar[1] === 'login') {
            }
            else {
                var user = _this.retriveUser(req);
                if (user)
                    _this.processRequest(req, resp, user);
                else {
                    resp.write(JSON.stringify({
                        error: 'login',
                        timestamp: Date.now()
                    }));
                    resp.end();
                }
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
