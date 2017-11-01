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

require('dotenv').config();

function prettify_json(data, options = {}) {
    return '{\n' + prettyjson.render(data, options) + '\n}';
}

const { PORT = 8000, CLIENT_ID, CLIENT_SECRET, ENV = 'production' } = process.env;
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log("Usage:");
    console.log("PORT=<http port> CLIENT_ID=<app client ID> CLIENT_SECRET=<app client secret> node app.js");
    process.exit();
}

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

/**
 * Simple library that wraps the Stride REST API
 */
const stride = require('./stride.js').factory({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    env: ENV,
});


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
app.post('/installed', (req, res, next) => {
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

app.post('/uninstalled', (req, res) => {
    console.log('- app uninstalled from a conversation');
    const conversationId = req.body.resourceId;

    // note: we can't send message in the room anymore

    // Remove the installation details
    installationStore[conversationId] = null;

    res.sendStatus(204);
});


function myLeadCard(lead) {
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

function getLead(conv, id, then) {

    const elem = lukeStore.getInstance(conv).token;

    var options = {
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/hubs/crm/stride-crm-lead/' + id,
        headers: {
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG + ", Element " + elem,
            'accept': "application/json",
        },
        method: 'GET',
        json: true
    };

    console.log("Calling with options: " + prettify_json(options));

    request(options, (err, response, body) => {
        checkForErrors(err, response, body);
        console.log("Yo, got an answer: " + prettify_json(body));
        then(body);
    })
}

function replyWithLead(req, next, convo) {
    const reqBody = req.body;
    const cloudId = req.body.cloudId;
    const conversationId = req.body.conversation.id;

    const match = /lead ([A-Za-z0-9]+)/.exec(req.body.message.text);
    var id = "00Q1I000003BYc6UAG";
    if (match) {
        id = match[1];
    }

    getLead(convo, id, (lead) => {
            if (lead) {
                const document = myLeadCard(lead);
                stride.sendMessage({ cloudId, conversationId, document })
                    .catch(err => console.error('  Something went wrong', prettify_json(err)));
            }
        })
}

app.post('/message',
    stride.validateJWT,
    (req, res, next) => {
        console.log('- bot message', prettify_json(req.body));
        res.sendStatus(200);
        const reqBody = req.body;
        const cloudId = req.body.cloudId;
        const conversationId = req.body.conversation.id;

        var msg = req.body.message.text;
        var pat = /[0-9A-Za-z]{7,}/g;
        var m;
        while ((m = pat.exec(msg)) !== null) {
            console.log("Checking <" + m[0] + ">");
            getLead(conversationId, m[0], (lead) => {
                if (lead) {
                    const document = myLeadCard(lead);

                    stride.sendMessage({ cloudId,conversationId, document })
                        .catch(err => console.error('  Something went wrong', prettify_json(err)));
                }
            })
        }
    })


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

app.post('/bot-mention',
    stride.validateJWT,
    (req, res, next) => {
        console.log('- bot mention', prettify_json(req.body));

        if (/lead/.exec(req.body.message.text)) {
            res.sendStatus(200);
            return replyWithLead(req, next, req.body.conversation.id);
        }

        const reqBody = req.body;

        let user; // see getAndReportUserDetails

        stride.replyWithText({ reqBody, text: "Oh, hello there!" })
            // If you don't send a 200 fast enough, Stride will resend you the same mention message
            .then(() => res.sendStatus(200))
            .then(() => sendAPersonalizedResponse({ reqBody }))
            // Now let's do the time-consuming things:
            .then(() => showCaseHighLevelFeatures({ reqBody }))
            //.then(() => demoLowLevelFunctions({reqBody}))
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
async function sendAPersonalizedResponse({ reqBody }) {
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

app.post('/conversation-updated',
    stride.validateJWT,
    (req, res) => {
        console.log('A conversation was changed: ' + req.body.conversation.id + ', change: ' + prettify_json(req.body.action));
        res.sendStatus(200);
    }
);

app.post('/roster-updated',
    stride.validateJWT,
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

app.get('/module/config',
    stride.validateJWT,
    (req, res) => {
        // console.log(req);
        res.redirect("/app-module-config.html");
    }
);

// Get the configuration state: is it configured or not for the conversation?
app.get('/module/config/state',
    // cross domain request
    cors(),
    stride.validateJWT,
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
app.get('/module/config/content',
    stride.validateJWT,
    (req, res) => {
        const conversationId = res.locals.context.conversationId;
        console.log("getting config content for conversation " + conversationId);
        const config = configStore[res.locals.context.conversationId] || { notificationLevel: "NONE" };
        res.send(JSON.stringify(config));
    }
);

// Save the configuration content from the configuration dialog
app.post('/module/config/content',
    stride.validateJWT,
    (req, res, next) => {
        const cloudId = res.locals.context.cloudId;
        const conversationId = res.locals.context.conversationId;
        console.log("saving config content for conversation " + conversationId + ": " + prettify_json(req.body));
        configStore[conversationId] = req.body;
        console.log("cloudId " + cloudId);

        stride.updateConfigurationState({ cloudId, conversationId, configKey: 'cebot-config', state: true })
            .then(() => res.sendStatus(204))
            .catch(next);
    }
);

app.get('/module/dialog',
    stride.validateJWT,
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

app.get('/module/glance/state',
    // cross domain request
    cors(),
    stride.validateJWT,
    (req, res) => {
        res.send(
            JSON.stringify({
                "label": {
                    "value": "CE CRM"
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

app.get('/module/sidebar',
    stride.validateJWT,
    (req, res) => {
        res.redirect("/app-module-sidebar.html");
    }
);

/**
 * Making a call from the app front-end to the app back-end:
 * You can find the context for the request (cloudId, conversationId) in the JWT token
 */

app.post('/ui/ping',
    stride.validateJWT,
    (req, res) => {
        console.log('Received a call from the app frontend ' + prettify_json(req.body));
        const cloudId = res.locals.context.cloudId;
        const conversationId = res.locals.context.conversationId;
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

app.get('/descriptor', (req, res) => {
    fs.readFile('./app-descriptor.json', (err, descriptorTemplate) => {
        const template = _.template(descriptorTemplate);
        const descriptor = template({
            host: 'https://' + req.headers.host
        });
        res.set('Content-Type', 'application/json');
        res.send(descriptor);
    });
});

// handle salesforce login request by obtaining then redirecting to salesforce
app.get('/login/salesforce', (req, res) => {
    let url = 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/elements/sfdc/oauth/url?apiKey=' +
        process.env.SFDC_KEY +
        '&apiSecret=' + process.env.SFDC_SECRET +
        '&callbackUrl=' + process.env.APP_URL + "/auth" + '&state=' + req.query.jwt;
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


// OAuth2 receiver
app.get('/auth', (req, res) => {
    console.log("-auth: Hi, I received an OAuth response!");
    console.log(req.body);
    console.log('queries! :' + req.query);
    let code = req.query.code;
    let conversationId;
    if (req.query.state) {
        conversationId = jwt_decode(req.query.state).context.resourceId;
        console.log(conversationId);
    } else {
        console.log('BROKENN :((')
        res.send('Oh no, something went wrong! We didnt get a state from Salesforce');
    }

    //
    // create SFDC Instance
    //
    var elementInstantiation = ce.postInstanceBody("sfdc", code);

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
        checkForErrors(err, response, body);

        // success! we have an instance!
        console.log(body.name + " " + body.token);
        // let's make a SFDC request
        console.log(ce.getCRMLeads(body.token));
        // let's save them!
        lukeStore.saveInstance(conversationId, body.name, body.token, body.element.key, body.id);

        //return res.redirect(process.env.APP_URL + "/closeme")
        return res.redirect("/thanks-close-me.html");
    });
});


app.use(function errorHandler(err, req, res, next) {
    if (!err) err = new Error('unknown error')
    console.error({ err }, 'app error handler: request failed!');
    const status = err.httpStatusHint || 500;
    res.status(status).send(`Something broke! Our devs are already on it! [${status}: ${http.STATUS_CODES[status]}]`);
    process.exit(1) // XXX DEBUG
});

async function showCaseHighLevelFeatures({ reqBody }) {
    const { cloudId } = reqBody;
    const conversationId = reqBody.conversation.id;
    const senderId = reqBody.sender.id;
    let user;

    //  await convertMessageToPlainTextAndReportIt()
    //  await extractAndSendMentions()
    //  await getAndReportUserDetails()
    //  await sendMessageWithFormatting()
    //  await sendMessageWithImage()
    //  await updateGlance()

    async function convertMessageToPlainTextAndReportIt() {
        console.log('  - convertMessageToPlainTextAndReportIt...');

        await stride.replyWithText({ reqBody, text: "Converting the message you just sent to plain text..." });

        // The message is in req.body.message. It is sent using the Atlassian document format.
        // A plain text representation is available in req.body.message.text
        const messageText = reqBody.message.text;
        console.log("    Message in plain text: " + messageText);

        // You can also use a REST endpoint to convert any Atlassian document to a plain text representation:
        const msgInText = await stride.convertDocToText(reqBody.message.body);
        console.log("    Message converted to text: " + msgInText);

        const doc = new Document();
        doc.paragraph()
            .text("In plain text, it looks like this: ")
            .text(`"${msgInText}"`);
        const document = doc.toJSON();

        await stride.reply({ reqBody, document });

        return messageText;
    }

    async function extractAndSendMentions() {
        console.log('  - extractAndSendMentions...');
        const doc = new Document();

        const paragraph = doc.paragraph()
            .text('The following people were mentioned: ');
        // Here's how to extract the list of users who were mentioned in this message
        const mentionNodes = jsonpath.query(reqBody, '$..[?(@.type == "mention")]');

        // and how to mention users
        mentionNodes.forEach(function(mentionNode) {
            const userId = mentionNode.attrs.id;
            const userMentionText = mentionNode.attrs.text;
            // If you don't know the user's mention text, call the User API - stride.getUser()
            paragraph.mention(userId, userMentionText);
        });

        const document = doc.toJSON();
        await stride.reply({ reqBody, document });
    }

    async function getAndReportUserDetails() {
        await stride.replyWithText({ reqBody, text: "Getting user details for the sender of the message..." });
        user = await stride.getUser({ cloudId, userId: senderId });
        await stride.replyWithText({ reqBody, text: "This message was sent by: " + user.displayName });

        return user;
    }

    async function sendMessageWithFormatting() {
        await stride.replyWithText({ reqBody, text: "Sending a message with plenty of formatting..." });

        // Here's how to send a reply with a nicely formatted document, using the document builder library adf-builder
        const doc = new Document();
        doc.paragraph()
            .text('Here is some ')
            .strong('bold test')
            .text(' and ')
            .em('text in italics')
            .text(' as well as ')
            .link(' a link', 'https://www.atlassian.com')
            .text(' , emojis ')
            .emoji(':smile:')
            .emoji(':rofl:')
            .emoji(':nerd:')
            .text(' and some code: ')
            .code('const i = 0;')
            .text(' and a bullet list');
        doc.bulletList()
            .textItem('With one bullet point')
            .textItem('And another');
        doc.panel("info")
            .paragraph()
            .text("and an info panel with some text, with some more code below");
        doc.codeBlock("javascript")
            .text('const i = 0;\nwhile(true) {\n  i++;\n}');

        doc
            .paragraph()
            .text("And a card");
        const card = doc.applicationCard('With a title')
            .link('https://www.atlassian.com')
            .description('With some description, and a couple of attributes')
            .background('https://www.atlassian.com');
        card.detail()
            .title('Type')
            .text('Task')
            .icon({
                url: 'https://ecosystem.atlassian.net/secure/viewavatar?size=xsmall&avatarId=15318&avatarType=issuetype',
                label: 'Task'
            });
        card.detail()
            .title('User')
            .text('Joe Blog')
            .icon({
                url: 'https://ecosystem.atlassian.net/secure/viewavatar?size=xsmall&avatarId=15318&avatarType=issuetype',
                label: 'Task'
            });
        const document = doc.toJSON();

        await stride.reply({ reqBody, document });
    }

    async function sendMessageWithImage() {
        await stride.replyWithText({ reqBody, text: "Uploading an image and sending it in a message..." });

        // To send a file or an image in a message, you first need to upload it
        const https = require('https');
        const imgUrl = 'https://media.giphy.com/media/L12g7V0J62bf2/giphy.gif';

        return new Promise((resolve, reject) => {
            https.get(imgUrl, function(downloadStream) {
                stride.sendMedia({
                        cloudId,
                        conversationId,
                        name: "an_image2.jpg",
                        stream: downloadStream,
                    })
                    .then(JSON.parse)
                    .then(response => {
                        if (!response || !response.data)
                            throw new Error('Failed to upload media!')

                        // Once uploaded, you can include it in a message
                        const mediaId = response.data.id;
                        const doc = new Document();
                        doc.paragraph()
                            .text("and here's that image:");
                        doc
                            .mediaGroup()
                            .media({ type: 'file', id: mediaId, collection: conversationId });

                        return stride.reply({ reqBody, document: doc.toJSON() })
                    })
                    .then(resolve, reject);
            });
        });
    }

    async function updateGlance() {
        await stride.replyWithText({ reqBody, text: "Updating the glance state..." });

        // Here's how to update the glance state
        const stateTxt = `Click me, ${user.displayName} !!`;
        await stride.updateGlanceState({
            cloudId,
            conversationId,
            glanceKey: "cebot-glance",
            stateTxt,
        });
        console.log("glance state updated to: " + stateTxt);
        await stride.replyWithText({ reqBody, text: `It should be updated to "${stateTxt}" -->` });
    }
}

async function demoLowLevelFunctions({ reqBody }) {
    const cloudId = reqBody.cloudId;
    const conversationId = reqBody.conversation.id;

    let user;
    let createdConversation;

    await stride.replyWithText({ reqBody, text: `That was nice, wasn't it?` });
    await stride.replyWithText({ reqBody, text: `Now let me walk you through the lower level functions available in "ceapp":` });

    await demo_sendTextMessage();
    await demo_sendMessage();
    await demo_replyWithText();
    await demo_reply();
    await demo_getUser();
    await demo_sendPrivateMessage();
    await demo_getConversation();
    await demo_createConversation();
    await demo_archiveConversation();
    await demo_getConversationHistory();
    await demo_getConversationRoster();
    await demo_createDocMentioningUser();
    await demo_convertDocToText();

    async function demo_sendTextMessage() {
        console.log(`------------ sendTextMessage() ------------`);

        await stride.sendTextMessage({ cloudId, conversationId, text: `demo - sendTextMessage() - Hello, world!` });
    }

    async function demo_sendMessage() {
        console.log(`------------ sendMessage() ------------`);

        // using the Atlassian Document Format
        // https://developer.atlassian.com/cloud/stride/apis/document/structure/
        const exampleDocument = {
            version: 1,
            type: "doc",
            content: [{
                type: "paragraph",
                content: [{
                    type: "text",
                    text: `demo - sendMessage() - Hello, world!`,
                }, ]
            }]
        };
        await stride.sendMessage({ cloudId, conversationId, document: exampleDocument });
    }

    async function demo_replyWithText() {
        console.log(`------------ replyWithText() ------------`);

        await stride.replyWithText({ reqBody, text: `demo - replyWithText() - Hello, world!` });
    }

    async function demo_reply() {
        console.log(`------------ reply() ------------`);

        await stride.reply({ reqBody, document: stride.convertTextToDoc(`demo - reply() - Hello, world!`) });
    }

    async function demo_getUser() {
        console.log(`------------ getUser() ------------`);

        user = await stride.getUser({
            cloudId,
            userId: reqBody.sender.id,
        });
        console.log('getUser():', prettify_json(user));
        await stride.replyWithText({ reqBody, text: `demo - getUser() - your name is "${user.displayName}"` });
        return user;
    }

    async function demo_sendPrivateMessage() {
        console.log(`------------ sendPrivateMessage() ------------`);

        await stride.replyWithText({ reqBody, text: "demo - sendPrivateMessage() - sending you a private message…" });

        try {
            const document = await stride.createDocMentioningUser({
                cloudId,
                userId: user.id,
                text: 'Hello {{MENTION}}, thanks for taking the Stride tutorial!',
            });

            await stride.sendPrivateMessage({
                cloudId,
                userId: user.id,
                document,
            });
        } catch (e) {
            await stride.replyWithText({ reqBody, text: "Didn't work, but maybe you closed our private conversation? Try re-opening it... (please ;)" });
        }
    }

    async function demo_getConversation() {
        console.log(`------------ getConversation() ------------`);

        const conversation = await stride.getConversation({ cloudId, conversationId });
        console.log('getConversation():', prettify_json(conversation));

        await stride.replyWithText({ reqBody, text: `demo - getConversation() - current conversation name is "${conversation.name}"` });
    }

    async function demo_createConversation() {
        console.log(`------------ createConversation() ------------`);
        const candidateName = `Stride-tutorial-Conversation-${+new Date()}`;

        const response = await stride.createConversation({ cloudId, name: candidateName });
        console.log('createConversation():', prettify_json(response));

        createdConversation = await stride.getConversation({ cloudId, conversationId: response.id });
        await stride.sendTextMessage({ cloudId, conversationId: createdConversation.id, text: `demo - createConversation() - Hello, conversation!` });

        const doc = new Document();
        doc.paragraph()
            .text(`demo - createConversation() - conversation created with name "${createdConversation.name}". Find it `)
            .link('here', createdConversation._links[createdConversation.id]);
        await stride.reply({ reqBody, document: doc.toJSON() });
    }

    async function demo_archiveConversation() {
        console.log(`------------ archiveConversation() ------------`);

        const response = await stride.archiveConversation({ cloudId, conversationId: createdConversation.id });
        console.log('archiveConversation():', prettify_json(response));

        await stride.replyWithText({ reqBody, text: `demo - archiveConversation() - archived conversation "${createdConversation.name}"` });
    }

    async function demo_getConversationHistory() {
        console.log(`------------ getConversationHistory() ------------`);

        const response = await stride.getConversationHistory({ cloudId, conversationId });
        console.log('getConversationHistory():', prettify_json(response));

        await stride.replyWithText({ reqBody, text: `demo - getConversationHistory() - seen ${response.messages.length} recent message(s)` });
    }

    async function demo_getConversationRoster() {
        console.log(`------------ getConversationRoster() ------------`);

        const response = await stride.getConversationRoster({ cloudId, conversationId });
        console.log('getConversationRoster():', prettify_json(response));

        const userIds = response.values;
        const users = await Promise.all(userIds.map(userId => stride.getUser({ cloudId, userId })))
        console.log('getConversationRoster() - users():', prettify_json(users));

        await stride.replyWithText({
            reqBody,
            text: `demo - getConversationRoster() - seen ${users.length} users: ` +
                users.map(user => user.displayName).join(', '),
        });
    }

    async function demo_createDocMentioningUser() {
        console.log(`------------ createDocMentioningUser() ------------`);

        const document = await stride.createDocMentioningUser({
            cloudId,
            userId: user.id,
            text: "demo - createDocMentioningUser() - See {{MENTION}}, I can do it!"
        });

        await stride.reply({ reqBody, document });
    }

    async function demo_convertDocToText() {
        console.log(`------------ convertDocToText() ------------`);

        const doc = new Document();
        doc.paragraph()
            .text(`demo - convertDocToText() - this an ADF document with a link: `)
            .link('https://www.atlassian.com/', 'https://www.atlassian.com/');

        const document = doc.toJSON();
        await stride.reply({ reqBody, document });

        const text = await stride.convertDocToText(document);

        await stride.replyWithText({ reqBody, text: text + ' <-- converted to text!' });
    }
}

const checkForErrors = (err, response, body) => {
    if (err) {
        console.log("ERROR! " + err);
        return
    }
    if (!response || response.statusCode >= 399) {
        console.log("UNHAPPINESS! " + response.statusCode);
        console.log(body);
        return
    }
}

const showInstance = (conversationId) => {
    let instanceToken = lukeStore.getInstance(conversationId).token;
    // console.log(instanceId);
    return instanceToken;
};


http.createServer(app).listen(PORT, function() {
    console.log('App running on port ' + PORT);
});
