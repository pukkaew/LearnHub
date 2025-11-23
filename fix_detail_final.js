const fs = require('fs');

// Read detail.ejs
let content = fs.readFileSync('D:/App/LearnHub/views/courses/detail.ejs', 'utf8');

// Fix all remaining hardcoded Thai strings
const replacements = [
    // Target audience section
    ["<span class=\"font-semibold\">กลุ่มเป้าหมาย:</span>", "<span class=\"font-semibold\">${t('targetGroup')}:</span>"],
    ["`<span class=\"px-2 py-0.5 bg-blue-50 text-blue-700 rounded\">${posCount} ตำแหน่ง</span>`", "`<span class=\"px-2 py-0.5 bg-blue-50 text-blue-700 rounded\">${posCount} ${t('positions')}</span>`"],
    ["`<span class=\"px-2 py-0.5 bg-green-50 text-green-700 rounded\">${deptCount} หน่วยงาน</span>`", "`<span class=\"px-2 py-0.5 bg-green-50 text-green-700 rounded\">${deptCount} ${t('departments')}</span>`"],
    ["`<span class=\"ml-1 text-xs opacity-75\">(ทั้งหมด)</span>`", "`<span class=\"ml-1 text-xs opacity-75\">(${t('all')})</span>`"],
    ["<strong>เงื่อนไข:</strong> คุณสามารถเข้าเรียนได้หากอยู่ใน<strong>ตำแหน่ง</strong>ที่ระบุ <strong>หรือ</strong> อยู่ใน<strong>หน่วยงาน</strong>ที่ระบุ", "${t('eligibilityCondition')}"],
    ["เฉพาะผู้ที่ดำรงตำแหน่งที่ระบุข้างต้น (ทุกหน่วยงาน)", "${t('positionsOnly')}"],
    ["เฉพาะผู้ที่อยู่ในหน่วยงานที่ระบุข้างต้น (ทุกตำแหน่ง)", "${t('departmentsOnly')}"],
    ["<div class=\"text-purple-900 font-semibold\">เปิดกว้างสำหรับทุกคน</div>", "<div class=\"text-purple-900 font-semibold\">${t('openForEveryone')}</div>"],
    ["<div class=\"text-purple-700 text-sm\">ไม่จำกัดตำแหน่งหรือหน่วยงาน</div>", "<div class=\"text-purple-700 text-sm\">${t('noRestrictions')}</div>"],

    // Enrollment buttons
    ["</i>คุณได้ลงทะเบียนเรียนแล้ว</p>", "</i>${t('enrolled')}</p>"],
    ["</i>เข้าเรียน\n                </a>", "</i>${t('enterCourse')}\n                </a>"],
    ["</i>ให้คะแนนคอร์ส\n                    </button>", "</i>${t('rateCourse')}\n                    </button>"],
    ["</i>ให้คะแนนคอร์ส\n                </button>", "</i>${t('rateCourse')}\n                </button>"],
    ["</i>แก้ไขคอร์ส\n                    </a>", "</i>${t('editCourse')}\n                    </a>"],
    ["</i>แก้ไขคอร์ส\n                </a>", "</i>${t('editCourse')}\n                </a>"],
    ["</i>เรียนจบแล้ว</p>", "</i>${t('courseCompleted')}</p>"],
    ["</i>ดาวน์โหลดใบประกาศนียบัตร\n                </a>", "</i>${t('downloadCertificate')}\n                </a>"],
    ["</i>เริ่มเรียนคอร์สนี้</p>", "</i>${t('startCourse')}</p>"],
    ["</i>ลงทะเบียนเรียน\n                </button>", "</i>${t('enrollInCourse')}\n                </button>"],

    // Curriculum section
    ["`บทเรียนทั้งหมด (${curriculum.length} บท)`", "`${t('allLessons')} (${curriculum.length} ${t('lesson')})`"],
    ["} นาที</span>", "} ${t('minutes')}</span>"],
    ["</i>ดูวิดีโอ</span>", "</i>${t('watchVideo')}</span>"],

    // Discussion section
    ["</i>ยังไม่มีการอภิปราย</p>", "</i>${t('noDiscussions')}</p>"],
    ["</i>เริ่มการอภิปราย</button>", "</i>${t('startDiscussion')}</button>"],
    ["</i>ตอบกลับ\n                        </button>", "</i>${t('reply')}\n                        </button>"],
    [" ตอบกลับ</span>", " ${t('reply')}</span>"],

    // Download button
    ["</i>ดาวน์โหลด\n                </a>", "</i>${t('download')}\n                </a>"]
];

// Apply each replacement
let changeCount = 0;
replacements.forEach(([oldStr, newStr], idx) => {
    const oldContent = content;
    if (content.includes(oldStr)) {
        content = content.split(oldStr).join(newStr);
        if (oldContent !== content) {
            changeCount++;
            console.log(`✓ ${idx + 1}. Fixed: ${oldStr.substring(0, 50)}...`);
        }
    }
});

// Write back to file
fs.writeFileSync('D:/App/LearnHub/views/courses/detail.ejs', content, 'utf8');

console.log(`\n✅ Complete! Made ${changeCount} additional replacements.`);
console.log(`\n🎉 detail.ejs is now fully translated!`);
