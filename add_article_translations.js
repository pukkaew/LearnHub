const fs = require('fs');
const path = require('path');

const langFilePath = path.join(__dirname, 'utils', 'languages.js');
let content = fs.readFileSync(langFilePath, 'utf8');

// Article translations - Thai
const thaiArticleTranslations = `
        // ===== Article Views Translations =====
        // Article Edit
        editArticle: 'แก้ไขบทความ',
        updateArticleContent: 'ปรับปรุงเนื้อหาบทความของคุณ',
        backToArticles: 'กลับไปหน้าบทความ',
        editContent: 'แก้ไขเนื้อหา',
        updateArticleData: 'อัปเดตข้อมูลบทความของคุณ',
        preview: 'ดูตัวอย่าง',
        save: 'บันทึก',
        articleTitle: 'หัวข้อบทความ',
        briefSummaryArticle: 'สรุปสั้นๆ ของบทความ...',
        articleContent: 'เนื้อหาบทความ',
        tags: 'แท็ก',
        separateTagsWithCommaExample: 'แยกแท็กด้วยเครื่องหมายจุลภาค เช่น javascript, programming, tutorial',
        separateTagsWithComma: 'แยกแท็กด้วยเครื่องหมายจุลภาค',
        publication: 'การเผยแพร่',
        status: 'สถานะ',
        draft: 'ร่าง',
        published: 'เผยแพร่',
        pending: 'รอการอนุมัติ',
        category: 'หมวดหมู่',
        selectCategory: 'เลือกหมวดหมู่',
        technology: 'เทคโนโลยี',
        business: 'ธุรกิจ',
        management: 'การจัดการ',
        development: 'การพัฒนา',
        design: 'ดีไซน์',
        marketing: 'การตลาด',
        finance: 'การเงิน',
        other: 'อื่นๆ',
        publishDate: 'วันที่เผยแพร่',
        featuredImage: 'รูปปก',
        removeImage: 'ลบรูปภาพ',
        uploadNewImage: 'อัปโหลดรูปใหม่',
        imageFormatSupport: 'รองรับ JPG, PNG, GIF (สูงสุด 5MB)',
        seoSettings: 'การตั้งค่า SEO',
        metaDescription: 'คำอธิบายสำหรับ SEO',
        descriptionForSearchEngines: 'คำอธิบายสำหรับเครื่องมือค้นหา...',
        characters: 'ตัวอักษร',
        willBeUsedAsURL: 'จะใช้เป็น URL ของบทความ',
        stats: 'สถิติ',
        views: 'การดู',
        likes: 'ไลค์',
        comments: 'ความคิดเห็น',
        lastModified: 'แก้ไขล่าสุด',
        deleteArticle: 'ลบบทความ',
        cancel: 'ยกเลิก',
        saveChanges: 'บันทึกการแก้ไข',
        previewArticle: 'ดูตัวอย่างบทความ',
        errorUploadingImage: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
        confirmCancelUnsaved: 'คุณแน่ใจหรือไม่ที่จะยกเลิก? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป',
        articleNotFoundEdit: 'ไม่พบบทความที่ต้องการแก้ไข',
        errorLoadingData: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        changesSavedSuccessfully: 'บันทึกการแก้ไขเรียบร้อยแล้ว',
        errorSaving: 'เกิดข้อผิดพลาดในการบันทึก',
        confirmDeleteArticleIrreversible: 'คุณแน่ใจหรือไม่ที่จะลบบทความนี้? การกระทำนี้ไม่สามารถยกเลิกได้',
        articleDeletedSuccessfully: 'ลบบทความเรียบร้อยแล้ว',
        errorDeleting: 'เกิดข้อผิดพลาดในการลบ',
        autoSaved: 'บันทึกอัตโนมัติ',
        minutes: 'นาที',
        errorOccurred: 'เกิดข้อผิดพลาด',

        // Article Detail
        articleNotFound: 'ไม่พบบทความที่ต้องการ',
        errorLoadingArticle: 'เกิดข้อผิดพลาดในการโหลดบทความ',
        publishedStatus: 'เผยแพร่แล้ว',
        like: 'ถูกใจ',
        share: 'แชร์',
        saveArticle: 'บันทึกบทความ',
        aboutAuthor: 'เกี่ยวกับผู้เขียน',
        articlesLabel: 'บทความ: ',
        followersLabel: 'ผู้ติดตาม: ',
        follow: 'ติดตาม',
        sortByNewest: 'เรียงตาม: ใหม่ที่สุด',
        addCommentPlaceholder: 'แสดงความคิดเห็น...',
        submitComment: 'ส่งความคิดเห็น',
        loadMoreComments: 'โหลดความคิดเห็นเพิ่มเติม',
        tableOfContents: 'สารบัญ',
        noHeadings: 'ไม่มีหัวข้อ',
        relatedArticles: 'บทความที่เกี่ยวข้อง',
        noRelatedArticles: 'ไม่มีบทความที่เกี่ยวข้อง',
        popularTags: 'แท็กยอดนิยม',
        noPopularTags: 'ไม่มีแท็กยอดนิยม',
        shareArticle: 'แชร์บทความ',
        shareToFacebook: 'แชร์ไปยัง Facebook',
        shareToTwitter: 'แชร์ไปยัง Twitter',
        shareToLine: 'แชร์ไปยัง LINE',
        copy: 'คัดลอก',
        linkCopiedSuccessfully: 'คัดลอกลิงก์เรียบร้อยแล้ว',
        noCommentsYetBeFirst: 'ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!',
        reply: 'ตอบกลับ',
        edit: 'แก้ไข',
        delete: 'ลบ',
        commentAddedSuccessfully: 'เพิ่มความคิดเห็นเรียบร้อยแล้ว',
        errorSubmittingComment: 'เกิดข้อผิดพลาดในการส่งความคิดเห็น',
        addedToLiked: 'เพิ่มในรายการถูกใจแล้ว',
        unliked: 'ยกเลิกการถูกใจแล้ว',
        articleSavedToBookmarks: 'บันทึกบทความแล้ว',
        articleUnsaved: 'ยกเลิกการบันทึกแล้ว',
        nowFollowingAuthor: 'ติดตามผู้เขียนแล้ว',
        unfollowedAuthor: 'ยกเลิกการติดตามแล้ว',
        following: 'กำลังติดตาม',
        noTags: 'ไม่มีแท็ก',
        noBioYet: 'ยังไม่มีข้อมูลประวัติ',

        // Article Index
        knowledgeSharingHubDesc: 'ศูนย์รวมความรู้และประสบการณ์จากผู้เชี่ยวชาญ',
        writeNewArticle: 'เขียนบทความใหม่',
        allArticles: 'บทความทั้งหมด',
        totalViews: 'การดูทั้งหมด',
        totalLikes: 'ยอดไลค์ทั้งหมด',
        searchArticlesPlaceholder: 'ค้นหาบทความ...',
        allCategories: 'หมวดหมู่ทั้งหมด',
        latest: 'ล่าสุด',
        popular: 'ยอดนิยม',
        mostViewed: 'ดูมากที่สุด',
        mostLiked: 'ไลค์มากที่สุด',
        oldest: 'เก่าที่สุด',
        allStatuses: 'สถานะทั้งหมด',
        gridView: 'มุมมอง Grid',
        listView: 'มุมมอง List',
        showing: 'แสดง ',
        articlesText: ' บทความ',
        articleSavedSuccessfully: 'บันทึกบทความเรียบร้อยแล้ว',
        confirmDeleteArticle: 'คุณแน่ใจหรือไม่ที่จะลบบทความนี้?',
        saveAsDraft: 'บันทึกเป็นร่าง',
        publishNow: 'เผยแพร่ทันที',

        // Article Create
        thaiLanguage: 'ไทย (Thai)',
`;

