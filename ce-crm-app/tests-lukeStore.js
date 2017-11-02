const lukeStore = require('./luke-store');

const testSaveInstance = (conversationId, flavor, instanceBody) => {
    console.log();
    console.log();
    console.log(" ----- testing saveInstance() function for lukeStore --------");
    let instance = lukeStore.saveInstance(conversationId, flavor, instanceBody);
    console.log();
    console.log('Results from lukeStore for conversation: ' + conversationId);
    console.log();
    console.log(instance);
}

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

const testSaveFormula = (conversationId, flavor, formulaId) => {
    console.log();
    console.log();
    console.log(" ----- testing saveFormula() function for lukeStore --------");
    let formula = lukeStore.saveFormula(conversationId, flavor, formulaId);
    console.log();
    console.log('Results from lukeStore for conversation: ' + conversationId);
    console.log();
    console.log(formula);
}

const testGetFormula = () => {
    console.log();
    console.log();
    console.log(" ----- testing saveFormula() function for lukeStore --------");
    let formula = lukeStore.getFormula();
    console.log();
    console.log('Results from lukeStore: ');
    console.log();
    console.log(formula);
}

const testSaveFormulaInstance = (conversationId, flavor, formulaInstBody) => {
    console.log();
    console.log();
    console.log(" ----- testing saveFormulaInstance() function for lukeStore --------");
    let formula = lukeStore.saveFormulaInstance(conversationId, flavor, formulaInstBody);
    console.log();
    console.log('Results from lukeStore for conversation: ' + conversationId);
    console.log();
    console.log(formula);
}

const testGetFormulaInstance = (conversationId, flavor) => {
    console.log();
    console.log();
    console.log(" ----- testing getFormulaInstance() function for lukeStore --------");
    let formulaInstance = lukeStore.getFormulaInstance(conversationId, flavor);
    console.log();
    console.log('Results from lukeStore for conversation: ' + conversationId);
    console.log();
    console.log(formulaInstance);
}

const testUpdateFormulaInstance = (conversationId, flavor) => {
    console.log();
    console.log();
    console.log(" ----- testing updateFormulaInstance() function for lukeStore --------");
    let formulaInstance = lukeStore.updateFormulaInstance(conversationId, flavor, formulaInstBody);
    console.log();
    console.log('Results from lukeStore for conversation: ' + conversationId);
    console.log();
    console.log(formulaInstance);
}

// test variables
let conversationId = "7919b699-d6e9-4aad-923b-50b979411879"; //ce-dev-zone Room
let flavor = "sfdc";

// testSaveInstance(conversationId, flavor, {
//     name: "test instance name",
//     token: "test0000Token0000hash8888=",
//     elementKey: "sfdc",
//     id: "fakeId12345"
// });

// testGetInstance(conversationId, flavor);

// testSaveFormula("123fakeFormulaId12345000", conversationId, flavor);

// testSaveFormulaInstance(conversationId, flavor, {
//     id: "abc-fake-FormulaId-12345"
// })

// testGetFormula();