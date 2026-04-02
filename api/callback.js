'use strict';

module.exports = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing code parameter');
  }

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send('GitHub OAuth credentials not configured');
  }

  let tokenData;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    return res.status(500).send('Failed to exchange token with GitHub');
  }

  if (tokenData.error) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><body><script>
      window.opener && window.opener.postMessage(
        'authorization:github:error:' + ${JSON.stringify(JSON.stringify({ error: tokenData.error }))},
        '*'
      );
      window.close();
    </script></body></html>`);
  }

  const content = JSON.stringify({ token: tokenData.access_token, provider: 'github' });

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html><html><body><script>
    (function () {
      function receiveMessage(e) {
        window.opener.postMessage(
          'authorization:github:success:' + ${JSON.stringify(content)},
          e.origin
        );
      }
      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage('authorizing:github', '*');
    })();
  </script></body></html>`);
};
