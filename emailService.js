const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const { createMergedImage } = require('./util');
const sharp = require('sharp');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SIGNATURE_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/1527b7e7560c63ddbe93a770cb12b86197d57cac-1867x587.png`;
const LOGO_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/156e990cc2bc008214139dacf98b22273b59d279-1224x397.png`;
const PLAY_BUTTON_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/2b7018d54e02db430121457411d4001892d8f0e5-400x400.png`;

const FALLBACK_THUMBNAIL_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/a3d3bcf0fd4790032f906e920ef57bcca18c1930-514x30.png`
const DARK_LOGO_URL = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/9fbc65490df485a1a20375b9aee2d02b5d93f6b7-878x209.png`;
const BACKGROUND_COLOR = '#F7F7F7';

const createEmailTemplate = (post, videoThumbnailUrl) => {
    const MAX_IMAGE_DIMENSION = 500;  // Maximum dimension for width or height
    const MAX_GRID_IMAGE_DIMENSION = 300;
    const SINGLE_GRID_IMAGE_DIMENSION = 400;  // Larger size for single grid image

    const createImageRows = (images) => {
        // If there's only one image, return it as a single item array
        if (images.length === 1) {
            return [images];
        }

        const rows = [];
        for (let i = 0; i < Math.min(images.length, 6); i += 2) {
            const row = images.slice(i, i + 2);
            rows.push(row);
        }
        return rows;
    };

    // Only show video thumbnail with play button if there's a video
    const mainImageHtml = post.video
        ? `<a href="${post.video || '#'}" target="_blank" class="main-image-container">
            <img src="${videoThumbnailUrl}" alt="Video Thumbnail" class="main-image">
           </a>`
        : post.videoThumbnail
            ? `<div class="main-image-container">
                <img src="${post.videoThumbnail}" alt="Thumbnail" class="main-image">
               </div>`
            : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${post.title}</title>
            <style>
                @import url('https://api.fontshare.com/v2/css?f[]=general-sans@1&display=swap');
                body {
                    font-family: 'General Sans Variable', Arial, sans-serif;
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
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    margin-top: 30px;
                    color: #333;
                }
                .content {
                    margin-bottom: 30px;
                    text-align: left;
                    font-size: 15px;
                }
                .content p {
                    margin-bottom: 1em;
                    margin-top: 1em;
                    min-height: 1em;
                }
                .content br {
                    display: block;
                    margin: 0.5em 0;
                    content: "";
                }
                .content p:empty {
                    min-height: 1em;
                    margin: 1em 0;
                }
                .notification-label {
                    background-color: #E74C3C;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    display: inline-block;
                    margin-right: 15px;
                    margin-bottom: 20px;
                }
                .main-image-container {
                    position: relative;
                    width: 100%;
                    max-width: ${MAX_IMAGE_DIMENSION}px;
                    margin: 0 auto 40px auto;
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
                .single-grid-image-container {
                    position: relative;
                    width: 100%;
                    max-width: ${SINGLE_GRID_IMAGE_DIMENSION}px;
                    margin: 0 auto 40px auto;
                    text-align: center;
                }
                .single-grid-image {
                    max-width: 100%;
                    max-height: ${SINGLE_GRID_IMAGE_DIMENSION}px;
                    width: auto;
                    height: auto;
                    display: block;
                    margin-left: auto;
                    margin-right: auto;
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
                        width: 140px !important;
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
                                    ${mainImageHtml}
                                    ${post.gridImages && post.gridImages.length > 0 ? `
                                        ${post.gridImages.length === 1 ? `
                                            <div class="single-grid-image-container">
                                                <img src="${post.gridImages[0]}" alt="Grid Image" class="single-grid-image">
                                            </div>
                                        ` : `
                                            <table cellspacing="10" cellpadding="0" border="0" class="grid-container" style="max-width: ${MAX_IMAGE_DIMENSION}px; margin: 0 auto 25px auto;">
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
                                        `}
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
        // Only create merged image with play button if there's a video
        const thumbnailUrl = post.video
            ? await createMergedImage(PLAY_BUTTON_URL, post.videoThumbnail)
            : post.videoThumbnail;

        const emailTemplate = createEmailTemplate(post, thumbnailUrl);
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

