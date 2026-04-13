// ===== Supabase Configuration =====
const SUPABASE_URL = 'https://tcvyfaxdvveniwsgnbxk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O_13Ds6U69DTdSMikiFa4w_sA3oSBwS';

// ===== Supabase REST API Helper =====
const supabase = {
    async from(table) {
        return {
            table,
            _url: `${SUPABASE_URL}/rest/v1/${table}`,
            _headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            async select(columns = '*') {
                try {
                    const response = await fetch(`${this._url}?select=${columns}&order=id.asc`, {
                        method: 'GET',
                        headers: this._headers
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Supabase SELECT error: ${response.status} - ${errorText}`);
                    }
                    const data = await response.json();
                    return { data, error: null };
                } catch (error) {
                    console.error('Supabase SELECT failed:', error);
                    return { data: null, error };
                }
            },
            async insert(records) {
                try {
                    const response = await fetch(this._url, {
                        method: 'POST',
                        headers: this._headers,
                        body: JSON.stringify(records)
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Supabase INSERT error: ${response.status} - ${errorText}`);
                    }
                    const data = await response.json();
                    return { data, error: null };
                } catch (error) {
                    console.error('Supabase INSERT failed:', error);
                    return { data: null, error };
                }
            },
            async update(updates) {
                const self = this;
                return {
                    async eq(column, value) {
                        try {
                            const response = await fetch(`${self._url}?${column}=eq.${value}`, {
                                method: 'PATCH',
                                headers: self._headers,
                                body: JSON.stringify(updates)
                            });
                            if (!response.ok) {
                                const errorText = await response.text();
                                throw new Error(`Supabase UPDATE error: ${response.status} - ${errorText}`);
                            }
                            const data = await response.json();
                            return { data, error: null };
                        } catch (error) {
                            console.error('Supabase UPDATE failed:', error);
                            return { data: null, error };
                        }
                    }
                };
            }
        };
    }
};

// ===== Brevo Email Helper (via Vercel serverless function) =====
async function sendBrevoEmail({ to, toName, subject, htmlContent }) {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, toName, subject, htmlContent })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Email API error:', errorData);
            return { success: false, error: errorData };
        }

        const data = await response.json();
        console.log('Email sent successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Email send failed:', error);
        return { success: false, error };
    }
}

// ===== بيانات الأدوية الاحتياطية (fallback إذا Supabase مش شغال) =====
const fallbackProducts = [
    // ───────────── مسكنات وخافضات حرارة ─────────────
    { id: 1, name: "بانادول إكسترا - 24 قرص", price: 45, stock: 120, image: "images/1.svg", category: "مسكنات" },
    { id: 2, name: "بانادول أدفانس 500 ملجم - 24 قرص", price: 36, stock: 95, image: "images/2.svg", category: "مسكنات" },
    { id: 3, name: "بنادول ساينس (للجيوب الأنفية)", price: 55, stock: 0, image: "images/3.svg", category: "مسكنات" },
    { id: 4, name: "بروفين 600 ملجم - 20 قرص", price: 50, stock: 5, image: "images/4.svg", category: "مسكنات" },
    { id: 5, name: "بروفين 400 ملجم - 20 قرص", price: 36, stock: 78, image: "images/5.svg", category: "مسكنات" },
    { id: 6, name: "كتافلام 50 ملجم - 20 قرص", price: 45, stock: 60, image: "images/6.svg", category: "مسكنات" },
    { id: 7, name: "كتافاست فوار 50 ملجم - 9 أكياس", price: 54, stock: 42, image: "images/7.svg", category: "مسكنات" },
    { id: 8, name: "فولتارين 50 ملجم - 20 قرص", price: 48, stock: 33, image: "images/8.svg", category: "مسكنات" },
    { id: 9, name: "أدول 500 ملجم - 24 قرص", price: 18, stock: 200, image: "images/9.svg", category: "مسكنات" },
    { id: 10, name: "نوفالدول 1000 ملجم - 20 قرص", price: 22, stock: 150, image: "images/10.svg", category: "مسكنات" },
    { id: 11, name: "أسبرين بروتكت 100 ملجم - 20 قرص", price: 30, stock: 110, image: "images/11.svg", category: "مسكنات" },
    { id: 12, name: "ترامادول 50 ملجم (بروشتة فقط)", price: 25, stock: 0, image: "images/12.svg", category: "مسكنات" },
    { id: 13, name: "كيتوفان 200 ملجم - 20 كبسولة", price: 42, stock: 55, image: "images/13.svg", category: "مسكنات" },
    { id: 14, name: "ريفو 320 ملجم - 10 أقراص", price: 7, stock: 300, image: "images/14.svg", category: "مسكنات" },
];

