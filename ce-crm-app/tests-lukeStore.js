const lukeStore = require('./luke-store');

const testGetInstance = (conversationId, flavor) => {
    console.log();
    console.log();
    console.log(" ----- testing getInstance() function for lukeStore --------");
    let instance = lukeStore.getInstance(conversationId, flavor);
    console.log();
    console.log('Results from lukeStore for conversation: ' + conversationId);
    console.log();
    console.log(instance);
}

// test variables
let conversationId = "7919b699-d6e9-4aad-923b-50b979411879"; //ce-dev-zone Room
let flavor = "sfdc";

testGetInstance(conversationId, flavor);