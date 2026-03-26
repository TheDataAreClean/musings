---
title: The test formatting reference guide
date: 2026-03-26
updated: 2026-03-26
description: "Every element this document format supports, in one place."
tags:
  - meta
  - design
notion_id: 32fa5f73-735d-806c-8982-f508ecea9baf
notion_last_edited: 2026-03-26T15:59:00.000Z
---

This document exists to show every formatting element this site can render. It is a reference and a test. The content is real where it can be; instrumental where it must be.


## Inline text


Running prose can include **bold text** for emphasis, _italic text_ for titles and stress, and ~~strikethrough~~ for corrections or retractions. These can combine: _**bold italic**_ works, as does ~~_struck italic_~~.


Inline `code` renders in a monospace font with a faint background. It is for short technical terms, variable names, filenames — things that need to be distinguished from prose.


Links come in two kinds. [External links](https://www.example.com/) point away from this site. [Internal links](https://www.notion.so/about/) navigate within it. Both use the standard browser link colour.


The typographer is on. This means "straight quotes" become "curly quotes" automatically. Apostrophes too: it's, they're, the '90s. A double hyphen -- becomes an em dash. Three dots... become an ellipsis.


---


## Headings


Headings here are the same size and weight as body text. Structure is in the spacing and in the words themselves, not in visual hierarchy. This is a deliberate choice.


### Third-level heading


A third-level heading, introduced by `###`. Used for subsections within a section.


### Fourth-level heading


A fourth-level heading, `####`. Use sparingly — if you need four levels of hierarchy in a single document, the document may need restructuring.


---


## Lists


An unordered list:

- The first item, which establishes the pattern
- A second item, continuing it
- A third item, closing the set
    - A nested item, indented one level
    - Another nested item at the same level
        - Nested two levels deep, which is usually too deep

An ordered list:

1. The first step, which must come first
2. The second step, which follows from it
3. The third step, which completes the sequence
    1. A sub-step within the third step
    2. Another sub-step

A list where items are full sentences should end each sentence with a full stop. A list where items are fragments should not. Mixing the two in a single list is the most common list error.


---


## Blockquote


A blockquote is for quotation — text that originates elsewhere. It is indented without decoration. The source, if needed, follows as a regular paragraph.

> The test of a first-rate intelligence is the ability to hold two opposed ideas in mind at the same time and still retain the ability to function.

F. Scott Fitzgerald, _The Crack-Up_, 1936.


---


## Code block


A fenced code block, with syntax annotation:


```json
{
  "title": "A complete formatting reference",
  "date": "2026-03-26",
  "tags": ["meta", "design"]
}
```


A shell example:


```bash
npm run dev
# → Watching for changes…
# → Server at <http://localhost:8080>
```


Code blocks scroll horizontally if the content is wider than the page. They do not wrap.


---


## Table


Tables use the standard pipe syntax. Column alignment is set with colons in the separator row.


| Element         | Markdown                  | Renders as |
| --------------- | ------------------------- | ---------- |
| Bold            | `**text**`                | **text**   |
| Italic          | `*text*`                  | _text_     |
| Strikethrough   | `~~text~~`                | ~~text~~   |
| Inline code     | ``code``                  | `code`     |
| Horizontal rule | `---`                     | * * *      |
| Page break      | `<hr class="page-break">` | grey strip |


Tables should be used for genuinely tabular data. If you find yourself merging cells or nesting tables, a list or prose is probably the right tool.


<hr class="page-break">


## Page break


The grey strip above is a page break. It is for long documents that are conceptually divided into pages. It renders as a full-bleed band of the desk colour, with a page counter.


Use `<hr class="page-break">` to insert one. A plain `---` in the body renders as the typographic `* * *` section break, which is lighter.


---


## Image


An image, constrained to the document width:


![sample.svg](https://prod-files-secure.s3.us-west-2.amazonaws.com/739020b0-af35-4d8b-b730-bb8292bdb363/7a0ce7e6-4a9a-424c-b43d-f5613ecf4d37/sample.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466VY3TM5V6%2F20260326%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260326T160938Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEAAaCXVzLXdlc3QtMiJHMEUCIEv4maUaxGP5oAOVjA7DlrMouEYxtxDCghZwXXOcp9hPAiEAp4BnJhjBq3CB9soft5beO7Xtag14ZH0FYXOEdix3fDgqiAQIyf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDGyUnXfIdM4XA8HMPircA61fJuiyh4BUDXbVRk7m%2BzT9OphbghJs%2FkG3qnRO27l78CsBMG7Isps4pDVHktK5%2F6tQfsvNrS0GtLRjHBtcUSVOgDWdJVnI%2F5ouE8l%2FkzxCaY3xhcLYqicbazOBT54HnFQDfQA9tIYMM8zX%2F2PcvCE27uDcEK0cobiTFjdHeAnh9dAmeXzYNDJVBXrzgJrvpvKn%2FLkcqCbobY2Fp685WgmVJgBsoZpGfvPI1u89Hkgy5q0cHCMO9Wv4odDp89mssoXliH7niuVaiS38gp0dN7ufP3RaA2l%2B3GnXOBkFdgh%2Fh%2FlnIaNBkLRhy9reh8At7Hxj3XiUd4dfCROX%2FsTj6zgvR0bfzvKpj91h5Lj7wc5ijanC749tryMRjVFqstRFEuZM0tMZ2R91Rl8hTPHkJHD4t6Iv0wpcYMLMCJVN%2F0QsP8k7YrM2gJVR1TXQ4j7MtCl42pPRO7Kjy9n3pgZrSMmUp7pGj%2B9CzaspIDIkzRuSb3ijwRw0BmqxGATF9VB39zPiBA8edb4Tzu7ylLDWOzWLhGQm7VRdys1LpbShqud5ReXmUkkpMIbfxAivhjGn6unAWmqPYrxom59L38Taq89AUgXEf02Y%2B89ObGZrKC0IO0qvr7Q2krZmVfrEMOqvlc4GOqUBO5pEhKbqB4uHVQwwkS8%2Bz4LXO8hfZdcRlMfQFnTqgKjcsg%2FeuRD%2BEM2nglLR9K4MNjCC5GgICfIGkggpA7I8vAF%2BGpbOnDonWEU%2FHPnB2dlpS4LH4%2BUhmj23%2FwtvlQ0CBQFUhBEnYDmk1tiCBwOylj6jvRCDA932%2F3NQAQfcibont92W3qY6%2FfTtiKlFHeuNXyL0TRgf6VVg9jMyng2cWQdrhmKq&X-Amz-Signature=a5bcecb12db4796a8b9ce3413d7bc505937c3d2f0bdfb6fbb72ea93e20c7d6f3&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)


Images are block-level. They sit on their own line with vertical spacing above and below. They do not float. Captions are not built in — a following paragraph in _italic_ can serve as one.


_An SVG placeholder standing in for a real photograph. Replace with an actual image file in_ `src/images/`.


---


## Callout


{% callout "note" %}
A note callout. Use this for asides, clarifications, or additional context that is useful but not essential to the main argument. It has a faint yellow background.
{% endcallout %}


{% callout "warning" %}
A warning callout. Use this for things the reader should be careful about — exceptions, caveats, known failure modes. It has a faint orange background.
{% endcallout %}


---


## Margin note


{% marginnote %}
A margin note sits here, to the left of the content on wide screens, and inline on narrow ones. Use it for short asides that would interrupt the prose if embedded in it.
{% endmarginnote %}


The paragraph that hosts a margin note should be self-contained — readable without the note. The note adds, it does not complete. This is the difference between a margin note and a footnote: margin notes are optional; footnotes are referenced.[^1]


---


## Custom IDs via attrs


The `markdown-it-attrs` plugin lets you attach HTML attributes to any block element by appending them in curly braces. The most useful case is overriding the auto-generated heading slug for stable deep links:


```markdown
## My Heading { #custom-id }
## My Heading { .custom-class }
## My Heading { data-foo="bar" }
```


Note: because this site processes Nunjucks before markdown, ID attrs must be written with a space before the hash — `{ #id }` rather than the collapsed form. Class and data attributes (`{.class}`, `{data-x="y"}`) have no such restriction.


---


## Footnotes


Footnotes are numbered automatically and linked bidirectionally.[^2] The reference appears inline as a superscript; the note appears at the bottom of the document with a return link.


They are for genuine supplementary material — citations, extended asides, qualifications that would slow the prose if embedded in it. If you find yourself writing footnotes longer than the paragraphs they annotate, reconsider whether the footnote belongs in the body or in a separate section.


[^1]: The footnote itself, demonstrating its own form. The text above references this note; this note does not assume you read the text above in order to make sense. That is the test.


[^2]: A second footnote. The numbering is automatic — add or remove footnotes anywhere in the document and the numbers update.
