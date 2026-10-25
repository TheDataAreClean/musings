// Insert menu for the body editor: the site's own shortcodes and conventions
// (see /reference/) as small forms, so none of them have to be typed by hand.
// Each pattern must match exactly what toBlock writes, or a saved block won't
// open back into its form. A pattern with the `m` flag is a block; without it,
// an inline element (the footnote marker).
(function () {
  var NOTE = /^\{% marginnote(?: "([^"]*)"(?:, "([^"]*)")?)? %\}\n([\s\S]*?)\n\{% endmarginnote %\}$/m;
  var CALLOUT = /^\{% callout "(note|warning)" %\}\n([\s\S]*?)\n\{% endcallout %\}$/m;
  var BREAK = /^\{% pagebreak %\}$/m;
  var REF = /\[\^([^\]\s]+)\](?!:)/;
  var DEF = /^\[\^([^\]\s]+)\]: (.+)$/m;
  var CAPTIONED = /^!\[([^\]]*)\]\(([^)\s]+)\)\n\n_(.+)_$/m;
  var QUOTE = /^((?:>.*\n)+)\n([^>\n].*)$/m;

  CMS.registerEditorComponent({
    id: 'marginnote',
    label: 'Margin note',
    fields: [
      { name: 'phrase', label: 'Phrase', widget: 'string', required: false, hint: 'The words in the paragraph above to highlight. Blank attaches the note to the whole paragraph.' },
      { name: 'date', label: 'Date', widget: 'string', required: false, hint: 'Optional, e.g. 2026-03-01. Blank uses the post date.' },
      { name: 'text', label: 'Note', widget: 'text' },
    ],
    pattern: NOTE,
    fromBlock: function (m) {
      return { phrase: m[1] || '', date: m[2] || '', text: m[3] };
    },
    toBlock: function (v) {
      var args = v.date ? ' "' + (v.phrase || '') + '", "' + v.date + '"' : v.phrase ? ' "' + v.phrase + '"' : '';
      return '{% marginnote' + args + ' %}\n' + (v.text || '') + '\n{% endmarginnote %}';
    },
    toPreview: function (v) {
      return '<blockquote><em>Note' + (v.phrase ? ' on “' + v.phrase + '”' : '') + '</em><br>' + (v.text || '') + '</blockquote>';
    },
  });

  CMS.registerEditorComponent({
    id: 'callout',
    label: 'Callout',
    fields: [
      { name: 'type', label: 'Type', widget: 'select', options: ['note', 'warning'], default: 'note' },
      { name: 'text', label: 'Text', widget: 'text' },
    ],
    pattern: CALLOUT,
    fromBlock: function (m) {
      return { type: m[1], text: m[2] };
    },
    toBlock: function (v) {
      return '{% callout "' + (v.type || 'note') + '" %}\n' + (v.text || '') + '\n{% endcallout %}';
    },
    toPreview: function (v) {
      return '<blockquote><strong>' + (v.type || 'note') + '</strong><br>' + (v.text || '') + '</blockquote>';
    },
  });

  CMS.registerEditorComponent({
    id: 'pagebreak',
    label: 'Page break',
    fields: [],
    pattern: BREAK,
    fromBlock: function () {
      return {};
    },
    toBlock: function () {
      return '{% pagebreak %}';
    },
    toPreview: function () {
      return '<hr>';
    },
  });

  // A footnote is two pieces: the marker in the text and the note itself, which
  // goes on its own line at the end of the post. Use the same name for both.
  // Numbers are assigned on the page, so the names can be anything.
  CMS.registerEditorComponent({
    id: 'footnote-marker',
    label: 'Footnote marker',
    fields: [{ name: 'name', label: 'Name', widget: 'string', hint: 'e.g. 1 or source. The footnote text below uses the same name.' }],
    pattern: REF,
    fromBlock: function (m) {
      return { name: m[1] };
    },
    toBlock: function (v) {
      return '[^' + (v.name || '1') + ']';
    },
    toPreview: function (v) {
      return '<sup>[' + (v.name || '1') + ']</sup>';
    },
  });

  CMS.registerEditorComponent({
    id: 'footnote-text',
    label: 'Footnote text',
    fields: [
      { name: 'name', label: 'Name', widget: 'string', hint: 'Matches the footnote marker. Put these at the end of the post.' },
      { name: 'text', label: 'Footnote', widget: 'string' },
    ],
    pattern: DEF,
    fromBlock: function (m) {
      return { name: m[1], text: m[2] };
    },
    toBlock: function (v) {
      return '[^' + (v.name || '1') + ']: ' + (v.text || '');
    },
    toPreview: function (v) {
      return '<p><sup>' + (v.name || '1') + '</sup> ' + (v.text || '') + '</p>';
    },
  });

  // The site has no caption block: a caption is an italic paragraph under the image.
  CMS.registerEditorComponent({
    id: 'captioned-image',
    label: 'Image with caption',
    fields: [
      { name: 'src', label: 'Image', widget: 'image' },
      { name: 'alt', label: 'Alt text', widget: 'string', required: false },
      { name: 'caption', label: 'Caption', widget: 'string' },
    ],
    pattern: CAPTIONED,
    fromBlock: function (m) {
      return { alt: m[1], src: m[2], caption: m[3] };
    },
    toBlock: function (v) {
      return '![' + (v.alt || '') + '](' + (v.src || '') + ')\n\n_' + (v.caption || '') + '_';
    },
    toPreview: function (v) {
      return '<img src="' + (v.src || '') + '" alt="' + (v.alt || '') + '"><p><em>' + (v.caption || '') + '</em></p>';
    },
  });

  // A quote with its source on the line after, as on /reference/.
  CMS.registerEditorComponent({
    id: 'quote-source',
    label: 'Quote with source',
    fields: [
      { name: 'quote', label: 'Quote', widget: 'text' },
      { name: 'source', label: 'Source', widget: 'string', hint: 'Author, title, year. Shown as a plain line under the quote.' },
    ],
    pattern: QUOTE,
    fromBlock: function (m) {
      return {
        quote: m[1].replace(/\n$/, '').split('\n').map(function (l) { return l.replace(/^> ?/, ''); }).join('\n'),
        source: m[2],
      };
    },
    toBlock: function (v) {
      var lines = (v.quote || '').split('\n').map(function (l) { return l ? '> ' + l : '>'; });
      return lines.join('\n') + '\n\n' + (v.source || '');
    },
    toPreview: function (v) {
      return '<blockquote>' + (v.quote || '') + '</blockquote><p>' + (v.source || '') + '</p>';
    },
  });
})();
