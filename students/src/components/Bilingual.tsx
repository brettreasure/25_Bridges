interface BilingualEntry {
  en: string;
  my: string;
}

// Renders English, then Burmese on its own line below — only when `my` is
// non-empty (i.e. confirmed by a native speaker). Use for paragraphs and
// field labels. See src/portal/portalLabels.ts for the "why empty for now".
export function BilingualBlock({
  text,
  as: Tag = "p",
  className,
}: {
  text: BilingualEntry;
  as?: "p" | "div" | "label" | "strong";
  className?: string;
}) {
  return (
    <Tag className={className}>
      {text.en}
      {text.my && (
        <>
          <br />
          <span lang="my" className="lang-my">
            {text.my}
          </span>
        </>
      )}
    </Tag>
  );
}

// Renders "English / Burmese" inline — for buttons and short labels, same
// convention as the existing Submit button in Register.tsx.
export function BilingualInline({ text }: { text: BilingualEntry }) {
  return (
    <>
      {text.en}
      {text.my ? ` / ${text.my}` : ""}
    </>
  );
}
