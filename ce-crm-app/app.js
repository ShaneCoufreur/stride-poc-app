const _ = require('lodash');
const http = require('http');
const expressLib = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const express = expressLib();

require('dotenv').config();
express.use(bodyParser.json());
express.use(bodyParser.urlencoded({ extended: true }));
express.use(expressLib.static('.'));

let PORT = process.env.PORT;
let app = {};
app.clientId = process.env.CLIENT_ID;
app.clientSecret = process.env.CLIENT_SECRET;
app.environment = process.env.ENV ? process.env.ENV : "production";

const stride = require('./stride')(app);

const getJWT = (req) => {
    //Extract the JWT token from the request
    //Either from the "jwt" request parameter
    //Or from the "authorization" header, as "Bearer xxx"
    var encodedJwt = req.query['jwt'] ||
        req.headers['authorization'].substring(7) ||
        req.headers['Authorization'].substring(7);

    // Decode the base64-encoded token, which contains the context of the call
    var decodedJwt = jwtUtil.decode(encodedJwt, null, true);

    var jwt = { encoded: encodedJwt, decoded: decodedJwt };
    return jwt;
};

const validateJWT = (req, res, next) => {
    try {

        var jwt = getJWT(req);

        var conversationId = jwt.decoded.context.resourceId;
        var cloudId = jwt.decoded.context.cloudId;
        var userId = jwt.decoded.sub;

        // Validate the token signature using the app's OAuth secret (created in DAC App Management)
        // (to ensure the call comes from Stride)
        jwtUtil.decode(jwt.encoded, app.clientSecret);

        //all good, it's from Stride, add the context to a local variable
        res.locals.context = { cloudId: cloudId, conversationId: conversationId, userId: userId };

        // Continue with the rest of the call chain
        console.log('Valid JWT');
        next();
    } catch (err) {
        console.log('Invalid JWT');
        res.sendStatus(403);
    }
};


express.post('/bot-mention',
    validateJWT,
    (req, res) => {
        console.log('bot mention');

        stride.sendTextReply(req.body, "", (err, response) => {
            //If you don't send a 200, Stride will try to resend it
            res.sendStatus(200);
            hiFromLuke();
        });

        const hiFromLuke = (next) => {
            stride.sendTextReply(req.body, "Hey, it's Luke!", (err, res) => {
                let messTxt = req.body.message.text;
                console.log("Message: " + messTxt);
                const doc = new Document();
                doc.paragraph()
                    .text("Did you just say " + messTxt + "?");
                let reply = doc.toJSON();
                stride.sendDocumentReply(req.body, reply, (err, res) => {
                    console.log(res);
                    if (next) {
                        next();
                    }
                });
            });
        }
    });


express.get('/descriptor', (req, res) => {
    fs.readFile('./app-descriptor.json', (err, descriptorTemplate) => {
        var template = _.template(descriptorTemplate);
        var descriptor = template({
            host: 'https://' + req.headers.host
        });
        res.set('Content-Type', 'application/json');
        res.send(descriptor);
    });
});