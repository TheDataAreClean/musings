---
title: Against Dark Mode
date: 2024-11-20
description: The case for keeping the lights on.
tags:
  - design
  - typography
---

There is a preference pane in every modern operating system that allows you to make the screen dark. Text goes white, backgrounds go black, the whole interface inverts. Millions of people use this. Many of them will tell you it is obviously better.

I am not one of them.

## The Argument for Darkness

The case for dark mode runs like this: screens emit light directly into your eyes. Unlike a printed page, which is lit by reflection, a screen is a source. In a dark room, a bright screen is fatiguing. Dark mode reduces that emission. Ergo, dark mode is easier on the eyes.

This argument is not wrong. It is incomplete.

### What it ignores

The eye evolved to read dark marks on a light surface. Every written technology until approximately 1990 worked this way. Clay tablets. Papyrus. Vellum. Paper. The contrast ratio you are working against when you read dark-on-light is not arbitrary — it is the contrast ratio of ink on the material that absorbed it.

Light mode, on a properly calibrated screen in a properly lit room, is not fighting biology. It is extending a very old technology.

{% callout "note" %}
This is not an argument against dark mode for *coding*, where the content is syntax-highlighted and the semantics of colour matter differently. It is an argument against dark mode for reading and writing prose.
{% endcallout %}

## The Inversion Problem

Dark mode is not simply "light mode with the colours swapped." Swap the colours naively and you get a different document. Shadows go wrong. Images look like negatives. Drop shadows that suggested depth now suggest something else entirely.

Good dark mode implementations do not invert — they redesign. They require a second pass at every colour decision in the system. Most apps do not do this well.

What you get instead is a grey soup. The careful hierarchy of the light interface — the slight warmth of a sidebar, the crisp white of a content area, the delicate shadow that separates a card from the surface beneath it — collapses into shades of dark grey that are barely distinguishable from each other.

### The specific problem with text

White text on a dark background halates. The light bleeds from each letterform into the surrounding darkness. With thin fonts, the effect is a kind of vibration — the letters seem unstable, uncertain of their edges.

Black text on a white background does not do this. The dark letterform sits firmly on the light surface. It has weight. It is *there*.

This is not a personal preference. It is a property of human visual processing, documented since the early days of typography research.[^1]

<hr class="page-break">

## The Status Signal

I want to name something that usually goes unspoken: dark mode has become a signal. Using it marks you as a certain kind of person. Technical. Serious. Nocturnal in spirit if not in fact.

This is not a neutral thing. The status function of a design choice is real, but it is not a design argument. It is a social one.

The two should not be confused.

## What I Use Instead

A warm, slightly off-white background. `#fafaf8`, approximately. Not paper-white, not cream — something in between. Slightly reduced brightness in the evening. Font rendering at the system's default, not forced to anything clever.

It is not remarkable. It does not photograph well for design portfolios. It makes the words easy to read and the screen easy to look at for long periods.

That is enough.

<hr class="page-break">

## On Dim

There is a middle position some people arrive at: not dark mode, but a dimmed light mode. Low brightness, warm colour temperature, unchanged contrast polarity.

This is, I think, the correct answer for evening reading. It gives you the reduced emission benefit without the contrast inversion costs.

Most people never try it because dark mode is the available option and dim is not. The default is either bright or inverted. The sensible thing — quieter, not opposite — requires manual adjustment.

Most sensible things do.

[^1]: Bauer, D. & Cavonius, C.R. (1980). "Improving the legibility of visual display units through contrast reversal." In Ergonomic Aspects of Visual Display Terminals. London: Taylor & Francis. The finding that dark-on-light is generally more legible than light-on-dark has been replicated several times since, with some nuance added about individual variation and adaptation.
