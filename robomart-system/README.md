# Robomart System

Robomart is a fictional ecommerce storefront for robot parts and industrial hardware. The app is built with Spring Boot and serves both a REST API and a browser storefront.

## What it includes

- Fictional product catalog for motion, sensors, power, computing, and end-effectors
- Cart and checkout flow in the browser
- Spring Boot REST endpoints for products and orders
- In-memory order handling so the app runs without a database

## Tech Stack

- Java 17
- Spring Boot 3
- Spring Web
- Spring Validation
- Static HTML, CSS, and JavaScript served from Spring Boot

## Run Locally

1. Install Java 17 or later.
2. Install Maven.
3. From the project root, run:

```bash
mvn spring-boot:run
```

4. Open `http://localhost:8080` in your browser.

## API

- `GET /api/products` returns the catalog
- `GET /api/products/{id}` returns a single product
- `POST /api/checkout` places a fictional order
- `GET /api/orders/{id}` fetches an order by id

## Notes

The app uses in-memory storage, so orders are reset when the application restarts.
