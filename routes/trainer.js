
var express = require('express');
var config = require('../config.json');
var router = express.Router();
var cv = require('opencv');
var unirest = require('unirest');


module.exports = {

    trainFaceImage: function (req, res) {

    var response = "";
    var restReqUrl = config.serviceRoot + "faces/detect?api_key=" + config.key + "&api_secret=" + config.secret + "&urls=" + req.body.pictures;
    console.log('I am at phototrain sending request to:' + restReqUrl);
    unirest.get(restReqUrl, function (faceDetectResponse) {
        
        if (faceDetectResponse.error) {
            console.log('500 error: ' + faceDetectResponse.error);
            return res.status(500).send(faceDetectResponse.error);
        }
        var body = faceDetectResponse.body;
        var tags = "";
        for (var i in body.photos) {
            
            if (body.photos[i].tags) {
                //pictures of people with only 1 face in it.
                if (body.photos[i].tags.length > 1) {
                    res.send(400, { message: 'You must send photos with clearly only 1 face in it. This photo has more than one face ' + body.photos[i].url });
                    return;
                }
                
                if (body.photos[i].tags.length === 1) {
                    tags += body.photos[i].tags[0].tid + ',';
                }
            }
        }
        console.log('Got the tag ids: ' + tags);       
        //check if we didn't get any faces at all. If so, error out.
        if (tags.length == 0) {
            res.send(400, { message: 'None of the photos you sent had faces in it. ' + body.photos[i].url });
            return;
        }   
        //save the tags tagged as the name provided
        unirest.get(config.serviceRoot  + "tags/save?api_key=" + config.key + "&api_secret=" + config.secret + "&uid=" + req.body.name + '@' + 'iMommy' + "&tids=" + tags,
        function (tagSaveResponse) {
           //if we have an error return back a 500 error to the client
            if (tagSaveResponse.error) {
                return res.send(500, tagSaveResponse.error);
            }
            //now execute the training for the set of images provided for the face
            unirest.get(config.serviceRoot + "faces/train?api_key=" + config.key + "&api_secret=" + config.secret + "&uids=" + req.body.name + '@' + 'iMommy',
            function (faceTrainResponse) {

                if (tagSaveResponse.error) {
                
                    return res.send(500, faceTrainResponse.error);
                
                }

                for (var i in faceDetectResponse.body.photos) {
                    var photo = faceDetectResponse.body.photos[i];
                    var tag = photo.tags[0];
                    tag.eye_left.x = (tag.eye_left.x / 100) * photo.width;
                    tag.eye_left.y = (tag.eye_left.y / 100) * photo.height;
                    tag.eye_right.y = (tag.eye_right.y / 100) * photo.height;
                    tag.eye_right.x = (tag.eye_right.x / 100) * photo.width;
                    tag.mouth_center.x = (tag.mouth_center.x / 100) * photo.width;
                    tag.mouth_center.y = (tag.mouth_center.y / 100) & photo.height;
                    tag.nose.x = (tag.nose.x / 100) * photo.width;
                    tag.nose.y = (tag.nose.y / 100) * photo.height;
                    
                }
                             res.render('imageTraining', { data: faceDetectResponse.body });
            });

        });

    });
    }
}