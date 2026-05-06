import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/ref/$code')({
  beforeLoad: ({ params }) => {
    const { code } = params;
    
    // Basic validation: ensure code exists and is alphanumeric
    if (!code || !/^[a-zA-Z0-9_-]+$/.test(code)) {
      console.warn(`[REFERRAL] Invalid referral code: ${code}`);
      throw redirect({ to: '/' });
    }
    
    // Set cookie for 120 days
    const expiryDays = 120;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    
    // Set the referral cookie
    // httpOnly: false because client needs to read it
    // SameSite: Lax for CSRF protection while allowing navigation
    if (typeof document !== 'undefined') {
      document.cookie = `predictio_ref=${code}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
      console.log(`[REFERRAL] Set cookie for ref code: ${code}, expires: ${expiryDate.toISOString()}`);
    }
    
    // Redirect to home page
    throw redirect({ to: '/' });
  },
});
