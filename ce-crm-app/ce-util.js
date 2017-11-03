require('dotenv').config();
const request = require('request');
const lukeStore = require('./luke-store');

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
                    "oauth.api.secret": process.env.SFDC_SECRET,
                    "event.notification.enabled": true,
                    "event.vendor.type": "polling",
                    // TODO: set polling interval
                    // TODO: set objects to poll
                    //
                    // possibly something like this: (from danielle)
                    //
                    // "event.poller.refresh_interval": "1",
                    //"event.objects": "Account",
                    //"event.helper.key": "sfdcPolling",
                    //"event.notification.enabled": "true",
                    //"event.poller.urls": "Account|/hubs/crm/Account?where=LastModifiedDate>='${date}'&orderBy=Id&includeDeleted=true||LastModifiedDate|yyyy-MM-dd'T'HH:mm:ss.SSSZ",
                    //"event.vendor.type": "polling",
                },
                "tags": [
                    "stride"
                ],
                "name": "STRIDE_SFDC_" + (new Date()).getTime()
            };
            break;

    case "hubspotcrm":
            postInstanceBody = {
                "element": {
                    "key": "hubspotcrm"
                },
                "providerData": {
                    "code": code
                },
                "configuration": {
                    "authentication.type": "oauth2",
                    "oauth.callback.url": process.env.APP_URL + "/hubspotcrm/auth",
                    "oauth.api.key": process.env.HUBSPOTCRM_KEY,
                    "oauth.api.secret": process.env.HUBSPOTCRM_SECRET,
                    "create.bulk.properties": "false",
                    "filter.response.nulls": true,
                    "event.notification.enabled": true,
                    "event.vendor.type": "webhook",
                },
                "tags": [
                    "stride"
                ],
                "name": "STRIDE_HS_" + (new Date()).getTime()
            };
            break;

    case "closeio":
            postInstanceBody = {
                "element": {
                    "key": "closeio"
                },
                "configuration": {
                    "event.notification.enabled": true,
                    "event.vendor.type": "webhook",
                    "filter.response.nulls": "true",
                    "username": code,
                },
                "tags": [
                    "stride"
                ],
                "name": "STRIDE_CLOSEIO_" + (new Date()).getTime()
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


const createFormula = (conversationId, flavor, callback) => {


    // var formulaBody = {
    //     "name": "strideFormula",
    //     "steps": [{
    //             "id": 49447,
    //             "onSuccess": [
    //                 "getLead"
    //             ],
    //             "onFailure": [],
    //             "name": "filterConfig",
    //             "type": "filter",
    //             "properties": {
    //                 "body": "if(trigger.event.EventType == 'UPDATED' && config.update == \"true\" && config.object == trigger.event.ObjectType){\n  done(true);\n}\n\nif(trigger.event.EventType == 'CREATED' && config.create == \"true\" && config.object == trigger.event.ObjectType){\n  done(true);\n}\n\ndone(false);"
    //             }
    //         },
    //         {
    //             "id": 49446,
    //             "onSuccess": [
    //                 "postLead"
    //             ],
    //             "onFailure": [],
    //             "name": "getLead",
    //             "type": "elementRequest",
    //             "properties": {
    //                 "path": "trigger.event",
    //                 "elementInstanceId": "${config.source}",
    //                 "method": "GET",
    //                 "api": "/stride-crm-lead/{id}"
    //             }
    //         },
    //         {
    //             "id": 49448,
    //             "onSuccess": [],
    //             "onFailure": [],
    //             "name": "postLead",
    //             "type": "httpRequest",
    //             "properties": {
    //                 "body": "steps.getLead.response.body",
    //                 "method": "POST",
    //                 "url": "${config.url}"
    //             }
    //         }
    //     ],
    //     "triggers": [{
    //         "id": 4195,
    //         "onSuccess": [
    //             "filterConfig"
    //         ],
    //         "onFailure": [],
    //         "type": "event",
    //         "async": true,
    //         "name": "trigger",
    //         "properties": {
    //             "elementInstanceId": "${config.source}"
    //         }
    //     }],
    //     "active": true,
    //     "singleThreaded": false,
    //     "configuration": [{
    //             "id": 14442,
    //             "key": "create",
    //             "name": "create",
    //             "type": "value",
    //             "required": true
    //         },
    //         {
    //             "id": 14443,
    //             "key": "object",
    //             "name": "object",
    //             "type": "value",
    //             "required": true
    //         },
    //         {
    //             "id": 14440,
    //             "key": "source",
    //             "name": "source",
    //             "type": "elementInstance",
    //             "required": true
    //         },
    //         {
    //             "id": 14441,
    //             "key": "update",
    //             "name": "update",
    //             "type": "value",
    //             "required": true
    //         },
    //         {
    //             "id": 14444,
    //             "key": "url",
    //             "name": "url",
    //             "type": "value",
    //             "required": true
    //         }
    //     ]
    // };

    var formulaBody =  {
    "name": "strideFormula",
    "userId": 150850,
    "accountId": 150805,
    "createdDate": "2017-11-03T02:34:12Z",
    "steps": [
      {
        "id": 49615,
        "onSuccess": [
          "whichObject"
        ],
        "onFailure": [],
        "name": "filterConfig",
        "type": "filter",
        "properties": {
          "body": "if(trigger.event.EventType == 'UPDATED' && config.update == \"true\"){\n  done(true);\n}\n\nif(trigger.event.EventType == 'CREATED' && config.create == \"true\"){\n  done(true);\n}\n\ndone(false);"
        }
      },
      {
        "id": 49616,
        "onSuccess": [
          "postObject"
        ],
        "onFailure": [],
        "name": "getObject",
        "type": "elementRequest",
        "properties": {
          "elementInstanceId": "${config.source}",
          "api": "/{common}/{id}",
          "method": "GET",
          "path": "steps.whichObject"
        }
      },
      {
        "id": 49617,
        "onSuccess": [],
        "onFailure": [],
        "name": "postObject",
        "type": "httpRequest",
        "properties": {
          "body": "steps.getObject.response.body",
          "method": "POST",
          "url": "${config.url}"
        }
      },
      {
        "id": 49621,
        "onSuccess": [
          "getObject"
        ],
        "onFailure": [],
        "name": "whichObject",
        "type": "script",
        "properties": {
          "body": "var common = trigger.event.objectType;\n\nif(common == \"accounts\"){\n   done{(\"common\":\"stride-crm-accounts\",\n       \"id\":trigger.event})\n   }\nelse if(common == \"contacts\"){\n   done({\"common\":\"stride-crm-contacts\",\n        \"id\":trigger.event})\n   }\nelse if(common == \"opportunities\"){\n   done({\"common\":\"stride-crm-opportunities\",\n        \"id\":trigger.event})\n   }\nelse if(common == \"deals\"){\n   done({\"common\":\"stride-crm-opportunities\",\n        \"id\":trigger.event})\n   }\nelse{\n    done({\"common\":\"abort\"})\n}"
        }
      }
    ],
    "triggers": [
      {
        "id": 4216,
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
      }
    ],
    "active": true,
    "singleThreaded": false,
    "configuration": [
      {
        "id": 14520,
        "key": "create",
        "name": "create",
        "type": "value",
        "required": true
      },
      {
        "id": 14521,
        "key": "object",
        "name": "object",
        "type": "value",
        "required": true
      },
      {
        "id": 14522,
        "key": "source",
        "name": "source",
        "type": "elementInstance",
        "required": true
      },
      {
        "id": 14523,
        "key": "update",
        "name": "update",
        "type": "value",
        "required": true
      },
      {
        "id": 14524,
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
        console.log("the formula body", body);
        lukeStore.saveFormula(body.id, conversationId, flavor);
        callback(body.id);
        //return body;
    });
}


const createFormulaInstance = (formulaId, instanceId, conversationId, flavor) => {

    var formulaInstanceBody = {
    "formula": {
      "id": formulaId,
      "name": "strideFormula",
      "active": true,
      "singleThreaded": false,
      "configuration": [
        {
          "id": 14520,
          "key": "create",
          "name": "create",
          "type": "value",
          "required": true
        },
        {
          "id": 14521,
          "key": "object",
          "name": "object",
          "type": "value",
          "required": true
        },
        {
          "id": 14522,
          "key": "source",
          "name": "source",
          "type": "elementInstance",
          "required": true
        },
        {
          "id": 14523,
          "key": "update",
          "name": "update",
          "type": "value",
          "required": true
        },
        {
          "id": 14524,
          "key": "url",
          "name": "url",
          "type": "value",
          "required": true
        }
      ]
    },
    "name": "strideFormulaInstance",
    "settings": {},
    "active": true,
    "configuration": {
      "create": "true",
      "update": "true",
      "source": instanceId,
      "url": process.env.APP_URL+'/'+flavor+'/ce-callback/'+conversationId,
      "object": "accounts,opportunities,contacts,deals"
    }
  };

 // var formulaInstanceBody = {
 //    "formula": {
 //      "id": formulaId,
 //      "name": "strideFormula",
 //      "active": true,
 //      "singleThreaded": false,
 //      "configuration": [
 //        {
 //          "id": 14454,
 //          "key": "create",
 //          "name": "create",
 //          "type": "value",
 //          "required": true
 //        },
 //        {
 //          "id": 14455,
 //          "key": "object",
 //          "name": "object",
 //          "type": "value",
 //          "required": true
 //        },
 //        {
 //          "id": 14456,
 //          "key": "source",
 //          "name": "source",
 //          "type": "elementInstance",
 //          "required": true
 //        },
 //        {
 //          "id": 14457,
 //          "key": "update",
 //          "name": "update",
 //          "type": "value",
 //          "required": true
 //        },
 //        {
 //          "id": 14458,
 //          "key": "url",
 //          "name": "url",
 //          "type": "value",
 //          "required": true
 //        }
 //      ]
 //    },
 //    "name": "strideFormulaInstance",
 //    "settings": {},
 //    "active": true,
 //    "configuration": {
 //      "create": "true",
 //      "update": "true",
 //      "source": instanceId,
 //      "url": process.env.APP_URL+'/'+flavor+'/ce-callback/'+conversationId,
 //      "object": "accounts,opportunities,contacts,deals"
 //    }
 //  };
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/formulas/'+formulaId+'/instances',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: formulaInstanceBody
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





const createContactDefinition = (cb) => {

 var contact = {
    "fields": [
      {
        "type": "string",
        "path": "firstName"
      },
      {
        "type": "string",
        "path": "lastName"
      },
      {
        "type": "string",
        "path": "phone"
      },
      {
        "type": "string",
        "path": "id"
      },
      {
        "type": "string",
        "path": "email"
      }
    ],
    "level": "organization"
  };
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/objects/stride-crm-contacts/definitions',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: contact
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
        cb(body);
    });
}

const createOppDefinition = (cb) => {

 var opp =  {
    "fields": [
      {
        "type": "string",
        "path": "closeDate"
      },
      {
        "type": "number",
        "path": "amount"
      },
      {
        "type": "string",
        "path": "comments"
      },
      {
        "type": "string",
        "path": "stage"
      },
      {
        "type": "string",
        "path": "name"
      },
      {
        "type": "string",
        "path": "id"
      }
    ],
    "level": "organization"
  };
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/objects/stride-crm-opportunities/definitions',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: opp
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
        cb(body);
    });
}

