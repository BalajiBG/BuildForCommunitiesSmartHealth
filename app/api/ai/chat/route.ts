/**
 * POST /api/ai/chat
 *
 * AI Chatbot endpoint — context-aware health data assistant.
 * 
 * Architecture:
 * 1. Receives { question, districtId, role, centreId }
 * 2. ALWAYS fetches ALL data categories from RTDB (data is small per district)
 * 3. Builds a rich, structured context string with actual numbers
 * 4. Calls Gemini with: system prompt + full context + user question
 * 5. If Gemini fails → local fallback that ALWAYS shows actual data
 *
 * Design principle: The fallback must be as useful as Gemini.
 * Every response includes centre names and actual numbers.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminDatabase } from '@/lib/firebase/admin';
import { dbPaths } from '@/lib/firebase/types';

interface ChatRequestBody {
  question: string;
  districtId: string;
  role?: string;
  centreId?: string | null;
}

interface CentreSnapshot {
  name?: string;
  type?: string;
  totalBeds?: number;
  availableBeds?: number;
  assignedDoctors?: number;
  maxPatientCapacity?: number;
}

interface MedicineEntry {
  name?: string;
  quantity?: number;
  reorderLevel?: number;
  expiryDate?: string;
  unit?: string;
}

// ─── Structured data types for context building ───────────────────────────────

interface CentreData {
  id: string;
  name: string;
  type: string;
  beds: { total: number; available: number; occupancyPct: number };
  doctors: { assigned: number; present: number; attendancePct: number };
  footfall: number;
  medicines: {
    total: number;
    critical: { name: string; quantity: number; reorderLevel: number }[];
    expiringSoon: { name: string; expiryDate: string; daysLeft: number }[];
  };
  issues: string[];
}


const SYSTEM_PROMPT = `You are a helpful AI health assistant for the Smart Health AI Platform managing PHCs and CHCs in a district.

CRITICAL RULES:
- ALWAYS mention specific centre names and actual numbers from the CONTEXT DATA
- Never say "operating within normal parameters" without showing the actual figures
- Structure responses with bullet points showing data per centre
- Be concise — max 200 words
- Give actionable next steps with specific page/tab navigation
- Use emojis sparingly for section headers only (📋, ⚠️, ✅, 💡, 🛏️, 💊, 👨‍⚕️, 👥)
- If data shows zeroes or no data recorded, say so explicitly
- Interpret the numbers — don't just repeat them. Flag concerning patterns.
- Be conversational and helpful, like a knowledgeable colleague
- If user wants to DO something (issue directive, raise indent, update data), give STEP-BY-STEP navigation instructions — not data dumps
- Understand conversational intent: "u only issue a directive" means the user wants to know HOW to issue a directive, not see issues data
- Distinguish between "show me issues" (data query) and "issue a directive" (action request)

RESPONSE FORMAT:
1. Direct answer with actual numbers per centre
2. Flag any concerns (low stock, high occupancy, low attendance)
3. One actionable recommendation with exact page/tab to visit

APP NAVIGATION GUIDE:
- Dashboard: overview of all centres, click a centre card for details
- AI Insights: stock-out predictions and redistribution recommendations
- AI Assistant: this chat
- Contacts: phone numbers for admin, centres, emergency services
- Directives: admin issues action orders to centres (admin only)
- Centre Detail → Overview tab: patient insights, footfall, beds, doctors
- Centre Detail → Infrastructure tab: staff, lab tests, facilities
- Centre Detail → Medicine Stock tab: view/update stock, raise indent
- Centre Detail → Health Camps tab: schedule community camps
- Centre Detail → Audit Log tab: all actions taken by staff

When suggesting an action, ALWAYS tell the user which page/tab to go to.`;


// ─── Data fetching — always fetches everything for full context ────────────────

async function fetchAllCentreData(districtId: string, scopedCentreId?: string | null): Promise<CentreData[]> {
  const centresSnapshot = await adminDatabase
    .ref(dbPaths.districtCentres(districtId))
    .once('value');
  const centresMap = centresSnapshot.val();

  if (!centresMap) return [];

  const centreIds = Object.keys(centresMap);
  const activeCentreIds = scopedCentreId ? [scopedCentreId] : centreIds;
  const today = new Date().toISOString().split('T')[0];
  const results: CentreData[] = [];

  for (const centreId of activeCentreIds) {
    // Fetch centre info
    const centreSnap = await adminDatabase.ref(dbPaths.centre(centreId)).once('value');
    const info = centreSnap.val() as CentreSnapshot | null;
    if (!info) continue;

    const totalBeds = Number(info.totalBeds ?? 0);
    const availableBeds = Number(info.availableBeds ?? 0);
    const assignedDoctors = Number(info.assignedDoctors ?? 0);

    // Fetch attendance
    const attSnap = await adminDatabase.ref(dbPaths.attendance(centreId, today)).once('value');
    const attData = attSnap.val() as Record<string, unknown> | null;
    const presentDoctors = attData ? Number(attData.presentCount ?? 0) : 0;

    // Fetch footfall
    const ffSnap = await adminDatabase.ref(dbPaths.footfall(centreId, today)).once('value');
    const ffData = ffSnap.val();
    const footfall = ffData ? Number((ffData as Record<string, unknown>).count ?? ffData ?? 0) : 0;

    // Fetch medicines
    const medsSnap = await adminDatabase.ref(dbPaths.centreMedicines(centreId)).once('value');
    const meds = medsSnap.val() as Record<string, MedicineEntry> | null;

    const critical: CentreData['medicines']['critical'] = [];
    const expiringSoon: CentreData['medicines']['expiringSoon'] = [];
    let totalMeds = 0;

    if (meds) {
      const entries = Object.values(meds);
      totalMeds = entries.length;
      for (const m of entries) {
        const qty = Number(m.quantity ?? 0);
        const reorder = Number(m.reorderLevel ?? 0);
        if (qty < reorder) {
          critical.push({ name: m.name || 'Unknown', quantity: qty, reorderLevel: reorder });
        }
        if (m.expiryDate) {
          const daysLeft = Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 30 && daysLeft > 0) {
            expiringSoon.push({ name: m.name || 'Unknown', expiryDate: m.expiryDate, daysLeft });
          }
        }
      }
    }

    // Identify issues
    const issues: string[] = [];
    if (totalBeds > 0 && availableBeds === 0) issues.push('beds_full');
    if (totalBeds > 0 && availableBeds / totalBeds <= 0.2) issues.push('beds_low');
    if (assignedDoctors > 0 && presentDoctors / assignedDoctors < 0.5) issues.push('low_attendance');
    if (critical.length > 0) issues.push('low_stock');
    if (expiringSoon.length > 0) issues.push('expiring_stock');

    results.push({
      id: centreId,
      name: info.name || centreId,
      type: info.type || 'PHC',
      beds: {
        total: totalBeds,
        available: availableBeds,
        occupancyPct: totalBeds > 0 ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 0,
      },
      doctors: {
        assigned: assignedDoctors,
        present: presentDoctors,
        attendancePct: assignedDoctors > 0 ? Math.round((presentDoctors / assignedDoctors) * 100) : 0,
      },
      footfall,
      medicines: { total: totalMeds, critical, expiringSoon },
      issues,
    });
  }

  return results;
}


// ─── Build context string for Gemini from structured data ─────────────────────

function buildContextString(centres: CentreData[]): string {
  if (centres.length === 0) return 'No centre data available for this district.';

  const parts: string[] = [];

  // BED AVAILABILITY
  parts.push('BED AVAILABILITY:');
  for (const c of centres) {
    parts.push(`  ${c.name} (${c.type}): ${c.beds.available}/${c.beds.total} beds available (${c.beds.occupancyPct}% occupied)`);
  }

  // DOCTOR ATTENDANCE
  const today = new Date().toISOString().split('T')[0];
  parts.push(`\nDOCTOR ATTENDANCE (${today}):`);
  for (const c of centres) {
    parts.push(`  ${c.name}: ${c.doctors.present}/${c.doctors.assigned} doctors present (${c.doctors.attendancePct}% attendance)`);
  }

  // PATIENT FOOTFALL
  parts.push(`\nPATIENT FOOTFALL (${today}):`);
  for (const c of centres) {
    parts.push(`  ${c.name}: ${c.footfall} patients today`);
  }

  // MEDICINE STOCK
  parts.push('\nMEDICINE STOCK:');
  for (const c of centres) {
    if (c.medicines.critical.length > 0) {
      const critList = c.medicines.critical.slice(0, 5).map(m => `${m.name} (qty: ${m.quantity}, reorder: ${m.reorderLevel})`).join(', ');
      parts.push(`  ${c.name}: ${c.medicines.critical.length} below reorder — ${critList}`);
    } else {
      parts.push(`  ${c.name}: All ${c.medicines.total} medicines at adequate levels`);
    }
    if (c.medicines.expiringSoon.length > 0) {
      const expList = c.medicines.expiringSoon.slice(0, 3).map(m => `${m.name} (${m.daysLeft} days left)`).join(', ');
      parts.push(`    Expiring soon: ${expList}`);
    }
  }

  // FLAGGED ISSUES SUMMARY
  const flagged = centres.filter(c => c.issues.length > 0);
  if (flagged.length > 0) {
    parts.push('\nFLAGGED CENTRES:');
    for (const c of flagged) {
      const issueLabels = c.issues.map(i => {
        switch (i) {
          case 'beds_full': return 'NO BEDS AVAILABLE';
          case 'beds_low': return 'beds running low (<20%)';
          case 'low_attendance': return `low doctor attendance (${c.doctors.attendancePct}%)`;
          case 'low_stock': return `${c.medicines.critical.length} medicines below reorder`;
          case 'expiring_stock': return `${c.medicines.expiringSoon.length} medicines expiring soon`;
          default: return i;
        }
      });
      parts.push(`  ⚠️ ${c.name}: ${issueLabels.join(', ')}`);
    }
  }

  return parts.join('\n');
}


// ─── Local fallback — ALWAYS data-driven with actual numbers ──────────────────

function generateLocalResponse(question: string, centres: CentreData[], isStaff: boolean): string {
  if (centres.length === 0) {
    return '📋 No centre data found for your district yet.\n\n💡 Go to Dashboard and ensure centres are registered and data is being entered.';
  }

  const q = question.toLowerCase();

  // Detect navigation/action requests FIRST (before category detection)
  const askingNavigation = /how (do i|to|can i)|where (do i|can i|is)|take me|go to|navigate|open|show me (the|how)/.test(q);
  const askingDirective = /directive|order|notice|instruct|circular/.test(q);
  const askingAction = /issue a|create a|send a|raise a|file a|submit|write a|make a|u only|you only/.test(q);

  // Handle explicit navigation requests
  if (askingNavigation) {
    if (q.includes('directive') || q.includes('order')) return buildNavigationResponse('directives', isStaff);
    if (q.includes('insight') || q.includes('predict')) return buildNavigationResponse('insights', isStaff);
    if (q.includes('stock') || q.includes('indent') || q.includes('medicine')) return buildNavigationResponse('stock', isStaff);
  }
  const isConversational = /^(ok|okay|thanks|thank you|got it|cool|nice|great|good|yes|no|hmm|sure|alright|right|fine|i see|understood)/.test(q);
  const isShortMessage = q.length < 60;

  // Detect which category the user is asking about
  const askingBeds = /bed|capacity|occupan|admit|ward|room|available bed|free bed/.test(q);
  const askingMeds = /medicine|stock|drug|tablet|expire|expiry|indent|pharma|supply|shortage|dawai|dawa/.test(q);
  const askingDoctors = /doctor|staff|attend|absent|present|nurse|manpower/.test(q);
  const askingFootfall = /footfall|patient|visit|opd|rush|crowd|load|traffic/.test(q);
  const askingIssues = /\b(issue|problem|critical|alert|flag|urgent|underperform|worst|bad|concern|risk|priority|emergency)\b/.test(q) && !askingDirective && !askingAction;
  const askingHelp = /help|what can|what should|suggest|recommend|advise|guide|todo|to do|kya karu|kya karun/.test(q);
  const askingOverview = /overview|summary|status|how.*doing|how.*things|report|dashboard|everything|all|sab kuch/.test(q);
  const askingSpecificCentre = centres.find(c => q.includes(c.name.toLowerCase()));

  // If user wants to DO something (not query data), give navigation guidance
  if (askingDirective && !(/what are|which|show me all|list all|how many|any pending|show.*directive/.test(q))) {
    return buildNavigationResponse('directives', isStaff);
  }
  if (askingAction && askingMeds) {
    return buildNavigationResponse('stock', isStaff);
  }
  if (askingAction && askingDirective) {
    return buildNavigationResponse('directives', isStaff);
  }

  // Handle conversational follow-ups that aren't data queries
  if (isConversational && isShortMessage && !askingBeds && !askingMeds && !askingDoctors && !askingFootfall) {
    // Short conversational message — check if it's about navigation
    if (q.includes('directive') || q.includes('order')) return buildNavigationResponse('directives', isStaff);
    if (q.includes('insight') || q.includes('predict')) return buildNavigationResponse('insights', isStaff);
    if (q.includes('stock') || q.includes('indent') || q.includes('medicine')) return buildNavigationResponse('stock', isStaff);
    // Generic acknowledgment — offer help
    return `👍 Got it! What else can I help you with?\n\nI can show you:\n• Bed availability across centres\n• Medicine stock status\n• Doctor attendance\n• Patient footfall\n• Flagged issues\n\nOr tell me what action you'd like to take (issue directive, raise indent, etc.)`;
  }

  // Handle greetings
  if (/^(hi|hello|hey|namaste|good morning|good evening|howdy)/.test(q) && isShortMessage) {
    const flagged = centres.filter(c => c.issues.length > 0);
    if (flagged.length > 0) {
      return `👋 Hello! Here's a quick update:\n\n⚠️ ${flagged.length} centre(s) need attention today.\n\nAsk me about beds, medicines, doctors, or say "what are the issues" for details.`;
    }
    return `👋 Hello! All ${centres.length} centres are running normally today.\n\nAsk me about beds, medicines, doctors, patient footfall, or say "what should I do" for suggestions.`;
  }

  // ─── Specific centre query ─────────────────────────────────────────────────
  if (askingSpecificCentre) {
    return buildCentreDetailResponse(askingSpecificCentre, isStaff);
  }

  // ─── Category-specific queries ─────────────────────────────────────────────
  if (askingBeds && !askingOverview) return buildBedsResponse(centres, isStaff);
  if (askingMeds && !askingOverview) return buildMedsResponse(centres, isStaff);
  if (askingDoctors && !askingOverview) return buildDoctorsResponse(centres, isStaff);
  if (askingFootfall && !askingOverview) return buildFootfallResponse(centres, isStaff);
  if (askingIssues) return buildIssuesResponse(centres, isStaff);
  if (askingHelp) return buildHelpResponse(centres, isStaff);

  // ─── Default: full overview with all numbers ───────────────────────────────
  return buildOverviewResponse(centres, isStaff);
}


// ─── Response builders — each always includes actual numbers ──────────────────

function buildCentreDetailResponse(c: CentreData, isStaff: boolean): string {
  let r = `📊 ${c.name} (${c.type}) — Status Today:\n\n`;

  r += `🛏️ Beds: ${c.beds.available}/${c.beds.total} available (${c.beds.occupancyPct}% occupied)\n`;
  r += `👨‍⚕️ Doctors: ${c.doctors.present}/${c.doctors.assigned} present (${c.doctors.attendancePct}% attendance)\n`;
  r += `👥 Patients today: ${c.footfall}\n`;

  if (c.medicines.critical.length > 0) {
    r += `\n💊 Low Stock (${c.medicines.critical.length} items):\n`;
    r += c.medicines.critical.slice(0, 5).map(m => `  • ${m.name}: ${m.quantity} left (reorder at ${m.reorderLevel})`).join('\n');
    r += '\n';
  } else {
    r += `💊 Medicine stock: All ${c.medicines.total} items adequate\n`;
  }

  if (c.medicines.expiringSoon.length > 0) {
    r += `\n⏰ Expiring within 30 days: ${c.medicines.expiringSoon.map(m => `${m.name} (${m.daysLeft}d)`).join(', ')}\n`;
  }

  if (c.issues.length > 0) {
    r += '\n⚠️ Needs attention: ' + c.issues.map(formatIssue).join(', ') + '\n';
  } else {
    r += '\n✅ No critical issues detected.\n';
  }

  r += '\n💡 ' + (isStaff
    ? 'Update data in Overview tab. Raise indent in Medicine Stock tab.'
    : 'Click this centre on Dashboard for full details, or issue a Directive.');
  return r;
}

function buildBedsResponse(centres: CentreData[], isStaff: boolean): string {
  let r = '🛏️ Bed Availability:\n\n';
  const sorted = [...centres].sort((a, b) => a.beds.available - b.beds.available);

  for (const c of sorted) {
    const flag = c.beds.available === 0 ? ' ⚠️ FULL' : c.beds.available / c.beds.total <= 0.2 ? ' ⚠️ LOW' : '';
    r += `• ${c.name}: ${c.beds.available}/${c.beds.total} beds free (${c.beds.occupancyPct}% occupied)${flag}\n`;
  }

  const totalBeds = centres.reduce((s, c) => s + c.beds.total, 0);
  const totalAvail = centres.reduce((s, c) => s + c.beds.available, 0);
  r += `\n📊 District Total: ${totalAvail}/${totalBeds} beds available\n`;

  const fullCentres = centres.filter(c => c.beds.available === 0);
  if (fullCentres.length > 0) {
    r += `\n⚠️ ${fullCentres.length} centre(s) at full capacity: ${fullCentres.map(c => c.name).join(', ')}`;
    r += '\n\n💡 ' + (isStaff
      ? 'Update bed count in Overview tab when beds are freed.'
      : 'Consider patient diversion. Go to Directives to order transfers.');
  } else {
    r += '\n✅ No centres at full capacity.';
    r += '\n\n💡 ' + (isStaff ? 'Keep Overview tab updated as patients are admitted/discharged.' : 'Monitor via Dashboard centre cards.');
  }
  return r;
}


function buildMedsResponse(centres: CentreData[], isStaff: boolean): string {
  const centresWithIssues = centres.filter(c => c.medicines.critical.length > 0 || c.medicines.expiringSoon.length > 0);

  if (centresWithIssues.length === 0) {
    let r = '💊 Medicine Stock — All Clear:\n\n';
    for (const c of centres) {
      r += `• ${c.name}: All ${c.medicines.total} medicines at adequate levels\n`;
    }
    r += '\n✅ No shortages or expiring medicines detected.';
    r += '\n\n💡 ' + (isStaff ? 'Go to Medicine Stock tab for full inventory view.' : 'Go to AI Insights for predictive stock-out alerts.');
    return r;
  }

  let r = '💊 Medicine Stock Status:\n\n';
  for (const c of centres) {
    if (c.medicines.critical.length > 0) {
      r += `⚠️ ${c.name} — ${c.medicines.critical.length} items below reorder:\n`;
      r += c.medicines.critical.slice(0, 4).map(m => `  • ${m.name}: ${m.quantity} left (need ${m.reorderLevel})`).join('\n') + '\n';
    }
    if (c.medicines.expiringSoon.length > 0) {
      r += `  ⏰ Expiring soon: ${c.medicines.expiringSoon.slice(0, 3).map(m => `${m.name} (${m.daysLeft}d)`).join(', ')}\n`;
    }
  }

  const okCentres = centres.filter(c => c.medicines.critical.length === 0);
  if (okCentres.length > 0) {
    r += `\n✅ Adequate: ${okCentres.map(c => c.name).join(', ')}\n`;
  }

  r += '\n💡 ' + (isStaff
    ? 'Go to Medicine Stock tab → "Raise Emergency Indent" for critical items.'
    : 'Go to AI Insights → Redistribution tab, or Directives to issue indent orders.');
  return r;
}

function buildDoctorsResponse(centres: CentreData[], isStaff: boolean): string {
  const today = new Date().toISOString().split('T')[0];
  let r = `👨‍⚕️ Doctor Attendance (${today}):\n\n`;
  const sorted = [...centres].sort((a, b) => a.doctors.attendancePct - b.doctors.attendancePct);

  for (const c of sorted) {
    const flag = c.doctors.attendancePct < 50 ? ' ⚠️ LOW' : c.doctors.attendancePct === 100 ? ' ✅' : '';
    r += `• ${c.name}: ${c.doctors.present}/${c.doctors.assigned} present (${c.doctors.attendancePct}%)${flag}\n`;
  }

  const totalAssigned = centres.reduce((s, c) => s + c.doctors.assigned, 0);
  const totalPresent = centres.reduce((s, c) => s + c.doctors.present, 0);
  r += `\n📊 District Total: ${totalPresent}/${totalAssigned} doctors present (${totalAssigned > 0 ? Math.round((totalPresent / totalAssigned) * 100) : 0}%)\n`;

  const lowCentres = centres.filter(c => c.doctors.attendancePct < 50 && c.doctors.assigned > 0);
  if (lowCentres.length > 0) {
    r += `\n⚠️ ${lowCentres.length} centre(s) critically understaffed: ${lowCentres.map(c => c.name).join(', ')}`;
    r += '\n\n💡 ' + (isStaff
      ? 'Record attendance in Overview tab. Contact absent staff.'
      : 'Consider deploying locum doctors. Go to Directives to issue attendance notice.');
  } else {
    r += '\n✅ All centres have adequate staffing.';
    r += '\n\n💡 ' + (isStaff ? 'Record attendance daily in Overview tab.' : 'Staff levels healthy — no action needed.');
  }
  return r;
}


function buildFootfallResponse(centres: CentreData[], isStaff: boolean): string {
  const today = new Date().toISOString().split('T')[0];
  let r = `👥 Patient Footfall (${today}):\n\n`;
  const sorted = [...centres].sort((a, b) => b.footfall - a.footfall);

  for (const c of sorted) {
    r += `• ${c.name}: ${c.footfall} patients\n`;
  }

  const totalFootfall = centres.reduce((s, c) => s + c.footfall, 0);
  r += `\n📊 District Total: ${totalFootfall} patients today\n`;

  const highLoad = centres.filter(c => c.footfall > 0 && c.beds.total > 0 && c.footfall > c.beds.total * 3);
  if (highLoad.length > 0) {
    r += `\n⚠️ High patient load at: ${highLoad.map(c => `${c.name} (${c.footfall} patients, ${c.beds.total} beds)`).join(', ')}`;
  }

  if (totalFootfall === 0) {
    r += '\n⚠️ No footfall recorded yet today — data may not have been entered.';
    r += '\n\n💡 ' + (isStaff ? 'Record patient visits in Overview tab.' : 'Ensure centres are recording daily footfall.');
  } else {
    r += '\n\n💡 ' + (isStaff ? 'Keep recording visits in Overview tab throughout the day.' : 'Click centre cards on Dashboard for footfall trends.');
  }
  return r;
}

function buildIssuesResponse(centres: CentreData[], isStaff: boolean): string {
  const flagged = centres.filter(c => c.issues.length > 0);

  if (flagged.length === 0) {
    let r = '✅ No Critical Issues Found:\n\n';
    r += `All ${centres.length} centre(s) are operating within normal parameters:\n`;
    for (const c of centres) {
      r += `• ${c.name}: Beds ${c.beds.available}/${c.beds.total}, Doctors ${c.doctors.present}/${c.doctors.assigned}, Stock OK\n`;
    }
    r += '\n💡 ' + (isStaff ? 'Keep monitoring and updating data regularly.' : 'All clear. Check AI Insights for predictive alerts.');
    return r;
  }

  let r = `⚠️ Flagged Issues (${flagged.length}/${centres.length} centres):\n\n`;
  // Sort by severity (more issues first)
  const sorted = [...flagged].sort((a, b) => b.issues.length - a.issues.length);

  for (const c of sorted) {
    r += `🔴 ${c.name}:\n`;
    for (const issue of c.issues) {
      switch (issue) {
        case 'beds_full':
          r += `  • Beds: 0/${c.beds.total} available — AT CAPACITY\n`; break;
        case 'beds_low':
          r += `  • Beds: Only ${c.beds.available}/${c.beds.total} left (${100 - c.beds.occupancyPct}% free)\n`; break;
        case 'low_attendance':
          r += `  • Doctors: ${c.doctors.present}/${c.doctors.assigned} present (${c.doctors.attendancePct}%)\n`; break;
        case 'low_stock':
          r += `  • Stock: ${c.medicines.critical.length} medicines below reorder (${c.medicines.critical.slice(0, 3).map(m => m.name).join(', ')})\n`; break;
        case 'expiring_stock':
          r += `  • Expiring: ${c.medicines.expiringSoon.length} medicines within 30 days\n`; break;
      }
    }
  }

  const okCentres = centres.filter(c => c.issues.length === 0);
  if (okCentres.length > 0) {
    r += `\n✅ No issues: ${okCentres.map(c => c.name).join(', ')}\n`;
  }

  r += '\n💡 ' + (isStaff
    ? 'Address stock issues in Medicine Stock tab. Update beds/attendance in Overview.'
    : 'Priority: Issue Directives for critical centres. Check AI Insights for recommendations.');
  return r;
}


function buildHelpResponse(centres: CentreData[], isStaff: boolean): string {
  const flagged = centres.filter(c => c.issues.length > 0);

  if (isStaff) {
    const c = centres[0]; // Staff sees only their centre
    if (!c) return '📋 No data available. Ensure your centre is set up correctly.';

    let r = `📋 Suggested Actions for ${c.name}:\n\n`;
    const actions: string[] = [];

    if (c.medicines.critical.length > 0) {
      actions.push(`1. 💊 Raise indent for ${c.medicines.critical.length} low-stock medicines → Medicine Stock tab`);
    }
    if (c.doctors.attendancePct < 50 && c.doctors.assigned > 0) {
      actions.push(`${actions.length + 1}. 👨‍⚕️ Update attendance (${c.doctors.present}/${c.doctors.assigned} recorded) → Overview tab`);
    }
    if (c.beds.available === 0 && c.beds.total > 0) {
      actions.push(`${actions.length + 1}. 🛏️ Update bed status (showing 0 available) → Overview tab`);
    }
    if (c.footfall === 0) {
      actions.push(`${actions.length + 1}. 👥 Record today's patient visits → Overview tab`);
    }

    if (actions.length === 0) {
      r += '✅ All data is up to date. Keep recording daily visits and attendance.\n';
      r += '\nYou can also:\n• Check Medicine Stock for upcoming expiries\n• Schedule a Health Camp\n• Review your Audit Log';
    } else {
      r += actions.join('\n');
    }
    return r;
  }

  // District Admin help
  let r = '📋 Recommended Actions:\n\n';
  const actions: string[] = [];

  if (flagged.length > 0) {
    actions.push(`1. ⚠️ Review ${flagged.length} flagged centre(s): ${flagged.map(c => c.name).join(', ')} → Dashboard`);
  }

  const stockCentres = centres.filter(c => c.medicines.critical.length > 0);
  if (stockCentres.length > 0) {
    actions.push(`${actions.length + 1}. 💊 Address medicine shortages at ${stockCentres.length} centre(s) → AI Insights → Redistribution`);
  }

  const lowStaff = centres.filter(c => c.doctors.attendancePct < 50 && c.doctors.assigned > 0);
  if (lowStaff.length > 0) {
    actions.push(`${actions.length + 1}. 👨‍⚕️ Deploy locum staff to: ${lowStaff.map(c => c.name).join(', ')} → Directives`);
  }

  const fullBeds = centres.filter(c => c.beds.available === 0 && c.beds.total > 0);
  if (fullBeds.length > 0) {
    actions.push(`${actions.length + 1}. 🛏️ Arrange patient diversion from: ${fullBeds.map(c => c.name).join(', ')} → Directives`);
  }

  if (actions.length === 0) {
    r += '✅ No urgent actions needed. All centres operating normally.\n';
    r += '\nProactive steps:\n• Review AI Insights for stock-out predictions\n• Schedule health camps for underserved areas\n• Check upcoming medicine expiries';
  } else {
    r += actions.join('\n');
  }
  return r;
}

function buildOverviewResponse(centres: CentreData[], isStaff: boolean): string {
  if (isStaff && centres.length === 1) {
    return buildCentreDetailResponse(centres[0], isStaff);
  }

  const today = new Date().toISOString().split('T')[0];
  let r = `📊 District Overview (${today}):\n\n`;

  // Quick stats
  const totalBeds = centres.reduce((s, c) => s + c.beds.total, 0);
  const availBeds = centres.reduce((s, c) => s + c.beds.available, 0);
  const totalDocs = centres.reduce((s, c) => s + c.doctors.assigned, 0);
  const presentDocs = centres.reduce((s, c) => s + c.doctors.present, 0);
  const totalFootfall = centres.reduce((s, c) => s + c.footfall, 0);
  const stockIssues = centres.reduce((s, c) => s + c.medicines.critical.length, 0);

  r += `🛏️ Beds: ${availBeds}/${totalBeds} available across ${centres.length} centres\n`;
  r += `👨‍⚕️ Doctors: ${presentDocs}/${totalDocs} present (${totalDocs > 0 ? Math.round((presentDocs / totalDocs) * 100) : 0}%)\n`;
  r += `👥 Patients: ${totalFootfall} total visits today\n`;
  r += `💊 Stock alerts: ${stockIssues} medicine(s) below reorder level\n`;

  // Per-centre quick view
  r += '\nPer Centre:\n';
  for (const c of centres) {
    const flags = c.issues.length > 0 ? ' ⚠️' : ' ✅';
    r += `• ${c.name}: Beds ${c.beds.available}/${c.beds.total}, Docs ${c.doctors.present}/${c.doctors.assigned}, Patients ${c.footfall}${flags}\n`;
  }

  const flagged = centres.filter(c => c.issues.length > 0);
  if (flagged.length > 0) {
    r += `\n⚠️ ${flagged.length} centre(s) need attention — ask me "what are the issues" for details.`;
  } else {
    r += '\n✅ All centres operating normally.';
  }

  r += '\n\n💡 Ask me about specific topics: beds, medicines, doctors, patients, or issues.';
  return r;
}


function formatIssue(issue: string): string {
  switch (issue) {
    case 'beds_full': return 'beds at capacity';
    case 'beds_low': return 'beds running low';
    case 'low_attendance': return 'low doctor attendance';
    case 'low_stock': return 'medicine shortage';
    case 'expiring_stock': return 'medicines expiring soon';
    default: return issue;
  }
}

function buildNavigationResponse(target: string, isStaff: boolean): string {
  switch (target) {
    case 'directives':
      if (isStaff) {
        return '📋 Directives are issued by the District Admin to your centre.\n\nYou can view any directives sent to you from the Directives page in the sidebar.\n\n💡 If you need to request resources or flag an issue, raise an indent from the Medicine Stock tab or update your centre data in the Overview tab — the District Admin will see alerts.';
      }
      return '📋 To Issue a Directive:\n\n1. Go to the Directives page from the sidebar\n2. Click "Issue New Directive"\n3. Select the target centre\n4. Choose the action type (stock indent, staff deployment, capacity alert, etc.)\n5. Add instructions and submit\n\nThe centre staff will see the directive immediately.\n\n💡 You can also click a specific centre card on Dashboard → then issue a directive directly for that centre.';
    case 'insights':
      return '📋 AI Insights Page:\n\nGo to AI Insights from the sidebar to see:\n• Stock-out predictions (when medicines will run out)\n• Redistribution recommendations (move stock between centres)\n\n💡 These are AI-generated based on consumption trends.';
    case 'stock':
      if (isStaff) {
        return '📋 To manage medicines:\n\n1. Go to your Centre → Medicine Stock tab\n2. View current stock levels\n3. Click "Raise Emergency Indent" for low items\n4. Update quantities after receiving stock\n\n💡 Keep stock data updated daily for accurate AI predictions.';
      }
      return '📋 To review stock across centres:\n\n1. Click any centre card on Dashboard\n2. Go to Medicine Stock tab\n3. Or visit AI Insights for predictions and redistribution\n\n💡 Issue Directives for centres with critical shortages.';
    default:
      return '📋 Use the sidebar to navigate:\n• Dashboard — overview of all centres\n• AI Insights — predictions & redistribution\n• AI Assistant — this chat\n• Contacts — phone directory\n• Directives — issue action orders\n\n💡 Click any centre card for detailed data.';
  }
}

// ─── Main route handler ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const { question, districtId, role, centreId } = body;

    if (!question || !districtId) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'question and districtId are required.' } },
        { status: 400 }
      );
    }

    const isStaff = role === 'Centre_Staff';
    const scopedCentreId = isStaff && centreId ? centreId : null;

    // Fetch ALL data — structured and complete
    const centres = await fetchAllCentreData(districtId, scopedCentreId);

    // Build context string for Gemini
    const contextData = buildContextString(centres);

    // Role-specific prompt addition
    const roleContext = isStaff
      ? `\n\nUSER ROLE: Centre Staff at "${centres[0]?.name || 'their centre'}". Only answer about their centre. Give hands-on operational advice (update stock, record attendance, raise indent). Always show their centre's actual numbers.`
      : `\n\nUSER ROLE: District Admin overseeing ${centres.length} centres. Give strategic oversight with per-centre breakdown. Always show actual numbers for each centre.`;

    // Try Gemini first
    let aiResponse: string = '';
    let source: 'gemini' | 'local' = 'gemini';

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('No GEMINI_API_KEY env var set');

      const genAI = new GoogleGenerativeAI(apiKey);
      const prompt = `${SYSTEM_PROMPT}${roleContext}\n\nCONTEXT DATA:\n${contextData}\n\nUSER QUESTION: ${question}`;

      // Try primary model, then lite model, with retries
      const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
      let lastError: unknown;

      for (const modelName of models) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const chatModel = genAI.getGenerativeModel({ model: modelName });
            const result = await Promise.race([
              chatModel.generateContent(prompt),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`${modelName} timeout`)), 12000)
              ),
            ]);

            aiResponse = result.response.text();
            if (!aiResponse || aiResponse.trim().length < 10) {
              throw new Error('Empty response');
            }
            break; // Success
          } catch (retryError) {
            lastError = retryError;
            if (attempt < 1) await new Promise(r => setTimeout(r, 1000));
          }
        }
        if (aiResponse) break; // Got a response, stop trying models
      }

      if (!aiResponse) throw lastError || new Error('All models failed');
    } catch (geminiError) {
      const errMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
      console.log(`Gemini unavailable for chat (${errMsg}), using local engine`);
      aiResponse = generateLocalResponse(question, centres, isStaff);
      source = 'local';
    }

    return NextResponse.json({ response: aiResponse, source });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'AI chat service is currently unavailable. Please try again later.',
        },
      },
      { status: 503 }
    );
  }
}
