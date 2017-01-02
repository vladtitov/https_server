/// <reference path="FileManager.ts" />
import http = require('http');
import fs = require("fs");
import crypto = require('crypto');
import path = require("path");
import FM = require('./FileManager');
//import db from 'sqlite';

import https = require('https');


export class AutServer {
  private https = https;
  private path = path;
  private url = require('url');
  private qs = require('querystring');
  private error: number;

  private SESS = 'SESSIONID';
  private sessions = {};
  private PUB_DIR = 'pub';
  private fs = fs;
  private sqlite3 = require('sqlite3').verbose();
  private db;

  private fileManager: FM.FileManager = new FM.FileManager();

  private generate_key() {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
  }

  private getSessionUser(req: http.ServerRequest): string {
    let cookie: string = req.headers.cookie;
    if (!cookie) return null;
    let l = this.SESS.length;
    let id = cookie.substr(l + 1).trim();
    console.log('session id; ' + id);
    return this.sessions[id];
  }

  private setSessionUser(resp: http.ServerResponse) {
    var id: string = this.generate_key();
    var user: any = {};
    user.sid = id;
    user.expired = Date.now() + 100000;
    this.sessions[id] = user;
    console.log(user);
    resp.setHeader("Set-Cookie", ['sessionid=' + id, 'Max-Age=3600', 'Version=1']);// 'sessionid id);
    return user;
  }


  private sendJson = function (res: http.ServerResponse, data: any) {
    res.setHeader("Content-Type", 'application/json');
    res.end(JSON.stringify(data));
  }

  private sendError = function (res: http.ServerResponse, reason: string) {
    res.end(reason);
  }

  private sendFile(filename: string, res: http.ServerResponse) {
    console.log(filename)
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
    }

    var sendNotFound = function (res) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain");
      res.write("404 Not Found\n");
      res.end();
    }


    var _sendFile = function (res, data, type) {
      res.statusCode = 200;
      if (type) res.setHeader("Content-Type", type);
      res.write(data, "binary");
      res.end();
    }


    this.fs.exists(filename, function (exists) {
      console.log(filename + '  hh  ' + exists);
      if (!exists || fs.statSync(filename).isDirectory()) sendNotFound(res);
      else {

        fs.readFile(filename, "binary", function (err, file) {
          if (err) sendError(res, err);
          else _sendFile(res, file, contentTypesByExtension[path.extname(filename)]);
        });
      }
    });

  }


  private processGetQuery(url: string, q: number, res: http.ServerResponse): void {
    var func: string[] = url.substr(1, q - 1).split('/');
    var args: string[] = url.substr(q + 1).split(',');
    switch (func.shift()) {
      case 'fileM':
        this.fileManager.processRequest(func, args, (data) => this.sendJson(res, data));
        break;

    }
  }

  private processGet(req: http.ServerRequest, resp: http.ServerResponse, user: any) {
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
  }


  private readPostData(req: http.ServerRequest, callBack:Function) {
    var body = '';
    req.on('data', function (data) {
      body += data;
      if (body.length > 1e6) req.connection.destroy();
    });
    req.on('end', function () {
      callBack(body);
    });

  }


  private processPost(req: http.ServerRequest, resp: http.ServerResponse, user: any, dataS: string) {


  }

  private saveUserData(user, data) {
    //TODO saveuser session in DB
    console.log('saveUserData user ', user);
    console.log('saveUserData data ', data);
  }

  private killUserSession(user: any, data: any) {
    var sid = user.sid;
    delete this.sessions[sid];
    if (data) this.saveUserData(user, data);
  }

  private setUserInSession = function (sid, user) {
    var u = this.sessions[sid];
    //console.log(' setUserInSession  user  fo session: '+sid,u);
    for (var str in user) u[str] = user[str];
    this.sessions[sid] = u;
  }


  private loginFunction = function (user:any,  callBack: Function) {

    if (!this.db) this.db = new this.sqlite3.Database('data/directories.db');

   // var stmt = this.db.all('SELECT * FROM users ', function (err, rows) {


      let ar = [
        crypto.createHash('md5').update(user.username).digest("hex"),
        crypto.createHash('md5').update(user.password).digest("hex")
      ];

    console.log(ar);

    var stmt = this.db.all('SELECT * FROM users WHERE username=? AND password=?', ar , function (err, rows) {
      console.log(rows);
      if (err) {
        console.log(err);
        callBack(0);
      } else if (rows.length === 0) {
        callBack(0);
      } else {


        var user = rows[0];
        callBack(user);
      }

    });
  }

  constructor() {


  }


  readData(req: http.ServerRequest, callback: Function): void {
    let data: string = '';
    req.on('data', function (d) {
      data += d;
    });
    req.on('end', function (d) {
      callback(data);
    });


  }

  addHeaders(resp: http.ServerResponse): void {
    resp.setHeader('Content-Type', 'application/json');
    resp.setHeader('Access-Control-Allow-Origin', '*');
  }


  doLogin(resp: http.ServerResponse): void {


    let id = ' gggggggggggggggggggggggggggggggg';

    resp.setHeader("Set-Cookie", ['sessionid=' + id, 'Max-Age=3600', 'Version=1']);
  }

  close(): void {
    this.server.close();
  }

  processRequest(req: http.ServerRequest, resp: http.ServerResponse, user: any): void {
    if (req.method == 'GET') this.processGet(req, resp, user);
    else if (req.method == 'POST') this.readPostData(req, (data) => this.processPost(req,resp, user, data));
  }


  private server: https.Server;
  private isSecure: boolean;


  retriveUser(req: http.ServerRequest): any {
    return {user: 'adnin'};
  }


  createServer(secure = true, port = 443) {
    this.isSecure = secure;

    let options = {
      key: fs.readFileSync('data/server.key'),
      cert: fs.readFileSync('data/server.crt')
    };


    let srv: https.Server = https.createServer(options, (req: http.ServerRequest, resp: http.ServerResponse) => {


      let ip = req.connection.remoteAddress.substr(req.connection.remoteAddress.lastIndexOf(':') + 1);

      let ar: string[] = req.url.split('/');
      console.log(ar);
      if (ar[1] === 'login') {

        this.readData(req,(data)=>{
          let u =JSON.parse(data);
          this.loginFunction(u, (res)=>{
            res;
          })
          console.log(u);

        });

        this.addHeaders(resp);
        resp.write(JSON.stringify({
          error: 'login function',
          timestamp: Date.now()
        }));

        resp.end();

      } else {

        let user = this.retriveUser(req);
        if (user) this.processRequest(req, resp, user);
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
  }


}