// Article translations - English
const englishArticleTranslations = `
        // ===== Article Views Translations =====
        // Article Edit
        editArticle: 'Edit Article',
        updateArticleContent: 'Update your article content',
        backToArticles: 'Back to Articles',
        editContent: 'Edit Content',
        updateArticleData: 'Update your article data',
        preview: 'Preview',
        save: 'Save',
        articleTitle: 'Article Title',
        briefSummaryArticle: 'Brief summary of the article...',
        articleContent: 'Article Content',
        tags: 'Tags',
        separateTagsWithCommaExample: 'Separate tags with commas, e.g., javascript, programming, tutorial',
        separateTagsWithComma: 'Separate tags with commas',
        publication: 'Publication',
        status: 'Status',
        draft: 'Draft',
        published: 'Published',
        pending: 'Pending Approval',
        category: 'Category',
        selectCategory: 'Select Category',
        technology: 'Technology',
        business: 'Business',
        management: 'Management',
        development: 'Development',
        design: 'Design',
        marketing: 'Marketing',
        finance: 'Finance',
        other: 'Other',
        publishDate: 'Publish Date',
        featuredImage: 'Featured Image',
        removeImage: 'Remove Image',
        uploadNewImage: 'Upload New Image',
        imageFormatSupport: 'Supports JPG, PNG, GIF (max 5MB)',
        seoSettings: 'SEO Settings',
        metaDescription: 'Meta Description',
        descriptionForSearchEngines: 'Description for search engines...',
        characters: 'characters',
        willBeUsedAsURL: 'Will be used as article URL',
        stats: 'Statistics',
        views: 'Views',
        likes: 'Likes',
        comments: 'Comments',
        lastModified: 'Last Modified',
        deleteArticle: 'Delete Article',
        cancel: 'Cancel',
        saveChanges: 'Save Changes',
        previewArticle: 'Preview Article',
        errorUploadingImage: 'Error uploading image',
        confirmCancelUnsaved: 'Are you sure you want to cancel? Unsaved changes will be lost',
        articleNotFoundEdit: 'Article not found for editing',
        errorLoadingData: 'Error loading data',
        changesSavedSuccessfully: 'Changes saved successfully',
        errorSaving: 'Error saving',
        confirmDeleteArticleIrreversible: 'Are you sure you want to delete this article? This action cannot be undone',
        articleDeletedSuccessfully: 'Article deleted successfully',
        errorDeleting: 'Error deleting',
        autoSaved: 'Auto-saved',
        minutes: 'minutes',
        errorOccurred: 'An error occurred',

        // Article Detail
        articleNotFound: 'Article not found',
        errorLoadingArticle: 'Error loading article',
        publishedStatus: 'Published',
        like: 'Like',
        share: 'Share',
        saveArticle: 'Save Article',
        aboutAuthor: 'About the Author',
        articlesLabel: 'Articles: ',
        followersLabel: 'Followers: ',
        follow: 'Follow',
        sortByNewest: 'Sort by: Newest',
        addCommentPlaceholder: 'Leave a comment...',
        submitComment: 'Submit Comment',
        loadMoreComments: 'Load More Comments',
        tableOfContents: 'Table of Contents',
        noHeadings: 'No headings',
        relatedArticles: 'Related Articles',
        noRelatedArticles: 'No related articles',
        popularTags: 'Popular Tags',
        noPopularTags: 'No popular tags',
        shareArticle: 'Share Article',
        shareToFacebook: 'Share to Facebook',
        shareToTwitter: 'Share to Twitter',
        shareToLine: 'Share to LINE',
        copy: 'Copy',
        linkCopiedSuccessfully: 'Link copied successfully',
        noCommentsYetBeFirst: 'No comments yet. Be the first to comment!',
        reply: 'Reply',
        edit: 'Edit',
        delete: 'Delete',
        commentAddedSuccessfully: 'Comment added successfully',
        errorSubmittingComment: 'Error submitting comment',
        addedToLiked: 'Added to liked',
        unliked: 'Unliked',
        articleSavedToBookmarks: 'Article saved to bookmarks',
        articleUnsaved: 'Article unsaved',
        nowFollowingAuthor: 'Now following author',
        unfollowedAuthor: 'Unfollowed author',
        following: 'Following',
        noTags: 'No tags',
        noBioYet: 'No bio available yet',

        // Article Index
        knowledgeSharingHubDesc: 'Knowledge and experience sharing hub from experts',
        writeNewArticle: 'Write New Article',
        allArticles: 'All Articles',
        totalViews: 'Total Views',
        totalLikes: 'Total Likes',
        searchArticlesPlaceholder: 'Search articles...',
        allCategories: 'All Categories',
        latest: 'Latest',
        popular: 'Popular',
        mostViewed: 'Most Viewed',
        mostLiked: 'Most Liked',
        oldest: 'Oldest',
        allStatuses: 'All Statuses',
        gridView: 'Grid View',
        listView: 'List View',
        showing: 'Showing ',
        articlesText: ' articles',
        articleSavedSuccessfully: 'Article saved successfully',
        confirmDeleteArticle: 'Are you sure you want to delete this article?',
        saveAsDraft: 'Save as Draft',
        publishNow: 'Publish Now',

        // Article Create
        thaiLanguage: 'Thai (ไทย)',
`;

