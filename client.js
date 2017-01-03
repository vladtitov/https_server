"use strict";
var https = require('https');
var options = {
    hostname: '192.168.1.11',
    method: 'POST',
    port: 443,
    path: '/login',
    rejectUnauthorized: false,
    requestCert: true,
    agent: false,
    headers: { 'x-requested-with': 'hello headers', 'Content-Type': 'application/json' }
};
function getData() {
    options.path = '/getdata';
    var req = https.request(options, function (resp) {
        parseBody(resp, function (result) {
            console.log(result);
        });
    });
    var data = JSON.stringify({ data: 'mydata', data2: 'mydata2' });
    req.write(data);
    req.end();
    req.on('error', function (err) {
        console.log(err);
    });
}
function parseBody(resp, callBack) {
    var body = '';
    resp.on('data', function (data) {
        body += data;
    });
    resp.on('end', function () {
        callBack(JSON.parse(body));
    });
}
function doLogin() {
    options.path = '/login';
    var req = https.request(options, function (resp) {
        parseBody(resp, function (result) {
            console.log(result);
            if (result.status === 'OK') {
                options.headers['x-requested-with'] = resp.headers['x-requested-with'];
                getData();
            }
        });
    });
    var user = JSON.stringify({ username: 'adminuser', password: 'adminpassword' });
    req.write(user);
    req.end();
    req.on('error', function (err) {
        console.log(err);
    });
}
doLogin();
