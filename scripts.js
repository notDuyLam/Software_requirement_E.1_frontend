document.addEventListener('DOMContentLoaded', function () {
    // Initialize variables
    let students = JSON.parse(localStorage.getItem('students')) || [];
    const studentForm = document.getElementById('studentForm');
    const studentTable = document.getElementById('studentTable');
    const studentList = document.getElementById('studentList');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const addStudentBtn = document.getElementById('addStudentBtn');
    const studentModal = document.getElementById('studentModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    const editMode = document.getElementById('editMode');
    const notification = document.getElementById('notification');

    // Load students
    loadStudents();

    // Event Listeners
    addStudentBtn.addEventListener('click', openAddStudentModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    studentForm.addEventListener('submit', saveStudent);
    searchBtn.addEventListener('click', searchStudents);
    searchInput.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            searchStudents();
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === studentModal) {
            closeModal();
        }
    });

    // Functions
    function loadStudents(filteredStudents = null) {
        // Nếu có danh sách đã lọc, hiển thị nó ngay
        if (filteredStudents) {
            renderStudents(filteredStudents);
            return;
        }
    
        // Gọi API từ backend để lấy danh sách sinh viên
        fetch("http://localhost:3000")
            .then(response => response.json())
            .then(data => {
                renderStudents(data);
            })
            .catch(error => console.error("Lỗi khi tải dữ liệu:", error));
    }
    
    // Hàm render danh sách sinh viên
    function renderStudents(studentsToDisplay) {
        // Xóa danh sách cũ
        studentList.innerHTML = '';
    
        if (!studentsToDisplay || studentsToDisplay.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="8" style="text-align: center;">Không có sinh viên nào</td>';
            studentList.appendChild(emptyRow);
            return;
        }
    
        // Thêm từng sinh viên vào bảng
        studentsToDisplay.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${formatDate(student.dob)}</td>
                <td>${student.gender}</td>
                <td>${student.faculty}</td>
                <td>${student.schoolYear}</td>
                <td>${student.status}</td>
                <td class="action-buttons">
                    <button class="btn btn-primary btn-sm edit-btn" data-id="${student.id}">Sửa</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${student.id}">Xóa</button>
                </td>
            `;
            studentList.appendChild(row);

            row.querySelector(".edit-btn").addEventListener("click", () => editStudent(student.id));
            row.querySelector(".delete-btn").addEventListener("click", () => deleteStudent(student.id));
        });
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }

    function openAddStudentModal() {
        modalTitle.textContent = 'Thêm sinh viên mới';
        editMode.value = 'false';
        studentForm.reset();
        studentModal.style.display = 'block';
        document.getElementById('id').removeAttribute('readonly');
    }

    function closeModal() {
        studentModal.style.display = 'none';
    }

    function saveStudent(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        const isEditMode = editMode.value === 'true';
        const studentData = {
            id: document.getElementById('id').value,
            name: document.getElementById('name').value,
            dob: document.getElementById('dob').value,
            gender: document.getElementById('gender').value,
            faculty: document.getElementById('faculty').value,
            schoolYear: document.getElementById('schoolYear').value,
            program: document.getElementById('program').value,
            address: document.getElementById('address').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            status: document.getElementById('status').value
        };


        if (isEditMode) {
            // Update existing student via API
            fetch(`http://localhost:3000/api/students/${studentData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(studentData)
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to update student');
                return response.json();
            })
            .then(() => {
                showNotification('Thông tin sinh viên đã được cập nhật thành công!', 'success');
                closeModal();
                setTimeout(() => {
                    loadStudents(); // Reload the list
                }, 2000);
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Có lỗi xảy ra khi cập nhật thông tin sinh viên!', 'error');
            });
        } else {
            // Add new student via API
            fetch('http://localhost:3000/api/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(studentData)
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to add student');
                return response.json();
            })
            .then(() => {
                showNotification('Sinh viên mới đã được thêm thành công!', 'success');
                loadStudents(); // Reload the list
                closeModal();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Có lỗi xảy ra khi thêm sinh viên mới!', 'error');
            });
        }
    }

    function validateForm() {
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const email = document.getElementById('email').value;
        if (!emailRegex.test(email)) {
            showNotification('Email không hợp lệ!', 'error');
            return false;
        }

        // Validate phone number (Vietnam phone number format)
        const phoneRegex = /^(0|\+84)(\d{9,10})$/;
        const phone = document.getElementById('phone').value;
        if (!phoneRegex.test(phone)) {
            showNotification('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam hợp lệ (VD: 0912345678 hoặc +84912345678)', 'error');
            return false;
        }

        return true;
    }

    function editStudent(id) {
        editMode.value = 'true';
        fetch(`http://localhost:3000/api/students/${id}`)
            .then(response => {
                if (!response.ok){
                    throw new Error('Cannot find the student with ID:', id);
                }
                return response.json();
            })
            .then(student => {
                document.getElementById('id').value = student.id;
                document.getElementById('id').setAttribute('readonly', true);
                document.getElementById('name').value = student.name;
                document.getElementById('dob').value = new Date(student.dob).toISOString().split('T')[0];
                document.getElementById('gender').value = student.gender;
                document.getElementById('faculty').value = student.faculty;
                document.getElementById('schoolYear').value = student.schoolYear;
                document.getElementById('program').value = student.program || '';
                document.getElementById('address').value = student.address || '';
                document.getElementById('email').value = student.email;
                document.getElementById('phone').value = student.phone;
                document.getElementById('status').value = student.status;
                studentModal.style.display = 'block';
            })
            .catch(error => console.error("Error:", error));
    }


    function deleteStudent(id) {
        if (confirm('Bạn có chắc muốn xóa sinh viên này?')) {
            fetch(`http://localhost:3000/api/students/${id}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Delete failed with status: ' + response.status);
                    }
                    return response.status === 204 ? {} : response.json();
                })
                .then(() => {
                    showNotification('Sinh viên đã được xóa thành công!', 'success');
                    loadStudents(); // Only reload after confirmed deletion
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotification('Có lỗi xảy ra khi xóa sinh viên!', 'error');
                });
        }
    }

    function searchStudents() {
        const searchValue = searchInput.value.trim();
        
        if (searchValue === '') {
            // If search is empty, load all students
            loadStudents();
            return;
        }
        
        // Call the search API endpoint with the search query
        fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(searchValue)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Search failed with status: ' + response.status);
                }
                return response.json();
            })
            .then(results => {
                // Render the search results
                loadStudents(results);
                if (results.length === 0) {
                    showNotification('Không tìm thấy kết quả nào phù hợp.', 'info');
                } else {
                    showNotification(`Đã tìm thấy ${results.length} kết quả.`, 'success');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Có lỗi xảy ra khi tìm kiếm!', 'error');
                // Load all students in case of error
                loadStudents();
            });
    }

    function showNotification(message, type) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hide');

        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('hide');
        }, 3000);
    }
});
