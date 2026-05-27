package com.robomart.controller;

import com.robomart.model.CheckoutRequest;
import com.robomart.model.Order;
import com.robomart.model.Product;
import com.robomart.service.CatalogService;
import com.robomart.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalogService;
    private final OrderService orderService;

    public CatalogController(CatalogService catalogService, OrderService orderService) {
        this.catalogService = catalogService;
        this.orderService = orderService;
    }

    @GetMapping("/products")
    public List<Product> getProducts() {
        return catalogService.getAllProducts();
    }

    @GetMapping("/products/{id}")
    public Product getProduct(@PathVariable Long id) {
        return catalogService.getProductById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    @PostMapping("/checkout")
    public Order placeOrder(@Valid @RequestBody CheckoutRequest request) {
        try {
            return orderService.placeOrder(request);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }

    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable Long id) {
        try {
            return orderService.getOrder(id);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, exception.getMessage(), exception);
        }
    }
}
