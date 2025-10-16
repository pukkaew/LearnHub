// Language translations for the application
const translations = {
    th: {
        // Navigation
        home: 'หน้าหลัก',
        dashboard: 'แดชบอร์ด',
        courses: 'คอร์สเรียน',
        learning: 'การเรียนรู้',
        tests: 'แบบทดสอบ',
        articles: 'บทความ',
        users: 'จัดการผู้ใช้',
        usersManagement: 'จัดการผู้ใช้งาน',
        applicants: 'ผู้สมัครงาน',
        hrManagement: 'จัดการ HR',
        organization: 'โครงสร้างองค์กร',
        organizationManagementMenu: 'จัดการโครงสร้างองค์กร',
        positions: 'ตำแหน่งงาน',
        positionsManagementMenu: 'จัดการตำแหน่ง',
        profile: 'โปรไฟล์',
        settings: 'ตั้งค่า',
        userSettings: 'การตั้งค่าส่วนตัว',
        systemSettings: 'การตั้งค่าระบบ',
        logout: 'ออกจากระบบ',
        login: 'เข้าสู่ระบบ',
        signIn: 'เข้าสู่ระบบ',
        employeeId: 'รหัสพนักงาน',
        password: 'รหัสผ่าน',
        rememberMe: 'จดจำการเข้าสู่ระบบ',
        forgotPassword: 'ลืมรหัสผ่าน?',
        dontHaveAccount: 'ยังไม่มีบัญชี?',
        createAccount: 'สมัครสมาชิก',

        // Dashboard
        welcome: 'สวัสดี',
        welcomeToSystem: 'ยินดีต้อนรับสู่ระบบ LearnHub',
        level: 'ระดับ',
        totalPoints: 'คะแนนสะสม',
        enrolledCourses: 'คอร์สที่เรียน',
        completed: 'เสร็จแล้ว',
        completedCourses: 'เสร็จแล้ว',
        testsCompleted: 'แบบทดสอบ',
        averageScore: 'คะแนนเฉลี่ย',
        publishedArticles: 'บทความ',
        views: 'การดู',
        badges: 'เหรียญรางวัล',
        received: 'ได้รับ',

        // Sections
        recentCourses: 'คอร์สล่าสุด',
        learningProgress: 'ความคืบหน้าการเรียน',
        recentArticles: 'บทความใหม่',
        notifications: 'แจ้งเตือน',
        myBadges: 'เหรียญรางวัลของฉัน',
        leaderboard: 'อันดับผู้เรียน',
        quickActions: 'การดำเนินการด่วน',

        // Quick Actions
        searchCourses: 'ค้นหาคอร์ส',
        writeArticle: 'เขียนบทความ',
        editProfile: 'แก้ไขโปรไฟล์',
        manageApplicants: 'จัดการผู้สมัคร',

        // Buttons
        viewAll: 'ดูทั้งหมด',
        markAllRead: 'อ่านทั้งหมด',

        // Status
        online: 'ออนไลน์',
        offline: 'ออฟไลน์',
        points: 'คะแนน',

        // Loading & Messages
        loading: 'กำลังโหลดข้อมูล...',
        loadingShort: 'กำลังโหลด...',
        errorLoading: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        noTitle: 'ไม่มีชื่อ',
        instructor: 'ผู้สอน',
        noAuthor: 'ไม่ระบุผู้เขียน',
        reports: 'รายงาน',
        completionProgress: 'เสร็จสิ้น',

        // Empty States
        noCourses: 'ยังไม่มีคอร์สที่เรียน',
        noProgress: 'ยังไม่มีความคืบหน้าการเรียน',
        noArticles: 'ยังไม่มีบทความใหม่',
        noNotifications: 'ไม่มีการแจ้งเตือน',
        noBadges: 'ยังไม่มีเหรียญรางวัล',
        noLeaderboard: 'ยังไม่มีข้อมูลอันดับ',

        // Time
        minutesAgo: 'นาทีที่แล้ว',
        hoursAgo: 'ชั่วโมงที่แล้ว',
        daysAgo: 'วันที่แล้ว',
        justNow: 'เมื่อสักครู่',

        // Department
        noDepartment: 'ไม่ระบุแผนก',

        // HR Management - Positions
        positionManagement: 'จัดการตำแหน่งงาน',
        positionName: 'ชื่อตำแหน่ง',
        createPosition: 'สร้างตำแหน่งงานใหม่',
        createNewPosition: 'สร้างตำแหน่งงานใหม่',
        editPosition: 'แก้ไขตำแหน่งงาน',
        viewPosition: 'ดูรายละเอียดตำแหน่ง',
        deletePosition: 'ลบตำแหน่ง',
        positionList: 'รายการตำแหน่งงาน',
        positionDetails: 'รายละเอียดตำแหน่ง',
        positionDescription: 'คำอธิบายตำแหน่ง',
        description: 'คำอธิบาย',
        descriptionDetail: 'รายละเอียด',
        unit: 'หน่วยงาน',
        selectUnit: 'เลือกหน่วยงาน',
        chooseUnit: '-- เลือกหน่วยงาน --',
        status: 'สถานะ',
        active: 'ใช้งาน',
        inactive: 'ไม่ใช้งาน',
        actions: 'การดำเนินการ',

        // HR - Organization
        organizationManagement: 'จัดการโครงสร้างองค์กร',
        organizationStructure: 'โครงสร้างองค์กร',
        organizationUnit: 'หน่วยงาน',
        organizationLevel: 'ระดับองค์กร',
        parentUnit: 'หน่วยงานแม่',
        childUnits: 'หน่วยงานลูก',
        unitName: 'ชื่อหน่วยงาน',
        unitCode: 'รหัสหน่วยงาน',
        department: 'แผนก',
        division: 'ฝ่าย',
        section: 'ส่วน',
        createUnit: 'สร้างหน่วยงานใหม่',
        editUnit: 'แก้ไขหน่วยงาน',
        deleteUnit: 'ลบหน่วยงาน',
        viewUnit: 'ดูรายละเอียดหน่วยงาน',
        unitDetails: 'รายละเอียดหน่วยงาน',
        unitNotFound: 'ไม่พบหน่วยงาน',
        errorLoadingUnits: 'เกิดข้อผิดพลาดในการโหลดข้อมูลหน่วยงาน',
        errorLoadingLevels: 'เกิดข้อผิดพลาดในการดึงข้อมูลระดับองค์กร',
        errorLoadingTree: 'เกิดข้อผิดพลาดในการดึงข้อมูล Tree',
        errorCreatingUnit: 'เกิดข้อผิดพลาดในการสร้างหน่วยงาน',
        errorUpdatingUnit: 'เกิดข้อผิดพลาดในการแก้ไขหน่วยงาน',
        errorDeletingUnit: 'เกิดข้อผิดพลาดในการลบหน่วยงาน',
        unitCreatedSuccess: 'สร้างหน่วยงานสำเร็จ',
        unitUpdatedSuccess: 'แก้ไขหน่วยงานสำเร็จ',
        unitDeletedSuccess: 'ลบหน่วยงานสำเร็จ',

        // HR - Employees
        employeeManagement: 'จัดการพนักงาน',
        employeeList: 'รายการพนักงาน',
        employeeInfo: 'ข้อมูลพนักงาน',
        employeeDetails: 'รายละเอียดพนักงาน',
        firstName: 'ชื่อ',
        lastName: 'นามสกุล',
        fullName: 'ชื่อ-นามสกุล',

        // Users Management
        usersManagement: 'จัดการผู้ใช้งาน',
        userManagementSystem: 'ระบบจัดการสมาชิกและผู้ใช้งานในองค์กร',
        userNotFound: 'ไม่พบข้อมูลผู้ใช้',
        noUsers: 'ไม่พบผู้ใช้งาน',
        totalUsers: 'ผู้ใช้ทั้งหมด',
        activeUsers: 'ผู้ใช้ที่ใช้งานอยู่',
        pendingUsers: 'รอการอนุมัติ',
        newUsers: 'ลงทะเบียนใหม่',
        suspendedUsers: 'ถูกระงับ',
        searchUsers: 'ค้นหาผู้ใช้...',
        allStatuses: 'สถานะทั้งหมด',
        allRoles: 'บทบาททั้งหมด',
        allDepartments: 'แผนกทั้งหมด',
        allUnitsFilter: 'หน่วยงานทั้งหมด',
        sortBy: 'เรียงตาม',
        sortLatest: 'ล่าสุด',
        sortNameAZ: 'ชื่อ A-Z',
        sortNameZA: 'ชื่อ Z-A',
        sortOldest: 'เก่าที่สุด',
        sortLastActive: 'เข้าใช้ล่าสุด',
        oldest: 'เก่าที่สุด',
        lastActive: 'เข้าใช้ล่าสุด',
        exportData: 'ส่งออกข้อมูล',
        addNewUser: 'เพิ่มผู้ใช้ใหม่',
        statusActive: 'ใช้งานอยู่',
        statusInactive: 'ไม่ใช้งาน',
        statusPending: 'รอการอนุมัติ',
        statusSuspended: 'ถูกระงับ',
        roleAdmin: 'ผู้ดูแลระบบ',
        roleHR: 'HR',
        roleManager: 'ผู้จัดการ',
        roleEmployee: 'พนักงาน',
        roleLearner: 'ผู้เรียน',
        selectAllUsers: 'เลือกทั้งหมด',
        selectedItems: 'เลือกแล้ว',
        itemsText: 'รายการ',
        approve: 'อนุมัติ',
        suspend: 'ระงับ',
        clearSelection: 'ยกเลิกการเลือก',
        showing: 'แสดง',
        usersText: 'ผู้ใช้',
        loadingData: 'กำลังโหลดข้อมูล...',
        addUser: 'เพิ่มผู้ใช้',
        editUser: 'แก้ไขข้อมูลผู้ใช้',
        editUserData: 'แก้ไขข้อมูลผู้ใช้',
        personalInfo: 'ข้อมูลส่วนตัว',
        userType: 'ประเภทผู้ใช้',
        selectUserType: '-- เลือกประเภทผู้ใช้ --',
        employeeWithAccess: '👤 พนักงาน (มีสิทธิ์เข้าใช้ระบบ)',
        applicantNoAccess: '📋 ผู้สมัครงาน (ยังไม่มีสิทธิ์เข้าระบบ)',
        idCardNumber: 'เลขบัตรประชาชน',
        organizationInfo: 'ข้อมูลองค์กร',
        selectBranch: '-- เลือกสาขา --',
        selectOffice: '-- เลือกสำนัก --',
        selectDivision: '-- เลือกฝ่าย --',
        selectDepartment: '-- เลือกแผนก --',
        selectPosition: 'เลือกตำแหน่ง',
        startDate: 'วันเริ่มงาน',
        applicationInfo: 'ข้อมูลการสมัครงาน',
        appliedPosition: 'ตำแหน่งที่สมัคร',
        selectAppliedPosition: '-- เลือกตำแหน่งที่สมัคร --',
        systemAccess: 'การเข้าถึงระบบ',
        role: 'บทบาท',
        selectRole: '-- เลือกบทบาท --',
        manager: 'ผู้จัดการ',
        admin: 'ผู้ดูแลระบบ',
        confirmPassword: 'ยืนยันรหัสผ่าน',
        uploadProfileImage: 'อัปโหลดรูปโปรไฟล์ (ไม่บังคับ)',
        saveChanges: 'บันทึกการแก้ไข',
        viewDetails: 'ดูรายละเอียด',
        activateUser: 'เปิดใช้',
        suspendUser: 'ระงับ',
        deleteUser: 'ลบ',
        confirmSuspendUser: 'คุณแน่ใจหรือไม่ที่จะระงับการใช้งานของผู้ใช้นี้?',
        confirmDeleteUser: 'คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้ไม่สามารถยกเลิกได้',
        confirmBulkAction: 'คุณแน่ใจหรือไม่ที่จะ{action}ผู้ใช้ที่เลือก {count} คน?',
        passwordMismatch: 'รหัสผ่านไม่ตรงกัน',
        userAddedSuccess: 'เพิ่มผู้ใช้เรียบร้อยแล้ว',
        userEditedSuccess: 'แก้ไขข้อมูลเรียบร้อยแล้ว',
        userSuspendedSuccess: 'ระงับการใช้งานเรียบร้อยแล้ว',
        userActivatedSuccess: 'เปิดใช้งานเรียบร้อยแล้ว',
        userDeletedSuccess: 'ลบผู้ใช้เรียบร้อยแล้ว',
        bulkActionSuccess: '{action}ผู้ใช้เรียบร้อยแล้ว',
        errorLoadingProfile: 'เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์',
        errorLoadingUsers: 'เกิดข้อผิดพลาดในการโหลดรายชื่อผู้ใช้',
        errorLoadingUserData: 'เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้',
        errorCreatingUser: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้ใหม่',
        errorUpdatingUser: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลผู้ใช้',
        errorUpdatingProfile: 'เกิดข้อผิดพลาดในการอัพเดทโปรไฟล์',
        errorDeactivatingUser: 'เกิดข้อผิดพลาดในการระงับการใช้งานผู้ใช้',
        errorUploadingImage: 'เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ',
        errorLoadingUserStats: 'เกิดข้อผิดพลาดในการโหลดสถิติผู้ใช้',
        errorLoadingUserManagementPage: 'ไม่สามารถโหลดหน้าจัดการผู้ใช้ได้',
        errorLoadingProfilePage: 'ไม่สามารถโหลดหน้าโปรไฟล์ได้',
        errorExportingData: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล',
        profileUpdatedSuccess: 'อัพเดทโปรไฟล์สำเร็จ',
        userCreatedSuccess: 'สร้างผู้ใช้ใหม่สำเร็จ',
        userUpdatedSuccess: 'อัพเดทข้อมูลผู้ใช้สำเร็จ',
        userDeactivatedSuccess: 'ระงับการใช้งานผู้ใช้สำเร็จ',
        profileImageUploadedSuccess: 'อัพโหลดรูปโปรไฟล์สำเร็จ',
        noPermission: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
        noPermissionCreateUser: 'ไม่มีสิทธิ์สร้างผู้ใช้ใหม่',
        noPermissionEditUser: 'ไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้',
        noPermissionDeactivateUser: 'ไม่มีสิทธิ์ระงับการใช้งานผู้ใช้',
        pleaseSelectImage: 'กรุณาเลือกไฟล์รูปภาพ',
        pageNotFound: 'ไม่พบหน้าที่ต้องการ',
        noAccessPermission: 'ไม่มีสิทธิ์เข้าถึง',
        neverLoggedIn: 'ยังไม่เคยเข้าใช้',
        lastLogin: 'เข้าใช้',
        noDepartmentSpecified: 'ไม่ระบุแผนก',

        // HR - Applicants
        applicantManagement: 'จัดการผู้สมัครงาน',
        applicantList: 'รายการผู้สมัคร',
        applicantDetails: 'รายละเอียดผู้สมัคร',
        applicationDate: 'วันที่สมัคร',
        applicationStatus: 'สถานะการสมัคร',

        // Common Actions
        save: 'บันทึก',
        saveChanges: 'บันทึกการแก้ไข',
        cancel: 'ยกเลิก',
        delete: 'ลบ',
        edit: 'แก้ไข',
        view: 'ดู',
        create: 'สร้าง',
        add: 'เพิ่ม',
        search: 'ค้นหา',
        filter: 'กรอง',
        export: 'ส่งออก',
        import: 'นำเข้า',
        refresh: 'รีเฟรช',
        back: 'กลับ',
        close: 'ปิด',
        confirm: 'ยืนยัน',
        submit: 'ส่ง',

        // Form Fields
        basicInfo: 'ข้อมูลพื้นฐาน',
        additionalInfo: 'ข้อมูลเพิ่มเติม',
        required: 'จำเป็น',
        optional: 'ไม่จำเป็น',
        pleaseSelect: 'กรุณาเลือก',
        pleaseEnter: 'กรุณากรอก',

        // Messages
        successCreate: 'สร้างสำเร็จ',
        successUpdate: 'แก้ไขสำเร็จ',
        successDelete: 'ลบสำเร็จ',
        errorCreate: 'เกิดข้อผิดพลาดในการสร้าง',
        errorUpdate: 'เกิดข้อผิดพลาดในการแก้ไข',
        errorDelete: 'เกิดข้อผิดพลาดในการลบ',
        confirmDelete: 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?',
        noData: 'ไม่มีข้อมูล',
        noResults: 'ไม่พบผลลัพธ์',

        // Position specific
        addPosition: 'เพิ่มตำแหน่งในองค์กร',
        positionsInOrg: 'ตำแหน่งในองค์กร',
        searchPosition: 'ค้นหาตำแหน่ง',
        filterByUnit: 'กรองตามหน่วยงาน',
        filterByStatus: 'กรองตามสถานะ',
        allUnits: 'ทุกหน่วยงาน',
        allStatuses: 'ทุกสถานะ',
        noPositionsFound: 'ไม่พบตำแหน่งงาน',
        selectUnitFirst: 'กรุณาเลือกหน่วยงานอย่างน้อย 1 หน่วย',
        positionCreatedSuccess: 'สร้างตำแหน่งสำเร็จ',
        positionUpdatedSuccess: 'แก้ไขตำแหน่งสำเร็จ',
        positionDeletedSuccess: 'ลบตำแหน่งสำเร็จ',
        totalPositions: 'ตำแหน่งทั้งหมด',
        totalEmployees: 'พนักงาน',
        applicantPositions: 'ผู้สมัคร',
        activePositions: 'ใช้งาน',
        allTypes: 'ประเภททั้งหมด',
        employee: 'พนักงาน',
        applicant: 'ผู้สมัคร',
        showing: 'แสดง',
        viewMode: 'มุมมอง',
        listView: 'รายการ',
        gridView: 'ตาราง',
        noUnit: 'ไม่ระบุหน่วยงาน',
        people: 'คน',
        latest: 'ล่าสุด',
        nameAZ: 'ชื่อ A-Z',
        nameZA: 'ชื่อ Z-A',
        confirmDeletePosition: 'คุณต้องการลบตำแหน่งนี้ใช่หรือไม่?',

        // Multi-select
        selected: 'เลือกแล้ว',
        selectAll: 'เลือกทั้งหมด',
        deselectAll: 'ยกเลิกทั้งหมด',
        searchAndSelect: 'ค้นหาและเลือก',
        notSelected: 'ยังไม่ได้เลือก',
        totalItems: 'ทั้งหมด',
        items: 'รายการ',
        units: 'หน่วยงาน',
        total: 'ทั้งหมด',

        // Levels
        allLevels: 'ทุกระดับ',
        company: 'บริษัท',
        branch: 'สาขา',
        office: 'สำนัก',

        // Example usage
        exampleUsage: 'ตัวอย่างการใช้งาน',
        usageExample: 'ตัวอย่าง',

        // Create position page
        addPositionToOrg: 'เพิ่มตำแหน่งงานในองค์กร',
        positionNamePlaceholder: 'เช่น วิศวกรซอฟต์แวร์, นักวิเคราะห์ระบบ, ผู้จัดการฝ่าย',
        positionDescriptionPlaceholder: 'คำอธิบายสั้นๆ เกี่ยวกับตำแหน่งนี้',
        noUnitSelected: 'ยังไม่ได้เลือกหน่วยงาน - กรุณาค้นหาและเลือก',
        searchAndSelectUnit: 'ค้นหาและเลือกหน่วยงาน...',
        noUnitsFound: 'ไม่พบหน่วยงานที่ค้นหา',
        searchAndSelectUnitHelp: 'ค้นหาและคลิกเพื่อเลือกหน่วยงาน - สามารถเลือกได้หลายหน่วยงาน',
        usageExample1: 'เลือกตำแหน่ง "วิศวกรซอฟต์แวร์" และเลือกหน่วยงาน: ฝ่าย IT, แผนก Development, ฝ่าย Digital',
        usageExample2: 'ระบบจะสร้างตำแหน่ง "วิศวกรซอฟต์แวร์" ให้ทั้ง 3 หน่วยงานในครั้งเดียว',
        pleaseSelectUnit: 'กรุณาเลือกหน่วยงานอย่างน้อย 1 หน่วย',
        error: 'เกิดข้อผิดพลาด',

        // View position page
        employeesInPosition: 'พนักงานในตำแหน่งนี้',
        statistics: 'สถิติ',
        employees: 'พนักงาน',
        management: 'การจัดการ',
        deletePositionSuccess: 'ลบตำแหน่งสำเร็จ',

        // Error messages
        errorLoadingPositions: 'เกิดข้อผิดพลาดในการโหลดข้อมูลตำแหน่งงาน',
        errorLoadingForm: 'เกิดข้อผิดพลาดในการโหลดฟอร์ม',
        errorLoadingData: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        errorCreatingPosition: 'เกิดข้อผิดพลาดในการสร้างตำแหน่ง',
        errorUpdatingPosition: 'เกิดข้อผิดพลาดในการแก้ไขตำแหน่ง',
        errorDeletingPosition: 'เกิดข้อผิดพลาดในการลบตำแหน่ง',
        positionNotFound: 'ไม่พบตำแหน่งงาน',
        pleaseEnterPositionName: 'กรุณาระบุชื่อตำแหน่ง',
        cannotCreatePosition: 'ไม่สามารถสร้างตำแหน่งได้',
        positionCreatedInUnits: 'สร้างตำแหน่งสำเร็จในทั้ง {count} หน่วยงาน',
        positionCreatedPartial: 'สร้างตำแหน่งสำเร็จ {success} หน่วยงาน, ล้มเหลว {failed} หน่วยงาน',

        // Footer & Contact
        contact: 'ติดต่อ',
        menu: 'เมนู',
        company: 'เกี่ยวกับเรา',
        quickLinks: 'ลิงก์ด่วน',
        followUs: 'ติดตามเรา',
        companyDescription: 'ระบบจัดการการเรียนรู้ของ บริษัท รักชัยห้องเย็น จำกัด เพื่อพัฒนาความรู้และทักษะของพนักงานอย่างต่อเนื่อง เสริมสร้างขีดความสามารถในการแข่งขันและการเติบโตอย่างยั่งยืน',
        address: 'ที่อยู่',
        phone: 'โทรศัพท์',
        email: 'อีเมล',
        workingHours: 'เวลาทำการ',
        workingTime: 'จันทร์ - ศุกร์ 8:00 - 17:00 น.',
        allRightsReserved: 'สงวนลิขสิทธิ์',
        privacyPolicy: 'นโยบายความเป็นส่วนตัว',
        termsOfService: 'ข้อกำหนดการใช้งาน',
        help: 'ช่วยเหลือ',
        support: 'ฝ่ายสนับสนุน',
        faq: 'คำถามที่พบบ่อย',
        learningResources: 'แหล่งเรียนรู้',
        elearning: 'ระบบเรียนออนไลน์',
        careers: 'ร่วมงานกับเรา'
    },
    en: {
        // Navigation
        home: 'Home',
        dashboard: 'Dashboard',
        courses: 'Courses',
        learning: 'Learning',
        tests: 'Tests',
        articles: 'Articles',
        users: 'Manage Users',
        applicants: 'Job Applicants',
        hrManagement: 'HR Management',
        organization: 'Organization Structure',
        positions: 'Job Positions',
        profile: 'Profile',
        settings: 'Settings',
        userSettings: 'User Settings',
        systemSettings: 'System Settings',
        logout: 'Logout',
        login: 'Login',
        signIn: 'Sign In',
        employeeId: 'Employee ID',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot password?',
        dontHaveAccount: 'Don\'t have an account?',
        createAccount: 'Create account',

        // Dashboard
        welcome: 'Hello',
        welcomeToSystem: 'Welcome to LearnHub System',
        level: 'Level',
        totalPoints: 'Total Points',
        enrolledCourses: 'Enrolled Courses',
        completed: 'Completed',
        completedCourses: 'Completed',
        testsCompleted: 'Tests',
        averageScore: 'Average Score',
        publishedArticles: 'Articles',
        views: 'Views',
        badges: 'Badges',
        received: 'Received',

        // Sections
        recentCourses: 'Recent Courses',
        learningProgress: 'Learning Progress',
        recentArticles: 'Recent Articles',
        notifications: 'Notifications',
        myBadges: 'My Badges',
        leaderboard: 'Leaderboard',
        quickActions: 'Quick Actions',

        // Quick Actions
        searchCourses: 'Search Courses',
        writeArticle: 'Write Article',
        editProfile: 'Edit Profile',
        manageApplicants: 'Manage Applicants',

        // Buttons
        viewAll: 'View All',
        markAllRead: 'Mark All Read',

        // Status
        online: 'Online',
        offline: 'Offline',
        points: 'points',

        // Loading & Messages
        loading: 'Loading data...',
        loadingShort: 'Loading...',
        errorLoading: 'Error loading data',
        noTitle: 'No Title',
        instructor: 'Instructor',
        noAuthor: 'No Author',
        reports: 'Reports',
        completionProgress: 'Completed',

        // Empty States
        noCourses: 'No enrolled courses yet',
        noProgress: 'No learning progress yet',
        noArticles: 'No new articles',
        noNotifications: 'No notifications',
        noBadges: 'No badges yet',
        noLeaderboard: 'No leaderboard data',

        // Time
        minutesAgo: 'minutes ago',
        hoursAgo: 'hours ago',
        daysAgo: 'days ago',
        justNow: 'just now',

        // Department
        noDepartment: 'No Department',

        // HR Management - Positions
        positionManagement: 'Position Management',
        positionName: 'Position Name',
        createPosition: 'Create New Position',
        createNewPosition: 'Create New Position',
        editPosition: 'Edit Position',
        viewPosition: 'View Position Details',
        deletePosition: 'Delete Position',
        positionList: 'Position List',
        positionDetails: 'Position Details',
        positionDescription: 'Position Description',
        description: 'Description',
        descriptionDetail: 'Details',
        unit: 'Unit',
        selectUnit: 'Select Unit',
        chooseUnit: '-- Choose Unit --',
        status: 'Status',
        active: 'Active',
        inactive: 'Inactive',
        actions: 'Actions',

        // HR - Organization
        organizationManagement: 'Organization Management',
        organizationStructure: 'Organization Structure',
        organizationUnit: 'Organization Unit',
        organizationLevel: 'Organization Level',
        parentUnit: 'Parent Unit',
        childUnits: 'Child Units',
        unitName: 'Unit Name',
        unitCode: 'Unit Code',
        department: 'Department',
        division: 'Division',
        section: 'Section',
        createUnit: 'Create New Unit',
        editUnit: 'Edit Unit',
        deleteUnit: 'Delete Unit',
        viewUnit: 'View Unit Details',
        unitDetails: 'Unit Details',
        unitNotFound: 'Unit not found',
        errorLoadingUnits: 'Error loading organization units',
        errorLoadingLevels: 'Error loading organization levels',
        errorLoadingTree: 'Error loading tree data',
        errorCreatingUnit: 'Error creating unit',
        errorUpdatingUnit: 'Error updating unit',
        errorDeletingUnit: 'Error deleting unit',
        unitCreatedSuccess: 'Unit created successfully',
        unitUpdatedSuccess: 'Unit updated successfully',
        unitDeletedSuccess: 'Unit deleted successfully',

        // HR - Employees
        employeeManagement: 'Employee Management',
        employeeList: 'Employee List',
        employeeInfo: 'Employee Information',
        employeeDetails: 'Employee Details',
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: 'Full Name',

        // Users Management
        usersManagement: 'Users Management',
        userNotFound: 'User not found',
        errorLoadingProfile: 'Error loading profile data',
        errorLoadingUsers: 'Error loading users list',
        errorLoadingUserData: 'Error loading user data',
        errorCreatingUser: 'Error creating new user',
        errorUpdatingUser: 'Error updating user data',
        errorUpdatingProfile: 'Error updating profile',
        errorDeactivatingUser: 'Error deactivating user',
        errorUploadingImage: 'Error uploading image',
        errorLoadingUserStats: 'Error loading user statistics',
        errorLoadingUserManagementPage: 'Cannot load user management page',
        errorLoadingProfilePage: 'Cannot load profile page',
        profileUpdatedSuccess: 'Profile updated successfully',
        userCreatedSuccess: 'User created successfully',
        userUpdatedSuccess: 'User data updated successfully',
        userDeactivatedSuccess: 'User deactivated successfully',
        profileImageUploadedSuccess: 'Profile image uploaded successfully',
        noPermission: 'No permission to access this data',
        noPermissionCreateUser: 'No permission to create new user',
        noPermissionEditUser: 'No permission to edit user data',
        noPermissionDeactivateUser: 'No permission to deactivate user',
        pleaseSelectImage: 'Please select an image file',
        pageNotFound: 'Page not found',
        noAccessPermission: 'No access permission',

        // HR - Applicants
        applicantManagement: 'Applicant Management',
        applicantList: 'Applicant List',
        applicantDetails: 'Applicant Details',
        applicationDate: 'Application Date',
        applicationStatus: 'Application Status',

        // Common Actions
        save: 'Save',
        saveChanges: 'Save Changes',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        create: 'Create',
        add: 'Add',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        refresh: 'Refresh',
        back: 'Back',
        close: 'Close',
        confirm: 'Confirm',
        submit: 'Submit',

        // Form Fields
        basicInfo: 'Basic Information',
        additionalInfo: 'Additional Information',
        required: 'Required',
        optional: 'Optional',
        pleaseSelect: 'Please select',
        pleaseEnter: 'Please enter',

        // Messages
        successCreate: 'Created successfully',
        successUpdate: 'Updated successfully',
        successDelete: 'Deleted successfully',
        errorCreate: 'Error creating',
        errorUpdate: 'Error updating',
        errorDelete: 'Error deleting',
        confirmDelete: 'Are you sure you want to delete this item?',
        noData: 'No data',
        noResults: 'No results found',

        // Position specific
        addPosition: 'Add Position to Organization',
        positionsInOrg: 'Positions in Organization',
        searchPosition: 'Search Position',
        filterByUnit: 'Filter by Unit',
        filterByStatus: 'Filter by Status',
        allUnits: 'All Units',
        allStatuses: 'All Statuses',
        noPositionsFound: 'No positions found',
        selectUnitFirst: 'Please select at least 1 unit',
        positionCreatedSuccess: 'Position created successfully',
        positionUpdatedSuccess: 'Position updated successfully',
        positionDeletedSuccess: 'Position deleted successfully',
        totalPositions: 'Total Positions',
        totalEmployees: 'Employees',
        applicantPositions: 'Applicants',
        activePositions: 'Active',
        allTypes: 'All Types',
        employee: 'Employee',
        applicant: 'Applicant',
        showing: 'Showing',
        viewMode: 'View',
        listView: 'List',
        gridView: 'Grid',
        noUnit: 'No Unit',
        people: 'people',
        latest: 'Latest',
        nameAZ: 'Name A-Z',
        nameZA: 'Name Z-A',
        confirmDeletePosition: 'Are you sure you want to delete this position?',

        // Multi-select
        selected: 'Selected',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        searchAndSelect: 'Search and Select',
        notSelected: 'Not selected yet',
        totalItems: 'Total',
        items: 'items',
        units: 'units',
        total: 'Total',

        // Levels
        allLevels: 'All Levels',
        company: 'Company',
        branch: 'Branch',
        office: 'Office',

        // Example usage
        exampleUsage: 'Usage Example',
        usageExample: 'Example',

        // Create position page
        addPositionToOrg: 'Add Position to Organization',
        positionNamePlaceholder: 'e.g. Software Engineer, System Analyst, Department Manager',
        positionDescriptionPlaceholder: 'Brief description about this position',
        noUnitSelected: 'No unit selected - Please search and select',
        searchAndSelectUnit: 'Search and select unit...',
        noUnitsFound: 'No units found',
        searchAndSelectUnitHelp: 'Search and click to select unit - Multiple units can be selected',
        usageExample1: 'Select position "Software Engineer" and select units: IT Division, Development Department, Digital Division',
        usageExample2: 'System will create "Software Engineer" position for all 3 units at once',
        pleaseSelectUnit: 'Please select at least 1 unit',
        error: 'An error occurred',

        // View position page
        employeesInPosition: 'Employees in This Position',
        statistics: 'Statistics',
        employees: 'Employees',
        management: 'Management',
        deletePositionSuccess: 'Position deleted successfully',

        // Error messages
        errorLoadingPositions: 'Error loading position data',
        errorLoadingForm: 'Error loading form',
        errorLoadingData: 'Error loading data',
        errorCreatingPosition: 'Error creating position',
        errorUpdatingPosition: 'Error updating position',
        errorDeletingPosition: 'Error deleting position',
        positionNotFound: 'Position not found',
        pleaseEnterPositionName: 'Please enter position name',
        cannotCreatePosition: 'Cannot create position',
        positionCreatedInUnits: 'Position created successfully in all {count} units',
        positionCreatedPartial: 'Position created in {success} units, failed in {failed} units',

        // Footer & Contact
        contact: 'Contact',
        menu: 'Menu',
        company: 'About Us',
        quickLinks: 'Quick Links',
        followUs: 'Follow Us',
        companyDescription: 'Learning Management System of Rukchai Hongyen Co., Ltd. to continuously develop employee knowledge and skills, enhance competitiveness and sustainable growth.',
        address: 'Address',
        phone: 'Phone',
        email: 'Email',
        workingHours: 'Working Hours',
        workingTime: 'Monday - Friday 8:00 AM - 5:00 PM',
        allRightsReserved: 'All rights reserved',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
        help: 'Help',
        support: 'Support',
        faq: 'FAQ',
        learningResources: 'Learning Resources',
        elearning: 'E-Learning Platform',
        careers: 'Careers'
    }
};

