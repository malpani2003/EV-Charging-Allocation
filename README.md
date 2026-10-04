# EV Charging Allocation Platform

## Product Vision

Build a production-oriented EV charging platform that helps EV users discover the best nearby charging station, intelligently allocate a charging slot, manage their charging journey, and securely manage their account and vehicles.

The project should demonstrate real-world backend engineering, system design, database transactions, authentication, concurrency handling, and a scalable mobile/web user experience.

## Core User Journey

```text
Register / Login
      ↓
Add Vehicle
      ↓
Enter Current Battery + Connector
      ↓
Find Nearby Charging Stations
      ↓
Intelligent Station Recommendation
      ↓
Reserve Charging Slot
      ↓
Start Charging
      ↓
Complete / Cancel Charging
      ↓
Track Charging & Allocation History
```

## Key Product Capabilities

### 1. User Authentication

- User registration and login
- Secure bcrypt password hashing
- Short-lived JWT access tokens
- Long-lived refresh tokens
- Refresh-token storage, rotation and revocation
- Logout/session management
- Authenticated user identity across APIs

### 2. Vehicle Management

- Add and manage EV vehicles
- Store battery capacity, connector type and efficiency
- Associate vehicles with authenticated users

### 3. Charging Station Discovery

- Find nearby charging stations using geographic distance
- Filter stations based on connector compatibility
- Show charger power, availability and estimated waiting time
- Station details and availability information

### 4. Intelligent Charging Allocation

Recommend the most suitable charging station using multiple factors:

- Distance
- Waiting time
- Charging power
- Station availability/trust

The allocation engine should calculate a ranking score instead of simply selecting the nearest station.

### 5. Reliable Slot Reservation

- Reserve an available charging slot
- Prevent overbooking under concurrent requests
- Use PostgreSQL transactions and row-level locking
- Automatically expire abandoned reservations
- Release slots when reservations expire or are cancelled

### 6. Charging Lifecycle

Support the complete allocation lifecycle:

```text
ALLOCATED
    ↓
CHARGING
    ↓
COMPLETED
```

Also support:

```text
ALLOCATED → CANCELLED
ALLOCATED → EXPIRED
```

Track:

- Start time
- Completion time
- Initial battery
- Final battery
- Energy consumed
- Reservation expiry

### 7. Security & Authorization

- Passwords never stored in plaintext
- JWT-based authentication
- Protected APIs
- User ownership validation
- Users can only access/manage their own vehicles and allocations
- Refresh-token revocation and rotation

## Technical Architecture

```text
React Native + React Native Web
              ↓
          REST APIs
              ↓
      Express.js Backend
              ↓
 Controllers → Services
              ↓
        PostgreSQL
              ↓
       PostgreSQL/PostGIS
```

The backend follows a layered architecture with clear separation between routes, controllers, services, database access and utility modules.

## Engineering Highlights

The project should demonstrate:

- REST API design
- Authentication & authorization
- JWT access/refresh token architecture
- PostgreSQL relational modelling
- PostgreSQL transactions
- Row-level locking / concurrency control
- Geospatial distance calculation
- Intelligent recommendation/scoring
- Background expiry processing
- Data integrity using foreign keys and constraints
- Secure password storage
- Ownership-based authorization
- Production-oriented error handling

## Future Scalability

The architecture should be designed so the platform can later support:

- Redis caching
- Real-time charger availability
- Multiple charging sessions
- Charger telemetry
- Payments and billing
- Notifications
- Dynamic pricing
- Charging station operator dashboards
- Distributed allocation services
- Event-driven processing

## Final Product Goal

The final project should feel like a **mini production-grade EV charging platform**, demonstrating how a real system would handle authentication, station discovery, intelligent allocation, concurrent reservations, charging lifecycle management, data consistency and scalability.

The README should emphasize **engineering decisions and system-design depth**, not just a list of CRUD features.
