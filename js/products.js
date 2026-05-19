// Product catalog: metadata, form schema, and pure quote-calculation functions.
// All formulas are textbook approximations for demonstration only.

const svg = (path) => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICONS = {
    auto: svg('<path d="M5 17h14M6 17l1.5-5.5A2 2 0 0 1 9.43 10h5.14a2 2 0 0 1 1.93 1.5L18 17"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>'),
    mortgage: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
    personal: svg('<circle cx="12" cy="8" r="3.5"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>'),
    credit: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>'),
    life: svg('<path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z"/>'),
    savings: svg('<path d="M3 8h14a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4h-1l-1 3h-3l-1-2H8l-1 2H4l-.5-3A6 6 0 0 1 3 13z"/><circle cx="16" cy="11" r="1"/>')
};

export const products = [
    {
        id: 'auto',
        name: 'Auto loan',
        blurb: 'Estimate monthly payments for a new or used vehicle.',
        page: 'quote-auto.html',
        icon: ICONS.auto,
        fields: [
            { name: 'price', label: 'Vehicle price', type: 'number', min: 1000, max: 250000, step: 100, value: 30000, prefix: '$' },
            { name: 'down', label: 'Down payment', type: 'number', min: 0, max: 250000, step: 100, value: 3000, prefix: '$' },
            { name: 'apr', label: 'Annual interest rate', type: 'number', min: 0, max: 30, step: 0.05, value: 6.0, suffix: '%' },
            { name: 'term', label: 'Loan term (months)', type: 'number', min: 12, max: 84, step: 12, value: 60 }
        ],
        calculate: ({ price, down, apr, term }) => {
            if (down >= price) throw new Error('Down payment must be less than the vehicle price.');
            const principal = price - down;
            const monthly = amortizedPayment(principal, apr, term);
            const total = monthly * term;
            return {
                headline: `${formatMoney(monthly)} / month`,
                breakdown: [
                    ['Amount financed', formatMoney(principal)],
                    ['Monthly payment', formatMoney(monthly)],
                    ['Total of payments', formatMoney(total)],
                    ['Total interest', formatMoney(total - principal)]
                ]
            };
        }
    },
    {
        id: 'mortgage',
        name: 'Home mortgage',
        blurb: 'Estimate a fixed-rate mortgage payment with taxes optional.',
        page: 'quote-mortgage.html',
        icon: ICONS.mortgage,
        fields: [
            { name: 'price', label: 'Home price', type: 'number', min: 10000, max: 5000000, step: 1000, value: 450000, prefix: '$' },
            { name: 'down', label: 'Down payment', type: 'number', min: 0, max: 5000000, step: 1000, value: 90000, prefix: '$' },
            { name: 'apr', label: 'Annual interest rate', type: 'number', min: 0, max: 20, step: 0.05, value: 6.75, suffix: '%' },
            { name: 'years', label: 'Loan term (years)', type: 'number', min: 5, max: 40, step: 5, value: 30 },
            { name: 'taxInsurance', label: 'Monthly tax + insurance (optional)', type: 'number', min: 0, max: 10000, step: 25, value: 350, prefix: '$' }
        ],
        calculate: ({ price, down, apr, years, taxInsurance }) => {
            if (down >= price) throw new Error('Down payment must be less than the home price.');
            const principal = price - down;
            const months = years * 12;
            const piMonthly = amortizedPayment(principal, apr, months);
            const totalMonthly = piMonthly + (taxInsurance || 0);
            const totalInterest = piMonthly * months - principal;
            return {
                headline: `${formatMoney(totalMonthly)} / month`,
                breakdown: [
                    ['Loan amount', formatMoney(principal)],
                    ['Principal & interest', formatMoney(piMonthly)],
                    ['Taxes & insurance', formatMoney(taxInsurance || 0)],
                    ['Total monthly payment', formatMoney(totalMonthly)],
                    ['Total interest over loan', formatMoney(totalInterest)]
                ]
            };
        }
    },
    {
        id: 'personal',
        name: 'Personal loan',
        blurb: 'Quick estimate for a fixed unsecured personal loan.',
        page: 'quote-personal.html',
        icon: ICONS.personal,
        fields: [
            { name: 'amount', label: 'Loan amount', type: 'number', min: 500, max: 100000, step: 100, value: 10000, prefix: '$' },
            { name: 'apr', label: 'Annual interest rate', type: 'number', min: 0, max: 36, step: 0.1, value: 11.5, suffix: '%' },
            { name: 'term', label: 'Loan term (months)', type: 'number', min: 6, max: 84, step: 6, value: 36 }
        ],
        calculate: ({ amount, apr, term }) => {
            const monthly = amortizedPayment(amount, apr, term);
            const total = monthly * term;
            return {
                headline: `${formatMoney(monthly)} / month`,
                breakdown: [
                    ['Amount borrowed', formatMoney(amount)],
                    ['Monthly payment', formatMoney(monthly)],
                    ['Total of payments', formatMoney(total)],
                    ['Total interest', formatMoney(total - amount)]
                ]
            };
        }
    },
    {
        id: 'credit',
        name: 'Credit card payoff',
        blurb: 'See how long it takes to pay off a balance at a given payment.',
        page: 'quote-credit.html',
        icon: ICONS.credit,
        fields: [
            { name: 'balance', label: 'Current balance', type: 'number', min: 50, max: 100000, step: 10, value: 5000, prefix: '$' },
            { name: 'apr', label: 'Card APR', type: 'number', min: 0, max: 40, step: 0.1, value: 22.9, suffix: '%' },
            { name: 'payment', label: 'Monthly payment', type: 'number', min: 10, max: 100000, step: 10, value: 200, prefix: '$' }
        ],
        calculate: ({ balance, apr, payment }) => {
            const monthlyRate = apr / 100 / 12;
            const minViable = balance * monthlyRate;
            if (payment <= minViable) {
                throw new Error(`Monthly payment must exceed monthly interest of ${formatMoney(minViable)}.`);
            }
            // Months to payoff with fixed payment:
            // n = -ln(1 - r*B/P) / ln(1 + r)
            let months;
            if (monthlyRate === 0) {
                months = balance / payment;
            } else {
                months = -Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate);
            }
            months = Math.ceil(months);
            const totalPaid = payment * months;
            return {
                headline: `~${months} months to pay off`,
                breakdown: [
                    ['Starting balance', formatMoney(balance)],
                    ['Monthly payment', formatMoney(payment)],
                    ['Months to payoff', `${months}`],
                    ['Total paid', formatMoney(totalPaid)],
                    ['Total interest', formatMoney(Math.max(0, totalPaid - balance))]
                ]
            };
        }
    },
    {
        id: 'life',
        name: 'Life insurance',
        blurb: 'Ballpark monthly premium for a term life policy.',
        page: 'quote-life.html',
        icon: ICONS.life,
        fields: [
            { name: 'age', label: 'Your age', type: 'number', min: 18, max: 75, step: 1, value: 35 },
            { name: 'coverage', label: 'Coverage amount', type: 'number', min: 25000, max: 2000000, step: 25000, value: 500000, prefix: '$' },
            { name: 'term', label: 'Term length (years)', type: 'number', min: 10, max: 30, step: 5, value: 20 },
            { name: 'smoker', label: 'Tobacco use', type: 'select', value: 'no', options: [
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes' }
            ] }
        ],
        calculate: ({ age, coverage, term, smoker }) => {
            // Very rough demo factor table: base rate per $1,000 of coverage per month.
            const ageFactor = 0.025 + Math.max(0, age - 25) * 0.004;
            const termFactor = 1 + Math.max(0, term - 10) * 0.04;
            const smokerFactor = smoker === 'yes' ? 2.4 : 1;
            const monthly = (coverage / 1000) * ageFactor * termFactor * smokerFactor;
            return {
                headline: `${formatMoney(monthly)} / month`,
                breakdown: [
                    ['Coverage', formatMoney(coverage)],
                    ['Term length', `${term} years`],
                    ['Estimated monthly premium', formatMoney(monthly)],
                    ['Estimated annual premium', formatMoney(monthly * 12)],
                    ['Total premiums over term', formatMoney(monthly * 12 * term)]
                ]
            };
        }
    },
    {
        id: 'savings',
        name: 'Savings / CD',
        blurb: 'Project compound growth on a savings account or CD.',
        page: 'quote-savings.html',
        icon: ICONS.savings,
        fields: [
            { name: 'principal', label: 'Initial deposit', type: 'number', min: 0, max: 1000000, step: 100, value: 10000, prefix: '$' },
            { name: 'monthly', label: 'Monthly contribution', type: 'number', min: 0, max: 10000, step: 25, value: 200, prefix: '$' },
            { name: 'apy', label: 'Annual yield (APY)', type: 'number', min: 0, max: 20, step: 0.05, value: 4.5, suffix: '%' },
            { name: 'years', label: 'Years to save', type: 'number', min: 1, max: 50, step: 1, value: 5 }
        ],
        calculate: ({ principal, monthly, apy, years }) => {
            const r = apy / 100 / 12;
            const n = years * 12;
            const fvPrincipal = principal * Math.pow(1 + r, n);
            const fvContrib = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
            const future = fvPrincipal + fvContrib;
            const contributed = principal + monthly * n;
            return {
                headline: `${formatMoney(future)} after ${years} year${years === 1 ? '' : 's'}`,
                breakdown: [
                    ['Total deposited', formatMoney(contributed)],
                    ['Interest earned', formatMoney(future - contributed)],
                    ['Final balance', formatMoney(future)]
                ]
            };
        }
    }
];

export function getProduct(id) {
    return products.find(p => p.id === id);
}

// --- helpers ---

function amortizedPayment(principal, aprPercent, months) {
    const r = aprPercent / 100 / 12;
    if (r === 0) return principal / months;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
}

function formatMoney(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}
