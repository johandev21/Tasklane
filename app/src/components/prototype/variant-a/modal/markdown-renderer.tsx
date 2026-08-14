export interface MarkdownRendererProps {
  text: string
}

export function MarkdownRenderer({ text }: MarkdownRendererProps) {
  const lines = text.split('\n')

  return (
    <div className="space-y-2 text-base leading-relaxed text-foreground">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-2" />
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="font-heading font-bold text-base text-foreground pt-1 break-all"
            >
              {trimmed.replace(/^###\s+/, '')}
            </h3>
          )
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="font-heading font-bold text-lg text-foreground pt-1.5 break-all"
            >
              {trimmed.replace(/^##\s+/, '')}
            </h2>
          )
        }

        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="font-heading font-bold text-xl text-foreground pt-2 break-all"
            >
              {trimmed.replace(/^#\s+/, '')}
            </h1>
          )
        }

        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-primary/60 pl-2.5 italic text-muted-foreground break-all"
            >
              {trimmed.replace(/^>\s+/, '')}
            </blockquote>
          )
        }

        if (
          trimmed.startsWith('• ') ||
          trimmed.startsWith('- ') ||
          trimmed.startsWith('* ')
        ) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-primary font-bold">•</span>
              <span className="flex-1 break-all">
                {trimmed.replace(/^[•\-*]\s+/, '')}
              </span>
            </div>
          )
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-mono text-muted-foreground font-semibold">
                {numMatch[1]}.
              </span>
              <span className="flex-1 break-all">{numMatch[2]}</span>
            </div>
          )
        }

        return (
          <p key={idx} className="break-all">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}
