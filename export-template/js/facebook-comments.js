/**
 * Facebook-Style Comments JavaScript
 * Reusable JavaScript template for Facebook-style comment system
 * Version: 1.0.0
 *
 * Usage:
 * 1. Include this script in your HTML
 * 2. Initialize: FacebookComments.init(config)
 *
 * Required Dependencies:
 * - Font Awesome (for icons)
 * - facebook-comments.css
 */

const FacebookComments = (function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    let config = {
        // API endpoints (customize these)
        apiBase: '/api/comments',
        endpoints: {
            list: '',              // GET {apiBase}?page=1&limit=10&sort=newest
            create: '',            // POST {apiBase}
            reply: '/:id/reply',   // POST {apiBase}/:id/reply
            edit: '/:id',          // PUT {apiBase}/:id
            delete: '/:id',        // DELETE {apiBase}/:id
            react: '/:id/react',   // POST {apiBase}/:id/react
            pin: '/:id/pin'        // POST {apiBase}/:id/pin
        },

        // Selectors
        containerSelector: '#comments-container',
        listSelector: '#comments-list',
        formSelector: '#comment-form',
        textareaSelector: '#comment-text',
        submitButtonSelector: '#submit-comment',
        charCountSelector: '#char-count',
        commentsCountSelector: '#comments-count',
        sortDropdownSelector: '#sort-dropdown',
        sortLabelSelector: '#sort-label',
        loadMoreSelector: '#load-more-container',

        // Settings
        maxLength: 2000,
        pageSize: 10,
        defaultSort: 'newest',

        // Current user info
        currentUser: {
            id: 0,
            name: 'User',
            avatar: '/images/default-avatar.png',
            isAdmin: false,
            isInstructor: false
        },

        // Translations (Thai default)
        i18n: {
            like: 'Like',
            love: 'Love',
            haha: 'Haha',
            wow: 'Wow',
            sad: 'Sad',
            angry: 'Angry',
            reply: 'Reply',
            edit: 'Edit',
            delete: 'Delete',
            pin: 'Pin',
            unpin: 'Unpin',
            cancel: 'Cancel',
            save: 'Save',
            post: 'Post',
            comments: 'Comments',
            writeComment: 'Write a comment...',
            writeReply: 'Write a reply...',
            noComments: 'No comments yet',
            loadMore: 'Load more comments',
            pinnedBy: 'Pinned',
            instructor: 'Instructor',
            justNow: 'Just now',
            minutesAgo: 'm',
            hoursAgo: 'h',
            daysAgo: 'd',
            newest: 'Newest',
            oldest: 'Oldest',
            popular: 'Most Popular',
            replies: 'replies',
            confirmDelete: 'Delete this comment?',
            successPost: 'Posted!',
            successReply: 'Replied!',
            successEdit: 'Updated!',
            successDelete: 'Deleted!',
            successPin: 'Pinned!',
            error: 'An error occurred'
        },

        // Toast function (can be overridden)
        showToast: function(message, type) {
            console.log(`[${type}] ${message}`);
        },

        // Callbacks
        onCommentPosted: null,
        onCommentDeleted: null,
        onReactionToggled: null
    };

    // ============================================
    // STATE
    // ============================================
    let state = {
        comments: [],
        page: 1,
        hasMore: false,
        sort: 'newest',
        replyToUserId: null,
        replyToCommentId: null
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    function init(userConfig) {
        config = { ...config, ...userConfig };
        state.sort = config.defaultSort;

        bindEvents();
        loadComments();
    }

    function bindEvents() {
        // Character count
        const textarea = document.querySelector(config.textareaSelector);
        if (textarea) {
            textarea.addEventListener('input', function() {
                autoGrow(this);
                updateCharCount();
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.sort-dropdown-wrapper')) {
                const dropdown = document.querySelector(config.sortDropdownSelector);
                if (dropdown) dropdown.classList.add('hidden');
            }
        });
    }

    // ============================================
    // API FUNCTIONS
    // ============================================
    async function loadComments(append = false) {
        try {
            const url = `${config.apiBase}${config.endpoints.list}?page=${state.page}&limit=${config.pageSize}&sort=${state.sort}`;
            const response = await fetch(url);
            const result = await response.json();

            if (!append) {
                state.comments = [];
            }

            if (result.success && result.comments?.length > 0) {
                state.comments = append ? [...state.comments, ...result.comments] : result.comments;
                state.hasMore = result.pagination?.has_next || false;
                displayComments();
                updateCommentsCount(result.pagination?.total || state.comments.length);
                toggleLoadMore(state.hasMore);
            } else if (!append) {
                showEmptyState();
                updateCommentsCount(0);
                toggleLoadMore(false);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    async function submitComment() {
        const textarea = document.querySelector(config.textareaSelector);
        const text = textarea.value.trim();
        if (!text || text.length > config.maxLength) return;

        try {
            const response = await fetch(`${config.apiBase}${config.endpoints.create}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: text })
            });

            if (response.ok) {
                textarea.value = '';
                updateCharCount();
                loadComments();
                config.showToast(config.i18n.successPost, 'success');
                if (config.onCommentPosted) config.onCommentPosted();
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            config.showToast(config.i18n.error, 'error');
        }
    }

    async function submitReply(parentId) {
        const textarea = document.getElementById(`reply-textarea-${parentId}`);
        const text = textarea.value.trim();
        if (!text) return;

        try {
            const endpoint = config.endpoints.reply.replace(':id', parentId);
            const response = await fetch(`${config.apiBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comment_text: text,
                    reply_to_user_id: state.replyToUserId,
                    reply_to_comment_id: state.replyToCommentId
                })
            });

            if (response.ok) {
                textarea.value = '';
                cancelReply(parentId);
                loadComments();
                config.showToast(config.i18n.successReply, 'success');
            }
        } catch (error) {
            console.error('Error submitting reply:', error);
            config.showToast(config.i18n.error, 'error');
        }
    }

    async function toggleReaction(commentId, reactionType) {
        try {
            const endpoint = config.endpoints.react.replace(':id', commentId);
            const response = await fetch(`${config.apiBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reaction_type: reactionType })
            });

            if (response.ok) {
                loadComments();
                if (config.onReactionToggled) config.onReactionToggled();
            }
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    }

    async function saveEditComment(commentId) {
        const textarea = document.getElementById(`comment-edit-textarea-${commentId}`);
        const text = textarea.value.trim();
        if (!text) return;

        try {
            const endpoint = config.endpoints.edit.replace(':id', commentId);
            const response = await fetch(`${config.apiBase}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_text: text })
            });

            if (response.ok) {
                loadComments();
                config.showToast(config.i18n.successEdit, 'success');
            }
        } catch (error) {
            console.error('Error editing comment:', error);
            config.showToast(config.i18n.error, 'error');
        }
    }

    async function deleteComment(commentId) {
        if (!confirm(config.i18n.confirmDelete)) return;

        try {
            const endpoint = config.endpoints.delete.replace(':id', commentId);
            const response = await fetch(`${config.apiBase}${endpoint}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadComments();
                config.showToast(config.i18n.successDelete, 'success');
                if (config.onCommentDeleted) config.onCommentDeleted();
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            config.showToast(config.i18n.error, 'error');
        }
    }

    async function pinComment(commentId) {
        try {
            const endpoint = config.endpoints.pin.replace(':id', commentId);
            const response = await fetch(`${config.apiBase}${endpoint}`, {
                method: 'POST'
            });

            if (response.ok) {
                loadComments();
                config.showToast(config.i18n.successPin, 'success');
            }
        } catch (error) {
            console.error('Error pinning comment:', error);
            config.showToast(config.i18n.error, 'error');
        }
    }

    // ============================================
    // DISPLAY FUNCTIONS
    // ============================================
    function displayComments() {
        const container = document.querySelector(config.listSelector);
        if (container) {
            container.innerHTML = state.comments.map(comment => createCommentItem(comment)).join('');
        }
    }

    function createCommentItem(comment) {
        const reactions = comment.reactions || { total: 0, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
        const userReaction = comment.user_reaction;
        const reactionIcons = getReactionIcons(reactions);
        const hasReplies = comment.replies && comment.replies.length > 0;

        return `
            <div class="comment-item mb-4" data-comment-id="${comment.comment_id}">
                ${comment.is_pinned ? `<div class="pin-indicator"><i class="fas fa-thumbtack"></i> ${config.i18n.pinnedBy}</div>` : ''}
                <div class="flex items-start gap-2">
                    <img src="${comment.user_avatar || '/images/default-avatar.png'}" alt="${comment.user_name}" class="w-10 h-10 rounded-full flex-shrink-0 mt-0.5">
                    <div class="flex-1 min-w-0">
                        <div class="inline-block max-w-[85%]">
                            <div class="bg-gray-100 rounded-2xl px-3 py-2 relative ${comment.is_pinned ? 'ring-2 ring-amber-200' : ''}">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="font-semibold text-[13px] text-gray-900">${comment.user_name}</span>
                                    ${comment.is_instructor ? `<span class="instructor-badge">${config.i18n.instructor}</span>` : ''}
                                </div>
                                <div id="comment-display-${comment.comment_id}">
                                    <p class="text-[15px] text-gray-900 whitespace-pre-wrap break-words">${escapeHtml(comment.content)}</p>
                                </div>
                                <div id="comment-edit-${comment.comment_id}" class="hidden">
                                    <textarea id="comment-edit-textarea-${comment.comment_id}" class="w-full p-2 border rounded-lg text-sm resize-none" rows="2">${escapeHtml(comment.content)}</textarea>
                                    <div class="flex gap-2 mt-2">
                                        <button onclick="FacebookComments.cancelEditComment(${comment.comment_id})" class="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded">${config.i18n.cancel}</button>
                                        <button onclick="FacebookComments.saveEditComment(${comment.comment_id})" class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">${config.i18n.save}</button>
                                    </div>
                                </div>
                                ${reactions.total > 0 ? `
                                    <div class="reaction-badge">
                                        ${reactionIcons}<span class="ml-0.5 text-gray-500">${reactions.total}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <div class="flex items-center gap-1 mt-1 ml-3 text-xs">
                            <div class="relative group">
                                <button onclick="FacebookComments.toggleReaction(${comment.comment_id}, '${userReaction || 'like'}')"
                                        class="${userReaction ? getReactionColor(userReaction) : 'text-gray-500 hover:text-gray-700'} font-semibold">
                                    ${userReaction ? getReactionText(userReaction) : config.i18n.like}
                                </button>
                                ${createReactionPopup(comment.comment_id)}
                            </div>
                            <span class="text-gray-400">·</span>
                            <button onclick="FacebookComments.toggleReplyForm(${comment.comment_id}, '${escapeHtml(comment.user_name)}', ${comment.user_id})" class="text-gray-500 hover:text-gray-700 font-semibold">${config.i18n.reply}</button>
                            <span class="text-gray-400">·</span>
                            <span class="text-gray-400">${formatTimeAgo(comment.created_at)}</span>
                            ${comment.can_edit ? `<span class="text-gray-400">·</span><button onclick="FacebookComments.editComment(${comment.comment_id})" class="text-gray-500 hover:text-blue-500">${config.i18n.edit}</button>` : ''}
                            ${comment.can_delete ? `<span class="text-gray-400">·</span><button onclick="FacebookComments.deleteComment(${comment.comment_id})" class="text-gray-500 hover:text-red-500">${config.i18n.delete}</button>` : ''}
                            ${comment.can_pin ? `<span class="text-gray-400">·</span><button onclick="FacebookComments.pinComment(${comment.comment_id})" class="text-gray-500 hover:text-amber-500">${comment.is_pinned ? config.i18n.unpin : config.i18n.pin}</button>` : ''}
                        </div>

                        ${createReplyForm(comment.comment_id)}

                        ${hasReplies ? `
                            <div class="mt-1">
                                <button onclick="FacebookComments.toggleReplies(${comment.comment_id})" class="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-700 font-medium ml-1 py-1">
                                    <i class="fas fa-reply fa-flip-horizontal text-xs"></i>
                                    <span id="toggle-replies-text-${comment.comment_id}">${comment.replies.length} ${config.i18n.replies}</span>
                                    <i id="toggle-replies-icon-${comment.comment_id}" class="fas fa-chevron-down text-[10px] transition-transform duration-200"></i>
                                </button>
                                <div id="replies-container-${comment.comment_id}" class="hidden mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                                    ${comment.replies.map(reply => createReplyItem(reply, comment)).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function createReplyItem(reply, parentComment) {
        const reactions = reply.reactions || { total: 0, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
        const userReaction = reply.user_reaction;
        const reactionIcons = getReactionIcons(reactions);

        return `
            <div class="reply-item" data-comment-id="${reply.comment_id}">
                <div class="flex items-start gap-2">
                    <img src="${reply.user_avatar || '/images/default-avatar.png'}" alt="${reply.user_name}" class="w-8 h-8 rounded-full flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <div class="inline-block max-w-[85%]">
                            <div class="bg-gray-100 rounded-2xl px-3 py-2 relative">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="font-semibold text-[13px] text-gray-900">${reply.user_name}</span>
                                    ${reply.is_instructor ? `<span class="instructor-badge">${config.i18n.instructor}</span>` : ''}
                                </div>
                                <p class="text-[14px] text-gray-900 whitespace-pre-wrap break-words">
                                    ${reply.reply_to_name ? `<span class="text-blue-600 font-semibold">@${reply.reply_to_name}</span> ` : ''}${escapeHtml(reply.content)}
                                </p>
                                ${reactions.total > 0 ? `
                                    <div class="reaction-badge">
                                        ${reactionIcons}<span class="ml-0.5 text-gray-600">${reactions.total}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <div class="flex items-center gap-1 mt-0.5 ml-3 text-[11px]">
                            <div class="relative group">
                                <button onclick="FacebookComments.toggleReaction(${reply.comment_id}, '${userReaction || 'like'}')"
                                        class="${userReaction ? getReactionColor(userReaction) : 'text-gray-500 hover:text-gray-700'} font-semibold">
                                    ${userReaction ? getReactionText(userReaction) : config.i18n.like}
                                </button>
                                ${createReactionPopup(reply.comment_id, 'text-lg')}
                            </div>
                            <span class="text-gray-400">·</span>
                            <button onclick="FacebookComments.toggleReplyForm(${parentComment.comment_id}, '${escapeHtml(reply.user_name)}', ${reply.user_id}, ${reply.comment_id})" class="text-gray-500 hover:text-gray-700 font-semibold">${config.i18n.reply}</button>
                            <span class="text-gray-400">·</span>
                            <span class="text-gray-400">${formatTimeAgo(reply.created_at)}</span>
                            ${reply.can_edit ? `<span class="text-gray-400">·</span><button onclick="FacebookComments.editComment(${reply.comment_id})" class="text-gray-500 hover:text-blue-500">${config.i18n.edit}</button>` : ''}
                            ${reply.can_delete ? `<span class="text-gray-400">·</span><button onclick="FacebookComments.deleteComment(${reply.comment_id})" class="text-gray-500 hover:text-red-500">${config.i18n.delete}</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function createReactionPopup(commentId, sizeClass = 'text-xl') {
        return `
            <div class="reaction-popup absolute bottom-full left-0 mb-2 hidden group-hover:flex bg-white rounded-full shadow-xl px-2 py-1.5 gap-1 border z-50">
                <button onclick="event.stopPropagation(); FacebookComments.toggleReaction(${commentId}, 'like')" class="${sizeClass} hover:scale-125 transition-transform" title="${config.i18n.like}">👍</button>
                <button onclick="event.stopPropagation(); FacebookComments.toggleReaction(${commentId}, 'love')" class="${sizeClass} hover:scale-125 transition-transform" title="${config.i18n.love}">❤️</button>
                <button onclick="event.stopPropagation(); FacebookComments.toggleReaction(${commentId}, 'haha')" class="${sizeClass} hover:scale-125 transition-transform" title="${config.i18n.haha}">😂</button>
                <button onclick="event.stopPropagation(); FacebookComments.toggleReaction(${commentId}, 'wow')" class="${sizeClass} hover:scale-125 transition-transform" title="${config.i18n.wow}">😮</button>
                <button onclick="event.stopPropagation(); FacebookComments.toggleReaction(${commentId}, 'sad')" class="${sizeClass} hover:scale-125 transition-transform" title="${config.i18n.sad}">😢</button>
                <button onclick="event.stopPropagation(); FacebookComments.toggleReaction(${commentId}, 'angry')" class="${sizeClass} hover:scale-125 transition-transform" title="${config.i18n.angry}">😡</button>
            </div>
        `;
    }

    function createReplyForm(parentId) {
        return `
            <div id="reply-form-${parentId}" class="hidden mt-3">
                <div class="flex items-start gap-2">
                    <img src="${config.currentUser.avatar}" class="w-8 h-8 rounded-full flex-shrink-0">
                    <div class="flex-1">
                        <div class="bg-gray-100 rounded-2xl px-3 py-2">
                            <span id="reply-to-name-${parentId}" class="text-blue-500 font-medium text-sm"></span>
                            <textarea id="reply-textarea-${parentId}" class="w-full bg-transparent text-sm resize-none outline-none" placeholder="${config.i18n.writeReply}" rows="1" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
                        </div>
                        <div class="flex justify-end gap-2 mt-1">
                            <button onclick="FacebookComments.cancelReply(${parentId})" class="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-full">${config.i18n.cancel}</button>
                            <button onclick="FacebookComments.submitReply(${parentId})" class="px-3 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600">${config.i18n.reply}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function showEmptyState() {
        const container = document.querySelector(config.listSelector);
        if (container) {
            container.innerHTML = `
                <div class="comments-empty">
                    <i class="fas fa-comments"></i>
                    <p>${config.i18n.noComments}</p>
                </div>
            `;
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function getReactionIcons(reactions) {
        let icons = [];
        if (reactions.like > 0) icons.push('<span class="text-sm">👍</span>');
        if (reactions.love > 0) icons.push('<span class="text-sm">❤️</span>');
        if (reactions.haha > 0) icons.push('<span class="text-sm">😂</span>');
        if (reactions.wow > 0) icons.push('<span class="text-sm">😮</span>');
        if (reactions.sad > 0) icons.push('<span class="text-sm">😢</span>');
        if (reactions.angry > 0) icons.push('<span class="text-sm">😡</span>');
        return icons.slice(0, 3).join('');
    }

    function getReactionColor(type) {
        const colors = {
            like: 'text-blue-500',
            love: 'text-red-500',
            haha: 'text-yellow-500',
            wow: 'text-yellow-500',
            sad: 'text-yellow-500',
            angry: 'text-orange-500'
        };
        return colors[type] || 'text-gray-500';
    }

    function getReactionText(type) {
        const texts = {
            like: config.i18n.like,
            love: config.i18n.love,
            haha: config.i18n.haha,
            wow: config.i18n.wow,
            sad: config.i18n.sad,
            angry: config.i18n.angry
        };
        return texts[type] || config.i18n.like;
    }

    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return config.i18n.justNow;
        if (diff < 3600) return Math.floor(diff / 60) + config.i18n.minutesAgo;
        if (diff < 86400) return Math.floor(diff / 3600) + config.i18n.hoursAgo;
        if (diff < 604800) return Math.floor(diff / 86400) + config.i18n.daysAgo;
        return date.toLocaleDateString();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function autoGrow(element) {
        element.style.height = 'auto';
        element.style.height = element.scrollHeight + 'px';
    }

    function updateCharCount() {
        const textarea = document.querySelector(config.textareaSelector);
        const counter = document.querySelector(config.charCountSelector);
        const submitBtn = document.querySelector(config.submitButtonSelector);

        if (textarea && counter) {
            const count = textarea.value.length;
            counter.textContent = `${count}/${config.maxLength}`;
            if (submitBtn) {
                submitBtn.disabled = count === 0 || count > config.maxLength;
            }
        }
    }

    function updateCommentsCount(count) {
        const element = document.querySelector(config.commentsCountSelector);
        if (element) {
            element.textContent = count > 0 ? `${config.i18n.comments} (${count})` : config.i18n.comments;
        }
    }

    function toggleLoadMore(show) {
        const element = document.querySelector(config.loadMoreSelector);
        if (element) {
            element.classList.toggle('hidden', !show);
        }
    }

    // ============================================
    // UI TOGGLE FUNCTIONS
    // ============================================
    function toggleSortDropdown() {
        const dropdown = document.querySelector(config.sortDropdownSelector);
        if (dropdown) dropdown.classList.toggle('hidden');
    }

    function sortComments(sortType) {
        state.sort = sortType;
        state.page = 1;
        const labels = {
            newest: config.i18n.newest,
            oldest: config.i18n.oldest,
            popular: config.i18n.popular
        };
        const label = document.querySelector(config.sortLabelSelector);
        if (label) label.textContent = labels[sortType];
        toggleSortDropdown();
        loadComments();
    }

    function loadMoreComments() {
        state.page++;
        loadComments(true);
    }

    function toggleReplies(commentId) {
        const container = document.getElementById(`replies-container-${commentId}`);
        const icon = document.getElementById(`toggle-replies-icon-${commentId}`);
        if (container) container.classList.toggle('hidden');
        if (icon) icon.style.transform = container?.classList.contains('hidden') ? '' : 'rotate(180deg)';
    }

    function toggleReplyForm(parentId, replyToName, replyToUserId, replyToCommentId = null) {
        const form = document.getElementById(`reply-form-${parentId}`);
        const nameSpan = document.getElementById(`reply-to-name-${parentId}`);

        if (form.classList.contains('hidden')) {
            form.classList.remove('hidden');
            if (nameSpan) nameSpan.textContent = `@${replyToName} `;
            state.replyToUserId = replyToUserId;
            state.replyToCommentId = replyToCommentId;
            document.getElementById(`reply-textarea-${parentId}`)?.focus();
        } else {
            form.classList.add('hidden');
            state.replyToUserId = null;
            state.replyToCommentId = null;
        }
    }

    function cancelReply(parentId) {
        const form = document.getElementById(`reply-form-${parentId}`);
        const textarea = document.getElementById(`reply-textarea-${parentId}`);
        if (form) form.classList.add('hidden');
        if (textarea) textarea.value = '';
        state.replyToUserId = null;
        state.replyToCommentId = null;
    }

    function editComment(commentId) {
        document.getElementById(`comment-display-${commentId}`)?.classList.add('hidden');
        document.getElementById(`comment-edit-${commentId}`)?.classList.remove('hidden');
    }

    function cancelEditComment(commentId) {
        document.getElementById(`comment-display-${commentId}`)?.classList.remove('hidden');
        document.getElementById(`comment-edit-${commentId}`)?.classList.add('hidden');
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init,
        loadComments,
        submitComment,
        submitReply,
        toggleReaction,
        saveEditComment,
        deleteComment,
        pinComment,
        toggleSortDropdown,
        sortComments,
        loadMoreComments,
        toggleReplies,
        toggleReplyForm,
        cancelReply,
        editComment,
        cancelEditComment,
        updateCharCount,

        // Expose helpers for customization
        getReactionIcons,
        getReactionColor,
        getReactionText,
        formatTimeAgo,
        escapeHtml
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FacebookComments;
}
