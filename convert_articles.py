#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Article files i18n conversion script
Converts all Thai text in article view files to i18n keys
"""

import re
import os

# Article translation mappings (Thai -> key)
ARTICLE_TRANSLATIONS = {
    # edit.ejs
    'แก้ไขบทความ': 'editArticle',
    'ปรับปรุงเนื้อหาบทความของคุณ': 'updateArticleContent',
    'กลับไปหน้าบทความ': 'backToArticles',
    'แก้ไขเนื้อหา': 'editContent',
    'อัปเดตข้อมูลบทความของคุณ': 'updateArticleData',
    'ดูตัวอย่าง': 'preview',
    'บันทึก': 'save',
    'หัวข้อบทความ': 'articleTitle',
    'สรุปเนื้อหา': 'summary',
    'สรุปสั้นๆ ของบทความ...': 'briefSummaryOfArticle',
    'เนื้อหาบทความ': 'articleContent',
    'แท็ก': 'tags',
    'แยกแท็กด้วยเครื่องหมายจุลภาค เช่น javascript, programming, tutorial': 'separateTagsWithComma',
    'แยกแท็กด้วยเครื่องหมายจุลภาค': 'separateTagsWithCommaShort',
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
    'รองรับ JPG, PNG, GIF (สูงสุด 5MB)': 'supportedImageFormats',
    'การตั้งค่า SEO': 'seoSettings',
    'คำอธิบายสำหรับ SEO': 'seoDescription',
    'คำอธิบายสำหรับเครื่องมือค้นหา...': 'descriptionForSearchEngines',
    'ตัวอักษร': 'characters',
    'จะใช้เป็น URL ของบทความ': 'willBeUsedAsArticleURL',
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
    'คุณแน่ใจหรือไม่ที่จะยกเลิก? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป': 'confirmCancelUnsavedChanges',
    'ไม่พบบทความที่ต้องการแก้ไข': 'articleNotFoundForEdit',
    'เกิดข้อผิดพลาดในการโหลดข้อมูล': 'errorLoadingData',
    'บันทึกการแก้ไขเรียบร้อยแล้ว': 'changesSavedSuccessfully',
    'เกิดข้อผิดพลาดในการบันทึก': 'errorSaving',
    'คุณแน่ใจหรือไม่ที่จะลบบทความนี้? การกระทำนี้ไม่สามารถยกเลิกได้': 'confirmDeleteArticle',
    'ลบบทความเรียบร้อยแล้ว': 'articleDeletedSuccessfully',
    'เกิดข้อผิดพลาดในการลบ': 'errorDeleting',
    'บันทึกอัตโนมัติ': 'autoSaved',
    'นาที': 'minutes',

    # detail.ejs
    'ไม่พบบทความที่ต้องการ': 'articleNotFound',
    'เกิดข้อผิดพลาดในการโหลดบทความ': 'errorLoadingArticle',
    'เผยแพร่แล้ว': 'publishedStatus',
    'ถูกใจ': 'like',
    'แชร์': 'share',
    'บันทึกบทความ': 'saveArticle',
    'เกี่ยวกับผู้เขียน': 'aboutAuthor',
    'บทความ: ': 'articlesCount',
    'ผู้ติดตาม: ': 'followersCount',
    'ติดตาม': 'follow',
    'เรียงตาม: ใหม่ที่สุด': 'sortByNewest',
    'แสดงความคิดเห็น...': 'leaveComment',
    'ส่งความคิดเห็น': 'submitComment',
    'โหลดความคิดเห็นเพิ่มเติม': 'loadMoreComments',
    'สารบัญ': 'tableOfContents',
    'ไม่มีหัวข้อ': 'noHeadings',
    'บทความที่เกี่ยวข้อง': 'relatedArticles',
    'ไม่มีบทความที่เกี่ยวข้อง': 'noRelatedArticles',
    'แท็กยอดนิยม': 'popularTags',
    'ไม่มีแท็กยอดนิยม': 'noPopularTags',
    'แชร์บทความ': 'shareArticle',
    'แชร์ไปยัง Facebook': 'shareToFacebook',
    'แชร์ไปยัง Twitter': 'shareToTwitter',
    'แชร์ไปยัง LINE': 'shareToLine',
    'คัดลอก': 'copy',
    'คัดลอกลิงก์เรียบร้อยแล้ว': 'linkCopiedSuccessfully',
    'ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!': 'noCommentsBeFirst',
    'ตอบกลับ': 'reply',
    'แก้ไข': 'edit',
    'ลบ': 'delete',
    'เพิ่มความคิดเห็นเรียบร้อยแล้ว': 'commentAddedSuccessfully',
    'เกิดข้อผิดพลาดในการส่งความคิดเห็น': 'errorSubmittingComment',
    'เพิ่มในรายการถูกใจแล้ว': 'addedToLikes',
    'ยกเลิกการถูกใจแล้ว': 'unliked',
    'บันทึกบทความแล้ว': 'articleSaved',
    'ยกเลิกการบันทึกแล้ว': 'articleUnsaved',
    'ติดตามผู้เขียนแล้ว': 'authorFollowed',
    'ยกเลิกการติดตามแล้ว': 'authorUnfollowed',
    'กำลังติดตาม': 'following',
    'ไม่มีแท็ก': 'noTags',
    'ยังไม่มีข้อมูลประวัติ': 'noBioAvailable',
    'เกิดข้อผิดพลาด': 'errorOccurred',

    # index.ejs
    'ศูนย์รวมความรู้และประสบการณ์จากผู้เชี่ยวชาญ': 'knowledgeSharingHub',
    'เขียนบทความใหม่': 'writeNewArticle',
    'บทความทั้งหมด': 'allArticles',
    'การดูทั้งหมด': 'totalViews',
    'ยอดไลค์ทั้งหมด': 'totalLikes',
    'ค้นหาบทความ...': 'searchArticles',
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
    'เกิดข้อผิดพลาดในการโหลดข้อมูล': 'errorLoadingData',
    'คุณแน่ใจหรือไม่ที่จะลบบทความนี้?': 'confirmDeleteThisArticle',
    'บันทึกบทความเรียบร้อยแล้ว': 'articleSavedSuccessfully',
    'เกิดข้อผิดพลาดในการบันทึก': 'errorSaving',
    'เลือกหมวดหมู่': 'selectCategory',
    'สรุปเนื้อหา': 'summary',
    'สรุปสั้นๆ ของบทความ...': 'briefSummaryOfArticle',
    'เนื้อหาบทความ': 'articleContent',
    'บันทึกเป็นร่าง': 'saveAsDraft',
    'เผยแพร่ทันที': 'publishNow',

    # create.ejs - already has English, only one Thai string found
    'ไทย (Thai)': 'thai'
}

def convert_file(filepath, translations):
    """Convert Thai strings in a file to i18n keys"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    replacements_made = 0

    # Sort by length (longest first) to avoid partial replacements
    sorted_translations = sorted(translations.items(), key=lambda x: len(x[0]), reverse=True)

    for thai_text, key in sorted_translations:
        # Escape special regex characters
        escaped_thai = re.escape(thai_text)

        # Pattern 1: In text content
        pattern1 = f'>{escaped_thai}<'
        replacement1 = f'><%=  t(\'{key}\') %><'
        if pattern1 in content:
            content = content.replace(pattern1, replacement1)
            replacements_made += 1

        # Pattern 2: In placeholders
        pattern2 = f'placeholder="{escaped_thai}"'
        replacement2 = f'placeholder="<%= t(\'{key}\') %>"'
        if pattern2 in content:
            content = content.replace(pattern2, replacement2)
            replacements_made += 1

        # Pattern 3: In JavaScript strings (single quotes)
        pattern3 = f"'{escaped_thai}'"
        replacement3 = f"'<%= t(\'{key}\') %>'"
        if pattern3 in content:
            content = content.replace(pattern3, replacement3)
            replacements_made += 1

        # Pattern 4: In button text (after icon)
        pattern4 = f'</i>{escaped_thai}'
        replacement4 = f'</i><%= t(\'{key}\') %>'
        if pattern4 in content:
            content = content.replace(pattern4, replacement4)
            replacements_made += 1

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ {filepath}: {replacements_made} replacements made")
        return True
    else:
        print(f"✗ {filepath}: No changes needed")
        return False

def main():
    base_path = r'D:\App\LearnHub\views\articles'
    files = ['edit.ejs', 'detail.ejs', 'index.ejs', 'create.ejs']

    print("Starting Article files i18n conversion...")
    print("=" * 60)

    total_files = 0
    for filename in files:
        filepath = os.path.join(base_path, filename)
        if os.path.exists(filepath):
            if convert_file(filepath, ARTICLE_TRANSLATIONS):
                total_files += 1
        else:
            print(f"! {filepath}: File not found")

    print("=" * 60)
    print(f"Conversion complete! {total_files} files modified.")
    print("\nNext step: Add translations to utils/languages.js")

if __name__ == '__main__':
    main()
