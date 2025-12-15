const fs = require('fs');
const filePath = 'D:/App/LearnHub/utils/languages.js';
let content = fs.readFileSync(filePath, 'utf8');

// New Thai translations to add after line with 'shareKnowledgeDesc'
const newThaiTranslations = `
        // Article Create Steps
        settingsAndTags: 'การตั้งค่าและแท็ก',
        reviewAndPublish: 'ตรวจสอบและเผยแพร่',

        // Article Form Fields
        enterEngagingTitle: 'ใส่หัวข้อที่น่าสนใจสำหรับบทความของคุณ',
        goodTitleDesc: 'หัวข้อที่ดีควรชัดเจนและอธิบายได้',
        writeBriefSummary: 'เขียนสรุปสั้นๆ ของบทความ (จะแสดงในรายการบทความ)',
        summaryHelpDesc: 'ช่วยให้ผู้อ่านเข้าใจว่าบทความของคุณเกี่ยวกับอะไร',
        estimatedReadingTime: 'เวลาอ่านโดยประมาณ',
        autoCalculatedIfBlank: 'จะคำนวณอัตโนมัติหากไม่ได้กรอก',
        uploadImage: 'อัปโหลดรูปภาพ',
        orDragAndDrop: 'หรือลากและวาง',
        imageFormatSupport: 'รองรับ PNG, JPG, GIF สูงสุด 5MB',
        removeImage: 'ลบรูปภาพ',
        startWritingContent: 'เริ่มเขียนเนื้อหาบทความของคุณที่นี่...',
        useToolbarDesc: 'ใช้แถบเครื่องมือด้านบนเพื่อจัดรูปแบบเนื้อหา',
        words: 'คำ',
        addTagsPlaceholder: 'เพิ่มแท็ก (กด Enter เพื่อเพิ่ม)',
        addRelevantTags: 'เพิ่มแท็กที่เกี่ยวข้องเพื่อช่วยให้ผู้อ่านค้นหาบทความของคุณ',
        difficultyLevel: 'ระดับความยาก',
        beginner: 'เริ่มต้น',
        intermediate: 'ปานกลาง',
        advanced: 'ขั้นสูง',
        expert: 'ผู้เชี่ยวชาญ',
        visibility: 'การมองเห็น',
        membersOnly: 'สมาชิกเท่านั้น',
        publicDesc: 'ทุกคนสามารถดูบทความนี้ได้',
        membersOnlyDesc: 'เฉพาะสมาชิกที่ลงทะเบียนเท่านั้นที่สามารถดูได้',
        privateDesc: 'เฉพาะคุณเท่านั้นที่สามารถดูบทความนี้ได้',
        commentsAndFeedback: 'ความคิดเห็นและข้อเสนอแนะ',
        allowComments: 'อนุญาตให้แสดงความคิดเห็นในบทความนี้',
        allowLikes: 'อนุญาตให้กดถูกใจ/รีแอค',
        moderateComments: 'ตรวจสอบความคิดเห็นก่อนเผยแพร่',
        seoSettings: 'การตั้งค่า SEO',
        metaDescription: 'คำอธิบายสำหรับ SEO',
        descriptionForSearchEngines: 'คำอธิบายสั้นๆ สำหรับเครื่องมือค้นหา',
        charactersRecommended: 'ตัวอักษรที่แนะนำ',
        willBeUsedAsURL: 'จะใช้เป็น URL ของบทความ',
        publicationStatus: 'สถานะการเผยแพร่',
        scheduleForLater: 'กำหนดเวลาเผยแพร่',
        scheduleForLaterDesc: 'เลือกเวลาที่จะเผยแพร่บทความนี้',
        publishNowDesc: 'ทำให้บทความนี้ใช้งานได้ทันที',
        saveAsDraftDesc: 'บันทึกไว้แก้ไขภายหลัง',
        publishDateTime: 'วันและเวลาเผยแพร่',
        notifications: 'การแจ้งเตือน',
        notifyFollowers: 'แจ้งเตือนผู้ติดตามของคุณ',
        shareOnSocial: 'แชร์บนโซเชียลมีเดีย',
        submitForFeatured: 'ส่งเพื่อติดบทความแนะนำ',
        publishArticle: 'เผยแพร่บทความ',
        previewArticle: 'ดูตัวอย่างบทความ',
        creatingArticle: 'กำลังสร้างบทความ...',
        pleaseAddContent: 'กรุณาเพิ่มเนื้อหาในบทความของคุณ',
        pleaseFillRequired: 'กรุณากรอกข้อมูลในช่องที่จำเป็นทั้งหมด',
        articleSavedAsDraft: 'บทความถูกบันทึกเป็นร่างแล้ว',
        failedToSaveDraft: 'บันทึกร่างไม่สำเร็จ',
        errorSavingDraft: 'เกิดข้อผิดพลาดในการบันทึกร่าง',
        articlePublished: 'บทความถูกเผยแพร่เรียบร้อยแล้ว!',
        articleScheduled: 'บทความถูกกำหนดเวลาเผยแพร่เรียบร้อยแล้ว!',
        articleSavedDraft: 'บทความถูกบันทึกเป็นร่างแล้ว!',
        failedToCreate: 'สร้างบทความไม่สำเร็จ',
        errorCreatingArticle: 'เกิดข้อผิดพลาดในการสร้างบทความ',
        enterURL: 'ใส่ URL:',
        enterImageURL: 'ใส่ URL รูปภาพ:',
        enterCode: 'ใส่โค้ดของคุณ:',
        minRead: 'นาทีอ่าน',
        bold: 'ตัวหนา',
        italic: 'ตัวเอียง',
        underline: 'ขีดเส้นใต้',
        bulletList: 'รายการหัวข้อย่อย',
        numberedList: 'รายการตัวเลข',
        insertLink: 'แทรกลิงก์',
        insertImage: 'แทรกรูปภาพ',
        codeBlock: 'บล็อกโค้ด',
        heading: 'หัวข้อ',`;

