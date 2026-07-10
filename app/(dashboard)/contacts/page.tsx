'use client';

import React, { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/client';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { dbPaths } from '@/lib/firebase/types';
import { t } from '@/lib/i18n/translations';

interface DistrictAdminContact {
  name: string;
  designation: string;
  phone: string;
  email: string;
  office: string;
}

interface EmergencyContacts {
  ambulance: string;
  bloodBank: string;
  districtHospital: string;
  poisonControl: string;
}

interface CentreContact {
  headName: string;
  designation: string;
  phone: string;
  email: string;
}

interface ContactsData {
  districtAdmin: DistrictAdminContact;
  emergency: EmergencyContacts;
}

interface CentreWithContact {
  id: string;
  name: string;
  contact: CentreContact;
}

export default function ContactsPage() {
  const { profile } = useAuth();
  const lang = profile?.languagePreference ?? 'en';
  const [contactsData, setContactsData] = useState<ContactsData | null>(null);
  const [centres, setCentres] = useState<CentreWithContact[]>([]);
  const [loading, setLoading] = useState(true);

  const translateDesignation = (text: string): string => {
    if (lang === 'en') return text;
    const map: Record<string, string> = {
      'Chief Medical Officer': 'मुख्य चिकित्सा अधिकारी',
      'Medical Officer': 'चिकित्सा अधिकारी',
      'Chief District Health Officer': 'मुख्य जिला स्वास्थ्य अधिकारी',
      'District Health Office, Anand': 'जिला स्वास्थ्य कार्यालय, आनंद',
      'District Health Office': 'जिला स्वास्थ्य कार्यालय',
    };
    return map[text] || text;
  };

  useEffect(() => {
    if (!profile?.districtId) return;

    async function fetchContacts() {
      try {
        // Fetch district contacts (admin + emergency)
        const contactsRef = ref(database, dbPaths.contacts(profile!.districtId!));
        const contactsSnap = await get(contactsRef);
        if (contactsSnap.exists()) {
          setContactsData(contactsSnap.val() as ContactsData);
        }

        // Fetch centres with contact info
        const centresRef = ref(database, 'centres');
        const centresSnap = await get(centresRef);
        if (centresSnap.exists()) {
          const centresObj = centresSnap.val();
          const centreList: CentreWithContact[] = [];
          for (const [id, data] of Object.entries(centresObj)) {
            const centre = data as { name: string; districtId: string; contact?: CentreContact };
            if (centre.districtId === profile!.districtId && centre.contact) {
              centreList.push({ id, name: centre.name, contact: centre.contact });
            }
          }
          setCentres(centreList);
        }
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const isDistrictAdmin = profile?.role === 'District_Admin';

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('contact_directory', lang)}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isDistrictAdmin
            ? t('contacts_desc_admin', lang)
            : t('contacts_desc_staff', lang)}
        </p>
      </div>

      {/* Emergency Contacts — prominent for both roles */}
      {contactsData?.emergency && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('emergency_numbers', lang)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <EmergencyCard label={t('ambulance', lang)} number={contactsData.emergency.ambulance} color="red" />
            <EmergencyCard label={t('blood_bank', lang)} number={contactsData.emergency.bloodBank} color="red" />
            <EmergencyCard label={t('district_hospital', lang)} number={contactsData.emergency.districtHospital} color="orange" />
            <EmergencyCard label={t('poison_control', lang)} number={contactsData.emergency.poisonControl} color="orange" />
          </div>
        </section>
      )}

      {/* District Admin contact — for Centre Staff */}
      {!isDistrictAdmin && contactsData?.districtAdmin && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('district_admin', lang)}</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-lg font-bold text-indigo-700">
                  {contactsData.districtAdmin.name[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900">{contactsData.districtAdmin.name}</p>
                <p className="text-sm text-gray-500">{translateDesignation(contactsData.districtAdmin.designation)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{translateDesignation(contactsData.districtAdmin.office)}</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <a
                  href={`tel:${contactsData.districtAdmin.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <PhoneIcon />
                  {contactsData.districtAdmin.phone}
                </a>
                <a
                  href={`mailto:${contactsData.districtAdmin.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <EmailIcon />
                  {contactsData.districtAdmin.email}
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Centre Directory */}
      {centres.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            {isDistrictAdmin ? t('all_centre_contacts', lang) : t('other_centres_referrals', lang)}
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('centre', lang)}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('head_mo', lang)}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('phone', lang)}</th>
                  {isDistrictAdmin && (
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('email', lang)}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {centres
                  .filter(c => isDistrictAdmin || c.id !== profile?.centreId)
                  .map((centre) => (
                    <tr key={centre.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{centre.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{centre.contact.headName}</div>
                        <div className="text-xs text-gray-400">{translateDesignation(centre.contact.designation)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`tel:${centre.contact.phone}`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {centre.contact.phone}
                        </a>
                      </td>
                      {isDistrictAdmin && (
                        <td className="px-4 py-3">
                          <a
                            href={`mailto:${centre.contact.email}`}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            {centre.contact.email}
                          </a>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {centres
              .filter(c => isDistrictAdmin || c.id !== profile?.centreId)
              .map((centre) => (
                <div key={centre.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <p className="font-semibold text-gray-900">{centre.name}</p>
                  <p className="text-sm text-gray-500">
                    {centre.contact.headName} — {translateDesignation(centre.contact.designation)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`tel:${centre.contact.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <PhoneIcon />
                      {t('call', lang)}
                    </a>
                    {isDistrictAdmin && (
                      <a
                        href={`mailto:${centre.contact.email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <EmailIcon />
                        {t('email', lang)}
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function EmergencyCard({ label, number, color }: { label: string; number: string; color: 'red' | 'orange' }) {
  const bg = color === 'red' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
  const badge = color === 'red' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';

  return (
    <a
      href={`tel:${number}`}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${bg} hover:shadow-md transition-shadow`}
    >
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${badge}`}>
        {label}
      </span>
      <span className="text-lg font-bold text-gray-900">{number}</span>
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}
