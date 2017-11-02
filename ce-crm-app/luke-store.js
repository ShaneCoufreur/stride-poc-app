const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('/tmp/luke-store.json');
const db = low(adapter);

// Set some defaults
db.defaults({ instances: [], formulaInstances: [], formula: {} }).write();
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
        .last()
        .write();
    // return the instance that was just created
    let newInstance = db.get('instances')
        .find({ conversationId: conversationId, elementKey: flavor })
        .value();
    return newInstance;
};

const getInstance = (conversationId, flavor) => {
    // get instances via conversationId
    let results = db.get('instances')
        .find({ conversationId: conversationId, elementKey: flavor })
        .value();
    return results;
}

const getConversation = (instanceId, flavor) => {
    // get instances via instanceId
    let results = db.get('instances')
        .find({ instanceId: instanceId, elementKey: flavor })
        .value();
    return results;
}
const checkIfFormula = () => {
    let formula = db.get('formula').value();
    return formula;
}

const saveFormula = (formulaId, conversationId, flavor) => {
    // should we store formulaId with roomId?
    // Add a formula
    db.set('formula.id', formulaId).write();
    // return formula with new ID
    let formula = db.get('formula.id').value();
    return formula;
}

const getFormula = (conversationId, flavor) => {
    let formula = db.get('formula')
        // .find({ conversationId: conversationId, elementKey: flavor })
        .value();
    return formula;
}

const saveFormulaInstance = (conversationId, flavor, formulaInstBody) => {
    // update relative instance body with formula info
    let instance = db.get('instances')
        .find({ conversationId: conversationId, elementKey: flavor })
        .value();
    // build formulaInstance obj
    let obj = {
        elemInstanceId: instance.instanceId,
        conversationId: conversationId,
        elementKey: flavor,
        fxInstanceId: formulaInstBody.id
    }
    let results = db.get('formulaInstances')
        .push(obj)
        .write();
    return results;
}

const getFormulaInstance = (conversationId, flavor) => {
    let instance = db.get('formulaInstances')
        .find({ conversationId: conversationId, elementKey: flavor })
        .value();
    return instance;
}

const updateFormulaInstance = (conversationId, flavor, formulaInstBody) => {
    let instance = db.get('formulaInstances')
        .find({ conversationId: conversationId, elementKey: flavor })
        .assign({ fxInstanceId: formulaInstBody.id })
        .write();
    return instance;
}



module.exports = {
    saveInstance: saveNewInstance,
    getInstance: getInstance,
    getConversation: getConversation,
    saveFormula: saveFormula,
    getFormula: getFormula,
    saveFormulaInstance: saveFormulaInstance,
    updateFormulaInstance: updateFormulaInstance,
    getFormulaInstance: getFormulaInstance,
    checkIfFormula: checkIfFormula
};