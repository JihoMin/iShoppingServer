/*
s : http 사용 위해
- multer : upload된 파일 저장할 디렉토리 지정, 파일 이름 생성 규칙
- mongoose : 서버상의 로컬 디비와 연결
다른 모듈과의 dependency
- routes
*/

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const mongoose = require('mongoose');

const imageModule = require('./image');
const path = require('path');
const fs = require('fs');
const del = require('del');

let UPLOAD_PATH = 'uploads/';
let PORT = 80;

//multer Settings for file upload

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, UPLOAD_PATH)
    },
    filename: function(req, file, cb){
        cb(null, file.fieldname + '-'+Date.now())
    }
})

let upload = multer ({ storage: storage})

const app = express();
app.use(cors());

let uri = 'mongodb://localhost/imageupload';
mongoose.connect(uri, (err) => {
    if(err) {
        console.log(err);
    } else {
        console.log('Connected to MongoDb');
    }
});

app.listen(PORT, function () {
    console.log('listening on port: ' + PORT);
});

module.exports = {
    UPLOAD_PATH: UPLOAD_PATH,
    PORT: PORT,
    upload: upload,
    app: app
};

// Get all uploaded images
app.get('/images', (req, res, next) => {
    // use lean() to get a plain JS object
    // remove the version key from the response
    imageModule.Image.find({}, '-__v').lean().exec((err, images) => {
        if (err) {
            res.sendStatus(400);
        }

        // Manually set the correct URL to each image
        for (let i = 0; i < images.length; i++) {
            var img = images[i];
            img.url = req.protocol + '://' + req.get('host') + '/images/' + img._id;
        }
        res.json(images);
    })
});


// Upload a new image with description
app.post('/images', upload.single('image'), (req, res, next) => {
    // Create a new image model and fill the properties
    let newImage = new imageModule.Image;
    newImage.filename = req.file.filename;
    newImage.originalName = req.file.originalname;
    newImage.desc = req.body.desc
    newImage.save(err => {
        if (err) {
            return res.sendStatus(400);
        }
        res.status(201).send({ newImage });
    });

})

// Get one image by its ID
app.get('/images/:id', (req, res, next) => {
    let imgId = req.params.id;
     imageModule.Image.findById(imgId, (err, image) => {
        if (err) {
            res.sendStatus(400);
        }
        // stream the image back by loading the file
        res.setHeader('Content-Type', 'image/jpeg');
        fs.createReadStream(path.join(UPLOAD_PATH, image.filename)).pipe(res);
    })
});

// Delete one image by its ID
app.delete('/images/:id', (req, res, next) => {
    let imgId = req.params.id;

     imageModule.Image.findByIdAndRemove(imgId, (err, image) => {
        if (err && image) {
            res.sendStatus(400);
        }
	console.log("delete: ", image);
        del([path.join(UPLOAD_PATH, image.filename)]).then(deleted => {
            res.sendStatus(200);
        })
    })
});

