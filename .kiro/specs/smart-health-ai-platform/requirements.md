# Requirements Document

## Introduction

Smart Health AI Platform is a multilingual, AI-driven health centre management system designed for district-level Primary Health Centres (PHCs) and Community Health Centres (CHCs) in India. The platform provides real-time monitoring of medicine stock levels, patient footfall, bed availability, doctor attendance, and test availability. It leverages Google Gemini AI to generate early stock-out warnings, demand forecasts, smart resource redistribution recommendations, and auto-flags underperforming centres for district administrators.

This is a hackathon MVP prototype focused on demonstrating an end-to-end functional flow using Google Cloud technologies (Cloud Run, Vertex AI/Gemini, Firebase, BigQuery) with a modern UI.

## Glossary

- **Platform**: The Smart Health AI web application
- **Dashboard**: The main interface displaying health centre metrics and AI insights
- **Health_Centre**: A PHC (Primary Health Centre) or CHC (Community Health Centre) in a district
- **District_Admin**: A district-level health administrator who oversees multiple health centres
- **Centre_Staff**: Staff at an individual health centre who input and view data
- **Stock_Monitor**: The subsystem responsible for tracking medicine inventory levels
- **AI_Engine**: The Gemini AI-powered subsystem that generates predictions, warnings, and recommendations
- **Alert_System**: The subsystem that generates and displays warnings and notifications
- **Resource_Optimizer**: The AI subsystem that recommends redistribution of resources across centres
- **Firebase_Auth**: The Firebase Authentication service used for user login
- **Realtime_DB**: Firebase Realtime Database used for live data synchronization

## Requirements

### Requirement 1: User Authentication

**User Story:** As a District_Admin or Centre_Staff, I want to log in to the Platform securely, so that I can access health centre data relevant to my role.

#### Acceptance Criteria

1. THE Platform SHALL authenticate users via Firebase_Auth using Google Sign-In
2. WHEN a user successfully authenticates, THE Platform SHALL redirect the user to the Dashboard
3. IF authentication fails, THEN THE Platform SHALL display an error message indicating the reason for failure (e.g., network unavailable, account not authorized) and the message SHALL remain visible until the user dismisses it or retries authentication
4. WHEN a user is authenticated, THE Platform SHALL assign a role of District_Admin or Centre_Staff based on a role field stored in the user profile in Realtime_DB
5. IF an authenticated user has no role field defined in their user profile, THEN THE Platform SHALL deny access to the Dashboard and display a message indicating that the account is not authorized for Platform access
6. IF an unauthenticated user attempts to access any Platform page other than the login page, THEN THE Platform SHALL redirect the user to the login page

### Requirement 2: Health Centre Dashboard

**User Story:** As a District_Admin, I want to view a consolidated dashboard of all health centres in my district, so that I can monitor overall health infrastructure status at a glance.

#### Acceptance Criteria

1. WHEN a District_Admin accesses the Dashboard, THE Platform SHALL display a summary card for each Health_Centre in the admin's assigned district, showing medicine stock status as a colour-coded indicator (green/yellow/red), bed availability count, doctor attendance count, and patient footfall count
2. THE Dashboard SHALL reflect data changes from Realtime_DB subscriptions within 5 seconds of the source update
3. WHEN a District_Admin selects a specific Health_Centre, THE Platform SHALL navigate to a detailed view for that centre
4. THE Dashboard SHALL display a district-level map showing Health_Centre locations as markers using Google Maps Platform
5. IF no Health_Centre data is available for the district, THEN THE Platform SHALL display a message indicating that no health centre data is currently available

### Requirement 3: Medicine Stock Monitoring

**User Story:** As Centre_Staff, I want to view and update current medicine stock levels, so that I can maintain accurate inventory records.

#### Acceptance Criteria

