const QRCode = require('qrcode');
const { getS3Client } = require('./aws');
const { googleOAuthClient } = require('./gcloud');
const { google } = require('googleapis');

const buildImageUrl = (imageRef) => {
    const imgInfoSplit = imageRef.asset._ref.split('-');
    const imgInfo = imgInfoSplit[1] + '-' + imgInfoSplit[2] + '.' + imgInfoSplit[3];
    return `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/${imgInfo}`;
};

const buildVideoUrl = (videoRef) => {
    const videoInfoSplit = videoRef.asset._ref.split('-');
    const videoInfo = videoInfoSplit[1] + '.' + videoInfoSplit[2];
    return `https://cdn.sanity.io/files/${process.env.SANITY_PROJECT_ID}/${process.env.SANITY_DATASET}/${videoInfo}`;
};

module.exports.getRecipients = async (sanityClient) => {
    const query = `*[_type == "recipient"]{
        email,
        name,
        _id
    }`;

    try {
        const recipients = await sanityClient.fetch(query);
        return recipients;
    } catch (error) {
        console.error('Error fetching recipients:', error);
        throw error;
    }
};

module.exports.getTestRecipients = async (sanityClient) => {
    const query = `*[_type == "testRecipient"]{
        email,
        name,
        _id
    }`;
    const recipients = await sanityClient.fetch(query);
    return recipients;
};

const processBodyContent = (blocks) => {
    let htmlContent = '';
    let isInList = false;
    let currentListType = null;
    let currentLevel = 0;

    const getListStyleForLevel = (level, listType) => {
        if (listType === 'bullet') {
            switch (level) {
                case 1: return 'disc';
                case 2: return 'circle';
                case 3: return 'square';
                default: return 'disc';
            }
        } else if (listType === 'number') {
            switch (level) {
                case 1: return 'decimal';
                case 2: return 'lower-alpha';
                case 3: return 'lower-roman';
                default: return 'decimal';
            }
        }
    };

    const processMarks = (text, marks, markDefs) => {
        let processedText = text;

        if (marks) {
            if (marks.includes('strong')) {
                processedText = `<strong>${processedText}</strong>`;
            }
            if (marks.includes('em')) {
                processedText = `<em>${processedText}</em>`;
            }
            if (marks.includes('strike-through')) {
                processedText = `<del>${processedText}</del>`;
            }

            // Handle links
            const linkMark = markDefs?.find(def => marks.includes(def._key));
            if (linkMark) {
                processedText = `<a href="${linkMark.href}" style="color: #007BFF; text-decoration: none; border-bottom: 1px solid #007BFF; padding-bottom: 1px;">${processedText}</a>`;
            }
        }

        return processedText;
    };

    blocks.forEach(block => {
        const { style, listItem, children, level = 1, markDefs = [] } = block;

        // Handle list transitions
        if (listItem) {
            if (!isInList || currentListType !== listItem || currentLevel !== level) {
                if (isInList) {
                    // Close previous list if type or level changed
                    htmlContent += '</ul>';
                }
                const listStyle = getListStyleForLevel(level, listItem);
                htmlContent += `<ul style="list-style-type: ${listStyle}; margin-left: ${20 * level}px;">`;
                isInList = true;
                currentListType = listItem;
                currentLevel = level;
            }
        } else if (isInList) {
            htmlContent += '</ul>';
            isInList = false;
            currentListType = null;
            currentLevel = 0;
        }

        // Process the text content with styling
        const textContent = children.map(child => {
            return processMarks(child.text || '', child.marks, markDefs);
        }).join('');

        // Wrap the content based on block type
        if (listItem) {
            htmlContent += `<li style="margin-bottom: 10px;">${textContent}</li>`;
        } else {
            switch (style) {
                case 'h1':
                    htmlContent += `<h1 style="font-size: 2em; margin-bottom: 0.5em;">${textContent}</h1>`;
                    break;
                case 'h2':
                    htmlContent += `<h2 style="font-size: 1.8em; margin-bottom: 0.5em;">${textContent}</h2>`;
                    break;
                case 'h3':
                    htmlContent += `<h3 style="font-size: 1.6em; margin-bottom: 0.5em;">${textContent}</h3>`;
                    break;
                case 'h4':
                    htmlContent += `<h4 style="font-size: 1.4em; margin-bottom: 0.5em;">${textContent}</h4>`;
                    break;
                case 'h5':
                    htmlContent += `<h5 style="font-size: 1.2em; margin-bottom: 0.5em;">${textContent}</h5>`;
                    break;
                case 'h6':
                    htmlContent += `<h6 style="font-size: 1.1em; margin-bottom: 0.5em;">${textContent}</h6>`;
                    break;
                case 'blockquote':
                    htmlContent += `<blockquote style="margin: 1em 0; padding-left: 1em; border-left: 4px solid #ccc; color: #666;">${textContent}</blockquote>`;
                    break;
                default:
                    htmlContent += `<p style="margin-bottom: 15px;">${textContent}</p>`;
            }
        }
    });

    // Close any remaining list
    if (isInList) {
        htmlContent += '</ul>';
    }

    return htmlContent;
};

