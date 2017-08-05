//var express = require("express");
// var xml = require('xml');
var jsonxml = require('jsontoxml');
var parseString = require('xml2js').parseString;
var url = require('url'); //gets the requests
var http = require('http');
var crypto = require('crypto'); //needed for sha1
var querystring = require('querystring'); //needed to parse the requests to string

var token = "TestWechat";

function send404Response(response){
    response.writeHead(404,{"Content-Type":"text/plain"});
    response.write("404:Page Not Found");
    response.end()
}

function verify(req, res) {
    /*** 
    NOTE: the verification only worked when i made it a post methon not as a 
    ***/
  //If it is HTTP POST
  if(req.method === 'POST'){
    var body = ''; //var used to get all the data in req
    var textResponse;
    //var qrCode;
    var isText = false;
    var isSubscribing = false;
    //var isQRCode = false;
    var textResposeXML;

    req.on('data', function (data) {
        body += data;

        if (body.length > 1e6)
            req.connection.destroy();
    });

    req.on('end', function () {
        parseString(body, function (err, result) {
            console.dir(result);//prints out users entry

            if(result.xml.MsgType[0] == 'text'){
                isText = true; //confirming that the user entered a text message
                 textResponse = {xml:[ //the response back to the user
                    {ToUserName: result.xml.FromUserName[0]},
                    {FromUserName: result.xml.ToUserName[0]},
                    {CreateTime: Math.floor(new Date() / 1000)},
                    {MsgType: 'text'},
                    {Content: 'Hello'}]
                };
                textResposeXML = jsonxml(textResponse); //converts the JSON obj to xml so it can be sendable
                console.dir(textResposeXML);//show the response you are sending(in XML) on console
            }

            else if (result.xml.MsgType[0] == 'event' && result.xml.Event[0] == 'subscribe'){
                isSubscribing = true; // confirming that the user is trying to subscribe
            } 
        });
    });

    checkOneSec(function (){
        //sends the text (in XML format) to user
        if(isText){
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.write(textResposeXML);
            res.end(); 
            return;
        }

        //if the user is subsctibing go through verification
        else if(isSubscribing){
            //getting the query information from URL
            var queryObj = querystring.parse(url.parse(req.url).query);

            //Get signature, timestamp, nonce code, echostring
            var signature = queryObj.signature;
            var timestamp = queryObj.timestamp;
            var nonce = queryObj.nonce;
            var echostr = queryObj.echostr;

            //Recalculating the SHA1  and signature from the above query parameters
            var sha1Function = crypto.createHash('sha1');
            var shouldBeSig = sha1Function.update([token, timestamp, nonce].sort().join('')).digest('hex'); //token is a predefined secret code inside WeChat Service configuration

            console.log("this should be the signature: " + shouldBeSig);
            console.log("this is your signature: "+signature)

            //Prepare Response
            res.writeHead(200, {'Content-Type': 'text/plain'}); //Response type is plain text
            return res.end((shouldBeSig === signature) ? echostr : '');
            res.send(req.query.echostr);
        }
    });  
  }
  else{
    send404Response(res);
    res.end();
  }} //end of verify

/***
    This function is a one second callback
***/
function checkOneSec(callback){
    setTimeout(callback,1000);
}
/***
    This function is a five second
***/
function checkFiveSec(callback){
    setTimeout(callback,5000);
}
http.createServer(verify).listen(8888);
console.log("Server is now running...");
