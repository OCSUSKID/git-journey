package com.robomart.model;

import java.math.BigDecimal;

public record OrderLine(
        Long productId,
        String productName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal) {
}
