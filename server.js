require('dotenv').config();
const express = require('express');
const { createClient } = require('@sanity/client');
const { formatResponse, getRecipients } = require('./util');
const { sendEmails } = require('./emailService');
const app = express();
const port = process.env.PORT || 3000;

// Configure Sanity client
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID, 
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_TOKEN, 
  apiVersion: '2023-03-20',
  useCdn: false
});

// Simple route: GET /sendEmailUpdate
app.get('/sendEmailUpdate', async (req, res) => {
  try {
    // Updated query to use individual image fields
    const query = `*[_type == "post"] | order(_createdAt desc)[0]{
      title,
      slug,
      publishedAt,
      image,
      video,
      body,
      image_1,
      image_2,
      image_3,
      image_4,
      image_5,
      image_6
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
