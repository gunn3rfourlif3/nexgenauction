exports.createDepositIntent = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
exports.getMyDeposit = async (req, res) => {
  return res.json({ success: true, data: { deposit: null } });
};
exports.getBankDetails = async (req, res) => {
  return res.json({ success: true, data: { bank: null } });
};
exports.uploadDepositReceipt = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
exports.requestRefund = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
exports.adminRefund = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
exports.listDepositReferences = async (req, res) => {
  return res.json({ success: true, data: { references: [] } });
};
exports.validateDepositReference = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
