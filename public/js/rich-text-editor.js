// Enhanced Rich Text Editor for Articles
class RichTextEditor {
    constructor(editorId, hiddenInputId) {
        this.editor = document.getElementById(editorId);
        this.hiddenInput = document.getElementById(hiddenInputId);
        this.init();
    }

    init() {
        if (!this.editor || !this.hiddenInput) {
            console.error('Editor elements not found');
            return;
        }

        this.setupEditor();
        this.setupEventListeners();
        this.updateCounts();
    }

    setupEditor() {
        // Set initial placeholder
        this.updatePlaceholder();

        // Make editor focusable
        this.editor.setAttribute('tabindex', '0');

        // Set minimum height
        this.editor.style.minHeight = '400px';
    }

    setupEventListeners() {
        // Content changes
        this.editor.addEventListener('input', () => {
            this.updateHiddenInput();
            this.updateCounts();
            this.updatePlaceholder();
            this.autoSave();
        });

        this.editor.addEventListener('blur', () => {
            this.updateHiddenInput();
        });

        // Focus events for placeholder
        this.editor.addEventListener('focus', () => {
            this.updatePlaceholder();
        });

        // Paste handling
        this.editor.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });

        // Keyboard shortcuts
        this.editor.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Prevent dropping files directly into editor
        this.editor.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.editor.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileDrop(e);
        });
    }

    updateHiddenInput() {
        this.hiddenInput.value = this.editor.innerHTML;
    }

    updatePlaceholder() {
        const isEmpty = this.editor.textContent.trim().length === 0;

        if (isEmpty) {
            this.editor.classList.add('empty');
            if (!this.editor.querySelector('.placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'placeholder text-gray-400 pointer-events-none absolute';
                placeholder.textContent = this.editor.getAttribute('data-placeholder') || 'Start writing your article...';
                this.editor.style.position = 'relative';
                this.editor.appendChild(placeholder);
            }
        } else {
            this.editor.classList.remove('empty');
            const placeholder = this.editor.querySelector('.placeholder');
            if (placeholder) {
                placeholder.remove();
            }
        }
    }

    updateCounts() {
        const text = this.editor.textContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const characters = text.length;

        // Update word count
        const wordCountEl = document.getElementById('word-count');
        if (wordCountEl) {
            wordCountEl.textContent = `${words} words`;
        }

        // Update character count
        const charCountEl = document.getElementById('char-count');
        if (charCountEl) {
            charCountEl.textContent = `${characters} characters`;

            // Update color based on minimum requirement
            if (characters < 100) {
                charCountEl.className = 'text-red-500';
            } else {
                charCountEl.className = 'text-green-500';
            }
        }

        // Update form validation
        if (this.hiddenInput) {
            this.hiddenInput.setCustomValidity(
                characters < 100 ? 'Article content must be at least 100 characters long' : ''
            );
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
            case 'b':
                e.preventDefault();
                this.formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                this.formatText('italic');
                break;
            case 'u':
                e.preventDefault();
                this.formatText('underline');
                break;
            case 'k':
                e.preventDefault();
                this.insertLink();
                break;
            case 's':
                e.preventDefault();
                this.autoSave();
                break;
            }
        }

        // Tab key handling for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                this.formatText('outdent');
            } else {
                this.formatText('indent');
            }
        }

        // Enter key handling
        if (e.key === 'Enter') {
            // Let default behavior handle most cases
            // But clean up any formatting issues
            setTimeout(() => {
                this.cleanupContent();
            }, 0);
        }
    }

    handlePaste(e) {
        e.preventDefault();

        const clipboardData = e.clipboardData || window.clipboardData;
        const items = clipboardData.items;

        // Check for images first
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                this.insertImageFromFile(file);
                return;
            }
        }

        // Handle text content
        let pastedData = clipboardData.getData('text/html') || clipboardData.getData('text/plain');

        if (pastedData) {
            // Clean the pasted content
            pastedData = this.cleanPastedContent(pastedData);

            // Insert the cleaned content
            this.insertHTML(pastedData);
        }
    }

    handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        imageFiles.forEach(file => {
            this.insertImageFromFile(file);
        });
    }

    cleanPastedContent(html) {
        // Create a temporary div to clean the content
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove unwanted elements and attributes
        const elementsToRemove = ['script', 'style', 'meta', 'link', 'object', 'embed'];
        elementsToRemove.forEach(tag => {
            const elements = temp.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });

        // Clean attributes
        const allElements = temp.querySelectorAll('*');
        allElements.forEach(el => {
            // Keep only essential attributes
            const allowedAttributes = ['href', 'src', 'alt', 'title'];
            const attributesToRemove = [];

            for (let attr of el.attributes) {
                if (!allowedAttributes.includes(attr.name)) {
                    attributesToRemove.push(attr.name);
                }
            }

            attributesToRemove.forEach(attr => {
                el.removeAttribute(attr);
            });
        });

        return temp.innerHTML;
    }

    // Format text methods
    formatText(command, value = null) {
        document.execCommand(command, false, value);
        this.editor.focus();
        this.updateHiddenInput();
    }

    formatHeading(tag) {
        if (!tag) {return;}

        this.formatText('formatBlock', tag);
    }

    insertLink() {
        const selection = window.getSelection();
        const selectedText = selection.toString();

        const url = prompt('Enter the URL:', 'https://');
        if (url && url !== 'https://') {
            if (selectedText) {
                this.formatText('createLink', url);
            } else {
                const linkText = prompt('Enter the link text:', url);
                if (linkText) {
                    this.insertHTML(`<a href="${url}" target="_blank">${linkText}</a>`);
                }
            }
        }
    }

    insertImage() {
        document.getElementById('image-upload').click();
    }

    async insertImageFromFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        try {
            // Show loading state
            this.insertHTML('<div class="image-loading">Uploading image...</div>');

            // Create FormData for upload
            const formData = new FormData();
            formData.append('image', file);

            // Upload image
            const response = await fetch('/articles/api/upload-image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // Remove loading state
            const loadingEl = this.editor.querySelector('.image-loading');
            if (loadingEl) {
                loadingEl.remove();
            }

            if (result.success) {
                this.insertHTML(`
                    <figure class="image-container">
                        <img src="${result.data.url}" alt="${result.data.filename}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <figcaption contenteditable="true" style="text-align: center; font-style: italic; color: #666; margin-top: 8px;">Click to add caption</figcaption>
                    </figure>
                `);
            } else {
                alert('Failed to upload image: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image');

            // Remove loading state
            const loadingEl = this.editor.querySelector('.image-loading');
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    }

    insertTable() {
        const rows = prompt('Number of rows:', '3');
        const cols = prompt('Number of columns:', '3');

        if (rows && cols) {
            let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 16px 0;">';

            for (let i = 0; i < parseInt(rows); i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < parseInt(cols); j++) {
                    if (i === 0) {
                        tableHTML += '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5; font-weight: bold;">Header</th>';
                    } else {
                        tableHTML += '<td style="border: 1px solid #ddd; padding: 8px;">Cell</td>';
                    }
                }
                tableHTML += '</tr>';
            }

            tableHTML += '</table>';
            this.insertHTML(tableHTML);
        }
    }

    insertCode() {
        const selection = window.getSelection();
        const selectedText = selection.toString();

        if (selectedText) {
            this.insertHTML(`<code style="background-color: #f1f1f1; padding: 2px 4px; border-radius: 3px; font-family: monospace;">${selectedText}</code>`);
        } else {
            const isBlock = confirm('Insert code block? (Cancel for inline code)');
            if (isBlock) {
                this.insertHTML(`
                    <pre style="background-color: #f8f8f8; border: 1px solid #e1e1e1; border-radius: 4px; padding: 16px; margin: 16px 0; overflow-x: auto;"><code contenteditable="true" style="font-family: 'Courier New', monospace;">// Your code here</code></pre>
                `);
            } else {
                this.insertHTML('<code style="background-color: #f1f1f1; padding: 2px 4px; border-radius: 3px; font-family: monospace;">code</code>');
            }
        }
    }

    clearFormatting() {
        this.formatText('removeFormat');
    }

    insertHTML(html) {
        if (document.queryCommandSupported('insertHTML')) {
            this.formatText('insertHTML', html);
        } else {
            // Fallback for browsers that don't support insertHTML
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();

                const template = document.createElement('template');
                template.innerHTML = html;
                const fragment = template.content;

                range.insertNode(fragment);

                // Move cursor to end of inserted content
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

        this.updateHiddenInput();
        this.updateCounts();
    }

    cleanupContent() {
        // Remove empty paragraphs and divs
        const emptyElements = this.editor.querySelectorAll('p:empty, div:empty');
        emptyElements.forEach(el => {
            if (el.innerHTML === '' || el.innerHTML === '<br>') {
                el.remove();
            }
        });

        // Fix nested formatting issues
        const nestedElements = this.editor.querySelectorAll('b b, i i, u u, strong strong, em em');
        nestedElements.forEach(el => {
            const parent = el.parentNode;
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            el.remove();
        });

        this.updateHiddenInput();
    }

    autoSave() {
        // Debounced auto-save functionality
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveToLocalStorage();
        }, 2000);
    }

    saveToLocalStorage() {
        const content = this.editor.innerHTML;
        const timestamp = new Date().toISOString();

        localStorage.setItem('article_draft_content', content);
        localStorage.setItem('article_draft_timestamp', timestamp);

        // Show auto-save indicator
        this.showAutoSaveIndicator();
    }

    loadFromLocalStorage() {
        const savedContent = localStorage.getItem('article_draft_content');
        const timestamp = localStorage.getItem('article_draft_timestamp');

        if (savedContent && timestamp) {
            const saveTime = new Date(timestamp);
            const now = new Date();
            const hoursDiff = (now - saveTime) / (1000 * 60 * 60);

            if (hoursDiff < 24) { // Only load if saved within 24 hours
                const restore = confirm(`Found an auto-saved draft from ${saveTime.toLocaleString()}. Do you want to restore it?`);
                if (restore) {
                    this.editor.innerHTML = savedContent;
                    this.updateHiddenInput();
                    this.updateCounts();
                    this.updatePlaceholder();
                }
            }
        }
    }

    showAutoSaveIndicator() {
        // Remove existing indicator
        const existingIndicator = document.querySelector('.auto-save-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'auto-save-indicator fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded text-sm z-50';
        indicator.innerHTML = '<i class="fas fa-check mr-1"></i>Auto-saved';
        document.body.appendChild(indicator);

        // Remove after 2 seconds
        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }

    clearLocalStorage() {
        localStorage.removeItem('article_draft_content');
        localStorage.removeItem('article_draft_timestamp');
    }

    // Public methods for external use
    getContent() {
        return this.editor.innerHTML;
    }

    setContent(html) {
        this.editor.innerHTML = html;
        this.updateHiddenInput();
        this.updateCounts();
        this.updatePlaceholder();
    }

    getTextContent() {
        return this.editor.textContent || '';
    }

    isEmpty() {
        return this.getTextContent().trim().length === 0;
    }

    focus() {
        this.editor.focus();
    }

    validate() {
        const text = this.getTextContent();
        return text.length >= 100;
    }
}

