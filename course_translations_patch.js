// Translation keys patch for Course pages
// Add these to utils/languages.js

const newTranslations = {
    th: {
        // ===== Course Creation Page (create.ejs) =====
        createNewCourse: 'สร้างหลักสูตรใหม่',
        createCourseDescription: 'สร้างหลักสูตรการเรียนรู้สำหรับพนักงาน',
        backToCourseList: 'กลับไปรายการหลักสูตร',

        // Step labels
        step: 'ขั้นตอนที่',
        basicInformation: 'ข้อมูลพื้นฐาน',
        courseDetailsStep: 'รายละเอียดหลักสูตร',
        contentAndMedia: 'เนื้อหาและสื่อ',
        assessmentStep: 'การประเมินผล',

        // Step descriptions
        enterBasicInfo: 'กรอกข้อมูลพื้นฐานของหลักสูตร',
        specifyDetailsAndTarget: 'ระบุรายละเอียดและกลุ่มเป้าหมาย',
        addLessonsAndMaterials: 'เพิ่มบทเรียนและเอกสารประกอบ',
        configureTests: 'กำหนดการทดสอบและประเมินผล',

        // Form labels
        courseNameLabel: 'ชื่อหลักสูตร',
        courseCodeLabel: 'รหัสหลักสูตร',
        categoryLabel: 'หมวดหมู่',
        difficultyLabel: 'ระดับความยาก',
        courseTypeLabel: 'ประเภทหลักสูตร',
        teachingLanguageLabel: 'ภาษาที่ใช้สอน',
        instructorNameLabel: 'ผู้สอน',

        // Placeholders
        enterCourseName: 'ระบุชื่อหลักสูตร',
        selectCategory: 'เลือกหมวดหมู่',
        selectLevel: 'เลือกระดับ',
        selectType: 'เลือกประเภท',
        selectLanguage: 'เลือกภาษา',
        instructorNamePlaceholder: 'ชื่อผู้สอน',

        // Course types
        mandatory: 'บังคับ',
        elective: 'เลือก',
        recommended: 'แนะนำ',

        // Languages
        thai: 'ภาษาไทย',
        english: 'ภาษาอังกฤษ',
        thaiEnglish: 'ไทย-อังกฤษ',

        // Difficulty levels
        beginnerLevel: 'Beginner - เริ่มต้น',
        intermediateLevel: 'Intermediate - ปานกลาง',
        advancedLevel: 'Advanced - ขั้นสูง',

        // Course details
        courseDescriptionLabel: 'คำอธิบายหลักสูตร',
        courseDescriptionPlaceholder: 'อธิบายรายละเอียดของหลักสูตรนี้',
        learningObjectivesLabel: 'วัตถุประสงค์การเรียนรู้',
        learningObjectivesPlaceholder: 'ระบุวัตถุประสงค์หลัก ๆ ของการเรียนรู้',
        targetAudienceLabel: 'กลุ่มเป้าหมาย',
        targetAudiencePlaceholder: 'ระบุกลุ่มเป้าหมายที่เหมาะสม',
        prerequisitesLabel: 'ความต้องการพื้นฐาน',
        prerequisitesPlaceholder: 'ความรู้พื้นฐานที่ควรมีก่อนเรียน',

        // Duration
        durationHoursLabel: 'ชั่วโมง',
        durationMinutesLabel: 'นาที',
        courseDuration: 'ระยะเวลาหลักสูตร',

        // Settings
        maxEnrollmentsLabel: 'จำนวนผู้เรียนสูงสุด',
        passingScoreLabel: 'เกณฑ์ผ่าน (%)',
        maxAttemptsLabel: 'ทำได้สูงสุด (ครั้ง)',
        certificateLabel: 'ออกใบประกาศนียบัตร',
        allowCertificate: 'อนุญาตให้ออกใบประกาศนียบัตร',
        certificateValidityLabel: 'อายุใบประกาศนียบัตร',
        days: 'วัน',
        unlimitedValidity: 'ไม่จำกัดอายุ',

        // Enrollment dates
        enrollmentDates: 'ช่วงเวลาเปิดลงทะเบียน',
        enrollmentStartLabel: 'วันที่เปิดลงทะเบียน',
        enrollmentEndLabel: 'วันที่ปิดลงทะเบียน',

        // Options
        isMandatory: 'เป็นหลักสูตรบังคับ',
        isPublic: 'เปิดให้สาธารณะ',

        // Content
        courseContentLabel: 'เนื้อหาหลักสูตร',
        addLesson: 'เพิ่มบทเรียน',
        lessonTitle: 'หัวข้อบทเรียน',
        lessonDescription: 'คำอธิบายบทเรียน',
        lessonOrder: 'ลำดับ',
        estimatedTime: 'เวลาโดยประมาณ',
        lessonType: 'ประเภท',
        lessonContent: 'เนื้อหา',
        actions: 'การจัดการ',

        // Materials
        courseMaterials: 'เอกสารประกอบการสอน',
        addMaterial: 'เพิ่มเอกสาร',
        materialTitle: 'ชื่อเอกสาร',
        materialType: 'ประเภทเอกสาร',
        uploadFile: 'อัพโหลดไฟล์',

        // Assessment
        assessmentConfiguration: 'การกำหนดการประเมินผล',
        addTest: 'เพิ่มแบบทดสอบ',
        selectTest: 'เลือกแบบทดสอบ',
        testsList: 'รายการแบบทดสอบ',

        // Buttons
        previousStep: 'ย้อนกลับ',
        nextStep: 'ถัดไป',
        saveDraft: 'บันทึกร่าง',
        saveAndPublish: 'บันทึกและเผยแพร่',

        // Messages
        codeGeneratedAuto: 'รหัสถูกสร้างอัตโนมัติ',
        generateNew: 'สร้างใหม่',
        optionalField: 'ระบุ',
        requiredField: 'บังคับ',

        // ===== Category Management Page (categories.ejs) =====
        manageCourseCategories: 'จัดการหมวดหมู่หลักสูตร',
        manageCategoriesDescription: 'เพิ่ม แก้ไข และจัดการหมวดหมู่หลักสูตรทั้งหมด',
        addNewCategory: 'เพิ่มหมวดหมู่ใหม่',

        // Table headers
        icon: 'ไอคอน',
        categoryName: 'ชื่อหมวดหมู่',
        order: 'ลำดับ',
        courseCount: 'จำนวนหลักสูตร',
        manage: 'จัดการ',

        // Form
        categoryNameThai: 'ชื่อหมวดหมู่ (ไทย)',
        categoryNameEnglish: 'ชื่อหมวดหมู่ (อังกฤษ)',
        categoryDescriptionLabel: 'คำอธิบาย',
        categoryIconLabel: 'ไอคอน (Font Awesome)',
        categoryColorLabel: 'สีหมวดหมู่',
        displayOrderLabel: 'ลำดับการแสดงผล',
        activeStatus: 'เปิดใช้งาน',

        // Placeholders
        categoryNameThaiPlaceholder: 'เช่น เทคโนโลยีสารสนเทศ',
        categoryNameEnglishPlaceholder: 'e.g. Information Technology',
        categoryDescriptionPlaceholder: 'คำอธิบายของหมวดหมู่',
        categoryIconPlaceholder: 'fa-laptop-code',

        // Actions
        edit: 'แก้ไข',
        delete: 'ลบ',
        save: 'บันทึก',
        cancel: 'ยกเลิก',

        // Modal titles
        addCategoryTitle: 'เพิ่มหมวดหมู่ใหม่',
        editCategoryTitle: 'แก้ไขหมวดหมู่',
        deleteCategoryTitle: 'ยืนยันการลบหมวดหมู่',

        // Messages
        deleteCategoryConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่',
        cannotUndoDelete: 'การลบหมวดหมู่นี้จะทำให้ไม่สามารถกู้คืนได้',
        deleteCategory: 'ลบหมวดหมู่',
        loadingData: 'กำลังโหลดข้อมูล...',
        viewAllIcons: 'ดูไอคอนทั้งหมด',

        // ===== Course Detail Page (detail.ejs) - mostly in JS =====
        // These will be used in JavaScript translations object
    },

    en: {
        // ===== Course Creation Page (create.ejs) =====
        createNewCourse: 'Create New Course',
        createCourseDescription: 'Create learning course for employees',
        backToCourseList: 'Back to Course List',

        // Step labels
        step: 'Step',
        basicInformation: 'Basic Information',
        courseDetailsStep: 'Course Details',
        contentAndMedia: 'Content and Media',
        assessmentStep: 'Assessment',

        // Step descriptions
        enterBasicInfo: 'Enter basic course information',
        specifyDetailsAndTarget: 'Specify details and target audience',
        addLessonsAndMaterials: 'Add lessons and course materials',
        configureTests: 'Configure tests and assessments',

        // Form labels
        courseNameLabel: 'Course Name',
        courseCodeLabel: 'Course Code',
        categoryLabel: 'Category',
        difficultyLabel: 'Difficulty Level',
        courseTypeLabel: 'Course Type',
        teachingLanguageLabel: 'Teaching Language',
        instructorNameLabel: 'Instructor',

        // Placeholders
        enterCourseName: 'Enter course name',
        selectCategory: 'Select category',
        selectLevel: 'Select level',
        selectType: 'Select type',
        selectLanguage: 'Select language',
        instructorNamePlaceholder: 'Instructor name',

        // Course types
        mandatory: 'Mandatory',
        elective: 'Elective',
        recommended: 'Recommended',

        // Languages
        thai: 'Thai',
        english: 'English',
        thaiEnglish: 'Thai-English',

        // Difficulty levels
        beginnerLevel: 'Beginner',
        intermediateLevel: 'Intermediate',
        advancedLevel: 'Advanced',

        // Course details
        courseDescriptionLabel: 'Course Description',
        courseDescriptionPlaceholder: 'Describe the course details',
        learningObjectivesLabel: 'Learning Objectives',
        learningObjectivesPlaceholder: 'Specify main learning objectives',
        targetAudienceLabel: 'Target Audience',
        targetAudiencePlaceholder: 'Specify appropriate target audience',
        prerequisitesLabel: 'Prerequisites',
        prerequisitesPlaceholder: 'Basic knowledge required before taking this course',

        // Duration
        durationHoursLabel: 'Hours',
        durationMinutesLabel: 'Minutes',
        courseDuration: 'Course Duration',

        // Settings
        maxEnrollmentsLabel: 'Maximum Enrollments',
        passingScoreLabel: 'Passing Score (%)',
        maxAttemptsLabel: 'Maximum Attempts',
        certificateLabel: 'Issue Certificate',
        allowCertificate: 'Allow certificate issuance',
        certificateValidityLabel: 'Certificate Validity',
        days: 'days',
        unlimitedValidity: 'No expiration',

        // Enrollment dates
        enrollmentDates: 'Enrollment Period',
        enrollmentStartLabel: 'Enrollment Start Date',
        enrollmentEndLabel: 'Enrollment End Date',

        // Options
        isMandatory: 'Mandatory course',
        isPublic: 'Public course',

        // Content
        courseContentLabel: 'Course Content',
        addLesson: 'Add Lesson',
        lessonTitle: 'Lesson Title',
        lessonDescription: 'Lesson Description',
        lessonOrder: 'Order',
        estimatedTime: 'Estimated Time',
        lessonType: 'Type',
        lessonContent: 'Content',
        actions: 'Actions',

        // Materials
        courseMaterials: 'Course Materials',
        addMaterial: 'Add Material',
        materialTitle: 'Material Title',
        materialType: 'Material Type',
        uploadFile: 'Upload File',

        // Assessment
        assessmentConfiguration: 'Assessment Configuration',
        addTest: 'Add Test',
        selectTest: 'Select Test',
        testsList: 'Tests List',

        // Buttons
        previousStep: 'Previous',
        nextStep: 'Next',
        saveDraft: 'Save Draft',
        saveAndPublish: 'Save and Publish',

        // Messages
        codeGeneratedAuto: 'Code generated automatically',
        generateNew: 'Generate New',
        optionalField: 'Optional',
        requiredField: 'Required',

        // ===== Category Management Page (categories.ejs) =====
        manageCourseCategories: 'Manage Course Categories',
        manageCategoriesDescription: 'Add, edit, and manage all course categories',
        addNewCategory: 'Add New Category',

        // Table headers
        icon: 'Icon',
        categoryName: 'Category Name',
        order: 'Order',
        courseCount: 'Course Count',
        manage: 'Manage',

        // Form
        categoryNameThai: 'Category Name (Thai)',
        categoryNameEnglish: 'Category Name (English)',
        categoryDescriptionLabel: 'Description',
        categoryIconLabel: 'Icon (Font Awesome)',
        categoryColorLabel: 'Category Color',
        displayOrderLabel: 'Display Order',
        activeStatus: 'Active',

        // Placeholders
        categoryNameThaiPlaceholder: 'e.g. เทคโนโลยีสารสนเทศ',
        categoryNameEnglishPlaceholder: 'e.g. Information Technology',
        categoryDescriptionPlaceholder: 'Category description',
        categoryIconPlaceholder: 'fa-laptop-code',

        // Actions
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',

        // Modal titles
        addCategoryTitle: 'Add New Category',
        editCategoryTitle: 'Edit Category',
        deleteCategoryTitle: 'Confirm Category Deletion',

        // Messages
        deleteCategoryConfirm: 'Are you sure you want to delete category',
        cannotUndoDelete: 'This action cannot be undone',
        deleteCategory: 'Delete Category',
        loadingData: 'Loading data...',
        viewAllIcons: 'View all icons',
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = newTranslations;
}

console.log('Translation keys prepared!');
console.log('Thai keys:', Object.keys(newTranslations.th).length);
console.log('English keys:', Object.keys(newTranslations.en).length);
