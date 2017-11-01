const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('/tmp/luke-store.json')
const db = low(adapter)

// Set some defaults
db.defaults({ instances: [], user: {} }).write();
// var instances = db.addCollection('instances');

const saveNewInstance = (conversationId, flavor, instanceBody) => {
    // store the instance token with the roomId
    let obj = {
        conversationId: conversationId,
        name: instanceBody.name,
        elementKey: instanceBody.elementKey,
        token: instanceBody.token,
        instanceId: instanceBody.id,
        appFlavor: flavor,
        formula: {
            id: null,
            instanceId: null,
            objects: []
        }
    };
    // Add a post
    db.get('instances')
        .push(obj)
        .write();
};

const updateInstance = (conversationId, flavor, instanceBody) => {
    // update relative instance body with formula info

    db.get('instances')
        .find({ conversationId: conversationId })
        .value()
        .assign({ title: 'hi!' })
        .write();
}

const getInstance = (conversationId) => {
    // getPosts
    let results = db.get('instances')
        .find({ conversationId: conversationId })
        .value();
    console.log(results);
    return results;
}

module.exports = {
    createInstance: saveNewInstance,
    getInstance: getInstance
};