/**
 * Static translation dictionary for UI strings not yet migrated to next-intl.
 * Pattern from WealthSeva: flat key → language → string map.
 * Zero latency, no API calls, works offline.
 */

type Language = 'en' | 'hi';

const translations: Record<string, Record<Language, string>> = {
  // Centre detail page
  back_to_dashboard: { en: 'Back to Dashboard', hi: 'डैशबोर्ड पर वापस' },
  centre_details: { en: 'Centre Details', hi: 'केंद्र विवरण' },
  
  // Overview tab
  patient_insights: { en: 'Patient Insights', hi: 'रोगी अंतर्दृष्टि' },
  footfall_chart: { en: '7-Day Patient Footfall', hi: '7-दिन रोगी फुटफॉल' },
  bed_availability: { en: 'Bed Availability', hi: 'बिस्तर उपलब्धता' },
  doctor_attendance: { en: 'Doctor Attendance', hi: 'डॉक्टर उपस्थिति' },
  record_footfall: { en: 'Record Footfall', hi: 'फुटफॉल दर्ज करें' },
  
  // Stock tab
  medicine_stock: { en: 'Medicine Stock', hi: 'दवा स्टॉक' },
  add_medicine: { en: 'Add Medicine', hi: 'दवा जोड़ें' },
  raise_indent: { en: 'Raise Indent', hi: 'इंडेंट उठाएं' },
  medicine_name: { en: 'Medicine Name', hi: 'दवा का नाम' },
  quantity: { en: 'Quantity', hi: 'मात्रा' },
  reorder_level: { en: 'Reorder Level', hi: 'पुनः आदेश स्तर' },
  expiry_date: { en: 'Expiry Date', hi: 'समाप्ति तिथि' },
  status: { en: 'Status', hi: 'स्थिति' },
  actions: { en: 'Actions', hi: 'कार्रवाई' },
  sufficient: { en: 'Sufficient', hi: 'पर्याप्त' },
  low_stock: { en: 'Low Stock', hi: 'कम स्टॉक' },
  critical: { en: 'Critical', hi: 'गंभीर' },
  
  // Directives
  active_directives: { en: 'Active Directives', hi: 'सक्रिय निर्देश' },
  completed_directives: { en: 'Completed Directives', hi: 'पूर्ण निर्देश' },
  acknowledge: { en: 'Acknowledge', hi: 'स्वीकार करें' },
  in_progress: { en: 'In Progress', hi: 'प्रगति में' },
  mark_complete: { en: 'Mark Complete', hi: 'पूर्ण चिह्नित करें' },
  add_remarks: { en: 'Add Remarks', hi: 'टिप्पणी जोड़ें' },
  issue_directive: { en: 'Issue New Directive', hi: 'नया निर्देश जारी करें' },
  issued: { en: 'issued', hi: 'जारी' },
  normal: { en: 'NORMAL', hi: 'सामान्य' },
  high: { en: 'HIGH', hi: 'उच्च' },
  
  // Infrastructure
  infrastructure: { en: 'Infrastructure', hi: 'अवसंरचना' },
  staff_details: { en: 'Staff Details', hi: 'स्टाफ विवरण' },
  lab_equipment: { en: 'Lab Equipment', hi: 'प्रयोगशाला उपकरण' },
  facilities: { en: 'Facilities', hi: 'सुविधाएं' },
  
  // Health Camps
  health_camps: { en: 'Health Camps', hi: 'स्वास्थ्य शिविर' },
  schedule_camp: { en: 'Schedule New Camp', hi: 'नया शिविर निर्धारित करें' },
  scheduled: { en: 'Scheduled', hi: 'निर्धारित' },
  ongoing: { en: 'Ongoing', hi: 'जारी' },
  completed: { en: 'Completed', hi: 'पूर्ण' },
  cancelled: { en: 'Cancelled', hi: 'रद्द' },
  target: { en: 'Target', hi: 'लक्ष्य' },
  actual: { en: 'Actual', hi: 'वास्तविक' },
  
  // Audit
  audit_log: { en: 'Audit Log', hi: 'ऑडिट लॉग' },
  
  // Demo directive translations (for seeded data)
  demo_directive_dental_title: { en: 'Discuss about dental camp', hi: 'दंत शिविर के बारे में चर्चा करें' },
  demo_directive_dental_desc: { en: 'give all the advertisement planning to get more beneficiaries for dental camp', hi: 'दंत शिविर के लिए अधिक लाभार्थी प्राप्त करने के लिए सभी विज्ञापन योजना दें' },
  demo_directive_health_camp_title: { en: 'plan on health camp', hi: 'स्वास्थ्य शिविर की योजना बनाएं' },
  demo_directive_health_camp_desc: { en: 'come up with beneficiary details', hi: 'लाभार्थी विवरण तैयार करें' },
  demo_directive_insulin_title: { en: 'Emergency Insulin supply for CHC Anand', hi: 'CHC आनंद के लिए आपातकालीन इंसुलिन आपूर्ति' },
  demo_directive_insulin_desc: { en: 'Arrange emergency insulin supply from district warehouse', hi: 'जिला गोदाम से आपातकालीन इंसुलिन आपूर्ति की व्यवस्था करें' },
  demo_directive_rotation_title: { en: 'Rotate 1 MO from PHC Petlad to PHC Khambhat', hi: 'PHC पेटलाद से 1 चिकित्सा अधिकारी PHC खंभात में स्थानांतरित करें' },
  demo_directive_rotation_desc: { en: 'PHC Khambhat is critically understaffed. Deploy 1 Medical Officer from PHC Petlad temporarily.', hi: 'PHC खंभात में गंभीर कर्मचारी कमी है। PHC पेटलाद से 1 चिकित्सा अधिकारी अस्थायी रूप से तैनात करें।' },
  demo_directive_inspection_title: { en: 'Quarterly inspection of PHC Borsad cold chain', hi: 'PHC बोरसद कोल्ड चेन का तिमाही निरीक्षण' },
  demo_directive_inspection_desc: { en: 'Schedule and conduct quarterly cold chain inspection at PHC Borsad', hi: 'PHC बोरसद में तिमाही कोल्ड चेन निरीक्षण निर्धारित और संचालित करें' },
  demo_issued_by: { en: 'Issued by', hi: 'जारीकर्ता' },
  demo_completed: { en: 'Completed', hi: 'पूर्ण' },
  demo_remarks: { en: 'Remarks', hi: 'टिप्पणी' },

  dept_general_medicine: { en: 'General Medicine', hi: 'सामान्य चिकित्सा' },
  dept_dental: { en: 'Dental', hi: 'दंत चिकित्सा' },
  dept_ophthalmology: { en: 'Ophthalmology', hi: 'नेत्र विज्ञान' },
  dept_dermatology: { en: 'Dermatology', hi: 'त्वचा रोग' },
  dept_paediatrics: { en: 'Paediatrics', hi: 'बाल रोग' },
  dept_gynaecology: { en: 'Gynaecology/ANC', hi: 'स्त्री रोग/प्रसव पूर्व' },
  dept_preventive: { en: 'Preventive Health Check', hi: 'निवारक स्वास्थ्य जांच' },
  dept_emergency: { en: 'Emergency', hi: 'आपातकालीन' },

  // Visit types
  visit_new_opd: { en: 'New OPD', hi: 'नया ओपीडी' },
  visit_followup: { en: 'Follow-up OPD', hi: 'फॉलो-अप ओपीडी' },
  visit_emergency: { en: 'Emergency', hi: 'आपातकालीन' },
  visit_lab: { en: 'Lab/Investigation only', hi: 'केवल जांच/प्रयोगशाला' },

  // Gender
  gender_male: { en: 'Male', hi: 'पुरुष' },
  gender_female: { en: 'Female', hi: 'महिला' },
  gender_other: { en: 'Other', hi: 'अन्य' },

  // Age groups
  age_0_5: { en: '0-5 years', hi: '0-5 वर्ष' },
  age_6_14: { en: '6-14 years', hi: '6-14 वर्ष' },
  age_15_30: { en: '15-30 years', hi: '15-30 वर्ष' },
  age_31_50: { en: '31-50 years', hi: '31-50 वर्ष' },
  age_51_65: { en: '51-65 years', hi: '51-65 वर्ष' },
  age_65_plus: { en: '65+ years', hi: '65+ वर्ष' },

  // Directive types
  directive_indent: { en: 'Emergency Indent', hi: 'आपातकालीन इंडेंट' },
  directive_staff_rotation: { en: 'Staff Rotation', hi: 'स्टाफ रोटेशन' },
  directive_inspection: { en: 'Inspection', hi: 'निरीक्षण' },
  directive_patient_diversion: { en: 'Patient Diversion', hi: 'रोगी डायवर्शन' },
  directive_equipment_request: { en: 'Equipment Request', hi: 'उपकरण अनुरोध' },
  directive_general: { en: 'General', hi: 'सामान्य' },

  // Camp types
  camp_screening: { en: 'Screening', hi: 'जांच शिविर' },
  camp_vaccination: { en: 'Vaccination', hi: 'टीकाकरण' },
  camp_blood_donation: { en: 'Blood Donation', hi: 'रक्तदान' },
  camp_eye_checkup: { en: 'Eye Checkup', hi: 'नेत्र जांच' },
  camp_dental: { en: 'Dental', hi: 'दंत शिविर' },
  camp_maternal: { en: 'Maternal', hi: 'मातृ स्वास्थ्य' },
  camp_general_checkup: { en: 'General Checkup', hi: 'सामान्य जांच' },
  camp_awareness: { en: 'Awareness', hi: 'जागरूकता' },
  camp_other: { en: 'Other', hi: 'अन्य' },

  save: { en: 'Save', hi: 'सहेजें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  edit: { en: 'Edit', hi: 'संपादित करें' },
  delete: { en: 'Delete', hi: 'हटाएं' },
  submit: { en: 'Submit', hi: 'जमा करें' },
  loading: { en: 'Loading...', hi: 'लोड हो रहा है...' },
  no_data: { en: 'No data available', hi: 'कोई डेटा उपलब्ध नहीं' },
  today: { en: 'Today', hi: 'आज' },
  total: { en: 'Total', hi: 'कुल' },
  available: { en: 'Available', hi: 'उपलब्ध' },
  present: { en: 'Present', hi: 'उपस्थित' },
  assigned: { en: 'Assigned', hi: 'नियुक्त' },
  patients: { en: 'Patients', hi: 'रोगी' },
  visits: { en: 'visits', hi: 'दौरे' },
  
  // Contacts page
  contacts: { en: 'Contacts', hi: 'संपर्क' },
  
  // Patient Insights
  patient_insights_all_time: { en: 'Patient Insights — All Time', hi: 'रोगी अंतर्दृष्टि — सभी समय' },
  no_visit_data: { en: 'No detailed visit data recorded yet.', hi: 'अभी तक कोई विस्तृत विज़िट डेटा दर्ज नहीं किया गया।' },
  department: { en: 'Department', hi: 'विभाग' },
  click_to_filter: { en: 'click to filter', hi: 'फ़िल्टर करने के लिए क्लिक करें' },
  age_group: { en: 'Age Group', hi: 'आयु वर्ग' },
  gender: { en: 'Gender', hi: 'लिंग' },
  visit_type: { en: 'Visit Type', hi: 'विज़िट प्रकार' },
  
  // Footfall
  footfall_7day: { en: '7-Day Patient Footfall', hi: '7-दिन रोगी फुटफॉल' },
  patient_footfall_last_7: { en: 'Patient Footfall — Last 7 Days', hi: 'रोगी फुटफॉल — पिछले 7 दिन' },
  patient_footfall: { en: 'Patient Footfall', hi: 'रोगी फुटफॉल' },
  date: { en: 'Date', hi: 'तारीख' },
  record_patient_visit: { en: 'Record Patient Visit', hi: 'रोगी विज़िट दर्ज करें' },
  todays_count: { en: "Today's Count", hi: 'आज की संख्या' },
  recording: { en: 'Recording...', hi: 'दर्ज हो रहा है...' },
  record_visit: { en: '+ Record Visit', hi: '+ विज़िट दर्ज करें' },
  
  // Bed Availability
  occupied: { en: 'occupied', hi: 'भरे हुए' },
  free: { en: 'free', hi: 'खाली' },
  total_beds: { en: 'Total Beds', hi: 'कुल बिस्तर' },
  available_beds: { en: 'Available Beds', hi: 'उपलब्ध बिस्तर' },
  full_capacity: { en: 'Full Capacity', hi: 'पूर्ण क्षमता' },
  no_beds_available: { en: 'No beds available at this centre.', hi: 'इस केंद्र में कोई बिस्तर उपलब्ध नहीं।' },
  update_available_beds: { en: 'Update Available Beds', hi: 'उपलब्ध बिस्तर अपडेट करें' },
  update: { en: 'Update', hi: 'अपडेट' },
  last_updated: { en: 'Last updated', hi: 'अंतिम अपडेट' },
  loading_beds: { en: 'Loading bed availability...', hi: 'बिस्तर उपलब्धता लोड हो रही है...' },
  
  // Doctor Attendance
  understaffed: { en: 'Understaffed', hi: 'कर्मचारियों की कमी' },
  doctors_present_today: { en: 'Doctors present today', hi: 'आज डॉक्टर उपस्थित' },
  record_attendance: { en: "Record today's attendance", hi: 'आज की उपस्थिति दर्ज करें' },
  saving: { en: 'Saving…', hi: 'सहेज रहे हैं…' },
  attendance_recorded: { en: 'Attendance recorded successfully.', hi: 'उपस्थिति सफलतापूर्वक दर्ज की गई।' },
  
  // Stock Table
  current_stock_label: { en: 'Current Stock', hi: 'वर्तमान स्टॉक' },
  min_required: { en: 'Min. Required', hi: 'न्यूनतम आवश्यक' },
  status_and_action: { en: 'Status & Action', hi: 'स्थिति और कार्रवाई' },
  no_medicines_found: { en: 'No medicines found for this centre.', hi: 'इस केंद्र के लिए कोई दवा नहीं मिली।' },
  
  // Health Camps
  upcoming_and_active: { en: 'Upcoming & Active', hi: 'आगामी और सक्रिय' },
  past: { en: 'Past', hi: 'पिछले' },
  no_upcoming_camps: { en: 'No upcoming or active camps scheduled.', hi: 'कोई आगामी या सक्रिय शिविर निर्धारित नहीं।' },
  no_past_camps: { en: 'No past camps recorded.', hi: 'कोई पिछले शिविर दर्ज नहीं।' },
  schedule_new_camp: { en: 'Schedule New Camp', hi: 'नया शिविर निर्धारित करें' },
  camp_name: { en: 'Camp Name', hi: 'शिविर का नाम' },
  target_beneficiaries: { en: 'Target Beneficiaries', hi: 'लक्षित लाभार्थी' },
  actual_beneficiaries: { en: 'Actual Beneficiaries', hi: 'वास्तविक लाभार्थी' },
  organizer: { en: 'Organizer', hi: 'आयोजक' },
  location: { en: 'Location', hi: 'स्थान' },
  notes: { en: 'Notes', hi: 'टिप्पणियाँ' },
  scheduling: { en: 'Scheduling...', hi: 'निर्धारित हो रहा है...' },
  schedule_camp_btn: { en: 'Schedule Camp', hi: 'शिविर निर्धारित करें' },
  update_camp: { en: 'Update Camp', hi: 'शिविर अपडेट करें' },
  updating: { en: 'Updating...', hi: 'अपडेट हो रहा है...' },
  mark_complete_btn: { en: 'Mark Complete', hi: 'पूर्ण चिह्नित करें' },
  
  // Audit Log
  activity_log: { en: 'Activity Log', hi: 'गतिविधि लॉग' },
  loading_audit: { en: 'Loading audit log...', hi: 'ऑडिट लॉग लोड हो रहा है...' },
  no_audit_entries: { en: 'No audit entries yet. Actions will be logged here.', hi: 'अभी तक कोई ऑडिट प्रविष्टि नहीं। कार्रवाइयाँ यहाँ लॉग की जाएंगी।' },
  load_more: { en: 'Load more', hi: 'और लोड करें' },
  
  // Contacts page
  contact_directory: { en: 'Contact Directory', hi: 'संपर्क निर्देशिका' },
  emergency_numbers: { en: 'Emergency Numbers', hi: 'आपातकालीन नंबर' },
  emergency_contacts: { en: 'Emergency Contacts', hi: 'आपातकालीन संपर्क' },
  district_admin: { en: 'District Admin', hi: 'जिला प्रशासक' },
  centre_contacts: { en: 'Centre Contacts', hi: 'केंद्र संपर्क' },
  all_centre_contacts: { en: 'All Centre Contacts', hi: 'सभी केंद्र संपर्क' },
  other_centres_referrals: { en: 'Other Centres (for Referrals)', hi: 'अन्य केंद्र (रेफरल के लिए)' },
  ambulance: { en: 'Ambulance', hi: 'एंबुलेंस' },
  blood_bank: { en: 'Blood Bank', hi: 'रक्त बैंक' },
  district_hospital: { en: 'District Hospital', hi: 'जिला अस्पताल' },
  poison_control: { en: 'Poison Control', hi: 'विष नियंत्रण' },
  centre: { en: 'Centre', hi: 'केंद्र' },
  head_mo: { en: 'Head / MO', hi: 'प्रमुख / एमओ' },
  phone: { en: 'Phone', hi: 'फ़ोन' },
  email: { en: 'Email', hi: 'ईमेल' },
  call: { en: 'Call', hi: 'कॉल' },
  contacts_desc_admin: { en: 'All centre contacts and emergency numbers', hi: 'सभी केंद्र संपर्क और आपातकालीन नंबर' },
  contacts_desc_staff: { en: 'District admin, nearby centres, and emergency contacts', hi: 'जिला प्रशासक, निकटवर्ती केंद्र, और आपातकालीन संपर्क' },
  
  // Directives page
  admin_directives: { en: 'Admin Directives', hi: 'प्रशासक निर्देश' },
  directives_desc: { en: 'Issue actionable directives to health centres in your district.', hi: 'अपने जिले के स्वास्थ्य केंद्रों को कार्रवाई योग्य निर्देश जारी करें।' },
  issue_new_directive: { en: 'Issue New Directive', hi: 'नया निर्देश जारी करें' },
  create_new_directive: { en: 'Create New Directive', hi: 'नया निर्देश बनाएं' },
  select_centre: { en: 'Select Centre', hi: 'केंद्र चुनें' },
  title: { en: 'Title', hi: 'शीर्षक' },
  description: { en: 'Description', hi: 'विवरण' },
  priority: { en: 'Priority', hi: 'प्राथमिकता' },
  type: { en: 'Type', hi: 'प्रकार' },
  target_centre: { en: 'Target Centre', hi: 'लक्ष्य केंद्र' },
  select_a_centre: { en: 'Select a centre...', hi: 'एक केंद्र चुनें...' },
  issue_directive_btn: { en: 'Issue Directive', hi: 'निर्देश जारी करें' },
  issuing: { en: 'Issuing...', hi: 'जारी हो रहा है...' },
  total_active: { en: 'Total Active', hi: 'कुल सक्रिय' },
  completed_today: { en: 'Completed Today', hi: 'आज पूर्ण' },
  active_directives_heading: { en: 'Active Directives', hi: 'सक्रिय निर्देश' },
  completed_closed: { en: 'Completed / Closed', hi: 'पूर्ण / बंद' },
  no_directives_yet: { en: 'No directives issued yet. Create your first directive above.', hi: 'अभी तक कोई निर्देश जारी नहीं हुआ। ऊपर अपना पहला निर्देश बनाएं।' },
  only_district_admin: { en: 'Only District Admins can access this page.', hi: 'केवल जिला प्रशासक इस पृष्ठ तक पहुँच सकते हैं।' },
  mark_completed: { en: 'Mark Completed', hi: 'पूर्ण चिह्नित करें' },
  
  // Dashboard
  district_dashboard: { en: 'District Dashboard', hi: 'जिला डैशबोर्ड' },
  total_centres: { en: 'Total Centres', hi: 'कुल केंद्र' },
  beds_available: { en: 'Beds Available', hi: 'बिस्तर उपलब्ध' },
  doctors_present: { en: 'Doctors Present', hi: 'डॉक्टर उपस्थित' },
  todays_footfall: { en: "Today's Footfall", hi: 'आज की फुटफॉल' },
  bed_occupancy: { en: 'Bed Occupancy', hi: 'बिस्तर अधिभोग' },
  view_full_details: { en: 'View Full Details', hi: 'पूर्ण विवरण देखें' },

  // AI Insights
  stock_out_predictions: { en: 'Stock-Out Predictions', hi: 'स्टॉक-आउट पूर्वानुमान' },
  redistribution: { en: 'Redistribution Recommendations', hi: 'पुनर्वितरण अनुशंसाएं' },
  critical_alerts: { en: 'Critical Alerts', hi: 'गंभीर अलर्ट' },
  stock_out_risk: { en: 'Stock-Out Risk', hi: 'स्टॉक-आउट जोखिम' },
  pending_redistributions: { en: 'Pending Redistributions', hi: 'लंबित पुनर्वितरण' },
  underperforming_centres: { en: 'Underperforming Centres', hi: 'कम प्रदर्शन करने वाले केंद्र' },
  predicted_stockout: { en: 'Predicted stock-out', hi: 'अनुमानित स्टॉक-आउट' },
  current_stock: { en: 'Current stock', hi: 'वर्तमान स्टॉक' },
  transfer_from: { en: 'Transfer from', hi: 'से स्थानांतरित करें' },
  transfer_to: { en: 'Transfer to', hi: 'को स्थानांतरित करें' },
  units: { en: 'units', hi: 'यूनिट' },
  // Urgency labels
  urgency_critical: { en: 'Critical', hi: 'गंभीर' },
  urgency_warning: { en: 'Warning', hi: 'चेतावनी' },
  urgency_caution: { en: 'Caution', hi: 'सावधानी' },
  days_left: { en: 'd left', hi: 'दिन शेष' },
  current_label: { en: 'Current:', hi: 'वर्तमान:' },
  stockout_label: { en: 'Stock-out:', hi: 'स्टॉक-आउट:' },
  no_stockout_risks: { en: 'No stock-out risks detected. All medicines are at safe levels.', hi: 'कोई स्टॉक-आउट जोखिम नहीं। सभी दवाएं सुरक्षित स्तर पर हैं।' },
  no_redistributions: { en: 'No redistribution recommendations at this time.', hi: 'इस समय कोई पुनर्वितरण अनुशंसा नहीं।' },
  from: { en: 'From', hi: 'से' },
  to: { en: 'To', hi: 'को' },
  qty: { en: 'Qty:', hi: 'मात्रा:' },
  medicine_label: { en: 'Medicine', hi: 'दवा' },
  staff_label: { en: 'Staff', hi: 'स्टाफ' },
  items_tracked: { en: 'items tracked', hi: 'आइटम ट्रैक किए गए' },
  transfers_suggested: { en: 'transfers suggested', hi: 'स्थानांतरण सुझाए गए' },
  // Contact designations
  chief_medical_officer: { en: 'Chief Medical Officer', hi: 'मुख्य चिकित्सा अधिकारी' },
  medical_officer: { en: 'Medical Officer', hi: 'चिकित्सा अधिकारी' },
  chief_district_health_officer: { en: 'Chief District Health Officer', hi: 'मुख्य जिला स्वास्थ्य अधिकारी' },
  district_health_office: { en: 'District Health Office', hi: 'जिला स्वास्थ्य कार्यालय' },
  
};

/**
 * Translate a key to the current language.
 * Falls back to English if Hindi translation is missing.
 * Supports variable interpolation: t('greeting', 'hi', { name: 'Rajesh' })
 */
export function t(key: string, language: string, vars: Record<string, string | number> = {}): string {
  const lang = (language === 'hi' ? 'hi' : 'en') as Language;
  let text = translations[key]?.[lang] || translations[key]?.en || key;
  
  // Replace variables like {name}
  Object.entries(vars).forEach(([k, v]) => {
    text = text.replace(`{${k}}`, String(v));
  });
  
  return text;
}

export default translations;
