const { google } = require('googleapis');

module.exports.googleOAuthClient = new google.auth.OAuth2(
    process.env.GCLOUD_CLIENT_ID,
    process.env.GCLOUD_CLIENT_SECRET,
    process.env.GCLOUD_REDIRECT_URI
);

// Set the scopes you need.
module.exports.GAPI_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];