function getTranslation(lang, key) {
    const keys = key.split('.');
    let value = translations[lang] || translations.th;

    for (const k of keys) {
        value = value[k];
        if (!value) return key; // Return key if translation not found
    }

    return value;
}

function getCurrentLanguage(req) {
    // Debug logging
    console.log('🔍 Getting current language...');
    console.log('  Session language:', req.session?.language);
    console.log('  Cookies:', {
        ruxchai_language: req.cookies?.ruxchai_language,
        language: req.cookies?.language,
        preferred_language: req.cookies?.preferred_language
    });

    // Check session first
    if (req.session && req.session.language) {
        console.log('  ✅ Using session language:', req.session.language);
        return req.session.language;
    }

    // Check cookies (multiple possible names for backward compatibility)
    if (req.cookies) {
        if (req.cookies.ruxchai_language) {
            console.log('  ✅ Using ruxchai_language cookie:', req.cookies.ruxchai_language);
            // Save to session for this request
            if (req.session) {
                req.session.language = req.cookies.ruxchai_language;
            }
            return req.cookies.ruxchai_language;
        }
        if (req.cookies.language) {
            console.log('  ✅ Using language cookie:', req.cookies.language);
            // Save to session for this request
            if (req.session) {
                req.session.language = req.cookies.language;
            }
            return req.cookies.language;
        }
        if (req.cookies.preferred_language) {
            console.log('  ✅ Using preferred_language cookie:', req.cookies.preferred_language);
            // Save to session for this request
            if (req.session) {
                req.session.language = req.cookies.preferred_language;
            }
            return req.cookies.preferred_language;
        }
    }

    // Always default to Thai - no browser language detection
    console.log('  ⚠️ No language found, defaulting to Thai');
    return 'th';
}

// Language middleware for Express
function languageMiddleware(req, res, next) {
    const currentLang = getCurrentLanguage(req);

    // Set language in request for easy access
    req.language = currentLang;

    // Set language in response locals for template access
    res.locals.language = currentLang;
    res.locals.currentLanguage = currentLang;

    // Add translation helper to response locals
    res.locals.t = (key, defaultValue = key) => {
        return getTranslation(currentLang, key) || defaultValue;
    };

    // Add language info to locals
    res.locals.languageInfo = {
        current: currentLang,
        name: currentLang === 'th' ? 'ไทย' : 'English',
        flag: currentLang
    };

    // Override res.render to ensure translation function is always available
    const originalRender = res.render;
    res.render = function(view, options = {}, callback) {
        // Ensure translation function is always included
        options.t = options.t || res.locals.t;
        options.language = options.language || currentLang;
        options.currentLanguage = options.currentLanguage || currentLang;

        return originalRender.call(this, view, options, callback);
    };

    next();
}

module.exports = {
    translations,
    getTranslation,
    getCurrentLanguage,
    languageMiddleware
};