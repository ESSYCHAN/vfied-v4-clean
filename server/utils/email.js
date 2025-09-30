// server/utils/email.js

let resend = null;

// Only initialize Resend if API key exists
if (process.env.RESEND_API_KEY) {
  const { Resend } = await import('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html, from = 'VFIED <onboarding@vfied.com>' }) {
  try {
    // If no Resend client (no API key), log to console instead
    if (!resend) {
      console.log('\n=== EMAIL (Development Mode - No API Key) ===');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Preview:', html.substring(0, 150).replace(/<[^>]*>/g, '') + '...');
      console.log('===========================================\n');
      return { success: true, id: 'dev-mode', simulated: true };
    }

    // Send real email
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html
    });
    
    console.log('✅ Email sent:', { to, subject, id: data.id });
    return { success: true, id: data.id };
    
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return { success: false, error: error.message };
  }
}