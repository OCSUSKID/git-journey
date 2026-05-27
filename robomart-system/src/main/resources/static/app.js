const cart = new Map();
const shippingThreshold = 300;
const flatShipping = 18;
const elements = {
    productGrid: document.getElementById('productGrid'),
    productCount: document.getElementById('productCount'),
    cartItems: document.getElementById('cartItems'),
    subtotal: document.getElementById('subtotal'),
    shipping: document.getElementById('shipping'),
    total: document.getElementById('total'),
    statusMessage: document.getElementById('statusMessage'),
    checkoutForm: document.getElementById('checkoutForm'),
    productCardTemplate: document.getElementById('productCardTemplate')
};

function money(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

function cartSnapshot(products) {
    return Array.from(cart.entries()).map(([productId, quantity]) => {
        const product = products.find(item => item.id === productId);
        return product ? { product, quantity } : null;
    }).filter(Boolean);
}

function renderCart(products) {
    const items = cartSnapshot(products);
    const subtotal = items.reduce((sum, entry) => sum + (entry.product.price * entry.quantity), 0);
    const shipping = subtotal === 0 ? 0 : subtotal >= shippingThreshold ? 0 : flatShipping;
    const total = subtotal + shipping;

    elements.productCount.textContent = products.reduce((sum, product) => sum + product.stock, 0);
    elements.subtotal.textContent = money(subtotal);
    elements.shipping.textContent = subtotal === 0 ? money(flatShipping) : money(shipping);
    elements.total.textContent = money(total);

    if (!items.length) {
        elements.cartItems.innerHTML = '<div class="empty-state">Your cart is empty.</div>';
        return;
    }

    elements.cartItems.innerHTML = items.map(({ product, quantity }) => `
        <div class="cart-item">
            <strong>${product.name}</strong>
            <span>${quantity} x ${money(product.price)} = ${money(product.price * quantity)}</span>
            <span>${product.category} • ${product.sku}</span>
        </div>
    `).join('');
}

function renderProducts(products) {
    elements.productGrid.innerHTML = '';

    products.forEach(product => {
        const fragment = elements.productCardTemplate.content.cloneNode(true);
        const image = fragment.querySelector('img');
        const pill = fragment.querySelector('.pill');
        const sku = fragment.querySelector('.sku');
        const title = fragment.querySelector('h3');
        const description = fragment.querySelector('.description');
        const specList = fragment.querySelector('.spec-list');
        const price = fragment.querySelector('.price');
        const stock = fragment.querySelector('.stock');
        const addButton = fragment.querySelector('.add-button');

        image.src = product.imageUrl;
        image.alt = `${product.name} preview`;
        pill.textContent = product.category;
        sku.textContent = product.sku;
        title.textContent = product.name;
        description.textContent = product.description;
        price.textContent = money(product.price);
        stock.textContent = `${product.stock} units ready`;
        specList.innerHTML = product.specs.map(spec => `<li>${spec}</li>`).join('');
        addButton.textContent = 'Add to cart';
        addButton.addEventListener('click', () => {
            cart.set(product.id, (cart.get(product.id) || 0) + 1);
            elements.statusMessage.textContent = `${product.name} added to cart.`;
            renderCart(products);
        });

        elements.productGrid.appendChild(fragment);
    });
}

async function loadProducts() {
    const response = await fetch('/api/products');
    if (!response.ok) {
        throw new Error('Unable to load products');
    }

    return response.json();
}

async function placeOrder(event, products) {
    event.preventDefault();
    const items = cartSnapshot(products).map(({ product, quantity }) => ({
        productId: product.id,
        quantity
    }));

    if (!items.length) {
        elements.statusMessage.textContent = 'Add at least one product before checking out.';
        return;
    }

    const formData = new FormData(elements.checkoutForm);
    const payload = {
        customerName: formData.get('customerName'),
        email: formData.get('email'),
        shippingAddress: formData.get('shippingAddress'),
        items
    };

    const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const body = await response.json();
    if (!response.ok) {
        elements.statusMessage.textContent = body.message || 'Checkout failed.';
        return;
    }

    cart.clear();
    renderCart(products);
    elements.checkoutForm.reset();
    elements.statusMessage.textContent = `Order #${body.id} placed for ${money(body.total)}.`;
}

async function init() {
    try {
        const products = await loadProducts();
        renderProducts(products);
        renderCart(products);
        elements.checkoutForm.addEventListener('submit', event => placeOrder(event, products));
    } catch (error) {
        elements.statusMessage.textContent = error.message;
        elements.cartItems.innerHTML = '<div class="empty-state">Unable to load the catalog.</div>';
    }
}

init();
