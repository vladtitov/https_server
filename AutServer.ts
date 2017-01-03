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
  private sessions:{[key:string]:UserSession} = {};
  private PUB_DIR = 'pub';
  private fs = fs;
  private sqlite3 = require('sqlite3').verbose();
  private db;

  private generate_key() {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
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



  private processPost(req: http.ServerRequest, resp: http.ServerResponse, user: any) {
   this.readPostData(req,(dataStr:string)=>{

      let ar: string[] = req.url.split('/');

      switch (ar[1]){

      }

      resp.write(JSON.stringify({
        data:{ff:dataStr},
        timestamp:Date.now()
      }))
      resp.end();



    })



  }

  private startExpired():void{
    setInterval(()=>{
      let time:number = Date.now()/1000;
      for(let str in this.sessions) if(this.sessions[str].expired < time) this.killUserSession(this.sessions[str])
    },30000)
  }

  private killUserSession(user:UserSession):boolean {
    var sid = user.sid;
    let exists:boolean = false;
    if(this.sessions[sid]){
      exists = true
      delete this.sessions[sid];
    }
    return exists;
  }

  ///////////////////////////////////////////////////user//////////////////////////////////////

  private setUserInSession = function (user:UserSession, resp:http.ServerResponse) {

    var id: string = this.generate_key();
    user.sid = id;
    user.expired = Math.round(Date.now()/1000) + 3600;
    this.sessions[id] = user;
   // resp.setHeader("Set-Cookie", ['sessionid=' + id, 'Max-Age=3600', 'Version=1']);// 'sessionid id);


    resp.setHeader('Access-Control-Expose-Headers','x-requested-with');
    //resp.setHeader('X-Request-ID',id);
    resp.setHeader('x-requested-with',id);

  }

  private getUserFromSession(req:http.ServerRequest):UserSession{

    let sid:string = req.headers['x-requested-with'];
    //console.log('sid ' + sid);
    let user:UserSession = this.sessions[sid];

    return user;
  }




  private loginFunction(req:http.ServerRequest, resp:http.ServerResponse) {

    this.readData(req,(data)=> {
      let user = JSON.parse(data);
      let ar = [
        crypto.createHash('md5').update(user.username).digest("hex"),
        crypto.createHash('md5').update(user.password).digest("hex")
      ];

      if (!this.db) this.db = new this.sqlite3.Database('data/directories.db');

      var stmt = this.db.all('SELECT * FROM users WHERE username=? AND password=?', ar ,(err, rows) => {
        console.log(rows);
        if (err){
          resp.statusCode = 503;;
          resp.end('Server error');
          return;
        }

        if(rows.length ===1) {
          this.setUserInSession(rows[0],resp);
          resp.end(JSON.stringify({
            result:'logedin',
            status:'OK'
          }));
        }
        else{
          resp.statusCode = 509;
          resp.end('Authentication error');
        }

      });
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

  addAccessHeaders(resp: http.ServerResponse): void {
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
    else if (req.method == 'POST') this.processPost(req,resp, user);
  }


  private server: https.Server;
  private isSecure: boolean;




  createServer(secure = true, port = 443) {
    this.isSecure = secure;

    let options = {
      key: fs.readFileSync('data/server.key'),
      cert: fs.readFileSync('data/server.crt')
    };


    let srv: https.Server = https.createServer(options, (req: http.ServerRequest, resp: http.ServerResponse) => {


      let ip = req.connection.remoteAddress.substr(req.connection.remoteAddress.lastIndexOf(':') + 1);

      let ar: string[] = req.url.split('/');
      this.addAccessHeaders(resp);

      this.getUserFromSession(req);
      console.log(ar);
      if (ar[1] === 'login') {
        this.loginFunction(req, resp);
        return;
      }

      let user:UserSession = this.getUserFromSession(req);

      if (user){
          this.processRequest(req, resp, user);
      } else {
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
  }


}


export class UserSession{
  sid:string;
  role:string;
  expired:number;
}