module.exports.formatResponse = (latestPost) => {
    // Create array of grid images from individual fields
    const gridImages = [];
    for (let i = 1; i <= 6; i++) {
        const imageField = `gridImage${i}`;
        if (latestPost[imageField]) {
            gridImages.push(buildImageUrl(latestPost[imageField]));
        }
    }

    return {
        title: latestPost.title,
        slug: latestPost.slug,
        publishedAt: latestPost.publishedAt,
        mainImage: latestPost.mainImage ? buildImageUrl(latestPost.mainImage) : null,
        video: latestPost.video ? buildVideoUrl(latestPost.video) : null,
        body: processBodyContent(latestPost.body),
        gridImages: gridImages
    };
};

const storeQRCode = async (error, url, assetName) => {
    const s3 = getS3Client();
    const base64QRData = url.replace(/^data:image\/\w+;base64,/, "");
    const contentType = url.split(';')[0].split(':')[1];
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${assetName.replaceAll(' ', '-').replaceAll('.', '').replaceAll('/', '-').replaceAll(`'`, '').replaceAll(`"`, '').replaceAll(`\\`, '-')}/${Date.now()}`,
        Body: Buffer.from(base64QRData, 'base64'),
        ContentType: contentType
    };

    s3.putObject(params, (err, data) => {
        if (err) {
            console.error(err);
            throw err;
        } else {
            console.log(`QR Code data stored: ${JSON.stringify(data)}`);
            return data;
        }
    });

    if (error) {
        console.error(error);
        throw error;
    }
    return true;
};

module.exports.generateQRCode = async (url, assetName, options = { lightColor: '#FFFFFF', darkColor: '#000000', width: 500, height: 500 }) => {
    try {
        const result = await QRCode.toDataURL(
            url,
            {
                width: options.width,
                height: options.height,
                color: {
                    dark: options.darkColor,
                    light: options.lightColor
                },
                margin: 2,
            },
            (error, url) => {
                if (error) {
                    console.error(error);
                    throw error;
                }
                storeQRCode(null, url, assetName);
            }
        );
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

module.exports.generateAllQRCodes = async (folders) => {
    console.log(`Generating ${folders.length} QR codes`);
    let i = 1;
    for (const folder of folders) {
        const qrCode = await this.generateQRCode(folder.link, folder.name);
        console.log(`${i} of ${folders.length} QR codes generated`);
        i++;
    }
    console.log(`Generated ${i} QR codes`);
};

module.exports.getGDriveFolders = async (tokenCode) => {
    let folders = [];
    const { tokens } = await googleOAuthClient.getToken(tokenCode);
    googleOAuthClient.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: googleOAuthClient });
    try {
        const parentFolderId = '1vrI3P6KKFGjti6nb2FpTaguYYY5-ie1y'; // Replace with your folder ID.
        const response = await drive.files.list({
            q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id, name, webViewLink)',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
        });
        response.data.files.forEach(folder => {
            folders.push({ name: folder.name, id: folder.id, link: folder.webViewLink });
        });
        return folders;
    } catch (error) {
        console.error('Error listing subfolders:', error);
        throw error;
    }
};