1. THE Stock_Monitor SHALL display a list of medicines with current quantity, reorder level, and expiry date for each Health_Centre, sorted alphabetically by medicine name
2. WHEN Centre_Staff updates a medicine quantity, THE Stock_Monitor SHALL validate that the entered value is a whole number between 0 and 999,999 and persist the change to Realtime_DB within 2 seconds
3. IF a medicine quantity update fails to persist to Realtime_DB, THEN THE Stock_Monitor SHALL display an error message indicating the update was not saved and retain the previously stored quantity value
4. WHEN a medicine quantity falls below its reorder level, THE Alert_System SHALL display a stock-low warning on the Dashboard within 5 seconds of the quantity change
5. THE Stock_Monitor SHALL colour-code medicines as green when quantity is above the reorder level, yellow when quantity is at or below the reorder level but above 50 percent of the reorder level, and red when quantity is at or below 50 percent of the reorder level

### Requirement 4: Patient Footfall Tracking

**User Story:** As a District_Admin, I want to view daily patient footfall across centres, so that I can understand demand patterns and allocate resources appropriately.

#### Acceptance Criteria

1. WHEN Centre_Staff enters a daily patient count as an integer between 0 and 10000 for a given date, THE Platform SHALL store the record in Realtime_DB with the date, Health_Centre identifier, and patient count value
2. IF Centre_Staff submits a patient count for a date and Health_Centre that already has a record, THEN THE Platform SHALL replace the existing record with the new value
3. WHEN the Platform successfully stores a patient footfall record, THE Platform SHALL display a confirmation message to Centre_Staff within 2 seconds
4. IF Centre_Staff submits a patient count that is not an integer between 0 and 10000, THEN THE Platform SHALL reject the entry and display an error message indicating the valid range
5. THE Dashboard SHALL display patient footfall as a bar chart showing the last 7 days of data for each Health_Centre, displaying zero for any day with no recorded data
6. WHEN a District_Admin views the district Dashboard, THE Platform SHALL display total daily footfall aggregated across all centres for the current day

### Requirement 5: Bed Availability Tracking

**User Story:** As a District_Admin, I want to see real-time bed availability across centres, so that I can direct patients to centres with available capacity.

#### Acceptance Criteria

1. THE Platform SHALL display total beds and available beds for each Health_Centre on the Dashboard, where available beds is a non-negative integer not exceeding total beds
2. WHEN Centre_Staff updates bed availability, THE Platform SHALL reflect the change on the Dashboard within 2 seconds via Realtime_DB
3. IF Centre_Staff submits a bed availability value that is negative or exceeds the total bed count for that Health_Centre, THEN THE Platform SHALL reject the update and display an error message indicating the valid range (0 to total beds)
4. IF available beds at a Health_Centre reach zero, THEN THE Alert_System SHALL display a full-capacity alert on the district Dashboard
5. WHEN available beds at a previously full-capacity Health_Centre increase above zero, THE Alert_System SHALL remove the full-capacity alert from the district Dashboard within 2 seconds

### Requirement 6: Doctor Attendance Tracking

**User Story:** As a District_Admin, I want to monitor doctor attendance at each centre, so that I can identify staffing gaps.

#### Acceptance Criteria

1. THE Platform SHALL display the number of doctors present versus total assigned for each Health_Centre
2. WHEN Centre_Staff records doctor attendance for the day, THE Platform SHALL store the record in Realtime_DB with the date and Health_Centre identifier within 2 seconds
3. IF doctor attendance at a Health_Centre falls below 50 percent of assigned doctors, THEN THE Alert_System SHALL flag the centre as understaffed on the district Dashboard with a visual indicator
4. IF Centre_Staff submits a doctor attendance count that exceeds the total assigned doctors for that Health_Centre, THEN THE Platform SHALL reject the entry and display an error message indicating the valid range

### Requirement 7: AI-Powered Stock-Out Predictions

**User Story:** As a District_Admin, I want AI-generated early warnings about potential medicine stock-outs, so that I can arrange resupply before stock runs out.

#### Acceptance Criteria

1. WHEN a District_Admin requests AI insights, THE AI_Engine SHALL analyse current stock levels and consumption trends from the last 30 days across all Health_Centres in the district using Gemini API and return results within 30 seconds
2. WHEN the AI_Engine completes analysis, THE AI_Engine SHALL generate a predicted stock-out date for each medicine that is below 30 percent of its reorder level, displaying the Health_Centre name, medicine name, current quantity, and predicted stock-out calendar date
3. THE AI_Engine SHALL present predictions in a ranked list sorted by urgency (nearest stock-out date first)
4. IF the AI_Engine cannot generate a prediction for a medicine due to fewer than 7 days of recorded consumption data, THEN THE AI_Engine SHALL display a message indicating insufficient historical data for that medicine
5. IF the Gemini API is unreachable or returns an error, THEN THE AI_Engine SHALL display a message indicating the service is temporarily unavailable and retain any previously displayed predictions

