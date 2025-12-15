const fs = require('fs');
const path = 'D:/App/LearnHub/views/articles/detail.ejs';

let content = fs.readFileSync(path, 'utf8');

// New Facebook-style createCommentItem function
const newCreateCommentItem = `// Create comment item - Facebook-style with Reactions
function createCommentItem(comment) {
    const replyCount = comment.replies ? comment.replies.length : 0;
    const hasReplies = replyCount > 0;
    const reactions = comment.reactions || { total: 0, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    const userReaction = comment.user_reaction;
    const reactionIcons = getReactionIcons(reactions);

    return \`
        <div class="comment-item mb-4" data-comment-id="\${comment.comment_id}">
            \${comment.is_pinned ? '<div class="flex items-center text-xs text-amber-600 mb-2 ml-12"><i class="fas fa-thumbtack mr-1"></i> ปักหมุดโดยผู้เขียน</div>' : ''}
            <div class="flex items-start gap-2">
                <!-- Avatar -->
                <img src="\${comment.user_avatar || '/images/default-avatar.png'}"
                     alt="\${comment.user_name}"
                     class="w-10 h-10 rounded-full flex-shrink-0 mt-0.5">

                <div class="flex-1 min-w-0">
                    <!-- Comment Bubble -->
                    <div class="inline-block max-w-[85%]">
                        <div class="bg-gray-100 rounded-2xl px-3 py-2 relative \${comment.is_pinned ? 'ring-2 ring-amber-200' : ''}">
                            <!-- Author name + badge -->
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="font-semibold text-[13px] text-gray-900 hover:underline cursor-pointer">\${comment.user_name}</span>
                                \${comment.is_author ? '<span class="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">ผู้เขียน</span>' : ''}
                            </div>
                            <!-- Comment text -->
                            <div id="comment-display-\${comment.comment_id}">
                                <p class="text-[15px] text-gray-900 whitespace-pre-wrap break-words">\${comment.content}</p>
                            </div>
                            <!-- Edit mode -->
                            <div id="comment-edit-\${comment.comment_id}" class="hidden">
                                <textarea id="comment-edit-textarea-\${comment.comment_id}" class="w-full p-2 border rounded-lg text-sm resize-none" rows="2">\${comment.content}</textarea>
                                <div class="flex gap-2 mt-2">
                                    <button onclick="cancelEditComment(\${comment.comment_id})" class="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded">ยกเลิก</button>
                                    <button onclick="saveEditComment(\${comment.comment_id})" class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">บันทึก</button>
                                </div>
                            </div>
                            <!-- Reactions badge -->
                            \${reactions.total > 0 ? \`
                                <div class="absolute -bottom-2.5 right-2 flex items-center bg-white rounded-full shadow px-1 py-0.5 border text-xs">
                                    \${reactionIcons}<span class="ml-0.5 text-gray-500">\${reactions.total}</span>
                                </div>
                            \` : ''}
                        </div>
                    </div>

                    <!-- Actions: Like · Reply · Time · More -->
                    <div class="flex items-center gap-1 mt-1 ml-3 text-xs">
                        <!-- Like with reaction popup -->
                        <div class="relative group">
                            <button onclick="toggleReaction(\${comment.comment_id}, '\${userReaction || 'like'}')"
                                    class="\${userReaction ? getReactionColor(userReaction) : 'text-gray-500 hover:text-gray-700'} font-semibold">
                                \${userReaction ? getReactionText(userReaction) : 'ถูกใจ'}
                            </button>
                            <div class="reaction-popup absolute bottom-full left-0 mb-2 hidden group-hover:flex bg-white rounded-full shadow-xl px-2 py-1.5 gap-1 border z-50">
                                <button onclick="event.stopPropagation(); toggleReaction(\${comment.comment_id}, 'like')" class="text-xl hover:scale-125 transition-transform" title="ถูกใจ">👍</button>
                                <button onclick="event.stopPropagation(); toggleReaction(\${comment.comment_id}, 'love')" class="text-xl hover:scale-125 transition-transform" title="รัก">❤️</button>
                                <button onclick="event.stopPropagation(); toggleReaction(\${comment.comment_id}, 'haha')" class="text-xl hover:scale-125 transition-transform" title="ฮ่าๆ">😂</button>
                                <button onclick="event.stopPropagation(); toggleReaction(\${comment.comment_id}, 'wow')" class="text-xl hover:scale-125 transition-transform" title="ว้าว">😮</button>
                                <button onclick="event.stopPropagation(); toggleReaction(\${comment.comment_id}, 'sad')" class="text-xl hover:scale-125 transition-transform" title="เศร้า">😢</button>
                                <button onclick="event.stopPropagation(); toggleReaction(\${comment.comment_id}, 'angry')" class="text-xl hover:scale-125 transition-transform" title="โกรธ">😡</button>
                            </div>
                        </div>
                        <span class="text-gray-400">·</span>
                        <button onclick="toggleReplyForm(\${comment.comment_id}, '\${comment.user_name}', \${comment.user_id})" class="text-gray-500 hover:text-gray-700 font-semibold">ตอบกลับ</button>
                        <span class="text-gray-400">·</span>
                        <span class="text-gray-400">\${formatTimeAgo(comment.created_at)}</span>
                        \${comment.can_edit ? \`<span class="text-gray-400">·</span><button onclick="editComment(\${comment.comment_id})" class="text-gray-500 hover:text-blue-500">แก้ไข</button>\` : ''}
                        \${comment.can_delete ? \`<span class="text-gray-400">·</span><button onclick="deleteComment(\${comment.comment_id})" class="text-gray-500 hover:text-red-500">ลบ</button>\` : ''}
                        \${comment.can_pin ? \`<span class="text-gray-400">·</span><button onclick="pinComment(\${comment.comment_id})" class="text-gray-500 hover:text-amber-500">\${comment.is_pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}</button>\` : ''}
                    </div>

                    <!-- Reply Form -->
                    <div id="reply-form-\${comment.comment_id}" class="hidden mt-3">
                        <div class="flex items-start gap-2">
                            <img src="<%= user?.profile_image || '/images/default-avatar.png' %>" class="w-8 h-8 rounded-full flex-shrink-0">
                            <div class="flex-1">
                                <div class="bg-gray-100 rounded-2xl px-3 py-2">
                                    <span id="reply-to-name-\${comment.comment_id}" class="text-blue-500 font-medium text-sm"></span>
                                    <textarea id="reply-textarea-\${comment.comment_id}"
                                              class="w-full bg-transparent text-sm resize-none outline-none"
                                              placeholder="เขียนตอบกลับ..." rows="1"
                                              oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
                                </div>
                                <div class="flex justify-end gap-2 mt-1">
                                    <button onclick="cancelReply(\${comment.comment_id})" class="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-full">ยกเลิก</button>
                                    <button onclick="submitReply(\${comment.comment_id})" class="px-3 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600">ตอบกลับ</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Replies Section -->
                    \${hasReplies ? \`
                        <div class="mt-2">
                            <button onclick="toggleReplies(\${comment.comment_id})" id="toggle-replies-btn-\${comment.comment_id}"
                                    class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium ml-1">
                                <i class="fas fa-reply fa-flip-horizontal text-xs"></i>
                                <span id="toggle-replies-text-\${comment.comment_id}">\${replyCount} การตอบกลับ</span>
                                <i id="toggle-replies-icon-\${comment.comment_id}" class="fas fa-chevron-down text-[10px] transition-transform"></i>
                            </button>
                            <div id="replies-container-\${comment.comment_id}" class="hidden mt-2 space-y-2 ml-2 pl-3 border-l-2 border-gray-200">
                                \${comment.replies.map(reply => createReplyItem(reply, comment)).join('')}
                            </div>
                        </div>
                    \` : ''}
                </div>
            </div>
        </div>
    \`;
}`;

