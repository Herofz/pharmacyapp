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
            headers: { 'Content-Type': 'application/json' },
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

// ===== Fallback Products =====
const fallbackProducts = [
    { id: 1, name: "بانادول إكسترا - 24 قرص", price: 45, stock: 120, category: "مسكنات" },
    { id: 2, name: "بانادول أدفانس 500 ملجم - 24 قرص", price: 36, stock: 95, category: "مسكنات" },
    { id: 3, name: "بنادول ساينس (للجيوب الأنفية)", price: 55, stock: 0, category: "مسكنات" },
    { id: 4, name: "بروفين 600 ملجم - 20 قرص", price: 50, stock: 5, category: "مسكنات" },
    { id: 5, name: "بروفين 400 ملجم - 20 قرص", price: 36, stock: 78, category: "مسكنات" },
    { id: 6, name: "كتافلام 50 ملجم - 20 قرص", price: 45, stock: 60, category: "مسكنات" },
    { id: 7, name: "كتافاست فوار 50 ملجم - 9 أكياس", price: 54, stock: 42, category: "مسكنات" },
    { id: 8, name: "فولتارين 50 ملجم - 20 قرص", price: 48, stock: 33, category: "مسكنات" },
    { id: 9, name: "أدول 500 ملجم - 24 قرص", price: 18, stock: 200, category: "مسكنات" },
    { id: 10, name: "نوفالدول 1000 ملجم - 20 قرص", price: 22, stock: 150, category: "مسكنات" },
    { id: 11, name: "أسبرين بروتكت 100 ملجم - 20 قرص", price: 30, stock: 110, category: "مسكنات" },
    { id: 12, name: "ترامادول 50 ملجم (بروشتة فقط)", price: 25, stock: 0, category: "مسكنات" },
    { id: 13, name: "كيتوفان 200 ملجم - 20 كبسولة", price: 42, stock: 55, category: "مسكنات" },
    { id: 14, name: "ريفو 320 ملجم - 10 أقراص", price: 7, stock: 300, category: "مسكنات" },
];

// ===== Pill SVG Icon =====
function pillSVG(size = 64) {
    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="20" width="48" height="24" rx="12" stroke="#0284c7" stroke-width="2"/>
        <line x1="32" y1="20" x2="32" y2="44" stroke="#0284c7" stroke-width="2" stroke-dasharray="3 2"/>
        <rect x="8" y="20" width="24" height="24" rx="12" fill="#0284c7" opacity="0.15"/>
    </svg>`;
}

// ===== Global State =====
let products = [];
let cart = [];
let activeCategory = 'الكل';
let categories = ['الكل'];
let isUsingSupabase = false;

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');

// ===== Load Products from Supabase =====
async function loadProductsFromSupabase() {
    try {
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
            products = data.map(p => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                stock: p.stock,
                category: p.category,
                available: p.available
            }));
            isUsingSupabase = true;
            console.log(`✅ تم تحميل ${products.length} دواء من Supabase بنجاح`);
            updateConnectionStatus('connected', `متصل بـ Supabase (${products.length} دواء)`);
        } else {
            throw new Error('No products found');
        }
    } catch (error) {
        console.warn('⚠️ فشل الاتصال بـ Supabase:', error.message);
        products = fallbackProducts;
        isUsingSupabase = false;
        updateConnectionStatus('offline', 'وضع غير متصل (بيانات محلية)');
    }
    categories = ['الكل', ...new Set(products.map(p => p.category))];
    renderFilters();
    applyFilters();
    const countEl = document.querySelector('.product-count');
    if (countEl) countEl.textContent = `(${products.length} دواء)`;
}

function updateConnectionStatus(status, text) {
    const el = document.getElementById('connectionStatus');
    if (!el) return;
    el.querySelector('.status-dot').className = 'status-dot ' + status;
    el.querySelector('.status-text').textContent = text;
}

// ===== Render Products =====
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

        const cartItem = cart.find(c => c.id === product.id);
        const inCart = cartItem ? cartItem.qty : 0;

        let buttonHtml;
        if (!inStock) {
            buttonHtml = `<button class="btn" disabled>نفدت الكمية</button>`;
        } else if (inCart > 0) {
            buttonHtml = `
                <div class="product-cart-controls">
                    <button class="btn btn-success" onclick="addToCart(${product.id})" ${inCart >= product.stock ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" style="vertical-align:middle;margin-left:6px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        أضف المزيد (${inCart})
                    </button>
                </div>`;
        } else {
            buttonHtml = `<button class="btn btn-primary" onclick="addToCart(${product.id})" ${buttonDisabled}>أضف للسلة</button>`;
        }

        let stockClass = 'stock-good';
        if (product.stock === 0) stockClass = 'stock-out';
        else if (product.stock <= 10) stockClass = 'stock-low';
        else if (product.stock <= 50) stockClass = 'stock-medium';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-placeholder">${pillSVG()}</div>
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
                ${buttonHtml}
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

// ===== Filters =====
function renderFilters() {
    const container = document.getElementById('filtersContainer');
    if (!container) return;
    container.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (cat === activeCategory ? ' active' : '');
        const count = cat === 'الكل' ? products.length : products.filter(p => p.category === cat).length;
        btn.textContent = cat + ' (' + count + ')';
        btn.onclick = () => { activeCategory = cat; applyFilters(); renderFilters(); };
        container.appendChild(btn);
    });
}

function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    let filtered = products;
    if (activeCategory !== 'الكل') filtered = filtered.filter(p => p.category === activeCategory);
    if (term) filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
}

searchInput.addEventListener('input', () => applyFilters());

// ===== CART =====
window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existing = cart.find(c => c.id === productId);
    if (existing) {
        if (existing.qty < product.stock) {
            existing.qty++;
        }
    } else {
        cart.push({ id: productId, qty: 1 });
    }

    updateCartUI();
    applyFilters(); // Re-render products to update button state
    showToast(`تمت إضافة "${product.name}" للسلة`);
};

window.removeFromCart = function(productId) {
    cart = cart.filter(c => c.id !== productId);
    updateCartUI();
    applyFilters();
};

window.changeQty = function(productId, delta) {
    const item = cart.find(c => c.id === productId);
    if (!item) return;
    const product = products.find(p => p.id === productId);

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(c => c.id !== productId);
    } else if (product && item.qty > product.stock) {
        item.qty = product.stock;
    }

    updateCartUI();
    applyFilters();
};

function getCartTotal() {
    return cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + (product ? product.price * item.qty : 0);
    }, 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const count = getCartCount();
    badge.textContent = count;
    badge.classList.toggle('hidden-badge', count === 0);

    // Bump animation
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 300);

    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const footerEl = document.getElementById('cartFooter');

    if (cart.length === 0) {
        container.innerHTML = '';
        emptyEl.classList.remove('hidden');
        footerEl.classList.add('hidden');
        return;
    }

    emptyEl.classList.add('hidden');
    footerEl.classList.remove('hidden');

    container.innerHTML = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';
        return `
            <div class="cart-item">
                <div class="cart-item-icon">${pillSVG(28)}</div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-price">${product.price * item.qty} جنيه</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                        <span class="cart-item-qty">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${item.id}, 1)" ${item.qty >= product.stock ? 'disabled' : ''}>+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">حذف</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('cartTotal').textContent = getCartTotal() + ' جنيه';
}

// ===== Cart Toggle =====
window.toggleCart = function() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
};

