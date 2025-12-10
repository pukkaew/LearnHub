const { poolPromise, sql } = require('./config/database');

const sampleArticles = [
    {
        title: 'แนวทางการพัฒนาทักษะด้านเทคโนโลยีในยุคดิจิทัล',
        slug: 'digital-skills-development',
        content: `<h2>ทำไมทักษะด้านเทคโนโลยีถึงสำคัญ?</h2>
<p>ในยุคดิจิทัลที่เทคโนโลยีมีการพัฒนาอย่างรวดเร็ว การพัฒนาทักษะด้านเทคโนโลยีถือเป็นสิ่งจำเป็นสำหรับบุคลากรทุกระดับ</p>
<h3>ทักษะที่ควรพัฒนา</h3>
<ul>
<li>การใช้ซอฟต์แวร์สำนักงาน</li>
<li>ความเข้าใจเรื่อง Cloud Computing</li>
<li>การวิเคราะห์ข้อมูลเบื้องต้น</li>
<li>ความปลอดภัยทางไซเบอร์</li>
</ul>
<p>การลงทุนเวลาในการเรียนรู้เทคโนโลยีใหม่ๆ จะช่วยเพิ่มประสิทธิภาพในการทำงานและสร้างโอกาสในการเติบโตทางอาชีพ</p>`,
        excerpt: 'แนวทางและเทคนิคในการพัฒนาทักษะด้านเทคโนโลยีสำหรับบุคลากรในองค์กรยุคใหม่',
        category: 'technology',
        tags: 'digital,skills,technology,learning',
        status: 'published'
    },
    {
        title: 'เทคนิคการบริหารเวลาอย่างมีประสิทธิภาพ',
        slug: 'time-management-techniques',
        content: `<h2>ความสำคัญของการบริหารเวลา</h2>
<p>การบริหารเวลาที่ดีจะช่วยให้คุณทำงานได้มากขึ้นในเวลาที่น้อยลง และลดความเครียดในการทำงาน</p>
<h3>เทคนิคที่แนะนำ</h3>
<ol>
<li><strong>Pomodoro Technique</strong> - ทำงาน 25 นาที พัก 5 นาที</li>
<li><strong>Eisenhower Matrix</strong> - จัดลำดับความสำคัญของงาน</li>
<li><strong>Time Blocking</strong> - แบ่งเวลาเป็นช่วงๆ</li>
<li><strong>2-Minute Rule</strong> - งานไหนทำได้ใน 2 นาที ให้ทำทันที</li>
</ol>
<p>เลือกใช้เทคนิคที่เหมาะสมกับลักษณะงานและนิสัยของตัวเอง</p>`,
        excerpt: 'รวมเทคนิคการบริหารเวลาที่ช่วยเพิ่มประสิทธิภาพในการทำงานและลดความเครียด',
        category: 'management',
        tags: 'time-management,productivity,work-life-balance',
        status: 'published'
    },
    {
        title: 'หลักการออกแบบ UI/UX สำหรับผู้เริ่มต้น',
        slug: 'ui-ux-design-basics',
        content: `<h2>UI vs UX คืออะไร?</h2>
<p><strong>UI (User Interface)</strong> คือ ส่วนที่ผู้ใช้มองเห็นและโต้ตอบ เช่น ปุ่ม เมนู สี font</p>
<p><strong>UX (User Experience)</strong> คือ ประสบการณ์โดยรวมของผู้ใช้ในการใช้งานระบบ</p>
<h3>หลักการออกแบบพื้นฐาน</h3>
<ul>
<li>ความเรียบง่าย (Simplicity)</li>
<li>ความสม่ำเสมอ (Consistency)</li>
<li>การตอบสนอง (Feedback)</li>
<li>การเข้าถึงได้ (Accessibility)</li>
</ul>
<p>การออกแบบที่ดีจะช่วยให้ผู้ใช้สามารถใช้งานได้ง่ายและมีความพึงพอใจ</p>`,
        excerpt: 'เรียนรู้พื้นฐานการออกแบบ UI/UX ที่จะช่วยให้ระบบของคุณใช้งานง่ายและน่าใช้',
        category: 'design',
        tags: 'ui,ux,design,user-experience',
        status: 'published'
    },
    {
        title: 'กลยุทธ์การตลาดดิจิทัลในปี 2024',
        slug: 'digital-marketing-strategy-2024',
        content: `<h2>แนวโน้มการตลาดดิจิทัลที่ต้องจับตา</h2>
<p>การตลาดดิจิทัลมีการเปลี่ยนแปลงอย่างรวดเร็ว ธุรกิจต้องปรับตัวเพื่อให้ทันกับเทรนด์ใหม่ๆ</p>
<h3>กลยุทธ์ที่ควรให้ความสำคัญ</h3>
<ul>
<li><strong>Content Marketing</strong> - สร้างเนื้อหาที่มีคุณค่า</li>
<li><strong>Video Marketing</strong> - ใช้วิดีโอในการสื่อสาร</li>
<li><strong>Social Commerce</strong> - ขายของผ่านโซเชียลมีเดีย</li>
<li><strong>AI & Automation</strong> - ใช้ AI ในการทำการตลาด</li>
</ul>
<p>การวิเคราะห์ข้อมูลและการวัดผลลัพธ์ยังคงเป็นหัวใจสำคัญของการตลาดดิจิทัล</p>`,
        excerpt: 'อัพเดทกลยุทธ์และแนวโน้มการตลาดดิจิทัลล่าสุดที่ธุรกิจควรนำไปใช้',
        category: 'marketing',
        tags: 'marketing,digital,strategy,social-media',
        status: 'published'
    },
    {
        title: 'หลักการเงินส่วนบุคคลที่พนักงานควรรู้',
        slug: 'personal-finance-basics',
        content: `<h2>ทำไมต้องวางแผนการเงิน?</h2>
<p>การวางแผนการเงินที่ดีจะช่วยให้คุณมีความมั่นคงทางการเงินและบรรลุเป้าหมายในชีวิต</p>
<h3>หลักการเงินพื้นฐาน</h3>
<ol>
<li><strong>งบประมาณ</strong> - ติดตามรายรับรายจ่าย</li>
<li><strong>เงินฉุกเฉิน</strong> - สำรองไว้ 3-6 เดือน</li>
<li><strong>การออม</strong> - ออมอย่างน้อย 20% ของรายได้</li>
<li><strong>การลงทุน</strong> - กระจายความเสี่ยง</li>
<li><strong>การประกัน</strong> - ปกป้องความเสี่ยง</li>
</ol>
<p>เริ่มต้นจากการทำงบประมาณและสร้างนิสัยการออมอย่างสม่ำเสมอ</p>`,
        excerpt: 'พื้นฐานการบริหารการเงินส่วนบุคคลที่จะช่วยสร้างความมั่นคงทางการเงิน',
        category: 'finance',
        tags: 'finance,savings,investment,budgeting',
        status: 'published'
    },
    {
        title: 'การพัฒนาทักษะการสื่อสารในที่ทำงาน',
        slug: 'workplace-communication-skills',
        content: `<h2>ความสำคัญของการสื่อสารที่ดี</h2>
<p>การสื่อสารที่ดีเป็นพื้นฐานของการทำงานเป็นทีมที่มีประสิทธิภาพและช่วยลดความขัดแย้ง</p>
<h3>ทักษะการสื่อสารที่ควรพัฒนา</h3>
<ul>
<li><strong>Active Listening</strong> - การฟังอย่างตั้งใจ</li>
<li><strong>Clear Expression</strong> - การสื่อสารอย่างชัดเจน</li>
<li><strong>Non-verbal Communication</strong> - ภาษากาย</li>
<li><strong>Written Communication</strong> - การเขียนอย่างมืออาชีพ</li>
</ul>
<p>ฝึกฝนการสื่อสารอย่างสม่ำเสมอจะช่วยพัฒนาความสัมพันธ์ในที่ทำงาน</p>`,
        excerpt: 'เรียนรู้ทักษะการสื่อสารที่จะช่วยพัฒนาการทำงานเป็นทีมและความสัมพันธ์ในองค์กร',
        category: 'development',
        tags: 'communication,soft-skills,teamwork',
        status: 'published'
    }
];

