package com.robomart.model;

import java.time.Instant;
import java.util.Map;

public record ApiError(
        String message,
        Map<String, String> fieldErrors,
        Instant timestamp) {
}
