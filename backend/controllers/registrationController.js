exports.registerForAuction = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
exports.getMyRegistration = async (req, res) => {
  return res.json({ success: true, data: { registration: null } });
};
exports.listRegistrations = async (req, res) => {
  return res.json({ success: true, data: { registrations: [] } });
};
exports.updateRegistrationStatus = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
exports.updateRegistrationDeposit = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
exports.verifyDeposit = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Not implemented in this backend' });
};
