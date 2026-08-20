# Proof-of-demand phase verification

- WhatsApp profile action opens `wa.me` with the App_1 service message and logs `contact_events` plus `analytics_events`.
- Request Callback accepts name, phone, service, preferred time and notes without client authentication and inserts `callback_requests`.
- Homepage/search/profile/filter actions log `analytics_events`.
- Search filtering is limited to category and location; availability is not a search filter.
- `phone_verified` is rendered as a badge only when true.
- Supabase failures in new analytics/callback paths degrade to visible error states or warnings instead of throwing through React rendering.
- Notifications, favorites and recently viewed behavior are not modified by this phase.
