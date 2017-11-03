
const unfurl_sfdc = (text) => {

    var pat = /[0-9A-Za-z]{7,}/g;
    var m;
    var candidates = [];
    while ((m = pat.exec(text)) !== null) {
        candidates.push({type: "lead", id: m[0]});
    }
    return candidates;
}

const unfurl_hubspotcrm = (text) => {
    var candidates = [];

    var pat = /https:\/\/app.hubspot.com\/contacts\/(\d+)\/contact\/(\d+)\//g;
    while ((m = pat.exec(text)) !== null) {
        console.log("FOUND: " + JSON.stringify(m));
        candidates.push({type:"lead", id: m[2]});
    }

    var pat = /https:\/\/app.hubspot.com\/contacts\/(\d+)\/deal\/(\d+)\//g;
    while ((m = pat.exec(text)) !== null) {
        console.log("FOUND: " + JSON.stringify(m));
        candidates.push({type:"opportunity", id: m[2]});
    }
    return candidates;
}

const unfurl_closeio = (text) => {
    var pat = /https:\/\/app.close.io\/lead\/(lead_[^\/]+)/g;

    var candidates = [];
    while ((m = pat.exec(text)) !== null) {
        console.log("FOUND CLOSEIO: " + JSON.stringify(m));
        candidates.push({type:"account", id: m[1]});
    }
    return candidates;
}

// https://app.close.io/lead/lead_fiZn8A1RPFCza5hX1DHlkee6jmcmWhOvkt96gO3WOeO/


module.exports = {
    sfdc: unfurl_sfdc,
    hubspotcrm: unfurl_hubspotcrm,
    closeio: unfurl_closeio,
}
