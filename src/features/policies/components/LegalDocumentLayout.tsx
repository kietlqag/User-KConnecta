import { Shield, FileText } from 'lucide-react';
import { InfoPageShell } from './InfoPageShell';

interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

interface LegalDocumentLayoutProps {
  title: string;
  subtitle: string;
  updatedAt: string;
  icon: 'privacy' | 'terms';
  sections: LegalSection[];
}

export function LegalDocumentLayout({
  title,
  subtitle,
  updatedAt,
  icon,
  sections,
}: LegalDocumentLayoutProps) {
  const Icon = icon === 'privacy' ? Shield : FileText;

  return (
    <InfoPageShell title={title} subtitle={subtitle} updatedAt={updatedAt} icon={Icon}>
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">{section.title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc space-y-1.5 pl-5">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </InfoPageShell>
  );
}
