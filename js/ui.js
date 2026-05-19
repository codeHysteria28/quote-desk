// Shared UI helpers + quote-page bootstrapping.
import { getProduct } from './products.js';
import { addQuote } from './storage.js';

// --- URL hash helpers ---

function writeHash(inputs) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(inputs)) {
        params.set(k, String(v));
    }
    history.replaceState(null, '', '#' + params.toString());
}

function clearHash() {
    history.replaceState(null, '', window.location.pathname + window.location.search);
}

function readHash(fields) {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    const data = {};
    let found = false;
    for (const field of fields) {
        if (params.has(field.name)) {
            const raw = params.get(field.name);
            data[field.name] = field.type === 'number' ? Number(raw) : raw;
            found = true;
        }
    }
    return found ? data : null;
}

export function formatCurrency(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString();
}

function renderField(field) {
    const id = `f_${field.name}`;
    const hasPrefix = !!field.prefix;
    const hasSuffix = !!field.suffix;
    const wrapClass = ['input-wrap', hasPrefix ? 'has-prefix' : '', hasSuffix ? 'has-suffix' : ''].filter(Boolean).join(' ');

    let control;
    if (field.type === 'select') {
        control = `<select id="${id}" name="${field.name}" required>
            ${field.options.map(o => `<option value="${o.value}" ${o.value === field.value ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>`;
    } else {
        const attrs = [
            `id="${id}"`,
            `name="${field.name}"`,
            `type="${field.type}"`,
            field.min !== undefined ? `min="${field.min}"` : '',
            field.max !== undefined ? `max="${field.max}"` : '',
            field.step !== undefined ? `step="${field.step}"` : '',
            field.value !== undefined ? `value="${field.value}"` : '',
            'required'
        ].filter(Boolean).join(' ');
        control = `<input ${attrs}>`;
    }

    return `
        <div class="form-row">
            <label for="${id}">${field.label}</label>
            <div class="${wrapClass}">
                ${hasPrefix ? `<span class="input-affix prefix">${field.prefix}</span>` : ''}
                ${control}
                ${hasSuffix ? `<span class="input-affix suffix">${field.suffix}</span>` : ''}
            </div>
        </div>
    `;
}

function readForm(form, fields) {
    const data = {};
    for (const field of fields) {
        const el = form.elements.namedItem(field.name);
        if (!el) continue;
        if (field.type === 'number') {
            data[field.name] = Number(el.value);
        } else {
            data[field.name] = el.value;
        }
    }
    return data;
}

function renderResult(container, quote, product) {
    container.innerHTML = `
        <p class="quote-result__headline">${quote.headline}</p>
        <ul class="quote-result__list">
            ${quote.breakdown.map(([k, v]) => `<li><span class="label">${k}</span><span class="value">${v}</span></li>`).join('')}
        </ul>
        <p class="muted small">Estimate for ${product.name.toLowerCase()}. Not a financial offer.</p>
    `;
}

export function initQuotePage(productId) {
    const product = getProduct(productId);
    if (!product) {
        console.error(`Unknown product: ${productId}`);
        return;
    }

    document.title = `${product.name} quote — QuoteDesk`;

    const header = document.getElementById('quote-header');
    if (header) {
        header.innerHTML = `
            <div class="product-card__icon" aria-hidden="true">${product.icon}</div>
            <div>
                <h1>${product.name}</h1>
                <p class="muted" style="margin:0">${product.blurb}</p>
            </div>
        `;
    }

    const formEl = document.getElementById('quote-form');
    formEl.innerHTML = `
        ${product.fields.map(renderField).join('')}
        <div id="form-error" class="form-error" hidden></div>
        <div class="form-actions">
            <button type="submit" class="btn btn--primary">Get quote</button>
            <button type="button" id="save-btn" class="btn" disabled>Save to history</button>
            <button type="button" id="share-btn" class="btn" disabled>Copy link</button>
            <button type="reset" class="btn btn--ghost">Reset</button>
        </div>
    `;

    const resultEl = document.getElementById('quote-result');
    const errorEl = document.getElementById('form-error');
    const saveBtn = document.getElementById('save-btn');
    const shareBtn = document.getElementById('share-btn');
    let lastQuote = null;
    let lastInputs = null;

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
    }
    function clearError() {
        errorEl.textContent = '';
        errorEl.hidden = true;
    }

    function applyQuote(inputs) {
        try {
            const quote = product.calculate(inputs);
            lastQuote = quote;
            lastInputs = inputs;
            renderResult(resultEl, quote, product);
            saveBtn.disabled = false;
            shareBtn.disabled = false;
            writeHash(inputs);
        } catch (err) {
            lastQuote = null;
            lastInputs = null;
            saveBtn.disabled = true;
            shareBtn.disabled = true;
            resultEl.innerHTML = '<p class="quote-result__empty">Adjust the inputs to see your estimate.</p>';
            showError(err.message || 'Unable to calculate a quote.');
        }
    }

    formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError();
        if (!formEl.reportValidity()) return;
        const inputs = readForm(formEl, product.fields);
        applyQuote(inputs);
    });

    formEl.addEventListener('reset', () => {
        clearError();
        lastQuote = null;
        lastInputs = null;
        saveBtn.disabled = true;
        shareBtn.disabled = true;
        resultEl.innerHTML = '<p class="quote-result__empty">Fill out the form and click <strong>Get quote</strong> to see your estimate.</p>';
        clearHash();
    });

    saveBtn.addEventListener('click', () => {
        if (!lastQuote || !lastInputs) return;
        addQuote({
            productId: product.id,
            productName: product.name,
            inputs: lastInputs,
            headline: lastQuote.headline,
            breakdown: lastQuote.breakdown
        });
        const flash = document.createElement('div');
        flash.className = 'saved-flash';
        flash.textContent = 'Saved to your quote history.';
        resultEl.prepend(flash);
        saveBtn.disabled = true;
        setTimeout(() => flash.remove(), 3000);
    });

    shareBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            const orig = shareBtn.textContent;
            shareBtn.textContent = 'Copied!';
            setTimeout(() => { shareBtn.textContent = orig; }, 2000);
        }).catch(() => {
            prompt('Copy this link to share your quote:', window.location.href);
        });
    });

    // Restore inputs from URL hash and auto-calculate if present
    const hashInputs = readHash(product.fields);
    if (hashInputs) {
        for (const field of product.fields) {
            if (field.name in hashInputs) {
                const el = formEl.elements.namedItem(field.name);
                if (el) el.value = hashInputs[field.name];
            }
        }
        applyQuote(readForm(formEl, product.fields));
    } else {
        resultEl.innerHTML = '<p class="quote-result__empty">Fill out the form and click <strong>Get quote</strong> to see your estimate.</p>';
    }
}
