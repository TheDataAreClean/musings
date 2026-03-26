---
title: A Very Long Idea Title That Tests How the Layout Handles Text Wrapping Across Multiple Lines in the List View
date: 2022-07-14
description: Edge case for title overflow in the post list.
tags:
  - design
---

This post exists to test long title rendering in the post list and in the document title area at the top of the page.

The title is intentionally long. In the list view, it should wrap cleanly across lines without breaking the two-line structure. The date and tags on the second line should stay on the second line.

In the document header, `.doc-title` should also wrap without breaking layout.

## Other things being tested here

This post is also in the archive (published 2022), so it tests year grouping in the archive component. It should appear under "2022" alongside any other 2022 posts.

The date format shown in the list is `YYYY-MM-DD` — `isoDate` filter. This post's date is `2022-07-14`.