// ===== SVG أيقونة الدواء (بدل الصور الخارجية) =====
function pillSVG() {
    return `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="20" width="48" height="24" rx="12" stroke="#0284c7" stroke-width="2"/>
        <line x1="32" y1="20" x2="32" y2="44" stroke="#0284c7" stroke-width="2" stroke-dasharray="3 2"/>
        <rect x="8" y="20" width="24" height="24" rx="12" fill="#0284c7" opacity="0.15"/>
    </svg>`;
}

// ===== Global State =====
let products = [];
let activeCategory = 'الكل';
let categories = ['الكل'];
let isUsingSupabase = false;

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('reservationModal');
const closeModalBtn = document.querySelector('.close-modal');
const reservationForm = document.getElementById('reservationForm');
const successMessage = document.getElementById('successMessage');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');

// ===== تحميل المنتجات من Supabase =====
async function loadProductsFromSupabase() {
    try {
        // Show loading state
        productsGrid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 0;">
                <div class="loading-spinner"></div>
                <p style="color:var(--text-muted);margin-top:16px;font-size:1.1rem;">جاري تحميل الأدوية من قاعدة البيانات...</p>
            </div>
        `;

        const db = await supabase.from('products');
        const { data, error } = await db.select('*');

        if (error) throw error;

        if (data && data.length > 0) {
            // Map Supabase data to our format
            products = data.map(p => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                stock: p.stock,
                image: p.image_url || `images/${p.id}.svg`,
                category: p.category,
                available: p.available
            }));
            isUsingSupabase = true;
            console.log(`✅ تم تحميل ${products.length} دواء من Supabase بنجاح`);
            updateConnectionStatus('connected', `متصل بـ Supabase (${products.length} دواء)`);
        } else {
            throw new Error('No products found in Supabase');
        }
    } catch (error) {
        console.warn('⚠️ فشل الاتصال بـ Supabase، سيتم استخدام البيانات المحلية:', error.message);
        products = fallbackProducts;
        isUsingSupabase = false;
        updateConnectionStatus('offline', 'وضع غير متصل (بيانات محلية)');
    }

    // Build categories & initial render
    categories = ['الكل', ...new Set(products.map(p => p.category))];
    renderFilters();
    applyFilters();

    // Update product count in header
    const countEl = document.querySelector('.product-count');
    if (countEl) countEl.textContent = `(${products.length} دواء)`;
}

// ===== تحديث حالة الاتصال في الـ Header =====
function updateConnectionStatus(status, text) {
    const statusContainer = document.getElementById('connectionStatus');
    if (!statusContainer) return;
    const dot = statusContainer.querySelector('.status-dot');
    const label = statusContainer.querySelector('.status-text');
    dot.className = 'status-dot ' + status;
    label.textContent = text;
}

// ===== عرض المنتجات =====
function renderProducts(items) {
    productsGrid.innerHTML = '';

    if (items.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;">عذراً، لم نتمكن من إيجاد الدواء المطلوب.</p>';
        return;
    }

    items.forEach(product => {
        const inStock = product.stock > 0;
        const statusClass = inStock ? 'status-in-stock' : 'status-out-of-stock';
        const statusText = inStock ? 'متوفر' : 'غير متوفر';
        const buttonDisabled = !inStock ? 'disabled' : '';
        const buttonText = inStock ? 'احجز الآن' : 'نفدت الكمية';

        // لون المخزون حسب الكمية
        let stockClass = 'stock-good';
        if (product.stock === 0) stockClass = 'stock-out';
        else if (product.stock <= 10) stockClass = 'stock-low';
        else if (product.stock <= 50) stockClass = 'stock-medium';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-placeholder">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.style.display='none';this.parentElement.innerHTML='${pillSVG().replace(/'/g, "\\'")}'">`  : pillSVG()}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-meta">
                    <span class="product-price">${product.price} جنيه</span>
                    <span class="product-status ${statusClass}">${statusText}</span>
                </div>
                <div class="product-stock ${stockClass}">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
                    <span>المخزون: <strong>${product.stock}</strong> ${product.stock === 0 ? '' : 'قطعة'}</span>
                </div>
                <button class="btn btn-primary" onclick="openReservationModal(${product.id})" ${buttonDisabled}>${buttonText}</button>
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

// ===== بناء أزرار الفلترة =====
function renderFilters() {
    const filtersContainer = document.getElementById('filtersContainer');
    if (!filtersContainer) return;
    filtersContainer.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (cat === activeCategory ? ' active' : '');
        const count = cat === 'الكل' ? products.length : products.filter(p => p.category === cat).length;
        btn.textContent = cat + ' (' + count + ')';
        btn.onclick = () => {
            activeCategory = cat;
            applyFilters();
            renderFilters();
        };
        filtersContainer.appendChild(btn);
    });
}

