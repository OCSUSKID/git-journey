package com.robomart.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CheckoutRequest(
        @NotBlank String customerName,
        @Email @NotBlank String email,
        @NotBlank String shippingAddress,
        @NotEmpty @Valid List<CartItem> items) {
}
