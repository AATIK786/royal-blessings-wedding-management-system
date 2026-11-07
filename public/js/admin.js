// ========================================================
// ONLINE WEDDING MANAGEMENT SYSTEM - ADMIN PORTAL SCRIPT
// Manage Marriage Halls (CRUD), Reservations, Payments & Stats
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    initAdminTabs();
    setupAdminHallForm();
});

// Admin Sub-tab switching
function initAdminTabs() {
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(btn.dataset.pane);
            if (targetPane) targetPane.classList.add('active');

            if (btn.dataset.pane === 'admin-halls-pane') loadAdminHalls();
            if (btn.dataset.pane === 'admin-bookings-pane') loadAdminBookings();
            if (btn.dataset.pane === 'admin-payments-pane') loadAdminPayments();
            if (btn.dataset.pane === 'admin-customers-pane') loadAdminCustomers();
        });
    });
}

// --------------------------------------------------------
// ADMIN DASHBOARD OVERVIEW & STATS
// --------------------------------------------------------
window.loadAdminDashboard = async function() {
    await fetchStats();
    await loadAdminHalls();
    await loadAdminBookings();
    await loadAdminPayments();
};

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (!data.success) return;

        const s = data.stats;
        document.getElementById('stat-total-halls').textContent = s.total_halls;
        document.getElementById('stat-available-halls').textContent = s.available_halls;
        document.getElementById('stat-total-bookings').textContent = s.total_bookings;
        document.getElementById('stat-confirmed-bookings').textContent = s.confirmed_bookings;
        document.getElementById('stat-total-revenue').textContent = `₹${Number(s.collected_revenue).toLocaleString('en-IN')}`;
        document.getElementById('stat-total-customers').textContent = s.total_customers;
    } catch (err) {
        console.error('Error fetching admin stats:', err);
    }
}