const createAccountDefinition = (cb) => {

 var acc =  {
    "fields": [
      {
        "type": "string",
        "path": "name"
      },
      {
        "type": "string",
        "path": "description"
      },
      {
        "type": "string",
        "path": "id"
      },
      {
        "type": "string",
        "path": "status"
      }
    ],
    "level": "organization"
  };
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/objects/stride-crm-accounts/definitions',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: acc
    }
    request(options, (err, response, body) => {
        console.log("DONE CREATING stride-crm-accounts");
        if (err) {
            console.log("ERROR! " + err);
            return
        }
        if (!response || response.statusCode >= 399) {
            console.log("UNHAPPINESS! " + response.statusCode);
            console.log(body);
        }
        console.log(body);
        cb(body);
    });
}


const createCloseTransAcc = (flavor, cb) => {

 var acctran = {
    "level": "organization",
    "objectName": "stride-crm-accounts",
    "vendorName": "accounts",
    "startDate": "2017-11-02 21:17:39.441099",
    "fields": [
      {
        "type": "string",
        "path": "name",
        "vendorPath": "name",
        "level": "organization"
      }
    ],
    "configuration": [
      {
        "type": "passThrough",
        "properties": {
          "fromVendor": false,
          "toVendor": false
        }
      },
      {
        "type": "inherit"
      }
    ],
    "script": {
      "body": "if(fromVendor){\n  transformedObject.description = originalObject.description;\n  transformedObject.status = originalObject.status_label;\n  transformedObject.id = originalObject.id;  \n}\ndone(transformedObject);",
      "mimeType": "application/javascript",
      "filterEmptyResponse": false
    },
    "isLegacy": false
   };
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/elements/'+flavor+'/transformations/stride-crm-accounts',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: acctran
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
        cb(body);
    });
}


