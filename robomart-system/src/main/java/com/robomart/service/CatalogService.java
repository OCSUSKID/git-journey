package com.robomart.service;

import com.robomart.model.Product;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class CatalogService {

    private final List<Product> products = List.of(
            new Product(
                    1L,
                    "Titan Servo Motor",
                    "Motion",
                    "High-torque servo motor for articulated arms and delivery bots.",
                    new BigDecimal("89.99"),
                    "RM-MOT-1001",
                    List.of("24V DC", "High torque", "Metal gearbox", "Quiet drive"),
                    48,
                    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80"),
            new Product(
                    2L,
                    "Lidar Navigator Pro",
                    "Sensors",
                    "Compact lidar sensor with 360-degree environmental mapping.",
                    new BigDecimal("199.00"),
                    "RM-SEN-2304",
                    List.of("360 sweep", "Range 12m", "USB-C", "Indoor/outdoor"),
                    21,
                    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=901&q=80"),
            new Product(
                    3L,
                    "OmniWheel Set",
                    "Mobility",
                    "Four-wheel omni-directional kit for agile warehouse robots.",
                    new BigDecimal("149.50"),
                    "RM-MOB-4020",
                    List.of("4-wheel set", "Aluminum hubs", "Shock resistant", "High grip"),
                    35,
                    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80"),
            new Product(
                    4L,
                    "Control Core SBC",
                    "Computing",
                    "Single-board controller with AI-ready accelerator support.",
                    new BigDecimal("239.00"),
                    "RM-COM-8110",
                    List.of("8GB RAM", "Wi-Fi 6", "Dual camera", "Edge AI ready"),
                    16,
                    "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=900&q=80"),
            new Product(
                    5L,
                    "PowerCell Pack 48V",
                    "Power",
                    "Long-life battery pack with hot-swap support for field robots.",
                    new BigDecimal("279.99"),
                    "RM-POW-5122",
                    List.of("48V output", "Hot-swappable", "BMS protected", "Fast charge"),
                    12,
                    "https://images.unsplash.com/photo-1581092919535-7146f400a793?auto=format&fit=crop&w=900&q=80"),
            new Product(
                    6L,
                    "Gripper Claw Kit",
                    "End Effectors",
                    "Precision claw assembly for pick-and-place automation.",
                    new BigDecimal("129.75"),
                    "RM-END-7088",
                    List.of("Precision grip", "Modular fingers", "Alloy frame", "Servo compatible"),
                    27,
                    "https://images.unsplash.com/photo-1581091870622-2f5e1d8c0f8b?auto=format&fit=crop&w=900&q=80")
    );

    public List<Product> getAllProducts() {
        return products;
    }

    public Optional<Product> getProductById(Long productId) {
        return products.stream().filter(product -> product.id().equals(productId)).findFirst();
    }
}
