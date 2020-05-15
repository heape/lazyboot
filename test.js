var addon = require('./build/Release/addon.node');

function callf(pr84) {

    return addon.init(pr84);
}
console.log(callf('67fa1b633565daee6ca590765a57ffa1'));