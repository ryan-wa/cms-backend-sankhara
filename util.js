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

module.exports.formatResponse = (latestPost) => {
    return {
        title: latestPost.title,
        slug: latestPost.slug,
        publishedAt: latestPost.publishedAt,
        image: buildImageUrl(latestPost.image),
        video: buildVideoUrl(latestPost.video),
        body: latestPost.body[0].children[0].text
    };
};

module.exports.getRecipients = getRecipients;