const createCloseTransCon = (flavor, cb) => {

 var contran = {
    "level": "organization",
    "objectName": "stride-crm-contacts",
    "vendorName": "contacts",
    "startDate": "2017-11-02 21:51:18.390141",
    "fields": [
      {
        "type": "string",
        "path": "email",
        "vendorPath": "officeEmail",
        "level": "organization"
      },
      {
        "type": "string",
        "path": "id",
        "vendorPath": "id",
        "level": "organization"
      },
      {
        "type": "string",
        "path": "phone",
        "vendorPath": "officePhone",
        "level": "organization"
      }
    ],
    "configuration": [
      {
        "type": "passThrough",
        "properties": {
          "fromVendor": false,
          "toVendor": false
        }
      },
      {
        "type": "inherit"
      }
    ],
    "script": {
      "body": "if(fromVendor){\n  var arr = originalObject.name.split(\" \");\n  transformedObject.firstName = arr[0];\n  transformedObject.lastName = arr[1]; \n}\n\ndone(transformedObject);",
      "mimeType": "application/javascript",
      "filterEmptyResponse": false
    },
    "isLegacy": false
  };
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/elements/'+flavor+'/transformations/stride-crm-contacts',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: contran
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
        cb(body);
    });
}


const createCloseTransOpp = (flavor, cb) => {

 var opptran = {
    "level": "organization",
    "objectName": "stride-crm-opportunities",
    "vendorName": "opportunities",
    "startDate": "2017-11-02 21:09:16.405674",
    "fields": [
      {
        "type": "number",
        "path": "amount",
        "vendorPath": "value",
        "level": "organization"
      },
      {
        "type": "string",
        "path": "comments",
        "vendorPath": "note",
        "level": "organization"
      },
      {
        "type": "string",
        "path": "name",
        "vendorPath": "lead_name",
        "level": "organization"
      }
    ],
    "configuration": [
      {
        "type": "passThrough",
        "properties": {
          "fromVendor": false,
          "toVendor": false
        }
      },
      {
        "type": "inherit"
      }
    ],
    "script": {
      "body": "if(fromVendor){\n \n  transformedObject.closeDate = originalObject.date_won;\n  transformedObject.id= originalObject.id;\n  transformedObject.stage = originalObject.status_type;\n  \n\n}\n\ndone(transformedObject);",
      "mimeType": "application/javascript",
      "filterEmptyResponse": false
    },
    "isLegacy": false
  };
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/elements/'+flavor+'/transformations/stride-crm-opportunities',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: opptran
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
        cb(body);
    });
}