// --------------------------------------------------------
// ADMIN: HALL MANAGEMENT (CRUD)
// --------------------------------------------------------
async function loadAdminHalls() {
    const tableBody = document.getElementById('admin-halls-tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading halls...</td></tr>';

    try {
        const res = await fetch('/api/halls');
        const result = await res.json();

        if (!result.success || !result.data || result.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No halls in database.</td></tr>';
            return;
        }

        const fallbackImg = '/images/background.jpg';

        tableBody.innerHTML = result.data.map(h => {
            const statusBadgeClass = h.status === 'Available' ? 'badge-success' : (h.status === 'Booked' ? 'badge-warning' : 'badge-danger');
            return `
                <tr>
                    <td>
                        <img src="${escapeHtml(h.image_url || fallbackImg)}" alt="${escapeHtml(h.hall_name)}" class="table-img-thumb" onerror="this.src='${fallbackImg}'">
                    </td>
                    <td>
                        <strong>${escapeHtml(h.hall_name)}</strong><br>
                        <small style="color: #64748b;">ID: #${h.hall_id}</small>
                    </td>
                    <td>${escapeHtml(h.location)}</td>
                    <td>👥 ${h.capacity.toLocaleString()}</td>
                    <td><strong>₹${Number(h.price).toLocaleString('en-IN')}</strong></td>
                    <td>
                        <span class="badge ${statusBadgeClass}">${escapeHtml(h.status)}</span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 6px;">
                            <button class="table-action-btn" onclick="openEditHallModal(${h.hall_id})">✏️ Edit</button>
                            <button class="table-action-btn danger" onclick="deleteHall(${h.hall_id}, '${escapeHtml(h.hall_name)}')">🗑️ Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading admin halls:', err);
        tableBody.innerHTML = '<tr><td colspan="7" style="color: red; text-align: center;">Failed to load halls.</td></tr>';
    }
}

function openAddHallModal() {
    document.getElementById('hall-modal-title').textContent = 'Add New Marriage Hall';
    document.getElementById('admin-hall-form').reset();
    document.getElementById('edit_hall_id').value = '';
    document.getElementById('hall_image_preview').src = '/images/background.jpg';
    document.getElementById('hall-modal').classList.add('active');
}

async function openEditHallModal(hallId) {
    try {
        const res = await fetch(`/api/halls/${hallId}`);
        const result = await res.json();
        if (!result.success) return;

        const hall = result.data;
        document.getElementById('hall-modal-title').textContent = `Edit Hall: ${hall.hall_name}`;
        document.getElementById('edit_hall_id').value = hall.hall_id;
        document.getElementById('admin_hall_name').value = hall.hall_name;
        document.getElementById('admin_hall_location').value = hall.location;
        document.getElementById('admin_hall_capacity').value = hall.capacity;
        document.getElementById('admin_hall_price').value = hall.price;
        document.getElementById('admin_hall_facilities').value = hall.facilities || '';
        document.getElementById('admin_hall_status').value = hall.status || 'Available';
        document.getElementById('admin_hall_image').value = hall.image_url || '';
        document.getElementById('hall_image_preview').src = hall.image_url || '/images/background.jpg';

        document.getElementById('hall-modal').classList.add('active');
    } catch (err) {
        console.error('Failed to load hall for edit:', err);
    }
}

function setupAdminHallForm() {
    const imgInput = document.getElementById('admin_hall_image');
    if (imgInput) {
        imgInput.addEventListener('input', () => {
            const preview = document.getElementById('hall_image_preview');
            if (preview && imgInput.value.trim()) {
                preview.src = imgInput.value.trim();
            }
        });
    }

    const form = document.getElementById('admin-hall-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const hallId = document.getElementById('edit_hall_id').value;
            const isEdit = Boolean(hallId);

            const payload = {
                hall_name: document.getElementById('admin_hall_name').value.trim(),
                location: document.getElementById('admin_hall_location').value.trim(),
                capacity: parseInt(document.getElementById('admin_hall_capacity').value, 10),
                price: parseFloat(document.getElementById('admin_hall_price').value),
                facilities: document.getElementById('admin_hall_facilities').value.trim(),
                status: document.getElementById('admin_hall_status').value,
                image_url: document.getElementById('admin_hall_image').value.trim()
            };

            const url = isEdit ? `/api/halls/${hallId}` : '/api/halls';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();

                if (result.success) {
                    alert(isEdit ? 'Hall updated successfully!' : 'New hall added successfully!');
                    closeModal('hall-modal');
                    loadAdminHalls();
                    fetchStats();
                    if (typeof loadHalls === 'function') loadHalls();
                } else {
                    alert(`Failed: ${result.message}`);
                }
            } catch (err) {
                console.error('Error saving hall:', err);
                alert('Error saving hall details.');
            }
        });
    }
}

async function deleteHall(hallId, hallName) {
    if (!confirm(`Are you sure you want to delete "${hallName}"? This will also remove associated bookings.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/halls/${hallId}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            alert('Hall removed successfully.');
            loadAdminHalls();
            fetchStats();
            if (typeof loadHalls === 'function') loadHalls();
        } else {
            alert(`Delete failed: ${result.message}`);
        }
    } catch (err) {
        console.error('Error deleting hall:', err);
    }
}

// --------------------------------------------------------
// ADMIN: RESERVATIONS & BOOKINGS MANAGEMENT
// --------------------------------------------------------
async function loadAdminBookings(statusFilter = '') {
    const tableBody = document.getElementById('admin-bookings-tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Loading reservations...</td></tr>';

    try {
        const url = statusFilter ? `/api/bookings?status=${statusFilter}` : '/api/bookings';
        const res = await fetch(url);
        const result = await res.json();

        if (!result.success || !result.data || result.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No bookings found.</td></tr>';
            return;
        }

        tableBody.innerHTML = result.data.map(b => {
            const formattedDate = b.event_date ? b.event_date.split('T')[0] : 'N/A';
            return `
                <tr>
                    <td><strong>#${b.booking_id}</strong></td>
                    <td>
                        <strong>${escapeHtml(b.customer_name)}</strong><br>
                        <small style="color: #64748b;">${escapeHtml(b.customer_phone)}</small>
                    </td>
                    <td>${escapeHtml(b.hall_name)}</td>
                    <td>
                        <b>${escapeHtml(b.event_name)}</b><br>
                        <small style="color: #64748b;">📅 ${formattedDate} (${b.start_time} - ${b.end_time})</small>
                    </td>
                    <td><strong>₹${Number(b.total_amount).toLocaleString('en-IN')}</strong></td>
                    <td>
                        <select onchange="updateBookingStatus(${b.booking_id}, this.value)" style="padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; border: 1px solid #cbd5e1;">
                            <option value="Confirmed" ${b.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="Pending" ${b.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${b.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>
                        <span class="badge ${b.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}">${escapeHtml(b.payment_status || 'Pending')}</span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 4px;">
                            <button class="table-action-btn" onclick="openReceiptModal(${b.booking_id})">🧾 Receipt</button>
                            <button class="table-action-btn danger" onclick="deleteBooking(${b.booking_id})">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading admin bookings:', err);
        tableBody.innerHTML = '<tr><td colspan="8" style="color: red; text-align: center;">Failed to load bookings.</td></tr>';
    }
}

async function updateBookingStatus(bookingId, newStatus) {
    try {
        const res = await fetch(`/api/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await res.json();
        if (result.success) {
            fetchStats();
            if (typeof loadHalls === 'function') loadHalls();
        } else {
            alert(`Update failed: ${result.message}`);
        }
    } catch (err) {
        console.error('Status update failed:', err);
    }
}

async function deleteBooking(bookingId) {
    if (!confirm(`Cancel and delete booking #${bookingId}?`)) return;

    try {
        const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            loadAdminBookings();
            fetchStats();
            if (typeof loadHalls === 'function') loadHalls();
        }
    } catch (err) {
        console.error('Failed to delete booking:', err);
    }
}

// --------------------------------------------------------
// ADMIN: PAYMENT TRANSACTIONS
// --------------------------------------------------------
async function loadAdminPayments() {
    const tableBody = document.getElementById('admin-payments-tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading payment transactions...</td></tr>';

    try {
        const res = await fetch('/api/payments');
        const result = await res.json();

        if (!result.success || !result.data || result.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No payment transactions recorded.</td></tr>';
            return;
        }

        tableBody.innerHTML = result.data.map(p => {
            const payDate = p.payment_date ? p.payment_date.split('T')[0] : 'N/A';
            return `
                <tr>
                    <td><strong>#${p.payment_id}</strong></td>
                    <td>
                        <strong>${escapeHtml(p.customer_name)}</strong><br>
                        <small style="color: #64748b;">Booking #${p.booking_id} (${escapeHtml(p.hall_name)})</small>
                    </td>
                    <td><strong style="color: var(--gold-dark); font-size: 1rem;">₹${Number(p.amount).toLocaleString('en-IN')}</strong></td>
                    <td>📅 ${payDate}</td>
                    <td>
                        <span style="font-size: 0.8rem; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 500;">
                            💳 ${escapeHtml(p.payment_method || 'Card / Online')}
                        </span>
                    </td>
                    <td>
                        <select onchange="updatePaymentStatus(${p.payment_id}, this.value)" style="padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; border: 1px solid #cbd5e1;">
                            <option value="Paid" ${p.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
                            <option value="Pending" ${p.payment_status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Partially Paid" ${p.payment_status === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
                            <option value="Refunded" ${p.payment_status === 'Refunded' ? 'selected' : ''}>Refunded</option>
                        </select>
                    </td>
                    <td>
                        <code style="font-size: 0.8rem; background: #f8fafc; padding: 2px 6px; border: 1px solid #e2e8f0; border-radius: 4px;">${escapeHtml(p.transaction_ref || 'N/A')}</code>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading admin payments:', err);
        tableBody.innerHTML = '<tr><td colspan="7" style="color: red; text-align: center;">Failed to load payments.</td></tr>';
    }
}

async function updatePaymentStatus(paymentId, status) {
    try {
        const res = await fetch(`/api/payments/${paymentId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_status: status })
        });
        const result = await res.json();
        if (result.success) {
            fetchStats();
        } else {
            alert(`Update failed: ${result.message}`);
        }
    } catch (err) {
        console.error('Payment status update failed:', err);
    }
}

// --------------------------------------------------------
// ADMIN: CUSTOMER DIRECTORY
// --------------------------------------------------------
async function loadAdminCustomers() {
    const tableBody = document.getElementById('admin-customers-tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Loading customer records...</td></tr>';

    try {
        const res = await fetch('/api/customers');
        const result = await res.json();

        if (!result.success || !result.data || result.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No customers found.</td></tr>';
            return;
        }

        tableBody.innerHTML = result.data.map(c => `
            <tr>
                <td><strong>#${c.customer_id}</strong></td>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>📧 ${escapeHtml(c.email)}</td>
                <td>📞 ${escapeHtml(c.phone)}</td>
                <td>🏠 ${escapeHtml(c.address)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed to load customers:', err);
        tableBody.innerHTML = '<tr><td colspan="5" style="color: red; text-align: center;">Error loading customer list.</td></tr>';
    }
}

