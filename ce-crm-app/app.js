const _ = require('lodash');
const http = require('http');
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