const createHubTransOpp = (flavor, cb) => {

 var opptranhub = {
  "level": "organization",
  "objectName": "stride-crm-opportunities",
  "vendorName": "deals",
  "startDate": "2017-11-02 21:12:24.11304",
  "fields": [
    {
      "type": "number",
      "path": "amount",
      "vendorPath": "properties.amount",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "closeDate",
      "vendorPath": "properties.closedate",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "comments",
      "vendorPath": "properties.description",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "id",
      "vendorPath": "dealId",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "name",
      "vendorPath": "properties.dealname",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "stage",
      "vendorPath": "properties.dealstage",
      "level": "organization"
    }
  ],
  "configuration": [
    {
      "type": "addToDocumentation"
    },
    {
      "type": "passThrough",
      "properties": {
        "fromVendor": false,
        "toVendor": false
      }
    },
    {
      "type": "inherit"
    }
  ],
  "script": {
    "body": "if (fromVendor) {\n  transformedObject.closeDate = new Date(parseInt(originalObject.properties.closedate)).toISOString().substr(0,10)\n}\ndone(transformedObject);\n//  new Date(1512028800000).toISOString().substr(0,10)\n",
    "mimeType": "application/javascript",
    "filterEmptyResponse": false
  },
  "isLegacy": false
};
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/elements/'+flavor+'/transformations/stride-crm-opportunities',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: opptranhub
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
        cb(body);
    });
}

