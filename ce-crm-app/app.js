"use strict";

const _ = require('lodash');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');
const jsonpath = require('jsonpath');
const { Document } = require('adf-builder');
const prettyjson = require('prettyjson');
const request = require('request');
const jwt_decode = require('jwt-decode');
const ce = require('./ce-util');
const lukeStore = require('./luke-store');
const unfurl = require('./unfurl');

require('dotenv').config();

function prettify_json(data, options = {}) {
    return '{\n' + prettyjson.render(data, options) + '\n}';
}

const { PORT = 8000, ENV = 'production' } = process.env;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

/**
 * Simple library that wraps the Stride REST API
 */
const strideProper = require('./stride.js');

var stridef = {};

function addFlavor(key) {
    const idKey = key.toUpperCase() + '_CLIENT_ID';
    const secretKey = key.toUpperCase() + '_CLIENT_SECRET';

    if (!process.env[idKey] || !process.env[secretKey]) {
        return
    }

    console.log("ENABLED FLAVOR: " + key);
    stridef[key] = strideProper.factory({
        clientId: process.env[idKey],
        clientSecret: process.env[secretKey],
        env: ENV,
    })
}

addFlavor('sfdc');
addFlavor('hubspotcrm');
addFlavor('closeio');

const flavorName = {
    'sfdc': "Salesforce",
    'hubspotcrm': "HubSpot CRM",
    'closeio': "Close.IO",
}

const flavorRegex = {
    'sfdc': "[0-9A-Za-z][0-9A-Za-z][0-9A-Za-z][0-9A-Za-z][0-9A-Za-z][0-9A-Za-z][0-9A-Za-z]+",
    'hubspotcrm': "https://app[.]hubspot[.]com/",
    'closeio': "https://app[.]close[.]io/",
}

if (Object.keys(stridef).length === 0) {
    console.log("*** NO FLAVORS ENABLED ***; supply {flavor}_CLIENT_ID and {flavor}_CLIENT_SECRET");
    process.exit(1);
}


function validateJWTFlavor(req, res, next) {
    const flavor = req.params.flavor;

    if (!stridef[flavor]) {
        console.log(`Oops, for ${req.path} flavor ${flavor} is not defined`);
        res.sendStatus(404);
        return
    }
    stridef[flavor].validateJWT(req, res, next);
}

/**
 * This implementation doesn't make any assumption in terms of data store, frameworks used, etc.
 * It doesn't have proper persistence, everything is just stored in memory.
 */
const configStore = {};
const installationStore = {};


/**
 * Installation lifecycle
 * ----------------------
 * When a user installs or uninstalls your app in a conversation,
 * Stride makes a REST call to an endpoint specified in the app descriptor:
 *       "lifecycle": {
 *           "installed": "/some/url",
 *           "uninstalled": "/some/url"
 *       }
 * At installation, Stride sends the context of the installation: cloudId, conversationId, userId
 * You can store this information for later use.
 */
app.post('/:flavor/installed',
    //validateJWTFlavor,  // TODO, JWT isn't standard form
    (req, res, next) => {
        const flavor = req.params.flavor;
        const stride = stridef[flavor];

        console.log('- app installed in a conversation');
        const { cloudId, userId } = req.body;
        const conversationId = req.body.resourceId;

        // Store the installation details
        if (!installationStore[conversationId]) {
            installationStore[conversationId] = {
                cloudId,
                conversationId,
                installedBy: userId,
            }
            console.log('  Persisted for this conversation:', prettify_json(installationStore[conversationId]));
        } else
            console.log('  Known data for this conversation:', prettify_json(installationStore[conversationId]));


        // Send a message to the conversation to announce the app is ready
        stride.sendTextMessage({
                cloudId,
                conversationId,
                text: "Hi! I don't do anything right now.",
            })
            .then(() => res.sendStatus(200))
            .catch(next);
    });

app.post('/:flavor/uninstalled',
    //validateJWTFlavor,  // TODO, JWT isn't standard form
    (req, res) => {
        console.log('- app uninstalled from a conversation');
        const conversationId = req.body.resourceId;

        // note: we can't send message in the room anymore

        // Remove the installation details
        installationStore[conversationId] = null;

        res.sendStatus(204);
    });


