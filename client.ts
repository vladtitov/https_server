/**
 * Created by Vlad on 1/2/2017.
 */
/// <reference path="scripts/typings/node/node.d.ts" />
var request = require('request');
var https =  require('https');
var fs = require('fs');

let user = JSON.stringify({username:'adminuser',password:'adminpassword'});


var options = {
  hostname: '192.168.1.11',
  method: 'POST',
  port:443,
  path:'/login',
  rejectUnauthorized: false,
  requestCert: true,
  agent: false,
  headers:{'x-requested-with':'hello headers'}
  //key: fs.readFileSync('data/server.key'),
  //cert: fs.readFileSync('data/server.crt')
};


let req = https.request(options, function(res) {
 //console.log(arguments) ;
  var body = '';

 console.log(res.headers['x-requested-with']);
  res.on('data', function(data){
    //console.log(data);
    body+=data;
  });

  res.on('end', function(){
    console.log( 'body '+ body );
  });

});

req.write(user);
req.end();

req.on('error', function(err){
  console.log(err);
});
