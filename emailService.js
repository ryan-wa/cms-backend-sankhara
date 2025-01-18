const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const createEmailTemplate = (post) => {
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
                }
                .content {
                    margin-bottom: 30px;
                    text-align: left;
                }
                .image-container {
                    display: block;
                    width: 100%;
                    max-width: 600px;
                    margin: 0 0 10px;
                }
                .image {
                    width: 100%;
                    height: auto;
                    display: block;
                    margin: 0;
                }
                .video-link {
                    display: inline-block;
                    margin-top: 10px;
                    margin-bottom: 20px;
                    font-size: 16px;
                    color: #007BFF;
                    text-decoration: none;
                }
                .video-link:hover {
                    text-decoration: underline;
                }
                .body-text {
                    margin-bottom: 30px;
                    text-align: left;
                }
                .footer {
                    text-align: left;
                    font-size: 12px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="content">
                ${post.image ? `
                    <div class="image-container">
                        <img src="${post.image}" alt="Post Image" class="image">
                    </div>
                ` : ''}
                ${post.video ? `
                    <a href="${post.video}" target="_blank" class="video-link">Click here to watch the video version!</a>
                ` : ''}
                <div class="body-text">
                    ${post.body}
                </div>
            </div>
        </body>
        </html>
    `;
};

const sendEmails = async (post, recipients) => {
    try {
        const emailTemplate = createEmailTemplate(post);
        
        const personalizations = recipients.map(recipient => ({
            to: { email: recipient.email, name: recipient.name }
        }));

        const msg = {
            personalizations,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL,
                name: process.env.SENDGRID_FROM_NAME || 'Your Company Name'
            },
            subject: `New Update: ${post.title}`,
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