import { authentication } from 'wix-members-backend';

export async function createMemberForOrder(email, phone, displayName) {
  try {
    const result = await authentication.register(email, phone, {
      contactInfo: {
        firstName: displayName?.split(' ')[0] || '',
        lastName: displayName?.split(' ').slice(1).join(' ') || '',
        phones: [phone],
        emails: [email],
      },
    });

    console.log('[VELO-BE] Member registered:', result.member?._id);

    return {
      memberId: result.member?._id || null,
      status: result.status,
    };
  } catch (err) {
    if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
      console.log('[VELO-BE] Member already exists for email:', email);
      return {
        memberId: null,
        status: 'already_exists',
        error: err.message,
      };
    }
    throw err;
  }
}
