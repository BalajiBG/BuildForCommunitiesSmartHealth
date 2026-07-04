/**
 * POST /api/ai/chat
 *
 * AI Chatbot endpoint that:
 * 1. Receives { question: string, districtId: string }
 * 2. Fetches relevant data from RTDB based on keywords in the question
 * 3. Builds a context string with the data
 * 4. Calls Gemini with: system prompt + context + user question
 * 5. Returns the AI response (or local fallback if Gemini is unavailable)
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
  totalBeds?: number;
  availableBeds?: number;
  assignedDoctors?: number;
  maxPatientCapacity?: number;
}

const SYSTEM_PROMPT = `You are a helpful AI health assistant for the Smart Health AI Platform managing PHCs and CHCs in a district.

RULES:
- Answer in clear, structured format with bullet points
- Be concise — max 150 words
- Always mention specific centre names and numbers
- Give actionable next steps when relevant
- Use emojis sparingly for section headers only (📋, ⚠️, ✅, 💡)
- If the user asks "what should I do" — prioritize the most urgent issues
- Never dump raw data — always interpret and summarize
- If you're unsure, suggest what questions to ask instead
- Be conversational and helpful, like a knowledgeable colleague

APP NAVIGATION GUIDE (use this to direct users):
- Dashboard: overview of all centres, click a centre card to see details
- AI Insights: stock-out predictions and redistribution recommendations
- AI Assistant: this chat (you are here)
- Contacts: phone numbers for admin, centres, and emergency services
- Directives: admin issues action orders to centres (admin only)
- Centre Detail → Overview tab: patient insights, footfall, beds, doctors
- Centre Detail → Infrastructure tab: staff, lab tests, facilities
- Centre Detail → Medicine Stock tab: view/update stock, raise indent
- Centre Detail → Health Camps tab: schedule and track community camps
- Centre Detail → Audit Log tab: see all actions taken by staff

When suggesting an action, ALWAYS tell the user which page/tab to go to.
Example: "Go to Medicine Stock tab and click 'Raise Emergency Indent' next to Insulin."`;


/**
 * Detect which data categories are relevant based on keywords in the question.
 */
function detectCategories(question: string): string[] {
  const q = question.toLowerCase();
  const categories: string[] = [];

  if (q.includes('stock') || q.includes('medicine') || q.includes('drug') || q.includes('expire') || q.includes('expiry')) {
    categories.push('medicines');
  }
  if (q.includes('bed') || q.includes('capacity') || q.includes('occupancy')) {
    categories.push('beds');
  }
  if (q.includes('doctor') || q.includes('staff') || q.includes('attendance') || q.includes('understaffed')) {
    categories.push('attendance');
  }
  if (q.includes('footfall') || q.includes('patient') || q.includes('visit') || q.includes('opd')) {
    categories.push('footfall');
  }
  if (q.includes('underperform') || q.includes('flag') || q.includes('critical') || q.includes('alert')) {
    categories.push('evaluation');
  }

  // If no specific category detected, fetch a summary of everything
  if (categories.length === 0) {
    categories.push('medicines', 'beds', 'attendance', 'footfall');
  }

  return categories;
}

/**
 * Fetch relevant data from Firebase RTDB based on detected categories.
 */
