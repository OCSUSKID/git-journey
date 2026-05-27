package com.robomart.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record Order(
        Long id,
        String customerName,
        String email,
        String shippingAddress,
        List<OrderLine> items,
        BigDecimal subtotal,
        BigDecimal shipping,
        BigDecimal total,
        Instant placedAt) {
}
