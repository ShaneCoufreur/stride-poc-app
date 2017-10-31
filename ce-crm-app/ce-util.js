require('dotenv').config();

const postInstanceBody = (elementKey, code) => {
    let postInstanceBody = {};
    switch (elementKey) {
        case "sfdc":
        case "salesforce":
            postInstanceBody = {
                "element": {
                    "key": "sfdc"
                },
                "providerData": {
                    "code": code
                },
                "configuration": {
                    "oauth.callback.url": process.env.APP_URL + "/auth",
                    "oauth.api.key": process.env.SFDC_KEY,
                    "oauth.api.secret": process.env.SFDC_SECRET
                },
                "tags": [
                    "stride"
                ],
                "name": "STRIDE_TEST_" + (new Date()).getTime()
            };
            break;

        default:
            break;
    }
    return
};

module.exports = {
    postInstanceBody: postInstanceBody
}