const createContentEmailTemplate = async (content, videoThumbnails = {}) => {
    const MAX_IMAGE_DIMENSION = 500;  // Maximum dimension for width or height
    const MAX_VIDEO_WIDTH = 300;      // Maximum video width for thumbnails

    // Helper function to process content blocks
    const processContentBlocks = async (blocks) => {
        if (!blocks || !Array.isArray(blocks)) return '';

        let htmlContent = '';
        let gridImages = []; // Array to collect images that should be in a grid
        let isInList = false;
        let currentListType = null;
        let currentLevel = 0;

        // Function to flush grid images
        const flushGridImages = () => {
            if (gridImages.length > 0) {
                htmlContent += renderImageGrid(gridImages);
                gridImages = [];
            }
        };

        // Function to handle list transitions
        const handleListTransition = (block) => {
            if (block.listItem) {
                if (!isInList || currentListType !== block.listItem || currentLevel !== (block.level || 1)) {
                    if (isInList) {
                        // Close previous list if type or level changed
                        htmlContent += '</ul>';
                    }
                    const listStyle = block.listItem === 'bullet'
                        ? ['disc', 'circle', 'square'][Math.min((block.level || 1) - 1, 2)]
                        : ['decimal', 'lower-alpha', 'lower-roman'][Math.min((block.level || 1) - 1, 2)];

                    htmlContent += `<ul style="list-style-type: ${listStyle}; margin-left: ${20 * (block.level || 1)}px; padding-left: 20px;">`;
                    isInList = true;
                    currentListType = block.listItem;
                    currentLevel = block.level || 1;
                }
            } else if (isInList) {
                htmlContent += '</ul>';
                isInList = false;
                currentListType = null;
                currentLevel = 0;
            }
        };

        // Function to render grid of images
        const renderImageGrid = (images) => {
            if (images.length === 0) return '';

            const rows = [];
            for (let i = 0; i < images.length; i += 2) {
                const row = images.slice(i, Math.min(i + 2, images.length));
                rows.push(row);
            }

            return `
                <table cellspacing="10" cellpadding="0" border="0" style="max-width: ${MAX_IMAGE_DIMENSION}px; margin: 0 auto 25px auto;">
                    ${rows.map(row => `
                        <tr style="vertical-align: top;">
                            ${row.map(img => {
                // Determine if image is portrait or landscape and set appropriate dimension
                const dimensionParam = img.metadata.isPortrait ?
                    `h=${img.metadata.height}` :
                    `w=${img.metadata.width}`;
                const imageUrl = `${img.url}?${dimensionParam}`;

                return `
                                    <td style="width: 50%; padding: 5px;">
                                        <div style="text-align: center;">
                                            <div style="margin-bottom: 8px;">
                                                <img src="${imageUrl}" 
                                                     alt="${img.caption || 'Grid Image'}" 
                                                     style="width: 240px; height: 240px; object-fit: cover; display: block; margin: 0 auto;">
                                            </div>
                                            ${img.caption ? `
                                                <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">
                                                    ${img.caption}
                                                </p>
                                            ` : ''}
                                        </div>
                                    </td>
                                `;
            }).join('')}
                            ${row.length < 2 ? `<td style="width: ${(2 - row.length) * 50}%;"></td>` : ''}
                        </tr>
                    `).join('')}
                </table>
            `;
        };

        // Function to process an image and get its metadata
        const processImageMetadata = async (imageUrl) => {
            try {
                const response = await fetch(imageUrl);
                const buffer = await response.arrayBuffer();
                const metadata = await sharp(Buffer.from(buffer)).metadata();
                return {
                    isPortrait: metadata.height > metadata.width,
                    width: metadata.width,
                    height: metadata.height
                };
            } catch (error) {
                console.error('Error processing image metadata:', error);
                return {
                    isPortrait: false,
                    width: 240,
                    height: 240
                };
            }
        };

        // Function to handle independent image
        const renderIndependentImage = async (imageUrl, caption) => {
            try {
                const metadata = await processImageMetadata(imageUrl);
                const dimensionParam = metadata.isPortrait ?
                    `h=${metadata.height}` :
                    `w=${metadata.width}`;
                const processedImageUrl = `${imageUrl}?${dimensionParam}`;

                return `
                    <div style="margin: 20px 0; text-align: center;">
                        <div style="margin-bottom: 8px;">
                            <img src="${processedImageUrl}" 
                                 alt="${caption || 'Content Image'}" 
                                 style="max-width: 100%; max-height: ${MAX_IMAGE_DIMENSION}px; width: auto; height: auto;">
                        </div>
                        ${caption ? `
                            <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">
                                ${caption}
                            </p>
                        ` : ''}
                    </div>
                `;
            } catch (error) {
                console.error('Error processing independent image:', error);
                return `
                    <div style="margin: 20px 0; text-align: center;">
                        <img src="${imageUrl}" alt="${caption || 'Content Image'}" 
                             style="max-width: 100%; max-height: ${MAX_IMAGE_DIMENSION}px; width: auto; height: auto;">
                        ${caption ? `
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                ${caption}
                            </p>
                        ` : ''}
                    </div>
                `;
            }
        };

        for (const block of blocks) {
            if (block._type === 'block') {
                // Flush any pending grid images before text content
                flushGridImages();

                // Handle list transitions
                handleListTransition(block);

                // Text block - process the block content directly
                const blockContent = block.children.map(child => {
                    // Convert each newline to a br tag to preserve spacing
                    let text = (child.text || '').replace(/\n/g, '<br>');

                    // Apply text styling marks
                    if (child.marks && block.markDefs) {
                        if (child.marks.includes('strong')) {
                            text = `<strong>${text}</strong>`;
                        }
                        if (child.marks.includes('em')) {
                            text = `<em>${text}</em>`;
                        }
                        if (child.marks.includes('underline')) {
                            text = `<u>${text}</u>`;
                        }
                        if (child.marks.includes('strike-through')) {
                            text = `<del>${text}</del>`;
                        }

                        // Handle links
                        const linkMark = block.markDefs.find(def => child.marks.includes(def._key));
                        if (linkMark) {
                            text = `<a href="${linkMark.href}" style="color: #007BFF; text-decoration: none; border-bottom: 1px solid #007BFF; padding-bottom: 1px;" target="_blank">${text}</a>`;
                        }
                    }
                    return text;
                }).join('');

                // Handle lists and other block styles with proper spacing
                if (block.listItem) {
                    htmlContent += `<li style="margin-bottom: 10px;">${blockContent}</li>`;
                } else {
                    // Wrap in appropriate HTML tag based on style
                    const style = block.style || 'normal';
                    switch (style) {
                        case 'h1':
                            htmlContent += `<h1 style="font-size: 2em; margin-bottom: 0.5em; color: #333; line-height: 1.4;">${blockContent}</h1>`;
                            break;
                        case 'h2':
                            htmlContent += `<h2 style="font-size: 1.8em; margin-bottom: 0.5em; color: #333; line-height: 1.4;">${blockContent}</h2>`;
                            break;
                        case 'h3':
                            htmlContent += `<h3 style="font-size: 1.6em; margin-bottom: 0.5em; color: #333; line-height: 1.4;">${blockContent}</h3>`;
                            break;
                        case 'h4':
                            htmlContent += `<h4 style="font-size: 1.4em; margin-bottom: 0.5em; color: #333; line-height: 1.4;">${blockContent}</h4>`;
                            break;
                        case 'h5':
                            htmlContent += `<h5 style="font-size: 1.2em; margin-bottom: 0.5em; color: #333; line-height: 1.4;">${blockContent}</h5>`;
                            break;
                        case 'h6':
                            htmlContent += `<h6 style="font-size: 1.1em; margin-bottom: 0.5em; color: #333; line-height: 1.4;">${blockContent}</h6>`;
                            break;
                        case 'blockquote':
                            htmlContent += `<blockquote style="margin: 1em 0; padding-left: 1em; border-left: 4px solid #ccc; color: #666; line-height: 1.6;">${blockContent}</blockquote>`;
                            break;
                        default:
                            htmlContent += `<p style="margin-bottom: 15px; line-height: 1.6;">${blockContent}</p>`;
                    }
                }
            } else if (block._type === 'picture' && block.image && block.image.asset) {
                // Close any open list before handling images
                if (isInList) {
                    htmlContent += '</ul>';
                    isInList = false;
                    currentListType = null;
                    currentLevel = 0;
                }
                const imageUrl = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/${block.image.asset._ref.replace('image-', '').replace('-jpg', '.jpg').replace('-png', '.png').replace('-webp', '.webp')}`;

                if (block.placement === 'in grid') {
                    // Process image metadata before adding to grid
                    const metadata = await processImageMetadata(imageUrl);
                    // Add to grid collection with metadata
                    gridImages.push({
                        url: imageUrl,
                        caption: block.caption,
                        metadata: metadata
                    });
                } else {
                    // Flush any pending grid images before independent image
                    flushGridImages();
                    // Render independent image with metadata
                    htmlContent += await renderIndependentImage(imageUrl, block.caption);
                }
            } else if (block._type === 'video' && block.videoFile && block.videoFile.asset) {
                // Flush any pending grid images before video
                flushGridImages();

                const videoUrl = `https://cdn.sanity.io/files/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/${block.videoFile.asset._ref.replace('file-', '').replace('-mp4', '.mp4').replace('-mov', '.mov').replace('-avi', '.avi').replace('-webm', '.webm')}`;

                // Get the merged thumbnail with play button
                const thumbnailUrl = videoThumbnails[block.videoFile.asset._ref] || '';

                // Add video with thumbnail and caption
                htmlContent += `
                    <div style="margin: 20px 0; text-align: center;">
                        <a href="${videoUrl}" target="_blank" style="display: inline-block;">
                            <img src="${thumbnailUrl}" alt="Video thumbnail" 
                                 style="max-width: ${MAX_VIDEO_WIDTH}px; max-height: 400px; width: auto; height: auto;">
                        </a>
                        ${block.caption ? `
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                                ${block.caption}
                            </p>
                        ` : ''}
                    </div>
                `;
            }
        }

        // Flush any remaining grid images
        flushGridImages();

        return htmlContent;
    };

    const processedContent = await processContentBlocks(content.content);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${content.title}</title>
            <style>
                @import url('https://api.fontshare.com/v2/css?f[]=general-sans@1&display=swap');
                body {
                    font-family: 'General Sans Variable', Arial, sans-serif;
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
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    margin-top: 30px;
                    color: #333;
                }
                .content {
                    margin-bottom: 30px;
                    text-align: left;
                    font-size: 15px;
                }
                .content p {
                    margin-bottom: 1em;
                    margin-top: 1em;
                    min-height: 1em;
                }
                .content br {
                    display: block;
                    margin: 0.5em 0;
                    content: "";
                }
                .content p:empty {
                    min-height: 1em;
                    margin: 1em 0;
                }
                .notification-label {
                    background-color: #E74C3C;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    display: inline-block;
                    margin-right: 15px;
                    margin-bottom: 20px;
                }
                .main-image-container {
                    position: relative;
                    width: 100%;
                    max-width: ${MAX_IMAGE_DIMENSION}px;
                    margin: 0 auto 40px auto;
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
                .read-more-button {
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: #549E9A;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                    font-family: 'General Sans Variable', Arial, sans-serif;
                    font-size: 14px;
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
                                    <div class="content">
                                        ${processedContent}
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

const sendContentEmails = async (content, recipients, senderEmail = 'ryan@sankhara.com', senderName = 'Sankhara') => {
    try {
        // Check if content has video files and extract their URLs
        const videoUrls = [];
        const videoAttachments = [];
        const videoThumbnails = {};

        // Increase maximum size for video attachments (20MB)
        const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

        if (content.content && Array.isArray(content.content)) {
            // Process videos first to generate thumbnails and prepare attachments
            for (const block of content.content) {
                if (block._type === 'video' && block.videoFile && block.videoFile.asset) {
                    const fileRef = block.videoFile.asset._ref;
                    const videoUrl = `https://cdn.sanity.io/files/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/${fileRef.replace('file-', '').replace('-mp4', '.mp4').replace('-mov', '.mov').replace('-avi', '.avi').replace('-webm', '.webm')}`;
                    videoUrls.push(videoUrl);

                    try {
                        // Try to fetch the video to check its size
                        const response = await fetch(videoUrl);
                        const contentLength = parseInt(response.headers.get('content-length') || '0');

                        // If video is small enough, attach it to the email
                        if (contentLength > 0 && contentLength <= MAX_ATTACHMENT_SIZE) {
                            const arrayBuffer = await response.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const videoExtension = fileRef.split('-').pop();
                            const mimeType = `video/${videoExtension === 'mov' ? 'quicktime' : videoExtension}`;

                            // Get a more descriptive filename from the reference if possible
                            const parts = fileRef.split('-');
                            let fileName = parts.length > 1 ? parts[1] : `video-${Date.now()}`;

                            videoAttachments.push({
                                content: buffer.toString('base64'),
                                filename: `${fileName}.${videoExtension}`,
                                type: mimeType,
                                disposition: 'attachment'
                            });

                            // Mark this video as attached
                            block.isAttached = true;
                            console.log(`Attaching video: ${fileName}.${videoExtension} (${Math.round(contentLength / 1024 / 1024 * 10) / 10}MB)`);
                        } else {
                            console.log(`Video too large to attach: ${Math.round(contentLength / 1024 / 1024 * 10) / 10}MB exceeds limit of ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`);
                        }

                        // Handle video thumbnail
                        if (block.videoThumbnail && block.videoThumbnail.asset) {
                            // Get the thumbnail image URL
                            const thumbnailUrl = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/${block.videoThumbnail.asset._ref.replace('image-', '').replace('-jpg', '.jpg').replace('-png', '.png').replace('-webp', '.webp')}`;

                            try {
                                // First try to fetch the thumbnail to ensure it exists
                                const thumbnailResponse = await fetch(thumbnailUrl);
                                if (thumbnailResponse.ok) {
                                    // Get the thumbnail metadata to determine orientation and size
                                    const thumbnailArrayBuffer = await thumbnailResponse.arrayBuffer();
                                    const metadata = await sharp(Buffer.from(thumbnailArrayBuffer)).metadata();

                                    // Determine if image is portrait or landscape and set appropriate dimension
                                    const isPortrait = metadata.height > metadata.width;
                                    const targetSize = 300; // Use consistent size for both dimensions
                                    const dimensionParam = isPortrait ? `h=${targetSize}` : `w=${targetSize}`;

                                    // Add dimension parameter to thumbnail URL
                                    const sizedThumbnailUrl = `${thumbnailUrl}?${dimensionParam}`;

                                    // Create merged image with play button overlaid on top of the sized thumbnail
                                    const mergedThumbnail = await createMergedImage(sizedThumbnailUrl, PLAY_BUTTON_URL);
                                    videoThumbnails[fileRef] = mergedThumbnail;
                                } else {
                                    console.error('Error fetching thumbnail:', thumbnailResponse.status);
                                    // Use the fallback thumbnail if we can't fetch the video thumbnail
                                    const mergedThumbnail = await createMergedImage(FALLBACK_THUMBNAIL_URL, PLAY_BUTTON_URL);
                                    videoThumbnails[fileRef] = mergedThumbnail;
                                }
                            } catch (thumbnailError) {
                                console.error('Error processing video thumbnail:', thumbnailError);
                                // If merging fails, use the original thumbnail without play button
                                videoThumbnails[fileRef] = thumbnailUrl;
                            }
                        } else {
                            // Only use fallback if no thumbnail was provided
                            const mergedThumbnail = await createMergedImage(FALLBACK_THUMBNAIL_URL, PLAY_BUTTON_URL);
                            videoThumbnails[fileRef] = mergedThumbnail;
                        }
                    } catch (error) {
                        console.error('Error processing video:', error);
                        // If we have a thumbnail, use it even if video processing failed
                        if (block.videoThumbnail && block.videoThumbnail.asset) {
                            const thumbnailUrl = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/${block.videoThumbnail.asset._ref.replace('image-', '').replace('-jpg', '.jpg').replace('-png', '.png').replace('-webp', '.webp')}`;
                            videoThumbnails[fileRef] = thumbnailUrl;
                        } else {
                            // Only use fallback as absolute last resort
                            const mergedThumbnail = await createMergedImage(FALLBACK_THUMBNAIL_URL, PLAY_BUTTON_URL);
                            videoThumbnails[fileRef] = mergedThumbnail;
                        }
                    }
                }
            }
        }

        // Create email template with video thumbnails
        const emailTemplate = await createContentEmailTemplate(content, videoThumbnails);
        const personalizations = recipients.map(recipient => ({
            to: { email: recipient.email, name: recipient.name }
        }));

        // Create email subject
        let subject = content.title;

        const msg = {
            personalizations,
            from: {
                email: senderEmail,
                name: senderName
            },
            subject: subject,
            html: emailTemplate,
            attachments: videoAttachments.length > 0 ? videoAttachments : undefined
        };

        const response = await sgMail.send(msg);
        console.log('Content emails sent successfully');
        if (videoUrls.length > 0) {
            console.log(`Email included ${videoUrls.length} video links`);
            if (videoAttachments.length > 0) {
                console.log(`${videoAttachments.length} videos were attached to the email`);
            }
        }

        return response;
    } catch (error) {
        console.error('Error sending content emails:', error);
        if (error.response) {
            console.error('SendGrid error details:', error.response.body);
        }
        throw error;
    }
};

module.exports = {
    sendEmails,
    sendContentEmails
}; 