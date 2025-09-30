// server/utils/email.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, from = 'VFIED <onboarding@vfied.com>' }) {
  try {
    // If no API key, log to console instead (development fallback)
    if (!process.env.RESEND_API_KEY) {
      console.log('\n=== EMAIL (no API key, logging only) ===');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body:', html.substring(0, 200) + '...');
      console.log('=====================================\n');
      return { success: true, id: 'dev-mode', simulated: true };
    }

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