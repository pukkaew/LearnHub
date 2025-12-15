const fs = require('fs');
const path = 'D:/App/LearnHub/views/articles/detail.ejs';

let content = fs.readFileSync(path, 'utf8');

// Fix parent comment reply button to include user_id
const oldPattern = "toggleReplyForm(${comment.comment_id}, '${comment.user_name}')";
const newPattern = "toggleReplyForm(${comment.comment_id}, '${comment.user_name}', ${comment.user_id})";

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed: Added user_id to parent comment reply button');
} else if (content.includes(newPattern)) {
    console.log('Already fixed: user_id already included');
} else {
    console.log('Pattern not found - please check manually');
}
