# Data Sources & Citations

This project uses synthetic data modeled on the following publicly available Indian health datasets and government standards.

## Public Datasets Referenced

### 1. All India Health Centres Directory
- **Source:** National Health Authority / IndiaAI
- **URL:** https://aikosh.indiaai.gov.in/home/datasets/details/all_india_health_centres_directory_till_october_2016.html
- **Used for:** Health centre names, locations (lat/lng coordinates), and facility types (PHC/CHC) in Anand district, Gujarat
- **License:** Open Government Data (OGD) Platform India

### 2. Indian Public Health Standards (IPHS) Guidelines
- **Source:** Ministry of Health & Family Welfare, Government of India
- **URL:** https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=971&lid=154
- **Used for:** Bed norms (PHC: 6 beds, CHC: 30 beds), doctor staffing norms (PHC: 1-2 MOs, CHC: 4+ specialists), and patient capacity guidelines
- **License:** Government of India public document

### 3. National List of Essential Medicines (NLEM) 2022
- **Source:** Ministry of Health & Family Welfare, Government of India
- **URL:** https://main.mohfw.gov.in/newshighlights-31
- **Used for:** Medicine names, categories, and typical stock levels at PHC/CHC level
- **License:** Government of India public document

### 4. Health Management Information System (HMIS)
- **Source:** Ministry of Health & Family Welfare
- **URL:** https://hmis.mohfw.gov.in
- **Used for:** Typical daily OPD (outpatient department) footfall patterns at district PHCs (40-100/day) and CHCs (150-300/day)
- **License:** Open Government Data

### 5. Indian Medicine Dataset
- **Source:** GitHub (junioralive/Indian-Medicine-Dataset)
- **URL:** https://github.com/junioralive/Indian-Medicine-Dataset
- **Used for:** Reference for medicine names, compositions, and pricing in Indian market
- **License:** Open source

### 6. District-wise Availability of Health Centres (March 2017)
- **Source:** IndiaAI / NHA
- **URL:** https://aikosh.indiaai.gov.in/home/datasets/details/district_wise_availability_of_health_centres_march_2017.html
- **Used for:** Understanding district-level health infrastructure distribution
- **License:** Open Government Data (OGD) Platform India

## APIs Used

| API | Purpose | Free Tier |
|-----|---------|-----------|
| Firebase Authentication | Google Sign-In for health workers | Spark plan (free) |
| Firebase Realtime Database | Live data sync for dashboard | 1GB storage, 10GB transfer/month |
| Google Gemini API (gemini-1.5-flash) | AI predictions & recommendations | 15 RPM, 1500 requests/day |
| Google Maps JavaScript API | District map visualization | $200/month free credit |

## Data Generation Methodology

The seed data in `scripts/seed-database.ts` generates realistic synthetic records by:

1. **Health Centres:** 5 real PHC/CHC facilities in Anand district, Gujarat with actual geographic coordinates
2. **Medicines:** Essential medicines from NLEM 2022, with stock levels reflecting typical PHC/CHC inventory patterns
3. **Footfall:** Daily patient counts following HMIS-reported patterns with realistic weekday/weekend variance
4. **Staffing:** Doctor counts per IPHS norms with realistic attendance patterns (absenteeism rates of 20-40% documented in Indian PHCs)
5. **Consumption:** 30-day daily consumption trends with ±30% natural variance for AI prediction training

All data is synthetic but statistically representative of real Indian public health centre operations.
