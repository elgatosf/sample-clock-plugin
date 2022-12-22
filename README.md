# Sample Clock Plugin

Here's a super-tiny Sample-clocks-plugin:

## WHY:
* Very soon we need some samples to show external developers how to make use of SD+

* To make it easy for developers Zack created a small 'SDK' library (somthing like our very outdated `common.js` library), which let the developer quickly start a new plugin.

* We want to encourage developers to add his library as `submodule` to their plugins (if possible). That means, if we add or fix something, every developer can get those changes for free by just updating the submodule (which is in most cases automatic). This would also solve some issues with the Property Inspector.

This tiny plugin shows
* how include the library into a developer's plugin
* how to use the library (in less than 100 lines of code - including a dynamic SVG-icon AND all code necessary to draw to a key or panel and make use of `dialRotate`, `dialPress` and `touchTap`.

## What it does:
* it shows a tiny digital clock on either a key or a SD+ touchpanel
* it uses our built-in `$A1` layout for this
* it shows the weekday in the title (you can switch that off in the PI)
* you can show/hide seconds by tapping the panel
* you can show/hide seconds by pressing the dial

Using this plugin I'd like to investigate:
* if this is useful for our SDK
* if yes - we can create a bunch of plugins - each showing how to create/use an SDK-feature
 if not - we must discuss what and how to change those samples to make them more useful

As always: comments very welcome!
