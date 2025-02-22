const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const { createMergedImage } = require('./util');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SIGNATURE_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/1527b7e7560c63ddbe93a770cb12b86197d57cac-1867x587.png`;
const LOGO_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/156e990cc2bc008214139dacf98b22273b59d279-1224x397.png`;
const PLAY_BUTTON_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/6beea343585e8c175f8dffeb233849b6dbc29618-600x600.png`;

const DARK_LOGO_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/9fbc65490df485a1a20375b9aee2d02b5d93f6b7-878x209.png`;
const BACKGROUND_COLOR = '#F7F7F7';

const createEmailTemplate = (post, videoThumbnailUrl) => {
    const MAX_IMAGE_DIMENSION = 500;  // Maximum dimension for width or height
    const MAX_GRID_IMAGE_DIMENSION = 300;

    const createImageRows = (images) => {
        const rows = [];
        for (let i = 0; i < Math.min(images.length, 6); i += 2) {
            const row = images.slice(i, i + 2);
            rows.push(row);
        }
        return rows;
    };

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${post.title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: ${BACKGROUND_COLOR};
                }
                .logo-container {
                    width: 100%;
                    max-width: 200px;
                    margin: 0 auto 25px auto;
                    text-align: center;
                }
                .logo {
                    width: 200px;  /* Fixed width */
                    height: auto;
                    display: block;
                }
                .divider {
                    width: 90%;
                    height: 1px;
                    background-color: #000;
                    margin: 0 auto 30px auto;
                }
                .title {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 25px;
                    color: #333;
                }
                .content {
                    margin-bottom: 30px;
                    text-align: left;
                }
                .grid-container {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-bottom: 25px;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }
                .grid-image {
                    width: 100%;
                    height: 180px;
                    object-fit: cover;
                    display: block;
                }
                @media screen and (max-width: 480px) {
                    .grid-container {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    td img[alt="Grid Image"] {
                        width: 140px !important;  /* Make width equal to height */
                        height: 140px !important;
                        object-fit: cover !important;
                    }
                }
                .signature {
                    margin-top: 30px;
                    border-top: 1px solid #000;
                    padding-top: 20px;
                }
                .signature img {
                    width: 200px;
                    height: auto;
                    display: block;
                }
                .main-image-container {
                    position: relative;
                    width: 100%;
                    max-width: ${MAX_IMAGE_DIMENSION}px;
                    margin: 0 auto 25px auto;
                    text-align: center;
                }
                .main-image {
                    max-width: 100%;
                    max-height: ${MAX_IMAGE_DIMENSION}px;
                    width: auto;
                    height: auto;
                    display: block;
                    margin-left: auto;
                    margin-right: auto;
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BACKGROUND_COLOR};">
                <tr>
                    <td align="center" style="padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BACKGROUND_COLOR};">
                            <tr>
                                <td>
                                    <div class="logo-container">
                                        <img src="${DARK_LOGO_URL}" alt="Logo" class="logo">
                                    </div>
                                    <div class="divider"></div>
                                    ${videoThumbnailUrl ? `
                                        <a href="${post.video || '#'}" target="_blank" class="main-image-container">
                                            <img src="${videoThumbnailUrl}" alt="Video Thumbnail" class="main-image">
                                        </a>
                                    ` : ''}
                                    ${post.gridImages && post.gridImages.length > 0 ? `
                                        <table cellspacing="10" cellpadding="0" border="0" class="grid-container" style="max-width: ${MAX_IMAGE_DIMENSION}px; margin-bottom: 25px;">
                                            ${createImageRows(post.gridImages).map(row => `
                                                <tr>
                                                    ${row.map(imgUrl => `
                                                        <td style="width: 50%; padding: 5px;">
                                                            <img src="${imgUrl}" 
                                                                 alt="Grid Image" 
                                                                 style="width: 240px; height: 240px; object-fit: cover; display: block; margin: 0 auto;">
                                                        </td>
                                                    `).join('')}
                                                    ${row.length < 2 ? `<td colspan="${2 - row.length}" style="width: ${(2 - row.length) * 50}%;"></td>` : ''}
                                                </tr>
                                            `).join('')}
                                        </table>
                                    ` : ''}
                                    <div class="content">
                                        <div class="body-text">
                                            ${post.body}
                                        </div>
                                    </div>
                                    <div class="signature">
                                        <img src="${SIGNATURE_URL}" alt="Signature" style="width: 200px; height: auto; display: block;" />
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

const sendEmails = async (post, recipients, senderEmail = process.env.SENDGRID_FROM_EMAIL, senderName = process.env.SENDGRID_FROM_NAME) => {
    try {
        const mergedImageUrl = await createMergedImage(PLAY_BUTTON_URL, post.videoThumbnail);
        console.log(mergedImageUrl);
        const emailTemplate = createEmailTemplate(post, mergedImageUrl);

        const personalizations = recipients.map(recipient => ({
            to: { email: recipient.email, name: recipient.name }
        }));

        const msg = {
            personalizations,
            from: {
                email: senderEmail,
                name: senderName
            },
            subject: `${post.title}`,
            html: emailTemplate,
        };

        const response = await sgMail.send(msg);
        console.log('Emails sent successfully');

        return response;
    } catch (error) {
        console.error('Error sending emails:', error);
        if (error.response) {
            console.error('SendGrid error details:', error.response.body);
        }
        throw error;
    }
};

module.exports = {
    sendEmails
}; 