async function fetchContextData(districtId: string, categories: string[], scopedCentreId?: string | null): Promise<string> {
  const contextParts: string[] = [];

  // Get centre IDs for the district
  const centresSnapshot = await adminDatabase
    .ref(dbPaths.districtCentres(districtId))
    .once('value');
  const centresMap = centresSnapshot.val();

  if (!centresMap) {
    return 'No centres found for this district.';
  }

  const centreIds = Object.keys(centresMap);
  const today = new Date().toISOString().split('T')[0];

  // If scoped to a single centre (Centre Staff), only fetch that centre's data
  const activeCentreIds = scopedCentreId ? [scopedCentreId] : centreIds;

  // Fetch centre names
  const centreNames: Record<string, string> = {};
  for (const centreId of activeCentreIds) {
    const snap = await adminDatabase.ref(dbPaths.centre(centreId)).once('value');
    const data = snap.val() as CentreSnapshot | null;
    centreNames[centreId] = data?.name || centreId;
  }

  if (categories.includes('medicines')) {
    const medicineData: string[] = [];
    for (const centreId of activeCentreIds) {
      const medsSnap = await adminDatabase.ref(dbPaths.centreMedicines(centreId)).once('value');
      const meds = medsSnap.val();
      if (!meds) continue;

      const entries = Object.entries(meds as Record<string, Record<string, unknown>>);
      const critical = entries.filter(([, m]) => Number(m.quantity ?? 0) < Number(m.reorderLevel ?? 0));
      const expiring = entries.filter(([, m]) => {
        const exp = String(m.expiryDate ?? '');
        if (!exp) return false;
        const daysToExpiry = Math.ceil((new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysToExpiry <= 30 && daysToExpiry > 0;
      });

      if (critical.length > 0 || expiring.length > 0) {
        medicineData.push(
          `${centreNames[centreId]}: ${critical.length} medicines below reorder level, ${expiring.length} expiring within 30 days. ` +
          `Critical: ${critical.slice(0, 5).map(([, m]) => `${m.name} (qty: ${m.quantity}, reorder: ${m.reorderLevel})`).join(', ')}`
        );
      }
    }
    if (medicineData.length > 0) {
      contextParts.push(`MEDICINE STOCK:\n${medicineData.join('\n')}`);
    } else {
      contextParts.push('MEDICINE STOCK: All centres have adequate stock levels.');
    }
  }

  if (categories.includes('beds')) {
    const bedData: string[] = [];
    for (const centreId of activeCentreIds) {
      const snap = await adminDatabase.ref(dbPaths.centre(centreId)).once('value');
      const data = snap.val() as CentreSnapshot | null;
      if (!data) continue;
      const total = Number(data.totalBeds ?? 0);
      const available = Number(data.availableBeds ?? 0);
      bedData.push(`${centreNames[centreId]}: ${available}/${total} beds available (${total > 0 ? Math.round((available / total) * 100) : 0}% free)`);
    }
    contextParts.push(`BED AVAILABILITY:\n${bedData.join('\n')}`);
  }

  if (categories.includes('attendance')) {
    const attendanceData: string[] = [];
    for (const centreId of activeCentreIds) {
      const centreSnap = await adminDatabase.ref(dbPaths.centre(centreId)).once('value');
      const centreInfo = centreSnap.val() as CentreSnapshot | null;
      const assigned = Number(centreInfo?.assignedDoctors ?? 0);

      const attSnap = await adminDatabase.ref(dbPaths.attendance(centreId, today)).once('value');
      const attData = attSnap.val() as Record<string, unknown> | null;
      const present = attData ? Number(attData.presentCount ?? 0) : 0;

      attendanceData.push(`${centreNames[centreId]}: ${present}/${assigned} doctors present (${assigned > 0 ? Math.round((present / assigned) * 100) : 0}%)`);
    }
    contextParts.push(`DOCTOR ATTENDANCE (${today}):\n${attendanceData.join('\n')}`);
  }

  if (categories.includes('footfall')) {
    const footfallData: string[] = [];
    for (const centreId of activeCentreIds) {
      const ffSnap = await adminDatabase.ref(dbPaths.footfall(centreId, today)).once('value');
      const ffData = ffSnap.val();
      const count = ffData ? Number((ffData as Record<string, unknown>).count ?? ffData ?? 0) : 0;
      footfallData.push(`${centreNames[centreId]}: ${count} patients today`);
    }
    contextParts.push(`PATIENT FOOTFALL (${today}):\n${footfallData.join('\n')}`);
  }

  if (categories.includes('evaluation')) {
    const evalData: string[] = [];
    for (const centreId of activeCentreIds) {
      const centreSnap = await adminDatabase.ref(dbPaths.centre(centreId)).once('value');
      const centreInfo = centreSnap.val() as CentreSnapshot | null;
      if (!centreInfo) continue;

      const assigned = Number(centreInfo.assignedDoctors ?? 0);
      const attSnap = await adminDatabase.ref(dbPaths.attendance(centreId, today)).once('value');
      const attData = attSnap.val() as Record<string, unknown> | null;
      const present = attData ? Number(attData.presentCount ?? 0) : 0;

      const medsSnap = await adminDatabase.ref(dbPaths.centreMedicines(centreId)).once('value');
      const meds = medsSnap.val() as Record<string, Record<string, unknown>> | null;
      let hasLowStock = false;
      if (meds) {
        hasLowStock = Object.values(meds).some(m => Number(m.quantity ?? 0) < Number(m.reorderLevel ?? 0));
      }

      const issues: string[] = [];
      if (assigned > 0 && present / assigned < 0.5) issues.push('low attendance');
      if (hasLowStock) issues.push('low stock');

      if (issues.length > 0) {
        evalData.push(`${centreNames[centreId]}: FLAGGED — ${issues.join(', ')}`);
      }
    }
    if (evalData.length > 0) {
      contextParts.push(`UNDERPERFORMING CENTRES:\n${evalData.join('\n')}`);
    } else {
      contextParts.push('UNDERPERFORMING CENTRES: None flagged today.');
    }
  }

  return contextParts.join('\n\n');
}

/**
 * Local fallback response engine — generates context-aware responses
 * by analyzing the question semantically and pulling specific data.
 */
function generateLocalResponse(_question: string, contextData: string, isStaff?: boolean): string {
  const q = _question.toLowerCase();

  // Check if question is about a specific centre
  const centreMatch = contextData.match(/(\w+ \w+):/g);
  const centreNames = centreMatch ? [...new Set(centreMatch.map(m => m.replace(':', '').trim()))] : [];
  const mentionedCentre = centreNames.find(name => q.includes(name.toLowerCase()));

  // If asking about a specific centre, give centre-specific answer
  if (mentionedCentre) {
    const lines = contextData.split('\n');
    const centreLines = lines.filter(l => l.includes(mentionedCentre));
    
    if (centreLines.length === 0) {
      return `I don't have detailed data for "${mentionedCentre}" right now.`;
    }

    const issues: string[] = [];
    const okItems: string[] = [];

    for (const line of centreLines) {
      if (line.includes('below reorder') || line.includes('Critical')) {
        issues.push(`💊 Medicine shortage: ${line.split('Critical:')[1]?.trim().slice(0, 100) || 'multiple items low'}`);
      }
      if (line.includes('0/') && line.includes('beds')) {
        issues.push('🛏️ At full bed capacity — no beds available');
      }
      if (line.includes('0%') || (line.includes('/') && line.includes('doctors') && line.includes('0/'))) {
        issues.push('👨‍⚕️ Critically understaffed');
      } else if (line.includes('doctors') && !line.includes('100%')) {
        const match = line.match(/(\d+)\/(\d+)/);
        if (match) {
          const present = Number(match[1]);
          const assigned = Number(match[2]);
          if (assigned > 0 && present / assigned < 0.5) {
            issues.push(`👨‍⚕️ Low attendance: ${present}/${assigned} doctors`);
          } else {
            okItems.push(`👨‍⚕️ Doctor attendance: ${present}/${assigned}`);
          }
        }
      }
      if (line.includes('beds') && !line.includes('0/')) {
        const match = line.match(/(\d+)\/(\d+) beds/);
        if (match) okItems.push(`🛏️ Beds: ${match[1]}/${match[2]} available`);
      }
      if (line.includes('patients today')) {
        okItems.push(`👥 ${line.split(':')[1]?.trim() || 'footfall data available'}`);
      }
    }

    let response = `📊 ${mentionedCentre}\n\n`;
    if (issues.length > 0) {
      response += `⚠️ Issues:\n${issues.map(i => `• ${i}`).join('\n')}\n\n`;
    }
    if (okItems.length > 0) {
      response += `✅ OK:\n${okItems.map(i => `• ${i}`).join('\n')}\n\n`;
    }
    if (issues.length === 0 && okItems.length === 0) {
      response += 'Operating within normal parameters.\n\n';
    }
    if (issues.length > 0) {
      response += isStaff
        ? '💡 Go to Medicine Stock tab to raise indent, or Overview tab to update data.'
        : '💡 Go to Directives page to issue an action order for this centre.';
    }
    return response.trim();
  }

  // General district-wide summary (no specific centre mentioned)
  const hasStockIssues = contextData.includes('below reorder') || contextData.includes('expiring');
  const hasBedIssues = contextData.includes('0/') && contextData.includes('beds');
  const hasStaffIssues = contextData.includes('low attendance');

  const urgentItems: string[] = [];
  const okItems: string[] = [];

  if (hasStockIssues) {
    const stockLines = contextData.split('MEDICINE STOCK:')[1]?.split('\n\n')[0]?.trim().split('\n') || [];
    const criticalCentres = stockLines.filter(l => l.includes('below reorder'));
    urgentItems.push(`💊 ${criticalCentres.length} centre(s) have medicine shortages`);
  } else {
    okItems.push('💊 Medicine stock levels are adequate');
  }

  if (hasBedIssues) {
    urgentItems.push('🛏️ At least one centre is at full bed capacity');
  } else {
    okItems.push('🛏️ Beds available across all centres');
  }

  if (hasStaffIssues) {
    urgentItems.push('👨‍⚕️ Some centres have low doctor attendance');
  } else {
    okItems.push('👨‍⚕️ Doctor attendance is adequate');
  }

  let response = '';
  if (urgentItems.length > 0) {
    response += '⚠️ Needs Attention:\n' + urgentItems.map(i => `• ${i}`).join('\n') + '\n\n';
  }
  if (okItems.length > 0) {
    response += '✅ All Good:\n' + okItems.map(i => `• ${i}`).join('\n') + '\n\n';
  }
  if (urgentItems.length > 0) {
    response += isStaff
      ? '💡 Go to Medicine Stock tab to raise indent, or Overview to update beds.'
      : '💡 Go to Directives to issue orders, or AI Insights for detailed predictions.';
  } else {
    response += '💡 Everything looks good. No urgent action needed.';
  }
  return response.trim();
}

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

    // Always fetch ALL data for full context (data is small per district)
    const categories = ['medicines', 'beds', 'attendance', 'footfall', 'evaluation'];

    // Scope data based on role
    const isStaff = role === 'Centre_Staff';
    const scopedCentreId = isStaff && centreId ? centreId : null;

    // Fetch context data from RTDB (scoped to single centre for staff)
    const contextData = await fetchContextData(districtId, categories, scopedCentreId);

    // Add role context to the prompt
    const roleContext = isStaff
      ? `\n\nUSER ROLE: Centre Staff at a single health centre. Only answer about their centre. Give hands-on operational advice (update stock, record attendance, raise indent, etc).`
      : `\n\nUSER ROLE: District Admin overseeing all centres. Give strategic oversight advice (redistribute resources, deploy staff, schedule inspections, etc).`;

    // Try Gemini first
    let aiResponse: string;
    let source: 'gemini' | 'local' = 'gemini';

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
      const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `${SYSTEM_PROMPT}${roleContext}\n\nCONTEXT DATA:\n${contextData}\n\nUSER QUESTION: ${question}`;

      const result = await Promise.race([
        chatModel.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini timeout')), 15000)
        ),
      ]);

      aiResponse = result.response.text();
    } catch {
      // Gemini unavailable — use local fallback
      console.log('Gemini unavailable for chat, using local fallback');
      aiResponse = generateLocalResponse(question, contextData, isStaff);
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