function myLeadCard(lead) {
    console.log("LEAD CARD: " + prettify_json(lead));

    const doc = new Document();

    doc.paragraph()
        .text('Lead ')
        .link(lead.id, lead.url)
        .text(' from ')
        .link('ZIP ' + lead.zipcode, "http://www.melissadata.com/lookups/MapZipV.asp?zip=" + lead.zipcode)

    const card = doc.applicationCard('Lead: ' + lead.name)
        .link(lead.url)
        .description('Phone: ' + lead.phone);


    var img = process.env.APP_URL + '/img/x-mark.svg';
    if (/Working/.exec(lead.status)) {
        img = process.env.APP_URL + '/img/check-mark.svg';
    }

    card.detail()
        .title('Status')
        .text(lead.status)
        .icon({
            url: img,
            label: 'Task'
        });
    return doc.toJSON();
}

function postOpportunityCard(flavor, cloudId, conversationId, opp) {
    const doc = new Document();

    doc.paragraph()
        .text('Opportunity ' + opp.id)

    const card = doc.applicationCard('Opportunity: ' + opp.name)
        .description('Value: $' + opp.amount);
    card.detail()
        .title('Stage')
        .text(opp.stage)
    const document = doc.toJSON();

    const stride = stridef[flavor];

    stride.sendMessage({ cloudId, conversationId, document })
        .catch(err => console.error('  Something went wrong', prettify_json(err)));
}

function postContactCard(flavor, cloudId, conversationId, con) {
    const doc = new Document();

    doc.paragraph()
        .text('Opportunity ' + con.id)

    const card = doc.applicationCard('Contact: ' + con.firstName + ' ' + con.lastName)
        .description('Email: ' + con.email);
    const document = doc.toJSON();

    const stride = stridef[flavor];

    stride.sendMessage({ cloudId, conversationId, document })
        .catch(err => console.error('  Something went wrong', prettify_json(err)));
}

function postAccountCard(flavor, cloudId, conversationId, acc) {
    const doc = new Document();

    doc.paragraph()
        .text('Account ' + acc.id)

    const card = doc.applicationCard('Account: ' + acc.name)
        .description(acc.description);
    const document = doc.toJSON();

    const stride = stridef[flavor];

    stride.sendMessage({ cloudId, conversationId, document })
        .catch(err => console.error('  Something went wrong', prettify_json(err)));
}

function getObject(flavor, conv, schema, id, then) {

    const inst = lukeStore.getInstance(conv, flavor);
    if (!inst) {
        return;
    }

    const elem = inst.token;

    var options = {
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/hubs/crm/' + schema + '/' + id,
        headers: {
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG + ", Element " + elem,
            'accept': "application/json",
        },
        method: 'GET',
        json: true
    };

    console.log("Calling with options: " + prettify_json(options));

    request(options, (err, response, body) => {
        if (checkForErrors(err, response, body)) {
            return;
        }
        console.log("Yo, got an answer: " + prettify_json(body));
        if (response.statusCode === 200) {
            then(body);
        }
    })
}

function replyWithLead(flavor, stride, req, next, convo) {
    const reqBody = req.body;
    const cloudId = req.body.cloudId;
    const conversationId = req.body.conversation.id;

    const match = /lead ([A-Za-z0-9]+)/.exec(req.body.message.text);
    var id = "00Q1I000003BYc6UAG";
    if (match) {
        id = match[1];
    }

    getObject(flavor, convo, 'stride-crm-lead', id, (lead) => {
        if (lead) {
            const document = myLeadCard(lead);
            stride.sendMessage({ cloudId, conversationId, document })
                .catch(err => console.error('  Something went wrong', prettify_json(err)));
        }
    })
}