### Requirement 8: Smart Resource Redistribution Recommendations

**User Story:** As a District_Admin, I want AI-driven recommendations for redistributing medicines and staff across centres, so that I can balance resources within the district.

#### Acceptance Criteria

1. WHEN a District_Admin requests redistribution recommendations, THE Resource_Optimizer SHALL analyse stock levels, patient footfall, and bed occupancy across all centres using Gemini API and return results within 30 seconds
2. WHEN the Resource_Optimizer completes analysis, THE Resource_Optimizer SHALL generate between 1 and 10 transfer recommendations, each indicating source centre, destination centre, resource type, and quantity
3. WHEN the Resource_Optimizer generates a recommendation, THE Resource_Optimizer SHALL provide a natural language explanation of no more than 500 characters for each recommendation stating why the transfer is suggested
4. IF the Gemini API is unavailable or returns an error during analysis, THEN THE Resource_Optimizer SHALL display a message indicating that recommendations cannot be generated and prompt the District_Admin to retry
5. IF fewer than 2 centres have sufficient stock, footfall, or bed occupancy data to compare, THEN THE Resource_Optimizer SHALL display a message indicating insufficient data to generate redistribution recommendations

### Requirement 9: Auto-Flag Underperforming Centres

**User Story:** As a District_Admin, I want the Platform to automatically identify centres that are underperforming or under-resourced, so that I can take corrective action.

#### Acceptance Criteria

1. WHEN a District_Admin views the Dashboard, THE AI_Engine SHALL evaluate each Health_Centre based on stock levels, doctor attendance, bed occupancy, and patient footfall, and SHALL display the evaluation results within 10 seconds
2. WHEN two or more of the following metrics for a Health_Centre fall into critical thresholds — stock below reorder level, doctor attendance below 50 percent of assigned doctors, available beds at zero, or daily patient footfall exceeding the centre's designated maximum patient capacity — THEN THE AI_Engine SHALL flag that Health_Centre as underperforming
3. THE Dashboard SHALL visually distinguish flagged centres with a red indicator and a summary listing each metric that breached its critical threshold
4. IF the AI_Engine cannot complete the evaluation due to unavailable data or service failure, THEN THE Dashboard SHALL display a notification indicating that centre evaluation is temporarily unavailable

### Requirement 10: Multilingual Support

**User Story:** As Centre_Staff working in a rural area, I want to use the Platform in my local language, so that I can operate it without English proficiency.

#### Acceptance Criteria

1. THE Platform SHALL support English and Hindi as interface languages
2. WHEN a user selects a language preference, THE Platform SHALL persist the preference in the user profile and render all UI labels and AI-generated text in the selected language
3. THE Platform SHALL default to English for first-time users who have not yet selected a language preference
4. THE AI_Engine SHALL generate recommendations and alerts in the user-selected language using Gemini API multilingual capabilities
5. IF the AI_Engine cannot generate text in the selected language, THEN THE Platform SHALL display the text in English with a notice indicating the translation is unavailable

### Requirement 11: Cloud Deployment

**User Story:** As a developer, I want the Platform deployable to Google Cloud Run, so that it can be accessed publicly for demonstration.

#### Acceptance Criteria

1. THE Platform SHALL include a Dockerfile that builds successfully and produces a container image deployable to Google Cloud Run as a single service
2. THE Platform SHALL use environment variables for all runtime configuration including Firebase credentials, Gemini API key, Google Maps API key, and the PORT variable provided by Cloud Run
3. IF one or more required environment variables are not set at startup, THEN THE Platform SHALL exit with a non-zero status code and log a message indicating which variables are missing
4. WHEN deployed, THE Platform SHALL serve the frontend and backend API from a single Cloud Run service URL, responding to HTTP requests on the PORT environment variable within 30 seconds of container start
