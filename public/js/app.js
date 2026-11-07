// ========================================================
// ONLINE WEDDING MANAGEMENT SYSTEM - CLIENT SCRIPT
// Handles Hall Explorer, Availability Checking, Booking Form,
// and Customer Bookings & Payment Invoices.
// ========================================================

// Global State
let allHalls = [];
let selectedHallForBooking = null;

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadHalls();
    setupFilters();
    setupBookingForm();
    setupCustomerSearch();

    // Default today's date + 7 days for booking date input
    const dateInput = document.getElementById('event_date');
    if (dateInput) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.value = nextWeek.toISOString().split('T')[0];
    }
});

// --------------------------------------------------------
// NAVIGATION TAB SWITCHING
// --------------------------------------------------------
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSection = btn.dataset.target;
            switchSection(targetSection);
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const activeSec = document.getElementById(sectionId);
    if (activeSec) {
        activeSec.classList.add('active');
    }

    const activeBtn = document.querySelector(`.nav-btn[data-target="${sectionId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Scroll to section
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh data if entering admin or halls
    if (sectionId === 'admin-section' && typeof window.loadAdminDashboard === 'function') {
        window.loadAdminDashboard();
    } else if (sectionId === 'halls-section') {
        loadHalls();
    }
}

// --------------------------------------------------------
// LOAD & RENDER MARRIAGE HALLS (WITH IMAGES)
// --------------------------------------------------------
async function loadHalls(filters = {}) {
    const container = document.getElementById('halls-container');
    if (!container) return;

    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #64748b;">Loading marriage halls...</div>';

    try {
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`/api/halls?${queryParams}`);
        const result = await res.json();

        if (!result.success || !result.data || result.data.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h3 style="color: #475569;">No marriage halls found matching your criteria</h3>
                    <p style="color: #94a3b8; margin-top: 6px;">Try adjusting your capacity, location, or price filters.</p>
                </div>
            `;
            return;
        }

        allHalls = result.data;
        populateLocationFilter(allHalls);
        populateHallSelectDropdown(allHalls);

        container.innerHTML = result.data.map(hall => {
            const statusClass = hall.status ? hall.status.toLowerCase() : 'available';
            const facilitiesList = (hall.facilities || '').split(',').map(f => f.trim()).filter(Boolean);
            const displayFacilities = facilitiesList.slice(0, 4);

            const fallbackImage = '/images/background.jpg';
            const imageUrl = hall.image_url || fallbackImage;

            return `
                <div class="hall-card" data-hall-id="${hall.hall_id}">
                    <div class="hall-image-box">
                        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(hall.hall_name)}" loading="lazy" onerror="this.src='${fallbackImage}'">
                        <span class="status-badge ${statusClass}">${escapeHtml(hall.status)}</span>
                        <div class="hall-capacity-pill">
                            👥 ${hall.capacity.toLocaleString()} Guests
                        </div>
                    </div>
                    <div class="hall-card-body">
                        <div class="hall-location">
                            📍 ${escapeHtml(hall.location)}
                        </div>
                        <h3 class="hall-title">${escapeHtml(hall.hall_name)}</h3>
                        
                        <div class="hall-facilities-tags">
                            ${displayFacilities.map(f => `<span class="tag-pill">✨ ${escapeHtml(f)}</span>`).join('')}
                            ${facilitiesList.length > 4 ? `<span class="tag-pill">+${facilitiesList.length - 4} more</span>` : ''}
                        </div>

                        <div class="hall-card-footer">
                            <div class="hall-price-box">
                                <span class="hall-price-label">Pricing Per Day</span>
                                <span class="hall-price-val">₹${Number(hall.price).toLocaleString('en-IN')}</span>
                            </div>
                            <div class="hall-actions-btn-group">
                                <button class="btn-check-avail" onclick="openAvailabilityModal(${hall.hall_id})">Check Date</button>
                                <button class="btn-book" onclick="selectHallForBookingById(${hall.hall_id})">Book Now</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load halls:', err);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Failed to load halls from database. Ensure MySQL is running on port 3306.</div>';
    }
}

// Populate location filter dropdown dynamically
function populateLocationFilter(halls) {
    const locationSelect = document.getElementById('filter-location');
    if (!locationSelect || locationSelect.children.length > 1) return;

    const locations = Array.from(new Set(halls.map(h => h.location.split(',').pop().trim()))).filter(Boolean);
    locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        locationSelect.appendChild(option);
    });
}

// Populate hall selection dropdown in Booking Form
function populateHallSelectDropdown(halls) {
    const select = document.getElementById('booking_hall_id');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose a Marriage Hall --</option>';
    halls.forEach(h => {
        if (h.status !== 'Maintenance') {
            const option = document.createElement('option');
            option.value = h.hall_id;
            option.textContent = `${h.hall_name} (${h.location}) - ₹${Number(h.price).toLocaleString('en-IN')} / ${h.capacity} guests`;
            select.appendChild(option);
        }
    });

    if (selectedHallForBooking) {
        select.value = selectedHallForBooking.hall_id;
    }
}

// --------------------------------------------------------
// SEARCH & FILTERS
// --------------------------------------------------------
function setupFilters() {
    const searchBtn = document.getElementById('hero-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', applyHeroSearch);
    }

    const filterInputs = ['filter-search', 'filter-location', 'filter-capacity', 'filter-price', 'filter-status'];
    filterInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                applyActiveFilters();
            });
            el.addEventListener('change', () => {
                applyActiveFilters();
            });
        }
    });

    const resetBtn = document.getElementById('filter-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            filterInputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            loadHalls();
        });
    }
}

function applyHeroSearch() {
    const text = document.getElementById('hero-search-text')?.value || '';
    const capacity = document.getElementById('hero-search-capacity')?.value || '';
    const date = document.getElementById('hero-search-date')?.value || '';

    const filters = {};
    if (text) filters.search = text;
    if (capacity) filters.min_capacity = capacity;

    switchSection('halls-section');
    loadHalls(filters);

    if (date) {
        // Pre-fill booking date
        const bookingDate = document.getElementById('event_date');
        if (bookingDate) bookingDate.value = date;
    }
}

function applyActiveFilters() {
    const filters = {
        search: document.getElementById('filter-search')?.value || '',
        location: document.getElementById('filter-location')?.value || '',
        min_capacity: document.getElementById('filter-capacity')?.value || '',
        max_price: document.getElementById('filter-price')?.value || '',
        status: document.getElementById('filter-status')?.value || ''
    };
    loadHalls(filters);
}

// --------------------------------------------------------
// CHECK AVAILABILITY MODAL
// --------------------------------------------------------
async function openAvailabilityModal(hallId) {
    const hall = allHalls.find(h => h.hall_id == hallId);
    if (!hall) return;

    const modal = document.getElementById('availability-modal');
    document.getElementById('modal-avail-hall-name').textContent = hall.hall_name;
    document.getElementById('modal-avail-hall-location').textContent = hall.location;
    document.getElementById('modal-avail-hall-img').src = hall.image_url || '/images/background.jpg';
    document.getElementById('modal-avail-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-avail-result').style.display = 'none';

    // Store current hall ID on check button
    const checkBtn = document.getElementById('modal-check-now-btn');
    checkBtn.onclick = () => performDateCheck(hall.hall_id);

    const proceedBtn = document.getElementById('modal-proceed-book-btn');
    proceedBtn.onclick = () => {
        closeModal('availability-modal');
        selectHallForBookingById(hall.hall_id, document.getElementById('modal-avail-date').value);
    };

    modal.classList.add('active');
    performDateCheck(hall.hall_id);
}

async function performDateCheck(hallId) {
    const date = document.getElementById('modal-avail-date').value;
    const resultBox = document.getElementById('modal-avail-result');
    if (!date) return;

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<span style="color:#64748b;">Checking availability database...</span>';

    try {
        const res = await fetch(`/api/halls/check-availability?hall_id=${hallId}&event_date=${date}`);
        const data = await res.json();

        if (data.is_available) {
            resultBox.innerHTML = `
                <div style="background: #d1fae5; color: #065f46; padding: 12px; border-radius: 8px; border: 1px solid #a7f3d0; margin-top: 10px;">
                    <strong>✅ Available for Wedding!</strong>
                    <p style="margin-top: 4px; font-size: 0.9rem;">This venue is completely free on <b>${data.event_date}</b>. You can proceed with reservation.</p>
                </div>
            `;
            document.getElementById('modal-proceed-book-btn').style.display = 'inline-block';
        } else {
            resultBox.innerHTML = `
                <div style="background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #fecaca; margin-top: 10px;">
                    <strong>❌ Reserved on this Date</strong>
                    <p style="margin-top: 4px; font-size: 0.9rem;">${escapeHtml(data.status_reason)}</p>
                </div>
            `;
            document.getElementById('modal-proceed-book-btn').style.display = 'none';
        }
    } catch (err) {
        resultBox.innerHTML = '<div style="color: red;">Error querying availability.</div>';
    }
}

// --------------------------------------------------------
// HALL SELECTION & INSTANT BOOKING
// --------------------------------------------------------
function selectHallForBookingById(hallId, preselectedDate = null) {
    const hall = allHalls.find(h => h.hall_id == hallId);
    if (!hall) return;

    selectedHallForBooking = hall;
    switchSection('book-section');

    const select = document.getElementById('booking_hall_id');
    if (select) {
        select.value = hall.hall_id;
    }

    if (preselectedDate) {
        const dateInput = document.getElementById('event_date');
        if (dateInput) dateInput.value = preselectedDate;
    }

    updateBookingSidebarPreview(hall);
    validateDateAvailabilityInForm();
}

function updateBookingSidebarPreview(hall) {
    const previewContainer = document.getElementById('booking-summary-preview');
    if (!previewContainer) return;

    if (!hall) {
        previewContainer.innerHTML = '<p style="color: #64748b; font-style: italic;">Select a hall from the dropdown above to preview specifications and calculate total pricing.</p>';
        document.getElementById('summary-subtotal').textContent = '₹0';
        document.getElementById('summary-gst').textContent = '₹0';
        document.getElementById('summary-total').textContent = '₹0';
        return;
    }

    const price = Number(hall.price);
    const gst = Math.round(price * 0.18);
    const total = price + gst;

    previewContainer.innerHTML = `
        <div class="summary-hall-preview">
            <img src="${escapeHtml(hall.image_url || '/images/background.jpg')}" alt="${escapeHtml(hall.hall_name)}" class="summary-img">
            <h4 style="font-size: 1.15rem; color: #0f172a; margin-bottom: 4px;">${escapeHtml(hall.hall_name)}</h4>
            <p style="font-size: 0.85rem; color: #64748b;">📍 ${escapeHtml(hall.location)}</p>
            <p style="font-size: 0.85rem; color: #d97706; font-weight: 600; margin-top: 4px;">👥 Capacity: Up to ${hall.capacity.toLocaleString()} Guests</p>
            <div style="margin-top: 8px; font-size: 0.8rem; color: #475569; background: #f8fafc; padding: 8px; border-radius: 6px;">
                <b>Included Facilities:</b><br>${escapeHtml(hall.facilities || 'Standard Hall Facilities')}
            </div>
        </div>
    `;

    document.getElementById('summary-subtotal').textContent = `₹${price.toLocaleString('en-IN')}`;
    document.getElementById('summary-gst').textContent = `₹${gst.toLocaleString('en-IN')}`;
    document.getElementById('summary-total').textContent = `₹${total.toLocaleString('en-IN')}`;
}

function setupBookingForm() {
    const hallSelect = document.getElementById('booking_hall_id');
    const dateInput = document.getElementById('event_date');

    if (hallSelect) {
        hallSelect.addEventListener('change', () => {
            const hallId = hallSelect.value;
            const hall = allHalls.find(h => h.hall_id == hallId);
            selectedHallForBooking = hall || null;
            updateBookingSidebarPreview(selectedHallForBooking);
            validateDateAvailabilityInForm();
        });
    }

    if (dateInput) {
        dateInput.addEventListener('change', validateDateAvailabilityInForm);
    }

    const form = document.getElementById('wedding-booking-form');
    if (form) {
        form.addEventListener('submit', handleBookingSubmit);
    }
}

async function validateDateAvailabilityInForm() {
    const hallId = document.getElementById('booking_hall_id')?.value;
    const date = document.getElementById('event_date')?.value;
    const feedbackBox = document.getElementById('form-avail-feedback');
    const submitBtn = document.getElementById('submit-booking-btn');

    if (!feedbackBox || !submitBtn) return;

    if (!hallId || !date) {
        feedbackBox.style.display = 'none';
        submitBtn.disabled = false;
        return;
    }

    try {
        const res = await fetch(`/api/halls/check-availability?hall_id=${hallId}&event_date=${date}`);
        const data = await res.json();

        if (data.is_available) {
            feedbackBox.className = 'avail-check-box available';
            feedbackBox.innerHTML = `✅ <b>Hall is Available!</b> "${data.hall.hall_name}" is open for reservation on ${date}.`;
            feedbackBox.style.display = 'block';
            submitBtn.disabled = false;
        } else {
            feedbackBox.className = 'avail-check-box unavailable';
            feedbackBox.innerHTML = `⚠️ <b>Conflict:</b> "${data.hall.hall_name}" is already booked on ${date}. Please select another date.`;
            feedbackBox.style.display = 'block';
            submitBtn.disabled = true;
        }
    } catch (err) {
        console.error('Error validating date availability:', err);
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-booking-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing Reservation & Payment...';

    const payload = {
        hall_id: parseInt(document.getElementById('booking_hall_id').value, 10),
        event_name: document.getElementById('event_name').value.trim(),
        event_date: document.getElementById('event_date').value,
        start_time: document.getElementById('start_time').value,
        end_time: document.getElementById('end_time').value,
        customer_name: document.getElementById('cust_name').value.trim(),
        customer_email: document.getElementById('cust_email').value.trim(),
        customer_phone: document.getElementById('cust_phone').value.trim(),
        customer_address: document.getElementById('cust_address').value.trim(),
        payment_status: document.getElementById('payment_status').value,
        payment_method: document.getElementById('payment_method').value
    };

    try {
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.success) {
            alert(`🎉 Congratulations! Your wedding reservation has been confirmed!\nBooking ID: #${result.booking_id}\nTransaction Ref: ${result.transaction_ref}`);
            document.getElementById('wedding-booking-form').reset();
            updateBookingSidebarPreview(null);
            
            // Open official receipt modal immediately
            openReceiptModal(result.booking_id);
            loadHalls(); // reload availability
        } else {
            alert(`Booking Failed: ${result.message}`);
        }
    } catch (err) {
        console.error('Submission error:', err);
        alert('An error occurred while confirming your booking. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '💍 Confirm Wedding Reservation';
    }
}