app.post('/:flavor/message',
    validateJWTFlavor,
    (req, res, next) => {
        const flavor = req.params.flavor;
        const stride = stridef[flavor];

        console.log('- (' + flavor + ') bot message', prettify_json(req.body));
        res.sendStatus(200);
        const reqBody = req.body;
        const cloudId = req.body.cloudId;
        const conversationId = req.body.conversation.id;

        const find = unfurl[flavor];
        const candidates = find(req.body.message.text);

        candidates.forEach((c) => {
            console.log("Checking " + JSON.stringify(c));

            switch (c.type) {
                case "opportunity":
                    stride.sendTextMessage({
                        cloudId,
                        conversationId,
                        text: "what about opportunity " + c.id + "?",
                    })
                    getObject(flavor, conversationId, 'stride-crm-opportunities', c.id, (obj) => {
                        if (obj) {
                            console.log("OPP " + prettify_json(obj))
                            postOpportunityCard(flavor,
                                cloudId,
                                conversationId,
                                obj);
                        }
                    })
                    break;

                case "account":
                    stride.sendTextMessage({
                        cloudId,
                        conversationId,
                        text: "what about account " + c.id + "?",
                    })

                    getObject(flavor, conversationId, 'accounts', c.id, (obj) => {
                        if (obj) {
                            console.log("Yo " + prettify_json(obj))
                        }
                    })
                    break;

                case "lead":
                    getObject(flavor, conversationId, 'stride-crm-lead', c.id, (lead) => {
                        if (lead) {
                            const document = myLeadCard(lead);
                            stride.sendMessage({ cloudId, conversationId, document })
                                .catch(err => console.error('  Something went wrong', prettify_json(err)));
                        }
                    })
            }
        });
    })


const newContact = /new contact ([A-Za-z]+) ([A-Za-z]+)(.*)/;
const emailPattern = /[A-Za-z][.A-Za-z0-9]*@[A-Za-z0-9.]+/
const phonePattern1 = /\([0-9]{3}\) *[0-9]{3}-[0-9]{4}/
const phonePattern2 = /\+[1-9][0-9]* [0-9 -]+/

function createNewContact(flavor, conversationId, text, match) {
    const firstName = match[1];
    const lastName = match[2];
    const extras = match[3];

    const emailMatch = emailPattern.exec(extras);
    const phoneMatch = phonePattern1.exec(extras) || phonePattern2.exec(extras);
    console.log("Thinking about '" + extras + "'")
    console.log("EMAIL: " + JSON.stringify(emailMatch));
    console.log("Phone: " + JSON.stringify(phoneMatch));

    var contact = {
        firstName: firstName,
        lastName: lastName,
    }
    if (emailMatch) {
        contact.email = emailMatch[0];
    }
    if (phoneMatch) {
        contact.phone = phoneMatch[0];
    }

    const inst = lukeStore.getInstance(conversationId, flavor);
    if (!inst) {
        console.log("No instance <" + conversationId + "> (" + flavor + ")");
        return;
    }

    console.log("Creating contact: " + JSON.stringify(contact));

    const options = {
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/hubs/crm/stride-crm-contacts',
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG + ", Element " + inst.token,
        },
        method: 'POST',
        body: contact,
        json: true
    }
    request(options, (err, response, body) => {
        if (checkForErrors(err, response, body)) {
            console.log("bummer");
            return;
        }
        console.log("success: " + JSON.stringify(body));
    });
}


/**
 * chat:bot
 * --------
 * This function is called anytime a user mentions the bot in a conversation.
 * You first need to declare the bot in the app descriptor:
 * "chat:bot": [
 *   {
 *     "key": "refapp-bot",
 *     "mention": {
 *      "url": "https://740a1ad5.ngrok.io/bot-mention"
 *     }
 *   }
 * ]
 *
 */

app.post('/:flavor/bot-mention',
    validateJWTFlavor,
    (req, res, next) => {
        const flavor = req.params.flavor;
        const stride = stridef[flavor];
        console.log('- (' + flavor + ') bot mention', prettify_json(req.body));

        var m = newContact.exec(req.body.message.text);
        if (m !== null) {
            res.sendStatus(200);
            createNewContact(flavor,
                req.body.conversation.id,
                req.body.message.text,
                m);
            return;
        }

        if (/lead/.exec(req.body.message.text)) {
            res.sendStatus(200);
            return replyWithLead(flavor, stride, req, next, req.body.conversation.id);
        }

        const reqBody = req.body;

        let user; // see getAndReportUserDetails

        stride.replyWithText({ reqBody, text: "Oh, hello there!" })
            // If you don't send a 200 fast enough, Stride will resend you the same mention message
            .then(() => res.sendStatus(200))
            .then(() => sendAPersonalizedResponse({ stride, reqBody }))
            // Now let's do the time-consuming things:
            //.then(allDone)
            .then(() => showInstance(reqBody.conversation.id))
            .then(r => stride.replyWithText({ reqBody, text: "Hey, my Cloud Elements instance id is: " + r }))
            .catch(err => console.error('  Something went wrong', prettify_json(err)));

        async function allDone() {
            await stride.replyWithText({ reqBody, text: "OK, that's all I got!" });
            console.log("- all done.");
        }
    }
);

