const fs = require('fs');

// Read detail.ejs
let content = fs.readFileSync('D:/App/LearnHub/views/courses/detail.ejs', 'utf8');

// Fix remaining hardcoded Thai strings
const replacements = [
    // Target audience section - fix the ones that were missed
    ["`<span class=\"font-semibold\">กลุ่มเป้าหมาย:</span>`", "`<span class=\"font-semibold\">${t('targetGroup')}:</span>`"],
    ["`${posCount} ตำแหน่ง`", "`${posCount} ${t('positions')}`"],
    ["`${deptCount} หน่วยงาน`", "`${deptCount} ${t('departments')}`"],
    ["'(ทั้งหมด)'", "t('all')"],
    ["`(ทั้งหมด)`", "`(${t('all')})`"],
    ["<strong>เงื่อนไข:</strong> คุณสามารถเข้าเรียนได้หากอยู่ใน<strong>ตำแหน่ง</strong>ที่ระบุ <strong>หรือ</strong> อยู่ใน<strong>หน่วยงาน</strong>ที่ระบุ", "ELIGIBILITY_CONDITION_PLACEHOLDER"],
    ["`\n                        <strong>เงื่อนไข:</strong> คุณสามารถเข้าเรียนได้หากอยู่ใน<strong>ตำแหน่ง</strong>ที่ระบุ <strong>หรือ</strong> อยู่ใน<strong>หน่วยงาน</strong>ที่ระบุ\n                    `", "`${t('eligibilityCondition')}`"],
    ["`\n                        เฉพาะผู้ที่ดำรงตำแหน่งที่ระบุข้างต้น (ทุกหน่วยงาน)\n                    `", "`${t('positionsOnly')}`"],
    ["`\n                        เฉพาะผู้ที่อยู่ในหน่วยงานที่ระบุข้างต้น (ทุกตำแหน่ง)\n                    `", "`${t('departmentsOnly')}`"],
    [">เปิดกว้างสำหรับทุกคน</div>", ">${t('openForEveryone')}</div>"],
    [">ไม่จำกัดตำแหน่งหรือหน่วยงาน</div>", ">${t('noRestrictions')}</div>"],

    // Enrollment buttons section
    ["></i>เข้าเรียน\n                </a>", "></i>${t('enterCourse')}\n                </a>"],
    ["></i>ให้คะแนนคอร์ส\n                    </button>", "></i>${t('rateCourse')}\n                    </button>"],
    ["></i>ให้คะแนนคอร์ส\n                </button>", "></i>${t('rateCourse')}\n                </button>"],
    ["></i>แก้ไขคอร์ส\n                    </a>", "></i>${t('editCourse')}\n                    </a>"],
    ["></i>แก้ไขคอร์ส\n                </a>", "></i>${t('editCourse')}\n                </a>"],
    [">คุณได้ลงทะเบียนเรียนแล้ว</p>", ">${t('enrolled')}</p>"],
    [">เรียนจบแล้ว</p>", ">${t('courseCompleted')}</p>"],
    ["></i>ดาวน์โหลดใบประกาศนียบัตร\n                </a>", "></i>${t('downloadCertificate')}\n                </a>"],
    [">เริ่มเรียนคอร์สนี้</p>", ">${t('startCourse')}</p>"],
    ["></i>ลงทะเบียนเรียน\n                </button>", "></i>${t('enrollInCourse')}\n                </button>"],

    // Discussion section
    [">ยังไม่มีการอภิปราย</p>", ">${t('noDiscussions')}</p>"],
    [">เริ่มการอภิปราย</button>", ">${t('startDiscussion')}</button>"],
    ["></i>ตอบกลับ\n                        </button>", "></i>${t('reply')}\n                        </button>"],
    [" ตอบกลับ</span>", " ${t('reply')}</span>"],

    // Reviews section - updateReviewsDisplay missed one
    ["'<p class=\"text-gray-500\">ยังไม่มีรีวิว</p>'", "`<p class=\"text-gray-500\">${t('noReviews')}</p>`"],

    // Curriculum section - fix "นาที" that appears in different contexts
    ["} นาที</span>", "} ${t('minutes')}</span>"],
    ["`${lesson.duration || lesson.duration_minutes || '0'} นาที</span>", "`${lesson.duration || lesson.duration_minutes || '0'} ${t('minutes')}</span>"],

    // Download button fix
    ["></i>ดาวน์โหลด\n                </a>", "></i>${t('download')}\n                </a>"]
];

// Apply each replacement
let changeCount = 0;
replacements.forEach(([oldStr, newStr], idx) => {
    const oldContent = content;
    if (content.includes(oldStr)) {
        content = content.split(oldStr).join(newStr);
        if (oldContent !== content) {
            changeCount++;
            console.log(`✓ ${idx + 1}. Replaced: ${oldStr.substring(0, 60)}...`);
        }
    } else {
        console.log(`⚠ ${idx + 1}. Not found: ${oldStr.substring(0, 60)}...`);
    }
});

// Write back to file
fs.writeFileSync('D:/App/LearnHub/views/courses/detail.ejs', content, 'utf8');

console.log(`\n✅ Complete! Made ${changeCount} additional replacements.`);