// --------------------------------------------------------
// CUSTOMER BOOKINGS & PAYMENT RECEIPTS
// --------------------------------------------------------
function setupCustomerSearch() {
    const searchBtn = document.getElementById('customer-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', performCustomerLookup);
    }

    const input = document.getElementById('customer-search-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performCustomerLookup();
        });
    }
}

async function performCustomerLookup() {
    const input = document.getElementById('customer-search-input');
    const container = document.getElementById('customer-bookings-results');
    const query = input?.value?.trim();

    if (!query) {
        alert('Please enter your Registered Email or Phone Number.');
        return;
    }

    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">Searching your reservations and payment records...</div>';

    try {
        const res = await fetch(`/api/customers/lookup?search=${encodeURIComponent(query)}`);
        const result = await res.json();

        if (!result.success || !result.bookings || result.bookings.length === 0) {
            container.innerHTML = `
                <div style="background: #ffffff; padding: 2rem; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                    <h3 style="color: #334155;">No bookings found for "${escapeHtml(query)}"</h3>
                    <p style="color: #64748b; margin-top: 6px;">Please check the email or phone number entered, or make a new hall reservation.</p>
                </div>
            `;
            return;
        }

        const { customer, bookings } = result;

        container.innerHTML = `
            <div style="background: #ffffff; padding: 1.25rem 1.5rem; border-radius: 12px; border-left: 4px solid var(--gold); border: 1px solid #e2e8f0; margin-bottom: 1.5rem;">
                <h3 style="color: #0f172a; margin-bottom: 4px;">👤 Customer Profile: ${escapeHtml(customer.name)}</h3>
                <div style="display: flex; gap: 20px; color: #64748b; font-size: 0.9rem; flex-wrap: wrap;">
                    <span>📧 ${escapeHtml(customer.email)}</span>
                    <span>📞 ${escapeHtml(customer.phone)}</span>
                    <span>🏠 ${escapeHtml(customer.address)}</span>
                </div>
            </div>

            <div class="bookings-history-list">
                ${bookings.map(b => {
                    const fallbackImg = '/images/background.jpg';
                    const payStatus = b.payment_status || 'Pending';
                    const payClass = payStatus === 'Paid' ? 'badge-success' : (payStatus === 'Partially Paid' ? 'badge-warning' : 'badge-danger');
                    const bookingStatusClass = b.status === 'Confirmed' ? 'badge-success' : 'badge-warning';

                    return `
                        <div class="booking-item-card">
                            <img src="${escapeHtml(b.image_url || fallbackImg)}" alt="${escapeHtml(b.hall_name)}" onerror="this.src='${fallbackImg}'">
                            <div class="booking-details-content">
                                <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                                    <span class="badge ${bookingStatusClass}">Booking #${b.booking_id}: ${escapeHtml(b.status)}</span>
                                    <span class="badge ${payClass}">Payment: ${escapeHtml(payStatus)}</span>
                                </div>
                                <h3>${escapeHtml(b.event_name)}</h3>
                                <div class="booking-meta-line">
                                    <span>🏛️ <b>${escapeHtml(b.hall_name)}</b> (${escapeHtml(b.location)})</span>
                                    <span>📅 <b>${b.event_date.split('T')[0]}</b></span>
                                    <span>⏰ <b>${b.start_time} - ${b.end_time}</b></span>
                                </div>
                                <div style="font-size: 1rem; font-weight: 700; color: var(--gold-dark); margin-top: 4px;">
                                    Total Amount: ₹${Number(b.total_amount).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div>
                                <button class="payment-receipt-btn" onclick="openReceiptModal(${b.booking_id})">
                                    🧾 View Payment Receipt
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

    } catch (err) {
        console.error('Lookup error:', err);
        container.innerHTML = '<div style="color: red; text-align: center;">Error retrieving records. Please check database connection.</div>';
    }
}

// --------------------------------------------------------
// OFFICIAL PAYMENT RECEIPT / INVOICE MODAL
// --------------------------------------------------------
async function openReceiptModal(bookingId) {
    const modal = document.getElementById('receipt-modal');
    const container = document.getElementById('receipt-content-area');

    container.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading official invoice & payment receipt...</div>';
    modal.classList.add('active');

    try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        const result = await res.json();

        if (!result.success || !result.data) {
            container.innerHTML = '<div style="color: red; text-align: center;">Invoice not found.</div>';
            return;
        }

        const b = result.data;
        const isPaid = (b.payment_status || 'Paid') === 'Paid';
        const formattedDate = b.event_date ? b.event_date.split('T')[0] : 'N/A';
        const paymentDate = b.payment_date ? b.payment_date.split('T')[0] : new Date().toISOString().split('T')[0];

        container.innerHTML = `
            <div class="receipt-container" id="printable-invoice">
                <div class="receipt-paid-stamp ${isPaid ? '' : 'pending'}">${isPaid ? 'PAID' : (b.payment_status || 'PENDING')}</div>
                
                <div class="receipt-header">
                    <h3>💍 ROYAL WEDDING MANAGEMENT</h3>
                    <p>Official Event Booking Confirmation & Payment Receipt</p>
                    <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">Receipt Ref: ${escapeHtml(b.transaction_ref || 'TXN-OFFICIAL')} | Issued: ${paymentDate}</p>
                </div>

                <div class="receipt-grid">
                    <div>
                        <div class="receipt-label">Customer Information</div>
                        <div class="receipt-value" style="font-size: 1.05rem;">${escapeHtml(b.customer_name)}</div>
                        <div style="color: #64748b; font-size: 0.85rem;">${escapeHtml(b.customer_email)} | ${escapeHtml(b.customer_phone)}</div>
                        <div style="color: #64748b; font-size: 0.85rem;">${escapeHtml(b.customer_address)}</div>
                    </div>
                    <div>
                        <div class="receipt-label">Venue / Marriage Hall</div>
                        <div class="receipt-value" style="font-size: 1.05rem;">${escapeHtml(b.hall_name)}</div>
                        <div style="color: #64748b; font-size: 0.85rem;">📍 ${escapeHtml(b.hall_location)}</div>
                        <div style="color: #64748b; font-size: 0.85rem;">Capacity: ${Number(b.hall_capacity).toLocaleString()} Guests</div>
                    </div>
                </div>

                <div class="receipt-grid" style="border-top: 1px solid #f1f5f9; padding-top: 1rem;">
                    <div>
                        <div class="receipt-label">Event Details</div>
                        <div class="receipt-value">${escapeHtml(b.event_name)}</div>
                        <div style="color: #64748b; font-size: 0.85rem;">Date: <b>${formattedDate}</b></div>
                        <div style="color: #64748b; font-size: 0.85rem;">Timings: ${b.start_time} to ${b.end_time}</div>
                    </div>
                    <div>
                        <div class="receipt-label">Payment Breakdown</div>
                        <div style="color: #64748b; font-size: 0.85rem;">Method: <b>${escapeHtml(b.payment_method || 'Online Card / UPI')}</b></div>
                        <div style="color: #64748b; font-size: 0.85rem;">Booking Status: <b style="color: #059669;">${escapeHtml(b.status)}</b></div>
                        <div style="color: #64748b; font-size: 0.85rem;">Payment Date: ${paymentDate}</div>
                    </div>
                </div>

                <div class="receipt-amount-box">
                    <div>
                        <span class="receipt-total-label">Total Amount Paid</span>
                        <div style="font-size: 0.75rem; color: #64748b;">(Includes Hall Rental, AC, Mandap & Standard Lighting)</div>
                    </div>
                    <span class="receipt-total-value">₹${Number(b.total_amount).toLocaleString('en-IN')}</span>
                </div>

                <div style="margin-top: 1.5rem; text-align: center; font-size: 0.8rem; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                    Thank you for celebrating your auspicious wedding day with Royal Wedding Management.<br>
                    Connected to MySQL Database: <b>wedding_db</b> (MySQL Workbench compatible)
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Invoice load error:', err);
        container.innerHTML = '<div style="color: red; text-align: center;">Error loading invoice.</div>';
    }
}

function printReceipt() {
    window.print();
}

// --------------------------------------------------------
// MODAL CLOSE HELPERS
// --------------------------------------------------------
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Close modal on click outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// HTML Escape helper
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