// New English translations to add after line with 'shareKnowledgeDesc'
const newEnglishTranslations = `
        // Article Create Steps
        settingsAndTags: 'Settings and Tags',
        reviewAndPublish: 'Review and Publish',

        // Article Form Fields
        enterEngagingTitle: 'Enter an engaging title for your article',
        goodTitleDesc: 'A good title should be clear and descriptive',
        writeBriefSummary: 'Write a brief summary of the article (will be shown in article list)',
        summaryHelpDesc: 'Helps readers understand what your article is about',
        estimatedReadingTime: 'Estimated Reading Time',
        autoCalculatedIfBlank: 'Will be calculated automatically if left blank',
        uploadImage: 'Upload Image',
        orDragAndDrop: 'or drag and drop',
        imageFormatSupport: 'Supports PNG, JPG, GIF up to 5MB',
        removeImage: 'Remove Image',
        startWritingContent: 'Start writing your article content here...',
        useToolbarDesc: 'Use the toolbar above to format your content',
        words: 'words',
        addTagsPlaceholder: 'Add tags (press Enter to add)',
        addRelevantTags: 'Add relevant tags to help readers find your article',
        difficultyLevel: 'Difficulty Level',
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        expert: 'Expert',
        visibility: 'Visibility',
        membersOnly: 'Members Only',
        publicDesc: 'Everyone can view this article',
        membersOnlyDesc: 'Only registered members can view',
        privateDesc: 'Only you can view this article',
        commentsAndFeedback: 'Comments and Feedback',
        allowComments: 'Allow comments on this article',
        allowLikes: 'Allow likes/reactions',
        moderateComments: 'Moderate comments before publishing',
        seoSettings: 'SEO Settings',
        metaDescription: 'Meta Description',
        descriptionForSearchEngines: 'Short description for search engines',
        charactersRecommended: 'characters recommended',
        willBeUsedAsURL: 'Will be used as the article URL',
        publicationStatus: 'Publication Status',
        scheduleForLater: 'Schedule for Later',
        scheduleForLaterDesc: 'Choose when to publish this article',
        publishNowDesc: 'Make this article available immediately',
        saveAsDraftDesc: 'Save for editing later',
        publishDateTime: 'Publish Date and Time',
        notifications: 'Notifications',
        notifyFollowers: 'Notify your followers',
        shareOnSocial: 'Share on social media',
        submitForFeatured: 'Submit for featured article',
        publishArticle: 'Publish Article',
        previewArticle: 'Preview Article',
        creatingArticle: 'Creating article...',
        pleaseAddContent: 'Please add content to your article',
        pleaseFillRequired: 'Please fill in all required fields',
        articleSavedAsDraft: 'Article saved as draft',
        failedToSaveDraft: 'Failed to save draft',
        errorSavingDraft: 'Error saving draft',
        articlePublished: 'Article published successfully!',
        articleScheduled: 'Article scheduled successfully!',
        articleSavedDraft: 'Article saved as draft!',
        failedToCreate: 'Failed to create article',
        errorCreatingArticle: 'Error creating article',
        enterURL: 'Enter URL:',
        enterImageURL: 'Enter image URL:',
        enterCode: 'Enter your code:',
        minRead: 'min read',
        bold: 'Bold',
        italic: 'Italic',
        underline: 'Underline',
        bulletList: 'Bullet List',
        numberedList: 'Numbered List',
        insertLink: 'Insert Link',
        insertImage: 'Insert Image',
        codeBlock: 'Code Block',
        heading: 'Heading',`;

// Add Thai translations after shareKnowledgeDesc in Thai section
const thaiMarker = "shareKnowledgeDesc: 'แบ่งปันความรู้และประสบการณ์กับชุมชน',";
if (content.includes(thaiMarker)) {
    content = content.replace(thaiMarker, thaiMarker + newThaiTranslations);
    console.log('Added Thai translations');
} else {
    console.log('Thai marker not found');
}

// Add English translations after shareKnowledgeDesc in English section
const englishMarker = "shareKnowledgeDesc: 'Share knowledge and experiences with the community',";
if (content.includes(englishMarker)) {
    content = content.replace(englishMarker, englishMarker + newEnglishTranslations);
    console.log('Added English translations');
} else {
    console.log('English marker not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! Updated languages.js with article create translations');