// Find insertion point for Thai (before line 1577)
const lines = content.split('\n');
const thaiInsertIndex = lines.findIndex((line, idx) => idx > 100 && line.trim().startsWith('en: {'));

if (thaiInsertIndex === -1) {
    console.error('Could not find en: { line');
    process.exit(1);
}

// Insert Thai translations before 'en: {'
lines.splice(thaiInsertIndex, 0, thaiArticleTranslations);

// Now find where to insert English translations (after en: { section starts)
const modifiedContent = lines.join('\n');
const enLines = modifiedContent.split('\n');
const enInsertIndex = enLines.findIndex((line, idx) => idx > thaiInsertIndex + 100 && line.includes('    },') && enLines[idx + 1] && enLines[idx + 1].includes('};'));

if (enInsertIndex === -1) {
    console.error('Could not find end of English section');
    process.exit(1);
}

// Insert English translations before closing of en section
enLines.splice(enInsertIndex, 0, englishArticleTranslations);

// Write back
const finalContent = enLines.join('\n');
fs.writeFileSync(langFilePath, finalContent, 'utf8');

console.log('✓ Article translations added to languages.js');
console.log(`  - Thai translations inserted before line ${thaiInsertIndex + 1}`);
console.log(`  - English translations inserted before line ${enInsertIndex + 1}`);
console.log('  - Total new translation keys: 116 (per language)');