async function seedArticles() {
    try {
        const pool = await poolPromise;

        // Get first user as author
        const userResult = await pool.request().query('SELECT TOP 1 user_id FROM users');
        if (userResult.recordset.length === 0) {
            console.log('No users found. Please create a user first.');
            process.exit(1);
        }
        const authorId = userResult.recordset[0].user_id;
        console.log('Using author_id:', authorId);

        // Check existing articles
        const countResult = await pool.request().query('SELECT COUNT(*) as cnt FROM articles');
        console.log('Existing articles:', countResult.recordset[0].cnt);

        // Insert articles
        for (const article of sampleArticles) {
            try {
                await pool.request()
                    .input('title', sql.NVarChar(200), article.title)
                    .input('slug', sql.NVarChar(200), article.slug)
                    .input('content', sql.NVarChar(sql.MAX), article.content)
                    .input('excerpt', sql.NVarChar(500), article.excerpt)
                    .input('authorId', sql.Int, authorId)
                    .input('category', sql.NVarChar(100), article.category)
                    .input('tags', sql.NVarChar(500), article.tags)
                    .input('status', sql.NVarChar(50), article.status)
                    .query(`
                        INSERT INTO articles (
                            title, slug, content, excerpt, author_id,
                            category, tags, featured_image, status,
                            views_count, likes_count, comments_enabled,
                            published_at, created_at, updated_at
                        ) VALUES (
                            @title, @slug, @content, @excerpt, @authorId,
                            @category, @tags, NULL, @status,
                            0, 0, 1,
                            GETDATE(), GETDATE(), GETDATE()
                        )
                    `);
                console.log('Created article:', article.title);
            } catch (err) {
                if (err.message.includes('duplicate') || err.message.includes('UNIQUE')) {
                    console.log('Article already exists:', article.title);
                } else {
                    console.error('Error creating article:', article.title, err.message);
                }
            }
        }

        // Show final count
        const finalCount = await pool.request().query('SELECT COUNT(*) as cnt FROM articles');
        console.log('\nTotal articles after seed:', finalCount.recordset[0].cnt);

        console.log('\nSeeding completed!');
    } catch (error) {
        console.error('Seeding error:', error.message);
    }
    process.exit(0);
}

seedArticles();