const createHubTransCon = (flavor, cb) => {

 var contranhub = {
  "level": "organization",
  "objectName": "stride-crm-contacts",
  "vendorName": "contacts",
  "startDate": "2017-11-02 21:17:27.595168",
  "fields": [
    {
      "type": "string",
      "path": "email",
      "vendorPath": "properties.email",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "firstName",
      "vendorPath": "properties.firstname",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "id",
      "vendorPath": "vid",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "lastName",
      "vendorPath": "properties.lastname",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "phone",
      "vendorPath": "properties.phone",
      "level": "organization"
    }
  ],
  "configuration": [
    {
      "type": "passThrough",
      "properties": {
        "fromVendor": false,
        "toVendor": false
      }
    },
    {
      "type": "inherit"
    }
  ],
  "isLegacy": false
}
;
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/elements/'+flavor+'/transformations/stride-crm-contacts',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: contranhub
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
        cb(body);
    });
}

const createHubTransAcc = (flavor, cb) => {

 var acctranhub = {
  "level": "organization",
  "objectName": "stride-crm-accounts",
  "vendorName": "companies",
  "startDate": "2017-11-02 21:15:20.024733",
  "fields": [
    {
      "type": "string",
      "path": "description",
      "vendorPath": "properties.description",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "id",
      "vendorPath": "companyId",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "name",
      "vendorPath": "properties.name",
      "level": "organization"
    },
    {
      "type": "string",
      "path": "status",
      "vendorPath": "properties.state",
      "level": "organization"
    }
  ],
  "configuration": [
    {
      "type": "addToDocumentation"
    },
    {
      "type": "passThrough",
      "properties": {
        "fromVendor": false,
        "toVendor": false
      }
    },
    {
      "type": "inherit"
    }
  ],
  "isLegacy": false
}

;
    var options = {
        method: 'POST',
        url: 'https://' + (process.env.CE_ENV || 'api') + '.cloud-elements.com/elements/api-v2/organizations/elements/'+flavor+'/transformations/stride-crm-accounts',
        json: true,
        headers: {
            'content-type': 'application/json',
            'authorization': "User " + process.env.CE_USER + ", Organization " + process.env.CE_ORG
        },
        body: acctranhub
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
        cb(body);
    });
}

const createDefinitions = (cb) => {
    console.log("ABOUT TO CREATE stride-crm-opportunities");
    createOppDefinition(() => {
        console.log("ABOUT TO CREATE stride-crm-contacts");
        createContactDefinition(() => {
            console.log("ABOUT TO CREATE stride-crm-accounts");
            createAccountDefinition(cb);
        });
    });
}


const createTransformations = (flavor, cb) => {
    switch (flavor) {

    case "sfdc":
        throw "not implemented";

    case "hubspotcrm":
        console.log("ABOUT TO CREATE Acc trans");
        createHubTransAcc(flavor, ()=>{
            console.log("ABOUT TO CREATE Con trans");
            createHubTransCon(flavor, ()=>{
                console.log("ABOUT TO CREATE Opp trans");
                createHubTransOpp(flavor, cb);
            });
        });
        break;

    case "closeio":
        createCloseTransAcc(flavor, ()=>{
            createCloseTransCon(flavor, ()=>{
                createCloseTransOpp(flavor, cb);
            });
        });
        break;
    }
}

const createAllTransformations = (cb) => {
    createTransformations("hubspotcrm", ()=>{
        createTransformations("closeio", cb);
    });
}


module.exports = {
    postInstanceBody: postInstanceBody,
    getCRMOpportunities: getCRMOpportunities,
    getCRMLeads: getCRMLeads,
    getCRMLeadsByID: getCRMLeadByID,
    createFormula: createFormula,
    createFormulaInstance: createFormulaInstance,

    createDefinitions: createDefinitions,
    createTransformations: createTransformations,
    createAllTransformations: createAllTransformations,
}