// sends a message with the user's nickname
async function sendAPersonalizedResponse({ stride, reqBody }) {
    const { cloudId } = reqBody;
    const conversationId = reqBody.conversation.id;
    const senderId = reqBody.sender.id;
    let user;
    await getAndReportUserDetails();

    async function getAndReportUserDetails() {
        //await stride.replyWithText({reqBody, text: "Getting user details for the sender of the message..."});
        user = await stride.getUser({ cloudId, userId: senderId });
        //await stride.replyWithText({reqBody, text: "This message was sent by: " + user.displayName});

        //console.log(user);

        let responses = [
            "I don't really do anything yet, " + user.nickName + ".",
            "I don't do much right now, " + user.nickName + ".",
            "Well, hello world to you, too, " + user.nickName + ".",
            "Check back later, " + user.nickName + ", I'm still pretty new here."
        ];

        let aNiceResponse = responses[Math.floor(Math.random() * responses.length)]

        stride.replyWithText({ reqBody, text: aNiceResponse });

        console.log("- personalized response.");
        return user;
    }

}

/**
 * core:webhook
 *
 * Your app can listen to specific events, like users joining/leaving conversations, or conversations being created/updated
 * Note: webhooks will only fire for conversations your app is authorized to access
 */

app.post('/:flavor/conversation-updated',
    validateJWTFlavor,
    (req, res) => {
        console.log('A conversation was changed: ' + req.body.conversation.id + ', change: ' + prettify_json(req.body.action));
        res.sendStatus(200);
    }
);

app.post('/:flavor/roster-updated',
    validateJWTFlavor,
    (req, res) => {
        console.log('A user joined or left a conversation: ' + req.body.conversation.id + ', change: ' + prettify_json(req.body.action));
        res.sendStatus(200);
    }
);

/**
 * chat:configuration
 * ------------------
 * Your app can expose a configuration page in a dialog inside the Stride app. You first declare it in the descriptor:
 * TBD
 */

app.get('/:flavor/module/config',
    //validateJWTFlavor,
    (req, res) => {

        const flavor = req.params.flavor;

        fs.readFile('./app-module-config.html', (err, htmlTemplate) => {
            const template = _.template(htmlTemplate);
            const html = template({
                flavor: flavor,
                flavorName: flavorName[flavor],
            });
            res.set('Content-Type', 'text/html');
            res.send(html);
        });
    });

// Get the configuration state: is it configured or not for the conversation?
app.get('/:flavor/module/config/state',
    // cross domain request
    cors(),
    validateJWTFlavor,
    (req, res) => {
        const conversationId = res.locals.context.conversationId;
        console.log("getting config state for conversation " + conversationId);
        const config = configStore[res.locals.context.conversationId];
        const state = { configured: true };
        if (!config)
            state.configured = false;
        console.log("returning config state: " + prettify_json(state));
        res.send(JSON.stringify(state));
    }
);

// Get the configuration content from the configuration dialog
app.get('/:flavor/module/config/content',
    cors(),
    validateJWTFlavor,
    (req, res) => {
        const conversationId = res.locals.context.conversationId;
        console.log("getting config content for conversation " + conversationId);
        const config = configStore[res.locals.context.conversationId] || { notificationLevel: "NONE" };
        res.send(JSON.stringify(config));
    }
);