// New Facebook-style createReplyItem function
const newCreateReplyItem = `// Create reply item - Facebook style
function createReplyItem(reply, parentComment) {
    const replyId = reply.comment_id || reply.reply_id;
    const reactions = reply.reactions || { total: 0, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    const userReaction = reply.user_reaction;
    const reactionIcons = getReactionIcons(reactions);

    // Determine @mention: show reply_to_name if exists, otherwise show parent's name
    const mentionName = reply.reply_to_name || (parentComment ? parentComment.user_name : '');
    const showMention = mentionName && mentionName !== reply.user_name;

    return \`
        <div class="reply-item flex items-start gap-2" data-reply-id="\${replyId}">
            <img src="\${reply.user_avatar || '/images/default-avatar.png'}"
                 alt="\${reply.user_name}"
                 class="w-8 h-8 rounded-full flex-shrink-0 mt-0.5">

            <div class="flex-1 min-w-0">
                <!-- Reply Bubble -->
                <div class="inline-block max-w-[85%]">
                    <div class="bg-gray-100 rounded-2xl px-3 py-2 relative">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-semibold text-[13px] text-gray-900 hover:underline cursor-pointer">\${reply.user_name}</span>
                            \${reply.is_author ? '<span class="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">ผู้เขียน</span>' : ''}
                        </div>
                        <!-- Reply Display -->
                        <div id="reply-display-\${replyId}">
                            <p class="text-[15px] text-gray-900 break-words">
                                \${showMention ? \`<a href="#" class="text-blue-500 font-medium hover:underline">@\${mentionName}</a> \` : ''}
                                <span class="whitespace-pre-wrap">\${reply.content}</span>
                            </p>
                        </div>
                        <!-- Edit mode -->
                        <div id="reply-edit-\${replyId}" class="hidden">
                            <textarea id="reply-edit-textarea-\${replyId}" class="w-full p-2 border rounded text-sm resize-none" rows="2">\${reply.content}</textarea>
                            <div class="flex gap-2 mt-1">
                                <button onclick="cancelEditReply(\${replyId}, \${parentComment ? parentComment.comment_id : reply.parent_comment_id})" class="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">ยกเลิก</button>
                                <button onclick="saveEditReply(\${replyId}, \${parentComment ? parentComment.comment_id : reply.parent_comment_id})" class="px-2 py-1 text-xs bg-blue-500 text-white rounded">บันทึก</button>
                            </div>
                        </div>
                        <!-- Reactions badge -->
                        \${reactions.total > 0 ? \`
                            <div class="absolute -bottom-2 right-1 flex items-center bg-white rounded-full shadow px-1 py-0.5 border text-[10px]">
                                \${reactionIcons}<span class="ml-0.5 text-gray-500">\${reactions.total}</span>
                            </div>
                        \` : ''}
                    </div>
                </div>

                <!-- Reply Actions -->
                <div class="flex items-center gap-1 mt-1 ml-3 text-xs">
                    <div class="relative group">
                        <button onclick="toggleReaction(\${replyId}, '\${userReaction || 'like'}')"
                                class="\${userReaction ? getReactionColor(userReaction) : 'text-gray-500 hover:text-gray-700'} font-semibold">
                            \${userReaction ? getReactionText(userReaction) : 'ถูกใจ'}
                        </button>
                        <div class="reaction-popup absolute bottom-full left-0 mb-2 hidden group-hover:flex bg-white rounded-full shadow-xl px-2 py-1 gap-0.5 border z-50">
                            <button onclick="event.stopPropagation(); toggleReaction(\${replyId}, 'like')" class="text-lg hover:scale-125 transition-transform">👍</button>
                            <button onclick="event.stopPropagation(); toggleReaction(\${replyId}, 'love')" class="text-lg hover:scale-125 transition-transform">❤️</button>
                            <button onclick="event.stopPropagation(); toggleReaction(\${replyId}, 'haha')" class="text-lg hover:scale-125 transition-transform">😂</button>
                            <button onclick="event.stopPropagation(); toggleReaction(\${replyId}, 'wow')" class="text-lg hover:scale-125 transition-transform">😮</button>
                            <button onclick="event.stopPropagation(); toggleReaction(\${replyId}, 'sad')" class="text-lg hover:scale-125 transition-transform">😢</button>
                            <button onclick="event.stopPropagation(); toggleReaction(\${replyId}, 'angry')" class="text-lg hover:scale-125 transition-transform">😡</button>
                        </div>
                    </div>
                    <span class="text-gray-400">·</span>
                    <button onclick="toggleReplyForm(\${parentComment ? parentComment.comment_id : reply.parent_comment_id}, '\${reply.user_name}', \${reply.user_id})"
                            class="text-gray-500 hover:text-gray-700 font-semibold">ตอบกลับ</button>
                    <span class="text-gray-400">·</span>
                    <span class="text-gray-400">\${formatTimeAgo(reply.created_at)}</span>
                    \${reply.can_edit ? \`<span class="text-gray-400">·</span><button onclick="editReply(\${replyId}, \${parentComment ? parentComment.comment_id : reply.parent_comment_id})" class="text-gray-500 hover:text-blue-500">แก้ไข</button>\` : ''}
                    \${reply.can_delete ? \`<span class="text-gray-400">·</span><button onclick="deleteReply(\${replyId}, \${parentComment ? parentComment.comment_id : reply.parent_comment_id})" class="text-gray-500 hover:text-red-500">ลบ</button>\` : ''}
                </div>
            </div>
        </div>
    \`;
}`;

// Find and replace createCommentItem function
const commentFuncStart = content.indexOf('// Create comment item - Facebook-style with Reactions');
const commentFuncEnd = content.indexOf('// Helper functions for reactions');

if (commentFuncStart !== -1 && commentFuncEnd !== -1) {
    const beforeComment = content.substring(0, commentFuncStart);
    const afterComment = content.substring(commentFuncEnd);
    content = beforeComment + newCreateCommentItem + '\n\n' + newCreateReplyItem + '\n\n' + afterComment;
    fs.writeFileSync(path, content, 'utf8');
    console.log('✅ Updated createCommentItem and createReplyItem to Facebook style');
} else {
    console.log('❌ Could not find function boundaries');
    console.log('commentFuncStart:', commentFuncStart);
    console.log('commentFuncEnd:', commentFuncEnd);
}
