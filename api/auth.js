'use strict';

module.exports = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('GITHUB_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo,user',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};
