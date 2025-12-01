const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/content.ejs';
let content = fs.readFileSync(filePath, 'utf8');

const oldYoutubeCode = `if (material.is_youtube && material.youtube_embed_url) {
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
            }`;

const newYoutubeCode = `if (material.is_youtube && material.youtube_embed_url) {
                viewer.innerHTML = \`
                    <div class="video-container rounded-xl overflow-hidden bg-black" style="position: relative; padding-bottom: 56.25%; height: 0;">
                        <iframe id="youtube-player"
                                src="\${material.youtube_embed_url}?rel=0&modestbranding=1"
                                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerpolicy="strict-origin-when-cross-origin"
                                allowfullscreen>
                        </iframe>
                    </div>
                    <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center text-gray-600">
                                <i class="fab fa-youtube text-red-600 text-xl mr-2"></i>
                                <span><%= t('youtubeVideo') || 'วิดีโอ YouTube' %></span>
                            </div>
                            <a href="\${material.file_url}" target="_blank"
                               class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                                <i class="fab fa-youtube mr-2"></i>
                                <%= t('watchOnYoutube') || 'ดูบน YouTube' %>
                            </a>
                        </div>
                    </div>
                    <div class="mt-6">
                        <h2 class="text-xl font-semibold text-gray-900 mb-3">\${material.title}</h2>
                        <div class="prose max-w-none text-gray-600">
                            \${material.description || '<%= t("noDescription") %>'}
                        </div>
                    </div>
                \`;
                setupYoutubePlayer();
            }`;

if (content.includes(oldYoutubeCode)) {
    content = content.replace(oldYoutubeCode, newYoutubeCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated YouTube embed code with fallback link');
} else {
    console.log('❌ Old YouTube code not found');
    // Try to find and show what we have
    if (content.includes('is_youtube && material.youtube_embed_url')) {
        console.log('Found youtube code but pattern differs');
    }
}
