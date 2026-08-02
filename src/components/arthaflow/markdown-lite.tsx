/**
 * The smallest possible renderer for what Saathi actually outputs.
 *
 * Not a markdown library: Saathi's system prompt never asks for headings,
 * links, tables or nested emphasis, and the model doesn't produce them in
 * practice. What it does produce — confirmed against real transcripts — is
 * **bold** for HS codes and figures, occasional `inline code`, and "- " / "* "
 * bullet lists for market breakdowns. Before this file existed, those markers
 * rendered as literal asterisks in the chat bubble: "* **HS 420221**..." on
 * screen instead of a bolded code. This covers exactly that surface, in pure
 * React (no dangerouslySetInnerHTML — model output is untrusted text), so a
 * ~40-line function replaces a dependency for three token types.
 */

function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Bold and inline-code tokens, left to right; everything else is plain text.
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(line))) {
    if (m.index > last) nodes.push(line.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-${i++}`} className="font-semibold">
          {m[2]}
        </strong>
      );
    } else if (m[3] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-${i++}`}
          className="rounded bg-black/20 px-1 py-0.5 font-mono text-[0.92em]"
        >
          {m[3]}
        </code>
      );
    }
    last = re.lastIndex;
  }
  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}

export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = (key: string) => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={key} className="my-1.5 list-disc space-y-0.5 pl-4">
        {listBuf.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  lines.forEach((line, i) => {
    const bullet = /^[-*]\s+(.*)$/.exec(line.trim());
    if (bullet) {
      listBuf.push(bullet[1]);
      return;
    }
    flushList(`ul-${i}`);
    if (line.trim() === "") {
      // A blank line is a paragraph break, not an empty <p> — skip it rather
      // than rendering a stray gap.
      return;
    }
    blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
  });
  flushList("ul-end");

  return <>{blocks}</>;
}
