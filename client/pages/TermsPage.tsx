import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const sections = [
  {
    title: 'Introduction and Agreement',
    titleAr: 'المقدمة والموافقة',
    body:
      'Welcome to AUTOUSATA. These Terms and Conditions of Use govern your access to and use of the AUTOUSATA website and services. By using the site, you acknowledge that you have read, understood, and agree to these terms and to comply with applicable laws. You must be at least 18 years old to use the site.',
    bodyAr:
      'أهلا بيك في AUTOUSATA. شروط الاستخدام دي بتنظم دخولك واستخدامك للموقع والخدمات. باستخدامك للموقع، إنت بتقر إنك قريت وفهمت وموافق على الشروط وملتزم بالقوانين. لازم يكون سنك 18 سنة أو أكتر.'
  },
  {
    title: 'How We Use Your Information',
    titleAr: 'إزاي بنستخدم بياناتك',
    body:
      'We may collect personal and non-personal information to operate and improve the site, provide services, and meet legal or security obligations. Personal information may include contact details and account data you submit. We process data in accordance with our Privacy Notice.',
    bodyAr:
      'ممكن نجمع بيانات شخصية وغير شخصية عشان نشغل الموقع ونطوره ونقدم الخدمات ونلتزم بالمتطلبات القانونية والأمنية. البيانات الشخصية ممكن تشمل بيانات التواصل وبيانات حسابك. بنعالج البيانات طبقا لسياسة الخصوصية.'
  },
  {
    title: 'Site Provisions and Services',
    titleAr: 'خدمات الموقع',
    body:
      'AUTOUSATA is a marketplace for vehicle listings and auctions. AUTOUSATA does not own vehicles or act as a party to buyer-seller transactions unless explicitly stated. Listing information is provided by sellers or third parties.',
    bodyAr:
      'AUTOUSATA سوق لإعلانات العربيات والمزادات. AUTOUSATA مش مالك للعربيات ومش طرف في معاملات البيع والشراء إلا لو اتذكر بشكل صريح. بيانات القوائم مقدمة من البائعين أو أطراف أخرى.'
  },
  {
    title: 'Access and Use',
    titleAr: 'الدخول والاستخدام',
    body:
      'You agree not to misuse the site, interfere with its operation, or attempt to access data you are not authorized to access. Automated scraping, reverse engineering, and unauthorized redistribution of content are prohibited.',
    bodyAr:
      'بتتعهد إنك مش هتسيء استخدام الموقع أو تعطل تشغيله أو تحاول تدخل لبيانات غير مصرح لك. ممنوع السحب الآلي للبيانات أو الهندسة العكسية أو إعادة نشر المحتوى بدون إذن.'
  },
  {
    title: 'User Materials',
    titleAr: 'محتوى المستخدم',
    body:
      'By submitting content (including photos, text, and listings), you grant AUTOUSATA a non-exclusive, worldwide, royalty-free license to display, distribute, and use that content to operate the site and services. You confirm you have the rights to submit such content.',
    bodyAr:
      'لما ترفع محتوى (صور/نص/قوائم)، إنت بتدي AUTOUSATA ترخيص غير حصري وعالمي ومجاني لعرضه وتوزيعه واستخدامه لتشغيل الموقع والخدمات. وإنت بتأكد إن معاك حقوق المحتوى ده.'
  },
  {
    title: 'Trademarks and Intellectual Property',
    titleAr: 'العلامات التجارية والملكية الفكرية',
    body:
      'AUTOUSATA and its logos, trademarks, and content are protected by intellectual property laws. You may not use AUTOUSATA branding without prior written permission.',
    bodyAr:
      'AUTOUSATA وشعاراته وعلاماته التجارية ومحتواه محميين بقوانين الملكية الفكرية. ممنوع استخدام العلامة التجارية بدون إذن كتابي مسبق.'
  },
  {
    title: 'Copyright and Copyright Agents',
    titleAr: 'حقوق النشر',
    body:
      'AUTOUSATA respects intellectual property rights and responds to valid infringement notices. If you believe content infringes your rights, contact us with a detailed notice so we can investigate.',
    bodyAr:
      'AUTOUSATA بيحترم حقوق الملكية الفكرية وبيتعامل مع بلاغات الانتهاك الصحيحة. لو شايف إن في محتوى بينتهك حقوقك، ابعت لنا بلاغ تفصيلي عشان نحقق.'
  },
  {
    title: 'Representation',
    titleAr: 'إقراراتك',
    body:
      'You represent that any information you provide is accurate and that your use of the site does not violate any law or third-party rights.',
    bodyAr:
      'إنت بتقر إن أي معلومات بتقدمها صحيحة وإن استخدامك للموقع ما بيخالفش أي قانون أو حقوق طرف ثالث.'
  },
  {
    title: 'Warranty Disclaimer',
    titleAr: 'إخلاء مسؤولية الضمان',
    body:
      'The site and services are provided “as is” and “as available.” AUTOUSATA disclaims all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
    bodyAr:
      'الموقع والخدمات بتتقدم “كما هي” و“حسب التوفر”. AUTOUSATA بيخلي مسؤوليته عن كل الضمانات، بما فيها ضمانات الملاءمة للبيع أو لغرض معين وعدم الانتهاك.'
  },
  {
    title: 'Limitation of Liability',
    titleAr: 'تحديد المسؤولية',
    body:
      'To the maximum extent permitted by law, AUTOUSATA will not be liable for indirect, incidental, or consequential damages arising from your use of the site or services.',
    bodyAr:
      'لأقصى حد يسمح به القانون، AUTOUSATA مش مسؤول عن أي أضرار غير مباشرة أو عرضية أو تبعية ناتجة عن استخدامك للموقع أو الخدمات.'
  },
  {
    title: 'Third Party Service Providers',
    titleAr: 'مقدمو خدمات طرف ثالث',
    body:
      'Certain services may be provided by third parties. AUTOUSATA is not responsible for the performance or policies of those providers.',
    bodyAr:
      'بعض الخدمات ممكن يقدمها أطراف ثالثة. AUTOUSATA مش مسؤول عن أداء أو سياسات مقدمي الخدمات دول.'
  },
  {
    title: 'Indemnification',
    titleAr: 'التعويض',
    body:
      'You agree to indemnify and hold AUTOUSATA harmless from claims arising from your use of the site, your content, or your violation of these terms.',
    bodyAr:
      'إنت موافق تعوض وتحمي AUTOUSATA من أي مطالبات ناتجة عن استخدامك للموقع أو محتواك أو مخالفتك للشروط.'
  },
  {
    title: 'Security',
    titleAr: 'الأمان',
    body:
      'While we take reasonable measures to protect the site, no system is completely secure. You are responsible for protecting your account credentials.',
    bodyAr:
      'بنطبق إجراءات معقولة لحماية الموقع، لكن مفيش نظام آمن 100%. إنت مسؤول عن حماية بيانات الدخول بتاعتك.'
  },
  {
    title: 'Termination of Service',
    titleAr: 'إنهاء الخدمة',
    body:
      'We may suspend or terminate access if you violate these terms or use the site in a harmful or unlawful way.',
    bodyAr:
      'ممكن نوقف أو ننهي دخولك لو خالفت الشروط أو استخدمت الموقع بشكل ضار أو غير قانوني.'
  },
  {
    title: 'Compliance with Laws',
    titleAr: 'الالتزام بالقوانين',
    body:
      'You are responsible for complying with all applicable laws, regulations, and local requirements related to your use of the site.',
    bodyAr:
      'إنت مسؤول عن الالتزام بكل القوانين واللوائح والمتطلبات المحلية الخاصة باستخدامك للموقع.'
  },
  {
    title: 'Prohibited Activities',
    titleAr: 'أنشطة ممنوعة',
    body:
      'Prohibited activities include fraud, harassment, unauthorized data collection, misuse of listings, or any action that disrupts the site or violates these terms.',
    bodyAr:
      'الأنشطة الممنوعة تشمل الاحتيال أو المضايقة أو جمع بيانات بدون تصريح أو إساءة استخدام القوائم أو أي فعل يعطل الموقع أو يخالف الشروط.'
  },
  {
    title: 'Privacy Notice',
    titleAr: 'إشعار الخصوصية',
    body:
      'Your use of the site is subject to our Privacy Notice, which describes how we collect, use, and share information.',
    bodyAr:
      'استخدامك للموقع خاضع لإشعار الخصوصية اللي بيوضح بنجمع ونستخدم ونشارك البيانات إزاي.'
  },
  {
    title: 'International Users and Export Control Laws',
    titleAr: 'المستخدمون الدوليون وقوانين التصدير',
    body:
      'If you access the site from outside your jurisdiction, you are responsible for compliance with local laws and any export control restrictions.',
    bodyAr:
      'لو بتستخدم الموقع من خارج نطاقك، إنت مسؤول عن الالتزام بالقوانين المحلية وأي قيود تصدير.'
  },
  {
    title: 'Governing Law; Jurisdiction',
    titleAr: 'القانون الحاكم والاختصاص',
    body:
      'These terms are governed by applicable laws of the jurisdiction where AUTOUSATA operates, unless otherwise required by law.',
    bodyAr:
      'الشروط دي محكومة بالقوانين السارية في المكان اللي AUTOUSATA بيشتغل فيه، إلا إذا القانون فرض غير كده.'
  },
  {
    title: 'Class Action',
    titleAr: 'الدعاوى الجماعية',
    body:
      'Disputes must be brought on an individual basis; class or representative actions are not permitted to the extent allowed by law.',
    bodyAr:
      'النزاعات لازم تكون بشكل فردي؛ الدعاوى الجماعية أو التمثيلية غير مسموحة بالقدر اللي يسمح به القانون.'
  },
  {
    title: 'Dispute Resolution',
    titleAr: 'حل النزاعات',
    body:
      'We encourage resolving disputes informally first. If a dispute cannot be resolved, it will be handled through the applicable legal process in accordance with these terms.',
    bodyAr:
      'بنشجع حل أي نزاع بشكل ودي الأول. لو ما اتحلش، هيتم التعامل معاه بالإجراءات القانونية وفقا للشروط.'
  },
  {
    title: 'Changes to These Terms and Conditions',
    titleAr: 'تحديثات الشروط',
    body:
      'We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms.',
    bodyAr:
      'ممكن نحدث الشروط من وقت للتاني. استمرارك في الاستخدام بعد التحديث معناه إنك موافق على النسخة الجديدة.'
  },
  {
    title: 'Third Party Links',
    titleAr: 'روابط طرف ثالث',
    body:
      'The site may include links to third-party sites. AUTOUSATA is not responsible for third-party content, policies, or practices.',
    bodyAr:
      'الموقع ممكن يحتوي روابط لمواقع طرف ثالث. AUTOUSATA مش مسؤول عن محتوى أو سياسات أو ممارسات الأطراف دي.'
  },
  {
    title: 'Miscellaneous',
    titleAr: 'بنود متفرقة',
    body:
      'If any part of these terms is unenforceable, the remaining sections remain in effect. These terms constitute the entire agreement between you and AUTOUSATA for site use.',
    bodyAr:
      'لو أي جزء من الشروط غير قابل للتنفيذ، باقي البنود تفضل سارية. الشروط دي هي الاتفاق الكامل بينك وبين AUTOUSATA لاستخدام الموقع.'
  },
  {
    title: 'Contact Information',
    titleAr: 'بيانات التواصل',
    body:
      'For questions or concerns about these Terms, please contact our cofounders: Maya, Hala, Ali, Ahmed, and Kevin. You can reach us through the AUTOUSATA website contact channels.',
    bodyAr:
      'لأي أسئلة بخصوص الشروط، تقدر تتواصل مع المؤسسين: مايا، هالة، علي، أحمد، وكيفن. التواصل متاح من خلال قنوات الاتصال في موقع AUTOUSATA.'
  }
];

const TermsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.2),_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center hero-fade-in">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300 mb-4">{t('Terms and Conditions of Use', 'شروط وأحكام الاستخدام')}</p>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">{t('AUTOUSATA Terms of Service', 'شروط خدمة AUTOUSATA')}</h1>
          <p className="text-sm md:text-base text-slate-200/90 mt-4 max-w-2xl mx-auto">
            {t(
              'These terms explain how the AUTOUSATA website and services may be used, and the responsibilities of all users.',
              'الشروط دي بتوضح إزاي تستخدم موقع وخدمات AUTOUSATA، ومسؤوليات كل المستخدمين.'
            )}
          </p>
          <p className="text-xs text-slate-400 mt-3">{t('Last updated: February 3, 2026', 'آخر تحديث: 3 فبراير 2026')}</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-6 md:p-10">
          <div className="space-y-8">
            {sections.map(section => (
              <div key={section.title} className="border-b border-slate-100 pb-6 last:border-b-0 last:pb-0 text-center">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">{t(section.title, section.titleAr)}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{t(section.body, section.bodyAr)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;
