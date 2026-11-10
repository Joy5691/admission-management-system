import { useState } from 'react';
import { Language, translations } from '../i18n';

interface Props {
  lang?: Language;
}

export function SupportWidget({ lang = 'en' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const t = translations[lang] || translations.en;

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
  ];

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div style={styles.container} className="no-print">
      {/* Popover Drawer */}
      {isOpen && (
        <div style={styles.drawerCard} className="animate-slide-up card">
          <div style={styles.drawerHeader}>
            <div style={styles.headerTitleRow}>
              <div style={styles.iconCircle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              <div>
                <h3 style={styles.drawerTitle}>{t.supportHelpline}</h3>
                <span style={styles.drawerSub}>{t.supportHours}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={styles.closeBtn}
              title="Close support drawer"
            >
              ✕
            </button>
          </div>

          <div style={styles.drawerBody}>
            {/* Quick Contact Buttons */}
            <div style={styles.contactRow}>
              <a href="tel:+8801700000000" style={styles.contactBtnPhone}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>{t.supportPhone}</span>
              </a>

              <a
                href="https://wa.me/8801700000000"
                target="_blank"
                rel="noreferrer"
                style={styles.contactBtnWa}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span>{t.whatsappSupport}</span>
              </a>
            </div>

            {/* FAQ Accordion */}
            <div style={styles.faqSection}>
              <span style={styles.faqHeading}>{t.faqTitle}</span>
              <div style={styles.faqList}>
                {faqs.map((faq, idx) => (
                  <div key={idx} style={styles.faqItem}>
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      style={styles.faqQBtn}
                    >
                      <span style={styles.faqQText}>{faq.q}</span>
                      <span style={{ ...styles.chevron, transform: activeFaq === idx ? 'rotate(180deg)' : 'rotate(0)' }}>
                        ▼
                      </span>
                    </button>
                    {activeFaq === idx && (
                      <div style={styles.faqABox} className="animate-fade-in">
                        <p style={styles.faqAText}>{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={styles.floatingTrigger}
        title={isOpen ? 'Close Support' : t.supportHelpline}
      >
        <div style={styles.pulseRing} />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isOpen ? (
            <line x1="18" y1="6" x2="6" y2="18"></line>
          ) : (
            <>
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </>
          )}
        </svg>
        <span style={styles.triggerLabel}>{lang === 'bn' ? 'সাহায্য' : 'Help'}</span>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 990,
  },
  floatingTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'var(--primary)',
    color: '#ffffff',
    border: 'none',
    padding: '0.65rem 1rem',
    borderRadius: 'var(--radius-full)',
    boxShadow: '0 6px 16px rgba(30, 107, 184, 0.35)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: '0.85rem',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    inset: -3,
    borderRadius: 'var(--radius-full)',
    border: '2px solid rgba(30, 107, 184, 0.4)',
    pointerEvents: 'none',
    animation: 'pulseHeld 2.5s infinite ease-in-out',
  },
  triggerLabel: {
    letterSpacing: '0.02em',
  },
  drawerCard: {
    position: 'absolute',
    bottom: 56,
    right: 0,
    width: 340,
    maxWidth: 'calc(100vw - 32px)',
    background: '#ffffff',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    border: '1px solid var(--slate-200)',
    overflow: 'hidden',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.9rem 1rem',
    background: 'linear-gradient(135deg, var(--primary) 0%, #2980d4 100%)',
    color: '#ffffff',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    fontSize: '0.875rem',
    fontWeight: 800,
    margin: 0,
    lineHeight: 1.2,
  },
  drawerSub: {
    fontSize: '0.675rem',
    opacity: 0.9,
    display: 'block',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.2rem',
    lineHeight: 1,
  },
  drawerBody: {
    padding: '1rem',
    maxHeight: 400,
    overflowY: 'auto',
  },
  contactRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  contactBtnPhone: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    background: 'var(--primary-light)',
    border: '1px solid var(--primary-border)',
    color: 'var(--primary-dark)',
    textDecoration: 'none',
    padding: '0.55rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8rem',
    fontWeight: 700,
    transition: 'background 0.15s ease',
  },
  contactBtnWa: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    textDecoration: 'none',
    padding: '0.55rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8rem',
    fontWeight: 700,
    transition: 'background 0.15s ease',
  },
  faqSection: {
    borderTop: '1px solid var(--slate-100)',
    paddingTop: '0.85rem',
  },
  faqHeading: {
    fontSize: '0.725rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    color: 'var(--slate-500)',
    letterSpacing: '0.04em',
    marginBottom: '0.5rem',
    display: 'block',
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  faqItem: {
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--slate-200)',
    overflow: 'hidden',
  },
  faqQBtn: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    background: 'var(--slate-50)',
    border: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    textAlign: 'left',
    gap: '0.5rem',
  },
  faqQText: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--slate-800)',
  },
  chevron: {
    fontSize: '0.55rem',
    color: 'var(--slate-500)',
    transition: 'transform 0.18s ease',
  },
  faqABox: {
    padding: '0.65rem 0.75rem',
    background: '#ffffff',
    borderTop: '1px solid var(--slate-100)',
  },
  faqAText: {
    fontSize: '0.725rem',
    color: 'var(--slate-600)',
    lineHeight: 1.5,
    margin: 0,
  },
};
