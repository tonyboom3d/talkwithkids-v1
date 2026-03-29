import { products } from 'wix-stores.v2';
import { triggeredEmails } from 'wix-crm-backend';

export async function getProductById(productId) {
    try {
        const { items } = await products.queryProducts()
            .eq('_id', productId)
            .find();

        if (items.length > 0) {
            return items[0];
        }
        return null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function notifyOwner(subject, body, isTestMode = false) {
    try {
        const dynamicText = `${subject} - ${body}`;

        // הוספת תנאי לבדיקת מצב Test Mode ושליחה ל-ContactId המתאים
        const contactId = isTestMode ? '48cce6ed-ec9d-482a-8e45-99f6e58d6f77' : '22033acd-d084-4d73-8d0c-404a610293be';

        await triggeredEmails.emailContact('VCQp4lt', contactId, {
            variables: {
                dynamicTxt: dynamicText
            }
        });
    } catch (err) {
        console.error("Failed to send email to owner", err);
    }
}