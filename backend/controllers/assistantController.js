// Use global fetch available in Node 18+

const intentResponse = (text, ctx) => {
  const t = text.toLowerCase();
  if (t.includes('register') && !t.includes('deposit')) {
    return 'Register your account, verify your email, update your details once-off, then register your participation for the auction and start bidding.';
  }
  if (t.includes('verify')) {
    return 'Open your profile and use Resend Verification Email if you did not receive it. Once verified, you can proceed to register and bid.';
  }
  if (t.includes('deposit') || t.includes('bank')) {
    return 'Some auctions require a refundable deposit. Use the exact payment reference shown under the auction Bank Details, then upload your receipt for faster verification.';
  }
  if (t.includes('fee') || t.includes('vat') || t.includes('commission') || t.includes('stc')) {
    return 'Buyer’s commission, VAT and STC are specified per lot. Bid total is Your Bid (+VAT if applicable) plus Buyer’s Commission (+VAT if applicable) and STC where applicable.';
  }
  if (t.includes('participation') || t.includes('register participation')) {
    return 'Please remember to register your participation for each auction before bidding. Look for the Register button on the auction page.';
  }
  if (t.includes('preparing lots')) {
    return 'Preparing Lots indicates the catalog is being prepared. You can still register participation and return later to browse lots.';
  }
  if (t.includes('invoice') || t.includes('payable')) {
    return 'Invoices include item price, applicable commission, VAT, STC, shipping and other fees. Use the payable calculator on the auction page to estimate totals.';
  }
  return 'How can I help? You can ask me about registering, verification, deposits, fees/VAT/STC, participation, preparing lots, invoices and refunds.';
};

const queryAssistant = async (req, res) => {
  try {
    const { message, context } = req.body || {};
    const devMode = (process.env.ENABLE_DEV_MOCK === 'true') || (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devMode) {
      const answer = intentResponse(String(message || ''), context);
      return res.json({ success: true, data: { reply: answer } });
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      const answer = intentResponse(String(message || ''), context);
      return res.json({ success: true, data: { reply: answer } });
    }
    const prompt = `You are an auction platform assistant. User: ${message}. Context: ${JSON.stringify(context || {})}.`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
    });
    const json = await response.json();
    const reply = json?.choices?.[0]?.message?.content || intentResponse(String(message || ''), context);
    return res.json({ success: true, data: { reply } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Assistant error' });
  }
};

module.exports = { queryAssistant };