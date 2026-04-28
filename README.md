# Geography-Aware Referral System

This directory is the workspace for the geography-aware referral system project.

## Pending Requirements

Before we start building, we need to define the following parameters for the system:

1. **Geographic Rules:**
   * **Natural & Psychological Barriers:** Patients may be reluctant to cross significant physical barriers (e.g., crossing rivers in New Mexico like the Rio Grande).
   * **Traffic Nuances:** System must consider traffic congestion and realistic drive times, not just straight-line distance.
   * **Construction & Routing:** Referrals should ideally account for major road closures or prolonged construction zones.
   * *(Note: This strongly implies we need a robust routing API (like Google Maps API or Mapbox) rather than simple geographic distance queries).*
2. **Location Detection Strategy:**
   * **Patient Address Input:** The system will use a provided patient address. 
   * *(Note: This means we will need a Geocoding service to convert the provided text address into latitude/longitude coordinates before we can perform routing or proximity calculations).*
3. **Technology Stack:**
   * **Frontend:** React.js
   * **Backend:** Node.js
   * **Database:** PostgreSQL with PostGIS (for advanced spatial queries and storing geographic boundaries like rivers or service areas).

## Next Steps

Now that the core requirements are defined, we can move on to designing the architecture and setting up the project structure.
