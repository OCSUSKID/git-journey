package com.robomart.service;

import com.robomart.model.CartItem;
import com.robomart.model.CheckoutRequest;
import com.robomart.model.Order;
import com.robomart.model.OrderLine;
import com.robomart.model.Product;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OrderService {

    private final CatalogService catalogService;
    private final AtomicLong orderSequence = new AtomicLong(1001);
    private final Map<Long, Order> orders = new LinkedHashMap<>();

    public OrderService(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    public Order placeOrder(CheckoutRequest request) {
        List<OrderLine> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CartItem item : request.items()) {
            Product product = catalogService.getProductById(item.productId())
                    .orElseThrow(() -> new IllegalArgumentException("Unknown product: " + item.productId()));

            if (item.quantity() > product.stock()) {
                throw new IllegalArgumentException("Only " + product.stock() + " units available for " + product.name());
            }

            BigDecimal lineTotal = product.price()
                    .multiply(BigDecimal.valueOf(item.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);

            subtotal = subtotal.add(lineTotal);
            lines.add(new OrderLine(
                    product.id(),
                    product.name(),
                    item.quantity(),
                    product.price(),
                    lineTotal));
        }

        BigDecimal shipping = subtotal.compareTo(new BigDecimal("300")) >= 0
                ? BigDecimal.ZERO
                : new BigDecimal("18.00");
        BigDecimal total = subtotal.add(shipping).setScale(2, RoundingMode.HALF_UP);
        long orderId = orderSequence.getAndIncrement();

        Order order = new Order(
                orderId,
                request.customerName(),
                request.email(),
                request.shippingAddress(),
                List.copyOf(lines),
                subtotal.setScale(2, RoundingMode.HALF_UP),
                shipping.setScale(2, RoundingMode.HALF_UP),
                total,
                Instant.now());

        orders.put(orderId, order);
        return order;
    }

    public Order getOrder(Long orderId) {
        Order order = orders.get(orderId);
        if (order == null) {
            throw new IllegalArgumentException("Order not found: " + orderId);
        }
        return order;
    }
}
