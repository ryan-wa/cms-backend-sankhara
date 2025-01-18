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

const getRecipients = async (sanityClient) => {
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
    return {
        title: latestPost.title,
        slug: latestPost.slug,
        publishedAt: latestPost.publishedAt,
        image: latestPost.image ? buildImageUrl(latestPost.image) : null,
        video: latestPost.video ? buildVideoUrl(latestPost.video) : null,
        body: processBodyContent(latestPost.body)
    };
};

module.exports.getRecipients = getRecipients;