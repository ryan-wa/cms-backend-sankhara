const { google } = require('googleapis');

const googleOAuthClient = new google.auth.OAuth2(
    process.env.GCLOUD_CLIENT_ID,
    process.env.GCLOUD_CLIENT_SECRET,
    process.env.GCLOUD_REDIRECT_URI
);

const GAPI_SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive'
];

module.exports = {
    googleOAuthClient,
    GAPI_SCOPES
};