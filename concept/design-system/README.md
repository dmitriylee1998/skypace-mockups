# Skypace design system

Source: https://www.figma.com/design/wsfBIFpk8b8gwqWXC6gJGX

`figma-light.json` is the unmodified Light export from the file's Ant Design theme exporter (including component tokens).
`theme.js` is the shared ConfigProvider theme used by both application entry points. It converts the exported image opacity from percentage to fraction and adds system font fallbacks.
`system.css` binds custom Skypace surfaces to the same tokens. Business layouts and interactions are preserved.

Explicit product override: Table.headerBorderRadius = 0, as requested. Removed Quote Requests / Guest Bookings KPI cards remain removed; Quote Requests filters remain inside the Filter button.

To update the source, export Light + Include components from the same Figma file, preserve it as `figma-light.json`, and regenerate the ConfigProvider theme and CSS foundations. Keep the explicit table-corner override. The source export is retained for comparison.

Table edge insets: both outer cells use `padding = 16px`, matching panel headings; inner cells keep the exported density tokens.