// ===== تطبيق البحث + الفلتر معاً =====
function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    let filtered = products;
    if (activeCategory !== 'الكل') {
        filtered = filtered.filter(p => p.category === activeCategory);
    }
    if (term) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
    }
    renderProducts(filtered);
}

// ===== البحث =====
searchInput.addEventListener('input', () => {
    applyFilters();
});

// ===== فتح نموذج الحجز =====
window.openReservationModal = function (productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductPrice').textContent = product.price + ' جنيه';
    document.getElementById('modalProductStock').textContent = 'المخزون: ' + product.stock + ' قطعة';
    document.getElementById('hiddenProductId').value = product.id;

    // أيقونة بدل الصورة
    const imgEl = document.getElementById('modalProductImage');
    if (product.image) {
        imgEl.style.display = 'block';
        imgEl.src = product.image;
        document.getElementById('modalProductIcon').style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        document.getElementById('modalProductIcon').style.display = 'flex';
    }

    reservationForm.style.display = 'block';
    successMessage.classList.add('hidden');
    reservationForm.reset();
    modal.classList.add('active');
};

// ===== إغلاق المودال =====
function closeTheModal() {
    modal.classList.remove('active');
}
closeModalBtn.addEventListener('click', closeTheModal);
closeSuccessBtn.addEventListener('click', closeTheModal);
window.addEventListener('click', (e) => { if (e.target === modal) closeTheModal(); });

