
var express = require('express');
var config = require('../config.json');
var router = express.Router();
var cv = require('opencv');
var unirest = require('unirest');
var watchman = require('chokidar');

var trainer = require ('./trainer');
var recognizer = require ('./recognizer');

var cameraOptions = {
    width       : 600,
    height      : 338,
    mode        : "timelapse",
    ex          : "sports",
    awb         : 'cloud',
    output      : 'public/images/camera.jpg',
    q           : 80,
    rot         : 0,
    nopreview   : true,
    timeout     : 1000,
    timelapse   : 9999,
    th          : "0:0:0"
};
//var COLOR = [0, 255, 0]; // default red
var camera = new require("raspicam")(cameraOptions);

var watcher = watchman.watch('/home/pi/work/test1/noderpi/images/', {ignored: /[\/\\]\./, persistent: true});

camera.start();

/* GET home page. */
router.get('/', function(req, res) {
res.render('index', { title: 'iMommy' }); 
});


router.post('/phototrain', function(req, res){
    trainer.trainFaceImage(req,res);
});


router.post('/photorec',function (req, res){
    recognizer.recognizeFace(req,res);
});


camera.on("exit", function restartAction(){
    camera.stop();
    cv.readImage("/home/pi/work/test1/noderpi/public/images/camera.jpg", function readAndDetect(err, im){
    if (err) throw err;
    if (im.width() < 1 || im.height() < 1) throw new Error('Image has no size');
    //var cannyImage = im.copy(5, 300);
    //img_hsv.convertHSVscale();
    //img_gray.convertGrayscale();
    //cannyImage.convertGrayscale();
    //cannyImage.canny(5,300);
    //cannyImage.save('/home/pi/work/test1/noderpi/images/camera_canny.jpg');

    im.detectObject(cv.FACE_CASCADE, {}, function(err, faces){
                if (err) throw err;
                if (!faces.length) return console.log("No Faces");
                console.log('Number of Faces:', faces.length);
                for (var j = 0; j < faces.length; j++){
                    var extrFace = faces[j];
                    var ims = im.size();
                    var im2 = im.roi(extrFace.x, extrFace.y, extrFace.width, extrFace.height);
                    im2.save('/home/pi/work/test1/noderpi/images/face-extracted' + j + '.png');
                    console.log('Image saved to face-extracted' + j + '.png');
                }
            });
    });
    console.log('Restarting camera...')
    camera.start()
});

watcher.on('add', function callRecognitionService(path) {
    console.log('File', path, 'has been added');
    console.log('Calling Web Service to recognize');
    recognizer.recognizeExtractedFace(path);
});

watcher.on('change', function callRecognitionService(path) {
    console.log('File', path, 'has been changed');
    console.log('Calling Web Service to recognize extracted face');
    recognizer.recognizeExtractedFace(path);
});

module.exports = router;
