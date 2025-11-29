const fs = require('fs');
const path = require('path');

// Final pass - ALL remaining translations
const finalTranslations = {
    // detail.ejs JavaScript strings
    'นาที': 'minutes',
    'ไม่มีแท็ก': 'noTags',
    'ยังไม่มีข้อมูลประวัติ': 'noBioYet',
    'บทความ: ': 'articlesLabel',
    'ผู้ติดตาม: ': 'followersLabel',
    'ไม่มีหัวข้อ': 'noHeadings',
    'ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!': 'noCommentsYetBeFirst',
    'ตอบกลับ': 'reply',
    'แก้ไข': 'edit',
    'ลบ': 'delete',
    'เพิ่มความคิดเห็นเรียบร้อยแล้ว': 'commentAddedSuccessfully',
    'เกิดข้อผิดพลาดในการส่งความคิดเห็น': 'errorSubmittingComment',
    'เพิ่มในรายการถูกใจแล้ว': 'addedToLiked',
    'ยกเลิกการถูกใจแล้ว': 'unliked',
    'บันทึกบทความแล้ว': 'articleSavedToBookmarks',
    'ยกเลิกการบันทึกแล้ว': 'articleUnsaved',
    'ติดตามผู้เขียนแล้ว': 'nowFollowingAuthor',
    'ยกเลิกการติดตามแล้ว': 'unfollowedAuthor',
    'กำลังติดตาม': 'following',
    'ไม่มีบทความที่เกี่ยวข้อง': 'noRelatedArticles',
    'ไม่มีแท็กยอดนิยม': 'noPopularTags',
    'คัดลอกลิงก์เรียบร้อยแล้ว': 'linkCopiedSuccessfully',
    'เกิดข้อผิดพลาดในการโหลดบทความ': 'errorLoadingArticle',
    'ตัวอักษร': 'characters',
    'ส่งความคิดเห็น': 'submitComment',
    'โหลดความคิดเห็นเพิ่มเติม': 'loadMoreComments',
    'คัดลอก': 'copy',
    'ติดตาม': 'follow',

    // index.ejs JavaScript strings
    'เกิดข้อผิดพลาดในการโหลดข้อมูล': 'errorLoadingData',
    'เผยแพร่แล้ว': 'publishedStatus',
    'ร่าง': 'draft',
    'รอการอนุมัติ': 'pending',
    'เทคโนโลยี': 'technology',
    'ธุรกิจ': 'business',
    'การจัดการ': 'management',
    'การพัฒนา': 'development',
    'ดีไซน์': 'design',
    'การตลาด': 'marketing',
    'การเงิน': 'finance',
    'อื่นๆ': 'other',
    'บันทึกบทความเรียบร้อยแล้ว': 'articleSavedSuccessfully',
    'เกิดข้อผิดพลาดในการบันทึก': 'errorSaving',
    'คุณแน่ใจหรือไม่ที่จะลบบทความนี้?': 'confirmDeleteArticle',
    'ลบบทความเรียบร้อยแล้ว': 'articleDeletedSuccessfully',
    'เกิดข้อผิดพลาดในการลบ': 'errorDeleting',
    'เกิดข้อผิดพลาด': 'errorOccurred',
    'บันทึก': 'save',
    'หัวข้อบทความ': 'articleTitle',
    'สรุปเนื้อหา': 'summary',
    'สรุปสั้นๆ ของบทความ...': 'briefSummaryOfArticle',
    'เนื้อหาบทความ': 'articleContent',
    'แท็ก': 'tags',
    'แยกแท็กด้วยเครื่องหมายจุลภาค เช่น javascript, programming, tutorial': 'separateTagsWithCommaExample',
    'รูปปก': 'featuredImage',
    'ยกเลิก': 'cancel',
    'บันทึกบทความ': 'saveArticle',
    'บันทึกเป็นร่าง': 'saveAsDraft',
    'เผยแพร่ทันที': 'publishNow',
    'หมวดหมู่': 'category',
    'เลือกหมวดหมู่': 'selectCategory',
    ' บทความ': 'articlesText',
    'แสดง ': 'showing',
};

function convertFile(filePath) {
    console.log(`\nProcessing: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let count = 0;
    const changes = [];

    // Sort by length descending to avoid partial replacements
    const sorted = Object.entries(finalTranslations).sort((a, b) => b[0].length - a[0].length);

    sorted.forEach(([thai, key]) => {
        // Multiple replacement strategies
        const replacements = [
            // In JavaScript template literals or strings
            { find: `'${thai}'`, replace: `'<%= t('${key}') %>'` },
            { find: `"${thai}"`, replace: `"<%= t('${key}') %>"` },
            { find: `\`${thai}\``, replace: `\`<%= t('${key}') %>\`` },

            // In JavaScript string concatenation
            { find: `'${thai} '`, replace: `'<%= t('${key}') %> '` },
            { find: `' ${thai}'`, replace: `' <%= t('${key}') %>'` },

            // In HTML attributes
            { find: `>${thai}<`, replace: `><%= t('${key}') %><` },
            { find: `>${thai}</`, replace: `><%= t('${key}') %></` },
            { find: `placeholder="${thai}"`, replace: `placeholder="<%= t('${key}') %>"` },

            // After icons
            { find: `</i>${thai}`, replace: `</i><%= t('${key}') %>` },
            { find: `mr-1"></i>${thai}`, replace: `mr-1"></i><%= t('${key}') %>` },
            { find: `mr-2"></i>${thai}`, replace: `mr-2"></i><%= t('${key}') %>` },

            // In template strings
            { find: `\${thai}`, replace: `<%= t('${key}') %>` },

            // Standalone
            { find: `\n            ${thai}\n`, replace: `\n            <%= t('${key}') %>\n` },
            { find: `\n                ${thai}\n`, replace: `\n                <%= t('${key}') %>\n` },
            { find: `\n                    ${thai}\n`, replace: `\n                    <%= t('${key}') %>\n` },
        ];

        replacements.forEach(({ find, replace }) => {
            const occurrences = (content.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
            if (occurrences > 0) {
                content = content.replaceAll(find, replace);
                count += occurrences;
                changes.push(`  - "${thai}" -> t('${key}') [${occurrences}x]`);
            }
        });
    });

    if (count > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Made ${count} replacements`);
        if (changes.length > 0 && changes.length <= 20) {
            changes.forEach(c => console.log(c));
        }
    } else {
        console.log(`✗ No changes needed`);
    }
    return count;
}

// Process files
const articlesDir = path.join(__dirname, 'views', 'articles');
const files = ['detail.ejs', 'index.ejs'];

console.log('Starting FINAL PASS article files conversion...');
console.log('='.repeat(60));

let totalReplacements = 0;
files.forEach(file => {
    const filePath = path.join(articlesDir, file);
    if (fs.existsSync(filePath)) {
        totalReplacements += convertFile(filePath);
    } else {
        console.log(`File not found: ${filePath}`);
    }
});

console.log('='.repeat(60));
console.log(`\n✓ Final pass complete! Total replacements: ${totalReplacements}`);
