import React from 'react';

const sections = [
  {
    title: 'Introduction and Agreement',
    body:
      'Welcome to AUTOUSATA. These Terms and Conditions of Use govern your access to and use of the AUTOUSATA website and services. By using the site, you acknowledge that you have read, understood, and agree to these terms and to comply with applicable laws. You must be at least 18 years old to use the site.'
  },
  {
    title: 'How We Use Your Information',
    body:
      'We may collect personal and non-personal information to operate and improve the site, provide services, and meet legal or security obligations. Personal information may include contact details and account data you submit. We process data in accordance with our Privacy Notice.'
  },
  {
    title: 'Site Provisions and Services',
    body:
      'AUTOUSATA is a marketplace for vehicle listings and auctions. AUTOUSATA does not own vehicles or act as a party to buyer–seller transactions unless explicitly stated. Listing information is provided by sellers or third parties.'
  },
  {
    title: 'Access and Use',
    body:
      'You agree not to misuse the site, interfere with its operation, or attempt to access data you are not authorized to access. Automated scraping, reverse engineering, and unauthorized redistribution of content are prohibited.'
  },
  {
    title: 'User Materials',
    body:
      'By submitting content (including photos, text, and listings), you grant AUTOUSATA a non-exclusive, worldwide, royalty-free license to display, distribute, and use that content to operate the site and services. You confirm you have the rights to submit such content.'
  },
  {
    title: 'Trademarks and Intellectual Property',
    body:
      'AUTOUSATA and its logos, trademarks, and content are protected by intellectual property laws. You may not use AUTOUSATA branding without prior written permission.'
  },
  {
    title: 'Copyright and Copyright Agents',
    body:
      'AUTOUSATA respects intellectual property rights and responds to valid infringement notices. If you believe content infringes your rights, contact us with a detailed notice so we can investigate.'
  },
  {
    title: 'Representation',
    body:
      'You represent that any information you provide is accurate and that your use of the site does not violate any law or third-party rights.'
  },
  {
    title: 'Warranty Disclaimer',
    body:
      'The site and services are provided “as is” and “as available.” AUTOUSATA disclaims all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.'
  },
  {
    title: 'Limitation of Liability',
    body:
      'To the maximum extent permitted by law, AUTOUSATA will not be liable for indirect, incidental, or consequential damages arising from your use of the site or services.'
  },
  {
    title: 'Third Party Service Providers',
    body:
      'Certain services may be provided by third parties. AUTOUSATA is not responsible for the performance or policies of those providers.'
  },
  {
    title: 'Indemnification',
    body:
      'You agree to indemnify and hold AUTOUSATA harmless from claims arising from your use of the site, your content, or your violation of these terms.'
  },
  {
    title: 'Security',
    body:
      'While we take reasonable measures to protect the site, no system is completely secure. You are responsible for protecting your account credentials.'
  },
  {
    title: 'Termination of Service',
    body:
      'We may suspend or terminate access if you violate these terms or use the site in a harmful or unlawful way.'
  },
  {
    title: 'Compliance with Laws',
    body:
      'You are responsible for complying with all applicable laws, regulations, and local requirements related to your use of the site.'
  },
  {
    title: 'Prohibited Activities',
    body:
      'Prohibited activities include fraud, harassment, unauthorized data collection, misuse of listings, or any action that disrupts the site or violates these terms.'
  },
  {
    title: 'Privacy Notice',
    body:
      'Your use of the site is subject to our Privacy Notice, which describes how we collect, use, and share information.'
  },
  {
    title: 'International Users and Export Control Laws',
    body:
      'If you access the site from outside your jurisdiction, you are responsible for compliance with local laws and any export control restrictions.'
  },
  {
    title: 'Governing Law; Jurisdiction',
    body:
      'These terms are governed by applicable laws of the jurisdiction where AUTOUSATA operates, unless otherwise required by law.'
  },
  {
    title: 'Class Action',
    body:
      'Disputes must be brought on an individual basis; class or representative actions are not permitted to the extent allowed by law.'
  },
  {
    title: 'Dispute Resolution',
    body:
      'We encourage resolving disputes informally first. If a dispute cannot be resolved, it will be handled through the applicable legal process in accordance with these terms.'
  },
  {
    title: 'Changes to These Terms and Conditions',
    body:
      'We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms.'
  },
  {
    title: 'Third Party Links',
    body:
      'The site may include links to third-party sites. AUTOUSATA is not responsible for third-party content, policies, or practices.'
  },
  {
    title: 'Miscellaneous',
    body:
      'If any part of these terms is unenforceable, the remaining sections remain in effect. These terms constitute the entire agreement between you and AUTOUSATA for site use.'
  },
  {
    title: 'Contact Information',
    body:
      'For questions or concerns about these Terms, please contact our cofounders: Maya, Hala, Ali, Ahmed, and Kevin. You can reach us through the AUTOUSATA website contact channels.'
  }
];

const TermsPage: React.FC = () => (
  <div className="bg-slate-50 min-h-screen">
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.2),_transparent_60%)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center hero-fade-in">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-300 mb-4">Terms and Conditions of Use</p>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">AUTOUSATA Terms of Service</h1>
        <p className="text-sm md:text-base text-slate-200/90 mt-4 max-w-2xl mx-auto">
          These terms explain how the AUTOUSATA website and services may be used, and the responsibilities of all users.
        </p>
        <p className="text-xs text-slate-400 mt-3">Last updated: February 3, 2026</p>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
      <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-6 md:p-10">
        <div className="space-y-8">
          {sections.map(section => (
            <div key={section.title} className="border-b border-slate-100 pb-6 last:border-b-0 last:pb-0 text-center">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{section.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default TermsPage;
