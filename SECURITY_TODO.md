Before production:

1. Replace the temporary mmminiep password with Supabase Auth.
2. Create admin_users table.
3. Restrict order read/update/delete policies to admin users only.
4. Keep public insert allowed for order form.
5. Move Discord webhook notification to backend/serverless function.
6. Move Pterodactyl API integration to backend/serverless function.
7. Never expose Pterodactyl API key in frontend.
8. Never expose Discord webhook secret in frontend.
9. Never expose Supabase service role key in frontend.
10. Add captcha or rate limit to order form.
