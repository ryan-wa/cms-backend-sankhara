require('dotenv').config();
const express = require('express');
const { createClient } = require('@sanity/client');
const { formatResponse, getRecipients, getTestRecipients, generateQRCode, getGDriveFolders, generateAllQRCodes, formatContentResponse } = require('./util');
const { sendEmails, sendEmail } = require('./emailService');
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
    // Updated query to order by publishedAt
    const query = `*[_type == "testPost"] | order(publishedAt desc)[0]{
      title,
      slug,
      publishedAt,
      videoThumbnail,
      video,
      body,
      gridImage1,
      gridImage2,
      gridImage3,
      gridImage4,
      gridImage5,
      gridImage6,
      isTest
    }`;

    const [latestPost, recipients] = await Promise.all([
      sanityClient.fetch(query),
      getTestRecipients(sanityClient)
    ]);

    console.log(recipients);
    // Handle cases where no post or recipients
    if (!latestPost) {
      return res.status(404).send('No post found');
    }

    if (!recipients || recipients.length === 0) {
      return res.status(404).send('No recipients found');
    }

    const formattedPost = formatResponse(latestPost);

    if (formattedPost.isTest) {
      let testRecipients = await getTestRecipients(sanityClient);
      // Send test emails
      await sendEmails(formattedPost, testRecipients);
    } else {
      // Send emails to all recipients
      await sendEmails(formattedPost, recipients, 'ryan@sankhara.com', 'Ryan');
    }

    res.status(200).json({
      message: recipients.length == 2 ? 'Successfully sent email updates to all recipients' : 'Did not find 2 recipients',
      data: {
        post: formattedPost,
        recipientCount: recipients.length,
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
    const query = `*[_type == "post"] | order(publishedAt desc)[0]{
      title,
      slug,
      publishedAt,
      videoThumbnail,
      video,
      body,
      gridImage1,
      gridImage2,
      gridImage3,
      gridImage4,
      gridImage5,
      gridImage6,
      isTest
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
    let testRecipients = [{
      email: 'ryan@finches.co',
      name: 'Ryan'
    }, {
      email: 'pankaj@sankhara.com',
      name: 'Pankaj'
    }];
    if (formattedPost.isTest) {
      // testRecipients = await getTestRecipients(sanityClient);
      // testRecipients.push({
      //   email: 'pankaj@sankhara.com',
      //   name: 'Pankaj'
      // });
      // Send test emails
      await sendEmails(formattedPost, testRecipients);
    } else {
      await sendEmails(formattedPost, recipients);
    }

    res.status(200).json({
      message: 'Successfully sent email updates to all recipients',
      data: {
        post: formattedPost,
        recipientCount: formattedPost.isTest ? testRecipients.length : recipients.length
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

app.get('/latestFileInfo', async (req, res) => {
  const query = `*[_type == "companyFiles"] | order(_createdAt desc)[0]{
    ...
  }`;
  const latestFileInfo = await sanityClient.fetch(query);
  res.status(200).json({ latestFileInfo });
});

app.get('/getLatestContent', async (req, res) => {
  const query = `*[_type == "content"] | order(publishedAt desc)[0]{
    ...
  }`;
  const latestContent = await sanityClient.fetch(query);
  res.status(200).json({ latestContent });
});

app.post('/populateUsersFromRecipients', async (req, res) => {
  try {
    // Get all recipients
    const recipients = await getRecipients(sanityClient);

    if (!recipients || recipients.length === 0) {
      return res.status(404).json({ message: 'No recipients found' });
    }

    // Create user documents for each recipient
    const userPromises = recipients.map(async (recipient, index) => {
      // Generate 5-digit investor ID (00001, 00002, etc.)
      const investorID = String(index + 1).padStart(5, '0');

      const userDoc = {
        _type: 'user',
        name: recipient.name,
        email: recipient.email,
        role: 'Investor',
        investorID: investorID,
        viewPermissions: {
          dashboard: true,
          treasures: true,
          journal: true,
          performance: true,
          directory: true,
          partners: true
        }
      };

      // Create the user document
      return await sanityClient.create(userDoc);
    });

    // Wait for all user documents to be created
    const createdUsers = await Promise.all(userPromises);

    res.status(200).json({
      message: 'Successfully populated users from recipients',
      data: {
        totalRecipients: recipients.length,
        createdUsers: createdUsers.length,
        users: createdUsers
      }
    });
  } catch (error) {
    console.error('Error populating users from recipients:', error);
    res.status(500).json({
      message: 'Error populating users from recipients',
      error: error.message
    });
  }
});

app.post('/addTreasure', async (req, res) => {
  const { treasure } = req.body;

  try {
    // Send email notification
    await sendEmail(
      'system@sankhara.com',
      'New Treasure Added',
      `<h2>New Treasure Details:</h2>
       <pre>${JSON.stringify(treasure, null, 2)}</pre>`
    );

    res.status(200).json({ message: 'Treasure added successfully' });
  } catch (error) {
    console.error('Error adding treasure:', error);
    res.status(500).json({ error: 'Failed to add treasure' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
