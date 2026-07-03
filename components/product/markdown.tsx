import { cn } from "../ui";
import { tryParseTable } from "../../lib/markdown/table";

/**
 * A small, dependency-free Markdown renderer for previewing generated document
 * content. It escapes HTML first, then applies a safe subset of Markdown
 * (headings, bold/italic, inline code, links, lists, blockquotes, code fences,
 * horizontal rules). Links are restricted to http/https/mailto.
 */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(text: string) {
  let out = escapeHtml(text);
  // inline code
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  // links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>'
  );
  return out;
}

function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Table (header row + separator row)
    const parsed = tryParseTable(lines, i);
    if (parsed) {
      closeList();
      const { table } = parsed;
      const head = table.header
        .map(
          (cell, idx) =>
            `<th style="text-align:${table.aligns[idx] || "left"}">${inline(
              cell
            )}</th>`
        )
        .join("");
      const body = table.rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell, idx) =>
                  `<td style="text-align:${
                    table.aligns[idx] || "left"
                  }">${inline(cell)}</td>`
              )
              .join("")}</tr>`
        )
        .join("");
      html.push(
        `<div class="prose-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
      );
      i = parsed.next;
      continue;
    }

    // Code fence
    if (line.trim().startsWith("```")) {
      closeList();
      const buffer: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buffer.push(escapeHtml(lines[i]));
        i += 1;
      }
      i += 1;
      html.push(`<pre><code>${buffer.join("\n")}</code></pre>`);
      continue;
    }

    // Blank
    if (!line.trim()) {
      closeList();
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      html.push("<hr />");
      i += 1;
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 3);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      closeList();
      html.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      i += 1;
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ""))}</li>`);
      i += 1;
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      i += 1;
      continue;
    }

    // Paragraph
    closeList();
    html.push(`<p>${inline(line)}</p>`);
    i += 1;
  }

  closeList();
  return html.join("\n");
}

export function MarkdownPreview({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn("prose-doc", className)}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