// Global functions for toolbar buttons (for backward compatibility)
let editorInstance;

function initializeRichTextEditor() {
    editorInstance = new RichTextEditor('content-editor', 'content');

    // Load auto-saved content if available
    editorInstance.loadFromLocalStorage();
}

function formatText(command, value = null) {
    if (editorInstance) {
        editorInstance.formatText(command, value);
    }
}

function formatHeading(tag) {
    if (editorInstance) {
        editorInstance.formatHeading(tag);
    }
}

function insertLink() {
    if (editorInstance) {
        editorInstance.insertLink();
    }
}

function insertImage() {
    if (editorInstance) {
        editorInstance.insertImage();
    }
}

function insertTable() {
    if (editorInstance) {
        editorInstance.insertTable();
    }
}

function insertCode() {
    if (editorInstance) {
        editorInstance.insertCode();
    }
}

function clearFormatting() {
    if (editorInstance) {
        editorInstance.clearFormatting();
    }
}

function handleImageUpload(input) {
    if (input.files && input.files[0] && editorInstance) {
        editorInstance.insertImageFromFile(input.files[0]);
        input.value = ''; // Clear the input
    }
}

function updateWordCount() {
    if (editorInstance) {
        editorInstance.updateCounts();
    }
}

function handlePaste(event) {
    if (editorInstance) {
        editorInstance.handlePaste(event);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the article creation page
    if (document.getElementById('content-editor')) {
        initializeRichTextEditor();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RichTextEditor;
}