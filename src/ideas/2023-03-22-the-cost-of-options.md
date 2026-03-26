---
title: The Cost of Options
date: 2023-03-22
description: Every feature is a tax on attention.
tags:
  - software
  - design
---

There is a failure mode in software that presents itself as generosity. The application gives you options. Many options. Options about options. A preferences pane that requires its own documentation. A toolbar you can customise, if you can find the menu that lets you customise it.

This is not generosity. It is the deferral of a decision — from the designer to you.

## Decisions Deferred Are Not Decisions Avoided

When a piece of software offers you thirty ways to accomplish a task, someone still has to choose. The designer has chosen not to choose. The cost of that non-decision is paid by every person who uses the software, every time they encounter the option.

Consider a text editor with the following settings:

```json
{
  "editor.wordWrap": "on",
  "editor.wordWrapColumn": 80,
  "editor.wrappingIndent": "indent",
  "editor.wrappingStrategy": "advanced",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": false,
  "editor.formatOnType": false
}
```

Each of these is a decision someone had to make. In the ideal case, they made it once, correctly, and never thought about it again. In practice, they made it hastily during initial setup, forgot about it, and occasionally encounter its effects in ways they cannot immediately explain.

The option was not free. Its cost was paid at setup time, and is paid again every time it surfaces unexpectedly.

## What Good Defaults Mean

A good default is an opinion. It says: *for most people, in most situations, this is the right choice.* It takes responsibility for a decision that would otherwise be distributed across all users.

**Bold claim:** the quality of an application's defaults is a better signal of its quality than the depth of its configurability. An app with good defaults that cannot be changed is more useful than an app with bad defaults that can be endlessly configured.

This is because most configuration never happens. The default *is* the experience for the majority of users. Spending design effort on the default is spending it where it matters.

*Less obviously:* good defaults also benefit power users, because they establish a baseline that makes customisation legible. You know what you are changing from.

## The Subset That Gets Used

Every sufficiently complex piece of software has a power-user subset and a normal-user subset of features. These subsets rarely overlap as much as designers expect.

Normal usage:
- The twenty most common operations
- Whatever the toolbar shows by default
- Whatever keyboard shortcut is printed in the menu

Power-user usage:
- A different twenty operations, deeply ingrained
- ~~Whatever was in the toolbar~~ custom toolbar, configured once
- Keyboard shortcuts memorised through repetition, not reference

The options that serve neither group:
- Everything in the fourth-level submenu
- The configuration options that require restarting the application
- The "advanced" tab in preferences that no one has opened since 2019

The cost of the third group is not zero. It is carried by the interface — in menu depth, in cognitive load, in the time spent explaining to users that they don't need to worry about it.

## Nested lists as example

The problem compounds:

- Feature is added to serve an edge case
    - Edge case user requests configuration for the feature
        - Configuration creates new edge cases
            - New edge cases require new configuration
                - The preferences pane now has its own search box

This is not hypothetical. It is a description of every general-purpose application that has survived long enough.

## The Alternative

The alternative is not fewer features. It is fewer *choices*. Make the decision. Make it well. Make it revisable if you were wrong. But make it.

The designer's job is not to present options. It is to present the right thing. Options are the residue of not having done that job.

`rm -rf ~/Library/Preferences/` is a joke. The point is not.
