const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/content.ejs';
let content = fs.readFileSync(filePath, 'utf8');

const oldVideoCase = `case 'video':
            viewer.innerHTML = \`
                <div class="video-container rounded-xl overflow-hidden">
                    <video id="video-player" class="w-full" controls playsinline
                           poster="\${material.thumbnail || ''}"
                           data-material-id="\${material.material_id}">
                        <source src="\${material.file_url || material.video_url || ''}" type="video/mp4">
                        <%= t('browserNotSupportVideo') %>
                    </video>
                </div>
                <div class="mt-6">
                    <h2 class="text-xl font-semibold text-gray-900 mb-3">\${material.title}</h2>
                    <div class="prose max-w-none text-gray-600">
                        \${material.description || '<%= t("noDescription") %>'}
                    </div>
                </div>
            \`;
            setupVideoPlayer();
            break;`;

const newVideoCase = `case 'video':
            // Check if it's a YouTube video
            if (material.is_youtube && material.youtube_embed_url) {
                viewer.innerHTML = \`
                    <div class="video-container rounded-xl overflow-hidden" style="position: relative; padding-bottom: 56.25%; height: 0;">
                        <iframe id="youtube-player"
                                src="\${material.youtube_embed_url}?rel=0&enablejsapi=1"
                                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen>
                        </iframe>
                    </div>
                    <div class="mt-6">
                        <h2 class="text-xl font-semibold text-gray-900 mb-3">\${material.title}</h2>
                        <div class="prose max-w-none text-gray-600">
                            \${material.description || '<%= t("noDescription") %>'}
                        </div>
                    </div>
                \`;
                setupYoutubePlayer();
            } else {
                // Regular video file
                viewer.innerHTML = \`
                    <div class="video-container rounded-xl overflow-hidden">
                        <video id="video-player" class="w-full" controls playsinline
                               poster="\${material.thumbnail || ''}"
                               data-material-id="\${material.material_id}">
                            <source src="\${material.file_url || material.video_url || ''}" type="video/mp4">
                            <%= t('browserNotSupportVideo') %>
                        </video>
                    </div>
                    <div class="mt-6">
                        <h2 class="text-xl font-semibold text-gray-900 mb-3">\${material.title}</h2>
                        <div class="prose max-w-none text-gray-600">
                            \${material.description || '<%= t("noDescription") %>'}
                        </div>
                    </div>
                \`;
                setupVideoPlayer();
            }
            break;`;

if (content.includes(oldVideoCase)) {
    content = content.replace(oldVideoCase, newVideoCase);
    console.log('✅ Updated video case to support YouTube');
} else {
    console.log('❌ Old video case not found');
}

// Add YouTube player setup function after setupVideoPlayer function
const setupVideoPlayerEnd = `// Video Player Setup
function setupVideoPlayer() {
    const video = document.getElementById('video-player');
    if (!video) return;

    video.playbackRate = playbackSpeed;

    video.addEventListener('ended', () => {
        markAsComplete();
        if (autoplayEnabled && currentIndex < materials.length - 1) {
            setTimeout(() => navigateNext(), 1500);
        }
    });

    video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        if (progress > 80 && !currentMaterial.is_completed) {
            markAsComplete();
        }
    });
}`;

const setupYoutubePlayerFunc = `// Video Player Setup
function setupVideoPlayer() {
    const video = document.getElementById('video-player');
    if (!video) return;

    video.playbackRate = playbackSpeed;

    video.addEventListener('ended', () => {
        markAsComplete();
        if (autoplayEnabled && currentIndex < materials.length - 1) {
            setTimeout(() => navigateNext(), 1500);
        }
    });

    video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        if (progress > 80 && !currentMaterial.is_completed) {
            markAsComplete();
        }
    });
}

// YouTube Player Setup
function setupYoutubePlayer() {
    // For YouTube, we'll mark complete after a timeout since we can't track progress as easily
    // You can enhance this with YouTube IFrame API for better tracking
    setTimeout(() => {
        if (!currentMaterial.is_completed) {
            console.log('YouTube video viewed - ready to mark complete');
        }
    }, 30000); // After 30 seconds of viewing
}`;

if (content.includes(setupVideoPlayerEnd) && !content.includes('setupYoutubePlayer')) {
    content = content.replace(setupVideoPlayerEnd, setupYoutubePlayerFunc);
    console.log('✅ Added setupYoutubePlayer function');
} else if (content.includes('setupYoutubePlayer')) {
    console.log('✅ setupYoutubePlayer already exists');
} else {
    console.log('⚠️ Could not find setupVideoPlayer to add YouTube player');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File saved');
