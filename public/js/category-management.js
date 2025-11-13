// Category Management JavaScript
let categories = [];
let currentCategoryId = null;
let deleteCategoryId = null;

// Load categories when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
});

// Load all categories
async function loadCategories() {
    try {
        const response = await fetch('/courses/api/categories-admin/all');
        const result = await response.json();

        if (result.success) {
            categories = result.data;
            renderCategories();
        } else {
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
    } catch (error) {
        console.error('Load categories error:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// Render categories table
function renderCategories() {
    const tbody = document.getElementById('categories-tbody');

    if (categories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    ไม่พบข้อมูลหมวดหมู่
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = categories.map(category => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background-color: ${category.category_color}">
                    <i class="fas ${category.category_icon} text-white text-lg"></i>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">${category.category_name}</div>
                <div class="text-sm text-gray-500">${category.category_name_en || '-'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-500">${category.description || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${category.display_order}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${category.course_count} หลักสูตร
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${category.is_active ?
                    '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><i class="fas fa-check mr-1"></i>ใช้งาน</span>' :
                    '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><i class="fas fa-times mr-1"></i>ปิดใช้งาน</span>'
                }
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="openEditModal(${category.category_id})" class="text-indigo-600 hover:text-indigo-900 mr-3">
                    <i class="fas fa-edit"></i> แก้ไข
                </button>
                <button onclick="openDeleteModal(${category.category_id}, '${category.category_name.replace(/'/g, "\\'")}', ${category.course_count})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i> ลบ
                </button>
            </td>
        </tr>
    `).join('');
}

// Open add modal
function openAddModal() {
    currentCategoryId = null;
    document.getElementById('modalTitle').textContent = 'เพิ่มหมวดหมู่ใหม่';
    document.getElementById('submitButtonText').textContent = 'บันทึก';
    document.getElementById('categoryForm').reset();
    document.getElementById('category_id').value = '';
    document.getElementById('is_active').checked = true;
    document.getElementById('category_color').value = '#64748b';
    document.getElementById('categoryModal').classList.remove('hidden');
}

// Open edit modal
async function openEditModal(categoryId) {
    currentCategoryId = categoryId;
    document.getElementById('modalTitle').textContent = 'แก้ไขหมวดหมู่';
    document.getElementById('submitButtonText').textContent = 'บันทึกการแก้ไข';

    try {
        const response = await fetch(`/courses/api/categories-admin/${categoryId}`);
        const result = await response.json();

        if (result.success) {
            const category = result.data;
            document.getElementById('category_id').value = category.category_id;
            document.getElementById('category_name').value = category.category_name;
            document.getElementById('category_name_en').value = category.category_name_en || '';
            document.getElementById('description').value = category.description || '';
            document.getElementById('category_icon').value = category.category_icon || '';
            document.getElementById('category_color').value = category.category_color || '#64748b';
            document.getElementById('display_order').value = category.display_order || 0;
            document.getElementById('is_active').checked = category.is_active;
            document.getElementById('categoryModal').classList.remove('hidden');
        } else {
            showError('ไม่พบข้อมูลหมวดหมู่');
        }
    } catch (error) {
        console.error('Load category error:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// Close modal
function closeModal() {
    document.getElementById('categoryModal').classList.add('hidden');
    document.getElementById('categoryForm').reset();
    currentCategoryId = null;
}

// Handle form submission
document.getElementById('categoryForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
        category_name: document.getElementById('category_name').value,
        category_name_en: document.getElementById('category_name_en').value,
        description: document.getElementById('description').value,
        category_icon: document.getElementById('category_icon').value,
        category_color: document.getElementById('category_color').value,
        display_order: parseInt(document.getElementById('display_order').value) || 0,
        is_active: document.getElementById('is_active').checked
    };

    try {
        let response;
        if (currentCategoryId) {
            // Update existing category
            response = await fetch(`/courses/api/categories-admin/${currentCategoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new category
            response = await fetch('/courses/api/categories-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }

        const result = await response.json();

        if (result.success) {
            showSuccess(result.message);
            closeModal();
            loadCategories();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Save category error:', error);
        showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
});

// Open delete modal
function openDeleteModal(categoryId, categoryName, courseCount) {
    if (courseCount > 0) {
        showError(`ไม่สามารถลบได้ เนื่องจากมี ${courseCount} หลักสูตรอยู่ในหมวดหมู่นี้`);
        return;
    }

    deleteCategoryId = categoryId;
    document.getElementById('deleteCategoryName').textContent = categoryName;
    document.getElementById('deleteModal').classList.remove('hidden');
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    deleteCategoryId = null;
}

// Confirm delete
async function confirmDelete() {
    if (!deleteCategoryId) return;

    try {
        const response = await fetch(`/courses/api/categories-admin/${deleteCategoryId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(result.message);
            closeDeleteModal();
            loadCategories();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Delete category error:', error);
        showError('เกิดข้อผิดพลาดในการลบหมวดหมู่');
    }
}

// Show success message
function showSuccess(message) {
    // Use existing alert system or create a simple one
    alert(message);
}

// Show error message
function showError(message) {
    alert(message);
}
