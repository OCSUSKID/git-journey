package com.robomart.model;

import java.math.BigDecimal;
import java.util.List;

public record Product(
        Long id,
        String name,
        String category,
        String description,
        BigDecimal price,
        String sku,
        List<String> specs,
        int stock,
        String imageUrl) {
}
