
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
    var pat = /https:\/\/app.hubspot.com\/contacts\/(\d+)\/contact\/(\d\+)\//;

    var candidates = [];
    while ((m = pat.exec(text)) !== null) {
        console.log("FOUND: " + JSON.stringify(m));
        candidates.push({type:"lead", id: m[1]});
    }
    return candidates;
}


module.exports = {
    sfdc: unfurl_sfdc,
    hubspotcrm: unfurl_hubspotcrm,
}
