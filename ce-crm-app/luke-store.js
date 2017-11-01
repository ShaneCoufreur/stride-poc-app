const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('/tmp/luke-store.json')
const db = low(adapter)

// Set some defaults
db.defaults({ instances: [], user: {} }).write();
// var instances = db.addCollection('instances');

const saveInstance = (conversationId, name, instanceToken, elementKey, instanceId) => {
    // store the instance token with the roomId
    let obj = {
        conversationId: conversationId,
        name: name,
        elementKey: elementKey,
        token: instanceToken,
        instanceId: instanceId,
        formulaId: null
    };
    // Add a post
    db.get('instances')
        .push(obj)
        .write();
};

const getInstance = (conversationId) => {
    // getPosts
    let results = db.get('instances')
        .find({ conversationId: conversationId })
        .value();
    console.log(results);
    return results;
}

module.exports = {
    saveInstance: saveInstance,
    getInstance: getInstance
};