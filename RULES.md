# DISTRIBUTED ARCHITECTURE RULES (MANDATORY)

## 1. System Model

The system must support dual-mode operation:

- Edge mode (with Local Windows App)
- Cloud mode (without Local App)

However:

THE SYSTEM MUST HAVE A SINGLE SOURCE OF TRUTH.

---

## 2. Authority Model

Cloud MUST be the authoritative source for:

- Booking data
- Revenue data
- Customer data
- Pricing data
- Inventory data

Local App MUST NOT override Cloud data.

Local App acts as:

- Edge executor
- Cache
- Offline processor

---

## 3. Device Connection Rules

Devices MUST NOT decide their server.

Connection flow:

1. Device connects to Cloud
2. Cloud returns:
   - Local endpoint (if available)
   - Cloud endpoint fallback
3. Device connects accordingly

---

## 4. Failover Rules

If Local App is unavailable:

- Devices MUST fallback to Cloud
- No interruption allowed

If Local App comes back:

- Cloud MUST sync data to Local
- Devices reconnect to Local

---

## 5. Data Consistency Rules

All write operations MUST follow:

- Single writer pattern (Cloud)
- Event-based synchronization

Local writes MUST be:

- queued
- synced
- conflict-resolved by Cloud

---

## 6. Conflict Resolution

When conflict occurs:

Priority:

1. Cloud authoritative timestamp
2. Event ordering
3. Device priority (optional)

Local MUST NOT resolve conflicts independently.

---

## 7. Configuration Management

All configurations MUST be versioned.

Devices MUST:

- apply only valid version
- support rollback

---

## 8. Update Safety

Update process MUST include:

- checksum validation
- signature verification
- pre-update health check
- post-update health check
- rollback capability

---

## 9. Offline Operation

Local App MUST:

- cache data
- queue operations
- sync when online

Devices MUST:

- continue working without Cloud
- reconnect automatically

---

## 10. Command Execution

All commands MUST:

- have unique ID
- be idempotent
- be acknowledged
- have timeout

---

## 11. Security

- All communication MUST be authenticated
- Devices MUST have unique identity
- No shared credentials
- TLS required

---

## 12. Logging

System MUST log:

- all events
- all commands
- all failures
- all sync operations

---

## 13. No Breaking Changes Rule

Agent MUST NOT:

- change API contract without versioning
- change data schema without migration
- deploy incompatible updates

---

## 14. Deployment Strategy

Use:

- blue-green deployment
- canary rollout
- rollback-first design

---

## 15. Acceptance Criteria

System is valid only if:

- Devices switch between Local and Cloud seamlessly
- No duplicate data occurs
- No data loss occurs
- No downtime during update
- No conflict causes business error