import { Fragment } from 'react';
import { parseGroupJoinTokenFromUrl } from '../../utils/groupJoinLink';

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

interface MessageTextContentProps {
  text: string;
  isOwn?: boolean;
  onGroupJoinLinkClick?: (token: string) => void;
}

export function MessageTextContent({ text, isOwn = false, onGroupJoinLinkClick }: MessageTextContentProps) {
  const parts = text.split(URL_REGEX);

  return (
    <p className="max-w-full whitespace-pre-wrap break-all [overflow-wrap:anywhere] text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (!part) return null;
        if (!/^https?:\/\//i.test(part)) {
          return <Fragment key={`text-${index}`}>{part}</Fragment>;
        }

        const token = parseGroupJoinTokenFromUrl(part);
        if (token && onGroupJoinLinkClick) {
          return (
            <button
              key={`join-${index}`}
              type="button"
              onClick={() => onGroupJoinLinkClick(token)}
              className={`font-semibold underline underline-offset-2 cursor-pointer ${ isOwn ? 'text-white hover:text-emerald-100' : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400' }`}
            >
              Liên kết tham gia nhóm
            </button>
          );
        }

        return (
          <a
            key={`link-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 ${ isOwn ? 'text-white hover:text-emerald-100' : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400' }`}
          >
            {part}
          </a>
        );
      })}
    </p>
  );
}