// Save the configuration content from the configuration dialog
app.post('/:flavor/module/config/content',
    validateJWTFlavor,
    (req, res, next) => {
        const cloudId = res.locals.context.cloudId;
        const conversationId = res.locals.context.conversationId;
        const flavor = req.params.flavor;
        const stride = stridef[flavor];

        console.log("saving config content for conversation " + conversationId + ": " + prettify_json(req.body));
        configStore[conversationId] = req.body;
        console.log("cloudId " + cloudId);

        stride.updateConfigurationState({ cloudId, conversationId, configKey: 'cebot-config', state: true })
            .then(() => res.sendStatus(204))
            .catch(next);
    }
);

app.get('/:flavor/module/dialog',
    validateJWTFlavor,
    (req, res) => {
        res.redirect("/app-module-dialog.html");
    }
);

/**
 * chat:glance
 * ------------
 * To contribute a chat:glance to the Stride right sidebar, declare it in the app descriptor
 *  "chat:glance": [
 * {
 *   "key": "refapp-glance",
 *  "name": {
 *     "value": "App Glance"
 *   },
 *   "icon": {
 *     "url": "/icon.png",
 *     "url@2x": "/icon.png"
 *   },
 *   "target": "refapp-sidebar",
 *   "queryUrl": "/module/glance/state"
 * }
 * ]
 * This adds a glance to the sidebar. When the user clicks on it, Stride opens the module whose key is specified in "target".
 *
 * When a user first opens a Stride conversation where the app is installed,
 * the Stride app makes a REST call to the queryURL to get the initial value for the glance.
 * You can then update the glance for a conversation at any time by making a REST call to Stride.
 * Stride will then make sure glances are updated for all connected Stride users.
 **/

app.get('/:flavor/module/glance/state',
    // cross domain request
    cors(),
    validateJWTFlavor,
    (req, res) => {
        const flavor = req.params.flavor;

        res.send(
            JSON.stringify({
                "label": {
                    "value": "CE " + flavorName[flavor],
                }
            }));
    }
);

/*
 * chat:sidebar
 * ------------
 * When a user clicks on the glance, Stride opens an iframe in the sidebar, and loads a page from your app,
 * from the URL specified in the app descriptor
 * 		"chat:sidebar": [
 * 		 {
 * 		    "key": "refapp-sidebar",
 * 		    "name": {
 * 		      "value": "App Sidebar"
 * 		    },
 * 		    "url": "/module/sidebar",
 * 		    "authentication": "jwt"
 * 		  }
 * 		]
 **/

app.get('/:flavor/module/sidebar',
    validateJWTFlavor,
    (req, res) => {
        res.redirect("/app-module-sidebar.html");
    }
);

app.get('/:flavor/glance.svg',
    (req, res) => {
        const flavor = req.params.flavor;
        const src = `flavor/${flavor}/glance.svg`;

        fs.readFile(src, (err, data) => {
            res.set('Content-Type', 'image/svg+xml');
            res.send(data);
        });
    });


/**
 * Making a call from the app front-end to the app back-end:
 * You can find the context for the request (cloudId, conversationId) in the JWT token
 */

app.post('/:flavor/ui/ping',
    validateJWTFlavor,
    (req, res) => {
        console.log('Received a call from the app frontend ' + prettify_json(req.body));
        const cloudId = res.locals.context.cloudId;
        const conversationId = res.locals.context.conversationId;
        const flavor = req.params.flavor;
        const stride = stridef[flavor];

        stride.sendTextMessage({ cloudId, conversationId, text: "Pong" })
            .then(() => res.send(JSON.stringify({ status: "Pong" })))
            .catch(() => res.send(JSON.stringify({ status: "Failed" })))
    }
);


/**
 * Your app has a descriptor (app-descriptor.json), which tells Stride about the modules it uses.
 *
 * The variable ${host} is substituted based on the base URL of your app.
 */

app.get('/:flavor/descriptor', (req, res) => {

    const flavor = req.params.flavor;

    fs.readFile('./app-descriptor.json', (err, descriptorTemplate) => {
        const template = _.template(descriptorTemplate);
        const descriptor = template({
            host: 'https://' + req.headers.host,
            flavor: flavor,
            flavorRegex: flavorRegex[flavor],
        });
        res.set('Content-Type', 'application/json');
        res.send(descriptor);
    });
});

// handle salesforce login request by obtaining then redirecting to salesforce

