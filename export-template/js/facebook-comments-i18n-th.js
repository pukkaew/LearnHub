/**
 * Thai Language Pack for Facebook-Style Comments
 * ภาษาไทยสำหรับระบบความคิดเห็นแบบ Facebook
 */

const FacebookCommentsThaiLang = {
    like: 'ถูกใจ',
    love: 'รักเลย',
    haha: 'ฮ่าๆ',
    wow: 'ว้าว',
    sad: 'เศร้า',
    angry: 'โกรธ',
    reply: 'ตอบกลับ',
    edit: 'แก้ไข',
    delete: 'ลบ',
    pin: 'ปักหมุด',
    unpin: 'เลิกปักหมุด',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    post: 'โพสต์',
    comments: 'ความคิดเห็น',
    writeComment: 'เขียนความคิดเห็น...',
    writeReply: 'เขียนตอบกลับ...',
    noComments: 'ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นสิ!',
    loadMore: 'โหลดความคิดเห็นเพิ่มเติม',
    pinnedBy: 'ปักหมุดโดยผู้สอน',
    instructor: 'ผู้สอน',
    justNow: 'เมื่อสักครู่',
    minutesAgo: ' นาที',
    hoursAgo: ' ชม.',
    daysAgo: ' วัน',
    newest: 'ใหม่ล่าสุด',
    oldest: 'เก่าสุด',
    popular: 'ยอดนิยม',
    replies: 'การตอบกลับ',
    confirmDelete: 'ต้องการลบความคิดเห็นนี้หรือไม่?',
    successPost: 'โพสต์สำเร็จ!',
    successReply: 'ตอบกลับสำเร็จ!',
    successEdit: 'แก้ไขสำเร็จ!',
    successDelete: 'ลบสำเร็จ!',
    successPin: 'ปักหมุดสำเร็จ!',
    error: 'เกิดข้อผิดพลาด'
};

// Usage: FacebookComments.init({ i18n: FacebookCommentsThaiLang })

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FacebookCommentsThaiLang;
}
