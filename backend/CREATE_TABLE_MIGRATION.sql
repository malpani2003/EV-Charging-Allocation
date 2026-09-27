ev_charging
│
├── users
│     └── vehicles
│
├── stations
│     └── station_connectors
│              │
│              └── connectors
│
└── allocations
       ├── users
       ├── vehicles
       └── stations


CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    registration_number VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    battery_capacity DECIMAL(6,2),
    consumption_per_km DECIMAL(5,3),
    connector_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);