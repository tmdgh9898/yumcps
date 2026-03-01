function ok(res, data, meta = {}) {
  res.status(200).json({ success: true, data, error: null, meta });
}

function fail(res, status, code, message, details = null) {
  res.status(status).json({ success: false, data: null, error: { code, message, details }, meta: {} });
}

module.exports = { ok, fail };
