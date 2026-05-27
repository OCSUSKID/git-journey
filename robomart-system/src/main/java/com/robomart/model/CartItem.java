package com.robomart.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CartItem(
        @NotNull Long productId,
        @Min(1) int quantity) {
}
