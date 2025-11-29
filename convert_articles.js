const fs = require('fs');
const path = require('path');

// Article translation mappings
const translations = {
    // Common
    'แก้ไขบทความ': 'editArticle',
    'ปรับปรุงเนื้อหาบทความของคุณ': 'updateArticleContent',
    'กลับไปหน้าบทความ': 'backToArticles',
    'แก้ไขเนื้อหา': 'editContent',
    'อัปเดตข้อมูลบทความของคุณ': 'updateArticleData',
    'ดูตัวอย่าง': 'preview',
    'บันทึก': 'save',
    'หัวข้อบทความ': 'articleTitle',
    'สรุปเนื้อหา': 'summary',
    'สรุปสั้นๆ ของบทความ...': 'briefSummaryArticle',
    'เนื้อหาบทความ': 'articleContent',
    'แท็ก': 'tags',
    'แยกแท็กด้วยเครื่องหมายจุลภาค เช่น javascript, programming, tutorial': 'separateTagsWithCommaExample',
    'แยกแท็กด้วยเครื่องหมายจุลภาค': 'separateTagsWithComma',
    'การเผยแพร่': 'publication',
    'สถานะ': 'status',
    'ร่าง': 'draft',
    'เผยแพร่': 'published',
    'รอการอนุมัติ': 'pending',
    'หมวดหมู่': 'category',
    'เลือกหมวดหมู่': 'selectCategory',
    'เทคโนโลยี': 'technology',
    'ธุรกิจ': 'business',
    'การจัดการ': 'management',
    'การพัฒนา': 'development',
    'ดีไซน์': 'design',
    'การตลาด': 'marketing',
    'การเงิน': 'finance',
    'อื่นๆ': 'other',
    'วันที่เผยแพร่': 'publishDate',
    'รูปปก': 'featuredImage',
    'ลบรูปภาพ': 'removeImage',
    'อัปโหลดรูปใหม่': 'uploadNewImage',
    'รองรับ JPG, PNG, GIF (สูงสุด 5MB)': 'imageFormatSupport',
    'การตั้งค่า SEO': 'seoSettings',
    'คำอธิบายสำหรับ SEO': 'metaDescription',
    'คำอธิบายสำหรับเครื่องมือค้นหา...': 'descriptionForSearchEngines',
    'ตัวอักษร': 'characters',
    'จะใช้เป็น URL ของบทความ': 'willBeUsedAsURL',
    'สถิติ': 'stats',
    'การดู': 'views',
    'ไลค์': 'likes',
    'ความคิดเห็น': 'comments',
    'แก้ไขล่าสุด': 'lastModified',
    'ลบบทความ': 'deleteArticle',
    'ยกเลิก': 'cancel',
    'บันทึกการแก้ไข': 'saveChanges',
    'ดูตัวอย่างบทความ': 'previewArticle',
    'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ': 'errorUploadingImage',
    'คุณแน่ใจหรือไม่ที่จะยกเลิก? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป': 'confirmCancelUnsaved',
    'ไม่พบบทความที่ต้องการแก้ไข': 'articleNotFoundEdit',
    'เกิดข้อผิดพลาดในการโหลดข้อมูล': 'errorLoadingData',
    'บันทึกการแก้ไขเรียบร้อยแล้ว': 'changesSavedSuccessfully',
    'เกิดข้อผิดพลาดในการบันทึก': 'errorSaving',
    'คุณแน่ใจหรือไม่ที่จะลบบทความนี้? การกระทำนี้ไม่สามารถยกเลิกได้': 'confirmDeleteArticleIrreversible',
    'ลบบทความเรียบร้อยแล้ว': 'articleDeletedSuccessfully',
    'เกิดข้อผิดพลาดในการลบ': 'errorDeleting',
    'บันทึกอัตโนมัติ': 'autoSaved',
    'นาที': 'minutes',
    'เกิดข้อผิดพลาด': 'errorOccurred',
};

function replaceInFile(filePath) {
    console.log(`Processing: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let count = 0;

    //  Sort by length descending to avoid partial replacements
    const sorted = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);

    sorted.forEach(([thai, key]) => {
        const patterns = [
            { regex: new RegExp(`>${thai.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`, 'g'), replacement: `><%= t('${key}') %><` },
            { regex: new RegExp(`"${thai.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), replacement: `"<%= t('${key}') %>"` },
            { regex: new RegExp(`'${thai.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'), replacement: `'<%= t('${key}') %>'` },
            { regex: new RegExp(`</i>${thai.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), replacement: `</i><%= t('${key}') %>` },
            { regex: new RegExp(`placeholder="${thai.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), replacement: `placeholder="<%= t('${key}') %>"` },
        ];

        patterns.forEach(({ regex, replacement }) => {
            const matches = content.match(regex);
            if (matches) {
                content = content.replace(regex, replacement);
                count += matches.length;
            }
        });
    });

    if (count > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Made ${count} replacements`);
    } else {
        console.log(`✗ No changes needed`);
    }
}

// Process all article files
const articlesDir = path.join(__dirname, 'views', 'articles');
const files = ['edit.ejs', 'detail.ejs', 'index.ejs'];

console.log('Starting article files conversion...\n');
files.forEach(file => {
    const filePath = path.join(articlesDir, file);
    if (fs.existsSync(filePath)) {
        replaceInFile(filePath);
    } else {
        console.log(`File not found: ${filePath}`);
    }
});

console.log('\n✓ Conversion complete!');
console.log('\nNow add these translations to utils/languages.js');