app.get('/sfdc/login', (req, res) => {

    const flavor = 'sfdc';
    const providerKeyId = flavor.toUpperCase() + "_KEY";
    const providerSecretId = flavor.toUpperCase() + "_SECRET";

    const providerKey = process.env[providerKeyId];
    const providerSecret = process.env[providerSecretId];

    // TODO: hubspotcrm login: curl -X GET "/elements/{keyOrId}/oauth/url?apiKey=<api_key>&apiSecret=<api_secret>&callbackUrl=<url>&siteAddress=<url>"

    let url = 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/elements/' + flavor + '/oauth/url?apiKey=' +
        providerKey +
        '&apiSecret=' + providerSecret +
        '&callbackUrl=' + process.env.APP_URL + "/" + flavor + "/auth" + '&state=' + req.query.jwt;
    var options = {
        url: url,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        method: 'GET',
        json: true
    };
    request(options, (err, response, body) => {
        if (err) {
            console.log("ERROR! " + err);
            return
        }
        if (!response || response.statusCode >= 399) {
            console.log("UNHAPPINESS! " + response.statusCode);
            console.log(body);
            return
        }
        // success!
        console.log(body.oauthUrl);
        return res.redirect(body.oauthUrl);
    });

});

// Hand hubspotcrm login...  there's an extra dance

app.get('/hubspotcrm/login', (req, res) => {

    const flavor = 'hubspotcrm';
    const providerKey = process.env['HUBSPOTCRM_KEY'];
    const providerSecret = process.env['HUBSPOTCRM_SECRET'];


    //https://staging.cloud-elements.com/elements/api-v2/elements/hubspotcrm/oauth/url?apiKey=6c46ef8c-3d65-4a2b-b917-2558e26ccf64&apiSecret=e64f6bd9-cb2f-40d0-8f96-379a06e8d5b5&callbackUrl=https://www.getpostman.com/oauth2/callback

    const ce_base = 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com';

    let url = ce_base + '/elements/api-v2/elements/' + flavor + '/oauth/url?apiKey=' +
        providerKey +
        '&apiSecret=' + providerSecret +
        '&callbackUrl=' + process.env.APP_URL + "/" + flavor + "/auth" +
        '&state=' + req.query.jwt;

    var options = {
        url: url,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        method: 'GET',
        json: true
    };
    console.log("CALLING " + JSON.stringify(options));

    request(options, (err, response, body) => {
        if (err) {
            console.log("ERROR! " + err);
            return
        }
        if (!response || response.statusCode >= 399) {
            console.log("UNHAPPINESS! " + response.statusCode);
            console.log(body);
            return
        }
        // success!
        console.log(body.oauthUrl);
        return res.redirect(body.oauthUrl);
    });

});

// OAuth2 receiver
app.get('/:flavor/auth', (req, res) => {
    let flavor = req.params.flavor;
    console.log("-auth: Hi, I received an " + flavor + " OAuth response!");
    console.log(req.body);
    console.log('queries: ' + JSON.stringify(req.query));
    let code = req.query.code;
    let conversationId;
    let cloudId;

    if (req.query.state) {
        const jwt = jwt_decode(req.query.state);
        console.log("JWT is " + JSON.stringify(jwt));

        conversationId = jwt.context.resourceId;
        cloudId = jwt.context.cloudId;
        console.log(conversationId);
    } else {
        console.log('BROKENN :((')
        res.send('Oh no, something went wrong! We didnt get a state from ' + flavor);
        return
    }

    //
    // create SFDC Instance
    //
    var elementInstantiation = ce.postInstanceBody(flavor, code);

    var options = {
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/instances',
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        method: 'POST',
        body: elementInstantiation,
        json: true
    };
    console.log("POST /instances");
    console.log(elementInstantiation);
    // c

    // create the instance
    request(options, function(err, response, body) {
        if (checkForErrors(err, response, body)) {
            // in the OAuth case, we won't even get here unless its valid,
            // but in the APIKey case (close.io) we don't find out that the
            // key is invalid until we get an error here
            res.sendStatus(401);
            return;
        }

        stridef[flavor].updateGlanceState({
            cloudId: cloudId,
            conversationId: conversationId,
            glanceKey: 'cebot-glance',
            stateTxt: "CE " + flavorName[flavor],
        })

        // success! we have an instance!
        console.log(body.name + " " + body.token);
        // let's make a SFDC request
        // console.log(ce.getCRMLeads(body.token));
        // let's save them!
        let instanceBody = {
            name: body.name,
            token: body.token,
            elementKey: body.element.key,
            id: body.id
        }

        lukeStore.saveInstance(conversationId, flavor, instanceBody);

        var formulaIdObj = lukeStore.checkIfFormula();
        console.log("formulaIdObj", formulaIdObj);
        if (!formulaIdObj.id) {
            // this is our first bit of activity...
            // create definitions and transformations
            console.log("CREATING DEFINITIONS...");
            ce.createDefinitions(() => {
                console.log("CREATING TRANSFORMATIONS...");
                ce.createAllTransformations(() => {
                    console.log("CREATING FORMULA...");
                    // now create the formula
                    ce.createFormula(conversationId, flavor, (formulaId) => {
                        ce.createFormulaInstance(formulaId, instanceBody.id, conversationId, flavor)
                    });
                });
            });
            //create instance
        } else {
            ce.createFormulaInstance(formulaIdObj.id, instanceBody.id, conversationId, flavor)
        }

        //return res.redirect(process.env.APP_URL + "/closeme")
        if (flavor === 'closeio') {
            return res.sendStatus(200);
        } else {
            return res.redirect("/thanks-close-me.html");
        }
    });
});

