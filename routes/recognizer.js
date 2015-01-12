
var express = require('express');
var config = require('../config.json');
var router = express.Router();
var cv = require('opencv');
var unirest = require('unirest');
var http = require('http'); 
var fs = require('fs');
var Prowl = require('prowler');

process.addListener('uncaughtException', function(exception) {
    console.log(exception.message)
    console.log(exception.stack)
});


module.exports = {
    recognizeFace: function (req, res){
        unirest.get(config.serviceRoot + "faces/recognize?api_key=" + config.key + 
        "&api_secret=" + config.secret + "&uids=all" + "&urls=" + 
        req.body.picture + "&namespace=" + 'iMommy' + "&detector=aggresive&attributes=none&limit=3",
        function (response) {

            if (response.error) {
                res.send(500, response.error);
            }
            //because the API can return a success error code but not recognize any face we need to
            //check if we got a picture with a face detected.
            else if (!response.body.photos[0].tags || !response.body.photos[0].tags[0]) {
            res.send(400, { message: 'sorry, no photos detected in this image' });
            }

            //there will only be 1 photo and 1 face in it
            var tag = response.body.photos[0].tags[0];
        
            //if a tag has any uids, it means that the api has some guesses about who this is!
            if (tag.uids) {
            
            res.render('imageAnalysis', { photoUrl: response.body.photos[0].url, uids: tag.uids });
            }

            else {
                res.send(400, { message: 'The API has no guesses as to who is in the photo' });
                }
            });  
    },
    recognizeExtractedFace: function (filePath){
        
        unirest.post(config.serviceRoot + "faces/recognize")
        .headers({ 'Accept': 'application/json' })
        .field('api_key', config.key) // Form field
        .field('api_secret', config.secret) // Form field
        .field('uids', 'all') // Form field
        .field('namespace', 'iMommy') // Form field
        .field('detector', 'aggresive') // Form field
        .field('attributes', 'all') // Form field
        .field('limit', '3') // Form field
        .attach('file', filePath) // Attachment
        .end(function (response) {

            console.log('Webservice Response:' + response.raw_body);
            if (response.error) {
                console.log ('Error 500' + response.error);
                return
            }
            //because the API can return a success error code but not recognize any face we need to
            //check if we got a picture with a face detected.
            else if (!response.body.photos[0].tags || !response.body.photos[0].tags[0]) {
            console.log ('Error 400:sorry, no photos detected in this image--Code:' + response.code + ' StatusType:' + response.statusType);
            return;
            //res.send(400, { message: 'sorry, no photos detected in this image' });
            }

            //there will only be 1 photo and 1 face in it
            var tag = response.body.photos[0].tags[0];
        
            //if a tag has any uids, it means that the api has some guesses about who this is!
            if (tag.uids) {
            console.log ('Succes - Got tags' + tag.uids );
            var notification = new Prowl.connection(config.prowlApiKey);
            notification.send({
                'application': 'iSecurity' // 256 max -  The name of your application or the application generating the event.
                ,'event': 'Face detect Event' // 1024 max - The name of the event or subject of the notification.
                ,'description': 'A new face detected' // 10000 max -    A description of the event, generally terse.
                ,'priority': 0 
                }, function(err, info) {
                console.log(info);
            });
            return;
            //res.render('imageAnalysis', { photoUrl: response.body.photos[0].url, uids: tag.uids });
            }

            else {
                console.log ('Error 400:The API has no guesses as to who is in the photo');
                return;
                //res.send(400, { message: 'The API has no guesses as to who is in the photo' });
                }
            });  
    }

};