// ===== Toast =====
let toastTimeout;
function showToast(text) {
    const toast = document.getElementById('toast');
    document.getElementById('toastText').textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== Checkout =====
window.openCheckout = function() {
    if (cart.length === 0) return;

    // Close cart sidebar
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');

    // Build summary
    const summaryHtml = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';
        return `
            <div class="checkout-item">
                <span class="checkout-item-name">${product.name}</span>
                <span class="checkout-item-qty">×${item.qty}</span>
                <span class="checkout-item-price">${product.price * item.qty} جنيه</span>
            </div>
        `;
    }).join('');

    document.getElementById('checkoutSummary').innerHTML = summaryHtml;
    document.getElementById('checkoutTotal').textContent = getCartTotal() + ' جنيه';

    // Show modal
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('successMessage').classList.add('hidden');
    document.getElementById('checkoutForm').reset();
    document.getElementById('checkoutModal').classList.add('active');
};

window.closeCheckout = function() {
    document.getElementById('checkoutModal').classList.remove('active');
};

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('checkoutModal')) closeCheckout();
});

// ===== Submit Checkout =====
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحجز...';
    submitBtn.style.opacity = '0.7';

    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const reservationNumber = 'RES-' + Math.floor(100000 + Math.random() * 900000);
    const totalAmount = getCartTotal();

    try {
        if (isUsingSupabase) {
            // 1. Create reservation
            const resDB = await supabase.from('reservations');
            const { data: resData, error: resError } = await resDB.insert([{
                reservation_number: reservationNumber,
                customer_name: name,
                customer_phone: phone,
                status: 'pending',
                total_amount: totalAmount
            }]);
            if (resError) throw resError;
            console.log('✅ تم حفظ الحجز:', resData);

            // 2. Create reservation items
            if (resData && resData[0]) {
                const itemsDB = await supabase.from('reservation_items');
                const items = cart.map(ci => {
                    const p = products.find(pr => pr.id === ci.id);
                    return {
                        reservation_id: resData[0].id,
                        product_id: ci.id,
                        quantity: ci.qty,
                        unit_price: p.price,
                        total_price: p.price * ci.qty
                    };
                });
                await itemsDB.insert(items);
            }

            // 3. Update stock for each item
            for (const ci of cart) {
                const p = products.find(pr => pr.id === ci.id);
                if (p) {
                    const pDB = await supabase.from('products');
                    const chain = await pDB.update({ stock: p.stock - ci.qty });
                    await chain.eq('id', ci.id);
                }
            }
            console.log('✅ تم تحديث المخزون');
        }

        // 4. Build email
        const itemsRows = cart.map(ci => {
            const p = products.find(pr => pr.id === ci.id);
            return `<tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 8px;font-weight:500;">${p.name}</td>
                <td style="padding:10px 8px;text-align:center;">${ci.qty}</td>
                <td style="padding:10px 8px;text-align:center;color:#0284c7;font-weight:700;">${p.price * ci.qty} جنيه</td>
            </tr>`;
        }).join('');

        const emailHtml = `
            <div dir="rtl" style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
                <div style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:32px;text-align:center;border-radius:0 0 20px 20px;">
                    <h1 style="color:#fff;margin:0;font-size:28px;">صيدلية الشفاء 💊</h1>
                    <p style="color:#e0f2fe;margin:8px 0 0;font-size:16px;">تأكيد حجز جديد</p>
                </div>
                <div style="padding:32px;background:#fff;margin:20px;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
                    <div style="background:#ecfdf5;border-right:4px solid #10b981;padding:16px;border-radius:8px;margin-bottom:24px;">
                        <p style="margin:0;color:#065f46;font-weight:bold;font-size:18px;">✅ تم تأكيد الحجز بنجاح</p>
                        <p style="margin:4px 0 0;color:#047857;">رقم الحجز: <strong style="font-size:20px;">${reservationNumber}</strong></p>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <tr style="border-bottom:1px solid #e5e7eb;">
                            <td style="padding:10px 0;color:#6b7280;">اسم العميل:</td>
                            <td style="padding:10px 0;font-weight:bold;">${name}</td>
                        </tr>
                        <tr style="border-bottom:1px solid #e5e7eb;">
                            <td style="padding:10px 0;color:#6b7280;">رقم التليفون:</td>
                            <td style="padding:10px 0;font-weight:bold;">${phone}</td>
                        </tr>
                    </table>
                    <h3 style="margin:24px 0 12px;font-size:16px;">تفاصيل الطلب:</h3>
                    <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <thead>
                            <tr style="background:#f1f5f9;"><th style="padding:10px 8px;text-align:right;">الدواء</th><th style="padding:10px 8px;text-align:center;">الكمية</th><th style="padding:10px 8px;text-align:center;">السعر</th></tr>
                        </thead>
                        <tbody>${itemsRows}</tbody>
                        <tfoot>
                            <tr style="background:#eff6ff;"><td style="padding:12px 8px;font-weight:bold;" colspan="2">الإجمالي</td><td style="padding:12px 8px;text-align:center;font-weight:bold;color:#0284c7;font-size:16px;">${totalAmount} جنيه</td></tr>
                        </tfoot>
                    </table>
                    <div style="background:#eff6ff;padding:16px;border-radius:8px;margin-top:24px;text-align:center;">
                        <p style="margin:0;color:#1e40af;font-size:14px;">⏰ برجاء التوجه للصيدلية لاستلام الأدوية خلال <strong>24 ساعة</strong></p>
                    </div>
                </div>
                <div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">
                    <p style="margin:0;">© صيدلية الشفاء ${new Date().getFullYear()}</p>
                </div>
            </div>
        `;

        // Send to pharmacy
        sendBrevoEmail({
            to: 'phoeyo4324@gmail.com',
            toName: 'صيدلية الشفاء',
            subject: `حجز جديد #${reservationNumber} (${cart.length} أدوية - ${totalAmount} جنيه)`,
            htmlContent: emailHtml
        });

        // Send to customer
        if (email) {
            sendBrevoEmail({
                to: email,
                toName: name,
                subject: `تأكيد حجزك #${reservationNumber} - صيدلية الشفاء`,
                htmlContent: emailHtml
            });
        }

        // 5. Update local stock & clear cart
        cart.forEach(ci => {
            const p = products.find(pr => pr.id === ci.id);
            if (p) p.stock -= ci.qty;
        });
        cart = [];
        updateCartUI();
        applyFilters();

        // Show success
        document.getElementById('reservationId').textContent = reservationNumber;
        document.getElementById('checkoutForm').style.display = 'none';
        document.getElementById('checkoutSummary').style.display = 'none';
        document.getElementById('successMessage').classList.remove('hidden');

    } catch (error) {
        console.error('❌ خطأ في الحجز:', error);
        // Fallback - still show success
        cart.forEach(ci => {
            const p = products.find(pr => pr.id === ci.id);
            if (p) p.stock -= ci.qty;
        });
        cart = [];
        updateCartUI();
        applyFilters();
        document.getElementById('reservationId').textContent = reservationNumber;
        document.getElementById('checkoutForm').style.display = 'none';
        document.getElementById('checkoutSummary').style.display = 'none';
        document.getElementById('successMessage').classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';
    }
});

// ===== Init =====
updateCartUI();
loadProductsFromSupabase();
