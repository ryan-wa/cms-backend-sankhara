require('dotenv').config();
const express = require('express');
const { createClient } = require('@sanity/client');
const { formatResponse, getRecipients, getTestRecipients, generateQRCode, getGDriveFolders, generateAllQRCodes } = require('./util');
const { sendEmails } = require('./emailService');
const { googleOAuthClient, GAPI_SCOPES } = require('./gcloud');
const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// Configure Sanity client
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_TOKEN,
  apiVersion: '2023-03-20',
  useCdn: false
});

app.get('/sendEmailUpdateTest', async (req, res) => {
  try {
    // Original query and rest of the code
    const query = `*[_type == "testPost"] | order(_createdAt desc)[0]{
      title,
      slug,
      publishedAt,
      mainImage,
      video,
      body,
      gridImage1,
      gridImage2,
      gridImage3,
      gridImage4,
      gridImage5,
      gridImage6
    }`;

    const [latestPost, recipients] = await Promise.all([
      sanityClient.fetch(query),
      getTestRecipients(sanityClient)
    ]);

    // Handle cases where no post or recipients
    if (!latestPost) {
      return res.status(404).send('No post found');
    }

    if (!recipients || recipients.length === 0) {
      return res.status(404).send('No recipients found');
    }

    const formattedPost = formatResponse(latestPost);

    // Send emails to all recipients
    await sendEmails(formattedPost, recipients, 'ryan@sankhara.com', 'Ryan');

    res.status(200).json({
      message: 'Successfully sent email updates to all recipients',
      data: {
        post: formattedPost,
        recipientCount: recipients.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing email updates');
  }
});

// Simple route: GET /sendEmailUpdate
app.get('/sendEmailUpdate', async (req, res) => {
  try {
    // Updated query to use individual image fields
    const query = `*[_type == "post"] | order(_createdAt desc)[0]{
      title,
      slug,
      publishedAt,
      mainImage,
      video,
      body,
      gridImage1,
      gridImage2,
      gridImage3,
      gridImage4,
      gridImage5,
      gridImage6
    }`;

    const [latestPost, recipients] = await Promise.all([
      sanityClient.fetch(query),
      getRecipients(sanityClient)
    ]);

    // Handle cases where no post or recipients
    if (!latestPost) {
      return res.status(404).send('No post found');
    }

    if (!recipients || recipients.length === 0) {
      return res.status(404).send('No recipients found');
    }

    const formattedPost = formatResponse(latestPost);

    // Send emails to all recipients
    await sendEmails(formattedPost, recipients);

    res.status(200).json({
      message: 'Successfully sent email updates to all recipients',
      data: {
        post: formattedPost,
        recipientCount: recipients.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing email updates');
  }
});

app.post('/generateQR', async (req, res) => {
  try {
    const { url, assetName } = req.body;
    const qrOptions = {
      lightColor: '##549E9A',
      darkColor: '##131315',
      width: 256,
      height: 256
    };
    const result = await generateQRCode(url, assetName);
    res.status(200).json({ msg: 'QR code generated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating QR code');
  }
});

app.get('/generateAllQRs', async (req, res) => {
  const authUrl = googleOAuthClient.generateAuthUrl({
    access_type: 'offline', // enables refresh tokens
    scope: GAPI_SCOPES,
  });
  res.send(`<a href="${authUrl}">Authorize with Google</a>`);
});

// OAuth2 callback URL.
app.get('/finishQRGeneration', async (req, res) => {
  try {
    const { code } = req.query;
    res.send('Authentication successful! Check your console for folder details.');
    const folders = await getGDriveFolders(code);
    await generateAllQRCodes(folders);
  } catch (error) {
    res.status(500).send('Authentication failed');
    console.error('Error retrieving access token', error);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
