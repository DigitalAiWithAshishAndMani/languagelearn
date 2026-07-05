import React from 'react';

export interface LanguageOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    color: '#3776AB',
    description: 'Clean syntax, dynamic typing, async programming, and data structures.',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '🟨',
    color: '#F7DF1E',
    description: 'Event-driven asynchronously powered prototypes, closures, and promises.',
  },
  {
    id: 'java',
    name: 'Java',
    icon: '☕',
    color: '#007396',
    description: 'Object-oriented structures, collections, multi-threaded concurrency, and generics.',
  },
  {
    id: 'cpp',
    name: 'C++',
    icon: '⚙️',
    color: '#00599C',
    description: 'Manual memory management, pointers, templates, RAII, and the STL.',
  },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelect: (lang: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLanguage, onSelect }) => {
  return (
    <div style={styles.grid}>
      {LANGUAGES.map((lang) => {
        const isSelected = selectedLanguage === lang.id;
        return (
          <div
            key={lang.id}
            onClick={() => onSelect(lang.id)}
            className="glass-card"
            style={{
              ...styles.card,
              borderColor: isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.06)',
              background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(30, 41, 59, 0.4)',
              boxShadow: isSelected ? '0 0 20px rgba(6, 182, 212, 0.15)' : 'var(--shadow-lg)',
            }}
          >
            <div style={styles.header}>
              <span style={styles.icon}>{lang.icon}</span>
              <span style={styles.name}>{lang.name}</span>
            </div>
            <p style={styles.description}>{lang.description}</p>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    margin: '24px 0',
  },
  card: {
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '150px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  icon: {
    fontSize: '2rem',
  },
  name: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#ffffff',
  },
  description: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
};