// ===== إرسال الحجز (مع Supabase + Brevo) =====
reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحجز...';
    submitBtn.style.opacity = '0.7';

    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail') ? document.getElementById('customerEmail').value.trim() : '';
    const productId = parseInt(document.getElementById('hiddenProductId').value);
    const product = products.find(p => p.id === productId);

    if (!product) {
        alert('حدث خطأ، يرجى المحاولة مرة أخرى');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.style.opacity = '1';
        return;
    }

    // Generate reservation number
    const reservationNumber = 'RES-' + Math.floor(100000 + Math.random() * 900000);

    try {
        if (isUsingSupabase) {
            // ===== 1. حفظ الحجز في Supabase =====
            const reservationsDB = await supabase.from('reservations');
            const { data: resData, error: resError } = await reservationsDB.insert([{
                reservation_number: reservationNumber,
                customer_name: name,
                customer_phone: phone,
                status: 'pending',
                total_amount: product.price
            }]);

            if (resError) {
                console.error('Reservation insert error:', resError);
                throw resError;
            }

            console.log('✅ تم حفظ الحجز في Supabase:', resData);

            // ===== 2. حفظ تفاصيل الحجز (reservation items) =====
            if (resData && resData[0]) {
                const itemsDB = await supabase.from('reservation_items');
                const { error: itemError } = await itemsDB.insert([{
                    reservation_id: resData[0].id,
                    product_id: product.id,
                    quantity: 1,
                    unit_price: product.price,
                    total_price: product.price
                }]);

                if (itemError) {
                    console.warn('⚠️ خطأ في حفظ تفاصيل الحجز:', itemError);
                }
            }

            // ===== 3. تحديث المخزون في Supabase =====
            const productsDB = await supabase.from('products');
            const updateChain = await productsDB.update({ stock: product.stock - 1 });
            await updateChain.eq('id', product.id);

            console.log('✅ تم تحديث المخزون في Supabase');
        } else {
            console.log('📋 حجز محلي (Supabase غير متصل):', {
                reservation_number: reservationNumber,
                customer_name: name,
                customer_phone: phone,
                product: product.name,
                price: product.price
            });
        }

        // ===== 4. إرسال إيميل تأكيد عبر Brevo =====
        // Note: This sends from the pharmacy's email to a notification address
        // In production, you'd want the customer's email too
        const emailHtml = `
            <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
                <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 32px; text-align: center; border-radius: 0 0 20px 20px;">
                    <h1 style="color: #fff; margin: 0; font-size: 28px;">صيدلية الشفاء 💊</h1>
                    <p style="color: #e0f2fe; margin: 8px 0 0; font-size: 16px;">تأكيد حجز دواء جديد</p>
                </div>
                <div style="padding: 32px; background: #fff; margin: 20px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06);">
                    <div style="background: #ecfdf5; border-right: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                        <p style="margin: 0; color: #065f46; font-weight: bold; font-size: 18px;">✅ تم تأكيد الحجز بنجاح</p>
                        <p style="margin: 4px 0 0; color: #047857;">رقم الحجز: <strong style="font-size: 20px;">${reservationNumber}</strong></p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px 0; color: #6b7280; width: 120px;">اسم العميل:</td>
                            <td style="padding: 12px 0; font-weight: bold;">${name}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px 0; color: #6b7280;">رقم التليفون:</td>
                            <td style="padding: 12px 0; font-weight: bold;">${phone}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px 0; color: #6b7280;">اسم الدواء:</td>
                            <td style="padding: 12px 0; font-weight: bold; color: #0284c7;">${product.name}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px 0; color: #6b7280;">السعر:</td>
                            <td style="padding: 12px 0; font-weight: bold; color: #0284c7;">${product.price} جنيه</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #6b7280;">الحالة:</td>
                            <td style="padding: 12px 0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: bold;">في انتظار الاستلام</span></td>
                        </tr>
                    </table>
                    <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-top: 24px; text-align: center;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">⏰ برجاء التوجه للصيدلية لاستلام الدواء خلال <strong>24 ساعة</strong></p>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 13px;">
                    <p style="margin: 0;">© صيدلية الشفاء ${new Date().getFullYear()} - جميع الحقوق محفوظة</p>
                </div>
            </div>
        `;

        // Send notification email to pharmacy
        sendBrevoEmail({
            to: 'restaurant22nassar@gmail.com',
            toName: 'صيدلية الشفاء',
            subject: `حجز جديد #${reservationNumber} - ${product.name}`,
            htmlContent: emailHtml
        }).then(result => {
            if (result.success) {
                console.log('✅ تم إرسال إيميل الإشعار للصيدلية عبر Brevo');
            } else {
                console.warn('⚠️ فشل إرسال إيميل الإشعار:', result.error);
            }
        });

        // Send confirmation email to customer if they provided email
        if (email) {
            sendBrevoEmail({
                to: email,
                toName: name,
                subject: `تأكيد حجزك #${reservationNumber} - صيدلية الشفاء`,
                htmlContent: emailHtml
            }).then(result => {
                if (result.success) {
                    console.log('✅ تم إرسال إيميل التأكيد للعميل:', email);
                } else {
                    console.warn('⚠️ فشل إرسال إيميل التأكيد للعميل:', result.error);
                }
            });
        }

        // ===== 5. تحديث واجهة المستخدم =====
        product.stock -= 1;

        document.getElementById('reservationId').textContent = reservationNumber;

        // عرض رسالة النجاح
        reservationForm.style.display = 'none';
        successMessage.classList.remove('hidden');

        // تحديث الكروت
        applyFilters();

    } catch (error) {
        console.error('❌ خطأ في الحجز:', error);

        // Fallback: still show success locally even if Supabase fails
        product.stock -= 1;
        document.getElementById('reservationId').textContent = reservationNumber;
        reservationForm.style.display = 'none';
        successMessage.classList.remove('hidden');
        applyFilters();
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.style.opacity = '1';
    }
});

// ===== تشغيل التطبيق =====
loadProductsFromSupabase();
