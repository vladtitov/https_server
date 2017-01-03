/**
 * Created by Vlad on 1/2/2017.
 */
/// <reference path="scripts/typings/node/node.d.ts" />
import http = require('http');
import https = require('https');
import fs = require("fs");




var options = {
  hostname: '192.168.1.11',
  method: 'POST',
  port:443,
  path:'/login',
  rejectUnauthorized: false,
  requestCert: true,
  agent: false,
  headers:{'x-requested-with':'hello headers','Content-Type':'application/json'}
  //key: fs.readFileSync('data/server.key'),
  //cert: fs.readFileSync('data/server.crt')
};


function getData():void{

  options.path='/getdata';
  let req = https.request(options, function (resp:http.ClientResponse) {

    parseBody(resp ,function(result){

      console.log(result);
    })
  });

  let data = JSON.stringify({data:'mydata',data2:'mydata2'});
  req.write(data);
  req.end();
  req.on('error', function(err){
    console.log(err);
  });
}



function parseBody(resp:http.ClientResponse, callBack:Function){
  let body = '';
  resp.on('data', function(data){
    body+=data;
  });
  resp.on('end', function(){
   callBack(JSON.parse(body))
  });
}


function doLogin(){

  options.path='/login';
  let req = https.request(options, function (resp:http.ClientResponse) {

    parseBody(resp ,function(result){

      console.log(result);
      if(result.status ==='OK'){
        options.headers['x-requested-with'] = resp.headers['x-requested-with'];
        getData();
      }

    })
  });

  let user = JSON.stringify({username:'adminuser',password:'adminpassword'});
  req.write(user);
  req.end();
  req.on('error', function(err){
    console.log(err);
  });

}


doLogin();