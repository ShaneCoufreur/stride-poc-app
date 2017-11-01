const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('/tmp/luke-store.json');
const db = low(adapter);

// Set some defaults
db.defaults({ instances: [], formulas: [] }).write();
// var instances = db.addCollection('instances');

const saveNewInstance = (conversationId, flavor, instanceBody) => {
    // store the instance token with the roomId
    let obj = {
        conversationId: conversationId,
        name: instanceBody.name,
        elementKey: instanceBody.elementKey,
        token: instanceBody.token,
        instanceId: instanceBody.id
    };
    // Add an instance
    db.get('instances')
        .push(obj)
        .write();
};

const saveFormula = (conversationId, flavor, formulaBody) => {
    // store formulaId with roomId
    let obj = {
            id: null,
            instances: [],
            objects: []
        }
        // Add a formula
    db.get('formulas')
        .push(obj)
        .write();
}

const saveNewFormula = (conversationId, flavor, formulaInstBody) => {
    // update relative instance body with formula info

    let results = db.get('instances')
        .find({ conversationId: conversationId, elementKey: flavor })
        .value()
        // .assign({ title: 'hi!' })
        // .write();
    return results;
}

const getInstance = (conversationId, flavor) => {
    // getPosts
    let results = db.get('instances')
        .find({ conversationId: conversationId, elementKey: flavor })
        .value();
    return results;
}

module.exports = {
    createInstance: saveNewInstance,
    getInstance: getInstance
};