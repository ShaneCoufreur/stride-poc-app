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