// Event reciever from Cloud Elements
app.post('/:flavor/ce-callback/:conversationId', (req, res) => {
    res.sendStatus(200);

    let flavor = req.params.flavor;
    console.log("event received!");
    const stride = stridef[flavor];
    const cloudId = "911f7ab6-0583-4083-bed7-bad889ec4c92";
    // lookup conversationId from instanceId on event obj
    let conversationId = req.params.conversationId;
    let x = req.body;
    if (x.amount) {
        postOpportunityCard(flavor, cloudId, conversationId, x);
    } else if (x.email) {
        postContactCard(flavor, cloudId, conversationId, x);
    } else if (x.name) {
        postAccountCard(flavor, cloudId, conversationId, x);
    }
});

app.post('/listener', (req, res) => {
    console.log(req.body);
    res.send("OK");

    let closeInstance = {
        "contacts": {
            "url": "/hubs/crm/contacts?where=date_updated>'${gmtDate:yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXX}'",
            "idField": "id",
            "datesConfiguration": {
                "updatedDateField": "date_updated",
                "updatedDateFormat": "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXX",
                "createdDateField": "date_created",
                "createdDateFormat": "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXX"
            }
        }
    };


})


// NOTE: db methods reference for Danielle

// -- save elementInstance - DONE
// lukeStore.saveInstance(conversationId, flavor, instanceBody);

// -- get elementInstance - DONE
// lukeStore.getInstance(conversationId, flavor);

// -- save FormulaId - DONE
// lukeStore.saveFormula(formulaId, [conversationId, flavor]);

// -- save formulaInstance to Room/Instance - DONE
// lukeStore.saveFormulaInstance(conversationId, flavor, formulaInstanceBody);
// only required field of `formulaInstanceBody` is `id`

// -- update formulaInstance in Room/Instance - DONE
// lukeStore.updateFormulaInstance(conversationId, flavor, formulaInstanceBody);


app.use(function errorHandler(err, req, res, next) {
    if (!err) err = new Error('unknown error')
    console.error({ err }, 'app error handler: request failed!');
    const status = err.httpStatusHint || 500;
    res.status(status).send(`Something broke! Our devs are already on it! [${status}: ${http.STATUS_CODES[status]}]`);
    process.exit(1) // XXX DEBUG
});

const checkForErrors = (err, response, body) => {
    if (err) {
        console.log("ERROR! " + err);
        return true;
    }
    if (!response || response.statusCode >= 399) {
        console.log("UNHAPPINESS! " + response.statusCode);
        console.log(body);
        return true;
    }
    return false;
}


const showInstance = (conversationId) => {
    let instanceToken = lukeStore.getInstance(conversationId).token;
    // console.log(instanceId);
    return instanceToken;
};


http.createServer(app).listen(PORT, function() {
    console.log('App running on port ' + PORT);
});