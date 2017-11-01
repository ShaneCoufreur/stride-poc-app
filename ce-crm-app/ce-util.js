require('dotenv').config();
const request = require('request');

const postInstanceBody = (elementKey, code) => {
    let postInstanceBody = {};
    switch (elementKey) {
        case "sfdc":
        case "salesforce":
            postInstanceBody = {
                "element": {
                    "key": elementKey
                },
                "providerData": {
                    "code": code
                },
                "configuration": {
                    "oauth.callback.url": process.env.APP_URL + "/" + elementKey + "/auth",
                    "oauth.api.key": process.env.SFDC_KEY,
                    "oauth.api.secret": process.env.SFDC_SECRET
                },
                "tags": [
                    "stride"
                ],
                "name": "STRIDE_TEST_" + (new Date()).getTime()
            };
            break;

        default:
            break;
    }
    return postInstanceBody;
};

const getCRMLeads = (elementToken) => {
    var options = {
        method: 'GET',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/hubs/crm/leads',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG + ", Element " + elementToken
        }
    }
    request(options, (err, response, body) => {
        if (err) {
            console.log("ERROR! " + err);
            return
        }
        if (!response || response.statusCode >= 399) {
            console.log("UNHAPPINESS! " + response.statusCode);
            console.log(body);
        }
        console.log(body);
        return body;
    });
}

const getCRMOpportunities = (elementToken) => {
    var options = {
        method: 'GET',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/hubs/crm/opportunities',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG + ", Element " + elementToken
        }
    }
    request(options, (err, response, body) => {
        if (err) {
            console.log("ERROR! " + err);
            return
        }
        if (!response || response.statusCode >= 399) {
            console.log("UNHAPPINESS! " + response.statusCode);
            console.log(body);
        }
        console.log(body);
        return body;
    });
}

const getCRMLeadByID = (elementToken, leadID) => {
    var options = {
        method: 'GET',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/hubs/crm/leads/' + leadID,
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG + ", Element " + elementToken
        }
    }
    request(options, (err, response, body) => {
        if (err) {
            console.log("ERROR! " + err);
            return
        }
        if (!response || response.statusCode >= 399) {
            console.log("UNHAPPINESS! " + response.statusCode);
            console.log(body);
        }
        console.log(body);
        return body;
    });
}


const createFormula = () => {


    var formulaBody = {
        "name": "strideFormula",
        "steps": [{
                "id": 49447,
                "onSuccess": [
                    "getLead"
                ],
                "onFailure": [],
                "name": "filterConfig",
                "type": "filter",
                "properties": {
                    "body": "if(trigger.event.EventType == 'UPDATED' && config.update == \"true\" && config.object == trigger.event.ObjectType){\n  done(true);\n}\n\nif(trigger.event.EventType == 'CREATED' && config.create == \"true\" && config.object == trigger.event.ObjectType){\n  done(true);\n}\n\ndone(false);"
                }
            },
            {
                "id": 49446,
                "onSuccess": [
                    "postLead"
                ],
                "onFailure": [],
                "name": "getLead",
                "type": "elementRequest",
                "properties": {
                    "path": "trigger.event",
                    "elementInstanceId": "${config.source}",
                    "method": "GET",
                    "api": "/stride-crm-lead/{id}"
                }
            },
            {
                "id": 49448,
                "onSuccess": [],
                "onFailure": [],
                "name": "postLead",
                "type": "httpRequest",
                "properties": {
                    "body": "steps.getLead.response.body",
                    "method": "POST",
                    "url": "${config.url}"
                }
            }
        ],
        "triggers": [{
            "id": 4195,
            "onSuccess": [
                "filterConfig"
            ],
            "onFailure": [],
            "type": "event",
            "async": true,
            "name": "trigger",
            "properties": {
                "elementInstanceId": "${config.source}"
            }
        }],
        "active": true,
        "singleThreaded": false,
        "configuration": [{
                "id": 14442,
                "key": "create",
                "name": "create",
                "type": "value",
                "required": true
            },
            {
                "id": 14443,
                "key": "object",
                "name": "object",
                "type": "value",
                "required": true
            },
            {
                "id": 14440,
                "key": "source",
                "name": "source",
                "type": "elementInstance",
                "required": true
            },
            {
                "id": 14441,
                "key": "update",
                "name": "update",
                "type": "value",
                "required": true
            },
            {
                "id": 14444,
                "key": "url",
                "name": "url",
                "type": "value",
                "required": true
            }
        ]
    };
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/formulas',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: formulaBody
    }
    request(options, (err, response, body) => {
        if (err) {
            console.log("ERROR! " + err);
            return
        }
        if (!response || response.statusCode >= 399) {
            console.log("UNHAPPINESS! " + response.statusCode);
            console.log(body);
        }
        console.log(body);
        return body;
    });
}



module.exports = {
    postInstanceBody: postInstanceBody,
    getCRMOpportunities: getCRMOpportunities,
    getCRMLeads: getCRMLeads,
    getCRMLeadsByID: getCRMLeadByID,
    createFormula: createFormula

}