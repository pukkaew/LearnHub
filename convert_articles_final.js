const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, 'views', 'articles');

//  ==========  detail.ejs ==========
const detailPath = path.join(articlesDir, 'detail.ejs');
let detailContent = fs.readFileSync(detailPath, 'utf8');

detailContent = detailContent.replaceAll('<span id="authorArticles">บทความ: 0</span>', '<span id="authorArticles"><%= t(\'articlesLabel\') %>0</span>');
detailContent = detailContent.replaceAll('<span id="authorFollowers">ผู้ติดตาม: 0</span>', '<span id="authorFollowers"><%= t(\'followersLabel\') %>0</span>');
detailContent = detailContent.replaceAll('ติดตาม\n                        </button>', '<%= t(\'follow\') %>\n                        </button>');
detailContent = detailContent.replaceAll('/1000 ตัวอักษร', '/1000 <%= t(\'characters\') %>');
detailContent = detailContent.replaceAll('ส่งความคิดเห็น\n                            </button>', '<%= t(\'submitComment\') %>\n                            </button>');
detailContent = detailContent.replaceAll('โหลดความคิดเห็นเพิ่มเติม\n                        </button>', '<%= t(\'loadMoreComments\') %>\n                        </button>');
detailContent = detailContent.replaceAll('คัดลอก\n                        </button>', '<%= t(\'copy\') %>\n                        </button>');
detailContent = detailContent.replaceAll('${article.read_time || 5} นาที', '${article.read_time || 5} <%= t(\'minutes\') %>');
detailContent = detailContent.replaceAll('`บทความ: ${article.author_articles || 0}`', '`<%= t(\'articlesLabel\') %>${article.author_articles || 0}`');
detailContent = detailContent.replaceAll('`ผู้ติดตาม: ${article.author_followers || 0}`', '`<%= t(\'followersLabel\') %>${article.author_followers || 0}`');

fs.writeFileSync(detailPath, detailContent, 'utf8');
console.log('✓ detail.ejs updated');

// ========== index.ejs ==========
const indexPath = path.join(articlesDir, 'index.ejs');
let indexContent = fs.readFileSync(indexPath, 'utf8');

indexContent = indexContent.replaceAll('แสดง <span', '<%= t(\'showing\') %><span');
indexContent = indexContent.replaceAll('</span> บทความ', '</span> <%= t(\'articlesText\') %>');
indexContent = indexContent.replaceAll('>หัวข้อบทความ *<', '><%= t(\'articleTitle\') %> *<');
indexContent = indexContent.replaceAll('>หมวดหมู่ *<', '><%= t(\'category\') %> *<');
indexContent = indexContent.replaceAll('>เนื้อหาบทความ *<', '><%= t(\'articleContent\') %> *<');
indexContent = indexContent.replaceAll('ยกเลิก\n                        </button>', '<%= t(\'cancel\') %>\n                        </button>');
indexContent = indexContent.replaceAll('บันทึกบทความ\n                        </button>', '<%= t(\'saveArticle\') %>\n                        </button>');

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('✓ index.ejs updated');

console.log('\n✓ All remaining Thai strings converted!');
