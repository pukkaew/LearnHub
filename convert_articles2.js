const fs = require('fs');
const path = require('path');

// Additional translations not caught in first pass
const additionalTranslations = {
    // detail.ejs specific
    'ถูกใจ': 'like',
    'แชร์': 'share',
    'บันทึก': 'save',
    'เกี่ยวกับผู้เขียน': 'aboutAuthor',
    'บทความ: ': 'articlesLabel',
    'ผู้ติดตาม: ': 'followersLabel',
    'ติดตาม': 'follow',
    'เรียงตาม: ใหม่ที่สุด': 'sortByNewest',
    'แสดงความคิดเห็น...': 'addCommentPlaceholder',
    'ตัวอักษร': 'characters',
    'ส่งความคิดเห็น': 'submitComment',
    'โหลดความคิดเห็นเพิ่มเติม': 'loadMoreComments',
    'สารบัญ': 'tableOfContents',
    'บทความที่เกี่ยวข้อง': 'relatedArticles',
    'แท็กยอดนิยม': 'popularTags',
    'แชร์บทความ': 'shareArticle',
    'แชร์ไปยัง Facebook': 'shareToFacebook',
    'แชร์ไปยัง Twitter': 'shareToTwitter',
    'แชร์ไปยัง LINE': 'shareToLine',
    'คัดลอก': 'copy',
    'ไม่พบบทความที่ต้องการ': 'articleNotFound',

    // index.ejs specific
    'ศูนย์รวมความรู้และประสบการณ์จากผู้เชี่ยวชาญ': 'knowledgeSharingHubDesc',
    'เขียนบทความใหม่': 'writeNewArticle',
    'บทความทั้งหมด': 'allArticles',
    'การดูทั้งหมด': 'totalViews',
    'ยอดไลค์ทั้งหมด': 'totalLikes',
    'ค้นหาบทความ...': 'searchArticlesPlaceholder',
    'หมวดหมู่ทั้งหมด': 'allCategories',
    'ล่าสุด': 'latest',
    'ยอดนิยม': 'popular',
    'ดูมากที่สุด': 'mostViewed',
    'ไลค์มากที่สุด': 'mostLiked',
    'เก่าที่สุด': 'oldest',
    'สถานะทั้งหมด': 'allStatuses',
    'เผยแพร่แล้ว': 'publishedStatus',
    'มุมมอง Grid': 'gridView',
    'มุมมอง List': 'listView',
    'แสดง ': 'showing',
    ' บทความ': 'articlesText',
};

function replaceInFile(filePath, translations) {
    console.log(`\nProcessing: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let count = 0;
    const changes = [];

    // Sort by length descending
    const sorted = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);

    sorted.forEach(([thai, key]) => {
        const before = content;

        // Try multiple patterns
        const patterns = [
            // In HTML text content
            { from: `>${thai}<`, to: `><%= t('${key}') %><` },
            // In span/button text
            { from: `>${thai}</`, to: `><%= t('${key}') %></` },
            // In placeholders
            { from: `placeholder="${thai}"`, to: `placeholder="<%= t('${key}') %>"` },
            // In JavaScript strings (single quotes)
            { from: `'${thai}'`, to: `'<%= t('${key}') %>'` },
            // After icons
            { from: `</i>${thai}`, to: `</i><%= t('${key}') %>` },
            // Before icons (for some buttons)
            { from: `${thai} <i `, to: `<%= t('${key}') %> <i ` },
            // Standalone in HTML (with whitespace)
            { from: `\n                ${thai}\n`, to: `\n                <%= t('${key}') %>\n` },
            // In h3 tags
            { from: `<h3 class="text-lg font-bold text-gray-900 mb-4">${thai}</h3>`, to: `<h3 class="text-lg font-bold text-gray-900 mb-4"><%= t('${key}') %></h3>` },
            { from: `<h3 class="text-sm font-medium text-gray-500">${thai}</h3>`, to: `<h3 class="text-sm font-medium text-gray-500"><%= t('${key}') %></h3>` },
            { from: `<h3 class="text-xl font-bold text-gray-900">${thai}</h3>`, to: `<h3 class="text-xl font-bold text-gray-900"><%= t('${key}') %></h3>` },
        ];

        patterns.forEach(({ from, to }) => {
            if (content.includes(from)) {
                const matches = content.split(from).length - 1;
                content = content.replaceAll(from, to);
                if (matches > 0) {
                    count += matches;
                    changes.push(`  - "${thai}" -> t('${key}') [${matches}x]`);
                }
            }
        });
    });

    if (count > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Made ${count} replacements:`);
        changes.forEach(c => console.log(c));
    } else {
        console.log(`✗ No changes needed`);
    }
    return count;
}

// Process files
const articlesDir = path.join(__dirname, 'views', 'articles');
const files = ['edit.ejs', 'detail.ejs', 'index.ejs'];

console.log('Starting SECOND PASS article files conversion...');
console.log('='.repeat(60));

let totalReplacements = 0;
files.forEach(file => {
    const filePath = path.join(articlesDir, file);
    if (fs.existsSync(filePath)) {
        totalReplacements += replaceInFile(filePath, additionalTranslations);
    } else {
        console.log(`File not found: ${filePath}`);
    }
});

console.log('='.repeat(60));
console.log(`\n✓ Second pass complete! Total replacements: ${totalReplacements}`);
console.log('\nRemaining Thai strings will need manual conversion');
